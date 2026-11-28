/* Legacy - Owner Finance: agent subscription + referral UI.
   Stripe stays in test mode on the server. This file never holds a Stripe key.
   Checkout and the billing portal are Edge Functions (create-checkout-session, create-portal-session).
   The app signs agents in with its own session token (x-session). Calls also send the Supabase anon
   JWT in Authorization, which is what the Edge Function gateway checks. No purchase buttons render
   inside the Capacitor / native store wrapper. */
(function(root){
  'use strict';
  var REF_KEY='legacy_ref';
  var PROMO='LAUNCH50';
  var ORIGIN='https://legacyownerfinance.net';
  var CREDIT_EACH=500;
  var CREDIT_CAP=1999;
  var notice=null;
  var wantScroll=false;
  var cache={sub:undefined,refs:null,at:0,loading:false,gen:0};
  var copyTimer=null;

  function lang(){
    var S=root.AppState;
    var l=S&&S.lang||root.__legacyLang;
    if(!l){try{l=localStorage.getItem('legacy_lang');}catch(e){}}
    return l==='en'?'en':'es';
  }
  function t(key, vars){
    if(root.translateI18n){
      var v=root.translateI18n(lang(), key, vars);
      if(v&&v!==key)return v;
    }
    return key;
  }
  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function money(cents){
    var n=Math.round(Number(cents)||0);
    return '$'+(n/100).toFixed(2);
  }
  function fmtDate(iso){
    if(!iso)return '';
    try{
      return new Intl.DateTimeFormat(lang()==='es'?'es-US':'en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric'}).format(new Date(iso));
    }catch(e){return String(iso).slice(0,10);}
  }
  function inNative(){
    try{
      if(root.LegacyNative&&root.LegacyNative.isNative)return true;
      var C=root.Capacitor;
      if(C&&C.isNativePlatform&&C.isNativePlatform())return true;
      if(document.documentElement.getAttribute('data-native'))return true;
    }catch(e){}
    return false;
  }
  function normalizeRef(raw){
    var s=String(raw==null?'':raw).trim();
    if(!s)return '';
    try{s=decodeURIComponent(s.replace(/\+/g,' ')).trim();}catch(e){}
    if(!/^[A-Za-z0-9][A-Za-z0-9_-]{1,31}$/.test(s))return '';
    return s;
  }
  function savedRef(){
    try{return normalizeRef(localStorage.getItem(REF_KEY)||'');}catch(e){return '';}
  }
  function rememberRef(code){
    var c=normalizeRef(code);
    try{
      if(c)localStorage.setItem(REF_KEY,c);
      else localStorage.removeItem(REF_KEY);
    }catch(e){}
    return c;
  }
  function captureRef(search){
    var q;
    try{q=new URLSearchParams(search!=null?search:location.search);}catch(e){return savedRef();}
    if(!q.has('ref'))return savedRef();
    var c=normalizeRef(q.get('ref'));
    if(c)rememberRef(c);
    return savedRef();
  }
  function captureReturn(search){
    var q;
    try{q=new URLSearchParams(search!=null?search:(typeof location!=='undefined'?location.search:''));}catch(e){return notice;}
    var v=String(q.get('sub')||'');
    if(v!=='ok'&&v!=='cancel')return notice;
    notice=v;
    wantScroll=true;
    if(search==null&&typeof history!=='undefined'&&history.replaceState){
      q.delete('sub');
      var s=q.toString();
      try{history.replaceState(null,'',location.pathname+(s?'?'+s:'')+location.hash);}catch(e){}
    }
    return notice;
  }
  function buildCheckoutBody(plan, ref){
    if(plan!=='monthly'&&plan!=='yearly'){
      var err=new Error('bad plan');
      err.code='bad_plan';
      throw err;
    }
    var body={plan:plan};
    var code=normalizeRef(ref);
    if(code)body.referral_code=code;
    return body;
  }
  function safeHttps(url){
    return /^https:\/\/[^\s]+$/i.test(String(url||''));
  }
  function ownerIds(){
    var S=root.AppState,ids=[];
    if(!S||!S.user)return ids;
    if(S.user.id)ids.push(String(S.user.id));
    var ap=S.agentProfile&&S.agentProfile(S.user);
    if(ap&&ap.id)ids.push(String(ap.id));
    return ids;
  }
  function rowOwner(r){
    if(!r)return '';
    return String(r.user_id||r.agent_user_id||r.agent_id||r.referrer_id||r.referrer_user_id||r.owner_id||'');
  }
  function ownRows(rows, ids){
    rows=Array.isArray(rows)?rows:[];
    ids=ids||[];
    var set={};
    ids.forEach(function(id){if(id)set[String(id)]=1;});
    var tagged=rows.filter(rowOwner);
    if(tagged.length){
      return rows.filter(function(r){
        var id=rowOwner(r);
        return id&&set[id];
      });
    }
    if(rows.length<=1)return rows;
    return [];
  }
  function normStatus(s){
    s=String(s||'').toLowerCase();
    if(s==='trialing'||s==='trial')return 'trial';
    if(s==='active')return 'active';
    if(s==='canceled'||s==='cancelled')return 'canceled';
    if(s==='past_due'||s==='unpaid'||s==='incomplete')return 'past_due';
    return s;
  }
  function planLabel(plan){
    return String(plan||'').toLowerCase()==='yearly'?t('sub.planYearly'):String(plan||'').toLowerCase()==='monthly'?t('sub.planMonthly'):'';
  }
  function statusView(sub){
    if(!sub)return {kind:'none',label:t('sub.statusNone'),detail:'',plan:''};
    var kind=normStatus(sub.status);
    var label=kind==='trial'?t('sub.statusTrial'):kind==='active'?t('sub.statusActive'):kind==='canceled'?t('sub.statusCanceled'):kind==='past_due'?t('sub.statusPastDue'):(sub.status?t('sub.statusOther'):t('sub.statusNone'));
    var end=sub.current_period_end||sub.currentPeriodEnd||'';
    var trialEnd=sub.trial_end||sub.trialEnd||'';
    var cancel=sub.cancel_at_period_end===true||sub.cancelAtPeriodEnd===true||kind==='canceled';
    var detail='';
    if(kind==='trial'&&trialEnd)detail=t('sub.trialEnds',{date:fmtDate(trialEnd)});
    else if(cancel&&end)detail=t('sub.ends',{date:fmtDate(end)});
    else if(end&&(kind==='active'||kind==='past_due'||kind==='trial'))detail=t('sub.renews',{date:fmtDate(end)});
    else if(end)detail=fmtDate(end);
    return {kind:kind||'none',label:label,detail:detail,plan:planLabel(sub.plan)};
  }
  function subscribedRef(r){
    var s=String(r.status||r.subscription_status||'').toLowerCase();
    if(['subscribed','active','trialing','trial','paid','converted','completed','current'].indexOf(s)>=0)return true;
    if(r.subscribed_at||r.subscribedAt)return true;
    if(r.credit_cents!=null||r.creditCents!=null||r.amount_cents!=null){
      var n=Number(r.credit_cents!=null?r.credit_cents:r.creditCents!=null?r.creditCents:r.amount_cents);
      if(n>0)return true;
    }
    return false;
  }
  function creditsCents(rows){
    rows=Array.isArray(rows)?rows:[];
    var has=false,sum=0;
    rows.forEach(function(r){
      var c=r.credit_cents!=null?r.credit_cents:r.creditCents!=null?r.creditCents:r.amount_cents;
      if(c==null||c==='')return;
      has=true;
      var n=Number(c);
      if(isFinite(n)&&n>0)sum+=n;
    });
    if(!has)sum=rows.filter(subscribedRef).length*CREDIT_EACH;
    if(!isFinite(sum)||sum<0)sum=0;
    return Math.min(Math.round(sum),CREDIT_CAP);
  }
  function myCode(){
    var S=root.AppState;
    if(!S||!S.user)return '';
    var ap=S.agentProfile&&S.agentProfile(S.user);
    var raw=(ap&&(ap.referral_code||ap.referralCode))||S.user.referral_code||S.user.referralCode||'';
    return normalizeRef(raw);
  }
  function shareUrl(code){
    var c=normalizeRef(code);
    return c?ORIGIN+'/?ref='+encodeURIComponent(c):'';
  }
  function waHref(code){
    var url=shareUrl(code);
    if(!url)return '';
    var text=t('sub.waText',{code:code,url:url});
    return 'https://wa.me/?text='+encodeURIComponent(text);
  }
  function absorbProfile(st){
    var S=root.AppState;
    if(!S||!S.user||!st)return;
    var rows=st.userRows||[];
    var me=null;
    for(var i=0;i<rows.length;i++){if(rows[i]&&rows[i].id===S.user.id){me=rows[i];break;}}
    if(!me)return;
    var ap=me.agent_profile||null;
    var code=normalizeRef((ap&&(ap.referral_code||ap.referralCode))||me.referral_code||me.referralCode||'');
    if(!code)return;
    var cur=S.agentProfile&&S.agentProfile(S.user);
    if(cur)cur.referral_code=code;
    else if(ap&&S.data){
      S.data.agentProfiles=S.data.agentProfiles||[];
      ap.referral_code=code;
      S.data.agentProfiles.push(ap);
    }
    S.user.referral_code=code;
  }
  function quietMiss(err){
    var s=err&&err.status;
    return s===400||s===401||s===403||s===404;
  }
  async function readTables(){
    var S=root.AppState;
    if(!S||!S.billingSelect)return {sub:null,refs:[]};
    var ids=ownerIds();
    var subRows=[],refRows=[];
    try{
      subRows=await S.billingSelect('agent_subscriptions','select=plan,status,trial_end,current_period_end,cancel_at_period_end,user_id,agent_id,agent_user_id&order=current_period_end.desc.nullslast&limit=20');
    }catch(e){
      if(!quietMiss(e))console.warn('agent_subscriptions',e.message||e);
      try{subRows=await S.billingSelect('agent_subscriptions','select=*&limit=20');}
      catch(e2){if(!quietMiss(e2))console.warn('agent_subscriptions',e2.message||e2);subRows=[];}
    }
    try{
      refRows=await S.billingSelect('referrals','select=*&order=created_at.desc.nullslast&limit=100');
    }catch(e){
      try{refRows=await S.billingSelect('referrals','select=*&limit=100');}
      catch(e2){if(!quietMiss(e2))console.warn('referrals',e2.message||e2);refRows=[];}
    }
    subRows=ownRows(subRows,ids);
    refRows=ownRows(refRows,ids);
    return {sub:subRows[0]||null,refs:refRows};
  }
  function load(force){
    var S=root.AppState;
    if(!S||!S.user||cache.loading)return;
    if(!force&&cache.at&&Date.now()-cache.at<20000)return;
    cache.loading=true;
    var my=++cache.gen;
    var jobs=[readTables()];
    if(S.api)jobs.push(S.api('state').then(absorbProfile).catch(function(){}));
    Promise.all(jobs).then(function(res){
      if(my!==cache.gen)return;
      cache.sub=res[0].sub;
      cache.refs=res[0].refs;
      cache.at=Date.now();
    }).catch(function(){
      if(my!==cache.gen)return;
      cache.at=Date.now();
    }).then(function(){
      cache.loading=false;
      if(my!==cache.gen)return;
      if(typeof document!=='undefined'&&document.getElementById&&document.getElementById('agent-subscription')&&S.rerender){
        var ae=document.activeElement;
        if(ae&&/INPUT|SELECT|TEXTAREA/.test(ae.tagName))return;
        S.rerender();
      }
    });
  }
  function refWhen(r){
    return fmtDate(r.subscribed_at||r.subscribedAt||r.created_at||r.createdAt||'');
  }
  function refName(r){
    return String(r.referred_name||r.name||r.referred_email||r.email||t('sub.agent'));
  }
  function plansHtml(st){
    if(inNative()){
      return '<p class="bill-native">'+esc(t('sub.native'))+'</p>';
    }
    var current=st.kind==='trial'||st.kind==='active'||st.kind==='past_due'?String((cache.sub&&cache.sub.plan)||'').toLowerCase():'';
    function card(plan, titleKey, price, perKey){
      var on=current===plan;
      var label=on?t('sub.current'):current?t('sub.switch'):t('sub.start');
      return '<article class="bill-plan'+(on?' is-current':'')+'"><h4>'+esc(t(titleKey))+'</h4><p class="bill-price"><b>'+price+'</b> <span>'+esc(t(perKey))+'</span></p><p class="bill-trial">'+esc(t('sub.trialDays'))+'</p>'+(on?'<p class="bill-current">'+esc(t('sub.current'))+'</p>':'<button type="button" class="btn-card primary" data-bill-plan="'+plan+'">'+esc(label)+'</button>')+'</article>';
    }
    var promo='<p class="bill-promo">'+esc(t('sub.promo',{code:PROMO}))+' <button type="button" class="btn-card" data-bill-copy="'+PROMO+'">'+esc(t('sub.copy'))+'</button></p>';
    var manage=(st.kind==='none')?'':'<button type="button" class="btn-card" data-bill-portal="1">'+esc(t('sub.manage'))+'</button>';
    return '<div class="bill-plans">'+card('monthly','sub.monthly','$19.99','sub.perMonth')+card('yearly','sub.yearly','$199.99','sub.perYear')+'</div>'+promo+'<div class="bill-actions">'+manage+'</div>';
  }
  function referralHtml(){
    var code=myCode();
    var url=shareUrl(code);
    var refs=cache.refs;
    var count=refs?refs.length:0;
    var subN=refs?refs.filter(subscribedRef).length:0;
    var credit=refs?creditsCents(refs):0;
    var codeBlock=code
      ?'<p class="bill-k">'+esc(t('sub.yourCode'))+'</p><p class="bill-code"><b>'+esc(code)+'</b> <button type="button" class="btn-card" data-bill-copy="'+esc(code)+'">'+esc(t('sub.copy'))+'</button></p><p class="bill-k">'+esc(t('sub.shareLink'))+'</p><p class="bill-link"><span>'+esc(url)+'</span></p><div class="bill-actions"><button type="button" class="btn-card" data-bill-copy="'+esc(url)+'">'+esc(t('sub.copy'))+'</button><a class="btn-card" href="'+esc(waHref(code))+'" target="_blank" rel="noopener">'+esc(t('sub.whatsapp'))+'</a></div>'
      :'<p class="bill-pending">'+esc(t('sub.codePending'))+'</p>';
    var list;
    if(!refs)list='<p class="ops-meta">'+esc(t('sub.loading'))+'</p>';
    else if(!refs.length)list='<p class="ad-empty">'+esc(t('sub.noneYet'))+'</p>';
    else list='<ul class="bill-refs">'+refs.slice(0,50).map(function(r){
      var on=subscribedRef(r);
      return '<li><span><b>'+esc(refName(r))+'</b><small>'+esc(refWhen(r))+'</small></span><span class="bill-pill'+(on?' on':'')+'">'+esc(on?t('sub.refSubscribed'):t('sub.refPending'))+'</span></li>';
    }).join('')+'</ul>';
    return '<div class="bill-ref"><h4>'+esc(t('sub.referralTitle'))+'</h4><p>'+esc(t('sub.referralBody'))+'</p>'+codeBlock+'<div class="bill-stats"><div><b>'+(refs?count:'…')+'</b><span>'+esc(t('sub.referrals'))+'</span></div><div><b>'+(refs?subN:'…')+'</b><span>'+esc(t('sub.refSubscribed'))+'</span></div><div><b>'+(refs?money(credit):'…')+'</b><span>'+esc(t('sub.credits'))+'</span></div></div>'+list+'</div>';
  }
  function innerHtml(){
    load(false);
    var st=statusView(cache.sub===undefined?null:cache.sub);
    var loading=cache.sub===undefined;
    var status='<div class="bill-status"><div><b>'+esc(loading?t('sub.loading'):st.label)+'</b>'+(st.plan?'<span class="bill-plan-name">'+esc(st.plan)+'</span>':'')+(st.detail?'<small>'+esc(st.detail)+'</small>':'')+'</div><button type="button" class="btn-card" data-bill-refresh="1" aria-label="'+esc(t('sub.refresh'))+'">↻</button></div>';
    var note=inNative()?'':'<p class="bill-note">'+esc(t('sub.trialNote'))+'</p>';
    return '<div id="agent-subscription" class="bill-wrap">'+status+plansHtml(loading?{kind:'none'}:st)+note+referralHtml()+'</div>';
  }
  function dashboardCard(){
    return '<section class="card ad-sec" id="ad-billing"><div class="ad-sec-h"><h3>💳 '+esc(t('sub.title'))+'</h3></div>'+innerHtml()+'</section>';
  }
  function bannerHtml(){
    if(!notice)return '';
    var msg=notice==='ok'?t('sub.returnOk'):t('sub.returnCancel');
    return '<div class="bill-banner'+(notice==='ok'?' ok':'')+'" role="status"><span>'+esc(msg)+'</span><button type="button" data-bill-dismiss="1" aria-label="'+esc(t('sub.dismiss'))+'">✕</button></div>';
  }
  function paintBusy(btn, on){
    if(!btn)return;
    if(on){btn.disabled=true;btn.dataset.billLabel=btn.textContent;btn.textContent=t('sub.busy');}
    else{btn.disabled=false;if(btn.dataset.billLabel)btn.textContent=btn.dataset.billLabel;}
  }
  async function goCheckout(plan, btn){
    if(inNative())return;
    var S=root.AppState;
    if(!S||!S.billingPost)throw new Error(t('sub.checkoutErr'));
    paintBusy(btn,true);
    try{
      var j=await S.billingPost('create-checkout-session', buildCheckoutBody(plan, savedRef()));
      if(!safeHttps(j&&j.url))throw new Error(t('sub.badLink'));
      location.href=j.url;
    }catch(e){
      paintBusy(btn,false);
      alert(e.message||t('sub.checkoutErr'));
    }
  }
  async function goPortal(btn){
    if(inNative())return;
    var S=root.AppState;
    if(!S||!S.billingPost)throw new Error(t('sub.portalErr'));
    paintBusy(btn,true);
    try{
      var j=await S.billingPost('create-portal-session',{});
      if(!safeHttps(j&&j.url))throw new Error(t('sub.badLink'));
      location.href=j.url;
    }catch(e){
      paintBusy(btn,false);
      alert(e.message||t('sub.portalErr'));
    }
  }
  function copyText(text){
    if(navigator.clipboard&&root.isSecureContext)return navigator.clipboard.writeText(text);
    return new Promise(function(res,rej){
      try{
        var ta=document.createElement('textarea');
        ta.value=text;ta.setAttribute('readonly','');
        ta.style.position='fixed';ta.style.left='-9999px';
        document.body.appendChild(ta);ta.select();
        var ok=document.execCommand('copy');
        ta.remove();
        ok?res():rej(new Error('copy'));
      }catch(e){rej(e);}
    });
  }
  if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('click',function(e){
    var tEl=e.target&&e.target.closest&&e.target.closest('[data-bill-plan],[data-bill-portal],[data-bill-copy],[data-bill-refresh],[data-bill-dismiss]');
    if(!tEl)return;
    if(tEl.hasAttribute('data-bill-plan')||tEl.hasAttribute('data-bill-portal')||tEl.hasAttribute('data-bill-copy')||tEl.hasAttribute('data-bill-refresh'))e.preventDefault();
    if(tEl.hasAttribute('data-bill-dismiss')){notice=null;if(root.AppState&&root.AppState.rerender)root.AppState.rerender();return;}
    if(tEl.hasAttribute('data-bill-refresh')){cache.at=0;load(true);return;}
    if(tEl.hasAttribute('data-bill-copy')){
      var val=tEl.getAttribute('data-bill-copy')||'';
      copyText(val).then(function(){
        var prev=tEl.textContent;
        tEl.textContent=t('sub.copied');
        clearTimeout(copyTimer);
        copyTimer=setTimeout(function(){if(tEl.isConnected)tEl.textContent=prev;},1400);
      }).catch(function(){root.prompt(t('sub.copy'),val);});
      return;
    }
    if(tEl.hasAttribute('data-bill-plan'))return goCheckout(tEl.getAttribute('data-bill-plan'), tEl);
    if(tEl.hasAttribute('data-bill-portal'))return goPortal(tEl);
  });

  if(typeof location!=='undefined'){captureRef();captureReturn();}

  root.LegacyBilling={
    normalizeRef:normalizeRef,
    savedRef:savedRef,
    rememberRef:rememberRef,
    captureRef:captureRef,
    buildCheckoutBody:buildCheckoutBody,
    ownRows:ownRows,
    creditsCents:creditsCents,
    statusView:statusView,
    shareUrl:shareUrl,
    inNative:inNative,
    innerHtml:innerHtml,
    dashboardCard:dashboardCard,
    bannerHtml:bannerHtml,
    wantsOpen:function(){return !!notice;},
    consumeScroll:function(){var w=wantScroll;wantScroll=false;return w;},
    load:load
  };
})(typeof window!=='undefined'?window:globalThis);
