// node teszt/one.js out.jpg desk|phone scrollY [wait]
const { chromium } = require('playwright');
const [out, mode = 'desk', y = '0', wait = '11000'] = process.argv.slice(2);
const fake = `(()=>{for(const C of [WebGLRenderingContext,WebGL2RenderingContext]){const g=C.prototype.getParameter;C.prototype.getParameter=function(p){if(p===0x9246)return 'ANGLE (Apple, Apple M1, OpenGL 4.1)';return g.call(this,p)}}})()`;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-gl=swiftshader','--ignore-gpu-blocklist'] });
  const desk = mode === 'desk';
  const ctx = await b.newContext(desk ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ctx.addInitScript(fake);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8200/?nobuild'); await p.waitForTimeout(+wait);
  if (+y) { await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), +y); await p.waitForTimeout(3000); }
  await p.screenshot({ path: out, quality: 75 }); if (errs.length) console.log(errs); await b.close();
})();
