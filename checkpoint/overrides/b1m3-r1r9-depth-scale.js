/* FloodSense B1M3-R1R9: visual-only historical depth-scale choice.
 * Never changes GeoJSON, raw hydraulic depths, impact screening, or model state.
 */
(()=>{'use strict';
 if(window.__FloodSenseR1R9ScaleLoaded)return;
 window.__FloodSenseR1R9ScaleLoaded=true;
 const colors=['#2b83ba','#46d3c4','#abdda4','#ffffbf','#fdae61','#d7191c'];
 const base=[0.10,0.25,0.75,1.50,3.00,5.00];
 let mode='adaptive', map=null, max=0, features=null, selectedDate=null;
 const finite=v=>v!==null&&v!==''&&Number.isFinite(Number(v));
 const fmt=v=>Number(v).toFixed(2);
 function dataMax(geo){
   const xs=(geo?.features||[]).map(f=>f?.properties?.depth_m).filter(finite).map(Number).filter(v=>v>=.1);
   return xs.length?Math.max(...xs):0;
 }
 function expression(upper){
   const stops=mode==='adaptive'&&upper>.100001?
      base.map(v=>.1+(v-.1)*(upper-.1)/(5-.1)):base;
   const e=['interpolate',['linear'],['get','depth_m']];
   stops.forEach((v,i)=>e.push(+v.toFixed(8),colors[i]));
   return e;
 }
 function legend(){
   if(mode==='adaptive')return `Adaptive: ${fmt(Math.max(.10,max))} m max`;
   return max>5.0000001?`5.00 m cap; >5 m saturated (actual max ${fmt(max)} m)`:
       '5.00 m fixed color scale';
 }
 function status(msg){
   const s=document.getElementById('fs-r1r9-depth-status');if(s)s.textContent=msg;
 }
 function apply(){
   const m=map||window.__FloodSenseMap;
   if(!features?.length||!m||typeof m.getLayer!=='function'||!m.getLayer('floodsense-unified-depth'))return false;
   if(typeof m.isStyleLoaded==='function'&&!m.isStyleLoaded())return false;
   try{
     m.setPaintProperty('floodsense-unified-depth','circle-color',expression(Math.max(max,.100001)));
     const last=document.getElementById('fs-r1r9-legend-end');if(last)last.textContent=legend();
     status(mode==='adaptive'?'Adaptive colors: compare numeric depths, not colors across dates':'Fixed colors: comparable across dates');
     return true;
   }catch(err){status('Scale update unavailable; original colors retained');console.warn('R1R9 depth scale',err);return false}
 }
 function controls(date){
   const root=document.getElementById('floodsense-r5-root');if(!root||!features?.length)return;
   // R1R5's historical summary always contains exactly one selected-depth label row.
   const matches=[...root.querySelectorAll('span')].filter(n=>n.textContent?.trim()==='selected-date water depth');
   if(matches.length!==1){console.warn('R1R9 legend control anchor not found');return}
   const cell=matches[0],wrap=document.createElement('span');wrap.className='fs-r1r9-depth-choice';
   const sel=document.createElement('select');sel.id='fs-r1r9-depth-mode';sel.setAttribute('aria-label','Historical water-depth color scale');
   for(const [value,label] of [['fixed','Fixed scale'],['adaptive','Adaptive/day']]){
      const opt=document.createElement('option');opt.value=value;opt.textContent=label;sel.append(opt);
   }
   sel.value=mode;sel.onchange=()=>{mode=sel.value;apply()};
   wrap.append(sel);cell.replaceWith(wrap);
   const rampRow=wrap.parentElement;
   const other=[...rampRow.querySelectorAll('span')].filter(n=>n!==wrap);
   if(other.length){const last=other[other.length-1];last.id='fs-r1r9-legend-end';last.textContent=legend()}
   const line=document.createElement('small');line.id='fs-r1r9-depth-status';line.textContent='Adaptive colors: compare numeric depths, not colors across dates';
   line.className='fs-r1r9-status';rampRow.insertAdjacentElement('afterend',line);
   selectedDate=String(date);apply();
 }
 window.__FloodSenseR1R9Scale={
    syncFromState(m,geo){map=m;features=geo?.features||[];max=dataMax(geo);apply()},
    context(date){controls(date)},
    clear(){features=null;max=0;selectedDate=null},
    getMode(){return mode},
    getMax(){return max},
    _testExpression(v,selectedMode){const old=mode;mode=selectedMode;try{return expression(v)}finally{mode=old}},
    _testMax:dataMax
 };
})();
