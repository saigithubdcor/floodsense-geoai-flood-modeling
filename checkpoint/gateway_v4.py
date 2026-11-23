#!/usr/bin/env python3
"""FloodSense V4 candidate gateway: overlays verified V3.2 frontend, never writes science or source.
Serves only 127.0.0.1 and only proxies 127.0.0.1 upstreams. No forecast generation.
"""
import argparse, json, mimetypes, urllib.parse, urllib.request, urllib.error, re
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
mimetypes.add_type('text/javascript','.js')
mimetypes.add_type('text/javascript','.mjs')
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))

def get_json(url,timeout=7):
    try:
        with opener.open(url,timeout=timeout) as r: return r.status,json.load(r)
    except urllib.error.HTTPError as ex:
        try: value=json.loads(ex.read().decode('utf-8'))
        except Exception: value={'error':'HTTP '+str(ex.code)}
        return ex.code,value


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--parent',required=True);p.add_argument('--overrides',required=True)
    p.add_argument('--port',type=int,required=True)
    p.add_argument('--upstream',default='http://127.0.0.1:26020')
    p.add_argument('--daily-api',default='http://127.0.0.1:25820')
    a=p.parse_args()
    parent=Path(a.parent).resolve();app=(parent/'app').resolve();over=Path(a.overrides).resolve()
    if not app.is_dir() or not over.is_dir() or parent==over or parent in over.parents:
        raise SystemExit('FATAL: parent/overrides unsafe or missing')
    for uri in (a.upstream,a.daily_api):
        u=urllib.parse.urlsplit(uri)
        if u.scheme!='http' or u.hostname!='127.0.0.1' or u.port is None or u.username:
            raise SystemExit('FATAL: only literal localhost upstream supported')
    checked=json.loads((over.parent/'R1R10_V32_MANIFEST.json').read_text('utf-8'))
    allowed=set(checked['output_override_sha256'])
    import hashlib
    for name,expected in checked['output_override_sha256'].items():
        path=(over/name).resolve()
        if path.parent!=over or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest().upper()!=expected.upper():
            raise SystemExit('FATAL: V3.2 hash mismatch '+name)
    extras={'fs-v4-integration.js','fs-v4-review.html'}
    opener_local=opener
    class Handler(BaseHTTPRequestHandler):
        server_version='FloodSense-V4-Integration-Candidate/1.0'
        def log_message(self,*args):pass
        def send_bytes(self,code,data,ctype):
            self.send_response(code)
            self.send_header('Content-Type',ctype)
            self.send_header('Cache-Control','no-store')
            self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Content-Length',str(len(data)))
            self.end_headers()
            if self.command!='HEAD':
                try:self.wfile.write(data)
                except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass
        def handle_availability(self,parsed):
            query=urllib.parse.parse_qs(parsed.query)
            day=query.get('date',[''])[0]
            try:
                from datetime import date
                if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',day) or date.fromisoformat(day).isoformat()!=day:
                    raise ValueError('invalid date')
            except (ValueError,TypeError):
                return self.send_bytes(400,b'{"status":"INVALID_DATE"}','application/json')
            base=a.daily_api.rstrip('/')+'/api/v1/unified/'
            dc,dj=get_json(base+'date?date='+urllib.parse.quote(day))
            if dc!=200:
                return self.send_bytes(503,json.dumps({'status':'DATE_ROUTER_UNAVAILABLE','date':day,'date_http':dc}).encode(),'application/json')
            state=str(dj.get('state') or dj.get('mode') or '')
            ic,ij=get_json(base+'impacts?date='+urllib.parse.quote(day))
            delegate=state in ('LIVE_FORECAST_DELEGATE','FUTURE_FORECAST_DELEGATE') or ('DELEGATE' in state)
            if ic==200 and not delegate:
                count=ij.get('affected_asset_count')
                result={'status':'AVAILABLE','date':day,'state':state,'affected_asset_count':count,'date_http':dc,'impacts_http':ic}
            elif delegate and ic in (200,404):
                result={'status':'UNAVAILABLE_NOT_ZERO','date':day,'state':state,'affected_asset_count':None,'date_http':dc,'impacts_http':ic,'reason':'No validated date-conditioned hydraulic impacts are served for this delegate date.'}
            else:
                return self.send_bytes(503,json.dumps({'status':'IMPACT_SERVICE_ERROR','date':day,'state':state,'date_http':dc,'impacts_http':ic}).encode(),'application/json')
            return self.send_bytes(200,json.dumps(result,separators=(',',':')).encode(),'application/json; charset=utf-8')
        def respond(self):
            parsed=urllib.parse.urlsplit(self.path)
            route=urllib.parse.unquote(parsed.path or '/')
            if route=='/api/v1/integration/impact-availability':
                if self.command=='POST':return self.send_bytes(405,b'GET only','text/plain')
                return self.handle_availability(parsed)
            if route.startswith('/api/'):
                length=int(self.headers.get('Content-Length','0') or 0)
                if length>1024*1024:return self.send_bytes(413,b'Request too large','text/plain')
                body=self.rfile.read(length) if self.command=='POST' and length else None
                req=urllib.request.Request(a.upstream.rstrip('/')+self.path,data=body,method=('POST' if self.command=='POST' else 'GET'))
                if body is not None:req.add_header('Content-Type',self.headers.get('Content-Type','application/json'))
                try:
                    with opener_local.open(req,timeout=60) as r:self.send_bytes(r.status,r.read(),r.headers.get('Content-Type','application/json'))
                except urllib.error.HTTPError as e:self.send_bytes(e.code,e.read(),e.headers.get('Content-Type','application/json'))
                except Exception:self.send_bytes(503,b'{"status":"UPSTREAM_UNAVAILABLE"}','application/json')
                return
            if route=='/':route='/index.html'
            key=route.lstrip('/')
            if not key:
                return self.send_bytes(404,b'Not found','text/plain')
            if key in extras:
                file=(over/key).resolve();base=over
            elif key in allowed:
                file=(over/key).resolve();base=over
            else:
                file=(app/key).resolve();base=app
            if not file.is_file() or base not in file.parents:
                return self.send_bytes(404,b'Not found','text/plain')
            data=file.read_bytes()
            if key in ('index.html','weather.html','time.html','history.html','hindcast.html','outlook.html'):
                html=data.decode('utf-8-sig')
                insert='<script defer src="/fs-v4-integration.js"></script>'
                if insert in html:
                    return self.send_bytes(500,b'Duplicate integration injection','text/plain')
                html,n=re.subn(r'</body\s*>',insert+'\n</body>',html,count=1,flags=re.I)
                if n!=1:return self.send_bytes(500,b'HTML injection marker missing','text/plain')
                data=html.encode('utf-8')
            ctype=mimetypes.guess_type(str(file))[0] or 'application/octet-stream'
            if file.suffix.lower() in ('.html','.js','.mjs','.css','.json'):ctype+='; charset=utf-8'
            return self.send_bytes(200,data,ctype)
        def do_GET(self):return self.respond()
        def do_HEAD(self):return self.respond()
        def do_POST(self):return self.respond()
    print('FS_V4_INTEGRATION_GATEWAY_UP http://127.0.0.1:'+str(a.port),flush=True)
    ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
if __name__=='__main__':main()
