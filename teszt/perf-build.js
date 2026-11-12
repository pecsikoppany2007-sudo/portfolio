// node teszt/perf-build.js [desk|phone] ; frame times while the page builds itself (WebGL off: headless GL is software and would lie)
const { chromium } = require('playwright');
const mode = process.argv[2] || 'desk', desk = mode === 'desk';
(async () => {
  const b = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  const ctx = await b.newContext(desk ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { window.__f = []; let l = 0; const t = n => { if (l) window.__f.push(n - l); l = n; requestAnimationFrame(t); }; requestAnimationFrame(t); });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  if (!desk) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto('http://127.0.0.1:8200/?build');
  await p.waitForTimeout(6000);
  for (let i = 0; i < 6; i++) { await p.evaluate(() => scrollBy(0, 500)); await p.waitForTimeout(900); }
  const r = await p.evaluate(() => { const f = window.__f.slice(30); return { frames: f.length, over25: f.filter(x => x > 25).length, over40: f.filter(x => x > 40).length, max: Math.round(Math.max(...f)), cls: document.documentElement.className }; });
  r.pct25 = (r.over25 / r.frames * 100).toFixed(1) + '%';
  console.log(mode, JSON.stringify(r));
  await b.close();
})();
