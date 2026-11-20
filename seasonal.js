/* Thanksgiving 2026 seasonal treatment (front-end only).
   Toggle each piece here. Auto-off after `until` (America/Chicago, that date inclusive).
   Preview overrides (also work after the until date, so variants can be compared):
     ?tg=simple    theme + banner + static leaf accents; calmer splash; no falling leaves
     ?tg=animated  theme + banner + falling leaves + autumn splash animation
*/
window.SEASONAL = { theme: true, leaves: true, splash: true, until: '2026-11-30' };

(function () {
  var C = window.SEASONAL || {};
  var q = '';
  try { q = String(new URLSearchParams(location.search).get('tg') || '').toLowerCase(); } catch (e) {}
  var force = q === 'simple' || q === 'animated';

  function endExclusiveMs(ymd) {
    var p = String(ymd || '').split('-').map(Number);
    if (p.length < 3 || !p[0]) return 0;
    var utc = Date.UTC(p[0], p[1] - 1, p[2] + 1, 6, 0, 0);
    try {
      var hour = parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago', hour: '2-digit', hourCycle: 'h23'
      }).format(new Date(utc)), 10);
      if (!isNaN(hour)) utc -= hour * 3600e3;
    } catch (e) {}
    return utc;
  }

  var inWindow = Date.now() < endExclusiveMs(C.until || '2026-11-30');
  var on = force || inWindow;
  var variant = 'off';
  if (on) {
    if (force) variant = q;
    else if (C.leaves) variant = 'animated';
    else if (C.theme || C.splash) variant = 'simple';
    else { on = false; variant = 'off'; }
  }

  var reduce = false;
  try { reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

  var theme = on && (force || C.theme);
  var splash = on && (force || C.splash);
  var leaves = on && variant === 'animated' && !reduce && (force || C.leaves);

  window.__legacySeasonal = {
    on: on, variant: variant, theme: theme, leaves: leaves, splash: splash,
    reduce: reduce, until: C.until, param: q
  };

  var h = document.documentElement;
  function cls(name, yes) {
    h.classList.toggle(name, !!yes);
  }
  cls('lof-tg', on && (theme || leaves || splash));
  cls('lof-tg-theme', theme);
  cls('lof-tg-splash', splash);
  cls('lof-tg-leaves', leaves);
  cls('lof-tg-simple', variant === 'simple');
  cls('lof-tg-animated', variant === 'animated');
  cls('lof-tg-reduce', reduce);

  var LEAF_PATH = 'M12 2c.8 2.6 3.2 4.6 3.8 5 1.4-.4 3.8-.6 5.2 1.6-1.5.9-2.4 2.6-2.6 3.6 1.8.8 3.6 2.4 3.2 5.2-2.2-.6-4.2.2-5.2.8.2 1.6.2 3.8-2.8 6.8-3-3-2.8-5.2-2.6-6.8-1-.6-3-.1-5.2-.8-.4-2.8 1.4-4.4 3.2-5.2-.2-1-1.1-2.7-2.6-3.6 1.4-2.2 3.8-2 5.2-1.6C8.8 6.6 11.2 4.6 12 2z';
  var COLORS = ['#c45c26', '#d4a017', '#b45309', '#9a3412', '#ca8a04', '#a16207', '#e07a2f'];

  function leafEl(i, forSplash) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('class', 'lof-tg-leaf');
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--x', ((i * 13 + 6) % 94) + '%');
    el.style.setProperty('--d', (7 + (i % 5) * 1.4) + 's');
    el.style.setProperty('--delay', (-(i * 1.1)) + 's');
    el.style.setProperty('--rot', ((i * 47) % 360) + 'deg');
    el.style.setProperty('--size', (forSplash ? 16 : 12) + (i % 4) * 3 + 'px');
    el.style.color = COLORS[i % COLORS.length];
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', LEAF_PATH);
    p.setAttribute('fill', 'currentColor');
    el.appendChild(p);
    return el;
  }

  function fillFall(node, n, forSplash) {
    if (!node || node.childElementCount) return;
    for (var i = 0; i < n; i++) node.appendChild(leafEl(i, forSplash));
  }

  function mountPageLeaves() {
    var s = window.__legacySeasonal;
    if (!s || !s.leaves) {
      var old = document.getElementById('lof-tg-fall');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      return;
    }
    var box = document.getElementById('lof-tg-fall');
    if (!box) {
      box = document.createElement('div');
      box.id = 'lof-tg-fall';
      box.setAttribute('aria-hidden', 'true');
      document.body.appendChild(box);
    }
    fillFall(box, 8, false);
  }

  function mountSplashLeaves() {
    var s = window.__legacySeasonal;
    var box = document.querySelector('#lof-splash .lof-tg-fall');
    if (!box) return;
    if (s && s.splash && s.leaves && !s.reduce) fillFall(box, 7, true);
  }

  function bindDismiss() {
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('[data-tgdismiss]');
      if (!btn) return;
      e.preventDefault();
      try { localStorage.setItem('lof_tg_banner_2026', '1'); } catch (err) {}
      var bar = document.querySelector('.lof-tg-banner');
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    });
  }

  window.legacyThanksBannerDismissed = function () {
    try { return localStorage.getItem('lof_tg_banner_2026') === '1'; } catch (e) { return false; }
  };

  function start() {
    mountSplashLeaves();
    mountPageLeaves();
    bindDismiss();
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
