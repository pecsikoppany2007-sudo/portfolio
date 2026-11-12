// kettő v8 – our works on a reel of convex screens.
// One screen faces you; the next waits low on the right, the last one leaves high on the left.
// While the reel turns, the rows of the picture slide apart; far screens are LED dots that sharpen as they arrive.
import * as THREE from 'three';

const M = .22; // margin around the picture: room for the glow and for rows that slide out
const VS = /* glsl */`
uniform float uBulge, uFish, uAsp;
varying vec2 vUv;
void main(){
  vUv = (uv - .5) * ${(1 + 2 * M).toFixed(3)} + .5;
  vec3 p = position;
  vec2 q = (vUv - .5) * 2.;
  p.z += uBulge * (1. - dot(q, q) * .5);
  vec4 cp = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  // a touch of wide-lens stretch toward the edges of the view
  vec2 n = cp.xy / max(cp.w, .001);
  cp.xy *= 1. + uFish * dot(n * vec2(1., 1. / uAsp), n * vec2(1., 1. / uAsp));
  gl_Position = cp;
}`;
const FS = /* glsl */`
uniform sampler2D uMap;
uniform float uG, uF, uT, uA, uBand, uOpen;
uniform vec3 uAvg;
varying vec2 vUv;
float h(float n){ return fract(sin(n * 127.1) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  // rows slide sideways inside a band, a few thick blocks jump with them
  float row = floor(uv.y * 170.);
  float band = 1. - smoothstep(.0, .2, abs(uv.y - uBand));
  float tk = floor(uT * 22.);
  float sh = (h(row + tk * 7.3) - .5) * band * uG * .4;
  sh += (h(floor(uv.y * 11.) + tk * 3.1) - .5) * step(.72, h(floor(uv.y * 11.) * 1.7 + tk)) * uG * .07;
  uv.x += sh;
  vec2 q = (uv - .5) * vec2(1.6, 1.);
  float rad = .035;
  float sd = length(max(abs(q) - (vec2(.8, .5) - rad), 0.)) - rad;
  float aa = max(fwidth(sd), .0006);
  float inside = 1. - smoothstep(-aa, aa, sd);

  float ca = .001 + uG * .006 + length(q) * .0014;
  vec3 sharp = vec3(texture2D(uMap, uv + vec2(ca, 0.)).r, texture2D(uMap, uv).g, texture2D(uMap, uv - vec2(ca, 0.)).b);
  float lines = uv.y * 190.;
  float scan = 1. - .1 * (1. - uOpen) * (.5 + .5 * sin(lines * 6.2832)) * clamp(1. - fwidth(lines) * 1.6, 0., 1.);
  sharp *= scan;

  vec2 G = vec2(112., 70.);
  vec2 cell = fract(uv * G) - .5;
  vec3 led = texture2D(uMap, (floor(uv * G) + .5) / G).rgb;
  float dotm = 1. - smoothstep(.26, .46, length(cell));
  float far = clamp(1. - fwidth(uv.x * G.x) * 1.2, 0., 1.);
  led = led * mix(1., dotm * 1.55 + .05, far);

  vec3 col = mix(led, sharp, uF);
  col *= 1. - .3 * pow(clamp(length(q) / .94, 0., 1.), 4.) * (1. - uOpen);
  col += smoothstep(-.014, -.003, sd) * .1 * (1. - uOpen);          // glass edge
  col += uG * band * .12 * step(.985, h(row * 3.7 + tk * 1.3));      // stray bright rows

  float m = min(min(vUv.x + 0.22, 1. + 0.22 - vUv.x), min(vUv.y + 0.22, 1. + 0.22 - vUv.y));
  float halo = (exp(-max(sd, 0.) * 9.) * .26 + exp(-max(sd, 0.) * 3.2) * .07) * smoothstep(0., 0.22 * .85, m);
  vec3 outc = uAvg * halo * (1. + uG * .6) * (1. - uOpen);
  gl_FragColor = vec4((col * inside + outc * (1. - inside)) * uA, inside * uA);
}`;

const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function makeReel(field, imgs) {
  const { renderer, scene, camera } = field;
  const W = 9.4, H = W / 1.6, CX = 1, CY = -.2;
  const geo = new THREE.PlaneGeometry(1 + 2 * M, 1 + 2 * M, 36, 24);
  const group = new THREE.Group(); group.visible = false; group.position.set(CX, CY, 0); scene.add(group);
  const cv = document.createElement('canvas'); cv.width = cv.height = 8; const cx = cv.getContext('2d', { willReadFrequently: true });
  const panels = imgs.map((im, k) => {
    const avg = new THREE.Vector3(.5, .5, .5);
    let tex = null;
    if (im) {
      tex = new THREE.Texture(im); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); tex.needsUpdate = true;
      renderer.initTexture(tex);
      try { cx.drawImage(im, 0, 0, 8, 8); const d = cx.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4 * 255; avg.set(r / n, g / n, b / n); } catch (e) {}
    }
    // the glow keeps the hue of the picture but never goes muddy
    const mx = Math.max(avg.x, avg.y, avg.z, .001), glow = avg.clone().multiplyScalar(.85 / mx).lerp(new THREE.Vector3(1, .95, .9), .25);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: { uMap: { value: tex }, uG: { value: 0 }, uF: { value: 0 }, uT: { value: 0 }, uA: { value: 1 }, uBand: { value: .5 }, uOpen: { value: 0 }, uAvg: { value: glow }, uBulge: { value: .05 }, uFish: { value: .09 }, uAsp: { value: 1.6 } }
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.scale.set(W, H, 1); mesh.renderOrder = 3; mesh.frustumCulled = false; mesh.visible = false;
    group.add(mesh);
    return { mesh, mat, glow, k };
  });

  let last = 0, vel = 0, g = 0, bandY = .5, hov = 0;
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(), v3 = new THREE.Vector3();

  // where screen number k sits when the reel stands at pos (d = k - pos)
  function place(p, d, tiltX, tiltY) {
    const a = Math.abs(d), m = p.mesh;
    if (d >= 0) {
      m.position.set(2.5 * a + 1.5 * a * a, -5.9 * a - .9 * a * a, 3.1 * a);
      m.rotation.set(-.74 * a, -.32 * a, .2 * a);
    } else {
      m.position.set(-4.3 * a - 1.3 * a * a, 5.7 * a + 1.5 * a * a, -3.6 * a);
      m.rotation.set(.52 * a, -.5 * a, .62 * a);
    }
    const near = 1 - ss(0, .5, a);
    m.rotation.x += tiltX * near; m.rotation.y += tiltY * near;
    p.mat.uniforms.uF.value = 1 - ss(.06, .72, a);
    p.mat.uniforms.uBulge.value = .05 + a * .06;
    p.mat.uniforms.uA.value = 1 - ss(1.55, 2.0, a);
    m.visible = a < 2.0;
  }

  return {
    panels, W, H, cx: CX, cy: CY,
    resize(aspect) { for (const p of panels) p.mat.uniforms.uAsp.value = aspect; },
    // pos: 0..7 with the screen number facing you; outside that range the reel is arriving or leaving
    update(pos, dt, T, o) {
      const on = o.on;
      group.visible = on;
      if (!on) { last = pos; g = 0; return; }
      const v = (pos - last) / Math.max(dt, .001); last = pos;
      vel += (v - vel) * (1 - Math.exp(-dt / .05));
      const want = clamp(Math.abs(vel) * .9);
      g += (want - g) * (1 - Math.exp(-dt / (want > g ? .04 : .22)));
      if (g < .003) g = 0;
      if (window.__kg) g = window.__kg; // test hook
      bandY += ((.5 + Math.sin(T * 1.7) * .16) - bandY) * .2;
      hov += ((o.hover ? 1 : 0) - hov) * (1 - Math.exp(-dt / .2));
      const open = o.open || 0;
      for (const p of panels) {
        const d = p.k - pos;
        place(p, d, -o.py * .05 * (1 - open), o.px * .09 * (1 - open));
        const u = p.mat.uniforms;
        u.uG.value = g * (1 - open); u.uT.value = T; u.uBand.value = bandY; u.uOpen.value = Math.abs(d) < .5 ? open : 0;
        if (open > 0 && Math.abs(d) > .5) u.uA.value *= 1 - open;
      }
    },
    get glitch() { return g; },
    // uv of the facing screen under the pointer (null when outside the picture)
    pick(nx, ny, k) {
      const p = panels[k]; if (!p || !p.mesh.visible) return null;
      v2.set(nx, ny); ray.setFromCamera(v2, camera);
      const hit = ray.intersectObject(p.mesh, false)[0]; if (!hit) return null;
      const u = (hit.uv.x - .5) * (1 + 2 * M) + .5, v = (hit.uv.y - .5) * (1 + 2 * M) + .5;
      return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { x: u, y: v } : null;
    },
    // corners of the facing screen in viewport px: [left, top, right, bottom]
    rect(k, vw, vh) {
      const p = panels[k]; if (!p) return null;
      p.mesh.updateMatrixWorld();
      let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
      for (const [x, y] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) {
        v3.set(x, y, 0).applyMatrix4(p.mesh.matrixWorld).project(camera);
        const X = (v3.x + 1) / 2 * vw, Y = (1 - v3.y) / 2 * vh;
        l = Math.min(l, X); r = Math.max(r, X); t = Math.min(t, Y); b = Math.max(b, Y);
      }
      return [l, t, r, b];
    },
    glowOf(k) { return panels[k] ? panels[k].glow : null; }
  };
}
