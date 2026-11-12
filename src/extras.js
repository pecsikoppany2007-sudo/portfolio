// kettő v6 – smaller moments around the dot field: kopi and Domi stay on the page as two cursors,
// big headings swell under the pointer, kopi selects the about text as you read.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2.5v17.2l4.6-4.3 3 6.4 3-1.3-3-6.3h6.3z"/></svg>';
const IBEAM = '<svg class="gc__ib" viewBox="0 0 24 24" aria-hidden="true"><path class="u" d="M8 3.5h8M8 20.5h8M12 3.5v17"/><path d="M8 3.5h8M8 20.5h8M12 3.5v17"/></svg>';

export function guestCursor(name, color, parent = document.body) {
  const el = document.createElement('div');
  el.className = 'gc'; el.setAttribute('aria-hidden', 'true'); el.style.setProperty('--c', color);
  el.innerHTML = ARROW + IBEAM + `<span class="gc__n">${name}</span>`;
  parent.appendChild(el);
  let bubble = null;
  return {
    el,
    at(x, y) { el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; },
    show(v) { el.style.opacity = v.toFixed(3); },
    mode(m) { if (el.dataset.m !== m) el.dataset.m = m; },
    say(t, ms = 2600) {
      if (bubble) bubble.remove();
      bubble = document.createElement('span'); bubble.className = 'gc__say'; bubble.textContent = t; el.appendChild(bubble);
      const b = bubble; setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 400); }, ms);
    }
  };
}

/* ---------- headings that swell under the pointer (variable Unbounded) ---------- */
export function proximity(sel) {
  let items = [];
  function wrap() {
    items = [];
    $$(sel).forEach(el => {
      const chars = [];
      $$('.ln__i', el).forEach(line => {
        const t = line.textContent; line.textContent = '';
        [...t].forEach(ch => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; line.appendChild(s); if (ch.trim()) chars.push({ s, w: 0 }); });
      });
      const base = parseFloat(getComputedStyle(el).fontWeight) || 300;
      items.push({ el, chars, base, on: false });
    });
    measure();
  }
  function measure() {
    items.forEach(it => {
      const r = it.el.getBoundingClientRect();
      it.chars.forEach(c => { const q = c.s.getBoundingClientRect(); c.x = q.left - r.left + q.width / 2; c.y = q.top - r.top + q.height / 2; });
      it.R = Math.max(160, Math.min(320, r.height * 1.6));
    });
  }
  function tick(px, py, active) {
    // reads
    const vh = innerHeight;
    for (const it of items) { const r = it.el.getBoundingClientRect(); it.r = r; it.vis = r.bottom > -50 && r.top < vh + 50; }
    // writes
    for (const it of items) {
      if (!it.vis && !it.on) continue;
      if (document.documentElement.classList.contains('building') && (!it.el.classList.contains('b-tx') || it.el.style.clipPath)) continue;
      let any = false;
      for (const c of it.chars) {
        let k = 0;
        if (active && it.vis) { const d = Math.hypot(px - (it.r.left + c.x), py - (it.r.top + c.y)); k = clamp(1 - d / it.R); k = k * k * (3 - 2 * k); }
        const w = Math.round(it.base + (820 - it.base) * k);
        if (Math.abs(w - c.w) >= 4 || (w === it.base && c.w !== it.base)) { c.w = w; c.s.style.fontWeight = w; }
        if (k > 0) any = true;
      }
      it.on = any;
    }
  }
  return { wrap, measure, tick };
}

/* ---------- kopi selects the about text while you read ---------- */
export function selection(el, cursor) {
  const words = [];
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType !== 3) return;
      const parts = n.textContent.split(/(\s+)/); const frag = document.createDocumentFragment();
      for (let i = 0; i < parts.length; i++) {
        const w = parts[i]; if (!w) continue;
        if (/^\s+$/.test(w)) { if (words.length) words[words.length - 1].textContent += ' '; else frag.appendChild(document.createTextNode(w)); continue; }
        const s = document.createElement('span'); s.className = 'w'; s.textContent = w; frag.appendChild(s); words.push(s);
      }
      n.replaceWith(frag);
    });
  };
  walk(el);
  cursor.mode('ibeam');
  let n = 0, shown = 0, said = false;
  return {
    set(p, dt) {
      const want = Math.round(clamp(p) * words.length);
      if (want !== n) {
        if (want > n) for (let i = n; i < want; i++) words[i].classList.add('sel');
        else for (let i = want; i < n; i++) words[i].classList.remove('sel');
        n = want;
      }
      const vis = n > 0 && n < words.length ? 1 : 0;
      shown += (vis - shown) * (1 - Math.exp(-dt / .18));
      cursor.show(shown);
      if (n > 0) {
        const r = words[n - 1].getClientRects(); const q = r[r.length - 1];
        if (q) { cursor.at(q.right - 4, q.top + q.height / 2); cursor.el.style.setProperty('--s', clamp(q.height / 24, .9, 2).toFixed(2)); }
        if (!said && n > 3) { said = true; cursor.say('ezt mi írtuk', 2200); }
      }
    },
    get count() { return words.length; }
  };
}

/* ---------- the helpers follow your cursor like a small crew ---------- */
export function flock() {
  const COLORS = ['#e7c36a', '#63c79f', '#b993ff', '#86d3e6'];
  const H = COLORS.map((c, i) => {
    const g = guestCursor('', c); g.el.classList.add('gc--helper'); g.el.querySelector('.gc__n').remove();
    const a = -2.3 + i * 1.15;
    return { g, x: -60, y: innerHeight * (.3 + i * .15), vx: 0, vy: 0, a, d: 54 + i * 17, k: 26 - i * 4.5, op: 0, rest: { x: i % 2 ? innerWidth - 70 : 70, y: innerHeight * (.25 + i * .17) } };
  });
  let kick = 0, lastX = 0, lastY = 0, mvx = 0, mvy = 0;
  addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; kick = 1; H.forEach(h => { const dx = h.x - e.clientX, dy = h.y - e.clientY, n = Math.hypot(dx, dy) || 1; h.vx += dx / n * 900; h.vy += dy / n * 900; }); });
  return {
    tick(dt, px, py, inside, idle, hide) {
      // pointer velocity, smoothed
      const ivx = (px - lastX) / Math.max(dt, .001), ivy = (py - lastY) / Math.max(dt, .001); lastX = px; lastY = py;
      mvx += (ivx - mvx) * (1 - Math.exp(-dt / .2)); mvy += (ivy - mvy) * (1 - Math.exp(-dt / .2));
      const sp = Math.hypot(mvx, mvy), back = clamp(sp / 900);
      const away = !inside || idle > 7;
      H.forEach((h, i) => {
        let tx, ty;
        if (away) { tx = h.rest.x; ty = h.rest.y; }
        else {
          // a loose ring when you stop, a trail behind you when you move
          const ra = h.a + Math.sin(performance.now() / 1400 + i) * .25;
          const rx = Math.cos(ra) * h.d, ry = Math.sin(ra) * h.d * .8;
          const bx = -mvx / (sp || 1) * h.d * 1.3, by = -mvy / (sp || 1) * h.d * 1.3;
          tx = px + rx * (1 - back) + bx * back + 14; ty = py + ry * (1 - back) + by * back + 18;
        }
        const k = away ? 3 : h.k, damp = 2 * Math.sqrt(k) * .9;
        h.vx += ((tx - h.x) * k - h.vx * damp) * dt; h.vy += ((ty - h.y) * k - h.vy * damp) * dt;
        h.x += h.vx * dt; h.y += h.vy * dt;
        const want = hide ? 0 : away ? .3 : .9;
        h.op += (want - h.op) * (1 - Math.exp(-dt / .4));
        h.g.at(h.x, h.y); h.g.show(h.op);
      });
    }
  };
}
