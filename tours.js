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
    if(action==='tour_accept'){const o=d.open.find(x=>x.id===body.tourId);if(o){d.open=d.open.filter(x=>x!==o);d.tours.unshift({...d.tours[0],id:o.id,status:'ACCEPTED',startsAt:o.startsAt,homes:o.homes,feedbackDue:false});}else{const t=d.tours.find(x=>x.id===body.tourId);if(t)t.status='ACCEPTED';}return {ok:true};}
    if(action==='tour_route_save'){const t=d.tours.find(x=>x.id===body.tourId);if(t&&body.order)t.homes=body.order.map(id=>t.homes.find(h=>h.id===id));return {ok:true};}
    if(action==='tour_feedback'){const t=d.tours.find(x=>x.id===body.tourId);if(t)t.feedback.push({listingId:body.listingId,authorRole:t.role,rating:body.rating,comments:body.comments});return {ok:true};}
    if(action==='tour_cancel'){const t=d.tours.find(x=>x.id===body.tourId);if(t)t.status='CANCELLED';return {ok:true};}
    return {ok:true};}
  return S.api(action,body||{});
}
async function load(force){
  if(!S.user||loading)return;if(!force&&data&&Date.now()-loadedAt<20000)return;
  loading=true;try{data=await call('tour_list');lastErr='';(data.tours||[]).forEach(t=>{const p=t.role==='CLIENT'?t.agent:t.client;if(p&&p.id&&p.name){S.tourPeerNames=S.tourPeerNames||{};S.tourPeerNames[p.id]=p.name;}});}
  catch(e){lastErr=e.message||String(e);}finally{loading=false;loadedAt=Date.now();}
  if(UI()&&UI().tab()==='tours')rerender();
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
  if(t.feedbackDue&&t.role!=='ADMIN'){
    if(offer){const due=new Date(offer.dueAt),left=due.getTime()-Date.now();
      after=`<div class="tour-offer">${offer.invalidatedAt?`❌ ${L('Oferta invalidada: no se subieron documentos en 12 horas.','Offer invalidated: no documents within 12 hours.')}`:offer.docsUploadedAt?`✅ ${L('Documentos recibidos.','Documents received.')}`:`⏰ ${L(`Oferta hecha. Hay hasta el ${when(offer.dueAt)} (${Math.max(0,Math.floor(left/3600e3))} h ${Math.max(0,Math.floor(left%3600e3/60e3))} min) para subir la documentación requerida o la oferta se invalida.`,`Offer made. Upload the required documents before ${when(offer.dueAt)} (${Math.max(0,Math.floor(left/3600e3))} h ${Math.max(0,Math.floor(left%3600e3/60e3))} min left) or the offer is invalidated.`)}`}
       ${offer.invalidatedAt?'':`<label class="btn-card">📎 ${L('Subir documentos de esta casa','Upload documents for this home')}<input type="file" hidden accept="image/*,application/pdf" data-tdoc="${esc(h.id)}" data-toffer="${esc(offer.offerId)}"></label>`}</div>`;}
    else if(myFb)after=`<div class="tour-done">✅ ${L('Comentarios enviados','Feedback sent')}${myFb.rating?' · '+'★'.repeat(myFb.rating):''}</div>`;
    else if(t.role==='CLIENT')after=fbOpen[t.id+'|'+h.id]?feedbackForm(t,h):`<button type="button" class="btn-card primary" data-tfbopen="${esc(t.id+'|'+h.id)}">⭐ ${L('Dar mis comentarios','Give feedback')}</button>`;
    else if(t.role==='AGENT')after=fbOpen[t.id+'|'+h.id]?feedbackForm(t,h):`<div class="tour-btns"><button type="button" class="btn-card" data-tfbopen="${esc(t.id+'|'+h.id)}">📝 ${L('Dejar comentarios','Leave feedback')}</button><span class="ops-meta">${L('o','or')}</span><button type="button" class="btn-card primary" data-offerpop="${esc(h.id)}" data-tofferfor="${esc(t.id)}">💰 ${L('Hacer una oferta','Make an offer')}</button></div><p class="ops-meta">${L('Elige una: comentarios u oferta. Si haces oferta tendrás 12 horas para subir la documentación.','Pick one: feedback or an offer. If you make an offer you will have 12 hours to upload the documents.')}</p>`;
  }
  if(t.role==='ADMIN'){const fbs=(t.feedback||[]).filter(f=>f.listingId===h.id);after=fbs.map(f=>`<div class="tour-done">${f.authorRole==='CLIENT'?'👤':'🧑‍💼'} ${f.rating?'★'.repeat(f.rating)+' ':''}${esc(f.comments||'')}${f.sellerFlag?` <span class="tour-warn">⚠️ ${L('Esta casa no tiene compañía/vendedor ligado; solo te llegó a ti.','No company/seller linked to this home; it only went to you.')}</span>`:''}</div>`).join('')+(offer?`<div class="tour-offer">💰 ${L('Oferta del agente','Agent offer')} · ${offer.invalidatedAt?L('invalidada','invalidated'):offer.docsUploadedAt?L('documentos recibidos','documents received'):L('vence','due')+' '+esc(when(offer.dueAt))}</div>`:'');}
  // Access: the code shows only to the accepted agent (and Admin). No code yet => "Preguntar" (call or text the Beside line).
  const access=(t.role==='AGENT'||t.role==='ADMIN')&&t.status==='ACCEPTED'?(h.accessCode?`<div class="tour-code">🔑 ${L('Código de acceso','Access code')}: <b>${esc(h.accessCode)}</b></div>`:`<div class="tour-code">🔑 ${L('Sin código de acceso','No access code')} <button type="button" class="btn-card" data-task="${esc(t.id+'|'+h.id)}">❓ ${L('Preguntar','Ask')}</button></div>`):'';
  return `<li class="tour-stop"><span class="tour-n">${i+1}</span><span class="tour-stop-main"><a href="#" data-open="${esc(h.id)}">${homeLine(h)}</a>${access}${after}</span>${editable&&n>1?`<span class="tour-move"><button type="button" class="btn-card" data-tmove="${esc(t.id)}" data-tidx="${i}" data-tdir="-1" ${i===0?'disabled':''} aria-label="${esc(L('Subir','Move up'))}">↑</button><button type="button" class="btn-card" data-tmove="${esc(t.id)}" data-tidx="${i}" data-tdir="1" ${i===n-1?'disabled':''} aria-label="${esc(L('Bajar','Move down'))}">↓</button></span>`:''}</li>`;
}
function tourCard(t){
  const live=['REQUESTED','ACCEPTED'].includes(t.status);
  const wait=t.status==='REQUESTED'?(t.direct?`<p class="ops-meta">⏳ ${L('Enviada a tu agente. Te llegará una notificación cuando la apruebe o la rechace.','Sent to your agent. You will get a notification when they approve or decline it.')}</p>`:`<p class="ops-meta">⏳ ${L('Les avisamos a los agentes con licencia. Te llegará una notificación cuando uno acepte tu cita.','We notified licensed agents. You will get a notification when one accepts your showing.')}</p>`):'';
  const declined=t.status==='DECLINED'?`<p class="tour-warn">${L('Tu agente no puede en ese horario.','Your agent can’t make that time.')}${t.declineReason?' '+esc(t.declineReason):''} ${L('Puedes pedir otra fecha u hora.','You can request another date or time.')}</p>`:'';
  const more=t.role==='CLIENT'&&t.status==='ACCEPTED'&&Date.now()<new Date(t.startsAt).getTime()?`<div class="tour-btns"><button type="button" class="btn-card" data-tmore="${esc(t.id)}">➕ ${L('¿Más casas ese mismo día? Enviar al agente','More homes that same day? Send to the agent')}</button></div>`:'';
  const decide=t.role==='AGENT'&&t.status==='REQUESTED'&&t.direct?`<div class="tour-btns"><button type="button" class="btn-card primary" data-taccept="${esc(t.id)}">✅ ${L('Aprobar','Approve')}</button><button type="button" class="btn-card btn-del" data-tdecline="${esc(t.id)}">✕ ${L('Rechazar','Decline')}</button><span class="ops-meta">${L('Según tu agenda, el código de acceso y si la casa está disponible.','Based on your schedule, the access code and whether the home is available.')}</span></div>`:'';
  const other=t.role==='CLIENT'?(t.agent?`<h3>${L('Tu agente','Your agent')}</h3>${personCard(t.agent,true)}`:'')+wait+declined+more
    :t.role==='AGENT'?`${t.direct&&t.status==='REQUESTED'?`<p class="tour-warn">📨 ${L('Tu cliente te mandó esta solicitud solo a ti.','Your client sent this request only to you.')}</p>`:''}<h3>${L('Tu cliente','Your client')}</h3>${personCard(t.client,false)}${decide}`
    :`<p class="ops-meta">👤 ${esc(t.client&&t.client.name||'')} ${t.client&&t.client.email?'· '+esc(t.client.email):''} · 🧑‍💼 ${esc(t.agent?t.agent.name:L('sin agente','no agent'))}</p>`;
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
  return head+(isClient()?cartSection():'')+openSection()+
   `<section class="tour-list"><h2>${S.isAdmin()?L('Todas las citas con carrito','All cart showings'):L('Mis citas','My showings')}</h2>${live.map(tourCard).join('')||`<p class="ops-meta" style="padding:0 18px">${L('No tienes citas próximas.','No upcoming showings.')}</p>`}
   ${past.length?`<details class="card tour-card"><summary>${L('Citas anteriores','Past showings')} (${past.length})</summary>${past.map(tourCard).join('')}</details>`:''}</section>`+
   (sf.length?`<section class="card tour-card"><h2>💬 ${L('Comentarios de visitas a tus casas','Showing feedback on your homes')}</h2><ul>${sf.map(f=>`<li><b>${esc(f.address||'')}, ${esc(f.city||'')}</b> · ${f.authorRole==='CLIENT'?L('Cliente','Client'):L('Agente','Agent')} ${f.rating?'★'.repeat(f.rating):''} — ${esc(f.comments||'')}</li>`).join('')}</ul></section>`:'')+`</div>`;
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
  document.querySelectorAll('.tour-ask-bg').forEach(x=>x.remove());
  const txt=askText(t,h);const m=document.createElement('div');m.className='tour-ask-bg';
  m.innerHTML=`<div class="tour-ask" role="dialog" aria-modal="true" aria-label="${esc(L('Preguntar por el acceso','Ask for access'))}"><button type="button" class="nav-pill tour-ask-x" data-taskclose="1" aria-label="${esc(L('Cerrar','Close'))}">✕</button><h3>❓ ${L('Preguntar por el acceso','Ask for access')}</h3><p class="ops-meta">${esc(homeLine(h).replace(/&amp;/g,'&'))}</p><p>${L(`Esta casa no tiene código. Llama o escribe al ${BESIDE_TXT}. Si ahí no está, agenda una llamada con Fernando lo antes posible.`,`This home has no code. Call or text ${BESIDE_TXT}. If they can’t help, schedule a call with Fernando as soon as possible.`)}</p>
   <div class="tour-btns"><a class="btn-card primary" href="tel:${BESIDE_TEL}">📞 ${L('Llamar','Call')}</a><a class="btn-card" href="sms:${BESIDE_TEL}?&body=${encodeURIComponent(txt)}">💬 ${L('Escribir','Text')}</a></div>
   <p class="ops-meta">${L('Mensaje que se va a enviar (lo puedes cambiar antes de mandarlo):','Message to send (you can edit it before sending):')}</p><blockquote class="tour-ask-msg">${esc(txt)}</blockquote></div>`;
  m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-taskclose]'))m.remove();});
  document.addEventListener('keydown',function k(e){if(e.key==='Escape'){m.remove();document.removeEventListener('keydown',k);}});
  document.body.appendChild(m);
}
/* ---------- events ---------- */
async function act(fn){if(busy)return;busy=true;try{await fn();}catch(e){alert(e.message||String(e));}finally{busy=false;}}
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('[data-tcart],[data-tbook],[data-tcartdel],[data-tgo],[data-taccept],[data-tmove],[data-tauto],[data-tics],[data-tcancel],[data-tchat],[data-tfbopen],[data-tofferfor],[data-tdecline],[data-tmore],[data-task]');if(!t)return;
  const d=t.dataset;
  if(d.tofferfor){setTimeout(()=>load(true),6000);setTimeout(()=>load(true),15000);return;} // existing offer popup opens; refresh to show the 12-hour clock
  e.preventDefault();e.stopPropagation();
  if((d.tcart||d.tbook)&&!S.user){document.querySelectorAll('.modal-backdrop,.lof-pop-bg').forEach(x=>x.remove());return UI().go('auth');}
  if(d.tcart){if(inCart(d.tcart)){removeFromCart(d.tcart);}else addToCart(d.tcart);return rerender();}
  if(d.tbook){if(addToCart(d.tbook)){document.querySelectorAll('.modal-backdrop,.drawer-bg,.lof-pop-bg').forEach(x=>x.remove());UI().go('tours');setTimeout(()=>{const f=document.querySelector('#tourReqF [name=date]');if(f){f.scrollIntoView({behavior:'smooth',block:'center'});f.focus();}},120);}return;}
  if(d.tgo){document.querySelectorAll('.modal-backdrop').forEach(x=>x.remove());return UI().go('tours');}
  if(d.tcartdel){removeFromCart(d.tcartdel);return rerender();}
  if(d.taccept)return act(async()=>{await call('tour_accept',{tourId:d.taccept});await load(true);alert(L('¡Listo! La cita es tuya. Ya puedes ver los datos del cliente, llamarle o escribirle en la app.','Done! The showing is yours. You can now see the client’s info, call or message them in the app.'));});
  if(d.tmove)return act(async()=>{const tour=data.tours.find(x=>x.id===d.tmove);if(!tour)return;const ids=tour.homes.map(h=>h.id),i=+d.tidx,j=i+(+d.tdir);if(j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];await call('tour_route_save',{tourId:tour.id,order:ids});await load(true);});
  if(d.task){const [tid,lid]=d.task.split('|');const tour=data.tours.find(x=>x.id===tid);const h=tour&&tour.homes.find(x=>x.id===lid);if(tour&&h)openAsk(tour,h);return;}
  if(d.tdecline){const reason=prompt(L('¿Por qué no puedes? (opcional; el cliente lo verá)','Why can’t you? (optional; the client will see it)'),'');if(reason===null)return;return act(async()=>{await call('tour_decline',{tourId:d.tdecline,reason});await load(true);});}
  if(d.tmore){const tour=data.tours.find(x=>x.id===d.tmore);if(!tour)return;const end=new Date(tour.endsAt||tour.startsAt);const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(end);const g={};p.forEach(x=>g[x.type]=x.value);let mins=Math.ceil((+g.hour*60+(+g.minute))/30)*30;mins=Math.min(Math.max(mins,9*60),19*60);form.date=`${g.year}-${g.month}-${g.day}`;form.time=String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
    if(!cart().length){alert(L('Agrega al carrito las casas extra y luego toca “Enviar a mi agente”. Ya dejamos lista la fecha de ese día.','Add the extra homes to your cart, then tap “Send to my agent”. The date for that day is already filled in.'));return UI().go('inventory');}
    rerender();setTimeout(()=>{const f=document.getElementById('tour-cart');if(f)f.scrollIntoView({behavior:'smooth'});},80);return;}
  if(d.tauto)return act(async()=>{await call('tour_route_save',{tourId:d.tauto,auto:true});await load(true);});
  if(d.tics){const tour=data.tours.find(x=>x.id===d.tics);if(tour)icsFor(tour);return;}
  if(d.tcancel){if(!confirm(L('¿Cancelar esta cita?','Cancel this showing?')))return;return act(async()=>{await call('tour_cancel',{tourId:d.tcancel});await load(true);});}
  if(d.tchat){if(S.msgEnabled&&!S.msgEnabled()){alert(L('Los mensajes no están disponibles ahora.','Messages are not available right now.'));return;}return UI().openChat(d.tchat,d.tname);}
  if(d.tfbopen){fbOpen[d.tfbopen]=true;return rerender();}
},true);
document.addEventListener('submit',e=>{
  const f=e.target;
  if(f&&f.id==='tourReqF'){e.preventDefault();const v=Object.fromEntries(new FormData(f));form={date:v.date,time:v.time,notes:v.notes||''};
    const ids=cart();if(!ids.length)return;
    if(!connectedAgent()&&ids.length>MAX)return alert(limitText());
    const at=new Date(`${v.date}T${v.time}:00`);if(isNaN(at.getTime()))return alert(L('Elige fecha y hora.','Pick a date and time.'));
    return act(async()=>{await call('tour_request',{listingIds:ids,startsAt:`${v.date}T${v.time}`,notes:v.notes||''});setCart([]);form={date:'',time:'10:00',notes:''};await load(true);alert(connectedAgent()?L('¡Enviada a tu agente! Te avisamos cuando la apruebe o la rechace.','Sent to your agent! We will let you know when they approve or decline it.'):L('¡Cita solicitada! Les avisamos a los agentes con licencia; te llegará una notificación cuando uno la acepte.','Showing requested! We notified licensed agents; you will get a notification when one accepts.'));});}
  const fb=f&&f.dataset&&f.dataset.tfbform;
  if(fb){e.preventDefault();const [tourId,listingId]=fb.split('|');const v=Object.fromEntries(new FormData(f));
    return act(async()=>{const r=await call('tour_feedback',{tourId,listingId,rating:Number(v.rating)||null,interest:v.interest||'',comments:v.comments||''});delete fbOpen[fb];await load(true);alert(L('¡Gracias! Tus comentarios ya se enviaron.','Thank you! Your feedback was sent.'));});}
},true);
document.addEventListener('change',e=>{
  const t=e.target;
  if(t&&t.form&&t.form.id==='tourReqF'){const v=Object.fromEntries(new FormData(t.form));form={date:v.date,time:v.time,notes:v.notes||''};return;}
  if(t&&t.dataset&&t.dataset.tdoc&&t.files&&t.files[0]){act(async()=>{await S.uploadDocument(t.files[0],{docType:'OFFER_DOCS',listingId:t.dataset.tdoc,offerId:t.dataset.toffer});await load(true);alert(L('Documento subido.','Document uploaded.'));});}
},true);

window.LegacyTours={
  clientMode:()=>isClient()||!S.user,
  navVisible:()=>!!S.user&&(isClient()||isAgent()||S.isAdmin()||(S.isInvestor&&S.isInvestor()&&!S.isPendingApproval(S.user))),
  navLabel:()=>isClient()?'🛒 '+L('Carrito y citas','Cart & showings'):isAgent()?'🔔 '+L('Citas de clientes','Client showings'):S.isAdmin()?'🛒 '+L('Citas con carrito','Cart showings'):'💬 '+L('Comentarios de visitas','Showing feedback'),
  headerButton:()=>{if(!isClient())return '';const n=cart().length;return `<button type="button" class="tour-cart-btn" data-tgo="1" aria-label="${esc(L('Carrito de casas','Home cart'))}">🛒${n?`<span class="menu-badge">${n}</span>`:''}</button>`;},
  clientActionRow:l=>{if(S.user)load(false);const c=inCart(l.id),conn=connectedAgent();return `<div class="lof-act-row"><button type="button" class="btn-card${c?'':' primary'}" data-tcart="${esc(l.id)}">${c?'✓ '+L('En tu carrito (quitar)','In your cart (remove)'):'🛒 '+L('Agregar al carrito','Add to cart')}</button><button type="button" class="btn-card" data-tbook="${esc(l.id)}">📅 ${L('Solicitar cita','Request showing')}</button></div><p class="ops-meta tour-note">${conn?L('Junta las casas en tu carrito y envíalas a tu agente. Las ofertas las hace tu agente después de la visita.','Collect homes in your cart and send them to your agent. Your agent makes offers after the visit.'):L(`Junta hasta ${MAX} casas en tu carrito y pide una sola cita. Las ofertas las hace tu agente después de la visita.`,`Collect up to ${MAX} homes in your cart and request one showing. Your agent makes offers after the visit.`)}</p>`;},
  view,refresh:()=>load(true),cart
};
})();
