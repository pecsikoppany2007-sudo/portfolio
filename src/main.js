// kettő v8 – one field of light dots, re-formed per section; our works on a reel of screens; the town before the contact. One rAF loop.
import Lenis from 'lenis';
import { makeField } from './field.js';
import { makeReel } from './reel.js';
import { makeCity } from './city.js';
import { startBuild } from './build.js';
import { guestCursor, proximity, selection, flock } from './extras.js';
import { sound } from './sound.js';
const sndB = document.getElementById('snd');
if (sndB) {
  sndB.addEventListener('click', () => sound.toggle());
  sound.sub(on => { sndB.setAttribute('aria-pressed', on); sndB.classList.toggle('on', on); sndB.querySelector('.snd__l').textContent = on ? 'Hang be' : 'Hang ki'; });
}

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const qs = new URLSearchParams(location.search);

/* ---------- capability gating ---------- */
function gpuInfo() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { ok: false, hw: false };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    const soft = /swiftshader|llvmpipe|software|basic render/i.test(r);
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    return { ok: true, hw: !soft };
  } catch (e) { return { ok: false, hw: false }; }
}
const gi = gpuInfo();
const has3d = gi.ok && (gi.hw || qs.has('3d'));
const rich = has3d && fine && !reduced;
const phone = Math.min(innerWidth, innerHeight) < 700;
html.classList.toggle('no3d', !has3d);
html.classList.toggle('rich', rich);
if (reduced) html.classList.add('no-anim');
let building = html.classList.contains('building');

/* ---------- text ---------- */
function rollify(el) {
  const t = el.textContent; el.textContent = '';
  const a = el.closest('a'); if (a && !a.hasAttribute('aria-label')) a.setAttribute('aria-label', t.trim());
  [...t].forEach((ch, i) => { const s = document.createElement('span'); s.textContent = ch; s.style.setProperty('--i', i); s.setAttribute('aria-hidden', 'true'); el.appendChild(s); });
}
$$('.roll').forEach(rollify);

const splitEls = $$('[data-lines]').map(el => ({ el, src: el.innerHTML }));
function splitLines({ el, src }) {
  el.innerHTML = src;
  const tokens = el.textContent.split(/[ \n\t]+/).filter(Boolean); // &nbsp; stays inside a token
  el.innerHTML = '';
  const spans = tokens.map((w, i) => { const s = document.createElement('span'); s.style.display = 'inline-block'; s.textContent = w; el.appendChild(s); if (i < tokens.length - 1) el.appendChild(document.createTextNode(' ')); return s; });
  const lines = []; let top = null;
  spans.forEach(s => { const t = s.offsetTop; if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; } lines[lines.length - 1].push(s.textContent); });
  el.innerHTML = '';
  el.setAttribute('aria-label', tokens.join(' '));
  lines.forEach((ln, i) => {
    const o1 = document.createElement('span'); o1.className = 'ln'; o1.setAttribute('aria-hidden', 'true');
    const o2 = document.createElement('span'); o2.className = 'ln__i'; o2.style.setProperty('--d', i); o2.textContent = ln.join(' ');
    o1.appendChild(o2); el.appendChild(o1);
  });
}

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });

/* ---------- smooth scroll (desktop) ---------- */
let lenis = null;
if (fine && !reduced) lenis = new Lenis({ lerp: .085, wheelMultiplier: .9, smoothWheel: true });
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href'); if (id.length < 2 || !lenis) return; const t = $(id); if (!t) return;
  e.preventDefault();
  // the contact sits at the end of its own pinned stretch (the dive into the town)
  if (id === '#kapcsolat' && pin && city) lenis.scrollTo(L.contact + L.cityLen, { duration: 3.2 });
  else lenis.scrollTo(id === '#top' ? 0 : t, { offset: 0, duration: 1.8 });
}));

/* ---------- layout ---------- */
let vw = innerWidth, vh = innerHeight, pin = false;
const sections = $$('[data-s]');
const works = $('#munkak'), about = $('#rolunk'), prices = $('#arak'), contact = $('#kapcsolat');
let L = { steps: [1, 2, 3, 4], secs: [], w0: 1, wLen: 1, about: 1, pTop: 1, pH: 1, contact: 1, cityLen: 1 };
function measure() {
  vw = innerWidth; vh = innerHeight;
  const sy = scrollY, top = el => el.getBoundingClientRect().top + sy;
  L = { steps: $$('#menet .proc__list li').map(li => top(li) + li.offsetHeight / 2), menet: top($('#menet')), menetH: $('#menet').offsetHeight, secs: sections.map(s => ({ top: top(s), name: s.dataset.name })), w0: Math.max(1, top(works)), wLen: Math.max(1, works.offsetHeight - vh), about: top(about), pTop: top(prices), pH: prices.offsetHeight, contact: top(contact), cityLen: Math.max(1, contact.offsetHeight - vh) };
}
let lastW = 0;
function relayout(force) {
  const wChanged = innerWidth !== lastW;
  if (!force && !wChanged && Math.abs(innerHeight - vh) < 160 && !fine) return;
  lastW = innerWidth;
  const p = rich && innerWidth >= 1000 && innerHeight >= 560;
  if (p !== pin) { pin = p; html.classList.toggle('pin', pin); }
  if (wChanged || force) { splitEls.forEach(splitLines); if (prox) prox.wrap(); }
  else if (prox) prox.measure();
  measure();
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  if (field) field.resize(innerWidth, innerHeight, dpr);
  if (reel) reel.resize(innerWidth / innerHeight);
  if (city) city.resize(innerWidth, innerHeight, dpr);
  fitCam();
}

/* ---------- the field ---------- */
let field = null, reel = null, city = null, ready = false;
const prox = rich ? proximity('.hero__title, .h-big, .h-contact') : null;
const IMGS = ['darling', 'avira', 'katlan', 'cafe-flow', 'gyogygodor', 'cafe-nana', 'habvero', 'moa'].map(n => `img/munka-${n}.jpg?v=5`);
const rows = $$('#wl .wl__row').map(r => ({ n: r.querySelector('.wl__n').textContent, k: r.querySelector('.wl__k').textContent }));
let baseZ = 14;
function fitCam() {
  if (!field) return;
  const c = field.camera, a = c.aspect, W = a > 1 ? 15 : 7.4;
  baseZ = Math.max(14, (W / 2 * 1.14) / (Math.tan(c.fov * Math.PI / 360) * a));
}
if (has3d) {
  try { field = makeField($('#gl'), { phone }); } catch (e) { field = null; html.classList.add('no3d'); }
}

// how hard the dots burst toward the viewer for each change
const BURST = { '0-1': 0, '1-2': 10, '9-10': 6, '10-11': 4, '14-15': 5 };
const burstFor = (a, b) => BURST[a + '-' + b] ?? (a >= 2 && b <= 9 ? .8 : 4.5);

/* ---------- pointer ---------- */
const ptr = { x: 0, y: 0, sx: 0, sy: 0, inside: false, cx: -999, cy: -999, moved: -9e9, ccx: innerWidth / 2 };
const cur = $('#cur');
if (rich) {
  addEventListener('pointermove', e => {
    ptr.x = e.clientX / vw * 2 - 1; ptr.y = -(e.clientY / vh) * 2 + 1; ptr.inside = true; ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.moved = performance.now();
    cur.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
    cur.classList.toggle('on', !!e.target.closest('a,button,summary'));
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { ptr.inside = false; });
  html.classList.add('has-cur');
}
// touch: a tap sends one ripple through the dots (it never follows the finger)
let tap = { t: -9, x: 0, y: 0 };
if (!rich && field) addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; tap = { t: performance.now() / 1000, x: e.clientX / vw * 2 - 1, y: -(e.clientY / vh) * 2 + 1 }; }, { passive: true });

/* ---------- state driving ---------- */
let sf = 1, introT = 0, introDone = false, introFast = false, introHold = building;
let tw = null, target = 1;
function desiredState(y) {
  if (y < L.w0) return 1 + ease(seg(y / L.w0, .02, .98));
  const yEnd = L.w0 + L.wLen;
  if (y < yEnd) {
    const x = (y - L.w0) / L.wLen * 8, j = Math.min(7, Math.floor(x)), fr = x - j;
    return 2 + j + (j < 7 ? ease(seg(fr, .6, 1)) : 0);
  }
  // the process: each step brings its own sign as it reaches the middle of the screen
  const m = y + vh * .5, c = L.steps;
  if (m < c[0] - vh * .42) return 9 + ease(seg((y - yEnd) / Math.max(1, L.about - yEnd), .1, 1));
  if (m < c[0] - vh * .08) return 10 + ease(clamp((m - c[0] + vh * .42) / (vh * .34)));
  if (y < L.contact - vh) {
    for (let k = 0; k < 3; k++) if (m < c[k + 1]) { const g = c[k + 1] - c[k]; return 11 + k + ease(clamp((m - c[k] - g * .3) / (g * .5))); }
    return 14;
  }
  return 14 + ease(seg((y - (L.contact - vh)) / vh, .25, 1));
}
function sectionTarget(y) {
  const mid = y + vh * .5;
  if (mid < L.about) return 1;
  if (mid < L.menet) return 10;
  if (mid < L.contact) { let k = 0; while (k < 3 && mid > (L.steps[k] + L.steps[k + 1]) / 2) k++; return 11 + k; }
  return 15;
}
function tweenTo(b) {
  if (!field || target === b) return;
  const from = target;
  field.snapshotTo(b);
  tw = { t: 0, dur: reduced ? .9 : 2.4, burst: reduced ? 0 : (from === 1 ? 5 : 4) };
  target = b;
}

/* ---------- the list beside the reel ---------- */
const rl = $('#rl'), rb = $('#rb'), rbn = $('#rbn');
rows.forEach((r, i) => {
  const li = document.createElement('li');
  li.innerHTML = `<button type="button" tabindex="-1"><b>${String(i + 1).padStart(2, '0')}</b><span class="rl__n"></span><span class="rl__k"></span></button>`;
  li.querySelector('.rl__n').textContent = r.n; li.querySelector('.rl__k').textContent = r.k;
  li.firstChild.addEventListener('click', () => { if (lenis) lenis.scrollTo(L.w0 + L.wLen * (i + .3) / 8, { duration: 1.6 }); });
  rl.appendChild(li);
});
const rlRows = $$('li', rl);
// the name settles letter by letter out of noise
const GLY = 'abcdeghkmnoprstuvzáéőű';
let scr = null;
function scramble(el, text) { scr = { el, text, t: 0 }; }
function scrTick(dt) {
  if (!scr) return;
  scr.t += dt;
  const n = scr.text.length, done = Math.floor(scr.t / .028);
  let o = '';
  for (let i = 0; i < n; i++) o += i < done || scr.text[i] === ' ' ? scr.text[i] : GLY[(Math.random() * GLY.length) | 0];
  scr.el.textContent = o;
  if (done >= n) scr = null;
}
let capK = -1;
function setCap(k) {
  if (k === capK) return;
  if (capK >= 0) rlRows[capK].classList.remove('on');
  if (scr) { scr.el.textContent = scr.text; scr = null; }
  capK = k;
  if (k < 0) return;
  rlRows[k].classList.add('on');
  rbn.textContent = `${String(k + 1).padStart(2, '0')} / 08`;
  if (!reduced) scramble(rlRows[k].querySelector('.rl__n'), rows[k].n);
}
let rbKey = '', rbOn = false;
function setFrame(r, on) {
  if (on !== rbOn) { rbOn = on; rb.classList.toggle('on', on); }
  if (!r) return;
  const key = r.map(v => Math.round(v)).join();
  if (key !== rbKey) { rbKey = key; rb.style.transform = `translate3d(${r[0].toFixed(1)}px,${r[1].toFixed(1)}px,0)`; rb.style.width = (r[2] - r[0]).toFixed(1) + 'px'; rb.style.height = (r[3] - r[1]).toFixed(1) + 'px'; }
}

/* ---------- index + clock ---------- */
const idx = $('#idx'), idxname = $('#idxname');
let lastIdx = -1;
function indexTick(y) {
  let i = 0; L.secs.forEach((s, k) => { if (y + vh * .45 >= s.top) i = k; });
  if (i !== lastIdx && L.secs[i]) { lastIdx = i; idx.textContent = String(i + 1).padStart(2, '0'); idxname.textContent = L.secs[i].name; }
}
const clock = $('#clock');
const fmt = new Intl.DateTimeFormat('hu-HU', { timeZone: 'Europe/Budapest', hour: '2-digit', minute: '2-digit' });
const tickClock = () => { clock.textContent = fmt.format(new Date()); };
tickClock(); setInterval(tickClock, 15000);

/* ---------- loop ---------- */
const heroEl = $('.hero'); let heroO = 1, pClip = null, selT = 0;
const domi = guestCursor('Domi', '#5b84ff'); let domiA = 0, domiT = 0, domiSaid = false, domiShown = false;
const aboutText = $('#stmt');
const sel = selection(aboutText, guestCursor('kopi', '#ff4a1c'));
/* ---------- inside one of our sites ---------- */
const CASES = ['darling', 'avira', 'katlan', 'cafe-flow', 'gyogygodor', 'cafe-nana', 'habvero', 'moa'];
const caseEl = $('#case'), caseImg = $('#caseimg'), caseScroll = $('#casescroll'), caseProg = $('#caseprog');
let caseK = -1, caseA = 0, caseWant = 0, caseFocus = null, caseFirst = -1;
function fillCase(k) {
  caseK = k;
  caseImg.src = `img/oldal/${CASES[k]}.webp?v=7`; caseImg.alt = `A(z) ${rows[k].n} oldala teljes hosszában`;
  $('#casen').textContent = `${String(k + 1).padStart(2, '0')} / 08`; $('#casename').textContent = rows[k].n; $('#casek').textContent = rows[k].k;
  $('#casenextn').textContent = rows[(k + 1) % 8].n;
  caseScroll.scrollTop = 0; caseProg.style.transform = 'scaleX(0)';
}
function openCase(k, fly) {
  if (caseWant) return;
  caseFocus = document.activeElement; caseFirst = k; fillCase(k); caseWant = 1;
  if (!fly) { caseA = 1; showCase(); }
}
function showCase() {
  if (!caseEl.hidden) return;
  caseEl.hidden = false; html.classList.add('case-open');
  requestAnimationFrame(() => caseEl.classList.add('on'));
  $('#casex').focus({ preventScroll: true });
}
function closeCase() {
  if (!caseWant) return;
  caseWant = 0; caseEl.classList.remove('on'); html.classList.remove('case-open');
  setTimeout(() => { if (!caseWant) caseEl.hidden = true; }, 500);
  if (!field || !pin) caseA = 0;
  if (pin && caseK !== caseFirst && lenis) lenis.scrollTo(L.w0 + L.wLen * (caseK + .3) / 8, { immediate: true });
  if (caseFocus && caseFocus.focus) caseFocus.focus({ preventScroll: true });
}
$('#casex').addEventListener('click', closeCase);
$('#casenext').addEventListener('click', () => fillCase((caseK + 1) % 8));
addEventListener('keydown', e => { if (e.key === 'Escape' && caseWant) closeCase(); });
caseScroll.addEventListener('scroll', () => { const m = caseScroll.scrollHeight - caseScroll.clientHeight; caseProg.style.transform = `scaleX(${m > 0 ? (caseScroll.scrollTop / m).toFixed(4) : 0})`; }, { passive: true });
$$('#wl .wl__row').forEach((r, i) => {
  r.addEventListener('click', () => openCase(i, false));
  r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCase(i, false); } });
});
addEventListener('click', e => {
  if (!field || !pin || caseWant || e.target.closest('a,button,summary,.case')) return;
  const near = Math.abs(sf - Math.round(sf)), k = Math.round(sf) - 2;
  if (k < 0 || k > 7 || near > .03) return;
  if (reel && reel.pick(ptr.x, ptr.y, k)) openCase(k, true);
});

let headS = 0, trI = 0, lastY = 0, whKey = 0;
const env = { on: false, tw: false, t: 0 };
const mail = $('.contact__links a[href^="mailto"]');
function envTo(on) {
  if (!field || !pin || env.on === on) return;
  if (!on && !env.on) return;
  env.on = on; env.tw = true; env.t = 0;
  field.snapshotTo(field.idx(on ? 'ENV' : 'SPHERE'));
}
mail.addEventListener('pointerenter', () => { if (sf > 14.9) envTo(true); });
mail.addEventListener('pointerleave', () => envTo(false));
const crew = rich ? flock() : null;
if (rich) cur.innerHTML = '<span class="cur__me">Ön</span>';
// kopi says hello once if your mouse rests for a while
const greeter = rich ? guestCursor('kopi', '#ff4a1c') : null;
let greet = { s: 0, t: 0, x: 0, y: 0, fx: 0, fy: 0 };
function greetTick(dt, now, busy) {
  if (!greeter) return;
  const idle = (now - ptr.moved) / 1000;
  if (greet.s === 0 && !busy && ptr.inside && idle > 3.2 && now > 20000) {
    greet.s = 1; greet.t = 0; greet.fx = ptr.cx < vw / 2 ? -40 : vw + 40; greet.fy = ptr.cy + 120; greet.x = greet.fx; greet.y = greet.fy;
  }
  if (greet.s === 0 || greet.s === 4) return;
  greet.t += dt;
  const tx = ptr.cx + (greet.fx < 0 ? -90 : 70), ty = ptr.cy - 46;
  if (greet.s === 1) { greet.x += (tx - greet.x) * (1 - Math.exp(-dt / .28)); greet.y += (ty - greet.y) * (1 - Math.exp(-dt / .28)); if (greet.t > 1) { greet.s = 2; greet.t = 0; greeter.say('Üdv! Nézzen körül nyugodtan.', 2800); } }
  else if (greet.s === 2) { greet.x += (tx - greet.x) * (1 - Math.exp(-dt / .5)); greet.y += (ty - greet.y) * (1 - Math.exp(-dt / .5)); if (greet.t > 3.2 || (now - ptr.moved < 200 && greet.t > 1.2)) { greet.s = 3; greet.t = 0; } }
  else if (greet.s === 3) { greet.x += (greet.fx - greet.x) * (1 - Math.exp(-dt / .4)); greet.y += (greet.fy - 200 - greet.y) * (1 - Math.exp(-dt / .4)); if (greet.t > 1.6) greet.s = 4; }
  greeter.at(greet.x, greet.y); greeter.show(greet.s === 3 ? Math.max(0, 1 - greet.t) : Math.min(1, greet.t * 3 + (greet.s > 1 ? 1 : 0)));
} const lastTr = { x: 9, y: 9 };
let last = performance.now(), tintA = 0, cpLast = -1, clipKey = '', capOn = false;
const contactIn = $('#contactin'), cityCap = $('#citycap');
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (lenis) lenis.raf(now);
  const y = lenis ? lenis.scroll : scrollY;
  indexTick(y);
  if (pin) { const o = 1 - seg(y / vh, .05, .45); if (o !== heroO) { heroO = o; heroEl.style.opacity = o; } }
  if (prox) prox.tick(ptr.cx, ptr.cy, ptr.inside);
  if (crew) { const hideC = building || caseWant; html.classList.toggle('crew-on', !hideC); crew.tick(dt, ptr.cx, ptr.cy, ptr.inside, (now - ptr.moved) / 1000, hideC); }
  greetTick(dt, now, building || caseWant || (pin && sf > 1.97 && sf < 9.03));
  if (sel && (!building || (aboutText.classList.contains('b-tx') && !aboutText.style.clipPath))) {
    if (pin) { const r = aboutText.getBoundingClientRect(); sel.set(clamp((vh * .85 - r.top) / (r.height + vh * .45)), dt); }
    else { if (aboutText.classList.contains('in')) selT += dt; sel.set(clamp(selT / 4), dt); }
  }
  // the paper of the price list opens from where your mouse is
  if (pin) {
    const p = clamp((vh - (L.pTop - y)) / vh);
    ptr.ccx += ((ptr.inside ? ptr.cx : vw / 2) - ptr.ccx) * (1 - Math.exp(-dt / .25));
    const cl = p >= 1 ? 'none' : p <= 0 ? 'circle(0px at 50% 0px)' : `circle(${(p * Math.hypot(vw, vh) * 1.05).toFixed(1)}px at ${ptr.ccx.toFixed(0)}px 0px)`;
    if (cl !== pClip) { pClip = cl; prices.style.clipPath = cl; }
  } else if (pClip !== '') { pClip = ''; prices.style.clipPath = ''; }
  if (!field || !ready) return;
  const T = now / 1000, U = field.mat.uniforms;

  // opening: the dots come in from deep space and lock into the word
  if (!introDone) {
    if (!introHold) introT += dt * (introFast ? 3.5 : 1);
    const p = clamp(introT / 3.1);
    field.setPair(0, 1); U.uP.value = p; U.uBurst.value = 0;
    if (p > .45) html.classList.add('intro-text');
    if (p >= 1) { introDone = true; html.classList.add('intro-done'); if (lenis) lenis.start(); }
  } else if (pin) {
    tw = null;
    const want = desiredState(y);
    sf += (want - sf) * (1 - Math.exp(-dt / .11));
    if (Math.abs(want - sf) < .0005) sf = want;
    const a = clamp(Math.floor(sf), 1, 14), b = a + 1;
    if (env.on || env.tw) {
      // hovering the e-mail: the planet folds into an envelope and back
      if (env.tw) { env.t += dt; U.uP.value = clamp(env.t / 1.3); U.uBurst.value = 2.5; if (env.t >= 1.3) env.tw = false; }
    } else { field.setPair(a, b); U.uP.value = clamp(sf - a); U.uBurst.value = burstFor(a, b); }
    const pu = U.uP.value, pk = a * 100 + b;
    if (pu < .02) whKey = 0; else if (pu > .06 && pu < .5 && whKey !== pk && !env.tw) { whKey = pk; sound.whoosh(Math.min(1, burstFor(a, b) / 10)); }
    target = Math.round(sf);
  } else {
    tweenTo(sectionTarget(y));
    if (tw) { tw.t += dt; U.uP.value = clamp(tw.t / tw.dur); U.uBurst.value = tw.burst; if (tw.t >= tw.dur) tw = null; }
  }

  const near = Math.abs(sf - Math.round(sf));
  const inWorks = pin && introDone && sf > 1.97 && sf < 9.03;
  const k = clamp(Math.round(sf) - 2, 0, 7), settled = inWorks && near < .03;
  if (pin) setCap(inWorks && near < .42 ? k : -1);

  // pointer: smoothed; the dots part around it
  ptr.sx = lerp(ptr.sx, ptr.inside ? ptr.x : 0, 1 - Math.exp(-dt / .09));
  ptr.sy = lerp(ptr.sy, ptr.inside ? ptr.y : 0, 1 - Math.exp(-dt / .09));
  let ms = 0, mx = ptr.sx, my = ptr.sy;
  if (rich) ms = ptr.inside && introDone ? 1 : 0;
  else { const age = T - tap.t; if (age < 1.3) { ms = Math.sin(clamp(age / 1.3) * Math.PI) * .9; mx = tap.x; my = tap.y; } }

  // the reel of our works
  const reelOn = !!reel && inWorksWide();
  const rpos = sf < 2 ? -(2 - sf) * 1.9 : sf > 9 ? 7 + (sf - 9) * 1.9 : sf - 2;
  caseA += (caseWant - caseA) * (1 - Math.exp(-dt / .32));
  if (caseWant && caseA > .6) showCase();
  const cg = ease(clamp(caseA));
  let hoverScreen = false;
  if (reel) {
    hoverScreen = settled && ptr.inside && !!reel.pick(ptr.sx, ptr.sy, k);
    reel.update(rpos, dt, T, { on: reelOn, px: ptr.sx, py: ptr.sy, open: cg, hover: hoverScreen });
    cur.classList.toggle('go', hoverScreen && !caseWant);
    setFrame(settled && !caseWant ? reel.rect(k, vw, vh) : null, settled && !caseWant);
    scrTick(dt);
    // the floor of dots takes the colour of the screen above it
    const gl = reel.glowOf(k), tw2 = reelOn ? clamp(1 - near * 2.4) * .55 : 0;
    tintA += (tw2 - tintA) * (1 - Math.exp(-dt / .3));
    if (gl) U.uTint.value.set(gl.x, gl.y, gl.z, tintA);
  }
  // when your mouse rests, Domi points at the screen
  const gWant = rich && settled && !building && !caseWant && now - ptr.moved > 3500 ? 1 : 0;
  domiA += (gWant - domiA) * (1 - Math.exp(-dt / .25));
  if (domiA > .02) {
    domiT += dt;
    const gx = Math.sin(domiT * .5) * .22 + .04, gy = Math.sin(domiT * .83) * .13 + .02;
    domi.at((gx + 1) / 2 * vw, (1 - gy) / 2 * vh); domi.show(domiA);
    if (!domiSaid && domiA > .9) { domiSaid = true; domi.say('kattintson rá, belül az egész oldal', 3000); }
  } else if (domiShown) domi.show(0);
  domiShown = domiA > .02;
  U.uMS.value = 1;
  // head = the pointer now; the rest = where it was, fading slowly so the dots drift back
  const tr = U.uTr.value;
  headS += (ms - headS) * (1 - Math.exp(-dt / .12));
  tr[0].set(mx, my, headS, 0);
  for (let i = 1; i < 16; i++) tr[i].z *= Math.exp(-dt / .42);
  if (ms > .5 && Math.hypot(mx - lastTr.x, (my - lastTr.y) / Math.max(.5, vw / vh)) > .018) {
    trI = trI % 15 + 1; tr[trI].set(lastTr.x, lastTr.y, .9, 0); lastTr.x = mx; lastTr.y = my;
  }
  U.uT.value = T; field.dmat.uniforms.uT.value = T;
  // fast scrolling turns the dust into light streaks
  const vel = lenis ? lenis.velocity : (y - lastY) / Math.max(dt, .001) / 60; lastY = y;
  field.setWarp(reduced ? 0 : clamp((Math.abs(vel) - 14) / 40) * Math.sign(vel), dt);

  // camera floats with the pointer and dives into the word on the first scroll
  const c = field.camera;
  const dive = pin && introDone ? Math.sin(Math.PI * clamp(sf - 1)) : 0;
  const px = rich ? ptr.sx : Math.sin(T * .13) * .4, py = rich ? ptr.sy : Math.cos(T * .11) * .25;
  const ox = reel ? reel.cx * cg : 0, oy = reel ? reel.cy * cg : 0;
  c.position.set(px * 1.3 * (1 - cg) + ox, py * .75 * (1 - cg) + oy, baseZ - dive * 5 - cg * (baseZ - 4.2));
  c.lookAt(ox, oy, -dive * 2);
  U.uFocus.value = baseZ - dive * 3.5; field.dmat.uniforms.uFocus.value = U.uFocus.value;
  if (!pin) { const mid = y + vh * .5, d = mid < L.w0 ? 1 : mid < L.about ? .16 : mid < L.contact - vh * .3 ? .26 : 1; U.uDim.value = lerp(U.uDim.value, d, 1 - Math.exp(-dt / .3)); }

  // the town: the last stretch before the contact
  const cp = pin && city ? (y - L.contact) / L.cityLen : 2;
  const cityOn = cp < .995 && y > L.contact - vh;
  let clip = '';
  if (pin && city) {
    if (cityOn) {
      city.update(clamp(cp), T, ptr.sx, ptr.sy);
      if (city.st.vis) { const q = city.quad(vw, vh); clip = 'polygon(' + q.map(p => p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px').join(',') + ')'; }
      else clip = 'hide';
      if (cpLast < .57 && cp >= .57) sound.whoosh(1);
    }
    const co = cityOn && cp > .1 && cp < .5;
    if (co !== capOn) { capOn = co; cityCap.classList.toggle('on', co); }
  }
  cpLast = cp;
  if (clip !== clipKey) {
    clipKey = clip;
    contactIn.style.visibility = clip === 'hide' ? 'hidden' : '';
    contactIn.style.clipPath = clip === 'hide' ? '' : clip;
  }

  // the paper price section covers the whole view: nothing to draw
  const pr = L.pTop - y;
  if (pr <= 0 && pr + L.pH >= vh) return;
  if (caseA > .995 && caseWant) return;
  if (cityOn) {
    if (city.st.vis) { field.render(); city.render(false); } else city.render(true);
  } else field.render();
}
function inWorksWide() { return pin && introDone && sf > 1.03 && sf < 9.97; }

const hurry = () => { introFast = true; };
addEventListener('wheel', hurry, { passive: true, once: true });
addEventListener('pointerdown', hurry, { passive: true, once: true });
addEventListener('keydown', hurry, { once: true });
addEventListener('touchmove', hurry, { passive: true, once: true });

addEventListener('resize', () => relayout(false));
document.fonts.ready.then(() => relayout(true));
relayout(true);
$$('[data-lines], .wl__row, .stats > div, .proc__list li, .col, .about__text, .contact__links, .hero__lead, .works__note').forEach(el => io.observe(el));

async function start() {
  if (!field) { html.classList.add('intro-text', 'intro-done'); if (building) { await document.fonts.ready; runBuild(); } return; }
  try { await Promise.race([document.fonts.load('700 100px Unbounded'), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  const imgs = await field.load(IMGS);
  if (rich) {
    try { reel = makeReel(field, imgs); city = makeCity(field.renderer, field.warm); } catch (e) { reel = city = null; }
    html.classList.toggle('reel', !!reel);
  }
  relayout(true);
  if (reduced || scrollY > 10) introFast = true;
  ready = true;
  html.classList.add('live');
  if (building) runBuild();
}
function runBuild() {
  startBuild({
    scene: () => ({ x: vw * (vw > vh ? .6 : .5), y: vh * (vw > vh ? .33 : .3) }),
    onScene: () => { introHold = false; },
    onDone: () => { try { sessionStorage.setItem('k6-built', '1'); } catch (e) {} building = false; if (prox) prox.measure(); measure(); }
  });
}
$('#again').addEventListener('click', () => { try { sessionStorage.removeItem('k6-built'); } catch (e) {} scrollTo(0, 0); location.reload(); });
if (lenis && field) { lenis.scrollTo(0, { immediate: true }); lenis.stop(); }
start();
requestAnimationFrame(frame);
setTimeout(() => { if (building) return; introFast = true; if (!ready) { html.classList.add('intro-text', 'intro-done'); if (lenis) lenis.start(); } }, 9000);

// hidden frame meter: type "fps" on the page
let keys = '', meter = null;
addEventListener('keydown', e => {
  keys = (keys + e.key).slice(-3);
  if (keys !== 'fps' || meter) return;
  meter = document.createElement('div');
  meter.style.cssText = 'position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:99;background:#000;color:#0f0;font:12px monospace;padding:6px 10px';
  document.body.appendChild(meter);
  let fr = [], lt = performance.now();
  const m = t => { fr.push(t - lt); lt = t; if (fr.length > 300) fr.shift(); requestAnimationFrame(m); };
  requestAnimationFrame(m);
  setInterval(() => { const avg = fr.reduce((a, b) => a + b, 0) / fr.length; meter.textContent = `fps ${(1000 / avg).toFixed(0)} | slow ${fr.filter(d => d > 25).length}/${fr.length} | max ${Math.max(...fr).toFixed(0)}ms`; }, 500);
});
