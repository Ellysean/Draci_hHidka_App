// 7a.2 – 12 obecných volitelných schopností alchymisty z PPP03 (s. 4–16) a jejich předměty.
import { describe, expect, it } from 'vitest';
import { sampleKloi } from '../model/sample';
import type { Character } from '../model/types';
import { applyLevelUp, autoGains, emptyLevelUp, options as levelUpOptions, progressionFor as getProgression, specOptions } from '../progression/levelup';
import {
  addBase, alch, autoAssign, craft, craftBonus, knownRecipes, planCraft, processHours, recipeById, recycle, sabotage,
  setWorkshop, startingBases, useCrafted,
} from './alchemy';
import { derive } from './derive';

const learn = (c: Character, ...ids: string[]) => { c.progression.learnedAbilities.push(...ids.map((id) => ({ id }))); return c; };
const kloi = (level = 6): Character => {
  const c = sampleKloi();
  c.classState.alchymista!.bases = startingBases();
  c.progression.level = level;
  c.vitals.manaCurrent = 2000;
  c.classState.alchymista!.materialsCurrent = 2000;
  return c;
};

describe('schopnosti PPP03 v průvodci přestupem', () => {
  it('12 schopností od 6. úrovně, Artefakty opakovatelně', () => {
    const P = getProgression('alchymista');
    const ppp = P.abilities.filter((a) => a.minLevel === 6 && !a.requiresSpecialization);
    expect(ppp.map((a) => a.id)).toEqual(expect.arrayContaining([
      'artefakty', 'bojova_konzumace', 'cestovni_alchymie', 'forenzika', 'herbalista', 'hromadna_vyroba',
      'koncentrovane_substance', 'laboratorni_specialista', 'magicke_hulky', 'recyklator', 'saboter', 'travicstvi']));
    expect(ppp).toHaveLength(12);
    expect(P.abilities.find((a) => a.id === 'artefakty')?.repeatable).toBe(true);
    const c = kloi(4);
    const opt = levelUpOptions(c).find((o) => o.id === 'forenzika');
    expect(opt?.disabled).toMatch(/6\. úrovně/);
  });
});

describe('recepty odemčené schopnostmi', () => {
  it('schopnost přidá své recepty, hůlka s kouzlem jen s Výrobou svitků', () => {
    const c = kloi();
    const before = knownRecipes(c).length;
    learn(c, 'travicstvi');
    expect(knownRecipes(c).length).toBe(before + 5);
    learn(c, 'magicke_hulky');
    expect(knownRecipes(c).map((r) => r.id)).not.toContain('hulka_s_kouzlem');
    learn(c, 'vyroba_svitku');
    expect(knownRecipes(c).map((r) => r.id)).toContain('hulka_s_kouzlem');
  });
  it('hůlky: přídavná mana podle dřeva (dub 50 … ebonit 500)', () => {
    const c = kloi();
    const r = recipeById('ohniva_hulka')!;
    expect(planCraft(c, r, { extraMana: 400 }).mana).toBe(5 + 50);
    expect(planCraft(c, r, { extraMana: 400, wandWood: 'ebonit' }).mana).toBe(5 + 400);
  });
  it('Magický kompas potřebuje 4 jehly', () => {
    let c = kloi();
    c = addBase(c, 'kovová jehla', 3, 0);
    expect(autoAssign(c, recipeById('magicky_kompas')!)[0]).toBeNull();
    c = addBase(c, 'kovová jehla', 1, 0);
    expect(autoAssign(c, recipeById('magicky_kompas')!)[0]).not.toBeNull();
  });
  it('Křišťálová mísa – pokročilá varianta: 150 many, 200 surovin, obtížnost 24', () => {
    const p = planCraft(kloi(), recipeById('kristalova_misa')!, { variant: 0 });
    expect(p).toMatchObject({ mana: 150, materials: 200, difficulty: 24 });
  });
});

describe('schopnosti, které mění výrobu', () => {
  const ranhojic = () => recipeById('lektvar_ranhojic')!;
  it('Hromadná výroba: mana a suroviny × dávky, obtížnost +1 za další dávku, výsledek ×n', () => {
    let c = learn(kloi(), 'hromadna_vyroba');
    const r = ranhojic();
    const one = planCraft(c, r);
    const p = planCraft(c, r, { batch: 3 });
    expect(p.mana).toBe(one.mana * 3);
    expect(p.materials).toBe(one.materials * 3);
    expect(p.difficulty).toBe(one.difficulty! + 2);
    c = craft(c, derive(c), r, { batch: 3 }, 30).character;
    expect(alch(c).crafted[0].qty).toBe(3);
    // Vypití vezme jen jeden kus ze tří.
    c = useCrafted(c, alch(c).crafted[0].uid).character;
    expect(alch(c).crafted.map((x) => [x.qty, !!x.active])).toEqual(expect.arrayContaining([[1, true], [2, false]]));
  });
  it('Koncentrované substance: +½ many a surovin, poznámka o posílení', () => {
    let c = learn(kloi(), 'koncentrovane_substance');
    const r = ranhojic();
    const one = planCraft(c, r);
    const p = planCraft(c, r, { concentrate: 0 });
    expect(p.mana).toBe(Math.ceil(one.mana * 1.5));
    c = craft(c, derive(c), r, { concentrate: 0 }, 30).character;
    expect(alch(c).crafted[0].note).toMatch(/dvojnásobné trvání/);
  });
  it('Bojová konzumace: −5 k hodu, +25 %, vypije se hned; neúspěch = vedlejší účinek', () => {
    let c = learn(kloi(), 'bojova_konzumace');
    const r = ranhojic();
    const one = planCraft(c, r);
    const p = planCraft(c, r, { combat: true });
    expect(p.materials).toBe(Math.ceil(one.materials * 1.25));
    expect(craftBonus(c, derive(c), false, true).total).toBe(craftBonus(c, derive(c)).total - 5);
    const ok = craft(c, derive(c), r, { combat: true }, 30);
    expect(alch(ok.character).crafted[0].active).toBe(true);
    const bad = craft(c, derive(c), r, { combat: true }, 1, undefined, undefined, 4);
    expect(bad.success).toBe(false);
    expect(bad.sideEffect?.name).toBe('Nezastavitelný třes');
    const lucky = craft(c, derive(c), r, { combat: true }, 1, undefined, undefined, 6);
    expect(lucky.success).toBe(true); // Rovnováha
    c = lucky.character;
    expect(alch(c).crafted[0].note).toMatch(/dvojnásobný účinek/);
  });
  it('Cestovní alchymie: +2 k Lučbě jen mimo dílnu', () => {
    let c = learn(kloi(), 'cestovni_alchymie');
    const base = craftBonus(kloi(), derive(kloi())).total;
    expect(craftBonus(c, derive(c)).total).toBe(base + 2);
    c = setWorkshop(c, { size: 1, kind: 'zakladni', access: 'pronajem', here: true });
    expect(craftBonus(c, derive(c)).total).toBe(base + 2); // dílna +2 místo Cestovní alchymie
  });
  it('Kotlík samovar: −5 surovin za dávku lektvaru', () => {
    let c = kloi();
    c.classState.alchymista!.crafted.push({ uid: 'k', recipeId: 'kotlik_samovar', name: 'Kotlík samovar', form: 'potion', danger: 17, extraManaLeft: null, extraManaMax: null, craftedAt: '', note: '', qty: 1 });
    const r = ranhojic();
    expect(planCraft(c, r, { samovar: true }).materials).toBe(planCraft(c, r).materials - 5);
    c = learn(c, 'hromadna_vyroba');
    expect(planCraft(c, r, { samovar: true, batch: 2 }).materials).toBe(planCraft(c, r, { batch: 2 }).materials - 10);
  });
  it('Pokročilá destilační aparatura: destilace 2× rychleji', () => {
    const c = kloi();
    const h = processHours(c, derive(c), 'mana', 120)!;
    c.classState.alchymista!.crafted.push({ uid: 'a', recipeId: 'pokrocila_destilacni_aparatura', name: 'Aparatura', form: 'potion', danger: 16, extraManaLeft: null, extraManaMax: null, craftedAt: '', note: '', qty: 1 });
    expect(h).toBe(4); // 120 many, Práce s manou st. 3 → 30 za hodinu
    expect(processHours(c, derive(c), 'mana', 120)).toBe(2);
  });
});

describe('ostatní schopnosti', () => {
  it('Laboratorní specialista: 5× úroveň dovednostních bodů zpětně', () => {
    const c = kloi(6);
    const e0 = derive(c).skillPoints.earned;
    learn(c, 'laboratorni_specialista');
    // sudé úrovně 2, 4, 6 → +1 × (2 + 4 + 6) = +12
    expect(derive(c).skillPoints.earned).toBe(e0 + 12);
  });
  it('Forenzika: +2 k Postřehu', () => {
    const c = kloi();
    c.skills.push({ id: 'postreh', customName: null, attribute: 'int', rank: 1, source: 'bought' });
    const t0 = derive(c).skills.find((s) => s.id === 'postreh')!.total;
    learn(c, 'forenzika');
    expect(derive(c).skills.find((s) => s.id === 'postreh')!.total).toBe(t0 + 2);
  });
  it('Recyklátor: základ zpět + polovina many a surovin', () => {
    let c = learn(kloi(), 'recyklator');
    c = craft(c, derive(c), recipeById('lektvar_ranhojic')!, {}, 30).character;
    const it = alch(c).crafted[0];
    const m0 = c.vitals.manaCurrent, s0 = alch(c).materialsCurrent;
    c = recycle(c, it.uid);
    expect(alch(c).crafted).toHaveLength(0);
    expect(c.vitals.manaCurrent).toBe(m0 + Math.floor((it.manaSpent ?? 0) / 2));
    expect(alch(c).materialsCurrent).toBe(s0 + Math.floor((it.materialsSpent ?? 0) / 2));
  });
  it('Sabotér: úspěch zapíše podmínku, neúspěch znehodnotí', () => {
    let c = learn(kloi(), 'saboter');
    c = craft(c, derive(c), recipeById('lektvar_ranhojic')!, {}, 30).character;
    const it = alch(c).crafted[0];
    const d = it.difficulty!;
    const ok = sabotage(c, it.uid, 'selže za úplňku', d + 1);
    expect(ok.success).toBe(true);
    expect(alch(ok.character).crafted[0].sabotage).toBe('selže za úplňku');
    const bad = sabotage(c, it.uid, 'x', d);
    expect(alch(bad.character).crafted[0].ruined).toBe(true);
  });
});

describe('specializace (PPP03) – co odemyká', () => {
  it('nabídka ukazuje zisky a 8 volitelných schopností každé specializace', () => {
    const c = kloi(5);
    c.progression.learnedBranches = ['nestabilni_substance', 'magicke_predmety'];
    const o = specOptions(c, emptyLevelUp()).find((x) => x.id === 'pyromant')!;
    expect(o.disabled).toBeNull();
    expect(o.details?.grants.join(' ')).toMatch(/Výheň/);
    expect(o.details?.unlocks.map((u) => u.name)).toEqual(expect.arrayContaining(['Konstrukty', 'Palné zbraně', 'Střely a rachejtle']));
    expect(o.details?.unlocks).toHaveLength(8);
  });
  it('volba specializace dá dovednost na 5. stupni a +5 k Lučbě u oboru', () => {
    let c = kloi(5);
    c.progression.learnedBranches = ['nestabilni_substance', 'magicke_predmety'];
    const st = { ...emptyLevelUp(), spec: 'pyromant' };
    expect(autoGains(c, st).join(' ')).toMatch(/Pyromancie na 5\. stupni/);
    c = applyLevelUp(c, st);
    expect(c.skills.find((s) => s.id === 'pyromancie')?.rank).toBe(5);
    const bomba = recipeById('bomba')!;
    expect(craftBonus(c, derive(c), false, false, bomba).total).toBe(craftBonus(c, derive(c)).total + 5);
    // Schopnosti specializace jsou teď volitelné, ostatních specializací ne.
    const opts = levelUpOptions(c);
    expect(opts.find((x) => x.id === 'konstrukty')?.disabled).toBeNull();
    expect(opts.find((x) => x.id === 'sesivanci')?.disabled).toMatch(/Medicus/);
  });
});
