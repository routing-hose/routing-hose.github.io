// MPPI explorer: step through a recorded routing run and see what the planner considered.
// Data: assets/data/mppi_<episode>.json - an offline re-plan from the recorded
// states that reproduces the recorded selections. Per step: K lowest-cost valid candidates per iteration
// (forecast hose after the first action + gripper paths), the 3-row final check, and the executed result.
import * as THREE from 'three';
import { Viewer, decode, nodesAt, count, costColor, loadJSON } from './common.mjs';

const host = document.getElementById('mppi-three-host');
if (host) init();

const MAGENTA = 0xff3399, WHITE = 0xf2f2ee, GREY = 0x8a9099;
const LABEL = { weighted_mean: 'weighted mean', best_sample: 'best sample', no_motion: 'no motion' };
const ENGINE = { xpbd: 'Newton XPBD', fem: 'FEM (Newton VBD tet)', avbd: 'Newton AVBD' };

async function init() {
  const v = new Viewer(host);
  const ui = {
    tabs: [...document.querySelectorAll('[data-mppi-ep]')],
    step: document.getElementById('mppi-step'),
    stepLab: document.getElementById('mppi-step-label'),
    phases: [...document.querySelectorAll('[data-mppi-phase]')],
    prev: document.getElementById('mppi-prev'), next: document.getElementById('mppi-next'),
    play: document.getElementById('mppi-play'),
    paths: document.getElementById('mppi-show-paths'),
    info: document.getElementById('mppi-info'),
    legend: document.getElementById('mppi-legend'),
    planner: [...document.querySelectorAll('[data-mppi-planner]')],
    plannerRow: document.getElementById('mppi-planner-row'),
  };
  const cache = {};
  const S = { ep: 'xpbd_g1', planner: 'ours', step: 0, phase: 'iter0', timer: null };

  async function data(key) {
    if (!cache[key]) {
      const d = await loadJSON(`assets/data/mppi_${key}.json`);
      d._exec = decode(d.executed);
      for (const s of d.steps) {
        s._state = decode(s.state);
        for (const it of s.iters) { it._pred = decode(it.pred); it._paths = decode(it.paths); }
        s.final._pred = decode(s.final.pred); s.final._paths = decode(s.final.paths);
      }
      cache[key] = d;
    }
    return cache[key];
  }
  const cur = () => data(S.planner === 'specialist' ? S.ep + '_specialist' : S.ep);

  function gripperPath(dec, idx, color, opacity, dots) {
    for (let h = 0; h < 2; h++) {
      const pts = [];
      for (let w = 0; w < 4; w++) {
        const o = ((idx * 2 + h) * 4 + w) * 3;
        pts.push(new THREE.Vector3(dec.data[o], dec.data[o + 1], dec.data[o + 2] + 0.004));
      }
      v.line(pts, color, opacity);
      if (dots) { v.sphere(pts[0], 0.0045, color, opacity); v.sphere(pts[3], 0.003, color, opacity); }
    }
  }

  async function draw(reframe = false) {
    const d = await cur();
    const n = d.steps.length;
    S.step = Math.min(S.step, n - 1);
    ui.step.max = n - 1; ui.step.value = S.step;
    const s = d.steps[S.step];
    const state = nodesAt(s._state);
    v.setStage({ tableZ: d.table_z, pegs: d.pegs, landmarks: d.landmarks, focus: Array.from({ length: count(d._exec) }, (_, k) => nodesAt(d._exec, k)).flat().concat(
      d.pegs.map(p => new THREE.Vector3(p[0], p[1], d.table_z))), keepCamera: !reframe });
    v.clear(v.dynamic);
    const R = d.radius;
    const nIt = s.iters.length;
    ui.phases.forEach(b => {
      const ph = b.dataset.mppiPhase;
      const i = ph.startsWith('iter') ? +ph.slice(4) : -1;
      b.style.display = (i >= nIt) ? 'none' : '';
      b.classList.toggle('active', ph === S.phase);
    });
    if (S.phase.startsWith('iter') && +S.phase.slice(4) >= nIt) S.phase = 'iter' + (nIt - 1);
    let info = '', legend = '';
    if (S.phase.startsWith('iter')) {
      const it = s.iters[+S.phase.slice(4)];
      v.tube(state, R, WHITE);
      const k = count(it._pred);
      for (let i = k - 1; i >= 0; i--) {
        const col = costColor(k > 1 ? i / (k - 1) : 0);
        v.tube(nodesAt(it._pred, i), R * 0.45, col, { opacity: 0.55 });
        if (ui.paths.checked) gripperPath(it._paths, i, col, 0.5, i < 6);
      }
      info = `<b>Iteration ${+S.phase.slice(4) + 1} of ${nIt}</b> · ${it.n.toLocaleString()} sampled action sequences, ` +
        `${it.n_valid.toLocaleString()} pass the forecast checks · showing the ${k} lowest-cost forecasts ` +
        `(cost ${it.costs[0]?.toFixed(2)} to ${it.costs[k - 1]?.toFixed(2)})`;
      legend = `<span class="lg"><i style="background:#f2f2ee"></i>current hose</span>` +
        `<span class="lg"><i class="grad"></i>forecast after the first action, low → high MPPI cost</span>` +
        (ui.paths.checked ? `<span class="lg"><i style="background:#9aa"></i>gripper grasp point and 3 waypoints</span>` : '');
    } else if (S.phase === 'final') {
      v.tube(state, R, WHITE, { opacity: 0.9 });
      const f = s.final;
      const rows = [];
      for (let i = 0; i < f.labels.length; i++) {
        const chosen = i === f.chosen;
        const col = chosen ? MAGENTA : (f.labels[i] === 'no_motion' ? GREY : 0x56b4e9);
        v.tube(nodesAt(f._pred, i), R * (chosen ? 0.75 : 0.5), col, { opacity: chosen ? 0.9 : 0.6 });
        if (ui.paths.checked && f.labels[i] !== 'no_motion') gripperPath(f._paths, i, col, chosen ? 1 : 0.6, true);
        rows.push(`${chosen ? '<b>' : ''}${LABEL[f.labels[i]] || f.labels[i]}: ${f.costs[i]?.toFixed(2)}${chosen ? ' (chosen)</b>' : ''}`);
      }
      info = `<b>Final check</b> · the planner forecasts three candidates and executes the lowest-cost one: ${rows.join(' · ')}`;
      legend = `<span class="lg"><i style="background:#ff3399"></i>chosen plan (forecast)</span>` +
        `<span class="lg"><i style="background:#56b4e9"></i>other candidate</span><span class="lg"><i style="background:#8a9099"></i>no motion</span>`;
    } else {
      const f = s.final;
      v.tube(state, R * 0.6, WHITE, { opacity: 0.25 });
      v.tube(nodesAt(f._pred, f.chosen), R * 0.7, MAGENTA, { opacity: 0.75 });
      if (ui.paths.checked) gripperPath(f._paths, f.chosen, MAGENTA, 1, true);
      const next = S.step + 1 < count(d._exec) ? nodesAt(d._exec, S.step + 1) : null;
      if (next) v.tube(next, R, WHITE);
      const c = s.routing_cost_after;
      info = `<b>Executed</b> · the ${ENGINE[d.engine] || d.engine} simulator executes the chosen action. ` +
        `White: the hose it produced; magenta: what the model forecast.` + (c != null ? ` Routing cost after this action: ${c.toFixed(2)}.` : '');
      legend = `<span class="lg"><i style="background:#f2f2ee"></i>simulated result</span>` +
        `<span class="lg"><i style="background:#ff3399"></i>model forecast of the chosen action</span>` +
        `<span class="lg"><i style="background:#555"></i>hose before</span>`;
    }
    const last = S.step === n - 1;
    ui.stepLab.textContent = S.planner === 'specialist'
      ? `Step 1 (XPBD-only model plans the same start)`
      : `Step ${S.step + 1} of ${n}${last && d.outcome.success ? ' · goal reached after this action' : ''}`;
    ui.info.innerHTML = info;
    ui.legend.innerHTML = legend;
  }

  function setPhase(p) { S.phase = p; draw(); }
  ui.phases.forEach(b => b.addEventListener('click', () => { stop(); setPhase(b.dataset.mppiPhase); }));
  ui.step.addEventListener('input', () => { stop(); S.step = +ui.step.value; draw(); });
  ui.prev.addEventListener('click', () => { stop(); S.step = Math.max(0, S.step - 1); draw(); });
  ui.next.addEventListener('click', async () => { stop(); const d = await cur(); S.step = Math.min(d.steps.length - 1, S.step + 1); draw(); });
  ui.paths.addEventListener('change', () => draw());
  ui.tabs.forEach(b => b.addEventListener('click', () => {
    stop();
    ui.tabs.forEach(x => x.classList.toggle('active', x === b));
    S.ep = b.dataset.mppiEp; S.step = 0; S.phase = 'iter0'; S.planner = 'ours';
    ui.planner.forEach(x => x.classList.toggle('active', x.dataset.mppiPlanner === 'ours'));
    ui.plannerRow.style.display = S.ep === 'xpbd_g1' ? '' : 'none';
    draw(true);
  }));
  ui.planner.forEach(b => b.addEventListener('click', () => {
    stop();
    ui.planner.forEach(x => x.classList.toggle('active', x === b));
    S.planner = b.dataset.mppiPlanner; S.step = 0;
    draw();
  }));
  // play: iterations -> final check -> executed, then the next step
  function stop() { if (S.timer) { clearInterval(S.timer); S.timer = null; ui.play.innerHTML = '<i class="fas fa-play"></i>'; } }
  ui.play.addEventListener('click', async () => {
    if (S.timer) return stop();
    ui.play.innerHTML = '<i class="fas fa-pause"></i>';
    S.timer = setInterval(async () => {
      const d = await cur();
      const s = d.steps[S.step];
      const order = s.iters.map((_, i) => 'iter' + i).concat(['final', 'result']);
      const j = order.indexOf(S.phase);
      if (j < order.length - 1) S.phase = order[j + 1];
      else if (S.step < d.steps.length - 1) { S.step++; S.phase = 'iter0'; }
      else return stop();
      draw();
    }, 1100);
  });
  ui.plannerRow.style.display = '';
  draw(true);
}
