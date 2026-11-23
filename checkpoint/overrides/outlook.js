import * as maplibregl from '/vendor/maplibre-gl.mjs';
maplibregl.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');

const $=s=>document.querySelector(s),H=[3,6,12,24,48,72];
const qp=new URLSearchParams(location.search);const qh=+qp.get('h');
const S={h:H.includes(qh)?qh:24,target:'depth',stat:'median',map:null,cond:null,impact:null,impactMarkers:[],validTimes:null,playTimer:null,playingForecast:false,focusMarker:null,focusPopup:null,labelZoomBound:false};
const f=(v,d=2)=>v==null||!Number.isFinite(+v)?'—':(+v).toFixed(d);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function j(u){let r=await fetch(u,{cache:'no-store'}),x=await r.json();if(!r.ok)throw Error(x.error||r.status);return x}
function utm43(e,n){const a=6378137,ec=.00669438,k=.9996,x=e-500000,y=n,ep=ec/(1-ec),M=y/k,mu=M/(a*(1-ec/4-3*ec*ec/64-5*ec**3/256)),e1=(1-Math.sqrt(1-ec))/(1+Math.sqrt(1-ec)),J1=3*e1/2-27*e1**3/32,J2=21*e1**2/16-55*e1**4/32,J3=151*e1**3/96,J4=1097*e1**4/512,fp=mu+J1*Math.sin(2*mu)+J2*Math.sin(4*mu)+J3*Math.sin(6*mu)+J4*Math.sin(8*mu),sf=Math.sin(fp),cf=Math.cos(fp),tf=Math.tan(fp),N=a/Math.sqrt(1-ec*sf*sf),T=tf*tf,C=ep*cf*cf,R=a*(1-ec)/Math.pow(1-ec*sf*sf,1.5),D=x/(N*k),lat=fp-(N*tf/R)*(D*D/2-(5+3*T+10*C-4*C*C-9*ep)*D**4/24+(61+90*T+298*C+45*T*T-252*ep-3*C*C)*D**6/720),lon=(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C*C+8*ep+24*T*T)*D**5/120)/cf;return[75+lon*180/Math.PI,lat*180/Math.PI]}
function style(){return{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'bg',type:'background',paint:{'background-color':'#dde7ee'}},{id:'osm',type:'raster',source:'osm','paint':{'raster-opacity':.92}}]}}
function targetName(t){
 return({
  depth:'Water depth',
  flood:'Scenario flood agreement',
  wse:'Water-surface elevation',
  vmean:'Mean flow speed',
  vmax:'Peak flow speed'
 })[t]||t
}

function targetUnit(t){
 return t==='flood'?'':(
  t==='vmean'||t==='vmax'?
  'm/s':
  'm'
 )
}

function zoom4(a){
 return[
  'interpolate',
  ['linear'],
  ['zoom'],
  8,a[0],
  10,a[1],
  12,a[2],
  14,a[3]
 ]
}

function color(lo,hi){

 if(S.target==='flood'){
  return[
   'interpolate',
   ['linear'],
   ['get','value'],
   .10,'#60a5fa',
   .25,'#22d3ee',
   .50,'#22c55e',
   .70,'#eab308',
   .85,'#f97316',
   1,'#dc2626'
  ]
 }

 if(S.target==='wse'){
  return[
   'interpolate',
   ['linear'],
   ['get','value'],
   lo,'#4338ca',
   lo+(hi-lo)*.22,'#2563eb',
   lo+(hi-lo)*.43,'#06b6d4',
   lo+(hi-lo)*.63,'#22c55e',
   lo+(hi-lo)*.81,'#facc15',
   hi,'#ef4444'
  ]
 }

 if(S.target==='vmean'){
  return[
   'interpolate',
   ['linear'],
   ['get','value'],
   lo,'#2563eb',
   lo+(hi-lo)*.20,'#06b6d4',
   lo+(hi-lo)*.42,'#22c55e',
   lo+(hi-lo)*.65,'#eab308',
   lo+(hi-lo)*.82,'#f97316',
   hi,'#dc2626'
  ]
 }

 if(S.target==='vmax'){
  return[
   'interpolate',
   ['linear'],
   ['get','value'],
   lo,'#1d4ed8',
   lo+(hi-lo)*.20,'#0891b2',
   lo+(hi-lo)*.42,'#16a34a',
   lo+(hi-lo)*.64,'#ca8a04',
   lo+(hi-lo)*.80,'#ea580c',
   hi,'#b91c1c'
  ]
 }

 return[
  'interpolate',
  ['linear'],
  ['get','value'],
  lo,'#214fb2',
  lo+(hi-lo)*.28,'#16b8c5',
  lo+(hi-lo)*.55,'#61c96c',
  lo+(hi-lo)*.76,'#f0d151',
  hi,'#eb6554'
 ]
}


function depthOpacity(){

 return[
  'interpolate',
  ['linear'],
  ['get','wet_depth'],

  .10,.92,
  .15,.94,
  .20,.96,
  .30,.97,
  .50,.98,
  .75,.985,
  1.25,.99,
  2.00,.99,
  4.00,.995
 ]
}


function applyStyle(lo,hi){

 let env=S.map.getLayer('cells-envelope');


 // ==========================================================
 // WATER DEPTH
 //
 // Balanced translucency:
 // road/map detail still visible,
 // but hydraulic field is unmistakable.
 // ==========================================================

 if(S.target==='depth'){

  S.map.setPaintProperty(
   'cells',
   'circle-radius',
   [
    'interpolate',
    ['linear'],
    ['zoom'],
    8,4.00,
    10,6.00,
    12,8.60,
    14,10.90
   ]
  );

  S.map.setPaintProperty(
   'cells',
   'circle-opacity',
   depthOpacity()
  );

  S.map.setPaintProperty(
   'cells',
   'circle-blur',
   .005
  );

  if(env){

   S.map.setLayoutProperty(
    'cells-envelope',
    'visibility',
    'visible'
   );

   S.map.setPaintProperty(
    'cells-envelope',
    'circle-radius',
    [
     'interpolate',
     ['linear'],
     ['zoom'],
     8,4.7,
     10,6.9,
     12,9.5,
     14,12.4
    ]
   );

   S.map.setPaintProperty(
    'cells-envelope',
    'circle-opacity',
    [
     'interpolate',
     ['linear'],
     ['zoom'],
     8,.045,
     10,.060,
     12,.085,
     14,.10
    ]
   );

   S.map.setPaintProperty(
    'cells-envelope',
    'circle-blur',
    .25
   )
  }
 }


 // ==========================================================
 // SCENARIO FLOOD AGREEMENT
 // ==========================================================

 else if(S.target==='flood'){

  S.map.setPaintProperty(
   'cells',
   'circle-radius',
   [
    'interpolate',
    ['linear'],
    ['zoom'],
    8,2.45,
    10,4.00,
    12,6.10,
    14,8.35
   ]
  );

  S.map.setPaintProperty(
   'cells',
   'circle-opacity',
   [
    'interpolate',
    ['linear'],
    ['get','value'],
    .10,.30,
    .20,.39,
    .30,.49,
    .50,.69,
    .70,.81,
    .85,.89,
    1,.94
   ]
  );

  S.map.setPaintProperty(
   'cells',
   'circle-blur',
   .025
  );

  if(env){

   S.map.setLayoutProperty(
    'cells-envelope',
    'visibility',
    'visible'
   );

   S.map.setPaintProperty(
    'cells-envelope',
    'circle-radius',
    [
     'interpolate',
     ['linear'],
     ['zoom'],
     8,4.2,
     10,6.2,
     12,8.5,
     14,11.0
    ]
   );

   S.map.setPaintProperty(
    'cells-envelope',
    'circle-opacity',
    [
     'interpolate',
     ['linear'],
     ['zoom'],
     8,.055,
     10,.070,
     12,.085,
     14,.10
    ]
   );

   S.map.setPaintProperty(
    'cells-envelope',
    'circle-blur',
    .38
   )
  }
 }


 // ==========================================================
 // WATER-SURFACE ELEVATION
 //
 // High enough opacity that WSE cannot disappear.
 // ==========================================================

 else if(S.target==='wse'){

  S.map.setPaintProperty(
   'cells',
   'circle-radius',
   [
    'interpolate',
    ['linear'],
    ['zoom'],
    8,2.65,
    10,4.30,
    12,6.50,
    14,8.85
   ]
  );

  S.map.setPaintProperty(
   'cells',
   'circle-opacity',
   [
    'interpolate',
    ['linear'],
    ['get','wet_depth'],
    .10,.69,
    .15,.73,
    .20,.78,
    .30,.83,
    .50,.87,
    .75,.90,
    1.50,.93,
    3.00,.95
   ]
  );

  S.map.setPaintProperty(
   'cells',
   'circle-blur',
   .025
  );

  if(env){

   S.map.setLayoutProperty(
    'cells-envelope',
    'visibility',
    'visible'
   );

   S.map.setPaintProperty(
    'cells-envelope',
    'circle-radius',
    [
     'interpolate',
     ['linear'],
     ['zoom'],
     8,4.3,
     10,6.3,
     12,8.7,
     14,11.3
    ]
   );

   S.map.setPaintProperty(
    'cells-envelope',
    'circle-opacity',
    [
     'interpolate',
     ['linear'],
     ['zoom'],
     8,.075,
     10,.095,
     12,.115,
     14,.135
    ]
   );

   S.map.setPaintProperty(
    'cells-envelope',
    'circle-blur',
    .36
   )
  }
 }


 // ==========================================================
 // MEAN / PEAK FLOW SPEED
 //
 // Lower values remain visible.
 // Higher values become substantially stronger.
 // ==========================================================

 else{

  S.map.setPaintProperty(
   'cells',
   'circle-radius',
   [
    'interpolate',
    ['linear'],
    ['zoom'],
    8,2.60,
    10,4.20,
    12,6.35,
    14,8.65
   ]
  );


  let op;


  if(hi>lo){

   op=[
    'interpolate',
    ['linear'],
    ['get','value'],

    lo,.66,
    lo+(hi-lo)*.10,.72,
    lo+(hi-lo)*.25,.78,
    lo+(hi-lo)*.45,.84,
    lo+(hi-lo)*.65,.89,
    lo+(hi-lo)*.82,.93,
    hi,.96
   ]
  }
  else{
   op=.72
  }


  S.map.setPaintProperty(
   'cells',
   'circle-opacity',
   op
  );

  S.map.setPaintProperty(
   'cells',
   'circle-blur',
   .025
  );


  if(env){

   S.map.setLayoutProperty(
    'cells-envelope',
    'visibility',
    'visible'
   );

   S.map.setPaintProperty(
    'cells-envelope',
    'circle-radius',
    [
     'interpolate',
     ['linear'],
     ['zoom'],
     8,4.1,
     10,6.0,
     12,8.3,
     14,10.8
    ]
   );

   S.map.setPaintProperty(
    'cells-envelope',
    'circle-opacity',
    [
     'interpolate',
     ['linear'],
     ['zoom'],
     8,.060,
     10,.075,
     12,.090,
     14,.105
    ]
   );

   S.map.setPaintProperty(
    'cells-envelope',
    'circle-blur',
    .34
   )
  }
 }


 S.map.setPaintProperty(
  'cells',
  'circle-color',
  color(lo,hi)
 );


 if(env){

  S.map.setPaintProperty(
   'cells-envelope',
   'circle-color',
   color(lo,hi)
  )
 }
}

function fsScenarioTruth(c){
 let b=document.getElementById('fs-scenario-truth-v3');
 if(!b){b=document.createElement('section');b.id='fs-scenario-truth-v3';b.style.cssText='max-width:1280px;margin:8px auto 14px;padding:12px 15px;border:1px solid #e2bd77;border-radius:9px;background:#fff6e5;color:#5f3b0b;font:13px/1.5 system-ui,sans-serif';(document.querySelector('.cards')||document.querySelector('.intro'))?.insertAdjacentElement('afterend',b);}
 const rain=c.future_72h_rain_mm==null?'unavailable':Number(c.future_72h_rain_mm).toFixed(1)+' mm';
 const unconditioned=!c.conditioned;
 const headline=document.querySelector('.intro h1');
 if(headline)headline.textContent=unconditioned?'Unconditioned physical scenarios: potential hydraulic exposure':'Weather-conditioned scenario outlook (not deterministic)';
 const impactHeading=document.querySelector('#impactCount')?.closest('.impactCards')?.parentElement?.querySelector('h2');
 if(impactHeading)impactHeading.textContent='Which mapped places intersect the modeled scenario envelope?';
 const top10Title=document.querySelector('#top10')?.closest('.panel')?.querySelector('h3');
 if(top10Title)top10Title.textContent=unconditioned?'Top 10 scenario-screened assets':'Top 10 conditioned scenario-screened assets';
 b.textContent=unconditioned
  ?'UNCONDITIONED SCENARIO LIBRARY — NOT A DATE-SPECIFIC FLOOD FORECAST. The weather-provider next-72-hour rainfall context is '+rain+'. That value was NOT used to select or force these hydraulic scenarios. The shown depth maps and asset counts screen '+String(c.selected_scenario_count??'the available')+' frozen physical scenarios, not predicted flooding for the selected date. Scenario agreement is not flood probability. A real rainfall-conditioned prediction is unavailable until supported and independently validated.'
  :'CONDITIONED SCENARIO ANALOGUE (NOT A DETERMINISTIC FLOOD FORECAST). This maps supported analogous physical scenarios using the reported weather context; model agreement is not a calibrated flood probability or ground-truth observation.';
 const label=document.querySelector('#impactCount')?.closest('article')?.querySelector('small');
 if(label)label.textContent=unconditioned?'SCENARIO-SCREENED ASSETS (NOT PREDICTED)':'CONDITIONED SCENARIO-SCREENED ASSETS';
 const rainCard=document.querySelector('#rain72')?.closest('article');if(rainCard){const small=rainCard.querySelector('small');if(small)small.textContent='WEATHER PROVIDER: NEXT 72 H';const note=rainCard.querySelector('span');if(note)note.textContent='Context only; not scenario rainfall forcing';}
 const ratioCard=document.querySelector('#ratio')?.closest('article');if(ratioCard&&unconditioned){const note=ratioCard.querySelector('span');if(note)note.textContent='Not a validated current severity forecast';}
}
function humanMode(c){if(c.conditioned)return'FORECAST-CONDITIONED';if(c.conditioning_mode==='WEATHER_PROVIDER_UNAVAILABLE')return'UNCONDITIONED';if(c.conditioning_mode==='REFERENCE_RAINFALL_UNAVAILABLE')return'UNCONDITIONED';if(c.conditioning_mode==='LIVE_FORECAST_OUTSIDE_SCENARIO_RAIN_FACTOR_RANGE')return'UNCONDITIONED';return String(c.conditioning_mode||'UNCONDITIONED').replaceAll('_',' ')}
function humanReason(c){const m=c.conditioning_mode||'';if(c.conditioned)return`${c.source_state||'weather source'} · ${c.selected_scenario_count} analogous physical scenarios`;if(m==='WEATHER_PROVIDER_UNAVAILABLE')return'Weather source unavailable · all TRAIN+VAL scenarios shown';if(m==='REFERENCE_RAINFALL_UNAVAILABLE')return`${c.source_state||'Forecast source'} · analogue reference unavailable · all scenarios shown`;if(m==='LIVE_FORECAST_OUTSIDE_SCENARIO_RAIN_FACTOR_RANGE')return`${c.source_state||'Forecast source'} · rainfall severity outside frozen scenario library`;if(m==='USER_REQUESTED_UNCONDITIONED')return'User-requested unconditioned physical envelope';return c.explanation||'All TRAIN+VAL physical scenarios shown'}
function cycleText(c){if(c.conditioned&&c.forecast_generated_at_utc){let b=new Date(c.forecast_generated_at_utc),v=new Date(b.getTime()+S.h*3600e3);return`Forecast cycle ${b.toLocaleString()} · +${S.h} h valid ${v.toLocaleString()} · scenario envelope`;}
 return`Scenario lead +${S.h} h · no deterministic valid-time hydraulic forecast is authorized for this unconditioned view`;}
function validLabel(h){if(S.cond&&!S.cond.conditioned)return `+${h}h\nscenario lead (not forecast valid time)`;let r=(S.validTimes?.horizons||[]).find(x=>+x.horizon_hours===+h);if(!r)return `+${h}h`;let d=new Date(r.valid_time_local);let t=Number.isNaN(d.getTime())?String(r.valid_time_local):d.toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});return `+${h}h\n${t}`}
function refreshHourLabels(){let box=$('#hours');[...box.children].forEach(b=>{let h=+b.dataset.h;b.textContent=validLabel(h)})}
async function condition(){let c=await j('/api/v1/ensemble/condition');S.cond=c;try{S.validTimes=await j('/api/v1/time/forecast-valid?generated_at_utc='+encodeURIComponent(c.forecast_generated_at_utc||''))}catch{};refreshHourLabels();$('#mode').textContent=humanMode(c);$('#source').textContent=humanReason(c);$('#rain72').textContent=c.future_72h_rain_mm==null?'Unavailable':f(c.future_72h_rain_mm,1)+' mm';$('#ref72').textContent=c.reference_2021_72h_rain_mm==null?'Unavailable':f(c.reference_2021_72h_rain_mm,1)+' mm';$('#ratio').textContent=c.analogue_ratio==null?'N/A':f(c.analogue_ratio,2)+'×';$('#nsc').textContent=c.selected_scenario_count;$('#wet').textContent=(c.selected_wetness_range||[]).length?`${f(c.selected_wetness_range[0],2)} to ${f(c.selected_wetness_range[1],2)}`:'—';$('#cycleLine').textContent=cycleText(c);fsScenarioTruth(c);if(!c.conditioned)$('#ratio').textContent='Not applied';let st=$('#state');if(c.conditioned){st.textContent='FORECAST-CONDITIONED';st.className='pill live'}else{st.textContent='UNCONDITIONED';st.className='pill warn'}}
async function load(){

 let x=await j(
  `/api/v1/ensemble/map?horizon=${S.h}&target=${S.target}&stat=${S.stat}`
 );


 let depthByCell=null;


 if(
  S.target==='wse'||
  S.target==='vmean'||
  S.target==='vmax'
 ){

  let d=await j(
   `/api/v1/ensemble/map?horizon=${S.h}&target=depth&stat=${S.stat}`
  );


  depthByCell=new Map(
   (d.points||[]).map(p=>[
    +p.cell_id,
    (
     p.value!=null&&
     Number.isFinite(+p.value)
    )?
     +p.value:
     null
   ])
  )
 }


 let pts=(x.points||[]).map(p=>{

  let value=
   p.value==null?
   null:
   +p.value;


  let valid=
   value!=null&&
   Number.isFinite(value);


  let wet_depth=null;


  if(S.target==='depth'){
   wet_depth=value
  }
  else if(depthByCell){
   wet_depth=
    depthByCell.get(+p.cell_id)??null
  }


  return{

   type:'Feature',

   geometry:{
    type:'Point',
    coordinates:utm43(+p.x,+p.y)
   },

   properties:{
    cell_id:+p.cell_id,
    value:value,
    p10:p.p10==null?null:+p.p10,
    p90:p.p90==null?null:+p.p90,
    available:!!p.available,
    valid_value:valid,
    wet_depth:wet_depth
   }
  }
 });


 // ==========================================================
 // PRIMARY DISPLAY SOURCE
 //
 // Depth / WSE / velocity:
 //   ALL same-horizon depth >=0.10 m wet cells.
 //
 // Flood agreement:
 //   >=10% support visible, progressively stronger.
 // ==========================================================

 let displaypts;


 if(S.target==='flood'){

  displaypts=
   pts.filter(
    q=>
     q.properties.valid_value&&
     q.properties.value>=.10
   )
 }
 else{

  displaypts=
   pts.filter(
    q=>
     q.properties.valid_value&&
     q.properties.wet_depth!=null&&
     q.properties.wet_depth>=.10
   )
 }


 let vals=
  displaypts
   .map(q=>q.properties.value)
   .filter(Number.isFinite);


 function quantile(a,q){

  if(!a.length){
   return 0
  }

  let b=[...a].sort((x,y)=>x-y);

  let pos=(b.length-1)*q;

  let loI=Math.floor(pos);
  let hiI=Math.ceil(pos);

  if(loI===hiI){
   return b[loI]
  }

  let w=pos-loI;

  return b[loI]*(1-w)+b[hiI]*w
 }


 let rawLo=
  vals.length?
  Math.min(...vals):
  0;


 let rawHi=
  vals.length?
  Math.max(...vals):
  1;


 let lo;
 let hi;


 if(S.target==='flood'){

  lo=.10;
  hi=1
 }

 else if(S.target==='depth'){

  lo=0;
  hi=rawHi
 }

 else if(S.target==='wse'){

  lo=quantile(vals,.05);
  hi=quantile(vals,.95)
 }

 else{

  lo=0;
  hi=quantile(vals,.95)
 }


 if(
  !Number.isFinite(lo)||
  !Number.isFinite(hi)||
  hi<=lo
 ){

  lo=rawLo;
  hi=rawHi
 }


 if(hi<=lo){
  hi=lo+1e-6
 }


  let fc={
  type:'FeatureCollection',
  features:displaypts
 };


 // ==========================================================
 // CONTINUITY SOURCE
 //
 // IMPORTANT:
 // this is NOT the full wet footprint.
 //
 // Only the stronger core receives a low-opacity continuity aid.
 // Hence no hydraulic-domain oval.
 // ==========================================================

 let envpts;


 if(S.target==='flood'){

  envpts=
   pts.filter(
    q=>
     q.properties.valid_value&&
     q.properties.value>=.50
   )
 }
 else{

  envpts=
   pts.filter(
    q=>
     q.properties.valid_value&&
     q.properties.wet_depth!=null&&
     q.properties.wet_depth>=.25
   )
 }


 let wetfc={
  type:'FeatureCollection',
  features:envpts
 };

if(S.map.getSource('cells')){S.map.getSource('cells').setData(fc);if(S.map.getSource('cells-envelope'))S.map.getSource('cells-envelope').setData(wetfc)}else{S.map.addSource('cells',{type:'geojson',data:fc});S.map.addSource('cells-envelope',{type:'geojson',data:wetfc});S.map.addLayer({id:'cells-envelope',type:'circle',source:'cells-envelope',paint:{'circle-radius':['interpolate',['linear'],['zoom'],8,4.6,10,6.8,12,9.5,14,12.5],'circle-opacity':['interpolate',['linear'],['zoom'],8,.15,10,.17,12,.19,14,.21],'circle-blur':.55,'circle-color':color(lo,hi),'circle-stroke-width':0}});S.map.addLayer({id:'cells',type:'circle',source:'cells',paint:{'circle-radius':['interpolate',['linear'],['zoom'],8,2.2,10,3.6,12,5.6,14,7.8],'circle-opacity':['case',['==',['get','available'],true],['interpolate',['linear'],['zoom'],8,.64,10,.70,12,.77,14,.84],.10],'circle-blur':.04,'circle-color':color(lo,hi),'circle-stroke-width':0}});S.map.on('click','cells',e=>cell(+e.features[0].properties.cell_id));S.map.on('mouseenter','cells',()=>S.map.getCanvas().style.cursor='pointer');S.map.on('mouseleave','cells',()=>S.map.getCanvas().style.cursor='')}
 applyStyle(lo,hi);let tn=targetName(S.target),tu=targetUnit(S.target);

 $('#range').textContent=
  S.target==='flood'?
   `${f(lo)} → ${f(hi)} agreement fraction`:
   `${f(lo)} → ${f(hi)} ${tu} display-color range`;


 $('#legendTitle').textContent=tn;


 let q=await j(
  `/api/v1/ensemble/summary?horizon=${S.h}`
 );


 let visibleWet=
  S.target==='flood'?
   displaypts.length:
   displaypts.filter(
    z=>
     z.properties.wet_depth!=null&&
     z.properties.wet_depth>=.10
   ).length;


 let detail;


 if(S.target==='depth'){

  detail=
   `${visibleWet} modeled-wet cells shown (depth ≥0.10 m)<br>`+
   `Shallow water remains visible; deeper water receives stronger emphasis<br>`+
   `Max median depth ${f(q.max_median_depth_m)} m<br>`+
   `Max P90 depth ${f(q.max_p90_depth_m)} m`
 }

 else if(S.target==='flood'){

  detail=
   `${visibleWet} cells with ≥10% scenario flood agreement shown<br>`+
   `≥50% scenario agreement receives continuity emphasis<br>`+
   `Agreement is scenario support, not calibrated probability`
 }

 else{

  detail=
   `${visibleWet} modeled-wet cells shown (same-horizon depth ≥0.10 m)<br>`+
   `Actual ${tn.toLowerCase()} range ${f(rawLo)} → ${f(rawHi)} ${tu}<br>`+
   `Robust display-color scale ${f(lo)} → ${f(hi)} ${tu}<br>`+
   `Underlying hydraulic values are unchanged`
 }


 $('#summary').innerHTML=
  `<b>+${S.h} h</b><br>`+
  `${q.selected_scenarios} scenarios<br>`+
  `${q.cells_majority_flooded} cells ≥50% scenario agreement<br>`+
  `${q.cells_high_agreement_flooded} cells ≥80% agreement<br>`+
  `${detail}<br>`+
  `<span style="font-size:10px;color:#667085">Impact inventory below continues to use the existing depth ≥0.10 m screening rule.</span>`;

 if(S.cond)$('#cycleLine').textContent=cycleText(S.cond);await loadImpact(false)}
async function cell(id){let x=await j('/api/v1/ensemble/cell?cell_id='+id);$('#cellTitle').textContent='Hydraulic cell '+id;$('#cell').innerHTML=(x.timeline||[]).map(r=>`<div class="timelineRow"><b>+${r.horizon_hours} h</b><span>Depth ${f(r.depth_median_m)} m (P10 ${f(r.depth_p10_m)} / P90 ${f(r.depth_p90_m)})</span><span>Flood agreement ${r.flood_agreement==null?'—':f(r.flood_agreement*100,0)+'%'} · ${r.valid_scenario_count??'—'} valid scenarios</span><span>WSE ${f(r.wse_median_m)} m • speed ${f(r.velocity_median_mps)} m/s</span></div>`).join('')}
window.__FSR1R10V3InspectCell=cell;
window.__FSR1R10V3InspectAsset=function(id){const a=(S.impact?.affected_assets||[]).find(x=>String(x.asset_id)===String(id));if(!a)return false;impactInspect(a);return true};
function counts(c={}){const sum=ks=>ks.reduce((n,k)=>n+(c[k]||0),0);$('#roadCount').textContent=sum(['road','bridge']);$('#healthCount').textContent=sum(['hospital','clinic','pharmacy','police','fire','shelter']);$('#educationCount').textContent=sum(['school','college','university']);$('#buildingCount').textContent=c.building||0;$('#criticalCount').textContent=sum(['government','power','water','telecom','market','sports','rail','fuel','settlement'])}
function refreshImpactLabelVisibility(){if(!S.map)return;let z=S.map.getZoom(),limit=S.focusMarker?0:(z>=13?5:z>=11.4?3:0);S.impactMarkers.forEach((m,i)=>m.getElement().style.display=i<limit?'block':'none')}
function bindImpactLabelVisibility(){if(S.labelZoomBound||!S.map)return;S.labelZoomBound=true;S.map.on('zoom',refreshImpactLabelVisibility);S.map.on('moveend',refreshImpactLabelVisibility)}
function clearFocus(){let m=S.focusMarker,p=S.focusPopup;S.focusMarker=null;S.focusPopup=null;if(m)m.remove();if(p)p.remove();refreshImpactLabelVisibility()}
function uniqueLabelCandidates(items,maxN=5){let out=[],seen=new Set();for(const x of items){if(!Number.isFinite(+x.longitude)||!Number.isFinite(+x.latitude))continue;let key=String(x.name||'').trim().toLowerCase().replace(/\s+/g,' ');if(!key||seen.has(key))continue;let near=out.some(y=>Math.abs(+x.longitude-+y.longitude)<0.0022&&Math.abs(+x.latitude-+y.latitude)<0.0022);if(near)continue;seen.add(key);out.push(x);if(out.length>=maxN)break}return out}
function impactInspect(a){if(!Number.isFinite(+a.longitude)||!Number.isFinite(+a.latitude))return;clearFocus();
 $('#cellTitle').textContent=a.name;$('#cell').innerHTML=`<div class="assetInspect"><strong>${esc(a.name)}</strong><span>${esc(a.category)} · ${esc(a.severity)}</span><span>Max screened depth ${f(a.max_depth_m)} m · median ${f(a.median_depth_m)} m</span><span>Scenario agreement ${a.max_scenario_agreement==null?'—':f(a.max_scenario_agreement*100,0)+'%'}</span><span>${esc(a.spatial_method||'')}</span><span>Exact mapped asset location is pinned on the map.</span></div><div class="notice">This is a screening intersection against nearby FloodSense cells. It is not an official closure, evacuation order or parcel-level inundation survey.</div>`;
 const el=document.createElement('div');el.className='asset-focus-wrap';el.setAttribute('aria-label',a.name||'selected asset');el.innerHTML='<div class="asset-focus-pin"></div><div class="asset-focus-badge">SELECTED</div>';
 S.focusPopup=new maplibregl.Popup({offset:30,closeButton:true,closeOnClick:false,maxWidth:'280px'}).setHTML(`<b>${esc(a.name)}</b><br>${esc(a.category)} · ${esc(a.severity)}<br>Max depth ${f(a.max_depth_m)} m`);
 S.focusMarker=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([+a.longitude,+a.latitude]).setPopup(S.focusPopup).addTo(S.map);
 S.focusPopup.on('close',()=>{let m=S.focusMarker;S.focusMarker=null;S.focusPopup=null;if(m)m.remove();refreshImpactLabelVisibility()});
 S.focusPopup.setLngLat([+a.longitude,+a.latitude]).addTo(S.map);
 refreshImpactLabelVisibility();
 S.map.flyTo({center:[+a.longitude,+a.latitude],zoom:17,duration:650,essential:true})
}
function clearMarkers(){for(const m of S.impactMarkers)m.remove();S.impactMarkers=[]}
function drawImpact(a){clearMarkers();if(!S.map||!a)return;bindImpactLabelVisibility();const all=a.affected_assets||[];let fc={type:'FeatureCollection',features:all.filter(x=>Number.isFinite(+x.longitude)&&Number.isFinite(+x.latitude)).map(x=>({type:'Feature',geometry:{type:'Point',coordinates:[+x.longitude,+x.latitude]},properties:{asset_id:x.asset_id,category:x.category,name:x.name,depth:x.max_depth_m||0,severity:x.severity}}))};if(S.map.getSource('impact-assets'))S.map.getSource('impact-assets').setData(fc);else{S.map.addSource('impact-assets',{type:'geojson',data:fc});S.map.addLayer({id:'impact-assets',type:'circle',source:'impact-assets',paint:{'circle-radius':['interpolate',['linear'],['zoom'],9,2,13,5],'circle-color':['match',['get','category'],'hospital','#b4142f','clinic','#b4142f','fire','#e2552d','police','#4c4aa6','school','#7956b2','college','#7956b2','university','#7956b2','road','#c26f16','bridge','#7b4e21','building','#607b8b','sports','#198a6d','government','#82550d','#d54e4e'],'circle-opacity':.72,'circle-stroke-color':'#fff','circle-stroke-width':.7}});S.map.on('click','impact-assets',e=>{let id=e.features?.[0]?.properties?.asset_id,x=(S.impact?.affected_assets||[]).find(z=>z.asset_id===id);if(x)impactInspect(x)})}
 let candidates=[...(a.top_critical||[]).filter(x=>!['road','building'].includes(x.category)),...(a.road_concerns||[]),...(a.top10||[])],chosen=uniqueLabelCandidates(candidates,5);
 for(const x of chosen){let el=document.createElement('div');el.className='impact-marker';el.textContent=`${x.name} · ${f(x.max_depth_m,1)} m`;el.onclick=()=>impactInspect(x);let mm=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([+x.longitude,+x.latitude]).addTo(S.map);S.impactMarkers.push(mm)}
 refreshImpactLabelVisibility()
}
function renderImpact(a){S.impact=a;let st=$('#impactSource');st.textContent=a.source_state||a.status||'UNAVAILABLE';st.className='pill '+(a.source_state==='LIVE'?'live':a.source_state&&a.source_state.startsWith('CACHED')?'warn':'bad');$('#impactCount').textContent=a.affected_asset_count??0;counts(a.category_counts||{});let top=a.top10||[];$('#top10').innerHTML=top.length?top.map((x,i)=>`<div class="topItem" data-id="${esc(x.asset_id)}"><b><span class="rank">${i+1}</span>${esc(x.name)}</b><span>${esc(x.category)} · max depth ${f(x.max_depth_m)} m · agreement ${x.max_scenario_agreement==null?'—':f(x.max_scenario_agreement*100,0)+'%'} · ${esc(x.severity)}</span></div>`).join(''):`<p>No mapped affected features are available for this view. ${esc((a.errors||[]).join(' | '))}</p>`;document.querySelectorAll('.topItem').forEach(e=>e.onclick=()=>{let x=top.find(z=>z.asset_id===e.dataset.id);if(x)impactInspect(x)});let cats=[...new Set((a.affected_assets||[]).map(x=>x.category))].sort(),sel=$('#impactCategory'),cur=sel.value;sel.innerHTML='<option value="all">All categories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');if(cats.includes(cur))sel.value=cur;renderRows();drawImpact(a)}
function renderRows(){let a=S.impact?.affected_assets||[],cat=$('#impactCategory').value||'all',q=($('#impactSearch').value||'').trim().toLowerCase();let r=a.filter(x=>(cat==='all'||x.category===cat)&&(!q||x.name.toLowerCase().includes(q)||x.category.toLowerCase().includes(q)));$('#inventoryNote').textContent=`Showing ${r.length.toLocaleString()} of ${a.length.toLocaleString()} scenario-screened assets for +${S.h} h. ${S.cond?.conditioned?'Conditioned analogue':'UNCONDITIONED: not a date-specific forecast'}. Complete data remain available for CSV export.`;$('#impactRows').innerHTML=r.slice(0,1000).map(x=>`<tr data-id="${esc(x.asset_id)}"><td>${esc(x.name)}</td><td><span class="badge">${esc(x.category)}</span></td><td>${f(x.max_depth_m)} m</td><td>${f(x.median_depth_m)} m</td><td>${x.max_scenario_agreement==null?'—':f(x.max_scenario_agreement*100,0)+'%'}</td><td><span class="badge sev-${esc(x.severity)}">${esc(x.severity)}</span></td></tr>`).join('');document.querySelectorAll('#impactRows tr').forEach(e=>e.onclick=()=>{let x=a.find(z=>z.asset_id===e.dataset.id);if(x)impactInspect(x)})}
async function loadImpact(refresh=false){let st=$('#impactSource');st.textContent=refresh?'Refreshing…':'Loading…';st.className='pill warn';try{let a=await j(`/api/v1/impact/ensemble?horizon=${S.h}&stat=${S.stat}&conditioning=auto&refresh=${refresh?1:0}`);renderImpact(a)}catch(e){renderImpact({status:'SOURCE_UNAVAILABLE',source_state:'UNAVAILABLE',affected_assets:[],top10:[],category_counts:{},errors:[e.message]})}}
function exportCsv(){let a=S.impact?.affected_assets||[];if(!a.length)return;let cols=['asset_id','name','category','latitude','longitude','max_depth_m','median_depth_m','max_scenario_agreement','severity','spatial_method'],q=v=>'"'+String(v??'').replaceAll('"','""')+'"',csv=[cols.join(',')].concat(a.map(r=>cols.map(c=>q(r[c])).join(','))).join('\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(blob),x=document.createElement('a');x.href=u;x.download=`FloodSense_Affected_Assets_plus${S.h}h.csv`;x.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function stopForecast(){S.playingForecast=false;clearTimeout(S.playTimer);S.playTimer=null;let b=$('#playForecast');if(b)b.textContent='▶ Play +3 → +72 h'}
async function forecastStep(pos){if(!S.playingForecast)return;
 if(pos>=H.length){stopForecast();return}
 S.h=H[pos];[...$('#hours').children].forEach(x=>x.classList.toggle('active',+x.dataset.h===S.h));
 await load();
 if(!S.playingForecast)return;
 if(pos>=H.length-1){stopForecast();return}
 S.playTimer=setTimeout(()=>forecastStep(pos+1),1000)
}
function playForecast(){if(S.playingForecast){stopForecast();return}
 let pos=Math.max(0,H.indexOf(S.h));if(pos>=H.length-1)pos=-1;
 S.playingForecast=true;$('#playForecast').textContent='❚❚ Pause';
 forecastStep(pos+1)
}
function controls(){let h=$('#hours');H.forEach(v=>{let b=document.createElement('button');b.dataset.h=v;b.textContent=validLabel(v);b.style.whiteSpace='pre-line';b.classList.toggle('active',v===S.h);b.onclick=()=>{stopForecast();clearFocus();S.h=v;[...h.children].forEach(x=>x.classList.toggle('active',x===b));load()};h.appendChild(b)});$('#target').onchange=e=>{stopForecast();clearFocus();S.target=e.target.value;$('#statGroup').style.display=S.target==='flood'?'none':'block';load()};$('#stat').onchange=e=>{stopForecast();clearFocus();S.stat=e.target.value;load()};$('#refreshImpact').onclick=()=>loadImpact(true);$('#exportImpact').onclick=exportCsv;$('#impactCategory').onchange=renderRows;$('#impactSearch').oninput=renderRows;{let pf=$('#playForecast');if(pf)pf.onclick=playForecast}}
async function boot(){controls();S.map=window.__FloodSenseMap = new maplibregl.Map({container:'map',style:style(),center:[73.52,17.53],zoom:10});S.map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');S.map.on('load',async()=>{let a=await j('/data/study_area.json'),b=a.bounds;S.map.fitBounds([[b.west,b.south],[b.east,b.north]],{padding:50,duration:0});await condition();await load()})}
boot().catch(e=>{$('#state').textContent='ERROR';$('#state').className='pill bad';$('#summary').textContent=e.message});
