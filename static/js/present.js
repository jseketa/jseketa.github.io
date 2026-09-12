// An article that presents itself. The post stays the one document: this
// wraps the title and each `##` section in a <section class="slide"> at
// load (which changes nothing about how it reads), and presenting is a
// class on <body> that shows one slide at a time, full screen. Arrows,
// space and PageUp/PageDown (what clickers send) move; Esc leaves;
// #slide-N deep-links; ?present starts straight away.
(function () {
  'use strict';

  var man = document.querySelector('.man');
  var prose = document.querySelector('.man .prose');
  if (!man || !prose) return;

  function wrap(nodes, cls) {
    var s = document.createElement('section');
    s.className = 'slide' + (cls ? ' ' + cls : '');
    nodes[0].parentNode.insertBefore(s, nodes[0]);
    nodes.forEach(function (n) { s.appendChild(n); });
    return s;
  }

  // The title slide: h1 and the lede, where they stand.
  var h1 = man.querySelector('h1');
  var lede = man.querySelector('.lede');
  wrap(lede ? [h1, lede] : [h1], 'slide--title');

  // One slide per h2; whatever comes before the first h2 is a slide of its own.
  var groups = [], group = [];
  Array.prototype.slice.call(prose.childNodes).forEach(function (n) {
    if (n.nodeType === 3 && !n.textContent.trim()) return;
    if (n.nodeType === 1 && n.tagName === 'H2' && group.length) { groups.push(group); group = []; }
    group.push(n);
  });
  if (group.length) groups.push(group);
  groups.forEach(function (g) { wrap(g); });

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var rail = document.createElement('div');
  rail.className = 'present-rail';
  var count = document.createElement('div');
  count.className = 'present-count';
  document.body.appendChild(rail);
  document.body.appendChild(count);

  var index = 0, presenting = false, wake = null;

  function show(i) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach(function (s, n) { s.classList.toggle('current', n === index); });
    rail.style.width = ((index + 1) / slides.length * 100) + '%';
    count.textContent = (index + 1) + ' / ' + slides.length;
    history.replaceState(null, '', '#slide-' + (index + 1));
    slides[index].scrollTop = 0;
  }

  function start() {
    presenting = true;
    document.body.classList.add('presenting');
    show(index);
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function () {});
    }
    if (navigator.wakeLock) {
      navigator.wakeLock.request('screen').then(function (w) { wake = w; }, function () {});
    }
  }

  function stop() {
    presenting = false;
    document.body.classList.remove('presenting');
    slides.forEach(function (s) { s.classList.remove('current'); });
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    if (wake) { wake.release(); wake = null; }
    history.replaceState(null, '', location.pathname);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-present]'), function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); start(); });
  });

  document.addEventListener('keydown', function (e) {
    if (!presenting) return;
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ' || k === 'PageDown') { show(index + 1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { show(index - 1); e.preventDefault(); }
    else if (k === 'Escape') stop();
  });

  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && presenting) stop();
  });

  var n = parseInt((location.hash.match(/slide-(\d+)/) || [])[1], 10);
  if (n) index = n - 1;
  if (location.search.indexOf('present') !== -1 || n) start();
})();
