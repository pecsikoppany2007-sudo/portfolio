const { chromium } = require('playwright');
const fake = `(()=>{for(const C of [WebGLRenderingContext,WebGL2RenderingContext]){const g=C.prototype.getParameter;C.prototype.getParameter=function(p){if(p===0x9246)return 'ANGLE (Apple, Apple M1, OpenGL 4.1)';return g.call(this,p)}}})()`;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-gl=swiftshader','--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.addInitScript(fake);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8200/?3d&nobuild'); await p.waitForTimeout(12000);
  await p.mouse.move(300, 420); await p.mouse.move(900, 380, { steps: 25 });
  await p.screenshot({ path: '/tmp/v7/t0.jpg', quality: 60 });
  await p.waitForTimeout(700); await p.screenshot({ path: '/tmp/v7/t1.jpg', quality: 60 });
  const w = await p.evaluate(() => document.querySelector('#munkak').getBoundingClientRect().top + scrollY + (document.querySelector('#munkak').offsetHeight - 900) / 8); await p.evaluate(y => scrollTo(0, y), w); await p.waitForTimeout(3500); await p.mouse.move(700, 400, { steps: 8 }); await p.waitForTimeout(800); await p.screenshot({ path: '/tmp/v7/t2.jpg', quality: 60 });
  console.log(errs); await b.close();
})();
