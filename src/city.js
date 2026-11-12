// kettő v8 – the town at night, seen from above. Two walls of towers with a street between them.
// The view sinks into the street and rolls, the walls turn into each other, windows come on,
// and one lit window at the bottom opens into the last section of the page.
// Built from boxes in code (no model): faces are dark, windows are dots of light like everything else here.
import * as THREE from 'three';

const G = -90; // street level
const COMMON = /* glsl */`
uniform vec2 uRes, uPc, uPs; uniform float uAsp, uPr, uPon;
float portal(){
  vec2 s = gl_FragCoord.xy / uRes * 2. - 1.; s.x *= uAsp; s -= uPc;
  float c = cos(uPr), n = sin(uPr);
  vec2 p = vec2(c * s.x + n * s.y, -n * s.x + c * s.y);
  vec2 d = abs(p) - uPs;
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.);
}
vec3 rim(vec3 col, float sd){
  col = mix(col, vec3(1., .78, .56), exp(-sd * 60.) * uPon);
  return col + vec3(1., .29, .11) * exp(-sd * 7.) * .55 * uPon;
}`;
const TVS = /* glsl */`
attribute float aSeed;
varying vec3 vL, vN, vSc; varying float vSeed, vWz, vD;
void main(){
  vSc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vL = position * vSc; vN = normal; vSeed = aSeed;
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.);
  vWz = w.z;
  vec4 mv = viewMatrix * w; vD = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const TFS = /* glsl */`
${COMMON}
uniform float uLit, uNight, uT;
uniform vec3 uHot, uWarm;
varying vec3 vL, vN, vSc; varying float vSeed, vWz, vD;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  float sd = portal(); if (sd < 0.) discard;
  vec3 n = abs(vN);
  float low = exp(-(vWz - (${G}.)) * .1);          // light coming up from the street
  vec3 col;
  if (n.z > .5) {
    float e = min(vSc.x * .5 - abs(vL.x), vSc.y * .5 - abs(vL.y));
    col = vec3(.052, .054, .066) + vec3(.035) * (1. - smoothstep(.1, .24, e));
    col *= .82 + .3 * h(vec2(vSeed, 1.7));
  } else {
    float u = n.x > .5 ? vL.y : vL.x;
    vec2 c = vec2(u / .62 + vSeed * 3.7, vL.z / .95 + vSeed * 9.1);
    vec2 id = floor(c), f = fract(c) - .5;
    float fw = max(fwidth(c.x), fwidth(c.y));
    float lod = clamp(1. - fw * 1.3, 0., 1.);
    float dotm = 1. - smoothstep(.17, .17 + max(fw, .05), length(f * vec2(1., 1.15)));
    float r = h(id + vSeed * 17.);
    float lit = step(r, uLit) * step(.12, h(id * 1.7 + vSeed));
    lit *= .75 + .25 * sin(uT * (1. + r * 3.) + r * 40.) * step(.9, h(id + 3.3));
    vec3 wc = mix(uWarm * (.55 + .45 * h(id * 3.1)), uHot, step(.93, h(id * 2.3 + vSeed * 5.)));
    float shade = n.x > .5 ? .8 : 1.1;
    col = vec3(.03, .032, .042) * shade;
    col += vec3(.016) * smoothstep(.4, .5, abs(f.y)) * lod;               // floor slabs
    col += vec3(.03, .034, .045) * dotm * lod * (1. - lit);                // dark glass
    col += wc * lit * mix(.07, dotm * 1.1, lod);
    col += uHot * low * .32 * (.3 + uNight);
  }
  col *= 1. + (1. - uNight) * .8;                                        // dusk is a little lighter
  float fog = 1. - exp(-vD * mix(.02, .014, uNight));
  vec3 fc = mix(vec3(.085, .1, .14), vec3(.016, .015, .022), uNight) + uHot * low * .05;
  col = mix(col, fc, fog);
  gl_FragColor = vec4(rim(col, sd), 1.);
}`;
const GVS = /* glsl */`varying vec2 vP; varying float vD; void main(){ vP = position.xy; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`;
const GFS = /* glsl */`
${COMMON}
uniform float uNight, uT, uGap;
uniform vec3 uHot, uWarm;
varying vec2 vP; varying float vD;
float h(float n){ return fract(sin(n * 127.1) * 43758.5453); }
void main(){
  float sd = portal(); if (sd < 0.) discard;
  float ax = abs(vP.x);
  vec3 col = vec3(.02, .018, .022) + uHot * exp(-ax * .3) * (.3 + uNight * .2);
  // light moving along the street
  float lane = floor(vP.x / .42), r = h(lane);
  float run = fract(vP.y * .035 + uT * (r - .5) * .22 + r * 9.);
  float dash = smoothstep(.9, 1., run) * smoothstep(.5, .2, abs(fract(vP.x / .42) - .5)) * step(ax, uGap);
  col += mix(uWarm, uHot, step(.7, r)) * dash * (.5 + uNight);
  col += vec3(1., .5, .26) * exp(-dot(vP, vP) * .012) * (.4 + uNight * 1.1);   // the one window
  col = mix(col, mix(vec3(.085, .1, .14), vec3(.016, .015, .022), uNight), 1. - exp(-vD * mix(.02, .014, uNight)));
  gl_FragColor = vec4(rim(col, sd), 1.);
}`;

const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eio = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;

export function makeCity(renderer, warm) {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(62, 1, .5, 400);
  const rnd = (() => { let s = 91; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const PU = { uRes: { value: new THREE.Vector2(1, 1) }, uPc: { value: new THREE.Vector2() }, uPs: { value: new THREE.Vector2() }, uAsp: { value: 1 }, uPr: { value: 0 }, uPon: { value: 0 } };
  const U = { ...PU, uLit: { value: 0 }, uNight: { value: 0 }, uT: { value: 0 }, uHot: { value: new THREE.Vector3(1, .29, .11) }, uWarm: { value: new THREE.Vector3(...warm) }, uGap: { value: 4.6 } };
  const tmat = new THREE.ShaderMaterial({ vertexShader: TVS, fragmentShader: TFS, uniforms: U });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const GAP = 5.2;

  function wall(side) {
    const items = [];
    let x = GAP;
    for (let c = 0; c < 8; c++) {
      const w = 4.2 + rnd() * 3.4;
      let y = -84 + rnd() * 3;
      while (y < 84) {
        const d = 4 + rnd() * 6.5;
        // towers by the street are the tallest; the town steps down behind them
        const ht = (c === 0 ? 62 + rnd() * 34 : c === 1 ? 48 + rnd() * 40 : 26 + rnd() * 46) * (rnd() < .12 ? .55 : 1);
        const inset = c === 0 ? rnd() * rnd() * 5 : 0;
        const cx = side * (x + inset + w / 2), cy = y + d / 2, seed = rnd();
        items.push([cx, cy, G + ht / 2, w - .5, d - .45, ht, seed]);
        // something on the roof
        if (rnd() < .7) { const rw = 1 + rnd() * 1.8, rd = 1 + rnd() * 2, rh = .8 + rnd() * 2.6; items.push([cx + (rnd() - .5) * (w - rw - 1), cy + (rnd() - .5) * (d - rd - 1), G + ht + rh / 2, rw, rd, rh, seed]); }
        // balconies and boxes hanging over the street
        if (c === 0) for (let b = 0, nb = 2 + (rnd() * 5 | 0); b < nb; b++) {
          const bw = .5 + rnd() * .9, bd = 1 + rnd() * 2.4, bh = .2 + rnd() * rnd() * 1.6;
          items.push([side * (x + inset - bw / 2 + .05), cy + (rnd() - .5) * (d - bd - .6), G + ht * (.25 + rnd() * .72), bw, bd, bh, seed]);
        }
        y += d + (rnd() < .3 ? 1.2 + rnd() * 3 : 0);
      }
      x += w;
    }
    const mesh = new THREE.InstancedMesh(box, tmat, items.length);
    const m = new THREE.Matrix4(), seeds = new Float32Array(items.length);
    items.forEach((t, i) => { m.makeScale(t[3], t[4], t[5]).setPosition(t[0], t[1], t[2]); mesh.setMatrixAt(i, m); seeds[i] = t[6]; });
    mesh.geometry = box.clone(); mesh.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    mesh.frustumCulled = false;
    const grp = new THREE.Group(); grp.add(mesh); scene.add(grp);
    return grp;
  }
  const left = wall(-1), right = wall(1);
  const gmat = new THREE.ShaderMaterial({ vertexShader: GVS, fragmentShader: GFS, uniforms: U });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), gmat); ground.position.z = G; scene.add(ground);

  const st = { open: 0, quad: null };
  let asp = 1;
  return {
    scene, cam, st,
    resize(w, h, dpr) { asp = w / h; cam.aspect = asp; cam.fov = 62; cam.updateProjectionMatrix(); PU.uRes.value.set(Math.round(w * dpr), Math.round(h * dpr)); PU.uAsp.value = asp; },
    // cp 0..1 through the pinned stretch; px, py = pointer (-1..1)
    update(cp, T, px, py) {
      const dive = ease(seg(cp, 0, .86)), end = eio(seg(cp, .8, 1));
      const roll = dive * 2.02 + end * (Math.PI - 2.02);
      const z = lerp(9, -60, dive) - end * 22;
      cam.position.set(px * .5 * (1 - end), py * .5 * (1 - end), z);
      cam.up.set(Math.sin(roll), Math.cos(roll), 0);
      cam.lookAt(-px * 1.6 * (1 - end), -py * 1.2 * (1 - end), z - 30);
      // the two walls turn into each other and the street closes
      const turn = eio(seg(cp, .2, .82));
      left.rotation.z = turn * .2; right.rotation.z = -turn * .2;
      left.position.x = turn * 1.7; right.position.x = -turn * 1.7;
      U.uNight.value = seg(cp, .05, .62);
      U.uLit.value = .025 + Math.pow(seg(cp, .08, .78), 1.6) * .3;
      U.uT.value = T;
      // the window: a slit along the street, then a pane, then the whole view
      const a = eio(seg(cp, .56, .68)), b = eio(seg(cp, .64, .84)), c = ease(seg(cp, .8, 1));
      const hw = lerp(lerp(.006, .03, a), .34, b), hh = lerp(lerp(.0, .3, a), .46, b);
      PU.uPs.value.set(lerp(hw, asp * 1.08, c), lerp(hh, 1.08, c));
      PU.uPr.value = roll;
      PU.uPc.value.set(0, 0);
      PU.uPon.value = a * (1 - seg(cp, .97, 1));
      st.open = a > 0 ? Math.max(.001, c) : 0;
      st.vis = a > 0;
      st.hw = PU.uPs.value.x; st.hh = PU.uPs.value.y; st.rot = roll;
    },
    // the same window as four viewport points, for clipping the page text
    quad(vw, vh) {
      const c = Math.cos(st.rot), s = Math.sin(st.rot), k = vh / 2, out = [];
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const x = sx * st.hw, y = sy * st.hh;
        out.push([vw / 2 + (c * x - s * y) * k, vh / 2 - (s * x + c * y) * k]);
      }
      return out;
    },
    render(clear) {
      renderer.autoClear = clear;
      if (!clear) renderer.clearDepth();
      renderer.render(scene, cam);
      renderer.autoClear = true;
    }
  };
}
