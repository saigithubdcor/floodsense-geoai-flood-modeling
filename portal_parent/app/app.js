import * as maplibregl from '/vendor/maplibre-gl.mjs';
maplibregl.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],H=[5,10,15,30,50,60];
const S={mode:'forecast',h:10,target:'depth',display:'prediction',anchor:'PEAK_Q',map:null,bounds:null,timer:null,playing:false,dateHydraulicAvailable:true};
const labels={depth:['Water depth','m'],wse:['Water surface elevation','m'],vmean:['Flow speed','m/s'],vmax:['Peak flow speed','m/s'],flood:['Flood likelihood','class']};
const fmt=(v,d=2)=>v==null||!Number.isFinite(+v)?'-':(+v).toFixed(d),esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function j(u){let r=await fetch(u,{cache:'no-store'}),x=await r.json();if(!r.ok)throw Error(x.error||r.status);return x}
function utm43(e,n){const a=6378137,ec=.00669438,k=.9996,x=e-500000,y=n,ep=ec/(1-ec),M=y/k,mu=M/(a*(1-ec/4-3*ec*ec/64-5*ec**3/256)),e1=(1-Math.sqrt(1-ec))/(1+Math.sqrt(1-ec)),J1=3*e1/2-27*e1**3/32,J2=21*e1**2/16-55*e1**4/32,J3=151*e1**3/96,J4=1097*e1**4/512,fp=mu+J1*Math.sin(2*mu)+J2*Math.sin(4*mu)+J3*Math.sin(6*mu)+J4*Math.sin(8*mu),sf=Math.sin(fp),cf=Math.cos(fp),tf=Math.tan(fp),N=a/Math.sqrt(1-ec*sf*sf),T=tf*tf,C=ep*cf*cf,R=a*(1-ec)/Math.pow(1-ec*sf*sf,1.5),D=x/(N*k),lat=fp-(N*tf/R)*(D*D/2-(5+3*T+10*C-4*C*C-9*ep)*D**4/24+(61+90*T+298*C+45*T*T-252*ep-3*C*C)*D**6/720),lon=(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C*C+8*ep+24*T*T)*D**5/120)/cf;return[75+lon*180/Math.PI,lat*180/Math.PI]}
function style(){return{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'&copy; OpenStreetMap contributors'}},layers:[{id:'bg',type:'background',paint:{'background-color':'#dfe7ee'}},{id:'osm',type:'raster',source:'osm'}]}}
function makeMap(){S.map=window.__FloodSenseMap = new maplibregl.Map({container:'map',style:style(),center:[73.52,17.53],zoom:9.5});S.map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');S.map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-right');S.map.on('error',e=>{if(String(e?.error?.message||'').toLowerCase().includes('tile')){$('#net').textContent='Basemap offline - local model overlay remains';$('#net').className='warn'}});S.map.on('load',async()=>{let a=await fetch('/data/study_area.json').then(r=>r.json()),b=a.bounds;S.bounds=[[b.west,b.south],[b.east,b.north]];let poly={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[[[b.west,b.south],[b.east,b.south],[b.east,b.north],[b.west,b.north],[b.west,b.south]]]},properties:{}}]};S.map.addSource('coverage',{type:'geojson',data:poly});S.map.addLayer({id:'coverage',type:'line',source:'coverage',paint:{'line-color':'#1769e0','line-width':2,'line-dasharray':[2,2]}});S.map.fitBounds(S.bounds,{padding:70,duration:0});await loadMap();bindClick()})}
function validDisplay(){let d=$('#display');[...d.options].forEach(o=>o.disabled=(o.value==='interval_width_90'&&S.target==='flood')||(o.value==='calibrated_probability'&&S.target!=='flood'));if(d.selectedOptions[0].disabled){d.value='prediction';S.display='prediction'}}

/* B2M_B2_FINAL_SELECTIVE_HYDRAULICS_V1 */

function colorExpr(a,b){
  if(!(Number.isFinite(a)&&Number.isFinite(b))||b<=a){
    a=0;b=1;
  }
  return[
    'interpolate',
    ['linear'],
    ['get','value'],
    a,'#2354b8',
    a+(b-a)*.34,'#1bbfc5',
    a+(b-a)*.68,'#eed253',
    b,'#eb6656'
  ]
}

function cellRadiusExpr(){
  return[
    'interpolate',
    ['linear'],
    ['zoom'],
    8,1.65,
    10,2.45,
    12,3.75,
    14,5.8,
    16,7.4
  ]
}

function cellOpacityExpr(){

  if(S.target==='depth'){
    return[
      'interpolate',
      ['linear'],
      ['get','wet_depth'],
      .10,.46,
      .20,.64,
      .50,.78,
      1.00,.86
    ]
  }

  if(S.target==='wse'){
    return .68
  }

  if(
    S.target==='vmean' ||
    S.target==='vmax'
  ){
    return[
      'interpolate',
      ['linear'],
      ['get','value'],
      0,.42,
      .15,.54,
      .50,.72,
      1.00,.84
    ]
  }

  if(S.target==='flood'){
    return[
      'interpolate',
      ['linear'],
      ['get','value'],
      .50,.50,
      .70,.66,
      .85,.78,
      1.00,.87
    ]
  }

  return .68
}

function mapPolicyText(n){

  if(S.target==='depth'){
    return`${n} modeled-wet cells shown (depth >= 0.10 m). Full cell values remain available in the API.`
  }

  if(
    S.target==='wse' ||
    S.target==='vmean' ||
    S.target==='vmax'
  ){
    return`${n} cells shown where same-horizon modeled depth is >= 0.10 m. The selected variable retains its own values and color scale.`
  }

  if(S.target==='flood'){
    return`${n} cells shown at flood value/probability >= 0.50. Lower values remain available in the API.`
  }

  return`${n} cells shown.`
}

async function loadMap(){

  validDisplay();

  let u=
    S.mode==='forecast'
      ?`/api/v1/forecast/map?horizon=${S.h}&target=${S.target}&mode=${S.display}`
      :`/api/v1/replay/map?anchor=${S.anchor}&horizon=${S.h}&target=${S.target}&mode=${S.display}`;

  try{

    const x=await j(u);
    const raw=x.points||[];

    const depthById=new Map();


    /*
      Depth itself already supplies the wet-state mask.

      WSE / mean velocity / peak velocity request the
      corresponding depth map for the SAME mode,
      SAME anchor and SAME horizon.

      No hydraulic quantity is derived from depth.
      Depth is only a display-support mask.
    */

    if(S.target==='depth'){

      for(const p of raw){

        const v=
          p.value==null
            ?null
            :+p.value;

        if(
          p.prediction_available &&
          Number.isFinite(v)
        ){
          depthById.set(
            +p.cell_id,
            v
          );
        }
      }
    }
    else if(
      S.target==='wse' ||
      S.target==='vmean' ||
      S.target==='vmax'
    ){

      const du=
        S.mode==='forecast'
          ?`/api/v1/forecast/map?horizon=${S.h}&target=depth&mode=prediction`
          :`/api/v1/replay/map?anchor=${S.anchor}&horizon=${S.h}&target=depth&mode=prediction`;

      const dx=await j(du);

      for(const p of (dx.points||[])){

        const v=
          p.value==null
            ?null
            :+p.value;

        if(
          p.prediction_available &&
          Number.isFinite(v)
        ){
          depthById.set(
            +p.cell_id,
            v
          );
        }
      }
    }


    const all=raw.map(p=>{

      const id=+p.cell_id;

      const value=
        p.value==null
          ?null
          :+p.value;

      let wetDepth=null;

      if(S.target==='depth'){
        wetDepth=value;
      }
      else if(
        S.target==='wse' ||
        S.target==='vmean' ||
        S.target==='vmax'
      ){
        wetDepth=
          depthById.has(id)
            ?depthById.get(id)
            :null;
      }

      return{
        type:'Feature',
        geometry:{
          type:'Point',
          coordinates:
            utm43(+p.x,+p.y)
        },
        properties:{
          cell_id:id,
          value:value,
          available:
            !!p.prediction_available,
          source_label:
            p.source_label||'',
          wet_depth:
            wetDepth
        }
      }
    });


    const shown=all.filter(f=>{

      const p=f.properties;

      if(
        !p.available ||
        !Number.isFinite(p.value)
      ){
        return false;
      }

      if(S.target==='depth'){
        return p.value>=.10;
      }

      if(
        S.target==='wse' ||
        S.target==='vmean' ||
        S.target==='vmax'
      ){
        return(
          Number.isFinite(
            p.wet_depth
          ) &&
          p.wet_depth>=.10
        );
      }

      if(S.target==='flood'){
        return p.value>=.50;
      }

      return true;
    });


    const unavailable=
      all.filter(
        f=>
          !f.properties.available
      );


    const vals=
      shown
        .map(
          f=>f.properties.value
        )
        .filter(
          Number.isFinite
        );


    let lo=0;
    let hi=1;


    if(vals.length){

      if(S.target==='depth'){
        lo=0;
        hi=Math.max(
          ...vals
        );
      }
      else if(
        S.target==='vmean' ||
        S.target==='vmax'
      ){
        lo=0;
        hi=Math.max(
          ...vals
        );
      }
      else if(S.target==='flood'){
        lo=.50;
        hi=Math.max(
          1,
          ...vals
        );
      }
      else{
        lo=Math.min(
          ...vals
        );
        hi=Math.max(
          ...vals
        );
      }
    }


    if(
      !Number.isFinite(hi) ||
      hi<=lo
    ){
      hi=lo+1;
    }


    const fc={
      type:'FeatureCollection',
      features:shown
    };

    const uc={
      type:'FeatureCollection',
      features:unavailable
    };


    if(
      S.map.getSource(
        'cells'
      )
    ){
      S.map
        .getSource('cells')
        .setData(fc);
    }
    else{

      S.map.addSource(
        'cells',
        {
          type:'geojson',
          data:fc
        }
      );

      S.map.addLayer({
        id:'cells',
        type:'circle',
        source:'cells',
        paint:{
          'circle-radius':
            cellRadiusExpr(),

          'circle-opacity':
            cellOpacityExpr(),

          'circle-color':
            colorExpr(lo,hi),

          'circle-stroke-color':[
            'case',
            [
              '==',
              ['get','source_label'],
              'High uncertainty'
            ],
            '#8f43dc',
            'rgba(255,255,255,.50)'
          ],

          'circle-stroke-width':[
            'case',
            [
              '==',
              ['get','source_label'],
              'High uncertainty'
            ],
            1.35,
            .35
          ]
        }
      });
    }


    /*
      Keep the 244 unavailable cells explicit,
      but do NOT let them recreate the full-domain oval.

      They become gradually visible when zooming in.
    */

    if(
      S.map.getSource(
        'cells-unavailable'
      )
    ){
      S.map
        .getSource(
          'cells-unavailable'
        )
        .setData(uc);
    }
    else{

      S.map.addSource(
        'cells-unavailable',
        {
          type:'geojson',
          data:uc
        }
      );

      S.map.addLayer({
        id:'cells-unavailable',
        type:'circle',
        source:'cells-unavailable',
        paint:{
          'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            8,.5,
            11,1.2,
            14,2.2,
            16,3
          ],

          'circle-opacity':[
            'interpolate',
            ['linear'],
            ['zoom'],
            8,.01,
            10,.035,
            12,.08,
            14,.16
          ],

          'circle-color':
            '#66727d',

          'circle-stroke-width':
            0
        }
      });
    }


    S.map.setPaintProperty(
      'cells',
      'circle-color',
      colorExpr(lo,hi)
    );

    S.map.setPaintProperty(
      'cells',
      'circle-opacity',
      cellOpacityExpr()
    );

    S.map.setPaintProperty(
      'cells',
      'circle-radius',
      cellRadiusExpr()
    );


    const sm=x.summary||{};


    $('#available').textContent=
      fmt(
        (sm.n_cells||4783) -
        (sm.unavailable_cells||0),
        0
      );


    $('#unavailable').textContent=
      fmt(
        sm.unavailable_cells,
        0
      );


    $('#max').textContent=
      vals.length
        ?fmt(
            Math.max(...vals),
            3
          )
        :'-';


    $('#uncertain').textContent=
      fmt(
        sm.high_uncertainty_cells,
        0
      );


    $('#unit').textContent=
      `${labels[S.target][1]} • ${shown.length} map-visible`;


    $('#legendTitle').textContent=
      labels[S.target][0];


    $('#legendUnit').textContent=
      labels[S.target][1];


    $('#lo').textContent=
      fmt(lo,3);


    $('#hi').textContent=
      fmt(hi,3);


    const legendNote=
      document.querySelector(
        '.legend small'
      );

    if(legendNote){
      legendNote.textContent=
        mapPolicyText(
          shown.length
        ) +
        ' Purple outline = high uncertainty.';
    }


    $('#modeBadge').textContent=
      S.mode==='forecast'
        ?'FORECAST DEMO'
        :'HISTORICAL REPLAY';


    $('#summary').textContent=
      S.mode==='forecast'
        ?'Accepted six-horizon model output on a real geographic map. The map emphasizes meaningful hydraulic cells while retaining the complete model output in the API. This remains historical QA, not a live flood warning.'
        :'Historical July 2021 replay with rising, peak and recession anchors. The map emphasizes modeled-wet hydraulic cells; values are not invented between accepted replay states.';


  }
  catch(e){

    openDrawer(
      'Layer unavailable',
      `<p>${esc(e.message)}</p><p>No replacement value was fabricated.</p>`
    );
  }
}

function bindClick(){S.map.on('click','cells',async e=>{let f=e.features?.[0];if(!f)return;let id=f.properties.cell_id,u=S.mode==='forecast'?`/api/v1/forecast/cell?cell_id=${id}`:`/api/v1/replay/cell?anchor=${S.anchor}&cell_id=${id}`;try{let x=await j(u),hs=x.horizons||{},rows=Object.keys(hs).sort((a,b)=>+a-+b).map(h=>{let z=hs[h]||{},p=z.predictions||z.prediction||z;return`<div class="hrow"><span>+${h} min</span><span>Depth ${fmt(p.depth??p.depth_m??z.depth,3)} m</span><span>WSE ${fmt(p.wse??p.wse_m??z.wse,3)} m</span><span>Flood ${fmt(p.flood??z.flood,3)}</span></div>`}).join('');openDrawer(`Cell ${id}`,`<div class="metricgrid"><div class="metric"><small>Selected value</small><b>${fmt(f.properties.value,4)} ${esc(labels[S.target][1])}</b></div><div class="metric"><small>Availability</small><b>${f.properties.available?'Available':'Unavailable'}</b></div><div class="metric"><small>Source label</small><b>${esc(f.properties.source_label||'-')}</b></div><div class="metric"><small>Map position</small><b>${fmt(e.lngLat.lat,5)}, ${fmt(e.lngLat.lng,5)}</b></div></div><h3>Six-horizon view</h3>${rows}`)}catch(err){openDrawer(`Cell ${id}`,`<p>${esc(err.message)}</p>`)}});S.map.on('mouseenter','cells',()=>S.map.getCanvas().style.cursor='crosshair');S.map.on('mouseleave','cells',()=>S.map.getCanvas().style.cursor='')}
function openDrawer(t,h,eye='MAP DETAILS'){$('#deye').textContent=eye;$('#dtitle').textContent=t;$('#dbody').innerHTML=h;$('#drawer').classList.add('open')}
function horizons(){$('#horizons').innerHTML=H.map(h=>`<button data-h="${h}" class="${h===S.h?'active':''}">+${h}</button>`).join('');$$('[data-h]').forEach(b=>b.onclick=()=>{stopPlay();S.h=+b.dataset.h;horizons();loadMap()})}
async function availability(){let w=$('#when').value;if(!w)return;try{let t=await j('/api/v1/time/resolve?datetime='+encodeURIComponent(w));let h=String(t.hydraulic_state||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());$('#availTitle').textContent=h||t.mode;$('#availText').textContent=t.hydraulic_explanation||'';if(t.mode==='HISTORICAL'){let ev=t.runtime_replay_event||null;if(ev&&ev.event_id&&ev.event_id!=='EV2021_JUL'){S.dateHydraulicAvailable=false;$('#availTitle').textContent=`${ev.year||''} Dynamic Historical Replay Available`.trim();$('#availText').innerHTML=`${esc(t.hydraulic_explanation||'A dynamic physical reconstruction is published for this historical event.')} <a href="/history.html?event=${encodeURIComponent(ev.event_id)}">Open this historical replay</a>`}else{S.dateHydraulicAvailable=!!ev;if(ev){let aa=ev.runtime_replay_anchors||[];if(aa.length){let d=new Date(w),best=aa.slice().sort((a,b)=>Math.abs(new Date(a.base_time)-d)-Math.abs(new Date(b.base_time)-d))[0];if(best?.anchor){S.anchor=best.anchor;$('#anchor').value=S.anchor}}}}if(S.mode==='replay')loadMap()}else{S.dateHydraulicAvailable=true}}catch(e){S.dateHydraulicAvailable=false;$('#availTitle').textContent='Time resolver unavailable';$('#availText').textContent=e.message;if(S.mode==='replay')loadMap()}}
async function health(){try{let h=await j('/api/v1/health');$('#health').textContent=h.status==='PASS'?'System healthy':'System degraded';$('#health').className=h.status==='PASS'?'good':'warn'}catch{$('#health').textContent='Backend unavailable';$('#health').className='warn'}}
function mode(m){S.mode=m;$('#view').value=m;$('#anchor').disabled=m!=='replay';loadMap()}
function stopPlay(){S.playing=false;clearTimeout(S.timer);S.timer=null;let b=$('#play');if(b)b.textContent='Play'}
async function playStep(){if(!S.playing)return;let pos=H.indexOf(S.h);S.h=H[(pos+1)%H.length];horizons();await loadMap();if(S.playing)S.timer=setTimeout(playStep,1000)}
function togglePlay(){if(S.playing){stopPlay();return}S.playing=true;$('#play').textContent='Stop';playStep()}


function humanRawState(v){
  return String(
    v??''
  ).trim()
}

function sourceStateCard(
  title,
  raw,
  kind
){

  const r=
    humanRawState(raw);

  const upper=
    r.toUpperCase();

  let friendly=
    r||'State unavailable';

  let cls=
    'state-neutral';


  if(kind==='wse'){

    if(
      upper.includes('BLOCK') ||
      upper==='FALSE' ||
      upper.includes('NOT_AUTH')
    ){
      friendly=
        'Not operationally bound yet. FloodSense is not treating a real WSE feed as an authorized live input.';

      cls=
        'state-blocked';
    }
    else{
      friendly=
        'Operational binding state reported by the source service.';

      cls=
        'state-info';
    }
  }


  if(kind==='datum'){

    if(
      upper.includes(
        'UNRESOLVED'
      )
    ){
      friendly=
        'Datum unresolved. Gauge stage must not yet be converted to absolute WSE for hydraulic assimilation.';

      cls=
        'state-blocked';
    }
    else{
      friendly=
        'Vertical-datum state reported by the source service.';

      cls=
        'state-info';
    }
  }


  if(kind==='telemetry'){

    friendly=
      'Not connected. No live hydraulic sensor feed is currently driving this map.';

    cls=
      'state-blocked';
  }


  return`
    <div class="plainbox source-state-card ${cls}">
      <b>${esc(title)}</b>
      <span class="state-friendly">${esc(friendly)}</span>
      <small class="state-raw">Raw state: ${esc(r||'NOT CONNECTED')}</small>
    </div>
  `;
}


function readableToken(v){

  const s=
    String(v??'')
      .trim()
      .replace(/_/g,' ')
      .replace(/\s+/g,' ')
      .toLowerCase();

  return s.replace(
    /\b\w/g,
    c=>c.toUpperCase()
  );
}


function runCard(r){

  const mode=
    readableToken(
      r.mode||'Unknown mode'
    );

  const status=
    readableToken(
      r.status||'Unknown status'
    );

  const raw=
    [
      r.mode||'',
      r.status||''
    ]
    .filter(Boolean)
    .join(' - ');


  return`
    <div class="plainbox run-state-card">
      <b>${esc(r.run_id||'Unnamed run')}</b>
      <span class="state-friendly">${esc(mode)} • ${esc(status)}</span>
      <small class="state-raw">Recorded state: ${esc(raw||'Unavailable')}</small>
    </div>
  `;
}

function wire(){$('#study').onclick=()=>S.map.fitBounds(S.bounds,{padding:70,duration:800});$('#world').onclick=()=>S.map.flyTo({center:[78.8,20.6],zoom:2,duration:800});$('#view').onchange=e=>{stopPlay();mode(e.target.value)};$('#target').onchange=e=>{stopPlay();S.target=e.target.value;loadMap()};$('#display').onchange=e=>{stopPlay();S.display=e.target.value;loadMap()};$('#anchor').onchange=e=>{stopPlay();S.anchor=e.target.value;loadMap()};$('#when').onchange=()=>availability();$('#close').onclick=()=>$('#drawer').classList.remove('open');$$('[data-mode]').forEach(b=>b.onclick=()=>mode(b.dataset.mode));$$('.future').forEach(b=>b.onclick=()=>openDrawer('Planned feature',`<p>${esc(b.textContent.trim())} is intentionally not fabricated in this build.</p>`,'ROADMAP'));$('#sourcesBtn').onclick=async()=>{

  let x=
    await j(
      '/api/v1/sources/status'
    );

  const wse=
    x.real_wse_binding ??
    x.real_source_binding_authorized ??
    'BLOCKED';

  const datum=
    x.muradpur_vertical_datum_status ??
    'UNRESOLVED';

  openDrawer(
    'Source readiness',
    sourceStateCard(
      'Real WSE binding',
      wse,
      'wse'
    ) +
    sourceStateCard(
      'Muradpur vertical datum',
      datum,
      'datum'
    ) +
    sourceStateCard(
      'Live hydraulic telemetry',
      'NOT CONNECTED',
      'telemetry'
    ),
    'SOURCES'
  );
};

$('#runsBtn').onclick=async()=>{

  let x=
    await j(
      '/api/v1/runs?limit=10'
    );

  let items=
    x.items||[];

  openDrawer(
    'Recent runs',
    items.length
      ?items.map(
          runCard
        ).join('')
      :'<p>No stored runs.</p>',
    'PERSISTENT HISTORY'
  );
};

$('#play').onclick=togglePlay}


/* B2M_B3_DYNAMIC_LAYOUT_GUARD_V1 */

let B2M_LAYOUT_OBSERVER=null;
let B2M_LAYOUT_INSTALLED=false;


function b2mVisible(el){

  if(!el){
    return false;
  }

  const s=
    getComputedStyle(el);

  return(
    s.display!=='none' &&
    s.visibility!=='hidden'
  );
}


/* B2M_B3R1_GEOMETRY_GUARD_V2 */

/* B2M_B3R2_LAYOUT_PRECEDENCE_V3 */

function b2mHeroContentBottom(hero){

  if(!hero){
    return NaN;
  }


  const heroRect=
    hero.getBoundingClientRect();


  let bottom=
    heroRect.bottom;


  const excludedRoots=[
    document.querySelector('.stats'),
    document.querySelector('.controls'),
    document.querySelector('#drawer'),
    document.querySelector('.legend'),
    document.querySelector(
      '.maplibregl-ctrl-bottom-right'
    )
  ].filter(Boolean);


  for(
    const el of
    hero.querySelectorAll('*')
  ){

    const excluded=
      excludedRoots.some(
        root=>
          el===root ||
          root.contains(el)
      );


    if(excluded){
      continue;
    }


    if(!b2mVisible(el)){
      continue;
    }


    const style=
      getComputedStyle(el);


    /*
      Fixed/absolute floating widgets must never extend the
      semantic hero-content measurement.
    */

    if(
      style.position==='fixed' ||
      style.position==='absolute'
    ){
      continue;
    }


    const r=
      el.getBoundingClientRect();


    if(
      r.width>0 &&
      r.height>0 &&
      Number.isFinite(r.bottom)
    ){

      bottom=
        Math.max(
          bottom,
          r.bottom
        );
    }
  }


  return bottom;
}


function b2mSetCheck(
  name,
  value
){

  document.documentElement.dataset[
    name
  ] =
    value===null
      ?'SKIP'
      :(value?'PASS':'FAIL');
}


function b2mLayoutSelfCheck(){

  const main=
    document.querySelector(
      'main'
    );

  const hero=
    document.querySelector(
      '.hero'
    );

  const stats=
    document.querySelector(
      '.stats'
    );

  const controls=
    document.querySelector(
      '.controls'
    );

  const drawer=
    document.querySelector(
      '#drawer'
    );

  const legend=
    document.querySelector(
      '.legend'
    );

  const mapControls=
    document.querySelector(
      '.maplibregl-ctrl-bottom-right'
    );


  const results=[];


  /*
    1. HERO / STATISTICS

    Compare statistics against the ACTUAL lowest
    visible hero child, not only the nominal hero box.
  */

  let heroStats=null;


  if(
    hero &&
    stats &&
    b2mVisible(hero) &&
    b2mVisible(stats)
  ){

    const contentBottom=
      b2mHeroContentBottom(
        hero
      );

    const sr=
      stats.getBoundingClientRect();


    heroStats=
      Number.isFinite(
        contentBottom
      ) &&
      sr.top >=
        contentBottom + 4;


    results.push(
      heroStats
    );


    document.documentElement.dataset.b2mHeroContentBottom=
      String(
        Math.round(
          contentBottom
        )
      );


    document.documentElement.dataset.b2mStatsTop=
      String(
        Math.round(
          sr.top
        )
      );
  }


  b2mSetCheck(
    'b2mCheckHeroStats',
    heroStats
  );


  /*
    2. DRAWER / CONTROLS

    IMPORTANT:
    A closed drawer is translated off-screen.
    getBoundingClientRect() therefore describes the
    transformed CLOSED position.

    Validate the drawer's logical CSS top instead.
  */

  let drawerControls=null;


  if(
    main &&
    controls &&
    drawer &&
    innerWidth>1250 &&
    b2mVisible(controls)
  ){

    const mr=
      main.getBoundingClientRect();

    const cr=
      controls.getBoundingClientRect();


    const logicalTop=
      parseFloat(
        getComputedStyle(
          drawer
        ).top
      );


    const requiredTop=
      cr.bottom -
      mr.top +
      4;


    drawerControls=
      Number.isFinite(
        logicalTop
      ) &&
      logicalTop >=
        requiredTop;


    results.push(
      drawerControls
    );


    document.documentElement.dataset.b2mDrawerLogicalTop=
      String(
        Math.round(
          logicalTop
        )
      );


    document.documentElement.dataset.b2mDrawerRequiredTop=
      String(
        Math.round(
          requiredTop
        )
      );
  }


  b2mSetCheck(
    'b2mCheckDrawerControls',
    drawerControls
  );


  /*
    3. MAPLIBRE CONTROLS / FLOODSENSE LEGEND
  */

  let legendControls=null;


  if(
    legend &&
    mapControls &&
    b2mVisible(legend) &&
    b2mVisible(mapControls)
  ){

    const lr=
      legend.getBoundingClientRect();

    const mr=
      mapControls.getBoundingClientRect();


    if(
      mr.width>0 &&
      mr.height>0
    ){

      legendControls=
        mr.bottom <=
        lr.top - 4;


      results.push(
        legendControls
      );


      document.documentElement.dataset.b2mLegendTop=
        String(
          Math.round(
            lr.top
          )
        );


      document.documentElement.dataset.b2mMapControlsBottom=
        String(
          Math.round(
            mr.bottom
          )
        );
    }
  }


  b2mSetCheck(
    'b2mCheckLegendControls',
    legendControls
  );


  /*
    PASS requires every actually-applicable check
    to pass. SKIP is allowed only when a component
    genuinely does not exist/participate in that layout.
  */

  const ok=
    results.length>0 &&
    results.every(
      Boolean
    );


  document.documentElement.dataset.b2mLayout=
    ok
      ?'PASS'
      :'FAIL';


  document.documentElement.dataset.b2mGeometryVersion=
    'B3R2';


  if(stats){

    const ss=
      getComputedStyle(stats);

    document.documentElement.dataset.b2mStatsComputedTop=
      ss.top;

    document.documentElement.dataset.b2mStatsInlinePriority=
      stats.style.getPropertyPriority(
        'top'
      ) || 'none';
  }


  if(drawer){

    const ds=
      getComputedStyle(drawer);

    document.documentElement.dataset.b2mDrawerComputedTop=
      ds.top;

    document.documentElement.dataset.b2mDrawerInlinePriority=
      drawer.style.getPropertyPriority(
        'top'
      ) || 'none';
  }
}


function b2mUpdateFloatingLayout(){

  const main=
    document.querySelector(
      'main'
    );

  const hero=
    document.querySelector(
      '.hero'
    );

  const stats=
    document.querySelector(
      '.stats'
    );

  const controls=
    document.querySelector(
      '.controls'
    );

  const drawer=
    document.querySelector(
      '#drawer'
    );

  const legend=
    document.querySelector(
      '.legend'
    );


  if(
    !main ||
    !hero ||
    !controls ||
    !drawer
  ){
    return;
  }


  const mr=
    main.getBoundingClientRect();

  const heroContentBottom=
    b2mHeroContentBottom(
      hero
    );


  const heroBottom=
    Math.ceil(
      heroContentBottom -
      mr.top
    );


  /*
    LARGE DESKTOP
    -------------
    Hero and controls remain side-by-side.

    Statistics always begin BELOW the actual rendered
    hero height rather than below an old hard-coded
    assumed height.
  */

  if(innerWidth > 1250){

    controls.style.setProperty(
      'top',
      '18px',
      'important'
    );

    if(
      stats &&
      b2mVisible(stats)
    ){

      stats.style.setProperty(
        'top',
        `${heroBottom + 10}px`,
        'important'
      );
    }


    const cr=
      controls.getBoundingClientRect();

    const drawerTop=
      Math.ceil(
        cr.bottom -
        mr.top +
        10
      );


    drawer.style.setProperty(
      'top',
      `${drawerTop}px`,
      'important'
    );

    drawer.style.setProperty(
      'max-height',
      `calc(100% - ${drawerTop + 18}px)`,
      'important'
    );
  }


  /*
    MEDIUM / NARROW LAYOUT
    ----------------------
    Controls are intentionally below the hero.

    If statistics remain visible, they move below the
    controls. This prevents the same collision when the
    browser is resized or display scaling is increased.
  */

  else{

    controls.style.setProperty(
      'top',
      `${heroBottom + 10}px`,
      'important'
    );


    requestAnimationFrame(
      ()=>{

        if(
          stats &&
          b2mVisible(stats)
        ){

          const cr=
            controls.getBoundingClientRect();

          stats.style.setProperty(
            'top',
            `${
              Math.ceil(
                cr.bottom -
                mr.top +
                10
              )
            }px`,
            'important'
          );
        }
      }
    );


    drawer.style.setProperty(
      'top',
      '18px',
      'important'
    );

    drawer.style.setProperty(
      'max-height',
      'calc(100% - 36px)',
      'important'
    );
  }


  /*
    WATER-LEGEND / MAP-CONTROL COLLISION
    ------------------------------------
    MapLibre navigation, scale and information controls
    live in its bottom-right control container.

    The FloodSense hydraulic legend also occupies the
    bottom-right.

    Dynamically reserve the actual legend height so the
    controls always sit above it.
  */

  let mapControlBottom=
    12;


  if(
    legend &&
    b2mVisible(legend)
  ){

    const lr=
      legend.getBoundingClientRect();


    mapControlBottom=
      Math.max(
        12,
        Math.ceil(
          mr.bottom -
          lr.top +
          10
        )
      );
  }


  document.documentElement.style.setProperty(
    '--b2m-map-control-bottom',
    `${mapControlBottom}px`
  );


  requestAnimationFrame(
    b2mLayoutSelfCheck
  );
}


function b2mInstallLayoutGuard(){

  if(B2M_LAYOUT_INSTALLED){
    b2mUpdateFloatingLayout();
    return;
  }


  B2M_LAYOUT_INSTALLED=true;


  const hero=
    document.querySelector(
      '.hero'
    );

  const controls=
    document.querySelector(
      '.controls'
    );

  const legend=
    document.querySelector(
      '.legend'
    );


  if(
    'ResizeObserver' in window
  ){

    B2M_LAYOUT_OBSERVER=
      new ResizeObserver(
        ()=>{
          requestAnimationFrame(
            b2mUpdateFloatingLayout
          );
        }
      );


    for(const el of [
      hero,
      controls,
      legend
    ]){

      if(el){
        B2M_LAYOUT_OBSERVER.observe(
          el
        );
      }
    }
  }


  addEventListener(
    'resize',
    ()=>{
      requestAnimationFrame(
        b2mUpdateFloatingLayout
      );
    }
  );


  addEventListener(
    'load',
    ()=>{
      requestAnimationFrame(
        b2mUpdateFloatingLayout
      );
    },
    {once:true}
  );


  if(
    document.fonts &&
    document.fonts.ready
  ){

    document.fonts.ready.then(
      ()=>{

        requestAnimationFrame(
          ()=>{

            b2mUpdateFloatingLayout();

            requestAnimationFrame(
              b2mLayoutSelfCheck
            );
          }
        );
      }
    );
  }


  /*
    Several passes cover:
    - app reveal
    - font/layout completion
    - MapLibre control creation
    - first hydraulic summary update
  */

  for(const delay of [
    0,
    80,
    250,
    700,
    1500
  ]){

    setTimeout(
      b2mUpdateFloatingLayout,
      delay
    );
  }
}

function init(){let qp=new URLSearchParams(location.search),qm=qp.get('mode'),qw=qp.get('datetime');if(qm==='replay'||qm==='forecast'){S.mode=qm;$('#view').value=qm;$('#anchor').disabled=qm!=='replay'}if(qw)$('#when').value=String(qw).slice(0,16);wire();horizons();availability();makeMap();health();$('#net').textContent=navigator.onLine?'Online basemap available':'Offline map mode';$('#net').className=navigator.onLine?'good':'warn';addEventListener('online',()=>{$('#net').textContent='Online basemap available';$('#net').className='good'});addEventListener('offline',()=>{$('#net').textContent='Offline map mode';$('#net').className='warn'});$('#app').hidden=false;$('#boot').remove()}init();
setTimeout(b2mInstallLayoutGuard,0);

