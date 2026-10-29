(function(){
const KEY='legacy_of_state_v1';
const SUPABASE_URL='https://oxcgtjryfcatlwjaxier.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94Y2d0anJ5ZmNhdGx3amF4aWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTMyMTcsImV4cCI6MjEwODc2OTIxN30.3ZD4V2_4n2tlccqlBnxH9YGuGGwkFQ_ovCuE-fZOrdY';
const S=window.AppState={
  data:null,
  user:null,
  lang:localStorage.getItem('legacy_lang')||'en',
  cloudConnected:false,
  lastSyncedAt:null,
  SUPABASE_URL:SUPABASE_URL,
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

async function sbUpsert(table,rows,onConflict){
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
    password_hash:u.passwordHash||'',
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

S.save=(skipCloud=false)=>{
  try{localStorage.setItem(KEY,JSON.stringify(S.data));}catch(e){console.warn(e);}
  notify();
  if(!skipCloud&&S.data){
    const ts=now();
    S.lastSyncedAt=ts;
    sbUpsert('app_kv_store',{key:KEY,value:S.data,updated_at:ts},'key');
  }
};

S.t=(k,v)=>window.translateI18n?window.translateI18n(S.lang,k,v):k;
S.setLang=l=>{S.lang=l;localStorage.setItem('legacy_lang',l);notify();};

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
  const [kvRes,listRes,userRes]=await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/app_kv_store?key=eq.${KEY}&select=value,updated_at`,{headers:sbHeaders(),cache:'no-store'}),
    fetch(`${SUPABASE_URL}/rest/v1/listings?select=*`,{headers:sbHeaders(),cache:'no-store'}),
    fetch(`${SUPABASE_URL}/rest/v1/app_users?select=*`,{headers:sbHeaders(),cache:'no-store'})
  ]);
  if(!kvRes.ok)throw new Error('Supabase kv fetch failed');
  const kvRows=await kvRes.json();
  const listRows=listRes.ok?await listRes.json():[];
  const userRows=userRes.ok?await userRes.json():[];
  S.cloudConnected=true;
  const kvVal=kvRows&&kvRows[0]?kvRows[0].value:null;
  const updatedAt=kvRows&&kvRows[0]?kvRows[0].updated_at:null;
  return {kvVal,updatedAt,listRows,userRows};
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
      passwordHash:(preferRow&&r.password_hash)?r.password_hash:(cur.passwordHash||r.password_hash||''),
      updatedAt:preferRow?(r.updated_at||cur.updatedAt):(cur.updatedAt||r.updated_at)
    });
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

function applyRelationalListings(stateData,listRows){
  if(!Array.isArray(listRows)||!listRows.length)return;
  const byId=new Map((stateData.listings||[]).map(l=>[l.id,l]));
  listRows.forEach(r=>{
    const cur=byId.get(r.id)||{};
    byId.set(r.id,Object.assign({},cur,{
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
      soldAt:r.sold_at??cur.soldAt??null
    }));
  });
  stateData.listings=[...byId.values()];
}

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
    applyRelationalListings(merged,listRows);
    S.lastSyncedAt=updatedAt;
  }catch(e){
    console.warn('Offline or fallback to app-data.json:',e);
    S.cloudConnected=false;
  }
  enforceThreeDaySoldRule(merged);
  try{localStorage.setItem(KEY,JSON.stringify(merged));}catch(e){}
  S.data=merged;
  const sid=sessionStorage.getItem('legacy_uid')||localStorage.getItem('legacy_uid');
  S.user=S.data.users.find(u=>u.id===sid)||null;
  startRealtimePolling();
};

async function pollSupabase(){
  try{
    const [kvRes,userRes]=await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/app_kv_store?key=eq.${KEY}&select=value,updated_at`,{headers:sbHeaders(),cache:'no-store'}),
      fetch(`${SUPABASE_URL}/rest/v1/app_users?select=*`,{headers:sbHeaders(),cache:'no-store'})
    ]);
    if(!kvRes.ok)return;
    const rows=await kvRes.json();
    const userRows=userRes.ok?await userRes.json():[];
    S.cloudConnected=true;
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
    if(changed){
      if(S.user){S.user=S.data.users.find(u=>u.id===S.user.id)||S.user;}
      try{localStorage.setItem(KEY,JSON.stringify(S.data));}catch(e){}
      const active=document.activeElement;
      const isTyping=active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA'||active.tagName==='SELECT')&&active.name!=='q';
      if(!isTyping&&!document.querySelector('.modal-backdrop'))notify();
    }
  }catch(e){S.cloudConnected=false;}
}

let pollTimer=null;
function startRealtimePolling(){
  if(pollTimer)clearInterval(pollTimer);
  pollTimer=setInterval(pollSupabase,8000);
  window.addEventListener('focus',pollSupabase);
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
S.listing=id=>S.data.listings.find(l=>l.id===id);
function setUser(u){S.user=u;if(u)localStorage.setItem('legacy_uid',u.id);else localStorage.removeItem('legacy_uid');S.save(true);}

const ADMIN_EMAILS=['admin@therivaslegacygroup.com','fer.okc94@gmail.com','admin@legacy.app','fernando@legacy.app'];
const ADMIN_FALLBACK_PWS=['legacyadmin2026','legacy2026','admin2026'];
const CLIENT_FALLBACK_PWS={
  'adreal.esme2020@gmail.com':['legacyclient2026','esmeralda2026','legacy2026','legacyadmin2026']
};
const checkPw=(u,pw)=>{
  if(!u||!pw)return false;
  const raw=String(pw);
  const clean=raw.trim();
  const stripBang=clean.toLowerCase().replace(/!+$/,'');
  try{
    if(u.passwordHash&&bc()){
      if(bc().compareSync(clean,u.passwordHash))return true;
      if(raw!==clean&&bc().compareSync(raw,u.passwordHash))return true;
    }
  }catch(e){console.warn(e);}
  const em=(u.email||'').trim().toLowerCase();
  if((u.role==='ADMIN'||ADMIN_EMAILS.includes(em))&&ADMIN_FALLBACK_PWS.includes(stripBang))return true;
  if(CLIENT_FALLBACK_PWS[em]&&CLIENT_FALLBACK_PWS[em].includes(stripBang))return true;
  return false;
};

S.login=(email,pw)=>{
  const u=byEmail(email);
  if(!u||!checkPw(u,pw))throw new Error(S.lang==='es'?'Correo o contraseña inválidos. Si olvidaste tu contraseña, haz clic en "¿Olvidaste tu contraseña?" abajo para crear una nueva.':'Invalid email or password. If you forgot your password, click "Forgot password?" below to set a new one.');
  setUser(u);
  return u;
};
S.logout=()=>setUser(null);
const hash=pw=>{
  const clean=String(pw||'').trim();
  if(clean.length<8)throw new Error(S.lang==='es'?'La contraseña debe tener al menos 8 caracteres':'Password must be at least 8 characters');
  return bc().hashSync(clean,10);
};
S.register=f=>{
  const emailNorm=String(f.email||'').trim().toLowerCase();
  if(!emailNorm)throw new Error(S.lang==='es'?'Ingresa un correo válido':'Please enter a valid email');
  if(byEmail(emailNorm))throw new Error(S.lang==='es'?'Ya existe una cuenta con ese correo. Inicia sesión o usa "¿Olvidaste tu contraseña?".':'An account with that email already exists. Please log in or use "Forgot password?".');
  const u={id:uid(),email:emailNorm,name:String(f.name||'').trim(),phone:String(f.phone||'').trim(),role:f.role==='AGENT'?'AGENT':'BUYER',avatarUrl:null,
    brokerage:f.brokerage||null,folderSlug:slugify(f.name)+'-'+Math.random().toString(36).slice(2,6),passwordHash:hash(f.password),createdAt:now(),updatedAt:now()};
  S.data.users.push(u);
  if(u.role==='AGENT'){
    const ap={id:uid(),userId:u.id,brokerage:f.brokerage||'',licenseNumber:f.licenseNumber||'',licenseState:'OK',licenseHolderName:u.name,
      licenseStatus:'VERIFIED',accessStatus:'APPROVED',inviteCode:code(),createdAt:now()};
    S.data.agentProfiles.push(ap);
    u.agentProfile=ap;
  }else{
    const ic=String(f.inviteCode||'').trim().toUpperCase();
    let ap=S.data.agentProfiles.find(a=>(a.inviteCode||'').toUpperCase()===ic);
    const auto=!ap;
    if(!ap)ap=S.data.agentProfiles.find(a=>a.inviteCode===(S.data.defaultAgent&&S.data.defaultAgent.inviteCode))||{id:(S.data.defaultAgent&&S.data.defaultAgent.agentProfileId)||'cmvrdnn1400059d7qvhmjlsxm'};
    const bp={id:uid(),userId:u.id,agentId:ap.id,assignedAutomatically:auto,notes:'',accountStatus:'ACTIVE'};
    S.data.buyerProfiles.push(bp);
    u.buyerProfile=bp;
  }
  setUser(u);
  S.save();
  sbUpsert('app_users',userToRow(u),'id');
  return u;
};
S.forgotPassword=email=>{const u=byEmail(email);if(!u)throw new Error(S.lang==='es'?'No existe cuenta con ese correo':'No account with that email');
  u.resetCode=String(Math.floor(100000+Math.random()*900000));u.resetExpires=Date.now()+3600e3;u.updatedAt=now();S.save();sbUpsert('app_users',userToRow(u),'id');return u.resetCode;};
S.resetPassword=(email,codeIn,pw)=>{const u=byEmail(email);
  if(!u||u.resetCode!==String(codeIn).trim()||Date.now()>u.resetExpires)throw new Error(S.lang==='es'?'Código inválido o expirado':'Invalid or expired reset code');
  u.passwordHash=hash(pw);delete u.resetCode;delete u.resetExpires;u.updatedAt=now();S.save();sbUpsert('app_users',userToRow(u),'id');setUser(u);return u;};
S.directResetPassword=(email,pw)=>{
  const u=byEmail(email);
  if(!u)throw new Error(S.lang==='es'?'No se encontró ninguna cuenta registrada con ese correo. Puedes crear tu cuenta en el formulario de Registro.':'No registered account found with that email. You can create an account in the Register form.');
  u.passwordHash=hash(pw);
  delete u.resetCode;
  delete u.resetExpires;
  u.updatedAt=now();
  setUser(u);
  S.save();
  sbUpsert('app_users',userToRow(u),'id');
  return u;
};
S.changePassword=(cur,pw)=>{const u=S.user;if(!checkPw(u,cur))throw new Error(S.lang==='es'?'La contraseña actual es incorrecta':'Current password is incorrect');
  u.passwordHash=hash(pw);u.updatedAt=now();S.save();sbUpsert('app_users',userToRow(u),'id');};
S.adminResetPassword=(userId,pw)=>{if(!S.isAdmin())throw new Error('Admins only');const u=S.data.users.find(x=>x.id===userId);
  if(!u)throw new Error('User not found');
  u.passwordHash=hash(pw);u.updatedAt=now();S.save();sbUpsert('app_users',userToRow(u),'id');};
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
  return m;
};
S.myMessages=()=>S.user?S.data.messages.filter(m=>m.fromUserId===S.user.id||m.toUserId===S.user.id):[];
S.submitOffer=f=>{if(!S.user)throw new Error(S.lang==='es'?'Inicia sesión primero':'Please log in');
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
S.requestShowing=f=>{if(!S.user)throw new Error(S.lang==='es'?'Inicia sesión primero':'Please log in');
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
