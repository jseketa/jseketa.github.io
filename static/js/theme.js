// Theme picker. The initial theme is applied by an inline script in <head>
// so there is no flash before paint, and the picked option is bracketed by
// CSS - so this only has to record the choice.
(function () {
  'use strict';

  var root = document.documentElement;
  var buttons = document.querySelectorAll('[data-theme-set]');

  Array.prototype.forEach.call(buttons, function (button) {
    button.addEventListener('click', function () {
      var name = button.getAttribute('data-theme-set');
      root.setAttribute('data-theme', name);
      try { localStorage.setItem('theme', name); } catch (e) {}
    });
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
