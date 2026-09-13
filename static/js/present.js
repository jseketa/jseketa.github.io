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
    // The section label is created detached, so anchor on a node that is
    // in the document.
    var anchor = nodes.filter(function (n) { return n.parentNode; })[0];
    anchor.parentNode.insertBefore(s, anchor);
    nodes.forEach(function (n) { s.appendChild(n); });
    return s;
  }

  // The title slide: h1 and the lede, where they stand.
  var h1 = man.querySelector('h1');
  var lede = man.querySelector('.lede');
  wrap(lede ? [h1, lede] : [h1], 'slide--title');

  // A slide per h2 and per h3 (a sub-heading is how a long section is
  // broken for the screen without changing how it reads); whatever comes
  // before the first heading is a slide of its own. An h3 slide carries
  // its section's name as a label.
  var groups = [], group = [], section = null;
  Array.prototype.slice.call(prose.childNodes).forEach(function (n) {
    if (n.nodeType === 3 && !n.textContent.trim()) return;
    if (n.nodeType === 1 && (n.tagName === 'H2' || n.tagName === 'H3') && group.length) { groups.push(group); group = []; }
    if (n.nodeType === 1 && n.tagName === 'H2') section = n.textContent;
    if (n.nodeType === 1 && n.tagName === 'H3' && section) {
      var label = document.createElement('p');
      label.className = 'slide__section';
      label.textContent = section;
      group.push(label);
    }
    group.push(n);
  });
  if (group.length) groups.push(group);
  groups.forEach(function (g) { wrap(g); });

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));

  // While reading, each slide is marked in the margin: its number, and a
  // hairline down its extent, so the author sees what lands on which slide.
  // A click on the number presents from there.
  slides.forEach(function (s, k) {
    var mark = document.createElement('a');
    mark.className = 'slide-mark';
    mark.href = '#slide-' + (k + 1);
    mark.textContent = k + 1;
    mark.title = 'slide ' + (k + 1) + ' of ' + slides.length + ' - present from here';
    mark.addEventListener('click', function (e) { e.preventDefault(); index = k; start(); });
    s.insertBefore(mark, s.firstChild);
  });

  // Which slides would scroll when presented: each is laid out as if
  // presenting, between two frames so nothing paints, and measured. The
  // presentation is full screen, so the slide is given the screen's height
  // rather than the window's, which loses the browser's own bars. The
  // marker of one that overflows goes to the accent and says by how much.
  // Rerun when the window changes, since the width sets the type size.
  function audit() {
    if (presenting) return;
    var x = window.scrollX, y = window.scrollY;
    document.body.classList.add('presenting');
    slides.forEach(function (s) {
      s.classList.add('current');
      s.style.bottom = 'auto';
      s.style.height = Math.max(screen.height, window.innerHeight) + 'px';
      var over = s.scrollHeight - s.clientHeight;
      s.style.bottom = '';
      s.style.height = '';
      s.classList.remove('current');
      var mark = s.firstChild;
      mark.classList.toggle('slide-mark--over', over > 0);
      mark.title = 'slide ' + mark.textContent + ' of ' + slides.length +
        (over > 0 ? ' - overflows the screen by ' + over + 'px' : '') + ' - present from here';
    });
    document.body.classList.remove('presenting');
    window.scrollTo(x, y);
  }

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
    document.body.classList.remove('blanked');
    slides.forEach(function (s) { s.classList.remove('current'); });
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    if (wake) { wake.release(); wake = null; }
    history.replaceState(null, '', location.pathname);
    audit();
  }

  // The blank button: the stage goes to the theme's ground until the next
  // key. Any slide change unblanks.
  function blank(on) { document.body.classList.toggle('blanked', on); }

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    // The presenter's start/stop button is F5, which would otherwise
    // reload the page.
    if (k === 'F5') { e.preventDefault(); if (e.repeat) return; if (presenting) stop(); else start(); return; }
    if (!presenting) return;
    // A held button auto-repeats; one press is one step.
    if (e.repeat) { e.preventDefault(); return; }
    // Left/right, space and the presenter's PageUp/PageDown move between
    // slides; up/down scroll the one on screen, for the dense ones;
    // `.` (the presenter's blank button) blanks the stage.
    if (k === 'ArrowRight' || k === ' ' || k === 'PageDown') { blank(false); show(index + 1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { blank(false); show(index - 1); e.preventDefault(); }
    else if (k === 'ArrowDown') { slides[index].scrollBy(0, window.innerHeight * 0.6); e.preventDefault(); }
    else if (k === 'ArrowUp') { slides[index].scrollBy(0, -window.innerHeight * 0.6); e.preventDefault(); }
    else if (k === '.' || k === 'b') { blank(!document.body.classList.contains('blanked')); e.preventDefault(); }
    else if (k === 'Escape') stop();
  });

  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && presenting) stop();
  });

  var n = parseInt((location.hash.match(/slide-(\d+)/) || [])[1], 10);
  if (n) index = n - 1;
  if (location.search.indexOf('present') !== -1 || n) start();

  audit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(audit);
  var pending = null;
  window.addEventListener('resize', function () {
    clearTimeout(pending);
    pending = setTimeout(audit, 200);
  });
})();
