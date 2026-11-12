// node teszt/v8.js <outdir> <name:y,name:y,...> [wait] ; desktop rich mode with software GL, one shot per scroll position
// y may be a number (px) or w<k> (work k settled), c<p> (town progress 0..1)
const { chromium } = require('playwright');
const [out, list, wait = '2600'] = process.argv.slice(2);
const fake = `(()=>{for(const C of [WebGLRenderingContext,WebGL2RenderingContext]){const g=C.prototype.getParameter;C.prototype.getParameter=function(p){if(p===0x9246)return 'ANGLE (Apple, Apple M1, OpenGL 4.1)';return g.call(this,p)}}})()`;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: +(process.env.W || 1440), height: +(process.env.H || 820) } });
  await ctx.addInitScript(fake);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 300)); });
  await p.goto('http://127.0.0.1:8200/?nobuild'); await p.mouse.move(720, 400); await p.mouse.wheel(0, 1); await p.waitForTimeout(9000);
  console.log(await p.evaluate(() => document.documentElement.className));
  for (const it of list.split(',')) {
    const [name, yy, kg] = it.split(':');
    await p.evaluate(g => { window.__kg = g; }, +kg || 0);
    const y = await p.evaluate(v => {
      const top = el => el.getBoundingClientRect().top + scrollY, w = document.querySelector('#munkak'), c = document.querySelector('#kapcsolat');
      if (v[0] === 'w') return top(w) + (w.offsetHeight - innerHeight) * (parseFloat(v.slice(1)) + .3) / 8;
      if (v[0] === 'c') return top(c) + (c.offsetHeight - innerHeight) * parseFloat(v.slice(1));
      return +v;
    }, yy);
    await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
    await p.waitForTimeout(+wait);
    await p.screenshot({ path: `${out}/${name}.jpg`, quality: 70 });
  }
  console.log('errors', errs.slice(0, 6));
  await b.close();
})();
