/* Legacy - Owner Finance: PWA helpers (service worker, bilingual install prompt, delete-my-account dialog).
   Loaded with `defer`, after app-state.js/app-ui.js. No secrets, no house numbers. */
(function(){
  'use strict';
  var D=document,W=window;
  var TXT={
    en:{
      installTitle:'Install the Legacy app',
      installSub:'Add it to your home screen for quick access.',
      installBtn:'Install',howBtn:'How?',later:'Not now',close:'Close',
      howTitle:'Install the app on your phone',
      andTitle:'Android (Chrome)',
      and1:'Open this site in Chrome.',and2:'Tap the menu (⋮) at the top right.',and3:'Tap “Install app” or “Add to Home screen”, then “Install”.',
      iosTitle:'iPhone / iPad (Safari)',
      ios1:'Open this site in Safari (not inside another app).',ios2:'Tap the Share button (the square with an arrow).',ios3:'Scroll and tap “Add to Home Screen”, then “Add”.',
      already:'The app is already installed on this device.',
      deskNote:'On a computer, use the install icon in Chrome or Edge’s address bar.',
      installLink:'Install the app',privacyLink:'Privacy Policy',deleteLink:'Delete my account',
      delTitle:'Delete my account',
      delIntro:'This sends a request to delete your account and personal data. Your account is marked for deletion and our team will process it. We may keep limited records where the law requires it (for example, signed transaction documents).',
      delPw:'Your password',delReason:'Reason (optional)',
      delType:'Type DELETE to confirm',delWord:'DELETE',
      delSubmit:'Request deletion',cancel:'Cancel',
      delNeedPw:'Please enter your password.',delNeedWord:'Please type DELETE to confirm.',
      delSending:'Sending…',
      delDone:'Your deletion request was received. We will confirm by email. You will now be signed out.',
      delAlready:'A deletion request for this account is already pending. You will now be signed out.',
      delUnavail:'Account deletion is not available yet. Please try again later.',
      delFail:'We could not send your request. Please check your password and try again.'
    },
    es:{
      installTitle:'Instala la app de Legacy',
      installSub:'Agrégala a tu pantalla de inicio para entrar más rápido.',
      installBtn:'Instalar',howBtn:'¿Cómo?',later:'Ahora no',close:'Cerrar',
      howTitle:'Instala la app en tu teléfono',
      andTitle:'Android (Chrome)',
      and1:'Abre este sitio en Chrome.',and2:'Toca el menú (⋮) arriba a la derecha.',and3:'Toca “Instalar aplicación” o “Agregar a pantalla de inicio” y luego “Instalar”.',
      iosTitle:'iPhone / iPad (Safari)',
      ios1:'Abre este sitio en Safari (no dentro de otra app).',ios2:'Toca el botón Compartir (el cuadro con una flecha).',ios3:'Desliza y toca “Agregar a pantalla de inicio” y luego “Agregar”.',
      already:'La app ya está instalada en este dispositivo.',
      deskNote:'En una computadora, usa el ícono de instalar en la barra de direcciones de Chrome o Edge.',
      installLink:'Instalar la app',privacyLink:'Política de privacidad',deleteLink:'Eliminar mi cuenta',
      delTitle:'Eliminar mi cuenta',
      delIntro:'Esto envía una solicitud para eliminar tu cuenta y tus datos personales. Tu cuenta queda marcada para eliminación y nuestro equipo la procesará. Podemos conservar registros limitados cuando la ley lo exige (por ejemplo, documentos firmados de una transacción).',
      delPw:'Tu contraseña',delReason:'Motivo (opcional)',
      delType:'Escribe ELIMINAR para confirmar',delWord:'ELIMINAR',
      delSubmit:'Solicitar eliminación',cancel:'Cancelar',
      delNeedPw:'Escribe tu contraseña.',delNeedWord:'Escribe ELIMINAR para confirmar.',
      delSending:'Enviando…',
      delDone:'Recibimos tu solicitud de eliminación. Te confirmaremos por correo. Ahora se cerrará tu sesión.',
      delAlready:'Ya hay una solicitud de eliminación pendiente para esta cuenta. Ahora se cerrará tu sesión.',
      delUnavail:'La eliminación de cuenta aún no está disponible. Inténtalo más tarde.',
      delFail:'No pudimos enviar tu solicitud. Revisa tu contraseña e inténtalo de nuevo.'
    }
  };
  function lang(){
    var l=(W.AppState&&W.AppState.lang)||W.__legacyLang;
    if(!l){try{l=localStorage.getItem('legacy_lang');}catch(e){}}
    if(!l)l=D.documentElement.lang||'es';
    return l==='en'?'en':'es';
  }
  function t(k){return (TXT[lang()]||TXT.es)[k]||k;}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  /* ---------- platform ---------- */
  var ua=navigator.userAgent||'';
  var isIOS=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  var isAndroid=/android/i.test(ua);
  var isNative=!!(W.Capacitor&&W.Capacitor.isNativePlatform&&W.Capacitor.isNativePlatform());
  function standalone(){
    try{return isNative||(W.matchMedia&&W.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;}catch(e){return false;}
  }
  try{D.documentElement.setAttribute('data-standalone',standalone()?'1':'0');}catch(e){}

  /* ---------- service worker ---------- */
  if('serviceWorker' in navigator&&!isNative&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
    W.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});
  }

  /* ---------- install prompt ---------- */
  var deferred=null,banner=null,DISMISS_KEY='legacy_install_dismissed';
  function dismissed(){try{var v=+localStorage.getItem(DISMISS_KEY)||0;return Date.now()-v<14*864e5;}catch(e){return false;}}
  function setDismissed(){try{localStorage.setItem(DISMISS_KEY,String(Date.now()));}catch(e){}}
  W.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;scheduleBanner();});
  W.addEventListener('appinstalled',function(){deferred=null;hideBanner();setDismissed();});

  function css(){
    if(D.getElementById('pwa-css'))return;
    var s=D.createElement('style');s.id='pwa-css';
    s.textContent=
      '.pwa-banner{position:fixed;left:12px;right:84px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147480000;background:#031432;color:#fff;border:1px solid #c9a24a;border-radius:14px;padding:12px 14px;box-shadow:0 8px 28px rgba(0,0,0,.35);font:14px/1.35 "Plus Jakarta Sans",system-ui,sans-serif;display:flex;gap:10px;align-items:center;flex-wrap:wrap;max-width:520px}'+
      '.pwa-banner img{width:40px;height:40px;border-radius:9px}.pwa-banner .pwa-tx{flex:1 1 160px;min-width:140px}.pwa-banner b{display:block;color:#e8c872}'+
      '.pwa-banner button,.pwa-modal button{font:inherit;cursor:pointer;border-radius:9px;padding:8px 12px;border:1px solid #c9a24a;background:transparent;color:#e8c872;margin:0}'+
      '.pwa-banner button.pwa-go,.pwa-modal button.pwa-go{background:#c9a24a;color:#031432;font-weight:700}'+
      '.pwa-modal-bg{position:fixed;inset:0;background:rgba(3,20,50,.72);z-index:2147480100;display:flex;align-items:center;justify-content:center;padding:16px}'+
      '.pwa-modal{background:#fff;color:#111827;border-radius:14px;max-width:460px;width:100%;max-height:90vh;overflow:auto;padding:18px;font:15px/1.45 "Plus Jakarta Sans",system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4)}'+
      '.pwa-modal h2{margin:0 0 8px;font-size:20px}.pwa-modal h3{margin:14px 0 4px;font-size:15px}.pwa-modal ol{margin:4px 0 0 18px;padding:0}.pwa-modal label{display:block;margin-top:10px;font-weight:600;font-size:13px}'+
      '.pwa-modal input,.pwa-modal textarea{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}'+
      '.pwa-modal .pwa-row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}.pwa-modal button{color:#031432;border-color:#94a3b8}'+
      '.pwa-modal button.pwa-danger{background:#b91c1c;border-color:#b91c1c;color:#fff;font-weight:700}.pwa-modal button[disabled]{opacity:.6}'+
      '.pwa-err{color:#b91c1c;font-size:13px;margin-top:8px;min-height:1em}.pwa-note{font-size:12px;color:#475569;margin-top:10px}'+
      '.pwa-foot a,.pwa-foot button{color:inherit;text-decoration:underline;background:none;border:0;padding:0;margin:0;font:inherit;cursor:pointer}'+
      'html[data-standalone="1"] [data-install-app]{display:none}';
    D.head.appendChild(s);
  }
  function canShowBanner(){
    if(standalone()||dismissed())return false;
    if(deferred)return true;
    return isIOS&&!/crios|fxios|edgios/i.test(ua); // iOS Safari only
  }
  var bannerTimer=null;
  function scheduleBanner(){
    if(banner||bannerTimer)return;
    bannerTimer=setTimeout(function(){bannerTimer=null;showBanner();},5000);
  }
  function showBanner(){
    if(banner||!canShowBanner())return;
    css();
    banner=D.createElement('div');banner.className='pwa-banner';banner.setAttribute('role','dialog');
    banner.innerHTML='<img src="/android-chrome-192x192.png" alt=""><div class="pwa-tx"><b>'+esc(t('installTitle'))+'</b>'+esc(t('installSub'))+'</div>'+
      '<span style="display:flex;gap:6px">'+(deferred?'<button type="button" class="pwa-go" data-pwa="install">'+esc(t('installBtn'))+'</button>':'<button type="button" class="pwa-go" data-pwa="how">'+esc(t('howBtn'))+'</button>')+
      '<button type="button" data-pwa="later">'+esc(t('later'))+'</button></span>';
    D.body.appendChild(banner);
  }
  function hideBanner(){if(banner){banner.remove();banner=null;}}
  function doInstall(){
    if(deferred){
      var d=deferred;deferred=null;hideBanner();
      try{d.prompt();d.userChoice.then(function(c){if(!c||c.outcome!=='accepted')setDismissed();});}catch(e){}
      return;
    }
    howModal();
  }
  function modal(html){
    css();var bg=D.createElement('div');bg.className='pwa-modal-bg';
    bg.innerHTML='<div class="pwa-modal" role="dialog" aria-modal="true">'+html+'</div>';
    bg.addEventListener('click',function(e){if(e.target===bg)bg.remove();});
    D.body.appendChild(bg);return bg;
  }
  function howModal(){
    hideBanner();
    var m=modal('<h2>'+esc(t('howTitle'))+'</h2>'+(standalone()?'<p>'+esc(t('already'))+'</p>':'')+
      '<h3>'+esc(t('andTitle'))+'</h3><ol><li>'+esc(t('and1'))+'</li><li>'+esc(t('and2'))+'</li><li>'+esc(t('and3'))+'</li></ol>'+
      '<h3>'+esc(t('iosTitle'))+'</h3><ol><li>'+esc(t('ios1'))+'</li><li>'+esc(t('ios2'))+'</li><li>'+esc(t('ios3'))+'</li></ol>'+
      '<p class="pwa-note">'+esc(t('deskNote'))+'</p>'+
      '<div class="pwa-row"><button type="button" class="pwa-go" data-pwa="close">'+esc(t('close'))+'</button></div>');
    m.addEventListener('click',function(e){if(e.target.closest('[data-pwa="close"]'))m.remove();});
  }

  /* ---------- delete my account ---------- */
  function deleteModal(){
    var S=W.AppState;
    if(!S||!S.user)return;
    var m=modal('<h2>'+esc(t('delTitle'))+'</h2><p>'+esc(t('delIntro'))+'</p>'+
      '<label>'+esc(t('delPw'))+'<input type="password" id="pwa-del-pw" autocomplete="current-password"></label>'+
      '<label>'+esc(t('delReason'))+'<textarea id="pwa-del-reason" rows="2" maxlength="500"></textarea></label>'+
      '<label>'+esc(t('delType'))+'<input type="text" id="pwa-del-word" autocomplete="off" autocapitalize="characters"></label>'+
      '<div class="pwa-err" id="pwa-del-err" role="alert"></div>'+
      '<div class="pwa-row"><button type="button" data-pwa="close">'+esc(t('cancel'))+'</button><button type="button" class="pwa-danger" id="pwa-del-go">'+esc(t('delSubmit'))+'</button></div>');
    var err=m.querySelector('#pwa-del-err'),go=m.querySelector('#pwa-del-go');
    m.addEventListener('click',function(e){if(e.target.closest('[data-pwa="close"]'))m.remove();});
    go.addEventListener('click',function(){
      var pw=m.querySelector('#pwa-del-pw').value,word=m.querySelector('#pwa-del-word').value.trim().toUpperCase(),reason=m.querySelector('#pwa-del-reason').value.trim();
      err.textContent='';
      if(!pw){err.textContent=t('delNeedPw');return;}
      if(word!==t('delWord')){err.textContent=t('delNeedWord');return;}
      go.disabled=true;go.textContent=t('delSending');
      S.api('account_delete_request',{password:pw,reason:reason}).then(function(j){
        if(j&&j.ok){alert(j.alreadyRequested?t('delAlready'):t('delDone'));S.logout();}
        else{err.textContent=t('delUnavail');go.disabled=false;go.textContent=t('delSubmit');}
      }).catch(function(e){
        var code=e&&e.code;
        err.textContent=(code==='unknown_action'||code==='unavailable'||code==='not_ready')?t('delUnavail'):(e&&e.message&&code!=='bad_current'?e.message:t('delFail'));
        go.disabled=false;go.textContent=t('delSubmit');
      });
    });
    setTimeout(function(){var i=m.querySelector('#pwa-del-pw');if(i)i.focus();},50);
  }

  /* ---------- delegated clicks (buttons rendered by app-ui.js) ---------- */
  D.addEventListener('click',function(e){
    var el=e.target.closest&&e.target.closest('[data-install-app],[data-delete-account],[data-pwa]');
    if(!el)return;
    if(el.hasAttribute('data-install-app')){e.preventDefault();doInstall();return;}
    if(el.hasAttribute('data-delete-account')){e.preventDefault();deleteModal();return;}
    var a=el.getAttribute('data-pwa');
    if(banner&&banner.contains(el)){
      if(a==='install')doInstall();else if(a==='how')howModal();else if(a==='later'){setDismissed();hideBanner();}
    }
  });

  W.LegacyPwa={t:t,standalone:standalone,install:doInstall,deleteAccount:deleteModal};
  if(isIOS&&!standalone())scheduleBanner();
})();
