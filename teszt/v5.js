// node teszt/v5.js desk|phone  -> /tmp/v5/<mode>-N.jpg
const { chromium } = require('playwright');
const mode = process.argv[2] || 'desk';
const fake = `(()=>{for(const C of [WebGLRenderingContext,WebGL2RenderingContext]){const g=C.prototype.getParameter;C.prototype.getParameter=function(p){if(p===0x9246)return 'ANGLE (Apple, Apple M1, OpenGL 4.1)';return g.call(this,p)}}})()`;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-gl=swiftshader','--ignore-gpu-blocklist'] });
  const desk = mode === 'desk';
  const ctx = await b.newContext(desk ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ctx.addInitScript(fake);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8200/?3d');
  const shot = async (n, t = 2500) => { await p.waitForTimeout(t); await p.screenshot({ path: `/tmp/v5/${mode}-${n}.jpg`, quality: 72 }); };
  await p.waitForTimeout(3000); await p.screenshot({ path: `/tmp/v5/${mode}-0intro.jpg`, quality: 72 });
  await shot('1hero', 14000);
  if (desk) { await p.mouse.move(820, 380); await p.mouse.move(860, 400, { steps: 4 }); await shot('2hover', 3000); }
  const L = await p.evaluate(() => { const t = s => document.querySelector(s).getBoundingClientRect().top + scrollY; const w = document.querySelector('#munkak'); return { w0: t('#munkak'), wl: w.offsetHeight - innerHeight, about: t('#rolunk'), menet: t('#menet'), arak: t('#arak'), contact: t('#kapcsolat'), vh: innerHeight, pin: document.documentElement.className }; });
  console.log(JSON.stringify(L));
  const go = async (y, n, t) => { await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(y)); await shot(n, t); };
  if (desk) {
    await go(L.w0 * .5, '3dive', 4000);
    await go(L.w0 + 2, '4p0', 6000);
    await p.mouse.move(700, 430, { steps: 3 }); await shot('5lens', 3000);
    await go(L.w0 + L.wl * (3.3 / 8), '6p3', 6000);
    await go(L.w0 + L.wl * (3.85 / 8), '6p3mid', 3000);
  } else {
    await go(L.w0 + 200, '3works', 3000);
  }
  await go(L.about + 50, '7about', 7000);
  await go(L.menet, '8menet', 4000);
  await go(L.arak + 100, '9arak', 2000);
  await go(L.contact, '10contact', 7000);
  if (errs.length) console.log('ERR', errs.slice(0, 5));
  await b.close();
})();
