/* Pending-day count uses the current Pending stint, not older accumulated days. Run: node --test tenure.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadState(){
  const store = {};
  const sandbox = {
    console,
    localStorage: { getItem(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; }, setItem(k,v){ store[k]=String(v); }, removeItem(k){ delete store[k]; } },
    sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    navigator: { languages:['en-US'], language:'en-US' },
    document: { documentElement: { lang:'' } },
    Intl, Date, setTimeout, clearTimeout, fetch: async()=>{ throw new Error('no network'); },
    URLSearchParams, encodeURIComponent, decodeURIComponent
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'i18n.js'),'utf8'), sandbox, {filename:'i18n.js'});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'app-state.js'),'utf8'), sandbox, {filename:'app-state.js'});
  return sandbox.AppState;
}

const S = loadState();
S.lang = 'en';
function shiftYmd(ymd, days){
  const [y,m,d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d));
  dt.setUTCDate(dt.getUTCDate()+days);
  return dt.toISOString().slice(0,10);
}
const today = S.chicagoYmd();
const yesterday = shiftYmd(today, -1);

test('a home that became Pending yesterday ignores an older pending total', ()=>{
  const l = {
    status:'PENDING',
    pendingSince: yesterday+'T22:01:00',
    pendingDaysAccum:7,
    daysPending:8,
    activeDaysAccum:31,
    daysActive:31
  };
  const info = S.listingTenure(l);
  assert.equal(info.text, '1 day on pending');
  assert.equal(info.sub, '31 days active');
  assert.equal(S.listingTenureDays(l).days, 1);
});

test('the same Chicago day reads as pending today, in English and Spanish', ()=>{
  const l = { status:'PENDING', pendingSince: today+'T08:00:00', pendingDaysAccum:7, daysPending:7 };
  assert.equal(S.listingTenure(l).text, 'Pending today');
  S.lang = 'es';
  assert.equal(S.listingTenure(l).text, 'Pendiente hoy');
  S.lang = 'en';
});

test('without a pending start time the stored day count is kept', ()=>{
  const l = { status:'PENDING', daysPending:4, pendingDaysAccum:4 };
  assert.equal(S.listingTenure(l).text, '4 days on pending');
});
