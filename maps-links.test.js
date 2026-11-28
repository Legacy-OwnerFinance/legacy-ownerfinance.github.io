/* Node tests for the maps link builder and parcel-pin choice. Run: node --test maps-links.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./maps-links.js');

const TEST_ADDR = {address:'100 Legacy Test Ln', city:'Oklahoma City', state:'OK', zip:'73120'};

test('Google and Apple links are the universal search URLs', ()=>{
  const q = M.queryFrom(TEST_ADDR);
  assert.equal(q, '100 Legacy Test Ln, Oklahoma City, OK, 73120');
  assert.equal(M.googleUrl(q), 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q));
  assert.equal(M.appleUrl(q), 'https://maps.apple.com/?q='+encodeURIComponent(q));
  const odd = '123 A & B St, Tulsa, OK';
  assert.equal(M.googleUrl(odd), 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(odd));
  assert.ok(!M.googleUrl(odd).includes('&query=123 A & B'));
  assert.equal(M.appleUrl(odd).startsWith('https://maps.apple.com/?q='), true);
});

test('preferred app is Apple Maps on iOS and Google Maps elsewhere', ()=>{
  assert.equal(M.preferredProvider('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)'), 'apple');
  assert.equal(M.preferredProvider('Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)'), 'apple');
  assert.equal(M.preferredProvider('Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)'), 'apple');
  assert.equal(M.preferredProvider('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'google');
  assert.equal(M.preferredProvider('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), 'google');
  assert.equal(M.preferredProvider(''), 'google');
});

test('the maps button is omitted unless this viewer is being shown a numbered street address', ()=>{
  assert.equal(M.addressVisible(null, false, false), false);
  assert.equal(M.addressVisible({id:'u'}, true, true), false);
  assert.equal(M.addressVisible({id:'u'}, true, false), true);
  assert.equal(M.addressVisible({id:'u'}, false, false), true);
  assert.equal(M.buttonHtml(TEST_ADDR, {show:false, es:true}), '');
  assert.equal(M.buttonHtml({address:'NW 41st St', city:'Oklahoma City'}, {show:true, es:false}), '');
  assert.equal(M.queryFrom({address:'Main Street', city:'Moore'}), '');
  const hidden = M.buttonHtml({address:'999 Secret Rd', city:'Edmond', state:'OK'}, {show:false, es:false});
  assert.equal(hidden.includes('999'), false);
  assert.equal(hidden.includes('data-maps'), false);
  const es = M.buttonHtml(TEST_ADDR, {show:true, es:true});
  const en = M.buttonHtml(TEST_ADDR, {show:true, es:false, compact:true});
  assert.match(es, /data-maps="1"/);
  assert.match(es, /Mapas</);
  assert.match(es, /Abrir en mapas/);
  assert.match(en, /class="maps-btn compact"/);
  assert.match(en, /Maps</);
  assert.match(en, /Open in maps/);
  assert.equal(es.includes('google.com'), false);
  assert.equal(es.includes('maps.apple.com'), false);
  assert.match(es, /data-mq="100 Legacy Test Ln, Oklahoma City, OK, 73120"/);
  assert.equal(M.LABELS.es.maps, 'Mapas');
  assert.equal(M.LABELS.en.satellite, 'Satellite');
  assert.notEqual(M.LABELS.es.hybrid, M.LABELS.en.hybrid);
});

function square(lat, lng, dLat, dLng){
  return [[lng-dLng, lat-dLat],[lng+dLng, lat-dLat],[lng+dLng, lat+dLat],[lng-dLng, lat+dLat],[lng-dLng, lat-dLat]];
}
function feat(loc, lat, lng){
  return {properties:{location:loc}, geometry:{type:'Polygon', coordinates:[square(lat, lng, 0.00015, 0.00018)]}};
}

test('parcel choice lands on the lot whose situs matches the house, not the nearer neighbor', ()=>{
  const street = {lat:35.50000, lng:-97.50000};
  const wrongNear = feat('2445 NW 41ST ST OKLAHOMA CITY', 35.50012, -97.50000);
  const right = feat('2436 NW 41ST ST OKLAHOMA CITY', 35.50028, -97.50002);
  const otherStreet = feat('2436 NW 42ND ST OKLAHOMA CITY', 35.50040, -97.50000);
  const pin = M.chooseParcelPin(street, [wrongNear, otherStreet, right], '2436 NW 41st St');
  assert.equal(pin.precision, 'parcel');
  assert.ok(Math.abs(pin.lat-35.50028)<0.00005, 'lat '+pin.lat);
  assert.ok(pin.meters>20 && pin.meters<80);
  assert.equal(M.chooseParcelPin(street, [wrongNear], '2436 NW 41st St'), null);
  assert.equal(M.chooseParcelPin(street, [right], 'NW 41st St'), null);
  const embedded = feat('12436 NW 41ST ST OKLAHOMA CITY', 35.50020, -97.50000);
  assert.equal(M.chooseParcelPin(street, [embedded], '2436 NW 41st St'), null);
});

test('a deep parcel steps off the curb instead of jumping to the back of the lot', ()=>{
  const street = {lat:35.50, lng:-97.50};
  const far = feat('517 N REMINGTON WAY', 35.50105, -97.50);
  const pin = M.chooseParcelPin(street, [far], '517 North Remington Way');
  assert.equal(pin.precision, 'parcel-front');
  const moved = M.haversine(street, pin);
  assert.ok(moved>30 && moved<45, 'stepped '+moved);
  assert.ok(pin.meters>150?false:pin.meters>80);
});

test('parcel queries ask only for the situs field and the counties that publish a free layer', ()=>{
  const okc = M.servicesForCity('Oklahoma City').map(s=>s.id);
  assert.deepEqual(okc, ['oklahoma','cleveland','canadian']);
  assert.deepEqual(M.servicesForCity('Moore').map(s=>s.id), ['cleveland']);
  assert.deepEqual(M.servicesForCity('Mustang').map(s=>s.id), ['canadian']);
  assert.deepEqual(M.servicesForCity('Tulsa').map(s=>s.id), ['tulsa']);
  assert.deepEqual(M.servicesForCity('Tuttle'), []);
  assert.deepEqual(M.servicesForCity('Kingfisher'), []);
  const svc = M.servicesForCity('Del City')[0];
  const url = M.buildParcelQuery(svc, 35.45, -97.45, "2436 NW 41st St");
  const u = new URL(url);
  assert.equal(u.searchParams.get('outFields'), 'location');
  assert.equal(u.searchParams.get('f'), 'geojson');
  assert.match(u.searchParams.get('where'), /LIKE '%2436%'/);
  assert.match(u.searchParams.get('where'), /LIKE '%41ST%'/);
  assert.equal(/name1|owner|mailing/i.test(url), false);
  assert.equal(M.buildParcelQuery(svc, 35.45, -97.45, 'Main Street'), '');
  const street = M.tileSpecs('street');
  const hybrid = M.tileSpecs('hybrid');
  assert.equal(street.length, 1);
  assert.match(street[0].url, /World_Street_Map/);
  assert.equal(street[0].url.includes('carto'), false);
  assert.equal(hybrid.length, 3);
  assert.match(hybrid[0].url, /World_Imagery/);
  assert.match(hybrid[1].url, /World_Transportation/);
  assert.equal(hybrid[0].url.includes('{z}/{y}/{x}'), true);
});
