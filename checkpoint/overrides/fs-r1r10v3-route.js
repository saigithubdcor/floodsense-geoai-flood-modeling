/* FLOODSENSE B1M3 R1R10-V3 -- EXPLICIT-APPLY DATE ROUTING
 * No routing on date change, on normal navigation, or on initial page load.
 * The native registered-event selector remains authoritative within History.
 * This script never turns a scenario envelope into a date-conditioned forecast.
 */
(function(){
'use strict';
if(window.__FSExplicitRouteV3)return;
window.__FSExplicitRouteV3=true;
const page=location.pathname.split('/').pop();
if(page!=='history.html'&&page!=='outlook.html')return;
const bar=document.getElementById('floodsense-r5-statebar');
if(!bar)return;
const date=bar.querySelector('input[type="date"]');
const apply=Array.from(bar.querySelectorAll('button')).find(b=>b.textContent.trim()==='Apply to this page');
const status=bar.querySelector('span');
if(!date||!apply)return;
const valid=d=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d||'')))return false;const q=new Date(d+'T12:00:00');return !isNaN(q.getTime())&&[q.getFullYear(),String(q.getMonth()+1).padStart(2,'0'),String(q.getDate()).padStart(2,'0')].join('-')===d;};
const today=()=>{let d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const events={'2021-07-22':'EV2021_JUL','2022-07-12':'EV2022_JUL','2023-07-19':'EV2023_JUL','2024-07-14':'EV2024_JUL'};
let request=0;
function dest(day,r){
 const s=String(r?.state||'').toUpperCase();
 if(s==='REGISTERED_REPLAY'){
   const id=String(r?.event_id||events[day]||'');
   if(!/^EV20(?:21|22|23|24)_JUL$/.test(id))throw Error('Registered event identity unresolved');
   return '/history.html?event='+encodeURIComponent(id)+'&udate='+encodeURIComponent(day);
 }
 if(day<today())return '/?udate='+encodeURIComponent(day);
 // Current/future routes only to Outlook, not GeoOps reference/demo.
 return '/outlook.html?udate='+encodeURIComponent(day);
}
async function commit(){
 const day=date.value,mine=++request;
 if(!valid(day)){if(status)status.textContent='Invalid selected date; no navigation';return;}
 apply.disabled=true;
 if(status)status.textContent='Resolving destination for '+day+' ...';
 try{
   // Same-origin read of the accepted B1M3 scientific date router; never invent a state.
   const res=await fetch('http://127.0.0.1:25820/api/v1/unified/date?date='+encodeURIComponent(day),{cache:'no-store'});
   if(!res.ok)throw Error('Date service HTTP '+res.status);
   const state=await res.json();
   if(mine!==request||date.value!==day)return;
   const target=dest(day,state);const u=new URL(target,location.origin);
   if(u.origin!==location.origin)throw Error('Cross-origin routing refused');
   if(u.pathname==='/outlook.html'&&page==='outlook.html'){
     const old=new URLSearchParams(location.search);
     if(old.has('h'))u.searchParams.set('h',old.get('h'));
   }
   // Full same-origin navigation intentionally clears stale historical / scenario UI.
   location.assign(u.pathname+u.search);
 }catch(e){if(mine===request&&status)status.textContent='Routing HOLD: '+String(e.message||e)+'; view unchanged';}
 finally{if(mine===request)apply.disabled=false;}
}
// Capture ONLY the Apply button. Existing native date handling cannot run too.
apply.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();commit();},true);
// Preserve the pending choice until Apply; a date-picker change is not navigation.
date.addEventListener('change',e=>{request++;e.stopImmediatePropagation();if(status)status.textContent='Date selected; click Apply to navigate.';},true);
window.__FSRouteV3Test={dest,valid,today};
})();
