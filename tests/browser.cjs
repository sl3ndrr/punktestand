const {chromium} = require('playwright');
const {createServer} = require('node:http');
const {readFileSync, mkdirSync} = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');

const html = readFileSync(path.join(__dirname, '../index.html'));
const server = createServer((req,res) => {
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
  res.end(html);
});
const fixture = count => ({mode:'low', players:Array.from({length:count}, (_,i) =>
  ({id:'pTest'+i, name:'Spieler '+(i+1), score:i === 0 ? -1234 : 999, amt:'', c:'#4f8cff'}))});

(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({reducedMotion:'reduce',viewport:{width:1194,height:834}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url);
    assert.equal(await page.locator('.card').count(),2);
    const first = () => page.locator('.card').first();
    const score = () => first().locator('.score').innerText();
    await first().getByRole('button',{name:'Plus 1',exact:true}).click();
    assert.equal(await score(),'1');
    await page.keyboard.press('Enter'); // Focus must survive the re-render.
    assert.equal(await score(),'2');
    await first().getByPlaceholder('Wert').fill('25');
    await first().getByPlaceholder('Wert').press('Enter');
    assert.equal(await score(),'27');
    await page.getByRole('button',{name:'Zurück',exact:true}).click();
    assert.equal(await score(),'2');
    await first().getByPlaceholder('Wert').fill('1.9');
    await first().getByRole('button',{name:'Wert addieren',exact:true}).click();
    assert.equal(await score(),'2');
    assert.match(await page.locator('#notice').innerText(),/ganze Zahl/);
    await first().getByPlaceholder('Wert').fill('9007199254740992');
    await first().getByRole('button',{name:'Wert addieren',exact:true}).click();
    assert.equal(await score(),'2');
    await first().getByRole('textbox',{name:'Name',exact:true}).fill('<img src=x>');
    await page.getByRole('button',{name:'Hoch gewinnt',exact:true}).click();
    assert.equal(await page.locator('[data-m="high"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#app img').count(),0);
    await page.reload();
    assert.equal(await score(),'2');
    assert.equal(await first().getByRole('textbox',{name:'Name',exact:true}).inputValue(),'<img src=x>');
    await page.getByRole('button',{name:'Neue Runde',exact:true}).click();
    assert.equal(await page.locator('.wrap').evaluate(el => el.inert),true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.a),'newgame');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.a),'close');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#ov').isVisible(),false);
    assert.equal(await page.evaluate(() => document.activeElement.id),'reset');
    await page.getByRole('button',{name:'+ Spieler hinzufügen',exact:true}).click();
    await page.locator('.del').evaluateAll(buttons => buttons.forEach(b => b.click()));
    assert.equal(await page.locator('.card').count(),2);
    await page.getByRole('button',{name:'Zurück',exact:true}).click();
    assert.equal(await page.locator('.card').count(),3);
    await page.getByRole('button',{name:'Neue Runde',exact:true}).click();
    await page.getByRole('button',{name:'Neue Runde starten',exact:true}).click();
    assert.deepEqual(await page.locator('.score').allTextContents(),['0','0','0']);
    // Invalid persisted data must not stop startup or inject markup/styles.
    for (const raw of ['{',JSON.stringify({players:[{},{}]}),JSON.stringify({...fixture(2),players:[{...fixture(2).players[0],id:'p"bad'},fixture(2).players[1]]})]) {
      await page.evaluate(raw => localStorage.setItem('punktestand-v1',raw),raw);
      await page.reload();
      assert.equal(await page.locator('.card').count(),2);
      assert.equal(await score(),'0');
    }
    const samples = [];
    mkdirSync('test-results',{recursive:true});
    for (const [width,height] of [[390,844],[768,1024],[820,1180],[834,1194],[1024,768],[1180,820],[1194,834],[1920,1080]]) {
      await page.setViewportSize({width,height});
      for (const count of [2,3,4,5,6,7,8]) {
        await page.evaluate(data => localStorage.setItem('punktestand-v1',JSON.stringify(data)),fixture(count));
        await page.reload();
        const metrics = await page.evaluate(() => ({
          width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
          scrollHeight:document.documentElement.scrollHeight,
          clipped:[...document.querySelectorAll('.score')].filter(el => el.scrollWidth > el.clientWidth + 1).length,
          overlap:[...document.querySelectorAll('.main')].filter(el => {
            const score=el.querySelector('.score').getBoundingClientRect(),main=el.getBoundingClientRect(),button=el.querySelector('.round').getBoundingClientRect();
            return score.top < main.top - 1 || score.bottom > main.bottom + 1 || (innerWidth >= 700 && score.bottom > button.top + 1);
          }).length,
          smallTargets:[...document.querySelectorAll('.round,.custom button')].filter(el => el.getBoundingClientRect().width < 44 || el.getBoundingClientRect().height < 44).length,
          columns:getComputedStyle(document.querySelector('#app')).gridTemplateColumns,
        }));
        assert.ok(metrics.scrollWidth <= width,`Horizontal overflow ${width}×${height}, ${count} players`);
        assert.equal(metrics.clipped,0,`Clipped score ${width}×${height}, ${count} players`);
        assert.equal(metrics.overlap,0,`Overlapping score ${width}×${height}, ${count} players`);
        assert.equal(metrics.smallTargets,0,`Small scoring button ${width}×${height}, ${count} players`);
        // 11-inch tablets should show every player without page scrolling.
        if ([820,834,1180,1194].includes(width)) assert.ok(metrics.scrollHeight <= height + 1,`Vertical overflow ${width}×${height}, ${count} players: ${metrics.scrollHeight}`);
        samples.push({count,...metrics});
        if ([834,1194].includes(width) && [2,4,8].includes(count)) await page.screenshot({path:`test-results/${width}x${height}-${count}-players.png`,fullPage:true});
      }
    }
    // Dark mode and unusually long, valid scores.
    await page.emulateMedia({colorScheme:'dark'});
    await page.evaluate(data => { data.players[0].score = Number.MIN_SAFE_INTEGER; localStorage.setItem('punktestand-v1',JSON.stringify(data)); },fixture(2));
    await page.reload();
    assert.equal(await page.getByRole('switch',{name:'Dunkelmodus'}).getAttribute('aria-checked'),'true');
    assert.equal(await first().locator('.score').evaluate(el => el.scrollWidth > el.clientWidth + 1),false);
    assert.deepEqual(errors,[]);
    require('node:fs').writeFileSync('test-results/layout.json',JSON.stringify(samples,null,2));
    console.log(`OK: functions, keyboard focus, persistence, validation, ${samples.length} layouts.`);
  } catch(error) {
    mkdirSync('test-results',{recursive:true});
    await page.screenshot({path:'test-results/failure.png',fullPage:true});
    throw error;
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode=1; });
