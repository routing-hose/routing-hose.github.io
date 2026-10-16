// Page behaviour: progress bar, navbar, lazy videos, tabs, chapters, routing bars, galleries, real-world cases.
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
  function playSafe(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (!v.src && v.dataset.src) { v.src = v.dataset.src; }
        playSafe(v);
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
  // chapter buttons under a video; segs = [{t0, label, plan}]
  function chapters(vid, host, segs) {
    host.innerHTML = '';
    segs.forEach(function (s) {
      var b = document.createElement('button');
      b.textContent = s.label;
      if (s.plan) b.className = 'plan';
      b.addEventListener('click', function () { vid.currentTime = s.t0 + 0.05; playSafe(vid); });
      host.appendChild(b); s._btn = b;
    });
    vid._segs = segs;
  }
  function trackChapters(vid) {
    vid.addEventListener('timeupdate', function () {
      var segs = vid._segs || [], t = vid.currentTime, cur = null;
      segs.forEach(function (s) { if (t >= s.t0) cur = s; });
      segs.forEach(function (s) { s._btn.classList.toggle('now', s === cur); });
    });
  }

  // ── dynamics clips by simulator ──
  var DYN = {
    newton: ['newton_w26558_t12', 'newton_w8770_t39', 'newton_w8621_t29', 'newton_w25007_t27', 'newton_w8354_t30', 'newton_w2042_t5',
             'newton_w17991_t11', 'newton_w19927_t13', 'newton_w25345_t23'],
    isaac: ['isaac_w1433_t8', 'isaac_w13176_t9', 'isaac_w17471_t15'],
    xpbd: ['xpbd_w4735_t13', 'xpbd_w168_t11', 'xpbd_w12540_t5', 'xpbd_w32204_t15'],
    fem: ['fem_w23629_t7', 'fem_w16351_t7', 'fem_w2789_t8']
  };
  function showDyn(eng) {
    var grid = $('#dyn-video-grid'); grid.innerHTML = '';
    DYN[eng].forEach(function (id) {
      var m = id.match(/_w(\d+)_t(\d+)$/);
      var fig = document.createElement('figure');
      var box = document.createElement('div'); box.className = 'media-container';
      box.appendChild(video('assets/videos/dynamics/' + id + '.mp4'));
      fig.appendChild(box);
      var cap = document.createElement('figcaption');
      cap.textContent = 'held-out world ' + m[1] + ', action ' + m[2];
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
  }
  tabs($('#dyn-video-tabs'), 'data-dyn-eng', showDyn);
  showDyn('newton');

  // ── node RMSE bars (Table I of the paper) ──
  var RMSE = [['R-HDLO (multi-physics)', '#0072b2', 7.477], ['AVBD only', '#e69f00', 8.273], ['PhysX only', '#8c6d31', 8.532],
              ['XPBD only', '#d55e00', 8.931], ['FEM only', '#7f7f7f', 8.942]];
  $('#rmse-bars').innerHTML = RMSE.map(function (r) {
    return '<div class="row"><span>' + r[0] + '</span><span class="track"><span class="robust" style="width:' + (100 * r[2] / 10).toFixed(1) +
      '%;background:' + r[1] + '"></span></span><span class="val"><b>' + r[2].toFixed(3) + '</b> cm</span></div>';
  }).join('') + '<p class="axis">mean node RMSE across the four held-out backends (lower is better)</p>';

  // ── MPPI episode videos + chapters ──
  var EP = {
    b1_xpbd_g1: 'Goal G1 (four-peg routing, hose clamped at one end), Newton XPBD executes. R-HDLO routes the hose in 21 actions. The probing moves for this run are shown in the Adaptation section above.',
    b1_fem_g4: 'Goal G4 (looped peg-winding), executed by an FEM simulator (Newton VBD tet). Six probing moves first, then MPPI; violet: loop proposals the planner protects in every iteration. R-HDLO routes in 15 actions. FEM hose motion is interpolated between recorded states.'
  };
  var epVid = $('#ep-video');
  function chapterLabel(s) {
    if (s.kind === 'probe') return s.label.replace(' result', '');
    if (s.kind === 'plan') return 'MPPI ' + s.label.replace('plan', 'step');
    return s.label;
  }
  function setEp(n) {
    epVid.src = 'assets/videos/mppi/' + n + '.mp4'; epVid.poster = 'assets/img/posters/' + n + '.jpg';
    $('#ep-caption').textContent = EP[n];
    fetch('assets/data/' + n + '.segments.json').then(function (r) { return r.json(); }).then(function (segs) {
      var probesShown = false;
      chapters(epVid, $('#ep-chapters'), segs.filter(function (s) {
        if (s.kind === 'probe') { if (probesShown || /result/.test(s.label)) return false; probesShown = true; s.label = 'probes'; return true; }
        return s.kind === 'plan' || s.kind === 'outro';
      }).map(function (s) { return { t0: s.t0, label: s.kind === 'outro' ? 'goal reached' : chapterLabel(s), plan: s.kind === 'plan' }; }));
    });
  }
  trackChapters(epVid);
  tabs($('#ep-tabs'), 'data-ep', setEp);
  setEp('b1_xpbd_g1');

  // ── same-start planner grids ──
  var METHODS = [['R-HDLO (ours)', '#0072b2'], ['4-sim union', '#56b4e9'], ['AVBD only', '#e69f00'], ['PhysX only', '#8c6d31'], ['XPBD only', '#d55e00'], ['FEM only', '#7f7f7f']];
  var GRIDS = {
    grid_xpbd_g1_s404: { cap: 'Goal G1, four-peg routing with one end clamped. Newton XPBD executes from one recorded start; the hose is re-simulated by XPBD in every panel. Top row: R-HDLO, a pooled-union ablation, AVBD only; bottom row: PhysX, XPBD, FEM only.',
      out: [[1, 21, 0.33], [0, 30, 1.28], [0, 30, 2.21], [0, 30, 1.18], [0, 30, 2.11], [0, 30, 1.85]] },
    grid_avbd_g4_s404: { cap: 'Goal G4, looped peg-winding (a full loop around one peg closed by a self-crossing). Newton AVBD executes from one recorded start.',
      out: [[1, 20, 0.28], [0, 30, 0.82], [0, 30, 5.41], [0, 30, 2.04], [0, 30, 4.67], [0, 30, 2.15]] },
    grid_fem_g4_s404: { cap: 'Goal G4 executed by an FEM simulator (Newton VBD tet). With the XPBD-only and FEM-only planners the simulator fails during action 4; their last valid state is held, dimmed. FEM hose motion is interpolated between recorded states.',
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
    }).join('');
  }
  tabs($('#grid-tabs'), 'data-grid', setGrid);
  setGrid('grid_xpbd_g1_s404');

  // ── routing success bars (Table II of the paper) ──
  var ROUTE = [['R-HDLO (ours)', '#0072b2', 81.3, 62.5], ['FEM learned', '#7f7f7f', 25.0, 50.0], ['Direct AVBD ref.', '#3a3f4a', 20.8, null],
               ['PhysX learned', '#8c6d31', 18.8, 50.0], ['XPBD learned', '#d55e00', 16.7, 0.0], ['AVBD learned', '#e69f00', 6.3, 25.0]];
  function bars(host, col, note) {
    $(host).innerHTML = ROUTE.filter(function (r) { return r[col] != null; }).map(function (r) {
      return '<div class="row"><span>' + r[0] + '</span><span class="track"><span class="robust" style="width:' + r[col].toFixed(1) +
        '%;background:' + r[1] + '"></span></span><span class="val"><b>' + r[col].toFixed(1) + '%</b></span></div>';
    }).join('') + '<p class="axis">' + note + '</p>';
  }
  bars('#routing-bars-sim', 2, 'success rate; the direct reference replans in 302.6 s per step vs about 1.07 s for learned MPPI');
  bars('#routing-bars-real', 3, 'success rate; 12 trials per learned model per goal');

  // ── task gallery (simulated goals G1-G4) ──
  var NAMES = { G1: 'four-peg routing', G2: 'alternating three-peg weave', G3: 'free figure-eight with over–under crossing', G4: 'looped peg-winding' };
  var ENG = { avbd: 'AVBD', xpbd: 'XPBD', fem: 'FEM' };
  var TASKS = ['avbd_G1_V2S4_401', 'xpbd_G1_V3X1_401', 'fem_G1_V3F2_402', 'avbd_G2_S1_403', 'xpbd_G2_V3X1_401', 'fem_G2_V3F1_403',
               'avbd_G3_V2S4_402', 'avbd_G4_V2S3_401', 'fem_G4_V3F3_403'];
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

  // ── real-world cases: rendered run + start/end slider ──
  var G5_CH = [{ t0: 3.5, label: 'probes' }, { t0: 34.6, label: 'fit z' },
    { t0: 37.1, label: 'move 1', plan: 1 }, { t0: 64.3, label: 'move 2', plan: 1 }, { t0: 91.5, label: 'move 3', plan: 1 },
    { t0: 118.2, label: 'move 4', plan: 1 }, { t0: 142.2, label: 'routed' }];
  var REAL = {
    g5: { video: 'assets/videos/real/g2_run.mp4', poster: 'assets/img/posters/g2_run.jpg', pre: 'g2_start', post: 'g2_c4_post', ch: G5_CH,
      cap: '<b>Hose 6, Goal 5.</b> A 0.83&nbsp;m corrugated hose, 70&nbsp;mm across, routed past three 45&nbsp;mm pegs, each on its required side. ' +
        'The pegs are shorter than the hose is thick, so moving the hose across a peg means lifting it over. Six probes fit <em>z</em> ' +
        '(mean forecast error 50.5&nbsp;mm for no motion, 32.4&nbsp;mm with the encoder <em>z</em>, 25.8&nbsp;mm after refinement), then four MPPI ' +
        'moves take the routing cost from 14.7 to 0. All three peg sides hold on the five settled observations after release.' },
    g5mind: { video: 'assets/videos/real/g2_mind.mp4', poster: 'assets/img/posters/g2_mind.jpg', pre: 'g2_start', post: 'g2_c4_post',
      ch: [{ t0: 3.5, label: 'probes' }, { t0: 34.6, label: 'z fit, probe by probe' }, { t0: 64.6, label: 'z fit result' },
           { t0: 68.1, label: 'move 1', plan: 1 }, { t0: 102.3, label: 'move 2', plan: 1 }, { t0: 136.5, label: 'move 3', plan: 1 },
           { t0: 170.2, label: 'move 4', plan: 1 }, { t0: 200.0, label: 'forecast vs outcome' }],
      cap: '<b>Hose 6, Goal 5: what the model predicted.</b> The same run, cut around the predictions. For each probe the commanded move ' +
        'is drawn first (blue), then the forecast on the encoder\'s <em>z</em> (red) and on the refined <em>z</em> (green), and only then does ' +
        'the hose move to where the camera found it; the grey line marks the no-motion baseline. During routing, each move\'s forecast ' +
        '(magenta) stays beside the hose the camera found: 29.4&nbsp;mm mean error against 63.5&nbsp;mm for no motion.' },
    ga: { video: 'assets/videos/real/ga_run.mp4', poster: 'assets/img/posters/ga_run.jpg', pre: 'ga_start', post: 'ga_final',
      ch: [{ t0: 3.5, label: 'probe' }, { t0: 11.3, label: 'move 1', plan: 1 }, { t0: 49.6, label: 'move 2', plan: 1 },
           { t0: 84.2, label: 'move 3', plan: 1 }, { t0: 121.0, label: 'move 4', plan: 1 }, { t0: 159.1, label: 'move 5', plan: 1 },
           { t0: 197.2, label: 'move 6', plan: 1 }, { t0: 231.9, label: 'routed' }],
      cap: '<b>Hose 5, three-peg route.</b> The 11&nbsp;mm hose leaves a fixture block and must pass three pegs on alternating sides, on a rearranged board. ' +
        'Six MPPI moves take the routing cost from 18.2 to 0: the middle peg is routed on move 4, and move 6 carries the free end past the right peg. ' +
        'All three peg sides hold in the observation after the grippers release. The one calibration probe attempted barely moved the hose and was ' +
        'discarded, so the run planned with the encoder&rsquo;s <em>z</em> alone. The fixture block is not drawn in the reconstruction. ' +
        'It is not one of the trials counted in the table.' },
    g1: { video: 'assets/videos/real/g1_run.mp4', poster: 'assets/img/posters/g1_run.jpg', pre: 'g1_start', post: 'g1_final',
      ch: [{ t0: 3.5, label: 'probes' }, { t0: 10.3, label: 'fit z' }, { t0: 12.8, label: 'move 1', plan: 1 }, { t0: 40.0, label: 'move 2', plan: 1 },
           { t0: 67.0, label: 'move 3', plan: 1 }, { t0: 93.9, label: 'move 4', plan: 1 }, { t0: 120.9, label: 'move 5', plan: 1 }],
      cap: '<b>Hose 5, Goal 1.</b> An 11&nbsp;mm hose held in a fixture block, routed around three pegs on the board. Two calibration probes ' +
        'ran (the fixture tether refused two more), then five MPPI moves lowered the routing cost from 10.9 to 2.0 before the operator stopped ' +
        'the attempt; not every peg was routed, so it is not one of the successful trials counted in the table. The fixture block is not ' +
        'drawn in the reconstruction (the run logged no geometry for it).' }
  };
  var realVid = $('#real-video');
  function setReal(k) {
    var r = REAL[k];
    realVid.poster = r.poster; realVid.src = r.video;
    $('#real-pre').src = 'assets/img/real/' + r.pre + '.jpg';
    $('#real-post').src = 'assets/img/real/' + r.post + '.jpg';
    $('#real-caption').innerHTML = r.cap;
    chapters(realVid, $('#real-chapters'), r.ch);
  }
  trackChapters(realVid);
  tabs($('#real-tabs'), 'data-real', setReal);
  setReal('g5');
  var range = $('#real-range'), top = $('#real-top');
  function clip() { top.style.clipPath = 'inset(0 ' + (100 - range.value) + '% 0 0)'; }
  range.addEventListener('input', clip); clip();
})();
