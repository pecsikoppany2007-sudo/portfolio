// node teszt/v8-final.js <outdir> ; needs the server on :8200. One pass before delivery:
// desktop rich mode (reel click-through, list jump, contact link, building intro), phone, no-WebGL widths, reduced motion.
const { chromium, devices } = require('playwright');
const out = process.argv[2];
const fake = r => `(()=>{for(const C of [WebGLRenderingContext,WebGL2RenderingContext]){const g=C.prototype.getParameter;C.prototype.getParameter=function(p){if(p===0x9246)return '${r}';return g.call(this,p)}}})()`;
const GL = ['--enable-unsafe-swiftshader', '--use-gl=swiftshader', '--ignore-gpu-blocklist'];
const watch = (p, errs) => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); }); };
(async () => {
  // 1. desktop
  let b = await chromium.launch({ args: GL });
  let ctx = await b.newContext({ viewport: { width: 1440, height: 820 } }); await ctx.addInitScript(fake('ANGLE (Apple, Apple M1, OpenGL 4.1)'));
  let p = await ctx.newPage(); let errs = []; watch(p, errs);
  await p.goto('http://127.0.0.1:8200/?nobuild'); await p.mouse.move(720, 400); await p.mouse.wheel(0, 1); await p.waitForTimeout(8000);
  const y0 = await p.evaluate(() => { const w = document.querySelector('#munkak'); return w.getBoundingClientRect().top + scrollY + (w.offsetHeight - innerHeight) * 2.3 / 8; });
  await p.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y0); await p.waitForTimeout(7000);
  const a = await p.evaluate(() => ({ on: [...document.querySelectorAll('#rl li')].findIndex(l => l.classList.contains('on')), frame: document.querySelector('#rb').className, rb: document.querySelector('#rb').getBoundingClientRect().width | 0 }));
  await p.mouse.move(800, 420, { steps: 4 }); await p.waitForTimeout(1500); await p.mouse.click(800, 420); await p.waitForTimeout(6000);
  const c1 = await p.evaluate(() => ({ open: !document.querySelector('#case').hidden, name: document.querySelector('#casename').textContent }));
  await p.screenshot({ path: `${out}/f-case.jpg`, quality: 60 });
  await p.keyboard.press('Escape'); await p.waitForTimeout(3000);
  await p.click('#rl li:nth-child(6) button'); await p.waitForTimeout(9000);
  const a2 = await p.evaluate(() => [...document.querySelectorAll('#rl li')].findIndex(l => l.classList.contains('on')));
  await p.click('a.pill[href="#kapcsolat"]'); await p.waitForTimeout(12000);
  const c2 = await p.evaluate(() => { const i = document.querySelector('#contactin'), h = document.querySelector('.h-contact').getBoundingClientRect(); return { clip: i.style.clipPath, vis: i.style.visibility, hTop: h.top | 0, atEnd: Math.abs(scrollY + innerHeight - (document.querySelector('#kapcsolat').getBoundingClientRect().bottom + scrollY)) < 4 }; });
  await p.screenshot({ path: `${out}/f-contact.jpg`, quality: 60 });
  console.log('desk', JSON.stringify({ a, c1, a2, c2 }), errs.slice(0, 4));
  await p.close();
  p = await ctx.newPage(); errs = []; watch(p, errs);
  await p.goto('http://127.0.0.1:8200/?build'); await p.waitForTimeout(9000);
  console.log('build', await p.evaluate(() => document.documentElement.className), errs.slice(0, 4));
  await ctx.close();
  // 2. phone
  ctx = await b.newContext({ ...devices['iPhone 13'] }); await ctx.addInitScript(fake('Apple GPU'));
  p = await ctx.newPage(); errs = []; watch(p, errs);
  await p.goto('http://127.0.0.1:8200/?nobuild'); await p.waitForTimeout(6000);
  const top = await p.evaluate(() => document.querySelector('#munkak').getBoundingClientRect().top + scrollY);
  await p.evaluate(y => scrollTo(0, y), top + 300); await p.waitForTimeout(700); await p.screenshot({ path: `${out}/f-ph1.jpg`, quality: 55 });
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/f-ph2.jpg`, quality: 55 });
  await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(4000); await p.screenshot({ path: `${out}/f-ph3.jpg`, quality: 55 });
  console.log('phone', JSON.stringify(await p.evaluate(() => ({ cls: document.documentElement.className, sw: document.documentElement.scrollWidth, iw: innerWidth, cap: getComputedStyle(document.querySelector('#citycap')).position, cH: document.querySelector('#kapcsolat').offsetHeight }))), errs.slice(0, 4));
  await b.close();
  // 3. no WebGL, many widths + reduced motion
  b = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  for (const [w, h] of [[320, 640], [375, 700], [768, 1024], [1024, 768], [1280, 800], [1920, 1080]]) {
    p = await b.newPage({ viewport: { width: w, height: h } }); errs = []; watch(p, errs);
    await p.goto('http://127.0.0.1:8200/?nobuild'); await p.waitForTimeout(2000);
    await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cH: document.querySelector('#kapcsolat').offsetHeight, hc: document.querySelector('.h-contact').getBoundingClientRect().top | 0, pin: document.documentElement.classList.contains('pin') }));
    console.log('nogl', w, JSON.stringify(r), errs.slice(0, 2));
    if (w === 1280) await p.screenshot({ path: `${out}/f-nogl.jpg`, quality: 55 });
    await p.close();
  }
  p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }); errs = []; watch(p, errs);
  await p.goto('http://127.0.0.1:8200/'); await p.waitForTimeout(1500);
  await p.click('a.pill[href="#kapcsolat"]'); await p.waitForTimeout(1200);
  console.log('reduced', JSON.stringify(await p.evaluate(() => ({ cls: document.documentElement.className, hc: document.querySelector('.h-contact').getBoundingClientRect().top | 0 }))), errs.slice(0, 2));
  await b.close();
})();
