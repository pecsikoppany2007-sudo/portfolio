// node teszt/v6.js -> /tmp/v6/N.jpg (desktop, build mode)
const { chromium } = require('playwright');
const fake = `(()=>{for(const C of [WebGLRenderingContext,WebGL2RenderingContext]){const g=C.prototype.getParameter;C.prototype.getParameter=function(p){if(p===0x9246)return 'ANGLE (Apple, Apple M1, OpenGL 4.1)';return g.call(this,p)}}})()`;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-gl=swiftshader','--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(fake);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8200/?3d&build');
  let i = 0; const shot = async (t) => { await p.waitForTimeout(t); await p.screenshot({ path: `/tmp/v6/${String(i++).padStart(2,'0')}.jpg`, quality: 70 }); };
  await shot(2500); await shot(2500); await shot(3000); await shot(9000);
  await p.mouse.move(400, 300); await p.mouse.move(1000, 260, { steps: 6 }); await shot(800);
  const L = await p.evaluate(() => { const t = s => document.querySelector(s).getBoundingClientRect().top + scrollY; const w = document.querySelector('#munkak'); return { w0: t('#munkak'), wl: w.offsetHeight - innerHeight, about: t('#rolunk'), arak: t('#arak'), contact: t('#kapcsolat') }; });
  const go = async (y, t) => { await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(y)); await shot(t); };
  await go(L.w0 + 2, 7000);
  await p.mouse.move(1300, 120); await shot(4500);
  await go(L.about - 300, 5000);
  await go(L.about + 150, 3500);
  await go(L.arak - 450, 2500);
  await go(L.contact, 5000);
  console.log(errs.slice(0, 5));
  await b.close();
})();
