/* v39: Showing cart ("carrito") + agent-claimed tours.
   Clients (no direct offers):
   - No connected agent: up to 5 homes per showing, sent to every licensed agent; first to accept is connected.
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
const rerender=()=>{const u=UI();if(u)u.render();const m=/offer=([^&]+)/.exec(location.hash);const id=m&&decodeURIComponent(m[1]);if(id){setTimeout(()=>{const el=document.getElementById('offer-'+id);if(el){el.classList.add('tour-focus');if(scrolledTo!==id){scrolledTo=id;el.scrollIntoView({behavior:'smooth',block:'start'});}}},150);}};
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
  if(UI()&&['tours','myagent'].includes(UI().tab()))rerender();
}

/* ---------- small helpers ---------- */
const when=iso=>{try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago',weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(iso));}catch(e){return iso;}};
const chicagoDay=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const statusPill=s=>{const m={REQUESTED:[L('Esperando agente','Waiting for an agent'),'#d97706'],ACCEPTED:[L('Confirmada','Confirmed'),'#16a34a'],COMPLETED:[L('Terminada','Done'),'#475569'],CANCELLED:[L('Cancelada','Cancelled'),'#dc2626'],EXPIRED:[L('Nadie la aceptó','Not accepted'),'#64748b'],DECLINED:[L('Rechazada por el agente','Declined by the agent'),'#dc2626']}[s]||[s,'#64748b'];return `<span class="tour-pill" style="background:${m[1]}">${esc(m[0])}</span>`;};
const homeLine=h=>`${esc(h.address||'')}${h.city?', '+esc(h.city):''}`;
function mapsLink(homes){const pts=homes.filter(Boolean).map(h=>h.lat&&h.lng?`${h.lat},${h.lng}`:`${h.address||''}, ${h.city||''}, OK`);if(!pts.length)return '';const dest=pts[pts.length-1],way=pts.slice(0,-1);return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination='+encodeURIComponent(dest)+(way.length?'&waypoints='+encodeURIComponent(way.join('|')):'');}
function icsFor(t){const f=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const loc=t.homes[0]?`${t.homes[0].address||''}, ${t.homes[0].city||''}, OK`:'Oklahoma';
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Legacy Owner Finance//Showings//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+t.id+'@legacyownerfinance.net','DTSTAMP:'+f(Date.now()),'DTSTART:'+f(t.startsAt),'DTEND:'+f(t.endsAt||t.startsAt),'SUMMARY:'+String(t.calendar&&t.calendar.icsTitle||'Showing').replace(/[,;]/g,' '),'LOCATION:'+loc.replace(/[,;]/g,' '),'DESCRIPTION:'+String((t.calendar&&t.calendar.icsDetails)||'').replace(/\n/g,'\\n').replace(/[,;]/g,' ')+'\\nhttps://legacyownerfinance.net/#tours','BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY','DESCRIPTION:Showing in 30 minutes','END:VALARM','END:VEVENT','END:VCALENDAR'];
  const b=new Blob([lines.join('\r\n')],{type:'text/calendar'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='cita-legacy-'+t.id+'.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
function timeOptions(sel){let o='';for(let m=9*60;m<=19*60;m+=30){const hh=String(Math.floor(m/60)).padStart(2,'0'),mm=String(m%60).padStart(2,'0');const d=new Date(2000,0,1,+hh,+mm);const lab=d.toLocaleTimeString(S.lang==='es'?'es-US':'en-US',{hour:'numeric',minute:'2-digit'});o+=`<option value="${hh}:${mm}"${sel===hh+':'+mm?' selected':''}>${esc(lab)}</option>`;}return o;}

/* ---------- views ---------- */
function cartSection(){
  const c=cart().map(id=>S.listing(id)).filter(Boolean);const today=chicagoDay(new Date());const conn=connectedAgent();const cap=maxCart();
  const items=c.map(l=>`<li class="tour-cart-item"><img src="${esc((l.photoUrls&&l.photoUrls[0])||l.photoUrl||'listing-placeholder.svg')}" alt=""><span><b>${esc(l.address)}</b><br><small>${esc(l.city||'')}</small></span><button type="button" class="btn-card" data-tcartdel="${esc(l.id)}" aria-label="${esc(L('Quitar','Remove'))}">✕</button></li>`).join('');
  const intro=conn?L(`Tus solicitudes van directo a tu agente, <b>${esc(conn.name)}</b>, quien las aprueba o rechaza según su agenda y el acceso a las casas. Puedes agregar todas las casas que quieras.`,`Your requests go straight to your agent, <b>${esc(conn.name)}</b>, who approves or declines them based on their schedule and access to the homes. Add as many homes as you like.`)
    :L(`Agrega las casas que te gustan (hasta ${MAX} por cita) y pide una sola cita para verlas. Un agente con licencia la acepta y te acompaña.`,`Add the homes you like (up to ${MAX} per showing) and request one showing for all of them. A licensed agent accepts it and shows you the homes.`);
  const btn=conn?`📨 ${L(`Enviar a mi agente (${c.length} ${c.length===1?'casa':'casas'})`,`Send to my agent (${c.length} ${c.length===1?'home':'homes'})`)}`:`📅 ${L(`Solicitar cita para ${c.length} ${c.length===1?'casa':'casas'}`,`Request showing for ${c.length} ${c.length===1?'home':'homes'}`)}`;
  return `<section class="card tour-card" id="tour-cart"><h2>🛒 ${L('Mi carrito de casas','My home cart')} <small>(${c.length}${conn?'':'/'+cap})</small></h2>
   <p class="ops-meta">${intro}</p>
   ${c.length?`<ul class="tour-cart">${items}</ul>`:`<p>${L('Tu carrito está vacío. Abre una casa y toca “🛒 Agregar al carrito”.','Your cart is empty. Open a home and tap “🛒 Add to cart”.')}</p><button type="button" class="btn-card primary" data-tab="inventory">🏠 ${L('Ver casas','See homes')}</button>`}
   ${!conn&&c.length>=MAX?`<p class="tour-warn">ℹ️ ${esc(limitText())}</p>`:''}
   ${c.length&&data&&data.canRequest!==false?`<form id="tourReqF" class="tour-form"><label>${L('Fecha','Date')}<input type="date" name="date" min="${today}" value="${esc(form.date)}" required></label><label>${L('Hora','Time')}<select name="time">${timeOptions(form.time)}</select></label><label class="tour-notes">${L('Notas (opcional)','Notes (optional)')}<textarea name="notes" rows="2" maxlength="1000">${esc(form.notes)}</textarea></label>
   <button type="submit" class="btn-card primary"${busy?' disabled':''}>${btn}</button></form>`:''}
   ${c.length&&data&&data.canRequest===false?`<p class="tour-warn">${L('Las citas con carrito están en prueba. Por ahora llama o escribe al (405) 338-4124.','Cart showings are in testing. For now call or text (405) 338-4124.')}</p>`:''}</section>`;
}
function personCard(p,isAgentCard){if(!p)return '';
  const tel=String(p.phone||'').replace(/[^\d+]/g,'');
  return `<div class="tour-person">${isAgentCard?`<img class="tour-avatar" src="${esc(p.avatarUrl||'legacy-logo.png')}" alt="">`:''}<div><b>${esc(p.name||'')}</b>
   ${isAgentCard?`<div class="ops-meta">${esc(p.brokerage||'')}${p.licenseNumber?` · ${L('Licencia','License')} ${esc(p.licenseState||'OK')} #${esc(p.licenseNumber)}`:''}</div>`:''}
   <div class="ops-meta">${p.phone?`📞 ${esc(p.phone)}`:''}${p.email?` · ✉️ ${esc(p.email)}`:''}</div>
   ${isAgentCard&&p.bio?`<p class="tour-bio">${esc(p.bio)}</p>`:''}
   <div class="tour-btns">${tel?`<a class="btn-card primary" href="tel:${esc(tel)}">📞 ${L('Llamar','Call')}</a>`:''}${p.id?`<button type="button" class="btn-card" data-tchat="${esc(p.id)}" data-tname="${esc(p.name||'')}">💬 ${L('Escribir en la app','Message in app')}</button>`:''}</div></div></div>`;}
function feedbackForm(t,h){const k=t.id+'|'+h.id;return `<form class="tour-fb" data-tfbform="${esc(k)}"><label>${L('Calificación','Rating')}<select name="rating"><option value="">—</option>${[5,4,3,2,1].map(n=>`<option value="${n}">${'★'.repeat(n)}</option>`).join('')}</select></label><label>${L('Interés','Interest')}<select name="interest"><option value="">—</option><option value="VERY_INTERESTED">${L('Mucho','Very')}</option><option value="INTERESTED">${L('Sí','Yes')}</option><option value="SOMEWHAT">${L('Algo','Somewhat')}</option><option value="NOT_INTERESTED">${L('No','No')}</option></select></label><label class="tour-notes">${L('Comentarios','Comments')}<textarea name="comments" rows="2" maxlength="2000"></textarea></label><button class="btn-card primary">${L('Enviar comentarios','Send feedback')}</button></form>`;}
function homeRow(t,h,i,n){
  const editable=['REQUESTED','ACCEPTED'].includes(t.status)&&t.role!=='ADMIN';
  const myFb=(t.feedback||[]).find(f=>f.listingId===h.id&&(t.role==='ADMIN'||f.authorRole===t.role));
  const offer=(t.offers||[]).find(o=>o.listingId===h.id);
  let after='';
  if(offer&&t.role!=='ADMIN')after=offerCard(t,h,offer);
  else if(t.feedbackDue&&t.role!=='ADMIN'){
    if(offer){const due=new Date(offer.dueAt),left=due.getTime()-Date.now();
      after=`<div class="tour-offer">${offer.invalidatedAt?`❌ ${L('Oferta invalidada: no se subieron documentos en 12 horas.','Offer invalidated: no documents within 12 hours.')}`:offer.docsUploadedAt?`✅ ${L('Documentos recibidos.','Documents received.')}`:`⏰ ${L(`Oferta hecha. Hay hasta el ${when(offer.dueAt)} (${Math.max(0,Math.floor(left/3600e3))} h ${Math.max(0,Math.floor(left%3600e3/60e3))} min) para subir la documentación requerida o la oferta se invalida.`,`Offer made. Upload the required documents before ${when(offer.dueAt)} (${Math.max(0,Math.floor(left/3600e3))} h ${Math.max(0,Math.floor(left%3600e3/60e3))} min left) or the offer is invalidated.`)}`}
       ${offer.invalidatedAt?'':`<label class="btn-card">📎 ${L('Subir documentos de esta casa','Upload documents for this home')}<input type="file" hidden accept="image/*,application/pdf" data-tdoc="${esc(h.id)}" data-toffer="${esc(offer.offerId)}"></label>`}</div>`;}
    else if(myFb)after=`<div class="tour-done">✅ ${L('Comentarios enviados','Feedback sent')}${myFb.rating?' · '+'★'.repeat(myFb.rating):''}</div>`;
    else if(t.role==='CLIENT')after=fbOpen[t.id+'|'+h.id]?feedbackForm(t,h):`<button type="button" class="btn-card primary" data-tfbopen="${esc(t.id+'|'+h.id)}">⭐ ${L('Dar mis comentarios','Give feedback')}</button>`;
    else if(t.role==='AGENT')after=fbOpen[t.id+'|'+h.id]?feedbackForm(t,h):`<div class="tour-btns"><button type="button" class="btn-card" data-tfbopen="${esc(t.id+'|'+h.id)}">📝 ${L('Dejar comentarios','Leave feedback')}</button><span class="ops-meta">${L('o','or')}</span><button type="button" class="btn-card primary" data-offerpop="${esc(h.id)}" data-tofferfor="${esc(t.id)}">💰 ${L('Hacer una oferta','Make an offer')}</button></div><p class="ops-meta">${L('Elige una: comentarios u oferta. Si haces oferta tendrás 12 horas para subir la documentación.','Pick one: feedback or an offer. If you make an offer you will have 12 hours to upload the documents.')}</p>`;
  }
  if(t.role==='ADMIN'){const fbs=(t.feedback||[]).filter(f=>f.listingId===h.id);after=fbs.map(f=>`<div class="tour-done">${f.authorRole==='CLIENT'?'👤':'🧑‍💼'} ${f.rating?'★'.repeat(f.rating)+' ':''}${esc(f.comments||'')}${f.sellerFlag?` <span class="tour-warn">⚠️ ${L('Esta casa no tiene compañía/vendedor ligado; solo te llegó a ti.','No company/seller linked to this home; it only went to you.')}</span>`:''}</div>`).join('')+(offer?offerCard(t,h,offer):'');}
  // Access: the code shows only to the accepted agent (and Admin). No code yet => "Preguntar" (call or text the Beside line).
  const access=(t.role==='AGENT'||t.role==='ADMIN')&&t.status==='ACCEPTED'?(h.accessCode?`<div class="tour-code">🔑 ${L('Código de acceso','Access code')}: <b>${esc(h.accessCode)}</b></div>`:`<div class="tour-code"><button type="button" class="btn-card" data-task="${esc(t.id+'|'+h.id)}">❓ ${L('Preguntar','Ask')}</button></div>`):'';
  return `<li class="tour-stop"><span class="tour-n">${i+1}</span><span class="tour-stop-main"><a href="#" data-open="${esc(h.id)}">${homeLine(h)}</a>${access}${after}</span>${editable&&n>1?`<span class="tour-move"><button type="button" class="btn-card" data-tmove="${esc(t.id)}" data-tidx="${i}" data-tdir="-1" ${i===0?'disabled':''} aria-label="${esc(L('Subir','Move up'))}">↑</button><button type="button" class="btn-card" data-tmove="${esc(t.id)}" data-tidx="${i}" data-tdir="1" ${i===n-1?'disabled':''} aria-label="${esc(L('Bajar','Move down'))}">↓</button></span>`:''}</li>`;
}
function tourCard(t){
  const live=['REQUESTED','ACCEPTED'].includes(t.status);
  const wait=t.status==='REQUESTED'?(t.direct?`<p class="ops-meta">⏳ ${L('Enviada a tu agente. Te llegará una notificación cuando la apruebe o la rechace.','Sent to your agent. You will get a notification when they approve or decline it.')}</p>`:`<p class="ops-meta">⏳ ${L('Les avisamos a los agentes con licencia. Te llegará una notificación cuando uno acepte tu cita.','We notified licensed agents. You will get a notification when one accepts your showing.')}</p>`):'';
  const declined=t.status==='DECLINED'?`<p class="tour-warn">${L('Tu agente no puede en ese horario.','Your agent can’t make that time.')}${t.declineReason?' '+esc(t.declineReason):''} ${L('Puedes pedir otra fecha u hora.','You can request another date or time.')}</p>`:'';
  const cr=t.status==='CANCELLED'&&t.cancelReason?`<p class="ops-meta">❌ ${L('Razón de la cancelación','Cancellation reason')}: <b>${esc(L(t.cancelReason.labelEs,t.cancelReason.labelEn))}</b>${t.cancelReason.text?' — '+esc(t.cancelReason.text):''}</p>`:'';
  const merged=t.mergedInto?`<p class="ops-meta">➕ ${L('Estas casas se agregaron a la ruta del mismo día.','These homes were added to the same-day route.')}</p>`:'';
  const changeable=(t.status==='ACCEPTED'||(t.status==='REQUESTED'&&t.direct))&&!!t.agent&&Date.now()<new Date(t.startsAt).getTime();
  // v39 (2:39 PM): only the client changes the date/time; the agent approves or declines the request.
  const prop=t.proposal?(t.role==='AGENT'||t.role==='ADMIN'?`<div class="tour-prop"><p>📅 <b>${L('Cambio de cita solicitado','Showing change requested')}</b> ${L('por el cliente','by the client')}: <b>${esc(when(t.proposal.startsAt))}</b><br><small>${L('Ahora','Now')}: ${esc(when(t.proposal.from||t.startsAt))}</small>${t.proposal.note?'<br>'+esc(t.proposal.note):''}</p>${t.role==='AGENT'?`<div class="tour-btns"><button type="button" class="btn-card primary" data-tpans="${esc(t.id)}" data-tpv="1">✅ ${L('Aprobar cambio','Approve change')}</button><button type="button" class="btn-card" data-tpans="${esc(t.id)}" data-tpv="0">✕ ${L('Rechazar (mantener la hora original)','Decline (keep the original time)')}</button></div>${contactBtns(t.client)}`:''}</div>`
    :`<div class="tour-prop"><p>⏳ <b>${L('Pendiente de aprobación del agente','Waiting for your agent’s approval')}</b><br>${L('Cambio de cita solicitado','Showing change requested')}: <b>${esc(when(t.proposal.startsAt))}</b><br><small>${L('Hasta que tu agente lo apruebe, la cita sigue el','Until your agent approves it, the showing stays on')} ${esc(when(t.startsAt).replace(/\.$/,''))}.</small></p>${contactBtns(t.agent)}</div>`):'';
  const propBtn=t.proposal||!changeable?'':t.role==='CLIENT'?`<div class="tour-btns"><button type="button" class="btn-card" data-tprop="${esc(t.id)}">🕒 ${L('Cambiar fecha y hora','Change date and time')}</button><span class="ops-meta">${L('Tu agente tiene que aprobar el cambio.','Your agent has to approve the change.')}</span></div>`
    :t.role==='AGENT'?`<div class="tour-askw"><p class="ops-meta">🕒 ${L('Para cambiar la cita, comunícate con el cliente; solo el cliente puede cambiar la hora.','To change the showing, contact the client; only the client can change the time.')}</p>${contactBtns(t.client)}</div>`:'';
  const more=t.role==='CLIENT'&&t.status==='ACCEPTED'&&Date.now()<new Date(t.startsAt).getTime()?`<div class="tour-btns"><button type="button" class="btn-card" data-tmore="${esc(t.id)}">➕ ${L('¿Más casas ese mismo día? Enviar al agente','More homes that same day? Send to the agent')}</button><span class="ops-meta">${L('Si tu agente las aprueba, se agregan a esta misma ruta.','If your agent approves them, they are added to this same route.')}</span></div>`:'';
  const decide=t.role==='AGENT'&&t.status==='REQUESTED'&&t.direct?`<div class="tour-btns"><button type="button" class="btn-card primary" data-taccept="${esc(t.id)}">✅ ${L('Aprobar','Approve')}</button><button type="button" class="btn-card btn-del" data-tdecline="${esc(t.id)}">✕ ${L('Rechazar','Decline')}</button><span class="ops-meta">${L('Según tu agenda, el código de acceso y si la casa está disponible.','Based on your schedule, the access code and whether the home is available.')}</span></div>`:'';
  const sameDay=t.status==='REQUESTED'&&t.direct&&data&&data.tours.find(x=>x.id!==t.id&&x.status==='ACCEPTED'&&dayOf(x.startsAt)===dayOf(t.startsAt));
  const addNote=sameDay?`<p class="ops-meta">➕ ${t.role==='AGENT'?L(`Si apruebas, estas casas se agregan a la ruta que ya tienen ese día (${sameDay.homes.length} + ${t.homes.length}).`,`If you approve, these homes are added to your existing route that day (${sameDay.homes.length} + ${t.homes.length}).`):L(`Si tu agente aprueba, se agregan a tu ruta de ese día (${sameDay.homes.length} + ${t.homes.length}).`,`If your agent approves, they are added to your route that day (${sameDay.homes.length} + ${t.homes.length}).`)}</p>`:'';
  const other=(t.role==='CLIENT'?(t.agent?`<h3>${L('Tu agente','Your agent')}</h3>${personCard(t.agent,true)}`:'')+wait+declined+more
    :t.role==='AGENT'?`${t.direct&&t.status==='REQUESTED'?`<p class="tour-warn">📨 ${L('Tu cliente te mandó esta solicitud solo a ti.','Your client sent this request only to you.')}</p>`:''}<h3>${L('Tu cliente','Your client')}</h3>${personCard(t.client,false)}${decide}`
    :`<p class="ops-meta">👤 ${esc(t.client&&t.client.name||'')} ${t.client&&t.client.email?'· '+esc(t.client.email):''} · 🧑‍💼 ${esc(t.agent?t.agent.name:L('sin agente','no agent'))}</p>`)+prop+propBtn+addNote+cr+merged;
  const ml=mapsLink(t.homes);
  return `<article class="card tour-card${location.hash.includes('tour='+t.id)?' tour-focus':''}" id="tour-${esc(t.id)}"><div class="tour-head"><h3>📅 ${esc(when(t.startsAt))}</h3>${statusPill(t.status)}</div>
   <p class="ops-meta">${t.homes.length} ${t.homes.length===1?L('casa','home'):L('casas','homes')}${t.routeKm?` · ${L('ruta aprox.','route approx.')} ${t.routeKm} km`:''}</p>
   ${other}
   <h3>🗺️ ${L('Ruta','Route')}</h3><ol class="tour-route">${t.homes.map((h,i)=>homeRow(t,h,i,t.homes.length)).join('')}</ol>
   <div class="tour-btns">${ml?`<a class="btn-card" href="${esc(ml)}" target="_blank" rel="noopener">🧭 ${L('Abrir ruta en Google Maps','Open route in Google Maps')}</a>`:''}${live&&t.role!=='ADMIN'&&t.homes.length>2?`<button type="button" class="btn-card" data-tauto="${esc(t.id)}">📍 ${L('Ordenar por distancia','Sort by distance')}</button>`:''}
   ${t.status==='ACCEPTED'?`<a class="btn-card" href="${esc(t.calendar.google)}" target="_blank" rel="noopener">📆 Google Calendar</a><button type="button" class="btn-card" data-tics="${esc(t.id)}">🍎 ${L('Apple / Outlook (.ics)','Apple / Outlook (.ics)')}</button>`:''}
   ${live&&t.role!=='AGENT'?`<button type="button" class="btn-card btn-del" data-tcancel="${esc(t.id)}">${L('Cancelar cita','Cancel showing')}</button>`:''}</div></article>`;
}
function openSection(){
  if(!data||!data.canAccept)return '';
  const o=data.open||[];const mineReq=(data.tours||[]).filter(t=>t.role==='AGENT'&&t.direct&&t.status==='REQUESTED').length;
  return `<section class="card tour-card"><h2>🔔 ${L('Clientes que quieren ver casas','Clients who want to see homes')}</h2><p class="ops-meta">${L('Clientes sin agente: el primer agente que acepte se queda con el cliente. El nombre del cliente se muestra cuando aceptas.','Clients without an agent: the first agent to accept gets the client. The client’s name shows after you accept.')}</p>${mineReq?`<p class="tour-warn">📨 ${L(`Tienes ${mineReq} ${mineReq===1?'solicitud':'solicitudes'} de tus clientes para aprobar o rechazar (abajo).`,`You have ${mineReq} request(s) from your clients to approve or decline (below).`)}</p>`:''}
   ${o.length?o.map(t=>`<div class="tour-open"><b>${L(`Un cliente quiere ver ${t.count} ${t.count===1?'propiedad':'propiedades'}`,`A client wants to see ${t.count} ${t.count===1?'property':'properties'}`)}</b><div class="ops-meta">📅 ${esc(when(t.startsAt))}</div><ul>${t.homes.map(h=>`<li>${homeLine(h)}</li>`).join('')}</ul><button type="button" class="btn-card primary" data-taccept="${esc(t.id)}">✅ ${L('Aceptar cita','Accept showing')}</button></div>`).join(''):`<p>${L('No hay solicitudes abiertas ahora.','No open requests right now.')}</p>`}</section>`;
}
function view(){
  if(!S.user)return `<section class="card tour-card"><p>${L('Inicia sesión para usar el carrito de citas.','Sign in to use the showing cart.')}</p></section>`;
  load(false);
  const head=`<div class="tour-wrap">${DEMO?`<p class="tour-warn">🧪 ${L('Modo demostración: nada se guarda ni se envía.','Demo mode: nothing is saved or sent.')}</p>`:''}`;
  if(!data&&!lastErr)return head+`<p style="padding:18px">${L('Cargando…','Loading…')}</p></div>`;
  if(data&&data.unavailable)return head+(isClient()?cartSection():'')+`<section class="card tour-card"><p>⏳ ${L('Las citas con carrito se activan cuando Fernando apruebe el cambio de base de datos. Mientras tanto puedes armar tu carrito; para agendar llama o escribe al (405) 338-4124. Si ahí no está, pide una llamada con Fernando lo antes posible.','Cart showings turn on once Fernando approves the database change. You can build your cart meanwhile; to book, call or text (405) 338-4124. If that number cannot help, ask for a call with Fernando as soon as possible.')}</p></section></div>`;
  if(lastErr&&!data)return head+`<p class="tour-warn" style="margin:18px">${esc(lastErr)}</p></div>`;
  const mine=(data.tours||[]);const live=mine.filter(t=>['REQUESTED','ACCEPTED'].includes(t.status)||t.feedbackDue&&!['CANCELLED','EXPIRED','DECLINED'].includes(t.status));const past=mine.filter(t=>!live.includes(t));
  const sf=(data.sellerFeedback||[]);
  return head+(isClient()?cartSection():'')+openSection()+sellerSection()+
   `<section class="tour-list"><h2>${S.isAdmin()?L('Todas las citas con carrito','All cart showings'):L('Mis citas','My showings')}</h2>${live.map(tourCard).join('')||`<p class="ops-meta" style="padding:0 18px">${L('No tienes citas próximas.','No upcoming showings.')}</p>`}
   ${past.length?`<details class="card tour-card"><summary>${L('Citas anteriores','Past showings')} (${past.length})</summary>${past.map(tourCard).join('')}</details>`:''}</section>`+
   (sf.length?`<section class="card tour-card"><h2>💬 ${L('Comentarios de visitas a tus casas','Showing feedback on your homes')}</h2><ul>${sf.map(f=>`<li><b>${esc(f.address||'')}, ${esc(f.city||'')}</b> · ${f.authorRole==='CLIENT'?L('Cliente','Client'):L('Agente','Agent')} ${f.rating?'★'.repeat(f.rating):''} — ${esc(f.comments||'')}</li>`).join('')}</ul></section>`:'')+`</div>`;
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
  const m=sheet(`<h3>❓ ${L('Preguntar','Ask')}</h3><p class="ops-meta">${esc(homeLine(h).replace(/&amp;/g,'&'))}</p>
   <div class="tour-btns"><a class="btn-card primary" href="tel:${BESIDE_TEL}">📞 ${L('Llamar','Call')}</a><button type="button" class="btn-card" data-askw="1">💬 ${L('Escribir','Text')}</button></div>
   <div class="tour-askw" hidden><label>${L('Mensaje','Message')}<textarea rows="5" maxlength="600">${esc(txt)}</textarea></label><div class="tour-btns"><a class="btn-card primary" data-asksend="1" href="#">📤 ${L('Enviar mensaje','Send message')}</a></div></div>`);
  const w=m.querySelector('.tour-askw'),ta=w.querySelector('textarea'),send=w.querySelector('[data-asksend]');
  const sync=()=>{send.href=`sms:${BESIDE_TEL}?&body=${encodeURIComponent(ta.value)}`;};sync();ta.addEventListener('input',sync);
  m.querySelector('[data-askw]').addEventListener('click',()=>{w.hidden=false;ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);});
}
function contactBtns(p){if(!p)return '';const tel=p.phone?String(p.phone).replace(/[^\d+]/g,''):'';return `<div class="tour-btns">${tel?`<a class="btn-card primary" href="tel:${esc(tel)}">📞 ${L('Llamar','Call')}</a>`:''}<button type="button" class="btn-card" data-tchat="${esc(p.id)}" data-tname="${esc(p.name||'')}">💬 ${L('Escribir','Message')}</button></div>`;}
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
function stepBody(p,c,role){
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
function checklist(p,role){
  return `<ol class="tour-check">${p.checklist.map(c=>{const st=STATUS_LABEL[c.status]||STATUS_LABEL.PENDING;const due=c.dueAt&&['DOCS','DEPOSIT'].includes(c.key)&&!['APPROVED','DONE','NA','INVALIDATED'].includes(c.status)?` · ${L('antes del','by')} ${esc(when(c.dueAt))}`:'';
    const live=!p.invalidatedAt&&p.decision!=='DENIED';
    return `<li class="tour-check-i s-${c.status.toLowerCase()}"><div><span>${st[2]} <b>${c.n}) ${esc(L(...STEP_LABEL[c.key]))}</b>${c.key==='DOCS'&&['PENDING','LATE'].includes(c.status)?' '+L('(12 horas desde la pre-aprobación)','(12 hours from the pre-approval)'):''}${c.key==='DEPOSIT'&&['PENDING','LATE'].includes(c.status)?' '+L('(72 horas desde la pre-aprobación)','(72 hours from the pre-approval)'):''}<br><small>${esc(L(st[0],st[1]))}${due}</small></span>${live?`<div class="tour-step-body">${stepBody(p,c,role)}</div>`:''}</div></li>`;}).join('')}</ol>`;
}
const money=c=>{const v=Number(c)/100;return Number.isFinite(v)&&v>0?'$'+v.toLocaleString('en-US',{maximumFractionDigits:2}):'';};
function amountLine(p){const a=p&&p.amount;if(!a)return '';return [money(a.price),a.down?L('enganche ','down ')+money(a.down):'',a.monthly?money(a.monthly)+L('/mes','/mo'):''].filter(Boolean).join(' · ');}
function homeStatusLine(p){const h=p&&p.homeStatus;if(!h||p.invalidatedAt)return '';const lbl=/PENDING/.test(h.status)?L('Pendiente','Pending'):esc(h.status);
  return `<p class="ops-meta">🏠 ${L('Estado de la casa','Home status')}: <b>${lbl}</b>${h.simulated?' · '+L('modo de prueba: simulado, la casa real no cambió','test mode: simulated, the real home did not change'):''}</p>`;}
function decisionLine(p){
  if(p.invalidatedAt)return `<p class="tour-warn">❌ <b>${L('Oferta anulada (vencida)','Offer voided (expired)')}</b>: ${p.voidReason==='DEPOSIT'?L('no se subió el comprobante del depósito de $1,000 dentro de 72 horas desde la pre-aprobación.','the $1,000 deposit proof was not uploaded within 72 hours of the pre-approval.'):L('no se subieron los documentos dentro de 12 horas desde la pre-aprobación.','the documents were not uploaded within 12 hours of the pre-approval.')}</p>`;
  if(p.decision==='DENIED')return `<p class="tour-warn">❌ ${L('El dueño no aceptó la oferta.','The owner did not accept the offer.')}${p.decisionNote?' '+esc(p.decisionNote):''}</p>`;
  if(p.underContract)return `<p class="tour-done">📝 ${L('Bajo contrato (condición aprobada).','Under contract (condition approved).')}${!p.docsUploadedAt&&p.docsDueAt?' '+L('Falta la documentación','Documents still needed')+` — ${L('antes del','by')} ${esc(when(p.docsDueAt))}.`:''}${!p.depositProofAt&&p.depositDueAt?' '+L('Falta el comprobante del depósito de $1,000','The $1,000 deposit proof is still needed')+` — ${L('antes del','by')} ${esc(when(p.depositDueAt))}.`:''}</p>`;
  if(p.decision==='PRE_APPROVED')return `<p class="tour-done">✅ ${L('El dueño pre-aprobó la oferta. Documentos','The owner pre-approved the offer. Documents')}: <b>${L('antes del','by')} ${esc(when(p.docsDueAt))}</b> (12 h) · ${L('Depósito de $1,000 con comprobante','$1,000 deposit with proof')}: <b>${L('antes del','by')} ${esc(when(p.depositDueAt))}</b> (72 h). ${L('Si falta cualquiera a tiempo, la oferta se anula automáticamente. La casa pasa a Pendiente cuando el vendedor apruebe las 3 condiciones (oferta, documentos y depósito).','If either one is missing in time, the offer is voided automatically. The home goes to Pending once the seller approves all 3 conditions (offer, documents and deposit).')}</p>`;
  return `<p class="ops-meta">⏳ ${L('Esperando la pre-aprobación del dueño. Los plazos (12 h documentos, 72 h depósito) empiezan cuando la pre-apruebe.','Waiting for the owner’s pre-approval. The clocks (12 h documents, 72 h deposit) start when it is pre-approved.')}${p.resumes?' 🔄 '+L('Oferta reanudada.','Offer resumed.'):''}</p>`;
}
function offerCard(t,h,o){
  const p=o.pipeline;const live=!o.invalidatedAt&&!(p&&p.decision==='DENIED');
  const head=p&&p.invalidatedAt?`<div class="tour-warn">❌ <b>${L('Oferta anulada','Offer voided')}</b> · ${esc(when(p.offerAt))}${amountLine(p)?' · '+esc(amountLine(p)):''}</div>`:`<div class="tour-done">✅ <b>${L('Oferta enviada','Offer sent')}</b> · ${esc(when(p?p.offerAt:o.dueAt))}${p&&amountLine(p)?' · '+esc(amountLine(p)):''}</div>`;
  if(!p)return `<div class="tour-offer">${head}</div>`;
  const ups=live&&t.role!=='ADMIN'?`<div class="tour-btns">${!p.docsUploadedAt?`<label class="btn-card">📎 ${L('Subir documentos','Upload documents')}<input type="file" hidden accept="image/*,application/pdf" data-tdoc="${esc(h.id)}" data-toffer="${esc(o.offerId)}"></label>`:''}${!p.depositProofAt?`<label class="btn-card">💵 ${L('Subir comprobante del depósito ($1,000)','Upload deposit proof ($1,000)')}<input type="file" hidden accept="image/*,application/pdf" data-tdep="${esc(h.id)}" data-toffer="${esc(o.offerId)}"></label>`:''}</div>`:'';
  const voidBox=p.invalidatedAt?(t.role==='AGENT'?`<div class="tour-btns"><button type="button" class="btn-card primary" data-tresume="${esc(o.offerId)}" data-tlid="${esc(h.id)}">🔄 ${L('Reanudar oferta','Resume offer')}</button><button type="button" class="btn-card btn-del" data-tarch="${esc(o.offerId)}">🗑️ ${L('Eliminar oferta','Delete offer')}</button></div><p class="ops-meta">${L('Reanudar abre la oferta para revisarla y enviarla de nuevo: vuelve al dueño como nueva, tiene que pre-aprobarla otra vez y los plazos y condiciones empiezan de cero.','Resume opens the offer so you can review it and send it again: it goes back to the owner as new, they must pre-approve it again, and the clocks and conditions start over.')}</p>`:`<p class="ops-meta">${L('Tu agente puede reanudarla o eliminarla.','Your agent can resume it or delete it.')}</p>`):'';
  if(p.invalidatedAt)return `<div class="tour-offer${focusOffer(o.offerId)}" id="offer-${esc(o.offerId)}">${head}${decisionLine(p)}${voidBox}</div>`;
  return `<div class="tour-offer${focusOffer(o.offerId)}" id="offer-${esc(o.offerId)}">${head}${decisionLine(p)}${homeStatusLine(p)}<h4>${L('Próximos pasos','Next steps')}</h4>${checklist(p,t.role)}${ups}</div>`;
}
function sellerSection(){
  const so=(data&&data.sellerOffers)||[];if(!so.length)return '';
  return `<section class="card tour-card"><h2>💰 ${S.isAdmin()?L('Ofertas de citas (vendedor / Admin)','Showing offers (seller / Admin)'):L('Ofertas en tus casas','Offers on your homes')}</h2>${so.map(p=>{
    const btns=p.invalidatedAt||p.decision==='DENIED'?'':!p.decision?`<div class="tour-btns"><button type="button" class="btn-card primary" data-tdecide="${esc(p.offerId)}" data-tdv="approve">✅ ${L('Pre-aprobar','Pre-approve')}</button><button type="button" class="btn-card btn-del" data-tdecide="${esc(p.offerId)}" data-tdv="deny">✕ ${L('Negar','Deny')}</button></div>`
      :p.decision==='PRE_APPROVED'?`<div class="tour-btns">${p.depositProofAt&&!p.depositApprovedAt?`<button type="button" class="btn-card primary" data-tcond="${esc(p.offerId)}" data-tcw="deposit">✅ ${L('Aprobar depósito de $1,000','Approve $1,000 deposit')}</button>`:''}${p.docsUploadedAt&&!p.docsApprovedAt?`<button type="button" class="btn-card primary" data-tcond="${esc(p.offerId)}" data-tcw="docs">✅ ${L('Aprobar documentos','Approve documents')}</button>`:''}${!p.depositProofAt&&!p.docsUploadedAt?`<span class="ops-meta">${L('Esperando el comprobante del depósito o los documentos.','Waiting for the deposit proof or the documents.')}</span>`:''}</div>`:'';
    const docs=(p.documents||[]).length?`<p class="ops-meta">📎 ${(p.documents||[]).map(x=>esc((x.docType==='DEPOSIT_PROOF'?'💵 ':'')+x.name)).join(' · ')}</p>`:'';
    return `<article class="tour-sell${focusOffer(p.offerId)}" id="offer-${esc(p.offerId)}"><h3>${esc(p.address)}${p.city?', '+esc(p.city):''}</h3>${p.owner?`<p class="ops-meta">🏢 ${L('Vendedor','Seller')}: <b>${esc(p.owner.companyName||(p.owner.investorOnly?L('Inversionista asignado','Assigned investor'):L('Administrador','Administrator')))}</b>${p.owner.byDefault?' · '+L('por defecto (casa sin vendedor asignado; el Admin puede moverla a otra compañía en Compañías)','default (home without an assigned seller; Admin can move it to another company under Companies)'):''}</p>`:''}<p class="ops-meta">${L('Oferta inicial','Initial offer')} · ${esc(when(p.offerAt))}${amountLine(p)?' · <b>'+esc(amountLine(p))+'</b>':''}</p>${decisionLine(p)}${homeStatusLine(p)}${btns}${docs}${checklist(p,S.isAdmin()?'ADMIN':'SELLER')}</article>`;}).join('')}</section>`;
}
/* ---------- events ---------- */
async function act(fn){if(busy)return;busy=true;try{await fn();}catch(e){alert(e.message||String(e));}finally{busy=false;}}
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('[data-tgooffer],[data-tcart],[data-tbook],[data-tcartdel],[data-tgo],[data-taccept],[data-tmove],[data-tauto],[data-tics],[data-tcancel],[data-tchat],[data-tfbopen],[data-tofferfor],[data-tdecline],[data-tmore],[data-task],[data-tprop],[data-tpans],[data-tdecide],[data-tcond],[data-tflow],[data-ttrr],[data-ttrrd],[data-tclchg],[data-tresume],[data-tarch]');if(!t)return;
  const d=t.dataset;
  if(d.tresume){openResume(d.tresume);return;}
  if(d.tarch){if(!confirm(L('¿Eliminar esta oferta? Se quita de tu lista (queda en el historial).','Delete this offer? It is removed from your list (it stays in the history).')))return;act(async()=>{await call('tour_offer_archive',{offerId:d.tarch});await load(true);});return;}
  if(d.tofferfor){setTimeout(()=>load(true),6000);setTimeout(()=>load(true),15000);return;} // existing offer popup opens; refresh to show the 12-hour clock
  e.preventDefault();e.stopPropagation();
  if((d.tcart||d.tbook)&&!S.user){document.querySelectorAll('.modal-backdrop,.lof-pop-bg').forEach(x=>x.remove());return UI().go('auth');}
  if(d.tcart){if(inCart(d.tcart)){removeFromCart(d.tcart);}else addToCart(d.tcart);return rerender();}
  if(d.tbook){if(addToCart(d.tbook)){document.querySelectorAll('.modal-backdrop,.drawer-bg,.lof-pop-bg').forEach(x=>x.remove());UI().go('tours');setTimeout(()=>{const f=document.querySelector('#tourReqF [name=date]');if(f){f.scrollIntoView({behavior:'smooth',block:'center'});f.focus();}},120);}return;}
  if(d.tgooffer){scrolledTo='';location.hash='tours&offer='+encodeURIComponent(d.tgooffer);return;}
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
  if(d.tpans){if(d.tpv!=='1'&&!confirm(L('¿Rechazar el cambio? La cita se queda en la hora original y le avisamos al cliente.','Decline the change? The showing keeps the original time and we let the client know.')))return;return act(async()=>{await call('tour_proposal_answer',{tourId:d.tpans,accept:d.tpv==='1'});await load(true);alert(d.tpv==='1'?L('Listo. La cita quedó con la nueva hora; le avisamos al cliente y al vendedor.','Done. The showing has the new time; we let the client and the seller know.'):L('Listo. La cita se queda en la hora original; le avisamos al cliente.','Done. The showing keeps the original time; we let the client know.'));});}
  if(d.tdecide){const ok=d.tdv==='approve';const note=ok?'':prompt(L('¿Por qué la niegas? (opcional; el agente y el cliente lo verán)','Why are you denying it? (optional; the agent and client will see it)'),'');if(note===null)return;if(ok&&!confirm(L('¿Pre-aprobar esta oferta?','Pre-approve this offer?')))return;return act(async()=>{await call('tour_offer_decide',{offerId:d.tdecide,decision:d.tdv,note:note||''});await load(true);});}
  if(d.tflow){if(d.tflow==='inspection_request'&&!confirm(L('¿Pedir inspección para esta casa?','Request an inspection for this home?')))return;return act(async()=>{await call('tour_offer_flow',{offerId:d.toffer,op:d.tflow});await load(true);});}
  if(d.ttrr){const m=sheet(`<h3>🛠️ ${L('Negociar TRR','Negotiate TRR')}</h3><p class="ops-meta">${L('Escribe todo lo que el comprador pide al vendedor reparar, reemplazar o tratar.','Write everything the buyer asks the seller to repair, replace or treat.')}</p><form class="tour-form" id="tourTrrF"><textarea name="text" rows="7" maxlength="4000" required placeholder="${esc(L('Ej.: Reparar fuga del baño principal; reemplazar calentador de agua; tratar termitas en la cochera.','E.g.: Fix the main bathroom leak; replace the water heater; treat termites in the garage.'))}"></textarea><div class="tour-btns"><button type="submit" class="btn-card primary">📨 ${L('Enviar al vendedor','Send to the seller')}</button></div></form>`);
    m.querySelector('#tourTrrF').addEventListener('submit',ev=>{ev.preventDefault();const text=ev.target.text.value.trim();act(async()=>{await call('tour_offer_flow',{offerId:d.ttrr,op:'trr_submit',text});m.remove();await load(true);});});return;}
  if(d.ttrrd){let text='';if(d.tdv!=='accept'){text=prompt(d.tdv==='counter'?L('Escribe tu contraoferta (qué sí reparas, qué no, o un crédito):','Write your counteroffer (what you will repair, what not, or a credit):'):L('Razón (opcional; el agente y el cliente la verán):','Reason (optional; the agent and client will see it):'),'');if(text===null)return;}
    return act(async()=>{await call('tour_offer_flow',{offerId:d.ttrrd,op:'trr_decide',decision:d.tdv,text});await load(true);});}
  if(d.tclchg){const m=sheet(`<h3>📅 ${L('Proponer otra fecha de cierre','Propose another closing date')}</h3><form class="tour-form" id="tourClF"><fieldset class="tour-reasons"><legend><b>${L('¿Por qué no te queda? (obligatorio)','Why doesn’t it work? (required)')}</b></legend>${CLOSING_REASONS.map(r=>`<label class="tour-reason"><input type="radio" name="code" value="${r[0]}" required> ${esc(L(r[1],r[2]))}</label>`).join('')}</fieldset><label class="tour-other" hidden>${L('Escribe la razón','Write the reason')}<textarea name="rtext" rows="2" maxlength="500"></textarea></label><label>${L('Nueva fecha','New date')}<input type="date" name="date" min="${chicagoDay(new Date())}" required></label><label>${L('Hora','Time')}<select name="time">${timeOptions('10:00')}</select></label><p class="ops-meta">${L('Las aprobaciones se reinician hasta que todos estén de acuerdo.','Approvals reset until everyone agrees.')}</p><div class="tour-btns"><button type="submit" class="btn-card primary">📨 ${L('Proponer','Propose')}</button></div></form>`);
    const f=m.querySelector('#tourClF'),oth=f.querySelector('.tour-other');f.addEventListener('change',()=>{oth.hidden=f.code.value!=='OTHER';f.rtext.required=f.code.value==='OTHER';});
    f.addEventListener('submit',ev=>{ev.preventDefault();const v=Object.fromEntries(new FormData(f));act(async()=>{await call('tour_offer_flow',{offerId:d.tclchg,op:'closing_propose',when:`${v.date}T${v.time}`,reasonCode:v.code,reasonText:v.code==='OTHER'?(v.rtext||''):''});m.remove();await load(true);});});return;}
  if(d.tcond)return act(async()=>{await call('tour_offer_condition',{offerId:d.tcond,which:d.tcw});await load(true);});
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
  if(t&&t.dataset&&t.dataset.tdoc&&t.files&&t.files[0]){act(async()=>{await S.uploadDocument(t.files[0],{docType:'OFFER_DOCS',listingId:t.dataset.tdoc,offerId:t.dataset.toffer});await load(true);alert(L('Documento subido.','Document uploaded.'));});}
},true);

/* ---------- "Mi agente" (client account): connected agent card + homes seen together + homes under contract ---------- */
const DONE_ST=['APPROVED','DONE','NA'];
function offerStep(p){
  if(!p)return L('Oferta enviada','Offer sent');
  if(p.completeAt||(p.checklist||[]).every(c=>DONE_ST.includes(c.status)))return '🎉 '+L('Cerrada','Closed');
  if(!p.decision)return '⏳ '+L('Oferta enviada — esperando la pre-aprobación del dueño','Offer sent — waiting for the owner’s pre-approval');
  const c=(p.checklist||[]).find(x=>!DONE_ST.includes(x.status));if(!c)return '';
  const st=STATUS_LABEL[c.status]||STATUS_LABEL.PENDING;
  return `${st[2]} ${L('Paso','Step')} ${c.n}/7: ${L(...STEP_LABEL[c.key])} — ${L(st[0],st[1])}`;
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
   <p>${L('Agrega las casas que te gustan a tu carrito y pide una cita: el primer agente con licencia que la acepte será tu agente y te acompañará a verlas, en español o en inglés.','Add the homes you like to your cart and request a showing: the first licensed agent who accepts it becomes your agent and shows you the homes, in English or Spanish.')}</p>
   <div class="tour-btns"><button type="button" class="btn-card primary" data-tab="tours">📅 ${L('Pedir una cita / conectar con un agente','Request a showing / connect with an agent')}</button><button type="button" class="btn-card" data-tab="inventory">🏠 ${L('Ver casas','See homes')}</button></div>
   <p class="ops-meta">${L('¿Preguntas? Llama o escribe al (405) 338-4124.','Questions? Call or text (405) 338-4124.')}</p></section></div>`;
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
    ${next?`<p class="tour-done">📅 ${L('Próxima cita','Next showing')}: <b>${esc(when(next.startsAt))}</b> · ${next.homes.length} ${next.homes.length===1?L('casa','home'):L('casas','homes')} <button type="button" class="btn-card" data-tab="tours">${L('Ver','View')}</button></p>`:''}</section>
   <section class="card tour-card"><h3>👀 ${L('Casas vistas juntos','Homes we saw together')} <small>(${seenL.length})</small></h3>
    ${seenL.length?`<ul class="tour-cart ma-list">${seenL.map(x=>`<li class="tour-cart-item">${img(x.h)}<span><a href="#" data-open="${esc(x.h.id)}"><b>${homeTxt(x.h)}</b></a><br><small>📅 ${esc(day(x.at))}</small></span></li>`).join('')}</ul>`:`<p class="ops-meta">${L('Todavía no han visto casas juntos. Cuando tengas una cita con tu agente, las casas aparecen aquí.','You haven’t seen homes together yet. After a showing with your agent, the homes show up here.')}</p><button type="button" class="btn-card primary" data-tab="tours">🛒 ${L('Pedir una cita','Request a showing')}</button>`}</section>
   <section class="card tour-card"><h3>📝 ${L('Casas bajo contrato','Homes under contract')} <small>(${deals.length})</small></h3>
    ${deals.length?`<ul class="tour-cart ma-list">${deals.map(x=>`<li class="tour-cart-item">${img(x.h)}<span><a href="#" data-open="${esc(x.h.id)}"><b>${homeTxt(x.h)}</b></a><br><small>${esc(offerStep(x.p))}</small>${x.p&&amountLine(x.p)?`<br><small>${esc(amountLine(x.p))}</small>`:''}</span><button type="button" class="btn-card" data-tgooffer="${esc(x.o.offerId)}">${L('Ver pasos','See steps')}</button></li>`).join('')}</ul>`:`<p class="ops-meta">${L('No tienes ofertas activas con tu agente. Cuando tu agente haga una oferta por ti, verás aquí en qué paso va hasta el cierre.','No active offers with your agent. When your agent makes an offer for you, you’ll see its step here until closing.')}</p>`}
    ${closed.length?`<h4>🎉 ${L('Cerradas con tu agente','Closed with your agent')} (${closed.length})</h4><ul class="tour-cart ma-list">${closed.map(x=>`<li class="tour-cart-item">${img(x.h)}<span><a href="#" data-open="${esc(x.h.id)}"><b>${homeTxt(x.h)}</b></a><br><small>${esc(offerStep(x.p))}</small></span><button type="button" class="btn-card" data-tgooffer="${esc(x.o.offerId)}">${L('Ver','View')}</button></li>`).join('')}</ul>`:''}</section></div>`;
}

window.LegacyTours={
  clientMode:()=>isClient()||!S.user,
  navVisible:()=>!!S.user&&(isClient()||isAgent()||S.isAdmin()||(S.isInvestor&&S.isInvestor()&&!S.isPendingApproval(S.user))),
  navLabel:()=>isClient()?'🛒 '+L('Carrito y citas','Cart & showings'):isAgent()?'🔔 '+L('Citas de clientes','Client showings'):S.isAdmin()?'🛒 '+L('Citas con carrito','Cart showings'):'💬 '+L('Comentarios de visitas','Showing feedback'),
  headerButton:()=>{if(!isClient())return '';const n=cart().length;return `<button type="button" class="tour-cart-btn" data-tgo="1" aria-label="${esc(L('Carrito de casas','Home cart'))}">🛒${n?`<span class="menu-badge">${n}</span>`:''}</button>`;},
  clientActionRow:l=>{if(S.user)load(false);const c=inCart(l.id),conn=connectedAgent();return `<div class="lof-act-row"><button type="button" class="btn-card${c?'':' primary'}" data-tcart="${esc(l.id)}">${c?'✓ '+L('En tu carrito (quitar)','In your cart (remove)'):'🛒 '+L('Agregar al carrito','Add to cart')}</button><button type="button" class="btn-card" data-tbook="${esc(l.id)}">📅 ${L('Solicitar cita','Request showing')}</button></div><p class="ops-meta tour-note">${conn?L('Junta las casas en tu carrito y envíalas a tu agente. Las ofertas las hace tu agente después de la visita.','Collect homes in your cart and send them to your agent. Your agent makes offers after the visit.'):L(`Junta hasta ${MAX} casas en tu carrito y pide una sola cita. Las ofertas las hace tu agente después de la visita.`,`Collect up to ${MAX} homes in your cart and request one showing. Your agent makes offers after the visit.`)}</p>`;},
  offerSentCard:l=>{if(!S.user||!S.data)return '';const T=['REJECTED','WITHDRAWN','INVALIDATED','FELL_THROUGH','CANCELLED','DECLINED'];const o=(S.data.offers||[]).filter(x=>x&&x.listingId===l.id&&x.userId===S.user.id&&!T.includes(String(x.status||'').toUpperCase())).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0];
    if(!o)return '';return `<div class="tour-done">✅ <b>${L('Oferta enviada','Offer sent')}</b>${o.createdAt?' · '+esc(when(o.createdAt)):''}${money(o.offerPrice)?' · '+esc(money(o.offerPrice)):''} <button type="button" class="btn-card" data-tgo="1">${L('Ver próximos pasos','See next steps')}</button></div>`;},
  agentNavVisible:()=>isClient(),agentNavLabel:()=>'🤝 '+L('Mi agente','My agent'),agentView,
  view,refresh:()=>load(true),cart
};
})();
