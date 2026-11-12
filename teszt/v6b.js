const { chromium } = require('playwright');
const fake = `(()=>{for(const C of [WebGLRenderingContext,WebGL2RenderingContext]){const g=C.prototype.getParameter;C.prototype.getParameter=function(p){if(p===0x9246)return 'ANGLE (Apple, Apple M1, OpenGL 4.1)';return g.call(this,p)}}})()`;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-gl=swiftshader','--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(fake);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8200/?3d&nobuild');
  let i = 0; const shot = async (t) => { await p.waitForTimeout(t); await p.screenshot({ path: `/tmp/v6/b${i++}.jpg`, quality: 70 }); };
  await p.waitForTimeout(14000);
  await p.mouse.move(300, 700); await p.mouse.move(200, 690, { steps: 5 }); await shot(1200);
  const L = await p.evaluate(() => { const t = s => document.querySelector(s).getBoundingClientRect().top + scrollY; return { about: t('#rolunk'), arak: t('#arak') }; });
  const go = async (y, t) => { await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(y)); await shot(t); };
  await go(L.about + 150, 3000);
  await p.mouse.move(700, 500, { steps: 3 });
  await go(L.arak - 600, 2500);
  console.log(errs.slice(0, 5)); await b.close();
})();
