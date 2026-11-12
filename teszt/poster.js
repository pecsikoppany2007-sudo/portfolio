const { chromium } = require('playwright');
const fake = `(()=>{for(const C of [WebGLRenderingContext,WebGL2RenderingContext]){const g=C.prototype.getParameter;C.prototype.getParameter=function(p){if(p===0x9246)return 'ANGLE (Apple, Apple M1, OpenGL 4.1)';return g.call(this,p)}}})()`;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-gl=swiftshader','--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'no-preference' }); await ctx.addInitScript(fake);
  const p = await ctx.newPage(); await p.goto('http://127.0.0.1:8200/?nobuild'); await p.waitForTimeout(45000);
  await p.addStyleTag({ content: 'section,.ui,.ui-b,.crew,.cur,.snd,.tip,.ft{visibility:hidden!important} body::after{display:none!important}' });
  await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/claude-0/poster.png' }); await b.close();
})();
