// Theme picker. The initial theme is applied by an inline script in <head>
// so there is no flash before paint, and the picked option is bracketed by
// CSS - so this only has to record the choice.
(function () {
  'use strict';

  var root = document.documentElement;
  var buttons = document.querySelectorAll('[data-theme-set]');
  var names = Array.prototype.map.call(buttons, function (b) { return b.getAttribute('data-theme-set'); });

  function set(name) {
    root.setAttribute('data-theme', name);
    try { localStorage.setItem('theme', name); } catch (e) {}
  }

  // With no choice made, the page follows the OS: amber when it is dark.
  function current() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'amber' : 'paper';
  }

  Array.prototype.forEach.call(buttons, function (button) {
    button.addEventListener('click', function () { set(button.getAttribute('data-theme-set')); });
  });

  // t steps to the next theme, shift+t to the previous one. Never with a
  // modifier (ctrl+t is the browser's) or while typing into something.
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey || e.repeat || !names.length) return;
    if (e.key !== 't' && e.key !== 'T') return;
    var el = e.target;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    var i = names.indexOf(current());
    var step = e.shiftKey ? -1 : 1;
    set(names[(i + step + names.length) % names.length]);
    e.preventDefault();
  });
})();

// Let wide tables scroll instead of breaking the page layout.
(function () {
  'use strict';
  var tables = document.querySelectorAll('.prose table');
  Array.prototype.forEach.call(tables, function (table) {
    if (table.parentNode.classList.contains('table-scroll')) return;
    var wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });
})();
