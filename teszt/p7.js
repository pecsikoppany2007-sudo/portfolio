const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-gl=swiftshader','--ignore-gpu-blocklist'] });
  const c2 = await b.newContext({ ...devices['iPhone 13'] }); await c2.addInitScript(`(()=>{for(const C of [WebGLRenderingContext,WebGL2RenderingContext]){const g=C.prototype.getParameter;C.prototype.getParameter=function(p){if(p===0x9246)return 'Apple GPU';return g.call(this,p)}}})()`); const q = await c2.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message));
  await q.goto('http://127.0.0.1:8200/?nobuild'); await q.waitForTimeout(6000);
  const st = await q.evaluate(() => [...document.querySelectorAll('#menet .proc__list li')].map(li => li.getBoundingClientRect().top + scrollY + li.offsetHeight / 2));
  for (const [k, y] of [[0, st[0]], [3, st[3]]]) { await q.evaluate(y => window.scrollTo(0, y), y - 420); await q.waitForTimeout(5000); await q.screenshot({ path: `/tmp/v7/q${k}.jpg`, quality: 50 }); }
  console.log(st, e2, JSON.stringify(await q.evaluate(() => window.__kd()))); await b.close();
})();
