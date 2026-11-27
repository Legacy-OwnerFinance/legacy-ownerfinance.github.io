/* Legacy - Owner Finance: native app helpers (Capacitor builds for Google Play / App Store) + offline screen for everyone.
   Loaded early with `defer` (before app-ui.js). Safe on the website: every native call is skipped unless running inside the app.
   - Offline screen: full-screen bilingual notice when the device has no connection, with "Try again".
   - Native share: navigator.share is backed by the native share sheet inside the app (Android WebView has none).
   - Native camera / photo library / files for every upload button (input[type=file]) inside the app.
   - Push plumbing: LegacyNative.registerPush() (off until Firebase / APNs keys are added; see legacy-mobile/STORE-NOTES.md).
   No secrets here. */
(function(){
  'use strict';
  var W=window,D=document,C=W.Capacitor;
  var isNative=!!(C&&C.isNativePlatform&&C.isNativePlatform());
  var platform=isNative&&C.getPlatform?C.getPlatform():'web';
  var PUBLIC_ORIGIN='https://legacyownerfinance.net';
  function plugin(name){try{if(!isNative)return null;if(C.Plugins&&C.Plugins[name])return C.Plugins[name];return C.registerPlugin?C.registerPlugin(name):null;}catch(e){return null;}}
  function lang(){var l=(W.AppState&&W.AppState.lang)||W.__legacyLang;if(!l){try{l=localStorage.getItem('legacy_lang');}catch(e){}}if(!l)l=D.documentElement.lang||'es';return l==='en'?'en':'es';}
  var TXT={
    es:{offT:'Sin conexión',offB:'No hay internet en este momento. Tus casas favoritas y la última información que viste siguen guardadas; reconéctate para ver lo más nuevo, enviar ofertas o mensajes.',retry:'Intentar de nuevo',keep:'Ver lo guardado',bar:'Sin conexión: mostrando lo guardado',
        upT:'Subir archivo',cam:'Tomar foto',lib:'Elegir de mis fotos',file:'Elegir archivo (PDF u otro)',cancel:'Cancelar'},
    en:{offT:'You are offline',offB:'There is no internet right now. Your favorite homes and the last information you saw are still saved; reconnect to see the newest, send offers or messages.',retry:'Try again',keep:'View saved info',bar:'Offline: showing saved info',
        upT:'Upload a file',cam:'Take photo',lib:'Choose from photos',file:'Choose a file (PDF or other)',cancel:'Cancel'}
  };
  function t(k){return (TXT[lang()]||TXT.es)[k]||k;}
  if(isNative){try{D.documentElement.setAttribute('data-native',platform);}catch(e){}}

  /* ---------- offline screen ---------- */
  var off=null;
  function showOffline(){
    if(off||navigator.onLine!==false)return;
    off=D.createElement('div');off.id='lof-offline';off.setAttribute('role','alertdialog');off.setAttribute('aria-live','assertive');
    off.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#031432;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px 24px;font:16px/1.5 "Plus Jakarta Sans",system-ui,-apple-system,sans-serif';
    off.innerHTML='<img src="/legacy-logo.png" alt="Legacy - Owner Finance" style="width:96px;height:96px;border-radius:20px;margin-bottom:18px">'+
      '<div style="font-size:22px;font-weight:700;color:#e8c872;margin-bottom:8px"></div><p style="max-width:420px;margin:0 0 22px;color:#dbe3f0"></p>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button type="button" data-off="retry" style="font:inherit;font-weight:700;background:#c9a24a;color:#031432;border:0;border-radius:12px;padding:12px 22px;cursor:pointer"></button><button type="button" data-off="keep" style="font:inherit;background:transparent;color:#e8c872;border:1px solid #c9a24a;border-radius:12px;padding:12px 22px;cursor:pointer"></button></div>'+
      '<div style="position:absolute;bottom:calc(18px + env(safe-area-inset-bottom,0px));font-size:12px;color:#9fb0c8">Legacy - Owner Finance · Brokered by KLC Real Estate, LLC</div>';
    off.children[1].textContent=t('offT');off.children[2].textContent=t('offB');
    var b=off.querySelector('[data-off="retry"]'),k=off.querySelector('[data-off="keep"]');b.textContent=t('retry');k.textContent=t('keep');
    b.addEventListener('click',function(){if(navigator.onLine!==false){hideOffline();location.reload();}});
    k.addEventListener('click',function(){hideOffline();showBar();});
    (D.body||D.documentElement).appendChild(off);
  }
  var bar=null;
  function showBar(){
    if(bar)return;bar=D.createElement('div');bar.id='lof-offline-bar';bar.setAttribute('role','status');
    bar.style.cssText='position:fixed;left:0;right:0;top:0;z-index:2147482999;background:#b45309;color:#fff;text-align:center;font:600 13px/1.3 system-ui,sans-serif;padding:calc(6px + env(safe-area-inset-top,0px)) 10px 6px';
    bar.textContent=t('bar');(D.body||D.documentElement).appendChild(bar);
  }
  function hideOffline(){if(off){off.remove();off=null;}}
  function backOnline(){hideOffline();if(bar){bar.remove();bar=null;}}
  W.addEventListener('offline',showOffline);
  W.addEventListener('online',backOnline);
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',showOffline);else showOffline();

  /* ---------- share ---------- */
  var Share=plugin('Share');
  if(isNative&&Share){
    try{
      var nativeShare=function(data){data=data||{};return Share.share({title:data.title||'Legacy - Owner Finance',text:data.text||'',url:data.url||undefined,dialogTitle:data.title||'Legacy - Owner Finance'}).then(function(){});};
      Object.defineProperty(navigator,'share',{configurable:true,value:nativeShare});
      if(!navigator.canShare)Object.defineProperty(navigator,'canShare',{configurable:true,value:function(){return true;}});
    }catch(e){}
  }
  function share(data){
    if(navigator.share)return navigator.share(data);
    var u=(data&&data.url)||'';
    if(navigator.clipboard&&W.isSecureContext)return navigator.clipboard.writeText(u);
    return Promise.reject(new Error('share_unavailable'));
  }

  /* ---------- camera / photos / files for upload inputs ---------- */
  var Camera=plugin('Camera'),ActionSheet=plugin('ActionSheet');
  var bypass=null; // an input we let open the normal file picker
  function b64ToFile(b64,mime,name){var bin=atob(b64),n=bin.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=bin.charCodeAt(i);return new File([u],name,{type:mime});}
  function putFile(input,file){
    try{var dt=new DataTransfer();dt.items.add(file);input.files=dt.files;}catch(e){return false;}
    input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return true;
  }
  function photo(input,source){
    return Camera.getPhoto({source:source,resultType:'base64',quality:82,width:2400,correctOrientation:true,saveToGallery:false,promptLabelHeader:t('upT')}).then(function(p){
      var fmt=String(p.format||'jpeg').toLowerCase();var mime=fmt==='png'?'image/png':(fmt==='heic'?'image/heic':'image/jpeg');
      var ext=mime==='image/png'?'png':(mime==='image/heic'?'heic':'jpg');
      putFile(input,b64ToFile(p.base64String,mime,'photo-'+Date.now()+'.'+ext));
    }).catch(function(){/* cancelled */});
  }
  function openNormal(input){bypass=input;try{input.click();}finally{setTimeout(function(){bypass=null;},0);}}
  function onlyImages(input){var a=String(input.getAttribute('accept')||'').toLowerCase();if(!a)return false;return a.split(',').every(function(x){x=x.trim();return x.indexOf('image/')===0||/^\.(jpe?g|png|webp|heic|heif|gif)$/.test(x);});}
  if(isNative&&Camera){
    D.addEventListener('click',function(e){
      var input=e.target&&e.target.closest?e.target.closest('input[type=file]'):null;
      if(!input&&e.target&&e.target.closest){var lb=e.target.closest('label');if(lb){input=lb.control||lb.querySelector('input[type=file]');if(input&&input.type!=='file')input=null;}}
      if(!input||input===bypass||input.disabled||input.multiple)return;
      e.preventDefault();e.stopPropagation();
      var imgs=onlyImages(input);
      var opts=[{title:t('cam')},{title:t('lib')}];if(!imgs)opts.push({title:t('file')});opts.push({title:t('cancel'),style:'CANCEL'});
      var pick=ActionSheet?ActionSheet.showActions({title:t('upT'),options:opts}).then(function(r){return r&&typeof r.index==='number'?r.index:-1;}):Promise.resolve(imgs?-2:2);
      pick.then(function(i){
        if(i===-2)return photo(input,'PROMPT');
        if(i===0)return photo(input,'CAMERA');
        if(i===1)return photo(input,'PHOTOS');
        if(i===2&&!imgs)return openNormal(input);
      });
    },true);
  }

  /* ---------- push (plumbing only; stays off until Firebase / APNs keys are added) ---------- */
  var NATIVE_PUSH_ENABLED=false; // flip to true in the store build once google-services.json + APNs key are in place
  function registerPush(){
    var Push=plugin('PushNotifications');
    if(!isNative||!Push||!NATIVE_PUSH_ENABLED)return Promise.resolve({ok:false,reason:'native_push_not_enabled'});
    return Push.requestPermissions().then(function(p){
      if(!p||p.receive!=='granted')return {ok:false,reason:'denied'};
      return new Promise(function(res){
        Push.addListener('registration',function(tok){
          var S=W.AppState;
          if(S&&S.api)S.api('push_register_native',{platform:platform,token:tok&&tok.value}).catch(function(){});
          res({ok:true});
        });
        Push.addListener('registrationError',function(){res({ok:false,reason:'error'});});
        Push.addListener('pushNotificationActionPerformed',function(a){var u=a&&a.notification&&a.notification.data&&a.notification.data.url;if(u&&/^\//.test(u))location.href=u;});
        Push.register();
      });
    });
  }

  /* ---------- small native polish ---------- */
  if(isNative){
    var Splash=plugin('SplashScreen');
    W.addEventListener('load',function(){try{Splash&&Splash.hide&&Splash.hide();}catch(e){}});
    var App=plugin('App');
    try{App&&App.addListener&&App.addListener('backButton',function(ev){if(ev&&ev.canGoBack)history.back();else if(App.minimizeApp)App.minimizeApp();});}catch(e){}
  }

  W.LegacyNative={isNative:isNative,platform:platform,origin:isNative?PUBLIC_ORIGIN:location.origin,share:share,registerPush:registerPush,pushEnabled:NATIVE_PUSH_ENABLED};
})();
