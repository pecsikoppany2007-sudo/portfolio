// rough DOM-side smoothness: rich paths on, WebGL off (headless GL would lie), wheel through the page
const { chromium } = require('playwright');
const stub = `(()=>{const o=HTMLCanvasElement.prototype.getContext;let n=0;HTMLCanvasElement.prototype.getContext=function(t,...a){if(/webgl/.test(t)&&n++===0){return{getExtension:x=>x==='WEBGL_debug_renderer_info'?{UNMASKED_RENDERER_WEBGL:1}:null,getParameter:()=> 'ANGLE (Apple M1)'}}return o.call(this,t,...a)}})()`;
(async () => {
  const b = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(stub);
  const p = await ctx.newPage(); await p.goto('http://127.0.0.1:8200/?nobuild'); await p.waitForTimeout(3500);
  console.log(await p.evaluate(() => document.documentElement.className));
  await p.mouse.move(600, 400);
  await p.evaluate(() => { window.__f = []; let l = performance.now(); const t = n => { window.__f.push(n - l); l = n; requestAnimationFrame(t); }; requestAnimationFrame(t); });
  for (let i = 0; i < 110; i++) { await p.mouse.wheel(0, 100); await p.waitForTimeout(16); if (i % 10 === 0) await p.mouse.move(300 + i * 5, 300 + (i % 3) * 40, { steps: 3 }); }
  const r = await p.evaluate(() => { const f = window.__f.slice(2); return { frames: f.length, slow: f.filter(x => x > 25).length, max: Math.round(Math.max(...f)) }; });
  console.log(JSON.stringify(r));
  await b.close();
})();
