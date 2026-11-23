/* B1M3-R1R7: historical-only layout coordinator; no map/model data mutation. */
(()=>{'use strict';
 if(window.__FloodSenseR1R7LayoutLoaded)return;
 window.__FloodSenseR1R7LayoutLoaded=true;
 let scheduled=false, observed=false;
 function locate(){
   scheduled=false;
   if(!document.body.classList.contains('fs-r1r4-historical')){const b=document.getElementById('modeBadge');if(b?.textContent==='HISTORICAL DAY')b.textContent='FORECAST DEMO';return;}
   const main=document.querySelector('#app .body main');
   const card=document.getElementById('floodsense-r5-root');
   if(!main||!card)return;
   const mr=main.getBoundingClientRect();
   const hero=main.querySelector('.hero');
   const stats=main.querySelector('.stats');
   const dock=document.getElementById('floodsense-b1m3-impact-panel');
   const right=dock && dock.offsetParent!==null ? Math.max(0,main.clientWidth - (dock.getBoundingClientRect().left - mr.left)) : 0;
   let edge=12;
   for(const block of [hero,stats]){
     if(!block||getComputedStyle(block).display==='none')continue;
     const r=block.getBoundingClientRect();
     if(r.height>0)edge=Math.max(edge,r.bottom-mr.top+12);
   }
   const available=Math.max(64,main.clientHeight-edge-16);
   const maxWidth=Math.max(210,Math.min(395,main.clientWidth-right-38));
   card.style.setProperty('position','absolute','important');
   card.style.setProperty('top',Math.ceil(edge)+'px','important');
   card.style.setProperty('bottom','auto','important');
   card.style.setProperty('left','16px','important');
   card.style.setProperty('width',Math.floor(maxWidth)+'px','important');
   card.style.setProperty('max-width',Math.floor(maxWidth)+'px','important');
   card.style.setProperty('max-height',Math.min(112,available)+'px','important');
   card.style.setProperty('z-index','16','important');
   const badge=document.getElementById('modeBadge');
   if(badge)badge.textContent='HISTORICAL DAY';
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(locate)}
 function start(){
  schedule();window.addEventListener('resize',schedule,{passive:true});
  const main=document.querySelector('#app .body main');
  if(!main)return;
  const obs=new MutationObserver(schedule);
  obs.observe(main,{childList:true,subtree:false});
  const stat=main.querySelector('.stats'),hero=main.querySelector('.hero');
  if(typeof ResizeObserver==='function'){
    const ro=new ResizeObserver(schedule);
    for(const item of [main,stat,hero])if(item)ro.observe(item);
  }
  // Async root re-render and portal day switch: exact positioning is recalculated.
  let n=0;const tick=()=>{schedule();if(++n<12)setTimeout(tick,500)};tick();
  window.addEventListener('popstate',schedule);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
