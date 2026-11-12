// node teszt/build.js <outdir> [desk|phone] ; needs server on :8200 — frames of the self-building intro
const { chromium } = require('playwright');
const out = process.argv[2], mode = process.argv[3] || 'desk';
const fake = `(()=>{for(const C of [WebGLRenderingContext,WebGL2RenderingContext]){const g=C.prototype.getParameter;C.prototype.getParameter=function(p){if(p===0x9246)return 'ANGLE (Apple, Apple M1, OpenGL 4.1)';return g.call(this,p)}}})()`;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const desk = mode === 'desk';
  const ctx = await b.newContext(desk ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(fake);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8200/');
  const t0 = Date.now(); let n = 0;
  const shot = async name => { await p.screenshot({ path: `${out}/${mode}-${String(++n).padStart(2, '0')}-${name}.jpg`, quality: 60 }); };
  for (const t of (process.env.T || '700,1500,2500,3600,5000,7000').split(',').map(Number)) { await p.waitForTimeout(Math.max(0, t - (Date.now() - t0))); await shot('t' + t); }
  const st = await p.evaluate(() => ({ cls: document.documentElement.className, bar: document.querySelector('.bb') && document.querySelector('.bb').innerText.replace(/\n/g, ' | ') }));
  console.log(JSON.stringify(st));
  for (let i = 1; i <= (+process.env.S || 3); i++) {
    await p.mouse.wheel(0, desk ? 700 : 600); if (!desk) await p.evaluate(() => scrollBy(0, 600));
    await p.waitForTimeout(1200); await shot('s' + i + 'a'); await p.waitForTimeout(1600); await shot('s' + i + 'b');
  }
  const st2 = await p.evaluate(() => ({ cls: document.documentElement.className, bar: document.querySelector('.bb') && document.querySelector('.bb').innerText.replace(/\n/g, ' | ') }));
  console.log(JSON.stringify(st2));
  if (process.env.SKIP) { await p.click('.bb__skip'); await p.waitForTimeout(1500); await shot('skip'); console.log(await p.evaluate(() => document.documentElement.className)); }
  console.log('errors', errs.slice(0, 5));
  await b.close();
})();
