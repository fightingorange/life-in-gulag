'use strict';
// Small shared helpers. The random source is seedable so a test run can be repeated exactly.

let RNG = Math.random;
function seed(n) {
  let a = (n >>> 0) || 1;
  RNG = function () {   // mulberry32
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function unseed() { RNG = Math.random; }

const rnd = n => Math.floor(RNG() * n);
const pick = a => a[rnd(a.length)];
const chance = p => RNG() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtInt = n => Math.round(n).toLocaleString('en-US');

function weighted(list, w = x => x.weight || 1) {
  let total = 0;
  for (const x of list) total += w(x);
  if (!total) return null;
  let r = RNG() * total;
  for (const x of list) { r -= w(x); if (r < 0) return x; }
  return list[list.length - 1] || null;
}

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
function numberWord(n, cap) {
  const w = n >= 0 && n <= 20 ? NUMBER_WORDS[n] : fmtInt(n);
  return cap ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}
const plural = (n, one, many) => n === 1 ? one : many;
