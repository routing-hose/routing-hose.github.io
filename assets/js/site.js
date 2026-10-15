// Page behaviour: nav, lazy videos, pipeline stepper, tabs, chapters, SVG charts, galleries.
// The real-robot explorer lives in real-explorer.mjs; the two three.js viewers in *-explorer.mjs.
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── nav: solid past the hero, progress, active section, burger, theme ──
  var nav = $('.nav'), hero = $('#top'), prog = $('#progress');
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.width = (h > 0 ? 100 * window.scrollY / h : 0) + '%';
    nav.classList.toggle('solid', window.scrollY > hero.offsetHeight - 80);
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var links = $$('#nav-links a');
  var secIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) secIO.observe(s); });
  $('#burger').addEventListener('click', function () { $('#nav-links').classList.toggle('open'); });
  links.forEach(function (a) { a.addEventListener('click', function () { $('#nav-links').classList.remove('open'); }); });
  $('#scroll-cue').addEventListener('click', function () { $('#overview').scrollIntoView({ behavior: 'smooth' }); });
  $('#theme-btn').addEventListener('click', function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    window.dispatchEvent(new Event('themechange'));
  });
  $('#copy-bib').addEventListener('click', function () {
    var b = this;
    try { navigator.clipboard.writeText($('#bibtex').textContent).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); }); } catch (e) {}
  });

  // ── lazy videos: load near the viewport, play only while visible ──
  function playSafe(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) { if (!v.src && v.dataset.src) v.src = v.dataset.src; playSafe(v); }
      else if (!v.paused) v.pause();
    });
  }, { rootMargin: '200px 0px', threshold: 0.15 });
  function lazy(v) {
    if (!v.poster && v.dataset.src) v.poster = 'assets/img/posters/' + v.dataset.src.split('/').pop().replace('.mp4', '.jpg');
    io.observe(v);
  }
  $$('video.lazy').forEach(lazy);
  function video(src) {
    var v = document.createElement('video');
    v.className = 'lazy'; v.dataset.src = src; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    lazy(v);
    return v;
  }
  function tabs(bar, attr, cb) {
    $$('[' + attr + ']', bar).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[' + attr + ']', bar).forEach(function (x) { x.classList.toggle('active', x === b); });
        cb(b.getAttribute(attr));
      });
    });
  }

  // ── pipeline stepper: auto-advances while on screen until the reader picks a step ──
  var steps = $$('.pipe-step'), pv = $('#pipe-video'), cur = -1, auto = !reduced, pipeTimer = null, pipeVisible = false;
  function setStep(i) {
    cur = i;
    steps.forEach(function (s, j) {
      s.classList.toggle('active', j === i);
      var bar = $('.bar', s); bar.classList.remove('run'); void bar.offsetWidth;
      if (j === i && auto) bar.classList.add('run');
    });
    pv.poster = steps[i].dataset.poster; pv.src = steps[i].dataset.src;
    if (pipeVisible) playSafe(pv);
    clearTimeout(pipeTimer);
    if (auto && pipeVisible) pipeTimer = setTimeout(function () { setStep((cur + 1) % steps.length); }, 9000);
  }
  steps.forEach(function (s, j) { s.addEventListener('click', function () { auto = false; setStep(j); }); });
  new IntersectionObserver(function (es) {
    pipeVisible = es[0].isIntersecting;
    if (pipeVisible) { if (cur < 0) setStep(0); else { playSafe(pv); if (auto) setStep(cur); } }
    else { pv.pause(); clearTimeout(pipeTimer); }
  }, { threshold: 0.3 }).observe($('#pipe'));

  // ── video chapters ──
  function chapters(vid, host, segs) {
    host.innerHTML = '';
    segs.forEach(function (s) {
      var b = document.createElement('button');
      b.textContent = s.label; if (s.plan) b.className = 'plan';
      b.addEventListener('click', function () { vid.currentTime = s.t0 + 0.05; playSafe(vid); });
      host.appendChild(b); s._btn = b;
    });
    vid.addEventListener('timeupdate', function () {
      var t = vid.currentTime, c = null;
      segs.forEach(function (s) { if (t >= s.t0) c = s; });
      segs.forEach(function (s) { s._btn.classList.toggle('now', s === c); });
    });
  }
  chapters($('#real-video'), $('#real-chapters'), [
    { t0: 3.5, label: 'probes' }, { t0: 34.6, label: 'fit z' },
    { t0: 37.1, label: 'move 1 · plan', plan: 1 }, { t0: 49.5, label: 'move 1 · execute' },
    { t0: 64.3, label: 'move 2 · plan', plan: 1 }, { t0: 76.8, label: 'move 2 · execute' },
    { t0: 91.5, label: 'move 3 · plan', plan: 1 }, { t0: 104.0, label: 'move 3 · execute' },
    { t0: 118.2, label: 'move 4 · plan', plan: 1 }, { t0: 130.7, label: 'move 4 · execute' }, { t0: 142.2, label: 'routed' }]);
  chapters($('#mind-video'), $('#mind-chapters'), [
    { t0: 3.5, label: 'probes' }, { t0: 34.6, label: 'z fit, probe by probe' }, { t0: 64.6, label: 'z fit result' },
    { t0: 68.1, label: 'move 1', plan: 1 }, { t0: 98.3, label: 'forecast vs outcome' },
    { t0: 102.3, label: 'move 2', plan: 1 }, { t0: 136.5, label: 'move 3', plan: 1 }, { t0: 170.2, label: 'move 4', plan: 1 },
    { t0: 200.0, label: 'forecast vs outcome' }]);

  // ── dynamics clips by simulator (captions from assets/data/dynamics.json) ──
  var SHORT = { all: 'ours', matched: 'matched budget', union: 'union', newton: 'AVBD only', isaac: 'PhysX only', xpbd: 'XPBD only', fem: 'FEM only' };
  var DYN = {
    newton: [['newton_w26558_t12', ['all', 'newton']], ['newton_w8770_t39', ['all', 'newton']], ['newton_w8621_t29', ['all', 'newton']],
             ['newton_w25007_t27', ['all', 'newton']], ['newton_w8354_t30', ['all', 'newton']], ['newton_w2042_t5', ['all', 'newton', 'isaac']],
             ['newton_w17991_t11', ['all', 'newton', 'isaac']], ['newton_w19927_t13', ['all', 'newton', 'isaac']], ['newton_w25345_t23', ['all', 'newton']]],
    isaac: [['isaac_w1433_t8', ['all', 'isaac']], ['isaac_w13176_t9', ['all', 'isaac']], ['isaac_w17471_t15', ['all', 'isaac']]],
    xpbd: [['xpbd_w4735_t13', ['all', 'xpbd']], ['xpbd_w168_t11', ['all', 'xpbd']], ['xpbd_w12540_t5', ['all', 'xpbd']], ['xpbd_w32204_t15', ['all', 'xpbd', 'isaac']]],
    fem: [['fem_w23629_t7', ['all', 'fem']], ['fem_w16351_t7', ['all', 'fem']], ['fem_w2789_t8', ['all', 'fem']]]
  };
  var dynData = null, curDyn = 'newton';
  function showDyn(eng) {
    var grid = $('#dyn-video-grid'); grid.innerHTML = '';
    DYN[eng].forEach(function (row) {
      var id = row[0], ms = row[1];
      var fig = document.createElement('figure');
      var box = document.createElement('div'); box.className = 'media';
      box.appendChild(video('assets/videos/dynamics/' + id + '.mp4'));
      fig.appendChild(box);
      var cap = document.createElement('figcaption');
      var c = dynData && dynData.cases.find(function (x) { return x.id === id; });
      if (c) {
        var parts = ms.map(function (m) { return SHORT[m] + ' ' + c.rmse[m].toFixed(2) + ' cm'; });
        var best = Object.keys(c.rmse).sort(function (a, b) { return c.rmse[a] - c.rmse[b]; })[0];
        cap.innerHTML = 'world ' + c.world + ', action ' + c.transition + ' · ' + parts.join(' · ') +
          (best === 'all' ? ' · <b>ours lowest of 7</b>' : ' · lowest: ' + SHORT[best] + ' ' + c.rmse[best].toFixed(2) + ' cm');
      }
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
  }
  fetch('assets/data/dynamics.json').then(function (r) { return r.json(); }).then(function (d) { dynData = d; showDyn(curDyn); });
  tabs($('#dyn-video-tabs'), 'data-dyn-eng', function (e) { curDyn = e; showDyn(e); });
  showDyn('newton');

  // ── MPPI episode videos + chapters ──
  var EP = {
    b1_xpbd_g1: 'Task G1 (clamped return around four pegs), hose V3X2, Newton XPBD executes. Ours routes the hose in 21 actions; the five other models stop at the 30-action budget.',
    b1_fem_g4: 'Task G4 (clamped looped peg-winding), hose V3F1, executed by the FEM simulator (Newton VBD tet), on which no model was trained. Six probing moves first, then MPPI; violet: loop proposals the planner protects in every iteration. Ours routes in 15 actions. FEM hose motion is interpolated between recorded states.',
    b1_avbd_g7: 'Task G7 (free alpha loop threaded between pegs), hose V2S2, Newton AVBD executes. Ours routes in 19 actions; the five other models reach the 30-action budget. 12 of 19 moves are re-simulated by AVBD, the rest interpolated.'
  };
  var epVid = $('#ep-video'), epChap = $('#ep-chapters'), epSegs = [];
  function setEp(n) {
    epVid.src = 'assets/videos/mppi/' + n + '.mp4'; epVid.poster = 'assets/img/posters/' + n + '.jpg';
    $('#ep-caption').textContent = EP[n];
    fetch('assets/data/' + n + '.segments.json').then(function (r) { return r.json(); }).then(function (segs) {
      epChap.innerHTML = '';
      var probes = false;
      epSegs = segs.filter(function (s) {
        if (s.kind === 'probe') { if (probes || /result/.test(s.label)) return false; probes = true; s.label = 'probes'; return true; }
        return s.kind === 'plan' || s.kind === 'outro';
      });
      epSegs.forEach(function (s) {
        var b = document.createElement('button');
        b.textContent = s.kind === 'outro' ? 'goal reached' : s.kind === 'plan' ? 'MPPI ' + s.label.replace('plan', 'step') : s.label;
        if (s.kind === 'plan') b.className = 'plan';
        b.addEventListener('click', function () { epVid.currentTime = s.t0 + 0.05; playSafe(epVid); });
        epChap.appendChild(b); s._btn = b;
      });
    });
  }
  epVid.addEventListener('timeupdate', function () {
    var t = epVid.currentTime, c = null;
    epSegs.forEach(function (s) { if (t >= s.t0) c = s; });
    epSegs.forEach(function (s) { s._btn.classList.toggle('now', s === c); });
  });
  tabs($('#ep-tabs'), 'data-ep', setEp);
  setEp('b1_xpbd_g1');

  // ── six-planner grids ──
  var METHODS = [['R-HDLO (ours)', '#0072b2'], ['4-sim union', '#56b4e9'], ['AVBD only', '#e69f00'], ['PhysX only', '#8c6d31'], ['XPBD only', '#d55e00'], ['FEM only', '#7f7f7f']];
  var GRIDS = {
    grid_avbd_g7_s402: { cap: 'Task G7, free alpha loop threaded between pegs (one loop closed by a self-crossing, both ends free). Hose S1, start seed 402, Newton AVBD executes. On this cell ours routes 8 of 16 starts, at most 5 for any other model. Panels: top row ours / union / AVBD only, bottom row PhysX / XPBD / FEM only.',
      out: [[1, 17, 0.28], [0, 30, 4.28], [0, 30, 6.15], [0, 30, 6.11], [0, 30, 0.86], [0, 30, 0.92]] },
    grid_avbd_g4_s404: { cap: 'Task G4, clamped looped peg-winding (a full loop around one peg closed by a self-crossing). Hose S1, start seed 404, Newton AVBD executes. On this cell ours routes 12 of 16 starts vs 11 for AVBD only, so the per-cell lead is narrow. In the union\'s recorded run the hose passes through a peg in 3 of 31 states.',
      out: [[1, 20, 0.28], [0, 30, 0.82], [0, 30, 5.41], [0, 30, 2.04], [0, 30, 4.67], [0, 30, 2.15]] },
    grid_xpbd_g1_s404: { cap: 'Task G1, clamped return around four pegs. Hose V3X2, start seed 404, Newton XPBD executes; the hose is re-simulated by XPBD in every panel.',
      out: [[1, 21, 0.33], [0, 30, 1.28], [0, 30, 2.21], [0, 30, 1.18], [0, 30, 2.11], [0, 30, 1.85]] },
    grid_fem_g4_s404: { cap: 'Task G4 on the FEM executor (Newton VBD tet; no model was trained on it). Hose V3F1, start seed 404. With the XPBD-only and FEM-only planners the FEM simulator fails during action 4; their last valid state is held, dimmed. FEM hose motion is interpolated between recorded states.',
      out: [[1, 15, 0.38], [0, 30, 3.43], [0, 30, 1.03], [0, 30, 14.61], [-1, 4, null], [-1, 4, null]] }
  };
  var gridVid = $('#grid-video');
  function setGrid(n) {
    var g = GRIDS[n];
    gridVid.src = 'assets/videos/grids/' + n + '.mp4'; gridVid.poster = 'assets/img/posters/' + n + '.jpg';
    $('#grid-caption').textContent = g.cap;
    $('#grid-legend').innerHTML = METHODS.map(function (m, i) {
      var o = g.out[i];
      var txt = o[0] === 1 ? 'routed in ' + o[1] + ' actions' : o[0] === 0 ? 'not routed · cost ' + o[2].toFixed(2) : 'simulator failure, action ' + o[1];
      return '<div class="gl"><span class="sw" style="background:' + m[1] + '"></span>' + m[0] +
        '<span class="out ' + (o[0] === 1 ? 'win' : o[0] < 0 ? 'fail' : '') + '">' + (o[0] === 1 ? '<i class="fas fa-check"></i> ' : '') + txt + '</span></div>';
    }).join('');
  }
  tabs($('#grid-tabs'), 'data-grid', setGrid);
  setGrid('grid_avbd_g7_s402');

  // ── task gallery ──
  var NAMES = { G1: 'clamped return around four pegs', G2: 'clamped alternating weave', G3: 'open figure-eight with self-crossing',
                G4: 'clamped looped peg-winding', G5: 'clamped dense six-peg slalom', G7: 'free alpha loop between pegs', G8: 'clamped S-route on peg clusters' };
  var ENG = { avbd: 'AVBD', xpbd: 'XPBD', fem: 'FEM' };
  ['avbd_G1_V2S4_401', 'xpbd_G1_V3X1_401', 'fem_G1_V3F2_402', 'avbd_G2_S1_403', 'xpbd_G2_V3X1_401', 'fem_G2_V3F1_403',
   'avbd_G3_V2S4_402', 'avbd_G4_V2S3_401', 'fem_G4_V3F3_403', 'avbd_G5_V2S3_404', 'avbd_G7_S1_402', 'avbd_G8_V2S4_404'].forEach(function (t) {
    var p = t.split('_');
    var fig = document.createElement('figure');
    var box = document.createElement('div'); box.className = 'media';
    box.appendChild(video('assets/videos/gallery/' + t + '.mp4'));
    fig.appendChild(box);
    var cap = document.createElement('figcaption');
    cap.innerHTML = '<span class="tag-eng">' + p[1] + ' · ' + ENG[p[0]] + '</span> · ' + NAMES[p[1]] + (p[0] === 'fem' ? ' · hose interpolated' : '');
    fig.appendChild(cap);
    $('#task-gallery').appendChild(fig);
  });

  // ═════════════ SVG charts ═════════════
  // One helper: horizontal bars, label left, value right, ours (or a chosen row) in the accent, the rest neutral.
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function tipFor(host) {
    var t = $('.tip', host);
    if (!t) { t = document.createElement('div'); t.className = 'tip'; host.appendChild(t); }
    return t;
  }
  function wireTips(host) {
    var tip = tipFor(host);
    $$('[data-tip]', host).forEach(function (el) {
      el.addEventListener('mousemove', function (ev) {
        var r = host.getBoundingClientRect();
        tip.innerHTML = el.getAttribute('data-tip'); tip.classList.add('on');
        var x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 12;
        if (x + tip.offsetWidth > r.width) x = ev.clientX - r.left - tip.offsetWidth - 14;
        tip.style.left = x + 'px'; tip.style.top = y + 'px';
      });
      el.addEventListener('mouseleave', function () { tip.classList.remove('on'); });
    });
  }
  // rows: [{label, value, hi, tip, note}] ; opts: {max, fmt, labelW, rowH, valueW}
  function hbars(host, rows, opts) {
    var W = Math.max(280, host.clientWidth), lw = opts.labelW || Math.min(190, W * 0.36), vw = opts.valueW || 72, rh = opts.rowH || 30;
    var bw = W - lw - vw - 8, H = rows.length * rh + 4, max = opts.max || Math.max.apply(null, rows.map(function (r) { return r.value; }));
    var acc = css('--accent'), neu = css('--muted'), surf = css('--surface-2');
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img">';
    rows.forEach(function (r, i) {
      var y = i * rh + 2, w = Math.max(2, bw * r.value / max);
      var col = r.color || (r.hi ? acc : neu);
      s += '<g class="row" transform="translate(0,' + y + ')">';
      s += '<text x="0" y="' + (rh / 2 + 4) + '" class="' + (r.hi ? 'lab' : '') + '">' + esc(r.label) + '</text>';
      s += '<rect x="' + lw + '" y="' + (rh / 2 - 5) + '" width="' + bw + '" height="10" rx="5" fill="' + surf + '"/>';
      if (r.ghost != null) s += '<rect x="' + lw + '" y="' + (rh / 2 - 5) + '" width="' + Math.max(2, bw * r.ghost / max) + '" height="10" rx="5" fill="' + col + '" opacity=".28"/>';
      s += '<rect class="bar" x="' + lw + '" y="' + (rh / 2 - 5) + '" width="' + w + '" height="10" rx="5" fill="' + col + '" opacity="' + (r.hi ? 1 : 0.55) + '"/>';
      s += '<text x="' + (W - 2) + '" y="' + (rh / 2 + 4) + '" text-anchor="end" class="' + (r.hi ? 'lab' : '') + '">' + esc(opts.fmt(r.value)) + (r.note ? ' <tspan class="muted" font-size="10">' + esc(r.note) + '</tspan>' : '') + '</text>';
      if (r.tip) s += '<rect class="hit" x="0" y="0" width="' + W + '" height="' + rh + '" data-tip="' + esc(r.tip).replace(/"/g, '&quot;') + '"/>';
      s += '</g>';
    });
    host.innerHTML = s + '</svg>';
    wireTips(host);
  }

  // corpus: one series -> one colour
  var CORPUS = [['Newton XPBD', 1715308, 138454], ['Newton AVBD', 1582111, 92898], ['Genesis FEM', 1279450, 88802], ['Isaac PhysX', 1162509, 104459]];
  function drawCorpus() {
    hbars($('#corpus-chart'), CORPUS.map(function (c) {
      return { label: c[0], value: c[1] / 1e6, hi: true, tip: '<b>' + c[0] + '</b><br>' + c[1].toLocaleString() + ' transitions<br>' + c[2].toLocaleString() + ' worlds' };
    }), { fmt: function (v) { return v.toFixed(2) + 'M'; }, labelW: 110, valueW: 54 });
  }

  // Table I
  var T1COLS = { avbd: 0, physx: 1, xpbd: 2, fem: 3, avg: 4 };
  var T1 = [
    ['R-HDLO (ours)', '160k', [2.769, 2.194, 1.059, 0.836, 1.715], 1],
    ['4-sim union', '80k', [2.853, 2.244, 1.108, 0.945, 1.787]],
    ['4-sim, matched data budget', '80k', [2.994, 2.309, 1.147, 0.999, 1.862]],
    ['AVBD only', '80k', [2.787, 2.882, 1.829, 1.533, 2.258]],
    ['PhysX only', '80k', [4.217, 2.200, 1.478, 1.428, 2.331]],
    ['XPBD only', '80k', [4.286, 2.644, 0.967, 1.708, 2.401]],
    ['FEM only', '80k', [4.185, 3.054, 1.854, 1.032, 2.531]],
    ['Control: 4-sim union, 160k steps', '160k', [2.770, 2.189, 1.059, 0.919, 1.734], 0, 1]];
  var t1col = 'avg';
  function drawT1() {
    var k = T1COLS[t1col];
    var rows = T1.filter(function (r) { return !r[4]; }).slice().sort(function (a, b) { return a[2][k] - b[2][k]; });
    var best = rows[0][2][k];
    hbars($('#t1-chart'), rows.map(function (r) {
      return { label: r[0], value: r[2][k], hi: !!r[3], note: r[2][k] === best ? 'best' : '',
        tip: '<b>' + r[0] + '</b> (' + r[1] + ' steps)<br>AVBD ' + r[2][0] + ' · PhysX ' + r[2][1] + ' · XPBD ' + r[2][2] + ' · FEM ' + r[2][3] + '<br>average <b>' + r[2][4] + ' cm</b>' };
    }), { max: 4.4, fmt: function (v) { return v.toFixed(2); }, valueW: 70 });
  }
  (function () {
    var cols = ['AVBD', 'PhysX', 'XPBD', 'FEM', 'Average'];
    var best = [0, 1, 2, 3, 4].map(function (k) { return Math.min.apply(null, T1.map(function (r) { return r[2][k]; })); });
    $('#t1-table').innerHTML = '<thead><tr><th>Model (training data)</th><th>steps</th>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
      T1.map(function (r) {
        return '<tr class="' + (r[3] ? 'ours' : r[4] ? 'control' : '') + '"><td>' + r[0] + '</td><td>' + r[1] + '</td>' +
          r[2].map(function (v, k) { return '<td>' + (v === best[k] ? '<b>' + v.toFixed(3) + '</b>' : v.toFixed(3)) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody>';
  })();
  tabs($('#t1-seg'), 'data-col', function (c) { t1col = c; drawT1(); });

  var ZROWS = [['refined from this hose', 1.715, 1], ['encoder only', 1.743], ["the simulator's mean z", 2.016], ["another hose's z", 2.145]];
  function drawZ() {
    hbars($('#z-chart'), ZROWS.map(function (r) { return { label: r[0], value: r[1], hi: !!r[2] }; }),
      { max: 2.3, fmt: function (v) { return v.toFixed(3) + ' cm'; }, valueW: 76, labelW: 160 });
  }

  // pooled routing + head to head
  var R = [['R-HDLO (ours)', 114, 105, null], ['4-sim union', 90, 86, [39, 15, 'p = .0015']], ['AVBD only', 90, 83, [45, 21, 'p = .0043']],
           ['XPBD only', 69, 67, [58, 13, 'p < .001']], ['PhysX only', 58, 57, [64, 8, 'p < .001']], ['FEM only', 57, 48, [69, 12, 'p < .001']]];
  function drawRouting() {
    var robust = $('#robust-toggle').checked;
    hbars($('#routing-bars'), R.map(function (r, i) {
      return { label: r[0], value: robust ? r[2] : r[1], ghost: robust ? r[1] : null, hi: i === 0,
        tip: '<b>' + r[0] + '</b>: ' + r[1] + ' routed (' + r[2] + ' excluding peg pass-through)' +
          (r[3] ? '<br>ours only ' + r[3][0] + ' : ' + r[3][1] + ' ' + r[0] + ' only · ' + r[3][2] : '') };
    }), { max: 130, fmt: function (v) { return v + ' / 260'; }, valueW: 70, labelW: 110 });
  }
  $('#robust-toggle').addEventListener('change', drawRouting);
  function drawH2H() {
    var host = $('#h2h-chart'), W = Math.max(280, host.clientWidth), lw = 92, rh = 34, H = 5 * rh + 26, mid = lw + (W - lw - 64) / 2;
    var half = (W - lw - 64) / 2, max = 72, acc = css('--accent'), neu = css('--muted');
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">';
    s += '<text x="' + (mid - 6) + '" y="11" text-anchor="end" class="muted" font-size="11">other only</text>';
    s += '<text x="' + (mid + 6) + '" y="11" class="muted" font-size="11">ours only</text>';
    R.slice(1).forEach(function (r, i) {
      var y = 20 + i * rh, a = r[3][0], b = r[3][1];
      s += '<text x="0" y="' + (y + rh / 2 + 4) + '">' + r[0].replace(' only', '') + '</text>';
      s += '<rect x="' + (mid - half * b / max) + '" y="' + (y + rh / 2 - 6) + '" width="' + (half * b / max) + '" height="12" rx="4" fill="' + neu + '" opacity=".55"/>';
      s += '<rect x="' + (mid + 1) + '" y="' + (y + rh / 2 - 6) + '" width="' + (half * a / max) + '" height="12" rx="4" fill="' + acc + '"/>';
      s += '<text x="' + (mid - half * b / max - 5) + '" y="' + (y + rh / 2 + 4) + '" text-anchor="end" class="muted" font-size="11">' + b + '</text>';
      s += '<text x="' + (mid + half * a / max + 6) + '" y="' + (y + rh / 2 + 4) + '" class="lab" font-size="11">' + a + '</text>';
      s += '<text x="' + W + '" y="' + (y + rh / 2 + 4) + '" text-anchor="end" class="muted" font-size="11">' + r[3][2] + '</text>';
      s += '<rect class="hit" x="0" y="' + y + '" width="' + W + '" height="' + rh + '" data-tip="<b>vs ' + r[0] + '</b><br>' + a + ' starts only ours routes, ' + b + ' only ' + r[0] + ' routes<br>' + r[3][2].replace('<', '&lt;') + '"/>';
    });
    s += '<line x1="' + mid + '" x2="' + mid + '" y1="16" y2="' + (H - 4) + '" stroke="' + css('--line') + '"/>';
    host.innerHTML = s + '</svg>';
    wireTips(host);
  }

  function redrawCharts() { drawCorpus(); drawT1(); drawZ(); drawRouting(); drawH2H(); }
  redrawCharts();
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () { if (Math.abs(window.innerWidth - lastW) > 30) { lastW = window.innerWidth; redrawCharts(); } });
  window.addEventListener('themechange', redrawCharts);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redrawCharts);
  window.RHDLO = { wireTips: wireTips, css: css };
})();
