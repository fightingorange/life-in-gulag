#!/usr/bin/env node
// Headless tests for Ten Years. No browser, no install.
//   node tests/run.js                 walk every scene, simulate winters, audit assets
//   node tests/run.js sim smart 500   one bot, many winters
//   node tests/run.js dump            print the whole script
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/util.js', 'js/assets.js', 'js/engine.js', 'js/content/lines.js', 'js/content/day.js', 'js/content/events.js', 'js/content/calendar.js',
  'js/content/escape.js', 'js/content/story.js', 'js/testkit.js'];

function load() {
  const ctx = vm.createContext({ console });
  const code = FILES.map(f => `// ---- ${f}\n` + fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + '\n;globalThis.__T = TESTKIT; globalThis.__A = ASSETS;';
  vm.runInContext(code, ctx, { filename: 'game.js' });
  return { T: ctx.__T, A: ctx.__A };
}

function auditFiles(T, A) {
  const need = T.audit();
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/manifest.json'), 'utf8'));
  const FALLBACK = A.fallback;
  const missing = [], fallback = [];
  for (const f of need.frame) {
    const has = n => fs.existsSync(path.join(ROOT, `assets/frames/web/${n}.jpg`)) || fs.existsSync(path.join(ROOT, `assets/frames/${n}.png`));
    if (has(f)) continue;
    if (FALLBACK[f] && has(FALLBACK[f])) fallback.push(`frame ${f} (shows ${FALLBACK[f]} until drawn)`);
    else missing.push(`frame ${f}`);
  }
  for (const s of need.sfx) {
    if (!fs.existsSync(path.join(ROOT, `assets/sfx/${s}.mp3`))) missing.push(`sfx ${s}${manifest.sfx[s] ? '' : ' (not in manifest)'}`);
  }
  for (const v of need.voice) {
    if (!fs.existsSync(path.join(ROOT, `assets/voice/${v}.mp3`))) missing.push(`voice ${v}${manifest.lines[v] ? '' : ' (not in manifest)'}`);
  }
  return { need, missing, fallback };
}

const [cmd, a1, a2] = process.argv.slice(2);
const { T, A } = load();
let failed = false;

if (cmd === 'dump') { process.stdout.write(T.dump()); process.exit(0); }
if (cmd === 'stats') {
  const r = T.sim(a1 || 'smart', +(a2 || 300));
  console.log(r.report);
  const D = r.details, n = D.length;
  const avg = f => (D.reduce((a, d) => a + f(d), 0) / n).toFixed(1);
  const deaths = D.filter(d => d.end === 'died');
  const byMonth = {};
  for (const d of deaths) { const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May'][d.day < 30 ? 0 : d.day < 58 ? 1 : d.day < 89 ? 2 : d.day < 119 ? 3 : 4]; byMonth[m] = (byMonth[m] || 0) + 1; }
  console.log('deaths by month:', JSON.stringify(byMonth));
  console.log(`at the end: eye ${avg(d => d.eye)}, brigade ${avg(d => d.brigade)}, tobacco ${avg(d => d.tobacco)}, plan ${avg(d => d.plan)}/4, Lev alive ${Math.round(100 * D.filter(d => d.lev).length / n)}%, Kuzma here ${Math.round(100 * D.filter(d => d.kuzma).length / n)}%, caught once ${Math.round(100 * D.filter(d => d.caught).length / n)}%`);
  const allRuns = D.flatMap(d => d.runs);
  console.log(`clicks per run ${avg(d => d.clicks)}; days that ran on their own: ${allRuns.length / n | 0} stretches per winter, mean ${(allRuns.reduce((a, b) => a + b, 0) / (allRuns.length || 1)).toFixed(1)} days`);
  const v = {}; for (const d of D) for (const k in d.verdicts) v[k] = (v[k] || 0) + d.verdicts[k];
  const vt = Object.values(v).reduce((a, b) => a + b, 0);
  console.log('verdicts:', Object.entries(v).map(([k, x]) => `${k} ${Math.round(100 * x / vt)}%`).join(', '));
  const ev = {}; for (const d of D) for (const k in d.count) ev[k] = (ev[k] || 0) + d.count[k];
  console.log('events per winter:', Object.entries(ev).sort((a, b) => b[1] - a[1]).map(([k, x]) => `${k} ${(x / n).toFixed(2)}`).join(', '));
  process.exit(0);
}
if (cmd === 'sim') {
  const r = T.sim(a1 || 'smart', +(a2 || 200));
  console.log(r.report);
  process.exit(r.errors.length ? 1 : 0);
}

// every script the page loads shares one global scope: two top-level declarations of the same
// name stop the second file from loading at all. The node run cannot see this, so check it here.
function globalClashes() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  const seen = {}, clashes = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of src.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
      if (seen[m[1]] && seen[m[1]] !== f) clashes.push(`${m[1]}: ${seen[m[1]]} and ${f}`);
      seen[m[1]] = seen[m[1]] || f;
    }
  }
  return { files: files.length, names: Object.keys(seen).length, clashes };
}
const t0 = Date.now();
const g = globalClashes();
console.log(`globals: ${g.files} scripts, ${g.names} top-level names, ${g.clashes.length} clashes` + (g.clashes.length ? '\n  ' + g.clashes.join('\n  ') : ''));
if (g.clashes.length) failed = true;
const c = T.checks();
console.log(c.report);
if (c.fails.length) failed = true;
const w = T.walk();
console.log(w.report);
if (w.errors.length) failed = true;
for (const [bot, n] of [['random', 150], ['careful', 150], ['smart', 200], ['escaper', 200]]) {
  const r = T.sim(bot, n);
  console.log(r.report);
  if (r.errors.length) failed = true;
}
const a = auditFiles(T, A);
console.log(`assets: ${a.need.frame.length} frames, ${a.need.sfx.length} sounds, ${a.need.voice.length} voice lines asked for`);
if (a.fallback.length) console.log('  waiting for art:\n    ' + a.fallback.join('\n    '));
if (a.missing.length) { console.log('  missing:\n    ' + a.missing.join('\n    ')); }
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(failed ? 1 : 0);
