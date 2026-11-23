/* FloodSense V4: additive routing, honest impact availability and Outlook map presentation.
 * No writes to scientific models, depth values, scenario forcing or asset geometries.
 */
(()=>{
'use strict';
if(window.__FSV4Installed)return;window.__FSV4Installed=true;
const page=location.pathname.split('/').pop()||'index.html';
const routes=['index.html','weather.html','time.html','history.html','hindcast.html','outlook.html'];
if(!routes.includes(page))return;
const $=s=>document.querySelector(s);
const dateRx=/^\d{4}-\d{2}-\d{2}$/;
const valid=d=>{if(!dateRx.test(d||''))return false;const x=new Date(d+'T12:00:00');return Number.isFinite(+x)&&[x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-')===d;};
const today=()=>{const d=new Date();return[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const eventDates={'2021-07-22':'EV2021_JUL','2022-07-12':'EV2022_JUL','2023-07-19':'EV2023_JUL','2024-07-14':'EV2024_JUL'};
const eventIds=new Set(Object.values(eventDates));
const qs=new URLSearchParams(location.search);
function navigate(day,st){
 const state=String(st.state||'');
 if(state==='REGISTERED_REPLAY'){
  const e=String(st.event_id||eventDates[day]||'');
  if(!eventIds.has(e))throw Error('Registered event identity not validated');
  return '/history.html?event='+encodeURIComponent(e)+'&udate='+encodeURIComponent(day);
 }
 if(day<today())return '/?udate='+encodeURIComponent(day);
 const h=Number(qs.get('h'));
 return '/outlook.html?udate='+encodeURIComponent(day)+(page==='outlook.html'&&[3,6,12,24,48,72].includes(h)?'&h='+h:'');
}
async function dateResponse(day){
 const r=await fetch('/api/v1/integration/impact-availability?date='+encodeURIComponent(day),{cache:'no-store'});
 if(!r.ok)throw Error('Date/impact support service HTTP '+r.status);
 return r.json();
}
function notice(anchor){
 const el=document.createElement('div');el.id='fs-v4-date-notice';
 el.style.cssText='font:12px/1.4 system-ui,sans-serif;padding:5px 8px;color:#27415b;max-width:450px;white-space:normal';
 anchor?.appendChild(el);return el;
}
let operation=0;
function installDateRouting(){
 const bar=$('#floodsense-r5-statebar');if(!bar)return false;
 const date=bar.querySelector('input[type="date"]');if(!date)return false;
 const apply=[...bar.querySelectorAll('button')].find(b=>b.textContent.trim()==='Apply to this page');
 const feedback=notice(bar);
 const go=document.createElement('button');go.type='button';go.textContent='Open appropriate view';go.title='Explicitly open the supported historical event, dated GeoOps or Outlook';
 go.style.cssText='cursor:pointer;border:1px solid #b4c7d9;border-radius:6px;background:#eef5ff;color:#174879;font:600 12px system-ui;padding:6px 9px';
 // V4.1: prevent the shared toolbar from expanding into a tall Outlook header.
 // Inline sizing only; does not change routing, dates or API behavior.
 date.style.setProperty('width','168px','important');
 date.style.setProperty('min-width','148px','important');
 date.style.setProperty('flex','0 0 168px','important');
 go.style.whiteSpace='nowrap';go.style.flex='0 0 auto';
 [apply,...bar.querySelectorAll('button')].filter(Boolean).forEach(b=>{b.style.whiteSpace='nowrap';b.style.flex='0 0 auto';});
 bar.style.flexWrap='wrap';bar.style.columnGap='7px';bar.style.rowGap='4px';
 const stateLabel=[...bar.children].find(e=>e.tagName==='SPAN'&&e!==feedback);
 if(stateLabel){stateLabel.style.minWidth='115px';stateLabel.style.flex='1 1 150px';}
 date.insertAdjacentElement('afterend',go);
 async function commit(){
  const d=date.value,id=++operation;
  if(!valid(d)){feedback.textContent='Invalid date; no navigation';return;}
  go.disabled=true;feedback.textContent='Checking source support for '+d+'...';
  try{const st=await dateResponse(d);if(operation!==id||date.value!==d)return;
      if(st.status==='UNAVAILABLE_NOT_ZERO')feedback.textContent='Hydraulic impact forecast unavailable (not zero). Opening supported view...';
      const target=navigate(d,st);location.assign(target);
  }catch(e){if(operation===id)feedback.textContent='Routing HOLD: '+String(e.message||e)+'; page unchanged';}
  finally{if(operation===id)go.disabled=false;}
 }
 go.addEventListener('click',commit);
 // An explicit Apply in GeoOps for today/future should go to Outlook, not an obsolete reference/demo.
 // Earlier dates retain the accepted GeoOps native Apply behavior.
 if(page==='index.html'&&apply)apply.addEventListener('click',e=>{
  const d=date.value;
  if(!valid(d)||d<today())return;
  e.preventDefault();e.stopImmediatePropagation();commit();
 },true);
 date.addEventListener('input',()=>{operation++;feedback.textContent='Date changed. Select Apply or Open appropriate view to navigate.';},true);
 const selected=qs.get('udate');
 if(valid(selected)&&selected>=today()&&page==='index.html'){
  dateResponse(selected).then(st=>{
   if(st.status==='UNAVAILABLE_NOT_ZERO')feedback.textContent='No validated date-conditioned hydraulic impacts for this date (UNAVAILABLE, not zero). Use Outlook for scenario context.';
  }).catch(()=>{feedback.textContent='Impact support check unavailable; no dry/zero claim made.';});
 }
 return true;
}
let routingReady=false;
function startRouting(){if(routingReady)return;routingReady=installDateRouting();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startRouting,{once:true});else startRouting();
// Secondary late check only if native page added its toolbar asynchronously.
setTimeout(startRouting,1500);

function installOutlookMap(){
 if(page!=='outlook.html'||$('#fs-v4-clarity'))return;
 const legend=$('#legendTitle');if(!legend)return;
 const row=document.createElement('div');row.id='fs-v4-clarity';
 row.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:9px 0;color:#29465d;font:12px system-ui';
 const label=document.createElement('label');label.textContent='Hydraulic map appearance';
 const opt=document.createElement('select');opt.id='fs-v43-display';opt.setAttribute('aria-label','Hydraulic map appearance');
 opt.style.cssText='width:100%;padding:6px;border:1px solid #a1bdce;border-radius:6px;background:#fff;color:#173956';
 opt.innerHTML='<option value="solid">GeoOps solid cells (default)</option><option value="light">Lighter optional view</option>';
 opt.value='solid';
 const msg=document.createElement('span');msg.id='fs-v43-note';
 msg.textContent='Display cells are opaque when their scenario map values are valid; original physics unchanged.';
 msg.style.cssText='font-size:11px;line-height:1.35';
 label.appendChild(opt);row.append(label,msg);legend.parentElement?.appendChild(row);
 const ramp=legend.parentElement?.querySelector('.ramp');
 const geoColors=['#2354b8','#1bbfc5','#eed253','#eb6656'];
 const alternate=['#214fb2','#16b8c5','#61c96c','#f0d151','#eb6554'];
 const paletteByTarget={flood:['#60a5fa','#22d3ee','#22c55e','#eab308','#f97316','#dc2626'],
   wse:['#4338ca','#2563eb','#06b6d4','#22c55e','#facc15','#ef4444'],
   vmean:['#2563eb','#06b6d4','#22c55e','#eab308','#f97316','#dc2626'],
   vmax:['#1d4ed8','#0891b2','#16a34a','#ca8a04','#ea580c','#b91c1c']};
 const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const sync=(m,layer,property,value)=>{if(!eq(m.getPaintProperty(layer,property),value))m.setPaintProperty(layer,property,value);};
 const interp=(lo,hi,colors,positions)=>{
   const result=['interpolate',['linear'],['get','value']];
   for(let i=0;i<colors.length;i++)result.push(lo+(hi-lo)*positions[i],colors[i]);
   return result;
 };
 const getRange=expression=>{
   if(!Array.isArray(expression)||expression[0]!=='interpolate'||!eq(expression[2],['get','value'])||expression.length<7)return null;
   const lo=Number(expression[3]),hi=Number(expression[expression.length-2]);
   return Number.isFinite(lo)&&Number.isFinite(hi)&&hi>lo?[lo,hi]:null;
 };
 function setRamp(colors){
   if(!ramp)return;
   const g='linear-gradient(90deg,'+colors.join(',')+')';
   if(ramp.style.background!==g)ramp.style.background=g;
 }
 let lastTarget='',lastNote='',lastHi=NaN;
 function apply(){
  const m=window.__FloodSenseMap;
  if(!m||!m.isStyleLoaded()||!m.getLayer('cells'))return;
  const t=$('#target')?.value||'depth',solid=opt.value==='solid';
  const current=m.getPaintProperty('cells','circle-color');
  let upper=null;
  if(t==='depth'){
   const range=getRange(current);
   if(!range){msg.textContent='Waiting for the native depth color range; values remain unchanged.';return;}
   const [lo,hi]=range;upper=hi;
   sync(m,'cells','circle-color',solid?
     interp(lo,hi,geoColors,[0,.34,.68,1]):
     interp(lo,hi,alternate,[0,.28,.55,.76,1]));
   setRamp(solid?geoColors:alternate);
  }else{
   // Native Outlook exclusively owns non-depth value-to-color mappings.
   // Flood agreement is an ensemble FRACTION, never depth or flood probability.
   if(paletteByTarget[t])setRamp(paletteByTarget[t]);
  }
  // The native display source already filters to valid numeric / wet cells. Its
  // `available` flag is not equivalent to the feature's numeric validity and
  // previously made legitimate displayed points nearly invisible (0.10 alpha).
  // Never change source values, selected points or feature IDs here.
  const visible=['case',['==',['get','valid_value'],true],solid?.98:.70,0];
  const radius=solid?
    ['interpolate',['linear'],['zoom'],8,2.65,10,4.2,12,6.0,14,8.1,16,9.7]:
    ['interpolate',['linear'],['zoom'],8,2.55,10,3.8,12,5.55,14,7.55,16,9.1];
  try{
   sync(m,'cells','circle-opacity',visible);
   sync(m,'cells','circle-radius',radius);
   sync(m,'cells','circle-blur',0);
   sync(m,'cells','circle-stroke-width',solid?.36:.18);
   sync(m,'cells','circle-stroke-color','#fff');
   sync(m,'cells','circle-stroke-opacity',solid?.65:.38);
   if(m.getLayer('cells-envelope')){
    const visibility=solid?'none':'visible';
    if(m.getLayoutProperty('cells-envelope','visibility')!==visibility)m.setLayoutProperty('cells-envelope','visibility',visibility);
    if(!solid){sync(m,'cells-envelope','circle-opacity',.025);sync(m,'cells-envelope','circle-blur',.25);}
   }
   if(t==='flood'){
    const range=$('#range');
    if(range&&range.textContent!=='10% → 100% scenario agreement (not flood probability)')
      range.textContent='10% → 100% scenario agreement (not flood probability)';
    if(lastTarget!==t||lastNote!==opt.value){
      msg.textContent='Blue = lower scenario agreement; red = higher agreement, NOT deeper water or flood probability.';
    }
   }else if(t==='depth'){
    if(lastTarget!==t||lastNote!==opt.value||Math.abs(upper-lastHi)>.004){
      msg.textContent=(solid?'GeoOps-style opaque cell markers. ':'Lighter optional markers. ')+
       'Depth palette follows the selected horizon/statistic: upper bound '+upper.toFixed(2)+' m. Not a date-specific forecast.';
    }
   }else if(lastTarget!==t||lastNote!==opt.value){
    msg.textContent='Native '+(legend.textContent||t)+' colors and numerical scale preserved; cell markers are more legible.';
   }
   lastTarget=t;lastNote=opt.value;lastHi=upper===null?NaN:upper;
  }catch(e){msg.textContent='Hydraulic style is loading; model data and native palette preserved.';}
 }
 opt.addEventListener('change',()=>{lastNote='';apply();});
 const map=window.__FloodSenseMap;
 if(map){map.on('idle',apply);map.on('styledata',()=>setTimeout(apply,130));}
 $('#target')?.addEventListener('change',()=>{lastTarget='';setTimeout(apply,250);setTimeout(apply,950);});
 $('#stat')?.addEventListener('change',()=>{lastHi=NaN;setTimeout(apply,380);setTimeout(apply,1100);});
 $('#hours')?.addEventListener('click',()=>{lastHi=NaN;setTimeout(apply,380);setTimeout(apply,1100);});
 const timer=setInterval(apply,1800);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 apply();
}
function installOutlookAvailability(){
 if(page!=='outlook.html'||window.__FSV43AvailabilityReady)return;
 const status=$('#impactSource');if(!status)return;
 window.__FSV43AvailabilityReady=true;
 function syncAvailability(){
  const s=(status.textContent||'').trim().toUpperCase();
  if(s!=='UNAVAILABLE'&&s!=='SOURCE_UNAVAILABLE'&&s!=='ERROR')return;
  // A failed/unavailable screening request must never read as 0 impacted assets.
  for(const id of ['impactCount','roadCount','healthCount','educationCount','buildingCount','criticalCount']){
   const el=$('#'+id);if(el&&el.textContent!=='—')el.textContent='—';
  }
  const top=$('#top10');if(top)top.textContent='Impact screening unavailable for this horizon; this does not mean zero affected places.';
  const inventory=$('#inventoryNote');if(inventory)inventory.textContent='No validated impact inventory returned; the map is an unconditioned scenario visualization.';
 }
 const observer=new MutationObserver(()=>setTimeout(syncAvailability,0));
 observer.observe(status,{childList:true,subtree:true,characterData:true});
 window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
 syncAvailability();
}
function installOutlookReturnView(){
 if(page!=='outlook.html'||window.__FSV43ReturnViewReady)return;
 const map=window.__FloodSenseMap, title=$('#cellTitle');
 if(!map||!title)return;
 window.__FSV43ReturnViewReady=true;
 const btn=document.createElement('button');btn.id='fs-v43-return-map';btn.textContent='← Return to previous map view';
 btn.type='button';btn.hidden=true;
 btn.style.cssText='margin:9px 0;padding:7px 11px;border:1px solid #a9c6e1;border-radius:6px;background:#edf5ff;color:#174575;cursor:pointer;max-width:100%';
 title.insertAdjacentElement('afterend',btn);
 const nativeFlyTo=map.flyTo.bind(map);let previous=null,restoring=false;
 map.flyTo=function(options){
  if(!restoring&&options&&Number(options.zoom)>=15&&options.center){
   const c=map.getCenter();previous={center:[c.lng,c.lat],zoom:map.getZoom(),bearing:map.getBearing?.()||0,pitch:map.getPitch?.()||0};
   btn.hidden=false;
  }
  return nativeFlyTo(options);
 };
 btn.addEventListener('click',()=>{
  if(!previous)return;
  const old=previous;previous=null;btn.hidden=true;restoring=true;
  try{nativeFlyTo({...old,duration:500,essential:true});}finally{restoring=false;}
 });
 for(const selector of ['#hours','#target','#stat']){
  $(selector)?.addEventListener('click',()=>{previous=null;btn.hidden=true;},true);
 }
}
function startMap(){if(page!=='outlook.html')return;if($('#legendTitle')){installOutlookMap();installOutlookAvailability();installOutlookReturnView();}else setTimeout(startMap,400);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startMap,{once:true});else startMap();
/* V4.3.2: preserve a valid scenario-impact view when the backend does not
 * support forced refresh. This is a non-recomputing server recheck, not a
 * validated date-conditioned forecast. No hydraulic map styling changes. */
function installSafeImpactRefresh(){
 if(page!=='outlook.html'||window.__FSV432ImpactRefreshInstalled)return;
 window.__FSV432ImpactRefreshInstalled=true;
 // Capture before outlook.js's native onclick=loadImpact(true), whose catch
 // destructively replaces a valid cached inventory with an empty one.
 document.addEventListener('click',async e=>{
  const button=e.target&&e.target.closest?e.target.closest('#refreshImpact'):null;
  if(!button)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(button.disabled)return;
  const active=$('#hours button.active');
  const horizon=Number(active?.dataset.h||24),stat=$('#stat')?.value||'median';
  if(![3,6,12,24,48,72].includes(horizon))return;
  let notice=$('#fs-v432-refresh-status');
  if(!notice){notice=document.createElement('span');notice.id='fs-v432-refresh-status';notice.setAttribute('role','status');
   notice.style.cssText='display:block;font:11px/1.4 system-ui;margin-top:6px;color:#575d6c;max-width:390px';
   button.insertAdjacentElement('afterend',notice);}
  const prior=button.textContent;button.disabled=true;button.textContent='Rechecking…';
  notice.textContent='Checking the supported scenario-impact cache; no model re-run or new forecast.';
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
  try{
   const url='/api/v1/impact/ensemble?horizon='+horizon+'&stat='+encodeURIComponent(stat)+'&conditioning=auto&refresh=0';
   const res=await fetch(url,{cache:'no-store',signal:ctl.signal});
   if(!res.ok)throw Error('HTTP '+res.status);
   const result=await res.json();
   if(!result||!Array.isArray(result.affected_assets)||!Number.isFinite(Number(result.affected_asset_count)) || Number(result.affected_asset_count)<0)
    throw Error('Invalid scenario inventory');
   // Do not apply a response if the user switched horizon/stat during the request.
   if(Number($('#hours button.active')?.dataset.h||24)!==horizon||($('#stat')?.value||'median')!==stat){
    notice.textContent='View changed during recheck; previous response discarded.';return;}
   notice.textContent='Cached scenario screening verified for +'+horizon+' h. Refreshing the displayed context (not a live flood forecast).';
   // Use the native *supported* load() path, which re-renders cells, GIS
   // markers, inspectors and the complete asset inventory together.
   const nativeActive=$('#hours button.active');
   if(!nativeActive)throw Error('Horizon control unavailable');
   nativeActive.click();
  }catch(err){
   // Crucially: do not call native loadImpact(true) or render a synthetic 0.
   // Keep the last successfully loaded same-horizon scenario inventory.
   notice.textContent='Recheck unavailable ('+String(err.message||err)+'). The previously displayed scenario screening was kept unchanged; it is not a fresh or date-conditioned forecast.';
   notice.style.color='#a16207';
  }finally{clearTimeout(timer);button.disabled=false;button.textContent=prior;}
 },true);
 const button=$('#refreshImpact');if(button){button.textContent='Recheck scenario context';button.title='Recheck supported cached scenario assets, without forcing a physical-model rerun';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installSafeImpactRefresh,{once:true});else installSafeImpactRefresh();
window.__FSV4Test={valid,navigate};
})();
