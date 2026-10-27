// THE BROWSER PLAYTEST — the game as a SCREEN, not as a sandbox.  node tests/browse.js
//
// Every other instrument in this folder boots the game inside a vm with a Proxy
// standing in for the DOM, which is exactly why none of them can see the thing
// Sean sees first: a control row running off the right edge of his phone, a
// card whose text is clipped, a console red with an error nobody reads. This one
// opens the real page in a real (headless) Chromium at phone width and at
// desktop width and plays the first few minutes a new captain plays — the title,
// the Standing Orders, LOOK, PING, the chart, every panel, a dive — and after
// every step it takes a screenshot, measures the layout, and reads the log.
//
// Usage:
//   node tests/browse.js                              phone + desktop, seed 20261026
//   node tests/browse.js --devices phone,landscape,desktop
//   node tests/browse.js --seed 7 --out tests/out --quick
//
// It writes tests/out/browse.json (everything), tests/out/browse.md (the summary
// a reader wants, also printed), and tests/out/<device>/NN-<step>.png.
//
// Exit codes: 0 ran; 2 the game did not boot (that IS a finding, read the
// report); 3 SKIPPED because Playwright or its Chromium is not installed — run
// `npm install` and then `npx playwright install chromium`. A skip is printed
// loudly. A skip is never a pass.
//
// WHAT IT IS NOT. It is not a bot and it is not a judge. It does not sail
// anywhere (playtest.js does that, ten thousand times faster) and it does not
// know good from bad. It MEASURES: a control past the viewport edge is a number,
// a console error is a line, a tip's text is a string. Reading the measurements
// is the job of whoever runs it — see .claude/skills/fathom-playtest/SKILL.md.
//
// REPRODUCIBLE BY DEFAULT. `restart()` draws the world seed from Date.now(), so
// two runs would show two oceans and no screenshot could be compared with
// yesterday's. The run therefore taps Dive the way a player does, then re-rolls
// the sea under a pinned clock so the seed is the one asked for. `--seed random`
// gives you a different ocean each run, if that is what you want.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SKIP = Symbol('skip');

// ---- arguments ---------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt; };
const flag = (name) => argv.includes('--' + name);
const DEVICE_NAMES = opt('devices', 'phone,desktop').split(',').map(s => s.trim()).filter(Boolean);
const SEED_ARG = opt('seed', '20261026');
const SEED = SEED_ARG === 'random' ? null : (parseInt(SEED_ARG, 10) >>> 0);
const OUT = path.resolve(ROOT, opt('out', 'tests/out'));
const QUICK = flag('quick');

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const DEVICES = {
  // 375×812 is the width PLAYTEST_FINDINGS.md measured the control row at, and
  // the one Sean's remarks keep coming from. Scale 2 keeps a screenshot readable
  // without making it a megabyte.
  phone:     { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ANDROID_UA },
  landscape: { viewport: { width: 812, height: 375 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ANDROID_UA },
  desktop:   { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};
for (const d of DEVICE_NAMES) if (!DEVICES[d]) { console.error('unknown device ' + d + '; have ' + Object.keys(DEVICES).join(', ')); process.exit(1); }

function skip(why) { console.log('BROWSE SKIPPED: ' + why); process.exit(3); }
let pw;
try { pw = require('playwright'); }
catch (e) { skip('playwright is not installed. Run `npm install` and then `npx playwright install chromium`.'); }

// ---- a static server, because the game registers a service worker over http
//      and file:// is not how anyone plays it ------------------------------------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p;
      try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); res.end(); return; }
      if (p === '/') p = '/fathom-chart.html';
      const file = path.normalize(path.join(ROOT, p));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

// ---- the layout audit, run INSIDE the page after every step -------------------
// Everything here is a measurement a phone would make. Nothing is a verdict.
function auditInPage() {
  const W = window.innerWidth, H = window.innerHeight;
  const seen = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    }
    return true;
  };
  const name = (el) => {
    if (el.id) return '#' + el.id;
    const cls = el.className && String(el.className).trim() ? '.' + String(el.className).trim().split(/\s+/).join('.') : el.tagName.toLowerCase();
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18);
    return cls + (t ? '[' + t + ']' : '');
  };
  const controls = Array.from(document.querySelectorAll('button, .btn, input, select, [role="button"]')).filter(seen);
  // A control below the fold inside a panel that SCROLLS is reachable by a
  // thumb; one below the fold with nothing to scroll is not. The two are
  // different findings, so the record says which.
  const scrolls = (el) => {
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && a.scrollHeight > a.clientHeight + 2) return name(a);
    }
    return null;
  };
  const offRight = [], offBottom = [], small = [], clipped = [];
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    if (r.right > W + 1) offRight.push({ el: name(el), right: Math.round(r.right), viewport: W });
    if (r.bottom > H + 1) offBottom.push({ el: name(el), bottom: Math.round(r.bottom), viewport: H, wholly: r.top >= H, scrollsIn: scrolls(el) });
    // 44 px is the floor the findings used (Apple's and Android's guidance
    // agree on it). Listed, not judged: the dive arrows are small by design and
    // the reader decides whether a given one is a problem.
    if (r.width < 44 || r.height < 44) small.push({ el: name(el), w: Math.round(r.width), h: Math.round(r.height) });
  }
  for (const el of Array.from(document.querySelectorAll('button, .btn, #hud *, #card *, #brief-card *, #dive-controls *')).filter(seen)) {
    const cs = getComputedStyle(el);
    if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && el.scrollWidth > el.clientWidth + 2) clipped.push({ el: name(el), scroll: el.scrollWidth, client: el.clientWidth });
  }
  const panelIds = ['brief', 'card', 'chart', 'inventory', 'muster', 'port', 'options', 'bestiary', 'trade', 'transcript', 'gameover'];
  const panelsOpen = panelIds.filter(id => { const e = document.getElementById(id); return e && seen(e); });
  const row = document.getElementById('controls-row');
  const rowRect = row ? row.getBoundingClientRect() : null;
  return {
    viewport: { w: W, h: H },
    pageOverflowX: document.documentElement.scrollWidth - W,
    pageOverflowY: document.documentElement.scrollHeight - H,
    controlsSeen: controls.length,
    offRight, offBottom, small, clipped, panelsOpen,
    controlsRow: rowRect ? { top: Math.round(rowRect.top), bottom: Math.round(rowRect.bottom), right: Math.round(rowRect.right), buttons: row.querySelectorAll('button').length } : null,
  };
}

// ---- one device, one session ------------------------------------------------
async function runDevice(browser, devName, base, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (/^\d\d-.*\.png$/.test(f)) fs.unlinkSync(path.join(outDir, f));   // only our own earlier shots

  const ctx = await browser.newContext(DEVICES[devName]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const consoleLines = [], failed = [];
  page.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning') consoleLines.push({ type: t, text: m.text().slice(0, 300) }); });
  page.on('pageerror', e => consoleLines.push({ type: 'pageerror', text: String(e && e.message || e).slice(0, 300) }));
  page.on('requestfailed', r => failed.push({ url: r.url().replace(base, ''), why: (r.failure() || {}).errorText || 'failed' }));
  page.on('response', r => { if (r.status() >= 400) failed.push({ url: r.url().replace(base, ''), why: 'HTTP ' + r.status() }); });

  const rec = { device: devName, viewport: DEVICES[devName].viewport, booted: false, steps: [], console: consoleLines, failed };
  let n = 0, logSeen = 0;
  const pad = (k) => String(k).padStart(2, '0');
  const shot = async (label) => {
    const file = path.join(outDir, label + '.png');
    await page.screenshot({ path: file });
    return path.relative(ROOT, file).split(path.sep).join('/');
  };
  const briefOpen = () => page.evaluate(() => { const b = document.getElementById('brief'); return !!(b && b.classList.contains('show')); });
  const readLog = () => page.evaluate(() => Array.from(document.querySelectorAll('#log > *')).map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean));

  // Press a control the way a thumb would. A control that is not on screen, or
  // is disabled, is recorded as such — the record is the point.
  const press = (sel) => async () => {
    const el = await page.$(sel);
    if (!el || !(await el.isVisible())) return { skipped: sel + ' is not on screen' };
    if (!(await el.isEnabled())) return { skipped: sel + ' is disabled' + (await el.getAttribute('title') ? ' — ' + (await el.getAttribute('title')).slice(0, 120) : '') };
    await el.click();
    return null;
  };

  const step = async (label, act) => {
    const entry = { n: n++, step: label, briefs: [], log: [] };
    try {
      if (act) { const r = await act(); if (r && r.skipped) entry.skipped = r.skipped; }
    } catch (e) { entry.error = String(e && e.message || e).split('\n')[0].slice(0, 300); }
    await page.waitForTimeout(450);
    // The Standing Orders. A card that opens is read, photographed, and
    // dismissed with Understood, like a player would; its text goes in the record.
    for (let i = 0; i < 12 && await briefOpen(); i++) {
      const b = await page.evaluate(() => ({
        title: (document.getElementById('brief-title').textContent || '').trim(),
        body: (document.getElementById('brief-body').textContent || '').replace(/\s+/g, ' ').trim() }));
      b.png = await shot(pad(entry.n) + '-' + label + '-orders' + (i ? '-' + (i + 1) : ''));
      b.audit = await page.evaluate(auditInPage);
      entry.briefs.push(b);
      await page.click('#brief-ok');
      await page.waitForTimeout(300);
    }
    entry.png = await shot(pad(entry.n) + '-' + label);
    entry.audit = await page.evaluate(auditInPage);
    const lines = await readLog();
    entry.log = lines.slice(logSeen); logSeen = lines.length;
    entry.hud = await page.evaluate(() => {
      const t = (id) => { const e = document.getElementById(id); return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : null; };
      return { depth: t('dive-depth-readout'), band: t('dive-depth-band'), hud: (t('hud') || '').slice(0, 240) };
    });
    rec.steps.push(entry);
    return entry;
  };

  await page.goto(base + 'fathom-chart.html', { waitUntil: 'load', timeout: 20000 });
  await step('title');
  await step('dive', async () => {
    if (SEED !== null) {
      // Pin the clock for the one tap that rolls the world. `restart()` takes
      // `Date.now() & 0xffffffff` as the seed, so the pinned value is a REAL
      // timestamp from the current 49-day window whose low 32 bits are the seed
      // — not the bare seed, which would read as January 1970 to every timer
      // that looks at the clock during boot.
      await page.evaluate((s) => {
        const real = Date.now;
        const t = Math.floor(real() / 4294967296) * 4294967296 + s;
        window.__browseRealNow = real;
        Date.now = () => t;
      }, SEED);
    }
    await page.click('#dive');
    await page.waitForSelector('#title.gone', { timeout: 8000 });
    if (SEED !== null) await page.evaluate(() => { if (window.__browseRealNow) { Date.now = window.__browseRealNow; delete window.__browseRealNow; } });
    rec.booted = true;
  });
  if (!rec.booted) { await ctx.close(); return rec; }
  rec.seed = await page.evaluate(() => (typeof worldSeed === 'number' ? worldSeed : null));

  await step('look', press('#btn-look'));
  await step('ping', press('#btn-ping'));
  await step('chart', press('#btn-chart'));
  await step('chart-close', press('#chart-close'));
  if (!QUICK) {
    await step('more', press('#btn-more'));
    await step('hold', press('#btn-hold'));
    await step('hold-close', press('#inv-close'));
    await step('muster', press('#btn-muster'));
    await step('muster-close', press('#muster-close'));
    await step('options', press('#btn-options'));
    await step('options-close', press('#options-close'));
    await step('bestiary', press('#btn-bestiary'));
    await step('bestiary-close', press('#bestiary-close'));
    await step('more-close', press('#btn-more'));
    await step('descend', press('#btn-descend'));
    await step('descend-2', press('#btn-descend'));
    await step('ascend', press('#btn-ascend'));
  }
  await ctx.close();
  return rec;
}

// ---- the summary a reader wants ---------------------------------------------
function summarise(report) {
  const L = [];
  L.push('# browse.js — ' + report.when + ' — build ' + report.commit + (report.seed === null ? ' — random seed' : ' — seed ' + report.seed));
  L.push('');
  L.push('Chromium: ' + report.chromium);
  L.push('');
  for (const [dev, r] of Object.entries(report.devices)) {
    L.push('## ' + dev + ' ' + r.viewport.width + '×' + r.viewport.height + (r.booted ? ' — world seed ' + r.seed : ' — DID NOT BOOT'));
    const steps = r.steps;
    const briefs = steps.reduce((a, s) => a + s.briefs.length, 0);
    const skipped = steps.filter(s => s.skipped), errored = steps.filter(s => s.error);
    L.push('- steps ' + steps.length + ', screenshots ' + (steps.length + briefs) + ', Standing Orders shown ' + briefs);
    const hits = (key) => { const m = new Map(); for (const s of steps) for (const a of [s.audit, ...s.briefs.map(b => b.audit)]) if (a) for (const h of a[key]) { const k = h.el; if (!m.has(k)) m.set(k, { ...h, steps: [] }); m.get(k).steps.push(s.step); } return [...m.values()]; };
    const offR = hits('offRight'), offB = hits('offBottom').filter(h => h.wholly), clipped = hits('clipped'), small = hits('small');
    const overflowX = steps.filter(s => s.audit && s.audit.pageOverflowX > 0).map(s => s.step + ':' + s.audit.pageOverflowX);
    L.push('- controls past the RIGHT edge: ' + (offR.length ? offR.map(h => h.el + ' (right ' + h.right + ' > ' + h.viewport + ', at ' + h.steps.slice(0, 3).join('/') + ')').join('; ') : 'none'));
    L.push('- controls wholly BELOW the viewport: ' + (offB.length ? offB.map(h => h.el + ' (at ' + h.steps.slice(0, 3).join('/') + (h.scrollsIn ? ', reachable: ' + h.scrollsIn + ' scrolls' : ', NOTHING SCROLLS') + ')').join('; ') : 'none'));
    L.push('- page wider than the viewport: ' + (overflowX.length ? overflowX.join(', ') + ' px' : 'never'));
    L.push('- clipped text: ' + (clipped.length ? clipped.map(h => h.el + ' ' + h.scroll + '>' + h.client).join('; ') : 'none'));
    L.push('- controls under 44 px: ' + small.length + (small.length ? ' — ' + small.slice(0, 8).map(h => h.el + ' ' + h.w + '×' + h.h).join(', ') + (small.length > 8 ? ', …' : '') : ''));
    L.push('- console errors/warnings: ' + r.console.length + (r.console.length ? ' — ' + r.console.slice(0, 3).map(c => c.type + ': ' + c.text.slice(0, 90)).join(' | ') : ''));
    L.push('- failed requests: ' + r.failed.length + (r.failed.length ? ' — ' + r.failed.slice(0, 4).map(f => f.url + ' ' + f.why).join(', ') : ''));
    if (skipped.length) L.push('- steps that could not be taken: ' + skipped.map(s => s.step + ' (' + s.skipped + ')').join('; '));
    if (errored.length) L.push('- steps that THREW: ' + errored.map(s => s.step + ' (' + s.error + ')').join('; '));
    const orders = steps.flatMap(s => s.briefs.map(b => b.title)).filter(Boolean);
    if (orders.length) L.push('- Standing Orders, in order: ' + orders.join(' → '));
    const logN = steps.reduce((a, s) => a + s.log.length, 0);
    L.push('- log lines written: ' + logN);
    L.push('');
  }
  L.push('Screenshots and the full record: tests/out/<device>/NN-step.png, tests/out/browse.json');
  return L.join('\n') + '\n';
}

// ---- finding a Chromium when Playwright's own is not there -------------------
// The cloud sandbox the nightly run lives in blocks cdn.playwright.dev, so
// `npx playwright install` fails there — but the box already carries a
// Chromium under PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers), one revision off
// the one this Playwright asks for. The first night's run found it by hand
// and wrapped `launch` to use it. This is that, done once, in the right place:
// FATHOM_CHROME names an executable outright; otherwise the browsers folder is
// searched for a headless shell or a chrome, newest folder first.
const EXE_NAMES = ['chrome-headless-shell', 'chrome-headless-shell.exe', 'headless_shell', 'headless_shell.exe', 'chrome', 'chrome.exe', 'chromium'];
function findChromium() {
  if (process.env.FATHOM_CHROME && fs.existsSync(process.env.FATHOM_CHROME)) return process.env.FATHOM_CHROME;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright'),
    process.env.HOME && path.join(process.env.HOME, '.cache', 'ms-playwright'),
    process.env.HOME && path.join(process.env.HOME, 'Library', 'Caches', 'ms-playwright')].filter(Boolean);
  const walk = (dir, depth) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return null; }
    for (const ent of entries) if (ent.isFile() && EXE_NAMES.includes(ent.name)) return path.join(dir, ent.name);
    if (depth === 0) return null;
    for (const ent of entries) if (ent.isDirectory()) { const hit = walk(path.join(dir, ent.name), depth - 1); if (hit) return hit; }
    return null;
  };
  for (const root of roots) {
    let dirs = [];
    try { dirs = fs.readdirSync(root).filter(d => /^chromium/.test(d)).sort().reverse(); } catch (e) { continue; }
    // headless shells first — they are what Playwright itself prefers for headless runs
    dirs.sort((a, b) => (/headless/.test(b) - /headless/.test(a)));
    for (const d of dirs) { const hit = walk(path.join(root, d), 3); if (hit) return hit; }
  }
  return null;
}

// ---- main ---------------------------------------------------------------------
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = await serve();
  const base = 'http://127.0.0.1:' + port + '/';
  let browser, usedExe = null;
  try { browser = await pw.chromium.launch({ headless: true }); }
  catch (e1) {
    const exe = findChromium();
    if (!exe) { srv.close(); skip('Chromium could not be launched (' + String(e1 && e1.message || e1).split('\n')[0].slice(0, 160) + ') and none was found on this machine. Run `npx playwright install chromium`, or set FATHOM_CHROME to a Chromium executable.'); }
    try { browser = await pw.chromium.launch({ headless: true, executablePath: exe }); usedExe = exe; }
    catch (e2) { srv.close(); skip('Chromium could not be launched: neither Playwright\'s own (' + String(e1 && e1.message || e1).split('\n')[0].slice(0, 120) + ') nor ' + exe + ' (' + String(e2 && e2.message || e2).split('\n')[0].slice(0, 120) + ').'); }
  }
  let commit = '?';
  try { commit = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) {}
  const report = { when: new Date().toISOString(), commit, seed: SEED, chromium: usedExe || "playwright's own", devices: {} };
  try {
    for (const dev of DEVICE_NAMES) {
      process.stdout.write('browse: ' + dev + ' … ');
      const t0 = Date.now();
      report.devices[dev] = await runDevice(browser, dev, base, path.join(OUT, dev));
      console.log(((Date.now() - t0) / 1000).toFixed(1) + 's' + (report.devices[dev].booted ? '' : ' — DID NOT BOOT'));
    }
  } finally {
    await browser.close();
    srv.close();
  }
  fs.writeFileSync(path.join(OUT, 'browse.json'), JSON.stringify(report, null, 1));
  const md = summarise(report);
  fs.writeFileSync(path.join(OUT, 'browse.md'), md);
  console.log('\n' + md);
  process.exit(Object.values(report.devices).every(d => d.booted) ? 0 : 2);
})().catch((e) => { console.error('browse: ' + (e && e.stack || e)); process.exit(1); });
