/* FloodSense B1M3-R1R8: map-camera UX only. No API, model, basemap or impact calculation changes. */
(()=>{'use strict';
  if(window.__FloodSenseR1R8FocusLoaded)return;
  window.__FloodSenseR1R8FocusLoaded=true;
  let baseline=null, activeDate=null;
  const map=()=>window.__FloodSenseMap;
  const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
  const valid=(a)=>a&&finite(a.longitude)&&finite(a.latitude)&&Math.abs(Number(a.longitude))<=180&&Math.abs(Number(a.latitude))<=90;
  function camera(m){
    const c=m.getCenter();
    return {center:[+c.lng,+c.lat],zoom:+m.getZoom(),bearing:+m.getBearing(),pitch:+m.getPitch()};
  }
  function unmountButton(){document.getElementById('fs-r1r8-back')?.remove()}
  window.__FloodSenseR1R8Reset=(date)=>{if(date!=null&&activeDate===String(date))return;activeDate=date==null?null:String(date);baseline=null;unmountButton()};
  function addBackButton(m){
    const p=document.getElementById('floodsense-b1m3-impact-panel');
    const h=p?.querySelector('.b1m3-dock-body')||p;
    if(!h||!baseline)return;
    let b=document.getElementById('fs-r1r8-back');
    if(!b){b=document.createElement('button');b.id='fs-r1r8-back';b.type='button';
      b.textContent='← Return to previous map view';b.setAttribute('aria-label','Return to map view before selecting an asset');
      b.onclick=()=>{const mm=map();if(mm&&baseline){
        try{mm.flyTo({...baseline,duration:500,essential:false})}catch(e){console.warn('R1R8 previous view unavailable',e)}
      }};
      h.insertBefore(b,h.firstChild);
    }
  }
  function offset(m){
    const r=m.getContainer().getBoundingClientRect();
    const dock=document.getElementById('floodsense-b1m3-impact-panel');
    const stats=document.querySelector('#app .body main .stats');
    const hero=document.querySelector('#app .body main .hero');
    const sidebar=Math.max(0, ...[stats,hero].filter(Boolean).map(e=>e.getBoundingClientRect().right-r.left));
    const right=dock&&dock.offsetParent!==null?dock.getBoundingClientRect().left-r.left:r.width;
    const left=Math.min(r.width*.38,Math.max(60,sidebar+22));
    const safeRight=Math.max(left+100,Math.min(r.width-30,right-22));
    const x=(left+safeRight)/2-r.width/2;
    return [Math.max(-r.width*.25,Math.min(r.width*.25,Math.round(x))),0];
  }
  window.__FloodSenseR1R8Focus=(m,a)=>{
    if(!m||!valid(a))return false;
    try{
      if(!baseline)baseline=camera(m);
      const bucket=String(a.bucket||'').toLowerCase();
      const z=bucket==='roads_bridges'?16.5:16.8; // Outlook reference is 17, same street-level intent.
      const motion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      m.flyTo({center:[Number(a.longitude),Number(a.latitude)],zoom:z,offset:offset(m),duration:motion?0:600,essential:false});
      addBackButton(m);
      return true;
    }catch(e){console.warn('R1R8 map focus failed',e);return false}
  };
  window.__FloodSenseR1R8GroupActions=(list,focus)=>{
    if(!list||typeof focus!=='function')return;
    list.querySelectorAll('details.b1m3-road-group').forEach(group=>{
      if(group.querySelector('.fs-r1r8-group-focus'))return;
      const first=group.querySelector('.b1m3-asset-row[data-i]');
      if(!first)return;
      const action=document.createElement('button');action.type='button';
      action.className='fs-r1r8-group-focus';action.textContent='Focus highest-depth segment';
      action.setAttribute('aria-label','Zoom to the highest-depth screened road segment in this group');
      action.onclick=()=>{group.open=true;focus(Number(first.dataset.i))};
      group.querySelector('.b1m3-group-meta')?.insertAdjacentElement('afterend',action);
    });
  };
})();
