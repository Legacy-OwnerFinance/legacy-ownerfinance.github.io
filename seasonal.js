/* Seasonal look-and-feel. Switches live in seasonal-theme.json (auto / true / false).
   A ?theme= visit overrides that file for one page view and does not save anything. */
(function (root) {
  var DEFAULTS = {
    id: 'thanksgiving-2026',
    start: '2026-11-20',
    end: '2026-11-30',
    simple: 'auto',
    animated: 'auto',
    loading: 'auto'
  };

  var THEMES = {
    off: { simple: false, animated: false, loading: false },
    none: { simple: false, animated: false, loading: false },
    default: { simple: false, animated: false, loading: false },
    'thanksgiving-simple': { simple: true, animated: false, loading: false },
    'thanksgiving-animated': { simple: true, animated: true, loading: false },
    'thanksgiving-loading': { simple: false, animated: false, loading: true },
    thanksgiving: { simple: true, animated: true, loading: true }
  };

  var SPLASH_LEAVES = [
    { x: '9%', y: '20%', dx: '14px', dy: '12px', rot: '-16deg', dur: '6.4s', delay: '0s', size: '22px', fill: '#fb923c', vein: '#7c2d12' },
    { x: '76%', y: '16%', dx: '-12px', dy: '16px', rot: '22deg', dur: '7.1s', delay: '-1.6s', size: '16px', fill: '#fbbf24', vein: '#9a3412' },
    { x: '7%', y: '66%', dx: '10px', dy: '-12px', rot: '-28deg', dur: '5.8s', delay: '-2.4s', size: '18px', fill: '#fb7185', vein: '#9f1239' },
    { x: '80%', y: '68%', dx: '-14px', dy: '-10px', rot: '18deg', dur: '6.8s', delay: '-3.1s', size: '24px', fill: '#fdba74', vein: '#9a3412' },
    { x: '44%', y: '12%', dx: '8px', dy: '14px', rot: '8deg', dur: '5.4s', delay: '-0.7s', size: '14px', fill: '#f59e0b', vein: '#7c2d12' },
    { x: '62%', y: '78%', dx: '-10px', dy: '-8px', rot: '-10deg', dur: '7.6s', delay: '-4.2s', size: '15px', fill: '#ea580c', vein: '#7c2d12' }
  ];

  var FALL_LEAVES = [
    { x: '8%', dx: '18px', rot: '-12deg', dur: '13s', delay: '-2s', size: '14px', fill: '#c2410c', vein: '#7c2d12' },
    { x: '24%', dx: '-16px', rot: '20deg', dur: '16s', delay: '-9s', size: '12px', fill: '#d97706', vein: '#78350f' },
    { x: '41%', dx: '22px', rot: '-24deg', dur: '14.5s', delay: '-5s', size: '16px', fill: '#9f1239', vein: '#4c0519' },
    { x: '57%', dx: '-12px', rot: '14deg', dur: '17s', delay: '-12s', size: '11px', fill: '#b45309', vein: '#7c2d12' },
    { x: '73%', dx: '14px', rot: '-18deg', dur: '15s', delay: '-7s', size: '15px', fill: '#9a3412', vein: '#431407' },
    { x: '88%', dx: '-20px', rot: '26deg', dur: '12.5s', delay: '-3.5s', size: '13px', fill: '#ea580c', vein: '#7c2d12' }
  ];

  function chicagoToday(date) {
    var when = date || new Date();
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(when);
    } catch (err) {
      var local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
    }
  }

  function coerceFlag(value, autoOn) {
    if (value === true || value === 'on' || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'off' || value === 'false' || value === 0 || value === '0') return false;
    return !!autoOn;
  }

  function inWindow(cfg, date) {
    var start = String((cfg && cfg.start) || DEFAULTS.start);
    var end = String((cfg && cfg.end) || DEFAULTS.end);
    var today = chicagoToday(date);
    return today >= start && today <= end;
  }

  function flagsFromConfig(cfg, date) {
    var source = cfg || DEFAULTS;
    var autoOn = inWindow(source, date);
    return {
      id: source.id || DEFAULTS.id,
      simple: coerceFlag(source.simple, autoOn),
      animated: coerceFlag(source.animated, autoOn),
      loading: coerceFlag(source.loading, autoOn),
      holdSplash: false
    };
  }

  function readQuery(search) {
    var params;
    try {
      params = new URLSearchParams(search || '');
    } catch (err) {
      return null;
    }
    var theme = String(params.get('theme') || '').toLowerCase();
    var splash = String(params.get('splash') || '').toLowerCase();
    var hold = splash === 'preview' || splash === 'hold';
    var known = Object.prototype.hasOwnProperty.call(THEMES, theme);
    if (!known && !hold) return null;
    return { forced: known ? THEMES[theme] : null, holdSplash: hold };
  }

  function mergeFlags(base, query) {
    var out = {
      id: base.id,
      simple: base.simple,
      animated: base.animated,
      loading: base.loading,
      holdSplash: false
    };
    if (query && query.forced) {
      out.id = 'preview';
      out.simple = query.forced.simple;
      out.animated = query.forced.animated;
      out.loading = query.forced.loading;
    }
    if (query && query.holdSplash) {
      out.loading = true;
      out.holdSplash = true;
    }
    return out;
  }

  var api = {
    DEFAULTS: DEFAULTS,
    THEMES: THEMES,
    chicagoToday: chicagoToday,
    coerceFlag: coerceFlag,
    inWindow: inWindow,
    flagsFromConfig: flagsFromConfig,
    readQuery: readQuery,
    mergeFlags: mergeFlags
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root || !root.document) return;

  var doc = root.document;
  var active = null;
  var splashHeld = false;
  var bannerWatching = false;
  var fallWatching = false;

  function reducedMotion() {
    try {
      return root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }

  function leafUri(fill, vein) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
      + '<path fill="' + fill + '" d="M16 2.2C10.2 8.4 7 13.2 7 18.2 7 23.4 11 27.6 16 28.8 21 27.6 25 23.4 25 18.2 25 13.2 21.8 8.4 16 2.2z"/>'
      + '<path fill="none" stroke="' + vein + '" stroke-width="1.15" stroke-linecap="round" d="M16 12.2v13.2M16 16.5c-2.6.8-4.4 2.4-5.4 4.6M16 18.2c2.5.7 4.2 2.2 5.2 4.2"/>'
      + '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function setLeafVars() {
    var html = doc.documentElement;
    html.style.setProperty('--season-leaf-gold', 'url("' + leafUri('#fdba74', '#7c2d12') + '")');
    html.style.setProperty('--season-leaf-cream', 'url("' + leafUri('#fde68a', '#b45309') + '")');
    html.style.setProperty('--season-leaf-rust', 'url("' + leafUri('#c2410c', '#7c2d12') + '")');
    html.style.setProperty('--season-leaf-brown', 'url("' + leafUri('#8a5a3b', '#5c3a24') + '")');
  }

  function clearLeafVars() {
    var html = doc.documentElement;
    ['--season-leaf-gold', '--season-leaf-cream', '--season-leaf-rust', '--season-leaf-brown'].forEach(function (name) {
      html.style.removeProperty(name);
    });
  }

  function seasonText(key) {
    var lang = doc.documentElement.lang === 'en' ? 'en' : 'es';
    if (root.translateI18n) {
      var value = root.translateI18n(lang, key);
      if (value && value !== key) return value;
    }
    var copy = {
      es: {
        'season.banner': 'Feliz Día de Acción de Gracias',
        'season.dismiss': 'Cerrar aviso de Acción de Gracias'
      },
      en: {
        'season.banner': 'Happy Thanksgiving',
        'season.dismiss': 'Dismiss Thanksgiving notice'
      }
    };
    return copy[lang][key];
  }

  function dismissed() {
    if (!active) return false;
    if (active.dismissed) return true;
    try {
      return root.sessionStorage.getItem('legacy-season-banner:' + active.id) === '1';
    } catch (err) {
      return false;
    }
  }

  function fillBanner(banner) {
    var text = banner.querySelector('.season-banner-text');
    var btn = banner.querySelector('.season-banner-x');
    var label = seasonText('season.banner');
    var dismissLabel = seasonText('season.dismiss');
    var lang = doc.documentElement.lang === 'en' ? 'en' : 'es';
    banner.setAttribute('aria-label', label);
    text.lang = lang;
    if (text.textContent !== label) text.textContent = label;
    if (btn.getAttribute('aria-label') !== dismissLabel) btn.setAttribute('aria-label', dismissLabel);
  }

  function buildBanner() {
    var bar = doc.createElement('div');
    bar.id = 'season-banner';
    bar.className = 'season-banner';
    bar.setAttribute('role', 'region');
    var leaves = doc.createElement('span');
    leaves.className = 'season-banner-leaves';
    leaves.setAttribute('aria-hidden', 'true');
    var text = doc.createElement('p');
    text.className = 'season-banner-text';
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'season-banner-x';
    var mark = doc.createElement('span');
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '\u00d7';
    btn.appendChild(mark);
    btn.addEventListener('click', function () {
      active.dismissed = true;
      try { root.sessionStorage.setItem('legacy-season-banner:' + active.id, '1'); } catch (err) {}
      bar.remove();
      placeFall();
    });
    bar.appendChild(leaves);
    bar.appendChild(text);
    bar.appendChild(btn);
    fillBanner(bar);
    return bar;
  }

  function ensureBanner() {
    if (!active || !active.simple || dismissed()) {
      var stale = doc.getElementById('season-banner');
      if (stale) stale.remove();
      placeFall();
      return;
    }
    var app = doc.getElementById('app-root');
    if (!app || !app.parentNode) return;
    var banner = doc.getElementById('season-banner');
    if (!banner) banner = buildBanner();
    if (banner.nextSibling !== app) app.parentNode.insertBefore(banner, app);
    fillBanner(banner);
    placeFall();
  }

  function watchBanner() {
    if (bannerWatching) return;
    var app = doc.getElementById('app-root');
    if (!app || !root.MutationObserver) {
      doc.addEventListener('DOMContentLoaded', function () { watchBanner(); }, { once: true });
      return;
    }
    bannerWatching = true;
    var observer = new root.MutationObserver(function () { ensureBanner(); });
    observer.observe(app, { childList: true });
    observer.observe(doc.documentElement, { attributes: true, attributeFilter: ['lang'] });
    ensureBanner();
  }

  function paintLeaves(host, specs) {
    specs.forEach(function (spec) {
      var leaf = doc.createElement('i');
      leaf.style.setProperty('--x', spec.x);
      leaf.style.setProperty('--y', spec.y || '0px');
      leaf.style.setProperty('--dx', spec.dx);
      leaf.style.setProperty('--dy', spec.dy || '0px');
      leaf.style.setProperty('--rot', spec.rot);
      leaf.style.setProperty('--dur', spec.dur);
      leaf.style.setProperty('--delay', spec.delay);
      leaf.style.setProperty('--size', spec.size);
      leaf.style.backgroundImage = 'url("' + leafUri(spec.fill, spec.vein) + '")';
      host.appendChild(leaf);
    });
  }

  function mountSplash() {
    var splash = doc.getElementById('lof-splash');
    if (!splash || splash.querySelector('.season-splash-leaves')) return;
    var layer = doc.createElement('div');
    layer.className = 'season-splash-leaves';
    layer.setAttribute('aria-hidden', 'true');
    paintLeaves(layer, SPLASH_LEAVES);
    splash.insertBefore(layer, splash.firstChild);
  }

  function removeSplash() {
    var layer = doc.querySelector('#lof-splash .season-splash-leaves');
    if (layer) layer.remove();
  }

  function placeFall() {
    var layer = doc.getElementById('season-fall');
    if (!layer) return;
    var top = 0;
    var banner = doc.getElementById('season-banner');
    var header = doc.querySelector('.app-header');
    if (banner) top = Math.max(top, banner.getBoundingClientRect().bottom);
    if (header) top = Math.max(top, header.getBoundingClientRect().bottom);
    if (top < 0) top = 0;
    layer.style.top = Math.round(top) + 'px';
  }

  function watchFall() {
    if (fallWatching) return;
    fallWatching = true;
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      root.requestAnimationFrame(function () {
        ticking = false;
        placeFall();
      });
    }
    doc.addEventListener('scroll', onScroll, true);
    root.addEventListener('resize', onScroll);
  }

  function mountFall() {
    if (reducedMotion() || doc.getElementById('season-fall')) return;
    var layer = doc.createElement('div');
    layer.id = 'season-fall';
    layer.setAttribute('aria-hidden', 'true');
    paintLeaves(layer, FALL_LEAVES);
    doc.body.appendChild(layer);
    watchFall();
    placeFall();
  }

  function removeFall() {
    var layer = doc.getElementById('season-fall');
    if (layer) layer.remove();
  }

  function holdSplash() {
    if (splashHeld) return;
    var original = root.legacySplashHide;
    if (typeof original !== 'function') return;
    splashHeld = true;
    var released = false;
    root.legacySplashHide = function () {
      if (!released) return;
      return original();
    };
    function release() {
      if (released) return;
      released = true;
      original();
    }
    var splash = doc.getElementById('lof-splash');
    if (splash) splash.addEventListener('click', release);
  }

  function apply(flags) {
    active = flags;
    var html = doc.documentElement;
    html.classList.toggle('season-simple', !!flags.simple);
    html.classList.toggle('season-loading', !!flags.loading);
    if (flags.simple) setLeafVars();
    else clearLeafVars();
    if (flags.loading) mountSplash();
    else removeSplash();
    if (flags.animated && !reducedMotion()) mountFall();
    else removeFall();
    watchBanner();
    ensureBanner();
    if (flags.holdSplash) holdSplash();
  }

  function boot(cfg) {
    apply(mergeFlags(flagsFromConfig(cfg || DEFAULTS), readQuery(root.location.search)));
  }

  var query = readQuery(root.location.search);
  if (query && query.forced) {
    boot(DEFAULTS);
  } else {
    var cfgUrl = new URL('seasonal-theme.json', doc.baseURI).href;
    fetch(cfgUrl, { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (cfg) { boot(cfg || DEFAULTS); })
      .catch(function () { boot(DEFAULTS); });
  }

  try {
    var motion = root.matchMedia('(prefers-reduced-motion: reduce)');
    var onMotion = function () { if (active) apply(active); };
    if (motion.addEventListener) motion.addEventListener('change', onMotion);
    else if (motion.addListener) motion.addListener(onMotion);
  } catch (err) {}
})(typeof window !== 'undefined' ? window : undefined);
