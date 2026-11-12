// node teszt/shots.js <outdir> [desk|phone] ; needs server on :8200
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
  await p.goto('http://127.0.0.1:8200/?nobuild'); await p.waitForTimeout(desk ? 9000 : 7000);
  const info = await p.evaluate(() => ({ cls: document.documentElement.className, sw: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, secs: [...document.querySelectorAll('[data-s]')].map(s => [s.id || s.className, Math.round(s.getBoundingClientRect().top + scrollY)]) }));
  console.log(JSON.stringify(info));
  let n = 0;
  const shot = async (name) => { await p.screenshot({ path: `${out}/${mode}-${String(++n).padStart(2, '0')}-${name}.jpg`, quality: 70 }); };
  await shot('hero');
  const go = async (y, wait = 1400) => { await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(wait); };
  const top = id => info.secs.find(s => s[0] === id)[1];
  const vh = desk ? 900 : 844;
  await go(vh * .5); await shot('hero-out');
  await go(top('rolunk') + vh * .3, 2200); await shot('stmt');
  await go(top('munkak') - vh * .4); await shot('paper-rise');
  await go(top('munkak') + vh * .9);
  if (desk) { await p.mouse.move(700, 400); await p.mouse.move(720, 420, { steps: 5 }); await p.waitForTimeout(900); }
  await shot('works');
  await go(top('mit') - vh * .2); await shot('svc-enter');
  await go(top('mit') + vh * .2, 2000); await shot('svc-1');
  await go(top('mit') + vh * 1.6, 2000); await shot('svc-3');
  await go(top('menet') + vh * .5, 2000); await shot('proc');
  await go(top('arak') + vh * .6); await shot('prices');
  await go(top('kapcsolat') + vh * .1, 2000); await shot('contact');
  await go(99999, 1600); await shot('footer');
  console.log('errors', errs.slice(0, 5));
  await b.close();
})();
