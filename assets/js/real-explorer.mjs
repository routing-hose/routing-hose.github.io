// Real-robot explorer: run_20260917_150620 (G2 board, 70 mm hose) stage by stage.
// Data: assets/data/real_g2.json, baked from the run's own record:
//   start / probe / cycle stages; hose = the tracker's 28 material points (x, y in the rig's world frame, metres);
//   probes carry the model's forecast on the encoder z and the fitted z; cycles carry the 40 lowest-cost
//   candidate forecasts of the last MPPI iteration, the forecast of the executed move, and the gripper path it drove.
const host = document.getElementById('rx-svg');
if (host) init();

const C = { hose: '#e3e6ea', hoseEdge: '#8d939c', ghost: '#8a909b', goal: '#41d39b', peg: '#f2c14e', hand: '#4cc9f0',
            fc: '#ff4fa8', enc: '#ef6b5b', fit: '#3fbf7f', grid: '#262a31' };
const STOPS = [[41, 199, 102], [249, 184, 38], [230, 56, 51]];
const ARM = { minus_y: 'right arm', plus_y: 'left arm' };
const PEG_ROLE = ['p0', 'p1', 'p2'];

function costColor(t) {
  t = Math.min(1, Math.max(0, t));
  const [a, b, u] = t < 0.5 ? [STOPS[0], STOPS[1], t * 2] : [STOPS[1], STOPS[2], t * 2 - 1];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',')})`;
}
const el = id => document.getElementById(id);
const fmt = (v, d = 1) => (+v).toFixed(d);

async function init() {
  const D = await (await fetch('assets/data/real_g2.json')).json();
  const S = { i: 0, timer: null, anim: null, shown: null };
  const stages = D.stages;
  const ui = { steps: el('rx-steps'), play: el('rx-play'), info: el('rx-info'), legend: el('rx-legend'),
               cand: el('rx-cand'), fc: el('rx-fc'), goal: el('rx-goal'),
               photo: el('rx-photo'), pre: el('rx-pre'), post: el('rx-post'), top: el('rx-top'), range: el('rx-range'),
               handle: el('rx-handle'), tagR: el('rx-tag-r') };

  // ── frame: u = -y (right of the photo), v = -x (top of the photo = away from the robot) ──
  const pts = [];
  stages.forEach(s => { pts.push(...s.state); if (s.pre) pts.push(...s.pre); });
  D.pegs.forEach(p => pts.push([p[0], p[1]]));
  const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]);
  const pad = 0.07;
  const u0 = -Math.max(...ys) - pad, u1 = -Math.min(...ys) + pad, v0 = -Math.max(...xs) - pad, v1 = -Math.min(...xs) + pad;
  const W = 900, sc = W / (u1 - u0), H = Math.round((v1 - v0) * sc);
  const P = p => [(-p[1] - u0) * sc, (-p[0] - v0) * sc];
  const path = arr => arr.map((p, i) => (i ? 'L' : 'M') + P(p).map(v => v.toFixed(1)).join(',')).join('');
  const hoseW = D.hose_diameter_m * sc;

  // static layer: 5 cm grid, scale bar, pegs
  let grid = '';
  const g0 = Math.ceil(u0 / 0.05) * 0.05;
  for (let u = g0; u < u1; u += 0.05) grid += `<line x1="${((u - u0) * sc).toFixed(1)}" x2="${((u - u0) * sc).toFixed(1)}" y1="0" y2="${H}"/>`;
  for (let v = Math.ceil(v0 / 0.05) * 0.05; v < v1; v += 0.05) grid += `<line y1="${((v - v0) * sc).toFixed(1)}" y2="${((v - v0) * sc).toFixed(1)}" x1="0" x2="${W}"/>`;
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="top-down view of the board">
    <defs><marker id="rx-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="${C.hand}"/></marker></defs>
    <g stroke="${C.grid}" stroke-width="1">${grid}</g>
    <g id="rx-goal-g"></g><g id="rx-ghost-g"></g><g id="rx-cand-g"></g><g id="rx-hose-g"></g><g id="rx-peg-g"></g>
    <g id="rx-fc-g"></g><g id="rx-hand-g"></g>
    <g transform="translate(${W - 24 - 0.1 * sc},${H - 22})"><line x1="0" x2="${0.1 * sc}" y1="0" y2="0" stroke="#9aa0a8" stroke-width="2"/>
      <text x="${0.05 * sc}" y="-7" text-anchor="middle" fill="#9aa0a8" font-size="13" font-family="Inter, sans-serif">10 cm</text></g>
  </svg>`;
  const G = id => host.querySelector('#' + id);
  G('rx-goal-g').innerHTML = `<path d="${path(D.goal)}" fill="none" stroke="${C.goal}" stroke-width="2.5" stroke-dasharray="9 7" opacity=".9"/>`;

  // hose = edge + body, drawn as two strokes so it reads as a 70 mm tube
  G('rx-hose-g').innerHTML = `<path id="rx-hose-edge" fill="none" stroke="${C.hoseEdge}" stroke-width="${hoseW.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
    <path id="rx-hose" fill="none" stroke="${C.hose}" stroke-width="${(hoseW - 5).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>
    <path id="rx-hose-c" fill="none" stroke="#b9bec6" stroke-width="1.2" stroke-dasharray="2 5" opacity=".9"/>`;

  function drawPegs(routed) {
    G('rx-peg-g').innerHTML = D.pegs.map((p, k) => {
      const [x, y] = P(p);
      const ok = routed && routed[k];
      const r = p[2] * sc;
      return `<circle cx="${x}" cy="${y}" r="${(r + 9).toFixed(1)}" fill="none" stroke="${ok ? C.fit : '#5b616b'}" stroke-width="${ok ? 3 : 1.5}" ${ok ? '' : 'stroke-dasharray="3 4"'}/>
        <circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${C.peg}" stroke="#1a1d23" stroke-width="1.5"/>
        <text x="${x}" y="${(y - r - 16).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="600" font-family="Inter, sans-serif" fill="${ok ? C.fit : '#aab0b9'}">${PEG_ROLE[k]}${ok ? ' ✓' : ''}</text>`;
    }).join('');
  }

  function setHose(nodes) {
    const d = path(nodes);
    ['rx-hose-edge', 'rx-hose', 'rx-hose-c'].forEach(id => host.querySelector('#' + id).setAttribute('d', d));
    S.shown = nodes;
  }
  function animateHose(from, to, ms = 750) {
    cancelAnimationFrame(S.anim);
    if (!from || matchMedia('(prefers-reduced-motion: reduce)').matches) return setHose(to);
    const t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setHose(to.map((p, i) => [from[i][0] + (p[0] - from[i][0]) * e, from[i][1] + (p[1] - from[i][1]) * e]));
      if (t < 1) S.anim = requestAnimationFrame(step);
    };
    S.anim = requestAnimationFrame(step);
  }

  function hands(s) {
    return Object.entries(s.hands || {}).map(([arm, pts]) => {
      const [x, y] = P(pts[0]);
      return `<path d="${path(pts)}" fill="none" stroke="${C.hand}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#rx-arrow)"/>
        <circle cx="${x}" cy="${y}" r="6" fill="#1a1d23" stroke="${C.hand}" stroke-width="3"/>`;
    }).join('');
  }

  // ── step buttons ──
  stages.forEach((s, i) => {
    if (i === 1 || (s.kind === 'cycle' && stages[i - 1].kind === 'probe')) {
      const sep = document.createElement('span'); sep.className = 'sep'; ui.steps.appendChild(sep);
    }
    const b = document.createElement('button');
    b.className = s.kind === 'probe' ? 'probe' : '';
    b.textContent = s.kind === 'probe' ? 'P' + s.label.split(' ')[1] : s.label;
    b.title = s.label;
    if (s.routed) b.innerHTML += `<span class="pip">${s.routed.map(r => `<i class="${r ? 'ok' : ''}"></i>`).join('')}</span>`;
    b.addEventListener('click', () => { stop(); go(i); });
    ui.steps.appendChild(b);
    s._btn = b;
  });

  // ── photo compare ──
  function clip() {
    ui.top.style.clipPath = `inset(0 ${100 - ui.range.value}% 0 0)`;
    ui.handle.style.left = ui.range.value + '%';
  }
  ui.range.addEventListener('input', clip);

  function routedAt(i) {
    for (let j = i; j >= 0; j--) if (stages[j].routed) return stages[j].routed;
    return [false, false, false];
  }

  function draw(i, animate) {
    const s = stages[i];
    stages.forEach((t, j) => t._btn.classList.toggle('active', j === i));
    drawPegs(routedAt(i));
    G('rx-goal-g').style.display = ui.goal.checked ? '' : 'none';
    if (s.pre) {
      G('rx-ghost-g').innerHTML = `<path d="${path(s.pre)}" fill="none" stroke="${C.ghost}" stroke-width="${hoseW.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity=".16"/>`;
    } else G('rx-ghost-g').innerHTML = '';
    // a move plays from its own pre-move observation; anything else morphs from what is on screen
    animateHose(animate ? (s.pre || S.shown) : null, s.state);

    let cand = '', fc = '', legend = [];
    legend.push(`<span><i style="background:${C.hose}"></i>hose from the camera</span>`);
    if (s.pre) legend.push(`<span><i style="background:${C.ghost};opacity:.5"></i>before the move</span>`);
    if (s.kind === 'cycle') {
      if (ui.cand.checked) {
        const n = s.candidates.length;
        for (let k = n - 1; k >= 0; k--) {
          cand += `<path d="${path(s.candidates[k])}" fill="none" stroke="${costColor(n > 1 ? k / (n - 1) : 0)}" stroke-width="2" opacity=".55" stroke-linejoin="round"/>`;
        }
        legend.push(`<span><i class="grad"></i>${n} lowest-cost candidate forecasts</span>`);
      }
      if (ui.fc.checked) {
        fc = `<path d="${path(s.forecast)}" fill="none" stroke="#1a1d23" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" opacity=".6"/>
              <path d="${path(s.forecast)}" fill="none" stroke="${C.fc}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`;
        legend.push(`<span><i style="background:${C.fc}"></i>forecast for the chosen move</span>`);
      }
    } else if (s.kind === 'probe' && ui.fc.checked) {
      fc = `<path d="${path(s.pred_encoder)}" fill="none" stroke="${C.enc}" stroke-width="3" stroke-dasharray="8 6" stroke-linejoin="round"/>
            <path d="${path(s.pred_fitted)}" fill="none" stroke="#1a1d23" stroke-width="7" stroke-linejoin="round" opacity=".6"/>
            <path d="${path(s.pred_fitted)}" fill="none" stroke="${C.fit}" stroke-width="3.5" stroke-linejoin="round"/>`;
      legend.push(`<span><i class="dashr"></i>forecast, encoder z</span>`, `<span><i style="background:${C.fit}"></i>forecast, fitted z</span>`);
    }
    if (s.hands && Object.keys(s.hands).length) legend.push(`<span><i style="background:${C.hand}"></i>gripper path (jaw closed)</span>`);
    if (ui.goal.checked) legend.push(`<span><i class="dash"></i>goal centreline</span>`);
    G('rx-cand-g').innerHTML = cand;
    G('rx-fc-g').innerHTML = fc;
    G('rx-hand-g').innerHTML = hands(s);
    G('rx-cand-g').style.opacity = 0;
    requestAnimationFrame(() => { G('rx-cand-g').style.transition = 'opacity .5s'; G('rx-cand-g').style.opacity = 1; });
    ui.legend.innerHTML = legend.join('');

    // photo
    ui.post.src = s.img;
    if (s.img_pre) { ui.photo.classList.remove('single'); ui.pre.src = s.img_pre; ui.tagR.textContent = 'after'; }
    else { ui.photo.classList.add('single'); ui.tagR.textContent = s.kind === 'start' ? 'start' : 'after the probe'; }
    clip();

    // info card
    const pegs = routedAt(i).map((r, k) => `<span class="peg ${r ? 'ok' : ''}"><i>${r ? '✓' : k}</i>${PEG_ROLE[k]} ${r ? 'routed' : 'not yet'}</span>`).join('');
    let h = '';
    if (s.kind === 'start') {
      h = `<h4>Start</h4><p class="what">The hose as the operator laid it. The goal is to pass p0, p1 and p2 on their required sides in
        order along the hose (dashed line: the goal centreline the side rule is drawn from). Routing cost <b>${fmt(s.cost, 2)}</b>.</p>`;
    } else if (s.kind === 'probe') {
      h = `<h4>${s.label} of 6 · calibration</h4><p class="what">A short bend move that is not aimed at the goal: it shows the model how
        this hose responds. All six fit <em>z</em> together.</p>
        <div class="kv"><span>no-motion error</span><span>${fmt(s.err.nomotion)} mm</span>
        <span>forecast, encoder z</span><span>${fmt(s.err.encoder)} mm</span>
        <span>forecast, fitted z</span><span><b>${fmt(s.err.fitted)} mm</b> (${fmt(s.err.loo)} mm left out of the fit)</span></div>`;
    } else {
      const arm = Object.keys(s.hands)[0];
      h = `<h4>${s.label} of 4 · goal carry, ${ARM[arm] || 'one arm'}</h4>
        <p class="what">MPPI drew ${s.n_samples.toLocaleString()} samples over ${s.n_iters} iterations (${s.n_valid.toLocaleString()} passed the
        robot and peg screens). It executed the importance-weighted mean of the best grasp pair's samples, re-checked against holding still. The hand lifts the hose over the pegs and sets it down.</p>
        <div class="kv"><span>routing cost</span><span><b>${fmt(s.cost_before, 2)} → ${fmt(s.cost, 2)}</b> (forecast ${fmt(s.predicted_cost, 2)})</span>
        <span>forecast error</span><span><b>${fmt(s.pred_mm)} mm</b> vs ${fmt(s.nomotion_mm)} mm for no motion</span>
        <span>hand travel</span><span>${fmt(s.travel_mm, 0)} mm</span>
        <span>planning time</span><span>${fmt(s.plan_s)} s</span></div>`;
    }
    ui.info.innerHTML = h + `<div class="pegs">${pegs}</div>`;
    drawCharts();
  }

  function go(i) { S.i = i; draw(i, true); }
  function stop() { if (S.timer) { clearInterval(S.timer); S.timer = null; ui.play.innerHTML = '<i class="fas fa-play"></i>'; } }
  ui.play.addEventListener('click', () => {
    if (S.timer) return stop();
    if (S.i >= stages.length - 1) go(0);
    ui.play.innerHTML = '<i class="fas fa-pause"></i>';
    S.timer = setInterval(() => { if (S.i >= stages.length - 1) return stop(); go(S.i + 1); }, 2800);
  });
  [ui.cand, ui.fc, ui.goal].forEach(c => c.addEventListener('change', () => draw(S.i, false)));

  // ── charts ──
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function drawCharts() { costChart(); errChart(); }

  function costChart() {
    const h = el('rx-cost'), W = Math.max(280, h.clientWidth), H = 210, L = 34, R = 12, T = 14, B = 26;
    const pts = stages.map((s, i) => [s, i]).filter(([s]) => s.kind !== 'probe');
    const n = pts.length, X = k => L + (W - L - R) * k / (n - 1), Y = v => T + (H - T - B) * (1 - v / 15);
    const acc = css('--accent'), line = css('--line'), sur = css('--surface');
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g class="axis">`;
    [0, 5, 10, 15].forEach(v => { s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`; });
    pts.forEach(([st], k) => { s += `<text x="${X(k)}" y="${H - 6}" text-anchor="middle">${st.kind === 'start' ? 'start' : 'move ' + st.cycle}</text>`; });
    s += '</g>';
    const cur = pts.findIndex(([, i]) => i === S.i);
    if (cur >= 0) s += `<line x1="${X(cur)}" x2="${X(cur)}" y1="${T - 6}" y2="${H - B}" stroke="${acc}" stroke-width="1" opacity=".5"/>`;
    s += `<path d="${pts.map(([st], k) => (k ? 'L' : 'M') + X(k) + ',' + Y(st.cost)).join('')}" fill="none" stroke="${acc}" stroke-width="2"/>`;
    pts.forEach(([st, i], k) => {
      if (st.kind === 'cycle') {
        s += `<line x1="${X(k - 1)}" y1="${Y(st.cost_before)}" x2="${X(k)}" y2="${Y(st.predicted_cost)}" stroke="${acc}" stroke-width="1" stroke-dasharray="2 3" opacity=".6"/>`;
        s += `<circle cx="${X(k)}" cy="${Y(st.predicted_cost)}" r="4.5" fill="${sur}" stroke="${acc}" stroke-width="1.5"/>`;
      }
      s += `<circle cx="${X(k)}" cy="${Y(st.cost)}" r="${i === S.i ? 6 : 4.5}" fill="${acc}" stroke="${sur}" stroke-width="2"/>`;
    });
    s += `<text x="${X(n - 1) + 2}" y="${Y(3.4)}" text-anchor="end" class="lab">routed ✓</text>`;
    s += `<text x="${X(0) + 8}" y="${Y(pts[0][0].cost) + 4}" class="lab">${fmt(pts[0][0].cost, 1)}</text>`;
    pts.forEach(([st, i], k) => {
      const tip = st.kind === 'start' ? `<b>Start</b><br>cost ${fmt(st.cost, 2)}`
        : `<b>Move ${st.cycle}</b><br>measured ${fmt(st.cost_before, 2)} → <b>${fmt(st.cost, 2)}</b><br>forecast ${fmt(st.predicted_cost, 2)}<br>${st.routed.filter(Boolean).length} of 3 pegs routed`;
      s += `<rect class="hit" x="${X(k) - (W - L - R) / (2 * (n - 1))}" y="0" width="${(W - L - R) / (n - 1)}" height="${H}" data-tip="${tip.replace(/"/g, '&quot;')}" data-i="${i}"/>`;
    });
    h.innerHTML = s + '</svg>';
    wire(h);
  }

  function errChart() {
    const h = el('rx-err'), W = Math.max(280, h.clientWidth), H = 210, L = 34, R = 8, T = 14, B = 26;
    const rows = stages.map((s, i) => [s, i]).filter(([s]) => s.kind !== 'start');
    const n = rows.length, band = (W - L - R) / n, X = k => L + band * (k + 0.5), Y = v => T + (H - T - B) * (1 - v / 100);
    const acc = css('--accent'), mut = css('--muted'), sur = css('--surface');
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g class="axis">`;
    [0, 25, 50, 75, 100].forEach(v => { s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`; });
    rows.forEach(([st], k) => { s += `<text x="${X(k)}" y="${H - 6}" text-anchor="middle">${st.kind === 'probe' ? 'P' + st.label.split(' ')[1] : 'M' + st.cycle}</text>`; });
    s += `</g><line x1="${L + band * 6}" x2="${L + band * 6}" y1="${T - 6}" y2="${H - B + 4}" stroke="${css('--line')}"/>`;
    s += `<text x="${L + band * 3}" y="${T - 2}" text-anchor="middle" class="muted" font-size="10">calibration probes</text>`;
    s += `<text x="${L + band * 8}" y="${T - 2}" text-anchor="middle" class="muted" font-size="10">routing moves</text>`;
    rows.forEach(([st, i], k) => {
      const a = st.kind === 'probe' ? st.err.fitted : st.pred_mm, b = st.kind === 'probe' ? st.err.nomotion : st.nomotion_mm;
      const on = i === S.i;
      if (on) s += `<rect x="${X(k) - band / 2 + 2}" y="${T}" width="${band - 4}" height="${H - T - B}" rx="6" fill="${acc}" opacity=".08"/>`;
      s += `<line x1="${X(k)}" x2="${X(k)}" y1="${Y(a)}" y2="${Y(b)}" stroke="${mut}" stroke-width="2" opacity=".5"/>`;
      s += `<circle cx="${X(k)}" cy="${Y(b)}" r="5" fill="${mut}" stroke="${sur}" stroke-width="2"/>`;
      s += `<circle cx="${X(k)}" cy="${Y(a)}" r="${on ? 6.5 : 5}" fill="${acc}" stroke="${sur}" stroke-width="2"/>`;
      const tip = `<b>${st.label}</b><br>model <b>${fmt(a)} mm</b> · no motion ${fmt(b)} mm` + (st.kind === 'probe' ? `<br>encoder z ${fmt(st.err.encoder)} mm` : '');
      s += `<rect class="hit" x="${X(k) - band / 2}" y="0" width="${band}" height="${H}" data-tip="${tip.replace(/"/g, '&quot;')}" data-i="${i}"/>`;
    });
    h.innerHTML = s + '</svg>';
    wire(h);
  }

  function wire(h) {
    if (window.RHDLO) window.RHDLO.wireTips(h);
    h.querySelectorAll('[data-i]').forEach(r => r.addEventListener('click', () => { stop(); go(+r.dataset.i); }));
  }
  let lw = innerWidth;
  addEventListener('resize', () => { if (Math.abs(innerWidth - lw) > 30) { lw = innerWidth; drawCharts(); } });
  addEventListener('themechange', drawCharts);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawCharts);

  setHose(stages[0].state);
  draw(0, false);
  // start the walkthrough once when it scrolls into view
  let started = false;
  new IntersectionObserver(es => {
    if (es[0].isIntersecting && !started && !matchMedia('(prefers-reduced-motion: reduce)').matches) { started = true; ui.play.click(); }
    if (!es[0].isIntersecting) stop();
  }, { threshold: 0.6 }).observe(host);
}
