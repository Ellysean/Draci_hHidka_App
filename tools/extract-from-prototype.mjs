// Jednorázový extraktor: vytáhne pravidlová data z HTML prototypu v9.1 (artifact) do src/data/*.json.
// Použití: node tools/extract-from-prototype.mjs <prototyp.html>
import fs from 'node:fs'; import vm from 'node:vm';
const src = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const want = ['ATTR','RACES','CLASSES','FATIGUE','CONDITIONS','HP_TABLE','XP_TABLE','BASIC_SKILLS','EXTRA_SKILLS','PPP_THIEF','H15SRC','VYZBROJ','RACE_ATTR','DOM','ENERGY','GEAR','REC','BASIC_BY_CLASS','PROF_BY_CLASS','RACE_TXT','ATTR_EFFECT'];
const starts = new RegExp('^(const|let|function) (' + want.join('|') + ')\\b');
const topLevel = /^(const|let|function|\/\*|\/\/|<\/script)/;
let code = '';
for (let i = 0; i < src.length; i++) {
  if (!starts.test(src[i])) continue;
  let block = src[i];
  for (let j = i + 1; j < src.length && !topLevel.test(src[j]); j++) block += '\n' + src[j];
  code += block.replace(/^const /, 'var ') + '\n';
}
const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx);
const out = Object.fromEntries(want.filter(k => k in ctx).map(k => [k, ctx[k]]));
fs.writeFileSync('tools/_extracted.json', JSON.stringify(out, null, 1));
console.log(Object.keys(out).join(' '));
