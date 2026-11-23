/* FLOODSENSE_B1M3_R1R10V3_OUTLOOK_MAP
   Presentation/hit testing only. Reuses native MapLibre sources and inspectors.
   No alteration of hydraulic values, scenarios, asset registry or geometry. */
(function(){
'use strict';
if(window.__FloodSenseR1R10V3MapInstalled)return;
window.__FloodSenseR1R10V3MapInstalled=true;
const CELL='fs-r1r10v3-cell-hit',ASSET='fs-r1r10v3-asset-hit';
let map=null,cellListener=false,assetListener=false;
function addLayer(id,source,prefix){
 if(!map||!map.isStyleLoaded()||!map.getSource(source)||map.getLayer(id))return false;
 const style={id,type:'circle',source,paint:{
  'circle-radius':['interpolate',['linear'],['zoom'],8,prefix==='cell'?10:10,10,prefix==='cell'?13:12,12,prefix==='cell'?16:14,14,prefix==='cell'?19:17],
  'circle-color':'#ffffff','circle-opacity':0.007,'circle-stroke-width':0
 }};
 // Add cell catchment below assets, so an asset click takes priority when they overlap.
 if(prefix==='cell'&&map.getLayer('impact-assets'))map.addLayer(style,'impact-assets');else map.addLayer(style);
 return true;
}
function centre(f){try{return f?.geometry?.type==='Point'?map.project(f.geometry.coordinates):null;}catch(_){return null;}}
function near(p,layer,r){
 if(!map?.getLayer(layer))return null;
 const box=[[p.x-r,p.y-r],[p.x+r,p.y+r]];
 const found=map.queryRenderedFeatures(box,{layers:[layer]})||[];
 let best=null,dist=Infinity;
 for(const f of found){const at=centre(f);if(!at)continue;const d=Math.hypot(at.x-p.x,at.y-p.y);if(d<dist){best=f;dist=d;}}
 return dist<=r?best:null;
}
function match(e){
 // Assets have first priority within a tight tolerance, then model cells.
 const a=near(e.point,ASSET,12);if(a)return {kind:'asset',f:a};
 const c=near(e.point,CELL,15);return c?{kind:'cell',f:c}:null;
}
function attempt(e){
 try{
  const item=match(e);if(!item)return;
  if(item.kind==='asset'){
   // Native exact-hit inspector still fires; only handle near-misses.
   if(map.getLayer('impact-assets')&&map.queryRenderedFeatures(e.point,{layers:['impact-assets']}).length)return;
   const id=item.f.properties?.asset_id;if(id!==null&&id!==undefined)window.__FSR1R10V3InspectAsset?.(String(id));
  }else{
   if(map.getLayer('cells')&&map.queryRenderedFeatures(e.point,{layers:['cells']}).length)return;
   const id=Number(item.f.properties?.cell_id);
   if(Number.isInteger(id)&&id>=0)window.__FSR1R10V3InspectCell?.(id);
  }
 }catch(e){console.warn('FloodSense Outlook click-target diagnostic:',e);}
}
function bind(){
 map=window.__FloodSenseMap||map;if(!map||typeof map.queryRenderedFeatures!=='function')return;
 try{
  if(!map.isStyleLoaded())return;
  if(map.getSource('cells'))addLayer(CELL,'cells','cell');
  if(map.getSource('impact-assets'))addLayer(ASSET,'impact-assets','asset');
  if(!cellListener&&map.getLayer(CELL)){
   map.on('mouseenter',CELL,()=>{map.getCanvas().style.cursor='pointer';});
   cellListener=true;
  }
  if(!assetListener&&map.getLayer(ASSET)){
   map.on('mouseenter',ASSET,()=>{map.getCanvas().style.cursor='pointer';});
   assetListener=true;
  }
  if(!map.__fsR1R10V3Events){
   map.__fsR1R10V3Events=true;
   map.on('click',attempt);
   map.on('mousemove',e=>{try{if(match(e))map.getCanvas().style.cursor='pointer';}catch(_){}});
  }
 }catch(e){console.warn('FloodSense Outlook hit-layer setup HOLD:',e);}
}
// Native map and impact asset sources are asynchronous; attach without affecting their loading.
const watch=setInterval(bind,300);setTimeout(()=>clearInterval(watch),60000);
})();
