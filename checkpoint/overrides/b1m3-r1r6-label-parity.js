/* R1R6: Optional exact-asset-label parity from accepted Outlook registry. No historical depth substitution. */
(()=>{'use strict';
 if(window.__FloodSenseR1R6LabelParityLoaded)return;
 window.__FloodSenseR1R6LabelParityLoaded=true;
 window.__FloodSenseR1R6VerifiedLabels=Object.create(null);
 let reference=null,attempted=false,lastImpact=null;
 const rawRoad=n=>/^road\s+\d+$/i.test(String(n||''));
 const valid=x=>Number.isFinite(Number(x));
 const dist=(a,b)=>{
   const lat1=Number(a.latitude),lat2=Number(b.latitude),lon1=Number(a.longitude),lon2=Number(b.longitude);
   if(![lat1,lat2,lon1,lon2].every(Number.isFinite))return Infinity;
   const phi1=lat1*Math.PI/180,phi2=lat2*Math.PI/180,dphi=(lat2-lat1)*Math.PI/180,dl=(lon2-lon1)*Math.PI/180;
   return 12742000*Math.asin(Math.min(1,Math.sqrt(Math.sin(dphi/2)**2+Math.cos(phi1)*Math.cos(phi2)*Math.sin(dl/2)**2)));
 };
 function merge(){
   if(!Array.isArray(reference)||!lastImpact)return;
   const current=lastImpact.affected_assets||[];
   const byid=new Map();
   for(const r of reference){if(r&&r.asset_id!=null)byid.set(String(r.asset_id),r)}
   const next=Object.create(null);let matched=0;
   for(const a of current){
     if(!rawRoad(a.name))continue;
     const b=byid.get(String(a.asset_id));
     if(!b||rawRoad(b.name)||!String(b.name||'').trim()||!String(b.category||'').match(/road|bridge/i))continue;
     if(dist(a,b)>75)continue; // Exact ID + 75 m coordinate check; no nearby-name substitution.
     next[String(a.asset_id)]={name:String(b.name).trim(),source:'EXACT_ID_AND_LOCATION_P5_OUTLOOK_REGISTRY'};matched++;
   }
   window.__FloodSenseR1R6VerifiedLabels=next;
   window.__FloodSenseR1R6RerenderRows?.();
   const note=document.querySelector('#b1m3-r1r6-name-note');
   if(note)note.textContent=matched+' historical road labels matched to the reference Outlook registry by exact OSM ID and location. Other records retain qualified proximity descriptions.';
 }
 async function obtain(){
   if(attempted)return;attempted=true;
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),2600);
   try{
     const r=await fetch('/api/v1/impact/ensemble?horizon=3&stat=median&conditioning=auto&refresh=0',{signal:controller.signal,cache:'no-store'});
     if(!r.ok)return;
     const data=await r.json();if(!Array.isArray(data.affected_assets))return;
     reference=data.affected_assets;merge();
   }catch(_){/* The optional name enhancement must never block flood rendering. */}
   finally{clearTimeout(timeout)}
 }
 window.__FloodSenseR1R6SyncNames=(payload)=>{
   lastImpact=payload;
   const host=document.querySelector('#floodsense-b1m3-impact-panel .b1m3-dock-body');
   if(host&&!document.querySelector('#b1m3-r1r6-name-note')){
      const n=document.createElement('p');n.id='b1m3-r1r6-name-note';n.className='b1m3-sub';n.textContent='Road names: matched source labels where verifiable; other labels are proximity context only.';
      host.appendChild(n)
   }
   if(reference)merge();else obtain();
 };
 // Reuse the existing R1R4 selection ring and popup logic. Compact styling is handled in R1R6 CSS.
 const prior=window.__FloodSenseR1R4Select;
 if(typeof prior==='function')window.__FloodSenseR1R4Select=(...args)=>{
   prior(...args);
   const m=window.__FloodSenseMap;
   try{if(m?.getLayer('floodsense-r1r4-selection-ring'))m.setPaintProperty('floodsense-r1r4-selection-ring','circle-stroke-color','#101820');
       if(m?.getLayer('floodsense-r1r4-selection-core'))m.setPaintProperty('floodsense-r1r4-selection-core','circle-color','#101820')}
   catch(_){/* visual-only fallback */}
 };
 // Closing the inspector should clear the map focus, too.
 document.addEventListener('click',e=>{if(e.target?.matches?.('#floodsense-b1m3-inspector button')){window.__FloodSenseR1R4Clear?.()}});
})();
