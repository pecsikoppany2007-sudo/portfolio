const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--disable-webgl'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8200/'); await p.waitForTimeout(3500);
  await p.click('a[href="#arak"]'); await p.waitForTimeout(2500);
  console.log(JSON.stringify(await p.evaluate(() => ({ cls: document.documentElement.className, top: Math.round(document.querySelector('#arak h2').getBoundingClientRect().top), vis: getComputedStyle(document.querySelector('.card')).visibility, bld: !!document.querySelector('#bld'), ss: sessionStorage.getItem('k3-built') }))));
  await p.reload(); await p.waitForTimeout(1500);
  console.log(await p.evaluate(() => document.documentElement.className), errs);
  await b.close();
})();
