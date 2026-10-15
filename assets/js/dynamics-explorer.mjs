// Dynamics explorer: held-out one-step hose predictions from seven learned models.
// Data: assets/data/dynamics.json (baked from the exported dynamics cases):
// the hose before the action, the simulated result (ground truth), each model's predicted result and its
// node RMSE, and the recorded hose + gripper targets during the move (in-betweens linearly interpolated).
import * as THREE from 'three';
import { Viewer, decode, nodesAt, count, loadJSON } from './common.mjs';

const host = document.getElementById('dyn-three-host');
if (host) init();

const SHORT = { all: 'R-HDLO (ours)', matched: '4-sim matched budget', union: '4-sim union', newton: 'AVBD only',
                isaac: 'PhysX only', xpbd: 'XPBD only', fem: 'FEM only' };
const ENG = { newton: 'Newton AVBD', isaac: 'Isaac PhysX', xpbd: 'Newton XPBD', fem: 'Genesis FEM' };

async function init() {
  const v = new Viewer(host);
  const D = await loadJSON('assets/data/dynamics.json');
  const color = Object.fromEntries(D.models.map(m => [m.id, m.color]));
  const sel = document.getElementById('dyn-case');
  const toggles = document.getElementById('dyn-models');
  const slider = document.getElementById('dyn-t');
  const play = document.getElementById('dyn-play');
  const bars = document.getElementById('dyn-bars');
  const info = document.getElementById('dyn-info');
  // case picker grouped by simulator
  for (const eng of ['newton', 'isaac', 'xpbd', 'fem']) {
    const g = document.createElement('optgroup'); g.label = ENG[eng];
    D.cases.filter(c => c.engine === eng).forEach(c => {
      const o = document.createElement('option'); o.value = c.id;
      const best = Object.entries(c.rmse).sort((a, b) => a[1] - b[1])[0][0];
      o.textContent = `world ${c.world}, action ${c.transition}` + (best === 'all' ? '  (ours lowest)' : '');
      g.appendChild(o);
    });
    sel.appendChild(g);
  }
  const on = { all: true };
  function buildToggles(c) {
    toggles.innerHTML = '';
    for (const m of D.models) {
      const b = document.createElement('button');
      b.className = 'dyn-chip' + (on[m.id] ? ' active' : '');
      b.innerHTML = `<i style="background:${m.color}"></i>${SHORT[m.id]}`;
      b.onclick = () => { on[m.id] = !on[m.id]; b.classList.toggle('active', on[m.id]); draw(); };
      toggles.appendChild(b);
    }
  }
  let C = null, timer = null;
  function setCase(id) {
    C = D.cases.find(c => c.id === id);
    for (const k of Object.keys(on)) delete on[k];
    on.all = true; on[C.in_domain] = true;
    C._pre = decode(C.pre); C._truth = decode(C.truth);
    C._pred = Object.fromEntries(Object.entries(C.predictions).map(([k, a]) => [k, decode(a)]));
    C._motion = decode(C.motion); C._tg = decode(C.motion_targets);
    slider.max = count(C._motion) - 1; slider.value = slider.max;
    const pegs = C.pegs.map(p => [p[0], p[1], p[2], p[3]]);
    v.setStage({ tableZ: C.table_z, pegs, focus: nodesAt(C._pre).concat(nodesAt(C._truth)) });
    buildToggles(C);
    // RMSE bars, lowest first
    const rows = Object.entries(C.rmse).sort((a, b) => a[1] - b[1]);
    const mx = Math.max(...rows.map(r => r[1]));
    bars.innerHTML = rows.map(([k, r]) => `<div class="dyn-bar"><span class="nm">${SHORT[k]}</span>` +
      `<span class="tr"><span style="width:${(100 * r / mx).toFixed(1)}%;background:${color[k]}"></span></span>` +
      `<span class="vl">${r.toFixed(2)} cm</span></div>`).join('');
    info.innerHTML = `${ENG[C.engine]} · held-out test world ${C.world} · action ${C.transition} · ` +
      `the hose moves ${C.motion_rms_cm.toFixed(1)} cm (RMS over nodes). In-domain specialist: <b>${SHORT[C.in_domain]}</b>.`;
    draw();
  }
  function draw() {
    if (!C) return;
    v.clear(v.dynamic);
    const R = C.radius;
    const n = count(C._motion), t = +slider.value;
    const atEnd = t >= n - 1;
    v.tube(nodesAt(C._pre), R * 0.55, 0x9aa0a8, { opacity: 0.35 });
    v.tube(nodesAt(C._motion, t), R, 0xf2f2ee);
    for (let h = 0; h < 2; h++) {
      const o = (t * 2 + h) * 3;
      const p = new THREE.Vector3(C._tg.data[o], C._tg.data[o + 1], C._tg.data[o + 2]);
      if (!atEnd) v.sphere(p, 0.009, 0x8fd3ff, 0.9);
    }
    for (const m of D.models) {
      if (!on[m.id]) continue;
      v.tube(nodesAt(C._pred[m.id]), R * 0.45, new THREE.Color(m.color), { opacity: atEnd ? 0.95 : 0.5 });
    }
  }
  sel.addEventListener('change', () => setCase(sel.value));
  slider.addEventListener('input', () => { stopPlay(); draw(); });
  function stopPlay() { if (timer) { clearInterval(timer); timer = null; play.innerHTML = '<i class="fas fa-play"></i>'; } }
  play.addEventListener('click', () => {
    if (timer) return stopPlay();
    if (+slider.value >= +slider.max) slider.value = 0;
    play.innerHTML = '<i class="fas fa-pause"></i>';
    timer = setInterval(() => {
      if (+slider.value >= +slider.max) return stopPlay();
      slider.value = +slider.value + 1; draw();
    }, 140);
  });
  const first = D.cases.find(c => c.id === 'newton_w26558_t12') || D.cases[0];
  sel.value = first.id;
  setCase(first.id);
}
