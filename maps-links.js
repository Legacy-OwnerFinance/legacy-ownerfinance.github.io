/* Property maps: universal Google/Apple links, basemap specs, and parcel-pin math.
   No API key. The page works if parcel lookups fail: pins stay on the stored coordinates. */
(function(){
  const LABELS={
    en:{maps:'Maps', open:'Open in maps', title:'Open this address', google:'Google Maps', apple:'Apple Maps', suggested:'Suggested', cancel:'Cancel', street:'Street', satellite:'Satellite', hybrid:'Hybrid'},
    es:{maps:'Mapas', open:'Abrir en mapas', title:'Abrir esta dirección', google:'Google Maps', apple:'Apple Maps', suggested:'Sugerido', cancel:'Cancelar', street:'Calles', satellite:'Satélite', hybrid:'Híbrido'}
  };
  const SUFFIX=new Set(['ST','STREET','AVE','AVENUE','AV','DR','DRIVE','LN','LANE','RD','ROAD','BLVD','BOULEVARD','WAY','CIR','CIRCLE','CT','COURT','PL','PLACE','TER','TERRACE','TRL','TRAIL','HWY','HIGHWAY','PKWY','PARKWAY']);
  const LOC_FIELDS=['location','formattedlocation','situs','propertyaddress','situs_address','site_address'];
  const SERVICES=[
    {id:'oklahoma', field:'location', extra:'', url:'https://services8.arcgis.com/euhkr1dAJeQBIjV0/arcgis/rest/services/TaxParcelsPublics_view/FeatureServer/0/query',
      cities:['oklahoma city','midwest city','del city','spencer','edmond','bethany','warr acres']},
    {id:'cleveland', field:'FormattedLocation', extra:' AND retiredbyrecord IS NULL', url:'https://services1.arcgis.com/kxHJSF07PF5lbQ3z/arcgis/rest/services/ClevelandTaxParcelsJune2026/FeatureServer/0/query',
      cities:['moore','norman','blanchard','oklahoma city']},
    {id:'canadian', field:'situs', extra:'', url:'https://services2.arcgis.com/0NjdXxmJp53hZWPd/arcgis/rest/services/ParcelDataService_2_view/FeatureServer/3/query',
      cities:['mustang','piedmont','el reno','yukon','oklahoma city']},
    {id:'tulsa', field:'PropertyAddress', extra:'', url:'https://map11.incog.org/arcgis11wa/rest/services/Parcels_TulsaCo/FeatureServer/0/query',
      cities:['tulsa']}
  ];
  const CACHE_KEY='lof-pin-v1';
  const mem=Object.create(null);
  let refineGen=0;

  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function lang(){
    try{
      const s=window.AppState&&window.AppState.lang;
      if(s==='en'||s==='es') return s;
      if(window.__legacyLang==='en'||window.__legacyLang==='es') return window.__legacyLang;
    }catch(e){}
    return 'es';
  }
  function labels(){return LABELS[lang()]||LABELS.es;}
  function norm(s){
    return String(s||'').toUpperCase()
      .replace(/\bNORTHWEST\b/g,'NW').replace(/\bNORTHEAST\b/g,'NE')
      .replace(/\bSOUTHWEST\b/g,'SW').replace(/\bSOUTHEAST\b/g,'SE')
      .replace(/\bNORTH\b/g,'N').replace(/\bSOUTH\b/g,'S').replace(/\bEAST\b/g,'E').replace(/\bWEST\b/g,'W')
      .replace(/[^A-Z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  }
  function addressParts(address){
    const n=norm(address);
    const m=n.match(/^(\d+[A-Z]?)\b/);
    if(!m) return null;
    const tokens=n.slice(m[0].length).trim().split(' ').filter(function(t){return t && !SUFFIX.has(t);});
    const digit=tokens.filter(function(t){return /\d/.test(t);}).sort(function(a,b){return b.length-a.length;})[0];
    const key=digit||tokens.slice().sort(function(a,b){return b.length-a.length;})[0]||'';
    if(!key) return null;
    return {num:m[1], tokens:tokens, key:key};
  }
  function queryFrom(l){
    if(!l||!addressParts(l.address)) return '';
    return [l.address, l.city, l.state||'OK', l.zip].map(function(x){return String(x||'').trim();}).filter(Boolean).join(', ');
  }
  function googleUrl(query){
    return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(String(query||''));
  }
  function appleUrl(query){
    return 'https://maps.apple.com/?q='+encodeURIComponent(String(query||''));
  }
  function preferredProvider(ua){
    const s=String(ua||'');
    if(/iPad|iPhone|iPod/i.test(s)) return 'apple';
    return 'google';
  }
  /* Same gate as the inventory: guests and investors still waiting on approval do not see the house number. */
  function addressVisible(user, isInvestor, isPending){
    if(!user) return false;
    if(isInvestor && isPending) return false;
    return true;
  }
  function buttonHtml(record, opts){
    const o=opts||{};
    if(!o.show) return '';
    const q=queryFrom(record);
    if(!q) return '';
    const es=!!o.es;
    const L=es?LABELS.es:LABELS.en;
    const compact=o.compact?' compact':'';
    return '<button type="button" class="maps-btn'+compact+'" data-maps="1" data-mq="'+esc(q)+'" aria-label="'+esc(L.open)+'"><span class="maps-ico" aria-hidden="true">📍</span> '+esc(L.maps)+'</button>';
  }
  function haversine(a, b){
    const R=6371000;
    const p1=a.lat*Math.PI/180, p2=b.lat*Math.PI/180;
    const dp=(b.lat-a.lat)*Math.PI/180, dl=(b.lng-a.lng)*Math.PI/180;
    const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 2*R*Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function moveToward(from, to, meters){
    const d=haversine(from, to);
    if(!(d>0)) return {lat:to.lat, lng:to.lng};
    const t=Math.min(1, meters/d);
    return {lat:from.lat+(to.lat-from.lat)*t, lng:from.lng+(to.lng-from.lng)*t};
  }
  function ringCentroid(ring){
    if(!ring||ring.length<3) return null;
    let pts=ring;
    const a0=pts[0], az=pts[pts.length-1];
    if(a0 && az && a0[0]===az[0] && a0[1]===az[1]) pts=pts.slice(0,-1);
    if(pts.length<3) return null;
    let twice=0, cx=0, cy=0;
    for(let i=0;i<pts.length;i++){
      const j=(i+1)%pts.length;
      const cross=pts[i][0]*pts[j][1]-pts[j][0]*pts[i][1];
      twice+=cross;
      cx+=(pts[i][0]+pts[j][0])*cross;
      cy+=(pts[i][1]+pts[j][1])*cross;
    }
    if(Math.abs(twice)<1e-12){
      let sx=0, sy=0;
      pts.forEach(function(p){sx+=p[0]; sy+=p[1];});
      return {lng:sx/pts.length, lat:sy/pts.length};
    }
    return {lng:cx/(3*twice), lat:cy/(3*twice)};
  }
  function featureRings(feature){
    const g=feature&&feature.geometry;
    if(!g||!g.coordinates) return [];
    if(g.type==='Polygon') return g.coordinates;
    if(g.type==='MultiPolygon') return g.coordinates.reduce(function(acc, poly){ if(poly&&poly[0]) acc.push(poly[0]); return acc; }, []);
    return [];
  }
  function featureCentroid(feature){
    const rings=featureRings(feature);
    let best=null, bestA=0;
    rings.forEach(function(ring){
      const c=ringCentroid(ring);
      if(!c) return;
      let twice=0;
      for(let i=0;i<ring.length-1;i++){
        twice+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];
      }
      const area=Math.abs(twice);
      if(!best||area>bestA){best=c; bestA=area;}
    });
    return best;
  }
  function featureLocation(feature){
    const p=(feature&&(feature.properties||feature.attributes))||{};
    const keys=Object.keys(p);
    for(let i=0;i<keys.length;i++){
      if(LOC_FIELDS.indexOf(keys[i].toLowerCase())>=0 && p[keys[i]]) return String(p[keys[i]]);
    }
    return '';
  }
  function locationMatches(loc, parts){
    const tokens=norm(loc).split(' ').filter(Boolean);
    if(tokens.indexOf(parts.num)<0) return false;
    if(tokens.indexOf(parts.key)<0) return false;
    return true;
  }
  /* Street pins are Census interpolations on the curb. A matching parcel centroid is the lot, usually the house.
     A very deep parcel keeps a short step off the street instead of the back of the lot. */
  function chooseParcelPin(street, features, address){
    const parts=addressParts(address);
    if(!parts||!street||street.lat==null||street.lng==null) return null;
    let best=null;
    (features||[]).forEach(function(f){
      if(!locationMatches(featureLocation(f), parts)) return;
      const c=featureCentroid(f);
      if(!c||!isFinite(c.lat)||!isFinite(c.lng)) return;
      const d=haversine(street, c);
      if(d>150) return;
      if(!best||d<best.d) best={d:d, c:c};
    });
    if(!best) return null;
    if(best.d<=80) return {lat:best.c.lat, lng:best.c.lng, precision:'parcel', meters:best.d};
    const step=moveToward(street, best.c, 35);
    return {lat:step.lat, lng:step.lng, precision:'parcel-front', meters:best.d};
  }
  function servicesForCity(city){
    const c=String(city||'').trim().toLowerCase();
    const seen=Object.create(null);
    const out=[];
    SERVICES.forEach(function(s){
      if(s.cities.indexOf(c)<0||seen[s.id]) return;
      seen[s.id]=1;
      out.push(s);
    });
    return out;
  }
  function buildParcelQuery(service, lat, lng, address){
    const parts=addressParts(address);
    if(!service||!parts) return '';
    const num=parts.num.replace(/[^0-9A-Z]/g,'');
    const key=parts.key.replace(/[^0-9A-Z]/g,'');
    if(!num||!key||!isFinite(+lat)||!isFinite(+lng)) return '';
    const where=service.field+" LIKE '%"+num+"%' AND "+service.field+" LIKE '%"+key+"%'"+(service.extra||'');
    const qs=new URLSearchParams({
      f:'geojson',
      geometry:String(lng)+','+String(lat),
      geometryType:'esriGeometryPoint',
      inSR:'4326',
      spatialRel:'esriSpatialRelIntersects',
      distance:'100',
      units:'esriSRUnit_Meter',
      where:where,
      outFields:service.field,
      returnGeometry:'true',
      outSR:'4326',
      resultRecordCount:'6'
    });
    return service.url+'?'+qs.toString();
  }
  function cacheId(item){
    return [item.id||'', Number(item.lat).toFixed(5), Number(item.lng).toFixed(5), norm(item.address)].join('|');
  }
  function readStore(){
    try{
      const raw=localStorage.getItem(CACHE_KEY);
      const parsed=raw?JSON.parse(raw):{};
      return parsed&&typeof parsed==='object'?parsed:{};
    }catch(e){return {};}
  }
  function recallPin(listing){
    if(!listing||listing.latitude==null||listing.longitude==null) return null;
    const id=cacheId({id:listing.id, lat:+listing.latitude, lng:+listing.longitude, address:listing.address});
    if(mem[id]) return mem[id];
    const row=readStore()[id];
    if(!row||row.lat==null||row.lng==null) return null;
    mem[id]=row;
    return row;
  }
  function rememberPin(item, pin){
    const id=cacheId(item);
    const row={lat:pin.lat, lng:pin.lng, precision:pin.precision||'parcel'};
    mem[id]=row;
    try{
      const all=readStore();
      all[id]=row;
      const keys=Object.keys(all);
      if(keys.length>400) keys.slice(0, keys.length-400).forEach(function(k){delete all[k];});
      localStorage.setItem(CACHE_KEY, JSON.stringify(all));
    }catch(e){}
    return row;
  }
  function schedulePinRefine(items, onUpdate, fetchImpl){
    const fetchFn=fetchImpl||(typeof fetch==='function'?fetch:null);
    if(!fetchFn||!onUpdate) return;
    const my=++refineGen;
    const queue=(items||[]).filter(function(it){return it&&addressParts(it.address)&&it.lat!=null&&it.lng!=null&&servicesForCity(it.city).length;});
    let n=0;
    function next(){
      if(my!==refineGen) return;
      while(n<3&&queue.length){
        n++;
        const item=queue.shift();
        run(item).then(function(){n--; next();}, function(){n--; next();});
      }
    }
    function run(item){
      const services=servicesForCity(item.city);
      let i=0;
      function step(){
        if(my!==refineGen||i>=services.length) return Promise.resolve();
        const url=buildParcelQuery(services[i++], item.lat, item.lng, item.address);
        if(!url) return step();
        return fetchFn(url, {headers:{Accept:'application/geo+json'}}).then(function(r){return r&&r.json?r.json():null;}).then(function(data){
          if(my!==refineGen) return;
          const pin=chooseParcelPin({lat:+item.lat, lng:+item.lng}, data&&data.features, item.address);
          if(!pin) return step();
          rememberPin(item, pin);
          onUpdate(item.id, pin);
        }).catch(function(){return step();});
      }
      return step();
    }
    next();
  }
  function basemap(){
    try{
      const v=localStorage.getItem('lof-basemap');
      if(v==='street'||v==='satellite'||v==='hybrid') return v;
    }catch(e){}
    return 'hybrid';
  }
  function setBasemap(mode){
    if(mode!=='street'&&mode!=='satellite'&&mode!=='hybrid') return;
    try{localStorage.setItem('lof-basemap', mode);}catch(e){}
  }
  function tileSpecs(mode){
    const esri={maxZoom:19, maxNativeZoom:19};
    const imagery={url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', options:Object.assign({attribution:'Imagery &copy; Esri, Maxar, Earthstar Geographics'}, esri)};
    if(mode==='street'){
      return [{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', options:Object.assign({attribution:'Tiles &copy; Esri'}, esri)}];
    }
    if(mode==='satellite') return [imagery];
    return [
      imagery,
      {url:'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', options:Object.assign({opacity:0.85, attribution:''}, esri)},
      {url:'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', options:Object.assign({attribution:''}, esri)}
    ];
  }
  function basemapHtml(mode){
    const L=labels();
    return ['street','satellite','hybrid'].map(function(k){
      return '<button type="button" data-base="'+k+'" class="'+(mode===k?'on':'')+'" aria-pressed="'+(mode===k?'true':'false')+'">'+esc(L[k])+'</button>';
    }).join('');
  }
  function attachBasemap(map){
    const L=window.L;
    if(!L||!map||map.__lofBase) return;
    map.__lofBase=true;
    function paint(mode){
      setBasemap(mode);
      (map.__lofTiles||[]).forEach(function(layer){try{map.removeLayer(layer);}catch(e){}});
      map.__lofTiles=tileSpecs(mode).map(function(spec){return L.tileLayer(spec.url, spec.options).addTo(map);});
      map.__lofTiles.forEach(function(layer){if(layer.bringToBack) layer.bringToBack();});
      const el=map.__lofBaseEl;
      if(el) el.querySelectorAll('[data-base]').forEach(function(b){
        const on=b.getAttribute('data-base')===mode;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on?'true':'false');
      });
    }
    const Control=L.Control.extend({
      options:{position:'topleft'},
      onAdd:function(){
        const el=L.DomUtil.create('div','lof-basemap leaflet-control');
        map.__lofBaseEl=el;
        el.innerHTML=basemapHtml(basemap());
        L.DomEvent.disableClickPropagation(el);
        if(L.DomEvent.disableScrollPropagation) L.DomEvent.disableScrollPropagation(el);
        el.addEventListener('click', function(ev){
          const b=ev.target&&ev.target.closest&&ev.target.closest('[data-base]');
          if(!b) return;
          ev.preventDefault();
          paint(b.getAttribute('data-base'));
        });
        return el;
      }
    });
    map.addControl(new Control());
    paint(basemap());
  }
  function openChooser(query){
    if(!query||typeof document==='undefined') return;
    const old=document.querySelector('.maps-sheet-bg');
    if(old) old.remove();
    const L=labels();
    const pref=preferredProvider(navigator.userAgent||'');
    const apple=appleUrl(query), google=googleUrl(query);
    const row=function(href, name, suggested){
      return '<a class="btn-card'+(suggested?' primary':'')+'" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(name)+(suggested?' <small class="maps-suggest">'+esc(L.suggested)+'</small>':'')+'</a>';
    };
    const bg=document.createElement('div');
    bg.className='lof-sheet-bg maps-sheet-bg';
    bg.innerHTML='<div class="lof-sheet" role="dialog" aria-modal="true" aria-label="'+esc(L.title)+'"><h3>'+esc(L.title)+'</h3>'
      +(pref==='apple'?row(apple, L.apple, true)+row(google, L.google, false):row(google, L.google, true)+row(apple, L.apple, false))
      +'<button type="button" class="btn-card" data-mapsheetclose="1">'+esc(L.cancel)+'</button></div>';
    bg.addEventListener('click', function(e){
      if(e.target===bg||(e.target.closest&&e.target.closest('[data-mapsheetclose]'))) bg.remove();
    });
    document.body.appendChild(bg);
    const first=bg.querySelector('a');
    if(first) first.focus();
  }
  if(typeof document!=='undefined'&&document.addEventListener){
    document.addEventListener('click', function(e){
      const b=e.target&&e.target.closest&&e.target.closest('[data-maps]');
      if(!b) return;
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      const q=b.getAttribute('data-mq')||'';
      if(q) openChooser(q);
    }, true);
    document.addEventListener('keydown', function(e){
      if(e.key==='Escape'){const s=document.querySelector('.maps-sheet-bg'); if(s) s.remove();}
    });
  }

  const api={
    LABELS:LABELS,
    googleUrl:googleUrl,
    appleUrl:appleUrl,
    preferredProvider:preferredProvider,
    addressParts:addressParts,
    queryFrom:queryFrom,
    addressVisible:addressVisible,
    buttonHtml:buttonHtml,
    haversine:haversine,
    chooseParcelPin:chooseParcelPin,
    servicesForCity:servicesForCity,
    buildParcelQuery:buildParcelQuery,
    recallPin:recallPin,
    rememberPin:rememberPin,
    schedulePinRefine:schedulePinRefine,
    basemap:basemap,
    setBasemap:setBasemap,
    tileSpecs:tileSpecs,
    attachBasemap:attachBasemap,
    openChooser:openChooser
  };
  if(typeof window!=='undefined') window.LegacyMaps=api;
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})();
