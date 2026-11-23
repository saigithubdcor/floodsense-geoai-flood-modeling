#!/usr/bin/env python3
"""Read-only static file overlay on exact R1R5 source, with localhost API pass-through.
No heavy service spawn, no portal copying, no writes to parent candidate.
"""
import argparse,json,mimetypes,os,sys,urllib.parse,urllib.request,urllib.error
from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
mimetypes.add_type('text/javascript','.mjs');mimetypes.add_type('text/javascript','.js')

def main():
 p=argparse.ArgumentParser();p.add_argument('--parent',required=True);p.add_argument('--overrides',required=True);p.add_argument('--port',type=int,required=True);p.add_argument('--upstream',default='http://127.0.0.1:26020');a=p.parse_args()
 parent=Path(a.parent).resolve();app=(parent/'app').resolve();over=Path(a.overrides).resolve()
 if not app.is_dir() or not over.is_dir():raise SystemExit('Missing parent app or override folder')
 if parent==over or parent in over.parents:raise SystemExit('Override must not be placed inside the parent')
 upstream=urllib.parse.urlsplit(a.upstream)
 if upstream.hostname!='127.0.0.1' or upstream.port is None:raise SystemExit('Only literal localhost upstream accepted')
 opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
 class Handler(BaseHTTPRequestHandler):
  server_version='FloodSense-R1R8-Preview/1.0'
  def log_message(self,*args):pass
  def send(self,status,content,ctype):
   self.send_response(status)
   self.send_header('Content-Type',ctype)
   self.send_header('Cache-Control','no-store')
   self.send_header('X-Content-Type-Options','nosniff')
   self.send_header('Content-Length',str(len(content)))
   self.end_headers()
   if self.command!='HEAD':
    try:self.wfile.write(content)
    except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass
  def respond(self):
   parsed=urllib.parse.urlsplit(self.path);route=urllib.parse.unquote(parsed.path or '/')
   if route.startswith('/api/'):
    # Proxy native portal API to existing verified portal. B1M3 direct port in the date bridge stays unchanged.
    url=a.upstream.rstrip('/')+self.path
    length=int(self.headers.get('Content-Length','0') or 0)
    if length>1024*1024:return self.send(413,b'Request too large','text/plain; charset=utf-8')
    body=self.rfile.read(length) if length and self.command=='POST' else None
    req=urllib.request.Request(url,data=body,method='POST' if self.command=='POST' else 'GET')
    if body is not None:req.add_header('Content-Type',self.headers.get('Content-Type','application/json'))
    try:
     with opener.open(req,timeout=75) as r:self.send(r.status,r.read(),r.headers.get('Content-Type','application/json'))
    except urllib.error.HTTPError as ex:self.send(ex.code,ex.read(),ex.headers.get('Content-Type','application/json'))
    except Exception:self.send(503,json.dumps({'status':'SOURCE_UNAVAILABLE','error':'Existing local portal API is unavailable; no stale state substituted.'}).encode(),'application/json; charset=utf-8')
    return
   if route=='/':route='/index.html'
   if route=='/r1r8_gate.html':
    data=b'<meta charset="utf-8"><title>R1R8 Visual Gate</title><main style="font:16px Segoe UI,Arial;max-width:800px;margin:3em auto;line-height:1.6"><h1>FloodSense R1R8 - visual gate (not frozen)</h1><p>Compare with the retained R1R7 preview on port 26080; native R1R5 on 26020. Source data and models are unchanged.</p><ol><li><a href="/?udate=2016-06-04">2016-06-04: wet map, selected road, one legend, no blocked controls</a></li><li><a href="/?udate=2016-01-01">2016-01-01: dry state, no flood overlay or impacts</a></li><li><a href="/time.html?udate=2016-06-04">Time & Events: one chart, correct date</a></li><li><a href="/outlook.html?h=3&udate=2026-11-04">Outlook reference: unchanged</a></li></ol><p>At 100% zoom, click an asset row and a hydraulic cell. Click a road record and a hospital: it must zoom to the screened point, show the selected ring and inspector, and offer return to previous view. No cross-date stale view. Native Outlook remains unchanged. Do not freeze until visual pass.</p></main>'
    return self.send(200,data,'text/html; charset=utf-8')
   try:
    key=route.lstrip('/')
    if key.startswith('b1m3-r1r6-') or key.startswith('b1m3-r1r7-') or key.startswith('b1m3-r1r8-') or key.startswith('b1m3-r1r9-') or key.startswith('fs-r1r10v3-') or key in ('index.html','styles.css','outlook.html','history.html','outlook.js','history.js'):
     f=(over/key).resolve()
     if over in f.parents and f.is_file():
      data=f.read_bytes();return self.send(200,data,(mimetypes.guess_type(str(f))[0] or 'application/octet-stream')+'; charset=utf-8')
    f=(app/key).resolve()
    if app not in f.parents or not f.is_file():return self.send(404,b'Not found','text/plain; charset=utf-8')
    data=f.read_bytes();return self.send(200,data,(mimetypes.guess_type(str(f))[0] or 'application/octet-stream') + ('; charset=utf-8' if f.suffix in ('.html','.css','.js','.mjs','.json') else ''))
   except Exception:return self.send(500,b'File read failed','text/plain; charset=utf-8')
  def do_GET(self):return self.respond()
  def do_HEAD(self):return self.respond()
  def do_POST(self):return self.respond()
 print('R1R6_PREVIEW_HTTP http://127.0.0.1:'+str(a.port),flush=True)
 ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
if __name__=='__main__':main()
