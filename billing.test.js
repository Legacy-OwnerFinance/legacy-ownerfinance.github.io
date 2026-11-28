/* Node tests for the agent subscription and referral UI. Run: node --test billing.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = __dirname;
function loadScripts(){
  const sandbox = {
    console,
    localStorage: {
      store: {},
      getItem(k){return Object.prototype.hasOwnProperty.call(this.store,k)?this.store[k]:null;},
      setItem(k,v){this.store[k]=String(v);},
      removeItem(k){delete this.store[k];}
    },
    navigator: {},
    URLSearchParams,
    decodeURIComponent,
    encodeURIComponent,
    Intl,
    Date,
    setTimeout,
    clearTimeout,
    Promise,
    document: undefined
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(rootDir,'i18n.js'),'utf8'), sandbox, {filename:'i18n.js'});
  vm.runInContext(fs.readFileSync(path.join(rootDir,'billing.js'),'utf8'), sandbox, {filename:'billing.js'});
  return sandbox;
}

const ctx = loadScripts();
const B = ctx.LegacyBilling;
ctx.AppState = {
  lang: 'en',
  user: {id:'agent-1', role:'AGENT', referral_code:'Agent42'},
  agentProfile(){return {id:'ap-1', userId:'agent-1', referral_code:'Agent42', inviteCode:'D2D-385TSN'};},
  billingSelect: async ()=>([]),
  api: async ()=>({userRows:[]}),
  rerender(){}
};

test('i18n keys for subscription exist in English and Spanish', ()=>{
  const en = ctx.I18N_MESSAGES.en, es = ctx.I18N_MESSAGES.es;
  const keys = Object.keys(en).filter(k=>k.startsWith('sub.'));
  assert.ok(keys.length>20);
    keys.forEach(k=>{
    assert.equal(typeof es[k], 'string', 'missing es '+k);
    if(k!=='sub.whatsapp')assert.notEqual(es[k], en[k], 'untranslated '+k);
  });
  assert.equal(en['sub.referralBody'], 'Earn $5 off your next charge for each agent who subscribes with your code (up to $19.99 per billing cycle). They get a 30-day free trial.');
  assert.equal(en['sub.native'], 'Manage your subscription at legacyownerfinance.net');
  assert.match(es['sub.referralBody'], /\$5/);
  assert.match(es['sub.referralBody'], /\$19\.99/);
  assert.match(es['sub.native'], /legacyownerfinance\.net/);
});

test('referral code from the landing query is stored and invalid codes are dropped', ()=>{
  assert.equal(B.captureRef('?ref=Ada-9'), 'Ada-9');
  assert.equal(B.savedRef(), 'Ada-9');
  assert.equal(B.captureRef('?ref='), 'Ada-9');
  assert.equal(B.normalizeRef('  bad code '), '');
  assert.equal(B.normalizeRef('a'), '');
  assert.equal(B.normalizeRef('../etc'), '');
  B.rememberRef('Ok_1');
  assert.equal(B.savedRef(), 'Ok_1');
  B.rememberRef('');
  assert.equal(B.savedRef(), '');
});

test('checkout body sends the plan and the stored referral code only', ()=>{
  const body=JSON.parse(JSON.stringify(B.buildCheckoutBody('monthly','Ok_1')));
  assert.deepEqual(body, {plan:'monthly', referral_code:'Ok_1'});
  assert.deepEqual(JSON.parse(JSON.stringify(B.buildCheckoutBody('yearly',''))), {plan:'yearly'});
  assert.throws(()=>B.buildCheckoutBody('weekly','Ok_1'));
  assert.deepEqual(JSON.parse(JSON.stringify(B.buildCheckoutBody('monthly','<script>'))), {plan:'monthly'});
});

test('share link uses the public site and the agent referral code', ()=>{
  assert.equal(B.shareUrl('Agent42'), 'https://legacyownerfinance.net/?ref=Agent42');
  assert.equal(B.shareUrl(''), '');
});

test('subscription status copy covers trial, active, and canceled', ()=>{
  ctx.AppState.lang='en';
  const trial=B.statusView({status:'trialing', plan:'monthly', trial_end:'2026-12-28T00:00:00Z', current_period_end:'2026-12-28T00:00:00Z'});
  assert.equal(trial.kind,'trial');
  assert.equal(trial.label,'Free trial');
  assert.match(trial.detail,/Trial ends/);
  assert.equal(trial.plan,'$19.99/month');
  const active=B.statusView({status:'active', plan:'yearly', current_period_end:'2027-11-28T00:00:00Z', cancel_at_period_end:false});
  assert.equal(active.kind,'active');
  assert.match(active.detail,/Renews/);
  assert.equal(active.plan,'$199.99/year');
  const canceled=B.statusView({status:'active', plan:'monthly', current_period_end:'2027-01-02T00:00:00Z', cancel_at_period_end:true});
  assert.match(canceled.detail,/will not renew/);
  ctx.AppState.lang='es';
  const esTrial=B.statusView({status:'trial', plan:'monthly', trial_end:'2026-12-28T00:00:00Z'});
  assert.equal(esTrial.label,'Prueba gratis');
  ctx.AppState.lang='en';
});

test('credits are $5 per subscribed agent and cap at $19.99', ()=>{
  const pending=[{status:'signed_up', referrer_id:'agent-1'}];
  assert.equal(B.creditsCents(pending), 0);
  const three=[
    {status:'active', referrer_id:'agent-1'},
    {status:'trialing', referrer_id:'agent-1'},
    {status:'pending', referrer_id:'agent-1'}
  ];
  assert.equal(B.creditsCents(three), 1000);
  const many=Array.from({length:8},()=>({status:'subscribed', credit_cents:500}));
  assert.equal(B.creditsCents(many), 1999);
});

test('referral rows from another agent are not shown', ()=>{
  const rows=[
    {id:'1', referrer_id:'agent-1', status:'active', name:'Mina'},
    {id:'2', referrer_id:'someone-else', status:'active', name:'Other'}
  ];
  const mine=B.ownRows(rows, ['agent-1','ap-1']);
  assert.deepEqual(mine.map(r=>r.id), ['1']);
  const unlabeled=[{id:'only'}];
  assert.equal(B.ownRows(unlabeled, ['agent-1']).length, 1);
  assert.equal(B.ownRows([{id:'a'},{id:'b'}], ['agent-1']).length, 0);
});

test('web subscription section shows both plans, LAUNCH50, and the referral card', ()=>{
  ctx.document={documentElement:{getAttribute(){return null;}}};
  ctx.LegacyNative={isNative:false};
  const html=B.innerHtml();
  assert.match(html, /data-bill-plan="monthly"/);
  assert.match(html, /data-bill-plan="yearly"/);
  assert.match(html, /\$19\.99/);
  assert.match(html, /\$199\.99/);
  assert.match(html, /LAUNCH50/);
  assert.match(html, /30-day free trial/);
  assert.match(html, /Earn \$5 off your next charge/);
  assert.match(html, /Agent42/);
  assert.match(html, /https:\/\/legacyownerfinance\.net\/\?ref=Agent42/);
  assert.match(html, /wa\.me/);
  assert.doesNotMatch(html, /583-7090/);
  assert.doesNotMatch(html, /Rivas/);
});

test('native wrapper hides purchase and portal buttons and does not link out to buy', ()=>{
  ctx.document={documentElement:{getAttribute(){return 'android';}}};
  ctx.LegacyNative={isNative:true};
  ctx.AppState.lang='en';
  const html=B.innerHtml();
  assert.match(html, /Manage your subscription at legacyownerfinance\.net/);
  assert.doesNotMatch(html, /data-bill-plan/);
  assert.doesNotMatch(html, /data-bill-portal/);
  assert.doesNotMatch(html, /<a [^>]*href="https:\/\/legacyownerfinance\.net/);
  assert.doesNotMatch(html, /checkout\.stripe\.com/);
  assert.match(html, /wa\.me/);
  ctx.AppState.lang='es';
  const es=B.innerHtml();
  assert.match(es, /Administra tu suscripción en legacyownerfinance\.net/);
  assert.doesNotMatch(es, /data-bill-plan/);
  ctx.LegacyNative={isNative:false};
  ctx.document={documentElement:{getAttribute(){return null;}}};
  ctx.AppState.lang='en';
});

test('root index.html keeps the Google site verification tag', ()=>{
  const html=fs.readFileSync(path.join(rootDir,'index.html'),'utf8');
  assert.match(html, /<meta name="google-site-verification" content="ZHP8aF3jL3UkIMWCwoZrANiWRnN1iiuUSsKXLqO1iLM"\s*\/>/);
  assert.match(html, /billing\.js/);
  const app=fs.readFileSync(path.join(rootDir,'app.html'),'utf8');
  assert.match(app, /billing\.js/);
});

test('signup passes the referral code and the new files never use the retired phone or name', ()=>{
  const state=fs.readFileSync(path.join(rootDir,'app-state.js'),'utf8');
  assert.match(state, /fields\.referral_code=referralCode/);
  assert.match(state, /create-checkout-session/);
  assert.match(state, /create-portal-session/);
  const ui=fs.readFileSync(path.join(rootDir,'app-ui.js'),'utf8');
  assert.match(ui, /name="referralCode"/);
  const files=['billing.js','app-state.js','app-ui.js','tours.js','i18n.js','index.html','app.html'];
  files.forEach(f=>{
    const text=fs.readFileSync(path.join(rootDir,f),'utf8');
    assert.doesNotMatch(text, /583-7090/, f);
    assert.doesNotMatch(text, /Rivas Legacy Group/, f);
  });
});
