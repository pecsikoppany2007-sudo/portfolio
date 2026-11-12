// kettő v5 – one field of light dots that re-forms per section.
// States: VOID, WORD, P0..P7 (our works as LED screens), RINGS, SPHERE.
import * as THREE from 'three';

const VS = /* glsl */`
attribute vec4 aA, aB, cA, cB, aR;
uniform float uP, uT, uMS, uAsp, uScale, uFocus, uAp, uBurst, uDim, uMax, uDrift;
uniform vec2 uM, uSpin;
uniform vec4 uPiv;
uniform vec4 uTr[16];
uniform vec3 uHot;
varying vec4 vC; varying float vSoft;
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
void main(){
  float dl = aR.x * .45 + clamp(aB.x / 18. + .5, 0., 1.) * .35;
  float l = clamp((uP - dl * .725) / .42, 0., 1.);
  float e = l < .5 ? 4. * l * l * l : 1. - pow(-2. * l + 2., 3.) / 2.;
  vec3 p = mix(aA.xyz, aB.xyz, e);
  float b = sin(3.14159 * e);
  p.z += b * uBurst * (.35 + aR.y);
  p.xy += b * uBurst * .3 * (aR.zw - .5);
  vec2 pv = mix(uPiv.xy, uPiv.zw, e);
  p.xz = rot(mix(uSpin.x, uSpin.y, e) * uT) * (p.xz - pv) + pv;
  p += uDrift * vec3(sin(uT * .6 + aR.x * 31.), sin(uT * .5 + aR.y * 27.), sin(uT * .7 + aR.z * 23.));
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vec4 cp = projectionMatrix * mv;
  // the pointer and its fading trail: a small, sharp hole that tears the dots apart unevenly
  vec2 sp = cp.xy / cp.w, push = vec2(0.);
  float f = 0.;
  for (int i = 0; i < 16; i++) {
    vec4 t = uTr[i];
    if (t.z < .004) continue;
    vec2 d = (sp - t.xy) * vec2(uAsp, 1.);
    float q = dot(d, d), g = exp(-q * 320.) * t.z;
    f += g; push += d / (sqrt(q) + 2e-3) * g;
  }
  f = min(f, 1.6) * uMS; push *= uMS;
  float r1 = .5 + aR.y * aR.y * 3.6;
  vec2 tang = vec2(-push.y, push.x);
  mv.xy += (push * .07 * r1 + tang * (aR.w - .5) * .13) * (-mv.z);
  mv.z += f * (.8 + aR.z * aR.z * 7.5);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  float sz = mix(aA.w, aB.w, e) * uScale / max(depth, .1);
  float coc = abs(depth - uFocus) * uAp;
  float S = min(sz + coc, uMax);
  gl_PointSize = max(S, 1.);
  vec4 c = mix(cA, cB, e);
  c.rgb = mix(c.rgb, mix(uHot, vec3(1., .85, .6), aR.x * aR.x), clamp(f * 1.2, 0., 1.) * .95);
  c.a *= clamp(sz * sz / (S * S), .025, 1.) * min(S, 1.) * uDim * (1. + b * .5) * (1. + f * .7);
  c.a *= smoothstep(.8, 3., depth);
  vC = c; vSoft = clamp(coc / (S + .001) * 1.4, 0., 1.);
}`;
const FS = /* glsl */`
varying vec4 vC; varying float vSoft;
void main(){
  float r = length(gl_PointCoord - .5) * 2.;
  float a = 1. - smoothstep(mix(.5, .05, vSoft), 1., r);
  a *= 1. + vSoft * smoothstep(.45, .92, r) * .9;
  if (a * vC.a < .004) discard;
  gl_FragColor = vec4(vC.rgb, vC.a * a);
}`;

const LVS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const LFS = /* glsl */`
uniform sampler2D uMap; uniform vec2 uC; uniform float uR, uA, uK;
varying vec2 vUv;
void main(){
  float d = length((vUv - uC) * vec2(uK, 1.));
  float a = (1. - smoothstep(uR * .86, uR, d)) * uA;
  if (a < .003) discard;
  vec3 t = texture2D(uMap, vUv).rgb;
  float ring = smoothstep(uR * .9, uR * .965, d) * (1. - smoothstep(uR * .965, uR, d));
  gl_FragColor = vec4(mix(t, vec3(1., .96, .9), ring * .7), a);
}`;

const HOT = [1, 0.29, 0.11];
// the dots take the colour of the hour in Sopron: warm at night, cooler white by day
const WARM = (() => {
  let h = 12;
  try { h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Budapest', hour: '2-digit', hour12: false }).format(new Date()) % 24; } catch (e) {}
  const day = Math.max(0, Math.min(1, 1 - Math.abs(h - 13) / 6));
  const night = [1, .86, .7], noon = [.9, .94, 1];
  return night.map((v, i) => v + (noon[i] - v) * day);
})();
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

export function makeField(canvas, o) {
  const { phone } = o;
  const COLS = phone ? 128 : 192, ROWS = phone ? 80 : 120, N = COLS * ROWS;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x050507, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 200);
  camera.position.set(0, 0, 14);

  const R = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) R[i] = rnd();

  const geo = new THREE.BufferGeometry();
  const att = {};
  for (const k of ['aA', 'aB', 'cA', 'cB']) { att[k] = new THREE.BufferAttribute(new Float32Array(N * 4), 4); att[k].setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, att[k]); }
  geo.setAttribute('aR', new THREE.BufferAttribute(R, 4));
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  const U = () => ({
    uP: { value: 0 }, uT: { value: 0 }, uMS: { value: 0 }, uAsp: { value: 1 }, uScale: { value: 500 }, uFocus: { value: 14 },
    uAp: { value: 2.2 }, uBurst: { value: 0 }, uDim: { value: 1 }, uMax: { value: 46 }, uDrift: { value: .014 },
    uM: { value: new THREE.Vector2(9, 9) }, uTr: { value: Array.from({ length: 16 }, () => new THREE.Vector4(9, 9, 0, 0)) }, uPiv: { value: new THREE.Vector4() }, uSpin: { value: new THREE.Vector2(0, 0) }, uHot: { value: new THREE.Vector3(...HOT) }
  });
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: U(), transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);

  // permanent deep-space dust
  const DN = phone ? 900 : 2200;
  const dgeo = new THREE.BufferGeometry();
  const dA = new Float32Array(DN * 4), dC = new Float32Array(DN * 4), dR = new Float32Array(DN * 4);
  for (let i = 0; i < DN; i++) {
    const th = rnd() * Math.PI * 2, r = 9 + Math.pow(rnd(), .7) * 34;
    dA.set([Math.cos(th) * r, (rnd() - .5) * 34, -Math.abs(Math.sin(th) * r) - 4 + rnd() * 8, .05 + rnd() * .05], i * 4);
    const w = rnd() < .08;
    dC.set(w ? [1, .45, .25, .5] : [.82, .84, .9, .42], i * 4);
    for (let k = 0; k < 4; k++) dR[i * 4 + k] = rnd();
  }
  for (const [k, v] of [['aA', dA], ['aB', dA], ['cA', dC], ['cB', dC], ['aR', dR]]) dgeo.setAttribute(k, new THREE.BufferAttribute(v, 4));
  dgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DN * 3), 3));
  dgeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  const dmat = mat.clone(); dmat.uniforms = U(); dmat.uniforms.uSpin.value.set(.012, .012); dmat.uniforms.uDrift.value = .12;
  const dust = new THREE.Points(dgeo, dmat); dust.frustumCulled = false; scene.add(dust);

  /* ---------- warp: light streaks when you scroll fast ---------- */
  const WN = phone ? 260 : 700;
  const wpos = new Float32Array(WN * 6), wE = new Float32Array(WN * 2), wR = new Float32Array(WN * 2);
  for (let i = 0; i < WN; i++) {
    const th = rnd() * Math.PI * 2, r = 2.5 + Math.pow(rnd(), .6) * 22, z = -70 + rnd() * 80, q = rnd();
    for (let e = 0; e < 2; e++) { wpos.set([Math.cos(th) * r, Math.sin(th) * r * .7, z], (i * 2 + e) * 3); wE[i * 2 + e] = e; wR[i * 2 + e] = q; }
  }
  const wgeo = new THREE.BufferGeometry();
  wgeo.setAttribute('position', new THREE.BufferAttribute(wpos, 3));
  wgeo.setAttribute('aE', new THREE.BufferAttribute(wE, 1));
  wgeo.setAttribute('aQ', new THREE.BufferAttribute(wR, 1));
  wgeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  const wmat = new THREE.ShaderMaterial({
    vertexShader: `attribute float aE, aQ; uniform float uOff, uLen, uA; varying float vA;
      void main(){ vec3 p = position; p.z = mod(p.z + uOff * (.6 + aQ * .8) + 70., 80.) - 70.; p.z -= aE * uLen * (.5 + aQ);
        vA = uA * (.25 + aQ * .75) * (1. - aE * .85) * smoothstep(-70., -40., p.z) * (1. - smoothstep(4., 10., p.z));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
    fragmentShader: `uniform vec3 uC; varying float vA; void main(){ gl_FragColor = vec4(uC, vA); }`,
    uniforms: { uOff: { value: 0 }, uLen: { value: 0 }, uA: { value: 0 }, uC: { value: new THREE.Color(.95, .93, .9) } },
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const warp = new THREE.LineSegments(wgeo, wmat); warp.frustumCulled = false; warp.renderOrder = -1; scene.add(warp);
  let wv = 0;
  function setWarp(v, dt) {
    wv += (v - wv) * (1 - Math.exp(-dt / (Math.abs(v) > Math.abs(wv) ? .08 : .35)));
    const a = Math.min(1, Math.abs(wv));
    wmat.uniforms.uOff.value += wv * dt * 60;
    wmat.uniforms.uLen.value = a * 9 * Math.sign(wv || 1);
    wmat.uniforms.uA.value = a * a * .9;
    warp.visible = a > .02;
  }

  /* ---------- states ---------- */
  const S = {};
  const blank = () => ({ pos: new Float32Array(N * 4), col: new Float32Array(N * 4), spin: 0, yaw: 0, piv: [0, 0] });
  let wide = true;

  function fillDust(st, from) {
    for (let i = from; i < N; i++) {
      const th = rnd() * Math.PI * 2, ph = Math.acos(rnd() * 2 - 1), r = 7 + Math.pow(rnd(), .6) * 26;
      let z = Math.cos(ph) * r; if (z > 5) z = -z * .6;
      st.pos.set([Math.sin(ph) * Math.cos(th) * r, Math.sin(ph) * Math.sin(th) * r * .6, z, .045 + rnd() * .04], i * 4);
      st.col.set([.85, .86, .9, .28 + rnd() * .3], i * 4);
    }
  }
  function makeVoid() {
    const st = blank();
    for (let i = 0; i < N; i++) {
      st.pos.set([(rnd() - .5) * 90, (rnd() - .5) * 60, -30 - rnd() * 70, .06], i * 4);
      st.col.set([...WARM, .0], i * 4);
    }
    return st;
  }
  function sampleText(str, fontPx, step) {
    const c = document.createElement('canvas'); const x = c.getContext('2d');
    x.font = `700 ${fontPx}px Unbounded, sans-serif`;
    const w = Math.ceil(x.measureText(str).width) + 20, h = Math.ceil(fontPx * 1.5);
    c.width = w; c.height = h;
    x.font = `700 ${fontPx}px Unbounded, sans-serif`; x.textBaseline = 'middle'; x.fillStyle = '#fff';
    x.fillText(str, 10, h * .56);
    return { d: x.getImageData(0, 0, w, h).data, w, h };
  }
  function makeWord() {
    const st = blank();
    const fp = 260, step = phone ? 6.4 : 4.6;
    const A = sampleText('kettő', fp), B = sampleText('ketto', fp);
    const pts = [];
    let oTop = A.h;
    for (let y = 0; y < B.h && oTop === A.h; y++) for (let x = (B.w * .8) | 0; x < B.w; x++) if (B.d[(y * B.w + x) * 4 + 3] > 40) { oTop = y; break; }
    for (let y = 0; y < A.h; y += step) for (let x = 0; x < A.w; x += step) {
      const xi = x | 0, yi = y | 0, k = (yi * A.w + xi) * 4 + 3;
      if (A.d[k] > 128) { const acc = yi < oTop - 3 && xi > A.w * .7; pts.push([x, y, acc]); }
    }
    const W = wide ? 15 : 7.4, sc = W / A.w;
    const layers = phone ? 2 : 3;
    let i = 0;
    for (let L = 0; L < layers && i < N; L++) for (const [x, y, acc] of pts) {
      if (i >= N) break;
      const z = (L - (layers - 1) / 2) * .34 + (rnd() - .5) * .12;
      st.pos.set([(x - A.w / 2) * sc + (rnd() - .5) * .02, -(y - A.h * .52) * sc + (wide ? .55 : 3), z, (phone ? .085 : .068) * (.8 + rnd() * .45)], i * 4);
      const v = .75 + rnd() * .25;
      st.col.set(acc ? [...HOT, .95] : [WARM[0] * v, WARM[1] * v, WARM[2] * v, L === 1 || layers === 2 ? .95 : .55], i * 4);
      i++;
    }
    fillDust(st, i);
    return st;
  }
  // our works as curved LED screens
  const PW = () => wide ? 11.4 : 7, PH = () => PW() / 1.6, CR = 15;
  function panelXYZ(u, v, yaw) {
    const W = PW(), H = PH();
    const a = (u - .5) * W / CR;
    const x = Math.sin(a) * CR, z = (1 - Math.cos(a)) * CR; // concave: the edges come toward the viewer
    const y = (.5 - v) * H + (wide ? .1 : .6);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return [x * c + z * s, y, -x * s + z * c];
  }
  function makePanel(img, k) {
    const st = blank(); st.yaw = (k % 2 ? -1 : 1) * .1;
    const c = document.createElement('canvas'); c.width = COLS; c.height = ROWS;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, COLS, ROWS);
    const d = x.getImageData(0, 0, COLS, ROWS).data;
    const sz = PW() / COLS * 1.08;
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
      const i = r * COLS + q;
      const p = panelXYZ((q + .5) / COLS, (r + .5) / ROWS, st.yaw);
      st.pos.set([...p, sz], i * 4);
      const j = i * 4, g = 1 / 255;
      // lift the darkest pixels a touch so the screen reads as a lit surface
      st.col.set([.03 + Math.pow(d[j] * g, .8), .03 + Math.pow(d[j + 1] * g, .8), .035 + Math.pow(d[j + 2] * g, .8), .9], i * 4);
    }
    return st;
  }
  function makeRings() {
    const st = blank(); st.spin = .07;
    const cx = wide ? 3.9 : 0, cy = wide ? -.2 : 2.6, Rr = wide ? 2.6 : 2.1, tube = .16; st.piv = [cx, 0];
    for (let i = 0; i < N; i++) {
      const second = i % 2, t = rnd() * Math.PI * 2, ph = rnd() * Math.PI * 2, rr = tube * Math.sqrt(rnd());
      const rx = (Rr + rr * Math.cos(ph)) * Math.cos(t), ry = (Rr + rr * Math.cos(ph)) * Math.sin(t), rz = rr * Math.sin(ph);
      let p = second ? [rx + Rr * .5, rz, ry] : [rx - Rr * .5, ry, rz];
      // tilt the pair a little so both rings read in depth
      const tl = .42, c = Math.cos(tl), s = Math.sin(tl);
      p = [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
      st.pos.set([p[0] + cx, p[1] + cy, p[2], .05 + rnd() * .03], i * 4);
      st.col.set(second ? [...HOT, .34] : [...WARM, .38], i * 4);
    }
    return st;
  }
  function makeSphere() {
    const st = blank(); st.spin = .05;
    const Rr = wide ? 4.3 : 3, gap = .3, ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i + .5) / N * 2, r = Math.sqrt(1 - y * y), th = ga * i;
      const top = y > 0;
      st.pos.set([Math.cos(th) * r * Rr, y * Rr + (top ? gap : -gap) - (wide ? 5.6 : 6.2), Math.sin(th) * r * Rr, .05 + rnd() * .02], i * 4);
      const rim = Math.abs(y) < .045;
      st.col.set(rim ? [...HOT, .8] : [...WARM, .3], i * 4);
    }
    return st;
  }

  // line drawings sampled into dots: the four steps of our process, and the envelope for the contact
  function drawShape(name) {
    const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d');
    x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 26; x.lineCap = 'round'; x.lineJoin = 'round';
    const rr = (X, Y, W, H, r) => { x.beginPath(); x.roundRect(X, Y, W, H, r); x.stroke(); };
    x.save(); x.translate(200, 200);
    if (name === 'phone') { rr(-80, -150, 160, 300, 30); x.beginPath(); x.moveTo(-28, 112); x.lineTo(28, 112); x.stroke(); }
    else if (name === 'link') { x.rotate(-Math.PI / 4); rr(-150, -52, 170, 104, 52); rr(-20, -52, 170, 104, 52); }
    else if (name === 'pen') { x.rotate(-Math.PI / 4); x.beginPath(); x.moveTo(-150, -34); x.lineTo(100, -34); x.lineTo(160, 0); x.lineTo(100, 34); x.lineTo(-150, 34); x.closePath(); x.stroke(); x.beginPath(); x.moveTo(-100, -34); x.lineTo(-100, 34); x.stroke(); }
    else if (name === 'pin') { x.beginPath(); x.arc(0, -40, 110, Math.PI * .8, Math.PI * .2); x.lineTo(0, 160); x.closePath(); x.stroke(); x.beginPath(); x.arc(0, -40, 40, 0, Math.PI * 2); x.stroke(); }
    else if (name === 'env') { x.scale(1.25, 1); rr(-150, -100, 300, 200, 14); x.beginPath(); x.moveTo(-140, -90); x.lineTo(0, 20); x.lineTo(140, -90); x.stroke(); }
    x.restore();
    return x.getImageData(0, 0, 400, 400).data;
  }
  function makeShape(name, hotPart) {
    const st = blank(); st.spin = 0;
    const d = drawShape(name), step = phone ? 4.2 : 3.1, pts = [];
    for (let y = 0; y < 400; y += step) for (let x = 0; x < 400; x += step) if (d[((y | 0) * 400 + (x | 0)) * 4 + 3] > 128) pts.push([x, y]);
    const env = name === 'env';
    const sc = (env ? (wide ? 7.6 : 5.4) : (wide ? 5 : 3.6)) / 400;
    const cx = env ? 0 : wide ? 3.9 : 0, cy = env ? (wide ? -1.9 : -1.4) : wide ? -.1 : 2.6;
    let i = 0;
    for (let L = 0; L < 2 && i < N; L++) for (const [x, y] of pts) {
      if (i >= N) break;
      st.pos.set([cx + (x - 200) * sc, cy - (y - 200) * sc, (L - .5) * .3 + (rnd() - .5) * .1, .06 + rnd() * .03], i * 4);
      const hot = hotPart && hotPart(x, y);
      st.col.set(hot ? [...HOT, .9] : [...WARM, L ? .55 : .9], i * 4);
      i++;
    }
    fillDust(st, i);
    return st;
  }

  const order = ['VOID', 'WORD', 'P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'RINGS', 'I0', 'I1', 'I2', 'I3', 'SPHERE', 'ENV'];
  let imgs = [];
  function build() {
    wide = camera.aspect > 1;
    S.VOID = makeVoid(); S.WORD = makeWord(); S.RINGS = makeRings(); S.SPHERE = makeSphere();
    S.I0 = makeShape('phone', (x, y) => y > 290); S.I1 = makeShape('link', (x, y) => x > 205); S.I2 = makeShape('pen', (x, y) => x > 280 && y < 120); S.I3 = makeShape('pin', (x, y) => Math.hypot(x - 200, y - 160) < 60);
    S.ENV = makeShape('env', (x, y) => Math.abs(x - 200) < 172 && Math.abs(y - (110 + 110 * (1 - Math.abs(x - 200) / 175))) < 16);
    imgs.forEach((im, k) => { S['P' + k] = makePanel(im, k); });
    for (let k = imgs.length; k < 8; k++) S['P' + k] = S.WORD;
  }

  /* ---------- lens: the sharp page under the cursor ---------- */
  const lensGeo = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 48, 1); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) + .5, v = .5 - p.getY(i); const q = panelXYZ(u, v, 0); p.setXYZ(i, q[0], q[1], q[2] + .04); }
    return g;
  });
  const lensMat = new THREE.ShaderMaterial({ vertexShader: LVS, fragmentShader: LFS, transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uMap: { value: null }, uC: { value: new THREE.Vector2(.5, .5) }, uR: { value: .15 }, uA: { value: 0 }, uK: { value: 1.6 } } });
  let lens = null;
  const texs = [];
  function makeLens() {
    if (lens) { scene.remove(lens); lens.geometry.dispose(); }
    lens = new THREE.Mesh(lensGeo(), lensMat); lens.renderOrder = 2; lens.visible = !!o.lens; scene.add(lens);
  }

  /* ---------- pair handling ---------- */
  let curA = -1, curB = -1;
  function setPair(a, b) {
    if (a === curA && b === curB) return;
    const A = S[order[a]], B = S[order[b]];
    if (!A || !B) return;
    att.aA.array.set(A.pos); att.cA.array.set(A.col); att.aB.array.set(B.pos); att.cB.array.set(B.col);
    for (const k in att) att[k].needsUpdate = true;
    mat.uniforms.uSpin.value.set(A.spin, B.spin); mat.uniforms.uPiv.value.set(A.piv[0], A.piv[1], B.piv[0], B.piv[1]);
    curA = a; curB = b;
  }
  // freeze the current in-between look (same maths as the shader) and head for state b
  function snapshotTo(b) {
    const p = mat.uniforms.uP.value, burst = mat.uniforms.uBurst.value, T = mat.uniforms.uT.value;
    const sp = mat.uniforms.uSpin.value, pv = mat.uniforms.uPiv.value;
    const aA = att.aA.array, aB = att.aB.array, cA = att.cA.array, cB = att.cB.array;
    for (let i = 0; i < N; i++) {
      const j = i * 4;
      const dl = R[j] * .45 + Math.min(1, Math.max(0, aB[j] / 18 + .5)) * .35;
      const l = Math.min(1, Math.max(0, (p - dl * .725) / .42));
      const e = l < .5 ? 4 * l * l * l : 1 - Math.pow(-2 * l + 2, 3) / 2;
      const bb = Math.sin(Math.PI * e);
      let x = aA[j] + (aB[j] - aA[j]) * e + bb * burst * .3 * (R[j + 2] - .5);
      const y = aA[j + 1] + (aB[j + 1] - aA[j + 1]) * e + bb * burst * .3 * (R[j + 3] - .5);
      let z = aA[j + 2] + (aB[j + 2] - aA[j + 2]) * e + bb * burst * (.35 + R[j + 1]);
      const ang = (sp.x + (sp.y - sp.x) * e) * T, c = Math.cos(ang), s = Math.sin(ang);
      const px = pv.x + (pv.z - pv.x) * e, pz = pv.y + (pv.w - pv.y) * e; x -= px; z -= pz;
      const nx = c * x + s * z, nz = -s * x + c * z; x = nx + px; z = nz + pz;
      aA[j] = x; aA[j + 1] = y; aA[j + 2] = z; aA[j + 3] = aA[j + 3] + (aB[j + 3] - aA[j + 3]) * e;
      for (let k = 0; k < 4; k++) cA[j + k] = cA[j + k] + (cB[j + k] - cA[j + k]) * e;
    }
    const B = S[order[b]];
    aB.set(B.pos); cB.set(B.col);
    for (const k in att) att[k].needsUpdate = true;
    mat.uniforms.uSpin.value.set(0, B.spin); mat.uniforms.uPiv.value.set(0, 0, B.piv[0], B.piv[1]);
    mat.uniforms.uP.value = 0;
    curA = -2; curB = b;
  }

  function resize(w, h, dpr) {
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    const was = wide;
    camera.aspect = w / h;
    camera.fov = camera.aspect < .8 ? 52 : 40;
    camera.updateProjectionMatrix();
    const scale = h * dpr / (2 * Math.tan(camera.fov * Math.PI / 360));
    for (const m of [mat, dmat]) { m.uniforms.uAsp.value = camera.aspect; m.uniforms.uScale.value = scale; m.uniforms.uAp.value = 1.9 * dpr * h / 900; m.uniforms.uMax.value = 44 * dpr; }
    if (S.WORD && was !== (camera.aspect > 1)) { build(); makeLens(); const a = curA, b = curB; curA = curB = -9; setPair(Math.max(0, a), Math.max(0, b)); }
  }

  async function load(srcs) {
    imgs = await Promise.all(srcs.map(src => new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; })));
    imgs = imgs.filter(Boolean);
    if (o.lens) imgs.forEach(im => { const t = new THREE.Texture(im); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; t.needsUpdate = true; renderer.initTexture(t); texs.push(t); });
    build(); makeLens();
  }

  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  function pickLens(nx, ny) {
    if (!lens) return null;
    v2.set(nx, ny); ray.setFromCamera(v2, camera);
    const h = ray.intersectObject(lens, false)[0];
    return h ? h.uv : null;
  }
  function setLens(k, uv, a, grow = 0) {
    if (!lens) return;
    lensMat.uniforms.uA.value = a;
    if (a <= .001 || !texs[k]) { lens.visible = false; return; }
    lens.visible = true;
    lensMat.uniforms.uMap.value = texs[k];
    if (uv) lensMat.uniforms.uC.value.set(uv.x, uv.y);
    const yaw = S['P' + k].yaw; lens.rotation.y = yaw;
    lensMat.uniforms.uR.value = (wide ? .13 : .17) + grow * 1.6;
  }

  return {
    N, renderer, camera, scene, mat, dmat, order, load, setPair, snapshotTo, resize, pickLens, setLens, setWarp,
    idx: n => order.indexOf(n),
    render() { renderer.render(scene, camera); },
    get lens() { return lens; }
  };
}
