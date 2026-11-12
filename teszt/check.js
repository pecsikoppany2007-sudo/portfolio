// layout overflow at many widths, no-WebGL + reduced-motion fallbacks, menu links land on headings
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  for (const [w, h] of [[320, 640], [375, 700], [768, 1024], [1024, 768], [1280, 800], [1920, 1080]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('http://127.0.0.1:8200/?nobuild'); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => {
      const bad = [...document.querySelectorAll('h1,h2,h3,.wl__n,.card__p b,.biglink,.stats b,.proc__n')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).display !== 'inline'; }).map(e => e.className || e.tagName);
      return { sw: document.documentElement.scrollWidth, cls: document.documentElement.className, bad };
    });
    console.log(w, JSON.stringify(r));
    if (w === 320 || w === 1280) await p.screenshot({ path: `${out}/nogl-${w}.jpg`, quality: 60 });
    await p.close();
  }
  const p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await p.goto('http://127.0.0.1:8200/?nobuild'); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/reduced.jpg`, quality: 60 });
  for (const id of ['munkak', 'mit', 'menet', 'arak', 'kapcsolat']) {
    await p.click(`a[href="#${id}"]`).catch(() => p.evaluate(i => document.getElementById(i).scrollIntoView(), id));
    await p.waitForTimeout(900);
    const r = await p.evaluate(i => { const s = document.getElementById(i); const hd = s.querySelector('h2'); const t = hd.getBoundingClientRect(); const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return { top: Math.round(s.getBoundingClientRect().top), hTop: Math.round(t.top), hidden: getComputedStyle(hd).opacity, center: el && (el.className || el.tagName) }; }, id);
    console.log('link', id, JSON.stringify(r));
  }
  await b.close();
})();
