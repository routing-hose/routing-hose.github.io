// Page behaviour: progress bar, navbar, lazy videos, tabs, chapters, routing bars, galleries, real-hose compare.
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ── scroll progress, navbar over hero, burger, scroll indicator ──
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    $('.page-progress-bar-fill').style.width = (h > 0 ? 100 * window.scrollY / h : 0) + '%';
    var hero = $('#top'), nav = $('.navbar');
    nav.classList.toggle('navbar-over-video', window.scrollY < hero.offsetHeight - 100);
  }
  window.addEventListener('scroll', onScroll); onScroll();
  var burger = $('.navbar-burger'), menu = $('#mainNav');
  burger.addEventListener('click', function () { burger.classList.toggle('is-active'); menu.classList.toggle('is-active'); });
  $$('#mainNav .navbar-item').forEach(function (a) { a.addEventListener('click', function () { burger.classList.remove('is-active'); menu.classList.remove('is-active'); }); });
  $('#scroll-indicator-btn').addEventListener('click', function () { $('#abstract').scrollIntoView({ behavior: 'smooth' }); });

  // ── lazy autoplaying videos: load near the viewport, play only while visible ──
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (!v.src && v.dataset.src) { v.src = v.dataset.src; }
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else if (!v.paused) { v.pause(); }
    });
  }, { rootMargin: '200px 0px', threshold: 0.15 });
  function lazy(v) {
    if (!v.poster && v.dataset.src) v.poster = 'assets/img/posters/' + v.dataset.src.split('/').pop().replace('.mp4', '.jpg');
    io.observe(v);
  }
  $$('video.lazy').forEach(lazy);

  function video(src, cls) {
    var v = document.createElement('video');
    v.className = 'lazy' + (cls ? ' ' + cls : '');
    v.dataset.src = src; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    var name = src.split('/').pop().replace('.mp4', '');
    v.poster = 'assets/img/posters/' + name + '.jpg';
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
  var dynData = null;
  function showDyn(eng) {
    var grid = $('#dyn-video-grid'); grid.innerHTML = '';
    DYN[eng].forEach(function (row) {
      var id = row[0], ms = row[1];
      var fig = document.createElement('figure');
      var box = document.createElement('div'); box.className = 'media-container';
      box.appendChild(video('assets/videos/dynamics/' + id + '.mp4'));
      fig.appendChild(box);
      var cap = document.createElement('figcaption');
      var c = dynData && dynData.cases.find(function (x) { return x.id === id; });
      if (c) {
        var parts = ms.map(function (m) { return SHORT[m] + ' ' + c.rmse[m].toFixed(2) + ' cm'; });
        var best = Object.keys(c.rmse).sort(function (a, b) { return c.rmse[a] - c.rmse[b]; })[0];
        cap.innerHTML = 'world ' + c.world + ', action ' + c.transition + ' · RMSE ' + parts.join(' · ') +
          (best === 'all' ? ' · <b>ours lowest of 7</b>' : ' · lowest: ' + SHORT[best] + ' ' + c.rmse[best].toFixed(2) + ' cm');
      }
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
  }
  fetch('assets/data/dynamics.json').then(function (r) { return r.json(); }).then(function (d) { dynData = d; showDyn(curDyn); });
  var curDyn = 'newton';
  tabs($('#dyn-video-tabs'), 'data-dyn-eng', function (e) { curDyn = e; showDyn(e); });
  showDyn('newton');

  // ── MPPI episode videos + chapters ──
  var EP = {
    b1_xpbd_g1: 'Task G1 (clamped return around four pegs), hose V3X2, Newton XPBD executes. Ours routes the hose in 21 actions; the five other models stop at the 30-action budget. The probing moves for this run are shown in the Adaptation section above.',
    b1_fem_g4: 'Task G4 (clamped looped peg-winding), hose V3F1, executed by the FEM simulator (Newton VBD tet), on which no model was trained. Six probing moves first, then MPPI; violet: loop proposals the planner protects in every iteration. Ours routes in 15 actions. FEM hose motion is interpolated between recorded states.',
    b1_avbd_g7: 'Task G7 (free alpha loop threaded between pegs), hose V2S2, Newton AVBD executes. Ours routes in 19 actions; the five other models reach the 30-action budget. 12 of 19 moves are re-simulated by AVBD, the rest interpolated.'
  };
  var epVid = $('#ep-video'), chapters = $('#ep-chapters'), epSegs = [];
  function chapterLabel(s) {
    if (s.kind === 'probe') return s.label.replace(' result', '');
    if (s.kind === 'plan') return 'MPPI ' + s.label.replace('plan', 'step');
    return s.label;
  }
  function setEp(n) {
    epVid.src = 'assets/videos/mppi/' + n + '.mp4'; epVid.poster = 'assets/img/posters/' + n + '.jpg';
    $('#ep-caption').textContent = EP[n];
    fetch('assets/data/' + n + '.segments.json').then(function (r) { return r.json(); }).then(function (segs) {
      chapters.innerHTML = '';
      var probesShown = false;
      epSegs = segs.filter(function (s) {
        if (s.kind === 'probe') { if (probesShown || /result/.test(s.label)) return false; probesShown = true; s.label = 'probes'; return true; }
        return s.kind === 'plan' || s.kind === 'outro';
      });
      epSegs.forEach(function (s) {
        var b = document.createElement('button');
        b.textContent = s.kind === 'outro' ? 'goal reached' : chapterLabel(s);
        if (s.kind === 'plan') b.className = 'plan';
        b.addEventListener('click', function () { epVid.currentTime = s.t0 + 0.05; var p = epVid.play(); if (p && p.catch) p.catch(function () {}); });
        chapters.appendChild(b); s._btn = b;
      });
    });
  }
  epVid.addEventListener('timeupdate', function () {
    var t = epVid.currentTime, cur = null;
    epSegs.forEach(function (s) { if (t >= s.t0) cur = s; });
    epSegs.forEach(function (s) { s._btn.classList.toggle('now', s === cur); });
  });
  tabs($('#ep-tabs'), 'data-ep', setEp);
  setEp('b1_xpbd_g1');

  // ── six-planner grids ──
  var METHODS = [['R-HDLO (ours)', '#0072b2'], ['4-sim union', '#56b4e9'], ['AVBD only', '#e69f00'], ['PhysX only', '#8c6d31'], ['XPBD only', '#d55e00'], ['FEM only', '#7f7f7f']];
  var GRIDS = {
    grid_avbd_g7_s402: { cap: 'Task G7, free alpha loop threaded between pegs (one loop closed by a self-crossing, both ends free). Hose S1, start seed 402, Newton AVBD executes. On this cell ours routes 8 of 16 starts, at most 5 for any other model.',
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
        '<span class="out ' + (o[0] === 1 ? 'win' : o[0] < 0 ? 'fail' : '') + '">' + txt + '</span></div>';
    }).join('') ;
  }
  tabs($('#grid-tabs'), 'data-grid', setGrid);
  setGrid('grid_avbd_g7_s402');
  // grid order note: top row ours / union / AVBD, bottom row PhysX / XPBD / FEM (matches the coloured strips)

  // ── pooled routing bars ──
  var R = [['R-HDLO (ours)', '#0072b2', 114, 105], ['4-sim union', '#56b4e9', 90, 86], ['AVBD only', '#e69f00', 90, 83],
           ['XPBD only', '#d55e00', 69, 67], ['PhysX only', '#8c6d31', 58, 57], ['FEM only', '#7f7f7f', 57, 48]];
  $('#routing-bars').innerHTML = R.map(function (r) {
    return '<div class="row"><span>' + r[0] + '</span><span class="track"><span class="full" style="width:' + (100 * r[2] / 130).toFixed(1) +
      '%;background:' + r[1] + '"></span><span class="robust" style="width:' + (100 * r[3] / 130).toFixed(1) + '%;background:' + r[1] +
      '"></span></span><span class="val"><b>' + r[2] + '</b> / 260 <span style="color:#888">(' + r[3] + ')</span></span></div>';
  }).join('') + '<p class="axis">successful starts out of 260 paired starts (19 task cells × 3 executors); in brackets, excluding peg pass-through</p>';

  // ── task gallery ──
  var NAMES = { G1: 'clamped return around four pegs', G2: 'clamped alternating weave', G3: 'open figure-eight with self-crossing',
                G4: 'clamped looped peg-winding', G5: 'clamped dense six-peg slalom', G7: 'free alpha loop between pegs', G8: 'clamped S-route on peg clusters' };
  var ENG = { avbd: 'AVBD', xpbd: 'XPBD', fem: 'FEM' };
  var TASKS = ['avbd_G1_V2S4_401', 'xpbd_G1_V3X1_401', 'fem_G1_V3F2_402', 'avbd_G2_S1_403', 'xpbd_G2_V3X1_401', 'fem_G2_V3F1_403',
               'avbd_G3_V2S4_402', 'avbd_G4_V2S3_401', 'fem_G4_V3F3_403', 'avbd_G5_V2S3_404', 'avbd_G7_S1_402', 'avbd_G8_V2S4_404'];
  var tg = $('#task-gallery');
  TASKS.forEach(function (t) {
    var p = t.split('_');
    var fig = document.createElement('figure');
    var box = document.createElement('div'); box.className = 'media-container';
    box.appendChild(video('assets/videos/gallery/' + t + '.mp4'));
    fig.appendChild(box);
    var cap = document.createElement('figcaption');
    cap.innerHTML = '<span class="tag-eng">' + p[1] + ' · ' + ENG[p[0]] + '</span> · ' + NAMES[p[1]] + (p[0] === 'fem' ? ' · hose interpolated' : '');
    fig.appendChild(cap);
    tg.appendChild(fig);
  });

  // ── real hose: before / after slider + twin render ──
  var REAL = [
    ['run_20260902_182443_t17', 10.59, 2.50, 7.08], ['run_20260902_182443_t12', 7.84, 2.36, 6.21], ['run_20260902_121711_t12', 9.44, 3.97, 7.99],
    ['run_20260902_192949_t05', 9.60, 4.71, 8.93], ['run_20260906_183517_t11', 8.99, 4.17, 7.46], ['run_20260906_183517_t26', 4.67, 2.93, 5.59]];
  var rt = $('#real-tabs');
  REAL.forEach(function (r, i) {
    var b = document.createElement('button');
    b.className = 'rv-task-btn' + (i === 0 ? ' active' : ''); b.setAttribute('data-real', i); b.textContent = 'Move ' + (i + 1);
    rt.appendChild(b);
  });
  function setReal(i) {
    var r = REAL[+i];
    $('#real-pre').src = 'assets/img/real/' + r[0] + '_pre.jpg';
    $('#real-post').src = 'assets/img/real/' + r[0] + '_post.jpg';
    var v = $('#real-video'); v.src = 'assets/videos/real/' + r[0] + '_twin.mp4'; var p = v.play(); if (p && p.catch) p.catch(function () {});
    $('#real-caption').innerHTML = 'The hose moved ' + r[1].toFixed(1) + ' cm (RMS over nodes). One-step forecast error: refined-z model ' +
      r[2].toFixed(2) + ' cm, linear action map ' + r[3].toFixed(2) + ' cm. Moves selected for margin; the averages are in the table.';
  }
  tabs(rt, 'data-real', setReal);
  setReal(0);
  var range = $('#real-range'), top = $('#real-top');
  function clip() { top.style.clipPath = 'inset(0 ' + (100 - range.value) + '% 0 0)'; }
  range.addEventListener('input', clip); clip();
})();
