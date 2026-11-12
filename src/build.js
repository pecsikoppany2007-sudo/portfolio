// kettő – the page is built in front of you by kopi, Domi and a few helpers (v3 engine, v6 page).
// Own engine: reads the real page into layers, hides them, then cursors drag out boxes,
// type the text and start the production line. Everything runs in viewport space from live rects,
// so fixed, sticky and pinned parts stay in place. One rAF loop, reads before writes.
import { sound } from './sound.js';

const $ = (s, r = document) => r.querySelector(s);
const html = document.documentElement;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const eio = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const eout = t => 1 - Math.pow(1 - t, 3);

const ROOTS = '.ui, .ui-b, main, .ft';
const SKIP = '.sr-only,.skip,#gl,.stage,.cur,.gc,.pin .wl,script,style,br,template';
const MEDIA = 'img,svg,canvas,video,.hero__down,.logo__dots';
const TEXTF = '.roll,[data-lines],.about__text';

const ICONS = `<svg class="ba__i ba__i--arrow" viewBox="0 0 24 24"><path d="M4 2.5v17.2l4.6-4.3 3 6.4 3-1.3-3-6.3h6.3z"/></svg>
<svg class="ba__i ba__i--cross" viewBox="0 0 24 24"><path class="u" d="M12 3v18M3 12h18"/><path d="M12 3v18M3 12h18"/></svg>
<svg class="ba__i ba__i--ibeam" viewBox="0 0 24 24"><path class="u" d="M8 3.5h8M8 20.5h8M12 3.5v17"/><path d="M8 3.5h8M8 20.5h8M12 3.5v17"/></svg>
<svg class="ba__i ba__i--pen" viewBox="0 0 24 24"><path d="M3.5 20.5l2.2-6.6L15.9 3.7l4.4 4.4L10.1 18.3z"/><circle cx="7.6" cy="16.4" r="1.3"/></svg>`;

/* ---------- reading the page ---------- */
function ownText(el) { for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true; return false; }
function hasBox(cs) {
  if (cs.backgroundImage !== 'none') return true;
  const bg = cs.backgroundColor;
  if (bg && bg !== 'transparent' && !/,\s*0\)$/.test(bg)) return true;
  return ['Top', 'Right', 'Bottom', 'Left'].some(s => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none');
}
function collect(root, out) {
  for (const c of root.children) {
    if (c.matches(SKIP)) continue;
    const cs = getComputedStyle(c);
    if (cs.display === 'none') continue;
    const r = c.getBoundingClientRect();
    const sized = r.width >= 2 && r.height >= 2;
    if (sized && c.matches(MEDIA)) { out.push({ el: c, kind: 'media' }); continue; }
    if (sized && (c.matches(TEXTF) || ownText(c))) { out.push({ el: c, kind: 'text' }); continue; }
    if (sized && hasBox(cs) && r.width >= 10 && r.height >= 6) out.push({ el: c, kind: 'box' });
    collect(c, out);
  }
}

// line boxes of a text element, relative to its border box
function textLines(el, r) {
  const rg = document.createRange(); rg.selectNodeContents(el);
  const rs = [...rg.getClientRects()].filter(x => x.width > .5 && x.height > .5).sort((a, b) => a.top - b.top || a.left - b.left);
  const L = [];
  for (const x of rs) {
    const cy = (x.top + x.bottom) / 2;
    let l = L.find(l => cy > l.t && cy < l.b);
    if (!l) L.push({ t: x.top, b: x.bottom, l: x.left, r: x.right });
    else { l.t = Math.min(l.t, x.top); l.b = Math.max(l.b, x.bottom); l.l = Math.min(l.l, x.left); l.r = Math.max(l.r, x.right); }
  }
  L.sort((a, b) => a.t - b.t);
  if (!L.length) L.push({ t: r.top, b: r.bottom, l: r.left, r: r.right });
  let acc = 0;
  return L.map(l => { const o = { t: l.t - r.top, b: l.b - r.top, l: l.l - r.left, r: l.r - r.left, s: acc }; acc += Math.max(1, l.r - l.l); o.e = acc; return o; });
}
function clipAt(L, p) {
  // reveal whole lines before k, line k up to x
  let k = L.findIndex(l => p < l.e); if (k < 0) k = L.length - 1;
  const l = L[k], x = l.l + clamp(p - l.s, 0, l.r - l.l), pad = (l.b - l.t) * .4 + 4, B = 99999;
  if (k === 0) return `polygon(${-B}px ${-B}px,${x}px ${-B}px,${x}px ${l.b + pad}px,${-B}px ${l.b + pad}px)`;
  const cut = (L[k - 1].b + l.t) / 2;
  return `polygon(${-B}px ${-B}px,${B}px ${-B}px,${B}px ${cut}px,${x}px ${cut}px,${x}px ${l.b + pad}px,${-B}px ${l.b + pad}px)`;
}

/* ---------- engine ---------- */
export function startBuild(opt) {
  const phone = innerWidth < 700, fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const roster = [
    { name: 'kopi', color: '#ff4a1c', main: true, from: [-40, .38] },
    { name: 'Domi', color: '#5b84ff', main: true, from: [1.04, .3] },
    { color: '#e7c36a', from: [.2, 1.08] },
    { color: '#63c79f', from: [.8, 1.08] },
    { color: '#b993ff', from: [.5, 1.1] },
    { color: '#86d3e6', from: [-40, .9] }
  ].slice(0, phone ? 3 : fine ? 6 : 4);
  const speedBase = phone ? 1.25 : 1;

  // layers
  const raw = [];
  document.querySelectorAll(ROOTS).forEach(r => collect(r, raw));
  const sy0 = scrollY;
  raw.forEach(l => {
    const r = l.el.getBoundingClientRect();
    l.fixed = !!l.el.closest('.ui,.ui-b');
    l.top = l.fixed ? r.top - 200 : r.top + sy0; l.left = r.left;
    if (l.el.closest('.hero__title')) l.owner = 'kopi';
  });
  raw.sort((a, b) => (a.top - b.top) || (a.left - b.left));
  const wmR = raw.findIndex(l => l.el.closest('.hero__title'));
  raw.splice(wmR + 1, 0, { kind: 'sphere', owner: 'Domi', top: 0, left: 0, el: null });
  const queue = raw.slice(), total = raw.length;
  const built = [];
  let doneN = 0, live = false, sphereDone = false;

  // overlay
  const ov = document.createElement('div'); ov.className = 'bld'; ov.id = 'bld'; ov.setAttribute('aria-hidden', 'true');
  ov.innerHTML = `<canvas class="bld__rt"></canvas><canvas class="bld__rl"></canvas><svg class="bld__pen"><g></g></svg>`;
  document.body.appendChild(ov);
  const penG = ov.querySelector('.bld__pen g');
  const rulers = !phone && fine && innerWidth >= 900;
  const rt = ov.querySelector('.bld__rt'), rl = ov.querySelector('.bld__rl');
  if (!rulers) { rt.remove(); rl.remove(); }

  // bottom bar
  const bar = document.createElement('div'); bar.className = 'bb mono';
  bar.innerHTML = `<span class="bb__av">${roster.filter(a => a.main).map(a => `<i style="--c:${a.color}">${a.name[0].toUpperCase()}</i>`).join('')}<i class="bb__more">+${roster.length - 2}</i></span>
<span class="bb__txt"><span class="bb__who">kopi és Domi dolgozik</span><span class="bb__n"><b>0</b> / ${total} réteg</span></span>
<span class="bb__bar"><i></i></span>
<button type="button" class="bb__snd" aria-pressed="false"><span class="eq"><i></i><i></i><i></i></span><span class="bb__sl">Hang ki</span></button>
<button type="button" class="bb__skip">Átugrom</button>`;
  document.body.appendChild(bar);
  const bN = bar.querySelector('.bb__n b'), bP = bar.querySelector('.bb__bar i'), bWho = bar.querySelector('.bb__who');
  const bSnd = bar.querySelector('.bb__snd');
  bSnd.addEventListener('click', () => sound.toggle());
  const bSl = bSnd.querySelector('.bb__sl');
  sound.sub(on => { bSnd.setAttribute('aria-pressed', on); bSnd.classList.toggle('on', on); bSl.textContent = on ? 'Hang be' : 'Hang ki'; });
  bar.querySelector('.bb__skip').addEventListener('click', () => goLive(true));
  addEventListener('keydown', e => { if (e.key === 'Escape') goLive(true); });
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (a && !live) goLive(true); }, true);

  // agents
  const agents = roster.map(a => {
    const el = document.createElement('div'); el.className = 'ba' + (a.main ? ' ba--main' : ''); el.style.setProperty('--c', a.color);
    el.innerHTML = ICONS + (a.main ? `<span class="ba__n">${a.name}</span>` : '');
    ov.appendChild(el);
    const x = a.from[0] < 0 ? a.from[0] : a.from[0] * innerWidth, y = a.from[1] * innerHeight;
    return { ...a, el, x, y, mode: '', plan: null, step: 0, t0: 0, rest: { x: innerWidth * (.25 + Math.random() * .5), y: innerHeight * (.35 + Math.random() * .4) }, idleT: 0 };
  });
  agents.forEach(a => setMode(a, 'arrow'));
  function say(a, text, ms = 2000) {
    if (!a.main) return;
    const b = document.createElement('span'); b.className = 'ba__say'; b.textContent = text; a.el.appendChild(b);
    setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 400); }, ms);
  }
  function setMode(a, m) { if (a.mode !== m) { a.mode = m; a.el.dataset.m = m; } }

  // selection boxes
  function makeSel(color, badge) {
    const s = document.createElement('div'); s.className = 'bs'; s.style.setProperty('--c', color);
    s.innerHTML = '<i></i><i></i><i></i><i></i>' + (badge ? '<b></b>' : '');
    ov.appendChild(s); return s;
  }
  function placeSel(s, x, y, w, h, label) {
    s.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    s.style.width = Math.max(0, w).toFixed(1) + 'px'; s.style.height = Math.max(0, h).toFixed(1) + 'px';
    if (label && s.lastChild.tagName === 'B') { const t = `${Math.round(w)} × ${Math.round(h)}`; if (s._t !== t) { s._t = t; s.lastChild.textContent = t; } }
  }
  function dropSel(s, delay = 0) { setTimeout(() => { s.classList.add('out'); setTimeout(() => s.remove(), 420); }, delay); }

  // smart guide to an already built layer with the same left edge
  function guideFor(r, color) {
    let best = null;
    for (let i = built.length - 1; i >= Math.max(0, built.length - 40); i--) {
      const b = built[i]; if (!b.el || !b.el.isConnected) continue;
      const q = b.el.getBoundingClientRect();
      if (Math.abs(q.left - r.left) < 1.5 && q.bottom <= r.top + 1 && r.top - q.bottom < innerHeight && (!best || q.bottom > best.bottom)) best = q;
    }
    if (!best || r.top - best.bottom < 14) return null;
    const g = document.createElement('div'); g.className = 'bg'; g.style.setProperty('--c', color);
    g.style.transform = `translate(${r.left - .5}px,${best.bottom}px)`; g.style.height = (r.top - best.bottom) + 'px';
    ov.appendChild(g); return g;
  }

  function reveal(l, instant) {
    if (l.done) return; l.done = true; doneN++;
    if (l.kind === 'sphere') { finishSphere(); }
    else {
      l.el.classList.add(l.kind === 'box' ? 'b-on' : 'b-tx');
      const lk = l.el.parentElement && l.el.parentElement.closest('a,button'); if (lk) lk.classList.add('b-on');
      if (!instant && l.kind !== 'text') l.el.animate({ opacity: [0, 1] }, { duration: l.kind === 'media' ? 420 : 260, easing: 'ease-out' });
    }
    built.push(l);
    bN.textContent = doneN; bP.style.transform = `scaleX(${(doneN / total).toFixed(4)})`;
  }
  function finishSphere() {
    if (sphereDone) return; sphereDone = true;
    opt.onScene && opt.onScene();
  }

  /* ---- plans: a list of steps, each {d, run(t, r), end(r)} ---- */
  const frameRects = new Map();
  const R = el => { let r = frameRects.get(el); if (!r) { r = el.getBoundingClientRect(); frameRects.set(el, r); } return r; };

  function moveStep(a, target, mode = 'arrow') {
    let sx, sy, d;
    return {
      init(r) { sx = a.x; sy = a.y; const p = target(r); d = clamp(Math.hypot(p.x - sx, p.y - sy) / 2.1, 170, 620); return d; },
      run(t, r) {
        const p = target(r), e = eio(t), k = Math.sin(Math.PI * t) * Math.min(60, Math.hypot(p.x - sx, p.y - sy) * .12);
        const dx = p.x - sx, dy = p.y - sy, n = Math.hypot(dx, dy) || 1;
        a.x = lerp(sx, p.x, e) - dy / n * k; a.y = lerp(sy, p.y, e) + dx / n * k; setMode(a, mode);
      }
    };
  }

  function planBox(a, l) {
    const el = l.el; let sel = null, g = null; const dur = clamp(Math.sqrt((R(el).width * R(el).height)) * 1.4, 260, 640);
    return [
      moveStep(a, r => ({ x: r.left, y: r.top }), 'arrow'),
      { init() { setMode(a, 'cross'); sound.down(); sound.drag(dur / 1000 / spd()); sel = makeSel(a.color, true); g = guideFor(R(el), a.color); return dur; },
        run(t, r) { const e = eout(t); a.x = r.left + r.width * e; a.y = r.top + r.height * e; placeSel(sel, r.left, r.top, r.width * e, r.height * e, true); } },
      { init() { sound.up(); reveal(l); sel.classList.add('set'); return 240; },
        run(t, r) { a.x = r.right; a.y = r.bottom; placeSel(sel, r.left, r.top, r.width, r.height, true); },
        end() { dropSel(sel, 120); g && dropSel(g); } }
    ];
  }

  function planText(a, l) {
    const el = l.el; let sel = null, g = null, L = null, n = 0, lastN = -1, dur = 0;
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) || 16;
    const chars = Math.max(1, el.textContent.replace(/\s+/g, ' ').trim().length);
    const per = fs > 60 ? 95 : fs > 26 ? 38 : fs > 15 ? 15 : 12;
    dur = clamp(chars * per, 240, fs > 60 ? 1500 : 1700);
    return [
      moveStep(a, r => ({ x: r.left, y: r.top }), 'arrow'),
      { init(r) { setMode(a, 'cross'); sound.down(); sel = makeSel(a.color, true); g = guideFor(R(el), a.color); if (a.name === 'kopi' && el.closest('#munkak') && el.matches('.h-big')) say(a, 'ez a kedvencem'); if (a.name === 'Domi' && el.closest('#arak') && el.matches('.h-big')) say(a, 'árak, röviden'); return 150; },
        run(t, r) { const e = eout(t); a.x = r.left + r.width * e; a.y = r.top + r.height * e; placeSel(sel, r.left, r.top, r.width * e, r.height * e, true); } },
      { init(r) {
          sound.up(); L = textLines(el, r); n = L[L.length - 1].e;
          el.style.clipPath = clipAt(L, 0); el.classList.add('b-tx'); sel.classList.add('typing'); setMode(a, 'ibeam'); return dur;
        },
        run(t, r) {
          const c = Math.floor(t * chars); const p = c / chars * n;
          if (c !== lastN) { lastN = c; el.style.clipPath = clipAt(L, p); if (c > 0) keyTick(); }
          let k = L.findIndex(q => p < q.e); if (k < 0) k = L.length - 1; const q = L[k];
          a.x = r.left + q.l + clamp(p - q.s, 0, q.r - q.l) + 2; a.y = r.top + (q.t + q.b) / 2;
          a.el.style.setProperty('--s', clamp((q.b - q.t) / 22, .8, 3.2).toFixed(2));
          placeSel(sel, r.left, r.top, r.width, r.height, true);
        },
        end() { el.style.clipPath = ''; a.el.style.removeProperty('--s'); l.done || reveal(l, true); dropSel(sel, 80); g && dropSel(g); } }
    ];
  }
  let lastKey = 0; function keyTick() { const t = performance.now(); if (t - lastKey > 26) { lastKey = t; sound.key(); } }

  function planScene(a, l) {
    let p = null;
    return [
      moveStep(a, () => (p = opt.scene()), 'arrow'),
      { init() { say(a, 'mehet a fény', 1800); return 420; }, run(t) { const q = opt.scene(); a.x = q.x; a.y = q.y; } },
      { init() { sound.down(); a.el.classList.add('ba--click'); setTimeout(() => a.el.classList.remove('ba--click'), 380); reveal(l); return 700; }, run() {} }
    ];
  }

  function planFor(a, l) { return l.kind === 'sphere' ? planScene(a, l) : l.kind === 'text' ? planText(a, l) : planBox(a, l); }

  /* ---- picking work ---- */
  let backlog = 0;
  function spd() { return speedBase * (backlog > 22 ? 2.4 : backlog > 10 ? 1.6 : 1); }
  function pick(a) {
    const vh = innerHeight; let n = 0; backlog = 0;
    for (let i = 0; i < queue.length && n < 60; i++, n++) {
      const l = queue[i]; if (l.taken) continue;
      if (l.owner && l.owner !== a.name) continue;
      if (l.kind === 'sphere') {
        if (sphereReady()) { queue.splice(i, 1); l.taken = true; return l; }
        continue;
      }
      const r = R(l.el);
      if (r.bottom < -40 && !l.fixed) { queue.splice(i, 1); i--; reveal(l, true); continue; } // scrolled past: appears at once
      if (!l.fixed && r.top > vh * 1.02) break;
      queue.splice(i, 1); l.taken = true; return l;
    }
    return null;
  }
  // the line starts once the headline is typed
  function sphereReady() { return built.some(b => b.el && b.el.closest('.hero__title')); }

  /* ---- loop ---- */
  let raf = 0, prevSY = -1, idleWait = 0;
  const t0 = performance.now(); let tPrev = t0;
  function frame(now) {
    if (live) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(50, now - tPrev); tPrev = now;
    frameRects.clear();
    // reads: queue scan and active elements
    backlog = 0;
    for (let i = 0; i < Math.min(queue.length, 60); i++) { const l = queue[i]; if (l.kind === 'sphere') continue; const r = R(l.el); if (!l.fixed && r.top > innerHeight) break; backlog++; }
    for (const a of agents) {
      if (!a.plan && now - t0 > (a.main ? 250 : 650)) {
        const l = pick(a);
        if (l) { a.layer = l; a.plan = planFor(a, l); a.step = -1; }
      }
      if (a.layer && a.layer.el) R(a.layer.el);
    }
    // writes
    const s = spd();
    for (const a of agents) {
      if (a.plan) {
        let st = a.plan[a.step];
        if (a.step < 0 || now - a.t0 >= a.d) {
          if (st) { st.run && st.run(1, a.layer.el ? R(a.layer.el) : null); st.end && st.end(); }
          a.step++; st = a.plan[a.step];
          if (!st) { a.plan = null; a.layer = null; setMode(a, 'arrow'); a.rest = { x: a.x + (Math.random() - .5) * 160, y: clamp(a.y + 40 + Math.random() * 80, 80, innerHeight - 120) }; }
          else { a.t0 = now; a.d = (st.init ? st.init(a.layer.el ? R(a.layer.el) : null) : 300) / s; }
        }
        if (st) st.run(clamp((now - a.t0) / a.d), a.layer.el ? R(a.layer.el) : null);
      } else {
        // idle: drift a little
        const k = 1 - Math.exp(-dt / 700);
        a.x = lerp(a.x, a.rest.x, k); a.y = lerp(a.y, a.rest.y, k);
        if (Math.random() < dt / 2400) a.rest = { x: clamp(a.x + (Math.random() - .5) * 220, 40, innerWidth - 60), y: clamp(a.y + (Math.random() - .5) * 140, 90, innerHeight - 110) };
      }
      a.el.style.transform = `translate(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px)`;
    }
    // status
    const busy = agents.some(a => a.plan);
    if (!queue.length && !busy) { goLive(false); return; }
    const waiting = !busy && queue.length;
    if (waiting) idleWait += dt; else idleWait = 0;
    const msg = idleWait > 500 ? 'Görgess, építjük tovább' : 'kopi és Domi dolgozik';
    if (bWho.textContent !== msg) { bWho.textContent = msg; bar.classList.toggle('wait', idleWait > 500); }
    if (rulers && (scrollY !== prevSY || busy)) { prevSY = scrollY; drawRulers(); }
  }

  /* ---- rulers ---- */
  let rdpr = 1;
  function sizeRulers() {
    if (!rulers) return; rdpr = Math.min(2, devicePixelRatio || 1);
    rt.width = innerWidth * rdpr; rt.height = 20 * rdpr; rl.width = 20 * rdpr; rl.height = innerHeight * rdpr;
  }
  function drawRulers() {
    const sy = scrollY;
    [[rt, innerWidth, 0], [rl, innerHeight, sy]].forEach(([c, len, off], axis) => {
      const x = c.getContext('2d'); x.setTransform(rdpr, 0, 0, rdpr, 0, 0);
      x.clearRect(0, 0, axis ? 20 : len, axis ? len : 20);
      x.fillStyle = 'rgba(11,11,10,.86)'; x.fillRect(0, 0, axis ? 20 : len, axis ? len : 20);
      // active selections as bands
      for (const a of agents) if (a.layer && a.layer.el) { const r = R(a.layer.el); x.fillStyle = a.color + '33'; if (axis) x.fillRect(0, r.top, 20, r.height); else x.fillRect(r.left, 0, r.width, 20); }
      x.strokeStyle = 'rgba(241,240,234,.28)'; x.fillStyle = 'rgba(241,240,234,.5)'; x.font = '9px Martian, monospace'; x.lineWidth = 1;
      x.beginPath();
      const first = Math.floor(off / 10) * 10;
      for (let v = first; v < off + len; v += 10) {
        const p = Math.round(v - off) + .5, big = v % 100 === 0, h = big ? 20 : v % 50 === 0 ? 8 : 4;
        if (axis) { x.moveTo(20 - h, p); x.lineTo(20, p); } else { x.moveTo(p, 20 - h); x.lineTo(p, 20); }
        if (big && v) { if (axis) { x.save(); x.translate(10, p + 3); x.rotate(-Math.PI / 2); x.fillText(v, 0, 0); x.restore(); } else x.fillText(v, p + 3, 9); }
      }
      x.stroke();
    });
  }
  sizeRulers(); addEventListener('resize', () => { if (!live) sizeRulers(); });

  /* ---- going live ---- */
  function goLive(skipped) {
    if (live) return; live = true; cancelAnimationFrame(raf);
    queue.forEach(l => reveal(l, true)); queue.length = 0;
    agents.forEach(a => { if (a.layer && !a.layer.done) reveal(a.layer, true); });
    document.querySelectorAll('.b-tx').forEach(e => { e.style.clipPath = ''; });
    finishSphere();
    sound.live();
    bWho.textContent = skipped ? 'Kész' : 'Kész, ez már az élő oldal'; bar.classList.remove('wait'); bar.classList.add('done');
    ov.classList.add('out');
    agents.forEach((a, i) => a.el.animate({ opacity: [1, 0], transform: [a.el.style.transform, `translate(${a.x}px,${a.y + 30}px)`] }, { duration: 500, delay: i * 50, fill: 'forwards', easing: 'ease-in' }));
    html.classList.add('built');
    setTimeout(() => {
      html.classList.remove('building');
      document.querySelectorAll('.b-on,.b-tx').forEach(e => e.classList.remove('b-on', 'b-tx'));
      ov.remove();
      opt.onDone && opt.onDone();
    }, skipped ? 450 : 700);
    setTimeout(() => { bar.classList.add('gone'); setTimeout(() => bar.remove(), 700); }, skipped ? 700 : 2200);
  }

  raf = requestAnimationFrame(frame);
  return { goLive };
}
