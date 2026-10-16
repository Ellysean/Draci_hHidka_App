import { describe, expect, it } from 'vitest';
import { sampleKloi } from '../model/sample';
import type { Character } from '../model/types';
import {
  addBase, alch, artRow, autoAssign, buyResource, capacity, craft, craftBonus, distill, gatherYield, knownRecipes,
  perceiveMin, planCraft, recipeById, RECIPES, setWorkshop, startingBases, undoAlchemy, useCrafted,
} from './alchemy';
import { derive } from './derive';
import { moneyToMd } from './money';

/** Kloi (gnóm, OBR 16, INT 15, Lučba 4, 3. úroveň) se startovními základy. */
const kloi = (): Character => {
  const c = sampleKloi();
  c.classState.alchymista!.bases = startingBases();
  return c;
};

describe('tabulka alchymistického umění (H10, xlsx 25. 9. 2026)', () => {
  it('obtížnost destilace podle množství; 10–19 ✔ U', () => {
    expect(artRow(3).process).toBe(5);
    expect(artRow(19).process).toBe(9);
    expect(artRow(30).process).toBe(11); // příklad Kloi: 30 many, obtížnost 11
    expect(artRow(5000).process).toBe(29);
  });
  it('dlouhodobý sběr: hod 11 → 10 surovin za hodinu, 1 mana (příklad z H10)', () => {
    expect(gatherYield(11, 'materials', 1).amount).toBe(10);
    expect(gatherYield(11, 'mana', 1).amount).toBe(1);
    expect(gatherYield(5, 'mana', 10).fail).toBe(true);
  });
  it('vnímání many: hod 10 odhalí 600 a víc (příklad Nerd)', () => {
    expect(perceiveMin(10)).toBe(600);
    expect(perceiveMin(1)).toBeNull();
  });
});

describe('recepty a výroba', () => {
  it('52 receptů H10 + svitek + 30 PPP03; známé podle úrovně a oborů', () => {
    expect(RECIPES).toHaveLength(168); // + 30 PPP03 (7a.2) + 26 Medicus + 32 Pyromant + 27 Theurg (7a+)
    const c = kloi();
    c.progression.level = 1;
    c.progression.learnedBranches = [];
    expect(knownRecipes(c)).toHaveLength(13);
    c.progression.level = 2;
    expect(knownRecipes(c)).toHaveLength(28);
    c.progression.learnedBranches = ['nestabilni_substance'];
    expect(knownRecipes(c).map((r) => r.name)).toEqual(expect.arrayContaining(['Bomba', 'Černé světlo', 'Kovožrout', 'Plamenná čepel']));
  });
  it('bonus k výrobě: Lučba + OBR + Zručnost gnóma; dílna jen když v ní pracuje', () => {
    let c = kloi();
    expect(craftBonus(c, derive(c)).total).toBe(4 + 3 + 2);
    c = setWorkshop(c, { size: 2, kind: 'zakladni', access: 'pronajem', here: true });
    expect(craftBonus(c, derive(c)).total).toBe(12);
    expect(craftBonus(c, derive(c), true).total).toBe(17);
  });
  it('startovní základy stačí na základní recepty (párování podle názvu)', () => {
    const c = kloi();
    for (const id of ['vybusna_hlina', 'lektvar_mucholapka', 'lektvar_zmeny_velikosti', 'univerzalni_protijed', 'elixir_medvedi_sily', 'alchymistuv_lih', 'dymovnice']) {
      const p = planCraft(c, recipeById(id)!);
      expect(p.missing.bases, id).toEqual([]);
    }
    expect(planCraft(c, recipeById('krvave_ostri')!).missing.bases).toEqual(['čerstvá skřetí krev']); // dýka z výzbroje
  });
  it('výroba odečte zdroje i při neúspěchu; úspěch = hod > obtížnost, Nebezpečnost = hod', () => {
    const c = kloi();
    const r = recipeById('vybusna_hlina')!; // obtížnost 8, 95 surovin
    const d = derive(c);
    const ok = craft(c, d, r, {}, 13);
    expect(ok.success).toBe(true);
    const s = alch(ok.character);
    expect(s.materialsCurrent).toBe(440 - 95);
    expect(s.crafted[0]).toMatchObject({ name: 'Výbušná hlína', danger: 13 });
    expect(s.bases.some((b) => /hlín/.test(b.name))).toBe(false);
    const fail = craft(c, d, r, {}, 8);
    expect(fail.success).toBe(false);
    expect(alch(fail.character).materialsCurrent).toBe(345);
    expect(alch(fail.character).crafted).toHaveLength(0);
    const back = undoAlchemy(ok.character);
    expect(alch(back).materialsCurrent).toBe(440);
    expect(alch(back).bases).toHaveLength(19);
  });
  it('varianty many: Bomba zesílená, Efektivní výroba, Sibériovy elixíry, přídavná mana', () => {
    const c = kloi();
    expect(planCraft(c, recipeById('bomba')!, { variant: 0 })).toMatchObject({ mana: 30, difficulty: 10 });
    expect(planCraft(c, recipeById('elixir_medvedi_sily')!, { efficient: true })).toMatchObject({ mana: 27, materials: 27 });
    expect(planCraft(c, recipeById('siberiovy_posilujici_elixiry')!, { siberioBonus: 3 })).toMatchObject({ mana: 70, difficulty: 12, materials: 65 });
    expect(planCraft(c, recipeById('amulet_many')!, { extraMana: 50 })).toMatchObject({ mana: 130, extraMana: 10 });
    expect(planCraft(c, recipeById('carovny_stit')!).missing.workshop).toBe(true);
  });
  it('forma oleje potřebuje navíc olej', () => {
    const c = kloi();
    const p = planCraft(c, recipeById('lektvar_ranhojic')!, { form: 'oil' });
    expect(p.reqs).toHaveLength(2);
    expect(autoAssign(c, recipeById('lektvar_ranhojic')!).filter(Boolean)).toHaveLength(1);
  });
  it('limit 1 aktivní lektvar', () => {
    let c = kloi();
    const d = derive(c);
    c = craft(c, d, recipeById('lektvar_ranhojic')!, {}, 12).character;
    c = addBase(c, 'víno', 1, 0.4);
    c = craft(c, derive(c), recipeById('lektvar_ranhojic')!, {}, 12).character;
    const [a, b] = alch(c).crafted;
    c = useCrafted(c, a.uid).character;
    expect(useCrafted(c, b.uid).warning).toMatch(/lektvar/);
  });
});

describe('zdroje', () => {
  it('destilace: 30 many, hod 12 > 11 → úspěch (příklad Kloi)', () => {
    const c = kloi();
    const r = distill(c, 30, 12);
    expect(r.success).toBe(true);
    expect(r.character.vitals.manaCurrent).toBe(186);
    expect(distill(c, 30, 11).success).toBe(false);
  });
  it('kapacita: nádoby, Krystaly a energie ×2, vlastní dílna', () => {
    let c = kloi();
    expect(capacity(c)).toMatchObject({ mana: 200, materials: 800 });
    c.progression.learnedBranches = ['krystaly_a_energie'];
    expect(capacity(c)).toMatchObject({ mana: 400, materials: 1600 });
    c = setWorkshop(c, { size: 1, kind: 'zakladni', access: 'vlastni', here: false });
    expect(capacity(c)).toMatchObject({ mana: 1200, materials: 6000 });
  });
  it('nákup čisté many 3 st/bod', () => {
    const c = kloi();
    const r = buyResource(c, 'mana', 10);
    expect(r.character.vitals.manaCurrent).toBe(166);
    expect(moneyToMd(r.character.equipment.money)).toBe(moneyToMd(c.equipment.money) - 300);
  });
});
