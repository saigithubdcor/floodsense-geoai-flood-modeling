import * as maplibregl from '/vendor/maplibre-gl.mjs';
maplibregl.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=(v,d=3)=>v==null||!Number.isFinite(+v)?'—':(+v).toFixed(d);
async function j(u){let r=await fetch(u,{cache:'no-store'}),x=await r.json();if(!r.ok)throw Error(x.error||r.status);return x}

function utm43(e,n){
 const a=6378137,ec=.00669438,k=.9996,x=e-500000,y=n,ep=ec/(1-ec),M=y/k,
 mu=M/(a*(1-ec/4-3*ec*ec/64-5*ec**3/256)),e1=(1-Math.sqrt(1-ec))/(1+Math.sqrt(1-ec)),
 J1=3*e1/2-27*e1**3/32,J2=21*e1**2/16-55*e1**4/32,J3=151*e1**3/96,J4=1097*e1**4/512,
 fp=mu+J1*Math.sin(2*mu)+J2*Math.sin(4*mu)+J3*Math.sin(6*mu)+J4*Math.sin(8*mu),
 sf=Math.sin(fp),cf=Math.cos(fp),tf=Math.tan(fp),N=a/Math.sqrt(1-ec*sf*sf),T=tf*tf,C=ep*cf*cf,
 R=a*(1-ec)/Math.pow(1-ec*sf*sf,1.5),D=x/(N*k),
 lat=fp-(N*tf/R)*(D*D/2-(5+3*T+10*C-4*C*C-9*ep)*D**4/24+(61+90*T+298*C+45*T*T-252*ep-3*C*C)*D**6/720),
 lon=(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C*C+8*ep+24*T*T)*D**5/120)/cf;
 return[75+lon*180/Math.PI,lat*180/Math.PI]
}
function style(){return{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'bg',type:'background',paint:{'background-color':'#dde7ee'}},{id:'osm',type:'raster',source:'osm',paint:{'raster-opacity':.92}}]}}
const S={map:null,events:[],event:null,idx:4,h:15,view:'ml_depth',impact:null,report:null,markers:[],focusMarker:null,focusPopup:null,playing:false,timer:null,selectedCell:null,labelZoomBound:false};

function color(lo,hi){return['case',['==',['get','available'],false],'#828b91',['interpolate',['linear'],['get','value'],lo,'#204fb5',lo+(hi-lo)*.35,'#21bcc4',lo+(hi-lo)*.7,'#f1cf55',hi,'#e65e4c']]}
function metricsFor(){let r=S.report||{},eid=S.event?.event_id,h=String(S.h);if(!eid)return null;if(eid==='EV2022_JUL')return r.internal_2022_validation?.[h]||null;return r.independent_validation?.[eid]?.[h]||null}
function showMetrics(){let m=metricsFor();$('#mae').textContent=m?`${f(m.mae_m)} m`:'—';$('#r2').textContent=m&&m.r2!=null?f(m.r2,3):'—';$('#f1').textContent=m?f(m.flood_f1,3):'—';$('#role').textContent=S.event?.event_id==='EV2022_JUL'?'TRAIN/CALIBRATION':'LOCKED VALIDATION'}

function resetInspector(){
 $('#cellTitle').textContent='Click a model cell or affected asset';
 $('#cell').innerHTML='';
}
async function inspectCell(id){
 S.selectedCell=+id;
 let x=await j(`/api/v1/h3/cell?event_id=${encodeURIComponent(S.event.event_id)}&index=${S.idx}&horizon=${S.h}&cell_id=${S.selectedCell}`);
 $('#cellTitle').textContent=`Hydraulic cell ${S.selectedCell}`;
 $('#cell').innerHTML=`<div class="cellRow"><b>${esc(x.base_time)} → ${esc(x.valid_time)}</b><span>Current ${f(x.current_depth_m)} m</span><span>ML predicted ${f(x.predicted_depth_m)} m</span><span>Physical ${f(x.physical_depth_m)} m</span><span>Absolute error ${f(x.absolute_error_m)} m</span></div>`;
}
function clearMarkers(){for(const m of S.markers)m.remove();S.markers=[]}
function refreshImpactLabelVisibility(){if(!S.map)return;let z=S.map.getZoom(),limit=S.focusMarker?0:(z>=13?4:z>=11.4?2:0);S.markers.forEach((m,i)=>m.getElement().style.display=i<limit?'block':'none')}
function bindImpactLabelVisibility(){if(S.labelZoomBound||!S.map)return;S.labelZoomBound=true;S.map.on('zoom',refreshImpactLabelVisibility);S.map.on('moveend',refreshImpactLabelVisibility)}
function clearFocus(){let m=S.focusMarker,p=S.focusPopup;S.focusMarker=null;S.focusPopup=null;if(m)m.remove();if(p)p.remove();refreshImpactLabelVisibility()}
function uniqueLabelCandidates(items,maxN=4){let out=[],seen=new Set();for(const x of items){if(!Number.isFinite(+x.longitude)||!Number.isFinite(+x.latitude))continue;let key=String(x.name||'').trim().toLowerCase().replace(/\s+/g,' ');if(!key||seen.has(key))continue;let near=out.some(y=>Math.abs(+x.longitude-+y.longitude)<0.0022&&Math.abs(+x.latitude-+y.latitude)<0.0022);if(near)continue;seen.add(key);out.push(x);if(out.length>=maxN)break}return out}
function inspectAsset(a){
 S.selectedCell=null;
 $('#cellTitle').textContent=a.name||'Mapped asset';
 $('#cell').innerHTML=`<div class="cellRow"><b>${esc(a.name)}</b><span>${esc(a.category)} · ${esc(a.severity)}</span><span>Max screened depth ${f(a.max_depth_m)} m</span><span>Median screened depth ${f(a.median_depth_m)} m</span><span>Exact mapped asset location is pinned on the map.</span></div>`;
 if(Number.isFinite(+a.longitude)&&Number.isFinite(+a.latitude)){
   clearFocus();
   const el=document.createElement('div');el.className='asset-focus-wrap';el.setAttribute('aria-label',a.name||'selected asset');el.innerHTML='<div class="asset-focus-pin"></div><div class="asset-focus-badge">SELECTED</div>';
   S.focusPopup=new maplibregl.Popup({offset:30,closeButton:true,closeOnClick:false,maxWidth:'280px'}).setHTML(`<b>${esc(a.name)}</b><br>${esc(a.category)} · max ${f(a.max_depth_m)} m`);
   S.focusMarker=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([+a.longitude,+a.latitude]).setPopup(S.focusPopup).addTo(S.map);
   S.focusPopup.on('close',()=>{let m=S.focusMarker;S.focusMarker=null;S.focusPopup=null;if(m)m.remove();refreshImpactLabelVisibility()});
   S.focusPopup.setLngLat([+a.longitude,+a.latitude]).addTo(S.map);
   refreshImpactLabelVisibility();
   S.map.flyTo({center:[+a.longitude,+a.latitude],zoom:17,duration:750,essential:true});
 }
}

function setImpactText(mode,title,explain){
 $('#impactMode').textContent=mode;
 $('#impactTitle').textContent=title;
 $('#impactExplain').textContent=explain;
}
function counts(c={}){
 const sum=ks=>ks.reduce((n,k)=>n+(c[k]||0),0);
 $('#roadCount').textContent=sum(['road','bridge']);
 $('#healthCount').textContent=sum(['hospital','clinic','pharmacy','police','fire','shelter']);
 $('#educationCount').textContent=sum(['school','college','university']);
 $('#buildingCount').textContent=c.building||0
}
function clearImpact(msg='No impact result for this view.'){
 S.impact={affected_assets:[]};
 $('#impactCount').textContent='—';counts({});
 $('#top10').innerHTML=`<p>${esc(msg)}</p>`;
 $('#impactRows').innerHTML='';
 clearMarkers();
}
function renderRows(){
 let a=S.impact?.affected_assets||[],cat=$('#impactCategory').value||'all',q=($('#impactSearch').value||'').toLowerCase();
 let rows=a.filter(x=>(cat==='all'||x.category===cat)&&(!q||String(x.name||'').toLowerCase().includes(q)||String(x.category||'').toLowerCase().includes(q)));
 $('#impactRows').innerHTML=rows.slice(0,800).map(x=>`<tr data-id="${esc(x.asset_id)}"><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${f(x.max_depth_m)} m</td><td>${f(x.median_depth_m)} m</td><td>${esc(x.severity)}</td></tr>`).join('');
 document.querySelectorAll('#impactRows tr').forEach(el=>el.onclick=()=>{let x=a.find(z=>String(z.asset_id)===String(el.dataset.id));if(x)inspectAsset(x)})
}
function renderImpact(a){
 S.impact=a;$('#impactCount').textContent=a.affected_asset_count??0;counts(a.category_counts||{});
 let top=a.top10||[];
 $('#top10').innerHTML=top.length?top.map((x,i)=>`<div class="topItem" data-id="${esc(x.asset_id)}"><b>${i+1}. ${esc(x.name)}</b><span>${esc(x.category)} · max ${f(x.max_depth_m)} m · ${esc(x.severity)}</span></div>`).join(''):'<p>No mapped affected assets at this selected state.</p>';
 document.querySelectorAll('.topItem').forEach(el=>el.onclick=()=>{let x=top.find(z=>String(z.asset_id)===String(el.dataset.id));if(x)inspectAsset(x)});
 let cats=[...new Set((a.affected_assets||[]).map(x=>x.category))].sort(),sel=$('#impactCategory'),old=sel.value;
 sel.innerHTML='<option value="all">All categories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
 if(cats.includes(old))sel.value=old;
 renderRows();clearMarkers();bindImpactLabelVisibility();
 let chosen=uniqueLabelCandidates([...(a.top_critical||[]),...(a.top10||[])],4);
 for(const x of chosen){
   let el=document.createElement('div');el.className='impact-marker';el.textContent=`${x.name} · ${f(x.max_depth_m,1)} m`;
   el.onclick=()=>inspectAsset(x);
   S.markers.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([+x.longitude,+x.latitude]).addTo(S.map))
 }
 refreshImpactLabelVisibility();
}
async function loadImpact(refresh=false){
 if(!S.event)return;
 try{
   if(S.view==='physical_depth'){
     const validIndex=S.idx+Math.round(S.h/15);
     setImpactText('PHYSICAL RECONSTRUCTION IMPACT SCREENING','What mapped places/assets are affected in the reconstructed valid-time depth field?','Uses the frozen physical reconstruction at valid time T+h. During Play, counts and inventory refresh at every native 15-minute frame. Click an asset to pin its exact mapped location.');
     $('#topTitle').textContent='Top 10 reconstructed impacts';$('#inventoryTitle').textContent='Complete physically screened inventory';
     renderImpact(await j(`/api/v1/history/impact?event_id=${encodeURIComponent(S.event.event_id)}&index=${validIndex}&refresh=${refresh?1:0}`));
     return;
   }
   if(S.view==='abs_error'){
     setImpactText('ML ERROR DIAGNOSTIC','Impact screening is intentionally disabled for absolute prediction error.','Absolute error is a model-difference quantity, not water depth. Treating error magnitude as inundation would be scientifically invalid. Switch to FloodSense ML depth or Physical reconstructed depth for asset screening.');
     $('#topTitle').textContent='No asset-impact semantics for error';$('#inventoryTitle').textContent='Error layer diagnostic';
     clearImpact('No affected-place list is generated from ML error because error magnitude is not flood depth.');
     return;
   }
   if(S.view.startsWith('ml_')){
     setImpactText('ML IMPACT SCREENING','What mapped places/assets would the FloodSense ML depth prediction affect?','Uses the ML-predicted depth for this event, base state and horizon. During Play, counts and inventory refresh at every native 15-minute frame. Click an asset to pin its exact mapped location.');
     $('#topTitle').textContent='Top 10 predicted impacts';$('#inventoryTitle').textContent='Complete ML-screened inventory';
     renderImpact(await j(`/api/v1/h3/impact?event_id=${encodeURIComponent(S.event.event_id)}&index=${S.idx}&horizon=${S.h}&refresh=${refresh?1:0}`));
     return;
   }
   clearImpact('No depth-based impact semantics for this view.');
 }catch(e){clearImpact('Impact screening unavailable: '+e.message)}
}

async function loadMap(updateImpact=true){
 let x=await j(`/api/v1/h3/map?event_id=${encodeURIComponent(S.event.event_id)}&index=${S.idx}&horizon=${S.h}&view=${S.view}`),
 pts=(x.points||[]).map(p=>({type:'Feature',geometry:{type:'Point',coordinates:utm43(+p.x,+p.y)},properties:{cell_id:+p.cell_id,value:p.value==null?null:+p.value,available:!!p.available}})),
 vals=pts.map(q=>q.properties.value).filter(Number.isFinite),lo=S.view==='ml_flood'?0:(vals.length?Math.min(...vals):0),hi=S.view==='ml_flood'?1:(vals.length?Math.max(...vals):1),
 displayPts=(['ml_depth','physical_depth'].includes(S.view)?pts.filter(p=>p.properties.available&&p.properties.value!==null&&Number.isFinite(p.properties.value)&&p.properties.value>=0.10):pts),
 fc={type:'FeatureCollection',features:displayPts};
 if(S.map.getSource('cells'))S.map.getSource('cells').setData(fc);
 else{
   S.map.addSource('cells',{type:'geojson',data:fc});
   S.map.addLayer({id:'cells',type:'circle',source:'cells',paint:{'circle-radius':['interpolate',['linear'],['zoom'],8,2,11,5,14,8],'circle-opacity':.76,'circle-color':color(lo,hi),'circle-stroke-width':0}});
   S.map.on('click','cells',e=>inspectCell(+e.features[0].properties.cell_id));
   S.map.on('mouseenter','cells',()=>S.map.getCanvas().style.cursor='pointer');
   S.map.on('mouseleave','cells',()=>S.map.getCanvas().style.cursor='')
 }
 S.map.setPaintProperty('cells','circle-color',color(lo,hi));
 $('#baseTime').textContent=`Base: ${x.base_time}`;$('#validTime').textContent=`Valid: ${x.valid_time}`;$('#validCard').textContent=x.valid_time;
 $('#index').textContent=S.idx;$('#hor').textContent=`+${S.h} min`;$('#available').textContent=(x.available_cells??0).toLocaleString();
 $('#max').textContent=x.max_value==null?'—':`${f(x.max_value)} ${x.units==='class'?'':x.units}`;$('#source').textContent=x.source_label||'—';showMetrics();b1m3R1R3Legend(x,lo,hi,displayPts.length);
 if(S.selectedCell!==null){
   try{await inspectCell(S.selectedCell)}catch(e){S.selectedCell=null;resetInspector()}
 }
 if(updateImpact)await loadImpact(false);
}

function fillEvent(e){
 S.event=e;let min=4,max=e.time_states-5;$('#slider').min=min;$('#slider').max=max;
 S.idx=Math.max(min,Math.min(+e.peak_wet_index||min,max));$('#slider').value=S.idx;$('#eventTitle').textContent=`${e.year} historical event`;showMetrics()
}
function stop(update=true){
 S.playing=false;clearTimeout(S.timer);$('#play').textContent='▶ Play hindcast';$('#play').classList.remove('playing');
 if(update)loadImpact(false);
}
async function step(){
 if(!S.playing)return;
 const min=+$('#slider').min,max=+$('#slider').max;
 if(S.idx>=max){S.playing=false;$('#play').textContent='▶ Play hindcast';$('#play').classList.remove('playing');return}
 // Native H2 historical replay cadence is 15 minutes. Advance exactly one source state per frame.
 S.idx+=1;
 $('#slider').value=S.idx;
 // Keep map, selected-cell inspector and affected-asset screening synchronized with every replay frame.
 await loadMap(false);
 await loadImpact(false);
 if(!S.playing){$('#play').textContent='▶ Play hindcast';$('#play').classList.remove('playing');return}
 if(S.idx>=max){S.playing=false;$('#play').textContent='▶ Play hindcast';$('#play').classList.remove('playing');return}
 S.timer=setTimeout(step,650);
}
function toggle(){
 if(S.playing){stop(true);return}
 const min=+$('#slider').min,max=+$('#slider').max;
 if(S.idx>=max){S.idx=min;$('#slider').value=S.idx}
 S.playing=true;$('#play').textContent='❚❚ Pause';$('#play').classList.add('playing');step()
}
async function choose(){
 stop(false);
 let id=$('#event').value,e=S.events.find(x=>x.event_id===id);fillEvent(e);S.selectedCell=null;resetInspector();clearMarkers();clearFocus();await loadMap(true)
}


function b1m3R1R3Legend(x,lo,hi,shown){
 const host=document.querySelector('.inspect.card');if(!host)return;
 let el=document.getElementById('b1m3-r1r3-h3legend');
 if(!el){el=document.createElement('div');el.id='b1m3-r1r3-h3legend';host.appendChild(el)}
 const labels={ml_depth:'ML predicted water depth',physical_depth:'Physical reconstructed water depth',abs_error:'Absolute ML error (not flooding)',ml_flood:'ML flooded/dry classification',ml_wse:'ML water-surface elevation'};
 const dep=['ml_depth','physical_depth'].includes(S.view);
 let gradient=S.view==='ml_flood'?'linear-gradient(90deg,#204fb5,#21bcc4,#f1cf55,#e65e4c)':
  'linear-gradient(90deg,#204fb5,#21bcc4,#f1cf55,#e65e4c)';
 const safe=n=>Number.isFinite(+n)?(+n).toFixed(2):'—';
 el.innerHTML='<strong>'+esc(labels[S.view]||S.view)+'</strong><div class="b1m3-h3-ramp" style="background:'+gradient+'"></div>'+
  '<div class="b1m3-h3-ticks"><span>'+(dep?'0.10':safe(lo))+(S.view==='ml_flood'?'':' '+esc(x.units||'m'))+'</span><span>'+safe(hi)+(S.view==='ml_flood'?'':' '+esc(x.units||'m'))+'</span></div>'+
  '<p>'+(dep?'Display-only flood-depth threshold ≥0.10 m. ':'')+'Showing '+shown.toLocaleString()+' of '+(x.points||[]).length.toLocaleString()+' model cells. Underlying predictions, metrics and the 2022/2023/2024 roles remain unchanged.</p>';
}

async function boot(){
 let [st,ev,rep]=await Promise.all([j('/api/v1/h3/status'),j('/api/v1/history/events'),j('/api/v1/h3/metrics')]);
 S.report=rep;S.events=(ev.items||[]).filter(e=>['EV2022_JUL','EV2023_JUL','EV2024_JUL'].includes(e.event_id));
 $('#state').textContent=st.status==='PASS'?'ML READY':'DEGRADED';$('#state').className='pill '+(st.status==='PASS'?'good':'warn');
 $('#event').innerHTML=S.events.map(e=>`<option value="${esc(e.event_id)}">${e.year} · ${esc(e.ui_badge||e.scientific_role)}</option>`).join('');
 S.map=window.__FloodSenseMap = new maplibregl.Map({container:'map',style:style(),center:[73.52,17.53],zoom:10});S.map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');
 await new Promise(r=>S.map.on('load',r));let a=await j('/data/study_area.json'),b=a.bounds;S.map.fitBounds([[b.west,b.south],[b.east,b.north]],{padding:45,duration:0});
 let q=new URLSearchParams(location.search),eid=q.get('event');if(!eid){let y=(q.get('udate')||'').slice(0,4);if(['2022','2023','2024'].includes(y))eid='EV'+y+'_JUL'}if(eid&&S.events.some(e=>e.event_id===eid))$('#event').value=eid;await choose();
 $('#event').onchange=choose;
 $('#view').onchange=async e=>{stop(false);S.view=e.target.value;resetInspector();S.selectedCell=null;clearFocus();await loadMap(true)};
 $('#horizon').onchange=async e=>{stop(false);S.h=+e.target.value;resetInspector();S.selectedCell=null;clearFocus();await loadMap(true)};
 $('#slider').oninput=e=>{stop(false);S.idx=+e.target.value;resetInspector();S.selectedCell=null;clearFocus();loadMap(false)};
 $('#slider').onchange=()=>loadImpact(false);
 $('#play').onclick=toggle;
 $('#peak').onclick=()=>{stop(false);S.idx=Math.max(4,Math.min(+S.event.peak_wet_index||4,S.event.time_states-5));$('#slider').value=S.idx;resetInspector();S.selectedCell=null;clearFocus();loadMap(true)};
 $('#refreshImpact').onclick=()=>loadImpact(true);
 $('#impactCategory').onchange=renderRows;$('#impactSearch').oninput=renderRows
}
boot().catch(e=>{console.error(e);$('#state').textContent='ERROR';$('#state').className='pill warn';$('#eventTitle').textContent=e.message})