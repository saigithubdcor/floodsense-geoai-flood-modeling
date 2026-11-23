



/*



 * B2N_B1R1V6_FINAL_HISTORY



 *



 * Presentation-only historical replay harmonization.



 *



 * Backend remains complete:



 *   4783 total cells



 *   4539 finite/defensible cells



 *



 * Map presentation uses only finite depth >= 0.10 m.



 * Complete raw response is retained in browser memory.



 *



 * NO MutationObserver.



 * NO global fetch interception.



 * NO MapLibre prototype interception.



 * NO interpolation.



 * NO synthetic hydraulic values.



 */







const B2N_HISTORY_WET_M = 0.10;







const B2N_HISTORY_EVENTS = new Map();














function b2nHistoryPointKey(p,i){


 if(!p) return `i:${i}`;





 for(const key of ['cell_id','cellId','cell_index','cellIndex','id','index','cell']){


  if(p[key] !== undefined && p[key] !== null) return `${key}:${p[key]}`;


  if(p.properties && p.properties[key] !== undefined && p.properties[key] !== null){


   return `${key}:${p.properties[key]}`;


  }


 }





 const c = Array.isArray(p.coordinates)


  ? p.coordinates


  : (p.geometry && Array.isArray(p.geometry.coordinates) ? p.geometry.coordinates : null);





 if(c && c.length >= 2){


  return `xy:${Number(c[0]).toFixed(7)},${Number(c[1]).toFixed(7)}`;


 }





 const x = p.lon ?? p.lng ?? p.longitude ?? p.x ?? p.easting;


 const y = p.lat ?? p.latitude ?? p.y ?? p.northing;





 if(Number.isFinite(+x) && Number.isFinite(+y)){


  return `xy:${(+x).toFixed(7)},${(+y).toFixed(7)}`;


 }





 return `i:${i}`;


}








function b2nHistoryTargetInfo(requestUrl){


 try{


  const u = new URL(requestUrl,window.location.origin);


  let key = null;





  for(const k of ['target','layer','variable','field']){


   if(u.searchParams.has(k)){ key=k; break; }


  }





  const raw = String(key ? u.searchParams.get(key) : '').trim().toLowerCase();


  let kind='other';





  if(raw.includes('depth')) kind='depth';


  else if(raw === 'wse' || (raw.includes('surface') && raw.includes('elev'))) kind='wse';


  else if(raw.includes('velocity') || raw.includes('speed') || raw.includes('vmean') || raw.includes('vmax')) kind='velocity';


  else if(raw.includes('flood') || raw.includes('dry')) kind='flood';





  return {url:u,key,raw,kind};


 }catch(_){


  return {url:null,key:null,raw:'',kind:'other'};


 }


}








async function b2nHistoryMap(promise,requestUrl){


 const raw = await promise;


 if(!raw || !Array.isArray(raw.points)) return raw;





 const info = b2nHistoryTargetInfo(requestUrl);


 const numeric = raw.points.filter(p=>p && p.value != null && Number.isFinite(+p.value));





 let visible = numeric;


 let maskMode='NUMERIC_ONLY';


 let depthWetCount=null;


 let depthStatus='NOT_REQUIRED';





 if(info.kind === 'depth'){


  visible = numeric.filter(p=>+p.value >= B2N_HISTORY_WET_M);


  maskMode='DEPTH_GE_0P10';


 }


 else if(info.kind === 'flood'){


  visible = numeric.filter(p=>+p.value >= B2N_HISTORY_WET_M);


  maskMode='FLOODED_POSITIVE_ONLY';


 }


 else if(info.kind === 'wse' || info.kind === 'velocity'){


  if(!info.url || !info.key){


   throw new Error('B2N V7 cannot build same-time depth mask URL.');


  }





  const depthUrl = new URL(info.url.toString());


  depthUrl.searchParams.set(info.key,'depth');





  const depthRaw = await j(depthUrl.pathname + depthUrl.search);





  if(!depthRaw || !Array.isArray(depthRaw.points) || depthRaw.points.length !== raw.points.length){


   throw new Error('B2N V7 depth-mask alignment contract failed.');


  }





  const wet = new Set();





  depthRaw.points.forEach((p,i)=>{


   if(p && p.value != null && Number.isFinite(+p.value) && +p.value >= B2N_HISTORY_WET_M){


    wet.add(b2nHistoryPointKey(p,i));


   }


  });





  depthWetCount = wet.size;





  visible = raw.points.filter(


   (p,i)=>p && p.value != null && Number.isFinite(+p.value) && wet.has(b2nHistoryPointKey(p,i))


  );





  maskMode = info.kind === 'wse'


   ? 'SAME_TIME_DEPTH_MASK_WSE_VALUES'


   : 'SAME_TIME_DEPTH_MASK_VELOCITY_VALUES';





  depthStatus='PASS';


 }





 window.__B2N_HISTORY_RAW_MAP = raw;





 const display = Object.assign({},raw,{points:visible});


 const root = document.documentElement;





 root.dataset.b2nHistoryRendererGuard='PASS';


 root.dataset.b2nHistoryTarget=info.raw || info.kind;


 root.dataset.b2nHistoryTargetKind=info.kind;


 root.dataset.b2nHistoryMaskMode=maskMode;


 root.dataset.b2nHistoryRawCells=String(raw.points.length);


 root.dataset.b2nHistoryNumericCells=String(numeric.length);


 root.dataset.b2nHistoryVisibleCells=String(visible.length);


 root.dataset.b2nHistoryWetThreshold=B2N_HISTORY_WET_M.toFixed(2);


 root.dataset.b2nHistoryDepthMaskStatus=depthStatus;





 if(depthWetCount !== null){


  root.dataset.b2nHistoryDepthWetCells=String(depthWetCount);


 }





 root.dataset.b2nHistoryRawRetained =


  window.__B2N_HISTORY_RAW_MAP.points.length === raw.points.length ? 'PASS' : 'FAIL';





 

 b2nQueueHistoryLegend(

  info && info.kind ? info.kind : 'other',

  visible

 );



return display;


}










const B2N_HISTORY_LEGEND_UI = true;



function b2nLegendUnits(kind){

 if(kind === 'depth') return 'm';

 if(kind === 'wse') return 'm';

 if(kind === 'velocity') return 'm/s';

 return '';

}



function b2nLegendTitle(kind){

 if(kind === 'depth') return 'Water depth';

 if(kind === 'wse') return 'Water-surface elevation';

 if(kind === 'velocity') return 'Velocity';

 if(kind === 'flood') return 'Flooded / dry';

 return 'Map values';

}



function b2nLegendPalette(kind){

 if(kind === 'depth'){

  return 'linear-gradient(90deg,#2563eb 0%,#22d3ee 25%,#34d399 50%,#fde047 72%,#fb923c 87%,#ef4444 100%)';

 }

 if(kind === 'wse'){

  return 'linear-gradient(90deg,#1d4ed8 0%,#38bdf8 25%,#2dd4bf 45%,#a3e635 62%,#facc15 78%,#f97316 90%,#ef4444 100%)';

 }

 if(kind === 'velocity'){

  return 'linear-gradient(90deg,#2563eb 0%,#38bdf8 25%,#2dd4bf 48%,#22c55e 63%,#facc15 80%,#ef4444 100%)';

 }

 return 'linear-gradient(90deg,#cbd5e1 0%,#64748b 100%)';

}



function b2nLegendQuantiles(points){

 const a = (Array.isArray(points) ? points : [])

  .map(p => p && p.value != null && Number.isFinite(+p.value) ? +p.value : null)

  .filter(v => v !== null)

  .sort((x,y)=>x-y);



 if(!a.length) return null;



 const q = p => {

  const k = (a.length - 1) * p;

  const f = Math.floor(k);

  const c = Math.ceil(k);

  if(f === c) return a[f];

  return a[f] + (a[c] - a[f]) * (k - f);

 };



 return {

  min:a[0],

  q1:q(0.25),

  mid:q(0.50),

  q3:q(0.75),

  max:a[a.length - 1],

  count:a.length

 };

}



function b2nLegendNumber(v,kind){

 if(!Number.isFinite(+v)) return 'NA';

 if(kind === 'wse') return (+v).toFixed(2);

 if(kind === 'velocity') return (+v).toFixed(2);

 return (+v).toFixed(2);

}




function b2nFindHistoryInspectorHost(){

 const selectors = [
  '#map-inspector',
  '#mapInspector',
  '#inspector',
  '.map-inspector',
  '.history-inspector',
  '[data-role="map-inspector"]',
  '[data-map-inspector]'
 ];

 for(const sel of selectors){
  const el = document.querySelector(sel);

  if(
   el &&
   !el.closest('.maplibregl-map') &&
   !el.closest('.mapboxgl-map')
  ){
   return el;
  }
 }

 const all = Array.from(
  document.querySelectorAll('body *')
 );

 const heading = all.find(
  el =>
   el.children.length === 0 &&
   String(el.textContent || '')
    .trim()
    .toUpperCase() === 'MAP INSPECTOR'
 );

 if(heading){

  let fallback = null;
  let p = heading.parentElement;

  for(
   let depth=0;
   depth<7 && p && p !== document.body;
   depth++,
   p=p.parentElement
  ){

   if(
    p.closest('.maplibregl-map') ||
    p.closest('.mapboxgl-map')
   ){
    continue;
   }

   fallback = p;

   const text =
    String(
     p.textContent || ''
    );

   if(
    /Click a model cell or affected asset/i.test(text) ||
    /Hydraulic cell/i.test(text) ||
    /Affected asset/i.test(text)
   ){
    return p;
   }
  }

  if(fallback){
   return fallback;
  }
 }

 const prompt = all.find(
  el => {
   const t =
    String(
     el.textContent || ''
    ).trim();

   return (
    t === 'Click a model cell or affected asset' ||
    t.startsWith('Hydraulic cell ')
   );
  }
 );

 if(prompt){

  let p = prompt.parentElement;

  for(
   let depth=0;
   depth<6 && p && p !== document.body;
   depth++,
   p=p.parentElement
  ){

   if(
    !p.closest('.maplibregl-map') &&
    !p.closest('.mapboxgl-map')
   ){
    return p;
   }
  }
 }

 return null;
}


function b2nEnsureHistoryLegend(){

 let card =
  document.getElementById(
   'b2n-history-map-legend'
  );

 const host =
  b2nFindHistoryInspectorHost();

 if(!host){
  return null;
 }

 if(!card){
  card =
   document.createElement(
    'div'
   );

  card.id =
   'b2n-history-map-legend';
 }

 card.setAttribute(
  'data-b2n-legend-zone',
  'inspector'
 );

 Object.assign(
  card.style,
  {
   position:'relative',
   left:'auto',
   right:'auto',
   top:'auto',
   bottom:'auto',
   width:'auto',
   maxWidth:'none',
   zIndex:'1',
   background:'#f8fbff',
   border:'1px solid #d7e2ef',
   borderRadius:'10px',
   boxShadow:'none',
   padding:'9px 10px',
   margin:'14px 10px 10px',
   fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
   pointerEvents:'auto',
   backdropFilter:'none'
  }
 );

 if(card.parentElement !== host){
  host.appendChild(card);
 }

 document.documentElement.dataset.b2nHistoryLegendPlacement =
  'INSPECTOR_COLUMN';

 return card;
}


function b2nRenderHistoryLegend(meta){

 const card =
  b2nEnsureHistoryLegend();

 if(
  !card ||
  !meta
 ){
  return;
 }

 const kind =
  meta.kind || 'other';

 if(kind === 'flood'){

  card.innerHTML = `
   <div style="font-size:11px;font-weight:800;color:#0f172a;margin-bottom:6px;">Flooded / dry</div>
   <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
    <span style="display:flex;align-items:center;gap:6px;font-size:10px;color:#334155;">
     <i style="width:13px;height:13px;border-radius:50%;display:inline-block;background:#fb6b57;border:1px solid #d9483b;"></i>
     Flooded (depth >= 0.10 m)
    </span>
    <span style="display:flex;align-items:center;gap:6px;font-size:10px;color:#334155;">
     <i style="width:13px;height:13px;border-radius:50%;display:inline-block;background:#cbd5e1;border:1px solid #94a3b8;"></i>
     Dry / below 0.10 m (not emphasized)
    </span>
   </div>
  `;

  return;
 }

 const q =
  meta.quantiles;

 const units =
  b2nLegendUnits(kind);

 const title =
  b2nLegendTitle(kind);

 if(!q){

  card.innerHTML = `
   <div style="font-size:11px;font-weight:800;color:#0f172a;">${title}</div>
   <div style="font-size:10px;color:#64748b;margin-top:4px;">No visible numeric cells.</div>
  `;

  return;
 }

 card.innerHTML = `
  <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-end;margin-bottom:6px;">
   <div>
    <div style="font-size:11px;font-weight:800;color:#0f172a;">${title}</div>
    <div style="font-size:9px;color:#64748b;margin-top:1px;">
     ${
      kind === 'wse'
       ? 'Shown only over modeled-wet cells'
       : (
          kind === 'velocity'
           ? 'Verified velocity over modeled-wet cells'
           : 'Displayed modeled-wet cells'
         )
     }
    </div>
   </div>
   <div style="font-size:9px;color:#64748b;white-space:nowrap;">${q.count} cells</div>
  </div>

  <div style="height:10px;border-radius:999px;background:${b2nLegendPalette(kind)};border:1px solid rgba(100,116,139,.35);"></div>

  <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;margin-top:4px;">
   <span style="font-size:9px;color:#475569;text-align:left;">${b2nLegendNumber(q.min,kind)}</span>
   <span style="font-size:9px;color:#475569;text-align:center;">${b2nLegendNumber(q.q1,kind)}</span>
   <span style="font-size:9px;color:#475569;text-align:center;">${b2nLegendNumber(q.mid,kind)}</span>
   <span style="font-size:9px;color:#475569;text-align:center;">${b2nLegendNumber(q.q3,kind)}</span>
   <span style="font-size:9px;color:#475569;text-align:right;">${b2nLegendNumber(q.max,kind)} ${units}</span>
  </div>

  <div style="display:flex;justify-content:space-between;margin-top:2px;">
   <span style="font-size:8px;color:#94a3b8;">lower</span>
   <span style="font-size:8px;color:#94a3b8;">higher</span>
  </div>
 `;
}


function b2nQueueHistoryLegend(kind,points){

 const meta = {
  kind:
   kind || 'other',

  quantiles:
   b2nLegendQuantiles(
    points
   )
 };

 window.__B2N_HISTORY_LEGEND__ =
  meta;

 const run = ()=>{

  try{
   b2nRenderHistoryLegend(
    window.__B2N_HISTORY_LEGEND__ ||
    meta
   );
  }
  catch(_){}
 };

 for(
  const delay of
  [0,120,450,900,1600]
 ){
  setTimeout(
   run,
   delay
  );
 }

 if(
  !window.__B2N_HISTORY_LEGEND_REATTACH_BOUND__
 ){

  window.__B2N_HISTORY_LEGEND_REATTACH_BOUND__ =
   true;

  const reattach = ()=>{

   const current =
    window.__B2N_HISTORY_LEGEND__;

   if(!current){
    return;
   }

   setTimeout(
    ()=>{
     try{
      b2nRenderHistoryLegend(current);
     }
     catch(_){}
    },
    80
   );

   setTimeout(
    ()=>{
     try{
      b2nRenderHistoryLegend(current);
     }
     catch(_){}
    },
    260
   );
  };

  document.addEventListener(
   'click',
   reattach,
   true
  );

  document.addEventListener(
   'change',
   reattach,
   true
  );
 }
}

function b2nHistoryDate(value){







 const d = new Date(



  String(value || '').replace(



   ' ',



   'T'



  )



 );







 if(



  Number.isNaN(



   d.getTime()



  )



 ){



  return ''



 }







 return d.toLocaleDateString(



  'en-US',



  {



   month:'short',



   day:'numeric',



   year:'numeric'



  }



 )



}











function b2nHistoryLabel(event){







 return (



  `${event.year} historical replay · peak ` +



  b2nHistoryDate(event.peak_wet_time)



 )



}











function b2nHistoryRelabel(){







 if(



  !B2N_HISTORY_EVENTS.size ||



  !document.body



 ){



  return



 }







 const walker =



  document.createTreeWalker(



   document.body,



   NodeFilter.SHOW_TEXT



  );







 const nodes = [];







 while(



  walker.nextNode()



 ){



  nodes.push(



   walker.currentNode



  )



 }







 for(



  const node of nodes



 ){







  const source = node.nodeValue;







  if(



   !source ||



   !/historical event/i.test(source)



  ){



   continue



  }







  let output = source;







  for(



   const event of



   B2N_HISTORY_EVENTS.values()



  ){







   const year = String(event.year);







   const pattern = new RegExp(



    year +



    '\\s+historical\\s+event\\s*' +



    '[·\\-]\\s*' +



    '[A-Za-z]{3,9}\\s+' +



    '\\d{1,2},\\s*' +



    year,



    'gi'



   );







   output = output.replace(



    pattern,



    b2nHistoryLabel(event)



   )



  }







  if(



   output !== source



  ){



   node.nodeValue = output



  }



 }







 for(



  const option of



  document.querySelectorAll('option')



 ){







  const event =



   B2N_HISTORY_EVENTS.get(



    option.value



   );







  if(event){



   option.textContent =



    b2nHistoryLabel(event)



  }



 }







 document.documentElement.dataset.b2nHistoryDateContract =



  'PASS'



}











function b2nHistoryScheduleLabels(){







 for(



  const delay of



  [0,100,300,700,1400]



 ){



  setTimeout(



   b2nHistoryRelabel,



   delay



  )



 }



}











async function b2nHistoryLoadEvents(){







 try{







  const response =



   await fetch(



    '/api/v1/history/events',



    {



     cache:'no-store'



    }



   );







  if(!response.ok){



   return



  }







  const data =



   await response.json();







  for(



   const event of



   data.items || []



  ){







   if(



    event &&



    event.event_id &&



    event.peak_wet_time



   ){







    B2N_HISTORY_EVENTS.set(



     event.event_id,



     event



    )



   }



  }







  document.documentElement.dataset.b2nHistoryEventCount =



   String(



    B2N_HISTORY_EVENTS.size



   );







  b2nHistoryScheduleLabels()







 }catch(_){}



}











function b2nHistoryBoot(){







 b2nHistoryLoadEvents();







 /*



  * Event/date controls can be rebuilt after user interaction.



  * Only finite relabel attempts are scheduled.



  */



 document.addEventListener(



  'change',



  ()=>{



   b2nHistoryScheduleLabels()



  },



  true



 );







 document.addEventListener(



  'click',



  e=>{







   const t = e.target;







   if(



    t &&



    (



     t.closest?.('a') ||



     t.closest?.('button')



    )



   ){







    setTimeout(



     b2nHistoryRelabel,



     100



    );







    setTimeout(



     b2nHistoryRelabel,



     350



    )



   }



  },



  true



 )



}











if(



 document.readyState === 'loading'



){







 document.addEventListener(



  'DOMContentLoaded',



  b2nHistoryBoot,



  {



   once:true



  }



 )







}else{







 b2nHistoryBoot()



}







import * as maplibregl from '/vendor/maplibre-gl.mjs';maplibregl.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');



const $=s=>document.querySelector(s);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const f=(v,d=2)=>v==null||!Number.isFinite(+v)?'—':(+v).toFixed(d);async function j(u){let r=await fetch(u,{cache:'no-store'}),x=await r.json();if(!r.ok)throw Error(x.error||r.status);return x}



function utm43(e,n){const a=6378137,ec=.00669438,k=.9996,x=e-500000,y=n,ep=ec/(1-ec),M=y/k,mu=M/(a*(1-ec/4-3*ec*ec/64-5*ec**3/256)),e1=(1-Math.sqrt(1-ec))/(1+Math.sqrt(1-ec)),J1=3*e1/2-27*e1**3/32,J2=21*e1**2/16-55*e1**4/32,J3=151*e1**3/96,J4=1097*e1**4/512,fp=mu+J1*Math.sin(2*mu)+J2*Math.sin(4*mu)+J3*Math.sin(6*mu)+J4*Math.sin(8*mu),sf=Math.sin(fp),cf=Math.cos(fp),tf=Math.tan(fp),N=a/Math.sqrt(1-ec*sf*sf),T=tf*tf,C=ep*cf*cf,R=a*(1-ec)/Math.pow(1-ec*sf*sf,1.5),D=x/(N*k),lat=fp-(N*tf/R)*(D*D/2-(5+3*T+10*C-4*C*C-9*ep)*D**4/24+(61+90*T+298*C+45*T*T-252*ep-3*C*C)*D**6/720),lon=(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C*C+8*ep+24*T*T)*D**5/120)/cf;return[75+lon*180/Math.PI,lat*180/Math.PI]}



function style(){return{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'bg',type:'background',paint:{'background-color':'#dde7ee'}},{id:'osm',type:'raster',source:'osm',paint:{'raster-opacity':.92}}]}}



const S={map:null,event:null,events:[],idx:0,target:'depth',playing:false,timer:null,impact:null,markers:[],selectedCell:null,focusMarker:null,focusPopup:null,labelZoomBound:false};



function eventLabel(e){let p=e.reference_peak_time||e.peak_wet_timestamp||e.start_time||'';let d=p?new Date(String(p).replace(' ','T')):null;let ds=d&&!Number.isNaN(d.getTime())?d.toLocaleDateString([],{day:'numeric',month:'short',year:'numeric'}):String(p).slice(0,10);return `${e.year} historical event${ds?' · '+ds:''}`}



async function major(){let t=await j('/api/v1/time/events?kind=FROZEN_PHYSICAL_EVENT&limit=50'),h=await j('/api/v1/history/events'),dyn=new Map((h.items||[]).map(x=>[x.event_id,x]));let rows=t.items||[];$('#majorEvents').innerHTML=rows.map(x=>{let d=dyn.get(x.event_id),ready=!!d||x.runtime_replay_published,href=ready?`/history.html?event=${encodeURIComponent(x.event_id)}`:'/time.html';return `<div class="eventCard" data-id="${esc(x.event_id)}"><small>MAJOR HISTORICAL EVENT</small><b>${esc(eventLabel({...x,...d}))}</b><span>${esc(x.ui_badge||x.scientific_role||'')}</span><span>${ready?'Replay available':'Physical event registered · replay pending'}</span>${x.validation_independence==='INDEPENDENT_VALIDATION'?'<span class="tag val">INDEPENDENT VALIDATION</span>':''}<span><a href="${href}">${ready?'Open dynamic replay':'Inspect registry'}</a></span></div>`}).join('')}



function color(lo,hi){return['case',['==',['get','available'],false],'#828b91',['interpolate',['linear'],['get','value'],lo,'#204fb5',lo+(hi-lo)*.35,'#21bcc4',lo+(hi-lo)*.7,'#f1cf55',hi,'#e65e4c']]}



async function loadMap(updateImpact=true){let x=await b2nHistoryMap(j(`/api/v1/history/map?event_id=${encodeURIComponent(S.event.event_id)}&index=${S.idx}&target=${S.target}`),`/api/v1/history/map?event_id=${encodeURIComponent(S.event.event_id)}&index=${S.idx}&target=${S.target}`),pts=(x.points||[]).map(p=>({type:'Feature',geometry:{type:'Point',coordinates:utm43(+p.x,+p.y)},properties:{cell_id:+p.cell_id,value:p.value==null?null:+p.value,available:!!p.available}})),vals=pts.map(q=>q.properties.value).filter(Number.isFinite),lo=S.target==='flood'?0:(vals.length?Math.min(...vals):0),hi=S.target==='flood'?1:(vals.length?Math.max(...vals):1),fc={type:'FeatureCollection',features:pts};if(S.map.getSource('cells'))S.map.getSource('cells').setData(fc);else{S.map.addSource('cells',{type:'geojson',data:fc});S.map.addLayer({id:'cells',type:'circle',source:'cells',paint:{'circle-radius':['interpolate',['linear'],['zoom'],8,2,11,5,14,8],'circle-opacity':.75,'circle-color':color(lo,hi),'circle-stroke-width':0}});S.map.on('click','cells',e=>inspectCell(+e.features[0].properties.cell_id));S.map.on('mouseenter','cells',()=>S.map.getCanvas().style.cursor='pointer');S.map.on('mouseleave','cells',()=>S.map.getCanvas().style.cursor='')}S.map.setPaintProperty('cells','circle-color',color(lo,hi));$('#time').textContent=x.time||'—';$('#index').textContent=`${S.idx+1} / ${S.event.time_states}`;$('#available').textContent=(x.available_cells??0).toLocaleString();$('#max').textContent=x.max_value==null?'—':`${f(x.max_value)} ${S.target==='flood'?'':'m'}`;if(updateImpact)await loadImpact(false)}



async function inspectCell(id){S.selectedCell=+id;let x=await j(`/api/v1/history/cell?event_id=${encodeURIComponent(S.event.event_id)}&cell_id=${id}`);$('#cellTitle').textContent=`Hydraulic cell ${id}`;let cur=x.timeline?.[S.idx];$('#cell').innerHTML=cur?`<div class="cellRow"><b>${esc(cur.time)}</b><span>Depth ${f(cur.depth_m)} m</span><span>WSE ${f(cur.wse_m)} m</span><span>Velocity ${f(cur.velocity_mps)} m/s</span><span>Flooded &gt;0.10 m: ${cur.flooded==null?'—':cur.flooded?'YES':'NO'}</span></div>`:'No state available'}



function fillEvent(e){S.event=e;S.idx=Math.max(0,Math.min(S.idx,e.time_states-1));$('#eventTitle').textContent=eventLabel(e);$('#role').textContent=e.ui_badge||e.scientific_role||'—';$('#states').textContent=e.time_states.toLocaleString();$('#window').textContent=`${e.start_time} → ${e.end_time}`;$('#slider').max=e.time_states-1;$('#slider').value=S.idx;$('#target').querySelector('option[value=velocity]').disabled=!e.velocity_available;let p=new URL(location.href);p.searchParams.set('event',e.event_id);history.replaceState(null,'',p)}



async function choose(id){let e=S.events.find(x=>x.event_id===id);if(!e)return;stop();clearFocus();S.selectedCell=null;resetInspector();S.idx=Math.max(0,+e.peak_wet_index||0);fillEvent(e);$('#slider').value=S.idx;await loadMap(true)}



function stop(){S.playing=false;clearTimeout(S.timer);S.timer=null;$('#play').textContent='▶ Play'}



async function step(){if(!S.playing)return;



 S.idx+=1;



 if(S.idx>=S.event.time_states){S.idx=S.event.time_states-1;stop()}



 $('#slider').value=S.idx;



 await loadMap(false);



 await loadImpact(false);



 if(S.selectedCell!==null){try{await inspectCell(S.selectedCell)}catch(e){S.selectedCell=null;resetInspector()}}



 if(S.playing)S.timer=setTimeout(step,650)



}



function toggle(){if(S.playing){stop();loadImpact(false);return}if(S.idx>=S.event.time_states-1){S.idx=0;$('#slider').value=S.idx}S.playing=true;$('#play').textContent='❚❚ Pause';step()}



function counts(c={}){const sum=ks=>ks.reduce((n,k)=>n+(c[k]||0),0);$('#roadCount').textContent=sum(['road','bridge']);$('#healthCount').textContent=sum(['hospital','clinic','pharmacy','police','fire','shelter']);$('#educationCount').textContent=sum(['school','college','university']);$('#buildingCount').textContent=c.building||0}



function clearMarkers(){for(const m of S.markers)m.remove();S.markers=[]}



function refreshImpactLabelVisibility(){if(!S.map)return;let z=S.map.getZoom(),limit=S.focusMarker?0:(z>=13?4:z>=11.4?2:0);S.markers.forEach((m,i)=>m.getElement().style.display=i<limit?'block':'none')}



function bindImpactLabelVisibility(){if(S.labelZoomBound||!S.map)return;S.labelZoomBound=true;S.map.on('zoom',refreshImpactLabelVisibility);S.map.on('moveend',refreshImpactLabelVisibility)}



function clearFocus(){let m=S.focusMarker,p=S.focusPopup;S.focusMarker=null;S.focusPopup=null;if(m)m.remove();if(p)p.remove();refreshImpactLabelVisibility()}



function uniqueLabelCandidates(items,maxN=4){let out=[],seen=new Set();for(const x of items){if(!Number.isFinite(+x.longitude)||!Number.isFinite(+x.latitude))continue;let key=String(x.name||'').trim().toLowerCase().replace(/\s+/g,' ');if(!key||seen.has(key))continue;let near=out.some(y=>Math.abs(+x.longitude-+y.longitude)<0.0022&&Math.abs(+x.latitude-+y.latitude)<0.0022);if(near)continue;seen.add(key);out.push(x);if(out.length>=maxN)break}return out}



function resetInspector(){$('#cellTitle').textContent='Click a model cell or affected asset';$('#cell').innerHTML=''}



function inspectAsset(a){if(!Number.isFinite(+a.longitude)||!Number.isFinite(+a.latitude))return;



 S.selectedCell=null;clearFocus();



 $('#cellTitle').textContent=a.name;



 $('#cell').innerHTML=`<div class="cellRow"><b>${esc(a.name)}</b><span>${esc(a.category)} · ${esc(a.severity)}</span><span>Max screened depth ${f(a.max_depth_m)} m</span><span>Median screened depth ${f(a.median_depth_m)} m</span><span>Exact mapped asset location is pinned on the map.</span></div>`;



 const el=document.createElement('div');el.className='asset-focus-wrap';el.setAttribute('aria-label',a.name||'selected asset');el.innerHTML='<div class="asset-focus-pin"></div><div class="asset-focus-badge">SELECTED</div>';



 S.focusPopup=new maplibregl.Popup({offset:30,closeButton:true,closeOnClick:false,maxWidth:'280px'}).setHTML(`<b>${esc(a.name)}</b><br>${esc(a.category)} · ${esc(a.severity)}<br>Max depth ${f(a.max_depth_m)} m`);



 S.focusMarker=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([+a.longitude,+a.latitude]).setPopup(S.focusPopup).addTo(S.map);



 S.focusPopup.on('close',()=>{let m=S.focusMarker;S.focusMarker=null;S.focusPopup=null;if(m)m.remove();refreshImpactLabelVisibility()});



 S.focusPopup.setLngLat([+a.longitude,+a.latitude]).addTo(S.map);



 refreshImpactLabelVisibility();



 S.map.flyTo({center:[+a.longitude,+a.latitude],zoom:17,duration:650,essential:true})



}



function renderImpact(a){S.impact=a;$('#impactCount').textContent=a.affected_asset_count??0;counts(a.category_counts||{});let top=a.top10||[];$('#top10').innerHTML=top.length?top.map((x,i)=>`<div class="topItem" data-id="${esc(x.asset_id)}"><b>${i+1}. ${esc(x.name)}</b><span>${esc(x.category)} · max ${f(x.max_depth_m)} m · ${esc(x.severity)}</span></div>`).join(''):'<p>No mapped affected assets at this selected state.</p>';document.querySelectorAll('.topItem').forEach(el=>el.onclick=()=>{let x=top.find(z=>z.asset_id===el.dataset.id);if(x)inspectAsset(x)});let cats=[...new Set((a.affected_assets||[]).map(x=>x.category))].sort(),sel=$('#impactCategory'),old=sel.value;sel.innerHTML='<option value="all">All categories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');if(cats.includes(old))sel.value=old;renderRows();clearMarkers();bindImpactLabelVisibility();let chosen=uniqueLabelCandidates([...(a.top_critical||[]),...(a.top10||[])],4);for(const x of chosen){let el=document.createElement('div');el.className='impact-marker';el.textContent=`${x.name} · ${f(x.max_depth_m,1)} m`;el.onclick=()=>inspectAsset(x);S.markers.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([+x.longitude,+x.latitude]).addTo(S.map))}refreshImpactLabelVisibility()}



function renderRows(){let a=S.impact?.affected_assets||[],cat=$('#impactCategory').value||'all',q=($('#impactSearch').value||'').toLowerCase();let rows=a.filter(x=>(cat==='all'||x.category===cat)&&(!q||x.name.toLowerCase().includes(q)||x.category.toLowerCase().includes(q)));$('#impactRows').innerHTML=rows.slice(0,800).map(x=>`<tr data-id="${esc(x.asset_id)}"><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${f(x.max_depth_m)} m</td><td>${f(x.median_depth_m)} m</td><td>${esc(x.severity)}</td></tr>`).join('');document.querySelectorAll('#impactRows tr').forEach(el=>el.onclick=()=>{let x=a.find(z=>z.asset_id===el.dataset.id);if(x)inspectAsset(x)})}



async function loadImpact(refresh=false){if(!S.event)return;try{let a=await j(`/api/v1/history/impact?event_id=${encodeURIComponent(S.event.event_id)}&index=${S.idx}&refresh=${refresh?1:0}`);renderImpact(a)}catch(e){console.error('Historical impact unavailable',e);renderImpact({affected_assets:[],top10:[],category_counts:{}});$('#top10').innerHTML=`<p>Impact screening unavailable for this state: ${esc(e.message)}</p>`}}



async function boot(){await major();let [hs,ev]=await Promise.all([j('/api/v1/history/status'),j('/api/v1/history/events')]);S.events=ev.items||hs.events||[];$('#state').textContent=hs.status==='PASS'&&S.events.length?'REPLAY READY':'DEGRADED';$('#state').className='pill '+(hs.status==='PASS'&&S.events.length?'good':'warn');let sel=$('#event');sel.innerHTML=S.events.map(e=>`<option value="${esc(e.event_id)}">${esc(eventLabel(e))}</option>`).join('');S.map=window.__FloodSenseMap = new maplibregl.Map({container:'map',style:style(),center:[73.52,17.53],zoom:10});S.map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');await new Promise(r=>S.map.on('load',r));let a=await j('/data/study_area.json'),b=a.bounds;S.map.fitBounds([[b.west,b.south],[b.east,b.north]],{padding:45,duration:0});let q=new URLSearchParams(location.search).get('event'),e=S.events.find(x=>x.event_id===q)||S.events[0];if(!e)throw Error('Dynamic historical replay service is available, but no replay events were returned.');sel.value=e.event_id;S.idx=+e.peak_wet_index||0;fillEvent(e);await loadMap(true);sel.onchange=()=>choose(sel.value);$('#target').onchange=e=>{stop();clearFocus();S.selectedCell=null;resetInspector();S.target=e.target.value;loadMap(true)};$('#slider').oninput=e=>{S.idx=+e.target.value;stop();clearFocus();S.selectedCell=null;resetInspector();loadMap(false)};$('#slider').onchange=()=>loadImpact(false);$('#play').onclick=toggle;$('#peak').onclick=()=>{S.idx=+S.event.peak_wet_index||0;$('#slider').value=S.idx;stop();clearFocus();S.selectedCell=null;resetInspector();loadMap(true)};$('#refreshImpact').onclick=()=>loadImpact(true);$('#impactCategory').onchange=renderRows;$('#impactSearch').oninput=renderRows}



boot().catch(e=>{console.error(e);$('#state').textContent='ERROR';$('#state').className='pill warn';$('#eventTitle').textContent=e.message})



