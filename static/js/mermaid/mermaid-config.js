// Mermaid setup. Two things this adds over a bare initialize():
//
//   1. The diagram palette is read from the site's own CSS variables, so a
//      diagram looks like it belongs to the page rather than to Mermaid.
//   2. Flipping the theme toggle re-renders every diagram. Mermaid replaces
//      the source with an <svg> on first run, so the source is stashed first
//      and restored before each re-render.
(function () {
  'use strict';

  var nodes = document.querySelectorAll('pre.mermaid');
  if (!nodes.length || typeof mermaid === 'undefined') return;

  // Keep the source: after a render the element holds SVG, not the diagram.
  Array.prototype.forEach.call(nodes, function (el) {
    el.dataset.src = el.textContent;
  });

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  function palette() {
    var ink = cssVar('--ink', '#14110d');
    var surf = cssVar('--surf', '#f6f1e7');
    var accent = cssVar('--accent', '#c04a18');
    var onAccent = cssVar('--on-accent', '#fdf9f0');
    var mid = cssVar('--mid', '#5b5044');
    var rule = cssVar('--rule', '#cfc0a4');
    var bg = cssVar('--bg', '#eee7dc');
    var accent2 = cssVar('--accent-2', '#dd9b1f');
    var dim = cssVar('--dim', '#8a7a5e');

    return {
      background: bg,
      primaryColor: surf,
      primaryTextColor: ink,
      primaryBorderColor: ink,
      secondaryColor: bg,
      secondaryTextColor: ink,
      secondaryBorderColor: rule,
      tertiaryColor: bg,
      tertiaryTextColor: mid,
      tertiaryBorderColor: rule,
      lineColor: ink,
      textColor: ink,
      mainBkg: surf,
      nodeBorder: ink,
      clusterBkg: bg,
      clusterBorder: rule,
      titleColor: ink,
      edgeLabelBackground: bg,
      // sequence
      actorBkg: surf,
      actorBorder: ink,
      actorTextColor: ink,
      actorLineColor: rule,
      signalColor: ink,
      signalTextColor: ink,
      labelBoxBkgColor: accent,
      labelBoxBorderColor: accent,
      labelTextColor: onAccent,
      loopTextColor: ink,
      noteBkgColor: accent,
      noteTextColor: onAccent,
      noteBorderColor: accent,
      // state / class. Mermaid derives the state label colour from the
      // state background unless told otherwise, which hides every label.
      transitionColor: ink,
      transitionLabelColor: mid,
      stateBkg: surf,
      stateLabelColor: ink,
      nodeTextColor: ink,
      labelBackgroundColor: surf,
      altBackground: bg,
      compositeBackground: bg,
      compositeBorder: rule,
      classText: ink,
      // gantt
      sectionBkgColor: bg,
      sectionBkgColor2: surf,
      altSectionBkgColor: surf,
      taskBkgColor: surf,
      taskBorderColor: ink,
      taskTextColor: ink,
      taskTextOutsideColor: ink,
      taskTextDarkColor: ink,
      activeTaskBkgColor: accent,
      activeTaskBorderColor: accent,
      doneTaskBkgColor: bg,
      doneTaskBorderColor: rule,
      critBkgColor: accent,
      critBorderColor: accent,
      gridColor: rule,
      todayLineColor: accent,
      // er: the attribute rows, which otherwise default to white and grey
      attributeBackgroundColorOdd: surf,
      attributeBackgroundColorEven: bg,
      // git: branch colours otherwise come from a lightness ramp that ends
      // in black
      git0: accent,
      git1: accent2,
      git2: ink,
      git3: dim,
      git4: mid,
      git5: accent,
      git6: accent2,
      git7: ink,
      gitBranchLabel0: onAccent,
      gitBranchLabel1: onAccent,
      gitBranchLabel2: onAccent,
      gitBranchLabel3: onAccent,
      gitBranchLabel4: onAccent,
      gitBranchLabel5: onAccent,
      gitBranchLabel6: onAccent,
      gitBranchLabel7: onAccent,
      gitInv0: bg,
      gitInv1: bg,
      gitInv2: bg,
      gitInv3: bg,
      commitLabelColor: ink,
      commitLabelBackground: bg,
      tagLabelColor: ink,
      tagLabelBackground: surf,
      tagLabelBorder: rule,
      // pie: every slice is a colour the on-accent text reads on
      pie1: accent,
      pie2: ink,
      pie3: accent2,
      pie4: dim,
      pie5: mid,
      pieTitleTextColor: ink,
      pieSectionTextColor: onAccent,
      pieLegendTextColor: ink,
      pieStrokeColor: bg,
      pieOuterStrokeColor: rule
    };
  }

  function config() {
    return {
      startOnLoad: false,
      logLevel: 'error',
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: palette(),
      fontFamily: cssVar('--body', 'system-ui, sans-serif'),
      flowchart: { curve: 'basis', useMaxWidth: true },
      sequence: { useMaxWidth: true },
      gantt: { useMaxWidth: true }
    };
  }

  function render() {
    Array.prototype.forEach.call(nodes, function (el) {
      el.removeAttribute('data-processed');
      el.innerHTML = el.dataset.src;
    });
    mermaid.initialize(config());
    mermaid.run({ nodes: nodes }).catch(function (e) {
      if (window.console) console.error('mermaid:', e);
    });
  }

  render();

  // The toggle writes data-theme on <html>; watching the attribute keeps this
  // independent of theme.js rather than wiring the two together.
  new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      if (records[i].attributeName === 'data-theme') { render(); return; }
    }
  }).observe(document.documentElement, { attributes: true });

  // And follow the OS while no explicit choice has been made.
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  if (media.addEventListener) {
    media.addEventListener('change', function () {
      if (!document.documentElement.getAttribute('data-theme')) render();
    });
  }
})();
