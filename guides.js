/* Legacy - Owner Finance · "Cómo Funciona / Guías" section.
   Educational guides live here as a list of cards; each guide is a native page with ES/EN text (S.lang).
   Deep links: #guides (list) · #guides&g=owner-finance (guide) · #guides&g=owner-finance&s=paso-5 (jump to a step) · ?guia=owner-finance.
   Pure UI: no API or database calls. */
(function(){
const S=window.AppState;
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function modal(html){const m=document.createElement('div');m.className='modal-backdrop';m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:flex-end;z-index:9999';
  m.innerHTML=`<div class="drawer-panel"><button class="close nav-pill" style="float:right">✕</button>${html}</div>`;m.onclick=e=>{if(e.target===m||e.target.classList.contains('close'))m.remove();};document.body.appendChild(m);return m;}
function copyText(t){if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(t);return new Promise((res,rej)=>{const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();try{document.execCommand('copy')?res():rej();}catch(e){rej(e);}a.remove();});}
const OREC_URL='https://oklahoma.gov/orec/quick-links/search-for-a-licensee.html';
const L=(es,en)=>S.lang==='es'?es:en;
const hashParams=()=>{const h=String(location.hash||'').replace(/^#/,'');const o={};h.split(/[&?]/).slice(1).forEach(p=>{const i=p.indexOf('=');if(i>0){try{o[p.slice(0,i)]=decodeURIComponent(p.slice(i+1));}catch(e){o[p.slice(0,i)]=p.slice(i+1);}}});return o;};
const queryGuide=()=>{try{return new URLSearchParams(location.search).get('guia')||'';}catch(e){return '';}};
function currentGuide(){const hp=hashParams();if(hp.g)return hp.g;if(/^#?guides/.test(location.hash||''))return '';return queryGuide();}
const LT=()=>window.LegacyTours||{};
const can=n=>n==='user'||(n==='client'&&isClientU())||(n==='agent'&&!!(LT().agentDashVisible&&LT().agentDashVisible()))||(n==='seller'&&!!(LT().sellerDashVisible&&LT().sellerDashVisible()));
const isClientU=()=>!!(S.user&&S.user.role==='BUYER'&&!(S.isAdmin&&S.isAdmin()));

/* Action buttons inside "Cómo te ayuda la app". Guests always get one sign-up / sign-in button. */
const ACTIONS={
  agent:{need:'client',ico:'🤝',es:'Ver mi agente',en:'See my agent',attr:'data-tab="myagent"'},
  search:{need:'client',ico:'🎯',es:'Definir mi búsqueda',en:'Set my search',attr:'data-editsearch="1"'},
  homes:{need:'user',ico:'🏠',es:'Ver casas',en:'Browse homes',attr:'data-tab="inventory"'},
  map:{need:'user',ico:'🗺️',es:'Ver mapa',en:'Open the map',attr:'data-tab="map"'},
  favs:{need:'user',ico:'❤️',es:'Mis favoritas',en:'My favorites',attr:'data-tab="favorites"'},
  cart:{need:'client',ico:'🛒',es:'Carrito y citas',en:'Cart & showings',attr:'data-tab="tours"'},
  offers:{need:'client',ico:'💰',es:'Mis ofertas',en:'My offers',attr:'data-tab="dashboard"'},
  docs:{need:'client',ico:'📂',es:'Mis documentos',en:'My documents',attr:'data-tab="dashboard" data-gdocs="1"'},
  agentpanel:{need:'agent',ico:'📊',es:'Mi Panel de agente',en:'My agent dashboard',attr:'data-tab="agenthome"'},
  clientshows:{need:'agent',ico:'🔔',es:'Citas de clientes',en:'Client showings',attr:'data-tab="tours"'},
  sellerpanel:{need:'seller',ico:'📊',es:'Mi Panel',en:'My dashboard',attr:'data-tab="sellerhome"'},
  msgs:{need:'user',ico:'💬',es:'Escribir a mi agente',en:'Message my agent',es2:'Mensajes',en2:'Messages',attr:'data-msgbubble="1"'},
};
function actions(keys,guestCta){
  if(!S.user)return !guestCta?'': `<div class="gd-acts"><button type="button" class="btn-card primary" data-tab="auth">👤 ${L('Crear cuenta gratis o entrar','Create a free account or sign in')}</button></div>`;
  const b=keys.map(k=>ACTIONS[k]).filter(a=>a&&can(a.need)).map(a=>`<button type="button" class="btn-card" ${a.attr}>${a.ico} ${(!isClientU()&&a.es2)?L(a.es2,a.en2):L(a.es,a.en)}</button>`);
  return b.length?`<div class="gd-acts">${b.join('')}</div>`:'';
}
const callout=(items,keys,guestCta)=>`<div class="gd-app"><p class="gd-app-h">⭐ ${L('Nota especial: cómo te ayuda la app','Special note: how the app helps you')}</p><ul>${items.map(i=>`<li>${L(i[0],i[1])}</li>`).join('')}</ul>${actions(keys||[],guestCta)}</div>`;

/* ---------- Guide 1: Owner Finance, step by step ---------- */
const OF_STEPS=[
 {n:1,t:['Conecta con un agente de bienes raíces con licencia','Connect with a licensed real estate agent'],
  body:()=>`<p>${L('Lo primero es tener a tu lado a un agente con licencia vigente en Oklahoma. Tu agente te guía, te representa y cuida que cada paso quede bien hecho y por escrito.','First, have an agent with an active Oklahoma license on your side. Your agent guides you, represents you and makes sure every step is done right and in writing.')}</p>
  <p><b>${L('Antes de trabajar con cualquier agente, confirma su licencia.','Before working with any agent, check their license.')}</b> ${L('Es gratis y toma un minuto:','It is free and takes a minute:')}</p>
  <ol><li>${L('Entra a la página oficial de la Oklahoma Real Estate Commission (OREC):','Go to the official Oklahoma Real Estate Commission (OREC) page:')} <a href="${OREC_URL}" target="_blank" rel="noopener">Search for a Licensee ↗</a></li>
  <li>${L('Busca al agente por su nombre o número de licencia.','Search for the agent by name or license number.')}</li>
  <li>${L('Revisa que la licencia esté <b>activa</b> y a qué corretaje (brokerage) pertenece.','Check that the license is <b>active</b> and which brokerage it belongs to.')}</li></ol>
  <p>${L('Si alguien no quiere darte su número de licencia, o no aparece en OREC, no sigas adelante con esa persona.','If someone will not give you their license number, or they do not show up on OREC, do not move forward with that person.')}</p>`,
  app:[['Cada agente registrado en la app ingresa su número de licencia OREC, y nuestra administración la verifica antes de que pueda ver direcciones completas, agendar citas o enviar ofertas.','Every agent in the app enters their OREC license number, and our administration verifies it before they can see full addresses, book showings or send offers.'],
   ['En <b>Mi agente</b> ves el perfil de tu agente con su número de licencia y su corretaje, para que puedas confirmarlo tú mismo en OREC.','In <b>My agent</b> you see your agent’s profile with their license number and brokerage, so you can check it yourself on OREC.'],
   ['El código de tu agente es <b>opcional</b> al crear tu cuenta: si no tienes agente, déjalo en blanco. Cuando pidas ver una o varias casas, se avisa a todos los agentes con su cuenta en regla y el primero que acepte se queda como tu agente. Si más adelante quieres quitarlo, tienes que escribir el motivo. Si hay peligro o una situación de riesgo, avisa a OREC o al 911.','Your agent’s invite code is <b>optional</b> when you sign up: if you do not have an agent, leave it blank. When you ask to see one or more homes, every agent in good standing is notified and the first to accept becomes your agent. If you later want to remove them, you have to write the reason. If there is danger or a risky situation, contact OREC or 911.']],
  acts:['agent']},
 {n:2,t:['Define lo que buscas','Decide what you are looking for'],
  body:()=>`<p>${L('Antes de ver casas, ten claro qué necesitas y cuánto puedes pagar. Así ahorras tiempo y evitas enamorarte de una casa que no te conviene.','Before looking at homes, be clear about what you need and what you can pay. You save time and avoid falling for a home that does not fit you.')}</p>
  <ul><li><b>${L('La casa:','The home:')}</b> ${L('cuántas recámaras y baños necesitas, el tamaño y en qué ciudad o zona quieres vivir.','how many bedrooms and bathrooms you need, the size, and the city or area you want to live in.')}</li>
  <li><b>${L('El dinero:','The money:')}</b> ${L('el precio total que puedes manejar, cuánto tienes para el <b>enganche</b> (down payment) y cuánto puedes pagar <b>cada mes</b> sin apretarte.','the total price you can handle, how much you have for the <b>down payment</b>, and how much you can pay <b>each month</b> comfortably.')}</li></ul>
  <p>${L('Un buen consejo: calcula tu pago mensual pensando también en los gastos de la casa (servicios, mantenimiento, seguro e impuestos, según lo que acuerden), no solo en la mensualidad.','Good tip: plan your monthly budget with the home’s other costs in mind too (utilities, upkeep, insurance and taxes, depending on what you agree), not just the monthly payment.')}</p>`,
  app:[['En <b>¿Qué estás buscando?</b> contestas unas preguntas rápidas (recámaras, baños, ciudades, precio máximo, enganche máximo y mensualidad máxima) y la app te muestra primero las casas que más te convienen en <b>Recomendado para ti</b>.','In <b>What are you looking for?</b> you answer a few quick questions (bedrooms, bathrooms, cities, max price, max down payment and max monthly payment) and the app shows the homes that fit you best first, under <b>Recommended for you</b>.'],
   ['Puedes editar tu búsqueda cuando quieras.','You can edit your search any time.']],
  acts:['search']},
 {n:3,t:['Busca tu casa ideal','Find your ideal home'],
  body:()=>`<p>${L('Ahora sí, a buscar. Compara varias opciones, revisa las fotos con calma y, cuando una te guste, visítala en persona con tu agente.','Now the fun part. Compare several options, look at the photos calmly and, when you like one, visit it in person with your agent.')}</p>`,
  app:[['En <b>Casas</b> filtras por ciudad, zona, recámaras, baños, precio, enganche y mensualidad, y ordenas por lo que más te importa (por ejemplo, el enganche más bajo).','In <b>Homes</b> you filter by city, area, bedrooms, bathrooms, price, down payment and monthly payment, and sort by what matters most to you (for example, the lowest down payment).'],
   ['En <b>Mapa</b> ves dónde está cada casa. Guarda las que te gusten en <b>Favoritas</b> (❤️) para compararlas después.','The <b>Map</b> shows where each home is. Save the ones you like in <b>Favorites</b> (❤️) to compare later.'],
   ['¿Quieres ver varias casas? Agrégalas a tu <b>carrito</b> y pide una sola cita para verlas todas (hasta 5 casas). ¿Solo te interesa una? Usa <b>Solicitar cita</b> directamente.','Want to see several homes? Add them to your <b>cart</b> and request one showing for all of them (up to 5 homes). Only interested in one? Use <b>Request showing</b> right away.'],
   ['Tus citas quedan en <b>Carrito y citas</b>, con botón para agregarlas a tu calendario. Con <b>Compartir</b> le mandas una casa a tu familia por WhatsApp, mensaje de texto, correo o Facebook.','Your showings stay in <b>Cart &amp; showings</b>, with a button to add them to your calendar. With <b>Share</b> you send a home to your family by WhatsApp, text, email or Facebook.']],
  acts:['homes','map','favs','cart']},
 {n:4,t:['Haz tu oferta','Make your offer'],
  body:()=>`<p>${L('Cuando encuentres la casa, tu agente te ayuda a preparar la oferta: el precio, el enganche, la mensualidad, si quieres hacer inspecciones y la fecha que te gustaría para el cierre. El vendedor puede aceptarla, rechazarla o hacerte una contraoferta.','When you find the home, your agent helps you prepare the offer: price, down payment, monthly payment, whether you want inspections, and your preferred closing date. The seller can accept it, reject it or send a counteroffer.')}</p>`,
  app:[['Tu agente envía la oferta desde la app con todos los términos claros y por escrito.','Your agent sends the offer from the app with every term clear and in writing.'],
   ['En <b>Mis ofertas</b> ves en qué estado está tu oferta (enviada, aceptada, contraoferta) y recibes una notificación en cuanto el vendedor responde.','In <b>My offers</b> you see your offer’s status (sent, accepted, counteroffer) and get a notification as soon as the seller answers.']],
  acts:['offers','msgs']},
 {n:5,t:['Oferta aceptada: aparta la casa con un depósito de $1,000','Offer accepted: reserve the home with a $1,000 deposit'],
  body:()=>`<p>${L('¡Felicidades! Si el vendedor acepta tu oferta, empieza a correr el tiempo:','Congratulations! Once the seller accepts your offer, the clock starts:')}</p>
  <ul><li>${L('Tienes <b>12 horas</b> para entregar tu documentación (identificación oficial y comprobantes de ingreso de 3 a 6 meses, como talones de pago, estados de cuenta o carta de empleo).','You have <b>12 hours</b> to hand in your documents (official ID and 3 to 6 months of proof of income, such as pay stubs, bank statements or an employment letter).')}</li>
  <li>${L('Si todavía estás juntando documentos, puedes <b>dar primero el depósito de $1,000</b> para apartar la casa. Así obtienes <b>72 horas</b> para completar la documentación.','If you are still gathering documents, you can <b>pay the $1,000 deposit first</b> to reserve the home. That gives you <b>72 hours</b> to complete your documents.')}</li></ul>
  <p><b>${L('¿Y si el trato no se hace?','What if the deal does not happen?')}</b> ${L('Tu depósito se te <b>regresa</b> si el trato se cae por causa del vendedor: por ejemplo, si la casa está en mal estado, si se ocultó información o si no se llega a un acuerdo.','Your deposit is <b>returned</b> if the deal falls through because of the seller: for example, if the home is in bad condition, information was hidden, or no agreement is reached.')}</p>
  <div class="gd-warn"><b>🔒 ${L('Importante: nunca pagues en efectivo.','Important: never pay in cash.')}</b> ${L('No recomendamos entregar dinero en efectivo a nadie, en ningún momento. Por eso contamos con <b>sistemas de pago seguros</b>, para que cada pago quede registrado y protegido.','We do not recommend handing cash to anyone, at any time. That is why we use <b>secure payment systems</b>, so every payment is recorded and protected.')}</div>`,
  app:[['Tu oferta trae una lista de pasos con el tiempo que te queda para cada uno, así no se te pasa ninguna fecha.','Your offer comes with a step list showing the time left for each step, so you never miss a deadline.'],
   ['Subes tus documentos y el comprobante del depósito directo a la oferta, en tu carpeta privada. Nada de mandar papeles por mensajes sueltos.','You upload your documents and the deposit receipt straight to the offer, in your private folder. No more sending papers through scattered messages.'],
   ['El vendedor revisa y aprueba cada cosa en la app, y tú ves cada aprobación en cuanto sucede.','The seller reviews and approves each item in the app, and you see every approval as it happens.']],
  acts:['offers','docs']},
 {n:6,t:['Revisa la casa a fondo: inspecciones','Check the home closely: inspections'],
  body:()=>`<p>${L('Una vez entregado el depósito y tu documentación, tienes <b>7 días</b> para revisar y evaluar el estado de la propiedad.','Once your deposit and documents are in, you have <b>7 days</b> to review and evaluate the condition of the property.')}</p>
  <p>${L('Las inspecciones <b>no son obligatorias, pero sí muy recomendadas.</b> ¿Por qué?','Inspections are <b>not mandatory, but highly recommended.</b> Why?')}</p>
  <ul><li>${L('Una casa puede verse bonita y tener problemas que no se ven: el techo, la plomería, la electricidad, los cimientos, humedad o plagas.','A home can look great and still have hidden problems: roof, plumbing, electrical, foundation, moisture or pests.')}</li>
  <li>${L('Un inspector profesional revisa lo que tú no puedes ver y te entrega un reporte por escrito.','A professional inspector checks what you cannot see and gives you a written report.')}</li>
  <li>${L('Ese reporte te da bases para negociar reparaciones <b>antes</b> de comprometerte.','That report gives you solid ground to negotiate repairs <b>before</b> you commit.')}</li>
  <li>${L('Una inspección cuesta poco comparada con una reparación grande que descubres después de mudarte.','An inspection costs little compared with a big repair you discover after moving in.')}</li></ul>
  <p>${L('Piénsalo así: es la casa donde va a vivir tu familia. Vale la pena saber exactamente qué estás comprando.','Think of it this way: this is where your family will live. It is worth knowing exactly what you are buying.')}</p>`,
  app:[['Tu agente agenda la inspección en la app y todos ven la fecha.','Your agent schedules the inspection in the app and everyone sees the date.'],
   ['El reporte de inspección se sube a la oferta para que tú, tu agente y el vendedor tengan la misma información.','The inspection report is uploaded to the offer so you, your agent and the seller all have the same information.']],
  acts:['offers']},
 {n:7,t:['Negocia las reparaciones','Negotiate repairs'],
  body:()=>`<p>${L('Si la inspección encontró algo, es momento de pedir al vendedor que repare, reemplace o ajuste lo necesario (o el precio). Si llegan a un acuerdo, <b>se firma por escrito</b>. Lo que no está por escrito, no cuenta.','If the inspection found something, it is time to ask the seller to repair, replace or adjust what is needed (or the price). If you reach an agreement, <b>it is signed in writing</b>. If it is not in writing, it does not count.')}</p>
  <p><b>${L('Si no hay acuerdo','If there is no agreement')}</b>${L(', por ejemplo si la casa está en mal estado, apareció un problema que no se mencionó o el vendedor no quiere reparar nada, <b>tu dinero se te regresa.</b>',', for example if the home is in bad condition, a problem shows up that was not disclosed, or the seller will not repair anything, <b>your money is returned.</b>')}</p>`,
  app:[['La solicitud de reparaciones se hace dentro de la oferta, y el vendedor puede aceptarla, rechazarla o hacer una contraoferta.','The repair request is made inside the offer, and the seller can accept it, reject it or counter.'],
   ['Todo queda registrado, con fecha, para que nadie dependa de “lo que se dijo”.','Everything is recorded with a date, so nobody has to rely on “what was said”.']],
  acts:['offers']},
 {n:8,t:['Agenda el cierre','Schedule the closing'],
  body:()=>`<p>${L('Con todo acordado, se fija la fecha y hora para firmar el contrato. Se busca un momento en que <b>tu agente, tú y el vendedor</b> puedan estar presentes.','With everything agreed, a date and time are set to sign the contract, at a time when <b>your agent, you and the seller</b> can all be there.')}</p>
  <p>${L('Tienes <b>hasta 24 horas antes</b> de la cita para depositar el resto del dinero acordado (option fee / enganche). Cuando el vendedor confirma que lo recibió, todo está listo para firmar.','You have <b>until 24 hours before</b> the appointment to deposit the rest of the agreed money (option fee / down payment). Once the seller confirms receipt, everything is ready to sign.')}</p>`,
  app:[['La fecha del cierre se propone en la app y cada persona (cliente, agente y vendedor) la aprueba. Si a alguien no le queda, puede proponer otra fecha explicando por qué.','The closing date is proposed in the app and each person (client, agent and seller) approves it. If it does not work for someone, they can propose another date and explain why.'],
   ['Subes el comprobante del enganche y el vendedor lo verifica en la app. La app te muestra la hora límite para hacerlo.','You upload the down payment receipt and the seller verifies it in the app. The app shows you the deadline.']],
  acts:['offers']},
 {n:9,t:['Firma el contrato (y entiéndelo bien)','Sign the contract (and understand it well)'],
  body:()=>`<p>${L('Este es el paso más importante. <b>Lee y entiende tu contrato completo antes de firmar</b>: cuánto pagas cada mes, por cuánto tiempo, qué pasa si te atrasas y quién se encarga de qué.','This is the most important step. <b>Read and understand your whole contract before signing</b>: how much you pay each month, for how long, what happens if you are late, and who is responsible for what.')}</p>
  <ul><li>${L('<b>Te recomendamos contratar a un abogado</b> con experiencia en este tipo de compras para que revise el contrato contigo.','<b>We recommend hiring an attorney</b> experienced in this kind of purchase to review the contract with you.')}</li>
  <li>${L('Si en este momento no te alcanza para un abogado, tu agente de bienes raíces puede ayudarte a entender mejor el contrato.','If an attorney is not in your budget right now, your real estate agent can help you understand the contract better.')}</li>
  <li>${L('<b>Ojo:</b> los agentes de bienes raíces <b>no están autorizados para dar asesoría legal.</b> Pueden explicarte el proceso y los términos, pero las dudas legales debe resolverlas un abogado.','<b>Note:</b> real estate agents <b>are not authorized to give legal advice.</b> They can explain the process and the terms, but legal questions should be answered by an attorney.')}</li></ul>
  <p>${L('Nunca firmes algo que no entiendes. Pregunta todas las veces que sea necesario.','Never sign something you do not understand. Ask as many times as you need.')}</p>`,
  app:[['Usa <b>Mensajes</b> para hacerle a tu agente todas las preguntas que tengas, por escrito y antes del día de la firma.','Use <b>Messages</b> to ask your agent every question you have, in writing and before signing day.'],
   ['Después del cierre puedes subir tus documentos firmados a tu carpeta para tenerlos siempre a la mano.','After closing you can upload your signed documents to your folder so they are always at hand.']],
  acts:['msgs','docs']},
 {n:10,t:['Recibe tus llaves y múdate','Get your keys and move in'],
  body:()=>`<p>${L('Con el contrato firmado, se te entregan las llaves. <b>¡Bienvenido a tu nuevo hogar!</b>','With the contract signed, you get the keys. <b>Welcome to your new home!</b>')}</p>`},
 {n:11,t:['Después de mudarte: cómo cuidar tu compra','After you move in: protect your purchase'],
  body:()=>`<ul><li>${L('<b>Paga siempre a tiempo.</b> Tu historial de pagos es tu mejor carta de presentación.','<b>Always pay on time.</b> Your payment history is your best reference.')}</li>
  <li>${L('<b>Cuida la propiedad.</b> Mantenla en buen estado: es tu casa y tu inversión.','<b>Take care of the property.</b> Keep it in good shape: it is your home and your investment.')}</li>
  <li>${L('<b>Mantén siempre la comunicación con el vendedor.</b> Si algún mes vas a atrasarte o estás pasando por un momento difícil, avísale <b>antes</b> de la fecha de pago. En nuestra experiencia, los vendedores casi siempre están dispuestos a buscar una solución cuando hay comunicación.','<b>Always keep in touch with the seller.</b> If you will be late one month or are going through a hard time, tell them <b>before</b> the due date. In our experience, sellers are almost always willing to find a solution when there is communication.')}</li></ul>`,
  app:[['Tus documentos de cierre quedan guardados en tu carpeta.','Your closing documents stay saved in your folder.'],
   ['Después del cierre, la app te pide tu opinión de la experiencia para seguir mejorando.','After closing, the app asks for your feedback so we keep improving.']],
  acts:['docs']},
];
const OF_SUMMARY=[[1,'Agente con licencia (verifícalo en OREC)','Licensed agent (verify on OREC)','—','—'],[2,'Recámaras, baños, zona, precio, enganche y mensualidad','Beds, baths, area, price, down payment and monthly','—','—'],[3,'Busca y visita casas','Search and visit homes','—','—'],[4,'Haz tu oferta','Make your offer','—','—'],[5,'Documentos o depósito de $1,000','Documents or $1,000 deposit','12 h documentos · 72 h si das el depósito primero','12 h documents · 72 h if the deposit goes first'],[6,'Revisión e inspecciones (recomendadas)','Review and inspections (recommended)','7 días','7 days'],[7,'Reparaciones por escrito','Repairs in writing','—','—'],[8,'Agenda el cierre y deposita el resto','Schedule closing and pay the rest','Hasta 24 h antes','Up to 24 h before'],[9,'Entiende y firma el contrato','Understand and sign the contract','Día del cierre','Closing day'],[10,'Recibe tus llaves','Get your keys','Día del cierre','Closing day'],[11,'Paga a tiempo, cuida la casa, comunícate','Pay on time, care for the home, keep in touch','Siempre','Always']];

const contactBlock=()=>`<section class="gd-step"><h3>${L('¿Tienes preguntas?','Questions?')}</h3><p>${L('Llámanos o escríbenos al','Call or text us at')} <a href="tel:+14053384124"><b>(405) 338-4124</b></a>, ${L('por WhatsApp al','WhatsApp')} <a href="https://wa.me/15722411405" target="_blank" rel="noopener"><b>(572) 241-1405</b></a>${L(', o usa el botón <b>Contact</b> en la app.',', or use the <b>Contact</b> button in the app.')}</p>${S.user?'':actions([],true)}</section>`;
const authorBox=()=>`<aside class="gd-author"><img src="legacy-logo.png" alt="Legacy - Owner Finance" class="gd-author-logo"><div><p class="gd-kicker">Legacy - Owner Finance</p><p>Brokerage By: KLC Real Estate, LLC</p><a href="${OREC_URL}" target="_blank" rel="noopener">✅ ${L('Verifica una licencia en OREC','Verify a license on OREC')} ↗</a></div></aside>`;
function ownerFinance(){
  const steps=OF_STEPS.map(s=>`<section class="gd-step" id="gd-paso-${s.n}"><h3><span class="gd-num">${s.n}</span>${L(...s.t)}</h3>${s.body()}${s.app?callout(s.app,s.acts,[1,3,5,9].includes(s.n)):''}</section>`).join('');
  return `<article class="gd-article">
  <header class="gd-hero"><img src="legacy-logo.png" alt="Legacy - Owner Finance" class="gd-hero-logo"><div><p class="gd-kicker">${L('Guía','Guide')} · ${L('6 min de lectura','6 min read')}</p><h2>${L('Guía Owner Finance: cómo comprar tu casa dueño a dueño, paso a paso','Owner Finance Guide: how to buy your home directly from the owner, step by step')}</h2><p class="gd-hero-sub">Legacy - Owner Finance · Brokerage By: KLC Real Estate, LLC</p></div></header>
  <div class="gd-tools"><button type="button" class="btn-card primary" data-gshare="owner-finance">📤 ${L('Compartir guía','Share guide')}</button><a class="btn-card" href="guia/guia-owner-finance.pdf" target="_blank" rel="noopener" download>📄 ${L('Descargar PDF','Download PDF')}${S.lang==='es'?'':' (Spanish)'}</a></div>
  <p>${L('Comprar casa con <b>owner finance</b> (financiamiento del dueño) significa que le pagas directamente al vendedor, sin pasar por un banco. Es una puerta real para muchas familias que tienen ingresos pero no califican para un préstamo tradicional.','Buying a home with <b>owner finance</b> means you pay the seller directly, without going through a bank. It is a real door for many families who have income but do not qualify for a traditional loan.')}</p>
  <p>${L('Para que todo salga bien, el proceso tiene que hacerse en orden, por escrito y con las personas correctas a tu lado. Aquí te explicamos cada paso, de principio a fin, y cómo te ayuda la app en cada uno.','For everything to go well, the process has to happen in order, in writing, and with the right people on your side. Here we explain every step, start to finish, and how the app helps you along the way.')}</p>
  <div class="gd-trust"><b>${L('Tu compra, protegida de principio a fin.','Your purchase, protected from start to finish.')}</b> ${L('En Legacy - Owner Finance te damos la documentación necesaria para que tu compra sea 100% segura, desde el primer paso hasta que recibes tus llaves.','At Legacy - Owner Finance we provide the documentation needed for a 100% secure purchase, from the first step until you get your keys.')}</div>
  <nav class="gd-toc" aria-label="${L('Pasos','Steps')}"><p class="gd-toc-h">${L('Los 11 pasos','The 11 steps')}</p>${OF_STEPS.map(s=>`<button type="button" class="gd-toc-i" data-gjump="paso-${s.n}"><span class="gd-num sm">${s.n}</span>${L(...s.t)}</button>`).join('')}</nav>
  ${steps}
  <section class="gd-step" id="gd-resumen"><h3>${L('Resumen rápido','Quick summary')}</h3><div class="gd-table-wrap"><table class="gd-table"><thead><tr><th>#</th><th>${L('Qué pasa','What happens')}</th><th>${L('Tiempo','Timing')}</th></tr></thead><tbody>${OF_SUMMARY.map(r=>`<tr><td>${r[0]}</td><td>${L(r[1],r[2])}</td><td>${L(r[3],r[4])}</td></tr>`).join('')}</tbody></table></div></section>
  ${contactBlock()}
  ${authorBox()}
  <p class="gd-disclaimer">${L('Esta guía es informativa y explica nuestro proceso general de compra dueño a dueño. No es asesoría legal ni financiera. Los plazos y condiciones exactos de cada compra son los que queden por escrito en tu oferta y tu contrato. Para dudas legales, consulta a un abogado.','This guide is for information only and explains our general owner-to-owner buying process. It is not legal or financial advice. The exact deadlines and terms of each purchase are the ones written in your offer and contract. For legal questions, consult an attorney.')} ${L('Actualizada: 25 de noviembre de 2026.','Updated: November 25, 2026.')}</p>
  </article>`;
}

/* ---------- Guide 2: How the app works (text in guide-app-content.js) ---------- */
const APP_ACTS={1:[['homes'],true],2:[[],true],3:[['homes','map','msgs'],false],4:[['search','homes','favs','cart','offers','agent','msgs'],true],5:[['agentpanel','clientshows','msgs'],false],6:[['sellerpanel','msgs'],false]};
const APP_ICO={1:'👀',2:'📝',3:'🧭',4:'🏠',5:'🤝',6:'🏢'};
function appGuide(){
  const D=window.LEGACY_APP_GUIDE&&window.LEGACY_APP_GUIDE[S.lang==='es'?'es':'en'];if(!D)return '';
  const secs=D.secs.map(x=>{const a=APP_ACTS[x.n]||[[],false];const btns=actions(a[0],a[1]);return `<section class="gd-step" id="gd-sec-${x.n}"><h3><span class="gd-num">${x.n}</span>${esc(x.t)}</h3>${x.h}${btns?`<div class="gd-app gd-app-sm"><p class="gd-app-h">⭐ ${L('Ábrelo en la app','Open it in the app')}</p>${btns}</div>`:''}</section>`;}).join('');
  return `<article class="gd-article">
  <header class="gd-hero"><img src="legacy-logo.png" alt="Legacy - Owner Finance" class="gd-hero-logo"><div><p class="gd-kicker">${L('Guía','Guide')} · ${L('10 min de lectura','10 min read')}</p><h2>${L('Cómo funciona la app Legacy - Owner Finance','How the Legacy - Owner Finance app works')}</h2><p class="gd-hero-sub">Legacy - Owner Finance · Brokerage By: KLC Real Estate, LLC</p></div></header>
  <div class="gd-tools"><button type="button" class="btn-card primary" data-gshare="como-funciona-la-app">📤 ${L('Compartir guía','Share guide')}</button></div>
  ${D.intro}
  <nav class="gd-toc" aria-label="${L('Secciones','Sections')}"><p class="gd-toc-h">${L('En esta guía','In this guide')}</p>${D.secs.map(x=>`<button type="button" class="gd-toc-i" data-gjump="sec-${x.n}"><span class="gd-num sm">${x.n}</span>${APP_ICO[x.n]||''} ${esc(x.t)}</button>`).join('')}</nav>
  ${secs}
  ${contactBlock()}
  ${authorBox()}
  <p class="gd-disclaimer">${D.disc} ${L('Actualizada: 25 de noviembre de 2026.','Updated: November 25, 2026.')}</p></article>`;
}

const GUIDES=[
  {id:'owner-finance',ico:'🏡',t:['Guía Owner Finance: cómo comprar tu casa dueño a dueño, paso a paso','Owner Finance Guide: how to buy your home directly from the owner, step by step'],
   d:['Los 11 pasos, de conectar con un agente con licencia hasta recibir tus llaves, y cómo te ayuda la app en cada uno.','The 11 steps, from connecting with a licensed agent to getting your keys, and how the app helps at each one.'],min:6,render:ownerFinance},
  {id:'como-funciona-la-app',ico:'📱',t:['Cómo funciona la app Legacy - Owner Finance','How the Legacy - Owner Finance app works'],
   d:['Cómo moverte por la app y qué puede hacer cada cuenta: comprador, agente e inversionista / vendedor.','How to get around the app and what each account can do: buyer, agent and investor / seller.'],min:10,render:appGuide},
];

function list(){
  return `<div class="gd-wrap"><section class="card gd-list-head"><h2>${L('Cómo Funciona / Guías','How It Works / Guides')}</h2><p>${L('Guías cortas y claras para comprar tu casa con seguridad.','Short, clear guides to buy your home safely.')}</p></section>
  <div class="gd-cards">${GUIDES.map(g=>`<a class="card gd-card" href="#guides&g=${g.id}"><span class="gd-card-ico" aria-hidden="true">${g.ico}</span><span><b>${L(...g.t)}</b><small>${L(...g.d)}</small><em>${L('Leer guía','Read guide')} · ${g.min} min →</em></span></a>`).join('')}</div></div>`;
}
let scrolledFor='';
function view(){
  const id=currentGuide(),g=GUIDES.find(x=>x.id===id);
  if(!g)return list();
  const hp=hashParams(),key=location.hash+'|'+location.search;
  if(scrolledFor!==key){scrolledFor=key;setTimeout(()=>{const t=hp.s?document.getElementById('gd-'+hp.s):null;if(t)t.scrollIntoView({block:'start'});else window.scrollTo(0,0);},80);}
  return `<div class="gd-wrap"><a class="gd-back" href="#guides">← ${L('Todas las guías','All guides')}</a><section class="card gd-page">${g.render()}</section></div>`;
}

/* ---------- share (same options as the home share sheet) ---------- */
function shareUrl(id){return location.origin+(id==='owner-finance'?'/guia/':id==='como-funciona-la-app'?'/guia/app/':'/guia/?g='+encodeURIComponent(id));}
async function shareGuide(id){
  const g=GUIDES.find(x=>x.id===id);if(!g)return;
  const es=S.lang==='es',url=shareUrl(id),title=L(...g.t),text=(/^(Guía|Guide)/.test(title)?'':(es?'Guía gratis: ':'Free guide: '))+title+' · Legacy - Owner Finance',full=`${text}\n${url}`,enc=encodeURIComponent;
  const phone=(()=>{try{return matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);}catch(e){return false;}})();
  if(navigator.share&&phone){try{await navigator.share({title,text,url});return;}catch(e){if(e&&e.name==='AbortError')return;}}
  const links=[['wa','🟢','WhatsApp',`https://wa.me/?text=${enc(full)}`],['sms','💬',es?'Mensaje de texto':'Text message',`sms:?&body=${enc(full)}`],['mail','✉️',es?'Correo':'Email',`mailto:?subject=${enc(title)}&body=${enc(full)}`],['fb','📘','Facebook',`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`]];
  const m=modal(`<div class="share-sheet" role="dialog" aria-label="${es?'Compartir guía':'Share guide'}"><h2>📤 ${es?'Compartir esta guía':'Share this guide'}</h2><p class="share-text">${esc(text)}</p>
   <div class="share-link-row"><input type="text" readonly value="${esc(url)}" class="share-url" aria-label="${es?'Enlace':'Link'}"><button type="button" class="btn-card primary" data-gcopy="1">🔗 ${es?'Copiar enlace':'Copy link'}</button></div>
   <div class="share-grid">${links.map(([k,i,lb,h])=>`<a class="btn-card share-opt" href="${esc(h)}" ${k==='sms'||k==='mail'?'':'target="_blank" rel="noopener"'}>${i} ${esc(lb)}</a>`).join('')}</div></div>`);
  m.addEventListener('click',async e=>{const c=e.target.closest('[data-gcopy]');if(!c)return;e.preventDefault();try{await copyText(url);c.textContent=es?'✅ Copiado':'✅ Copied';}catch(_){const i=m.querySelector('.share-url');if(i){i.focus();i.select();}}});
}
document.addEventListener('click',e=>{
  const j=e.target.closest&&e.target.closest('[data-gjump]');if(j){e.preventDefault();const t=document.getElementById('gd-'+j.dataset.gjump);if(t)t.scrollIntoView({behavior:'smooth',block:'start'});return;}
  const s=e.target.closest&&e.target.closest('[data-gshare]');if(s){e.preventDefault();shareGuide(s.dataset.gshare);return;}
  const d=e.target.closest&&e.target.closest('[data-gdocs]');if(d){setTimeout(()=>{const p=document.getElementById('cd-profile');if(p){p.open=true;const t=document.getElementById('docUp')||p;t.scrollIntoView({block:'center'});}},250);}
});
/* Offer checklist step -> guide section ("¿Qué significa este paso?") */
const STEP_SECTION={DOCS:5,DEPOSIT:5,INSPECTIONS:6,TRR:7,CLOSING:8,OPTION_FEE:8,PAID:11};
function stepLink(key){const n=STEP_SECTION[key];if(!n)return '';return ` <a class="gd-step-link" href="#guides&g=owner-finance&s=paso-${n}">${L('¿Qué significa este paso?','What does this step mean?')}</a>`;}
window.LegacyGuides={view,list,stepLink,guides:GUIDES,wantsGuide:()=>!!queryGuide()};
})();
