(function(){
const KEY='legacy_of_state_v2';
try{localStorage.removeItem('legacy_of_state_v1');localStorage.removeItem('legacy_uid');sessionStorage.removeItem('legacy_uid');}catch(e){}
const TOKEN_KEY='legacy_session';
const SUPABASE_URL='https://oxcgtjryfcatlwjaxier.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94Y2d0anJ5ZmNhdGx3amF4aWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTMyMTcsImV4cCI6MjEwODc2OTIxN30.3ZD4V2_4n2tlccqlBnxH9YGuGGwkFQ_ovCuE-fZOrdY';
function savedManualLang(){
  try{
    const saved=localStorage.getItem('legacy_lang');
    if(saved==='en'||saved==='es')return saved;
  }catch(e){}
  return '';
}
function detectDeviceLang(){
  let tags=[];
  try{
    if(navigator.languages&&navigator.languages.length)tags=Array.prototype.slice.call(navigator.languages);
    else if(navigator.language)tags=[navigator.language];
  }catch(e){}
  const primary=String(tags[0]||'').toLowerCase();
  return primary.indexOf('en')===0?'en':'es';
}
function resolveLegacyLang(){
  return savedManualLang()||detectDeviceLang();
}
const initialLang=resolveLegacyLang();
try{document.documentElement.lang=initialLang;}catch(e){}
window.__legacyLang=initialLang;
const S=window.AppState={
  data:null,
  user:null,
  lang:initialLang,
  cloudConnected:false,
  lastSyncedAt:null,
  SUPABASE_URL:SUPABASE_URL,
  todayApprovedShowings:[],
  approvedShowingsCalendar:[],
  caps:{v13:false,ready:false,investor:false,messages:false,version:0},
  investorHome:null,
  investorTx:null,
  investorAdmin:null,
  alerts:[],
  myShowings:[],
  msgUnread:0,
  msgThreads:[],
  listeners:[]
};
const uid=()=>'id'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const now=()=>new Date().toISOString();
const toMs=v=>{if(!v)return 0;if(typeof v==='number')return v;const t=Date.parse(v);return isNaN(t)?0:t;};
const code=()=>'D2D-'+Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
const slugify=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const bc=()=>window.bcrypt||(window.dcodeIO&&window.dcodeIO.bcrypt);
S.on=f=>S.listeners.push(f);
const notify=()=>S.listeners.forEach(f=>f());

const sbHeaders=(extra={})=>Object.assign({
  'apikey':SUPABASE_ANON_KEY,
  'Authorization':'Bearer '+SUPABASE_ANON_KEY,
  'Content-Type':'application/json'
},extra);

const getToken=()=>{try{return localStorage.getItem(TOKEN_KEY)||'';}catch(e){return '';}};
function apiUrl(){
  const live=`${SUPABASE_URL}/functions/v1/api`;
  try{
    const host=String(location.hostname||'');
    if(host!=='localhost'&&host!=='127.0.0.1')return live;
    const q=new URLSearchParams(location.search).get('api');
    if(q&&/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/.test(q))return q;
  }catch(e){}
  return live;
}
async function api(action,body={}){
  const r=await fetch(apiUrl(),{method:'POST',headers:sbHeaders(getToken()?{'x-session':getToken()}:{}),body:JSON.stringify(Object.assign({action,lang:S.lang},body)),cache:'no-store'});
  let j={};try{j=await r.json();}catch(e){}
  if(j.error==='no_session'&&getToken()){try{localStorage.removeItem(TOKEN_KEY);}catch(e){}}
  if(!r.ok||j.error){const err=new Error(j.message||j.error||('HTTP '+r.status));err.code=j.error;err.status=j.status||r.status;throw err;}
  return j;
}
S.api=api;
async function sbUpsert(table,rows,onConflict){
  if(!getToken())return false;
  try{
    if(table==='app_kv_store'){const j=await api('save',{value:rows.value});S.lastSyncedAt=j.updatedAt;S.cloudConnected=true;return true;}
    await api('write',{table,rows});S.cloudConnected=true;return true;
  }catch(e){console.warn(`Save ${table} failed:`,e.message);return false;}
}
async function sbUpsertOLD(table,rows,onConflict){
  try{
    const q=onConflict?`?on_conflict=${onConflict}`:'';
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}${q}`,{
      method:'POST',
      headers:sbHeaders({'Prefer':'resolution=merge-duplicates,return=minimal'}),
      body:JSON.stringify(rows)
    });
    if(r.ok)S.cloudConnected=true;
    return r.ok;
  }catch(e){
    console.warn(`Supabase upsert ${table} error:`,e);
    return false;
  }
}

async function sbDelete(table,filterQuery){
  if(!getToken())return false;
  try{await api('write',{table,del:filterQuery});return true;}catch(e){return false;}
}
async function sbDeleteOLD(table,filterQuery){
  try{
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filterQuery}`,{
      method:'DELETE',
      headers:sbHeaders()
    });
    return r.ok;
  }catch(e){return false;}
}

async function sbUploadFile(file,folderSlug){
  try{
    const safeName=String(file.name||'file').replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=`${folderSlug||'general'}/${Date.now()}_${safeName}`;
    const r=await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${path}`,{
      method:'POST',
      headers:{
        'apikey':SUPABASE_ANON_KEY,
        'Authorization':'Bearer '+SUPABASE_ANON_KEY,
        'Content-Type':file.type||'application/octet-stream',
        'x-upsert':'true'
      },
      body:file
    });
    if(r.ok){
      return `${SUPABASE_URL}/storage/v1/object/public/documents/${path}`;
    }
  }catch(e){console.warn('Storage upload fallback to dataUrl:',e);}
  return null;
}

function userToRow(u){
  return {
    id:u.id,
    email:String(u.email||'').trim().toLowerCase(),
    name:u.name||'',
    phone:u.phone||'',
    role:u.role||'BUYER',
    avatar_url:u.avatarUrl||null,
    brokerage:u.brokerage||null,
    folder_slug:u.folderSlug||null,
    drive_folder_url:u.driveFolderUrl||null,
    agent_profile:S.agentProfile(u)||u.agentProfile||null,
    buyer_profile:S.buyerProfile(u)||u.buyerProfile||null,
    updated_at:now()
  };
}

function listingToRow(l){
  // Writable listing columns only. Tenure counters are computed by the API and must not be sent back.
  return {
    id:l.id,
    slug:l.slug||null,
    address:l.address||'',
    city:l.city||'',
    state:l.state||'OK',
    zip:l.zip||'',
    status:l.status||'AVAILABLE',
    asking_price:l.askingPrice||0,
    down_payment:l.downPayment||0,
    monthly_payment:l.monthlyPayment||0,
    term_years:l.termYears||30,
    beds:l.beds!=null?l.beds:null,
    baths:l.baths!=null?l.baths:null,
    sqft:l.sqft!=null?l.sqft:null,
    garage:l.garage||null,
    year_built:l.yearBuilt!=null?l.yearBuilt:null,
    description:l.description||'',
    public_title:l.publicTitle||'',
    public_summary:l.publicSummary||'',
    photo_url:l.photoUrl||null,
    photo_urls:l.photoUrls||[],
    photos_url:l.photosUrl||null,
    video_url:l.videoUrl||null,
    listing_url:l.listingUrl||null,
    latitude:l.latitude!=null?l.latitude:null,
    longitude:l.longitude!=null?l.longitude:null,
    approx_location:l.approxLocation||null,
    areas:l.areas||[],
    sold_at:l.soldAt?new Date(l.soldAt).toISOString():null,
    updated_at:now()
  };
}

const TENURE_PERSIST_KEYS=['firstActiveDate','activeSince','activeDaysAccum','pendingSince','pendingDaysAccum','daysActive','daysPending','first_active_date','active_since','active_days_accum','pending_since','pending_days_accum','days_active','days_pending'];
function listingWithoutTenure(l){
  if(!l||typeof l!=='object')return l;
  const out=Object.assign({},l);
  TENURE_PERSIST_KEYS.forEach(k=>{delete out[k];});
  return out;
}
function stateWithoutTenure(data){
  if(!data||typeof data!=='object')return data;
  const out=Object.assign({},data);
  if(Array.isArray(data.listings))out.listings=data.listings.map(listingWithoutTenure);
  if(Array.isArray(data.closedArchive))out.closedArchive=data.closedArchive.map(listingWithoutTenure);
  return out;
}
function persistLocalState(data){
  try{localStorage.setItem(KEY,JSON.stringify(stateWithoutTenure(data)));}catch(e){console.warn(e);}
}
function blankTenure(){
  return {firstActiveDate:null,activeSince:null,activeDaysAccum:null,pendingSince:null,pendingDaysAccum:null,daysActive:null,daysPending:null};
}
function tenureFromRow(r){
  const keys=['first_active_date','active_since','active_days_accum','pending_since','pending_days_accum','days_active','days_pending'];
  if(!r||!keys.some(k=>Object.prototype.hasOwnProperty.call(r,k)))return blankTenure();
  return {
    firstActiveDate:r.first_active_date??null,
    activeSince:r.active_since??null,
    activeDaysAccum:r.active_days_accum??null,
    pendingSince:r.pending_since??null,
    pendingDaysAccum:r.pending_days_accum??null,
    daysActive:r.days_active??null,
    daysPending:r.days_pending??null
  };
}

S.save=(skipCloud=false)=>{
  persistLocalState(S.data);
  notify();
  if(!skipCloud&&S.data){
    const ts=now();
    S.lastSyncedAt=ts;
    sbUpsert('app_kv_store',{key:KEY,value:stateWithoutTenure(S.data),updated_at:ts},'key');
  }
};

S.t=(k,v)=>window.translateI18n?window.translateI18n(S.lang,k,v):k;
S.setLang=l=>{
  if(l!=='en'&&l!=='es')return;
  S.lang=l;
  window.__legacyLang=l;
  try{document.documentElement.lang=l;}catch(e){}
  try{localStorage.setItem('legacy_lang',l);}catch(e){}
  notify();
};

const SOLD_RULE_CUTOFF_MS=Date.parse('2026-10-28T19:10:00.000Z');
const THREE_DAYS_MS=3*24*60*60*1000;
const INITIAL_REMOVED_SOLD_IDS=new Set(["cmvrdnnha001m9d7q45oilwjx", "cmvrjdcyl001e9d2tpbfdzby6", "cmvrjdcyp001f9d2t3umrtzbz", "cmvrjdcys001g9d2t3bsoa943", "cmvrjdcyu001h9d2thvvgn73a", "cmvrjdcyx001i9d2tr2i5k0ro", "cmvrjdcz0001j9d2t67rbpqva", "cmvrjdcz2001k9d2tg8u85svv", "cmvrjdcz5001l9d2txorvjmd5", "cmvrjdcz8001m9d2t4lpgyijc", "cmvrjdczb001n9d2twwg6shtr", "cmvrjdczd001o9d2tkcqgmfsf", "cmvrjdczg001p9d2tn0xqgwhp", "cmvrjdczl001r9d2te5oua2pn", "cmvrjdczn001s9d2tnck6vz3e", "cmvrjdczq001t9d2t1q4bm7sa", "cmvrjdczu001u9d2t40975kte", "cmvrjdczx001v9d2tsqqhqyk7", "cmvrjdd00001w9d2tzf47cqt5", "cmvrjdd02001x9d2ta5h7bnwg", "cmvrjdd05001y9d2tv45ifnz3", "cmvrjdd07001z9d2tq6xbh2dh", "cmvrjdd0a00209d2tp2gbqco4", "cmvrjdd0e00219d2tn44ve5ka", "cmvrjdd0g00229d2twkoh1pqo", "cmvrjdd0j00239d2tepha04eq", "cmvrjdd0m00249d2tb4lxrk43", "cmvrjdd0p00259d2tcvytdefv", "cmvrjdd0r00269d2td4s6rt6x", "cmvrjdd0u00279d2tclkg5k2s", "cmvrjdd0y00289d2t7zlg0bcj", "cmvrjdd1000299d2tlsvc9osk", "cmvrjdd13002a9d2t3umi2rph", "cmvrjdd16002b9d2t9r6xivm6", "cmvrjdd19002c9d2tnlaha5v7", "cmvrjdd1b002d9d2ty5wn5mxc", "cmvrjdd1e002e9d2thy423ez5"]);

function enforceThreeDaySoldRule(stateData){
  if(!stateData||!Array.isArray(stateData.listings))return false;
  stateData.removedSoldIds=Array.from(new Set([...(stateData.removedSoldIds||[]),...INITIAL_REMOVED_SOLD_IDS]));
  const removedSet=new Set(stateData.removedSoldIds);
  stateData.closedArchive=stateData.closedArchive||[];
  const archIds=new Set(stateData.closedArchive.map(x=>x&&x.id).filter(Boolean));
  let changed=false;
  const kept=[];
  for(const l of stateData.listings){
    if(!l||!l.id)continue;
    const isSold=(l.status==='SOLD'||l.status==='CLOSED');
    if(!isSold){
      if(removedSet.has(l.id)){
        kept.push(l);
      }else{
        kept.push(l);
      }
      continue;
    }
    const soldMs=toMs(l.soldAt||l.sold_at);
    const eligibleMovingForward=(soldMs>=SOLD_RULE_CUTOFF_MS)&&((Date.now()-soldMs)<=THREE_DAYS_MS);
    if(removedSet.has(l.id)&&!eligibleMovingForward){
      changed=true;
      continue;
    }
    if(!eligibleMovingForward){
      changed=true;
      removedSet.add(l.id);
      if(!archIds.has(l.id)){
        stateData.closedArchive.push(Object.assign({},l,{archivedAt:now()}));
        archIds.add(l.id);
      }
      sbDelete('listings',`id=eq.${l.id}`);
      continue;
    }
    kept.push(l);
  }
  stateData.removedSoldIds=Array.from(removedSet);
  if(kept.length!==stateData.listings.length)changed=true;
  stateData.listings=kept;
  return changed;
}

const LIST=['users','agentProfiles','buyerProfiles','offers','showings','messages','documents','favorites','propertyViews','propertyRequests','listings'];
function merge(base,incoming){
  if(!incoming)return base;
  LIST.forEach(k=>{
    const m=new Map((base[k]||[]).map(x=>[x.id,x]));
    (incoming[k]||[]).forEach(x=>{
      if(!x||!x.id)return;
      const prev=m.get(x.id);
      if(!prev){m.set(x.id,x);return;}
      const prevTs=toMs(prev.updatedAt||prev.updated_at||prev.respondedAt||prev.createdAt);
      const incTs=toMs(x.updatedAt||x.updated_at||x.respondedAt||x.createdAt);
      const merged=incTs>=prevTs?Object.assign({},prev,x):Object.assign({},x,prev);
      if(k==='listings'){
        const hasReal=u=>u&&u!=='listing-placeholder.svg';
        if(!hasReal(merged.photoUrl)){
          if(hasReal(prev.photoUrl))merged.photoUrl=prev.photoUrl;
          else if(hasReal(x.photoUrl))merged.photoUrl=x.photoUrl;
        }
        const prevPh=(prev.photoUrls||[]).filter(hasReal);
        const xPh=(x.photoUrls||[]).filter(hasReal);
        if(prevPh.length>xPh.length)merged.photoUrls=prev.photoUrls;
        else if(xPh.length>0)merged.photoUrls=x.photoUrls;
      }
      m.set(x.id,merged);
    });
    base[k]=[...m.values()];
  });
  return base;
}

async function fetchCloudState(){
  const st=await api('state');
  S.cloudConnected=true;
  S._me=st.me||null;
  if(!st.me&&getToken()){try{localStorage.removeItem(TOKEN_KEY);}catch(e){}}
  S.todayApprovedShowings=Array.isArray(st.todayApprovedShowings)?st.todayApprovedShowings:[];
  S.approvedShowingsCalendar=Array.isArray(st.approvedShowingsCalendar)?st.approvedShowingsCalendar:[];
  return {kvVal:st.kv||null,updatedAt:st.updatedAt,listRows:st.listRows||[],userRows:st.userRows||[],me:st.me||null,todayApprovedShowings:S.todayApprovedShowings,approvedShowingsCalendar:S.approvedShowingsCalendar};
}

function applyRelationalUsers(stateData,userRows){
  if(!Array.isArray(userRows)||!userRows.length)return;
  stateData.users=stateData.users||[];
  stateData.agentProfiles=stateData.agentProfiles||[];
  stateData.buyerProfiles=stateData.buyerProfiles||[];
  const byId=new Map(stateData.users.map(u=>[u.id,u]));
  const byEm=new Map(stateData.users.map(u=>[(u.email||'').toLowerCase(),u]));
  userRows.forEach(r=>{
    if(!r||!r.email)return;
    const em=String(r.email).trim().toLowerCase();
    const cur=byId.get(r.id)||byEm.get(em)||{};
    const curTs=toMs(cur.updatedAt||cur.createdAt);
    const rTs=toMs(r.updated_at||r.created_at);
    const preferRow=rTs>=curTs||!cur.passwordHash;
    const mergedUser=Object.assign({},cur,{
      id:r.id||cur.id,
      email:em,
      name:r.name||cur.name||'',
      phone:r.phone??cur.phone??'',
      role:r.role||cur.role||'BUYER',
      avatarUrl:r.avatar_url??cur.avatarUrl??null,
      brokerage:r.brokerage??cur.brokerage??null,
      folderSlug:r.folder_slug??cur.folderSlug??null,
      driveFolderUrl:r.drive_folder_url??cur.driveFolderUrl??null,
      emailVerified:r.email_verified,
      updatedAt:preferRow?(r.updated_at||cur.updatedAt):(cur.updatedAt||r.updated_at)
    });
    if(r.investor_profile){
      mergedUser.investorProfile=r.investor_profile;
      if(r.investor_profile.approvalStatus)mergedUser.approvalStatus=r.investor_profile.approvalStatus;
    }
    byId.set(mergedUser.id,mergedUser);
    if(r.agent_profile&&r.agent_profile.id){
      const idx=stateData.agentProfiles.findIndex(a=>a.id===r.agent_profile.id||a.userId===mergedUser.id);
      if(idx>=0)stateData.agentProfiles[idx]=Object.assign({},stateData.agentProfiles[idx],r.agent_profile);
      else stateData.agentProfiles.push(r.agent_profile);
    }
    if(r.buyer_profile&&r.buyer_profile.id){
      const idx=stateData.buyerProfiles.findIndex(b=>b.id===r.buyer_profile.id||b.userId===mergedUser.id);
      if(idx>=0)stateData.buyerProfiles[idx]=Object.assign({},stateData.buyerProfiles[idx],r.buyer_profile);
      else stateData.buyerProfiles.push(r.buyer_profile);
    }
  });
  stateData.users=[...byId.values()];
}

function applyRelationalListings(stateData,listRows,opts){
  if(!Array.isArray(listRows)||!listRows.length)return false;
  const allowTenure=!!(opts&&opts.allowTenure);
  const byId=new Map((stateData.listings||[]).map(l=>[l.id,l]));
  let tenureChanged=false;
  listRows.forEach(r=>{
    const cur=byId.get(r.id)||{};
    const tenure=allowTenure?tenureFromRow(r):blankTenure();
    const next=Object.assign({},cur,{
      id:r.id,
      slug:r.slug??cur.slug,
      address:r.address??cur.address,
      city:r.city??cur.city,
      state:r.state??cur.state,
      zip:r.zip??cur.zip,
      status:r.status??cur.status,
      askingPrice:r.asking_price!=null?+r.asking_price:cur.askingPrice,
      downPayment:r.down_payment!=null?+r.down_payment:cur.downPayment,
      monthlyPayment:r.monthly_payment!=null?+r.monthly_payment:cur.monthlyPayment,
      termYears:r.term_years!=null?+r.term_years:cur.termYears,
      beds:r.beds!=null?+r.beds:cur.beds,
      baths:r.baths!=null?+r.baths:cur.baths,
      sqft:r.sqft!=null?+r.sqft:cur.sqft,
      garage:r.garage??cur.garage,
      yearBuilt:r.year_built!=null?+r.year_built:cur.yearBuilt,
      description:r.description??cur.description,
      publicTitle:r.public_title??cur.publicTitle,
      publicSummary:r.public_summary??cur.publicSummary,
      photoUrl:(r.photo_url&&r.photo_url!=='listing-placeholder.svg')?r.photo_url:(cur.photoUrl||r.photo_url),
      photoUrls:(Array.isArray(r.photo_urls)&&r.photo_urls.some(u=>u&&u!=='listing-placeholder.svg'))?r.photo_urls:(cur.photoUrls||r.photo_urls),
      photosUrl:r.photos_url??cur.photosUrl,
      videoUrl:r.video_url??cur.videoUrl,
      listingUrl:r.listing_url??cur.listingUrl,
      latitude:r.latitude!=null?+r.latitude:cur.latitude,
      longitude:r.longitude!=null?+r.longitude:cur.longitude,
      approxLocation:r.approx_location??cur.approxLocation,
      areas:r.areas??cur.areas,
      soldAt:r.sold_at??cur.soldAt??null,
      investorId:Object.prototype.hasOwnProperty.call(r,'investor_id')?r.investor_id:(cur.investorId??null),
      sourceSheetId:Object.prototype.hasOwnProperty.call(r,'source_sheet_id')?r.source_sheet_id:(cur.sourceSheetId??null),
      inspectionAt:Object.prototype.hasOwnProperty.call(r,'inspection_at')?r.inspection_at:(cur.inspectionAt??null),
      firstActiveDate:tenure.firstActiveDate,
      activeSince:tenure.activeSince,
      activeDaysAccum:tenure.activeDaysAccum,
      pendingSince:tenure.pendingSince,
      pendingDaysAccum:tenure.pendingDaysAccum,
      daysActive:tenure.daysActive,
      daysPending:tenure.daysPending
    });
    if(['firstActiveDate','activeSince','activeDaysAccum','pendingSince','pendingDaysAccum','daysActive','daysPending'].some(k=>String(cur[k]??'')!==String(next[k]??'')))tenureChanged=true;
    byId.set(r.id,next);
  });
  const live=new Set(listRows.map(r=>r.id));
  stateData.listings=[...byId.values()].filter(l=>live.has(l.id));
  return tenureChanged;
}

let portalTick=0;
function sameJson(a,b){try{return JSON.stringify(a)===JSON.stringify(b);}catch(e){return false;}}
function capsFrom(raw){
  const version=Number(raw&&raw.version)||0;
  const v13=version>=13;
  return {v13,ready:v13&&!!(raw&&raw.ready),investor:version>=14&&!!(raw&&raw.investor),messages:version>=15&&!!(raw&&raw.messages_badge),version};
}
function clearMsgUnread(){
  const changed=!!S.msgUnread||(S.msgThreads&&S.msgThreads.length>0);
  S.msgUnread=0;
  S.msgThreads=[];
  return changed;
}
async function refreshPortal(opts){
  const fromPoll=!!(opts&&opts.fromPoll);
  portalTick++;
  if(fromPoll&&!(S.caps&&S.caps.ready)&&portalTick%4!==0)return false;
  try{
    let parsed=S.caps&&S.caps.version?S.caps:null;
    if(!parsed||!parsed.ready){
      parsed=capsFrom(await api('portal_caps'));
    }
    const version13=!!parsed.v13;
    const ready=!!parsed.ready;
    const investor=!!parsed.investor;
    if(!ready||!S.user){
      const msgCleared=clearMsgUnread();
      const changed=!!(S.caps&&S.caps.ready)||(S.alerts||[]).length>0||(S.myShowings||[]).length>0||!!(S.caps&&S.caps.investor)!==investor||!!(S.caps&&S.caps.messages)||msgCleared;
      S.caps={v13:version13,ready:false,investor,messages:false,version:parsed.version||0};
      S.alerts=[];S.myShowings=[];
      return changed;
    }
    const home=await api('portal_home');
    if(!home||home.unavailable){
      const msgCleared=clearMsgUnread();
      const changed=!!(S.caps&&S.caps.ready)||msgCleared;
      S.caps={v13:version13,ready:false,investor:false,messages:false,version:parsed.version||0};
      S.alerts=[];S.myShowings=[];
      return changed;
    }
    const nextA=Array.isArray(home.alerts)?home.alerts:[];
    const nextS=Array.isArray(home.showings)?home.showings:[];
    const messages=!!parsed.messages;
    let msgChanged=false;
    if(!messages)msgChanged=clearMsgUnread();
    else if(typeof home.messagesUnread==='number'&&(home.messagesUnread|0)!==(S.msgUnread|0)){
      S.msgUnread=home.messagesUnread|0;
      msgChanged=true;
    }
    const changed=!(S.caps&&S.caps.ready)||!!(S.caps&&S.caps.investor)!==investor||!!(S.caps&&S.caps.messages)!==messages||!sameJson(S.alerts,nextA)||!sameJson(S.myShowings,nextS)||msgChanged;
    S.caps={v13:true,ready:true,investor,messages,version:parsed.version||(investor?14:13)};
    S.alerts=nextA;
    S.myShowings=nextS;
    return changed;
  }catch(e){
    if(e&&(e.code==='bad_action'||e.status===404)){
      const msgCleared=clearMsgUnread();
      const changed=!!(S.caps&&(S.caps.ready||S.caps.v13||S.caps.investor||S.caps.messages))||msgCleared;
      S.caps={v13:false,ready:false,investor:false,messages:false,version:0};
      S.alerts=[];S.myShowings=[];
      return changed;
    }
    return false;
  }
}
let lastMsgPoll=0;
function msgEnabled(){return !!(S.user&&S.caps&&S.caps.ready&&S.caps.messages);}
async function refreshMsgUnread(){
  if(!msgEnabled())return clearMsgUnread();
  try{
    const r=await api('messages_unread_count');
    if(!r||r.error)return false;
    if(r.unavailable)return clearMsgUnread();
    const threads=Array.isArray(r.threads)?r.threads:[];
    const changed=(r.count|0)!==(S.msgUnread|0)||!sameJson(threads,S.msgThreads);
    S.msgUnread=r.count|0;
    S.msgThreads=threads;
    return changed;
  }catch(e){
    if(e&&e.code==='no_session')return clearMsgUnread();
    return false;
  }
}
async function refreshMsgUnreadPolled(force){
  if(!msgEnabled())return refreshMsgUnread();
  const t=Date.now();
  if(!force&&t-lastMsgPoll<30000)return false;
  lastMsgPoll=t;
  return refreshMsgUnread();
}
async function markVisibleThreadRead(){
  let peerId='';
  try{
    const el=document.querySelector('.msg-chat[data-peer]');
    peerId=el?(el.getAttribute('data-peer')||''):'';
  }catch(e){peerId='';}
  if(!peerId||!msgEnabled())return false;
  const unread=(S.msgThreads||[]).some(t=>t&&t.peerId===peerId&&(t.unread|0)>0);
  if(!unread)return false;
  await markThreadRead(peerId);
  return true;
}
function paintMsgBadgeSoon(){
  try{if(window.__paintMsgBadge)window.__paintMsgBadge();}catch(e){}
}
function notifyMsgChange(){
  const active=document.activeElement;
  const isTyping=active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA'||active.tagName==='SELECT')&&active.name!=='q';
  if(!isTyping&&!document.querySelector('.modal-backdrop'))notify();
  else paintMsgBadgeSoon();
}
async function markThreadRead(peerId){
  if(!peerId)return;
  S.msgThreads=(S.msgThreads||[]).filter(t=>t&&t.peerId!==peerId);
  S.msgUnread=S.msgThreads.reduce((n,t)=>n+(t.unread|0),0);
  if(!msgEnabled())return;
  try{
    const r=await api('messages_mark_read',{peerId});
    if(r&&r.ok){S.msgUnread=r.count|0;S.msgThreads=Array.isArray(r.threads)?r.threads:[];}
  }catch(e){}
}
S.msgEnabled=msgEnabled;
S.refreshMsgUnread=refreshMsgUnread;
S.markThreadRead=markThreadRead;
async function refreshInvestor(){
  if(!(S.caps&&S.caps.investor)||!S.user){
    const had=!!(S.investorHome||S.investorTx||S.investorAdmin);
    S.investorHome=null;S.investorTx=null;
    return had;
  }
  try{
    if(S.isAdmin()){
      const onAdmin=(location.hash==='#admin')||String(location.pathname||'').toLowerCase().indexOf('/admin')>=0;
      if(!onAdmin&&S.investorAdmin)return false;
      const j=await api('investor_admin');
      if(!j||j.unavailable)return false;
      const changed=!sameJson(S.investorAdmin,j);
      S.investorAdmin=j;
      return changed;
    }
    if(!S.isInvestor()||S.isPendingApproval(S.user)){
      const had=!!(S.investorHome||S.investorTx);
      S.investorHome=null;S.investorTx=null;
      return had;
    }
    const home=await api('investor_home');
    const tx=await api('investor_transactions');
    if(!home||home.unavailable){
      const had=!!S.investorHome;
      S.investorHome=null;S.investorTx=null;
      return had;
    }
    const changed=!sameJson(S.investorHome,home)||!sameJson(S.investorTx,tx);
    S.investorHome=home;
    S.investorTx=tx;
    return changed;
  }catch(e){return false;}
}
S.refreshInvestor=refreshInvestor;
S.refreshPortal=refreshPortal;
S.markAlertsRead=async()=>{
  if(!S.caps||!S.caps.ready||!S.user)return;
  if(!(S.alerts||[]).some(a=>!a.readAt))return;
  try{
    const j=await api('alerts_read',{all:true});
    if(j&&Array.isArray(j.alerts))S.alerts=j.alerts;
    notify();
  }catch(e){}
};
S.saveFeedback=async(showingId,fields)=>{
  const j=await api('showing_feedback_save',Object.assign({showingId},fields||{}));
  if(j&&j.unavailable)throw new Error(S.t('ops.unavailable'));
  await refreshPortal();
  notify();
  return j;
};
S.showingVisit=async(showingId,event,geo)=>{
  const body={showingId,event};
  if(geo&&geo.lat!=null&&geo.lng!=null){body.lat=geo.lat;body.lng=geo.lng;body.accuracy=geo.accuracy;}
  const j=await api('showing_visit',body);
  if(j&&j.unavailable)throw new Error(S.t('ops.unavailable'));
  await refreshPortal();
  notify();
  return j;
};
S.loadActivity=async listingId=>{
  const j=await api('property_activity',{listingId});
  if(j&&j.unavailable)throw new Error(S.t('ops.unavailable'));
  return j;
};

S.load=async()=>{
  let base={};
  try{base=await fetch('app-data.json',{cache:'no-store'}).then(r=>r.json());}catch(e){console.warn(e);}
  LIST.forEach(k=>base[k]=base[k]||[]);
  let local=null;
  try{local=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
  let merged=merge(base,local);
  try{
    const {kvVal,updatedAt,listRows,userRows}=await fetchCloudState();
    if(kvVal){
      merged=merge(merged,kvVal);
      if(Array.isArray(kvVal.removedSoldIds)){
        merged.removedSoldIds=Array.from(new Set([...(merged.removedSoldIds||[]),...kvVal.removedSoldIds]));
      }
    }
    applyRelationalUsers(merged,userRows);
    applyRelationalListings(merged,listRows,{allowTenure:!!S._me});
    S.lastSyncedAt=updatedAt;
  }catch(e){
    console.warn('Offline or fallback to app-data.json:',e);
    S.cloudConnected=false;
  }
  enforceThreeDaySoldRule(merged);
  persistLocalState(merged);
  S.data=merged;
  S.data.users=(S.data.users||[]).map(u=>{const c=Object.assign({},u);delete c.passwordHash;delete c.resetCode;delete c.resetExpires;return c;});
  S.user=S._me?(S.data.users.find(u=>u.id===S._me.id)||S._me):null;
  if(S.user&&!S.data.users.some(u=>u.id===S.user.id))S.data.users.push(S.user);
  try{await refreshPortal();}catch(e){}
  try{if(S.user&&S._me){if(S._me.role)S.user.role=S._me.role;if(S._me.approvalStatus)S.user.approvalStatus=S._me.approvalStatus;if(S._me.investorProfile)S.user.investorProfile=S._me.investorProfile;}}catch(e){}
  try{await refreshInvestor();}catch(e){}
  try{lastMsgPoll=Date.now();await refreshMsgUnread();}catch(e){}
  startRealtimePolling();
};

async function pollSupabase(opts){
  try{
    const tk=getToken();
    const st=await api('state');
    S.cloudConnected=true;
    if(tk!==getToken())return;
    if(S.user&&!st.me){if(tk){S.user=null;clearMsgUnread();notify();}return;}
    const rows=st.kv?[{value:st.kv,updated_at:st.updatedAt}]:[];
    const userRows=st.userRows||[];
    let changed=false;
    if(rows&&rows[0]&&rows[0].value){
      const remoteTs=rows[0].updated_at;
      if(remoteTs&&remoteTs!==S.lastSyncedAt){
        S.lastSyncedAt=remoteTs;
        const remoteVal=rows[0].value;
        if(Array.isArray(remoteVal.removedSoldIds)){
          S.data.removedSoldIds=Array.from(new Set([...(S.data.removedSoldIds||[]),...remoteVal.removedSoldIds]));
        }
        S.data=merge(S.data,remoteVal);
        enforceThreeDaySoldRule(S.data);
        if(Array.isArray(remoteVal.favorites))S.data.favorites=remoteVal.favorites;
        changed=true;
      }
    }
    if(userRows&&userRows.length){
      applyRelationalUsers(S.data,userRows);
    }
    if(st.listRows&&st.listRows.length){if(applyRelationalListings(S.data,st.listRows,{allowTenure:!!st.me}))changed=true;}
    const nextToday=Array.isArray(st.todayApprovedShowings)?st.todayApprovedShowings:[];
    const nextCal=Array.isArray(st.approvedShowingsCalendar)?st.approvedShowingsCalendar:[];
    const todayChanged=JSON.stringify(nextToday)!==JSON.stringify(S.todayApprovedShowings||[]);
    const calChanged=JSON.stringify(nextCal)!==JSON.stringify(S.approvedShowingsCalendar||[]);
    if(todayChanged){S.todayApprovedShowings=nextToday;changed=true;}
    if(calChanged){S.approvedShowingsCalendar=nextCal;changed=true;}
    try{if(await refreshPortal({fromPoll:true}))changed=true;}catch(e){}
    try{if(await refreshMsgUnreadPolled(!!(opts&&opts.forceMsg)))changed=true;}catch(e){}
    try{if(await markVisibleThreadRead())changed=true;}catch(e){}
    try{if(await refreshInvestor())changed=true;}catch(e){}
    if(changed){
      if(S.user){S.user=S.data.users.find(u=>u.id===S.user.id)||S.user;}
      persistLocalState(S.data);
      const active=document.activeElement;
      const isTyping=active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA'||active.tagName==='SELECT')&&active.name!=='q';
      if(!isTyping&&!document.querySelector('.modal-backdrop'))notify();
      else paintMsgBadgeSoon();
    }
  }catch(e){S.cloudConnected=false;}
}

let pollTimer=null;
let pollWatchers=false;
function startRealtimePolling(){
  if(pollTimer)clearInterval(pollTimer);
  pollTimer=setInterval(()=>pollSupabase(),8000);
  if(pollWatchers)return;
  pollWatchers=true;
  window.addEventListener('focus',()=>pollSupabase({forceMsg:true}));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')pollSupabase({forceMsg:true});
  });
}

const byEmail=e=>{
  const norm=String(e||'').trim().toLowerCase();
  if(!norm||!S.data||!S.data.users)return null;
  const target=(norm==='fernando@legacy.app')?'fer.okc94@gmail.com':norm;
  return S.data.users.find(u=>(u.email||'').trim().toLowerCase()===target)||(norm!==target?S.data.users.find(u=>(u.email||'').trim().toLowerCase()===norm):null);
};
S.byEmail=byEmail;
S.agentProfile=u=>u&&(S.data.agentProfiles.find(a=>a.userId===u.id)||u.agentProfile||null);
S.buyerProfile=u=>u&&(S.data.buyerProfiles.find(b=>b.userId===u.id)||u.buyerProfile||null);
S.isAdmin=()=>Boolean(S.user&&(S.user.role==='ADMIN'||['admin@therivaslegacygroup.com','fer.okc94@gmail.com','admin@legacy.app','fernando@legacy.app'].includes((S.user.email||'').toLowerCase())));
S.isAgent=()=>Boolean(S.user&&(S.user.role==='AGENT'||(S.user.email||'').toLowerCase()==='admin@therivaslegacygroup.com'));
S.isInvestor=()=>Boolean(S.user&&S.user.role==='INVESTOR'&&!S.isAdmin());
S.ownsListing=l=>Boolean(l&&S.user&&l.investorId&&l.investorId===S.user.id);
S.listing=id=>S.data.listings.find(l=>l.id===id);
function setUser(u){S.user=u;S.save(true);}

async function adoptSession(j){
  try{localStorage.setItem(TOKEN_KEY,j.token);}catch(e){}
  const st=j.state||{};
  S._me=st.me||j.user;
  let merged=S.data;
  if(st.kv)merged=merge(merged,st.kv);
  applyRelationalUsers(merged,st.userRows||[]);
  applyRelationalListings(merged,st.listRows||[],{allowTenure:!!S._me});
  S.lastSyncedAt=st.updatedAt||S.lastSyncedAt;
  S.data=merged;
  let u=S.data.users.find(x=>x.id===S._me.id);
  if(!u){u=S._me;S.data.users.push(u);}else Object.assign(u,S._me);
  setUser(u);
  try{await refreshPortal();}catch(e){}
  try{await refreshInvestor();}catch(e){}
  try{lastMsgPoll=Date.now();await refreshMsgUnread();}catch(e){}
  return u;
}
S.login=async(email,pw)=>{
  const j=await api('login',{email,password:pw});
  if(j.needsVerify)return {needsVerify:true,email:j.email};
  return adoptSession(j);
};
S.logout=()=>{try{localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(KEY);}catch(e){}S.user=null;S._me=null;S.msgUnread=0;S.msgThreads=[];location.hash='inventory';location.reload();};
S.isPendingApproval=u=>Boolean(u&&(u.approvalStatus==='PENDING'||u.approvalStatus==='REJECTED'));
const needApproved=()=>{if(S.user&&!S.isAdmin()&&S.isPendingApproval(S.user))throw new Error(S.lang==='es'?'Tu cuenta está pendiente de aprobación. Te avisaremos cuando esté aprobada.':'Your account is pending approval. We will let you know once it is approved.');};
S.setApproval=async(userId,status)=>{const u=S.data.users.find(x=>x.id===userId);if(!u)return;if(S.caps&&S.caps.investor&&u.role==='INVESTOR'){const j=await api('investor_review',{userId,status});if(j&&j.unavailable)throw new Error(S.lang==='es'?'Las herramientas de inversionista aún no están activas.':'Investor tools are not active yet.');}u.approvalStatus=status;u.approvedAt=now();u.updatedAt=now();if(u.investorProfile)u.investorProfile=Object.assign({},u.investorProfile,{approvalStatus:status});if(S.user&&S.user.id===u.id)S.user.approvalStatus=status;S.save();};
const hash=pw=>{
  const clean=String(pw||'').trim();
  if(clean.length<8)throw new Error(S.lang==='es'?'La contraseña debe tener al menos 8 caracteres':'Password must be at least 8 characters');
  return bc().hashSync(clean,10);
};
S.register=async f=>{
  if(f.role==='INVESTOR'&&!(S.caps&&S.caps.investor))throw new Error(S.lang==='es'?'El registro de inversionistas todavía no está disponible.':'Investor signup is not available yet.');
  const fields={name:f.role==='INVESTOR'?(f.representativeName||f.name):f.name,email:f.email,phone:f.phone,password:f.password,role:f.role,inviteCode:f.inviteCode,licenseNumber:f.licenseNumber,brokerage:f.brokerage,businessName:f.businessName,contactMethod:f.contactMethod,contactValue:f.contactValue,representativeName:f.representativeName};
  const j=await api('register',{fields});
  if(j.needsVerify)return {needsVerify:true,email:j.email,pendingReview:!!j.pendingReview,role:f.role};
  const u=await adoptSession(j);
  if(j.pendingReview)u.pendingReview=true;
  return u;
};
S.saveOwnListing=async(id,fields)=>{
  const j=await api('investor_listing_save',{listingId:id,fields});
  if(!j||j.unavailable||j.error)throw new Error((j&&j.message)||(S.lang==='es'?'No se pudo guardar.':'Could not save.'));
  const l=S.listing(id);if(l)Object.assign(l,fields,{inspectionAt:fields.inspectionAt||null,updatedAt:now()});
  S.save(true);notify();
  try{await refreshInvestor();}catch(e){}
  return j;
};
S.saveInspection=async(listingId,inspectionAt)=>{
  const j=await api('listing_inspection',{listingId,inspectionAt:inspectionAt||''});
  if(!j||j.unavailable||j.error)throw new Error((j&&j.message)||(S.lang==='es'?'No se pudo guardar la inspección.':'Could not save the inspection.'));
  const l=S.listing(listingId);if(l)l.inspectionAt=inspectionAt||null;
  return j;
};
S.decideShowing=async(id,status)=>{
  const j=await api('showing_decide',{showingId:id,status});
  if(!j||j.unavailable||j.error)throw new Error((j&&j.message)||(S.lang==='es'?'No se pudo actualizar la visita.':'Could not update the showing.'));
  const sh=(S.data.showings||[]).find(x=>x.id===id);if(sh)sh.status=status;
  try{await refreshInvestor();}catch(e){}
  setTimeout(()=>{try{api('state').then(st=>{S.todayApprovedShowings=Array.isArray(st.todayApprovedShowings)?st.todayApprovedShowings:S.todayApprovedShowings;S.approvedShowingsCalendar=Array.isArray(st.approvedShowingsCalendar)?st.approvedShowingsCalendar:S.approvedShowingsCalendar;notify();});}catch(e){}},400);
  notify();
  return j;
};
S.messageShowingAgent=async(id,body)=>{
  const j=await api('showing_message',{showingId:id,body});
  if(!j||j.unavailable||j.error)throw new Error((j&&j.message)||(S.lang==='es'?'No se pudo enviar el mensaje.':'Could not send the message.'));
  return j;
};
S.saveInvestorSheets=async(userId,sheets)=>{
  const j=await api('investor_sheets_save',{userId,sheets});
  if(!j||j.unavailable||j.error)throw new Error((j&&j.message)||(S.lang==='es'?'No se pudo guardar la hoja.':'Could not save the spreadsheet.'));
  S.investorAdmin=j;
  return j;
};
S.assignInvestorListings=async(userId,listingIds,unassignIds)=>{
  const j=await api('investor_assign',{userId,listingIds:listingIds||[],unassignIds:unassignIds||[]});
  if(!j||j.unavailable||j.error)throw new Error((j&&j.message)||(S.lang==='es'?'No se pudo asignar la casa.':'Could not assign the home.'));
  S.investorAdmin=j;
  try{const st=await api('state');if(st&&st.listRows)applyRelationalListings(S.data,st.listRows,{allowTenure:!!st.me});}catch(e){}
  return j;
};
// Email verification (server API). verify returns a session on success.
S.emailVerify=async(action,email,code)=>{
  try{
    if(action==='send'){return Object.assign({enabled:true},await api('verify_send',{email}));}
    if(action==='verify'){const j=await api('verify',{email,code});await adoptSession(j);return {enabled:true,verified:true,session:true};}
  }catch(e){return {enabled:e.code!=='email_off',error:e.code||'send_failed'};}
  return {enabled:false};
};
S.loginAfterVerify=()=>S.user;
S.forgotPassword=async email=>{await api('forgot',{email});return true;};
S.resetPassword=async(email,codeIn,pw)=>{const j=await api('reset',{email,code:codeIn,password:pw});return adoptSession(j);};
S.changePassword=async(cur,pw)=>{await api('change_password',{current:cur,password:pw});};
S.adminResetPassword=async(userId,pw)=>{if(!S.isAdmin())throw new Error('Admins only');await api('admin_reset',{userId,password:pw});};
S.updateProfile=p=>{Object.assign(S.user,p,{updatedAt:now()});const ap=S.agentProfile(S.user);
  if(ap){if(p.licenseNumber!=null)ap.licenseNumber=p.licenseNumber;if(p.brokerage!=null)ap.brokerage=p.brokerage;}
  S.save();sbUpsert('app_users',userToRow(S.user),'id');};
const readFile=file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
S.uploadAvatar=async file=>{
  const cloudUrl=await sbUploadFile(file,S.user.folderSlug||'avatars');
  S.user.avatarUrl=cloudUrl||await readFile(file);
  S.user.updatedAt=now();
  S.save();
  sbUpsert('app_users',userToRow(S.user),'id');
};
const bpFor=u=>{let bp=S.buyerProfile(u);if(!bp){bp={id:uid(),userId:u.id,notes:'',accountStatus:'ACTIVE'};S.data.buyerProfiles.push(bp);}u.buyerProfile=bp;return bp;};
S.saveSearchCriteria=c=>{if(!S.user)throw new Error('Please log in');const bp=bpFor(S.user);
  const n=v=>v===''||v==null||isNaN(+v)||+v<=0?'':+v;
  bp.searchCriteria={beds:n(c.beds),baths:n(c.baths),cities:Array.isArray(c.cities)?c.cities.filter(Boolean):[],maxPrice:n(c.maxPrice),maxDown:n(c.maxDown),maxMonthly:n(c.maxMonthly),minSqft:n(c.minSqft),updatedAt:now()};
  bp.criteriaPrompted=true;bp.updatedAt=now();S.user.updatedAt=now();S.save();sbUpsert('app_users',userToRow(S.user),'id');};
S.markCriteriaPrompted=()=>{if(!S.user)return;const bp=bpFor(S.user);bp.criteriaPrompted=true;bp.updatedAt=now();S.user.updatedAt=now();S.save();sbUpsert('app_users',userToRow(S.user),'id');};
S.isFavorite=lid=>S.user&&S.data.favorites.some(f=>f.userId===S.user.id&&f.listingId===lid);
S.toggleFavorite=lid=>{if(!S.user)throw new Error(S.lang==='es'?'Inicia sesión primero':'Please log in');
  const i=S.data.favorites.findIndex(f=>f.userId===S.user.id&&f.listingId===lid);
  if(i>=0){
    const removed=S.data.favorites.splice(i,1)[0];
    if(removed&&removed.id)sbDelete('favorites',`id=eq.${removed.id}`);
  }else{
    const fav={id:uid(),userId:S.user.id,listingId:lid,createdAt:now()};
    S.data.favorites.push(fav);
    sbUpsert('favorites',{id:fav.id,user_id:fav.userId,listing_id:fav.listingId,created_at:fav.createdAt},'id');
  }
  S.save();
};
S.recordView=lid=>{if(!S.user)return;
  S.data.propertyViews=S.data.propertyViews.filter(v=>!(v.userId===S.user.id&&v.listingId===lid));
  const v={id:uid(),userId:S.user.id,listingId:lid,createdAt:now()};
  S.data.propertyViews.push(v);
  S.save();
  sbUpsert('property_views',{id:v.id,user_id:v.userId,listing_id:v.listingId,viewed_at:v.createdAt},'id');
};
S.agentFor=u=>{const bp=S.buyerProfile(u);if(!bp)return null;const ap=S.data.agentProfiles.find(a=>a.id===bp.agentId);
  return ap&&S.data.users.find(x=>x.id===ap.userId);};
S.clientsOf=u=>{const ap=S.agentProfile(u);if(!ap)return[];return S.data.buyerProfiles.filter(b=>b.agentId===ap.id).map(b=>S.data.users.find(x=>x.id===b.userId)).filter(Boolean);};
S.sendMessage=({toUserId,listingId,kind,body})=>{if(!S.user)throw new Error(S.lang==='es'?'Inicia sesión primero':'Please log in');
  const m={id:uid(),fromUserId:S.user.id,toUserId,listingId:listingId||null,kind:kind||'MESSAGE',body,createdAt:now()};
  S.data.messages.push(m);
  if(kind==='REQUEST_ACCESS')S.data.propertyRequests.push({id:uid(),userId:S.user.id,listingId,status:'PENDING',createdAt:now()});
  S.save();
  sbUpsert('messages',{
    id:m.id,
    sender_id:m.fromUserId,
    receiver_id:m.toUserId,
    buyer_id:S.user.role==='BUYER'?S.user.id:m.toUserId,
    agent_id:S.user.role==='AGENT'?S.user.id:m.toUserId,
    listing_id:m.listingId,
    action_type:m.kind,
    body:m.body,
    created_at:m.createdAt
  },'id');
  lastMsgPoll=Date.now();
  refreshMsgUnread().then(ch=>{if(ch)notifyMsgChange();}).catch(()=>{});
  return m;
};
S.myMessages=()=>S.user?S.data.messages.filter(m=>m.fromUserId===S.user.id||m.toUserId===S.user.id):[];
S.submitOffer=f=>{if(!S.user)throw new Error(S.lang==='es'?'Inicia sesión primero':'Please log in');needApproved();
  const o={id:uid(),userId:S.user.id,listingId:f.listingId,offerPrice:+f.offerPrice*100,
    downPayment:+f.downPayment*100,monthlyPayment:+f.monthlyPayment*100,notes:f.notes||'',inspections:f.inspections==='YES',status:'SUBMITTED',createdAt:now()};
  S.data.offers.push(o);
  S.save();
  sbUpsert('offers',{
    id:o.id,
    listing_id:o.listingId,
    user_id:o.userId,
    buyer_name:S.user.name||'',
    buyer_email:S.user.email||'',
    buyer_phone:S.user.phone||'',
    offered_price:o.offerPrice,
    down_payment:o.downPayment,
    monthly_payment:o.monthlyPayment,
    notes:o.notes,
    status:o.status,
    created_at:o.createdAt,
    updated_at:o.createdAt
  },'id');
  return o;
};
S.chicagoYmd=(d=new Date())=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}catch(e){return d.toISOString().slice(0,10);}};
const TENURE_MONTHS_EN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TENURE_MONTHS_ES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function ctYmdOf(value){
  if(value==null||value==='')return '';
  const s=String(value).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  if(/^\d{4}-\d{2}-\d{2}T/.test(s)&&!/[zZ]$/.test(s)&&!/[+\-]\d{2}:?\d{2}$/.test(s))return s.slice(0,10);
  const d=new Date(s);
  if(isNaN(d.getTime()))return '';
  return S.chicagoYmd(d);
}
function ctDaysBetween(startYmd,endYmd){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(startYmd||'')||!/^\d{4}-\d{2}-\d{2}$/.test(endYmd||''))return null;
  const ps=startYmd.split('-').map(Number),pe=endYmd.split('-').map(Number);
  const a=Date.UTC(ps[0],ps[1]-1,ps[2]),b=Date.UTC(pe[0],pe[1]-1,pe[2]);
  if(!Number.isFinite(a)||!Number.isFinite(b))return null;
  return Math.round((b-a)/86400000);
}
function tenureNum(v){
  if(v==null||v==='')return null;
  const n=typeof v==='number'?v:Number(String(v).trim());
  if(!Number.isFinite(n))return null;
  return Math.max(0,Math.trunc(n));
}
function tenureExplicit(l,camel,snake){
  if(!l)return null;
  if(Object.prototype.hasOwnProperty.call(l,camel)&&l[camel]!=null&&l[camel]!==''){
    const n=tenureNum(l[camel]);
    if(n!=null)return n;
  }
  if(Object.prototype.hasOwnProperty.call(l,snake)&&l[snake]!=null&&l[snake]!==''){
    const n=tenureNum(l[snake]);
    if(n!=null)return n;
  }
  return null;
}
function tenureFallbackDays(l,camelAccum,snakeAccum,camelSince,snakeSince){
  const accumRaw=(l[camelAccum]!=null&&l[camelAccum]!=='')?l[camelAccum]:l[snakeAccum];
  const sinceRaw=(l[camelSince]!=null&&l[camelSince]!=='')?l[camelSince]:l[snakeSince];
  const accum=tenureNum(accumRaw);
  const sinceYmd=ctYmdOf(sinceRaw);
  if(accum==null&&!sinceYmd)return null;
  let days=accum==null?0:accum;
  if(sinceYmd){
    const extra=ctDaysBetween(sinceYmd,S.chicagoYmd());
    if(extra!=null&&extra>0)days+=extra;
  }
  return days;
}
function tenureDays(l,camelEx,snakeEx,camelAccum,snakeAccum,camelSince,snakeSince){
  const explicit=tenureExplicit(l,camelEx,snakeEx);
  if(explicit!=null)return explicit;
  return tenureFallbackDays(l,camelAccum,snakeAccum,camelSince,snakeSince);
}
function tenureKind(status){
  const st=String(status||'').toUpperCase();
  if(st==='AVAILABLE')return 'active';
  if(st==='PENDING'||st==='PENDING_NO_EM'||st==='PENDING_EM')return 'pending';
  if(st==='SOLD'||st==='CLOSED')return 'sold';
  return 'none';
}
S.formatCtDate=value=>{
  const ymd=ctYmdOf(value);
  if(!ymd)return '';
  const parts=ymd.split('-').map(Number);
  const mon=(S.lang==='es'?TENURE_MONTHS_ES:TENURE_MONTHS_EN)[parts[1]-1];
  if(!mon||!parts[0]||!parts[2])return '';
  return S.lang==='es'?`${parts[2]} ${mon} ${parts[0]}`:`${mon} ${parts[2]}, ${parts[0]}`;
};
S.listingTenure=l=>{
  const empty={kind:'none',text:'',sub:''};
  if(!l)return empty;
  const kind=tenureKind(l.status);
  if(kind==='none')return empty;
  if(kind==='sold'){
    const raw=(l.soldAt!=null&&l.soldAt!=='')?l.soldAt:((l.sold_at!=null&&l.sold_at!=='')?l.sold_at:null);
    const date=S.formatCtDate(raw);
    if(!date)return empty;
    return {kind:'sold',text:S.t('tenure.sold',{date}),sub:''};
  }
  const daysActive=tenureDays(l,'daysActive','days_active','activeDaysAccum','active_days_accum','activeSince','active_since');
  if(kind==='pending'){
    const daysPending=tenureDays(l,'daysPending','days_pending','pendingDaysAccum','pending_days_accum','pendingSince','pending_since');
    if(daysPending==null)return empty;
    const text=S.t(daysPending===1?'tenure.pendingOne':'tenure.pending',{days:daysPending});
    const sub=(daysActive!=null&&daysActive>0)?S.t(daysActive===1?'tenure.activeDaysOne':'tenure.activeDays',{days:daysActive}):'';
    return {kind:'pending',text,sub};
  }
  const first=(l.firstActiveDate!=null&&l.firstActiveDate!=='')?l.firstActiveDate:((l.first_active_date!=null&&l.first_active_date!=='')?l.first_active_date:null);
  const since=(l.activeSince!=null&&l.activeSince!=='')?l.activeSince:((l.active_since!=null&&l.active_since!=='')?l.active_since:null);
  const date=S.formatCtDate(first)||S.formatCtDate(since);
  if(!date&&daysActive==null)return empty;
  if(date&&daysActive!=null)return {kind:'active',text:S.t(daysActive===1?'tenure.activeOne':'tenure.active',{date,days:daysActive}),sub:''};
  if(date)return {kind:'active',text:S.t('tenure.activeDate',{date}),sub:''};
  return {kind:'active',text:S.t(daysActive===1?'tenure.activeDaysOne':'tenure.activeDays',{days:daysActive}),sub:''};
};
S.preferredYmd=at=>{const s=String(at||'').trim();if(!s)return '';if(/^\d{4}-\d{2}-\d{2}/.test(s)&&!/[zZ]|[+\-]\d{2}:?\d{2}$/.test(s))return s.slice(0,10);const d=new Date(s);if(isNaN(d.getTime()))return s.slice(0,10);return S.chicagoYmd(d);};
S.todayApprovedForListing=lid=>{
  const today=S.chicagoYmd();
  const fromServer=(S.todayApprovedShowings||[]).filter(x=>x&&x.listingId===lid);
  if(fromServer.length)return fromServer.filter(x=>S.preferredYmd(x.preferredAt)===today).map(x=>x.preferredAt);
  // Fallback for logged-in admin who already has showings in local state
  return (S.data&&S.data.showings||[]).filter(sh=>sh.listingId===lid&&String(sh.status||'').toUpperCase()==='APPROVED'&&S.preferredYmd(sh.preferredAt)===today).map(sh=>sh.preferredAt);
};
S.formatShowingWhen=at=>{
  const s=String(at||'');
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if(m){
    const monthsEn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthsEs=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const wdEn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const wdEs=['dom','lun','mar','mié','jue','vie','sáb'];
    const dt=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]);
    const wd=(S.lang==='es'?wdEs:wdEn)[dt.getDay()];
    const mon=(S.lang==='es'?monthsEs:monthsEn)[+m[2]-1];
    let h=+m[4], ap=h>=12?'PM':'AM'; h=h%12; if(!h)h=12;
    return `${wd}, ${mon} ${+m[3]}, ${h}:${m[5]} ${ap}`;
  }
  const d=new Date(s);
  if(isNaN(d.getTime()))return s;
  try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d);}catch(e){return d.toLocaleString();}
};
S.formatShowingTimeOnly=at=>{
  const m=String(at||'').match(/T(\d{2}):(\d{2})/);
  if(m){let h=+m[1],ap=h>=12?'PM':'AM';h=h%12;if(!h)h=12;return `${h}:${m[2]} ${ap}`;}
  const d=new Date(at);if(isNaN(d.getTime()))return String(at||'');
  try{return new Intl.DateTimeFormat(S.lang==='es'?'es-US':'en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'}).format(d);}catch(e){return d.toLocaleTimeString();}
};
S.canSeeShowingCalendar=()=>Boolean(S.isAdmin()||S.isAgent());
S.requestShowing=f=>{if(!S.user)throw new Error(S.lang==='es'?'Inicia sesión primero':'Please log in');needApproved();
  const sh={id:uid(),userId:S.user.id,listingId:f.listingId,preferredAt:f.preferredAt,notes:f.notes||'',status:'REQUESTED',createdAt:now()};
  S.data.showings.push(sh);
  S.save();
  sbUpsert('showings',{
    id:sh.id,
    listing_id:sh.listingId,
    user_id:sh.userId,
    preferred_at:sh.preferredAt,
    notes:sh.notes,
    status:sh.status,
    created_at:sh.createdAt
  },'id');
};
S.respondShowing=(sid,status)=>{
  if(!S.isAdmin())throw new Error('Admins only');
  const sh=S.data.showings.find(x=>x.id===sid);
  if(!sh)throw new Error('Showing not found');
  const st=String(status||'').toUpperCase();
  if(st!=='APPROVED'&&st!=='DENIED')throw new Error('Bad status');
  sh.status=st;sh.respondedAt=now();sh.updatedAt=now();
  S.save();
  sbUpsert('showings',{
    id:sh.id,
    listing_id:sh.listingId,
    user_id:sh.userId,
    preferred_at:sh.preferredAt,
    notes:sh.notes||'',
    status:sh.status,
    created_at:sh.createdAt
  },'id');
  // Refresh public today/calendar payload soon
  setTimeout(()=>{try{api('state').then(st=>{S.todayApprovedShowings=Array.isArray(st.todayApprovedShowings)?st.todayApprovedShowings:S.todayApprovedShowings;S.approvedShowingsCalendar=Array.isArray(st.approvedShowingsCalendar)?st.approvedShowingsCalendar:S.approvedShowingsCalendar;notify();});}catch(e){}},400);
};
S.uploadDocument=async(file,{listingId,docType,offerId}={})=>{if(!S.user)throw new Error(S.lang==='es'?'Inicia sesión primero':'Please log in');
  const cloudUrl=await sbUploadFile(file,S.user.folderSlug||'documents');
  let dataUrl=cloudUrl;
  if(!dataUrl){
    if(file.size>4e6)throw new Error('File too large (max 4 MB)');
    dataUrl=await readFile(file);
  }
  const d={id:uid(),userId:S.user.id,listingId:listingId||null,offerId:offerId||null,docType:docType||'GENERAL',name:file.name,size:file.size,dataUrl,folderSlug:S.user.folderSlug,createdAt:now()};
  S.data.documents.push(d);
  S.save();
  sbUpsert('documents',{
    id:d.id,
    user_id:d.userId,
    listing_id:d.listingId,
    category:d.docType,
    file_name:d.name,
    mime_type:file.type||'application/octet-stream',
    size_bytes:d.size,
    data_url:d.dataUrl,
    created_at:d.createdAt
  },'id');
  return d;
};
S.STATUSES=['AVAILABLE','COMING_SOON','PENDING','PENDING_NO_EM','PENDING_EM','SOLD'];
S.STATUS_LABEL={AVAILABLE:'Available',COMING_SOON:'Coming Soon',PENDING:'Pending',PENDING_NO_EM:'Pending/NoEM',PENDING_EM:'Pending/EM',SOLD:'Sold (3-Day)',CLOSED:'Sold (3-Day)'};
S.STATUS_LABEL_ES={AVAILABLE:'Disponible',COMING_SOON:'Próximamente',PENDING:'Pendiente',PENDING_NO_EM:'Pendiente/Sin EM',PENDING_EM:'Pendiente/Con EM',SOLD:'Vendida (3 días)',CLOSED:'Vendida (3 días)'};
S.statusText=st=>S.lang==='es'?(S.STATUS_LABEL_ES[st]||st):(S.STATUS_LABEL[st]||st);
S.setInspection=(offerId,at)=>{const o=S.data.offers.find(x=>x.id===offerId);if(!o)return;if(at){o.inspectionAt=at;o.inspectionStatus='SCHEDULED';}else{o.inspectionStatus='CANCELLED';o.inspectionAt=null;}o.updatedAt=now();S.save();};
S.OFFER_COLOR={ACCEPTED:'#16a34a',REJECTED:'#dc2626',COUNTERED:'#d97706',SUBMITTED:'#64748b'};
S.setListingStatus=(lid,st)=>{
  if(!S.isAdmin())throw new Error('Admins only');
  const l=S.listing(lid);
  if(!l)return;
  l.status=st;
  l.updatedAt=now();
  if(st==='SOLD'||st==='CLOSED'){
    l.soldAt=now();
    if(Array.isArray(S.data.removedSoldIds)){
      S.data.removedSoldIds=S.data.removedSoldIds.filter(id=>id!==lid);
    }
  }else{
    l.soldAt=null;
  }
  enforceThreeDaySoldRule(S.data);
  S.save();
  sbUpsert('listings',listingToRow(l),'id');
};
S.updateListing=(lid,p)=>{if(!S.isAdmin())throw new Error('Admins only');const l=S.listing(lid);Object.assign(l,p,{updatedAt:now()});S.save();sbUpsert('listings',listingToRow(l),'id');};
S.respondOffer=(oid,status,c={})=>{if(!S.isAdmin())throw new Error('Admins only');const o=S.data.offers.find(x=>x.id===oid);
  o.status=status;o.respondedAt=now();o.adminNotes=c.adminNotes||'';
  if(status==='COUNTERED'){o.counterPrice=+c.counterPrice*100;o.counterDown=+c.counterDown*100;o.counterMonthly=+c.counterMonthly*100;}
  if(status==='ACCEPTED'){const l=S.listing(o.listingId);if(l){l.status='PENDING_NO_EM';sbUpsert('listings',listingToRow(l),'id');}o.docsUnlocked=true;}
  S.save();
  sbUpsert('offers',{
    id:o.id,
    listing_id:o.listingId,
    user_id:o.userId,
    offered_price:o.offerPrice,
    down_payment:o.downPayment,
    monthly_payment:o.monthlyPayment,
    notes:o.notes||'',
    status:o.status,
    counter_price:o.counterPrice||null,
    counter_down:o.counterDown||null,
    counter_monthly:o.counterMonthly||null,
    admin_notes:o.adminNotes||'',
    updated_at:now()
  },'id');
};
S.TX_DOCS=[
  {type:'CLIENT_ID',label:"1. Client's Form of ID",labelEs:'1. Identificación Oficial del Cliente (ID)'},
  {type:'PROOF_OF_INCOME',label:'2. Proof of Income',labelEs:'2. Comprobante de Ingresos'}
];
S.money=c=>c==null?'—':'$'+Math.round(c/100).toLocaleString('en-US');
})();
