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
  if(p.includes('/guides'))return 'guides';
  return 'inventory';
};
let tab=initTab(),F={q:'',city:'',area:'',beds:'',baths:'',maxDown:'',maxMonthly:'',maxPrice:'',status:'',sort:'priceAsc'},map=null;

const L10N={
  en:{
    navInventory:'Inventory',
    navGuides:'How It Works / Guides',
    navDashboard:'Dashboard / My Profile',
    navAdmin:'Admin Portal',
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
    forgotModalDesc:'Enter your registered email address and choose a new password (at least 8 characters). You will be signed in immediately.',
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
    pwResetAlert:'Password reset.',
    offerSubmitted:'Submitted',
    offerAccepted:'Accepted',
    offerRejected:'Rejected',
    offerCountered:'Counter Offer'
  },
  es:{
    navInventory:'Inventario',
    navGuides:'Cómo Funciona / Guías',
    navDashboard:'Mi Panel / Perfil',
    navAdmin:'Portal de Administración',
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
    forgotModalDesc:'Ingresa tu correo electrónico registrado y escribe tu nueva contraseña (mínimo 8 caracteres). Iniciarás sesión automáticamente.',
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
    pwResetAlert:'Contraseña restablecida.',
    offerSubmitted:'Enviada',
    offerAccepted:'Aceptada',
    offerRejected:'Rechazada',
    offerCountered:'Contraoferta'
  }
};
const tr=k=>(L10N[S.lang]||L10N.en)[k]||L10N.en[k]||k;

const go=(t,focusSel)=>{
  tab=t;
  location.hash=t;
  render();
  if(focusSel){
    setTimeout(()=>{const el=$(focusSel);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus();}},60);
  }
};
const badge=s=>`<span class="badge" style="background:${({AVAILABLE:'#16a34a',COMING_SOON:'#2563eb',CLOSED:'#475569'})[s]||'#d97706'};color:#fff;padding:2px 8px;border-radius:999px;font-size:12px">${esc(S.statusText?S.statusText(s):(S.STATUS_LABEL[s]||s))}</span>`;
const offerBadge=s=>{
  const label=s==='COUNTERED'?tr('offerCountered'):s==='ACCEPTED'?tr('offerAccepted'):s==='REJECTED'?tr('offerRejected'):s==='SUBMITTED'?tr('offerSubmitted'):s;
  return `<span style="background:${S.OFFER_COLOR[s]||'#64748b'};color:#fff;padding:2px 8px;border-radius:6px">${esc(label)}</span>`;
};
const partialAddr=l=>{
  const rawStreet=(l.approxLocation&&l.approxLocation.streetOnly)||String(l.address||'').replace(/^\s*\d+[A-Za-z\-]*\s+/,'').trim();
  const street=rawStreet.replace(/^\s*\d+[A-Za-z\-]*\s+/,'').trim()||'Street Address Hidden';
  const city=l.city||'';
  return `${esc(street)}${city?', '+esc(city):''}`;
};
const title=l=>S.user?`${esc(l.address)}, ${esc(l.city)}, ${esc(l.state||'OK')} ${esc(l.zip||'')}`:partialAddr(l);

function modal(html){const m=document.createElement('div');m.className='modal-backdrop';m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999';
  m.innerHTML=`<div class="modal card" style="background:#fff;max-width:640px;width:94%;max-height:90vh;overflow:auto;padding:20px;border-radius:12px"><button class="close" style="float:right">✕</button>${html}</div>`;
  m.onclick=e=>{if(e.target===m||e.target.classList.contains('close'))m.remove();};document.body.appendChild(m);return m;}
const wrap=fn=>async e=>{e&&e.preventDefault&&e.preventDefault();try{await fn(e);}catch(err){alert(err.message);}};
const fd=f=>Object.fromEntries(new FormData(f));

function openForgotModal(prefillEmail=''){
  const loginEmailInput=$('#loginF [name="email"]');
  const initialEmail=prefillEmail||(loginEmailInput?loginEmailInput.value:'');
  const m=modal(`<h2>${tr('forgotModalTitle')}</h2>
    <p style="font-size:14px;color:#475569;margin-bottom:12px">${tr('forgotModalDesc')}</p>
    <form id="forgotModalF" style="display:grid;gap:10px">
      <input name="email" type="email" placeholder="${tr('email')}" value="${esc(initialEmail)}" required>
      <input name="pw" type="password" placeholder="${tr('newPw')}" minlength="8" required>
      <input name="pw2" type="password" placeholder="${tr('forgotConfirmPw')}" minlength="8" required>
      <button type="submit" style="padding:10px 14px;font-weight:600">${tr('forgotSubmitBtn')}</button>
    </form>`);
  const f=m.querySelector('#forgotModalF');
  f.onsubmit=wrap(()=>{
    const v=fd(f);
    if(String(v.pw||'').trim()!==String(v.pw2||'').trim())throw new Error(tr('pwMismatch'));
    const u=S.directResetPassword(v.email,v.pw);
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
      <b>Self-Service Reset Link:</b><br>
      <input type="text" readonly value="${esc(resetUrl)}" style="width:100%;margin-top:4px;font-size:12px" onclick="this.select()">
    </div>`);
  const f=m.querySelector('#adminResetF');
  f.onsubmit=wrap(()=>{
    const v=fd(f);
    S.adminResetPassword(userId,v.pw);
    m.remove();
    alert(tr('pwResetAlert'));
  });
}

function header(){
  const T=[['inventory',tr('navInventory')],['guides',tr('navGuides')],['dashboard',tr('navDashboard')]];
  if(S.isAdmin())T.push(['admin',tr('navAdmin')]);
  if(!S.user)T.push(['auth',tr('navAuth')]);
  const cloudPill=`<span style="display:inline-flex;align-items:center;gap:4px;background:${S.cloudConnected?'#dcfce7':'#fef3c7'};color:${S.cloudConnected?'#166534':'#92400e'};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600">${S.cloudConnected?tr('cloudLive'):tr('cloudOffline')}</span>`;
  return `<header class="site-header" style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:12px 18px">
   <img src="legacy-logo.png" alt="Legacy" style="height:56px"><div><h1 style="font-family:'Cormorant Garamond',serif;margin:0">Legacy - Owner Finance</h1>
   <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13px">Brokerage By: KLC Real Estate, LLC <img src="klc-logo.png" alt="KLC" style="height:22px"> ${cloudPill}</div></div>
   <nav style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto">${T.map(([k,v])=>`<button data-tab="${k}" class="${tab===k?'active':''}">${v}</button>`).join('')}
   ${S.user?`<button id="logout">${tr('logout')} (${esc(S.user.name)})</button>`:''}
   <button data-lang="en" class="${S.lang==='en'?'active':''}">EN</button><button data-lang="es" class="${S.lang==='es'?'active':''}">ES</button></nav></header>
   <div class="guide-banner" style="padding:8px 18px;background:#f5efe3">${tr('newHere')} <a href="#guides" data-tab="guides">${tr('guideLink')}</a></div>`;
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
    <li>¿Olvidaste tu contraseña? Usa “¿Olvidaste tu contraseña?” en la pantalla de inicio de sesión para crear una nueva al instante.</li></ol></section>`;
  }
  return `<section class="card" style="padding:20px"><h2>How It Works</h2><h3>Create a Buyer account</h3><ol><li>Click <b>Login / Register</b> and choose <b>Buyer</b>.</li><li>Enter your agent's invite code (e.g. D2D-XXXXXX). No agent? Choose “I don't have an agent, yet” — a licensed agent will be assigned to you.</li><li>Set a password (8+ characters) and submit to unlock all full addresses, prices, and property details.</li></ol>
<h3>Create an Agent account</h3><ol><li>Choose <b>Agent</b>, enter your OREC license # and brokerage.</li><li>After registering you receive your own invite code to share with clients.</li></ol>
<h3>Navigating</h3><ol><li><b>Inventory</b>: once signed in, search by address, filter, view the map, and tap ♥ to save homes.</li><li>Open a home to see photos, request a showing, make an offer or share it with your agent.</li><li><b>Dashboard</b>: profile, favorites, messages, offers and your document folder. Once an offer is accepted, upload your ID and Proof of Income there.</li><li>Forgot your password? Click “Forgot password?” on the login screen to set a new password right away.</li></ol></section>`;
}

function filtered(){let L=S.data.listings.filter(l=>{const q=F.q.toLowerCase();
  const searchable=S.user?(l.address+' '+(l.publicTitle||'')+' '+l.city+' '+l.zip):(partialAddr(l)+' '+l.city);
  if(q&&!searchable.toLowerCase().includes(q))return false;
  if(F.city&&l.city!==F.city)return false;if(F.area&&!(l.areas||[]).includes(F.area))return false;
  if(S.user){
    if(F.beds&&(l.beds||0)<+F.beds)return false;if(F.baths&&(l.baths||0)<+F.baths)return false;
    if(F.maxDown&&l.downPayment>F.maxDown*100)return false;if(F.maxMonthly&&l.monthlyPayment>F.maxMonthly*100)return false;
    if(F.maxPrice&&l.askingPrice>F.maxPrice*100)return false;if(F.status&&l.status!==F.status)return false;
  }
  return true;});
  const k={priceAsc:['askingPrice',1],priceDesc:['askingPrice',-1],downAsc:['downPayment',1],monthlyAsc:['monthlyPayment',1],bedsDesc:['beds',-1]}[F.sort]||['askingPrice',1];
  return L.sort((a,b)=>((a[k[0]]||0)-(b[k[0]]||0))*k[1]);}

function inventory(){const cities=[...new Set(S.data.listings.map(l=>l.city))].sort(),L=filtered();
  const sel=(n,opts,lab)=>`<select name="${n}"><option value="">${lab}</option>${opts.map(o=>`<option value="${esc(o[0]??o)}" ${F[n]==(o[0]??o)?'selected':''}>${esc(o[1]??o)}</option>`).join('')}</select>`;
  const guestNotice=!S.user?`<div class="card" style="padding:14px 18px;margin-bottom:14px;background:linear-gradient(135deg,#1e293b,#0f172a);color:#fff;border-radius:12px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px">
    <div style="max-width:720px"><div style="font-weight:700;font-size:16px;color:#f8d57e;margin-bottom:4px">🔒 ${tr('guestBannerTitle')}</div><div style="font-size:13.5px;color:#e2e8f0">${tr('guestBannerBody')}</div></div>
    <button data-register="1" style="background:#d4af37;color:#0f172a;font-weight:700;border:0;padding:10px 16px;border-radius:8px;cursor:pointer">${tr('guestBannerBtn')}</button>
  </div>`:'';
  return `<section style="padding:14px 18px">${guestNotice}<form id="filters" class="filters" style="display:flex;flex-wrap:wrap;gap:6px">
   <input name="q" placeholder="${S.user?tr('searchPlaceholder'):tr('searchPlaceholderGuest')}" value="${esc(F.q)}" style="flex:1 1 260px">${sel('city',cities,tr('city'))}${sel('area',[['N','N'],['S','S'],['W','W'],['E','E']],tr('area'))}
   ${S.user?`${sel('beds',[1,2,3,4,5].map(n=>[n,n+tr('bedsPlus')]),tr('beds'))}${sel('baths',[1,2,3].map(n=>[n,n+tr('bathsPlus')]),tr('baths'))}
   <input name="maxDown" type="number" placeholder="${tr('maxDown')}" value="${esc(F.maxDown)}"><input name="maxMonthly" type="number" placeholder="${tr('maxMonthly')}" value="${esc(F.maxMonthly)}"><input name="maxPrice" type="number" placeholder="${tr('maxPrice')}" value="${esc(F.maxPrice)}">
   ${sel('status',S.STATUSES.map(s=>[s,S.statusText(s)]),tr('status'))}${sel('sort',[['priceAsc',tr('sortPriceAsc')],['priceDesc',tr('sortPriceDesc')],['downAsc',tr('sortDownAsc')],['monthlyAsc',tr('sortMonthlyAsc')],['bedsDesc',tr('sortBedsDesc')]],tr('sort'))}`:''}</form>
   <p>${L.length} ${tr('homesCount')}</p><div id="inventory-map" style="height:380px;border-radius:12px;margin-bottom:14px"></div>
   <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px">${L.map(card).join('')}</div></section>`;}

function card(l){
  const phCount=(l.photoUrls&&l.photoUrls.length)||1;
  if(!S.user){
    return `<article class="card listing-card" style="border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.1);display:flex;flex-direction:column">
      <div style="position:relative;cursor:pointer" data-open="${l.id}">
        <img src="${esc(l.photoUrl||'listing-placeholder.svg')}" referrerpolicy="no-referrer" loading="lazy" onerror="window.imgFallback&&window.imgFallback(this)" style="width:100%;height:185px;object-fit:cover;display:block" data-open="${l.id}">
        <span style="position:absolute;bottom:8px;right:8px;background:rgba(15,23,42,.8);color:#fff;font-size:12px;padding:3px 9px;border-radius:999px">📷 ${phCount} ${tr('photosCount')}</span>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:8px;flex:1">
        <h3 style="margin:0;font-size:16px;color:#0f172a">📍 ${partialAddr(l)}</h3>
        <div style="font-size:12.5px;color:#475569;background:#f8fafc;border:1px dashed #cbd5e1;padding:8px 10px;border-radius:8px">
          🔒 ${tr('guestCardPrompt')}
        </div>
        <div style="display:flex;gap:6px;margin-top:auto">
          <button data-register="1" style="flex:1;background:#0f172a;color:#fff;font-size:12.5px;padding:8px 10px;border-radius:8px;cursor:pointer">${tr('guestCardBtn')}</button>
          <button data-open="${l.id}" style="background:#f1f5f9;color:#0f172a;font-size:12.5px;padding:8px 10px;border-radius:8px;cursor:pointer">${tr('viewPhotos')}</button>
        </div>
      </div>
    </article>`;
  }
  return `<article class="card listing-card" style="border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.1)">
  <div style="position:relative"><img src="${esc(l.photoUrl||'listing-placeholder.svg')}" referrerpolicy="no-referrer" loading="lazy" onerror="window.imgFallback&&window.imgFallback(this)" style="width:100%;height:170px;object-fit:cover;cursor:pointer" data-open="${l.id}">
  <button data-fav="${l.id}" title="Favorite" style="position:absolute;top:8px;right:8px;font-size:20px;background:#fff;border-radius:50%;border:0;width:36px;height:36px">${S.isFavorite(l.id)?'❤️':'🤍'}</button></div>
  <div style="padding:10px">${badge(l.status)}<h3 style="margin:6px 0;font-size:16px">${title(l)}</h3>
  <div>${tr('price')} <b>${S.money(l.askingPrice)}</b> · ${tr('down')} <b>${S.money(l.downPayment)}</b> · <b>${S.money(l.monthlyPayment)}</b>${tr('perMo')}</div>
  <div style="font-size:13px;color:#555">${l.beds??'—'} bd · ${l.baths??'—'} ba · ${l.sqft?l.sqft+' sqft':''}</div><button data-open="${l.id}" style="margin-top:8px">${tr('viewDetails')}</button></div></article>`;
}

function drawMap(){if(!window.L||!$('#inventory-map'))return;if(map){map.remove();map=null;}
  map=L.map('inventory-map').setView([35.47,-97.52],10);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
  const pts=[];filtered().forEach(l=>{const a=l.approxLocation||{};const lat=S.user?l.latitude:a.lat,lng=S.user?l.longitude:a.lng;if(lat==null||lng==null)return;
   pts.push([lat,lng]);
   const popupHtml=S.user
     ?`<b>${title(l)}</b><br>${S.money(l.askingPrice)} · <a href="#" data-open="${l.id}">${tr('viewDetails')}</a>`
     :`<b>📍 ${partialAddr(l)}</b><br><a href="#" data-open="${l.id}">${tr('viewPhotos')}</a> · <a href="#auth" data-register="1">${tr('loginPromptLink')}</a>`;
   L.marker([lat,lng]).addTo(map).bindPopup(popupHtml);});
  if(pts.length)map.fitBounds(pts,{padding:[30,30],animate:false});}

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
  const m=modal(`<h2>${title(l)}</h2>${badge(l.status)}<div class="gallery" style="display:flex;gap:6px;overflow-x:auto;margin:10px 0">${ph.map(p=>`<img src="${esc(p)}" referrerpolicy="no-referrer" loading="lazy" onerror="window.imgFallback&&window.imgFallback(this)" style="height:200px;border-radius:8px">`).join('')}</div>
   ${l.photosUrl?`<a href="${esc(l.photosUrl)}" target="_blank" rel="noopener">${tr('morePhotos')}</a>`:''}
   <p>${tr('price')} <b>${S.money(l.askingPrice)}</b> · ${tr('down')} <b>${S.money(l.downPayment)}</b> · ${tr('monthly')} <b>${S.money(l.monthlyPayment)}</b> · ${l.termYears||'—'} ${tr('yrs')}</p>
   <p style="font-size:14px;color:#475569">${l.beds??'—'} bd · ${l.baths??'—'} ba · ${l.sqft?l.sqft+' sqft':''}</p>
   <p>${esc(l.description)}</p>
   <h3>${tr('makeOffer')}</h3><form id="offerF"><input name="offerPrice" type="number" placeholder="${tr('offerPrice')}" required><input name="downPayment" type="number" placeholder="${tr('downPayment')}" required><input name="monthlyPayment" type="number" placeholder="${tr('monthlyPayment')}" required><textarea name="notes" placeholder="${tr('notes')}"></textarea><button>${tr('submitOffer')}</button></form>
   <h3>${tr('requestShowing')}</h3><form id="showF"><input name="preferredAt" type="datetime-local" required><input name="notes" placeholder="${tr('notes')}"><button>${tr('requestShowingBtn')}</button></form>
   ${ag?`<h3>${tr('shareHouse')}</h3><form id="shareF"><textarea name="body" placeholder="${tr('msgToAgent')}">${tr('defaultShareMsg')}</textarea><button>${tr('shareHouse')}</button> <button type="button" id="reqAcc">${tr('requestAccess')}</button></form>`:''}`);
  const on=(s,f)=>{const el=m.querySelector(s);if(el)el.onsubmit=wrap(()=>{f(fd(el));alert(tr('sentAlert'));m.remove();render();});};
  on('#offerF',v=>S.submitOffer({...v,listingId:id}));on('#showF',v=>S.requestShowing({...v,listingId:id}));
  on('#shareF',v=>S.sendMessage({toUserId:ag.id,listingId:id,kind:'SHARE_HOUSE',body:v.body}));
  const ra=m.querySelector('#reqAcc');if(ra)ra.onclick=wrap(()=>{S.sendMessage({toUserId:ag.id,listingId:id,kind:'REQUEST_ACCESS',body:'Request Property Access'});alert(tr('requestedAlert'));});}

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
  return `<section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;padding:18px">
  <div class="card" style="padding:16px"><h2>${tr('myProfile')}</h2><img src="${esc(u.avatarUrl||'listing-placeholder.svg')}" style="width:90px;height:90px;border-radius:50%;object-fit:cover"><input type="file" id="avatar" accept="image/*">
   <form id="profF"><input name="name" value="${esc(u.name)}"><input name="phone" value="${esc(u.phone)}">${ap?`<label>${tr('orecLicense')}<input name="licenseNumber" value="${esc(ap.licenseNumber)}"></label><label>${tr('brokerage')}<input name="brokerage" value="${esc(ap.brokerage)}"></label><p>${tr('yourInviteCode')} <b>${esc(ap.inviteCode)}</b></p>`:''}<button>${tr('save')}</button></form>
   ${ag?`<p>${tr('yourAgent')} <b>${esc(ag.name)}</b></p>`:''}<h3>${tr('changePw')}</h3><form id="pwF"><input name="cur" type="password" placeholder="${tr('currentPw')}" required><input name="pw" type="password" placeholder="${tr('newPw')}" minlength="8" required><button>${tr('updatePw')}</button></form></div>
  <div class="card" style="padding:16px"><h2>${tr('favorites')}</h2><ul>${favs.map(li).join('')||`<li>${tr('noneYet')}</li>`}</ul><h2>${tr('viewedHomes')}</h2><ul>${views.map(li).join('')||`<li>${tr('noneYet')}</li>`}</ul></div>
  <div class="card" style="padding:16px"><h2>${tr('messages')}</h2>${contacts.length?`<form id="msgF"><select name="toUserId">${contacts.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
   <select name="listingId"><option value="">${tr('propAddress')}</option>${D.listings.map(l=>`<option value="${l.id}">${esc(l.address)}, ${esc(l.city)}</option>`).join('')}</select>
   <select name="kind"><option value="MESSAGE">${tr('kindMsg')}</option><option value="REQUEST_ACCESS">${tr('requestAccess')}</option><option value="SHARE_HOUSE">${tr('shareHouse')}</option></select><textarea name="body" placeholder="${tr('kindMsg')}" required></textarea><button>${tr('send')}</button></form>`:`<p>${tr('noAgentLinked')}</p>`}
   <ul>${msgs.map(m=>`<li><b>${esc(nm(m.fromUserId))}</b> → ${esc(nm(m.toUserId))} ${m.listingId?'('+esc((S.listing(m.listingId)||{}).address)+')':''} <i>${esc(m.kind)}</i>: ${esc(m.body)}</li>`).join('')}</ul></div>
  <div class="card" style="padding:16px"><h2>${tr('myOffers')}</h2><ul>${offers.map(o=>{const l=S.listing(o.listingId)||{};return `<li>${esc(l.address)} — ${S.money(o.offerPrice)} ${offerBadge(o.status)}
   ${o.status==='COUNTERED'?`<div style="color:#d97706">${tr('counterLabel')}: ${S.money(o.counterPrice)} / ${tr('down')} ${S.money(o.counterDown)} / ${S.money(o.counterMonthly)}${tr('perMo')}. ${esc(o.adminNotes)}</div>`:''}
   ${o.status==='ACCEPTED'?`<div class="tx-box" style="border:2px solid #16a34a;padding:8px;border-radius:8px;margin:6px 0"><b>${tr('txDocs')}</b>${S.TX_DOCS.map(t=>{const has=docs.find(d=>d.offerId===o.id&&d.docType===t.type);
     const docLabel=S.lang==='es'?(t.labelEs||t.label):t.label;
     return `<div>${docLabel}: ${has?'✅ '+esc(has.name):`<input type="file" data-txdoc="${t.type}" data-offer="${o.id}" data-listing="${o.listingId}">`}</div>`;}).join('')}</div>`:''}</li>`;}).join('')||`<li>${tr('noneYet')}</li>`}</ul></div>
  <div class="card" style="padding:16px"><h2>${tr('myDocFolder')}</h2><p style="font-size:12px">${tr('folder')}: ${esc(u.folderSlug)}</p><input type="file" id="docUp"><ul>${docs.map(d=>`<li><a href="${d.dataUrl}" target="_blank" rel="noopener" download="${esc(d.name)}">${esc(d.name)}</a> <i>${esc(d.docType)}</i></li>`).join('')||`<li>${tr('noDocs')}</li>`}</ul></div>
  ${ap?`<div class="card" style="padding:16px"><h2>${tr('myClients')}</h2><ul>${S.clientsOf(u).map(c=>`<li><a href="#" data-client="${c.id}">${esc(c.name)}</a> — ${esc(c.email)} ${esc(c.phone)}</li>`).join('')||`<li>${tr('noClients')}</li>`}</ul></div>`:''}</section>`;}

function admin(){if(!S.isAdmin())return `<p style="padding:18px">${tr('adminsOnly')}</p>`;const D=S.data;
  return `<section style="padding:18px;display:grid;gap:16px"><div class="card" style="padding:16px"><h2>${tr('recentOffers')}</h2><table><tr><th>${tr('colProperty')}</th><th>${tr('colBuyer')}</th><th>${tr('colOffer')}</th><th>${tr('colStatus')}</th><th>${tr('colActions')}</th></tr>
  ${D.offers.slice().reverse().map(o=>`<tr><td>${esc((S.listing(o.listingId)||{}).address)}</td><td>${esc((D.users.find(u=>u.id===o.userId)||{}).name)}</td><td>${S.money(o.offerPrice)} / ${S.money(o.downPayment)} / ${S.money(o.monthlyPayment)}</td><td>${offerBadge(o.status)}</td>
   <td><button data-acc="${o.id}" style="background:#16a34a;color:#fff">${tr('accept')}</button> <button data-ctr="${o.id}" style="background:#d97706;color:#fff">${tr('counterOffer')}</button> <button data-rej="${o.id}" style="background:#dc2626;color:#fff">${tr('reject')}</button></td></tr>`).join('')||`<tr><td colspan=5>${tr('noOffers')}</td></tr>`}</table></div>
  <div class="card" style="padding:16px"><h2>${tr('usersAgents')}</h2><table><tr><th>${tr('colName')}</th><th>${tr('email')}</th><th>${tr('colRole')}</th><th>${tr('colInvite')}</th><th>${tr('colResetPw')}</th></tr>${D.users.map(u=>{const ap=S.agentProfile(u);return `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.role}</td><td>${esc(ap&&ap.inviteCode)}</td><td><button data-reset="${u.id}">${tr('reset')}</button></td></tr>`;}).join('')}</table></div>
  <div class="card" style="padding:16px"><h2>${tr('listings')}</h2><table><tr><th>${tr('colAddress')}</th><th>${tr('colStatus')}</th><th>${tr('price')} $</th><th>${tr('down')} $</th><th>${tr('monthly')} $</th><th></th></tr>${D.listings.map(l=>`<tr data-row="${l.id}"><td>${esc(l.address)}, ${esc(l.city)}</td>
   <td><select data-status="${l.id}">${S.STATUSES.map(s=>`<option value="${s}" ${l.status===s?'selected':''}>${S.statusText(s)}</option>`).join('')}</select></td>
   <td><input data-f="askingPrice" type="number" value="${l.askingPrice/100}" style="width:90px"></td><td><input data-f="downPayment" type="number" value="${l.downPayment/100}" style="width:80px"></td><td><input data-f="monthlyPayment" type="number" value="${l.monthlyPayment/100}" style="width:80px"></td><td><button data-save="${l.id}">${tr('save')}</button></td></tr>`).join('')}</table></div></section>`;}

function render(){const root=$('#app-root');if(!S.data)return;document.documentElement.lang=S.lang;if(map){try{map.stop();map.off();map.remove();}catch(e){}map=null;}
  const body={inventory,guides,dashboard,admin,auth}[tab]||inventory;root.innerHTML=header()+`<main>${body()}</main><footer style="padding:18px;font-size:12px;text-align:center">© Legacy - Owner Finance · Brokerage By: KLC Real Estate, LLC</footer>`;bind();if(tab==='inventory')drawMap();}
function bind(){const r=$('#app-root');
  r.onclick=async e=>{
   const t=e.target.closest('[data-tab],[data-lang],[data-open],[data-fav],[data-acc],[data-rej],[data-ctr],[data-reset],[data-save],[data-client],[data-register],#logout,#forgot');
   if(!t)return;
   e.preventDefault();
   try{
     const d=t.dataset;
     if(d.register)return go('auth','#regF [name="name"]');
     if(d.tab)return go(d.tab);if(d.lang)return S.setLang(d.lang);if(d.fav)return S.toggleFavorite(d.fav);if(d.open)return openListing(d.open);if(t.id==='logout'){S.logout();return go('inventory');}
     if(t.id==='forgot')return openForgotModal();
     if(d.acc)return S.respondOffer(d.acc,'ACCEPTED');if(d.rej)return S.respondOffer(d.rej,'REJECTED');
     if(d.ctr){const p=prompt('Counter price $'),dn=prompt('Counter down $'),mo=prompt('Counter monthly $'),n=prompt('Admin notes')||'';if(p)S.respondOffer(d.ctr,'COUNTERED',{counterPrice:p,counterDown:dn,counterMonthly:mo,adminNotes:n});return;}
     if(d.reset)return openAdminResetModal(d.reset);
     if(d.save){const row=r.querySelector(`[data-row="${d.save}"]`),p={};row.querySelectorAll('[data-f]').forEach(i=>p[i.dataset.f]=Math.round(+i.value*100));S.updateListing(d.save,p);return alert(tr('savedAlert'));}
     if(d.client){const c=S.data.users.find(u=>u.id===d.client);const of=S.data.offers.filter(o=>o.userId===c.id);modal(`<h2>${esc(c.name)}</h2><p>${esc(c.email)} · ${esc(c.phone)}</p><h3>${tr('favorites')}</h3><ul>${S.data.favorites.filter(f=>f.userId===c.id).map(f=>`<li>${esc((S.listing(f.listingId)||{}).address)}</li>`).join('')}</ul><h3>${tr('myOffers')}</h3><ul>${of.map(o=>`<li>${esc((S.listing(o.listingId)||{}).address)} ${S.money(o.offerPrice)} ${offerBadge(o.status)}</li>`).join('')}</ul>`);}
   }catch(err){alert(err.message);}
  };
  const f=$('#filters');if(f){f.oninput=f.onchange=e=>{F=Object.assign(F,fd(f));const pos=e.target.name==='q'?e.target.selectionStart:null;render();if(pos!=null){const q=$('#filters [name=q]');q.focus();q.setSelectionRange(pos,pos);}};f.onsubmit=e=>e.preventDefault();}
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
  sub('#loginF',v=>{const u=S.login(v.email,v.password);go(u&&u.role==='ADMIN'?'admin':'dashboard');});
  sub('#regF',v=>{S.register(v);go('dashboard');});
  sub('#profF',v=>{S.updateProfile(v);alert(tr('savedAlert'));});
  sub('#pwF',v=>{S.changePassword(v.cur,v.pw);alert(tr('pwUpdatedAlert'));});
  sub('#msgF',v=>{S.sendMessage(v);});}

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
S.load().then(()=>{render();checkResetUrlParams();}).catch(e=>{$('#app-root').innerHTML='<p style="padding:20px">Failed to load data: '+esc(e.message)+'</p>';});
})();
