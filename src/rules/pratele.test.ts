// 7c+ – Přátelé a zvířata: druhy, hodnoty, limity, ochočení, vyvolání, růst při přestupu, boj, vrácení.
import { describe, expect, it } from 'vitest';
import { buildCharacter, newDraft } from '../creation/draft';
import type { Character, ClassId } from '../model/types';
import { applyLevelUp, canNext, emptyLevelUp, steps, whyNot } from '../progression/levelup';
import { migrate } from '../storage/migrations';
import { combatMods, undoPlay } from './combat';
import { derive } from './derive';
import {
  SPECIES, acquireWhy, addCompanion, companionHp, companionView, endCompanion, makeChampion, packBonus, packLevel, setInFight, speciesOf,
  statsFrom, summon, summonWhy, tame,
} from './pratele';

const mk = (classId: ClassId, level = 1, points = { sil: 3, obr: 6, odo: 4, int: 5, char: 2 }): Character => {
  const c = buildCharacter({ ...newDraft(), name: 'Test', raceId: 'clovek', classId, method: 'points', points, picks: [], choice: 0 });
  c.progression.level = level;
  return c;
};
const learn = (c: Character, ...ids: string[]) => { c.progression.learnedAbilities.push(...ids.map((id) => ({ id }))); return c; };
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };
const add = (c: Character, id: string, o: { pj?: boolean } = {}) => addCompanion(c, speciesOf(id)!.kind, id, statsFrom(speciesOf(id)), o);

describe('data přátel', () => {
  it('druhy H09, V14, PPP02, H11, PPP04, PPP05', () => {
    const by = (k: string) => SPECIES.filter((s) => s.kind === k).map((s) => s.id);
    expect(by('zvire')).toEqual(['pes', 'vlk_lesni', 'sokol', 'vlk_sedy', 'vlk_alfa', 'rys', 'medved']);
    expect(by('kun')).toEqual(['hranicaruv_kun']);
    expect(by('mag')).toEqual(['krysa', 'kocka', 'sova', 'had', 'havran', 'netopyr']);
    expect(by('lup')).toEqual(['potkan', 'papousek', 'kocka_lupic', 'opice']);
    expect(speciesOf('pes')).toMatchObject({ tame: 4, hp: 6, zo: 2, oc: 3 });
    expect(speciesOf('netopyr')).toMatchObject({ dc: 14, minLevel: 6, size: 'A0' });
  });
});

describe('hodnoty přítele', () => {
  it('kouzelníkův přítel roste s úrovní kouzelníka (H11): sova na 5. úrovni', () => {
    const c = learn(mk('kouzelnik', 5, { sil: 2, obr: 4, odo: 4, int: 8, char: 2 }), 'vyvolani_pritele');
    const x = add(c, 'sova').companions[0];
    const v = companionView(c, derive(c), x);
    expect(v).toMatchObject({ level: 5, hpMax: 7 + 10, manaMax: 6 + 5, spellsMax: 3 + 5, zo: 3 + 1, oc: 4 + 2 });
    expect(v.attacks[0]).toMatchObject({ atk: 1 + 2, dmg: 2 });
    // Dovednosti = úroveň + atribut tvora; Postřeh s INT pána; Sesílání kouzel jako pán.
    const k = derive(c).skills.find((s) => s.id === 'sesilani_kouzel')!;
    expect(v.skills.find((s) => s.name === 'Hbitost')!.value).toBe(5 + 3);
    expect(v.skills.find((s) => s.name === 'Postřeh')!.value).toBe(5 + Math.floor((c.attributes.int - 10) / 2));
    expect(v.skills.find((s) => s.name === 'Sesílání kouzel')!.value).toBe(k.rank + k.mod);
  });
  it('zvířecí přítel: růst H09 – +3 životy, dovednosti +1, každá 3. úroveň ÚČ/Zranění/ZO/OČ +1', () => {
    const c = learn(mk('hranicar', 4), 'ochocovani_zvirat');
    const x0 = add(c, 'vlk_sedy').companions[0];
    const x = { ...x0, grow: [{ level: 2, skills: ['Postřeh', 'Lov'] }, { level: 3, skills: ['Postřeh', 'Vůle'] }, { level: 4, skills: ['Atletika', 'Výdrž'] }] };
    const v = companionView(c, null, x);
    expect(v).toMatchObject({ level: 2 + 3, hpMax: 11 + 9, zo: 4, oc: 5 });
    expect(v.attacks[0]).toMatchObject({ atk: 8, dmg: 2 });
    expect(v.skills.find((s) => s.name === 'Postřeh')!.value).toBe(11);
    expect(v.skills.find((s) => s.name === 'Lov')!.value).toBe(1);
    expect(v.deathThreshold).toBe(-12);
  });
  it('H09 s. 14 (přepis uživatele): pes, vlk lesní a sokol na 1. úrovni, sokol A1 se spáry 1/+3', () => {
    const c = learn(mk('hranicar'), 'ochocovani_zvirat');
    const v = companionView(c, null, add(c, 'sokol').companions[0]);
    expect(v).toMatchObject({ level: 1, size: 'A1', missing: [] });
    expect(v.attacks[0]).toMatchObject({ n: 'spáry', atk: 1, dmg: 3 });
    expect([speciesOf('pes'), speciesOf('vlk_lesni')].map((s) => [s!.level, s!.size])).toEqual([[1, 'A'], [1, 'A']]);
  });
  it('vlastní tvor bez úrovně a útoku – karta je chce doplnit', () => {
    const c = learn(mk('hranicar'), 'ochocovani_zvirat');
    const x = addCompanion(c, 'zvire', 'vlastni', { ...statsFrom(undefined), attacks: [{ n: 'zuby', atk: null, dmg: null }] });
    expect(companionView(c, null, x.companions[0]).missing).toEqual(['úroveň', 'velikost', 'útok']);
  });
});

describe('kdo smí mít přítele', () => {
  it('schopnost, limit 1, nový po smrti až po přestupu; PJ obejde', () => {
    const c = mk('hranicar', 3);
    expect(acquireWhy(c, 'zvire')).toContain('Ochočování zvířat');
    learn(c, 'ochocovani_zvirat');
    expect(acquireWhy(c, 'zvire')).toBe('');
    let x = add(c, 'pes');
    expect(acquireWhy(x, 'zvire')).toContain('jen 1');
    x = endCompanion(x, x.companions[0].uid, 'dead');
    expect(acquireWhy(x, 'zvire')).toContain('po přestupu');
    x.progression.level = 4;
    expect(acquireWhy(x, 'zvire')).toBe('');
    // Rozloučení (svoboda) – hraničář může ochočit hned (COMPANIONS.md).
    const y0 = add(c, 'pes');
    const y = endCompanion(y0, y0.companions[0].uid, 'released');
    expect(acquireWhy(y, 'zvire')).toBe('');
  });
  it('Pán zvířat: smečka do součtu úrovní', () => {
    const c = learn(mk('hranicar', 6), 'ochocovani_zvirat');
    c.progression.specialization = 'pan_zvirat';
    let x = add(c, 'vlk_sedy');
    x = add(x, 'vlk_alfa');
    expect(packLevel(x)).toEqual({ sum: 5, unknown: 0 });
    expect(acquireWhy(x, 'zvire', 'rys')).toContain('smečka by měla úroveň 7');
    expect(acquireWhy(x, 'zvire', null, 1)).toBe('');
  });
  it('kouzelník: had od 6. úrovně, mrtvý druh už nikdy', () => {
    const c = learn(mk('kouzelnik', 5), 'vyvolani_pritele');
    expect(acquireWhy(c, 'mag', 'had')).toContain('od 6.');
    let x = add(c, 'krysa');
    x = endCompanion(x, x.companions[0].uid, 'dead');
    x.progression.level = 9;
    expect(acquireWhy(x, 'mag', 'krysa')).toContain('nikdy');
    expect(acquireWhy(x, 'mag', 'had')).toBe('');
  });
});

describe('získání', () => {
  it('ochočení: k10 + Ochočování zvířat (+5 mládě) > ochočitelnost', () => {
    const c = learn(mk('hranicar'), 'ochocovani_zvirat');
    c.skills.push({ id: 'ochocovani_zvirat', customName: null, attribute: 'char', rank: 3, source: 'ability' });
    const d = derive(c);
    const bonus = d.skills.find((s) => s.id === 'ochocovani_zvirat')!.total;
    const fail = tame(c, d, 'vlk_lesni', statsFrom(speciesOf('vlk_lesni')), {}, seq(9 - bonus, 3));
    expect(fail.success).toBe(false);
    expect(fail.character.companions).toHaveLength(0);
    const ok = tame(c, d, 'vlk_lesni', statsFrom(speciesOf('vlk_lesni')), { young: true, name: 'Šedák' }, seq(9 - bonus, 3));
    expect(ok.success).toBe(true);
    expect(ok.character.companions[0]).toMatchObject({ name: 'Šedák', hpCurrent: 8, kind: 'zvire' });
    expect(ok.character.play.log[0].text).toContain('úspěch');
  });
  it('vyvolání: jen s plnou manou, vyzáří se celé maximum i při neúspěchu', () => {
    const c = learn(mk('kouzelnik', 3, { sil: 2, obr: 4, odo: 4, int: 8, char: 2 }), 'vyvolani_pritele');
    const d = derive(c);
    const max = d.manaMax.value!;
    c.vitals.manaCurrent = max - 1;
    expect(summonWhy(c, d)).toContain('plnou manu');
    c.vitals.manaCurrent = max;
    expect(summonWhy(c, d)).toBe('');
    const r = summon(c, d, 'kocka', statsFrom(speciesOf('kocka')), { spells: ['Světlo'] }, seq(2, 2));
    expect(r.character.vitals.manaCurrent).toBe(0);
    expect(r.success).toBe(r.total > 11);
    const ok = summon(c, d, 'kocka', statsFrom(speciesOf('kocka')), { spells: ['Světlo'] }, seq(9));
    expect(ok.success).toBe(true);
    expect(ok.character.companions[0]).toMatchObject({ hpCurrent: 9 + 6, manaCurrent: 4 + 3, spells: ['Světlo'] });
  });
});

describe('během hry', () => {
  it('životy přítele – léčení do maxima, Vrátit vrací i přítele', () => {
    const c = learn(mk('zlodej'), 'lupicuv_partak');
    let x = add(c, 'opice');
    const u = x.companions[0].uid;
    x = companionHp(x, null, u, -5);
    expect(x.companions[0].hpCurrent).toBe(2);
    x = companionHp(x, null, u, 10);
    expect(x.companions[0].hpCurrent).toBe(7);
    x = undoPlay(x);
    expect(x.companions[0].hpCurrent).toBe(2);
    x = undoPlay(undoPlay(x));
    expect(x.companions).toHaveLength(0);
  });
  it('Boj ve smečce +1 za zvíře v boji (max +5); Zvířecí šampion −2 max. Duševní síly', () => {
    const c = learn(mk('hranicar', 6), 'ochocovani_zvirat', 'boj_ve_smecce', 'zvireci_sampion');
    c.progression.specialization = 'pan_zvirat';
    let x = add(add(c, 'vlk_sedy'), 'pes');
    const [a, b] = x.companions.map((q) => q.uid);
    x = setInFight(setInFight(x, a, true), b, true);
    expect(packBonus(x)).toBe(2);
    expect(combatMods(x)).toMatchObject({ atk: 2, def: 2 });
    const before = derive(x).manaMax.value!;
    x = makeChampion(x, a);
    expect(derive(x).manaMax.value).toBe(before - 2);
    const v = companionView(x, null, x.companions[0]);
    expect(v).toMatchObject({ hpMax: 31, size: 'B', mobility: '70', zo: 6 });
    expect(v.attacks[0].atk).toBe(10);
  });
});

describe('přestup s přáteli', () => {
  it('zvířecí přítel: krok Přátelé, 2 dovednosti +1, +3 životy', () => {
    const c = learn(mk('hranicar', 2), 'ochocovani_zvirat');
    const x = add(c, 'pes');
    const u = x.companions[0].uid;
    const st = { ...emptyLevelUp(), pick: { kind: 'branch' as const, id: 'magie_zvirat' } };
    expect(steps(x, st).map((s) => s.key)).toContain('pratele');
    expect(canNext(x, st, 'pratele')).toBe(false);
    expect(whyNot(x, 'pratele', st)).toContain('2 dovednosti');
    const st2 = { ...st, companions: { [u]: { skills: ['Stopování', 'Vůle'], spells: [] } } };
    expect(canNext(x, st2, 'pratele')).toBe(true);
    const after = applyLevelUp(x, st2);
    expect(after.companions[0].grow).toEqual([{ level: 3, skills: ['Stopování', 'Vůle'] }]);
    expect(after.companions[0].hpCurrent).toBe(9);
    expect(after.progression.levelUps.at(-1)!.choices.some((ch) => ch.slot === 'companion')).toBe(true);
  });
  it('kouzelníkův přítel: kouzla navíc z kouzel pána', () => {
    const c = learn(mk('kouzelnik', 1, { sil: 2, obr: 4, odo: 4, int: 8, char: 2 }), 'vyvolani_pritele');
    c.progression.learnedItems = ['Světlo', 'Blesk', 'Magický štít'];
    const x = addCompanion(c, 'mag', 'krysa', statsFrom(speciesOf('krysa')), { spells: ['Světlo', 'Blesk', 'Magický štít'] });
    const u = x.companions[0].uid;
    const st = { ...emptyLevelUp(), pick: { kind: 'ability' as const, id: 'koncentrace_many' }, items: ['Oheň', 'Rychlost'] };
    expect(whyNot(x, 'pratele', st)).toContain('vyber 1 kouzlo');
    const after = applyLevelUp(x, { ...st, companions: { [u]: { skills: [], spells: ['Oheň'] } } });
    expect(after.companions[0].spells).toEqual(['Světlo', 'Blesk', 'Magický štít', 'Oheň']);
  });
  it('Pán zvířat cvičí při přestupu jen jedno zvíře', () => {
    const c = learn(mk('hranicar', 6), 'ochocovani_zvirat');
    c.progression.specialization = 'pan_zvirat';
    const x = add(add(c, 'vlk_sedy'), 'pes');
    const [a, b] = x.companions.map((q) => q.uid);
    const two = { ...emptyLevelUp(), companions: { [a]: { skills: ['Postřeh', 'Lov'], spells: [] }, [b]: { skills: ['Postřeh', 'Vůle'], spells: [] } } };
    expect(whyNot(x, 'pratele', two)).toContain('jen jedno');
    const one = { ...emptyLevelUp(), companions: { [a]: { skills: ['Postřeh', 'Lov'], spells: [] } } };
    expect(whyNot(x, 'pratele', one)).toBe('');
    const after = applyLevelUp(x, one);
    expect(after.companions.map((q) => q.grow.length)).toEqual([1, 0]);
  });
  it('Lupičův parťák: každá 3. úroveň volba ÚČ / ZO a trik', () => {
    const c = learn(mk('zlodej', 4), 'lupicuv_partak');
    let x = add(c, 'potkan');
    x.companions[0].grow = [{ level: 3, skills: [] }, { level: 4, skills: [] }];
    const u = x.companions[0].uid;
    expect(whyNot(x, 'pratele', emptyLevelUp())).toContain('ÚČ, nebo ZO');
    x = applyLevelUp(x, { ...emptyLevelUp(), companions: { [u]: { skills: [], pick: 'zo', trick: 'Lezení', spells: [] } } });
    const v = companionView(x, null, x.companions[0]);
    expect(v).toMatchObject({ hpMax: 9, zo: 5, oc: 6 });
    expect(v.tricks.find((t) => t.name === 'Lezení')!.value).toBe(9);
    expect(v.skills.find((s) => s.name === 'Postřeh')!.value).toBe(5);
  });
});

describe('migrace', () => {
  it('starý tvar přítele se doplní', () => {
    const c = mk('hranicar') as unknown as Record<string, unknown>;
    c.companions = [{ uid: 'a', kind: 'zvire', typeId: 'pes', name: 'Rex', hpCurrent: 3, manaCurrent: 0, spells: [], notes: '' }];
    const m = migrate(c);
    expect(m.companions[0]).toMatchObject({ name: 'Rex', status: 'active', grow: [], inFight: false, stats: { attacks: [] } });
  });
});
