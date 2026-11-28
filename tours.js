/* v39: Showing cart ("carrito") + agent-claimed tours.
   Clients (no direct offers):
   - No connected agent: cart up to 5 homes; requesting a showing notifies every agent in good standing. The first to accept becomes the client's agent.
     (Sign-up: agent code is optional; new accounts stay unassigned. Optional later connect: tour_link_agent. Client may remove their agent with a written reason.)
   - Connected agent: any number of homes/requests, sent ONLY to that agent, who approves or declines.
   Agents in good standing: see anonymous requests, first to accept gets the client; call / in-app chat.
   Both: route by distance (editable), calendar (Google link + .ics for Apple/Outlook), feedback,
   agent offer => 12-hour documents clock. Server: api actions tour_* (api v39). */
(function(){
const S=window.AppState;if(!S)return;
const MAX=5,MAX_DIRECT=30;
const L=(es,en)=>S.lang==='es'?es:en;
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const UI=()=>window.LegacyUI;
let scrolledTo='';
const focusOffer=id=>(location.hash||'').includes('offer='+encodeURIComponent(id))?' tour-focus':'';
const rerender=()=>{const u=UI();if(u)u.render();};
const DEMO=(()=>{try{return new URLSearchParams(location.search).get('demo')==='tours';}catch(e){return false;}})();
const isClient=()=>!!(S.user&&S.user.role==='BUYER'&&!S.isAdmin());
const isAgent=()=>!!(S.user&&S.isAgent&&S.isAgent()&&!S.isAdmin());
let data=null,loading=false,loadedAt=0,lastErr='',form={date:'',time:'10:00',notes:''},busy=false,fbOpen={};

/* ---------- cart (kept on this device, per account) ---------- */
const cartKey=()=>'lof_cart_'+(S.user?S.user.id:'guest');
function cart(){try{const a=JSON.parse(localStorage.getItem(cartKey())||'[]');return Array.isArray(a)?a.filter(id=>S.listing(id)):[];}catch(e){return [];}}
// Connected agent = chosen with an invite code or linked by an accepted showing (not the automatic "no agent yet" assignment).
function connectedAgent(){
  if(data&&data.connectedAgent)return data.connectedAgent;
  try{const bp=(S.data.buyerProfiles||[]).find(b=>b&&S.user&&b.userId===S.user.id);if(!bp||bp.assignedAutomatically!==false||!bp.agentId)return null;
    const ap=(S.data.agentProfiles||[]).find(a=>a.id===bp.agentId);if(!ap)return null;const u=(S.data.users||[]).find(x=>x.id===ap.userId)||{};
    return {id:ap.userId,name:u.name||ap.licenseHolderName||'',brokerage:ap.brokerage||'',licenseNumber:ap.licenseNumber||''};}catch(e){return null;}
}
const maxCart=()=>connectedAgent()?MAX_DIRECT:MAX;
function setCart(a){try{localStorage.setItem(cartKey(),JSON.stringify([...new Set(a)].slice(0,maxCart())));}catch(e){}}
function inCart(id){return cart().includes(id);}
const limitText=()=>L(`Puedes pedir hasta ${MAX} casas por cita. Agenda primero estas ${MAX} casas, o conéctate con un agente para poder ver más.`,`You can request up to ${MAX} homes per showing. Schedule these ${MAX} homes first, or connect with an agent to see more.`);
/* ---------- optional: connect with an agent by code (not required to request a showing) ---------- */
const CODE_RE=/^D2D-[A-Z0-9]{6}$/;
const normCode=v=>{let c=String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(c.startsWith('D2D'))c=c.slice(3);return c?'D2D-'+c:'';};
const codeMsg=()=>L('Hola, quiero ver casas en la app Legacy - Owner Finance y no tengo código de agente. ¿Me pueden conectar con un agente?','Hi, I want to see homes on the Legacy - Owner Finance app and I do not have an agent code. Can you connect me with an agent?');
function codeFormHtml(id){return `<form class="tour-form tour-codef" id="${id}" novalidate><label>${L('Código de tu agente','Your agent’s code')}<input name="code" placeholder="D2D-XXXXXX" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="12" required></label>
   <div class="tour-btns"><button type="submit" class="btn-card primary">🤝 ${L('Conectar con mi agente','Connect with my agent')}</button></div><p class="tour-warn" data-codeerr hidden></p>
   <p class="ops-meta">${L('¿No tienes código?','No code?')} <button type="button" class="btn-link" data-tcodehelp="1">📞 ${L('Contáctanos','Contact us')}</button></p></form>`;}
async function linkAgent(code){
  const c=normCode(code);
  if(!CODE_RE.test(c))throw new Error(L('Escribe el código completo de tu agente (D2D-XXXXXX).','Type your agent’s full code (D2D-XXXXXX).'));
  let r;try{r=await call('tour_link_agent',{code:c});}
  catch(e){if(e.code==='bad_action')throw new Error(L('Conectar con código todavía no está activo (vista previa). Mientras tanto llámanos o escríbenos al (405) 338-4124.','Connecting by code is not active yet (preview). Meanwhile call or text us at (405) 338-4124.'));throw e;}
  if(r&&r.connectedAgent){data=Object.assign(data||{},{connectedAgent:r.connectedAgent});}
  try{const bp=(S.data.buyerProfiles||[]).find(b=>b&&S.user&&b.userId===S.user.id);if(bp)bp.assignedAutomatically=false;}catch(e){}
  if(!DEMO)await load(true);
  return r&&r.connectedAgent;
}
// One delegated handler for every code form (the prompt sheet and the inline one in "Mi agente").
document.addEventListener('submit',e=>{const f=e.target;if(!(f&&f.classList&&f.classList.contains('tour-codef')))return;e.preventDefault();e.stopPropagation();
  const err=f.querySelector('[data-codeerr]'),inp=f.querySelector('[name=code]'),bg=f.closest('.tour-ask-bg');err.hidden=true;
  act(async()=>{let a;try{a=await linkAgent(inp.value);}catch(er){err.hidden=false;err.textContent=er.message||String(er);inp.focus();return;}
    if(bg)bg.remove();rerender();
    alert(bg?L(`¡Listo! Ya estás conectado con ${a&&a.name||'tu agente'}. Ahora toca “Enviar a mi agente” para pedir la cita.`,`Done! You are now connected with ${a&&a.name||'your agent'}. Now tap “Send to my agent” to request the showing.`)
      :L(`¡Listo! Ya estás conectado con ${a&&a.name||'tu agente'}.`,`Done! You are now connected with ${a&&a.name||'your agent'}.`));
    if(bg)setTimeout(()=>{const b=document.querySelector('#tourReqF button[type=submit]');if(b)b.scrollIntoView({behavior:'smooth',block:'center'});},150);});},true);
function codeSheet(){
  const m=sheet(`<h3>🤝 ${L('Primero conecta con tu agente','First, connect with your agent')}</h3>
   <p>${L('Para pedir una cita necesitas un agente con licencia que te acompañe. Escribe el código de invitación que te dio tu agente (empieza con D2D-).','To request a showing you need a licensed agent to go with you. Type the invite code your agent gave you (it starts with D2D-).')}</p>${codeFormHtml('tourCodeSheetF')}`);
  setTimeout(()=>{const i=m.querySelector('[name=code]');if(i)i.focus();},60);
  return m;
}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-tcodehelp],[data-tcodeask]');if(!t)return;e.preventDefault();e.stopPropagation();
  if(t.dataset.tcodeask)return codeSheet();
  document.querySelectorAll('.tour-ask-bg').forEach(x=>x.remove());if(UI()&&UI().openContact)UI().openContact(null,codeMsg());},true);
document.addEventListener('input',e=>{const i=e.target;if(i&&i.name==='code'&&i.closest&&i.closest('.tour-codef')){const p=i.selectionStart===i.value.length;i.value=i.value.toUpperCase();if(p)i.selectionStart=i.selectionEnd=i.value.length;}});
function addToCart(id){const c=cart();if(c.includes(id))return true;const cap=maxCart();if(c.length>=cap){alert(cap===MAX?limitText():L(`Máximo ${cap} casas por solicitud. Envía estas primero a tu agente.`,`Up to ${cap} homes per request. Send these to your agent first.`));return false;}c.push(id);setCart(c);return true;}
function removeFromCart(id){setCart(cart().filter(x=>x!==id));}

/* ---------- API (with a local demo when ?demo=tours) ---------- */
let demo=null;
function demoData(){if(demo)return demo;const ls=(S.data&&S.data.listings||[]).filter(l=>!['SOLD','CLOSED'].includes(String(l.status||'').toUpperCase())).slice(0,4);const h=l=>({id:l.id,address:l.address,city:l.city,state:'OK',status:l.status,photo:(l.photoUrls&&l.photoUrls[0])||l.photoUrl||null,lat:l.latitude||null,lng:l.longitude||null});
  const t0=new Date(Date.now()+864e5);t0.setMinutes(0,0,0);const t1=new Date(Date.now()-45*60e3);
  const agent={id:'demo-agent',name:'Agente de Prueba',email:'fer.okc94+legacytest-agent@gmail.com',phone:'(405) 338-4124',brokerage:'KLC Real Estate, LLC',licenseNumber:'000000',licenseState:'OK',avatarUrl:null,bio:L('Agente de prueba. Hablo español e inglés; conozco bien el sur de OKC.','Test agent. I speak Spanish and English and know South OKC well.')};
  const role=isAgent()?'AGENT':S.isAdmin()?'ADMIN':'CLIENT';
  const mk=(id,st,at,homes)=>({id,role,status:st,startsAt:at.toISOString(),endsAt:new Date(at.getTime()+homes.length*30*60e3).toISOString(),homes,routeKm:7.4,client:role==='CLIENT'?{id:S.user.id}:{id:'demo-client',name:'Cliente de Prueba',phone:'(405) 338-4124',email:'fer.okc94+legacytest-client@gmail.com'},agent:st==='REQUESTED'?null:agent,feedbackDue:at.getTime()<Date.now(),feedback:[],offers:[],calendar:{google:'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Demo',icsTitle:'Demo showing',icsDetails:homes.map((x,i)=>`${i+1}. ${x.address}`).join('\n')}});
  const tours=ls.length?[mk('demo-1','ACCEPTED',t0,ls.slice(0,3).map(h)),mk('demo-2','ACCEPTED',t1,ls.slice(1,3).map(h))]:[];
  if(role==='AGENT'&&ls.length){const dt=mk('demo-direct','REQUESTED',new Date(t0.getTime()+3*3600e3),ls.slice(0,4).map(h));dt.direct=true;dt.feedbackDue=false;tours.unshift(dt);}
  demo={ok:true,mode:'demo',maxPerRequest:MAX,offerHours:12,canRequest:role!=='AGENT',canAccept:role!=='CLIENT',tours,open:ls.length?[{id:'demo-open',startsAt:t0.toISOString(),count:2,homes:ls.slice(2,4).map(h)}]:[],sellerFeedback:[]};return demo;}
async function call(action,body){
  if(DEMO){const d=demoData();
    if(action==='tour_list')return d;
    if(action==='tour_request'){const conn=connectedAgent();if(!conn&&(body.listingIds||[]).length>MAX)throw new Error(limitText());const homes=(body.listingIds||[]).map(id=>{const l=S.listing(id)||{};return {id,address:l.address,city:l.city,status:l.status};});d.tours.unshift({...d.tours[0]||{},id:'demo-'+Date.now(),status:'REQUESTED',direct:!!conn,startsAt:new Date(body.startsAt).toISOString(),homes,agent:conn||null,feedbackDue:false,feedback:[],offers:[],role:'CLIENT'});return {ok:true};}
    if(action==='tour_link_agent'){const c=String(body.code||'').trim().toUpperCase();if(!/^D2D-[A-Z0-9]{6}$/.test(c)){const er=new Error(L('Escribe el código completo de tu agente (D2D-XXXXXX).','Type your agent’s full code (D2D-XXXXXX).'));er.code='bad_agent_code';throw er;}d.connectedAgent={id:'demo-agent',name:L('Agente de prueba','Test agent'),brokerage:'KLC Real Estate, LLC',licenseNumber:'000000',phone:''};return {ok:true,connectedAgent:d.connectedAgent};}
    if(action==='tour_remove_agent'){const reason=String(body.reason||'').trim();if(!reason){const er=new Error(L('Escribe el motivo para quitar a tu agente.','Write a reason to remove your agent.'));er.code='reason_required';throw er;}d.connectedAgent=null;return {ok:true,connectedAgent:null};}
    if(action==='tour_admin_removals'){return {ok:true,removals:d.removals||[]};}
    if(action==='tour_decline'){const t=d.tours.find(x=>x.id===body.tourId);if(t){t.status='DECLINED';t.declineReason=body.reason||'';}return {ok:true};}
    if(action==='tour_accept'){const rq=d.tours.find(x=>x.id===body.tourId&&x.direct&&x.status==='REQUESTED');const base=rq&&d.tours.find(x=>x!==rq&&x.status==='ACCEPTED'&&dayOf(x.startsAt)===dayOf(rq.startsAt));
      if(base){const seen=new Set(base.homes.map(h=>h.id));rq.homes.forEach(h=>{if(!seen.has(h.id))base.homes.push(h);});d.tours=d.tours.filter(x=>x!==rq);return {ok:true,merged:true,mergedInto:base.id};}
      const o=d.open.find(x=>x.id===body.tourId);if(o){d.open=d.open.filter(x=>x!==o);d.tours.unshift({...d.tours[0],id:o.id,status:'ACCEPTED',startsAt:o.startsAt,homes:o.homes,feedbackDue:false});}else{const t=d.tours.find(x=>x.id===body.tourId);if(t)t.status='ACCEPTED';}return {ok:true};}
    if(action==='tour_route_save'){const t=d.tours.find(x=>x.id===body.tourId);if(t&&body.order)t.homes=body.order.map(id=>t.homes.find(h=>h.id===id));return {ok:true};}
    if(action==='tour_feedback'){const t=d.tours.find(x=>x.id===body.tourId);if(t)t.feedback.push({listingId:body.listingId,authorRole:t.role,rating:body.rating,comments:body.comments});return {ok:true};}
    if(action==='tour_cancel'){const t=d.tours.find(x=>x.id===body.tourId);if(!body.reasonCode)throw new Error(L('Elige la razón de la cancelación.','Choose the reason for cancelling.'));if(body.reasonCode==='OTHER'&&String(body.reasonText||'').trim().length<3)throw new Error(L('Escribe la razón de la cancelación.','Write the reason for cancelling.'));const r=CANCEL_REASONS.find(x=>x[0]===body.reasonCode);if(t){t.status='CANCELLED';t.cancelReason={code:body.reasonCode,text:body.reasonText||'',labelEs:r[1],labelEn:r[2]};}return {ok:true};}
    return {ok:true};}
  return S.api(action,body||{});
}
async function load(force){
  if(!S.user||loading)return;if(!force&&data&&Date.now()-loadedAt<20000)return;
  loading=true;try{data=await call('tour_list');lastErr='';(data.tours||[]).forEach(t=>{const p=t.role==='CLIENT'?t.agent:t.client;if(p&&p.id&&p.name){S.tourPeerNames=S.tourPeerNames||{};S.tourPeerNames[p.id]=p.name;}});}
  catch(e){lastErr=e.message||String(e);}finally{loading=false;loadedAt=Date.now();}
  const ae0=document.activeElement,typing=!!(ae0&&/INPUT|SELECT|TEXTAREA/.test(ae0.tagName)&&ae0.type!=='file');
  if(UI()&&(['tours','myagent','agenthome'].includes(UI().tab())||(UI().tab()==='dashboard'&&isClient())||(UI().tab()==='dashboard'&&(isAgent()||S.isAdmin())&&!typing)))rerender(); // v54: agent/Admin "Mis Ofertas" shows the deal
  else if(UI()&&UI().tab()==='admin'){const sig=JSON.stringify(((data&&data.sellerOffers)||[]).map(o=>[o.offerId,o.decision,o.counter&&o.counter.status,o.invalidatedAt,(o.checklist||[]).map(c=>c.status).join('')]));const ae=document.activeElement;if(sig!==adminSig&&!(ae&&/INPUT|SELECT|TEXTAREA/.test(ae.tagName))){adminSig=sig;rerender();}else adminSig=sig;}
}
let adminSig='';

/* ---------- small helpers ---------- */
const when=iso=>{try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago',weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(iso));}catch(e){return iso;}};
const chicagoDay=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const statusPill=s=>{const m={REQUESTED:[L('Esperando agente','Waiting for an agent'),'#d97706'],ACCEPTED:[L('Confirmada','Confirmed'),'#16a34a'],COMPLETED:[L('Terminada','Done'),'#475569'],CANCELLED:[L('Cancelada','Cancelled'),'#dc2626'],EXPIRED:[L('Nadie la aceptó','Not accepted'),'#64748b'],DECLINED:[L('Rechazada por el agente','Declined by the agent'),'#dc2626']}[s]||[s,'#64748b'];return `<span class="tour-pill" style="background:${m[1]}">${esc(m[0])}</span>`;};
const homeLine=h=>`${esc(h.address||'')}${h.city?', '+esc(h.city):''}`;
function mapsBtn(h){
  if(!window.LegacyMaps||!h)return '';
  const u=S.user;
  const investor=!!(u&&u.role==='INVESTOR'&&!(S.isAdmin&&S.isAdmin()));
  const pending=!!(u&&(u.approvalStatus==='PENDING'||u.approvalStatus==='REJECTED'));
  return LegacyMaps.buttonHtml(h,{show:LegacyMaps.addressVisible(u,investor,pending),es:S.lang==='es',compact:true});
}
function shownHome(h){return homeLine(h)+mapsBtn(h);}
/* v39 (7:09 PM): collapsible cards. Collapsed = one line (short address, status chip, next step / deadline); tap to open. Open state is kept for this session. */
const FOLD=(()=>{try{return JSON.parse(sessionStorage.getItem('lof_fold')||'{}')||{};}catch(e){return {};}})();
function fold(key,sum,body,o={}){const open=o.force||(key in FOLD?FOLD[key]:!!o.open);return `<details class="lf-fold${o.cls?' '+o.cls:''}" data-fold="${esc(key)}"${o.id?` id="${esc(o.id)}"`:''}${open?' open':''}><summary class="lf-sum">${sum}<span class="lf-chev" aria-hidden="true">⌄</span></summary><div class="lf-body">${body}</div></details>`;}
document.addEventListener('toggle',e=>{const d=e.target;if(!d||!d.dataset||!d.dataset.fold)return;FOLD[d.dataset.fold]=d.open;try{sessionStorage.setItem('lof_fold',JSON.stringify(FOLD));}catch(_){}},true);
window.LFold=fold;
const hashHas=id=>!!id&&decodeURIComponent(location.hash||'').includes(id);
const shortAddr=h=>esc(String((h&&h.address)||'').split(',')[0]);
const TOT=p=>(p&&p.stepsTotal)||7,DOTS=p=>Array.from({length:TOT(p)},(_,i)=>i+1),DONE_WORD=p=>TOT(p)===6?L('Listo','Done'):L('Cerrada','Closed'); // v39 (9:08 PM): clients see 6 steps (no 'Get paid')
const chip=(txt,tone)=>`<span class="lf-chip ${tone||''}">${txt}</span>`;
function offerChip(p,o){
  if(p&&p.invalidatedAt||o&&o.invalidatedAt)return chip('❌ '+L('Anulada','Voided'),'bad');
  if(!p)return chip(L('Enviada','Sent'),'info');
  if(p.dealClosedAt||p.tableStatus==='CLOSED'||(p.checklist||[]).every(c=>DONE_STRICT.includes(c.status)))return chip('🎉 '+DONE_WORD(p),'ok'); // v39 (9:24 PM): completeAt (option fee approved) is not 'closed'
  if(p.counter&&p.counter.status==='OPEN'&&!p.decision)return chip('↩️ '+L('Contraoferta','Counter'),'warn');
  if(!p.decision)return chip('🆕 '+L('Por pre-aprobar','To pre-approve'),'warn');
  const ns=nextStepOf(p);return chip(ns?`${L('Paso','Step')} ${ns.n}/${TOT(p)}`:'✅ '+DONE_WORD(p),p.underContract?'ok':'info');
}
function offerNext(p){if(!p)return '';if(p.dealClosedAt||p.tableStatus==='CLOSED')return L('Trato cerrado','Deal closed');if(p.invalidatedAt)return p.voidHideAt?L('Se elimina sola ','Auto-removed ')+esc(when(p.voidHideAt)):'';if(!p.decision)return p.counter&&p.counter.status==='OPEN'?L('Esperando respuesta a la contraoferta','Waiting for the counter answer'):L('Esperando al dueño','Waiting for the owner');const ns=nextStepOf(p);return ns?esc(ns.label)+' — '+esc(L(ns.st[0],ns.st[1])):'';}
function offerDue(p){if(!p||p.invalidatedAt)return '';const c=[];if(p.decision==='PRE_APPROVED'&&!p.docsUploadedAt&&p.docsDueAt)c.push(p.docsDueAt);if(p.decision==='PRE_APPROVED'&&!p.depositProofAt&&p.depositDueAt)c.push(p.depositDueAt);if(p.fundsDueAt&&!p.fundsReceiptAt)c.push(p.fundsDueAt);return c.sort()[0]||'';}
function tourNext(t){
  if(t.proposal)return '🔁 '+L('Cambio de hora pendiente','Time change pending');
  if(t.status==='REQUESTED')return t.role==='AGENT'&&t.direct?'📨 '+L('Aprobar o rechazar','Approve or decline'):'⏳ '+L('Esperando al agente','Waiting for the agent');
  const live=(t.offers||[]).find(o=>!o.invalidatedAt&&o.pipeline&&!o.pipeline.invalidatedAt);
  if(live){const n=offerNext(live.pipeline);return '💰 '+(n||L('Oferta en curso','Offer in progress'));}
  if((t.offers||[]).some(o=>o.invalidatedAt||(o.pipeline&&o.pipeline.invalidatedAt)))return '❌ '+L('Oferta anulada: Reanudar o Eliminar','Voided offer: Resume or Delete');
  if(t.feedbackDue&&t.role!=='ADMIN'){const miss=t.homes.filter(h=>!h.missing&&!(t.feedback||[]).some(f=>f.listingId===h.id)&&!(t.offers||[]).some(o=>o.listingId===h.id));if(miss.length)return t.role==='AGENT'?'📝 '+L('Comentarios u oferta pendientes','Feedback or offer pending'):'⭐ '+L('Danos tus comentarios','Give your feedback');}
  if(t.status==='ACCEPTED'&&Date.now()<new Date(t.startsAt).getTime())return '✅ '+L('Confirmada','Confirmed')+(t.agent&&t.role==='CLIENT'?' · '+esc(t.agent.name||''):'')+(t.client&&t.role==='AGENT'?' · '+esc(t.client.name||''):'');
  return '';
}
function mapsLink(homes){const pts=homes.filter(Boolean).map(h=>h.lat&&h.lng?`${h.lat},${h.lng}`:`${h.address||''}, ${h.city||''}, OK`);if(!pts.length)return '';const dest=pts[pts.length-1],way=pts.slice(0,-1);return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination='+encodeURIComponent(dest)+(way.length?'&waypoints='+encodeURIComponent(way.join('|')):'');}
function icsFor(t){const f=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const loc=t.homes[0]?`${t.homes[0].address||''}, ${t.homes[0].city||''}, OK`:'Oklahoma';
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Legacy Owner Finance//Showings//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+t.id+'@legacyownerfinance.net','DTSTAMP:'+f(Date.now()),'DTSTART:'+f(t.startsAt),'DTEND:'+f(t.endsAt||t.startsAt),'SUMMARY:'+String(t.calendar&&t.calendar.icsTitle||'Showing').replace(/[,;]/g,' '),'LOCATION:'+loc.replace(/[,;]/g,' '),'DESCRIPTION:'+String((t.calendar&&t.calendar.icsDetails)||'').replace(/\n/g,'\\n').replace(/[,;]/g,' ')+'\\nhttps://legacyownerfinance.net/#tours','BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY','DESCRIPTION:Showing in 30 minutes','END:VALARM','END:VEVENT','END:VCALENDAR'];
  const b=new Blob([lines.join('\r\n')],{type:'text/calendar'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='cita-legacy-'+t.id+'.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
function timeOptions(sel){let o='';for(let m=9*60;m<=19*60;m+=30){const hh=String(Math.floor(m/60)).padStart(2,'0'),mm=String(m%60).padStart(2,'0');const d=new Date(2000,0,1,+hh,+mm);const lab=d.toLocaleTimeString(S.lang==='es'?'es-US':'en-US',{hour:'numeric',minute:'2-digit'});o+=`<option value="${hh}:${mm}"${sel===hh+':'+mm?' selected':''}>${esc(lab)}</option>`;}return o;}

/* ---------- views ---------- */
function cartSection(){
  const c=cart().map(id=>S.listing(id)).filter(Boolean);const today=chicagoDay(new Date());const conn=connectedAgent();const cap=maxCart();
  const items=c.map(l=>`<li class="tour-cart-item"><img src="${esc((l.photoUrls&&l.photoUrls[0])||l.photoUrl||'listing-placeholder.svg')}" alt=""><span><b>${esc(l.address)}</b> ${mapsBtn(l)}<br><small>${esc(l.city||'')}</small></span><button type="button" class="btn-card" data-tcartdel="${esc(l.id)}" aria-label="${esc(L('Quitar','Remove'))}">✕</button></li>`).join('');
  const intro=conn?L(`Tus solicitudes van directo a tu agente, <b>${esc(conn.name)}</b>, quien las aprueba o rechaza según su agenda y el acceso a las casas. Puedes agregar todas las casas que quieras.`,`Your requests go straight to your agent, <b>${esc(conn.name)}</b>, who approves or declines them based on their schedule and access to the homes. Add as many homes as you like.`)
    :L(`Agrega las casas que te gustan (hasta ${MAX} por cita) y pide una sola cita para verlas. Se notifica a los agentes con licencia en regla; el primero que acepte será tu agente. Si ya tienes un código, puedes conectarte en “Mi agente”.`,`Add the homes you like (up to ${MAX} per showing) and request one showing for all of them. Licensed agents in good standing are notified; the first to accept becomes your agent. If you already have a code, you can connect under “My agent”.`);
  const btn=conn?`📨 ${L(`Enviar a mi agente (${c.length} ${c.length===1?'casa':'casas'})`,`Send to my agent (${c.length} ${c.length===1?'home':'homes'})`)}`:`📅 ${L(`Solicitar cita para ${c.length} ${c.length===1?'casa':'casas'}`,`Request showing for ${c.length} ${c.length===1?'home':'homes'}`)}`;
  return `<section class="card tour-card" id="tour-cart"><h2>🛒 ${L('Mi carrito de casas','My home cart')} <small>(${c.length}${conn?'':'/'+cap})</small></h2>
   <p class="ops-meta">${intro}</p>
   ${c.length?`<ul class="tour-cart">${items}</ul>`:`<p>${L('Tu carrito está vacío. Abre una casa y toca “🛒 Agregar al carrito”.','Your cart is empty. Open a home and tap “🛒 Add to cart”.')}</p><button type="button" class="btn-card primary" data-tab="inventory">🏠 ${L('Ver casas','See homes')}</button>`}
   ${!conn&&c.length>=MAX?`<p class="tour-warn">ℹ️ ${esc(limitText())}</p>`:''}
   ${c.length&&data&&data.canRequest!==false?`<form id="tourReqF" class="tour-form"><label>${L('Fecha','Date')}<input type="date" name="date" min="${today}" value="${esc(form.date)}" required></label><label>${L('Hora','Time')}<select name="time">${timeOptions(form.time)}</select></label><label class="tour-notes">${L('Notas (opcional)','Notes (optional)')}<textarea name="notes" rows="2" maxlength="1000">${esc(form.notes)}</textarea></label>
   <button type="submit" class="btn-card primary"${busy?' disabled':''}>${btn}</button></form>`:''}
   ${c.length&&data&&data.canRequest===false?`<p class="tour-warn">${L('Las citas con carrito están en prueba. Por ahora llama o escribe al (405) 338-4124.','Cart showings are in testing. For now call or text (405) 338-4124.')}</p>`:''}</section>`;
}
function personCard(p,isAgentCard,extra){if(!p)return '';
  const tel=String(p.phone||'').replace(/[^\d+]/g,'');
  return `<div class="tour-person">${isAgentCard?`<img class="tour-avatar" src="${esc(p.avatarUrl||'legacy-logo.png')}" alt="">`:''}<div><b>${esc(p.name||'')}</b>
   ${isAgentCard?`<div class="ops-meta">${esc(p.brokerage||'')}${p.licenseNumber?` · ${L('Licencia','License')} ${esc(p.licenseState||'OK')} #${esc(p.licenseNumber)}`:''}</div>`:''}
   <div class="ops-meta">${p.phone?`📞 ${esc(fmtPhone(p.phone))}`:''}${p.email?` · ✉️ ${esc(p.email)}`:''}</div>
   ${isAgentCard&&p.bio?`<p class="tour-bio">${esc(p.bio)}</p>`:''}
   <div class="tour-btns">${tel?`<a class="btn-card primary" href="tel:${esc(tel)}">📞 ${L('Llamar','Call')}</a><a class="btn-card" href="sms:${esc(tel)}">💬 ${L('Escribir SMS','Text (SMS)')}</a>`:''}${p.id?`<button type="button" class="btn-card" data-tchat="${esc(p.id)}" data-tname="${esc(p.name||'')}">✉️ ${L('Escribir en la app','Message in app')}</button>`:''}</div>${extra||''}</div></div>`;}
function feedbackForm(t,h){const k=t.id+'|'+h.id;return `<form class="tour-fb" data-tfbform="${esc(k)}"><label>${L('Calificación','Rating')}<select name="rating"><option value="">—</option>${[5,4,3,2,1].map(n=>`<option value="${n}">${'★'.repeat(n)}</option>`).join('')}</select></label><label>${L('Interés','Interest')}<select name="interest"><option value="">—</option><option value="VERY_INTERESTED">${L('Mucho','Very')}</option><option value="INTERESTED">${L('Sí','Yes')}</option><option value="SOMEWHAT">${L('Algo','Somewhat')}</option><option value="NOT_INTERESTED">${L('No','No')}</option></select></label><label class="tour-notes">${L('Comentarios','Comments')}<textarea name="comments" rows="2" maxlength="2000"></textarea></label><button class="btn-card primary">${L('Enviar comentarios','Send feedback')}</button></form>`;}
function homeRow(t,h,i,n){
  const editable=['REQUESTED','ACCEPTED'].includes(t.status)&&t.role!=='ADMIN';
  const myFb=(t.feedback||[]).find(f=>f.listingId===h.id&&(t.role==='ADMIN'||f.authorRole===t.role));
  // Several offers on one home (an archived/voided one, then a new one): show the live, newest one.
  const offer=(t.offers||[]).filter(o=>o.listingId===h.id).map(o=>({o,k:(o.pipeline&&o.pipeline.archivedAt?0:2)+(o.invalidatedAt||(o.pipeline&&o.pipeline.invalidatedAt)?0:1),at:String((o.pipeline&&o.pipeline.offerAt)||o.dueAt||'')})).sort((x,y)=>(y.k-x.k)||y.at.localeCompare(x.at)).map(x=>x.o)[0];
  let after='';
  if(offer&&t.role!=='ADMIN')after=offerCard(t,h,offer);
  else if(t.feedbackDue&&t.role!=='ADMIN'){
    if(offer){const due=new Date(offer.dueAt),left=due.getTime()-Date.now();
      after=`<div class="tour-offer">${offer.invalidatedAt?`❌ ${L('Oferta invalidada: no se subieron documentos en 12 horas.','Offer invalidated: no documents within 12 hours.')}`:offer.docsUploadedAt?`✅ ${L('Documentos recibidos.','Documents received.')}`:`⏰ ${L(`Oferta hecha. Hay hasta el ${when(offer.dueAt)} (${Math.max(0,Math.floor(left/3600e3))} h ${Math.max(0,Math.floor(left%3600e3/60e3))} min) para subir la documentación requerida o la oferta se invalida.`,`Offer made. Upload the required documents before ${when(offer.dueAt)} (${Math.max(0,Math.floor(left/3600e3))} h ${Math.max(0,Math.floor(left%3600e3/60e3))} min left) or the offer is invalidated.`)}`}
       ${offer.invalidatedAt?'':docSlotsBox(offer.pipeline,t.role)}</div>`;}
    else if(myFb)after=`<div class="tour-done">✅ ${L('Comentarios enviados','Feedback sent')}${myFb.rating?' · '+'★'.repeat(myFb.rating):''}</div>`;
    else if(t.role==='CLIENT')after=fbOpen[t.id+'|'+h.id]?feedbackForm(t,h):`<button type="button" class="btn-card primary" data-tfbopen="${esc(t.id+'|'+h.id)}">⭐ ${L('Dar mis comentarios','Give feedback')}</button>`;
    else if(t.role==='AGENT')after=fbOpen[t.id+'|'+h.id]?feedbackForm(t,h):`<div class="tour-btns"><button type="button" class="btn-card" data-tfbopen="${esc(t.id+'|'+h.id)}">📝 ${L('Dejar comentarios','Leave feedback')}</button><span class="ops-meta">${L('o','or')}</span><button type="button" class="btn-card primary" data-offerpop="${esc(h.id)}" data-tofferfor="${esc(t.id)}">💰 ${L('Hacer una oferta','Make an offer')}</button></div><p class="ops-meta">${L('Elige una: comentarios u oferta. Si haces oferta tendrás 12 horas para subir la documentación.','Pick one: feedback or an offer. If you make an offer you will have 12 hours to upload the documents.')}</p>`;
  }
  if(t.role==='ADMIN'){const fbs=(t.feedback||[]).filter(f=>f.listingId===h.id);after=fbs.map(f=>`<div class="tour-done">${f.authorRole==='CLIENT'?'👤':'🧑‍💼'} ${f.rating?'★'.repeat(f.rating)+' ':''}${esc(f.comments||'')}${f.sellerFlag?` <span class="tour-warn">⚠️ ${L('Esta casa no tiene compañía/vendedor ligado; solo te llegó a ti.','No company/seller linked to this home; it only went to you.')}</span>`:''}</div>`).join('')+(offer?offerCard(t,h,offer):'');}
  // Access: the code shows only to the accepted agent (and Admin). No code yet => "Preguntar" (call or text the Beside line).
  const access=(t.role==='AGENT'||t.role==='ADMIN')&&t.status==='ACCEPTED'?(h.accessCode?`<div class="tour-code">🔑 ${L('Código de acceso','Access code')}: <b>${esc(h.accessCode)}</b></div>`:`<div class="tour-code"><button type="button" class="btn-card" data-task="${esc(t.id+'|'+h.id)}">❓ ${L('Preguntar','Ask')}</button></div>`):'';
  return `<li class="tour-stop"><span class="tour-n">${i+1}</span><span class="tour-stop-main"><a href="#" data-open="${esc(h.id)}">${homeLine(h)}</a>${mapsBtn(h)}${access}${after}</span>${editable&&n>1?`<span class="tour-move"><button type="button" class="btn-card" data-tmove="${esc(t.id)}" data-tidx="${i}" data-tdir="-1" ${i===0?'disabled':''} aria-label="${esc(L('Subir','Move up'))}">↑</button><button type="button" class="btn-card" data-tmove="${esc(t.id)}" data-tidx="${i}" data-tdir="1" ${i===n-1?'disabled':''} aria-label="${esc(L('Bajar','Move down'))}">↓</button></span>`:''}</li>`;
}
function tourCard(t){
  const live=['REQUESTED','ACCEPTED'].includes(t.status);
  const wait=t.status==='REQUESTED'?(t.direct?`<p class="ops-meta">⏳ ${L('Enviada a tu agente. Te llegará una notificación cuando la apruebe o la rechace.','Sent to your agent. You will get a notification when they approve or decline it.')}</p>`:`<p class="ops-meta">⏳ ${L('Les avisamos a los agentes con licencia. Te llegará una notificación cuando uno acepte tu cita.','We notified licensed agents. You will get a notification when one accepts your showing.')}</p>`):'';
  const declined=t.status==='DECLINED'?`<p class="tour-warn">${L('Tu agente no puede en ese horario.','Your agent can’t make that time.')}${t.declineReason?' '+esc(t.declineReason):''} ${L('Puedes pedir otra fecha u hora.','You can request another date or time.')}</p>`:'';
  const cr=t.status==='CANCELLED'&&t.cancelReason?`<p class="ops-meta">❌ ${L('Razón de la cancelación','Cancellation reason')}: <b>${esc(L(t.cancelReason.labelEs,t.cancelReason.labelEn))}</b>${t.cancelReason.auto?' · '+L('cancelada automáticamente','cancelled automatically'):''}${t.cancelReason.text?' — '+esc(t.cancelReason.text):''}</p>`:'';
  const merged=t.mergedInto?`<p class="ops-meta">➕ ${L('Estas casas se agregaron a la ruta del mismo día.','These homes were added to the same-day route.')}</p>`:'';
  const changeable=(t.status==='ACCEPTED'||(t.status==='REQUESTED'&&t.direct))&&!!t.agent&&Date.now()<new Date(t.startsAt).getTime();
  // v39 (2:39 PM): only the client changes the date/time; the agent approves or declines the request.
  const prop=t.proposal?(t.role==='AGENT'||t.role==='ADMIN'?`<div class="tour-prop"><p>📅 <b>${L('Cambio de cita solicitado','Showing change requested')}</b> ${L('por el cliente','by the client')}: <b>${esc(when(t.proposal.startsAt))}</b><br><small>${L('Ahora','Now')}: ${esc(when(t.proposal.from||t.startsAt))}</small>${t.proposal.note?'<br>'+esc(t.proposal.note):''}</p>${t.role==='AGENT'?`<div class="tour-btns"><button type="button" class="btn-card primary" data-tpans="${esc(t.id)}" data-tpid="${esc(t.proposal.pid||'')}" data-tpv="1">✅ ${L('Aprobar cambio','Approve change')}</button><button type="button" class="btn-card" data-tpans="${esc(t.id)}" data-tpid="${esc(t.proposal.pid||'')}" data-tpv="0">✕ ${L('Rechazar (mantener la hora original)','Decline (keep the original time)')}</button></div>`:''}</div>`
    :`<div class="tour-prop"><p>⏳ <b>${L('Pendiente de aprobación del agente','Waiting for your agent’s approval')}</b><br>${L('Cambio de cita solicitado','Showing change requested')}: <b>${esc(when(t.proposal.startsAt))}</b><br><small>${L('Hasta que tu agente lo apruebe, la cita sigue el','Until your agent approves it, the showing stays on')} ${esc(when(t.startsAt).replace(/\.$/,''))}.</small></p></div>`):'';
  const propBtn=t.proposal||!changeable?'':t.role==='CLIENT'?`<div class="tour-btns"><button type="button" class="btn-card" data-tprop="${esc(t.id)}">🕒 ${L('Cambiar fecha y hora','Change date and time')}</button><span class="ops-meta">${L('Tu agente tiene que aprobar el cambio.','Your agent has to approve the change.')}</span></div>`
    :'';
  const agentHint=t.role==='AGENT'&&changeable&&!t.proposal?`<p class="ops-meta tour-askw">🕒 ${L('Para cambiar la cita, comunícate con el cliente; solo el cliente puede cambiar la hora.','To change the showing, contact the client; only the client can change the time.')}</p>`:'';
  const more=t.role==='CLIENT'&&t.status==='ACCEPTED'&&Date.now()<new Date(t.startsAt).getTime()?`<div class="tour-btns"><button type="button" class="btn-card" data-tmore="${esc(t.id)}">➕ ${L('¿Más casas ese mismo día? Enviar al agente','More homes that same day? Send to the agent')}</button><span class="ops-meta">${L('Si tu agente las aprueba, se agregan a esta misma ruta.','If your agent approves them, they are added to this same route.')}</span></div>`:'';
  const decide=t.role==='AGENT'&&t.status==='REQUESTED'&&t.direct?`<div class="tour-btns"><button type="button" class="btn-card primary" data-taccept="${esc(t.id)}">✅ ${L('Aprobar','Approve')}</button><button type="button" class="btn-card btn-del" data-tdecline="${esc(t.id)}">✕ ${L('Rechazar','Decline')}</button><span class="ops-meta">${L('Según tu agenda, el código de acceso y si la casa está disponible.','Based on your schedule, the access code and whether the home is available.')}</span></div>`:'';
  const sameDay=t.status==='REQUESTED'&&t.direct&&data&&data.tours.find(x=>x.id!==t.id&&x.status==='ACCEPTED'&&dayOf(x.startsAt)===dayOf(t.startsAt));
  const addNote=sameDay?`<p class="ops-meta">➕ ${t.role==='AGENT'?L(`Si apruebas, estas casas se agregan a la ruta que ya tienen ese día (${sameDay.homes.length} + ${t.homes.length}).`,`If you approve, these homes are added to your existing route that day (${sameDay.homes.length} + ${t.homes.length}).`):L(`Si tu agente aprueba, se agregan a tu ruta de ese día (${sameDay.homes.length} + ${t.homes.length}).`,`If your agent approves, they are added to your route that day (${sameDay.homes.length} + ${t.homes.length}).`)}</p>`:'';
  const other=(t.role==='CLIENT'?(t.agent?`<h3>${L('Tu agente','Your agent')}</h3>${personCard(t.agent,true)}`:'')+wait+declined+more
    :t.role==='AGENT'?`${t.direct&&t.status==='REQUESTED'?`<p class="tour-warn">📨 ${L('Tu cliente te mandó esta solicitud solo a ti.','Your client sent this request only to you.')}</p>`:''}<h3>${L('Tu cliente','Your client')}</h3>${personCard(t.client,false,agentHint)}${decide}`
    :`<p class="ops-meta">👤 ${esc(t.client&&t.client.name||'')} ${t.client&&t.client.email?'· '+esc(t.client.email):''} · 🧑‍💼 ${esc(t.agent?t.agent.name:L('sin agente','no agent'))}</p>`)+prop+propBtn+addNote+cr+merged;
  const ml=mapsLink(t.homes);
  const focus=location.hash.includes('tour='+t.id)||(t.offers||[]).some(o=>hashHas('offer='+o.offerId));
  const h0=t.homes[0]||{},nx=tourNext(t);
  const sum=`<span class="lf-ico" aria-hidden="true">📅</span><span class="lf-main"><b>${esc(shortDay(t.startsAt))} · ${esc(timeOf(t.startsAt))}</b><small>${shortAddr(h0)}${mapsBtn(h0)}${t.homes.length>1?` +${t.homes.length-1}`:''}${nx?' · '+nx:''}</small></span>${statusPill(t.status)}`;
  return fold('tour-'+t.id,sum,`<div class="tour-head"><h3>📅 ${esc(when(t.startsAt))}</h3>${statusPill(t.status)}</div>
   <p class="ops-meta">${t.homes.length} ${t.homes.length===1?L('casa','home'):L('casas','homes')}${t.routeKm?` · ${L('ruta aprox.','route approx.')} ${t.routeKm} km`:''}</p>
   ${other}
   <h3>🗺️ ${L('Ruta','Route')}</h3><ol class="tour-route">${t.homes.map((h,i)=>homeRow(t,h,i,t.homes.length)).join('')}</ol>
   <div class="tour-btns">${ml?`<a class="btn-card" href="${esc(ml)}" target="_blank" rel="noopener">🧭 ${L('Abrir ruta en Google Maps','Open route in Google Maps')}</a>`:''}${live&&t.role!=='ADMIN'&&t.homes.length>2?`<button type="button" class="btn-card" data-tauto="${esc(t.id)}">📍 ${L('Ordenar por distancia','Sort by distance')}</button>`:''}
   ${t.status==='ACCEPTED'?`<a class="btn-card" href="${esc(t.calendar.google)}" target="_blank" rel="noopener">📆 Google Calendar</a><button type="button" class="btn-card" data-tics="${esc(t.id)}">🍎 ${L('Apple / Outlook (.ics)','Apple / Outlook (.ics)')}</button>`:''}
   ${live&&t.role!=='AGENT'?`<button type="button" class="btn-card btn-del" data-tcancel="${esc(t.id)}">${L('Cancelar cita','Cancel showing')}</button>`:''}</div>`,{cls:'card tour-card'+(location.hash.includes('tour='+t.id)?' tour-focus':''),id:'tour-'+t.id,force:focus});
}
function openSection(){
  if(!data||!data.canAccept)return '';
  const o=data.open||[];const mineReq=(data.tours||[]).filter(t=>t.role==='AGENT'&&t.direct&&t.status==='REQUESTED').length;
  return `<section class="card tour-card"><h2>🔔 ${L('Clientes que quieren ver casas','Clients who want to see homes')}</h2><p class="ops-meta">${L('Clientes sin agente: el primer agente que acepte se queda con el cliente. El nombre del cliente se muestra cuando aceptas.','Clients without an agent: the first agent to accept gets the client. The client’s name shows after you accept.')}</p>${mineReq?`<p class="tour-warn">📨 ${L(`Tienes ${mineReq} ${mineReq===1?'solicitud':'solicitudes'} de tus clientes para aprobar o rechazar (abajo).`,`You have ${mineReq} request(s) from your clients to approve or decline (below).`)}</p>`:''}
   ${o.length?o.map(t=>`<div class="tour-open"><b>${L(`Un cliente quiere ver ${t.count} ${t.count===1?'propiedad':'propiedades'}`,`A client wants to see ${t.count} ${t.count===1?'property':'properties'}`)}</b><div class="ops-meta">📅 ${esc(when(t.startsAt))}</div><ul>${t.homes.map(h=>`<li>${shownHome(h)}</li>`).join('')}</ul><button type="button" class="btn-card primary" data-taccept="${esc(t.id)}">✅ ${L('Aceptar cita','Accept showing')}</button></div>`).join(''):`<p>${L('No hay solicitudes abiertas ahora.','No open requests right now.')}</p>`}</section>`;
}
function view(){
  if(!S.user)return `<section class="card tour-card"><p>${L('Inicia sesión para usar el carrito de citas.','Sign in to use the showing cart.')}</p></section>`;
  load(false);
  const head=`<div class="tour-wrap">${DEMO?`<p class="tour-warn">🧪 ${L('Modo demostración: nada se guarda ni se envía.','Demo mode: nothing is saved or sent.')}</p>`:''}`;
  if(!data&&!lastErr)return head+`<p style="padding:18px">${L('Cargando…','Loading…')}</p></div>`;
  if(data&&data.unavailable)return head+(isClient()?cartSection():'')+`<section class="card tour-card"><p>⏳ ${L('Las citas con carrito todavía no están activas. Mientras tanto puedes armar tu carrito; para agendar llama o escribe al (405) 338-4124 y pide que te llamemos lo antes posible.','Cart showings are not active yet. You can build your cart meanwhile; to book, call or text (405) 338-4124 and ask us to call you back as soon as possible.')}</p></section></div>`;
  if(lastErr&&!data)return head+`<p class="tour-warn" style="margin:18px">${esc(lastErr)}</p></div>`;
  const mine=(data.tours||[]);const live=mine.filter(t=>['REQUESTED','ACCEPTED'].includes(t.status)||t.feedbackDue&&!['CANCELLED','EXPIRED','DECLINED'].includes(t.status));const past=mine.filter(t=>!live.includes(t));
  const sf=(data.sellerFeedback||[]);
  return head+(isClient()?cartSection():'')+openSection()+sellerSection()+invitesSection()+famInvitesSection()+followedSection()+looseSection()+(S.isAdmin()?adminRemovalsSection():'')+
   `<section class="tour-list"><h2>${S.isAdmin()?L('Todas las citas con carrito','All cart showings'):L('Mis citas','My showings')}</h2>${live.map(tourCard).join('')||`<p class="ops-meta" style="padding:0 18px">${L('No tienes citas próximas.','No upcoming showings.')}</p>`}
   ${past.length?`<details class="card tour-card"><summary>${L('Citas anteriores','Past showings')} (${past.length})</summary>${past.map(tourCard).join('')}</details>`:''}</section>`+
   (sf.length?`<section class="card tour-card"><h2>💬 ${L('Comentarios de visitas a tus casas','Showing feedback on your homes')}</h2><ul>${sf.map(f=>`<li><b>${esc(f.address||'')}, ${esc(f.city||'')}</b> ${mapsBtn(f)} · ${f.authorRole==='CLIENT'?L('Cliente','Client'):L('Agente','Agent')} ${f.rating?'★'.repeat(f.rating):''} — ${esc(f.comments||'')}</li>`).join('')}</ul></section>`:'')+`</div>`;
}

const CANCEL_REASONS=[['FOUND_OTHER','Ya encontré otra casa','I already found another home'],['SCHEDULE','Cambio de horario / no puedo a esa hora','Schedule change / I can’t make that time'],['EMERGENCY','Emergencia personal o familiar','Personal or family emergency'],['NOT_INTERESTED','Ya no me interesa la propiedad','I’m no longer interested in the property'],['FINANCING','Problemas de financiamiento / presupuesto','Financing / budget issues'],['OTHER','Otra razón','Other reason']];
function dayOf(iso){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));}catch(e){return '';}}
function sheet(html){document.querySelectorAll('.tour-ask-bg').forEach(x=>x.remove());const m=document.createElement('div');m.className='tour-ask-bg';m.innerHTML=`<div class="tour-ask" role="dialog" aria-modal="true"><button type="button" class="nav-pill tour-ask-x" data-taskclose="1" aria-label="${esc(L('Cerrar','Close'))}">✕</button>${html}</div>`;
  m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-taskclose]'))m.remove();});document.addEventListener('keydown',function k(e){if(e.key==='Escape'){m.remove();document.removeEventListener('keydown',k);}});document.body.appendChild(m);return m;}
function openCancel(t){
  const a=t.agent;const tel=a&&a.phone?String(a.phone).replace(/[^\d+]/g,''):'';
  const step2=()=>{const m=sheet(`<h3>❌ ${L('Cancelar cita','Cancel showing')}</h3><p class="ops-meta">📅 ${esc(when(t.startsAt))} · ${t.homes.length} ${t.homes.length===1?L('casa','home'):L('casas','homes')}</p>
    <form class="tour-form" id="tourCancelF"><fieldset class="tour-reasons"><legend><b>${L('¿Por qué cancelas? (obligatorio)','Why are you cancelling? (required)')}</b></legend>
    ${CANCEL_REASONS.map(r=>`<label class="tour-reason"><input type="radio" name="code" value="${r[0]}" required> ${esc(L(r[1],r[2]))}</label>`).join('')}</fieldset>
    <label class="tour-other" hidden>${L('Escribe la razón','Write the reason')}<textarea name="text" rows="3" maxlength="500" placeholder="${esc(L('Cuéntanos por qué cancelas','Tell us why you are cancelling'))}"></textarea></label>
    <p class="ops-meta">${L('Tu agente y Legacy - Owner Finance recibirán la razón.','Your agent and Legacy - Owner Finance will receive the reason.')}</p>
    <div class="tour-btns"><button type="submit" class="btn-card btn-del">${L('Cancelar la cita','Cancel the showing')}</button><button type="button" class="btn-card" data-taskclose="1">${L('No, mantener la cita','No, keep the showing')}</button></div><p class="tour-warn" id="tourCancelErr" hidden></p></form>`);
    const f=m.querySelector('#tourCancelF'),other=m.querySelector('.tour-other'),ta=other.querySelector('textarea');
    f.addEventListener('change',()=>{const o=f.code.value==='OTHER';other.hidden=!o;ta.required=o;});
    f.addEventListener('submit',e=>{e.preventDefault();const code=f.code.value,text=ta.value.trim();const err=m.querySelector('#tourCancelErr');
      if(!code){err.hidden=false;err.textContent=L('Elige una razón.','Choose a reason.');return;}
      if(code==='OTHER'&&text.length<3){err.hidden=false;err.textContent=L('Escribe la razón de la cancelación.','Write the reason for cancelling.');ta.focus();return;}
      act(async()=>{await call('tour_cancel',{tourId:t.id,reasonCode:code,reasonText:code==='OTHER'?text:''});m.remove();await load(true);alert(L('Cita cancelada. Le avisamos a tu agente.','Showing cancelled. We let your agent know.'));});});};
  if(!a||t.role!=='CLIENT')return step2();
  const m=sheet(`<h3>❌ ${L('Cancelar cita','Cancel showing')}</h3><p>${L(`Antes de cancelar, ¿quieres hablar con ${esc(a.name||'tu agente')}? A veces se puede cambiar la hora o las casas.`,`Before cancelling, would you like to talk to ${esc(a.name||'your agent')}? Sometimes the time or the homes can be changed.`)}</p>
   <div class="tour-btns">${tel?`<a class="btn-card primary" href="tel:${esc(tel)}">📞 ${L('Llamar','Call')}</a>`:''}<button type="button" class="btn-card" data-tcchat="1">💬 ${L('Escribir','Message')}</button></div>
   <div class="tour-btns"><button type="button" class="btn-card btn-del" data-tcnext="1">${L('Continuar con la cancelación','Continue cancelling')}</button><button type="button" class="btn-card" data-taskclose="1">${L('No, mantener la cita','No, keep the showing')}</button></div>`);
  m.querySelector('[data-tcnext]').addEventListener('click',step2);
  m.querySelector('[data-tcchat]').addEventListener('click',()=>{m.remove();if(S.msgEnabled&&!S.msgEnabled()){alert(L('Los mensajes no están disponibles ahora.','Messages are not available right now.'));return;}UI().openChat(a.id,a.name);});
}
const BESIDE_TEL='+14053384124',BESIDE_TXT='(405) 338-4124';
function askText(t,h){
  const ap=(S.agentProfile&&S.agentProfile(S.user))||{};const name=(S.user&&S.user.name)||'';const brk=ap.brokerage||S.user&&S.user.brokerage||'';
  const addr=[h.address,h.city,[h.state||'OK',h.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const d=new Date(t.startsAt);const loc=S.lang==='es'?'es-US':'en-US';
  const day=new Intl.DateTimeFormat(loc,{timeZone:'America/Chicago',weekday:'long',month:'long',day:'numeric'}).format(d);
  const hr=new Intl.DateTimeFormat(loc,{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'}).format(d).replace(/\.$/,'');
  return L(`Hola, soy ${name}${brk?` de ${brk}`:''}. Confirmo la cita para ver ${addr} el ${day} a las ${hr}. ¿Me pueden dar acceso a la propiedad? Gracias.`,`Hi, this is ${name}${brk?` with ${brk}`:''}. I'm confirming the showing at ${addr} on ${day} at ${hr}. Could you please give me access to the property? Thank you.`);
}
function openAsk(t,h){
  const txt=askText(t,h);
  const m=sheet(`<h3>❓ ${L('Preguntar','Ask')}</h3><p class="ops-meta">${esc(homeLine(h).replace(/&amp;/g,'&'))} ${mapsBtn(h)}</p>
   <div class="tour-btns"><a class="btn-card primary" href="tel:${BESIDE_TEL}">📞 ${L('Llamar','Call')}</a><button type="button" class="btn-card" data-askw="1">💬 ${L('Escribir','Text')}</button></div>
   <div class="tour-askw" hidden><label>${L('Mensaje','Message')}<textarea rows="5" maxlength="600">${esc(txt)}</textarea></label><div class="tour-btns"><a class="btn-card primary" data-asksend="1" href="#">📤 ${L('Enviar mensaje','Send message')}</a></div></div>`);
  const w=m.querySelector('.tour-askw'),ta=w.querySelector('textarea'),send=w.querySelector('[data-asksend]');
  const sync=()=>{send.href=`sms:${BESIDE_TEL}?&body=${encodeURIComponent(ta.value)}`;};sync();ta.addEventListener('input',sync);
  m.querySelector('[data-askw]').addEventListener('click',()=>{w.hidden=false;ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);});
}
function contactBtns(p){if(!p)return '';const tel=p.phone?String(p.phone).replace(/[^\d+]/g,''):'';return `<div class="tour-btns">${tel?`<a class="btn-card primary" href="tel:${esc(tel)}">📞 ${L('Llamar','Call')}</a><a class="btn-card" href="sms:${esc(tel)}">💬 ${L('Escribir SMS','Text (SMS)')}</a>`:''}<button type="button" class="btn-card" data-tchat="${esc(p.id)}" data-tname="${esc(p.name||'')}">✉️ ${L('Escribir en la app','Message in app')}</button></div>`;}
function busySheet(msg){const a=connectedAgent()||{};const m=sheet(`<h3>📅 ${L('Horario ocupado','Time not available')}</h3><p>${esc(msg||L('Tu agente ya tiene una cita a esa hora. Comunícate con él para coordinar otro horario.','Your agent already has a showing at that time. Contact them to set up another time.'))}</p>${contactBtns(a.id?a:null)}`);m.addEventListener('click',e=>{if(e.target.closest('[data-tchat]'))m.remove();});}
function openPropose(t){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(t.startsAt));const g={};p.forEach(x=>g[x.type]=x.value);
  const m=sheet(`<h3>🕒 ${L('Cambiar fecha y hora','Change date and time')}</h3><p class="ops-meta">${L('Ahora','Now')}: ${esc(when(t.startsAt))}</p>
   <form class="tour-form" id="tourPropF"><label>${L('Fecha','Date')}<input type="date" name="date" min="${chicagoDay(new Date())}" value="${g.year}-${g.month}-${g.day}" required></label><label>${L('Hora','Time')}<select name="time">${timeOptions(`${g.hour}:${g.minute}`)}</select></label>
   <label>${L('Nota para tu agente (opcional)','Note for your agent (optional)')}<input name="note" maxlength="300"></label>
   <div class="tour-btns"><button type="submit" class="btn-card primary">📨 ${L('Pedir el cambio a mi agente','Ask my agent for the change')}</button></div><p class="ops-meta">${L('Tu agente recibe la solicitud y la aprueba o la rechaza. Hasta entonces la cita sigue en la hora actual.','Your agent gets the request and approves or declines it. Until then the showing keeps the current time.')}</p></form>`);
  m.querySelector('#tourPropF').addEventListener('submit',e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));act(async()=>{try{await call('tour_propose',{tourId:t.id,startsAt:`${v.date}T${v.time}`,note:v.note||''});}catch(er){if(er.code==='agent_busy'){m.remove();return busySheet(er.message);}throw er;}m.remove();await load(true);alert(L('Listo. Le enviamos la solicitud a tu agente. Queda pendiente de su aprobación.','Done. We sent the request to your agent. It is waiting for their approval.'));});});
}
function openResume(offerId){
  const o=((data&&data.tours)||[]).flatMap(t=>t.offers||[]).find(x=>x.offerId===offerId);const p=o&&o.pipeline;if(!p)return;
  const a=p.amount||{},dl=v=>v==null?'':String(Math.round(Number(v)/100));
  const m=sheet(`<h3>🔄 ${L('Reanudar oferta','Resume offer')}</h3><p class="ops-meta">${L('Revisa y edita la oferta antes de enviarla. Vuelve al dueño como nueva: tiene que pre-aprobarla otra vez y los plazos (12 h documentos, 72 h depósito) empiezan de cero.','Review and edit the offer before sending it. It goes back to the owner as new: they must pre-approve it again and the clocks (12 h documents, 72 h deposit) start over.')}</p>
   <form class="tour-form" id="tourResF"><label>${L('Precio de la oferta ($)','Offer price ($)')}<input type="number" name="offerPrice" min="1" step="1" required value="${esc(dl(a.price))}"></label>
   <label>${L('Enganche ($)','Down payment ($)')}<input type="number" name="downPayment" min="0" step="1" required value="${esc(dl(a.down))}"></label>
   <label>${L('Pago mensual ($)','Monthly payment ($)')}<input type="number" name="monthlyPayment" min="0" step="1" required value="${esc(dl(a.monthly))}"></label>
   <label>${L('¿Planean hacer inspecciones?','Do you plan to do inspections?')}<select name="inspections"><option value="YES"${p.inspectionsChosen?' selected':''}>${L('Sí','Yes')}</option><option value="NO"${p.inspectionsChosen?'':' selected'}>No</option></select></label>
   <label>${L('Notas (opcional)','Notes (optional)')}<textarea name="notes" rows="3" maxlength="1000">${esc(p.notes||'')}</textarea></label>
   <div class="tour-btns"><button type="submit" class="btn-card primary">📨 ${L('Enviar oferta de nuevo','Send the offer again')}</button></div></form>`);
  m.querySelector('#tourResF').addEventListener('submit',e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));if(+v.downPayment>+v.offerPrice){alert(L('El enganche no puede ser mayor que el precio.','The down payment cannot be more than the price.'));return;}
    act(async()=>{await call('tour_offer_resume',{offerId,...v});m.remove();await load(true);alert(L('Listo. La oferta volvió al dueño como nueva.','Done. The offer went back to the owner as new.'));});});
}
/* ---------- offers: confirmation card + next-steps checklist ---------- */
const STEP_LABEL={DOCS:['Entregar documentación','Deliver the documents'],DEPOSIT:['Depósito de garantía $1,000.00','$1,000.00 earnest deposit'],INSPECTIONS:['Coordinar inspecciones (si se elige)','Schedule inspections (if chosen)'],TRR:['Negociar TRR (opcional)','Negotiate TRR (optional)'],CLOSING:['Coordinar cierre','Coordinate closing'],OPTION_FEE:['Depositar option fee / down payment','Pay the option fee / down payment'],PAID:['Get paid','Get paid']};
const STATUS_LABEL={PENDING:['Pendiente','Pending','⏳'],SUBMITTED:['Enviado — esperando al vendedor','Sent — waiting for the seller','📤'],APPROVED:['Aprobado por el vendedor','Approved by the seller','✅'],LATE:['Vencido','Overdue','⚠️'],INVALIDATED:['Anulada (vencida)','Voided (expired)','❌'],DONE:['Hecho','Done','✅'],NA:['No aplica','Not needed','➖'],
  LOCKED:['Todavía no','Not yet','🔒'],TO_SCHEDULE:['Por agendar','To schedule','📅'],SCHEDULED:['Agendada','Scheduled','📅'],AVAILABLE:['Disponible','Available','🛠️'],REVIEW:['TRR en revisión','TRR in review','🔎'],ACCEPTED:['Aceptado por el vendedor','Accepted by the seller','✅'],REJECTED:['Rechazado por el vendedor','Rejected by the seller','❌'],COUNTERED:['Contraoferta del vendedor','Seller counteroffer','↔️'],WAIVED:['Sin TRR','No TRR','➖'],PROPOSED:['Fecha propuesta — esperando aprobaciones','Date proposed — waiting for approvals','🗓️'],AGREED:['Fecha confirmada por todos','Date confirmed by everyone','✅']};
const CLOSING_REASONS=[['SCHEDULE','No puedo a esa hora / conflicto de horario','I can’t make that time / schedule conflict'],['FUNDS','Necesito más tiempo para los fondos','I need more time for the funds'],['DOCS','Faltan documentos o firmas','Documents or signatures are missing'],['TITLE','La título / escrow necesita otra fecha','Title / escrow needs another date'],['TRAVEL','Viaje o emergencia personal','Travel or personal emergency'],['OTHER','Otra razón','Other reason']];
const ROLE_LBL={CLIENT:['Cliente','Client'],AGENT:['Agente','Agent'],SELLER:['Vendedor','Seller']};
function fileBtn(label,p,docType){return `<label class="btn-card">${label}<input type="file" hidden accept="image/*,application/pdf" data-tupt="${docType}" data-tlid="${esc(p.listingId)}" data-toffer="${esc(p.offerId)}"></label>`;}
function dtForm(op,p,label,extra){return `<form class="tour-form tour-inline" data-tflowf="${op}" data-toffer="${esc(p.offerId)}"><label>${L('Fecha','Date')}<input type="date" name="date" min="${chicagoDay(new Date())}" required></label><label>${L('Hora','Time')}<select name="time">${timeOptions('10:00')}</select></label>${extra||''}<button type="submit" class="btn-card primary">${label}</button></form>`;}
const DOCS_REVIEW=['En revisión del vendedor','In review by the seller','🔎'];
const SLOT_LBL={ID:['Identificación (ID)','ID (photo ID)'],INCOME:['Comprobantes de ingreso','Proof of income']};
// Camera rolls and storage keys (uuid.jpeg, IMG_5625.png) are not useful as link text. A real name stays.
function fileStem(name){return String(name||'').replace(/^.*[\\/]/,'').replace(/\.[^.]+$/,'').replace(/\s*\(\d+\)\s*$/,'').trim();}
function generatedFileName(name){
  const base=fileStem(name);if(!base)return true;
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(base))return true;
  if(/^[0-9a-f]{16,}$/i.test(base))return true;
  if(/^\d{8,}$/.test(base))return true;
  if(/^(img|dsc|dscn|pxl|mvimg|pict|photo|image|vid|video)([_\-\s]?[a-z]?\d.*)?$/i.test(base))return true;
  if(/^(screenshot|screen[\s_-]?shot|captura(\s+de\s+pantalla)?)\b/i.test(base))return true;
  if(/^whatsapp[\s_-]/i.test(base))return true;
  if(/^\d{8}[_-]\d{4,8}$/.test(base))return true;
  return false;
}
function shortFileLabel(name,kind,n){
  const raw=String(name||'').trim();if(raw&&!generatedFileName(raw))return raw;
  const i=n||1;
  if(kind==='ID')return i>1?`ID ${i}`:'ID';
  if(kind==='INCOME')return L(`Ingreso ${i}`,`Income ${i}`);
  if(kind==='DEPOSIT')return i>1?L(`Comprobante ${i}`,`Proof ${i}`):L('Comprobante','Proof');
  if(kind==='CONTRACT')return i>1?L(`Contrato ${i}`,`Contract ${i}`):L('Contrato','Contract');
  return L(`Archivo ${i}`,`File ${i}`);
}
function labelIndex(files,kindOf){
  const seen={};
  return (files||[]).map(f=>{
    const raw=String((f&&f.name)||'').trim();if(raw&&!generatedFileName(raw))return 0;
    const k=kindOf?kindOf(f):'f';seen[k]=(seen[k]||0)+1;return seen[k];
  });
}
function fileAnchor(f,kind,n,icon,cls){
  const raw=String((f&&f.name)||'').trim(),label=shortFileLabel(raw,kind,n);
  const title=raw&&label!==raw?` title="${esc(raw)}"`:'',cl=cls?` class="${esc(cls)}"`:'';
  return `<a href="#"${cl} data-opendoc="${esc(f.docId)}"${title}>${icon||'📄'} ${esc(label)}</a>`;
}
// v54: documents are per buyer. Each buyer uploads and replaces only their own ID + income; seller/Admin see them grouped by person.
// Admin and the offer's own agent can upload for any buyer ("Subir por el comprador") and remove (🗑️, soft delete) / restore a buyer's file.
const DS_ME=()=>(S.user&&S.user.id)||'';
function docPeopleBox(p,role){
  const seller=role==='SELLER'||role==='ADMIN',agent=role==='AGENT',client=role==='CLIENT',me=DS_ME();
  const helper=agent||role==='ADMIN'; // Admin or this offer's agent (the server checks again)
  const approved=!!p.docsApprovedAt,locked=approved||p.invalidatedAt||p.decision==='DENIED';
  const ppl=(p.docPeople||[]).slice();
  const byLbl=f=>f&&f.by==='AGENT'?L('subido por el agente','uploaded by the agent'):f&&f.by==='ADMIN'?L('subido por el Admin','uploaded by Admin'):'';
  const fileA=(f,canDel,kind,n)=>`<span class="ds-file">${fileAnchor(f,kind,n,'📄')}${byLbl(f)&&f.owner!==f.upBy?`<small class="ds-by">${esc(byLbl(f))}</small>`:''}${canDel?`<button type="button" class="ds-del" data-tdocdel="${esc(f.docId)}" data-toffer="${esc(p.offerId)}" data-tdname="${esc(f.name||'')}" title="${esc(L('Eliminar','Delete'))}" aria-label="${esc(L('Eliminar','Delete'))}">🗑️</button>`:''}</span>`;
  const up=(slot,label,replace,multi,cls,forId)=>`<label class="btn-card${cls?' '+cls:''}">${label}<input type="file" hidden accept="image/*,application/pdf"${multi?' multiple':''} data-tslot="${slot}" data-trepl="${replace?1:0}" data-tlid="${esc(p.listingId)}" data-toffer="${esc(p.offerId)}"${forId?` data-tfor="${esc(forId)}"`:''}></label>`;
  const row=(x,slot,canUp,forId)=>{const has=slot==='ID'?(x.ID?[x.ID]:[]):(x.INCOME||[]);const ok=has.length>0;const canDel=helper&&!locked;
    const idx=labelIndex(has),fileA0=(f,i)=>fileA(f,canDel,slot,idx[i]||1);const pb=forId?'📎 '+L('Subir por el comprador','Upload for the buyer'):'';
    const btns=canUp&&!locked?`<div class="tour-btns ds-btns">${slot==='ID'?up('ID',ok?'🔁 '+(forId?L('Reemplazar por el comprador','Replace for the buyer'):L('Reemplazar','Replace')):(pb||'📎 '+L('Subir ID','Upload ID')),ok,false,ok?'':'primary',forId):ok?up('INCOME','➕ '+(forId?L('Subir otro por el comprador','Upload another for the buyer'):L('Agregar otro','Add another')),false,true,'',forId)+up('INCOME','🔁 '+L('Reemplazar todo','Replace all'),true,true,'',forId):up('INCOME',pb||'📎 '+L('Subir comprobantes','Upload proof'),false,true,'primary',forId)}</div>`:'';
    if(ok&&approved)return `<div class="ds-slot ok">${foldLine('✅',`${slot==='ID'?'🪪':'💼'} ${esc(L(...SLOT_LBL[slot]))}`,L('Aprobado','Approved'),p.docsApprovedAt,`<div class="ds-files">${has.map(fileA0).join('')}</div>`,'ds-fold')}</div>`;
    return `<div class="ds-slot ${ok?'ok':'miss'}"><div class="ds-h"><b>${slot==='ID'?'🪪':'💼'} ${esc(L(...SLOT_LBL[slot]))}</b><span class="ds-st">${ok?(approved?'✅ '+L('Aprobado','Approved'):'✅ '+L('Subido','Uploaded')):'⏳ '+L('Falta','Missing')}</span></div>${ok?`<div class="ds-files">${has.map(fileA0).join('')}</div>`:''}${slot==='INCOME'&&!ok&&canUp&&!locked?`<small>${L('Puedes subir varios archivos (talones de pago, estados de cuenta, carta de empleo).','You can upload several files (pay stubs, bank statements, employment letter).')}</small>`:''}${btns}</div>`;};
  const who=x=>esc(x.name||L('Comprador','Buyer'))+(x.kind==='AGENT'?' · '+L('Agente','Agent'):'')+(x.userId===me?' ('+L('tú','you')+')':'');
  const st=x=>`🪪 ${x.ID?'✅':'⏳'} · 💼 ${(x.INCOME||[]).length?'✅':'⏳'}`;
  const gone=x=>helper&&!locked?(p.docRemoved||[]).filter(f=>f.owner===x.userId):[];
  const goneB=x=>{const g=gone(x);if(!g.length)return '';const idx=labelIndex(g,f=>f.slot==='ID'?'ID':'INCOME');return `<details class="ds-gone"><summary>🗑️ ${L('Eliminados','Removed')} (${g.length})</summary>${g.map((f,i)=>`<div class="ds-gone-i"><span>${f.slot==='ID'?'🪪':'💼'} ${esc(shortFileLabel(f.name,f.slot==='ID'?'ID':'INCOME',idx[i]||1))}</span><button type="button" class="btn-card" data-tdocres="${esc(f.docId)}" data-toffer="${esc(p.offerId)}">↩️ ${L('Restaurar','Restore')}</button></div>`).join('')}</details>`;};
  const group=(x,canUp,forId)=>`<div class="ds-person"><div class="ds-ph"><b>👤 ${who(x)}</b><span class="ds-pst">${st(x)}</span></div>${row(x,'ID',canUp,forId)}${row(x,'INCOME',canUp,forId)}${goneB(x)}</div>`;
  let body='';
  if(client){
    const mine=ppl.find(x=>x.userId===me)||{userId:me,name:'',kind:'CLIENT',ID:null,INCOME:[],missing:['ID','INCOME']};
    const others=ppl.filter(x=>x.userId!==me);
    body=`<div class="ds-person ds-mine"><div class="ds-ph"><b>👤 ${L('Tus documentos','Your documents')}</b><span class="ds-pst">${st(mine)}</span></div>${row(mine,'ID',true,'')}${row(mine,'INCOME',true,'')}${locked?'':`<small>${L('Cada comprador sube sus propios documentos. Lo que suba otro comprador no reemplaza los tuyos.','Each buyer uploads their own documents. What another buyer uploads never replaces yours.')}</small>`}</div>`
      +(others.length?`<div class="ds-others"><small>${L('Otros compradores en esta oferta','Other buyers on this offer')}</small>${others.map(x=>`<div class="ds-oth"><span>👤 ${who(x)}</span><span>${st(x)}</span></div>`).join('')}</div>`:'');
  }else if(agent){body=ppl.map(x=>group(x,true,x.kind==='AGENT'?'':x.userId)).join('');}
  else if(role==='ADMIN')body=ppl.map(x=>group(x,x.kind!=='AGENT',x.kind==='AGENT'?'':x.userId)).join('');
  else body=ppl.map(x=>group(x,false,'')).join('');
  let msg='';
  if(approved)msg=`<p class="tour-done">✅ ${L('Documentos aprobados por el vendedor.','Documents approved by the seller.')}</p>`;
  else if(p.docsUploadedAt)msg=`<p class="tour-done">🔎 <b>${L('En revisión','In review')}</b> — ${L('ID y comprobantes completos. El plazo de 12 horas se detuvo; ahora el vendedor los revisa.','ID and proof of income complete. The 12-hour clock stopped; the seller is reviewing them.')}</p>`;
  else if(!locked){const miss=(p.docsMissing||['ID','INCOME']).map(k=>L(...SLOT_LBL[k]));msg=`<p class="tour-warn">⏳ ${L('Falta','Missing')}: <b>${esc(miss.join(L(' y ',' and ')))}</b>. ${L('La sección 1 se completa cuando estén los dos.','Step 1 is complete once both are uploaded.')}${p.docsDueAt?` ${L('El plazo sigue corriendo','The clock is still running')}: ${cdSpan(p.docsDueAt)}`:' '+L('El plazo de 12 horas empieza cuando el dueño pre-apruebe la oferta.','The 12-hour clock starts when the owner pre-approves the offer.')}</p>`;}
  const rej=p.docsRejectedAt&&!p.docsUploadedAt&&!approved?`<p class="tour-warn">↩️ <b>${L('El vendedor pidió corregir los documentos','The seller asked to fix the documents')}</b>: ${esc(p.docsRejectNote||'')}<br><small>${L('Vuelve a subir tu ID y tu comprobante de ingresos.','Upload your ID and proof of income again.')}</small></p>`:'';
  const sb=seller&&p.docsUploadedAt&&!approved&&!locked&&p.decision==='PRE_APPROVED'?`<div class="tour-btns"><button type="button" class="btn-card primary" data-tcond="${esc(p.offerId)}" data-tcw="docs">✅ ${L('Aprobar documentos','Approve documents')}</button><button type="button" class="btn-card btn-del" data-tdocrej="${esc(p.offerId)}">↩️ ${L('Rechazar (pedir corrección)','Reject (ask to fix)')}</button></div>`:'';
  return `<div class="ds-box">${rej}${body}${msg}${sb}${seller?`<small class="ds-priv">🔒 ${L('Archivos privados: solo los ven los compradores, su agente, el vendedor y el Admin. Los enlaces vencen en 2 minutos.','Private files: only the buyers, their agent, the seller and Admin can see them. Links expire in 2 minutes.')}</small>`:''}</div>`;
}
function docSlotsBox(p,role){
  if(!p)return '';const sl=p.docSlots||{ID:null,INCOME:[]};
  if(Array.isArray(p.docPeople)&&p.docPeople.length&&!(p.docsUploadedAt&&!sl.ID&&!(sl.INCOME||[]).length))return docPeopleBox(p,role);
  const seller=role==='SELLER'||role==='ADMIN',buyer=role==='AGENT'||role==='CLIENT';
  const legacy=p.docsUploadedAt&&!sl.ID&&!(sl.INCOME||[]).length;
  const approved=!!p.docsApprovedAt,locked=approved||p.invalidatedAt||p.decision==='DENIED';
  const up=(slot,label,replace,multi,cls)=>`<label class="btn-card${cls?' '+cls:''}">${label}<input type="file" hidden accept="image/*,application/pdf"${multi?' multiple':''} data-tslot="${slot}" data-trepl="${replace?1:0}" data-tlid="${esc(p.listingId)}" data-toffer="${esc(p.offerId)}"></label>`;
  const row=(slot)=>{const has=slot==='ID'?(sl.ID?[sl.ID]:[]):(sl.INCOME||[]);const ok=has.length>0;
    const idx=labelIndex(has),filesHtml=ok?`<div class="ds-files">${has.map((f,i)=>fileAnchor(f,slot,idx[i]||1,'📄')).join('')}</div>`:'';
    const btns=buyer&&!locked?`<div class="tour-btns ds-btns">${slot==='ID'?up('ID',ok?'🔁 '+L('Reemplazar','Replace'):'📎 '+L('Subir ID','Upload ID'),ok,false,ok?'':'primary'):ok?up('INCOME','➕ '+L('Agregar otro','Add another'),false,true,'')+up('INCOME','🔁 '+L('Reemplazar todo','Replace all'),true,true,''):up('INCOME','📎 '+L('Subir comprobantes','Upload proof'),false,true,'primary')}</div>`:'';
    if(ok&&approved)return `<div class="ds-slot ok">${foldLine('✅',`${slot==='ID'?'🪪':'💼'} ${esc(L(...SLOT_LBL[slot]))}`,L('Aprobado','Approved'),p.docsApprovedAt,filesHtml,'ds-fold')}</div>`;
    return `<div class="ds-slot ${ok?'ok':'miss'}"><div class="ds-h"><b>${slot==='ID'?'🪪':'💼'} ${esc(L(...SLOT_LBL[slot]))}</b><span class="ds-st">${ok?(approved?'✅ '+L('Aprobado','Approved'):'✅ '+L('Subido','Uploaded')):'⏳ '+L('Falta','Missing')}</span></div>${filesHtml}${slot==='INCOME'&&!ok&&buyer&&!locked?`<small>${L('Puedes subir varios archivos (talones de pago, estados de cuenta, carta de empleo).','You can upload several files (pay stubs, bank statements, employment letter).')}</small>`:''}${btns}</div>`;};
  let msg='';
  if(approved)msg=`<p class="tour-done">✅ ${L('Documentos aprobados por el vendedor.','Documents approved by the seller.')}</p>`;
  else if(p.docsUploadedAt)msg=`<p class="tour-done">🔎 <b>${L('En revisión','In review')}</b> — ${L('ID y comprobantes completos. El plazo de 12 horas se detuvo; ahora el vendedor los revisa.','ID and proof of income complete. The 12-hour clock stopped; the seller is reviewing them.')}</p>`;
  else if(!locked){const miss=(p.docsMissing||['ID','INCOME']).map(k=>L(...SLOT_LBL[k]));msg=`<p class="tour-warn">⏳ ${L('Falta','Missing')}: <b>${esc(miss.join(L(' y ',' and ')))}</b>. ${L('La sección 1 se completa cuando estén los dos.','Step 1 is complete once both are uploaded.')}${p.docsDueAt?` ${L('El plazo sigue corriendo','The clock is still running')}: ${cdSpan(p.docsDueAt)}`:' '+L('El plazo de 12 horas empieza cuando el dueño pre-apruebe la oferta.','The 12-hour clock starts when the owner pre-approves the offer.')}</p>`;}
  const rej=p.docsRejectedAt&&!p.docsUploadedAt&&!approved?`<p class="tour-warn">↩️ <b>${L('El vendedor pidió corregir los documentos','The seller asked to fix the documents')}</b>: ${esc(p.docsRejectNote||'')}<br><small>${L('Vuelve a subir tu ID y tu comprobante de ingresos.','Upload your ID and proof of income again.')}</small></p>`:'';
  const sb=seller&&p.docsUploadedAt&&!approved&&!locked&&p.decision==='PRE_APPROVED'?`<div class="tour-btns"><button type="button" class="btn-card primary" data-tcond="${esc(p.offerId)}" data-tcw="docs">✅ ${L('Aprobar documentos','Approve documents')}</button><button type="button" class="btn-card btn-del" data-tdocrej="${esc(p.offerId)}">↩️ ${L('Rechazar (pedir corrección)','Reject (ask to fix)')}</button></div>`:'';
  if(legacy)return `<div class="ds-box">${msg}<small>${L('Documentos recibidos (antes de separar ID y comprobantes).','Documents received (before ID and income were split).')}</small>${sb}</div>`;
  return `<div class="ds-box">${rej}${row('ID')}${row('INCOME')}${msg}${sb}${seller?`<small class="ds-priv">🔒 ${L('Archivos privados: solo los ven el cliente, su agente, el vendedor y el Admin. Los enlaces vencen en 2 minutos.','Private files: only the client, their agent, the seller and Admin can see them. Links expire in 2 minutes.')}</small>`:''}</div>`;
}
// v39 (7:25 PM): the $1,000 proof files open through the same private 2-minute links as step 1 (client, their agent, seller, Admin).
function depositFiles(p,brief){const fs=(p&&p.depositDocs)||[];if(!fs.length)return '';const idx=labelIndex(fs);return `<div class="ds-files dep-files">${fs.map((f,i)=>fileAnchor(f,'DEPOSIT',idx[i]||1,'💵')).join('')}</div>${brief?'':`<small class="ds-priv">🔒 ${L('Archivo privado: lo ven el cliente, su agente, el vendedor y el Admin. El enlace vence en 2 minutos.','Private file: the client, their agent, the seller and Admin can see it. The link expires in 2 minutes.')}</small>`}`;}
function depositBox(p,role){
  if(!p||!(p.depositDocs||[]).length)return '';
  const seller=role==='SELLER'||role==='ADMIN';
  const st=p.depositApprovedAt?`<p class="tour-done">✅ ${L('Depósito aprobado por el vendedor.','Deposit approved by the seller.')}</p>`:`<p class="tour-done">🔎 ${L('Comprobante recibido','Proof received')}${seller?' — '+L('verifícalo en tu banco y apruébalo.','check it in your bank and approve it.'):' — '+L('el vendedor lo está revisando.','the seller is reviewing it.')}</p>`;
  if(p.depositApprovedAt)return `<div class="ds-box dep-box"><div class="ds-slot ok">${foldLine('✅','💵 '+L('Comprobante del depósito','Deposit proof'),L('Depósito aprobado por el vendedor','Deposit approved by the seller'),p.depositApprovedAt,depositFiles(p),'ds-fold')}</div></div>`;
  return `<div class="ds-box dep-box"><div class="ds-slot ok"><div class="ds-h"><b>💵 ${L('Comprobante del depósito','Deposit proof')}</b><span class="ds-st">${p.depositApprovedAt?'✅ '+L('Aprobado','Approved'):'✅ '+L('Subido','Uploaded')}</span></div>${depositFiles(p,true)}</div>${st}<small class="ds-priv">🔒 ${L('Archivo privado: lo ven el cliente, su agente, el vendedor y el Admin. El enlace vence en 2 minutos.','Private file: the client, their agent, the seller and Admin can see it. The link expires in 2 minutes.')}</small></div>`;
}
function stepBody(p,c,role){
  if(c.key==='DOCS')return docSlotsBox(p,role);
  if(c.key==='DEPOSIT')return depositBox(p,role);
  const agent=role==='AGENT'||role==='ADMIN',seller=role==='SELLER'||role==='ADMIN',buyer=role==='AGENT'||role==='CLIENT',me=role==='ADMIN'?'SELLER':role;
  const fb=(op,label,cls)=>`<button type="button" class="btn-card${cls?' '+cls:''}" data-tflow="${op}" data-toffer="${esc(p.offerId)}">${label}</button>`;
  if(c.key==='INSPECTIONS'){
    if(c.status==='NA')return agent?`<div class="tour-btns">${fb('inspection_request','🔍 '+L('Pedir inspección','Request inspection'))}</div>`:'';
    if(c.status==='LOCKED')return `<small>${L('Se abre cuando estén subidos los documentos y el comprobante de $1,000, y el vendedor haya aprobado al menos 2 de las 3 condiciones (oferta, documentos, depósito).','Opens once the documents and the $1,000 proof are uploaded and the seller has approved at least 2 of the 3 conditions (offer, documents, deposit).')}${typeof p.sellerApprovals==='number'?` · ${L('Aprobadas','Approved')}: ${p.sellerApprovals}/3`:''}</small>`;
    let h=p.inspectionAt?`<small>📅 ${esc(when(p.inspectionAt))}</small>`:'';
    if(c.status!=='DONE'&&agent)h+=dtForm('inspection_schedule',p,p.inspectionAt?L('Cambiar','Change'):L('Agendar inspección','Schedule inspection'));
    if(c.status==='SCHEDULED'&&buyer)h+=`<div class="tour-btns">${fileBtn('📄 '+L('Subir reporte','Upload report'),p,'TOUR_INSPECTION_REPORT')}</div>`;
    if(c.status==='DONE')h+=`<small>📄 ${L('Reporte subido','Report uploaded')}</small>`;
    return h;
  }
  if(c.key==='TRR'){
    if(c.status==='NA')return '';
    if(c.status==='LOCKED')return agent?`<div class="tour-btns"><button type="button" class="btn-card" disabled>🛠️ ${L('Negociar TRR','Negotiate TRR')}</button><small>${L('Se activa al subir el reporte de inspección.','Unlocks when the inspection report is uploaded.')}</small></div>`:'';
    let h=p.trr.text?`<blockquote class="tour-ask-msg">${esc(p.trr.text)}</blockquote>`:'';
    if(p.trr.sellerNote)h+=`<small>${L('Vendedor','Seller')}: ${esc(p.trr.sellerNote)}</small>`;
    if(c.status==='ACCEPTED'&&p.trr.counterText)h+=`<p><b>${L('Acordado (contraoferta del vendedor)','Agreed (seller counteroffer)')}:</b> ${esc(p.trr.counterText)}</p>`;
    if(c.status==='COUNTERED')h+=`<p><b>${L('Contraoferta del vendedor','Seller counteroffer')}:</b> ${esc(p.trr.counterText)}</p>`;
    if(agent&&['AVAILABLE','REJECTED','COUNTERED'].includes(c.status))h+=`<div class="tour-btns">${c.status==='COUNTERED'?fb('trr_accept_counter','✅ '+L('Aceptar contraoferta','Accept counteroffer'),'primary'):''}<button type="button" class="btn-card${c.status==='COUNTERED'?'':' primary'}" data-ttrr="${esc(p.offerId)}">🛠️ ${L('Negociar TRR','Negotiate TRR')}</button>${fb('trr_waive',L('No negociar TRR','Don’t negotiate TRR'))}</div>`;
    if(seller&&c.status==='REVIEW')h+=`${p.inspectionReportDocId?`<small>📄 ${L('Reporte de inspección en los documentos de la oferta.','Inspection report is in the offer documents.')}</small>`:''}<div class="tour-btns"><button type="button" class="btn-card primary" data-ttrrd="${esc(p.offerId)}" data-tdv="accept">✅ ${L('Aceptar','Accept')}</button><button type="button" class="btn-card" data-ttrrd="${esc(p.offerId)}" data-tdv="counter">↔️ ${L('Contraofertar','Counter')}</button><button type="button" class="btn-card btn-del" data-ttrrd="${esc(p.offerId)}" data-tdv="reject">✕ ${L('Rechazar','Reject')}</button></div>`;
    return h;
  }
  if(c.key==='CLOSING'){
    if(c.status==='LOCKED')return `<small>${L('Se abre con las 3 aprobaciones y, si hubo inspección, con el TRR aceptado o sin TRR.','Opens after the 3 approvals and, if there was an inspection, once the TRR is accepted or skipped.')}</small>`;
    if(c.status==='TO_SCHEDULE')return role==='CLIENT'?dtForm('closing_propose',p,L('Proponer fecha de cierre','Propose closing date')):`<small>${L('Esperando que el cliente elija día y hora.','Waiting for the client to pick a day and time.')}</small>`;
    const a=(p.closing&&p.closing.approvals)||{};
    let h=`<small>🗓️ <b>${esc(when(p.closing.at))}</b></small><div class="tour-approvals">${['CLIENT','AGENT','SELLER'].map(r=>`<span class="${a[r]?'ok':''}">${a[r]?'✅':'⬜'} ${L(...ROLE_LBL[r])}</span>`).join('')}</div>`;
    if(p.closingAt){h+=`<p class="tour-done">✅ ${L('Fecha confirmada por todos.','Date confirmed by everyone.')}</p>`;if(c.status!=='DONE'&&ROLE_LBL[me])h+=`<button type="button" class="tour-linkbtn" data-tclchg="${esc(p.offerId)}">${L('Cambiar fecha','Change date')}</button>`;return h;} // v39 (9:08 PM): no stale change proposals once confirmed
    if(p.closing.reasonCode){const r=CLOSING_REASONS.find(x=>x[0]===p.closing.reasonCode);h+=`<small>${L('Cambio propuesto por','Change proposed by')} ${L(...ROLE_LBL[p.closing.by]||['',''])}: ${esc(r?L(r[1],r[2]):'')}${p.closing.reasonText?' — '+esc(p.closing.reasonText):''}</small>`;}
    if(c.status!=='DONE'&&ROLE_LBL[me])h+=`<div class="tour-btns">${!a[me]?fb('closing_approve','✅ '+L('Aprobar fecha','Approve date'),'primary'):''}<button type="button" class="btn-card" data-tclchg="${esc(p.offerId)}">${L('No me queda — proponer otra','Doesn’t work — propose another')}</button></div>`;
    return h;
  }
  if(c.key==='OPTION_FEE'){
    if(c.status==='LOCKED')return `<small>${L('Se deposita 24 horas antes del cierre, cuando la fecha esté confirmada.','Due 24 hours before closing, once the date is confirmed.')}</small>`;
    let h=p.fundsDueAt&&!['APPROVED'].includes(c.status)?`<small>${L('Antes del','By')} ${esc(when(p.fundsDueAt))}</small>`:'';
    if(buyer&&['PENDING','LATE'].includes(c.status))h+=`<div class="tour-btns">${fileBtn('💵 '+L('Subir comprobante','Upload receipt'),p,'FUNDS_RECEIPT')}</div>`;
    if(seller&&c.status==='SUBMITTED')h+=`<div class="tour-btns">${fb('funds_approve','✅ '+L('Verificar y aprobar','Verify and approve'),'primary')}</div>`;
    if(c.status==='APPROVED')h+=`<p class="tour-done">🎉 ${L('Todo está completo. ¡Gracias por responder tan rápido en cada paso!','Everything is complete. Thank you for responding so quickly at every step!')}</p>`;
    return h;
  }
  if(c.key==='PAID'){
    const closed=p.closingAt&&Date.now()>new Date(p.closingAt).getTime();if(!closed)return '';
    const mine=(p.experience||[]).find(x=>x.role===me);
    return `${mine?`<p class="tour-done">✅ ${L('Gracias por tus comentarios.','Thank you for your comments.')}</p>`:`<form class="tour-form" data-texp="${esc(p.offerId)}"><label>${L('Tu experiencia, recomendaciones o mejoras','Your experience, recommendations or improvements')}<textarea name="text" rows="3" maxlength="3000" required></textarea></label><button type="submit" class="btn-card primary">${L('Enviar comentarios','Send comments')}</button></form>`}<div class="tour-btns">${fileBtn('📁 '+L('Subir documentos de cierre (para tus registros)','Upload closing documents (for your records)'),p,'CLOSING_DOCS')}</div>`;
  }
  return '';
}
// v39 (9:24 PM): finished (✅) or not-needed (—) steps fold to one line; tap to open. The current step stays open.
// oc9: on each refresh the finished step is a closed <details> (no saved open state) and the next incomplete step renders expanded.
const STEP_DONE_AT=(p,c)=>({DOCS:p.docsApprovedAt,DEPOSIT:p.depositApprovedAt,INSPECTIONS:p.inspectionReportAt||p.inspectionWaivedAt||p.inspectionAt,TRR:p.trrAgreedAt||(p.trr&&p.trr.agreedAt),CLOSING:p.dealClosedAt||p.closingAt,OPTION_FEE:p.fundsApprovedAt,PAID:p.paidAt||p.thanksAt}[c.key]||c.at||null);
function foldLine(icon,title,result,at,inner,cls){return `<details class="lf-done-fold${cls?' '+cls:''}"><summary><span class="lfd-i" aria-hidden="true">${icon}</span><span class="lfd-t"><b>${title}</b><small>${result}${at?' · '+esc(shortDay(at)):''}</small></span><span class="lfd-c" aria-hidden="true">▾</span></summary><div class="lfd-b">${inner}</div></details>`;}
function stepDone(c){return DONE_ST.includes(c.status)||['ACCEPTED','AGREED','WAIVED'].includes(c.status);}
function stepFold(icon,title,inner,later){return `<details class="lf-done-fold${later?' step-later':''}"><summary><span class="lfd-i" aria-hidden="true">${icon}</span><span class="lfd-t"><b>${title}</b></span><span class="lfd-c" aria-hidden="true">▾</span></summary>${inner?`<div class="lfd-b">${inner}</div>`:''}</details>`;}
function checklist(p,role){
  const cur=nextStepOf(p),live=!p.invalidatedAt&&p.decision!=='DENIED';
  return `<ol class="tour-check">${(p.checklist||[]).map(c=>{
    const title=`${c.n}) ${esc(L(...STEP_LABEL[c.key]))}`;
    const finished=stepDone(c)&&!(cur&&cur.n===c.n)&&!p.invalidatedAt;
    const future=!!(cur&&c.n>cur.n)&&!p.invalidatedAt&&p.decision!=='DENIED';
    if(finished||future){
      const st=c.key==='DOCS'&&c.status==='SUBMITTED'?DOCS_REVIEW:(STATUS_LABEL[c.status]||STATUS_LABEL.DONE);
      const icon=finished?(['NA','WAIVED'].includes(c.status)?'➖':'✅'):st[2];
      const at=future||['NA','WAIVED'].includes(c.status)?null:c.key==='CLOSING'&&c.status==='AGREED'?(p.closing&&p.closing.at):STEP_DONE_AT(p,c);
      const body=live?stepBody(p,c,role):'';
      const guide=window.LegacyGuides?LegacyGuides.stepLink(c.key):'';
      const inner=`<small>${esc(L(st[0],st[1]))}${at?' · '+esc(shortDay(at)):''}</small>${body?`<div class="tour-step-body">${body}</div>`:''}${guide||''}`;
      return `<li class="tour-check-i s-${String(c.status).toLowerCase()} is-folded${future?' is-later':''}">${stepFold(icon,title,inner,future)}</li>`;
    }
    const st=c.key==='DOCS'&&c.status==='SUBMITTED'?DOCS_REVIEW:(STATUS_LABEL[c.status]||STATUS_LABEL.PENDING);
    const due=c.dueAt&&['DOCS','DEPOSIT'].includes(c.key)&&!['APPROVED','DONE','NA','INVALIDATED'].includes(c.status)&&!(c.key==='DOCS'&&c.status==='SUBMITTED')?` · ${L('antes del','by')} ${esc(when(c.dueAt))}`:'';
    return `<li class="tour-check-i s-${String(c.status).toLowerCase()} is-current"><div><span>${st[2]} <b>${c.n}) ${esc(L(...STEP_LABEL[c.key]))}</b>${c.key==='DOCS'&&['PENDING','LATE'].includes(c.status)?' '+L('(12 horas desde la pre-aprobación)','(12 hours from the pre-approval)'):''}${c.key==='DEPOSIT'&&['PENDING','LATE'].includes(c.status)?' '+L('(72 horas desde la pre-aprobación)','(72 hours from the pre-approval)'):''}<br><small>${esc(L(st[0],st[1]))}${due}</small>${window.LegacyGuides?LegacyGuides.stepLink(c.key):''}</span>${live?`<div class="tour-step-body">${stepBody(p,c,role)}</div>`:''}</div></li>`;
  }).join('')}</ol>`;
}
const money=c=>{const v=Number(c)/100;return Number.isFinite(v)&&v>0?'$'+v.toLocaleString('en-US',{maximumFractionDigits:2}):'';};
function amountLine(p){const a=p&&p.amount;if(!a)return '';return [money(a.price),a.down?L('enganche ','down ')+money(a.down):'',a.monthly?money(a.monthly)+L('/mes','/mo'):''].filter(Boolean).join(' · ');}
function homeStatusLine(p){const h=p&&p.homeStatus;if(!h||p.invalidatedAt)return '';const lbl=/PENDING/.test(h.status)?L('Pendiente','Pending'):esc(h.status);
  return `<p class="ops-meta">🏠 ${L('Estado de la casa','Home status')}: <b>${lbl}</b>${h.simulated?' · '+L('modo de prueba: simulado, la casa real no cambió','test mode: simulated, the real home did not change'):''}</p>`;}
function counterBox(p,role){
  const c=p&&p.counter;if(!c)return '';const amt=amountLine({amount:c});
  if(c.status==='OPEN'&&!p.decision)return `<div class="tour-counter"><p>↩️ <b>${L('El dueño hizo una contraoferta','The owner made a counteroffer')}</b>: ${esc(amt)}${c.note?`<br><small>“${esc(c.note)}”</small>`:''}</p>${role==='AGENT'||role==='ADMIN'?`<div class="tour-btns"><button type="button" class="btn-card primary" data-tctr="${esc(p.offerId)}" data-tca="accept">✅ ${L('Aceptar contraoferta','Accept counteroffer')}</button><button type="button" class="btn-card btn-del" data-tctr="${esc(p.offerId)}" data-tca="decline">✕ ${L('Rechazar','Decline')}</button></div><p class="ops-meta">${L('Si la aceptas, esos términos quedan como la oferta y cuenta como pre-aprobada: empiezan los plazos (12 h documentos, 72 h depósito).','If you accept, those terms become the offer and it counts as pre-approved: the clocks start (12 h documents, 72 h deposit).')}</p>`:role==='SELLER'?`<p class="ops-meta">${L('Esperando la respuesta del agente.','Waiting for the agent’s answer.')}</p>`:`<p class="ops-meta">${L('Tu agente la revisa contigo y responde.','Your agent reviews it with you and answers.')}</p>`}</div>`;
  if(c.status==='ACCEPTED')return `<p class="ops-meta">🤝 ${L('Contraoferta aceptada','Counteroffer accepted')}: ${esc(amt)}</p>`;
  if(c.status==='DECLINED'&&!p.decision)return `<p class="ops-meta">✕ ${L('Contraoferta rechazada','Counteroffer declined')} (${esc(amt)})${c.answerNote?' — '+esc(c.answerNote):''}</p>`;
  return '';
}
function decisionLine(p){
  if(p.invalidatedAt)return `<p class="tour-warn">❌ <b>${L('Oferta anulada (vencida)','Offer voided (expired)')}</b>: ${p.voidReason==='DEPOSIT'?L('no se subió el comprobante del depósito de $1,000 dentro de 72 horas desde la pre-aprobación.','the $1,000 deposit proof was not uploaded within 72 hours of the pre-approval.'):L('no se subieron los documentos dentro de 12 horas desde la pre-aprobación.','the documents were not uploaded within 12 hours of the pre-approval.')}</p>`;
  if(p.decision==='DENIED')return `<p class="tour-warn">❌ ${L('El dueño no aceptó la oferta.','The owner did not accept the offer.')}${p.decisionNote?' '+esc(p.decisionNote):''}</p>`;
  if(p.underContract)return `<p class="tour-done">📝 ${L('Bajo contrato (condición aprobada).','Under contract (condition approved).')}${!p.docsUploadedAt&&p.docsDueAt?' '+L('Falta la documentación','Documents still needed')+` — ${L('antes del','by')} ${esc(when(p.docsDueAt))}.`:''}${!p.depositProofAt&&p.depositDueAt?' '+L('Falta el comprobante del depósito de $1,000','The $1,000 deposit proof is still needed')+` — ${L('antes del','by')} ${esc(when(p.depositDueAt))}.`:''}</p>`;
  if(p.decision==='PRE_APPROVED')return `<p class="tour-done">✅ ${L('El dueño pre-aprobó la oferta. Documentos','The owner pre-approved the offer. Documents')}: <b>${p.docsApprovedAt?L('aprobados','approved'):p.docsUploadedAt?L('en revisión del vendedor','in review by the seller'):L('antes del','by')+' '+esc(when(p.docsDueAt))}</b>${p.docsUploadedAt?'':' (12 h)'} · ${L('Depósito de $1,000 con comprobante','$1,000 deposit with proof')}: <b>${L('antes del','by')} ${esc(when(p.depositDueAt))}</b> (72 h). ${L('Si falta cualquiera a tiempo, la oferta se anula automáticamente. La casa pasa a Pendiente cuando el vendedor apruebe las 3 condiciones (oferta, documentos y depósito).','If either one is missing in time, the offer is voided automatically. The home goes to Pending once the seller approves all 3 conditions (offer, documents and deposit).')}</p>`;
  if(p.counter&&p.counter.status==='OPEN')return '';
  return `<p class="ops-meta">⏳ ${L('Esperando la pre-aprobación del dueño. Los plazos (12 h documentos, 72 h depósito) empiezan cuando la pre-apruebe.','Waiting for the owner’s pre-approval. The clocks (12 h documents, 72 h deposit) start when it is pre-approved.')}${p.resumes?' 🔄 '+L('Oferta reanudada.','Offer resumed.'):''}</p>`;
}
/* oc9: one or two plain sentences for the step the viewer is on. Side is buyer (client), agent, or owner (seller and Admin). */
function offerSide(role){return role==='CLIENT'||role==='FOLLOWER'?'buyer':role==='AGENT'?'agent':'owner';}
function limitBit(iso){
  if(!iso)return '';
  const t=new Date(iso).getTime();if(!Number.isFinite(t))return '';
  const txt=`${shortDay(iso)}, ${timeOf(iso)}`,end=/[.!?]$/.test(txt)?'':'.';
  return t<=Date.now()?` ${L('Plazo vencido','Deadline passed')}: ${txt}${end}`:` ${L('Fecha límite','Deadline')}: ${txt}${end}`;
}
function stepBlurb(p,role){
  if(!p)return '';
  const side=offerSide(role);
  if(p.invalidatedAt)return p.voidReason==='DEPOSIT'
    ?L('Oferta anulada: no se subió el comprobante del depósito de $1,000 dentro de 72 horas.','Offer voided: the $1,000 deposit proof was not uploaded within 72 hours.')
    :L('Oferta anulada: no se subieron los documentos dentro de 12 horas.','Offer voided: the documents were not uploaded within 12 hours.');
  if(p.decision==='DENIED'){const note=String(p.decisionNote||'').trim();const base=L('El dueño no aceptó la oferta.','The owner did not accept the offer.');return note&&note.length<=80?`${base} ${note}`:base;}
  if(p.dealClosedAt||p.tableStatus==='CLOSED')return L('Trato cerrado. La casa quedó vendida: este es el paso final.','Deal closed. The home is sold: this is the final step.');
  const steps=p.checklist||[];
  const doneBlurb=side==='buyer'
    ?L('Listo. Ya completaste todos los pasos de esta oferta.','Done. You have completed every step of this offer.')
    :L('Todos los pasos están completos. El vendedor puede marcar la casa como vendida.','Every step is complete. The seller can mark the home sold.');
  if(steps.length&&steps.every(c=>DONE_STRICT.includes(c.status)))return doneBlurb;
  if(!p.decision){
    if(p.counter&&p.counter.status==='OPEN'){
      if(side==='owner')return L('Enviaste una contraoferta. Estás esperando la respuesta del agente.','You sent a counteroffer. You are waiting for the agent’s answer.');
      if(side==='agent')return L('El dueño hizo una contraoferta. Acéptala o recházala para seguir.','The owner made a counteroffer. Accept it or decline it to continue.');
      return L('El dueño hizo una contraoferta. Tu agente la revisa contigo y responde.','The owner made a counteroffer. Your agent reviews it with you and answers.');
    }
    if(side==='owner')return L('Oferta nueva. Pre-aprueba, niega o haz una contraoferta. Los plazos empiezan cuando la pre-apruebes.','New offer. Pre-approve it, deny it, or send a counteroffer. The clocks start when you pre-approve.');
    if(side==='agent')return L('Esperando que el dueño pre-apruebe la oferta. Ahí empiezan los plazos de documentos y depósito.','Waiting for the owner to pre-approve the offer. The document and deposit clocks start then.');
    return L('Tu agente envió la oferta. Estamos esperando que el dueño la pre-apruebe.','Your agent sent the offer. We are waiting for the owner to pre-approve it.');
  }
  const c=steps.find(x=>!DONE_ST.includes(x.status));
  if(!c)return steps.length?doneBlurb:L('La oferta está pre-aprobada.','The offer is pre-approved.');
  const n=c.n,tot=p.stepsTotal||7,P=(es,en)=>L(`Paso ${n} de ${tot}: ${es}`,`Step ${n} of ${tot}: ${en}`);
  const me=role==='ADMIN'?'SELLER':role;
  if(c.key==='DOCS'){
    const fix=p.docsRejectedAt&&!p.docsUploadedAt&&!p.docsApprovedAt;
    const due=!p.docsUploadedAt?limitBit(p.docsDueAt):'';
    if(fix){
      if(side==='buyer')return P('el vendedor pidió corregir tus documentos. Vuelve a subir tu ID y tus comprobantes de ingreso.','the seller asked you to fix your documents. Upload your ID and proof of income again.');
      if(side==='agent')return P('el vendedor pidió corregir los documentos. Hay que volver a subir el ID y los comprobantes de ingreso.','the seller asked to fix the documents. The ID and proof of income need to be uploaded again.');
      return P('pediste una corrección de documentos. Esperando que vuelvan a subir el ID y los comprobantes de ingreso.','you asked for the documents to be fixed. Waiting for the ID and proof of income to be uploaded again.');
    }
    if(c.status==='SUBMITTED'||(p.docsUploadedAt&&!p.docsApprovedAt)){
      if(side==='buyer')return P('el vendedor está revisando tu ID y comprobantes de ingreso.','the seller is reviewing your ID and proof of income.');
      if(side==='agent')return P('el vendedor está revisando el ID y los comprobantes de ingreso.','the seller is reviewing the ID and proof of income.');
      return P('revisa el ID y los comprobantes de ingreso, y apruébalos o pide una corrección.','review the ID and proof of income, then approve them or ask for a fix.');
    }
    if(side==='buyer')return P('sube tu ID y tus comprobantes de ingreso.','upload your ID and your proof of income.')+due;
    if(side==='agent')return P('el comprador debe subir su ID y sus comprobantes de ingreso.','the buyer needs to upload their ID and proof of income.')+due;
    return P('esperando el ID y los comprobantes de ingreso del comprador.','waiting for the buyer’s ID and proof of income.')+due;
  }
  if(c.key==='DEPOSIT'){
    const due=!p.depositProofAt?limitBit(p.depositDueAt):'';
    if(c.status==='SUBMITTED'||(p.depositProofAt&&!p.depositApprovedAt)){
      if(side==='owner')return P('revisa el comprobante del depósito de $1,000 y apruébalo si ya está en tu banco.','review the $1,000 deposit proof and approve it if it is already in your bank.');
      if(side==='agent')return P('el vendedor está revisando el comprobante del depósito de $1,000.','the seller is reviewing the $1,000 deposit proof.');
      return P('el vendedor está revisando tu comprobante del depósito de $1,000.','the seller is reviewing your $1,000 deposit proof.');
    }
    if(side==='buyer')return P('sube el comprobante del depósito de $1,000.','upload the $1,000 deposit proof.')+due;
    if(side==='agent')return P('el comprador debe subir el comprobante del depósito de $1,000.','the buyer needs to upload the $1,000 deposit proof.')+due;
    return P('esperando el comprobante del depósito de $1,000.','waiting for the $1,000 deposit proof.')+due;
  }
  if(c.key==='INSPECTIONS'){
    if(c.status==='LOCKED')return P('las inspecciones se abren cuando documentos y depósito estén listos y el vendedor apruebe al menos 2 de 3 condiciones.','inspections open once the documents and deposit are in and the seller has approved at least 2 of 3 conditions.');
    if(c.status==='SCHEDULED'||p.inspectionAt){
      const whenTxt=p.inspectionAt?` (${shortDay(p.inspectionAt)}, ${timeOf(p.inspectionAt)})`:'';
      if(side==='owner')return P(`la inspección está agendada${whenTxt}. El reporte llega cuando terminen.`,`the inspection is scheduled${whenTxt}. The report arrives when it is done.`);
      return P(`la inspección está agendada${whenTxt}. Sube el reporte cuando esté listo.`,`the inspection is scheduled${whenTxt}. Upload the report when it is ready.`);
    }
    if(side==='agent')return P('agenda la inspección o indica que no habrá inspecciones.','schedule the inspection, or say there will be no inspections.');
    if(side==='buyer')return P('tu agente coordina la inspección, o pueden decidir no hacerla.','your agent sets up the inspection, or you can decide to skip it.');
    return P('el agente está coordinando la inspección, o puede indicar que no habrá.','the agent is setting up the inspection, or may say there will not be one.');
  }
  if(c.key==='TRR'){
    if(c.status==='LOCKED')return P('la negociación de reparaciones (TRR) se abre al subir el reporte de inspección.','repair negotiations (TRR) open when the inspection report is uploaded.');
    if(c.status==='REVIEW'||c.status==='SUBMITTED'){
      if(side==='owner')return P('revisa la lista de reparaciones (TRR) y acéptala, contraoferta o recházala.','review the repair list (TRR) and accept it, counter it, or reject it.');
      return P('el vendedor está revisando la lista de reparaciones (TRR).','the seller is reviewing the repair list (TRR).');
    }
    if(c.status==='COUNTERED'){
      if(side==='owner')return P('enviaste una contraoferta de reparaciones. Esperando la respuesta del agente.','you sent a repair counteroffer. Waiting for the agent’s answer.');
      if(side==='agent')return P('el vendedor contraofertó las reparaciones. Acéptala o envía otra propuesta.','the seller countered the repairs. Accept it or send another proposal.');
      return P('el vendedor contraofertó las reparaciones. Tu agente te ayuda a responder.','the seller countered the repairs. Your agent helps you answer.');
    }
    if(c.status==='REJECTED'){
      if(side==='owner')return P('rechazaste el TRR. El agente puede enviar otra lista o seguir sin reparaciones.','you rejected the TRR. The agent can send another list or go on without repairs.');
      if(side==='agent')return P('el vendedor rechazó el TRR. Puedes enviar otra lista o no negociar.','the seller rejected the TRR. You can send another list or skip negotiations.');
      return P('el vendedor rechazó las reparaciones. Tu agente puede proponer otra lista o seguir sin TRR.','the seller rejected the repairs. Your agent can propose another list or go on without a TRR.');
    }
    if(side==='agent')return P('escribe lo que piden reparar, o elige no negociar el TRR.','write what you want repaired, or choose not to negotiate a TRR.');
    if(side==='buyer')return P('tu agente prepara la lista de reparaciones (TRR) o decide no negociarla.','your agent prepares the repair list (TRR) or decides not to negotiate it.');
    return P('esperando la lista de reparaciones del comprador, si deciden negociar.','waiting for the buyer’s repair list, if they choose to negotiate.');
  }
  if(c.key==='CLOSING'){
    const whenC=p.closing&&p.closing.at?`${shortDay(p.closing.at)}, ${timeOf(p.closing.at)}`:'';
    const atBit=whenC?` (${whenC})`:'';
    if(c.status==='LOCKED')return P('la fecha de cierre se abre cuando documentos, depósito y, si hubo inspección, las reparaciones estén listos.','the closing date opens once documents, deposit and, if there was an inspection, repairs are done.');
    if(c.status==='AGREED'||p.closingAt)return P(`la fecha de cierre está confirmada${atBit}. El pago del cierre se pide cerca de ese día.`,`the closing date is confirmed${atBit}. The closing payment is due near that day.`);
    if(c.status==='TO_SCHEDULE'){
      if(side==='buyer')return P('propón el día y la hora del cierre.','propose the day and time for closing.');
      if(side==='agent')return P('el comprador elige el día y la hora del cierre.','the buyer picks the day and time for closing.');
      return P('esperando que el comprador proponga la fecha de cierre.','waiting for the buyer to propose the closing date.');
    }
    const ap=(p.closing&&p.closing.approvals)||{};
    if(side==='buyer')return P(`hay una fecha de cierre propuesta${atBit}. Confírmala o pide otra.`,`a closing date is proposed${atBit}. Confirm it or ask for another.`);
    if(ap[me])return P(`ya aprobaste la fecha de cierre${atBit}. Falta que los demás confirmen.`,`you already approved the closing date${atBit}. The others still need to confirm.`);
    return P(`hay una fecha de cierre propuesta${atBit}. Apruébala o pide otra.`,`a closing date is proposed${atBit}. Approve it or ask for another.`);
  }
  if(c.key==='OPTION_FEE'){
    const due=(p.fundsDueAt&&!p.fundsReceiptAt&&['PENDING','LATE'].includes(c.status))?limitBit(p.fundsDueAt):'';
    if(c.status==='LOCKED')return P('el option fee o enganche se deposita 24 horas antes del cierre, cuando la fecha esté confirmada.','the option fee or down payment is due 24 hours before closing, once the date is confirmed.');
    if(c.status==='SUBMITTED'||(p.fundsReceiptAt&&!p.fundsApprovedAt)){
      if(side==='owner')return P('verifica el comprobante del option fee o enganche y apruébalo.','verify the option fee or down payment proof and approve it.');
      return P('el vendedor está verificando el comprobante del option fee o enganche.','the seller is verifying the option fee or down payment proof.');
    }
    if(side==='buyer')return P('sube el comprobante del option fee o enganche.','upload the option fee or down payment proof.')+due;
    if(side==='agent')return P('el comprador debe subir el comprobante del option fee o enganche.','the buyer needs to upload the option fee or down payment proof.')+due;
    return P('esperando el comprobante del option fee o enganche.','waiting for the option fee or down payment proof.')+due;
  }
  if(c.key==='PAID'){
    const passed=p.closingAt&&Date.now()>new Date(p.closingAt).getTime();
    const mine=(p.experience||[]).some(x=>x.role===me);
    if(!passed)return P('después del día de cierre podrás dejar tus comentarios y guardar los documentos.','after closing day you can leave your comments and save the documents.');
    if(mine)return P('gracias por tus comentarios. Puedes subir los documentos de cierre para tus registros.','thank you for your comments. You can upload the closing documents for your records.');
    return P('cuenta cómo fue el cierre y sube los documentos para tus registros.','share how the closing went and upload the documents for your records.');
  }
  const st=STATUS_LABEL[c.status]||STATUS_LABEL.PENDING,lab=STEP_LABEL[c.key]||['Este paso','This step'];
  return P(`${lab[0]}. ${st[0]}.`,`${lab[1]}. ${st[1]}.`);
}
function sellerName(p){const o=p&&p.owner;if(!o)return '';const rec=String(o.ownerOfRecord||o.owner_of_record||'').trim();if(rec)return rec;return o.companyName||(o.investorOnly?L('Inversionista asignado','Assigned investor'):L('Administrador','Administrator'));}
// Opened details stay two short lines. Price stays on the toggle. Status and files stay out of this block.
function offerDetailsFold(p){
  if(!p)return '';
  const name=sellerName(p),at=p.offerAt||p.dueAt,lines=[];
  if(name)lines.push(`${L('Vendedor','Seller')}: <b>${esc(name)}</b>`);
  if(at)lines.push(`${L('Oferta inicial','Initial offer')}: ${esc(when(at))}`);
  if(!lines.length)return '';
  const amt=amountLine(p);
  return fold('odet-'+p.offerId,`<span class="lf-main"><b>${L('Detalles de la oferta','Offer details')}</b>${amt?`<small>${esc(amt)}</small>`:''}</span>`,`<p class="ops-meta">${lines.join('<br>')}</p>`,{cls:'oc-details'});
}
function offerCard(t,h,o){
  const p=o.pipeline;const live=!o.invalidatedAt&&!(p&&p.decision==='DENIED');
  const head=p&&p.invalidatedAt?`<div class="tour-warn">❌ <b>${L('Oferta anulada','Offer voided')}</b> · ${esc(when(p.offerAt))}${amountLine(p)?' · '+esc(amountLine(p)):''}</div>`:`<div class="tour-done">✅ <b>${L('Oferta enviada','Offer sent')}</b> · ${esc(when(p?p.offerAt:o.dueAt))}${p&&amountLine(p)?' · '+esc(amountLine(p)):''}</div>`;
  if(!p)return `<div class="tour-offer">${head}${ocBox(o.offerId,t.role)}</div>`;
  const ups=live&&t.role!=='ADMIN'?`<div class="tour-btns">${!p.depositProofAt?`<label class="btn-card">💵 ${L('Subir comprobante del depósito ($1,000)','Upload deposit proof ($1,000)')}<input type="file" hidden accept="image/*,application/pdf" data-tdep="${esc(h.id)}" data-toffer="${esc(o.offerId)}"></label>`:''}</div>`:'';
  const voidBox=p.invalidatedAt?(t.role==='AGENT'?`<div class="tour-btns"><button type="button" class="btn-card primary" data-tresume="${esc(o.offerId)}" data-tlid="${esc(h.id)}">🔄 ${L('Reanudar oferta','Resume offer')}</button><button type="button" class="btn-card btn-del" data-tarch="${esc(o.offerId)}">🗑️ ${L('Eliminar oferta','Delete offer')}</button></div><p class="ops-meta">${L('Reanudar abre la oferta para revisarla y enviarla de nuevo: vuelve al dueño como nueva, tiene que pre-aprobarla otra vez y los plazos y condiciones empiezan de cero.','Resume opens the offer so you can review it and send it again: it goes back to the owner as new, they must pre-approve it again, and the clocks and conditions start over.')}</p>`:`<p class="ops-meta">${L('Tu agente puede reanudarla o eliminarla.','Your agent can resume it or delete it.')}</p>`):'';
  const dl=offerDue(p),nx=offerNext(p);
  const sum=`<span class="lf-ico" aria-hidden="true">💰</span><span class="lf-main"><b>${L('Oferta','Offer')}${amountLine(p)?' · '+esc(money(p.amount&&p.amount.price)):''}</b><small>${nx}</small></span><span class="lf-tags">${offerChip(p,o)}${dl?cdSpan(dl):''}</span>`;
  const top=`<p class="oc-step-sum">${esc(stepBlurb(p,t.role))}</p>${offerDetailsFold(p)}`;
  if(p.invalidatedAt)return fold('offer-'+o.offerId,sum,`${top}${voidBox}${ocBox(o.offerId,t.role)}`,{cls:'tour-offer'+focusOffer(o.offerId),id:'offer-'+o.offerId,force:hashHas('offer='+o.offerId)});
  return fold('offer-'+o.offerId,sum,`${top}${counterBox(p,t.role)}<h4>${L('Próximos pasos','Next steps')}</h4>${checklist(p,t.role)}${ups}${closingFlowBox(p,t.role)}${ocBox(o.offerId,t.role)}`,{cls:'tour-offer'+focusOffer(o.offerId),id:'offer-'+o.offerId,force:hashHas('offer='+o.offerId)});
}
// v54: the deal (step summary, collapsible steps, per-buyer documents) inside the agent's Cuenta → Mis Ofertas row.
// Only the offer's own agent (the offer is in their tour data as AGENT) or Admin (seller view) get it; anyone else gets ''.
function dealBox(offerId){
  if(!S.user||!offerId)return '';
  const adm=!!(S.isAdmin&&S.isAdmin());if(!isAgent()&&!adm)return '';
  load(false);
  if(!data)return `<p class="ops-meta">⏳ ${L('Cargando el avance de la oferta…','Loading the offer progress…')}</p>`;
  let t=null,o=null;
  for(const tt of ((data.tours)||[]).concat(looseTours()))for(const oo of tt.offers||[])if(oo.offerId===offerId&&tt.role==='AGENT'&&oo.pipeline){t=tt;o=oo;}
  let p=o&&o.pipeline,role=p?'AGENT':'';
  if(!p&&adm){const so=((data.sellerOffers)||[]).find(x=>x.offerId===offerId);if(so){p=so;role='ADMIN';}}
  if(!p)return '';
  const btn=`<div class="tour-btns"><button type="button" class="btn-card" data-tgooffer="${esc(offerId)}">📂 ${L('Abrir el trato','Open the deal')}</button></div>`;
  if(p.invalidatedAt||p.decision==='DENIED')return `<div class="deal-box">${decisionLine(p)}</div>${btn}`;
  return `<div class="deal-box"><p class="oc-step-sum">${esc(stepBlurb(p,role))}</p>${offerDetailsFold(p)}${counterBox(p,role)}<h4>${L('Próximos pasos','Next steps')}</h4>${checklist(p,role)}${closingFlowBox(p,role)}</div>${btn}`;
}
function sellerSection(){
  const so=(data&&data.sellerOffers)||[];if(!so.length)return '';
  return `<section class="card tour-card"><h2>💰 ${S.isAdmin()?L('Ofertas de citas (vendedor / Admin)','Showing offers (seller / Admin)'):L('Ofertas en tus casas','Offers on your homes')}</h2>${so.map(p=>{
    const btns=p.invalidatedAt||p.decision==='DENIED'?'':!p.decision?(p.counter&&p.counter.status==='OPEN'?counterBox(p,'SELLER'):`${counterBox(p,'SELLER')}<div class="tour-btns"><button type="button" class="btn-card primary" data-tdecide="${esc(p.offerId)}" data-tdv="approve">✅ ${L('Pre-aprobar','Pre-approve')}</button><button type="button" class="btn-card" data-spctr="${esc(p.offerId)}">↩️ ${L('Contraofertar','Counter')}</button><button type="button" class="btn-card btn-del" data-tdecide="${esc(p.offerId)}" data-tdv="deny">✕ ${L('Negar','Deny')}</button></div>`)
      :p.decision==='PRE_APPROVED'?(()=>{const dep=p.depositProofAt&&!p.depositApprovedAt?`<button type="button" class="btn-card primary" data-tcond="${esc(p.offerId)}" data-tcw="deposit">✅ ${L('Aprobar depósito de $1,000','Approve $1,000 deposit')}</button>`:'';const wait=!p.depositProofAt&&!p.docsUploadedAt?`<span class="ops-meta">${L('Esperando el comprobante del depósito o los documentos.','Waiting for the deposit proof or the documents.')}</span>`:'';return dep||wait?`<div class="tour-btns">${dep}${wait}</div>`:'';})():'';
    const dl=offerDue(p);
    const sum=`<span class="lf-ico" aria-hidden="true">🏠</span><span class="lf-main"><b>${esc(p.address)}</b>${mapsBtn(p)}<small>${esc(money(p.amount&&p.amount.price))}${offerNext(p)?' · '+offerNext(p):''}</small></span><span class="lf-tags">${offerChip(p)}${dl?cdSpan(dl):''}</span>`;
    const role=S.isAdmin()?'ADMIN':'SELLER';
    const top=`<h3>${esc(p.address)}${p.city?', '+esc(p.city):''} ${mapsBtn(p)}</h3><p class="oc-step-sum">${esc(stepBlurb(p,role))}</p>${offerDetailsFold(p)}`;
    return fold('sell-'+p.offerId,sum,`${top}${btns}${checklist(p,role)}${closingFlowBox(p,role)}`,{cls:'tour-sell'+focusOffer(p.offerId),id:'offer-'+p.offerId,force:hashHas('offer='+p.offerId)||(!p.decision&&!(p.counter&&p.counter.status==='OPEN'))});}).join('')}</section>`;
}
function findOffer(id){for(const t of ((data&&data.tours)||[]).concat(addedTours(),looseTours()))for(const o of t.offers||[])if(o.offerId===id)return o;const so=((data&&data.sellerOffers)||[]).find(x=>x.offerId===id);return so?{offerId:id,pipeline:so}:null;}
function offerAlive(o){const p=o&&(o.pipeline||o);if(!o)return false;if(o.invalidatedAt||(p&&(p.invalidatedAt||p.decision==='DENIED'||p.archivedAt||p.dead)))return false;return true;}
function locateDealSync(id){
  id=String(id||'').trim();if(!id||!data)return null;
  if(findOffer(id))return {kind:'offer',id,seller:((data.sellerOffers)||[]).some(p=>p.offerId===id)};
  const tours=(data.tours||[]).concat(data.open||[]);
  if(tours.some(t=>t&&t.id===id))return {kind:'tour',tourId:id};
  const found=[];
  const push=(oid,alive)=>{if(oid)found.push({id:oid,alive:!!alive});};
  ((data.tours)||[]).concat(addedTours(),looseTours()).forEach(t=>(t.offers||[]).forEach(o=>{if(o&&(o.listingId===id||(o.pipeline&&o.pipeline.listingId===id)))push(o.offerId,offerAlive(o));}));
  (data.sellerOffers||[]).forEach(p=>{const lid=p.listingId||(p.home&&p.home.id)||'';if(lid===id)push(p.offerId,offerAlive(p));});
  (data.followedOffers||[]).forEach(f=>{if(f&&f.listingId===id)push(f.offerId,offerAlive(f));});
  if(found.length){const live=found.find(x=>x.alive)||found[0];return {kind:'offer',id:live.id,seller:((data.sellerOffers)||[]).some(p=>p.offerId===live.id)};}
  const tour=(data.tours||[]).find(t=>(t.homes||[]).some(h=>h.id===id));
  if(tour)return {kind:'tour',tourId:tour.id};
  const open=(data.open||[]).find(t=>(t.homes||[]).some(h=>h.id===id));
  if(open)return {kind:'tour',tourId:open.id};
  return null;
}
async function locateDeal(id){
  id=String(id||'').trim();if(!id||!S.user)return null;
  if(!data){
    try{await load(true);}catch(e){}
    if(!data)await new Promise(res=>{let n=0;const t=setInterval(()=>{if(data||lastErr||++n>40){clearInterval(t);res();}},100);});
  }
  if(!data&&lastErr)return {kind:'error',message:lastErr};
  return locateDealSync(id);
}
function clientDocsCard(){
  if(!isClient())return '';load(false);if(!data)return '';
  const rows=[];(data.tours||[]).filter(t=>t.role==='CLIENT').concat(addedTours()).forEach(t=>(t.offers||[]).forEach(o=>{const p=o.pipeline;if(!p||p.archivedAt||p.invalidatedAt||o.invalidatedAt||p.decision==='DENIED')return;const h=(t.homes||[]).find(x=>x.id===o.listingId)||{};rows.push({t,o,p,h});}));
  if(!rows.length)return '';
  rows.sort((x,y)=>(x.p.docsApprovedAt?1:0)-(y.p.docsApprovedAt?1:0)); // offers still needing documents first
  return `<div class="card tour-card" style="padding:16px" id="offer-docs"><h2>📂 ${L('Documentos de tu oferta','Your offer documents')}</h2><p class="ops-meta">${L('Para la sección 1 “Entregar documentos” se necesitan los dos: tu identificación y tus comprobantes de ingreso.','Step 1 “Deliver the documents” needs both: your ID and your proof of income.')}</p>${rows.map(r=>`<div class="ds-offer"><h3>🏠 ${shownHome(r.h)}</h3>${docSlotsBox(r.p,'CLIENT')}<button type="button" class="btn-card" data-tgooffer="${esc(r.o.offerId)}">${L('Ver todos los pasos','See all steps')}</button></div>`).join('')}</div>`;
}
/* ---------- events ---------- */
async function act(fn){if(busy)return;busy=true;try{await fn();}catch(e){alert(e.message||String(e));}finally{busy=false;}}
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('[data-tdocdel],[data-tdocres],[data-tgooffer],[data-tctr],[data-tcart],[data-tbook],[data-tcartdel],[data-tgo],[data-taccept],[data-tmove],[data-tauto],[data-tics],[data-tcancel],[data-tchat],[data-tfbopen],[data-tofferfor],[data-tdecline],[data-tmore],[data-task],[data-tprop],[data-tpans],[data-tdecide],[data-tcond],[data-tflow],[data-ttrr],[data-ttrrd],[data-tclchg],[data-tresume],[data-tarch],[data-tdocrej]');if(!t)return;
  const d=t.dataset;
  if(d.tresume){openResume(d.tresume);return;}
  if(d.tarch){if(!confirm(L('¿Eliminar esta oferta? Se quita de tu lista (queda en el historial).','Delete this offer? It is removed from your list (it stays in the history).')))return;act(async()=>{await call('tour_offer_archive',{offerId:d.tarch});await load(true);});return;}
  if(d.tofferfor){setTimeout(()=>load(true),6000);setTimeout(()=>load(true),15000);return;} // existing offer popup opens; refresh to show the 12-hour clock
  e.preventDefault();e.stopPropagation();
  if((d.tcart||d.tbook)&&!S.user){document.querySelectorAll('.modal-backdrop,.lof-pop-bg').forEach(x=>x.remove());return UI().go('auth');}
  if(d.tcart){if(inCart(d.tcart)){removeFromCart(d.tcart);}else addToCart(d.tcart);return rerender();}
  if(d.tbook){if(addToCart(d.tbook)){document.querySelectorAll('.modal-backdrop,.drawer-bg,.lof-pop-bg').forEach(x=>x.remove());UI().go('tours');setTimeout(()=>{const f=document.querySelector('#tourReqF [name=date]');if(f){f.scrollIntoView({behavior:'smooth',block:'center'});f.focus();}},120);}return;}
  if(d.tgooffer){const h='tours&offer='+encodeURIComponent(d.tgooffer);scrolledTo='';if(location.hash==='#'+h){if(window.LegacyUI&&LegacyUI.focusDeal)LegacyUI.focusDeal(true);return;}location.hash=h;return;}
  if(d.tgo){document.querySelectorAll('.modal-backdrop').forEach(x=>x.remove());return UI().go('tours');}
  if(d.tcartdel){removeFromCart(d.tcartdel);return rerender();}
  if(d.taccept)return act(async()=>{const r=await call('tour_accept',{tourId:d.taccept});await load(true);if(r&&r.merged){location.hash='tours&tour='+r.mergedInto;return alert(L('¡Aprobada! Las casas se agregaron a la ruta que ya tenían ese día y se reordenó por distancia. Pueden editar el orden.','Approved! The homes were added to your existing route that day and re-sorted by distance. You can both edit the order.'));}alert(L('¡Listo! La cita es tuya. Ya puedes ver los datos del cliente, llamarle o escribirle en la app.','Done! The showing is yours. You can now see the client’s info, call or message them in the app.'));});
  if(d.tmove)return act(async()=>{const tour=data.tours.find(x=>x.id===d.tmove);if(!tour)return;const ids=tour.homes.map(h=>h.id),i=+d.tidx,j=i+(+d.tdir);if(j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];await call('tour_route_save',{tourId:tour.id,order:ids});await load(true);});
  if(d.task){const [tid,lid]=d.task.split('|');const tour=data.tours.find(x=>x.id===tid);const h=tour&&tour.homes.find(x=>x.id===lid);if(tour&&h)openAsk(tour,h);return;}
  if(d.tdecline){const reason=prompt(L('¿Por qué no puedes? (opcional; el cliente lo verá)','Why can’t you? (optional; the client will see it)'),'');if(reason===null)return;return act(async()=>{await call('tour_decline',{tourId:d.tdecline,reason});await load(true);});}
  if(d.tmore){const tour=data.tours.find(x=>x.id===d.tmore);if(!tour)return;const end=new Date(tour.endsAt||tour.startsAt);const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(end);const g={};p.forEach(x=>g[x.type]=x.value);let mins=Math.ceil((+g.hour*60+(+g.minute))/30)*30;mins=Math.min(Math.max(mins,9*60),19*60);form.date=`${g.year}-${g.month}-${g.day}`;form.time=String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
    if(!cart().length){alert(L('Agrega al carrito las casas extra y luego toca “Enviar a mi agente”. Ya dejamos lista la fecha de ese día.','Add the extra homes to your cart, then tap “Send to my agent”. The date for that day is already filled in.'));return UI().go('inventory');}
    rerender();setTimeout(()=>{const f=document.getElementById('tour-cart');if(f)f.scrollIntoView({behavior:'smooth'});},80);return;}
  if(d.tauto)return act(async()=>{await call('tour_route_save',{tourId:d.tauto,auto:true});await load(true);});
  if(d.tics){const tour=data.tours.find(x=>x.id===d.tics);if(tour)icsFor(tour);return;}
  if(d.tprop){const tour=data.tours.find(x=>x.id===d.tprop);if(tour)openPropose(tour);return;}
  if(d.tpans){if(d.tpv!=='1'&&!confirm(L('¿Rechazar el cambio? La cita se queda en la hora original y le avisamos al cliente.','Decline the change? The showing keeps the original time and we let the client know.')))return;return act(async()=>{try{await call('tour_proposal_answer',{tourId:d.tpans,pid:d.tpid||undefined,accept:d.tpv==='1'});}catch(err){await load(true);throw err;}await load(true);alert(d.tpv==='1'?L('Listo. La cita quedó con la nueva hora; le avisamos al cliente y al vendedor.','Done. The showing has the new time; we let the client and the seller know.'):L('Listo. La cita se queda en la hora original; le avisamos al cliente.','Done. The showing keeps the original time; we let the client know.'));});}
  if(d.tdecide){const ok=d.tdv==='approve';const note=ok?'':prompt(L('¿Por qué la niegas? (opcional; el agente y el cliente lo verán)','Why are you denying it? (optional; the agent and client will see it)'),'');if(note===null)return;if(ok&&!confirm(L('¿Pre-aprobar esta oferta?','Pre-approve this offer?')))return;return act(async()=>{await call('tour_offer_decide',{offerId:d.tdecide,decision:d.tdv,note:note||''});await load(true);});}
  if(d.tflow){if(d.tflow==='inspection_request'&&!confirm(L('¿Pedir inspección para esta casa?','Request an inspection for this home?')))return;return act(async()=>{await call('tour_offer_flow',{offerId:d.toffer,op:d.tflow});await load(true);});}
  if(d.ttrr){const m=sheet(`<h3>🛠️ ${L('Negociar TRR','Negotiate TRR')}</h3><p class="ops-meta">${L('Escribe todo lo que el comprador pide al vendedor reparar, reemplazar o tratar.','Write everything the buyer asks the seller to repair, replace or treat.')}</p><form class="tour-form" id="tourTrrF"><textarea name="text" rows="7" maxlength="4000" required placeholder="${esc(L('Ej.: Reparar fuga del baño principal; reemplazar calentador de agua; tratar termitas en la cochera.','E.g.: Fix the main bathroom leak; replace the water heater; treat termites in the garage.'))}"></textarea><div class="tour-btns"><button type="submit" class="btn-card primary">📨 ${L('Enviar al vendedor','Send to the seller')}</button></div></form>`);
    m.querySelector('#tourTrrF').addEventListener('submit',ev=>{ev.preventDefault();const text=ev.target.text.value.trim();act(async()=>{await call('tour_offer_flow',{offerId:d.ttrr,op:'trr_submit',text});m.remove();await load(true);});});return;}
  if(d.ttrrd){let text='';if(d.tdv!=='accept'){text=prompt(d.tdv==='counter'?L('Escribe tu contraoferta (qué sí reparas, qué no, o un crédito):','Write your counteroffer (what you will repair, what not, or a credit):'):L('Razón (opcional; el agente y el cliente la verán):','Reason (optional; the agent and client will see it):'),'');if(text===null)return;}
    return act(async()=>{await call('tour_offer_flow',{offerId:d.ttrrd,op:'trr_decide',decision:d.tdv,text});await load(true);});}
  if(d.tclchg){const m=sheet(`<h3>📅 ${L('Proponer otra fecha de cierre','Propose another closing date')}</h3><form class="tour-form" id="tourClF"><fieldset class="tour-reasons"><legend><b>${L('¿Por qué no te queda? (obligatorio)','Why doesn’t it work? (required)')}</b></legend>${CLOSING_REASONS.map(r=>`<label class="tour-reason"><input type="radio" name="code" value="${r[0]}" required> ${esc(L(r[1],r[2]))}</label>`).join('')}</fieldset><label class="tour-other" hidden>${L('Escribe la razón','Write the reason')}<textarea name="rtext" rows="2" maxlength="500"></textarea></label><label>${L('Nueva fecha','New date')}<input type="date" name="date" min="${chicagoDay(new Date())}" required></label><label>${L('Hora','Time')}<select name="time">${timeOptions('10:00')}</select></label><p class="ops-meta">${L('Las aprobaciones se reinician hasta que todos estén de acuerdo.','Approvals reset until everyone agrees.')}</p><div class="tour-btns"><button type="submit" class="btn-card primary">📨 ${L('Proponer','Propose')}</button></div></form>`);
    const f=m.querySelector('#tourClF'),oth=f.querySelector('.tour-other');f.addEventListener('change',()=>{oth.hidden=f.code.value!=='OTHER';f.rtext.required=f.code.value==='OTHER';});
    f.addEventListener('submit',ev=>{ev.preventDefault();const v=Object.fromEntries(new FormData(f));act(async()=>{await call('tour_offer_flow',{offerId:d.tclchg,op:'closing_propose',when:`${v.date}T${v.time}`,reasonCode:v.code,reasonText:v.code==='OTHER'?(v.rtext||''):''});m.remove();await load(true);});});return;}
  if(d.tdocdel){if(!confirm(L('¿Eliminar este archivo de los documentos del comprador?','Remove this file from the buyer’s documents?')+(d.tdname?'\n'+d.tdname:'')+'\n'+L('Se puede restaurar después.','It can be restored later.')))return;return act(async()=>{await call('tour_offer_doc_remove',{offerId:d.toffer,docId:d.tdocdel});await load(true);});}
  if(d.tdocres){return act(async()=>{await call('tour_offer_doc_restore',{offerId:d.toffer,docId:d.tdocres});await load(true);});}
  if(d.tdocrej){const note=prompt(L('¿Qué debe corregir el comprador? (lo verá el cliente y su agente)','What should the buyer fix? (the client and their agent will see it)'),'');if(note===null)return;return act(async()=>{await call('tour_offer_docs_reject',{offerId:d.tdocrej,note});await load(true);});}
  if(d.tcond)return act(async()=>{await call('tour_offer_condition',{offerId:d.tcond,which:d.tcw});await load(true);});
  if(d.tctr){const ok=d.tca==='accept';const note=ok?'':prompt(L('¿Por qué la rechazas? (opcional; el dueño lo verá)','Why are you declining? (optional; the owner will see it)'),'');if(note===null)return;if(ok&&!confirm(L('¿Aceptar la contraoferta? Empiezan los plazos: 12 h documentos y 72 h depósito.','Accept the counteroffer? The clocks start: 12 h documents and 72 h deposit.')))return;return act(async()=>{await call('tour_offer_counter_answer',{offerId:d.tctr,answer:ok?'accept':'decline',note});await load(true);});}
  if(d.tcancel){const tour=data.tours.find(x=>x.id===d.tcancel);if(tour)openCancel(tour);return;}
  if(d.tchat){if(S.msgEnabled&&!S.msgEnabled()){alert(L('Los mensajes no están disponibles ahora.','Messages are not available right now.'));return;}return UI().openChat(d.tchat,d.tname);}
  if(d.tfbopen){fbOpen[d.tfbopen]=true;return rerender();}
},true);
document.addEventListener('submit',e=>{
  const f=e.target;
  if(f&&f.id==='tourReqF'){e.preventDefault();const v=Object.fromEntries(new FormData(f));form={date:v.date,time:v.time,notes:v.notes||''};
    const ids=cart();if(!ids.length)return;
    if(!connectedAgent()&&ids.length>MAX)return alert(limitText());
    const at=new Date(`${v.date}T${v.time}:00`);if(isNaN(at.getTime()))return alert(L('Elige fecha y hora.','Pick a date and time.'));
    return act(async()=>{try{await call('tour_request',{listingIds:ids,startsAt:`${v.date}T${v.time}`,notes:v.notes||''});}catch(er){if(er.code==='agent_busy')return busySheet(er.message);throw er;}setCart([]);form={date:'',time:'10:00',notes:''};await load(true);alert(connectedAgent()?L('¡Enviada a tu agente! Te avisamos cuando la apruebe o la rechace.','Sent to your agent! We will let you know when they approve or decline it.'):L('¡Cita solicitada! Les avisamos a los agentes con licencia; te llegará una notificación cuando uno la acepte.','Showing requested! We notified licensed agents; you will get a notification when one accepts.'));});}
  if(f&&f.dataset&&f.dataset.tflowf){e.preventDefault();const v=Object.fromEntries(new FormData(f));return act(async()=>{await call('tour_offer_flow',{offerId:f.dataset.toffer,op:f.dataset.tflowf,when:`${v.date}T${v.time}`});await load(true);});}
  if(f&&f.dataset&&f.dataset.texp){e.preventDefault();const v=Object.fromEntries(new FormData(f));return act(async()=>{await call('tour_offer_flow',{offerId:f.dataset.texp,op:'experience',text:v.text||''});await load(true);alert(L('¡Gracias por tus comentarios!','Thank you for your comments!'));});}
  const fb=f&&f.dataset&&f.dataset.tfbform;
  if(fb){e.preventDefault();const [tourId,listingId]=fb.split('|');const v=Object.fromEntries(new FormData(f));
    return act(async()=>{const r=await call('tour_feedback',{tourId,listingId,rating:Number(v.rating)||null,interest:v.interest||'',comments:v.comments||''});delete fbOpen[fb];await load(true);alert(L('¡Gracias! Tus comentarios ya se enviaron.','Thank you! Your feedback was sent.'));});}
},true);
document.addEventListener('change',e=>{
  const t=e.target;
  if(t&&t.form&&t.form.id==='tourReqF'){const v=Object.fromEntries(new FormData(t.form));form={date:v.date,time:v.time,notes:v.notes||''};return;}
  if(t&&t.dataset&&t.dataset.tupt&&t.files&&t.files[0]){act(async()=>{await S.uploadDocument(t.files[0],{docType:t.dataset.tupt,listingId:t.dataset.tlid,offerId:t.dataset.toffer});await load(true);alert(L('Archivo subido.','File uploaded.'));});return;}
  if(t&&t.dataset&&t.dataset.tdep&&t.files&&t.files[0]){act(async()=>{await S.uploadDocument(t.files[0],{docType:'DEPOSIT_PROOF',listingId:t.dataset.tdep,offerId:t.dataset.toffer});await load(true);alert(L('Comprobante subido. El vendedor lo revisará.','Proof uploaded. The seller will review it.'));});return;}
  if(t&&t.dataset&&t.dataset.tslot&&t.files&&t.files.length){const files=[...t.files],slot=t.dataset.tslot,repl=t.dataset.trepl==='1';act(async()=>{for(let i=0;i<files.length;i++){await S.uploadDocument(files[i],{docType:slot==='ID'?'OFFER_ID':'OFFER_INCOME',listingId:t.dataset.tlid,offerId:t.dataset.toffer,replace:repl&&i===0,forUserId:t.dataset.tfor||''});}await load(true);const o=findOffer(t.dataset.toffer),p=o&&o.pipeline;alert(p&&p.docsUploadedAt?L('¡Listo! ID y comprobantes completos: la sección 1 pasó a En revisión.','Done! ID and proof of income complete: step 1 is now In review.'):L('Archivo subido. Falta','File uploaded. Still missing')+': '+((p&&p.docsMissing)||[]).map(k=>L(...SLOT_LBL[k])).join(L(' y ',' and ')));});return;}
  if(t&&t.dataset&&t.dataset.tdoc&&t.files&&t.files[0]){act(async()=>{await S.uploadDocument(t.files[0],{docType:'OFFER_DOCS',listingId:t.dataset.tdoc,offerId:t.dataset.toffer});await load(true);alert(L('Documento subido.','Document uploaded.'));});}
},true);

/* ---------- "Mi agente" (client account): connected agent card + homes seen together + homes under contract ---------- */
const DONE_ST=['APPROVED','DONE','NA','ACCEPTED','WAIVED'],DONE_STRICT=['APPROVED','DONE','NA']; /* v39 E2E: an accepted/waived TRR is a finished step (an agreed closing date is not: the closing day is still ahead); 'closed' needs the strict set */
function offerStep(p){
  if(!p)return L('Oferta enviada','Offer sent');
  if(p.dealClosedAt||p.tableStatus==='CLOSED'||(p.checklist||[]).every(c=>DONE_STRICT.includes(c.status)))return '🎉 '+DONE_WORD(p);
  if(!p.decision)return '⏳ '+L('Oferta enviada — esperando la pre-aprobación del dueño','Offer sent — waiting for the owner’s pre-approval');
  const c=(p.checklist||[]).find(x=>!DONE_ST.includes(x.status));if(!c)return '';
  const st=c.key==='DOCS'&&c.status==='SUBMITTED'?DOCS_REVIEW:(STATUS_LABEL[c.status]||STATUS_LABEL.PENDING);
  return `${st[2]} ${L('Paso','Step')} ${c.n}/${TOT(p)}: ${L(...STEP_LABEL[c.key])} — ${L(st[0],st[1])}`;
}
const fmtPhone=v=>{const d=String(v||'').replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'');return d.length===10?`(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`:String(v||'');};
function agentContact(a){const tel=String(a.phone||'').replace(/[^\d+]/g,'');
  return `<div class="tour-btns">${tel?`<a class="btn-card primary" href="tel:${esc(tel)}">📞 ${L('Llamar','Call')}</a><a class="btn-card" href="sms:${esc(tel)}">💬 ${L('Escribir (SMS)','Text (SMS)')}</a>`:''}${a.id?`<button type="button" class="btn-card" data-tchat="${esc(a.id)}" data-tname="${esc(a.name||'')}">✉️ ${L('Escribir en la app','Message in app')}</button>`:''}</div>`;}
function agentView(){
  if(!S.user)return `<section class="card tour-card"><p>${L('Inicia sesión para ver a tu agente.','Sign in to see your agent.')}</p></section>`;
  load(false);
  const head=`<div class="tour-wrap"><h2 class="ma-title">🤝 ${L('Mi agente','My agent')}</h2>`;
  if(!data&&!lastErr)return head+`<p style="padding:18px">${L('Cargando…','Loading…')}</p></div>`;
  const a=(data&&data.connectedAgent)||connectedAgent();
  if(!a)return head+`<section class="card tour-card ma-empty"><div class="ma-empty-i" aria-hidden="true">🤝</div><h3>${L('Aún no tienes un agente','You don’t have an agent yet')}</h3>
   <p>${L('Todavía no tienes agente. Puedes ver casas, guardar favoritas y pedir una cita: se avisa a los agentes con licencia en regla, y el primero que acepte será tu agente. Si ya tienes un código (D2D-XXXXXX), escríbelo aquí.','You don’t have an agent yet. You can browse homes, save favorites and request a showing: licensed agents in good standing are notified, and the first to accept becomes your agent. If you already have a code (D2D-XXXXXX), type it here.')}</p>
   ${codeFormHtml('tourCodeF')}
   <div class="tour-btns"><button type="button" class="btn-card" data-tab="inventory">🏠 ${L('Ver casas','See homes')}</button><button type="button" class="btn-card primary" data-tab="tours">📅 ${L('Pedir una cita','Request a showing')}</button></div></section></div>`;
  const nowMs=Date.now();
  const mine=((data&&data.tours)||[]).filter(t=>t.role==='CLIENT'&&t.agent&&t.agent.id===a.id);
  const seen=new Map();
  // Seen together = homes of a completed/accepted showing whose time has passed, or a home that already has feedback or an offer from that showing.
  mine.filter(t=>['ACCEPTED','COMPLETED'].includes(t.status)).forEach(t=>{const past=t.status==='COMPLETED'||new Date(t.startsAt).getTime()<=nowMs;(t.homes||[]).forEach(h=>{if(h.missing)return;if(!past&&!(t.offers||[]).some(o=>o.listingId===h.id)&&!(t.feedback||[]).some(f=>f.listingId===h.id))return;const o=seen.get(h.id);if(!o||o.at<t.startsAt)seen.set(h.id,{h,at:t.startsAt,tourId:t.id});});});
  const seenL=[...seen.values()].sort((x,y)=>String(y.at).localeCompare(String(x.at)));
  const next=mine.filter(t=>['REQUESTED','ACCEPTED'].includes(t.status)&&new Date(t.startsAt).getTime()>nowMs).sort((x,y)=>String(x.startsAt).localeCompare(String(y.startsAt)))[0];
  const deals=[];mine.forEach(t=>(t.offers||[]).forEach(o=>{const p=o.pipeline;if(o.invalidatedAt||(p&&(p.invalidatedAt||p.decision==='DENIED'||p.archivedAt)))return;const h=(t.homes||[]).find(x=>x.id===o.listingId)||{id:o.listingId};deals.push({h,o,p});}));
  const isClosed=x=>offerStep(x.p).startsWith('🎉');const closed=deals.filter(isClosed);deals.splice(0,deals.length,...deals.filter(x=>!isClosed(x)));
  const homeTxt=h=>`${esc(h.address||'')}${h.city?', '+esc(h.city):''}`;
  const img=h=>`<img src="${esc(h.photo||'listing-placeholder.svg')}" alt="">`;
  const day=iso=>{try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric'}).format(new Date(iso));}catch(e){return '';}};
  return head+`<section class="card tour-card ma-agent"><div class="tour-person"><img class="tour-avatar ma-avatar" src="${esc(a.avatarUrl||'legacy-logo.png')}" alt=""><div><b class="ma-name">${esc(a.name||'')}</b>
    ${a.brokerage?`<div class="ops-meta">🏢 ${esc(a.brokerage)}</div>`:''}${a.licenseNumber?`<div class="ops-meta">🪪 ${L('Licencia OREC','OREC license')} ${esc(a.licenseState||'OK')} #${esc(a.licenseNumber)}</div>`:''}
    <div class="ops-meta">${a.phone?`📞 ${esc(fmtPhone(a.phone))}`:''}${a.email?` · ✉️ ${esc(a.email)}`:''}</div></div></div>
    ${a.bio?`<p class="tour-bio">${esc(a.bio)}</p>`:''}${agentContact(a)}
     <div class="tour-btns"><button type="button" class="btn-card" data-tremoveagent="1">🚪 ${L('Quitar a mi agente','Remove my agent')}</button></div>
    ${next?`<p class="tour-done">📅 ${L('Próxima cita','Next showing')}: <b>${esc(when(next.startsAt))}</b> · ${next.homes.length} ${next.homes.length===1?L('casa','home'):L('casas','homes')} <button type="button" class="btn-card" data-tab="tours">${L('Ver','View')}</button></p>`:''}</section>
   <section class="card tour-card"><h3>👀 ${L('Casas vistas juntos','Homes we saw together')} <small>(${seenL.length})</small></h3>
    ${seenL.length?`<ul class="tour-cart ma-list">${seenL.map(x=>`<li class="tour-cart-item">${img(x.h)}<span><a href="#" data-open="${esc(x.h.id)}"><b>${homeTxt(x.h)}</b></a>${mapsBtn(x.h)}<br><small>📅 ${esc(day(x.at))}</small></span></li>`).join('')}</ul>`:`<p class="ops-meta">${L('Todavía no han visto casas juntos. Cuando tengas una cita con tu agente, las casas aparecen aquí.','You haven’t seen homes together yet. After a showing with your agent, the homes show up here.')}</p><button type="button" class="btn-card primary" data-tab="tours">🛒 ${L('Pedir una cita','Request a showing')}</button>`}</section>
   <section class="card tour-card"><h3>📝 ${L('Casas bajo contrato','Homes under contract')} <small>(${deals.length})</small></h3>
    ${deals.length?`<ul class="tour-cart ma-list">${deals.map(x=>`<li class="tour-cart-item">${img(x.h)}<span><a href="#" data-open="${esc(x.h.id)}"><b>${homeTxt(x.h)}</b></a>${mapsBtn(x.h)}<br><small>${esc(offerStep(x.p))}</small>${x.p&&amountLine(x.p)?`<br><small>${esc(amountLine(x.p))}</small>`:''}</span><button type="button" class="btn-card" data-tgooffer="${esc(x.o.offerId)}">${L('Ver pasos','See steps')}</button></li>`).join('')}</ul>`:`<p class="ops-meta">${L('No tienes ofertas activas con tu agente. Cuando tu agente haga una oferta por ti, verás aquí en qué paso va hasta el cierre.','No active offers with your agent. When your agent makes an offer for you, you’ll see its step here until closing.')}</p>`}
    ${closed.length?`<h4>🎉 ${L('Cerradas con tu agente','Closed with your agent')} (${closed.length})</h4><ul class="tour-cart ma-list">${closed.map(x=>`<li class="tour-cart-item">${img(x.h)}<span><a href="#" data-open="${esc(x.h.id)}"><b>${homeTxt(x.h)}</b></a>${mapsBtn(x.h)}<br><small>${esc(offerStep(x.p))}</small></span><button type="button" class="btn-card" data-tgooffer="${esc(x.o.offerId)}">${L('Ver','View')}</button></li>`).join('')}</ul>`:''}</section></div>`;
}

/* ---------- Agent dashboard ("Panel"): KPIs, today, action required, offers, under contract, next 7 days ---------- */
const DASH_DEAD=p=>!!(p&&(p.invalidatedAt||p.decision==='DENIED'||p.archivedAt));
function cdText(ms){if(!Number.isFinite(ms))return '';const left=ms-Date.now();if(left<=0)return L('vencido','overdue');const d=Math.floor(left/864e5),h=Math.floor(left%864e5/36e5),m=Math.floor(left%36e5/6e4);return d?L(`quedan ${d} d ${h} h`,`${d} d ${h} h left`):h?L(`quedan ${h} h ${m} min`,`${h} h ${m} min left`):L(`quedan ${m} min`,`${m} min left`);}
const cdSpan=(iso,cls)=>{const t=new Date(iso).getTime();if(!Number.isFinite(t))return '';const left=t-Date.now();return `<span class="ad-cd${left<=0?' late':left<6*36e5?' hot':''}${cls?' '+cls:''}" data-adcd="${t}">⏱ ${esc(cdText(t))}</span>`;};
const timeOf=iso=>{try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'}).format(new Date(iso));}catch(e){return '';}};
const shortDay=iso=>{try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric'}).format(new Date(iso));}catch(e){return '';}};
const telOf=p=>p&&p.phone?String(p.phone).replace(/[^\d+]/g,''):'';
const firstName=p=>esc(String((p&&p.name)||L('Cliente','Client')).trim());
function nextStepOf(p){const c=(p&&p.checklist||[]).find(x=>!DONE_ST.includes(x.status));return c?{n:c.n,label:L(...STEP_LABEL[c.key]),st:c.key==='DOCS'&&c.status==='SUBMITTED'?DOCS_REVIEW:(STATUS_LABEL[c.status]||STATUS_LABEL.PENDING)}:null;}
function dashData(){
  const now=Date.now(),today=chicagoDay(new Date()),mon=today.slice(0,7);
  const tours=((data&&data.tours)||[]).filter(t=>t.role==='AGENT');
  const clients=new Map(),offers=[],contract=[],closed=[],actions=[];
  const touch=(c,patch)=>{if(!c||!c.id)return;const x=clients.get(c.id)||{c,last:null,next:null,deals:0,showings:0};Object.assign(x,patch(x));clients.set(c.id,x);};
  tours.forEach(t=>{
    const st=new Date(t.startsAt).getTime(),dead=['CANCELLED','EXPIRED','DECLINED'].includes(t.status);
    if(!dead&&t.client){const fut=st>now&&['REQUESTED','ACCEPTED'].includes(t.status),recent=st<=now&&now-st<30*864e5&&['ACCEPTED','COMPLETED'].includes(t.status);
      if(fut||recent)touch(t.client,x=>({showings:x.showings+1,next:fut&&(!x.next||t.startsAt<x.next)?t.startsAt:x.next,last:!fut&&(!x.last||t.startsAt>x.last)?t.startsAt:x.last}));}
    if(t.direct&&t.status==='REQUESTED')actions.push({due:st,rank:1,icon:'📨',title:L(`${firstName(t.client)} pidió una cita`,`${firstName(t.client)} requested a showing`),sub:`${esc(when(t.startsAt))} · ${t.homes.length} ${t.homes.length===1?L('casa','home'):L('casas','homes')}`,btns:`<button type="button" class="btn-card primary" data-taccept="${esc(t.id)}">✅ ${L('Aprobar','Approve')}</button><button type="button" class="btn-card" data-adtour="${esc(t.id)}">${L('Ver','View')}</button>`});
    if(t.proposal)actions.push({due:new Date(t.proposal.startsAt).getTime(),rank:1,icon:'🔁',title:L(`${firstName(t.client)} pide cambiar la hora`,`${firstName(t.client)} asks to change the time`),sub:`${esc(when(t.proposal.from||t.startsAt))} → <b>${esc(when(t.proposal.startsAt))}</b>`,btns:`<button type="button" class="btn-card primary" data-tpans="${esc(t.id)}" data-tpv="1" data-tpid="${esc(t.proposal.pid||'')}">✅ ${L('Aprobar','Approve')}</button><button type="button" class="btn-card" data-adtour="${esc(t.id)}">${L('Revisar','Review')}</button>`});
    if(t.feedbackDue&&!dead){const miss=t.homes.filter(h=>!h.missing&&!(t.offers||[]).some(o=>o.listingId===h.id)&&!(t.feedback||[]).some(f=>f.listingId===h.id));
      if(miss.length)actions.push({due:st+48*36e5,rank:4,icon:'📝',title:L(`Comentarios o oferta pendientes (${miss.length} ${miss.length===1?'casa':'casas'})`,`Feedback or offer missing (${miss.length} ${miss.length===1?'home':'homes'})`),sub:`${firstName(t.client)} · ${esc(shortDay(t.startsAt))} · ${miss.slice(0,2).map(shownHome).join(' · ')}${miss.length>2?' …':''}`,btns:`<button type="button" class="btn-card primary" data-adtour="${esc(t.id)}">💰 ${L('Comentar u ofertar','Feedback or offer')}</button>`});}
    (t.offers||[]).forEach(o=>{const p=o.pipeline,h=t.homes.find(x=>x.id===o.listingId)||{id:o.listingId},row={t,o,p,h,c:t.client};
      if(p&&p.archivedAt)return;
      if(o.invalidatedAt||(p&&p.invalidatedAt)){actions.push({due:now+6*36e5,rank:3,icon:'❌',title:L('Oferta anulada: decide qué hacer','Voided offer: decide what to do'),sub:`${shownHome(h)} · ${firstName(t.client)}`,btns:`<button type="button" class="btn-card primary" data-tresume="${esc(o.offerId)}" data-tlid="${esc(h.id)}">🔄 ${L('Reanudar','Resume')}</button><button type="button" class="btn-card btn-del" data-tarch="${esc(o.offerId)}">🗑️ ${L('Eliminar','Delete')}</button>`});return;}
      if(p&&p.decision==='DENIED')return;
      if(offerStep(p).startsWith('🎉')){closed.push(row);touch(t.client,x=>({}));return;}
      touch(t.client,x=>({deals:x.deals+1}));
      const go=`<button type="button" class="btn-card" data-tgooffer="${esc(o.offerId)}">${L('Abrir','Open')}</button>`;
      if(!p&&!o.docsUploadedAt&&o.dueAt)actions.push({due:new Date(o.dueAt).getTime(),rank:2,icon:'📎',title:L('Subir documentos de la oferta (12 h)','Upload the offer documents (12 h)'),sub:`${shownHome(h)} · ${firstName(t.client)}`,cd:o.dueAt,btns:go});
      if(p&&p.decision==='PRE_APPROVED'&&!p.docsUploadedAt&&p.docsDueAt){const miss=(p.docsMissing||['ID','INCOME']).map(k=>L(...SLOT_LBL[k]));actions.push({due:new Date(p.docsDueAt).getTime(),rank:2,icon:'📎',title:L('Documentos del comprador (12 h)','Buyer documents (12 h)')+(p.docsRejectedAt?' · ↩️ '+L('corregir','fix'):''),sub:`${shownHome(h)} · ${firstName(t.client)} · ${L('Falta','Missing')}: <b>${esc(miss.join(L(' y ',' and ')))}</b>`,cd:p.docsDueAt,btns:go});}
      if(p&&p.decision==='PRE_APPROVED'&&!p.depositProofAt&&p.depositDueAt)actions.push({due:new Date(p.depositDueAt).getTime(),rank:2,icon:'💵',title:L('Comprobante del depósito de $1,000 (72 h)','$1,000 deposit proof (72 h)'),sub:`${shownHome(h)} · ${firstName(t.client)}`,cd:p.depositDueAt,btns:go});
      if(p&&p.trr&&p.trr.status==='COUNTERED')actions.push({due:now+36e5,rank:2,icon:'↩️',title:L('El vendedor hizo una contraoferta (TRR)','The seller countered (TRR)'),sub:`${shownHome(h)}${p.trr.counterText?' · “'+esc(String(p.trr.counterText).slice(0,80))+'”':''}`,btns:go});
      if(p&&p.underContract)contract.push(row);else offers.push(row);
    });
  });
  (data&&data.open||[]).forEach(t=>actions.push({due:new Date(t.startsAt).getTime(),rank:2,icon:'🔔',title:L(`Cliente nuevo: quiere ver ${t.count} ${t.count===1?'casa':'casas'}`,`New client: wants to see ${t.count} ${t.count===1?'home':'homes'}`),sub:`${esc(when(t.startsAt))} · ${t.homes.slice(0,2).map(shownHome).join(' · ')}${t.homes.length>2?' …':''}`,btns:`<button type="button" class="btn-card primary" data-taccept="${esc(t.id)}">✅ ${L('Aceptar cita','Accept showing')}</button>`}));
  const soon=x=>x.due-now<24*36e5?0:1;actions.sort((a,b)=>(soon(a)-soon(b))||(a.due-b.due)||(a.rank-b.rank));
  const live=t=>['REQUESTED','ACCEPTED','COMPLETED'].includes(t.status);
  const todayT=tours.filter(t=>live(t)&&dayOf(t.startsAt)===today).sort((a,b)=>String(a.startsAt).localeCompare(String(b.startsAt)));
  const week=tours.filter(t=>['REQUESTED','ACCEPTED'].includes(t.status)&&dayOf(t.startsAt)>today&&new Date(t.startsAt).getTime()<now+7*864e5).sort((a,b)=>String(a.startsAt).localeCompare(String(b.startsAt)));
  const allOffers=tours.flatMap(t=>(t.offers||[]).map(o=>({t,o})));
  const stats={showings:tours.filter(t=>['ACCEPTED','COMPLETED'].includes(t.status)&&dayOf(t.startsAt).slice(0,7)===mon&&new Date(t.startsAt).getTime()<=now).length,offers:allOffers.filter(x=>dayOf((x.o.pipeline&&x.o.pipeline.offerAt)||x.o.dueAt||'').slice(0,7)===mon).length,closed:closed.length};
  return {clients:[...clients.values()].sort((a,b)=>String(a.next||'9').localeCompare(String(b.next||'9'))||String(b.last||'').localeCompare(String(a.last||''))),todayT,week,actions,offers,contract,closed,stats};
}
function dealDeadline(r){const p=r.p,o=r.o;const c=[];if(!p&&!o.docsUploadedAt&&o.dueAt)c.push(o.dueAt);if(p&&!p.docsUploadedAt&&p.docsDueAt)c.push(p.docsDueAt);if(p&&!p.depositProofAt&&p.depositDueAt)c.push(p.depositDueAt);return c.sort()[0]||'';}
/* v39 (9:58 PM): agent closings (Dashboard "Cierres") with period chips. Commission shows only here (agent's own) — never to sellers/clients. */
const AC={rows:null,period:'month',from:'',to:'',busy:false,err:''};
async function acLoad(force){if(AC.busy||(AC.rows&&!force))return;AC.busy=true;try{const r=await call('tour_agent_closings',{});AC.rows=(r.closings||[]).map(x=>{const c=x.closedAt?new Date(x.closedAt).toLocaleDateString('en-CA',{timeZone:'America/Chicago'}):'';const d=String(x.closingDate||'');return {...x,day:d&&c?(c<d?c:d):(d||c)};});/* v39: a deal marked closed before its planned date counts on the day it closed */AC.err='';}catch(e){AC.err=e.message||String(e);if(!AC.rows)AC.rows=[];}finally{AC.busy=false;rerender();}}
const ctYmd=d=>chicagoDay(d);
function acRange(per){const t=ctYmd(new Date()),[y,m,dd]=t.split('-').map(Number);const pad=n=>String(n).padStart(2,'0');const ymd=(Y,M,D)=>`${Y}-${pad(M)}-${pad(D)}`;
  if(per==='week'){const dt=new Date(Date.UTC(y,m-1,dd));const wd=(dt.getUTCDay()+6)%7;dt.setUTCDate(dt.getUTCDate()-wd);return [dt.toISOString().slice(0,10),t];}
  if(per==='month')return [ymd(y,m,1),t];
  if(per==='lastmonth'){const py=m===1?y-1:y,pm=m===1?12:m-1;const last=new Date(Date.UTC(py,pm,0)).getUTCDate();return [ymd(py,pm,1),ymd(py,pm,last)];}
  if(per==='quarter'){const qm=Math.floor((m-1)/3)*3+1;return [ymd(y,qm,1),t];}
  if(per==='ytd')return [ymd(y,1,1),t];
  if(per==='custom')return [AC.from||'0000-01-01',AC.to||'9999-12-31'];
  return ['0000-01-01','9999-12-31'];}
const AC_PER=[['week','Esta semana','This week'],['month','Este mes','This month'],['lastmonth','Mes pasado','Last month'],['quarter','Trimestre','Quarter'],['ytd','YTD','YTD'],['custom','Personalizado','Custom'],['all','Todo','All']];
function acRows(per){const [a,b]=acRange(per||AC.period);return (AC.rows||[]).filter(r=>{const d=String(r.day||r.closingDate||'');return d&&d>=a&&d<=b;});}
const acDay=ymd=>{if(!ymd)return '—';const [y,m,d]=ymd.split('-').map(Number);try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(new Date(Date.UTC(y,m-1,d)));}catch(e){return ymd;}};
function agentClosingsSection(){
  acLoad(false);
  const rows=acRows(),vol=rows.reduce((n,r)=>n+(Number(r.priceCents)||0),0),com=rows.reduce((n,r)=>n+(Number(r.commissionCents)||0),0),noCom=rows.filter(r=>r.commissionCents==null).length;
  const chips=`<div class="ac-chips" role="tablist">${AC_PER.map(([k,es_,en])=>`<button type="button" role="tab" aria-selected="${AC.period===k}" class="ac-chip${AC.period===k?' on':''}" data-acper="${k}">${L(es_,en)}</button>`).join('')}</div>`;
  const custom=AC.period==='custom'?`<div class="ac-range"><label>${L('Desde','From')}<input type="date" data-acfrom="1" value="${esc(AC.from)}"></label><label>${L('Hasta','To')}<input type="date" data-acto="1" value="${esc(AC.to)}"></label></div>`:'';
  const tot=`<div class="ac-tot"><div><b>${rows.length}</b><span>${rows.length===1?L('cierre','closing'):L('cierres','closings')}</span></div><div><b>${esc(money(vol)||'$0')}</b><span>${L('volumen','volume')}</span></div><div><b>${esc(money(com)||'$0')}</b><span>${L('tu comisión','your commission')}${noCom?` · ${noCom} ${L('sin capturar','not entered')}`:''}</span></div></div>`;
  const list=AC.rows===null||AC.busy&&!AC.rows.length?`<div class="ad-skel"></div>`:rows.length?`<ul class="ad-list ac-list">${rows.map(r=>`<li class="ad-row"><span class="ad-day">${esc(acDay(r.day||r.closingDate))}</span><div class="ad-body"><b>${esc(r.address)}${r.city?', '+esc(r.city):''}</b> ${mapsBtn(r)}<small>👤 ${esc(r.clientName||'—')} · 💲 ${esc(money(r.priceCents)||'—')}${r.commissionCents!=null?` · 💼 ${esc(money(r.commissionCents)||'$0')}`:''}${r.test?' · 🧪 '+L('prueba','test'):''}</small></div>${r.offerId?`<button type="button" class="btn-card" data-tgooffer="${esc(r.offerId)}">${L('Ver','View')}</button>`:''}</li>`).join('')}</ul>`:`<p class="ad-empty">${L('No hay cierres en este periodo.','No closings in this period.')}</p>`;
  return `<section class="card ad-sec" id="ad-closings"><div class="ad-sec-h"><h3>🏁 ${L('Mis cierres','My closings')}</h3><span class="ad-count${rows.length?' on':''}">${rows.length}</span></div>${chips}${custom}${tot}${AC.err?`<p class="tour-warn">${esc(AC.err)}</p>`:''}${list}<small class="ds-priv">🔒 ${L('Tu comisión solo la ves tú y el Admin.','Only you and Admin see your commission.')}</small></section>`;
}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-acper]');if(!t)return;e.preventDefault();AC.period=t.dataset.acper;rerender();setTimeout(()=>{const el=document.getElementById('ad-closings');if(el&&el.getBoundingClientRect().top<0)el.scrollIntoView({block:'start'});},30);});
document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset)return;if(t.dataset.acfrom){AC.from=t.value;rerender();}else if(t.dataset.acto){AC.to=t.value;rerender();}});
/* v39 (9:58 PM): agent "Mi cuenta" — same content, folded into short cards with a big-button menu (like the client dashboard). */
const AA_ICON=[[/alert/i,'🔔'],[/visita|visit|showing|cita/i,'📅'],[/perfil|profile/i,'👤'],[/favorit/i,'❤️'],[/mensaje|message/i,'✉️'],[/oferta|offer/i,'💰'],[/carpeta|folder|document/i,'📂'],[/cliente|client/i,'👥']];
function agentAccount(full){
  try{
    const tpl=document.createElement('template');tpl.innerHTML=full||'';
    const root=tpl.content.firstElementChild&&tpl.content.children.length===1?tpl.content.firstElementChild:tpl.content;
    const cards=[...root.children].filter(el=>el.classList&&el.classList.contains('card'));
    if(!cards.length)return full;
    const menu=[];
    cards.forEach((c,i)=>{
      const h=c.querySelector('h2,h3');const title=(h?h.textContent:'').replace(/^[\s\p{Extended_Pictographic}\uFE0F]+/u,'').trim()||L('Sección','Section');
      const ico=(AA_ICON.find(([re])=>re.test(title))||[0,'•'])[1];
      if(h)h.remove();
      const key='aa-'+(title.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g,'-').slice(0,24)||i);
      const badge=c.querySelector('.badge,.ad-count,.count');const n=badge?badge.textContent.trim():'';
      const d=document.createElement('details');d.className='card lf-fold aa-card';d.dataset.fold=key;d.id=key;if(FOLD[key])d.open=true;
      d.innerHTML=`<summary class="lf-sum"><span class="lf-ico" aria-hidden="true">${ico}</span><span class="lf-main"><b>${esc(title)}</b></span>${n?`<span class="lf-tags"><span class="lf-chip info">${esc(n)}</span></span>`:''}<span class="lf-chev" aria-hidden="true">⌄</span></summary>`;
      const body=document.createElement('div');body.className='lf-body';
      [...c.childNodes].forEach(x=>body.appendChild(x));d.appendChild(body);
      [...c.attributes].forEach(a=>{if(a.name==='id'&&!d.querySelector('#'+CSS.escape(a.value)))body.id=a.value;});
      c.replaceWith(d);menu.push([key,ico,title]);
    });
    const nm=String((S.user&&S.user.name)||'').split(' ')[0];
    const hero=`<header class="ad-hero aa-hero"><div><p class="ad-kicker">👔 ${L('Mi cuenta de agente','My agent account')}</p><h2>${nm?esc(nm):L('Mi cuenta','My account')}</h2><p class="ad-date">${L('Toca una sección para abrirla.','Tap a section to open it.')}</p></div><button type="button" class="btn-card primary aa-dash" data-tab="agenthome">📊 ${L('Mi panel','My dashboard')}</button></header>`;
    const wrap=document.createElement('div');wrap.appendChild(tpl.content.cloneNode(true));
    return `<div class="tour-wrap ad-wrap aa-wrap">${hero}${wrap.innerHTML}</div>`;
  }catch(e){console.warn('agentAccount',e);return full;}
}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-aaopen]');if(!t)return;e.preventDefault();const d=document.getElementById(t.dataset.aaopen);if(d){d.open=true;FOLD[d.dataset.fold]=true;d.scrollIntoView({behavior:'smooth',block:'start'});}});
function agentDashboard(){
  if(!S.user)return `<section class="card tour-card"><p>${L('Inicia sesión para ver tu panel.','Sign in to see your dashboard.')}</p></section>`;
  load(false);
  const nm=String(S.user.name||'').split(' ')[0];
  const hour=+new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',hour12:false}).format(new Date());
  const hello=hour<12?L('Buenos días','Good morning'):hour<19?L('Buenas tardes','Good afternoon'):L('Buenas noches','Good evening');
  const dateTxt=(()=>{try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago',weekday:'long',month:'long',day:'numeric'}).format(new Date());}catch(e){return '';}})();
  const head=`<div class="tour-wrap ad-wrap"><header class="ad-hero"><div><p class="ad-kicker">📊 ${L('Panel del agente','Agent dashboard')}</p><h2>${hello}${nm?', '+esc(nm):''}</h2><p class="ad-date">${esc(dateTxt)}</p></div><button type="button" class="ad-refresh" data-adrefresh="1" aria-label="${esc(L('Actualizar','Refresh'))}">↻</button></header>`;
  const bill=()=>window.LegacyBilling?LegacyBilling.dashboardCard():'';
  if(!data&&!lastErr)return head+bill()+`<div class="ad-skel"></div><div class="ad-skel"></div></div>`;
  if(lastErr&&!data)return head+bill()+`<p class="tour-warn">${esc(lastErr)}</p></div>`;
  if(data.unavailable)return head+bill()+`<section class="card tour-card"><p>⏳ ${L('Las citas con carrito todavía no están activas.','Cart showings are not active yet.')}</p></section></div>`;
  const D=dashData();
  const kpi=(id,icon,n,label,hint,warn)=>`<button type="button" class="ad-kpi${warn?' warn':''}" data-adjump="${id}"><span class="ad-kpi-i" aria-hidden="true">${icon}</span><b>${n}</b><span class="ad-kpi-l">${label}</span>${hint?`<small>${hint}</small>`:''}</button>`;
  const urgent=D.actions.filter(a=>a.cd&&new Date(a.cd).getTime()-Date.now()<6*36e5).length;
  const kpis=`<div class="ad-kpis">${kpi('ad-clients','👥',D.clients.length,L('Clientes activos','Active clients'),L('últimos 30 días o con cita/oferta','last 30 days or with a showing/offer'))}${kpi('ad-today','📅',D.todayT.length,L('Citas hoy','Showings today'),D.todayT.length?L('próxima ','next ')+esc(timeOf((D.todayT.find(t=>new Date(t.startsAt).getTime()>Date.now())||D.todayT[D.todayT.length-1]).startsAt)):'')}${kpi('ad-offers','💰',D.offers.length,L('Ofertas pendientes','Pending offers'),urgent?`⚠️ ${urgent} ${L('con plazo < 6 h','due in < 6 h')}`:'',urgent>0)}${kpi('ad-contract','📝',D.contract.length,L('Casas bajo contrato','Homes under contract'),'')}</div>`;
  const actionsS=`<section class="card ad-sec ad-act" id="ad-actions"><div class="ad-sec-h"><h3>⚡ ${L('Acción requerida','Action required')}</h3><span class="ad-count${D.actions.length?' on':''}">${D.actions.length}</span></div>
    ${D.actions.length?`<ol class="ad-list">${D.actions.slice(0,actShowAll?99:6).map(a=>`<li class="ad-item r${a.rank}"><span class="ad-ico" aria-hidden="true">${a.icon}</span><div class="ad-body"><b>${a.title}</b><small>${a.sub}</small>${a.cd?cdSpan(a.cd):''}<div class="tour-btns ad-btns">${a.btns}</div></div></li>`).join('')}</ol>${D.actions.length>6?`<button type="button" class="btn-card ad-more" data-admore="1">${actShowAll?L('Ver menos','Show less'):L(`Ver todo (${D.actions.length})`,`See all (${D.actions.length})`)}</button>`:''}`:`<p class="ad-empty">✅ ${L('Todo al día. No hay nada esperando por ti.','All caught up. Nothing is waiting on you.')}</p>`}</section>`;
  const todayS=`<section class="card ad-sec" id="ad-today"><div class="ad-sec-h"><h3>📅 ${L('Hoy','Today')}</h3><span class="ad-count">${D.todayT.length}</span></div>
    ${D.todayT.length?`<ol class="ad-timeline">${D.todayT.map(t=>{const past=new Date(t.endsAt||t.startsAt).getTime()<Date.now(),tel=telOf(t.client),route=mapsLink(t.homes);return `<li class="${past?'past':''}"><span class="ad-time">${esc(timeOf(t.startsAt))}</span><div class="ad-body"><span class="ad-who"><b>${firstName(t.client)}</b> ${statusPill(t.status)}</span><small>${t.homes.length} ${t.homes.length===1?L('casa','home'):L('casas','homes')} · ${t.homes.slice(0,2).map(shownHome).join(' · ')}${t.homes.length>2?' …':''}</small><div class="tour-btns ad-btns">${tel?`<a class="btn-card" href="tel:${esc(tel)}">📞 ${L('Llamar','Call')}</a>`:''}${route?`<a class="btn-card" href="${esc(route)}" target="_blank" rel="noopener">🗺️ ${L('Ruta','Route')}</a>`:''}<button type="button" class="btn-card" data-adtour="${esc(t.id)}">${L('Ver','View')}</button></div></div></li>`;}).join('')}</ol>`:`<p class="ad-empty">${L('No tienes citas hoy.','No showings today.')}${D.week[0]?' '+L('Próxima','Next')+': <b>'+esc(when(D.week[0].startsAt))+'</b>':''}</p>`}</section>`;
  const dealRow=(r,contract)=>{const ns=nextStepOf(r.p),dl=dealDeadline(r),amt=r.p&&amountLine(r.p);
    const sum=`<img src="${esc(r.h.photo||'listing-placeholder.svg')}" alt="" loading="lazy" onerror="this.onerror=null;this.src='listing-placeholder.svg'"><span class="lf-main"><b>${shortAddr(r.h)}</b>${mapsBtn(r.h)}<small>👤 ${firstName(r.c)}${ns?' · '+esc(ns.label):''}</small></span><span class="lf-tags">${offerChip(r.p,r.o)}${dl?cdSpan(dl):''}</span>`;
    return `<li class="ad-fold">`+fold('ad-'+r.o.offerId,sum,`<div class="ad-deal"><div class="ad-body"><b>${shownHome(r.h)}</b><small>👤 ${firstName(r.c)}${amt?' · '+esc(amt):''}</small>
      ${contract?`<div class="ad-prog" role="img" aria-label="${esc(L('Paso','Step')+' '+(ns?ns.n:7)+'/7')}">${[1,2,3,4,5,6,7].map(i=>`<span class="${ns&&i<ns.n||!ns?'on':ns&&i===ns.n?'cur':''}"></span>`).join('')}</div><small>${ns?`${L('Paso','Step')} <b>${ns.n}/7</b> · ${L('Siguiente','Next')}: ${esc(ns.label)} — ${esc(L(ns.st[0],ns.st[1]))}`:'🎉 '+L('Listo para cerrar','Ready to close')}</small><small>🗓️ ${L('Cierre','Closing')}: ${r.p&&r.p.closingAt?'<b>'+esc(shortDay(r.p.closingAt))+'</b>':L('sin fecha todavía','not set yet')}</small>`:`<small>${esc(offerStep(r.p))}</small>`}
      </div><button type="button" class="btn-card" data-tgooffer="${esc(r.o.offerId)}">${L('Abrir','Open')}</button></div>`,{cls:'ad-deal-f'})+`</li>`;};
  const offersS=`<section class="card ad-sec" id="ad-offers"><div class="ad-sec-h"><h3>💰 ${L('Ofertas pendientes','Pending offers')}</h3><span class="ad-count">${D.offers.length}</span></div>${D.offers.length?`<ul class="ad-list">${D.offers.map(r=>dealRow(r,false)).join('')}</ul>`:`<p class="ad-empty">${L('No hay ofertas pendientes. Después de una cita puedes hacer una oferta desde la casa.','No pending offers. After a showing you can make an offer from the home.')}</p>`}</section>`;
  const contractS=`<section class="card ad-sec" id="ad-contract"><div class="ad-sec-h"><h3>📝 ${L('Casas bajo contrato','Homes under contract')}</h3><span class="ad-count">${D.contract.length}</span></div>${D.contract.length?`<ul class="ad-list">${D.contract.map(r=>dealRow(r,true)).join('')}</ul>`:`<p class="ad-empty">${L('Ninguna por ahora. Cuando el vendedor apruebe una condición, la casa aparece aquí con su paso.','None yet. When the seller approves a condition, the home shows up here with its step.')}</p>`}</section>`;
  const weekS=`<section class="card ad-sec" id="ad-week"><div class="ad-sec-h"><h3>🗓️ ${L('Próximos 7 días','Next 7 days')}</h3><span class="ad-count">${D.week.length}</span></div>${D.week.length?`<ul class="ad-list">${D.week.map(t=>`<li class="ad-row"><span class="ad-day">${esc(shortDay(t.startsAt))}<br><b>${esc(timeOf(t.startsAt))}</b></span><div class="ad-body"><span class="ad-who"><b>${firstName(t.client)}</b> ${statusPill(t.status)}</span><small>${t.homes.length} ${t.homes.length===1?L('casa','home'):L('casas','homes')}${t.proposal?' · 🔁 '+L('cambio de hora pendiente','time change pending'):''}</small></div><button type="button" class="btn-card" data-adtour="${esc(t.id)}">${L('Ver','View')}</button></li>`).join('')}</ul>`:`<p class="ad-empty">${L('Sin citas en los próximos 7 días.','No showings in the next 7 days.')}</p>`}</section>`;
  const clientsS=`<section class="card ad-sec" id="ad-clients"><div class="ad-sec-h"><h3>👥 ${L('Clientes activos','Active clients')}</h3><span class="ad-count">${D.clients.length}</span></div>${D.clients.length?`<ul class="ad-list">${D.clients.map(x=>{const tel=telOf(x.c),un=(S.msgThreads||[]).find(m=>m&&m.peerId===x.c.id);return `<li class="ad-row"><span class="ad-av" aria-hidden="true">${esc(String(x.c.name||'?').trim().charAt(0).toUpperCase())}</span><div class="ad-body"><b>${firstName(x.c)}</b><small>${x.next?'📅 '+L('Próxima','Next')+': '+esc(shortDay(x.next))+' '+esc(timeOf(x.next)):x.last?'👀 '+L('Última cita','Last showing')+': '+esc(shortDay(x.last)):''}${x.deals?' · 💰 '+x.deals+' '+(x.deals===1?L('oferta activa','active offer'):L('ofertas activas','active offers')):''}${un&&un.unread?' · <span class="ad-new">✉️ '+un.unread+' '+L('sin leer','unread')+'</span>':''}</small></div><div class="ad-mini">${tel?`<a class="btn-card" href="tel:${esc(tel)}" aria-label="${esc(L('Llamar','Call'))}">📞</a><a class="btn-card" href="sms:${esc(tel)}" aria-label="SMS">💬</a>`:''}<button type="button" class="btn-card" data-tchat="${esc(x.c.id)}" data-tname="${esc(x.c.name||'')}" aria-label="${esc(L('Escribir en la app','Message in app'))}">✉️</button></div></li>`;}).join('')}</ul>`:`<p class="ad-empty">${L('Aún no tienes clientes activos. Acepta una solicitud abierta para conectar con un cliente nuevo.','No active clients yet. Accept an open request to connect with a new client.')}</p>`}</section>`;
  const unreadT=(S.msgThreads||[]).filter(m=>m&&m.unread);
  const actS=unreadT.length?`<section class="card ad-sec" id="ad-activity"><div class="ad-sec-h"><h3>🔔 ${L('Actividad reciente','Recent activity')}</h3><span class="ad-count on">${unreadT.length}</span></div><ul class="ad-list">${unreadT.slice(0,5).map(m=>`<li class="ad-row"><span class="ad-av" aria-hidden="true">✉️</span><div class="ad-body"><b>${esc(m.peerName||(S.tourPeerNames||{})[m.peerId]||L('Mensaje','Message'))}</b><small>${m.unread} ${m.unread===1?L('mensaje nuevo','new message'):L('mensajes nuevos','new messages')}</small></div><button type="button" class="btn-card" data-tchat="${esc(m.peerId)}" data-tname="${esc(m.peerName||'')}">${L('Abrir','Open')}</button></li>`).join('')}</ul></section>`:'';
  const statsS=`<section class="ad-stats" aria-label="${esc(L('Este mes','This month'))}"><div><b>${D.stats.showings}</b><span>${L('Citas este mes','Showings this month')}</span></div><div><b>${D.stats.offers}</b><span>${L('Ofertas este mes','Offers this month')}</span></div><div><b>${D.stats.closed}</b><span>${L('Cerradas','Closed')}</span></div></section>`;
  const note=!data.canAccept?`<p class="tour-warn">⏳ ${L('Tu cuenta de agente todavía no puede aceptar clientes nuevos (falta aprobación o licencia).','Your agent account can’t accept new clients yet (approval or license pending).')}</p>`:'';
  const acS=agentClosingsSection(),acMonth=acRows('month');
  const kpis2=kpis.replace(/<\/div>$/,'')+kpi('ad-closings','🏁',AC.rows?acMonth.length:'…',L('Cierres este mes','Closings this month'),AC.rows&&acMonth.length?esc(money(acMonth.reduce((n,r)=>n+(Number(r.priceCents)||0),0))):'')+'</div>';
  return head+note+kpis2+actionsS+todayS+offersS+contractS+acS+weekS+clientsS+actS+statsS+bill()+`<div class="tour-btns ad-foot"><button type="button" class="btn-card" data-tab="tours">📋 ${L('Todas mis citas','All my showings')}</button><button type="button" class="btn-card" data-tab="inventory">🏠 ${L('Ver casas','See homes')}</button></div></div>`;
}
let actShowAll=false;
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('[data-adjump],[data-adtour],[data-admore],[data-adrefresh]');if(!t)return;
  const d=t.dataset;e.preventDefault();
  if(d.adjump){const el=document.getElementById(d.adjump);if(el){el.scrollIntoView({behavior:'smooth',block:'start'});el.classList.add('ad-flash');setTimeout(()=>el.classList.remove('ad-flash'),1200);}return;}
  if(d.adtour){location.hash='tours&tour='+encodeURIComponent(d.adtour);setTimeout(()=>{const el=document.getElementById('tour-'+d.adtour);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},350);return;}
  if(d.admore){actShowAll=!actShowAll;return rerender();}
  if(d.adrefresh){t.classList.add('spin');load(true).then(()=>{if(UI()&&UI().tab()==='agenthome')rerender();});return;}
});
setInterval(()=>{document.querySelectorAll('[data-adcd]').forEach(el=>{const ms=+el.dataset.adcd;el.textContent='⏱ '+cdText(ms);const left=ms-Date.now();el.classList.toggle('late',left<=0);el.classList.toggle('hot',left>0&&left<6*36e5);});},30000);

/* ---------- v39 (8:28/8:29 PM): ONE closing block, driven by the showing-flow step log (Admin, seller Panel, agent, client) ---------- */
function stepChip(p){
  if(!p)return '';
  if(p.dealClosedAt||p.tableStatus==='CLOSED')return chip('🎉 '+L('Cerrada · Vendida','Closed · Sold'),'ok');
  if(p.invalidatedAt)return chip('❌ '+L('Anulada','Voided'),'bad');
  if(!p.decision)return offerChip(p);
  const ns=nextStepOf(p);return chip(ns?`${L('Paso','Step')} ${ns.n}/${TOT(p)} · ${ns.label}`:'🎉 '+(TOT(p)===6?L('Listo','Done'):L('Completa','Complete')),p.underContract?'ok':'info');
}
function stepName(p){const ns=nextStepOf(p);if(!p||!p.decision)return '';if(p.dealClosedAt||p.tableStatus==='CLOSED')return '🎉 '+L('Cerrada · Vendida','Closed · Sold');return ns?`${L('Paso','Step')} ${ns.n}/${TOT(p)} · ${ns.label} — ${L(ns.st[0],ns.st[1])}`:'🎉 '+L('Completa','Complete');}
const ctHm=iso=>{try{return new Intl.DateTimeFormat('en-GB',{timeZone:'America/Chicago',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));}catch(e){return '10:00';}};
function closingFlowBox(p,role,opts={}){
  if(!p||p.decision!=='PRE_APPROVED'||p.dead)return '';
  const id=esc(p.offerId),ns=nextStepOf(p),n=ns?ns.n:8,closed=!!(p.dealClosedAt||p.tableStatus==='CLOSED');
  const canEdit=!closed&&!p.invalidatedAt&&['ADMIN','SELLER','AGENT'].includes(role),canStatus=!closed&&!p.invalidatedAt&&(role==='ADMIN'||role==='SELLER');
  const mySide=role==='AGENT'?'AGENT':role==='CLIENT'?'CLIENT':'SELLER';
  const row=(icon,label,body,done)=>done?`<div class="cf-row cf-row-done">${foldLine('✅',`${icon} ${label}`,done[0],done[1],`<div class="cf-v">${body}</div>`,'cf-fold')}</div>`:`<div class="cf-row"><span class="cf-l"><span aria-hidden="true">${icon}</span> ${label}</span><div class="cf-v">${body}</div></div>`;
  // Closing date (step 5)
  const c=p.closing,ap=c&&c.approvals||{};
  let dateB=c?`<b>${esc(shortDay(c.at))} · ${esc(timeOf(c.at))}</b> ${p.closingAt?chip('✅ '+L('Confirmada','Confirmed'),'ok'):chip(L('Propuesta','Proposed'),'warn')}<small class="cf-ap">${['CLIENT','AGENT','SELLER'].map(k=>`${ap[k]?'✅':'⏳'} ${esc(L(...ROLE_LBL[k]))}`).join(' · ')}</small>`:`<small>${L('Sin fecha todavía','Not set yet')}</small>`;
  if(canEdit&&p.closingUnlocked&&!(p.closingAt&&Date.now()>new Date(p.closingAt).getTime()))dateB+=`<div class="cf-inline"><input type="date" id="cf-date-${id}" value="${esc(c?chicagoDay(new Date(c.at)):'')}" min="${chicagoDay(new Date())}" aria-label="${esc(L('Fecha de cierre','Closing date'))}"><input type="time" id="cf-time-${id}" value="${esc(c?ctHm(c.at):'10:00')}" step="900" aria-label="${esc(L('Hora','Time'))}"><button type="button" class="btn-card" data-cfdate="${id}">💾 ${L('Guardar fecha','Save date')}</button></div>${c&&!ap[mySide]?`<button type="button" class="btn-card primary cf-wide" data-tflow="closing_approve" data-toffer="${id}">✅ ${L('Aprobar fecha','Approve date')}</button>`:''}`;
  else if(canEdit&&!p.closingUnlocked)dateB+=`<small class="ops-meta">🔒 ${p.approvalsDone?L('Se agenda al terminar la inspección / TRR, o marca “sin inspecciones”.','Can be set once the inspection / TRR is done, or mark “no inspections”.'):L('Se agenda cuando el vendedor apruebe documentos y depósito.','Can be set once the seller approves documents and deposit.')}</small>`;
  // Inspections (step 3)
  const started=!!(p.inspectionStartedAt||p.inspectionAt||p.inspectionReportAt);
  const inspB=p.inspectionDone?`✅ ${L('Reporte recibido','Report received')}${p.inspectionReportDocId?` · <a href="#" data-opendoc="${esc(p.inspectionReportDocId)}">${L('Ver reporte','View report')}</a>`:''}`
    :canEdit?`<label class="cf-chk"><input type="checkbox" data-cfwaive="${id}" ${p.inspectionWaived?'checked':''}> ${L('Sin inspecciones (renunciar)','No inspections (waived)')}</label>${p.inspectionWaived?'':`<label class="cf-chk"><input type="checkbox" data-cfstart="${id}" data-cfn="${p.closingUnlocked||n>=4?5:n}" ${started?'checked':''}> ${L('Inspecciones iniciadas','Inspections started')}</label>`}${p.inspectionAt?`<small>🗓️ ${esc(shortDay(p.inspectionAt))} · ${esc(timeOf(p.inspectionAt))}</small>`:''}`
    :`${p.inspectionWaived?L('➖ Sin inspecciones','➖ No inspections'):started?L('🔍 En progreso','🔍 In progress'):L('➖ No pedidas','➖ Not requested')}`;
  // EM receipt = the $1,000 deposit proof (step 2)
  const emB=(p.depositDocs||[]).length?`${p.depositApprovedAt?chip('✅ '+L('Aprobado','Approved'),'ok'):chip('🔎 '+L('Por verificar','To verify'),'warn')}${depositFiles(p,true)}${role==='ADMIN'&&!p.depositApprovedAt&&!p.invalidatedAt?`<button type="button" class="btn-card primary cf-wide" data-tcond="${id}" data-tcw="deposit">✅ ${L('Aprobar depósito de $1,000','Approve $1,000 deposit')}</button>`:''}`:`<small>⏳ ${L('Aún no se sube el comprobante de $1,000','The $1,000 proof is not uploaded yet')}</small>`;
  // Final contract
  const ks=p.contractDocs||[];
  const ctIdx=labelIndex(ks);
  const ctB=`${ks.map((k,i)=>fileAnchor(k,'CONTRACT',ctIdx[i]||1,'📄','dep-file')).join('')}${!ks.length?`<small>${L('Aún no hay contrato','No contract yet')}</small>`:''}${!closed&&role!=='CLIENT'?`<label class="btn-card cf-up">📤 ${ks.length?L('Subir otra versión','Upload another version'):L('Subir contrato final','Upload final contract')}<input type="file" hidden accept="image/*,application/pdf" data-cfcontract="${id}" data-listing="${esc(p.listingId)}"></label>`:''}`;
  const status=closed?`<p class="tour-done cf-note">🎉 ${L('Trato cerrado. La casa queda Vendida.','Deal closed. The home is Sold.')}${p.homeStatus&&p.homeStatus.simulated||opts.test?' '+L('(prueba: el estado real de la casa no cambia)','(test: the real home status does not change)'):''}</p>`
    :canStatus?`<div class="cf-acts"><button type="button" class="btn-card primary" data-cfclose="${id}" ${p.approvalsDone?'':'disabled'}>🏁 ${L('Cerrar trato (Vendida)','Close deal (Sold)')}</button><button type="button" class="btn-card danger" data-cffell="${id}">✕ ${L('Se cayó el trato','Fell through')}</button></div>${p.approvalsDone?'':`<small class="ops-meta">🔒 ${L('Cerrar trato se activa cuando estén aprobados documentos y depósito.','Close deal unlocks once documents and deposit are approved.')}</small>`}`
    :role==='AGENT'?`<small class="ops-meta">🔒 ${L('Solo el dueño (vendedor) o el administrador marcan la casa como vendida o el trato como caído.','Only the owner (seller) or the administrator mark the home sold or the deal as fell through.')}</small>`:'';
  return `<div class="cf-box" data-cf-for="${id}"><div class="cf-h">${opts.noHead?'':`<b>🏁 ${L('Cierre, documentos y avance','Closing, documents and progress')}</b>`}${stepChip(p)}</div>
    <div class="ad-prog" role="img" aria-label="${esc(L('Paso','Step')+' '+Math.min(n,TOT(p))+'/'+TOT(p))}">${DOTS(p).map(i=>`<span class="${closed||i<n?'on':i===n?'cur':''}"></span>`).join('')}</div>
    ${ns&&!closed?`<p class="cf-next">${L('Ahora','Now')}: <b>${esc(ns.label)}</b> — ${esc(L(ns.st[0],ns.st[1]))}</p>`:''}
    ${row('📅',L('Fecha de cierre','Closing date'),dateB,p.closingAt&&c?[`${esc(shortDay(c.at))} · ${esc(timeOf(c.at))} · ${L('Confirmada por todos','Confirmed by everyone')}`,null]:null)}
    ${row('🔍',L('Inspecciones','Inspections'),inspB,p.inspectionDone?[L('Reporte recibido','Report received'),p.inspectionReportAt]:p.inspectionWaived||((p.checklist||[]).find(x=>x.key==='INSPECTIONS')||{}).status==='NA'?[L('No aplica (sin inspecciones)','Not needed (waived)'),null]:null)}
    ${row('💵',L('Recibo del EM ($1,000)','EM receipt ($1,000)'),emB,p.depositApprovedAt?[L('Aprobado','Approved'),p.depositApprovedAt]:null)}
    ${row('📄',L('Contrato final','Final contract'),ctB,closed&&ks.length?[`${ks.length} ${ks.length===1?L('archivo','file'):L('archivos','files')}`,null]:null)}
    ${opts.commission||''}${status}</div>`;
}
async function cfRefresh(){await load(true);try{await spLoad(true);}catch(e){}if(S.refreshClosings)try{await S.refreshClosings();}catch(e){}if(window.render)try{render();}catch(e){}}
const cfSave=(id,body)=>act(async()=>{await call('offer_closing_save',Object.assign({offerId:id},body));await cfRefresh();});
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-cfdate],[data-cfclose],[data-cffell]');if(!b)return;e.preventDefault();const d=b.dataset;
  if(d.cfdate){const dt=(document.getElementById('cf-date-'+d.cfdate)||{}).value,tm=(document.getElementById('cf-time-'+d.cfdate)||{}).value||'10:00';if(!dt)return alert(L('Primero elige la fecha de cierre.','Pick the closing date first.'));return cfSave(d.cfdate,{closingAt:`${dt}T${tm}`});}
  if(d.cfclose){if(!confirm(L('¿Cerrar este trato? La casa se marcará como Vendida.','Close this deal? The home will be marked Sold.')))return;return act(async()=>{await call('offer_close',{offerId:d.cfclose});await cfRefresh();});}
  if(d.cffell){if(!confirm(L('¿Marcar este trato como caído? La oferta desaparece de las vistas y la casa vuelve a Disponible.','Mark this deal as fell through? The offer disappears from the views and the home goes back to Available.')))return;const reason=prompt(L('Motivo (opcional)','Reason (optional)'),'')||'';return act(async()=>{await call('offer_fell_through',{offerId:d.cffell,reason});await cfRefresh();});}
});
document.addEventListener('change',e=>{
  const t=e.target;if(!t||!t.dataset)return;const d=t.dataset;
  if(d.cfwaive)return cfSave(d.cfwaive,{inspectionsWaived:t.checked});
  if(d.cfstart){if(t.checked&&+d.cfn>=4&&!confirm(L('Esta oferta ya está en el paso 5 (cierre). Marcar “Inspecciones iniciadas” vuelve a abrir el paso 3: el cierre se bloquea hasta subir el reporte de inspección y resolver el TRR. ¿Continuar?','This offer is already at step 5 (closing). Marking “Inspections started” reopens step 3: closing is locked until the inspection report is uploaded and the TRR is resolved. Continue?'))){t.checked=false;return;}return cfSave(d.cfstart,{inspectionsStarted:t.checked});}
  if(d.cfcontract&&t.files&&t.files[0]){const f=t.files[0];return act(async()=>{await S.uploadDocument(f,{docType:'TOUR_FINAL_CONTRACT',offerId:d.cfcontract,listingId:d.listing});await cfRefresh();});}
});
/* ---------- v39 (7:30 PM): client dashboard ("Mi panel"): one big next step, then short cards. Dead items stay hidden. ---------- */
function clientPanel(full){
  load(false);
  const u=S.user,nm=String(u.name||'').split(' ')[0],now=Date.now();
  const hour=+new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',hour12:false}).format(new Date());
  const hello=hour<12?L('Buenos días','Good morning'):hour<19?L('Buenas tardes','Good afternoon'):L('Buenas noches','Good evening');
  const tours=((data&&data.tours)||[]).filter(t=>t.role==='CLIENT');
  const offers=[];tours.concat(addedTours()).forEach(t=>(t.offers||[]).forEach(o=>{const p=o.pipeline;if(!p||p.archivedAt||p.dead)return;offers.push({t,o,p,h:t.homes.find(x=>x.id===o.listingId)||{id:o.listingId}});}));
  const tIds=new Set(offers.map(x=>x.o.offerId));
  const legacy=((S.data&&S.data.offers)||[]).filter(o=>o.userId===u.id&&!tIds.has(o.id)&&!(S.isDeadOffer&&S.isDeadOffer(o)));
  const upcoming=tours.filter(t=>['REQUESTED','ACCEPTED'].includes(t.status)&&new Date(t.startsAt).getTime()>now-2*36e5).sort((a,b)=>String(a.startsAt).localeCompare(String(b.startsAt)));
  const fbDue=tours.filter(t=>t.feedbackDue&&t.homes.some(h=>!h.missing&&!(t.feedback||[]).some(f=>f.listingId===h.id)&&!(t.offers||[]).some(o=>o.listingId===h.id)));
  const go=id=>`<button type="button" class="btn-card primary cd-go" data-tgooffer="${esc(id)}">${L('Abrir','Open')} →</button>`;
  const steps=[];
  offers.forEach(({o,p,h})=>{const where=shortAddr(h);
    if(p.invalidatedAt){steps.push({due:now+864e5,icon:'❌',title:L('Tu oferta se anuló','Your offer was voided'),sub:`${where} · ${L('habla con tu agente','talk to your agent')}`,btn:`<button type="button" class="btn-card primary cd-go" data-tab="myagent">🤝 ${L('Mi agente','My agent')}</button>`});return;}
    if(p.decision!=='PRE_APPROVED')return;
    if(!p.docsUploadedAt&&(p.docsMissing||[]).length){const miss=p.docsMissing.map(k=>L(...SLOT_LBL[k])).join(L(' y ',' and '));steps.push({due:new Date(p.docsDueAt||now).getTime(),cd:p.docsDueAt,icon:'📎',title:L('Sube tus documentos','Upload your documents'),sub:`${where} · ${L('Falta','Missing')}: ${esc(miss)}`,btn:go(o.offerId)});}
    if(!p.depositProofAt&&p.depositDueAt)steps.push({due:new Date(p.depositDueAt).getTime(),cd:p.depositDueAt,icon:'💵',title:L('Envía el comprobante de $1,000','Send the $1,000 proof'),sub:`${where} · ${L('depósito de garantía','earnest deposit')}`,btn:`<label class="btn-card primary cd-go">📤 ${L('Subir comprobante','Upload proof')}<input type="file" hidden accept="image/*,application/pdf" data-tdep="${esc(h.id)}" data-toffer="${esc(o.offerId)}"></label>`});
    if(p.closing&&!p.closing.agreed&&!(p.closing.approvals||{}).CLIENT)steps.push({due:now+6*36e5,icon:'🗓️',title:L('Confirma la fecha de cierre','Confirm the closing date'),sub:`${where} · ${esc(shortDay(p.closing.at))}`,btn:go(o.offerId)});
    if(p.fundsDueAt&&!p.fundsReceiptAt&&p.closingAt)steps.push({due:new Date(p.fundsDueAt).getTime(),cd:p.fundsDueAt,icon:'🏦',title:L('Envía los fondos del cierre','Send the closing funds'),sub:where,btn:go(o.offerId)});
  });
  fbDue.forEach(t=>steps.push({due:new Date(t.startsAt).getTime()+48*36e5,icon:'⭐',title:L('¿Qué te parecieron las casas?','How were the homes?'),sub:`${esc(shortDay(t.startsAt))} · ${shortAddr(t.homes[0])}${t.homes.length>1?' +'+(t.homes.length-1):''}`,btn:`<button type="button" class="btn-card primary cd-go" data-adtour="${esc(t.id)}">⭐ ${L('Dar comentarios','Give feedback')}</button>`}));
  upcoming.forEach(t=>{if(t.proposal)return steps.push({due:new Date(t.startsAt).getTime()+1,icon:'🔁',title:L('Cambio de hora enviado','Time change sent'),sub:L('Tu agente tiene que aprobarlo','Your agent has to approve it'),btn:`<button type="button" class="btn-card cd-go" data-adtour="${esc(t.id)}">${L('Ver','View')}</button>`,wait:true});
    if(t.status==='ACCEPTED')steps.push({due:new Date(t.startsAt).getTime(),icon:'📅',title:L('Tu cita','Your showing')+': '+esc(shortDay(t.startsAt))+' · '+esc(timeOf(t.startsAt)),sub:`${t.homes.length} ${t.homes.length===1?L('casa','home'):L('casas','homes')}${t.agent?' · '+esc(t.agent.name||''):''}`,btn:`<button type="button" class="btn-card primary cd-go" data-adtour="${esc(t.id)}">${L('Ver cita','See showing')}</button>${mapsLink(t.homes)?`<a class="btn-card cd-go" href="${esc(mapsLink(t.homes))}" target="_blank" rel="noopener">🧭 ${L('Ruta','Route')}</a>`:''}`,wait:true});
    else steps.push({due:new Date(t.startsAt).getTime(),icon:'⏳',title:L('Esperando que confirmen tu cita','Waiting for your showing to be confirmed'),sub:`${esc(shortDay(t.startsAt))} · ${esc(timeOf(t.startsAt))}`,btn:`<button type="button" class="btn-card cd-go" data-adtour="${esc(t.id)}">${L('Ver','View')}</button>`,wait:true});});
  famInvitesIn().forEach(v=>steps.push({due:0,icon:'👨‍👩‍👧',title:L('Te invitaron a una Familia','You were invited to a Family'),sub:`${v.who?esc(v.who)+' · ':''}${L('Acepta o rechaza','Accept or decline')}`,btn:`<button type="button" class="btn-card primary cd-go" data-fminv="${esc(v.id)}" data-fminvans="accept">✅ ${L('Aceptar','Accept')}</button><button type="button" class="btn-card cd-go" data-fminv="${esc(v.id)}" data-fminvans="decline">✕ ${L('Rechazar','Decline')}</button>`}));
  myInvites().forEach(v=>steps.push({due:0,icon:'👥',title:L('Te invitaron a una oferta','You were invited to an offer'),sub:`${v.place?esc(v.place)+' · ':''}${L('Acepta o rechaza','Accept or decline')}`,btn:`<button type="button" class="btn-card primary cd-go" data-toinv="${esc(v.id)}" data-toinvans="accept">✅ ${L('Aceptar','Accept')}</button><button type="button" class="btn-card cd-go" data-toinv="${esc(v.id)}" data-toinvans="decline">✕ ${L('Rechazar','Decline')}</button>`}));
  steps.sort((a,b)=>(a.wait?1:0)-(b.wait?1:0)||a.due-b.due);
  const nCart=cart().length;
  if(!steps.length)steps.push(nCart?{icon:'🛒',title:L('Agenda tu cita','Book your showing'),sub:`${nCart} ${nCart===1?L('casa en tu carrito','home in your cart'):L('casas en tu carrito','homes in your cart')}`,btn:`<button type="button" class="btn-card primary cd-go" data-tab="tours">📅 ${L('Elegir fecha','Pick a date')}</button>`}:{icon:'🏠',title:L('Encuentra tu casa','Find your home'),sub:L('Agrega las que te gusten al carrito y pide una cita.','Add the ones you like to the cart and request a showing.'),btn:`<button type="button" class="btn-card primary cd-go" data-tab="inventory">🏠 ${L('Ver casas','See homes')}</button>`});
  const s0=steps[0];
  const hero=`<header class="cd-hero"><p class="ad-kicker">👋 ${hello}${nm?', '+esc(nm):''}</p><h2>${L('Tu siguiente paso','Your next step')}</h2>
    <div class="cd-next"><span class="cd-next-i" aria-hidden="true">${s0.icon}</span><div class="cd-next-b"><b>${s0.title}</b><small>${s0.sub||''}</small>${s0.cd?cdSpan(s0.cd):''}</div></div><div class="cd-btns">${s0.btn||''}</div>
    ${steps.length>1?`<ul class="cd-more-steps">${steps.slice(1,4).map(s=>`<li><span aria-hidden="true">${s.icon}</span><span class="cd-ms-t"><b>${s.title}</b><small>${s.sub||''}</small></span>${s.cd?cdSpan(s.cd):''}</li>`).join('')}</ul>`:''}</header>`;
  const card=(id,icon,title,n,body,btn)=>`<section class="card cd-card" id="${id}"><div class="cd-card-h"><h3><span aria-hidden="true">${icon}</span> ${title}</h3>${n!=null?`<span class="ad-count">${n}</span>`:''}</div>${body}${btn?`<div class="cd-foot">${btn}</div>`:''}</section>`;
  const showsB=upcoming.length?`<ul class="cd-list">${upcoming.slice(0,3).map(t=>`<li><button type="button" class="cd-row" data-adtour="${esc(t.id)}"><span class="cd-date"><b>${esc(shortDay(t.startsAt))}</b><small>${esc(timeOf(t.startsAt))}</small></span><span class="lf-main"><b>${shortAddr(t.homes[0])}${t.homes.length>1?' +'+(t.homes.length-1):''}</b><small>${t.agent?'🤝 '+esc(t.agent.name||''):L('Buscando agente','Finding an agent')}</small></span>${statusPill(t.status)}</button>${mapsBtn(t.homes[0])}</li>`).join('')}</ul>`:`<p class="ad-empty">${L('No tienes citas próximas.','No upcoming showings.')}</p>`;
  const offB=offers.length||legacy.length?`<ul class="ad-list">${offers.map(({o,p,h})=>{const dl=offerDue(p),ns=nextStepOf(p);return `<li class="ad-fold">`+fold('cdo-'+o.offerId,`${h.photo?`<img src="${esc(h.photo)}" alt="" loading="lazy" onerror="this.remove()">`:''}<span class="lf-main"><b>${shortAddr(h)}</b>${mapsBtn(h)}<small>${esc(money(p.amount&&p.amount.price))}${ns?' · '+esc(ns.label):''}</small></span><span class="lf-tags">${offerChip(p,o)}${dl?cdSpan(dl):''}</span>`,`<p class="ops-meta">${esc(offerStep(p))}</p>${p.decision==='PRE_APPROVED'&&!p.invalidatedAt?`<div class="ad-prog" role="img" aria-label="${esc(L('Paso','Step')+' '+(ns?ns.n:TOT(p))+'/'+TOT(p))}">${DOTS(p).map(i=>`<span class="${ns&&i<ns.n||!ns?'on':ns&&i===ns.n?'cur':''}"></span>`).join('')}</div>`:''}<div class="cd-btns">${go(o.offerId)}</div>`,{cls:'ad-deal-f'})+`</li>`;}).join('')}${legacy.map(o=>{const l=(S.listing&&S.listing(o.listingId))||{};return `<li class="ad-fold"><div class="lf-sum cd-static"><span class="lf-main"><b>${shortAddr(l)}</b>${mapsBtn(l)}<small>${S.money?S.money(o.offerPrice):''}</small></span>${chip(esc(String(o.status||'').replace('_',' ').toLowerCase()),'info')}</div></li>`;}).join('')}</ul>`:`<p class="ad-empty">${L('Aún no tienes ofertas. Tu agente hace la oferta después de la cita.','No offers yet. Your agent makes the offer after the showing.')}</p>`;
  const fol=((data&&data.followedOffers)||[]).filter(f=>!f.pipeline),folN=fol.length; // v48: added offers with the buyer flow are in `offers`; these have no flow yet
  const folB=folN?`<h4 class="oc-h">👥 ${L('Ofertas donde te agregaron','Offers you were added to')}</h4><ul class="ad-list">${fol.map(f=>`<li><button type="button" class="cd-row" data-tgooffer="${esc(f.offerId)}">${f.home&&f.home.photo?`<img src="${esc(f.home.photo)}" alt="" loading="lazy" onerror="this.remove()">`:''}<span class="lf-main"><b>${shortAddr(f.home)}</b><small>${esc(f.pipeline?amountLine(f.pipeline):amountLine({amount:f.amount}))}${f.agent?' · 🤝 '+esc(f.agent.name||''):''}</small></span>${ocChip(f)}</button>${mapsBtn(f.home)}</li>`).join('')}</ul>`:'';
  const favs=((S.data&&S.data.favorites)||[]).filter(f=>f.userId===u.id).map(f=>S.listing&&S.listing(f.listingId)).filter(Boolean);
  const ph=l=>(Array.isArray(l.photoUrls)&&l.photoUrls[0])||l.photoUrl||'listing-placeholder.svg';
  const favB=favs.length?`<div class="cd-favs">${favs.slice(0,4).map(l=>`<span class="cd-fav-wrap"><button type="button" class="cd-fav" data-open="${esc(l.id)}"><img src="${esc(ph(l))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='listing-placeholder.svg'"><span>${esc(String(l.address||'').split(',')[0])}</span></button>${mapsBtn(l)}</span>`).join('')}</div>`:`<p class="ad-empty">${L('Toca ❤️ en una casa para guardarla aquí.','Tap ❤️ on a home to save it here.')}</p>`;
  const a=(data&&data.connectedAgent)||connectedAgent();const tel=a&&a.phone?String(a.phone).replace(/[^\d+]/g,''):'';
  const agB=a?`<div class="cd-agent"><span class="ad-av" aria-hidden="true">${esc(String(a.name||'?').trim().charAt(0).toUpperCase())}</span><div class="lf-main"><b>${esc(a.name||'')}</b><small>${esc(a.brokerage||'')}</small></div></div><div class="cd-btns cd-contact">${tel?`<a class="btn-card primary" href="tel:${esc(tel)}">📞 ${L('Llamar','Call')}</a><a class="btn-card" href="sms:${esc(tel)}">💬 ${L('Texto','Text')}</a>`:''}<button type="button" class="btn-card" data-tchat="${esc(a.id||'')}" data-tname="${esc(a.name||'')}">✉️ ${L('Mensaje','Message')}</button></div>`
    :`<p class="ad-empty">${L('Aún no tienes agente. Pide una cita: el primer agente con licencia que la acepte será tu agente. También puedes escribir su código si ya lo tienes.','No agent yet. Request a showing: the first licensed agent who accepts it becomes your agent. You can also type their code if you already have it.')}</p>`;
  const myDocs=((S.data&&S.data.documents)||[]).filter(d=>d.userId===u.id).length;
  const docB=`<p class="cd-docs-n"><b>${myDocs}</b> ${myDocs===1?L('documento guardado','document saved'):L('documentos guardados','documents saved')}</p>`;
  const more=`<details class="card cd-profile lf-fold" data-fold="cd-profile"${FOLD['cd-profile']?' open':''} id="cd-profile"><summary class="lf-sum"><span class="lf-ico" aria-hidden="true">⚙️</span><span class="lf-main"><b>${L('Mi perfil, mensajes y documentos','My profile, messages and documents')}</b><small>${L('Datos, contraseña, búsqueda, carpeta','Details, password, search, folder')}</small></span><span class="lf-chev" aria-hidden="true">⌄</span></summary><div class="lf-body">${full||''}</div></details>`;
  return `<div class="tour-wrap ad-wrap cd-wrap">${hero}
    ${card('cd-shows','📅',L('Mis citas','My showings'),upcoming.length,showsB,`<button type="button" class="btn-card" data-tab="tours">${L('Ver todas','See all')}</button>`)}
    ${card('cd-offers','💰',L('Mis ofertas','My offers'),offers.length+legacy.length+folN,folN&&!(offers.length||legacy.length)?folB:offB+folB,'')}
    <div class="cd-two">${card('cd-favs','❤️',L('Favoritas','Favorites'),favs.length,favB,favs.length?`<button type="button" class="btn-card" data-tab="favorites">${L('Ver todas','See all')}</button>`:'')}
    ${card('cd-agent','🤝',L('Mi agente','My agent'),null,agB,a?`<button type="button" class="btn-card" data-tab="myagent">${L('Ver perfil','See profile')}</button>`:`<button type="button" class="btn-card" data-tab="myagent">🤝 ${L('Conectar con mi agente','Connect with my agent')}</button>`)}</div>
    ${card('cd-docs','📂',L('Documentos','Documents'),null,docB,`<button type="button" class="btn-card" data-cdprofile="1">${L('Abrir mi carpeta','Open my folder')}</button>`)}
    ${more}</div>`;
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-cdprofile]');if(!b)return;e.preventDefault();const d=document.getElementById('cd-profile');if(d){d.open=true;const t=document.getElementById('docUp')||d;setTimeout(()=>t.scrollIntoView({behavior:'smooth',block:'center'}),60);}});
/* ---------- Seller / company dashboard ("Panel"): KPIs, action required, offers received, under contract, homes, showings, activity, closed ---------- */
let spData=null,spErr='',spLoading=false,spAt=0,spShowAll=false;
const spCoKey='legacy.sellerPanel.co';
const sellerDashVisible=()=>!!(S.user&&(S.isAdmin()||(S.isInvestor&&S.isInvestor()&&!S.isPendingApproval(S.user))));
async function spLoad(force){
  if(!S.user||spLoading)return;if(!force&&spData&&Date.now()-spAt<20000)return;
  spLoading=true;let co='';try{co=localStorage.getItem(spCoKey)||'';}catch(e){}
  try{spData=await call('tour_seller_panel',co?{companyId:co}:{});spErr='';}
  catch(e){if(co){try{localStorage.removeItem(spCoKey);}catch(_){}try{spData=await call('tour_seller_panel',{});spErr='';}catch(e2){spErr=e2.message||String(e2);}}else spErr=e.message||String(e);}
  finally{spLoading=false;spAt=Date.now();}
  if(UI()&&UI().tab()==='sellerhome')UI().render();
}
const SP_STEP={PREAPPROVE:['✅','Oferta pre-aprobada','Offer pre-approved'],DENY:['❌','Oferta negada','Offer denied'],COUNTER:['↩️','Contraoferta enviada','Counteroffer sent'],COUNTER_ACCEPT:['🤝','Aceptaron la contraoferta','Counteroffer accepted'],COUNTER_DECLINE:['✕','Rechazaron la contraoferta','Counteroffer declined'],DOC_SLOT:['📎','Documento subido','Document uploaded'],DOCS_APPROVED:['✅','Documentos aprobados','Documents approved'],DOCS_REJECTED:['↩️','Documentos regresados para corregir','Documents sent back to fix'],DEPOSIT_PROOF:['💵','Depósito de $1,000 subido','$1,000 deposit uploaded'],DEPOSIT_APPROVED:['✅','Depósito de $1,000 aprobado','$1,000 deposit approved'],INSPECTION_REQUEST:['🔍','Pidieron inspección','Inspection requested'],INSPECTION_SCHEDULE:['📅','Inspección agendada','Inspection scheduled'],INSPECTION_REPORT:['📄','Reporte de inspección','Inspection report'],TRR_SUBMIT:['📝','TRR enviado','TRR sent'],TRR_WAIVE:['➖','Sin negociar TRR','TRR not negotiated'],TRR_ACCEPT:['✅','TRR aceptado','TRR accepted'],TRR_REJECT:['❌','TRR rechazado','TRR rejected'],TRR_COUNTER:['↩️','Contraoferta de TRR','TRR counter'],TRR_ACCEPT_COUNTER:['🤝','Contraoferta de TRR aceptada','TRR counter accepted'],CLOSING_PROPOSE:['🗓️','Fecha de cierre propuesta','Closing date proposed'],CLOSING_APPROVE:['✅','Fecha de cierre aprobada','Closing date approved'],FUNDS_RECEIPT:['💰','Comprobante de option fee / enganche','Option fee / down payment proof'],FUNDS_APPROVED:['✅','Option fee / enganche aprobado','Option fee / down payment approved'],VOID:['⌛','Oferta anulada (plazo vencido)','Offer voided (deadline passed)'],HOME_PENDING:['📝','Casa bajo contrato','Home under contract'],RESUME:['🔄','Oferta reanudada','Offer resumed']};
const spStepTxt=e=>{const m=SP_STEP[e.step]||['•',e.step,e.step];let t=L(m[1],m[2]);if(e.step==='DOC_SLOT'&&e.slot)t=e.slot==='ID'?L('Se subió la identificación (ID)','ID uploaded'):L('Se subió un comprobante de ingreso','Proof of income uploaded');return [m[0],t];};
const spDead=p=>!!(p.invalidatedAt||p.decision==='DENIED'||p.archivedAt);
const spDone=p=>!!(p.checklist&&p.checklist.every(c=>DONE_STRICT.includes(c.status)));
const spAgent=a=>a?`${esc(a.name||L('Agente','Agent'))}${a.brokerage?' · '+esc(a.brokerage):''}`:L('Agente','Agent');
const spAmt=a=>a?[money(a.price),a.down?L('enganche ','down ')+money(a.down):'',a.monthly?money(a.monthly)+L('/mes','/mo'):''].filter(Boolean).join(' · '):'';
const spHomeStatus=s=>{const u=String(s||'').toUpperCase();const m=u==='AVAILABLE'||u==='ACTIVE'?[L('Disponible','Available'),'#16a34a']:/PENDING/.test(u)?[L('Pendiente','Pending'),'#d97706']:u==='SOLD'||u==='CLOSED'?[L('Vendida','Sold'),'#475569']:[u||'—','#64748b'];return `<span class="tour-pill" style="background:${m[1]}">${esc(m[0])}</span>`;};
function spOfferState(p){
  if(p.counter&&p.counter.status==='OPEN'&&!p.decision)return '↩️ '+L('Contraoferta enviada: esperando al agente','Counteroffer sent: waiting for the agent');
  if(!p.decision)return '🆕 '+L('Nueva: decide Pre-aprobar, Negar o Contraofertar','New: Pre-approve, Deny or Counter');
  const ns=nextStepOf(p);return ns?`${L('Paso','Step')} ${ns.n}/7: ${ns.label} — ${L(ns.st[0],ns.st[1])}`:'🎉 '+L('Completada','Completed');
}
function spDeadline(p){const c=[];if(p.decision==='PRE_APPROVED'&&!p.docsUploadedAt&&p.docsDueAt)c.push(p.docsDueAt);if(p.decision==='PRE_APPROVED'&&!p.depositProofAt&&p.depositDueAt)c.push(p.depositDueAt);return c.sort()[0]||'';}
function spActions(D){
  const A=[],now=Date.now();
  const go=id=>`<button type="button" class="btn-card" data-tgooffer="${esc(id)}">${L('Revisar','Review')}</button>`;
  (D.offers||[]).forEach(p=>{
    if(spDead(p))return;const h=p.home||{},sub=`${shownHome(h)} · ${esc(spAmt(p.amount))}<br>👔 ${spAgent(p.agent)}`;
    if(!p.decision&&!(p.counter&&p.counter.status==='OPEN'))A.push({due:new Date(p.offerAt||p.createdAt).getTime()+24*36e5,rank:1,icon:'💰',title:L('Oferta nueva: decide','New offer: decide')+(p.counter&&p.counter.status==='DECLINED'?' · '+L('rechazaron tu contraoferta','your counter was declined'):''),sub,btns:`<button type="button" class="btn-card primary" data-spdec="${esc(p.offerId)}" data-spv="approve">✅ ${L('Pre-aprobar','Pre-approve')}</button><button type="button" class="btn-card" data-spctr="${esc(p.offerId)}">↩️ ${L('Contraofertar','Counter')}</button><button type="button" class="btn-card btn-del" data-spdec="${esc(p.offerId)}" data-spv="deny">✕ ${L('Negar','Deny')}</button>`});
    if(p.decision!=='PRE_APPROVED')return;
    if(p.docsUploadedAt&&!p.docsApprovedAt)A.push({due:new Date(p.docsUploadedAt).getTime()+24*36e5,rank:1,icon:'🔎',title:L('Documentos en revisión (ID + comprobantes de ingreso)','Documents in review (ID + proof of income)'),sub,btns:`${go(p.offerId)}<button type="button" class="btn-card primary" data-spcond="${esc(p.offerId)}" data-spw="docs">✅ ${L('Aprobar','Approve')}</button><button type="button" class="btn-card btn-del" data-sprej="${esc(p.offerId)}">↩️ ${L('Rechazar','Reject')}</button>`});
    if(p.depositProofAt&&!p.depositApprovedAt)A.push({due:new Date(p.depositProofAt).getTime()+24*36e5,rank:1,icon:'💵',title:L('Comprobante del depósito de $1,000','$1,000 deposit proof'),sub,btns:`${go(p.offerId)}<button type="button" class="btn-card primary" data-spcond="${esc(p.offerId)}" data-spw="deposit">✅ ${L('Aprobar','Approve')}</button>`});
    if(p.trr&&p.trr.status==='SUBMITTED')A.push({due:now+24*36e5,rank:2,icon:'📝',title:L('TRR (reparaciones) esperando tu respuesta','TRR (repairs) waiting for your answer'),sub,btns:go(p.offerId)});
    if(p.closing&&!p.closing.agreed&&p.closing.approvals&&!p.closing.approvals.SELLER)A.push({due:p.closing.at?new Date(p.closing.at).getTime():now+48*36e5,rank:2,icon:'🗓️',title:L('Fecha de cierre propuesta: confirma','Closing date proposed: confirm'),sub:sub+(p.closing.at?` · <b>${esc(shortDay(p.closing.at))}</b>`:''),btns:go(p.offerId)});
    if(p.fundsReceiptAt&&!p.fundsApprovedAt)A.push({due:p.closingAt?new Date(p.closingAt).getTime():now+24*36e5,rank:1,icon:'💰',title:L('Option fee / enganche recibido: confirma','Option fee / down payment received: confirm'),sub,btns:go(p.offerId)});
  });
  (D.otherOffers||[]).filter(o=>o.status==='SUBMITTED').forEach(o=>A.push({due:new Date(o.createdAt||Date.now()).getTime()+48*36e5,rank:3,icon:'📨',title:L('Oferta recibida (fuera de citas)','Offer received (outside showings)'),sub:`${shownHome(o.home)} · ${esc(spAmt(o.amount))}`,btns:`<button type="button" class="btn-card" data-tab="${S.isAdmin()?'admin':'investor-tx'}">${L('Ver','View')}</button>`}));
  const soon=x=>x.due-now<24*36e5?0:1;A.sort((a,b)=>(soon(a)-soon(b))||(a.due-b.due)||(a.rank-b.rank));return A;
}
function spFeedTxt(f){
  const h=f.home?homeLine(f.home):(f.homes||[]).map(shownHome).join(' · ');
  if(f.kind==='OFFER'){const [i,t]=spStepTxt(f);return [i,t,h];}
  if(f.kind==='SHOWING_REQ')return ['📅',L('Pidieron una cita','Showing requested')+(f.startsAt?' · '+shortDay(f.startsAt)+' '+timeOf(f.startsAt):''),h];
  if(f.kind==='SHOWING_OK')return ['✅',L('Cita confirmada por el agente','Showing confirmed by the agent')+(f.startsAt?' · '+shortDay(f.startsAt)+' '+timeOf(f.startsAt):''),h];
  if(f.kind==='FEEDBACK')return ['💬',(f.role==='CLIENT'?L('Comentario del cliente','Client feedback'):L('Comentario del agente','Agent feedback'))+(f.rating?' · '+'★'.repeat(f.rating):''),h];
  if(f.kind==='OFFER_OTHER')return ['📨',L('Oferta recibida','Offer received')+' · '+f.status,h];
  if(f.kind==='STATUS')return [/SOLD|CLOSED/.test(f.status)?'🎉':'📝',(/SOLD|CLOSED/.test(f.status)?L('Vendida','Sold'):/PENDING/.test(f.status)?L('Pasó a Pendiente','Went Pending'):L('Estado: ','Status: ')+f.status),h];
  return ['•',f.kind,h];
}
function sellerPanel(){
  if(!S.user)return `<section class="card tour-card"><p>${L('Inicia sesión para ver tu panel.','Sign in to see your dashboard.')}</p></section>`;
  spLoad(false);
  const D=spData;
  const co=D&&(D.companies||[]).find(c=>c.id===D.companyId);
  const nm=String(S.user.name||'').split(' ')[0];
  const hour=+new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',hour12:false}).format(new Date());
  const hello=hour<12?L('Buenos días','Good morning'):hour<19?L('Buenas tardes','Good afternoon'):L('Buenas noches','Good evening');
  const sw=D&&(D.companies||[]).length>1?`<label class="sp-co"><span>🏢 ${L('Compañía','Company')}</span><select data-spco="1">${D.companies.map(c=>`<option value="${esc(c.id)}"${c.id===D.companyId?' selected':''}>${esc(c.name)}${c.simulated?' 🧪':''}</option>`).join('')}</select></label>`:'';
  const head=`<div class="tour-wrap ad-wrap sp-wrap"><header class="ad-hero"><div><p class="ad-kicker">📊 ${S.isAdmin()?L('Panel de compañía (Admin)','Company dashboard (Admin)'):L('Panel del vendedor','Seller dashboard')}</p><h2>${hello}${nm&&!S.isAdmin()?', '+esc(nm):''}</h2><p class="ad-date">${co?'🏢 '+esc(co.name):''}</p></div><button type="button" class="ad-refresh" data-sprefresh="1" aria-label="${esc(L('Actualizar','Refresh'))}">↻</button></header>${sw}`;
  if(!D&&!spErr)return head+`<div class="ad-skel"></div><div class="ad-skel"></div></div>`;
  if(spErr&&!D)return head+`<p class="tour-warn">${esc(spErr)}</p></div>`;
  if(!(D.companies||[]).length)return head+`<section class="card tour-card"><p>${L('Todavía no perteneces a ninguna compañía. El administrador te agrega a la compañía dueña de tus casas.','You are not a member of a company yet. The admin adds you to the company that owns your homes.')}</p></section></div>`;
  const banner=D.simulated?`<p class="tour-warn">🧪 ${L('Compañía de prueba (simulada). Estas casas son reales pero aquí solo se ven ofertas y citas de prueba (legacytest); el dueño real no cambia y desde aquí no se cambia el estado de ninguna casa.','Test company (simulated). These homes are real but only test (legacytest) offers and showings show here; the real owner does not change and no home status changes from here.')}</p>`:D.testView?`<p class="ops-meta sp-note">🧪 ${L('Las citas con carrito están en prueba: ofertas y citas que ves aquí son de cuentas legacytest.','Cart showings are in testing: offers and showings here come from legacytest accounts.')}</p>`:'';
  const offersAll=(D.offers||[]).filter(p=>!spDead(p));
  const contract=offersAll.filter(p=>p.underContract&&!spDone(p));
  const open=offersAll.filter(p=>!p.underContract&&!spDone(p));
  const otherOpen=(D.otherOffers||[]).filter(o=>['SUBMITTED','COUNTERED'].includes(o.status));
  const pendHomes=(D.homes||[]).filter(h=>/PENDING/i.test(h.status)&&!contract.some(p=>p.listingId===h.id));
  const active=(D.homes||[]).filter(h=>!/PENDING|SOLD|CLOSED/i.test(h.status));
  const A=spActions(D);
  const kpi=(id,icon,n,label,hint,warn)=>`<button type="button" class="ad-kpi${warn?' warn':''}" data-adjump="${id}"><span class="ad-kpi-i" aria-hidden="true">${icon}</span><b>${n}</b><span class="ad-kpi-l">${label}</span>${hint?`<small>${hint}</small>`:''}</button>`;
  const newN=open.filter(p=>!p.decision&&!(p.counter&&p.counter.status==='OPEN')).length;
  const kpis=`<div class="ad-kpis sp-kpis">${kpi('sp-homes','🏠',active.length,L('Casas activas','Active homes'),'')}${kpi('sp-offers','💰',open.length+otherOpen.length,L('Ofertas recibidas','Offers received'),newN?`⚠️ ${newN} ${newN===1?L('nueva por decidir','new to decide'):L('nuevas por decidir','new to decide')}`:L('abiertas','open'),newN>0)}${kpi('sp-contract','📝',contract.length+pendHomes.length,L('Bajo contrato','Under contract'),'')}${kpi('sp-showings','📅',(D.showings||[]).length,L('Citas próximas','Upcoming showings'),'')}${kpi('sp-closed','🎉',D.soldYtd||0,L('Vendidas este año','Sold this year'),'')}</div>`;
  const actionsS=`<section class="card ad-sec ad-act" id="sp-actions"><div class="ad-sec-h"><h3>⚡ ${L('Acción requerida','Action required')}</h3><span class="ad-count${A.length?' on':''}">${A.length}</span></div>
    ${A.length?`<ol class="ad-list">${A.slice(0,spShowAll?99:6).map(a=>`<li class="ad-item r${a.rank}"><span class="ad-ico" aria-hidden="true">${a.icon}</span><div class="ad-body"><b>${a.title}</b><small>${a.sub}</small><div class="tour-btns ad-btns">${a.btns}</div></div></li>`).join('')}</ol>${A.length>6?`<button type="button" class="btn-card ad-more" data-spmore="1">${spShowAll?L('Ver menos','Show less'):L(`Ver todo (${A.length})`,`See all (${A.length})`)}</button>`:''}`:`<p class="ad-empty">✅ ${L('Todo al día. Nada está esperando tu aprobación.','All caught up. Nothing is waiting for your approval.')}</p>`}</section>`;
  const img=h=>`<img src="${esc((h&&h.photo)||'listing-placeholder.svg')}" alt="" loading="lazy" onerror="this.onerror=null;this.src='listing-placeholder.svg'">`;
  const offerRow=p=>{const dl=spDeadline(p);const sum=`${img(p.home)}<span class="lf-main"><b>${shortAddr(p.home)}</b>${mapsBtn(p.home)}<small>💲 ${esc(money(p.amount&&p.amount.price))} · ${spAgent(p.agent)}</small></span><span class="lf-tags">${offerChip(p)}${dl?cdSpan(dl):''}</span>`;return `<li class="ad-fold">`+fold('sp-'+p.offerId,sum,`<div class="ad-deal"><div class="ad-body"><b>${shownHome(p.home||{})}</b>${spAmt(p.amount)?`<small>💲 ${esc(spAmt(p.amount))}</small>`:''}<small>👔 ${spAgent(p.agent)}</small><small>${esc(spOfferState(p))}</small>${p.decision==='PRE_APPROVED'&&!p.docsUploadedAt?`<small>📎 ${L('Documentos','Documents')}: ${['ID','INCOME'].map(k=>`${p.docsIn&&p.docsIn[k]?'✅':'⏳'} ${esc(L(...SLOT_LBL[k]))}`).join(' · ')}</small>`:''}${(p.depositDocs||[]).length?`<small>💵 ${L('Depósito de $1,000','$1,000 deposit')}: ${p.depositApprovedAt?'✅ '+L('aprobado','approved'):'🔎 '+L('por verificar','to verify')}</small>${depositFiles(p)}`:''}</div><button type="button" class="btn-card" data-tgooffer="${esc(p.offerId)}">${L('Abrir','Open')}</button></div>${closingFlowBox(p,'SELLER',{test:D.testView})}`,{cls:'ad-deal-f'})+`</li>`;};
  const offersS=`<section class="card ad-sec" id="sp-offers"><div class="ad-sec-h"><h3>💰 ${L('Ofertas recibidas','Offers received')}</h3><span class="ad-count">${open.length+otherOpen.length}</span></div>${open.length||otherOpen.length?`<ul class="ad-list">${open.map(offerRow).join('')}${otherOpen.map(o=>`<li class="ad-deal">${img(o.home)}<div class="ad-body"><b>${shownHome(o.home)}</b><small>💲 ${esc(spAmt(o.amount))}</small><small>📨 ${L('Fuera de citas','Outside showings')} · ${esc(o.status)}</small></div><button type="button" class="btn-card" data-tab="${S.isAdmin()?'admin':'investor-tx'}">${L('Ver','View')}</button></li>`).join('')}</ul>`:`<p class="ad-empty">${L('No hay ofertas abiertas en tus casas.','No open offers on your homes.')}</p>`}</section>`;
  const tl=p=>(p.timeline||[]).slice(-5).reverse().map(e=>{const [i,t]=spStepTxt(e);return `<li><span>${i}</span><span>${esc(t)}</span><time>${esc(shortDay(e.at))} ${esc(timeOf(e.at))}</time></li>`;}).join('');
  const contractRow=p=>{const ns=nextStepOf(p);const n=ns?ns.n:8;const dl=spDeadline(p);const sum=`${img(p.home)}<span class="lf-main"><b>${shortAddr(p.home)}</b>${mapsBtn(p.home)}<small>${ns?`${L('Paso','Step')} ${ns.n}/7 · ${esc(ns.label)}`:'🎉 '+L('Listo para cerrar','Ready to close')}</small></span><span class="lf-tags">${chip(`${Math.min(n,7)}/7`,'ok')}${dl?cdSpan(dl):''}</span>`;return `<li class="ad-fold">`+fold('spc-'+p.offerId,sum,`<div class="ad-deal sp-deal"><div class="ad-body"><b>${shownHome(p.home||{})}</b><small>${spAmt(p.amount)?'💲 '+esc(spAmt(p.amount))+' · ':''}👔 ${spAgent(p.agent)}</small><div class="ad-prog" role="img" aria-label="${esc(L('Paso','Step')+' '+Math.min(n,7)+'/7')}">${[1,2,3,4,5,6,7].map(i=>`<span class="${i<n?'on':i===n?'cur':''}"></span>`).join('')}</div><small>${ns?`${L('Paso','Step')} <b>${ns.n}/7</b> · ${esc(ns.label)} — ${esc(L(ns.st[0],ns.st[1]))}`:'🎉 '+L('Listo para cerrar','Ready to close')}</small><small>🗓️ ${L('Cierre','Closing')}: ${p.closing?'<b>'+esc(shortDay(p.closing.at))+' · '+esc(timeOf(p.closing.at))+'</b> '+(p.closingAt?L('(confirmada)','(confirmed)'):L('(propuesta)','(proposed)')):L('sin fecha todavía','not set yet')}</small>${(p.depositDocs||[]).length?`<small>💵 ${L('Depósito de $1,000','$1,000 deposit')}: ${p.depositApprovedAt?'✅ '+L('aprobado','approved'):'🔎 '+L('por verificar','to verify')}</small>${depositFiles(p)}`:''}${(p.timeline||[]).length?`<details class="sp-tl"><summary>🔔 ${L('Actualizaciones','Updates')}</summary><ol>${tl(p)}</ol></details>`:''}</div><button type="button" class="btn-card" data-tgooffer="${esc(p.offerId)}">${L('Abrir','Open')}</button></div>${closingFlowBox(p,'SELLER',{test:D.testView})}`,{cls:'ad-deal-f'})+`</li>`;};
  const contractS=`<section class="card ad-sec" id="sp-contract"><div class="ad-sec-h"><h3>📝 ${L('Casas bajo contrato','Homes under contract')}</h3><span class="ad-count">${contract.length+pendHomes.length}</span></div>${contract.length||pendHomes.length?`<ul class="ad-list">${contract.map(contractRow).join('')}${pendHomes.map(h=>`<li class="ad-deal">${img(h)}<div class="ad-body"><b>${shownHome(h)}</b><small>${spHomeStatus(h.status)} · ${h.daysPending||0} ${L('días en Pendiente','days Pending')}</small></div></li>`).join('')}</ul>`:`<p class="ad-empty">${L('Ninguna por ahora. Cuando apruebes 2 de las 3 condiciones de una oferta, la casa aparece aquí con su avance.','None yet. When you approve 2 of the 3 conditions of an offer, the home shows up here with its progress.')}</p>`}</section>`;
  const showS=`<section class="card ad-sec" id="sp-showings"><div class="ad-sec-h"><h3>📅 ${L('Citas próximas en tus casas','Upcoming showings at your homes')}</h3><span class="ad-count">${(D.showings||[]).length}</span></div>${(D.showings||[]).length?`<ul class="ad-list">${D.showings.map(t=>`<li class="ad-row"><span class="ad-day">${esc(shortDay(t.startsAt))}<br><b>${esc(timeOf(t.startsAt))}</b></span><div class="ad-body"><span class="ad-who"><b>${t.homes.map(shownHome).join(' · ')}</b> ${statusPill(t.status)}</span><small>👔 ${t.agent?spAgent(t.agent):L('Esperando agente','Waiting for an agent')}</small></div></li>`).join('')}</ul>`:`<p class="ad-empty">${L('Sin citas próximas.','No upcoming showings.')}</p>`}</section>`;
  const INT={YES:['😍','Le interesa','Interested'],MAYBE:['🤔','Tal vez','Maybe'],NO:['🙅','No','No']};
  const homesS=`<section class="card ad-sec" id="sp-homes"><div class="ad-sec-h"><h3>🏠 ${L('Tus casas','Your homes')}</h3><span class="ad-count">${(D.homes||[]).length}</span></div>${(D.homes||[]).length?`<ul class="ad-list">${D.homes.slice().sort((a,b)=>(b.openOffers-a.openOffers)||String(a.address).localeCompare(String(b.address))).map(h=>{const f=h.feedback||{};const ints=Object.entries(f.interest||{}).filter(([k])=>INT[k]).map(([k,n])=>`${INT[k][0]} ${n}`).join(' ');return `<li class="ad-deal">${img(h)}<div class="ad-body"><span class="ad-who"><b>${shownHome(h)}</b> ${spHomeStatus(h.status)}</span><small>⏱ ${/PENDING/i.test(h.status)?(h.daysPending||0)+' '+L('días en Pendiente','days Pending'):(h.daysActive||0)+' '+L('días en el mercado','days on market')}${h.askingPrice?' · '+esc(money(h.askingPrice)):''}</small><small>📅 ${h.showings.total} ${h.showings.total===1?L('cita','showing'):L('citas','showings')}${h.showings.upcoming?' · '+h.showings.upcoming+' '+(h.showings.upcoming===1?L('próxima','upcoming'):L('próximas','upcoming')):''}${h.openOffers?' · 💰 '+h.openOffers+' '+(h.openOffers===1?L('oferta abierta','open offer'):L('ofertas abiertas','open offers')):''}</small>${f.count?`<small>💬 ${f.count} ${f.count===1?L('comentario','comment'):L('comentarios','comments')}${f.avg?' · ★ '+f.avg:''}${ints?' · '+ints:''}</small>${f.last?`<small class="sp-quote">“${esc(f.last.text)}” — ${f.last.role==='CLIENT'?L('cliente','client'):L('agente','agent')}</small>`:''}`:`<small class="ops-meta">${L('Sin comentarios de citas todavía.','No showing feedback yet.')}</small>`}</div><button type="button" class="btn-card" data-open="${esc(h.id)}">${L('Ver','View')}</button></li>`;}).join('')}</ul>`:`<p class="ad-empty">${L('Esta compañía todavía no tiene casas asignadas.','This company has no homes assigned yet.')}</p>`}</section>`;
  const feedS=`<section class="card ad-sec" id="sp-activity"><div class="ad-sec-h"><h3>🔔 ${L('Actividad reciente','Recent activity')}</h3><span class="ad-count">${Math.min((D.feed||[]).length,12)}</span></div>${(D.feed||[]).length?`<ul class="ad-list sp-feed">${D.feed.slice(0,12).map(f=>{const [i,t,h]=spFeedTxt(f);return `<li class="ad-row"><span class="ad-av" aria-hidden="true">${i}</span><div class="ad-body"><b>${esc(t)}</b><small>${h}</small></div><time class="sp-time">${esc(shortDay(f.at))}<br>${esc(timeOf(f.at))}</time></li>`;}).join('')}</ul>`:`<p class="ad-empty">${L('Sin actividad reciente.','No recent activity.')}</p>`}</section>`;
  const closedS=`<section class="card ad-sec" id="sp-closed"><div class="ad-sec-h"><h3>🎉 ${L('Ventas cerradas','Closed deals')}</h3><span class="ad-count">${(D.closed||[]).length}</span></div>${(D.closed||[]).length?`<ul class="ad-list">${D.closed.slice(0,8).map(c=>`<li class="ad-row"><span class="ad-av" aria-hidden="true">🏡</span><div class="ad-body"><b>${esc(c.address)}${c.city?', '+esc(c.city):''}</b> ${mapsBtn(c)}<small>${c.soldPrice?esc(money(c.soldPrice))+' · ':''}${c.closingDate||c.soldAt?L('Cierre','Closed')+' '+esc(shortDay(c.closingDate||c.soldAt)):''}${c.docs?' · 📄 '+c.docs+' '+L('documentos','documents'):''}</small></div><button type="button" class="btn-card" data-tab="${S.isAdmin()?'admin':'investor-tx'}">${L('Documentos','Documents')}</button></li>`).join('')}</ul>${D.closed.length>8?`<p class="ops-meta">${L('Ver todas en Transacciones.','See all in Transactions.')}</p>`:''}`:`<p class="ad-empty">${L('Todavía no hay ventas cerradas. Siempre tendrás acceso a tus ventas cerradas y sus documentos.','No closed deals yet. You always keep access to your closed deals and their documents.')}</p>`}</section>`;
  return head+banner+kpis+actionsS+offersS+contractS+showS+homesS+feedS+closedS+`<p class="ops-meta sp-privacy">🔒 ${L('Solo ves las casas de tu compañía. No se muestran comisiones ni datos privados del comprador; sus documentos se abren solo desde la oferta, con enlace temporal.','You only see your company’s homes. No commissions or private buyer data are shown; buyer documents open only from the offer, with a temporary link.')}</p></div>`;
}
document.addEventListener('change',e=>{const s=e.target.closest&&e.target.closest('[data-spco]');if(!s)return;try{localStorage.setItem(spCoKey,s.value);}catch(_){}spData=null;spLoad(true);UI()&&UI().render();});
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('[data-spdec],[data-spctr],[data-spcond],[data-sprej],[data-sprefresh],[data-spmore]');if(!t)return;
  const d=t.dataset;e.preventDefault();e.stopPropagation();
  const after=async()=>{await spLoad(true);load(true);};
  if(d.spmore){spShowAll=!spShowAll;return UI().render();}
  if(d.sprefresh){t.classList.add('spin');return spLoad(true);}
  if(d.spdec){const ok=d.spv==='approve';const note=ok?'':prompt(L('¿Por qué la niegas? (opcional; el agente y el cliente lo verán)','Why are you denying it? (optional; the agent and client will see it)'),'');if(note===null)return;if(ok&&!confirm(L('¿Pre-aprobar esta oferta? Empiezan los plazos: 12 h documentos y 72 h depósito.','Pre-approve this offer? The clocks start: 12 h documents and 72 h deposit.')))return;return act(async()=>{await call('tour_offer_decide',{offerId:d.spdec,decision:ok?'approve':'deny',note});await after();});}
  if(d.spctr){const p=(spData&&spData.offers||[]).find(x=>x.offerId===d.spctr)||((data&&data.sellerOffers)||[]).find(x=>x.offerId===d.spctr)||{};const a=p.amount||{};const dl=v=>v?String(Math.round(v/100)):'';
    const price=prompt(L('Contraoferta · precio ($)','Counteroffer · price ($)'),dl(a.price));if(price===null||!String(price).trim())return;
    const down=prompt(L('Contraoferta · enganche ($)','Counteroffer · down payment ($)'),dl(a.down));if(down===null)return;
    const monthly=prompt(L('Contraoferta · pago mensual ($)','Counteroffer · monthly payment ($)'),dl(a.monthly));if(monthly===null)return;
    const note=prompt(L('Nota para el agente (opcional)','Note for the agent (optional)'),'');if(note===null)return;
    return act(async()=>{await call('tour_offer_counter',{offerId:d.spctr,price,down,monthly,note});await after();});}
  if(d.spcond){if(!confirm(d.spw==='docs'?L('¿Aprobar la identificación y los comprobantes de ingreso? Ábrelos con “Revisar” antes si no los has visto.','Approve the ID and proof of income? Open them with “Review” first if you have not seen them.'):L('¿Aprobar el comprobante del depósito de $1,000?','Approve the $1,000 deposit proof?')))return;return act(async()=>{await call('tour_offer_condition',{offerId:d.spcond,which:d.spw});await after();});}
  if(d.sprej){const note=prompt(L('¿Qué debe corregir el comprador? (lo verá el cliente y su agente)','What should the buyer fix? (the client and their agent will see it)'),'');if(note===null)return;return act(async()=>{await call('tour_offer_docs_reject',{offerId:d.sprej,note});await after();});}
});


const RM_WARN_ES='Si esto se trata de un peligro o una situación de riesgo, contacta a las autoridades: OREC (Oklahoma Real Estate Commission) o al 911.';
const RM_WARN_EN='If this is about a danger or a risky situation, contact the authorities: OREC (Oklahoma Real Estate Commission) or 911.';
function removeAgentSheet(){
  const m=sheet(`<h3>🚪 ${L('Quitar a tu agente','Remove your agent')}</h3>
    <div class="tour-rm-warn" role="note"><p lang="es"><b>Aviso:</b> ${RM_WARN_ES}</p><p lang="en"><b>Notice:</b> ${RM_WARN_EN}</p></div>
    <form class="tour-form tour-rmf" id="tourRmF"><label>${L('Motivo (obligatorio)','Reason (required)')}<textarea name="reason" rows="4" maxlength="2000" required placeholder="${esc(L('Escribe por qué quieres quitar a tu agente.','Write why you want to remove your agent.'))}"></textarea></label>
    <p class="tour-warn" data-rmerr hidden></p>
    <div class="tour-btns"><button type="submit" class="btn-card primary">${L('Quitar agente','Remove agent')}</button><button type="button" class="btn-card" data-tclose="1">${L('Cancelar','Cancel')}</button></div></form>`);
  setTimeout(()=>{const i=m.querySelector('[name=reason]');if(i)i.focus();},60);
  return m;
}
document.addEventListener('submit',e=>{
  const f=e.target;if(!(f&&f.id==='tourRmF'))return;e.preventDefault();e.stopPropagation();
  const reason=String((new FormData(f)).get('reason')||'').trim();const err=f.querySelector('[data-rmerr]');err.hidden=true;
  if(!reason){err.hidden=false;err.textContent=L('Escribe el motivo para quitar a tu agente. No se puede enviar vacío.','Write a reason to remove your agent. You cannot submit an empty form.');const i=f.querySelector('[name=reason]');if(i)i.focus();return;}
  act(async()=>{try{await call('tour_remove_agent',{reason});}catch(er){err.hidden=false;err.textContent=er.message||String(er);return;}
    const bg=f.closest('.tour-ask-bg');if(bg)bg.remove();
    try{const bp=(S.data.buyerProfiles||[]).find(b=>b&&S.user&&b.userId===S.user.id);if(bp){bp.agentId=null;bp.assignedAutomatically=true;}}catch(ex){}
    if(!DEMO)await load(true);rerender();
    alert(L('Listo. Ya no tienes agente. La próxima vez que pidas una cita, se avisará otra vez a los agentes con licencia.','Done. You no longer have an agent. The next time you request a showing, licensed agents will be notified again.'));});
},true);
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('[data-tremoveagent],[data-tclose],[data-tremfresh]');
  if(!t)return;
  if(t.dataset.tclose){e.preventDefault();const bg=t.closest('.tour-ask-bg');if(bg)bg.remove();return;}
  if(t.dataset.tremoveagent){e.preventDefault();e.stopPropagation();return removeAgentSheet();}
  if(t.dataset.tremfresh){e.preventDefault();AR.rows=null;adminRemovalsLoad(true).then(()=>rerender());}
},true);
const AR={rows:null,busy:false,err:''};
async function adminRemovalsLoad(force){if(!S.isAdmin()||AR.busy||(AR.rows&&!force))return;AR.busy=true;try{const r=await call('tour_admin_removals',{});AR.rows=r.removals||[];AR.err='';}catch(e){AR.err=e.message||String(e);}finally{AR.busy=false;}}
function adminRemovalsSection(){
  if(!S.isAdmin())return '';
  adminRemovalsLoad(false);
  const rows=AR.rows||[];
  const item=r=>{
    const when=r.createdAt?esc(new Date(r.createdAt).toLocaleString(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago'})):'';
    const cn=esc((r.client&&r.client.name)||'—'), an=esc(r.agentName||(r.agent&&r.agent.name)||'—');
    return `<li class="tour-rm-item"><div><b>${cn}</b> ${L('quitó a','removed')} <b>${an}</b><br><small>${when}</small><p class="tour-rm-reason">${esc(r.reason||'')}</p></div></li>`;
  };
  return `<section class="card tour-card" id="admin-removals"><h2>🚪 ${L('Clientes que quitaron a su agente','Clients who removed their agent')} <small>(${rows.length})</small></h2>
    <p class="ops-meta">${L('El motivo queda guardado aquí para el Admin.','The reason is stored here for Admin.')}</p>
    ${AR.err?`<p class="tour-warn">${esc(AR.err)}</p>`:''}
    ${AR.rows==null&&!AR.err?`<p>${L('Cargando…','Loading…')}</p>`:rows.length?`<ul class="tour-rm-list">${rows.map(item).join('')}</ul>`:`<p class="ops-meta">${L('Todavía no hay registros.','No records yet.')}</p>`}
    <button type="button" class="btn-card" data-tremfresh="1">↻ ${L('Actualizar','Refresh')}</button></section>`;
}

/* ---------- v47/v48: clients added to an offer (full buyer-side participants since v48) ----------
   The agent who made the offer, or Admin, adds a client (one of the agent's clients, or any client account by email).
   The client sees the offer read-only (status, counteroffer, steps, timeline) and gets the same notices. Server: offer_clients_* (api v47). */
const OC_ST={SUBMITTED:['Enviada','Sent','#2563eb'],COUNTERED:['Contraoferta','Counteroffer','#d97706'],ACCEPTED:['Aceptada','Accepted','#16a34a'],PENDING:['Pendiente','Pending','#d97706'],REJECTED:['No aceptada','Not accepted','#dc2626'],DECLINED:['No aceptada','Not accepted','#dc2626'],INVALIDATED:['Anulada','Voided','#dc2626'],CLOSED:['Cerrada','Closed','#475569'],FELL_THROUGH:['Se cayó','Fell through','#dc2626'],WITHDRAWN:['Retirada','Withdrawn','#64748b'],CANCELLED:['Cancelada','Cancelled','#64748b']};
const ocOn=()=>!!(data&&data.offerClientsReady);
const ocList=id=>((data&&data.offerClients)||{})[id]||[];
function ocBox(offerId,role){
  if(!(role==='AGENT'||role==='ADMIN')||!ocOn())return '';const cs=ocList(offerId);
  return `<div class="oc-box"><p class="ops-meta">👥 ${cs.length?`${L('Clientes en esta oferta','Clients on this offer')}: <b>${cs.map(c=>esc(c.name||c.email)).join(', ')}</b>`:L('Agrega a tu cliente o invita a un co-comprador por correo: verá la oferta, recibirá los avisos y podrá subir sus documentos y hacer los pasos del comprador.','Add your client or invite a co-buyer by email: they will see the offer, get the notices, and can upload their documents and do the buyer steps.')}</p><div class="tour-btns"><button type="button" class="btn-card" data-tocl="${esc(offerId)}">👥 ${L('Agregar cliente','Add client')}${cs.length?` (${cs.length})`:''}</button></div></div>`;
}
async function openOfferClients(offerId){
  const m=sheet(`<h3>👥 ${L('Clientes de esta oferta','Clients on this offer')}</h3><div class="oc-sheet"><p class="ops-meta">${L('Cargando…','Loading…')}</p></div>`);
  const box=m.querySelector('.oc-sheet');
  const draw=async()=>{let r;try{r=await call('offer_clients_list',{offerId});}catch(e){box.innerHTML=`<p class="tour-warn">${esc(e.message||String(e))}</p>`;return;}
    const cs=r.clients||[],cands=r.candidates||[];
    box.innerHTML=`<p class="ops-meta">${L('El cliente verá esta oferta en su cuenta y recibirá los mismos avisos. Hace todo lo del comprador: sube su identificación y comprobantes de ingreso, el comprobante del depósito de $1,000, confirma la fecha de cierre y envía los fondos. Aceptar o contraofertar los términos del dueño sigue siendo del agente o del Admin.','The client will see this offer in their account and get the same notices. They do everything the buyer does: upload their ID and proof of income, the $1,000 deposit proof, confirm the closing date and send the funds. Accepting or countering the owner’s terms stays with the agent or Admin.')}</p>
      ${r.tourClient?`<p class="ops-meta">🤝 ${L('Cliente de la oferta','Offer client')}: <b>${esc(r.tourClient.name||r.tourClient.email)}</b></p>`:''}
      <h4>${L('Clientes agregados','Added clients')} (${cs.length})</h4>
      ${cs.length?`<ul class="oc-list">${cs.map(c=>`<li><span class="lf-main"><b>${esc(c.name||'—')}</b><small>${esc(c.email||'')}</small></span><button type="button" class="btn-card btn-del" data-toclrm="${esc(c.id)}">✕ ${L('Quitar','Remove')}</button></li>`).join('')}</ul>`:`<p class="ad-empty">${L('Nadie todavía.','Nobody yet.')}</p>`}
      ${(r.invites||[]).length?`<h4>${L('Invitaciones pendientes','Pending invitations')} (${r.invites.length})</h4><ul class="oc-list">${r.invites.map(v=>`<li><span class="lf-main"><b>${esc(v.email)}</b><small>${v.hasAccount?L('Tiene cuenta: debe aceptar','Has an account: must accept'):L('Sin cuenta: se une al registrarse','No account: joins when they sign up')} · ${L('vence','expires')} ${esc(shortDay(v.expiresAt))}${v.emailSent?'':' · '+L('correo no enviado','email not sent')}</small></span><button type="button" class="btn-card btn-del" data-tocinv="${esc(v.id)}">✕ ${L('Cancelar','Cancel')}</button></li>`).join('')}</ul>`:''}
      ${cs.length+(r.invites||[]).length<(r.max||10)?`<form class="tour-form oc-add" novalidate>
        ${cands.length?`<label>${S.isAdmin()?L('Clientes del agente','The agent’s clients'):L('Tus clientes','Your clients')}<select name="clientId"><option value="">—</option>${cands.map(c=>`<option value="${esc(c.id)}">${esc(c.name||c.email)}${c.email?' · '+esc(c.email):''}</option>`).join('')}</select></label>`:(r.canSearchEmail&&r.invitesReady?'':cs.length?`<p class="ad-empty oc-none">${L('Todos tus clientes conectados ya están en esta oferta. Solo puedes agregar a tus propios clientes.','All your connected clients are already on this offer. You can only add your own clients.')}</p>`:`<p class="ad-empty oc-none">${L('Aún no tienes clientes conectados. Solo puedes agregar a tus propios clientes: se conectan contigo cuando aceptas su cita o escriben tu código de agente.','You have no connected clients yet. You can only add your own clients: they connect with you when you accept their showing or they type your agent code.')}</p>`)}
        ${r.canSearchEmail&&r.invitesReady?`<label>${L('O invítalo por correo','Or invite by email')}<input name="email" type="email" inputmode="email" autocomplete="off" maxlength="200" placeholder="${esc(L('correo@ejemplo.com','name@example.com'))}"></label><p class="ops-meta">${L('Si ya tiene cuenta, recibe un correo y un aviso en la app para Aceptar o Rechazar. Si no, recibe un correo para crear su cuenta y queda conectado a la oferta al confirmarla. La invitación vence en 14 días.','If they already have an account, they get an email and an in-app notice to Accept or Decline. If not, they get an email to create their account and join the offer once it is confirmed. The invitation expires in 14 days.')}</p>`:''}
        ${cands.length||(r.canSearchEmail&&r.invitesReady)?`<div class="tour-btns"><button type="submit" class="btn-card primary">👥 ${L('Agregar cliente','Add client')}</button></div>`:''}<p class="tour-warn oc-err" hidden></p></form>`:''}`;
    box.querySelectorAll('[data-tocinv]').forEach(b=>b.addEventListener('click',()=>{if(!confirm(L('¿Cancelar esta invitación? El enlace dejará de funcionar.','Cancel this invitation? The link will stop working.')))return;act(async()=>{await call('offer_invite_cancel',{offerId,inviteId:b.dataset.tocinv});await draw();});}));
    box.querySelectorAll('[data-toclrm]').forEach(b=>b.addEventListener('click',()=>{if(!confirm(L('¿Quitar a este cliente de la oferta? Ya no la verá.','Remove this client from the offer? They will no longer see it.')))return;act(async()=>{await call('offer_clients_remove',{offerId,clientId:b.dataset.toclrm});await draw();load(true);});}));
    const f=box.querySelector('.oc-add');if(f)f.addEventListener('submit',e=>{e.preventDefault();const err=f.querySelector('.oc-err');const clientId=f.clientId?f.clientId.value:'',email=f.email?String(f.email.value||'').trim():'';
      if(!clientId&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){err.hidden=false;err.textContent=f.email?L('Elige un cliente o escribe un correo válido.','Choose a client or type a valid email.'):L('Elige uno de tus clientes.','Choose one of your clients.');return;}
      act(async()=>{try{const j=await call('offer_clients_add',clientId?{offerId,clientId}:{offerId,email});await draw();load(true);if(j&&j.already)alert(L('Ese cliente ya está en esta oferta.','That client is already on this offer.'));else if(j&&j.invited)alert(j.invite&&j.invite.hasAccount?L('Invitación enviada. Esa persona ya tiene cuenta: verá la invitación en la app y en su correo para Aceptar o Rechazar.','Invitation sent. That person already has an account: they will see it in the app and in their email to Accept or Decline.'):L('Invitación enviada. Esa persona recibirá un correo para crear su cuenta; al confirmarla quedará conectada a la oferta.','Invitation sent. They will get an email to create their account; once confirmed they will be connected to the offer.'));}catch(x){err.hidden=false;err.textContent=x.message||String(x);}});});
  };
  draw();
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-tocl]');if(!b)return;e.preventDefault();e.stopPropagation();openOfferClients(b.dataset.tocl);},true);
function ocTimeline(f){
  const p=f.pipeline,ev=[];const add=(at,ic,es,en)=>{if(at)ev.push({at,ic,t:L(es,en)});};
  add(p?p.offerAt:f.createdAt,'💰','Oferta enviada','Offer sent');
  if(p){
    if(p.counter){add(p.counter.at,'↩️','El dueño hizo una contraoferta: '+amountLine({amount:p.counter}),'The owner made a counteroffer: '+amountLine({amount:p.counter}));
      if(p.counter.status==='ACCEPTED')add(p.counter.answeredAt,'🤝','Contraoferta aceptada','Counteroffer accepted');if(p.counter.status==='DECLINED')add(p.counter.answeredAt,'✕','Contraoferta rechazada','Counteroffer declined');}
    if(p.decision==='PRE_APPROVED')add(p.decisionAt,'✅','El dueño pre-aprobó la oferta','The owner pre-approved the offer');
    if(p.decision==='DENIED')add(p.decisionAt,'❌','El dueño no aceptó la oferta','The owner did not accept the offer');
    add(p.docsUploadedAt,'📎','Documentos entregados','Documents delivered');add(p.docsApprovedAt,'✅','Documentos aprobados','Documents approved');
    add(p.depositProofAt,'💵','Comprobante del depósito enviado','Deposit proof sent');add(p.depositApprovedAt,'✅','Depósito aprobado','Deposit approved');
    if(p.homeStatus)add(p.homeStatus.at,'🏠','La casa pasó a Pendiente','The home went to Pending');
    add(p.inspectionReportAt,'🔍','Inspección terminada','Inspection done');add(p.inspectionWaivedAt,'🔍','Sin inspección','Inspection waived');
    ((p.trr&&p.trr.history)||[]).forEach(h=>add(h.at,'📝','TRR: '+({SUBMIT:'enviado',WAIVE:'no se negocia',ACCEPT:'aceptado',REJECT:'rechazado',COUNTER:'contraoferta',ACCEPT_COUNTER:'contraoferta aceptada'}[h.kind]||h.kind),'TRR: '+({SUBMIT:'sent',WAIVE:'not negotiated',ACCEPT:'accepted',REJECT:'rejected',COUNTER:'countered',ACCEPT_COUNTER:'counter accepted'}[h.kind]||h.kind)));
    if(p.closing&&p.closing.agreed)add(p.closing.proposedAt,'🗓️','Fecha de cierre acordada: '+shortDay(p.closing.at),'Closing date agreed: '+shortDay(p.closing.at));
    add(p.fundsApprovedAt,'🏦','Fondos del cierre aprobados','Closing funds approved');add(p.dealClosedAt,'🎉','Trato cerrado','Deal closed');
    add(p.invalidatedAt,'❌','Oferta anulada (vencida)','Offer voided (expired)');
  }else{
    if(f.counter&&f.status==='COUNTERED')add(f.respondedAt,'↩️','Contraoferta: '+amountLine({amount:f.counter}),'Counteroffer: '+amountLine({amount:f.counter}));
    else if(f.status!=='SUBMITTED'){const s=OC_ST[f.status]||[f.status,f.status];add(f.respondedAt,'📌',s[0],s[1]);}
  }
  ev.sort((a,b)=>String(a.at).localeCompare(String(b.at)));
  return ev.length?`<ol class="oc-timeline">${ev.map(x=>`<li><span aria-hidden="true">${x.ic}</span> <b>${esc(x.t)}</b><br><small>${esc(when(x.at))}</small></li>`).join('')}</ol>`:'';
}
function ocChip(f){const p=f.pipeline;if(p)return offerChip(p,{});const s=OC_ST[f.status]||[f.status,f.status,'#64748b'];return `<span class="tour-pill" style="background:${s[2]}">${esc(L(s[0],s[1]))}</span>`;}
function ocReadOnlySteps(p){return `<ol class="tour-check">${(p.checklist||[]).map(c=>{const st=STATUS_LABEL[c.status]||STATUS_LABEL.PENDING;return `<li class="tour-check-i s-${String(c.status).toLowerCase()}"><div><span>${st[2]} <b>${c.n}) ${esc(L(...STEP_LABEL[c.key]))}</b><br><small>${esc(L(st[0],st[1]))}</small></span></div></li>`;}).join('')}</ol>`;}
/* v48: an added client is a full buyer-side participant. Offers with the buyer flow render as the real offer card (role CLIENT). */
function addedTours(){return ((data&&data.followedOffers)||[]).filter(f=>f.pipeline).map(f=>({role:'CLIENT',id:'',added:true,agent:f.agent,homes:[Object.assign({id:f.listingId},f.home||{})],offers:[{offerId:f.offerId,listingId:f.listingId,dueAt:f.dueAt,docsUploadedAt:f.docsUploadedAt,invalidatedAt:f.invalidatedAt,pipeline:f.pipeline}]}));}
function looseTours(){return ((data&&data.looseOffers)||[]).map(o=>({role:'AGENT',id:'',loose:true,homes:[Object.assign({id:o.listingId},o.home||{})],offers:[o]}));}
function addedCard(t){const h=t.homes[0],o=t.offers[0];
  return `<article class="card tour-card oc-added" id="added-${esc(o.offerId)}"><h3>🏠 ${shownHome(h)}</h3>${t.added?`<p class="ops-meta">👥 ${L('Te agregaron a esta oferta. Sube tus documentos y haz tus pasos aquí; tu agente maneja los términos con el dueño.','You were added to this offer. Upload your documents and do your steps here; your agent handles the terms with the owner.')}</p>`:''}${offerCard(t,h,o)}${t.added&&t.agent?`<h4>${L('Agente','Agent')}</h4>${personCard(t.agent,true)}`:''}</article>`;}
function looseSection(){const ts=looseTours();if(!ts.length)return '';
  return `<section class="tour-list oc-loose"><h2>💰 ${L('Ofertas sin cita','Offers without a showing')}</h2><p class="ops-meta" style="padding:0 18px">${L('Ofertas que hiciste fuera de una cita y que ya tienen cliente agregado: siguen los mismos pasos que una oferta de cita.','Offers you made outside a showing that have an added client: they follow the same steps as a showing offer.')}</p>${ts.map(addedCard).join('')}</section>`;}
function followCard(f){
  if(f.pipeline)return addedCard(addedTours().find(t=>t.offers[0].offerId===f.offerId));
  const h=f.home||{},p=f.pipeline,amt=p?amountLine(p):amountLine({amount:f.amount});
  const sum=`<span class="lf-ico" aria-hidden="true">👥</span><span class="lf-main"><b>${shortAddr(h)||esc(L('Casa','Home'))}</b>${mapsBtn(h)}<small>${esc(amt)}${p&&offerNext(p)?' · '+offerNext(p):''}</small></span><span class="lf-tags">${ocChip(f)}</span>`;
  const ctr=p?counterBox(p,'FOLLOWER'):(f.status==='COUNTERED'&&f.counter?`<p class="ops-meta">↩️ <b>${L('Contraoferta','Counteroffer')}</b>: ${esc(amountLine({amount:f.counter}))}</p>`:'');
  const body=`<p class="ops-meta">👀 ${L('Tus pasos de comprador (documentos, depósito, cierre) aparecerán aquí en cuanto se abran. Tu agente maneja los términos con el dueño.','Your buyer steps (documents, deposit, closing) will show here as soon as they open. Your agent handles the terms with the owner.')}</p>
    <h3>🏠 ${shownHome(h)}</h3>${amt?`<p class="ops-meta">💰 ${L('Oferta','Offer')}: <b>${esc(amt)}</b></p>`:''}
    ${p?decisionLine(p):''}${ctr}${p?homeStatusLine(p):''}
    ${p&&(p.checklist||[]).length?`<h4>${L('Pasos','Steps')}</h4>${ocReadOnlySteps(p)}`:''}
    <h4>🕒 ${L('Historial','Timeline')}</h4>${ocTimeline(f)||`<p class="ad-empty">—</p>`}
    ${f.agent?`<h4>${L('Agente','Agent')}</h4>${personCard(f.agent,true)}`:''}`;
  return fold('follow-'+f.offerId,sum,body,{cls:'card tour-card tour-offer oc-follow'+focusOffer(f.offerId),id:'offer-'+f.offerId,force:hashHas('offer='+f.offerId)});
}
function followedSection(){const fs=(data&&data.followedOffers)||[];if(!fs.length)return '';
  return `<section class="tour-list oc-followed"><h2>👥 ${L('Ofertas donde te agregaron','Offers you were added to')}</h2><p class="ops-meta" style="padding:0 18px">${L('Tu agente te agregó a estas ofertas. Haz tus pasos de comprador aquí: documentos, depósito, fecha de cierre y fondos.','Your agent added you to these offers. Do your buyer steps here: documents, deposit, closing date and funds.')}</p>${fs.map(followCard).join('')}</section>`;}
/* ---------- v49: invitations to join an offer (email link + in-app card) ---------- */
const INV_KEY='lofOfferInvite';
const myInvites=()=>((data&&data.offerInvites)||[]);
function inviteRow(v){return `<div class="oc-inv"><p><b>👥 ${v.who?esc(v.who)+' '+L('te invitó a una oferta','invited you to an offer'):L('Te invitaron a una oferta','You were invited to an offer')}</b>${v.place?'<br><small>🏠 '+esc(v.place)+'</small>':''}<br><small>${L('Vence','Expires')} ${esc(shortDay(v.expiresAt))}</small></p><p class="ops-meta">${L('Si aceptas, serás comprador en esta oferta: podrás ver su avance, subir tus documentos y recibir los avisos.','If you accept, you will be a buyer on this offer: you can follow it, upload your documents and get the notices.')}</p><div class="tour-btns"><button type="button" class="btn-card primary" data-toinv="${esc(v.id)}" data-toinvans="accept">✅ ${L('Aceptar','Accept')}</button><button type="button" class="btn-card btn-del" data-toinv="${esc(v.id)}" data-toinvans="decline">✕ ${L('Rechazar','Decline')}</button></div></div>`;}
function invitesSection(){const vs=myInvites();if(!vs.length)return '';return `<section class="card tour-card oc-invites" id="offer-invites" style="padding:16px"><h2>👥 ${L('Invitaciones a ofertas','Offer invitations')}</h2>${vs.map(inviteRow).join('')}</section>`;}
async function answerInvite(body,answer){const r=await call('offer_invite_respond',Object.assign({answer},body));try{sessionStorage.removeItem(INV_KEY);}catch(e){}await load(true);
  if(answer==='decline'){alert(L('Rechazaste la invitación. No se agregó nada y avisamos al agente.','You declined the invitation. Nothing was added and the agent was told.'));return rerender();}
  if(r&&r.offerId){scrolledTo='';location.hash='tours&offer='+encodeURIComponent(r.offerId);}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-toinv]');if(!b||b.dataset.toinv==='__tok')return;e.preventDefault();e.stopPropagation();
  if(b.dataset.toinvans==='decline'&&!confirm(L('¿Rechazar esta invitación?','Decline this invitation?')))return;
  act(()=>answerInvite({inviteId:b.dataset.toinv},b.dataset.toinvans));},true);
let invBusy=false;
async function openInviteLink(){if(invBusy)return;let t='';try{t=sessionStorage.getItem(INV_KEY)||'';}catch(e){}if(!t)return;invBusy=true;
  try{let pv;try{pv=await call('offer_invite_preview',{token:t});}catch(e){try{sessionStorage.removeItem(INV_KEY);}catch(_){}
      if(S.user){await load(true);}alert(e.message||L('Esta invitación no es válida o ya venció.','This invitation is invalid or expired.'));return;}
    const v=pv.invite||{};
    if(!S.user){const m=sheet(`<h3>👥 ${L('Te invitaron a una oferta','You were invited to an offer')}</h3>${v.place?`<p class="ops-meta">🏠 ${esc(v.place)}</p>`:''}<p>${v.hasAccount?L('Inicia sesión con '+esc(v.email)+' para Aceptar o Rechazar.','Log in with '+esc(v.email)+' to Accept or Decline.'):L('Crea tu cuenta de cliente con '+esc(v.email)+'. Al confirmar tu correo, quedarás conectado a la oferta automáticamente.','Create your client account with '+esc(v.email)+'. Once you confirm your email, you will be connected to the offer automatically.')}</p><div class="tour-btns"><button type="button" class="btn-card primary" data-invgo="${v.hasAccount?'login':'reg'}">${v.hasAccount?L('Iniciar sesión','Log in'):L('Crear mi cuenta','Create my account')}</button></div>`);
      m.querySelector('[data-invgo]').addEventListener('click',ev=>{const reg=ev.currentTarget.dataset.invgo==='reg';m.remove();UI().go('auth',reg?'#regF [name="name"]':'#loginF [name="password"]');setTimeout(()=>{const f=document.querySelector(reg?'#regF [name="email"]':'#loginF [name="email"]');if(f&&!f.value)f.value=v.email||'';},150);});return;}
    if(String(S.user.email||'').toLowerCase()!==String(v.email||'').toLowerCase()){try{sessionStorage.removeItem(INV_KEY);}catch(_){}alert(L('Esta invitación es para '+v.email+'. Cierra sesión e inicia con ese correo.','This invitation is for '+v.email+'. Log out and log in with that email.'));return;}
    const m=sheet(`<h3>👥 ${L('Invitación a una oferta','Offer invitation')}</h3>${inviteRow(Object.assign({},v,{id:'__tok'}))}`);
    m.querySelectorAll('[data-toinv]').forEach(b=>b.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();const ans=b.dataset.toinvans;if(ans==='decline'&&!confirm(L('¿Rechazar esta invitación?','Decline this invitation?')))return;m.remove();act(()=>answerInvite({token:t},ans));},true));
  }finally{invBusy=false;}}
function catchInviteHash(){const h=String(location.hash||'');const mm=h.match(/^#offer-invite[&?]t=([^&]+)/);if(!mm)return false;
  try{sessionStorage.setItem(INV_KEY,decodeURIComponent(mm[1]));}catch(e){}
  try{history.replaceState(null,'',location.pathname+location.search+(S.user?'#dashboard':'#inventory'));}catch(e){}
  setTimeout(()=>{if(UI()&&UI().go)UI().go(S.user?'dashboard':'inventory');openInviteLink();},300);return true;}
window.addEventListener('hashchange',catchInviteHash);
setTimeout(catchInviteHash,0);
let invUser=null;setInterval(()=>{const u=S.user&&S.user.id;if(u&&u!==invUser){invUser=u;setTimeout(openInviteLink,1500);}if(!u)invUser=null;},1000);
/* ---------- v52: Familia (clients searching together) ---------- */
const FAM_KEY='lofFamilyInvite';
let fam=null,famAt=0,famBusy=false;
const famInvitesIn=()=>((fam&&fam.invites)||(data&&data.familyInvites)||[]);
async function famLoad(force){if(!S.user||!isClient())return;if(famBusy)return;if(!force&&fam&&Date.now()-famAt<30000)return;famBusy=true;
  try{const r=await call('family_get',{});const sig=JSON.stringify(fam);fam=r||null;famAt=Date.now();if(JSON.stringify(fam)!==sig){const a=document.activeElement;if(!(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA')))rerender();}}catch(e){}finally{famBusy=false;}}
function famInitials(n){const p=String(n||'').trim().split(/\s+/).filter(Boolean);return ((p[0]||'?').charAt(0)+(p.length>1?p[p.length-1].charAt(0):'')).toUpperCase();}
function famAv(m){return m.avatarUrl?`<span class="fm-av"><img src="${esc(m.avatarUrl)}" alt="" loading="lazy"></span>`:`<span class="fm-av fm-ini">${esc(famInitials(m.name))}</span>`;}
function famInvRow(v){return `<div class="oc-inv fm-inv"><p><b>👨‍👩‍👧 ${v.who?esc(v.who)+' '+L('te invitó a su Familia','invited you to their Family'):L('Te invitaron a una Familia','You were invited to a Family')}</b><br><small>${v.members?esc(v.members)+' '+L('persona(s) en la Familia','person(s) in the Family')+' · ':''}${L('Vence','Expires')} ${esc(shortDay(v.expiresAt))}</small></p><p class="ops-meta">${L('En una Familia ven las favoritas, las casas vistas y las citas de cada uno, y todos quedan como compradores en las ofertas de cualquiera.','In a Family you see each other’s favorites, viewed homes and showings, and everyone becomes a buyer on anyone’s offers.')}</p><div class="tour-btns"><button type="button" class="btn-card primary" data-fminv="${esc(v.id)}" data-fminvans="accept">✅ ${L('Aceptar','Accept')}</button><button type="button" class="btn-card" data-fminv="${esc(v.id)}" data-fminvans="decline">✕ ${L('Rechazar','Decline')}</button></div></div>`;}
function famHome(id,extra){const l=S.listing&&S.listing(id);if(!l)return '';const ph=(Array.isArray(l.photoUrls)&&l.photoUrls[0])||l.photoUrl||'listing-placeholder.svg';return `<li class="fm-home"><a href="#" data-open="${esc(id)}"><img src="${esc(ph)}" alt="" loading="lazy"><span><b>${esc(l.address||'')}</b><small>${esc(l.city||'')}${extra?' · '+esc(extra):''}</small></span></a>${mapsBtn(l)}</li>`;}
function famShared(f){const M=new Map(f.members.map(m=>[m.id,m]));return (f.shared||[]).map(s=>{const m=M.get(s.userId)||{name:'…'};
  const favs=s.favorites.map(x=>famHome(x.listingId)).filter(Boolean),views=s.views.map(x=>famHome(x.listingId)).filter(Boolean);
  const reqs=s.requests.map(t=>`<li class="fm-req">📅 ${esc(t.startsAt?when(t.startsAt):(t.day||''))} · ${esc(L(({REQUESTED:'Pedida',ACCEPTED:'Confirmada',DONE:'Hecha',COMPLETED:'Hecha'})[String(t.status||'').toUpperCase()]||t.status,({REQUESTED:'Requested',ACCEPTED:'Confirmed',DONE:'Done',COMPLETED:'Done'})[String(t.status||'').toUpperCase()]||t.status))} · ${t.listingIds.length} ${L('casa(s)','home(s)')}${t.listingIds.length?`<ul class="fm-homes">${t.listingIds.map(id=>famHome(id)).join('')}</ul>`:''}</li>`);
  const blk=(t,arr)=>arr.length?`<p class="fm-k">${t}</p><ul class="fm-homes">${arr.join('')}</ul>`:'';
  const body=blk('❤️ '+L('Favoritas','Favorites'),favs)+blk('👀 '+L('Vio hace poco','Recently viewed'),views)+(reqs.length?`<p class="fm-k">📅 ${L('Citas pedidas','Showing requests')}</p><ul class="fm-reqs">${reqs.join('')}</ul>`:'');
  return `<details class="fm-who"><summary>${famAv(m)}<b>${esc(m.name||'…')}</b><small>${favs.length} ❤️ · ${views.length} 👀 · ${reqs.length} 📅</small></summary>${body||`<p class="ops-meta">${L('Todavía no ha guardado ni visto casas.','No saved or viewed homes yet.')}</p>`}</details>`;}).join('');}
function familySection(){if(!S.user||!isClient())return '';famLoad(false);
  if(!fam)return `<p class="ops-meta">${L('Cargando…','Loading…')}</p>`;
  if(fam.ready===false)return `<p class="ops-meta">${L('Familia todavía no está activa.','Family is not active yet.')}</p>`;
  const inc=(fam.invites||[]).map(famInvRow).join('');
  const form=`<form class="tour-form fm-form" data-fmform="1"><label>${L('Invitar por correo','Invite by email')}<input name="email" type="email" inputmode="email" autocomplete="off" maxlength="200" required placeholder="${esc(L('correo@ejemplo.com','email@example.com'))}"></label><button class="btn-card primary">✉️ ${L('Enviar invitación','Send invitation')}</button></form>`;
  const f=fam.family;
  if(!f)return `${inc}<p>${L('Crea una Familia para buscar casa con tu pareja o tu familia: verán las favoritas, las casas vistas y las citas de cada uno, y si alguno hace una oferta, todos quedan como compradores en ella.','Create a Family to search with your partner or family: you will see each other’s favorites, viewed homes and showings, and if any of you makes an offer, everyone becomes a buyer on it.')}</p><p class="ops-meta">${L(`Hasta ${fam.max||6} personas. Solo cuentas de clientes. Las invitaciones vencen en 14 días.`,`Up to ${fam.max||6} people. Client accounts only. Invitations expire in 14 days.`)}</p>${form}`;
  const mem=f.members.map(m=>`<li class="fm-mem">${famAv(m)}<span><b>${esc(m.name||'…')}${m.isMe?' ('+L('tú','you')+')':''}</b><small>${m.role==='CREATOR'?L('Creó la Familia','Created the Family'):L('Miembro','Member')}</small></span>${f.isCreator&&!m.isMe?`<button type="button" class="btn-card" data-fmrm="${esc(m.id)}" data-fmname="${esc(m.name||'')}">${L('Quitar','Remove')}</button>`:''}</li>`).join('');
  const pend=(f.invites||[]).map(v=>`<li class="fm-pend">✉️ ${esc(v.email)} <small>· ${L('vence','expires')} ${esc(shortDay(v.expiresAt))}</small>${v.canCancel?` <button type="button" class="btn-card" data-fmcancel="${esc(v.id)}">${L('Cancelar','Cancel')}</button>`:''}</li>`).join('');
  const room=f.members.length+(f.invites||[]).length<(fam.max||6);
  return `${inc}<ul class="fm-mems">${mem}</ul>${pend?`<p class="fm-k">${L('Invitaciones pendientes','Pending invitations')}</p><ul class="fm-pends">${pend}</ul>`:''}${room?form:`<p class="ops-meta">${L('La Familia está completa.','The Family is full.')}</p>`}
   ${(f.shared||[]).length?`<h4 class="fm-h">${L('Lo que están viendo','What they are looking at')}</h4>${famShared(f)}`:''}
   <p class="ops-meta">${L('Si alguien de la Familia hace una oferta o lo agregan a una, todos quedan como compradores en ella. Si no tienes agente, quedas conectado con el agente de quien creó la Familia.','If anyone in the Family makes an offer or is added to one, everyone becomes a buyer on it. If you have no agent, you are connected to the agent of the person who created the Family.')}</p>
   <div class="tour-btns"><button type="button" class="btn-card" data-fmleave="1">🚪 ${L('Salir de la Familia','Leave Family')}</button></div>`;}
async function famAfter(){fam=null;famAt=0;await famLoad(true);await load(true);rerender();}
document.addEventListener('submit',e=>{const f=e.target.closest&&e.target.closest('[data-fmform]');if(!f)return;e.preventDefault();const email=String(new FormData(f).get('email')||'').trim();if(!email)return;
  act(async()=>{const r=await call('family_invite',{email});await famAfter();alert(r&&r.already?L('Esa persona ya está en tu Familia.','That person is already in your Family.'):r&&r.emailSent?L('Invitación enviada a '+email+'.','Invitation sent to '+email+'.'):L('Invitación creada. No pudimos enviar el correo; avísale que entre a la app con ese correo.','Invitation created. We could not send the email; tell them to log in to the app with that email.'));});},true);
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-fminv],[data-fmrm],[data-fmcancel],[data-fmleave]');if(!t)return;if(t.dataset.fminv==='__tok')return;e.preventDefault();e.stopPropagation();const d=t.dataset;
  if(d.fminv){if(d.fminvans==='decline'&&!confirm(L('¿Rechazar esta invitación?','Decline this invitation?')))return;return act(()=>famAnswer({inviteId:d.fminv},d.fminvans));}
  if(d.fmrm){if(!confirm(L(`¿Quitar a ${d.fmname||'esta persona'} de la Familia? Dejará de ver lo de la Familia y perderá el acceso a las ofertas que tenía por la Familia.`,`Remove ${d.fmname||'this person'} from the Family? They will stop seeing the Family’s activity and lose the offer access they had through the Family.`)))return;return act(async()=>{await call('family_remove',{userId:d.fmrm});await famAfter();});}
  if(d.fmcancel)return act(async()=>{await call('family_invite_cancel',{inviteId:d.fmcancel});await famAfter();});
  if(d.fmleave){if(!confirm(L('¿Salir de la Familia? Dejarás de ver lo de la Familia y perderás el acceso a las ofertas que tenías por la Familia. Tu cuenta y tus ofertas propias siguen igual.','Leave the Family? You will stop seeing the Family’s activity and lose the offer access you had through the Family. Your account and your own offers stay the same.')))return;return act(async()=>{await call('family_leave',{});await famAfter();});}
},true);
async function famAnswer(body,answer){const r=await call('family_invite_respond',Object.assign({answer},body));try{sessionStorage.removeItem(FAM_KEY);}catch(e){}await famAfter();
  if(answer==='decline'){alert(L('Rechazaste la invitación. No se cambió nada y avisamos a quien te invitó.','You declined the invitation. Nothing changed and the person who invited you was told.'));return;}
  alert(L('¡Listo! Ya estás en la Familia. La encuentras en Cuenta → Familia.','Done! You are now in the Family. Find it in Account → Family.'));}
let famLinkBusy=false;
async function openFamilyLink(){if(famLinkBusy)return;let t='';try{t=sessionStorage.getItem(FAM_KEY)||'';}catch(e){}if(!t)return;famLinkBusy=true;
  try{let pv;try{pv=await call('family_invite_preview',{token:t});}catch(e){try{sessionStorage.removeItem(FAM_KEY);}catch(_){}alert(e.message||L('Esta invitación no es válida o ya venció.','This invitation is invalid or expired.'));return;}
    const v=pv.invite||{};
    if(!S.user){const m=sheet(`<h3>👨‍👩‍👧 ${L('Te invitaron a una Familia','You were invited to a Family')}</h3>${v.who?`<p class="ops-meta">${esc(v.who)}</p>`:''}<p>${v.hasAccount?L('Inicia sesión con '+esc(v.email)+' para Aceptar o Rechazar.','Log in with '+esc(v.email)+' to Accept or Decline.'):L('Crea tu cuenta de cliente con '+esc(v.email)+'. Al confirmar tu correo, quedarás en la Familia automáticamente.','Create your client account with '+esc(v.email)+'. Once you confirm your email, you will join the Family automatically.')}</p><div class="tour-btns"><button type="button" class="btn-card primary" data-famgo="${v.hasAccount?'login':'reg'}">${v.hasAccount?L('Iniciar sesión','Log in'):L('Crear mi cuenta','Create my account')}</button></div>`);
      m.querySelector('[data-famgo]').addEventListener('click',ev=>{const reg=ev.currentTarget.dataset.famgo==='reg';m.remove();UI().go('auth',reg?'#regF [name="name"]':'#loginF [name="password"]');setTimeout(()=>{const f=document.querySelector(reg?'#regF [name="email"]':'#loginF [name="email"]');if(f&&!f.value)f.value=v.email||'';},150);});return;}
    if(String(S.user.email||'').toLowerCase()!==String(v.email||'').toLowerCase()){try{sessionStorage.removeItem(FAM_KEY);}catch(_){}alert(L('Esta invitación es para '+v.email+'. Cierra sesión e inicia con ese correo.','This invitation is for '+v.email+'. Log out and log in with that email.'));return;}
    const m=sheet(`<h3>👨‍👩‍👧 ${L('Invitación a una Familia','Family invitation')}</h3>${famInvRow(Object.assign({},v,{id:'__tok'}))}`);
    m.querySelectorAll('[data-fminv]').forEach(b=>b.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();const ans=b.dataset.fminvans;if(ans==='decline'&&!confirm(L('¿Rechazar esta invitación?','Decline this invitation?')))return;m.remove();act(()=>famAnswer({token:t},ans));},true));
  }finally{famLinkBusy=false;}}
function catchFamilyHash(){const h=String(location.hash||'');const mm=h.match(/^#family-invite[&?]t=([^&]+)/);if(!mm)return false;
  try{sessionStorage.setItem(FAM_KEY,decodeURIComponent(mm[1]));}catch(e){}
  try{history.replaceState(null,'',location.pathname+location.search+(S.user?'#dashboard':'#inventory'));}catch(e){}
  setTimeout(()=>{if(UI()&&UI().go)UI().go(S.user?'dashboard':'inventory');openFamilyLink();},300);return true;}
window.addEventListener('hashchange',catchFamilyHash);
setTimeout(catchFamilyHash,0);
let famUser=null;setInterval(()=>{const u=S.user&&S.user.id;if(u&&u!==famUser){famUser=u;fam=null;setTimeout(openFamilyLink,1800);}if(!u){famUser=null;fam=null;}},1000);
function famInvitesSection(){const vs=famInvitesIn();if(!vs.length||!isClient())return '';return `<section class="card tour-card oc-invites" id="family-invites" style="padding:16px"><h2>👨‍👩‍👧 ${L('Invitaciones a una Familia','Family invitations')}</h2>${vs.map(famInvRow).join('')}</section>`;}

window.LegacyTours={
  familySection,familyCount:()=>(fam&&fam.family?fam.family.members.length:0)+famInvitesIn().length,familyHot:()=>famInvitesIn().length>0,
  offerClientsBox:id=>{load(false);return ocBox(id,S.isAdmin()?'ADMIN':'AGENT');},followedOffers:()=>((data&&data.followedOffers)||[]),
  clientMode:()=>isClient()||!S.user,
  navVisible:()=>!!S.user&&(isClient()||isAgent()||S.isAdmin()||(S.isInvestor&&S.isInvestor()&&!S.isPendingApproval(S.user))),
  navLabel:()=>isClient()?'🛒 '+L('Carrito y citas','Cart & showings'):isAgent()?'🔔 '+L('Citas de clientes','Client showings'):S.isAdmin()?'🛒 '+L('Citas con carrito','Cart showings'):'💬 '+L('Comentarios de visitas','Showing feedback'),
  headerButton:()=>{if(!isClient())return '';const n=cart().length;return `<button type="button" class="tour-cart-btn" data-tgo="1" aria-label="${esc(L('Carrito de casas','Home cart'))}">🛒${n?`<span class="menu-badge">${n}</span>`:''}</button>`;},
  clientActionRow:l=>{if(S.user)load(false);const c=inCart(l.id),conn=connectedAgent();return `<div class="lof-act-row"><button type="button" class="btn-card${c?'':' primary'}" data-tcart="${esc(l.id)}">${c?'✓ '+L('En tu carrito (quitar)','In your cart (remove)'):'🛒 '+L('Agregar al carrito','Add to cart')}</button><button type="button" class="btn-card" data-tbook="${esc(l.id)}">📅 ${L('Solicitar cita','Request showing')}</button></div><p class="ops-meta tour-note">${conn?L('Junta las casas en tu carrito y envíalas a tu agente. Las ofertas las hace tu agente después de la visita.','Collect homes in your cart and send them to your agent. Your agent makes offers after the visit.'):L(`Junta hasta ${MAX} casas en tu carrito y pide una sola cita. El primer agente que acepte será tu agente. Las ofertas las hace tu agente después de la visita.`,`Collect up to ${MAX} homes in your cart and request one showing. The first agent to accept becomes your agent. Your agent makes offers after the visit.`)}</p>`;},
  offerSentParts:l=>{if(!S.user||!S.data||!l)return null;const T=['REJECTED','WITHDRAWN','INVALIDATED','FELL_THROUGH','CANCELLED','DECLINED'];const o=(S.data.offers||[]).filter(x=>x&&x.listingId===l.id&&x.userId===S.user.id&&!T.includes(String(x.status||'').toUpperCase())).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0];
    if(!o)return null;return {note:`✅ <b>${L('Oferta enviada','Offer sent')}</b>${o.createdAt?' · '+esc(when(o.createdAt)):''}${money(o.offerPrice)?' · '+esc(money(o.offerPrice)):''}`,nextLabel:L('Ver próximos pasos','See next steps')};},
  offerSentCard:l=>{const p=window.LegacyTours&&LegacyTours.offerSentParts?LegacyTours.offerSentParts(l):null;if(!p)return '';return `<div class="tour-done">${p.note} <button type="button" class="btn-card" data-tgo="1">${p.nextLabel}</button></div>`;},
  agentNavVisible:()=>isClient(),agentDashVisible:()=>isAgent(),agentDashboard,dealBox,agentAccount,clientDocsCard,sellerDashVisible,sellerPanel,sellerReload:()=>spLoad(true),clientPanel,closingFlowBox,stepChip,stepName,depositFiles,deadOfferIds:()=>(data&&data.deadOfferIds)||[],archive:()=>(data&&data.archive)||[],hiddenShowings:()=>(data&&data.hiddenShowings)||0,fold,tourOfferInfo:id=>{load(false);const o=findOffer(id);return o?(o.pipeline||o):null;},refreshAll:()=>{load(true);spLoad(true);},agentNavLabel:()=>'🤝 '+L('Mi agente','My agent'),agentView,
  view,refresh:()=>load(true),cart,locateDeal
};
})();
