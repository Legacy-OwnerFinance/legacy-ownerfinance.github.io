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
let tab=initTab(),F={q:'',area:'',beds:'',baths:'',maxDown:'',maxMonthly:'',maxPrice:'',status:'',sort:(()=>{try{return localStorage.getItem('lof.sort')||'newest'}catch(e){return 'newest'}})()},map=null,CAL={mode:'week',anchor:null},sharedDetailFor='',alertOpen=false;
let msgOpen=false,msgPeer=null,msgNew=false,msgStickBottom=false,msgScroll=null;

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
    roleInvestor:'Investor',
    businessName:'Business name',
    contactMethod:'Preferred method of contact',
    contactValue:'Phone, email, or WhatsApp',
    contactPhone:'Phone',
    contactEmail:'Email',
    contactWhatsApp:'WhatsApp',
    contactText:'Text',
    representativeName:'Name of the representative',
    investorThanksTitle:'Thank you!',
    investorThanks:'Thank you! Your account is being reviewed. One of our representatives will contact you via your preferred method of contact.',
    investorNotReady:'Investor tools are not active on the server yet.',
    navInvestorHome:'My homes',
    navTransactions:'Transactions',
    openMap:'Inventory map',
    mapMine:'Only my inventory',
    mapAll:'Everything',
    viewOnly:'View only',
    editHome:'Edit home',
    inspectionDate:'Inspection date',
    totalViews:'Total views',
    totalFavorites:'Total favorites',
    closedYtd:'Deals closed this year',
    underContract:'Currently under contract',
    viewedBy:'Viewed by',
    favoritedBy:'Favorited by',
    notifications:'Latest notifications',
    feedShowing:'Showing',
    feedOffer:'Offer received',
    feedContract:'Under contract',
    feedClosed:'Closed',
    cancelShowing:'Cancel',
    messageAgent:'Message agent',
    messageAgentPrompt:'Message to the agent',
    closedDeals:'Closed deals',
    inspectionsWeek:'Inspections this week',
    approvedShowings:'Approved showings',
    offersReceived:'Offers received',
    sheetsLabel:'Seller spreadsheets — one Google Sheet URL or id per line',
    assignHome:'Assign a home',
    unassign:'Remove',
    investorsTitle:'Investors',
    sheetNote:'If a home is synced from a linked spreadsheet, the next sync sets the owner from that sheet.',
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
    roleInvestorShort:'Investor',
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
    roleInvestor:'Inversionista',
    businessName:'Nombre del negocio',
    contactMethod:'Método de contacto preferido',
    contactValue:'Teléfono, correo o WhatsApp',
    contactPhone:'Teléfono',
    contactEmail:'Correo',
    contactWhatsApp:'WhatsApp',
    contactText:'Mensaje de texto',
    representativeName:'Nombre del representante',
    investorThanksTitle:'¡Gracias!',
    investorThanks:'¡Gracias! Tu cuenta está en revisión. Uno de nuestros representantes te contactará por tu método de contacto preferido.',
    investorNotReady:'Las herramientas de inversionista aún no están activas en el servidor.',
    navInvestorHome:'Mis casas',
    navTransactions:'Transacciones',
    openMap:'Mapa de inventario',
    mapMine:'Solo mi inventario',
    mapAll:'Todo',
    viewOnly:'Solo lectura',
    editHome:'Editar casa',
    inspectionDate:'Fecha de inspección',
    totalViews:'Vistas totales',
    totalFavorites:'Favoritos totales',
    closedYtd:'Tratos cerrados en el año',
    underContract:'Actualmente bajo contrato',
    viewedBy:'Visto por',
    favoritedBy:'Marcado como favorito por',
    notifications:'Avisos recientes',
    feedShowing:'Visita',
    feedOffer:'Oferta recibida',
    feedContract:'Bajo contrato',
    feedClosed:'Cerrado',
    cancelShowing:'Cancelar',
    messageAgent:'Enviar mensaje al agente',
    messageAgentPrompt:'Mensaje para el agente',
    closedDeals:'Tratos cerrados',
    inspectionsWeek:'Inspecciones esta semana',
    approvedShowings:'Visitas aprobadas',
    offersReceived:'Ofertas recibidas',
    sheetsLabel:'Hojas del vendedor — un enlace o id de Google Sheet por línea',
    assignHome:'Asignar una casa',
    unassign:'Quitar',
    investorsTitle:'Inversionistas',
    sheetNote:'Si una casa se sincroniza desde una hoja vinculada, la próxima sincronización pone al dueño según esa hoja.',
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
    roleInvestorShort:'Inversionista',
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
// ---- v16: closing tools on accepted offers (Admin and the offer's agent; owners see the date only) ----
const CLX={
  en:{title:'Closing',closingDate:'Closing date',saveDate:'Save date',waive:'Opt out of inspections (waived)',waived:'Inspections waived',contract:'Final contract',contractUp:'Upload the final contract',commission:'Commission earned $',saveComm:'Save commission',commissionL:'Commission',closeDeal:'Close deal',fell:'Fell through',
    pickDate:'Pick the closing date first.',confirmClose:'Close this deal? The home will be marked Sold and the 3-day Sold countdown starts.',confirmFell:'Mark this deal as fell through? The home goes back to Available right away.',reasonL:'Reason (optional)',confirm:'Confirm',cancel:'Cancel',
    closedOn:'Closed',fellNote:'This deal fell through. The home went back to Available.',closedNote:'Closed. The home is Sold (3-day countdown).',saved:'Saved',contractAdded:'Final contract uploaded',noContract:'No contract yet',
    dateSet:'Closing date',notice:'Closing update',statusClosed:'Closed',statusFell:'Fell through',onlyPeople:'Only Admin and this offer\'s agent can see the commission.',clientOffer:'Client'},
  es:{title:'Cierre',closingDate:'Fecha de cierre',saveDate:'Guardar fecha',waive:'Optar por no hacer inspecciones (renunciar)',waived:'Inspecciones omitidas',contract:'Contrato final',contractUp:'Subir el contrato final',commission:'Comisión obtenida $',saveComm:'Guardar comisión',commissionL:'Comisión',closeDeal:'Cerrar trato',fell:'Se cayó el trato',
    pickDate:'Primero elige la fecha de cierre.',confirmClose:'¿Cerrar este trato? La casa se marcará como Vendida y empieza el conteo de 3 días.',confirmFell:'¿Marcar este trato como caído? La casa vuelve a Disponible de inmediato.',reasonL:'Motivo (opcional)',confirm:'Confirmar',cancel:'Cancelar',
    closedOn:'Cerrado',fellNote:'Este trato se cayó. La casa volvió a Disponible.',closedNote:'Cerrado. La casa está Vendida (conteo de 3 días).',saved:'Guardado',contractAdded:'Contrato final subido',noContract:'Aún no hay contrato',
    dateSet:'Fecha de cierre',notice:'Actualización de cierre',statusClosed:'Cerrado',statusFell:'Se cayó',onlyPeople:'Solo el administrador y el agente de esta oferta ven la comisión.',clientOffer:'Cliente'}
};
const cx=k=>(CLX[S.lang]||CLX.en)[k]||k;
const fmtYmd=y=>{if(!y)return '';const d=new Date(String(y).slice(0,10)+'T12:00:00');return isNaN(d.getTime())?String(y):d.toLocaleDateString(S.lang==='es'?'es-US':'en-US',{year:'numeric',month:'long',day:'numeric'});};
const closingCan=()=>!!(S.caps&&S.caps.closing&&S.user&&(S.isAdmin()||S.user.role==='AGENT'));
function closingPanel(o){
  if(!closingCan()||!['ACCEPTED','CLOSED','FELL_THROUGH'].includes(o.status))return '';
  const c=S.closings[o.id]||{},id=esc(o.id);
  const box=(inner,color)=>`<div class="closing-box" data-closing-for="${id}" style="border:2px solid ${color};padding:8px;border-radius:8px;margin:6px 0"><b>🏁 ${cx('title')}</b>${inner}</div>`;
  if(o.status==='FELL_THROUGH'||c.outcome==='FELL_THROUGH')return box(`<p style="margin:4px 0;color:#b91c1c">${cx('fellNote')}${c.fellThroughReason?` <i>${esc(c.fellThroughReason)}</i>`:''}</p>`,'#b91c1c');
  const contract=(S.data.documents||[]).find(d=>d.offerId===o.id&&d.docType==='FINAL_CONTRACT');
  const commVal=c.commissionCents!=null?(c.commissionCents/100):'';
  const commRow=`<div class="closing-row"><label>${cx('commission')} <input type="number" min="0" step="0.01" id="cl-comm-${id}" value="${esc(commVal)}" style="width:140px"></label> <button type="button" data-clcomm="${id}">${cx('saveComm')}</button> <small style="color:#64748b">${cx('onlyPeople')}</small></div>`;
  const contractRow=`<div class="closing-row">${cx('contract')}: ${contract?`✅ <a href="${esc(contract.dataUrl)}" target="_blank" rel="noopener">${esc(contract.name)}</a>`:`<input type="file" data-clcontract="${id}" data-listing="${esc(o.listingId)}" aria-label="${cx('contractUp')}">`}</div>`;
  if(o.status==='CLOSED'||c.outcome==='CLOSED')return box(`<p style="margin:4px 0;color:#0f766e">${cx('closedNote')}</p><div class="closing-row">${cx('closingDate')}: <b>${esc(fmtYmd(c.closingDate))}</b>${c.inspectionsWaived?` · ${cx('waived')}`:''}</div>${contractRow}${commRow}`,'#0f766e');
  return box(`<div class="closing-row"><label>${cx('closingDate')} <input type="date" id="cl-date-${id}" value="${esc(c.closingDate||'')}"></label> <button type="button" data-cldate="${id}">${cx('saveDate')}</button></div>
    <div class="closing-row"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" style="width:auto" data-clwaive="${id}" ${c.inspectionsWaived?'checked':''}> ${cx('waive')}</label></div>${contractRow}${commRow}
    <div class="closing-row" style="margin-top:8px"><button type="button" data-clclose="${id}" style="background:#0f766e;color:#fff">${cx('closeDeal')}</button> <button type="button" data-clfell="${id}" style="background:#b91c1c;color:#fff">${cx('fell')}</button></div>`,'#16a34a');
}
function openFellThrough(offerId){
  const m=modal(`<form id="fellF" class="card" style="padding:16px"><h3>${cx('fell')}</h3><p>${cx('confirmFell')}</p><label>${cx('reasonL')}<textarea name="reason" maxlength="500" rows="3"></textarea></label><div style="display:flex;gap:8px;margin-top:8px"><button class="btn-card" style="background:#b91c1c;color:#fff">${cx('confirm')}</button><button type="button" class="btn-card" id="fellNo">${cx('cancel')}</button></div></form>`);
  m.querySelector('#fellNo').onclick=()=>m.remove();
  m.querySelector('#fellF').onsubmit=async e=>{e.preventDefault();const reason=String(new FormData(e.target).get('reason')||'').trim();try{await S.offerFellThrough(offerId,reason);m.remove();render();}catch(err){alert(err.message);}};
}
async function closingAction(d){
  const val=(pre,id)=>{const el=document.getElementById(pre+id);return el?el.value:'';};
  if(d.cldate){const v=val('cl-date-',d.cldate);if(!v)return alert(cx('pickDate'));await S.saveClosing(d.cldate,{closingDate:v});return render();}
  if(d.clcomm){const v=val('cl-comm-',d.clcomm);await S.saveClosing(d.clcomm,{commission:v===''?null:v});alert(cx('saved'));return render();}
  if(d.clclose){const v=val('cl-date-',d.clclose)||((S.closings[d.clclose]||{}).closingDate)||'';if(!v)return alert(cx('pickDate'));if(!confirm(cx('confirmClose')+'\n'+cx('closingDate')+': '+fmtYmd(v)))return;const cm=val('cl-comm-',d.clclose);await S.closeOffer(d.clclose,{closingDate:v,...(cm!==''?{commission:cm}:{})});return render();}
  if(d.clfell){return openFellThrough(d.clfell);}
}
const kindLabel=k=>{
  const u=String(k||'').toUpperCase();
  if(u==='MESSAGE')return tr('kindMsg');
  if(u==='REQUEST_ACCESS')return tr('requestAccess');
  if(u==='SHARE_HOUSE')return tr('shareHouse');
  if(u==='CLOSING_NOTICE')return cx('notice');
  return k||'';
};
const roleLabel=r=>r==='AGENT'?tr('roleAgentShort'):r==='ADMIN'?tr('roleAdminShort'):r==='INVESTOR'?tr('roleInvestorShort'):r==='BUYER'?tr('roleClientShort'):(r||'');
function limited(){return !S.user||(S.isInvestor()&&S.isPendingApproval(S.user));}
function toLocalInput(value){
  if(!value)return '';
  const s=String(value);
  if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s))return s;
  const d=new Date(s);
  if(isNaN(d.getTime()))return '';
  try{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
    const g={};parts.forEach(p=>{if(p.type!=='literal')g[p.type]=p.value;});
    const hour=g.hour==='24'?'00':g.hour;
    return `${g.year}-${g.month}-${g.day}T${hour}:${g.minute}`;
  }catch(e){return '';}
}
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
  const label=s==='CLOSED'?(S.lang==='es'?'Cerrada':'Closed'):s==='FELL_THROUGH'?(S.lang==='es'?'Se cayó':'Fell through'):s==='COUNTERED'?tr('offerCountered'):s==='ACCEPTED'?tr('offerAccepted'):s==='REJECTED'?tr('offerRejected'):s==='SUBMITTED'?tr('offerSubmitted'):s;
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
const title=l=>limited()?partialAddr(l):`${esc(l.address)}, ${esc(l.city)}, ${esc(l.state||'OK')} ${esc(l.zip||'')}`;

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

const INTERESTS=['NOT_INTERESTED','SOMEWHAT','INTERESTED','VERY_INTERESTED','READY_TO_OFFER'];
const PRICE_OPINIONS=['LOW','FAIR','HIGH'];
function portalReady(){return !!(S.user&&S.caps&&S.caps.ready);}
function formatInstant(iso){
  const d=new Date(iso);
  if(!iso||isNaN(d.getTime()))return '—';
  try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago',dateStyle:'medium',timeStyle:'short'}).format(d);}catch(e){return d.toLocaleString();}
}
function formatCtDate(iso){
  const d=new Date(iso);
  if(!iso||isNaN(d.getTime()))return '—';
  try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago',dateStyle:'medium'}).format(d);}catch(e){return d.toLocaleDateString();}
}
function formatCtTime(iso){
  const d=new Date(iso);
  if(!iso||isNaN(d.getTime()))return '—';
  try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago',timeStyle:'short'}).format(d);}catch(e){return d.toLocaleTimeString();}
}
function durationText(mins){
  if(mins==null||mins==='')return '—';
  const n=Math.max(0,Math.round(Number(mins)));
  if(!isFinite(n))return '—';
  const h=Math.floor(n/60),m=n%60;
  if(h<=0)return S.t('activity.minutes',{count:n});
  return S.t('activity.hours',{hours:h,minutes:m});
}
function streetCity(street,city){
  const clean=String(street||'').replace(/^\s*\d+[A-Za-z\-]*\s+/,'').replace(/^\s*\d+[A-Za-z\-]*\s+/,'').trim();
  return [clean,String(city||'').trim()].filter(Boolean).join(', ');
}
function alertPlace(a){return esc(streetCity(a&&a.street,a&&a.city)||tr('alerts.home'));}
function showingPlace(sh){
  const l=S.listing(sh.listingId);
  if(l&&S.user&&(S.isAdmin()||S.isAgent()))return title(l);
  return esc(streetCity(sh.street,sh.city)||tr('alerts.home'));
}
function interestLabel(key){return tr('feedback.interest.'+key);}
function priceLabel(key){return tr('feedback.price.'+key);}
function readGeo(){
  return new Promise(resolve=>{
    if(!navigator.geolocation)return resolve(null);
    let done=false;
    const finish=v=>{if(done)return;done=true;resolve(v);};
    const timer=setTimeout(()=>finish(null),9000);
    navigator.geolocation.getCurrentPosition(
      p=>{clearTimeout(timer);finish({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy});},
      ()=>{clearTimeout(timer);finish(null);},
      {enableHighAccuracy:true,timeout:8000,maximumAge:0}
    );
  });
}
function bellHtml(){
  if(!portalReady())return '';
  const n=(S.alerts||[]).filter(a=>!a.readAt).length;
  return `<div class="bell-wrap"><button type="button" class="nav-pill bell-btn" data-bell="1" aria-expanded="${alertOpen?'true':'false'}" aria-label="${esc(tr('alerts.bell'))}">🔔${n?`<span class="bell-count">${n>9?'9+':n}</span>`:''}</button></div>`;
}
function alertSheet(){
  if(!portalReady()||!alertOpen)return '';
  const items=(S.alerts||[]).slice(0,30);
  return `<section class="alert-panel" role="region" aria-label="${esc(tr('alerts.title'))}"><div class="alert-panel-head"><b>${tr('alerts.title')}</b><button type="button" class="nav-pill" data-alertclose="1" aria-label="✕">✕</button></div>
    ${items.length?items.map(a=>`<article class="alert-item ${a.readAt?'':'is-unread'}"><div class="alert-place">${alertPlace(a)}</div><div class="alert-meta">${esc(S.statusText(a.newStatus))} · ${esc(formatInstant(a.changedAt))}</div></article>`).join(''):`<p class="alert-empty">${tr('alerts.empty')}</p>`}
  </section>`;
}
const MSG_SKIP_KIND={OFFER_CONFIRMATION:1,SHOWING_CONFIRMATION:1};
function msgCountLabel(n){
  n=n|0;
  if(n<=0)return '';
  return n>9?'9+':String(n);
}
function msgHtml(text){return esc(text).replace(/\r\n|\r|\n/g,'<br>');}
function msgWhen(iso){
  const d=new Date(iso);
  if(!iso||isNaN(d.getTime()))return '';
  try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d);}catch(e){return '';}
}
function msgPeerName(peerId){
  const u=(S.data&&S.data.users||[]).find(x=>x&&x.id===peerId);
  if(u&&u.name)return String(u.name);
  const t=(S.msgThreads||[]).find(x=>x&&x.peerId===peerId);
  if(t&&t.peerName)return String(t.peerName);
  return '…';
}
function msgUnreadOf(peerId){
  const t=(S.msgThreads||[]).find(x=>x&&x.peerId===peerId);
  return t?(t.unread|0):0;
}
function msgConversations(){
  const mine=S.user?S.user.id:'';
  const rows=(S.myMessages?S.myMessages():[]).filter(m=>{
    if(!m)return false;
    const from=String(m.fromUserId||'');
    const to=String(m.toUserId||'');
    if(from==='legacy-system'||to==='legacy-system')return false;
    if(MSG_SKIP_KIND[String(m.kind||'').toUpperCase()])return false;
    return true;
  });
  const map=new Map();
  rows.forEach(m=>{
    const peerId=m.fromUserId===mine?m.toUserId:m.fromUserId;
    if(!peerId||peerId===mine||String(peerId)==='legacy-system')return;
    let g=map.get(peerId);
    if(!g){g={peerId,messages:[]};map.set(peerId,g);}
    g.messages.push(m);
  });
  const list=[...map.values()];
  list.forEach(g=>{
    g.messages.sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    g.last=g.messages[g.messages.length-1];
    g.lastAt=g.last?g.last.createdAt:'';
  });
  list.sort((a,b)=>String(b.lastAt||'').localeCompare(String(a.lastAt||'')));
  return list;
}
function messageContacts(){
  const u=S.user;
  if(!u||!S.data)return [];
  const seen=new Set();
  const out=[];
  const add=c=>{
    if(!c||!c.id||c.id===u.id||String(c.id)==='legacy-system')return;
    if(seen.has(c.id))return;
    seen.add(c.id);
    out.push(c);
  };
  if(S.isAdmin()){(S.data.users||[]).forEach(add);return out;}
  if(S.isInvestor()){
    const mine=new Set((S.data.listings||[]).filter(l=>l&&l.investorId===u.id).map(l=>l.id));
    const ids=new Set();
    (S.data.showings||[]).forEach(sh=>{
      if(!sh||!mine.has(sh.listingId))return;
      if(sh.userId)ids.add(sh.userId);
      if(sh.agentId)ids.add(sh.agentId);
    });
    (S.data.users||[]).forEach(c=>{if(c&&ids.has(c.id)&&(c.role==='AGENT'||c.role==='ADMIN'))add(c);});
    return out;
  }
  const ap=S.agentProfile(u);
  if(ap){S.clientsOf(u).forEach(add);return out;}
  const ag=S.agentFor(u);
  if(ag)add(ag);
  return out;
}
function syncMsgTitle(){
  const n=S.msgUnread|0;
  const base='Legacy - Owner Finance';
  document.title=n>0?`(${n}) ${base}`:base;
}
function paintMsgBadge(){
  const n=msgCountLabel(S.msgUnread||0);
  const btn=document.querySelector('[data-msgbubble]');
  if(btn){
    let badge=btn.querySelector('.msg-count');
    if(!n){if(badge)badge.remove();}
    else{
      if(!badge){badge=document.createElement('span');badge.className='msg-count';btn.appendChild(badge);}
      badge.textContent=n;
    }
  }
  syncMsgTitle();
}
window.__paintMsgBadge=paintMsgBadge;
function captureMsgScroll(){
  if(msgStickBottom)return;
  const sc=document.querySelector('.msg-log');
  msgScroll=sc?sc.scrollTop:null;
}
function applyMsgScroll(){
  const sc=document.querySelector('.msg-log');
  if(!sc)return;
  if(msgStickBottom){sc.scrollTop=sc.scrollHeight;msgStickBottom=false;return;}
  if(msgScroll!=null)sc.scrollTop=msgScroll;
}
function submitMsgComposer(){
  if(!msgPeer||!S.user)return;
  const box=document.querySelector('[data-msginput]');
  const body=String(box&&box.value||'').trim();
  if(!body)return;
  msgStickBottom=true;
  S.sendMessage({toUserId:msgPeer,kind:'MESSAGE',body});
}
function msgBubble(){
  if(!(S.msgEnabled&&S.msgEnabled()))return '';
  const n=msgCountLabel(S.msgUnread);
  return `<button type="button" class="msg-bubble" data-msgbubble="1" aria-expanded="${msgOpen?'true':'false'}" aria-label="${esc(tr('msg.bubble'))}">💬${n?`<span class="msg-count">${esc(n)}</span>`:''}</button>`;
}
function msgThreadList(){
  const rows=msgConversations();
  const body=rows.length?rows.map(g=>{
    const n=msgUnreadOf(g.peerId);
    const mine=g.last&&S.user&&g.last.fromUserId===S.user.id;
    const preview=((mine?tr('msg.you')+': ':'')+String(g.last&&g.last.body||'')).replace(/\s+/g,' ').trim();
    const short=preview.length>90?preview.slice(0,89)+'…':preview;
    return `<button type="button" class="msg-row${n?' is-unread':''}" data-msgpeer="${esc(g.peerId)}"><span class="msg-row-top"><span class="msg-name">${n?'<i class="msg-dot" aria-hidden="true"></i>':''}${esc(msgPeerName(g.peerId))}</span><span class="msg-when">${esc(msgWhen(g.lastAt))}</span></span><span class="msg-row-bot"><span class="msg-preview">${esc(short)}</span>${n?`<span class="msg-chip">${esc(msgCountLabel(n))}</span>`:''}</span></button>`;
  }).join(''):`<p class="msg-empty">${esc(tr('msg.empty'))}</p>`;
  return `<div class="msg-head"><b>${esc(tr('msg.title'))}</b><span class="msg-head-actions"><button type="button" class="btn-card" data-msgnew="1">${esc(tr('msg.new'))}</button><button type="button" class="nav-pill" data-msgclose="1" aria-label="✕">✕</button></span></div><div class="msg-list">${body}</div>`;
}
function msgNewList(){
  const contacts=messageContacts();
  const body=contacts.length?contacts.map(c=>`<button type="button" class="msg-row" data-msgpeer="${esc(c.id)}"><span class="msg-name">${esc(c.name||'…')}</span></button>`).join(''):`<p class="msg-empty">${esc(tr('noAgentLinked'))}</p>`;
  return `<div class="msg-head"><button type="button" class="nav-pill" data-msgback="1">${esc('← '+tr('msg.back'))}</button><b>${esc(tr('msg.new'))}</b><button type="button" class="nav-pill" data-msgclose="1" aria-label="✕">✕</button></div><div class="msg-list">${body}</div>`;
}
function msgChat(){
  const g=msgConversations().find(x=>x.peerId===msgPeer);
  const msgs=g?g.messages:[];
  const bubbles=msgs.map(m=>{
    const mine=S.user&&m.fromUserId===S.user.id;
    return `<div class="msg-line ${mine?'mine':'theirs'}"><div class="msg-text">${msgHtml(m.body)}</div><time class="msg-time">${esc(msgWhen(m.createdAt))}</time></div>`;
  }).join('')||`<p class="msg-empty">${esc(tr('msg.empty'))}</p>`;
  return `<div class="msg-head"><button type="button" class="nav-pill" data-msgback="1">${esc('← '+tr('msg.back'))}</button><b>${esc(msgPeerName(msgPeer))}</b><button type="button" class="nav-pill" data-msgclose="1" aria-label="✕">✕</button></div><div class="msg-chat" data-peer="${esc(msgPeer)}"><div class="msg-log">${bubbles}</div><form class="msg-compose"><textarea data-msginput="1" rows="2" maxlength="4000" placeholder="${esc(tr('msg.placeholder'))}" aria-label="${esc(tr('msg.placeholder'))}"></textarea><button type="button" class="btn-card primary" data-msgsend="1">${esc(tr('msg.send'))}</button></form></div>`;
}
function msgPanel(){
  if(!(S.msgEnabled&&S.msgEnabled())||!msgOpen)return '';
  const body=msgPeer?msgChat():msgNew?msgNewList():msgThreadList();
  return `<div class="msg-backdrop" data-msgclose="1"></div><section class="msg-panel" role="dialog" aria-label="${esc(tr('msg.title'))}">${body}</section>`;
}
function alertsDash(){
  if(!portalReady())return '';
  const items=(S.alerts||[]).slice(0,8);
  return `<div class="card ops-card"><h2>🔔 ${tr('alerts.dash')}</h2>${items.length?`<ul class="ops-list">${items.map(a=>`<li><b>${alertPlace(a)}</b><span>${esc(S.statusText(a.newStatus))} · ${esc(formatInstant(a.changedAt))}</span></li>`).join('')}</ul>`:`<p>${tr('alerts.empty')}</p>`}</div>`;
}
function sortedShowings(){
  const list=(S.myShowings||[]).slice();
  const today=list.filter(s=>s.today).sort((a,b)=>String(a.preferredAt).localeCompare(String(b.preferredAt)));
  const upcoming=list.filter(s=>!s.today&&!s.past).sort((a,b)=>String(a.preferredAt).localeCompare(String(b.preferredAt)));
  const past=list.filter(s=>!s.today&&s.past).sort((a,b)=>String(b.preferredAt).localeCompare(String(a.preferredAt)));
  return today.concat(upcoming,past);
}
function visitLine(v){
  if(!v||!v.checkedInAt)return '';
  const bits=[S.t('showings.checkedIn',{time:formatInstant(v.checkedInAt)})];
  if(v.checkedOutAt)bits.push(S.t('showings.checkedOut',{time:formatInstant(v.checkedOutAt)}));
  if(v.durationMinutes!=null)bits.push(S.t('showings.duration',{duration:durationText(v.durationMinutes)}));
  return bits.join(' · ');
}
function showingsDash(){
  if(!portalReady()||!(S.isAgent()||(S.myShowings||[]).length))return '';
  const list=sortedShowings();
  const body=list.map(sh=>{
    const buttons=[];
    if(sh.today&&!(sh.visit&&sh.visit.checkedInAt))buttons.push(`<button type="button" class="btn-card primary" data-checkin="${esc(sh.id)}">${tr('showings.checkIn')}</button>`);
    if(sh.visit&&sh.visit.checkedInAt&&!sh.visit.checkedOutAt)buttons.push(`<button type="button" class="btn-card primary" data-checkout="${esc(sh.id)}">${tr('showings.checkOut')}</button>`);
    if(sh.past)buttons.push(`<button type="button" class="btn-card" data-feedback="${esc(sh.id)}">${tr(sh.feedback?'showings.feedbackEdit':'showings.feedback')}</button>`);
    const summary=sh.feedback?`<p class="ops-meta">${esc(S.t('showings.feedbackSummary',{rating:sh.feedback.rating,interest:interestLabel(sh.feedback.interest),price:priceLabel(sh.feedback.priceOpinion)}))}</p>`:'';
    const when=esc(S.formatShowingWhen?S.formatShowingWhen(sh.preferredAt):sh.preferredAt);
    const times=visitLine(sh.visit);
    const future=!sh.today&&!sh.past?`<p class="ops-meta">${tr('showings.future')}</p>`:'';
    return `<article class="ops-showing"><div class="ops-showing-head"><b>${showingPlace(sh)}</b><span>${when}</span></div>
      ${times?`<p class="ops-meta">${esc(times)}</p>`:''}${summary}
      ${buttons.length?`<div class="ops-actions">${buttons.join('')}</div>`:''}${future}
      ${buttons.some(b=>b.indexOf('data-checkin')>=0||b.indexOf('data-checkout')>=0)?`<p class="ops-meta">${tr('showings.geoNote')}</p>`:''}
    </article>`;
  }).join('');
  return `<div class="card ops-card"><h2>📅 ${tr('showings.mine')}</h2>${body||`<p>${tr('showings.empty')}</p>`}</div>`;
}
function openFeedback(sh){
  const cur=sh.feedback||{};
  const opt=(group,key,selected)=>`<option value="${esc(key)}" ${selected===key?'selected':''}>${esc(tr('feedback.'+group+'.'+key))}</option>`;
  const m=modal(`<h2>${tr('feedback.title')}</h2><p>${showingPlace(sh)}</p>
    <form id="fbF" class="feedback-form">
      <label>${tr('feedback.rating')}<select name="rating" required><option value="">—</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${String(cur.rating)===String(n)?'selected':''}>${n}</option>`).join('')}</select></label>
      <label>${tr('feedback.interest')}<select name="interest" required><option value="">—</option>${INTERESTS.map(k=>opt('interest',k,cur.interest)).join('')}</select></label>
      <label>${tr('feedback.price')}<select name="priceOpinion" required><option value="">—</option>${PRICE_OPINIONS.map(k=>opt('price',k,cur.priceOpinion)).join('')}</select></label>
      <label>${tr('feedback.condition')}<textarea name="conditionNotes" maxlength="4000">${esc(cur.conditionNotes||'')}</textarea></label>
      <label>${tr('feedback.comments')}<textarea name="comments" maxlength="4000">${esc(cur.comments||'')}</textarea></label>
      <button class="btn-card primary" type="submit">${tr('feedback.submit')}</button>
    </form>`);
  const form=m.querySelector('#fbF');
  form.onsubmit=wrap(async()=>{
    const v=fd(form);
    if(!v.rating||!v.interest||!v.priceOpinion)throw new Error(tr('feedback.rating'));
    await S.saveFeedback(sh.id,{rating:+v.rating,interest:v.interest,priceOpinion:v.priceOpinion,conditionNotes:v.conditionNotes||'',comments:v.comments||''});
    m.remove();
    alert(tr('showings.feedbackSaved'));
    render();
  });
}
function coordText(lat,lng){
  if(lat==null||lng==null||lat===''||lng==='')return tr('activity.none');
  const n=Number(lat),g=Number(lng);
  if(!isFinite(n)||!isFinite(g))return tr('activity.none');
  return n.toFixed(5)+', '+g.toFixed(5);
}
function activityHtml(j){
  const views=j.views||{};
  const showings=j.showings||{};
  const events=views.events||[];
  const feedback=j.feedback||[];
  const visits=j.visits||[];
  const history=j.statusHistory||[];
  const viewRows=events.map(v=>`<tr><td>${esc(v.name||'—')}</td><td>${esc(roleLabel(v.role))}</td><td>${esc(formatInstant(v.viewedAt))}</td></tr>`).join('')||`<tr><td colspan="3">${tr('activity.none')}</td></tr>`;
  const fbRows=feedback.map(f=>`<article class="ops-showing"><b>${esc(f.agentName||'—')}</b> · ${esc(formatInstant(f.createdAt))}<p class="ops-meta">${esc(S.t('showings.feedbackSummary',{rating:f.rating,interest:interestLabel(f.interest),price:priceLabel(f.priceOpinion)}))}</p>${f.conditionNotes?`<p>${esc(f.conditionNotes)}</p>`:''}${f.comments?`<p>${esc(f.comments)}</p>`:''}</article>`).join('')||`<p>${tr('activity.noFeedback')}</p>`;
  const logRows=visits.map(v=>`<tr><td>${esc(v.agentName||'—')}</td><td>${esc(formatCtDate(v.checkedInAt))}</td><td>${esc(formatCtTime(v.checkedInAt))}</td><td>${v.checkedOutAt?esc(formatCtTime(v.checkedOutAt)):'—'}</td><td>${esc(durationText(v.durationMinutes))}</td><td>${esc(coordText(v.inLat,v.inLng))}</td></tr>`).join('')||`<tr><td colspan="6">${tr('activity.noLog')}</td></tr>`;
  const histRows=history.map(h=>`<tr><td>${esc(formatInstant(h.changedAt))}</td><td>${esc(h.oldStatus?S.statusText(h.oldStatus):'—')}</td><td>${esc(S.statusText(h.newStatus))}</td></tr>`).join('')||`<tr><td colspan="3">${tr('activity.noHistory')}</td></tr>`;
  return `<h2>${tr('activity.title')}</h2>
    <div class="ops-stats"><div><b>${views.total||0}</b><span>${tr('activity.views')}</span></div><div><b>${views.uniqueAgents||0}</b><span>${tr('activity.uniqueAgents')}</span></div><div><b>${showings.requested||0}</b><span>${tr('activity.requested')}</span></div><div><b>${showings.approved||0}</b><span>${tr('activity.approved')}</span></div><div><b>${showings.completed||0}</b><span>${tr('activity.completed')}</span></div></div>
    <p class="ops-meta">${tr('activity.completedNote')}</p>
    <h3>${tr('activity.viewedBy')}</h3>${views.truncated?`<p class="ops-meta">${tr('activity.truncated')}</p>`:''}<div class="table-scroll"><table class="ops-table"><tr><th>${tr('activity.who')}</th><th>${tr('activity.role')}</th><th>${tr('activity.when')}</th></tr>${viewRows}</table></div>
    <h3>${tr('activity.feedback')}</h3>${fbRows}
    <h3>${tr('activity.log')}</h3><div class="table-scroll"><table class="ops-table"><tr><th>${tr('activity.agent')}</th><th>${tr('activity.date')}</th><th>${tr('activity.timeIn')}</th><th>${tr('activity.timeOut')}</th><th>${tr('activity.duration')}</th><th>${tr('activity.location')}</th></tr>${logRows}</table></div>
    <h3>${tr('activity.history')}</h3><div class="table-scroll"><table class="ops-table"><tr><th>${tr('activity.when')}</th><th>${tr('activity.from')}</th><th>${tr('activity.to')}</th></tr>${histRows}</table></div>`;
}
async function openActivity(id){
  const l=S.listing(id);
  const m=modal(`<h2>${tr('activity.title')}</h2>${l?`<p>${title(l)}</p>`:''}<p>${tr('activity.loading')}</p>`);
  const panel=m.querySelector('.drawer-panel');
  try{
    const j=await S.loadActivity(id);
    panel.innerHTML=`<button type="button" class="close nav-pill" style="float:right">✕</button>${l?`<p>${title(l)}</p>`:''}${activityHtml(j)}`;
  }catch(err){
    panel.innerHTML=`<button type="button" class="close nav-pill" style="float:right">✕</button><p>${esc(err.message||tr('ops.unavailable'))}</p>`;
  }
}
function header(){
  const investorHome=S.isInvestor()&&S.caps&&S.caps.investor&&!S.isPendingApproval(S.user);
  const T=investorHome?[['dashboard',tr('navInvestorHome')],['investor-tx',tr('navTransactions')],['inventory',tr('navInventory')],['guides',tr('navGuides')]]:[['inventory',tr('navInventory')],['guides',tr('navGuides')],['dashboard',tr('navDashboard')]];
  if(!investorHome&&S.canSeeShowingCalendar&&S.canSeeShowingCalendar())T.push(['calendar',tr('navCalendar')]);
  if(S.isAdmin())T.push(['admin',tr('navAdmin')]);
  if(!S.user)T.push(['auth',tr('navAuth')]);
  const cloudPill=`<span style="background:${S.cloudConnected?'#dcfce7':'#fef3c7'};color:${S.cloudConnected?'#166534':'#92400e'};padding:2px 8px;border-radius:999px;font-weight:700;font-size:11px">${S.cloudConnected?tr('cloudLive'):tr('cloudOffline')}</span>`;
  return `<header class="app-header"><div class="brand-wrap" data-tab="inventory"><img src="legacy-logo.png" alt="Legacy" class="main-logo"><div><h1 class="brand-title">Legacy - Owner Finance</h1>
   <div class="brand-sub"><span>Brokerage By: KLC Real Estate, LLC</span><img src="klc-logo.png" alt="KLC">${cloudPill}</div></div></div>
   <nav class="nav-pills">${T.map(([k,v])=>`<button data-tab="${k}" class="nav-pill ${tab===k?'active':''}">${v}</button>`).join('')}
   ${investorHome?`<button type="button" class="nav-pill" data-openmap="1">${tr('openMap')}</button>`:''}
   ${bellHtml()}
   ${S.user?`<button id="logout" class="nav-pill">${tr('logout')} (${esc(S.user.name)})</button>`:''}
   <button data-lang="en" class="nav-pill lang-btn ${S.lang==='en'?'active':''}">EN</button><button data-lang="es" class="nav-pill lang-btn ${S.lang==='es'?'active':''}">ES</button></nav></header>
   <div class="guide-banner"><span>${tr('newHere')} <a href="#guides" data-tab="guides">${tr('guideLink')}</a></span></div>${alertSheet()}${msgBubble()}${msgPanel()}`;
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
  const searchable=!limited()?(l.address+' '+(l.publicTitle||'')+' '+l.city+' '+l.zip):(partialAddr(l)+' '+l.city);
  if(q&&!searchable.toLowerCase().includes(q))return false;
  if(F.area&&!(l.areas||[]).includes(F.area))return false;
  if(CHIP==='AVAILABLE'&&l.status!=='AVAILABLE')return false;if(CHIP==='COMING_SOON'&&l.status!=='COMING_SOON')return false;
  if(!limited()){
    if(CHIP==='LOW_DOWN'&&(l.downPayment||1e9)>1000000)return false;if(CHIP==='LOW_MONTHLY'&&(l.monthlyPayment||1e9)>150000)return false;if(CHIP==='BEDS_3'&&(l.beds||0)<3)return false;
    if(F.beds&&(l.beds||0)<+F.beds)return false;if(F.baths&&(l.baths||0)<+F.baths)return false;
    if(F.maxDown&&l.downPayment>F.maxDown*100)return false;if(F.maxMonthly&&l.monthlyPayment>F.maxMonthly*100)return false;
    if(F.maxPrice&&l.askingPrice>F.maxPrice*100)return false;if(F.status&&l.status!==F.status)return false;
  }
  return true;});
  const PRIV=['priceAsc','priceDesc','downAsc','monthlyAsc','bedsDesc'];let so=F.sort||'newest';if(limited()&&PRIV.includes(so))so='newest';
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
    .concat(!limited()?[['LOW_DOWN',`🔥 ${es?'Enganche':'Down'} ≤ $10,000`],['LOW_MONTHLY',`💳 ${es?'Mensualidad':'Monthly'} ≤ $1,500`],['BEDS_3',`🛏️ 3+ ${es?'Recámaras':'Bedrooms'}`]]:[])
    .concat([['COMING_SOON',`⏳ ${es?'Próximamente':'Coming Soon'} (${nCs})`]]);
  const guestNotice=!S.user?`<div class="card" style="padding:12px 16px;margin-bottom:14px;background:linear-gradient(135deg,#1e293b,#0f172a);color:#fff;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px">
    <div style="max-width:560px"><div style="font-weight:700;color:#f8d57e;margin-bottom:3px">🔒 ${tr('guestBannerTitle')}</div><div style="font-size:12.5px;color:#e2e8f0">${tr('guestBannerBody')}</div></div>
    <button data-register="1" class="btn-card primary" style="flex:0 0 auto">${tr('guestBannerBtn')}</button></div>`:'';
  return `<section class="hero-banner"><div class="hero-inner"><div class="hero-copy"><h2>${es?'El Portafolio Premier de Owner-Finance en Oklahoma':"Oklahoma's Premier Owner-Finance Portfolio"}</h2>
    <p>${es?'Casas con financiamiento del dueño en Oklahoma City, Del City, Midwest City, Yukon y alrededores.':'Owner-financed homes across Oklahoma City, Del City, Midwest City, Yukon, and surrounding communities.'}</p></div>
    <div class="hero-stats"><div class="stat-box"><div class="stat-num">${all.length}</div><div class="stat-lbl">${es?'Casas Activas':'Active Homes'}</div></div>
    <div class="stat-box"><div class="stat-num">${nAv}</div><div class="stat-lbl">${es?'Disponibles':'Available Now'}</div></div>
    ${!limited()&&minDown?`<div class="stat-box"><div class="stat-num">$${(minDown/100000).toFixed(1)}k+</div><div class="stat-lbl">${es?'Enganche Mín':'Min Down'}</div></div>`:''}</div></div></section>
  <form id="filters" class="interactive-controls" onsubmit="return false"><div class="filter-row">
   <div class="search-box"><input name="q" placeholder="${!limited()?tr('searchPlaceholder'):tr('searchPlaceholderGuest')}" value="${esc(F.q)}"></div>${(()=>{const o=[['newest',tr('sortNewest')],['cityAz',tr('sortCityAz')]].concat(!limited()?[['priceAsc',tr('sortPriceAscL')],['priceDesc',tr('sortPriceDescL')],['downAsc',tr('sortDownAscL')],['monthlyAsc',tr('sortMonthlyAscL')]]:[]);const cur=o.some(x=>x[0]===F.sort)?F.sort:'newest';return `<select name="sort" class="filter-select sort-select" aria-label="${tr('sortBy')}" title="${tr('sortBy')}">${o.map(([v,t])=>`<option value="${v}" ${cur===v?'selected':''}>${esc(tr('sortBy'))}: ${esc(t)}</option>`).join('')}</select>`})()}
   ${!limited()?`<div class="slider-group">${tr('maxDown').replace(' $','')}: <b>${dv>=40000?(es?'Cualquiera':'Any'):'$'+(+dv).toLocaleString()}</b><input type="range" name="maxDownR" min="3000" max="40000" step="500" value="${dv}"></div>
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
  if(limited()){
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
    <div class="card-actions"><button type="button" class="btn-card primary" data-open="${l.id}">${S.lang==='es'?'Ver Detalles':'View Details'}</button>${S.isAdmin()&&S.caps&&S.caps.ready?`<button type="button" class="btn-card" data-activity="${esc(l.id)}">${tr('activity.button')}</button>`:''}</div></div></article>`;
}

function drawMap(){if(!window.L||!$('#inventory-map'))return;if(map){map.remove();map=null;}MARK={};
  map=L.map('inventory-map').setView([35.47,-97.52],10);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
  const pts=[];filtered().forEach(l=>{const a=l.approxLocation||{};const lat=!limited()?l.latitude:a.lat,lng=!limited()?l.longitude:a.lng;if(lat==null||lng==null)return;
   pts.push([lat,lng]);
   const popupHtml=!limited()
     ?`<b>${title(l)}</b><br>${S.money(l.askingPrice)} · ${tr('down')} ${S.money(l.downPayment)} · ${S.money(l.monthlyPayment)}${tr('perMo')}<br><a href="#" data-open="${l.id}">${tr('viewDetails')}</a>`
     :`<b>📍 ${partialAddr(l)}</b><br><a href="#" data-open="${l.id}">${tr('viewPhotos')}</a> · <a href="#auth" data-register="1">${tr('loginPromptLink')}</a>`;
   const m=L.marker([lat,lng]).addTo(map).bindPopup(popupHtml);MARK[l.id]=m;
   m.on('click',()=>{const c=document.querySelector(`[data-card="${l.id}"]`);if(c){c.scrollIntoView({behavior:'smooth',block:'center'});c.style.borderColor='var(--accent)';setTimeout(()=>c.style.borderColor='',1500);}});});
  if(pts.length)map.fitBounds(pts,{padding:[30,30],animate:false});
  document.querySelectorAll('[data-card]').forEach(c=>{c.onmouseenter=()=>{const m=MARK[c.dataset.card];if(m)m.openPopup();};});
  setTimeout(()=>map&&map.invalidateSize(),150);}

function openListing(id){const l=S.listing(id);if(!l)return;if(!(S.isInvestor()&&S.ownsListing(l)))S.recordView(id);const ph=(l.photoUrls&&l.photoUrls.length?l.photoUrls:[l.photoUrl||'listing-placeholder.svg']);
  if(S.isInvestor()&&S.caps&&S.caps.investor&&!S.isPendingApproval(S.user))return S.ownsListing(l)?openOwnEditor(l):openInvestorReadonly(l);
  if(limited()){
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
 <form id="regF" class="card" style="padding:16px"><h2>${tr('registerTitle')}</h2><select name="role" id="roleSel"><option value="BUYER">${tr('roleBuyer')}</option><option value="AGENT">${tr('roleAgent')}</option>${S.caps&&S.caps.investor?`<option value="INVESTOR">${tr('roleInvestor')}</option>`:''}</select>
 <input name="name" placeholder="${tr('fullName')}" required><input name="email" type="email" placeholder="${tr('email')}" required><input name="phone" placeholder="${tr('phone')}"><input name="password" type="password" placeholder="${tr('passwordMin')}" minlength="8" required>
 <div id="buyerFields"><input name="inviteCode" id="inv" placeholder="${tr('inviteCode')}"><label><input type="checkbox" id="noAgent"> ${tr('noAgentYet')}</label></div>
 <div id="agentFields" style="display:none"><input name="licenseNumber" placeholder="${tr('orecLicense')}"><input name="brokerage" placeholder="${tr('brokerage')}"></div>
 <div id="investorFields" style="display:none"><input name="businessName" placeholder="${tr('businessName')}"><select name="contactMethod"><option value="">${tr('contactMethod')}</option><option value="PHONE">${tr('contactPhone')}</option><option value="EMAIL">${tr('contactEmail')}</option><option value="WHATSAPP">${tr('contactWhatsApp')}</option><option value="TEXT">${tr('contactText')}</option></select><input name="contactValue" placeholder="${tr('contactValue')}"><input name="representativeName" placeholder="${tr('representativeName')}"></div>
 <button>${tr('createAccount')}</button></form></section>`;}

function investorThanks(){const p=S.user&&S.user.investorProfile||{};return `<section class="inv-banner" id="investor-thanks"><h2>${tr('investorThanksTitle')}</h2><p>${tr('investorThanks')}</p>${p.contactMethod?`<p class="ops-meta">${esc(p.businessName||'')} · ${esc(p.representativeName||'')} · ${esc(p.contactMethod)}: ${esc(p.contactValue||'')}</p>`:''}</section>`;}
function investorGate(){
  if(!S.user)return auth();
  if(!S.isInvestor())return `<p style="padding:18px">${tr('adminsOnly')}</p>`;
  if(!(S.caps&&S.caps.investor))return `<section class="inv-banner"><h2>${tr('roleInvestor')}</h2><p>${tr('investorNotReady')}</p></section>`;
  if(S.isPendingApproval(S.user))return investorThanks();
  return '';
}
function footerLinks(){
  const P=window.LegacyPwa;if(!P)return '';
  const canDelete=S.user&&S.user.role!=='ADMIN';
  return `<div class="pwa-foot" style="margin-top:6px"><a href="/privacy.html" target="_blank" rel="noopener">${esc(P.t('privacyLink'))}</a> · <button type="button" data-install-app>${esc(P.t('installLink'))}</button>${canDelete?` · <button type="button" data-delete-account>${esc(P.t('deleteLink'))}</button>`:''}</div>`;
}
function accountDeleteCard(){
  const P=window.LegacyPwa;if(!P||!S.user||S.user.role==='ADMIN')return '';
  return `<div style="margin-top:16px"><button type="button" class="btn-card" data-delete-account style="color:#b91c1c;border-color:#b91c1c">${esc(P.t('deleteLink'))}</button></div>`;
}
function investorDash(){return investorGate()||investorHomeHtml();}
function feedKind(k){return tr({SHOWING:'feedShowing',OFFER:'feedOffer',CONTRACT:'feedContract',CLOSED:'feedClosed'}[k]||'notifications');}
function investorHomeHtml(){
  const home=S.investorHome||{homes:[],totals:{},feed:[]};
  const t=home.totals||{};
  const tile=(key,n,label)=>`<button type="button" class="inv-tile" data-metric="${key}"><b>${n||0}</b><span>${label}</span></button>`;
  const rows=(home.homes||[]).map(h=>`<tr><td><button type="button" class="btn-card" data-editown="${esc(h.id)}">${esc(h.address)}, ${esc(h.city)}</button></td><td>${esc(S.statusText?S.statusText(h.status):h.status)}</td><td><button type="button" class="btn-card" data-views="${esc(h.id)}">${h.views||0}</button></td><td><button type="button" class="btn-card" data-favs="${esc(h.id)}">${h.favorites||0}</button></td></tr>`).join('');
  const feed=(home.feed||[]).map(it=>{const detail=it.kind==='SHOWING'&&it.detail&&S.formatShowingWhen?S.formatShowingWhen(it.detail):(it.detail&&it.detail!==it.status?it.detail:'');return `<article class="ops-showing"><div class="ops-showing-head"><b>${esc(feedKind(it.kind))}</b><span>${esc(formatInstant(it.at)||'')}</span></div><div>${esc(it.address||'')}${it.city?', '+esc(it.city):''}</div><p class="ops-meta">${esc(it.status||'')} ${esc(detail||'')}</p></article>`;}).join('');
  const prof=S.user.investorProfile||{};
  return `<section id="investor-home" style="padding:18px;display:grid;gap:16px">
    <div class="card" style="padding:16px"><h2>${tr('navInvestorHome')}</h2><p class="ops-meta">${esc(prof.businessName||S.user.name||'')} · ${esc(prof.representativeName||'')}</p>
    <div class="inv-tiles">${tile('views',t.views,tr('totalViews'))}${tile('favorites',t.favorites,tr('totalFavorites'))}${tile('closed',t.closedYtd,tr('closedYtd'))}${tile('contract',t.underContract,tr('underContract'))}</div>
    <div class="table-scroll"><table><tr><th>${tr('colAddress')}</th><th>${tr('colStatus')}</th><th>${tr('totalViews')}</th><th>${tr('totalFavorites')}</th></tr>${rows||`<tr><td colspan="4">${tr('noneYet')}</td></tr>`}</table></div></div>
    <div class="card ops-card"><h2>${tr('notifications')}</h2>${feed||`<p>${tr('noneYet')}</p>`}</div>
    <div class="card" style="padding:16px"><h3>${tr('changePw')}</h3><form id="pwF"><input name="cur" type="password" placeholder="${tr('currentPw')}" required><input name="pw" type="password" placeholder="${tr('newPw')}" minlength="8" required><button>${tr('updatePw')}</button></form></div>
  </section>`;
}
function openMetric(kind){
  const home=S.investorHome||{};
  const rows=kind==='views'?(home.homes||[]).filter(h=>h.views>0):kind==='favorites'?(home.homes||[]).filter(h=>h.favorites>0):kind==='closed'?(home.closedYtd||[]):(home.underContract||[]);
  const label=tr(kind==='views'?'totalViews':kind==='favorites'?'totalFavorites':kind==='closed'?'closedYtd':'underContract');
  const m=modal(`<h2>${label}</h2><ul class="ops-list">${rows.map(r=>`<li><button type="button" class="btn-card" data-jump="${esc(r.id)}">${esc(r.address)}, ${esc(r.city)}</button>${r.views!=null?`<span>${r.views}</span>`:''}</li>`).join('')||`<li>${tr('noneYet')}</li>`}</ul>`);
  m.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{m.remove();openListing(b.dataset.jump);});
}
function openPeople(id,kind){
  const h=((S.investorHome&&S.investorHome.homes)||[]).find(x=>x.id===id);if(!h)return;
  const list=kind==='favs'?h.favoriters||[]:h.viewers||[];
  modal(`<h2>${esc(h.address)}</h2><p>${kind==='favs'?tr('favoritedBy'):tr('viewedBy')}</p><ul class="ops-list">${list.map(v=>`<li><b>${esc(v.name||'—')}</b><span>${esc(v.role||'')} ${v.count!=null?'· '+v.count:''}</span></li>`).join('')||`<li>${tr('noneYet')}</li>`}</ul>`);
}
function txShowingActs(sh){
  const st=String(sh.status||'REQUESTED').toUpperCase();
  if(st==='REQUESTED')return `<button type="button" data-showacc="${esc(sh.id)}" style="background:#16a34a;color:#fff">${S.lang==='es'?'Aprobar':'Approve'}</button> <button type="button" data-showden="${esc(sh.id)}" style="background:#dc2626;color:#fff">${S.lang==='es'?'Rechazar':'Deny'}</button>`;
  if(st==='APPROVED')return `<button type="button" data-showcan="${esc(sh.id)}">${tr('cancelShowing')}</button> <button type="button" data-showmsg="${esc(sh.id)}">${tr('messageAgent')}</button>`;
  return '—';
}
function investorTxHtml(){
  const tx=S.investorTx||{offers:[],approvedShowings:[],underContract:[],inspectionsThisWeek:[],closed:[]};
  const line=(r,extra)=>`<tr><td>${esc(r.address||'')}${r.city?', '+esc(r.city):''}</td><td>${extra}</td></tr>`;
  const offers=(tx.offers||[]).map(o=>line(o,`${esc(o.buyerName||'—')} · ${S.money(o.offerPrice)} ${offerBadge(o.status)}`)).join('');
  const shows=(tx.approvedShowings||[]).map(sh=>`<tr><td>${esc(sh.address||'')}${sh.city?', '+esc(sh.city):''}</td><td>${esc(S.formatShowingWhen?S.formatShowingWhen(sh.preferredAt):sh.preferredAt)}</td><td>${esc(sh.requester||'—')}</td><td>${txShowingActs(sh)}</td></tr>`).join('');
  const req=(tx.showings||[]).filter(sh=>sh.status==='REQUESTED').map(sh=>`<tr><td>${esc(sh.address||'')}</td><td>${esc(S.formatShowingWhen?S.formatShowingWhen(sh.preferredAt):sh.preferredAt)}</td><td>${esc(sh.requester||'—')}</td><td>${txShowingActs(sh)}</td></tr>`).join('');
  const closingOfHome=id=>Object.values(S.closings||{}).find(c=>c.listingId===id&&c.outcome==='PENDING'&&c.closingDate);
  const under=(tx.underContract||[]).map(r=>{const c=closingOfHome(r.id);return line(r,esc(S.statusText(r.status))+(c?` · 🏁 ${cx('closingDate')}: <b>${esc(fmtYmd(c.closingDate))}</b>${c.inspectionsWaived?' · '+cx('waived'):''}`:''));}).join('');
  const insp=(tx.inspectionsThisWeek||[]).map(r=>line(r,esc(formatInstant(r.inspectionAt)||r.inspectionAt||''))).join('');
  return `<section id="investor-tx" style="padding:18px;display:grid;gap:16px">
    <div class="card" style="padding:16px"><h2>${tr('offersReceived')}</h2><table><tr><th>${tr('colProperty')}</th><th>${tr('colOffer')}</th></tr>${offers||`<tr><td colspan="2">${tr('noneYet')}</td></tr>`}</table></div>
    <div class="card" style="padding:16px"><h2>${S.lang==='es'?'Solicitudes de visita':'Showing requests'}</h2><table><tr><th>${tr('colProperty')}</th><th>${S.lang==='es'?'Fecha/hora':'Date/time'}</th><th>${S.lang==='es'?'Agente':'Agent'}</th><th>${tr('colActions')}</th></tr>${req||`<tr><td colspan="4">${tr('noneYet')}</td></tr>`}</table></div>
    <div class="card" style="padding:16px"><h2>${tr('approvedShowings')}</h2><table><tr><th>${tr('colProperty')}</th><th>${S.lang==='es'?'Fecha/hora':'Date/time'}</th><th>${S.lang==='es'?'Agente':'Agent'}</th><th>${tr('colActions')}</th></tr>${shows||`<tr><td colspan="4">${tr('noneYet')}</td></tr>`}</table></div>
    <div class="card" style="padding:16px"><h2>${tr('underContract')}</h2><table>${under||`<tr><td>${tr('noneYet')}</td></tr>`}</table></div>
    <div class="card" style="padding:16px"><h2>${tr('inspectionsWeek')}</h2><table>${insp||`<tr><td>${tr('noneYet')}</td></tr>`}</table><p><button type="button" class="btn-card primary" data-closed="1">${tr('closedDeals')}</button></p></div>
  </section>`;
}
function openClosedDeals(){
  const closed=(S.investorTx&&S.investorTx.closed)||[];
  const body=closed.map(c=>`<article class="ops-showing"><b>${esc(c.address)}, ${esc(c.city)}</b><p class="ops-meta">${esc(S.statusText(c.status))} ${c.soldAt?esc(formatInstant(c.soldAt)):''}${(()=>{const cl=Object.values(S.closings||{}).find(x=>x.listingId===c.id&&x.outcome==='CLOSED');return cl&&cl.closingDate?' · 🏁 '+cx('closingDate')+': '+esc(fmtYmd(cl.closingDate)):'';})()}</p><ul>${(c.documents||[]).map(d=>`<li><a href="${esc(d.dataUrl)}" target="_blank" rel="noopener">${esc(d.name||tr('documents'))}</a> <i>${esc(d.docType||'')}</i></li>`).join('')||`<li>${tr('noDocs')}</li>`}</ul></article>`).join('');
  modal(`<h2>${tr('closedDeals')}</h2>${body||`<p>${tr('noneYet')}</p>`}`);
}
function investorTx(){return investorGate()||investorTxHtml();}
let MAPSCOPE='mine';
function investorMap(){
  const blocked=investorGate();if(blocked)return blocked;
  return `<section class="inv-map-page" id="investor-map-page"><div class="inv-tiles" style="grid-template-columns:auto auto 1fr"><button type="button" class="btn-card ${MAPSCOPE==='mine'?'primary':''}" data-mapscope="mine">${tr('mapMine')}</button><button type="button" class="btn-card ${MAPSCOPE==='all'?'primary':''}" data-mapscope="all">${tr('mapAll')}</button><span class="ops-meta">${tr('viewOnly')}</span></div><div id="investor-map"></div></section>`;
}
function drawInvestorMap(){
  const el=$('#investor-map');if(!window.L||!el)return;if(map){try{map.remove();}catch(e){}map=null;}
  map=L.map(el).setView([35.47,-97.52],10);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
  const rows=(S.data.listings||[]).filter(l=>MAPSCOPE==='all'||S.ownsListing(l));
  const pts=[];
  rows.forEach(l=>{const a=l.approxLocation||{};const lat=l.latitude!=null?+l.latitude:(a.lat!=null?+a.lat:null),lng=l.longitude!=null?+l.longitude:(a.lng!=null?+a.lng:null);if(lat==null||lng==null)return;pts.push([lat,lng]);
    const own=S.ownsListing(l);
    const popup=own?`<b>${esc(l.address)}</b><br><a href="#" data-editown="${esc(l.id)}">${tr('editHome')}</a>`:`<b>${esc(l.address)}</b><br>${tr('viewOnly')}<br><a href="#" data-open="${esc(l.id)}">${tr('viewDetails')}</a>`;
    L.circleMarker([lat,lng],{radius:8,color:own?'#c9a227':'#0b1f3a',fillColor:own?'#f8d57e':'#334155',fillOpacity:.95,weight:2}).addTo(map).bindPopup(popup);
  });
  if(pts.length)map.fitBounds(pts,{padding:[30,30],animate:false});
  setTimeout(()=>map&&map.invalidateSize(),180);
}
function openOwnEditor(l){
  const dollars=v=>v==null||v===''?'':String(Math.round(Number(v)/100));
  const m=modal(`<h2>${tr('editHome')}</h2><p>${esc(l.address||'')}</p><form id="invEdit" class="feedback-form">
    <label>${tr('colAddress')}<input name="address" value="${esc(l.address||'')}" required></label>
    <label>${tr('city')}<input name="city" value="${esc(l.city||'')}"></label>
    <label>${tr('status')}<select name="status">${S.STATUSES.map(s=>`<option value="${s}" ${l.status===s?'selected':''}>${esc(S.statusText(s))}</option>`).join('')}</select></label>
    <label>${tr('price')} $<input name="askingPrice" type="number" min="0" step="1" value="${dollars(l.askingPrice)}"></label>
    <label>${tr('down')} $<input name="downPayment" type="number" min="0" step="1" value="${dollars(l.downPayment)}"></label>
    <label>${tr('monthly')} $<input name="monthlyPayment" type="number" min="0" step="1" value="${dollars(l.monthlyPayment)}"></label>
    <label>${tr('beds')}<input name="beds" type="number" min="0" step="1" value="${l.beds??''}"></label>
    <label>${tr('baths')}<input name="baths" type="number" min="0" step="0.5" value="${l.baths??''}"></label>
    <label>${tr('sqft')}<input name="sqft" type="number" min="0" step="1" value="${l.sqft??''}"></label>
    <label>${tr('notes')}<textarea name="description">${esc(l.description||'')}</textarea></label>
    <label>${tr('inspectionDate')}<input name="inspectionAt" type="datetime-local" value="${esc(toLocalInput(l.inspectionAt))}"></label>
    <button class="btn-card primary">${tr('save')}</button></form>`);
  const form=m.querySelector('#invEdit');
  form.onsubmit=wrap(async()=>{
    const v=fd(form);
    await S.saveOwnListing(l.id,{address:v.address,city:v.city,status:v.status,description:v.description,askingPrice:Math.round(Number(v.askingPrice||0)*100),downPayment:Math.round(Number(v.downPayment||0)*100),monthlyPayment:Math.round(Number(v.monthlyPayment||0)*100),beds:v.beds===''?null:Number(v.beds),baths:v.baths===''?null:Number(v.baths),sqft:v.sqft===''?null:Number(v.sqft),inspectionAt:v.inspectionAt||''});
    alert(tr('savedAlert'));m.remove();render();
  });
}
function openInvestorReadonly(l){
  modal(`<h2>${title(l)}</h2><p class="ops-meta">${tr('viewOnly')}</p>${badge(l.status)}${tenureHtml(l)}
   <p>${tr('price')} <b>${S.money(l.askingPrice)}</b> · ${tr('down')} <b>${S.money(l.downPayment)}</b> · ${tr('monthly')} <b>${S.money(l.monthlyPayment)}</b></p>
   <p>${l.beds??'—'} ${tr('bdShort')} · ${l.baths??'—'} ${tr('baShort')} · ${l.sqft?l.sqft+' '+tr('sqftUnit'):''}</p>
   <p>${esc(l.description||'')}</p>`);
}
function investorAdminCard(){
  if(!(S.caps&&S.caps.investor))return '';
  const pack=S.investorAdmin||{investors:[],catalog:[]};
  if(!S.investorAdmin)return `<div class="card" style="padding:16px"><h2>${tr('investorsTitle')}</h2><p>${tr('activity.loading')}</p></div>`;
  const blocks=(pack.investors||[]).map(inv=>{
    const sheets=(inv.sheets||[]).map(s=>s.url||s.spreadsheetId).join('\n');
    const owned=(inv.listings||[]).map(l=>`<li>${esc(l.address)}, ${esc(l.city)} <button type="button" data-unassign="${esc(inv.userId)}|${esc(l.id)}">${tr('unassign')}</button></li>`).join('');
    const options=(pack.catalog||[]).filter(l=>l.investorId!==inv.userId).map(l=>`<option value="${esc(l.id)}">${esc(l.address)}, ${esc(l.city)}</option>`).join('');
    return `<article class="ops-showing"><b>${esc(inv.businessName||inv.name)}</b> · ${esc(inv.approvalStatus||'')} · ${esc(inv.email||'')}<p class="ops-meta">${esc(inv.representativeName||'')} · ${esc(inv.contactMethod||'')}: ${esc(inv.contactValue||'')}</p>
      <form data-sheets="${esc(inv.userId)}"><label>${tr('sheetsLabel')}<textarea name="sheets" rows="3">${esc(sheets)}</textarea></label><button class="btn-card primary">${tr('save')}</button></form>
      <p class="ops-meta">${tr('sheetNote')}</p>
      <form data-assign="${esc(inv.userId)}"><label>${tr('assignHome')}<select name="listingId"><option value="">—</option>${options}</select></label><button class="btn-card">${tr('assignHome')}</button></form>
      <ul>${owned||`<li>${tr('noneYet')}</li>`}</ul></article>`;
  }).join('');
  return `<div class="card" id="investor-admin" style="padding:16px"><h2>${tr('investorsTitle')}</h2>${blocks||`<p>${tr('noneYet')}</p>`}</div>`;
}
function dashboard(){if(!S.user)return auth();if(S.isInvestor())return investorDash();const u=S.user,ap=S.agentProfile(u),ag=S.agentFor(u),D=S.data;
  const favs=D.favorites.filter(f=>f.userId===u.id).map(f=>S.listing(f.listingId)).filter(Boolean);
  const views=D.propertyViews.filter(v=>v.userId===u.id).slice(-10).reverse().map(v=>S.listing(v.listingId)).filter(Boolean);
  const clientIds=ap?new Set(S.clientsOf(u).map(c=>c.id)):new Set();
  const offers=D.offers.filter(o=>o.userId===u.id||clientIds.has(o.userId)),docs=D.documents.filter(d=>d.userId===u.id),msgs=S.myMessages().slice().reverse();
  const contacts=ap?S.clientsOf(u):(ag?[ag]:[]),nm=id=>(D.users.find(x=>x.id===id)||{}).name||'—';
  const li=l=>`<li><a href="#" data-open="${l.id}">${title(l)}</a> ${badge(l.status)}</li>`;
  return `${S.isPendingApproval(u)?`<div style="margin:18px 18px 0;padding:12px;border-radius:10px;background:#fef3c7;border:1px solid #d97706">⏳ ${S.lang==='es'?(u.approvalStatus==='REJECTED'?'Tu cuenta no fue aprobada. Contáctanos para más información.':'Tu cuenta está pendiente de aprobación. Mientras tanto puedes ver casas; podrás hacer ofertas y pedir citas cuando sea aprobada.'):(u.approvalStatus==='REJECTED'?'Your account was not approved. Contact us for more information.':'Your account is pending approval. You can browse homes meanwhile; offers and showings unlock once approved.')}</div>`:''}<section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;padding:18px">${alertsDash()}${showingsDash()}
  <div class="card" style="padding:16px"><h2>${tr('myProfile')}</h2><img src="${esc(u.avatarUrl||'listing-placeholder.svg')}" style="width:90px;height:90px;border-radius:50%;object-fit:cover"><input type="file" id="avatar" accept="image/*">
   <form id="profF"><input name="name" value="${esc(u.name)}"><input name="phone" value="${esc(u.phone)}">${ap?`<label>${tr('orecLicense')}<input name="licenseNumber" value="${esc(ap.licenseNumber)}"></label><label>${tr('brokerage')}<input name="brokerage" value="${esc(ap.brokerage)}"></label><p>${tr('yourInviteCode')} <b>${esc(ap.inviteCode)}</b></p>`:''}<button>${tr('save')}</button></form>
   ${ag?`<p>${tr('yourAgent')} <b>${esc(ag.name)}</b></p>`:''}<h3>${tr('changePw')}</h3><form id="pwF"><input name="cur" type="password" placeholder="${tr('currentPw')}" required><input name="pw" type="password" placeholder="${tr('newPw')}" minlength="8" required><button>${tr('updatePw')}</button></form>${accountDeleteCard()}</div>
  ${isClient()?`<div class="card" style="padding:16px"><h2>🏡 ${st('mySearch')}</h2>${critSummary(critOf(u))}<button type="button" class="btn-card primary" data-editsearch="1">✏️ ${st('edit')}</button></div>`:''}
  <div class="card" style="padding:16px"><h2>${tr('favorites')}</h2><ul>${favs.map(li).join('')||`<li>${tr('noneYet')}</li>`}</ul><h2>${tr('viewedHomes')}</h2><ul>${views.map(li).join('')||`<li>${tr('noneYet')}</li>`}</ul></div>
  <div class="card" style="padding:16px"><h2>${tr('messages')}</h2>${contacts.length?`<form id="msgF"><select name="toUserId">${contacts.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
   <select name="listingId"><option value="">${tr('propAddress')}</option>${D.listings.map(l=>`<option value="${l.id}">${esc(l.address)}, ${esc(l.city)}</option>`).join('')}</select>
   <select name="kind"><option value="MESSAGE">${tr('kindMsg')}</option><option value="REQUEST_ACCESS">${tr('requestAccess')}</option><option value="SHARE_HOUSE">${tr('shareHouse')}</option></select><textarea name="body" placeholder="${tr('kindMsg')}" required></textarea><button>${tr('send')}</button></form>`:`<p>${tr('noAgentLinked')}</p>`}
   <ul>${msgs.map(m=>`<li><b>${esc(nm(m.fromUserId))}</b> → ${esc(nm(m.toUserId))} ${m.listingId?'('+esc((S.listing(m.listingId)||{}).address)+')':''} <i>${esc(kindLabel(m.kind))}</i>: ${esc(m.body)}</li>`).join('')}</ul></div>
  <div class="card" style="padding:16px"><h2>${tr('myOffers')}</h2><ul>${offers.map(o=>{const l=S.listing(o.listingId)||{};const mine=o.userId===u.id;return `<li>${esc(l.address)} — ${S.money(o.offerPrice)} ${offerBadge(o.status)}${mine?'':` <small>· ${cx('clientOffer')}: ${esc(nm(o.userId))}</small>`}
   ${o.status==='COUNTERED'?`<div style="color:#d97706">${tr('counterLabel')}: ${S.money(o.counterPrice)} / ${tr('down')} ${S.money(o.counterDown)} / ${S.money(o.counterMonthly)}${tr('perMo')}. ${esc(o.adminNotes)}</div>`:''}
   ${o.status==='ACCEPTED'&&mine?`<div class="tx-box" style="border:2px solid #16a34a;padding:8px;border-radius:8px;margin:6px 0"><b>${tr('txDocs')}</b>${S.TX_DOCS.map(t=>{const has=docs.find(d=>d.offerId===o.id&&d.docType===t.type);
     const docLabel=S.lang==='es'?(t.labelEs||t.label):t.label;
     return `<div>${docLabel}: ${has?'✅ '+esc(has.name):`<input type="file" data-txdoc="${t.type}" data-offer="${o.id}" data-listing="${o.listingId}">`}</div>`;}).join('')}${(o.inspections&&!(S.closings[o.id]&&S.closings[o.id].inspectionsWaived))?(()=>{const rep=docs.find(d=>d.offerId===o.id&&d.docType==='INSPECTION_REPORT');return `<div style="margin-top:8px;padding:8px;border:1px dashed #0284c7;border-radius:8px"><b>🔍 ${S.lang==='es'?'Inspecciones':'Inspections'}</b><br>${o.inspectionStatus==='SCHEDULED'?`${S.lang==='es'?'Programada':'Scheduled'}: <b>${esc(new Date(o.inspectionAt).toLocaleString())}</b> <button type="button" data-inspcancel="${o.id}" style="background:#dc2626;color:#fff">${S.lang==='es'?'Cancelar inspección':'Cancel inspection'}</button>`:`${o.inspectionStatus==='CANCELLED'?`<i>${S.lang==='es'?'Inspección cancelada':'Inspection cancelled'}</i><br>`:''}${S.lang==='es'?'Fecha y hora':'Date & time'}: <input type="datetime-local" id="insp-${o.id}"> <button type="button" data-inspsched="${o.id}">${S.lang==='es'?'Programar':'Schedule'}</button>`}<div style="margin-top:6px">${S.lang==='es'?'Reporte de inspección':'Inspection report'}: ${rep?'✅ '+esc(rep.name):`<input type="file" data-txdoc="INSPECTION_REPORT" data-offer="${o.id}" data-listing="${o.listingId}">`}</div></div>`;})():''}</div>`:''}${closingPanel(o)}</li>`;}).join('')||`<li>${tr('noneYet')}</li>`}</ul></div>
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
  return `<section style="padding:18px;display:grid;gap:16px">${investorAdminCard()}
  ${(()=>{const pend=D.users.filter(u=>u.approvalStatus==='PENDING');return `<div class="card" style="padding:16px;border:2px solid #d97706"><h2>⏳ ${S.lang==='es'?'Cuentas Pendientes de Aprobación':'Accounts Pending Approval'} (${pend.length})</h2><table><tr><th>${tr('colName')}</th><th>${tr('email')}</th><th>${tr('colRole')}</th><th>${S.lang==='es'?'Licencia / Correduría':'License / Brokerage'}</th><th>${S.lang==='es'?'Registro':'Signed up'}</th><th>${tr('colActions')}</th></tr>${pend.map(u=>{const ap=S.agentProfile(u);return `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(roleLabel(u.role))}</td><td>${esc(ap?(ap.licenseNumber||'')+' / '+(ap.brokerage||''):(u.investorProfile?(u.investorProfile.businessName||'')+' / '+(u.investorProfile.representativeName||'')+' / '+(u.investorProfile.contactMethod||'')+': '+(u.investorProfile.contactValue||''):'—'))}</td><td>${esc(new Date(u.createdAt).toLocaleDateString())}</td><td><button data-approve="${u.id}" style="background:#16a34a;color:#fff">${S.lang==='es'?'Aprobar':'Approve'}</button> <button data-decline="${u.id}" style="background:#dc2626;color:#fff">${S.lang==='es'?'Rechazar':'Decline'}</button></td></tr>`;}).join('')||`<tr><td colspan=6>${S.lang==='es'?'No hay cuentas pendientes':'No accounts pending'}</td></tr>`}</table></div>`;})()}
<div class="card" style="padding:16px"><h2>${tr('recentOffers')}</h2><table><tr><th>${tr('colProperty')}</th><th>${tr('colBuyer')}</th><th>${tr('colOffer')}</th><th>${tr('colStatus')}</th><th>${tr('colActions')}</th></tr>
  ${D.offers.slice().reverse().map(o=>`<tr><td>${esc((S.listing(o.listingId)||{}).address)}</td><td>${esc((D.users.find(u=>u.id===o.userId)||{}).name)}</td><td>${S.money(o.offerPrice)} / ${S.money(o.downPayment)} / ${S.money(o.monthlyPayment)}</td><td>${offerBadge(o.status)}</td>
   <td>${(o.status==='CLOSED'||o.status==='FELL_THROUGH')?'—':`<button data-acc="${o.id}" style="background:#16a34a;color:#fff">${tr('accept')}</button> <button data-ctr="${o.id}" style="background:#d97706;color:#fff">${tr('counterOffer')}</button> <button data-rej="${o.id}" style="background:#dc2626;color:#fff">${tr('reject')}</button>`}</td></tr>${closingPanel(o)?`<tr><td colspan=5>${closingPanel(o)}</td></tr>`:''}`).join('')||`<tr><td colspan=5>${tr('noOffers')}</td></tr>`}</table></div>
  <div class="card" style="padding:16px"><h2>${tr('usersAgents')}</h2><table><tr><th>${tr('colName')}</th><th>${tr('email')}</th><th>${tr('colRole')}</th><th>${tr('colInvite')}</th><th>${tr('colResetPw')}</th></tr>${D.users.map(u=>{const ap=S.agentProfile(u);return `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(roleLabel(u.role))}</td><td>${esc(ap&&ap.inviteCode)}</td><td><button data-reset="${u.id}">${tr('reset')}</button></td></tr>`;}).join('')}</table></div>
  <div class="card" style="padding:16px"><h2>${S.lang==='es'?'Solicitudes de visita':'Showing requests'}</h2>
  <table><tr><th>${tr('colProperty')}</th><th>${S.lang==='es'?'Solicitado por':'Requested by'}</th><th>${S.lang==='es'?'Fecha/hora':'Date/time'}</th><th>${tr('colStatus')}</th><th>${tr('colActions')}</th></tr>
  ${(D.showings||[]).slice().sort((a,b)=>String(b.preferredAt||'').localeCompare(String(a.preferredAt||''))).map(sh=>{
    const l=S.listing(sh.listingId)||{};
    const u=(D.users.find(x=>x.id===sh.userId)||{});
    const st=String(sh.status||'REQUESTED').toUpperCase();
    const badge=st==='APPROVED'?'✅ '+tr('showingApproved'):st==='DENIED'?'❌ '+tr('showingDenied'):'⏳ '+tr('showingRequested');
    const acts=st==='REQUESTED'?`<button data-showacc="${sh.id}" style="background:#16a34a;color:#fff">${S.lang==='es'?'Aprobar':'Approve'}</button> <button data-showden="${sh.id}" style="background:#dc2626;color:#fff">${S.lang==='es'?'Rechazar':'Deny'}</button>`:(st==='APPROVED'&&S.caps&&S.caps.investor?`<button type="button" data-showcan="${sh.id}">${tr('cancelShowing')}</button> <button type="button" data-showmsg="${sh.id}">${tr('messageAgent')}</button>`:'—');
    return `<tr><td>${esc(l.address||sh.listingId)}${l.city?', '+esc(l.city):''}</td><td>${esc(u.name||'—')}</td><td>${esc(S.formatShowingWhen?S.formatShowingWhen(sh.preferredAt):sh.preferredAt)}</td><td>${badge}</td><td>${acts}</td></tr>`;
  }).join('')||`<tr><td colspan=5>${S.lang==='es'?'Aún no hay solicitudes de visita':'No showing requests yet'}</td></tr>`}
  </table></div>
  <div class="card" style="padding:16px"><h2>${tr('listings')}</h2><div class="table-scroll"><table><tr><th>${tr('colAddress')}</th><th>${tr('colStatus')}</th><th>${tr('price')} $</th><th>${tr('down')} $</th><th>${tr('monthly')} $</th><th></th></tr>${D.listings.map(l=>`<tr data-row="${l.id}"><td>${esc(l.address)}, ${esc(l.city)}</td>
   <td><select data-status="${l.id}">${S.STATUSES.map(s=>`<option value="${s}" ${l.status===s?'selected':''}>${S.statusText(s)}</option>`).join('')}</select></td>
   <td><input data-f="askingPrice" type="number" value="${l.askingPrice/100}" style="width:90px"></td><td><input data-f="downPayment" type="number" value="${l.downPayment/100}" style="width:80px"></td><td><input data-f="monthlyPayment" type="number" value="${l.monthlyPayment/100}" style="width:80px"></td><td class="listing-actions"><button type="button" data-save="${esc(l.id)}">${tr('save')}</button><button type="button" class="copy-link-btn" data-copylink="${esc(l.id)}">${tr('share.copyLink')}</button>${S.caps&&S.caps.ready?`<button type="button" class="copy-link-btn" data-activity="${esc(l.id)}">${tr('activity.button')}</button>`:''}${S.caps&&S.caps.investor?`<label style="display:block;font-size:11px;margin-top:6px">${tr('inspectionDate')}<input data-insp="${esc(l.id)}" type="datetime-local" value="${esc(toLocalInput(l.inspectionAt))}"></label>`:''}</td></tr>`).join('')}</table></div></div></section>`;}

function maybeOpenSharedDetail(){
  if(!S.user||!S.data||resetQueryActive()||!shareDetailAllowed())return;
  const id=shareId();
  if(!id||sharedDetailFor===id||!S.listing(id))return;
  sharedDetailFor=id;
  openListing(id);
}
function render(){captureMsgScroll();document.documentElement.lang=S.lang;syncMsgTitle();const root=$('#app-root');if(!S.data)return;if(map){try{map.stop();map.off();map.remove();}catch(e){}map=null;}
  const body={inventory,guides,dashboard,admin,auth,calendar:calendarView,'investor-tx':investorTx,'investor-map':investorMap}[tab]||inventory;root.innerHTML=header()+`<main>${body()}</main><footer style="padding:18px;font-size:12px;text-align:center">© Legacy - Owner Finance · Brokerage By: KLC Real Estate, LLC${footerLinks()}</footer>`;bind();applyMsgScroll();if(tab==='inventory')drawMap();if(tab==='investor-map')drawInvestorMap();maybeOpenSharedDetail();}
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
   const t=e.target.closest('[data-tab],[data-lang],[data-open],[data-fav],[data-acc],[data-rej],[data-ctr],[data-reset],[data-save],[data-client],[data-register],[data-login],[data-shareclear],[data-copylink],[data-calmode],[data-calnav],[data-showacc],[data-showden],[data-showcan],[data-showmsg],[data-approve],[data-decline],[data-inspsched],[data-inspcancel],[data-bell],[data-alertclose],[data-msgbubble],[data-msgclose],[data-msgpeer],[data-msgback],[data-msgsend],[data-msgnew],[data-feedback],[data-checkin],[data-checkout],[data-activity],[data-metric],[data-views],[data-favs],[data-openmap],[data-mapscope],[data-closed],[data-cldate],[data-clcomm],[data-clclose],[data-clfell],[data-editown],[data-unassign],#logout,#forgot');
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
     if(d.bell){alertOpen=!alertOpen;if(alertOpen)msgOpen=false;render();if(alertOpen)S.markAlertsRead();return;}
     if(d.alertclose){alertOpen=false;return render();}
     if(d.msgbubble){msgOpen=!msgOpen;if(msgOpen){alertOpen=false;msgNew=false;if(msgPeer)S.markThreadRead(msgPeer);}return render();}
     if(d.msgclose){msgOpen=false;return render();}
     if(d.msgback){msgPeer=null;msgNew=false;return render();}
     if(d.msgnew){msgNew=true;msgPeer=null;return render();}
     if(d.msgpeer){const peer=d.msgpeer;msgPeer=peer;msgNew=false;msgStickBottom=true;S.markThreadRead(peer).then(()=>{if(!msgOpen||msgPeer!==peer)return;const active=document.activeElement;if(active&&active.tagName==='TEXTAREA'){paintMsgBadge();return;}const sc=document.querySelector('.msg-log');if(sc)msgScroll=sc.scrollTop;msgStickBottom=false;render();});return render();}
     if(d.msgsend){submitMsgComposer();return;}
     if(d.feedback){const sh=(S.myShowings||[]).find(s=>s.id===d.feedback);if(sh)openFeedback(sh);return;}
     if(d.checkin||d.checkout){const id=d.checkin||d.checkout;const geo=await readGeo();await S.showingVisit(id,d.checkin?'in':'out',geo);alert(tr('showings.visitSaved'));return render();}
     if(d.activity){await openActivity(d.activity);return;}
     if(d.showacc){if(S.caps&&S.caps.investor)await S.decideShowing(d.showacc,'APPROVED');else S.respondShowing(d.showacc,'APPROVED');return render();}
     if(d.showden){if(confirm(S.lang==='es'?'¿Rechazar esta visita?':'Deny this showing?')){if(S.caps&&S.caps.investor)await S.decideShowing(d.showden,'DENIED');else S.respondShowing(d.showden,'DENIED');render();}return;}
     if(d.showcan){if(confirm(S.lang==='es'?'¿Cancelar esta visita aprobada?':'Cancel this approved showing?')){await S.decideShowing(d.showcan,'CANCELLED');render();}return;}
     if(d.showmsg){const body=prompt(tr('messageAgentPrompt'));if(body&&String(body).trim()){await S.messageShowingAgent(d.showmsg,String(body).trim());alert(tr('sentAlert'));}return;}
     if(d.metric){openMetric(d.metric);return;}
     if(d.views){openPeople(d.views,'views');return;}
     if(d.favs){openPeople(d.favs,'favs');return;}
     if(d.cldate||d.clcomm||d.clclose||d.clfell){await closingAction(d);return;}
     if(d.closed){openClosedDeals();return;}
     if(d.openmap){const u=new URL(location.href);u.hash='investor-map';window.open(u.toString(),'legacyInvestorMap');return;}
     if(d.mapscope){MAPSCOPE=d.mapscope==='all'?'all':'mine';return render();}
     if(d.editown){const home=S.listing(d.editown);if(home)openOwnEditor(home);return;}
     if(d.unassign){const parts=String(d.unassign).split('|');if(parts[0]&&parts[1]){await S.assignInvestorListings(parts[0],[],[parts[1]]);render();}return;}
     if(d.approve){await S.setApproval(d.approve,'APPROVED');return render();}if(d.decline){if(confirm(S.lang==='es'?'¿Rechazar esta cuenta?':'Decline this account?')){await S.setApproval(d.decline,'REJECTED');render();}return;}if(d.inspsched){const v=($('#insp-'+d.inspsched)||{}).value;if(!v)return alert(S.lang==='es'?'Selecciona fecha y hora':'Pick a date and time');S.setInspection(d.inspsched,v);return render();}if(d.inspcancel){if(confirm(S.lang==='es'?'¿Cancelar la inspección?':'Cancel the inspection?')){S.setInspection(d.inspcancel,null);render();}return;}if(d.acc)return S.respondOffer(d.acc,'ACCEPTED');if(d.rej)return S.respondOffer(d.rej,'REJECTED');
     if(d.ctr){const p=prompt(tr('promptCounterPrice')),dn=prompt(tr('promptCounterDown')),mo=prompt(tr('promptCounterMonthly')),n=prompt(tr('promptAdminNotes'))||'';if(p)S.respondOffer(d.ctr,'COUNTERED',{counterPrice:p,counterDown:dn,counterMonthly:mo,adminNotes:n});return;}
     if(d.reset)return openAdminResetModal(d.reset);
     if(d.save){const row=r.querySelector(`[data-row="${d.save}"]`),p={};row.querySelectorAll('[data-f]').forEach(i=>p[i.dataset.f]=Math.round(+i.value*100));S.updateListing(d.save,p);const insp=row.querySelector('[data-insp]');if(insp&&S.caps&&S.caps.investor)await S.saveInspection(d.save,insp.value);return alert(tr('savedAlert'));}
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
     if(t.dataset.clwaive){await S.saveClosing(t.dataset.clwaive,{inspectionsWaived:t.checked});return render();}
     if(t.dataset.clcontract&&t.files&&t.files[0]){const oid=t.dataset.clcontract;const doc=await S.uploadDocument(t.files[0],{docType:'FINAL_CONTRACT',offerId:oid,listingId:t.dataset.listing});await S.saveClosing(oid,{contractDocumentId:doc&&doc.id});alert(cx('contractAdded'));return render();}
     if(t.dataset.txdoc&&t.files&&t.files[0])return await S.uploadDocument(t.files[0],{docType:t.dataset.txdoc,offerId:t.dataset.offer,listingId:t.dataset.listing});
     if(t.id==='roleSel'){const inv=t.value==='INVESTOR',agent=t.value==='AGENT';$('#agentFields').style.display=agent?'':'none';$('#buyerFields').style.display=(!agent&&!inv)?'':'none';const box=$('#investorFields');if(box)box.style.display=inv?'':'none';const name=$('#regF [name="name"]');if(name)name.required=!inv;['businessName','contactMethod','contactValue','representativeName'].forEach(n=>{const el=$('#regF [name="'+n+'"]');if(el)el.required=inv;});}
     if(t.id==='noAgent'){$('#inv').disabled=t.checked;if(t.checked)$('#inv').value='';}
   }catch(err){alert(err.message);}
  };
  const sub=(id,fn)=>{const el=$(id);if(el)el.onsubmit=wrap(()=>fn(fd(el)));};
  sub('#loginF',async v=>{const u=await S.login(v.email,v.password);if(u&&u.needsVerify)return openVerifyEmail(u.email,false);go(u&&u.role==='ADMIN'?'admin':'dashboard');maybePromptCriteria();});
  sub('#regF',async v=>{if(v.role==='INVESTOR'&&!(v.businessName&&v.contactMethod&&v.contactValue&&v.representativeName))throw new Error(S.lang==='es'?'Ingresa el nombre del negocio, el método de contacto y el nombre del representante.':'Enter the business name, preferred contact method, and the representative\'s name.');const u=await S.register(v);if(u&&u.needsVerify)return openVerifyEmail(u.email,true);go(u&&u.role==='ADMIN'?'admin':'dashboard');maybePromptCriteria();});
  r.querySelectorAll('form[data-sheets]').forEach(f=>{f.onsubmit=wrap(async()=>{const lines=String(new FormData(f).get('sheets')||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);await S.saveInvestorSheets(f.dataset.sheets,lines.map(url=>({url})));alert(tr('savedAlert'));render();});});
  r.querySelectorAll('form[data-assign]').forEach(f=>{f.onsubmit=wrap(async()=>{const id=String(new FormData(f).get('listingId')||'');if(!id)return;await S.assignInvestorListings(f.dataset.assign,[id],[]);render();});});
  sub('#profF',v=>{S.updateProfile(v);alert(tr('savedAlert'));});
  sub('#pwF',async v=>{await S.changePassword(v.cur,v.pw);alert(tr('pwUpdatedAlert'));});
  sub('#msgF',v=>{S.sendMessage(v);});
  const box=r.querySelector('[data-msginput]');
  if(box)box.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submitMsgComposer();}};
  const compose=r.querySelector('.msg-compose');
  if(compose)compose.onsubmit=e=>{e.preventDefault();submitMsgComposer();};}

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

document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!msgOpen)return;msgOpen=false;render();});
S.on(render);window.addEventListener('hashchange',()=>{tab=location.hash.slice(1)||'inventory';render();});
S.load().then(()=>{render();checkResetUrlParams();maybePromptCriteria();}).catch(e=>{document.documentElement.lang=S.lang;$('#app-root').innerHTML='<p style="padding:20px">'+esc(tr('loadFail'))+': '+esc(e.message)+'</p>';});
})();
