(function(){
const S=window.AppState,$=s=>document.querySelector(s);
window.imgFallback=function(el){
  if(!el)return;
  const s=el.getAttribute('src')||'';
  const m=s.match(/googleusercontent\.com\/d\/([A-Za-z0-9_-]+)/);
  if(m&&!el.dataset.triedThumb){
    el.dataset.triedThumb='1';
    el.src='https://drive.google.com/thumbnail?id='+m[1]+'&sz=w1200';
    return;
  }
  if(s!=='listing-placeholder.svg'){
    el.src='listing-placeholder.svg';
  }
};

const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initTab=()=>{
  const h=location.hash.slice(1);
  if(h)return h;
  const p=location.pathname.toLowerCase();
  if(p.includes('/login')||p.includes('/register')||p.includes('/forgot-password')||p.includes('/reset-password'))return 'auth';
  if(p.includes('/admin'))return 'admin';
  if(p.includes('/dashboard'))return 'dashboard';
  if(p.includes('/calendar'))return 'calendar';
  if(p.includes('/guides'))return 'guides';
  return 'inventory';
};
let PIDX={},CMP=new Set(),CHIP='ALL',MARK={};
let tab=initTab(),F={q:'',area:'',beds:'',baths:'',maxDown:'',maxMonthly:'',maxPrice:'',status:'',sort:(()=>{try{return localStorage.getItem('lof.sort')||'newest'}catch(e){return 'newest'}})()},map=null,CAL={mode:'week',anchor:null},sharedDetailFor='';

const L10N={
  en:{
    navInventory:'Inventory',
    navGuides:'How It Works / Guides',
    navDashboard:'Dashboard / My Profile',
    navAdmin:'Admin Portal',
    navCalendar:'Showings Calendar',
    navAuth:'Login / Register',
    logout:'Logout',
    cloudLive:'● Cloud Database Connected (24/7 Live)',
    cloudOffline:'● Offline Fallback Mode',
    newHere:'New here?',
    guideLink:'Step-by-step: create your account & navigate the site →',
    searchPlaceholder:'Search address or city…',
    searchPlaceholderGuest:'Search street name or city…',
    city:'City',
    area:'Area',
    beds:'Beds',
    baths:'Baths',
    bedsPlus:'+ beds',
    bathsPlus:'+ baths',
    maxDown:'Max down $',
    maxMonthly:'Max monthly $',
    maxPrice:'Max price $',
    status:'Status',
    sort:'Sort',
    sortBy:'Sort by',sortNewest:'Newest',sortCityAz:'City A–Z',sortPriceAscL:'Price: low to high',sortPriceDescL:'Price: high to low',sortDownAscL:'Down payment: low to high',sortMonthlyAscL:'Monthly payment: low to high',
    sortPriceAsc:'Price ↑',
    sortPriceDesc:'Price ↓',
    sortDownAsc:'Down ↑',
    sortMonthlyAsc:'Monthly ↑',
    sortBedsDesc:'Beds ↓',
    homesCount:'homes',
    price:'Price',
    down:'Down',
    monthly:'Monthly',
    perMo:'/mo',
    yrs:'yrs',
    viewDetails:'View details',
    viewPhotos:'View photos',
    photosCount:'photos',
    morePhotos:'More photos ↗',
    guestBannerTitle:'Previewing Homes as a Guest (Photos & Partial Address Only)',
    guestBannerBody:'Create a free account or log in to unlock full street addresses, prices, down payments, monthly payments, bedrooms/bathrooms, and full property details.',
    guestBannerBtn:'Create Free Account / Log In',
    guestCardPrompt:'Create an account to see the full address, price, down payment & full details.',
    guestCardBtn:'Create Account to See Full Details',
    guestModalTitle:'🔒 Create an Account to See Full Property Details',
    guestModalBody:'Register for a free account or log in to view the full street address, asking price, down payment, monthly payment, beds/baths, square footage, and to request a showing or submit an offer.',
    guestCreateBtn:'Create Free Account',
    guestLoginBtn:'Log In to Existing Account',
    makeOffer:'Make an Offer',
    offerPrice:'Offer price $',
    downPayment:'Down $',
    monthlyPayment:'Monthly $',
    notes:'Notes',
    submitOffer:'Submit Offer',
    requestShowing:'Request a Showing',
    requestShowingBtn:'Request Showing',
    shareHouse:'Share House with Agent',
    msgToAgent:'Message to your agent',
    defaultShareMsg:"I'd like to look at this home.",
    requestAccess:'Request Property Access',
    loginPromptLink:'Create an account or log in',
    loginPromptRest:'to see the full address and full details.',
    loginTitle:'Login',
    email:'Email',
    password:'Password',
    forgotPw:'Forgot password? / Reset password',
    forgotModalTitle:'Reset Your Password',
    forgotModalDesc:'Enter your registered email. We will email you a 6-digit code to set a new password.',forgotSendBtn:'Email me a code',forgotCodeSent:'If that email has an account, a code is on its way. Enter it and your new password (8+ characters).',
    forgotConfirmPw:'Confirm new password (8+)',
    forgotSubmitBtn:'Save New Password & Sign In',
    pwMismatch:'Passwords do not match.',
    registerTitle:'Create Account',
    roleBuyer:'Buyer (General Public)',
    roleAgent:'Licensed Agent',
    fullName:'Full name',
    phone:'Phone',
    passwordMin:'Password (8+ characters)',
    inviteCode:'Agent invite code (D2D-XXXXXX)',
    noAgentYet:"I don't have an agent, yet",
    orecLicense:'OREC license #',
    brokerage:'Brokerage',
    createAccount:'Create account',
    myProfile:'My Profile',
    yourInviteCode:'Your invite code:',
    save:'Save',
    yourAgent:'Your agent:',
    changePw:'Change Password',
    currentPw:'Current',
    newPw:'New password (8+)',
    updatePw:'Update Password',
    favorites:'Favorites',
    viewedHomes:'Viewed Homes',
    noneYet:'None yet',
    messages:'Messages',
    propAddress:'— Property address —',
    kindMsg:'Message',
    send:'Send',
    noAgentLinked:'No agent/client linked.',
    myOffers:'My Offers',
    counterLabel:'Counter',
    txDocs:'Property Transaction Documents',
    myDocFolder:'My Document Folder',
    folder:'Folder',
    noDocs:'No documents',
    myClients:'My Clients',
    noClients:'No clients yet',
    adminsOnly:'Admins only.',
    recentOffers:'Recent Offers',
    colProperty:'Property',
    colBuyer:'Buyer',
    colOffer:'Offer',
    colStatus:'Status',
    colActions:'Actions',
    accept:'Accept',
    counterOffer:'Counter Offer',
    reject:'Reject',
    noOffers:'No offers',
    usersAgents:'Users / Agents',
    colName:'Name',
    colRole:'Role',
    colInvite:'Invite',
    colResetPw:'Reset Password',
    reset:'Reset Password',
    listings:'Listings',
    colAddress:'Address',
    sentAlert:'Sent!',
    requestedAlert:'Requested!',
    savedAlert:'Saved',
    pwUpdatedAlert:'Password updated and signed in!',
    evTitle:'Verify your email',evDesc:'We sent a 6-digit code to',evNeed:'Your email is not verified yet. We are sending you a new code.',evCode:'6-digit code',evVerify:'Verify',evResend:'Resend code',evLater:'Later',evBad:'Incorrect code. Please try again.',evExpired:'The code expired. Tap "Resend code".',evTooMany:'Too many attempts. Please try again later.',evWait:'Please wait a few seconds before requesting another code.',evSendFail:'We could not send the email. Please try again.',evSent:'A new code was sent to your email.',evDone:'Email verified! Welcome.',
    pwResetAlert:'Password reset.',
    offerSubmitted:'Submitted',
    offerAccepted:'Accepted',
    offerRejected:'Rejected',
    offerCountered:'Counter Offer',
    streetHidden:'Street Address Hidden',
    compare:'Compare',
    favorite:'Favorite',
    sqft:'Sq Ft',
    bdShort:'bd',
    baShort:'ba',
    sqftUnit:'sqft',
    perSqft:'/sqft',
    allAsking:'All asking (full asking price, down & monthly)',
    allAskingNote:'All asking',
    roleAgentShort:'Agent',
    roleClientShort:'Client',
    roleAdminShort:'Admin',
    showingApproved:'APPROVED',
    showingDenied:'DENIED',
    showingRequested:'REQUESTED',
    promptCounterPrice:'Counter price $',
    promptCounterDown:'Counter down $',
    promptCounterMonthly:'Counter monthly $',
    promptAdminNotes:'Admin notes',
    selfServiceReset:'Self-Service Reset Link:',
    loadFail:'Failed to load data',
    docInspection:'Inspection report'
  },
  es:{
    navInventory:'Inventario',
    navGuides:'Cómo Funciona / Guías',
    navDashboard:'Mi Panel / Perfil',
    navAdmin:'Portal de Administración',
    navCalendar:'Calendario de Visitas',
    navAuth:'Iniciar Sesión / Registrarse',
    logout:'Cerrar sesión',
    cloudLive:'● Base de Datos en la Nube Conectada (24/7)',
    cloudOffline:'● Modo Local de Respaldo',
    newHere:'¿Nuevo aquí?',
    guideLink:'Paso a paso: cómo crear tu cuenta y navegar el sitio →',
    searchPlaceholder:'Buscar dirección o ciudad…',
    searchPlaceholderGuest:'Buscar calle o ciudad…',
    city:'Ciudad',
    area:'Zona',
    beds:'Recámaras',
    baths:'Baños',
    bedsPlus:'+ rec.',
    bathsPlus:'+ baños',
    maxDown:'Enganche máx $',
    maxMonthly:'Mensualidad máx $',
    maxPrice:'Precio máx $',
    status:'Estado',
    sort:'Ordenar',
    sortBy:'Ordenar por',sortNewest:'Más recientes',sortCityAz:'Ciudad A–Z',sortPriceAscL:'Precio: menor a mayor',sortPriceDescL:'Precio: mayor a menor',sortDownAscL:'Enganche: menor a mayor',sortMonthlyAscL:'Pago mensual: menor a mayor',
    sortPriceAsc:'Precio ↑',
    sortPriceDesc:'Precio ↓',
    sortDownAsc:'Enganche ↑',
    sortMonthlyAsc:'Mensualidad ↑',
    sortBedsDesc:'Recámaras ↓',
    homesCount:'casas',
    price:'Precio',
    down:'Enganche',
    monthly:'Mensualidad',
    perMo:'/mes',
    yrs:'años',
    viewDetails:'Ver detalles',
    viewPhotos:'Ver fotos',
    photosCount:'fotos',
    morePhotos:'Ver más fotos ↗',
    guestBannerTitle:'Vista Previa sin Cuenta (Solo Fotos y Parte de la Dirección)',
    guestBannerBody:'Crea una cuenta gratis o inicia sesión para ver la dirección completa, precio, enganche, mensualidad, recámaras/baños y todos los detalles de cada propiedad.',
    guestBannerBtn:'Crear Cuenta Gratis / Iniciar Sesión',
    guestCardPrompt:'Crea una cuenta para ver la dirección completa, precio, enganche y todos los detalles.',
    guestCardBtn:'Crear Cuenta para Ver Detalles',
    guestModalTitle:'🔒 Crea una Cuenta para Ver Todos los Detalles',
    guestModalBody:'Regístrate gratis o inicia sesión para desbloquear la dirección exacta, precio, enganche, mensualidad, recámaras/baños, pies cuadrados, y para agendar una cita o hacer una oferta.',
    guestCreateBtn:'Crear Cuenta Gratis',
    guestLoginBtn:'Iniciar Sesión',
    makeOffer:'Hacer una Oferta',
    offerPrice:'Precio ofrecido $',
    downPayment:'Enganche $',
    monthlyPayment:'Mensualidad $',
    notes:'Notas',
    submitOffer:'Enviar Oferta',
    requestShowing:'Solicitar una Cita para Ver la Casa',
    requestShowingBtn:'Solicitar Cita',
    shareHouse:'Compartir Casa con mi Agente',
    msgToAgent:'Mensaje para tu agente',
    defaultShareMsg:'Me gustaría ver esta propiedad.',
    requestAccess:'Solicitar Acceso a la Propiedad',
    loginPromptLink:'Crea una cuenta o inicia sesión',
    loginPromptRest:'para ver la dirección completa y todos los detalles.',
    loginTitle:'Iniciar Sesión',
    email:'Correo electrónico',
    password:'Contraseña',
    forgotPw:'¿Olvidaste tu contraseña? / Restablecer',
    forgotModalTitle:'Restablecer tu Contraseña',
    forgotModalDesc:'Ingresa tu correo registrado. Te enviaremos un código de 6 dígitos para crear una nueva contraseña.',forgotSendBtn:'Enviarme un código',forgotCodeSent:'Si ese correo tiene cuenta, ya va un código en camino. Escríbelo junto con tu nueva contraseña (mínimo 8 caracteres).',
    forgotConfirmPw:'Confirmar nueva contraseña (8+)',
    forgotSubmitBtn:'Guardar Contraseña e Iniciar Sesión',
    pwMismatch:'Las contraseñas no coinciden.',
    registerTitle:'Crear Cuenta',
    roleBuyer:'Comprador (Público General)',
    roleAgent:'Agente con Licencia',
    fullName:'Nombre completo',
    phone:'Teléfono',
    passwordMin:'Contraseña (mín. 8 caracteres)',
    inviteCode:'Código de invitación de tu agente (D2D-XXXXXX)',
    noAgentYet:'Todavía no tengo agente',
    orecLicense:'Número de licencia OREC #',
    brokerage:'Inmobiliaria (Brokerage)',
    createAccount:'Crear cuenta',
    myProfile:'Mi Perfil',
    yourInviteCode:'Tu código de invitación:',
    save:'Guardar',
    yourAgent:'Tu agente asignado:',
    changePw:'Cambiar Contraseña',
    currentPw:'Contraseña actual',
    newPw:'Nueva contraseña (8+)',
    updatePw:'Actualizar Contraseña',
    favorites:'Casas Favoritas',
    viewedHomes:'Casas Vistas Recientemente',
    noneYet:'Ninguna todavía',
    messages:'Mensajes con tu Agente / Clientes',
    propAddress:'— Seleccionar propiedad —',
    kindMsg:'Mensaje',
    send:'Enviar',
    noAgentLinked:'Sin agente o cliente vinculado.',
    myOffers:'Mis Ofertas',
    counterLabel:'Contraoferta',
    txDocs:'Documentos de la Transacción',
    myDocFolder:'Mi Carpeta de Documentos',
    folder:'Carpeta',
    noDocs:'Sin documentos',
    myClients:'Mis Clientes',
    noClients:'Sin clientes todavía',
    adminsOnly:'Solo administradores.',
    recentOffers:'Ofertas Recientes',
    colProperty:'Propiedad',
    colBuyer:'Comprador',
    colOffer:'Oferta (Precio / Enganche / Mensualidad)',
    colStatus:'Estado',
    colActions:'Acciones',
    accept:'Aceptar',
    counterOffer:'Contraoferta',
    reject:'Rechazar',
    noOffers:'Sin ofertas',
    usersAgents:'Usuarios y Agentes',
    colName:'Nombre',
    colRole:'Rol',
    colInvite:'Código',
    colResetPw:'Restablecer Contraseña',
    reset:'Restablecer',
    listings:'Propiedades (Inventario)',
    colAddress:'Dirección',
    sentAlert:'¡Enviado!',
    requestedAlert:'¡Solicitud enviada!',
    savedAlert:'Guardado',
    pwUpdatedAlert:'¡Contraseña actualizada y sesión iniciada!',
    evTitle:'Verifica tu correo',evDesc:'Enviamos un código de 6 dígitos a',evNeed:'Tu correo aún no está verificado. Te enviamos un código nuevo.',evCode:'Código de 6 dígitos',evVerify:'Verificar',evResend:'Reenviar código',evLater:'Más tarde',evBad:'Código incorrecto. Intenta de nuevo.',evExpired:'El código venció. Toca "Reenviar código".',evTooMany:'Demasiados intentos. Intenta más tarde.',evWait:'Espera unos segundos antes de pedir otro código.',evSendFail:'No pudimos enviar el correo. Intenta de nuevo.',evSent:'Te enviamos un código nuevo a tu correo.',evDone:'¡Correo verificado! Bienvenido.',
    pwResetAlert:'Contraseña restablecida.',
    offerSubmitted:'Enviada',
    offerAccepted:'Aceptada',
    offerRejected:'Rechazada',
    offerCountered:'Contraoferta',
    streetHidden:'Dirección oculta',
    compare:'Comparar',
    favorite:'Favorita',
    sqft:'Pies²',
    bdShort:'rec.',
    baShort:'baños',
    sqftUnit:'pies²',
    perSqft:'/pie²',
    allAsking:'Todo lo que pide (precio, enganche y mensualidad que pide el vendedor)',
    allAskingNote:'Todo lo que pide',
    roleAgentShort:'Agente',
    roleClientShort:'Cliente',
    roleAdminShort:'Admin',
    showingApproved:'APROBADA',
    showingDenied:'RECHAZADA',
    showingRequested:'SOLICITADA',
    promptCounterPrice:'Precio de contraoferta $',
    promptCounterDown:'Enganche de contraoferta $',
    promptCounterMonthly:'Mensualidad de contraoferta $',
    promptAdminNotes:'Notas del administrador',
    selfServiceReset:'Enlace para que restablezca su contraseña:',
    loadFail:'No se pudieron cargar los datos',
    docInspection:'Reporte de inspección'
  }
};
const ALL_ASK_NOTES=[L10N.en.allAskingNote,L10N.es.allAskingNote];
const tr=k=>{
  const pack=L10N[S.lang]||L10N.en;
  const local=pack[k]||L10N.en[k];
  if(local)return local;
  if(window.translateI18n){
    const v=window.translateI18n(S.lang,k);
    if(v&&v!==k)return v;
  }
  return k;
};
const kindLabel=k=>{
  const u=String(k||'').toUpperCase();
  if(u==='MESSAGE')return tr('kindMsg');
  if(u==='REQUEST_ACCESS')return tr('requestAccess');
  if(u==='SHARE_HOUSE')return tr('shareHouse');
  return k||'';
};
const roleLabel=r=>r==='AGENT'?tr('roleAgentShort'):r==='ADMIN'?tr('roleAdminShort'):r==='BUYER'?tr('roleClientShort'):(r||'');
function docTypeLabel(t){
  if(t==='INSPECTION_REPORT')return tr('docInspection');
  const d=(S.TX_DOCS||[]).find(x=>x.type===t);
  if(!d)return t||'';
  return S.lang==='es'?(d.labelEs||d.label):d.label;
}
function startsWithAsk(value){
  const s=String(value||'');
  if(!s)return false;
  return ALL_ASK_NOTES.some(p=>s.indexOf(p)===0);
}
function stripAllAsk(value){
  let out=String(value||'');
  if(!out)return out;
  ALL_ASK_NOTES.forEach(p=>{if(p&&out.indexOf(p)===0)out=out.slice(p.length).replace(/^( - )?/, '');});
  return out;
}

const go=(t,focusSel)=>{
  tab=t;
  location.hash=t;
  render();
  if(focusSel){
    setTimeout(()=>{const el=$(focusSel);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus();}},60);
  }
};
const badge=s=>`<span class="badge" style="background:${({AVAILABLE:'#16a34a',COMING_SOON:'#2563eb',CLOSED:'#475569',SOLD:'#475569'})[s]||'#d97706'};color:#fff;padding:2px 8px;border-radius:999px;font-size:12px">${esc(S.statusText?S.statusText(s):(S.STATUS_LABEL[s]||s))}</span>`;
const offerBadge=s=>{
  const label=s==='COUNTERED'?tr('offerCountered'):s==='ACCEPTED'?tr('offerAccepted'):s==='REJECTED'?tr('offerRejected'):s==='SUBMITTED'?tr('offerSubmitted'):s;
  return `<span style="background:${S.OFFER_COLOR[s]||'#64748b'};color:#fff;padding:2px 8px;border-radius:6px">${esc(label)}</span>`;
};
const partialAddr=l=>{
  const rawStreet=(l.approxLocation&&l.approxLocation.streetOnly)||String(l.address||'').replace(/^\s*\d+[A-Za-z\-]*\s+/,'').trim();
  const street=rawStreet.replace(/^\s*\d+[A-Za-z\-]*\s+/,'').trim()||tr('streetHidden');
  const city=l.city||'';
  return `${esc(street)}${city?', '+esc(city):''}`;
};
function shareId(){
  try{
    const p=new URLSearchParams(location.search).get('p');
    return p?String(p).trim():'';
  }catch(e){return '';}
}
function resetQueryActive(){
  try{
    const sp=new URLSearchParams(location.search);
    return !!(sp.get('reset')||sp.get('email')||sp.get('token'));
  }catch(e){return false;}
}
function propertyShareUrl(id){
  return location.origin+'/?p='+encodeURIComponent(id);
}
function clearShareParam(){
  try{
    const u=new URL(location.href);
    if(!u.searchParams.has('p'))return;
    u.searchParams.delete('p');
    history.replaceState(null,'',u.pathname+u.search+u.hash);
  }catch(e){}
}
function copyText(text){
  if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text);
  return new Promise((res,rej)=>{
    const ta=document.createElement('textarea');
    ta.value=text;ta.setAttribute('readonly','');
    ta.style.position='fixed';ta.style.left='-9999px';
    document.body.appendChild(ta);
    ta.select();
    try{document.execCommand('copy')?res():rej(new Error('copy'));}
    catch(err){rej(err);}
    finally{ta.remove();}
  });
}
function shareDetailAllowed(){
  const h=(location.hash||'').replace(/^#/,'');
  return !h||h==='inventory';
}
const title=l=>S.user?`${esc(l.address)}, ${esc(l.city)}, ${esc(l.state||'OK')} ${esc(l.zip||'')}`:partialAddr(l);

function modal(html){const m=document.createElement('div');m.className='modal-backdrop';m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999';
  m.style.justifyContent='flex-end';m.innerHTML=`<div class="drawer-panel"><button class="close nav-pill" style="float:right">✕</button>${html}</div>`;
  m.onclick=e=>{if(e.target===m||e.target.classList.contains('close'))m.remove();};document.body.appendChild(m);return m;}
const wrap=fn=>async e=>{e&&e.preventDefault&&e.preventDefault();try{await fn(e);}catch(err){alert(err.message);}};
const fd=f=>Object.fromEntries(new FormData(f));

function openForgotModal(prefillEmail=''){
  const loginEmailInput=$('#loginF [name="email"]');
  const initialEmail=prefillEmail||(loginEmailInput?loginEmailInput.value:'');
  const m=modal(`<h2>${tr('forgotModalTitle')}</h2>
    <p style="font-size:14px;color:#475569;margin-bottom:12px">${tr('forgotModalDesc')}</p>
    <form id="forgotSendF" style="display:grid;gap:10px">
      <input name="email" type="email" placeholder="${tr('email')}" value="${esc(initialEmail)}" required>
      <button type="submit" style="padding:10px 14px;font-weight:600">${tr('forgotSendBtn')}</button>
    </form>
    <form id="forgotModalF" style="display:none;gap:10px;margin-top:12px">
      <p style="font-size:13px;color:#475569">${tr('forgotCodeSent')}</p>
      <input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="${tr('evCode')}" required>
      <input name="pw" type="password" placeholder="${tr('newPw')}" minlength="8" required>
      <input name="pw2" type="password" placeholder="${tr('forgotConfirmPw')}" minlength="8" required>
      <button type="submit" style="padding:10px 14px;font-weight:600">${tr('forgotSubmitBtn')}</button>
    </form>`);
  const fs=m.querySelector('#forgotSendF'),f=m.querySelector('#forgotModalF');let email='';
  fs.onsubmit=wrap(async()=>{email=fd(fs).email;await S.forgotPassword(email);f.style.display='grid';fs.querySelector('button').textContent=tr('evResend');});
  f.onsubmit=wrap(async()=>{
    const v=fd(f);
    if(String(v.pw||'').trim()!==String(v.pw2||'').trim())throw new Error(tr('pwMismatch'));
    const u=await S.resetPassword(email,v.code,v.pw);
    m.remove();
    alert(tr('pwUpdatedAlert'));
    go(u&&u.role==='ADMIN'?'admin':'dashboard');
  });
}

function openAdminResetModal(userId){
  const u=S.data.users.find(x=>x.id===userId);
  if(!u)return;
  const resetUrl=`${location.origin}${location.pathname}?reset=${encodeURIComponent(u.email)}#auth`;
  const m=modal(`<h2>${tr('colResetPw')}: ${esc(u.name)}</h2>
    <p style="font-size:14px;color:#475569">${esc(u.email)}</p>
    <form id="adminResetF" style="display:grid;gap:10px;margin-top:10px">
      <input name="pw" type="text" placeholder="${tr('newPw')}" value="LegacyClient2026" minlength="8" required>
      <button type="submit">${tr('save')}</button>
    </form>
    <div style="margin-top:14px;padding:10px;background:#f8fafc;border-radius:8px;font-size:12px">
      <b>${tr('selfServiceReset')}</b><br>
      <input type="text" readonly value="${esc(resetUrl)}" style="width:100%;margin-top:4px;font-size:12px" onclick="this.select()">
    </div>`);
  const f=m.querySelector('#adminResetF');
  f.onsubmit=wrap(async()=>{
    const v=fd(f);
    await S.adminResetPassword(userId,v.pw);
    m.remove();
    alert(tr('pwResetAlert'));
  });
}

function header(){
  const T=[['inventory',tr('navInventory')],['guides',tr('navGuides')],['dashboard',tr('navDashboard')]];
  if(S.canSeeShowingCalendar&&S.canSeeShowingCalendar())T.push(['calendar',tr('navCalendar')]);
  if(S.isAdmin())T.push(['admin',tr('navAdmin')]);
  if(!S.user)T.push(['auth',tr('navAuth')]);
  const cloudPill=`<span style="background:${S.cloudConnected?'#dcfce7':'#fef3c7'};color:${S.cloudConnected?'#166534':'#92400e'};padding:2px 8px;border-radius:999px;font-weight:700;font-size:11px">${S.cloudConnected?tr('cloudLive'):tr('cloudOffline')}</span>`;
  return `<header class="app-header"><div class="brand-wrap" data-tab="inventory"><img src="legacy-logo.png" alt="Legacy" class="main-logo"><div><h1 class="brand-title">Legacy - Owner Finance</h1>
   <div class="brand-sub"><span>Brokerage By: KLC Real Estate, LLC</span><img src="klc-logo.png" alt="KLC">${cloudPill}</div></div></div>
   <nav class="nav-pills">${T.map(([k,v])=>`<button data-tab="${k}" class="nav-pill ${tab===k?'active':''}">${v}</button>`).join('')}
   ${S.user?`<button id="logout" class="nav-pill">${tr('logout')} (${esc(S.user.name)})</button>`:''}
   <button data-lang="en" class="nav-pill lang-btn ${S.lang==='en'?'active':''}">EN</button><button data-lang="es" class="nav-pill lang-btn ${S.lang==='es'?'active':''}">ES</button></nav></header>
   <div class="guide-banner"><span>${tr('newHere')} <a href="#guides" data-tab="guides">${tr('guideLink')}</a></span></div>`;
}

function guides(){
  if(S.lang==='es'){
    return `<section class="card" style="padding:20px"><h2>Cómo Funciona</h2>
    <h3>Crear una cuenta de Comprador</h3><ol>
    <li>Haz clic en <b>Iniciar Sesión / Registrarse</b> y elige <b>Comprador (Público General)</b>.</li>
    <li>Ingresa el código de invitación de tu agente (ej. D2D-XXXXXX). ¿No tienes agente? Marca <b>“Todavía no tengo agente”</b> y se te asignará un agente con licencia automáticamente.</li>
    <li>Crea una contraseña (8+ caracteres) y envía el formulario para desbloquear todas las direcciones, precios y detalles.</li></ol>
    <h3>Crear una cuenta de Agente</h3><ol>
    <li>Elige <b>Agente con Licencia</b> e ingresa tu número de licencia OREC y tu inmobiliaria (Brokerage).</li>
    <li>Al registrarte recibirás tu propio código de invitación para compartir con tus clientes.</li></ol>
    <h3>Cómo navegar el sitio</h3><ol>
    <li><b>Inventario</b>: una vez dentro de tu cuenta, busca por dirección, filtra por ciudad, zona, recámaras, enganche o mensualidad, explora el mapa interactivo y toca ♥ para guardar casas favoritas.</li>
    <li>Abre cualquier propiedad para ver fotos, solicitar una cita, enviar una oferta o compartir la casa con tu agente.</li>
    <li><b>Mi Panel / Perfil</b>: consulta tu perfil, favoritos, mensajes privados con tu agente, ofertas y tu carpeta personal de documentos. Cuando tu oferta es aceptada, se desbloquea el recuadro para subir tu Identificación (ID) y Comprobante de Ingresos.</li>
    <li>¿Olvidaste tu contraseña? Usa “¿Olvidaste tu contraseña?” en la pantalla de inicio de sesión y te enviaremos un código por correo para crear una nueva.</li></ol></section>`;
  }
  return `<section class="card" style="padding:20px"><h2>How It Works</h2><h3>Create a Buyer account</h3><ol><li>Click <b>Login / Register</b> and choose <b>Buyer</b>.</li><li>Enter your agent's invite code (e.g. D2D-XXXXXX). No agent? Choose “I don't have an agent, yet” — a licensed agent will be assigned to you.</li><li>Set a password (8+ characters) and submit to unlock all full addresses, prices, and property details.</li></ol>
<h3>Create an Agent account</h3><ol><li>Choose <b>Agent</b>, enter your OREC license # and brokerage.</li><li>After registering you receive your own invite code to share with clients.</li></ol>
<h3>Navigating</h3><ol><li><b>Inventory</b>: once signed in, search by address, filter, view the map, and tap ♥ to save homes.</li><li>Open a home to see photos, request a showing, make an offer or share it with your agent.</li><li><b>Dashboard</b>: profile, favorites, messages, offers and your document folder. Once an offer is accepted, upload your ID and Proof of Income there.</li><li>Forgot your password? Click “Forgot password?” on the login screen and we will email you a code to set a new one.</li></ol></section>`;
}

function filtered(){let L=S.data.listings.filter(l=>{const q=F.q.toLowerCase();
  const searchable=S.user?(l.address+' '+(l.publicTitle||'')+' '+l.city+' '+l.zip):(partialAddr(l)+' '+l.city);
  if(q&&!searchable.toLowerCase().includes(q))return false;
  if(F.area&&!(l.areas||[]).includes(F.area))return false;
  if(CHIP==='AVAILABLE'&&l.status!=='AVAILABLE')return false;if(CHIP==='COMING_SOON'&&l.status!=='COMING_SOON')return false;
  if(S.user){
    if(CHIP==='LOW_DOWN'&&(l.downPayment||1e9)>1000000)return false;if(CHIP==='LOW_MONTHLY'&&(l.monthlyPayment||1e9)>150000)return false;if(CHIP==='BEDS_3'&&(l.beds||0)<3)return false;
    if(F.beds&&(l.beds||0)<+F.beds)return false;if(F.baths&&(l.baths||0)<+F.baths)return false;
    if(F.maxDown&&l.downPayment>F.maxDown*100)return false;if(F.maxMonthly&&l.monthlyPayment>F.maxMonthly*100)return false;
    if(F.maxPrice&&l.askingPrice>F.maxPrice*100)return false;if(F.status&&l.status!==F.status)return false;
  }
  return true;});
  const PRIV=['priceAsc','priceDesc','downAsc','monthlyAsc','bedsDesc'];let so=F.sort||'newest';if(!S.user&&PRIV.includes(so))so='newest';
  const ts=l=>{const t=Date.parse(l.createdAt||l.created_at||l.listedAt||l.updatedAt||l.updated_at||'');return isNaN(t)?0:t;};
  const idx=new Map(S.data.listings.map((l,i)=>[l.id,i]));
  if(so==='newest')return L.sort((a,b)=>(ts(b)-ts(a))||(idx.get(b.id)-idx.get(a.id)));
  if(so==='cityAz')return L.sort((a,b)=>(a.city||'').localeCompare(b.city||'')||partialAddr(a).localeCompare(partialAddr(b)));
  const k={priceAsc:['askingPrice',1],priceDesc:['askingPrice',-1],downAsc:['downPayment',1],monthlyAsc:['monthlyPayment',1],bedsDesc:['beds',-1]}[so];
  return L.sort((a,b)=>((a[k[0]]||0)-(b[k[0]]||0))*k[1]);}

// ===== Client search criteria ("What are you looking for?") =====
let VIEW='REC';
const SC_TXT={
 en:{title:'What are you looking for?',sub:'Answer a few quick questions and we will put the homes that fit you first. You can still see every home.',
  step:'Step',of:'of',next:'Next',back:'Back',skip:'Skip for now',saveBtn:'Show my matches',any:'Any',
  qBeds:'How many bedrooms do you need (minimum)?',qBaths:'How many bathrooms (minimum)?',qCities:'Which cities or areas? (pick any)',
  qBudget:'What fits your budget?',qPrice:'Max price $',qDown:'Max down payment $',qMonthly:'Max monthly payment $',qMore:'Anything else?',qSqft:'Minimum square feet (optional)',
  rec:'Recommended for you',all:'All properties',edit:'Edit my search',great:'Great match',close:'Close match',others:'Other homes',
  noMatch:'No close matches yet — try widening your search. All homes are listed below.',setPrompt:'Tell us what you are looking for and we will show the best matches first.',setBtn:'Set my search',
  mySearch:'My Search',noCrit:'No search saved yet.',clientCrit:'Saved search (read-only)',bedsL:'Beds',bathsL:'Baths',citiesL:'Cities',priceL:'Max price',downL:'Max down',monthlyL:'Max monthly',sqftL:'Min sq ft'},
 es:{title:'¿Qué estás buscando?',sub:'Contesta unas preguntas rápidas y te mostraremos primero las casas que te quedan. Siempre podrás ver todas las casas.',
  step:'Paso',of:'de',next:'Siguiente',back:'Atrás',skip:'Omitir por ahora',saveBtn:'Ver mis casas ideales',any:'Cualquiera',
  qBeds:'¿Cuántas recámaras necesitas (mínimo)?',qBaths:'¿Cuántos baños (mínimo)?',qCities:'¿En qué ciudades o zonas? (elige las que quieras)',
  qBudget:'¿Qué se ajusta a tu presupuesto?',qPrice:'Precio máximo $',qDown:'Enganche máximo $',qMonthly:'Mensualidad máxima $',qMore:'¿Algo más?',qSqft:'Pies cuadrados mínimos (opcional)',
  rec:'Recomendadas para ti',all:'Todas las casas',edit:'Editar mi búsqueda',great:'Excelente opción',close:'Opción cercana',others:'Otras casas',
  noMatch:'Aún no hay opciones cercanas — amplía tu búsqueda. Todas las casas aparecen abajo.',setPrompt:'Dinos qué buscas y te mostraremos primero las mejores opciones.',setBtn:'Definir mi búsqueda',
  mySearch:'Mi Búsqueda',noCrit:'Aún no hay búsqueda guardada.',clientCrit:'Búsqueda guardada (solo lectura)',bedsL:'Recámaras',bathsL:'Baños',citiesL:'Ciudades',priceL:'Precio máx',downL:'Enganche máx',monthlyL:'Mensualidad máx',sqftL:'Pies² mín'}};
const st=k=>(SC_TXT[S.lang]||SC_TXT.en)[k];
const isClient=()=>Boolean(S.user&&S.user.role==='BUYER'&&!S.isAdmin());
const critOf=u=>{const bp=S.buyerProfile(u);const c=bp&&bp.searchCriteria;return c&&Object.keys(c).some(k=>k!=='updatedAt'&&c[k]!==''&&c[k]!=null&&!(Array.isArray(c[k])&&!c[k].length))?c:null;};
// Weights: down, monthly and cities matter most for owner-finance buyers, with beds/baths close behind.
const W={maxDown:25,maxMonthly:25,cities:20,beds:15,baths:12,maxPrice:5,minSqft:3};
function matchScore(l,c){if(!c)return null;let tot=0,got=0,fails=0;
 const add=(k,s)=>{tot+=W[k];got+=W[k]*s;if(s===0)fails++;};
 const money=(k,val)=>{const cap=+c[k];if(!cap)return;const v=(val||0)/100;if(!v){add(k,.5);return;}add(k,v<=cap?1:v<=cap*1.15?.5:0);};
 money('maxDown',l.downPayment);money('maxMonthly',l.monthlyPayment);money('maxPrice',l.askingPrice);
 if(c.cities&&c.cities.length)add('cities',c.cities.includes(l.city)?1:0);
 if(+c.beds){const b=l.beds;add('beds',b==null?.5:b>=+c.beds?1:b>=+c.beds-1?.5:0);}
 if(+c.baths){const b=l.baths;add('baths',b==null?.5:b>=+c.baths?1:b>=+c.baths-1?.5:0);}
 if(+c.minSqft){const q=l.sqft;add('minSqft',q==null?.5:q>=+c.minSqft?1:q>=+c.minSqft*.85?.5:0);}
 if(!tot)return null;const score=got/tot;
 return {score,level:score>=0.999?'GREAT':(score>=0.7&&fails<=1)?'CLOSE':null};}
const matchBadge=m=>m&&m.level?`<span class="match-badge ${m.level==='GREAT'?'great':'close'}">${m.level==='GREAT'?'⭐ '+st('great'):'👍 '+st('close')}</span>`:'';
function critSummary(c){if(!c)return `<p style="color:var(--muted)">${st('noCrit')}</p>`;const m=v=>'$'+(+v).toLocaleString();const r=[];
 if(+c.beds)r.push([st('bedsL'),c.beds+'+']);if(+c.baths)r.push([st('bathsL'),c.baths+'+']);if(c.cities&&c.cities.length)r.push([st('citiesL'),c.cities.join(', ')]);
 if(+c.maxPrice)r.push([st('priceL'),m(c.maxPrice)]);if(+c.maxDown)r.push([st('downL'),m(c.maxDown)]);if(+c.maxMonthly)r.push([st('monthlyL'),m(c.maxMonthly)]);if(+c.minSqft)r.push([st('sqftL'),(+c.minSqft).toLocaleString()]);
 return `<ul class="crit-list">${r.map(([a,b])=>`<li><span>${esc(a)}</span><b>${esc(b)}</b></li>`).join('')}</ul>`;}
function openCriteriaWizard(){if(!isClient())return;const cur=Object.assign({beds:'',baths:'',cities:[],maxPrice:'',maxDown:'',maxMonthly:'',minSqft:''},critOf(S.user)||{});
 const cities=[...new Set(S.data.listings.map(l=>l.city).filter(Boolean))].sort();let step=0;const N=5;
 const opt=(name,vals)=>`<div class="sc-opts">${vals.map(([v,lab])=>`<label class="sc-opt"><input type="radio" name="${name}" value="${v}" ${String(cur[name])===String(v)?'checked':''}><span>${lab}</span></label>`).join('')}</div>`;
 const steps=[
  ()=>`<h3>${st('qBeds')}</h3>${opt('beds',[['',st('any')],[1,'1+'],[2,'2+'],[3,'3+'],[4,'4+'],[5,'5+']])}`,
  ()=>`<h3>${st('qBaths')}</h3>${opt('baths',[['',st('any')],[1,'1+'],[1.5,'1.5+'],[2,'2+'],[3,'3+']])}`,
  ()=>`<h3>${st('qCities')}</h3><div class="sc-opts">${cities.map(c=>`<label class="sc-opt"><input type="checkbox" name="cities" value="${esc(c)}" ${cur.cities.includes(c)?'checked':''}><span>${esc(c)}</span></label>`).join('')}</div>`,
  ()=>`<h3>${st('qBudget')}</h3><label>${st('qDown')}<input name="maxDown" type="number" min="0" step="500" value="${esc(cur.maxDown)}" placeholder="${st('any')}"></label><label>${st('qMonthly')}<input name="maxMonthly" type="number" min="0" step="50" value="${esc(cur.maxMonthly)}" placeholder="${st('any')}"></label><label>${st('qPrice')}<input name="maxPrice" type="number" min="0" step="1000" value="${esc(cur.maxPrice)}" placeholder="${st('any')}"></label>`,
  ()=>`<h3>${st('qMore')}</h3><label>${st('qSqft')}<input name="minSqft" type="number" min="0" step="50" value="${esc(cur.minSqft)}" placeholder="${st('any')}"></label>`];
 const m=modal(`<div id="scWiz"></div>`);m.classList.add('sc-modal');
 const collect=()=>{const f=m.querySelector('#scF');if(!f)return;if(step===2){cur.cities=[...f.querySelectorAll('[name=cities]:checked')].map(i=>i.value);return;}const v=fd(f);Object.keys(v).forEach(k=>cur[k]=v[k]);};
 const draw=()=>{m.querySelector('#scWiz').innerHTML=`<h2>🏡 ${st('title')}</h2><p style="color:var(--muted);font-size:14px">${st('sub')}</p>
  <div class="sc-progress"><div style="width:${(step+1)/N*100}%"></div></div><div style="font-size:12px;color:var(--muted)">${st('step')} ${step+1} ${st('of')} ${N}</div>
  <form id="scF" class="sc-form" onsubmit="return false">${steps[step]()}</form>
  <div class="sc-nav"><button type="button" class="btn-card" id="scSkip">${st('skip')}</button><span style="flex:1"></span>${step?`<button type="button" class="btn-card" id="scBack">${st('back')}</button>`:''}<button type="button" class="btn-card primary" id="scNext">${step===N-1?st('saveBtn'):st('next')}</button></div>`;
  m.querySelector('#scSkip').onclick=()=>{S.markCriteriaPrompted();m.remove();};
  const b=m.querySelector('#scBack');if(b)b.onclick=()=>{collect();step--;draw();};
  m.querySelector('#scNext').onclick=()=>{collect();if(step<N-1){step++;draw();return;}S.saveSearchCriteria(cur);VIEW='REC';m.remove();if(tab!=='inventory')go('inventory');else render();};};
 draw();}
function maybePromptCriteria(){if(isClient()&&!critOf(S.user)){const bp=S.buyerProfile(S.user);if(!(bp&&bp.criteriaPrompted))setTimeout(openCriteriaWizard,120);}}
function cardsSection(L){
 if(!isClient())return `<div class="cards-grid">${L.map(l=>card(l)).join('')}</div>`;
 const c=critOf(S.user);
 const tog=`<div class="sc-toolbar"><div class="sc-toggle"><button type="button" data-view="REC" class="${VIEW==='REC'?'active':''}">⭐ ${st('rec')}</button><button type="button" data-view="ALL" class="${VIEW==='ALL'?'active':''}">${st('all')}</button></div><button type="button" class="btn-card" data-editsearch="1">✏️ ${st('edit')}</button></div>`;
 if(!c)return `${tog}<div class="sc-cta">🏡 ${st('setPrompt')} <button type="button" class="btn-card primary" data-editsearch="1">${st('setBtn')}</button></div><div class="cards-grid">${L.map(l=>card(l)).join('')}</div>`;
 const sc=L.map(l=>({l,m:matchScore(l,c)}));
 if(VIEW==='ALL')return `${tog}<div class="cards-grid">${sc.map(x=>card(x.l,x.m)).join('')}</div>`;
 const rec=sc.filter(x=>x.m&&x.m.level).sort((a,b)=>b.m.score-a.m.score),rest=sc.filter(x=>!(x.m&&x.m.level));
 return `${tog}<h3 class="sc-h">⭐ ${st('rec')} (${rec.length})</h3>${rec.length?`<div class="cards-grid">${rec.map(x=>card(x.l,x.m)).join('')}</div>`:`<p class="sc-cta">${st('noMatch')}</p>`}
  <h3 class="sc-h">${st('others')} (${rest.length})</h3><div class="cards-grid">${rest.map(x=>card(x.l,x.m)).join('')}</div>`;}
window.__sc={matchScore,critOf};

function guestShare(l){
  const ph=(l.photoUrls&&l.photoUrls.length)?l.photoUrls:[l.photoUrl||'listing-placeholder.svg'];
  const alt=partialAddr(l);
  return `<section class="share-view">
    <div class="share-toolbar"><button type="button" class="btn-card" data-shareclear="1">${tr('share.back')}</button></div>
    <article class="card share-card">
      <div class="share-head"><h2 class="share-addr">📍 ${alt}</h2><div class="share-status">${badge(l.status)}</div></div>
      <div class="share-gallery" aria-label="${esc(tr('share.gallery'))}">${ph.map((p,i)=>`<img src="${esc(p)}" alt="${alt}" referrerpolicy="no-referrer" ${i===0?'fetchpriority="high"':'loading="lazy"'} onerror="window.imgFallback&&window.imgFallback(this)">`).join('')}</div>
      <p class="share-count">${ph.length} ${tr('photosCount')}</p>
      <div class="share-cta">
        <h3>${tr('guestModalTitle')}</h3>
        <p>${tr('guestModalBody')}</p>
        <div class="share-cta-actions">
          <button type="button" class="btn-card primary" data-register="1">${tr('guestCreateBtn')}</button>
          <button type="button" class="btn-card" data-login="1">${tr('guestLoginBtn')}</button>
        </div>
      </div>
    </article>
  </section>`;
}
function shareMissingNotice(){
  const id=shareId();
  if(!id||resetQueryActive()||S.listing(id))return '';
  return `<div class="share-notice" role="status">${tr('share.missing')}</div>`;
}
function inventory(){
  const sid=shareId();
  if(sid&&!S.user&&!resetQueryActive()){
    const shared=S.listing(sid);
    if(shared)return guestShare(shared);
  }
  const all=S.data.listings,L=filtered();
  const es=S.lang==='es';
  const sel=(n,opts,lab)=>`<select name="${n}" class="filter-select"><option value="">${lab}</option>${opts.map(o=>`<option value="${esc(o[0]??o)}" ${F[n]==(o[0]??o)?'selected':''}>${esc(o[1]??o)}</option>`).join('')}</select>`;
  const nAv=all.filter(l=>l.status==='AVAILABLE').length,nCs=all.filter(l=>l.status==='COMING_SOON').length;
  const downs=all.map(l=>l.downPayment).filter(x=>x>0),minDown=downs.length?Math.min(...downs):0;
  const dv=F.maxDown||40000,mv=F.maxMonthly||3000;
  const chips=[['ALL',(es?'Todas':'All Active Homes')+` (${all.length})`],['AVAILABLE',`✅ ${es?'Disponibles':'Available Only'} (${nAv})`]]
    .concat(S.user?[['LOW_DOWN',`🔥 ${es?'Enganche':'Down'} ≤ $10,000`],['LOW_MONTHLY',`💳 ${es?'Mensualidad':'Monthly'} ≤ $1,500`],['BEDS_3',`🛏️ 3+ ${es?'Recámaras':'Bedrooms'}`]]:[])
    .concat([['COMING_SOON',`⏳ ${es?'Próximamente':'Coming Soon'} (${nCs})`]]);
  const guestNotice=!S.user?`<div class="card" style="padding:12px 16px;margin-bottom:14px;background:linear-gradient(135deg,#1e293b,#0f172a);color:#fff;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px">
    <div style="max-width:560px"><div style="font-weight:700;color:#f8d57e;margin-bottom:3px">🔒 ${tr('guestBannerTitle')}</div><div style="font-size:12.5px;color:#e2e8f0">${tr('guestBannerBody')}</div></div>
    <button data-register="1" class="btn-card primary" style="flex:0 0 auto">${tr('guestBannerBtn')}</button></div>`:'';
  return `<section class="hero-banner"><div class="hero-inner"><div class="hero-copy"><h2>${es?'El Portafolio Premier de Owner-Finance en Oklahoma':"Oklahoma's Premier Owner-Finance Portfolio"}</h2>
    <p>${es?'Casas con financiamiento del dueño en Oklahoma City, Del City, Midwest City, Yukon y alrededores.':'Owner-financed homes across Oklahoma City, Del City, Midwest City, Yukon, and surrounding communities.'}</p></div>
    <div class="hero-stats"><div class="stat-box"><div class="stat-num">${all.length}</div><div class="stat-lbl">${es?'Casas Activas':'Active Homes'}</div></div>
    <div class="stat-box"><div class="stat-num">${nAv}</div><div class="stat-lbl">${es?'Disponibles':'Available Now'}</div></div>
    ${S.user&&minDown?`<div class="stat-box"><div class="stat-num">$${(minDown/100000).toFixed(1)}k+</div><div class="stat-lbl">${es?'Enganche Mín':'Min Down'}</div></div>`:''}</div></div></section>
  <form id="filters" class="interactive-controls" onsubmit="return false"><div class="filter-row">
   <div class="search-box"><input name="q" placeholder="${S.user?tr('searchPlaceholder'):tr('searchPlaceholderGuest')}" value="${esc(F.q)}"></div>${(()=>{const o=[['newest',tr('sortNewest')],['cityAz',tr('sortCityAz')]].concat(S.user?[['priceAsc',tr('sortPriceAscL')],['priceDesc',tr('sortPriceDescL')],['downAsc',tr('sortDownAscL')],['monthlyAsc',tr('sortMonthlyAscL')]]:[]);const cur=o.some(x=>x[0]===F.sort)?F.sort:'newest';return `<select name="sort" class="filter-select sort-select" aria-label="${tr('sortBy')}" title="${tr('sortBy')}">${o.map(([v,t])=>`<option value="${v}" ${cur===v?'selected':''}>${esc(tr('sortBy'))}: ${esc(t)}</option>`).join('')}</select>`})()}
   ${S.user?`<div class="slider-group">${tr('maxDown').replace(' $','')}: <b>${dv>=40000?(es?'Cualquiera':'Any'):'$'+(+dv).toLocaleString()}</b><input type="range" name="maxDownR" min="3000" max="40000" step="500" value="${dv}"></div>
   <div class="slider-group">${tr('maxMonthly').replace(' $','')}: <b>${mv>=3000?(es?'Cualquiera':'Any'):'$'+(+mv).toLocaleString()}</b><input type="range" name="maxMonthlyR" min="800" max="3000" step="50" value="${mv}"></div>
   ${sel('beds',[1,2,3,4,5].map(n=>[n,n+tr('bedsPlus')]),tr('beds'))}${sel('status',S.STATUSES.map(s=>[s,S.statusText(s)]),tr('status'))}`:''}</div>
   <div class="quick-chips">${chips.map(([k,v])=>`<button type="button" class="chip ${CHIP===k?'active':''}" data-chip="${k}">${v}</button>`).join('')}</div></form>
  <div class="workspace-split"><div class="map-pane"><div id="inventory-map"></div></div>
   <div class="cards-pane">${shareMissingNotice()}${guestNotice}<div class="cards-toolbar"><b style="font-size:14px">${L.length} ${tr('homesCount')}</b><span style="font-size:12px;color:var(--muted)">💡 ${es?'Usa ‹ › en la foto para ver la galería':'Click ‹ › on any photo to swipe the gallery'}</span></div>
   ${cardsSection(L)}</div></div>
  ${S.user?`<div class="compare-tray ${CMP.size?'show':''}"><span>⚖️ <b>${CMP.size}</b> ${es?'casas para comparar':'homes selected to compare'}</span><button type="button" class="btn-card primary" data-cmpopen="1">${es?'Comparar':'Compare Side-by-Side'}</button><button type="button" class="btn-card" data-cmpclear="1">${es?'Limpiar':'Clear'}</button></div>`:''}`;}


function todayApptHtml(listingId){
  const times=(S.todayApprovedForListing?S.todayApprovedForListing(listingId):[])||[];
  if(!times.length)return '';
  const label=S.lang==='es'?'Citas de hoy (aprobadas)':"Today's approved showings";
  const bits=times.map(t=>esc(S.formatShowingTimeOnly?S.formatShowingTimeOnly(t):t));
  const dayLabel=esc(S.chicagoYmd?S.chicagoYmd():'');
  return `<div class="appt-today" title="${label}"><span class="appt-today-label">📅 ${label}</span><span class="appt-today-day">${dayLabel}</span><span class="appt-today-times">${bits.join(' · ')}</span></div>`;
}

function tenureHtml(l){
  if(!S.user||!l||typeof S.listingTenure!=='function')return '';
  const info=S.listingTenure(l);
  if(!info||!info.text)return '';
  const kind=info.kind==='active'||info.kind==='pending'||info.kind==='sold'?info.kind:'sold';
  const sub=info.sub?`<span class="tenure-sub">${esc(info.sub)}</span>`:'';
  return `<div class="tenure-note tenure-${kind}"><span class="tenure-main">${esc(info.text)}</span>${sub}</div>`;
}

function card(l,mt){
  const ph=(l.photoUrls&&l.photoUrls.length)?l.photoUrls:[l.photoUrl||'listing-placeholder.svg'],i=(PIDX[l.id]||0)%ph.length,multi=ph.length>1;
  const media=badgeHtml=>`<div class="card-media">${badgeHtml}<img src="${esc(ph[i])}" data-img="${l.id}" referrerpolicy="no-referrer" loading="lazy" onerror="window.imgFallback&&window.imgFallback(this)" data-open="${l.id}" style="cursor:pointer">
    ${multi?`<button type="button" class="carousel-btn prev" data-prev="${l.id}">‹</button><button type="button" class="carousel-btn next" data-next="${l.id}">›</button>`:''}<span class="photo-counter" data-cnt="${l.id}">📷 ${i+1} / ${ph.length}</span>`;
  if(!S.user){
    return `<article class="prop-card" data-card="${l.id}">${media(`<span class="badge-top-left" style="background:#0f172a">🔒 ${S.lang==='es'?'Vista Previa':'Guest Preview'}</span>`)}</div>
      <div class="card-body"><p class="addr-line">📍 ${partialAddr(l)}</p><div style="font-size:12px;color:var(--muted);background:var(--surface-2);border:1px dashed var(--border);padding:8px 10px;border-radius:9px">🔒 ${tr('guestCardPrompt')}</div>
      ${todayApptHtml(l.id)}
      <div class="card-actions"><button type="button" class="btn-card primary" data-register="1">${tr('guestCardBtn')}</button><button type="button" class="btn-card" data-open="${l.id}">${tr('viewPhotos')} (${ph.length})</button></div></div></article>`;
  }
  const col=({AVAILABLE:'#16a34a',COMING_SOON:'#2563eb',SOLD:'#475569',CLOSED:'#475569'})[l.status]||'#d97706';
  return `<article class="prop-card" data-card="${l.id}">${media(`<span class="badge-top-left" style="background:${col}">${esc(S.statusText?S.statusText(l.status):l.status)}</span>`)}
    <div class="card-top-actions"><button type="button" class="icon-circle-btn" title="${esc(tr('compare'))}" data-compare="${l.id}">${CMP.has(l.id)?'✅':'⚖️'}</button><button type="button" class="icon-circle-btn" title="${esc(tr('favorite'))}" data-fav="${l.id}">${S.isFavorite(l.id)?'❤️':'🤍'}</button></div></div>
    <div class="card-body">${matchBadge(mt)}<div class="price-strip"><span class="main-price">${S.money(l.askingPrice)}</span><span class="monthly-pill">${S.money(l.monthlyPayment)}${tr('perMo')}</span></div>
    <p class="addr-line">${title(l)}</p>
    ${tenureHtml(l)}
    <div class="down-box"><div>${tr('down')}<b>${S.money(l.downPayment)}</b></div><div>${tr('beds')}/${tr('baths')}<b>${l.beds??'—'} · ${l.baths??'—'}</b></div><div>${tr('sqft')}<b>${l.sqft?(+l.sqft).toLocaleString():'—'}</b></div></div>
    ${todayApptHtml(l.id)}
    <div class="card-actions"><button type="button" class="btn-card primary" data-open="${l.id}">${S.lang==='es'?'Ver Detalles':'View Details'}</button></div></div></article>`;
}

function drawMap(){if(!window.L||!$('#inventory-map'))return;if(map){map.remove();map=null;}MARK={};
  map=L.map('inventory-map').setView([35.47,-97.52],10);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
  const pts=[];filtered().forEach(l=>{const a=l.approxLocation||{};const lat=S.user?l.latitude:a.lat,lng=S.user?l.longitude:a.lng;if(lat==null||lng==null)return;
   pts.push([lat,lng]);
   const popupHtml=S.user
     ?`<b>${title(l)}</b><br>${S.money(l.askingPrice)} · ${tr('down')} ${S.money(l.downPayment)} · ${S.money(l.monthlyPayment)}${tr('perMo')}<br><a href="#" data-open="${l.id}">${tr('viewDetails')}</a>`
     :`<b>📍 ${partialAddr(l)}</b><br><a href="#" data-open="${l.id}">${tr('viewPhotos')}</a> · <a href="#auth" data-register="1">${tr('loginPromptLink')}</a>`;
   const m=L.marker([lat,lng]).addTo(map).bindPopup(popupHtml);MARK[l.id]=m;
   m.on('click',()=>{const c=document.querySelector(`[data-card="${l.id}"]`);if(c){c.scrollIntoView({behavior:'smooth',block:'center'});c.style.borderColor='var(--accent)';setTimeout(()=>c.style.borderColor='',1500);}});});
  if(pts.length)map.fitBounds(pts,{padding:[30,30],animate:false});
  document.querySelectorAll('[data-card]').forEach(c=>{c.onmouseenter=()=>{const m=MARK[c.dataset.card];if(m)m.openPopup();};});
  setTimeout(()=>map&&map.invalidateSize(),150);}

function openListing(id){const l=S.listing(id);if(!l)return;S.recordView(id);const ph=(l.photoUrls&&l.photoUrls.length?l.photoUrls:[l.photoUrl||'listing-placeholder.svg']);
  if(!S.user){
    const m=modal(`<h2>📍 ${partialAddr(l)}</h2>
      <div class="gallery" style="display:flex;gap:8px;overflow-x:auto;margin:12px 0;padding-bottom:6px">${ph.map(p=>`<img src="${esc(p)}" referrerpolicy="no-referrer" loading="lazy" onerror="window.imgFallback&&window.imgFallback(this)" style="height:220px;border-radius:8px;object-fit:cover">`).join('')}</div>
      <div style="background:#f8fafc;border:2px solid #d4af37;border-radius:12px;padding:16px;margin-top:12px;text-align:center">
        <h3 style="margin:0 0 8px 0;color:#0f172a">${tr('guestModalTitle')}</h3>
        <p style="margin:0 0 14px 0;font-size:14px;color:#334155">${tr('guestModalBody')}</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">
          <button type="button" id="modalRegBtn" style="background:#d4af37;color:#0f172a;font-weight:700;border:0;padding:10px 18px;border-radius:8px;cursor:pointer">${tr('guestCreateBtn')}</button>
          <button type="button" id="modalLoginBtn" style="background:#0f172a;color:#fff;font-weight:600;border:0;padding:10px 18px;border-radius:8px;cursor:pointer">${tr('guestLoginBtn')}</button>
        </div>
      </div>`);
    const rb=m.querySelector('#modalRegBtn'),lb=m.querySelector('#modalLoginBtn');
    if(rb)rb.onclick=()=>{m.remove();go('auth','#regF [name="name"]');};
    if(lb)lb.onclick=()=>{m.remove();go('auth','#loginF [name="email"]');};
    return;
  }
  const ag=S.user&&S.agentFor(S.user);
  const m=modal(`<h2>${title(l)}</h2>${badge(l.status)}${tenureHtml(l)}<div class="gallery" style="display:flex;gap:6px;overflow-x:auto;margin:10px 0">${ph.map(p=>`<img src="${esc(p)}" referrerpolicy="no-referrer" loading="lazy" onerror="window.imgFallback&&window.imgFallback(this)" style="height:200px;border-radius:8px">`).join('')}</div>
   ${l.photosUrl?`<a href="${esc(l.photosUrl)}" target="_blank" rel="noopener">${tr('morePhotos')}</a>`:''}
   <p>${tr('price')} <b>${S.money(l.askingPrice)}</b> · ${tr('down')} <b>${S.money(l.downPayment)}</b> · ${tr('monthly')} <b>${S.money(l.monthlyPayment)}</b> · ${l.termYears||'—'} ${tr('yrs')}</p>
   <p style="font-size:14px;color:#475569">${l.beds??'—'} ${tr('bdShort')} · ${l.baths??'—'} ${tr('baShort')} · ${l.sqft?l.sqft+' '+tr('sqftUnit'):''}</p>
   <p>${esc(l.description)}</p>
   <h3>${tr('makeOffer')}</h3><form id="offerF"><label style="display:flex;gap:8px;align-items:center;font-weight:600;margin-bottom:6px"><input type="checkbox" id="allAsk" style="width:auto"> ${tr('allAsking')}</label><input name="offerPrice" type="number" placeholder="${tr('offerPrice')}" required><input name="downPayment" type="number" placeholder="${tr('downPayment')}" required><input name="monthlyPayment" type="number" placeholder="${tr('monthlyPayment')}" required><label style="font-weight:600">${S.lang==='es'?'¿Piensas hacer inspecciones?':'Do you plan to do inspections?'}</label><select name="inspections" required><option value="">—</option><option value="YES">${S.lang==='es'?'Sí':'Yes'}</option><option value="NO">No</option></select><textarea name="notes" placeholder="${tr('notes')}"></textarea><button>${tr('submitOffer')}</button></form>
   <h3>${tr('requestShowing')}</h3><form id="showF"><input name="preferredAt" type="datetime-local" required><input name="notes" placeholder="${tr('notes')}"><button>${tr('requestShowingBtn')}</button></form>
   ${ag?`<h3>${tr('shareHouse')}</h3><form id="shareF"><textarea name="body" placeholder="${tr('msgToAgent')}">${tr('defaultShareMsg')}</textarea><button>${tr('shareHouse')}</button> <button type="button" id="reqAcc">${tr('requestAccess')}</button></form>`:''}`);
  const aa=m.querySelector('#allAsk');if(aa)aa.onchange=()=>{const f=m.querySelector('#offerF');const v={offerPrice:l.askingPrice,downPayment:l.downPayment,monthlyPayment:l.monthlyPayment};['offerPrice','downPayment','monthlyPayment'].forEach(k=>{const i=f.elements[k];if(aa.checked){i.value=Math.round((v[k]||0)/100);i.readOnly=true;}else{i.readOnly=false;}});const n=f.elements.notes;if(aa.checked&&!startsWithAsk(n.value))n.value=tr('allAskingNote')+(n.value?' - '+n.value:'');if(!aa.checked)n.value=stripAllAsk(n.value);};
  const on=(s,f)=>{const el=m.querySelector(s);if(el)el.onsubmit=wrap(()=>{f(fd(el));alert(tr('sentAlert'));m.remove();render();});};
  on('#offerF',v=>S.submitOffer({...v,listingId:id}));on('#showF',v=>S.requestShowing({...v,listingId:id}));
  on('#shareF',v=>S.sendMessage({toUserId:ag.id,listingId:id,kind:'SHARE_HOUSE',body:v.body}));
  const ra=m.querySelector('#reqAcc');if(ra)ra.onclick=wrap(()=>{S.sendMessage({toUserId:ag.id,listingId:id,kind:'REQUEST_ACCESS',body:tr('requestAccess')});alert(tr('requestedAlert'));});}

function auth(){return `<section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;padding:18px">
 <form id="loginF" class="card" style="padding:16px"><h2>${tr('loginTitle')}</h2><input name="email" type="email" placeholder="${tr('email')}" required><input name="password" type="password" placeholder="${tr('password')}" required><button>${tr('loginTitle')}</button>
 <p style="margin-top:10px"><a href="#" id="forgot" style="font-weight:600">${tr('forgotPw')}</a></p></form>
 <form id="regF" class="card" style="padding:16px"><h2>${tr('registerTitle')}</h2><select name="role" id="roleSel"><option value="BUYER">${tr('roleBuyer')}</option><option value="AGENT">${tr('roleAgent')}</option></select>
 <input name="name" placeholder="${tr('fullName')}" required><input name="email" type="email" placeholder="${tr('email')}" required><input name="phone" placeholder="${tr('phone')}"><input name="password" type="password" placeholder="${tr('passwordMin')}" minlength="8" required>
 <div id="buyerFields"><input name="inviteCode" id="inv" placeholder="${tr('inviteCode')}"><label><input type="checkbox" id="noAgent"> ${tr('noAgentYet')}</label></div>
 <div id="agentFields" style="display:none"><input name="licenseNumber" placeholder="${tr('orecLicense')}"><input name="brokerage" placeholder="${tr('brokerage')}"></div><button>${tr('createAccount')}</button></form></section>`;}

function dashboard(){if(!S.user)return auth();const u=S.user,ap=S.agentProfile(u),ag=S.agentFor(u),D=S.data;
  const favs=D.favorites.filter(f=>f.userId===u.id).map(f=>S.listing(f.listingId)).filter(Boolean);
  const views=D.propertyViews.filter(v=>v.userId===u.id).slice(-10).reverse().map(v=>S.listing(v.listingId)).filter(Boolean);
  const offers=D.offers.filter(o=>o.userId===u.id),docs=D.documents.filter(d=>d.userId===u.id),msgs=S.myMessages().slice().reverse();
  const contacts=ap?S.clientsOf(u):(ag?[ag]:[]),nm=id=>(D.users.find(x=>x.id===id)||{}).name||'—';
  const li=l=>`<li><a href="#" data-open="${l.id}">${title(l)}</a> ${badge(l.status)}</li>`;
  return `${S.isPendingApproval(u)?`<div style="margin:18px 18px 0;padding:12px;border-radius:10px;background:#fef3c7;border:1px solid #d97706">⏳ ${S.lang==='es'?(u.approvalStatus==='REJECTED'?'Tu cuenta no fue aprobada. Contáctanos para más información.':'Tu cuenta está pendiente de aprobación. Mientras tanto puedes ver casas; podrás hacer ofertas y pedir citas cuando sea aprobada.'):(u.approvalStatus==='REJECTED'?'Your account was not approved. Contact us for more information.':'Your account is pending approval. You can browse homes meanwhile; offers and showings unlock once approved.')}</div>`:''}<section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;padding:18px">
  <div class="card" style="padding:16px"><h2>${tr('myProfile')}</h2><img src="${esc(u.avatarUrl||'listing-placeholder.svg')}" style="width:90px;height:90px;border-radius:50%;object-fit:cover"><input type="file" id="avatar" accept="image/*">
   <form id="profF"><input name="name" value="${esc(u.name)}"><input name="phone" value="${esc(u.phone)}">${ap?`<label>${tr('orecLicense')}<input name="licenseNumber" value="${esc(ap.licenseNumber)}"></label><label>${tr('brokerage')}<input name="brokerage" value="${esc(ap.brokerage)}"></label><p>${tr('yourInviteCode')} <b>${esc(ap.inviteCode)}</b></p>`:''}<button>${tr('save')}</button></form>
   ${ag?`<p>${tr('yourAgent')} <b>${esc(ag.name)}</b></p>`:''}<h3>${tr('changePw')}</h3><form id="pwF"><input name="cur" type="password" placeholder="${tr('currentPw')}" required><input name="pw" type="password" placeholder="${tr('newPw')}" minlength="8" required><button>${tr('updatePw')}</button></form></div>
  ${isClient()?`<div class="card" style="padding:16px"><h2>🏡 ${st('mySearch')}</h2>${critSummary(critOf(u))}<button type="button" class="btn-card primary" data-editsearch="1">✏️ ${st('edit')}</button></div>`:''}
  <div class="card" style="padding:16px"><h2>${tr('favorites')}</h2><ul>${favs.map(li).join('')||`<li>${tr('noneYet')}</li>`}</ul><h2>${tr('viewedHomes')}</h2><ul>${views.map(li).join('')||`<li>${tr('noneYet')}</li>`}</ul></div>
  <div class="card" style="padding:16px"><h2>${tr('messages')}</h2>${contacts.length?`<form id="msgF"><select name="toUserId">${contacts.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
   <select name="listingId"><option value="">${tr('propAddress')}</option>${D.listings.map(l=>`<option value="${l.id}">${esc(l.address)}, ${esc(l.city)}</option>`).join('')}</select>
   <select name="kind"><option value="MESSAGE">${tr('kindMsg')}</option><option value="REQUEST_ACCESS">${tr('requestAccess')}</option><option value="SHARE_HOUSE">${tr('shareHouse')}</option></select><textarea name="body" placeholder="${tr('kindMsg')}" required></textarea><button>${tr('send')}</button></form>`:`<p>${tr('noAgentLinked')}</p>`}
   <ul>${msgs.map(m=>`<li><b>${esc(nm(m.fromUserId))}</b> → ${esc(nm(m.toUserId))} ${m.listingId?'('+esc((S.listing(m.listingId)||{}).address)+')':''} <i>${esc(kindLabel(m.kind))}</i>: ${esc(m.body)}</li>`).join('')}</ul></div>
  <div class="card" style="padding:16px"><h2>${tr('myOffers')}</h2><ul>${offers.map(o=>{const l=S.listing(o.listingId)||{};return `<li>${esc(l.address)} — ${S.money(o.offerPrice)} ${offerBadge(o.status)}
   ${o.status==='COUNTERED'?`<div style="color:#d97706">${tr('counterLabel')}: ${S.money(o.counterPrice)} / ${tr('down')} ${S.money(o.counterDown)} / ${S.money(o.counterMonthly)}${tr('perMo')}. ${esc(o.adminNotes)}</div>`:''}
   ${o.status==='ACCEPTED'?`<div class="tx-box" style="border:2px solid #16a34a;padding:8px;border-radius:8px;margin:6px 0"><b>${tr('txDocs')}</b>${S.TX_DOCS.map(t=>{const has=docs.find(d=>d.offerId===o.id&&d.docType===t.type);
     const docLabel=S.lang==='es'?(t.labelEs||t.label):t.label;
     return `<div>${docLabel}: ${has?'✅ '+esc(has.name):`<input type="file" data-txdoc="${t.type}" data-offer="${o.id}" data-listing="${o.listingId}">`}</div>`;}).join('')}${o.inspections?(()=>{const rep=docs.find(d=>d.offerId===o.id&&d.docType==='INSPECTION_REPORT');return `<div style="margin-top:8px;padding:8px;border:1px dashed #0284c7;border-radius:8px"><b>🔍 ${S.lang==='es'?'Inspecciones':'Inspections'}</b><br>${o.inspectionStatus==='SCHEDULED'?`${S.lang==='es'?'Programada':'Scheduled'}: <b>${esc(new Date(o.inspectionAt).toLocaleString())}</b> <button type="button" data-inspcancel="${o.id}" style="background:#dc2626;color:#fff">${S.lang==='es'?'Cancelar inspección':'Cancel inspection'}</button>`:`${o.inspectionStatus==='CANCELLED'?`<i>${S.lang==='es'?'Inspección cancelada':'Inspection cancelled'}</i><br>`:''}${S.lang==='es'?'Fecha y hora':'Date & time'}: <input type="datetime-local" id="insp-${o.id}"> <button type="button" data-inspsched="${o.id}">${S.lang==='es'?'Programar':'Schedule'}</button>`}<div style="margin-top:6px">${S.lang==='es'?'Reporte de inspección':'Inspection report'}: ${rep?'✅ '+esc(rep.name):`<input type="file" data-txdoc="INSPECTION_REPORT" data-offer="${o.id}" data-listing="${o.listingId}">`}</div></div>`;})():''}</div>`:''}</li>`;}).join('')||`<li>${tr('noneYet')}</li>`}</ul></div>
  <div class="card" style="padding:16px"><h2>${tr('myDocFolder')}</h2><p style="font-size:12px">${tr('folder')}: ${esc(u.folderSlug)}</p><input type="file" id="docUp"><ul>${docs.map(d=>`<li><a href="${d.dataUrl}" target="_blank" rel="noopener" download="${esc(d.name)}">${esc(d.name)}</a> <i>${esc(docTypeLabel(d.docType))}</i></li>`).join('')||`<li>${tr('noDocs')}</li>`}</ul></div>
  ${ap?`<div class="card" style="padding:16px"><h2>${tr('myClients')}</h2><ul>${S.clientsOf(u).map(c=>`<li><a href="#" data-client="${c.id}">${esc(c.name)}</a> — ${esc(c.email)} ${esc(c.phone)}</li>`).join('')||`<li>${tr('noClients')}</li>`}</ul></div>`:''}</section>`;}


function calendarView(){
  if(!(S.canSeeShowingCalendar&&S.canSeeShowingCalendar())){
    return `<p style="padding:18px">${S.lang==='es'?'El calendario de visitas es solo para agentes y administradores.':'The showings calendar is for agents and admins only.'}</p>`;
  }
  if(!CAL.anchor)CAL.anchor=S.chicagoYmd();
  const mode=CAL.mode||'week';
  const anchor=CAL.anchor;
  const parseYmd=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d);};
  const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const addDays=(s,n)=>{const d=parseYmd(s);d.setDate(d.getDate()+n);return fmt(d);};
  let start=anchor,end=anchor;
  if(mode==='day'){start=anchor;end=anchor;}
  else if(mode==='week'){
    const d=parseYmd(anchor);const dow=d.getDay(); // 0 Sun
    d.setDate(d.getDate()-dow);start=fmt(d);end=addDays(start,6);
  }else{ // month-ish: 28-day window centered-ish on week of anchor
    const d=parseYmd(anchor);d.setDate(1);start=fmt(d);
    const last=new Date(d.getFullYear(),d.getMonth()+1,0);end=fmt(last);
  }
  const items=(S.approvedShowingsCalendar||[]).filter(ev=>{
    const y=S.preferredYmd(ev.preferredAt);return y&&y>=start&&y<=end;
  });
  const byDay={};
  items.forEach(ev=>{const y=S.preferredYmd(ev.preferredAt);(byDay[y]=byDay[y]||[]).push(ev);});
  const days=[];for(let cur=start;;cur=addDays(cur,1)){days.push(cur);if(cur===end)break;if(days.length>40)break;}
  const title=mode==='day'?anchor:(mode==='week'?`${start} → ${end}`:`${start.slice(0,7)}`);
  const es=S.lang==='es';
  const propLabel=ev=>{
    const l=S.listing(ev.listingId);
    if(l)return `${l.address||''}, ${l.city||''}`.trim().replace(/^,\s*/,'');
    return `${ev.address||''}${ev.city?', '+ev.city:''}`.trim()||(es?'Propiedad':'Property');
  };
  return `<section style="padding:18px;display:grid;gap:14px">
    <div class="card" style="padding:16px">
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between">
        <h2 style="margin:0">📅 ${es?'Calendario de visitas aprobadas':'Approved Showings Calendar'}</h2>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" class="btn-card ${mode==='day'?'primary':''}" data-calmode="day">${es?'Día':'Day'}</button>
          <button type="button" class="btn-card ${mode==='week'?'primary':''}" data-calmode="week">${es?'Semana':'Week'}</button>
          <button type="button" class="btn-card ${mode==='month'?'primary':''}" data-calmode="month">${es?'Mes':'Month'}</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap">
        <button type="button" class="btn-card" data-calnav="-1">‹</button>
        <b>${esc(title)}</b>
        <button type="button" class="btn-card" data-calnav="1">›</button>
        <button type="button" class="btn-card" data-calnav="today">${es?'Hoy':'Today'}</button>
        <label style="font-size:13px;color:var(--muted)">${es?'Ir a fecha':'Jump to'} <input type="date" id="calJump" value="${esc(anchor)}"></label>
      </div>
      <p style="font-size:13px;color:var(--muted);margin:10px 0 0">${es?'Solo visitas aprobadas. Sin nombres de agentes ni clientes. Las tarjetas de propiedad muestran únicamente las de hoy.':"Approved showings only. No agent or client names. Property cards show today's visits only."}</p>
    </div>
    <div class="cal-grid">${days.map(day=>{
      const list=byDay[day]||[];
      const isToday=day===S.chicagoYmd();
      return `<div class="cal-day ${isToday?'cal-today':''}"><div class="cal-day-head">${esc(day)}${isToday?' · '+(es?'Hoy':'Today'):''}</div>
        ${list.length?list.map(ev=>`<div class="cal-item"><b>${esc(S.formatShowingTimeOnly(ev.preferredAt))}</b><div>${esc(propLabel(ev))}</div></div>`).join(''):`<div class="cal-empty">${es?'Sin citas':'No showings'}</div>`}
      </div>`;
    }).join('')}</div>
  </section>`;
}

function admin(){if(!S.isAdmin())return `<p style="padding:18px">${tr('adminsOnly')}</p>`;const D=S.data;
  return `<section style="padding:18px;display:grid;gap:16px">
  ${(()=>{const pend=D.users.filter(u=>u.approvalStatus==='PENDING');return `<div class="card" style="padding:16px;border:2px solid #d97706"><h2>⏳ ${S.lang==='es'?'Cuentas Pendientes de Aprobación':'Accounts Pending Approval'} (${pend.length})</h2><table><tr><th>${tr('colName')}</th><th>${tr('email')}</th><th>${tr('colRole')}</th><th>${S.lang==='es'?'Licencia / Correduría':'License / Brokerage'}</th><th>${S.lang==='es'?'Registro':'Signed up'}</th><th>${tr('colActions')}</th></tr>${pend.map(u=>{const ap=S.agentProfile(u);return `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.role==='AGENT'?tr('roleAgentShort'):tr('roleClientShort')}</td><td>${esc(ap?(ap.licenseNumber||'')+' / '+(ap.brokerage||''):'—')}</td><td>${esc(new Date(u.createdAt).toLocaleDateString())}</td><td><button data-approve="${u.id}" style="background:#16a34a;color:#fff">${S.lang==='es'?'Aprobar':'Approve'}</button> <button data-decline="${u.id}" style="background:#dc2626;color:#fff">${S.lang==='es'?'Rechazar':'Decline'}</button></td></tr>`;}).join('')||`<tr><td colspan=6>${S.lang==='es'?'No hay cuentas pendientes':'No accounts pending'}</td></tr>`}</table></div>`;})()}
<div class="card" style="padding:16px"><h2>${tr('recentOffers')}</h2><table><tr><th>${tr('colProperty')}</th><th>${tr('colBuyer')}</th><th>${tr('colOffer')}</th><th>${tr('colStatus')}</th><th>${tr('colActions')}</th></tr>
  ${D.offers.slice().reverse().map(o=>`<tr><td>${esc((S.listing(o.listingId)||{}).address)}</td><td>${esc((D.users.find(u=>u.id===o.userId)||{}).name)}</td><td>${S.money(o.offerPrice)} / ${S.money(o.downPayment)} / ${S.money(o.monthlyPayment)}</td><td>${offerBadge(o.status)}</td>
   <td><button data-acc="${o.id}" style="background:#16a34a;color:#fff">${tr('accept')}</button> <button data-ctr="${o.id}" style="background:#d97706;color:#fff">${tr('counterOffer')}</button> <button data-rej="${o.id}" style="background:#dc2626;color:#fff">${tr('reject')}</button></td></tr>`).join('')||`<tr><td colspan=5>${tr('noOffers')}</td></tr>`}</table></div>
  <div class="card" style="padding:16px"><h2>${tr('usersAgents')}</h2><table><tr><th>${tr('colName')}</th><th>${tr('email')}</th><th>${tr('colRole')}</th><th>${tr('colInvite')}</th><th>${tr('colResetPw')}</th></tr>${D.users.map(u=>{const ap=S.agentProfile(u);return `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(roleLabel(u.role))}</td><td>${esc(ap&&ap.inviteCode)}</td><td><button data-reset="${u.id}">${tr('reset')}</button></td></tr>`;}).join('')}</table></div>
  <div class="card" style="padding:16px"><h2>${S.lang==='es'?'Solicitudes de visita':'Showing requests'}</h2>
  <table><tr><th>${tr('colProperty')}</th><th>${S.lang==='es'?'Solicitado por':'Requested by'}</th><th>${S.lang==='es'?'Fecha/hora':'Date/time'}</th><th>${tr('colStatus')}</th><th>${tr('colActions')}</th></tr>
  ${(D.showings||[]).slice().sort((a,b)=>String(b.preferredAt||'').localeCompare(String(a.preferredAt||''))).map(sh=>{
    const l=S.listing(sh.listingId)||{};
    const u=(D.users.find(x=>x.id===sh.userId)||{});
    const st=String(sh.status||'REQUESTED').toUpperCase();
    const badge=st==='APPROVED'?'✅ '+tr('showingApproved'):st==='DENIED'?'❌ '+tr('showingDenied'):'⏳ '+tr('showingRequested');
    const acts=st==='REQUESTED'?`<button data-showacc="${sh.id}" style="background:#16a34a;color:#fff">${S.lang==='es'?'Aprobar':'Approve'}</button> <button data-showden="${sh.id}" style="background:#dc2626;color:#fff">${S.lang==='es'?'Rechazar':'Deny'}</button>`:'—';
    return `<tr><td>${esc(l.address||sh.listingId)}${l.city?', '+esc(l.city):''}</td><td>${esc(u.name||'—')}</td><td>${esc(S.formatShowingWhen?S.formatShowingWhen(sh.preferredAt):sh.preferredAt)}</td><td>${badge}</td><td>${acts}</td></tr>`;
  }).join('')||`<tr><td colspan=5>${S.lang==='es'?'Aún no hay solicitudes de visita':'No showing requests yet'}</td></tr>`}
  </table></div>
  <div class="card" style="padding:16px"><h2>${tr('listings')}</h2><div class="table-scroll"><table><tr><th>${tr('colAddress')}</th><th>${tr('colStatus')}</th><th>${tr('price')} $</th><th>${tr('down')} $</th><th>${tr('monthly')} $</th><th></th></tr>${D.listings.map(l=>`<tr data-row="${l.id}"><td>${esc(l.address)}, ${esc(l.city)}</td>
   <td><select data-status="${l.id}">${S.STATUSES.map(s=>`<option value="${s}" ${l.status===s?'selected':''}>${S.statusText(s)}</option>`).join('')}</select></td>
   <td><input data-f="askingPrice" type="number" value="${l.askingPrice/100}" style="width:90px"></td><td><input data-f="downPayment" type="number" value="${l.downPayment/100}" style="width:80px"></td><td><input data-f="monthlyPayment" type="number" value="${l.monthlyPayment/100}" style="width:80px"></td><td class="listing-actions"><button type="button" data-save="${esc(l.id)}">${tr('save')}</button><button type="button" class="copy-link-btn" data-copylink="${esc(l.id)}">${tr('share.copyLink')}</button></td></tr>`).join('')}</table></div></div></section>`;}

function maybeOpenSharedDetail(){
  if(!S.user||!S.data||resetQueryActive()||!shareDetailAllowed())return;
  const id=shareId();
  if(!id||sharedDetailFor===id||!S.listing(id))return;
  sharedDetailFor=id;
  openListing(id);
}
function render(){document.documentElement.lang=S.lang;const root=$('#app-root');if(!S.data)return;if(map){try{map.stop();map.off();map.remove();}catch(e){}map=null;}
  const body={inventory,guides,dashboard,admin,auth,calendar:calendarView}[tab]||inventory;root.innerHTML=header()+`<main>${body()}</main><footer style="padding:18px;font-size:12px;text-align:center">© Legacy - Owner Finance · Brokerage By: KLC Real Estate, LLC</footer>`;bind();if(tab==='inventory')drawMap();maybeOpenSharedDetail();}
function bind(){const r=$('#app-root');
  r.onclick=async e=>{
   const c=e.target.closest('[data-view],[data-editsearch],[data-prev],[data-next],[data-compare],[data-chip],[data-cmpopen],[data-cmpclear]');
   if(c){e.preventDefault();e.stopPropagation();const d=c.dataset;
     if(d.prev||d.next){const id=d.prev||d.next,l=S.listing(id),ph=(l.photoUrls&&l.photoUrls.length)?l.photoUrls:[l.photoUrl||'listing-placeholder.svg'];
       PIDX[id]=((PIDX[id]||0)+(d.next?1:-1)+ph.length)%ph.length;const img=r.querySelector(`[data-img="${id}"]`),cn=r.querySelector(`[data-cnt="${id}"]`);
       if(img){delete img.dataset.triedThumb;img.src=ph[PIDX[id]];}if(cn)cn.textContent=`📷 ${PIDX[id]+1} / ${ph.length}`;return;}
     if(d.compare){if(CMP.has(d.compare))CMP.delete(d.compare);else if(CMP.size<3)CMP.add(d.compare);else alert(S.lang==='es'?'Máximo 3 casas.':'You can compare up to 3 homes.');return render();}
     if(d.chip){CHIP=d.chip;return render();}
     if(d.view){VIEW=d.view;return render();}if(d.editsearch)return openCriteriaWizard();
     if(d.cmpclear){CMP.clear();return render();}
     if(d.cmpopen){const it=[...CMP].map(id=>S.listing(id)).filter(Boolean);
       modal(`<h2>⚖️ ${S.lang==='es'?'Comparación de Casas':'Side-by-Side Comparison'}</h2><div style="display:grid;grid-template-columns:repeat(${it.length},1fr);gap:12px">${it.map(l=>`<div class="card" style="padding:10px"><img src="${esc(l.photoUrl||'listing-placeholder.svg')}" referrerpolicy="no-referrer" onerror="window.imgFallback&&window.imgFallback(this)" style="width:100%;height:120px;object-fit:cover;border-radius:8px"><h4 style="margin:8px 0">${title(l)}</h4>
       <div style="font-size:13px;line-height:1.8">${tr('price')}: <b>${S.money(l.askingPrice)}</b><br>${tr('down')}: <b>${S.money(l.downPayment)}</b><br>${tr('monthly')}: <b>${S.money(l.monthlyPayment)}</b><br>${l.beds??'—'} ${tr('bdShort')} · ${l.baths??'—'} ${tr('baShort')}<br>${l.sqft?(+l.sqft).toLocaleString()+' '+tr('sqftUnit'):''}${l.sqft&&l.askingPrice?'<br>$'+Math.round(l.askingPrice/100/l.sqft)+tr('perSqft'):''}</div></div>`).join('')}</div>`);return;}
   }
   const t=e.target.closest('[data-tab],[data-lang],[data-open],[data-fav],[data-acc],[data-rej],[data-ctr],[data-reset],[data-save],[data-client],[data-register],[data-login],[data-shareclear],[data-copylink],[data-calmode],[data-calnav],[data-showacc],[data-showden],[data-approve],[data-decline],[data-inspsched],[data-inspcancel],#logout,#forgot');
   if(!t)return;
   e.preventDefault();
   try{
     const d=t.dataset;
     if(d.shareclear){clearShareParam();return render();}
     if(d.copylink){
       const url=propertyShareUrl(d.copylink);
       const btn=t;
       copyText(url).then(()=>{btn.textContent=tr('share.copied');setTimeout(()=>{if(btn.isConnected)btn.textContent=tr('share.copyLink');},1600);}).catch(()=>{window.prompt(tr('share.copyLink'),url);});
       return;
     }
     if(d.login)return go('auth','#loginF [name="email"]');
     if(d.register)return go('auth','#regF [name="name"]');
     if(d.tab)return go(d.tab);if(d.lang)return S.setLang(d.lang);if(d.fav)return S.toggleFavorite(d.fav);if(d.open)return openListing(d.open);if(t.id==='logout'){S.logout();return go('inventory');}
     if(t.id==='forgot')return openForgotModal();
     if(d.calmode){CAL.mode=d.calmode;return render();}
     if(d.calnav){const a=CAL.anchor||S.chicagoYmd();const parse=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);};const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
       if(d.calnav==='today'){CAL.anchor=S.chicagoYmd();return render();}
       const delta=+d.calnav;const dt=parse(a);
       if(CAL.mode==='day')dt.setDate(dt.getDate()+delta);
       else if(CAL.mode==='week')dt.setDate(dt.getDate()+7*delta);
       else dt.setMonth(dt.getMonth()+delta);
       CAL.anchor=fmt(dt);return render();}
     if(d.showacc){S.respondShowing(d.showacc,'APPROVED');return render();}
     if(d.showden){if(confirm(S.lang==='es'?'¿Rechazar esta visita?':'Deny this showing?')){S.respondShowing(d.showden,'DENIED');render();}return;}
     if(d.approve){S.setApproval(d.approve,'APPROVED');return render();}if(d.decline){if(confirm(S.lang==='es'?'¿Rechazar esta cuenta?':'Decline this account?')){S.setApproval(d.decline,'REJECTED');render();}return;}if(d.inspsched){const v=($('#insp-'+d.inspsched)||{}).value;if(!v)return alert(S.lang==='es'?'Selecciona fecha y hora':'Pick a date and time');S.setInspection(d.inspsched,v);return render();}if(d.inspcancel){if(confirm(S.lang==='es'?'¿Cancelar la inspección?':'Cancel the inspection?')){S.setInspection(d.inspcancel,null);render();}return;}if(d.acc)return S.respondOffer(d.acc,'ACCEPTED');if(d.rej)return S.respondOffer(d.rej,'REJECTED');
     if(d.ctr){const p=prompt(tr('promptCounterPrice')),dn=prompt(tr('promptCounterDown')),mo=prompt(tr('promptCounterMonthly')),n=prompt(tr('promptAdminNotes'))||'';if(p)S.respondOffer(d.ctr,'COUNTERED',{counterPrice:p,counterDown:dn,counterMonthly:mo,adminNotes:n});return;}
     if(d.reset)return openAdminResetModal(d.reset);
     if(d.save){const row=r.querySelector(`[data-row="${d.save}"]`),p={};row.querySelectorAll('[data-f]').forEach(i=>p[i.dataset.f]=Math.round(+i.value*100));S.updateListing(d.save,p);return alert(tr('savedAlert'));}
     if(d.client){const c=S.data.users.find(u=>u.id===d.client);const of=S.data.offers.filter(o=>o.userId===c.id);modal(`<h2>${esc(c.name)}</h2><p>${esc(c.email)} · ${esc(c.phone)}</p><h3>🏡 ${st('clientCrit')}</h3>${critSummary(critOf(c))}<h3>${tr('favorites')}</h3><ul>${S.data.favorites.filter(f=>f.userId===c.id).map(f=>`<li>${esc((S.listing(f.listingId)||{}).address)}</li>`).join('')}</ul><h3>${tr('myOffers')}</h3><ul>${of.map(o=>`<li>${esc((S.listing(o.listingId)||{}).address)} ${S.money(o.offerPrice)} ${offerBadge(o.status)}</li>`).join('')}</ul>`);}
   }catch(err){alert(err.message);}
  };
  const f=$('#filters');if(f){f.oninput=f.onchange=e=>{const v=fd(f);if('maxDownR' in v){v.maxDown=+v.maxDownR>=40000?'':v.maxDownR;delete v.maxDownR;}if('maxMonthlyR' in v){v.maxMonthly=+v.maxMonthlyR>=3000?'':v.maxMonthlyR;delete v.maxMonthlyR;}
    if(e.type==='input'&&e.target.type==='range'){const b=e.target.parentNode.querySelector('b');if(b)b.textContent='$'+(+e.target.value).toLocaleString();return;}
    F=Object.assign(F,v);if('sort' in v){try{localStorage.setItem('lof.sort',v.sort)}catch(_){}}const pos=e.target.name==='q'?e.target.selectionStart:null;render();if(pos!=null){const q=$('#filters [name=q]');q.focus();q.setSelectionRange(pos,pos);}};f.onsubmit=e=>e.preventDefault();}
  const cj=$('#calJump');if(cj)cj.onchange=()=>{if(cj.value){CAL.anchor=cj.value;render();}};
  r.onchange=async e=>{
   try{
     const t=e.target;if(t.dataset.status)return S.setListingStatus(t.dataset.status,t.value);
     if(t.id==='avatar'&&t.files&&t.files[0])return await S.uploadAvatar(t.files[0]);if(t.id==='docUp'&&t.files&&t.files[0])return await S.uploadDocument(t.files[0]);
     if(t.dataset.txdoc&&t.files&&t.files[0])return await S.uploadDocument(t.files[0],{docType:t.dataset.txdoc,offerId:t.dataset.offer,listingId:t.dataset.listing});
     if(t.id==='roleSel'){$('#agentFields').style.display=t.value==='AGENT'?'':'none';$('#buyerFields').style.display=t.value==='AGENT'?'none':'';}
     if(t.id==='noAgent'){$('#inv').disabled=t.checked;if(t.checked)$('#inv').value='';}
   }catch(err){alert(err.message);}
  };
  const sub=(id,fn)=>{const el=$(id);if(el)el.onsubmit=wrap(()=>fn(fd(el)));};
  sub('#loginF',async v=>{const u=await S.login(v.email,v.password);if(u&&u.needsVerify)return openVerifyEmail(u.email,false);go(u&&u.role==='ADMIN'?'admin':'dashboard');maybePromptCriteria();});
  sub('#regF',async v=>{const u=await S.register(v);if(u&&u.needsVerify)return openVerifyEmail(u.email,true);go('dashboard');maybePromptCriteria();});
  sub('#profF',v=>{S.updateProfile(v);alert(tr('savedAlert'));});
  sub('#pwF',async v=>{await S.changePassword(v.cur,v.pw);alert(tr('pwUpdatedAlert'));});
  sub('#msgF',v=>{S.sendMessage(v);});}

function openVerifyEmail(email,justSent){
  const m=modal(`<form id="evF" class="card" style="padding:20px;max-width:420px;width:92%"><h2>✉️ ${tr('evTitle')}</h2>
   <p style="font-size:14px">${tr('evDesc')} <b>${esc(email)}</b></p>${justSent?'':`<p style="font-size:13px;color:var(--muted)">${tr('evNeed')}</p>`}
   <input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="${tr('evCode')}" required style="font-size:22px;letter-spacing:6px;text-align:center">
   <p id="evMsg" style="font-size:13px;min-height:18px;color:#b91c1c"></p>
   <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-card primary">${tr('evVerify')}</button><button type="button" class="btn-card" id="evResend">${tr('evResend')}</button><button type="button" class="btn-card" id="evClose">${tr('evLater')}</button></div></form>`);
  const msg=t=>{m.querySelector('#evMsg').textContent=t;};
  const err=r=>msg(tr({bad_code:'evBad',expired:'evExpired',too_many:'evTooMany',wait:'evWait',send_failed:'evSendFail'}[r&&r.error]||'evSendFail'));
  m.querySelector('#evClose').onclick=()=>{m.remove();go('auth');};
  m.querySelector('#evResend').onclick=async()=>{const r=await S.emailVerify('send',email);if(r&&r.sent){msg('');alert(tr('evSent'));}else if(r&&r.verified)msg('');else err(r);};
  m.querySelector('#evF').onsubmit=async e=>{e.preventDefault();const code=new FormData(e.target).get('code');const r=await S.emailVerify('verify',email,code);
    if(r&&(r.verified||r.enabled===false)){m.remove();alert(tr('evDone'));const u=S.loginAfterVerify(email);go(u?(u.role==='ADMIN'?'admin':'dashboard'):'auth');if(u)maybePromptCriteria();}else err(r);};
  
}
window.__openVerifyEmail=(e,s)=>openVerifyEmail(e,s);
function checkResetUrlParams(){
  try{
    const sp=new URLSearchParams(location.search);
    let resetEmail=sp.get('reset')||sp.get('email')||'';
    const tok=sp.get('token');
    if(!resetEmail&&tok&&tok.includes('.')){
      const payload=JSON.parse(atob(tok.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      if(payload&&payload.email)resetEmail=payload.email;
    }
    if(resetEmail){
      tab='auth';
      render();
      setTimeout(()=>openForgotModal(resetEmail),100);
    }
  }catch(e){}
}

S.on(render);window.addEventListener('hashchange',()=>{tab=location.hash.slice(1)||'inventory';render();});
S.load().then(()=>{render();checkResetUrlParams();maybePromptCriteria();}).catch(e=>{document.documentElement.lang=S.lang;$('#app-root').innerHTML='<p style="padding:20px">'+esc(tr('loadFail'))+': '+esc(e.message)+'</p>';});
})();
