// Shared helpers for the two interactive viewers (MPPI explorer, dynamics explorer).
// World frame of the data: metres, z up, table top at table_z. Arrays are int16 in 0.1 mm (bake_demo_data.py).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function decode(arr) {
  const bin = atob(arr.b64);
  const buf = new ArrayBuffer(bin.length);
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const i16 = new Int16Array(buf);
  const out = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) out[i] = i16[i] * 1e-4;
  return { data: out, shape: arr.shape };
}

// (..., N, 3) flat array -> list of THREE.Vector3 for item `idx` (leading dims flattened)
export function nodesAt(dec, idx = 0) {
  const n = dec.shape[dec.shape.length - 2];
  const off = idx * n * 3;
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(new THREE.Vector3(dec.data[off + 3 * i], dec.data[off + 3 * i + 1], dec.data[off + 3 * i + 2]));
  return pts;
}

export function count(dec) {
  const s = dec.shape;
  return s.length <= 2 ? 1 : s.slice(0, s.length - 2).reduce((a, b) => a * b, 1);
}

export const COST_STOPS = [[0.16, 0.78, 0.40], [0.98, 0.72, 0.15], [0.90, 0.22, 0.20]];
export function costColor(t) {          // 0 = lowest cost (green) -> amber -> red
  t = Math.min(1, Math.max(0, t));
  const [a, b, u] = t < 0.5 ? [COST_STOPS[0], COST_STOPS[1], t * 2] : [COST_STOPS[1], COST_STOPS[2], t * 2 - 1];
  return new THREE.Color(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u);
}

export class Viewer {
  constructor(host, { background = 0x14161b } = {}) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(background, 1);
    host.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
    this.camera.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x30343c, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(0.6, -0.8, 2.0);
    this.scene.add(sun);
    this.dynamic = new THREE.Group();
    this.scene.add(this.dynamic);
    this.static = new THREE.Group();
    this.scene.add(this.static);
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    const loop = () => { this.controls.update(); this.renderer.render(this.scene, this.camera); requestAnimationFrame(loop); };
    loop();
  }
  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight || Math.round(w * 9 / 16);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  clear(group) {
    for (const o of [...group.children]) {
      group.remove(o);
      o.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
    }
  }
  // table, pegs, goal rings; frames the camera on `focus` (array of Vector3) the first time
  setStage({ tableZ, pegs, landmarks = [], focus, keepCamera = false }) {
    this.clear(this.static);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    focus.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
    const c = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, tableZ);
    const dx = x1 - x0, dy = y1 - y0;
    const table = new THREE.Mesh(new THREE.PlaneGeometry(4, 4),
      new THREE.MeshStandardMaterial({ color: 0x24272e, roughness: 0.85, metalness: 0.0 }));
    table.position.set(c.x, c.y, tableZ - 0.0005);
    this.static.add(table);
    const grid = new THREE.GridHelper(2.0, 40, 0x3a3f49, 0x2e323a);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(c.x, c.y, tableZ);
    this.static.add(grid);
    const pegMat = new THREE.MeshStandardMaterial({ color: 0xf0b77a, roughness: 0.55 });
    for (const [x, y, pr, ph] of pegs) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, ph, 28), pegMat);
      m.rotation.x = Math.PI / 2;
      m.position.set(x, y, tableZ + ph / 2);
      this.static.add(m);
    }
    for (const l of landmarks) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0016, 10, 32),
        new THREE.MeshBasicMaterial({ color: 0x41d39b }));
      ring.position.set(l.point[0], l.point[1], tableZ + 0.002);
      this.static.add(ring);
    }
    if (!keepCamera || !this._framed) {
      const aspect = this.camera.aspect || 16 / 9;
      const d = Math.max(0.18, 1.2 * dy, 1.25 * dx / (0.8 * aspect));
      this.camera.position.set(c.x, c.y - 0.7 * d, tableZ + 0.95 * d);
      this.controls.target.set(c.x, c.y, tableZ);
      this._framed = true;
    }
  }
  tube(points, radius, color, { opacity = 1, emissive = 0x000000 } = {}) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const geo = new THREE.TubeGeometry(curve, Math.max(24, points.length * 4), radius, 10, false);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, transparent: opacity < 1, opacity,
                                                 depthWrite: opacity >= 1, emissive });
    const m = new THREE.Mesh(geo, mat);
    this.dynamic.add(m);
    return m;
  }
  line(points, color, opacity = 1) {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    const m = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
    this.dynamic.add(m);
    return m;
  }
  sphere(p, radius, color, opacity = 1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12),
      new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.4 }));
    m.position.copy(p);
    this.dynamic.add(m);
    return m;
  }
}

export async function loadJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ': ' + r.status);
  return r.json();
}
