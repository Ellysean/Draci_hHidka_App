// Převede tools/_extracted.json (prototyp v9.1) do src/data/*.json ve tvaru, který čte appka.
// Kanonické zdroje jsou v Claude projektu (claude/data/*.json) – tenhle skript je jen most.
import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('tools/_extracted.json', 'utf8'));
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const w = (p, o) => fs.writeFileSync('src/data/' + p, JSON.stringify(o, null, 1) + '\n');

const RACE_ATTR = d.RACE_ATTR;
w('races.json', Object.entries(d.RACES).map(([id, r]) => ({
  id, name: r.n, size: r.size, mobilityBase: r.mob,
  ability: { name: r.ab, text: d.RACE_TXT[id], effects: r.zo ? [{ target: 'defenseBase', op: 'add', value: r.zo }] : [] },
  baseAttributes: RACE_ATTR[id],
})));

const energyKey = { kouzelnik: 'kouzelnik', hranicar: 'hranicar', klerik: 'klerik' };
w('classes.json', Object.entries(d.CLASSES).map(([id, c]) => ({
  id, name: c.n, tabLabel: c.tab, icon: c.icon, energyName: c.energy, skillPointMultiplier: c.mult,
  dominantAttributes: d.DOM[id],
  basicSkills: d.BASIC_BY_CLASS[id].map(slug),
  professionSkills: d.PROF_BY_CLASS[id].map(([n]) => slug(n)),
  energyTable: energyKey[id] ?? null,
})));

// Atributy dovedností podle RULES_FORMULAS §7 (první = výchozí, druhý volí PJ situačně)
const ATTRS2 = { etiketa: ['int', 'char'], mechanika: ['obr', 'int'], remesla: ['sil', 'obr'], umeni: ['obr', 'char'], zvladnuti_zvirat: ['obr', 'char'] };
const skills = [
  ...d.BASIC_SKILLS.map(([n, a]) => ({ id: slug(n), name: n, attributes: ATTRS2[slug(n)] ?? [a], defaultAttribute: a, kind: 'basic' })),
  ...d.EXTRA_SKILLS.map(([n, a]) => ({ id: slug(n), name: n, attributes: [a], defaultAttribute: a, kind: 'extended' })),
  ...Object.entries(d.PROF_BY_CLASS).flatMap(([cls, list]) => list.map(([n, a]) => ({ id: slug(n), name: n, attributes: [a], defaultAttribute: a, kind: 'profession', classId: cls }))),
];
w('skills.json', skills);

w('conditions.json', d.CONDITIONS.map(([id, name, short]) => ({ id, name, short })));
w('tables/fatigue.json', d.FATIGUE.map(([name, penalty], level) => ({ level, name, penalty })));
w('tables/zivoty.json', { _source: 'claude/data/zivoty.json (Tabulka životů, H18)', attributeMin: d.HP_TABLE.min, byLevel: d.HP_TABLE.rows });
w('tables/zkusenosti.json', { _source: 'claude/data/zkusenosti.json (H18)', xpByLevel: d.XP_TABLE, attributeImprovementEvery: 3 });
w('tables/energie.json', { _source: 'claude/data/energie.json (PPP02, PPP04, PPP06; H10)',
  ...Object.fromEntries(Object.entries(d.ENERGY).map(([k, t]) => [k, { attribute: t.a, attributeMin: t.min, byLevel: t.rows }])),
  alchymista_start: { mana: '12 × INT − 24', suroviny: '20 × OBR + 120' } });
const vy = d.VYZBROJ;
w('vyzbroj.json', { _source: vy.source, weapons: [...vy.weapons.map(x => ({ ...x, src: d.H15SRC })), ...d.PPP_THIEF], armor: vy.armor, robes: vy.robes, shields: vy.shields, accessories: vy.accessories });
w('gear.json', d.GEAR);
w('recommended-equipment.json', d.REC);
console.log('ok', skills.length, 'dovedností');
