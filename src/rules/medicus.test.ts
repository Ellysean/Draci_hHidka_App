// 7a+.1 – specializace Medicus z PPP03 (s. 127–142).
import { describe, expect, it } from 'vitest';
import { sampleKloi } from '../model/sample';
import type { Character, StitchPart } from '../model/types';
import { addBase, alch, craft, craftBonus, knownRecipes, planCraft, recipeById, setWorkshop } from './alchemy';
import { derive } from './derive';
import {
  augmentOutcome, crystalCount, makeAerosol, partAttack, partDifficulty, planStitch, plasticDc, resuscitationDc, splitInjection, stitch,
  stitchedDefense, stitchedHpMax, surgeryBonus,
} from './medicus';

const medicus = (...abilities: string[]): Character => {
  const c = sampleKloi();
  c.progression.level = 6;
  c.progression.learnedBranches = ['alchymisticka_anatomie', 'lektvary_a_elixiry'];
  c.progression.specialization = 'medicus';
  c.progression.learnedAbilities.push(...abilities.map((id) => ({ id })));
  c.skills.push({ id: 'chirurgie', customName: null, attribute: 'obr', rank: 5, source: 'class-profession' });
  c.vitals.manaCurrent = 3000;
  c.classState.alchymista!.materialsCurrent = 3000;
  return c;
};
const part = (kind: StitchPart['kind'], type: string, sourceLevel: number): StitchPart => ({ uid: `${kind}-${type}`, kind, type, source: 'tvor', sourceLevel });

describe('recepty Medika', () => {
  it('tinktury Chirurgie zná jen Medicus, recepty schopností až se schopností', () => {
    const plain = sampleKloi();
    expect(knownRecipes(plain).some((r) => r.id === 'uspavaci_tinktura')).toBe(false);
    const c = medicus();
    const ids = knownRecipes(c).map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(['paralyzujici_tinktura', 'tinktura_proti_bolesti', 'uspavaci_tinktura', 'konzervacni_lak']));
    expect(ids).not.toContain('druhe_srdce');
    const all = knownRecipes(medicus('biologicka_augmentace', 'infuze_a_inhalace', 'mechanicka_augmentace', 'sesivanci', 'tetovani')).map((r) => r.id);
    expect(all).toEqual(expect.arrayContaining(['druhy_mozek', 'druhe_srdce', 'vili_kridla', 'zabra', 'elixir_lasky', 'umela_krev', 'bio_rozhrani',
      'exoskelet', 'mechanicke_oko', 'umela_noha', 'umela_paze', 'kontrolni_krystal', 'inkoust_prubezne_lecby', 'inkoust_protekce_ohne']));
    expect(all.length - ids.length).toBe(22);
  });

  it('hodnoty receptů podle PPP03', () => {
    const r = recipeById('umela_paze')!;
    expect([r.mana.base, r.materials, r.difficulty.value, r.craftSkill]).toEqual([300, 300, 14, 'mechanika']);
    const k = recipeById('kontrolni_krystal')!;
    expect([k.mana.base, k.materials, k.difficulty.value, k.craftTime.workshopKind]).toEqual([50, 10, 19, 'laborator']);
    expect(recipeById('elixir_lasky')!.frequencyText).toBe('1 ročně');
    expect(recipeById('inkoust_protekce_fyzickych_zraneni')!.mana.base).toBe(80);
  });

  it('recepty „v laboratoři“ chtějí laboratoř, ne obyčejnou dílnu', () => {
    let c = medicus('biologicka_augmentace');
    c = addBase(c, 'srdce humanoida', 1, 1);
    const r = recipeById('druhe_srdce')!;
    c = setWorkshop(c, { size: 1, kind: 'zakladni', access: 'vlastni', here: true });
    expect(planCraft(c, r).missing.workshop).toBe(true);
    c = setWorkshop(c, { size: 1, kind: 'laborator', access: 'vlastni', here: true });
    const p = planCraft(c, r);
    expect(p.missing.workshop).toBe(false);
    expect(p.ok).toBe(true);
  });

  it('mechanické implantáty se vyrábějí Mechanikou, laboratoř jí bonus nedává', () => {
    let c = medicus('mechanicka_augmentace');
    c = setWorkshop(c, { size: 2, kind: 'laborator', access: 'vlastni', here: true });
    const d = derive(c);
    const mech = d.skills.find((s) => s.id === 'mechanika')!.total;
    const b = craftBonus(c, d, false, false, recipeById('umela_noha')!);
    expect(b.parts[0]).toMatch(/^Mechanika/);
    expect(b.total).toBe(mech + 2); // + gnóm Zručnost, bez dílny
    const lucba = craftBonus(c, d, false, false, recipeById('konzervacni_lak')!);
    expect(lucba.total).toBe(d.skills.find((s) => s.id === 'lucba')!.total + 3 + 2);
  });

  it('Laboratoř dává bonus k Chirurgii jen při práci v ní', () => {
    let c = medicus();
    const base = surgeryBonus(c, derive(c)).total;
    c = setWorkshop(c, { size: 3, kind: 'laborator', access: 'vlastni', here: true });
    expect(surgeryBonus(c, derive(c)).total).toBe(base + 4);
    c = setWorkshop(c, { size: 3, kind: 'laborator', access: 'vlastni', here: false });
    expect(surgeryBonus(c, derive(c)).total).toBe(base);
  });
});

describe('operace', () => {
  it('augmentace: neúspěch o 5 a víc u biologické = smrt', () => {
    expect(augmentOutcome(16, 15, 'bio')).toBe('ok');
    expect(augmentOutcome(15, 15, 'bio')).toBe('fail');
    expect(augmentOutcome(10, 15, 'bio')).toBe('death');
    expect(augmentOutcome(10, 15, 'mech')).toBe('fail');
  });
  it('resuscitace 15 + 3/min do 5 minut, plastika +5 za operaci', () => {
    expect(resuscitationDc(0)).toBe(15);
    expect(resuscitationDc(4)).toBe(27);
    expect(resuscitationDc(6)).toBeNull();
    expect(plasticDc(2)).toBe(25);
  });
});

describe('Infuze a inhalace', () => {
  it('injekce rozdělí flakón na 2 dávky, aerosol má poloviční účinek', () => {
    let c = addBase(medicus('infuze_a_inhalace'), 'mák', 2, 0.1);
    const r = recipeById('tinktura_proti_bolesti')!;
    c = craft(c, derive(c), r, {}, 30, undefined, '2026-09-27T10:00:00Z').character;
    c = craft(c, derive(c), r, {}, 30, undefined, '2026-09-27T10:05:00Z').character;
    const made = alch(c).crafted.filter((x) => x.recipeId === r.id);
    expect(made).toHaveLength(2);
    c = splitInjection(c, made[0].uid);
    const inj = alch(c).crafted.filter((x) => x.injection);
    expect(inj.map((x) => x.qty)).toEqual([2]);
    c = makeAerosol(c, made[1].uid);
    expect(alch(c).crafted.filter((x) => x.aerosol)).toHaveLength(1);
  });
});

describe('Sešívanci', () => {
  const base = { name: 'vlk', level: 3, size: 'B' as const, sil: 2, obr: 3, odo: 1, skin: 'Srst' };

  it('obtížnost částí, útok a ZO podle tabulek PPP03', () => {
    expect(partDifficulty(part('limb', 'Drápy', 4))).toBe(6);
    expect(partDifficulty(part('head', 'Kly', 4))).toBe(9);
    expect(partDifficulty(part('special', 'křídla', 2))).toBe(5);
    expect(partDifficulty(part('skin', 'Šupiny', 5))).toBe(5);
    // ÚČ = SIL 2 + ½ úr. 3 (↑2) + Pařáty B 5 = 9, útočnost +2
    expect(partAttack(base, part('limb', 'Pařáty', 3))).toMatchObject({ attack: 9, damage: 2 });
    // ZO = OBR 3 + ¼ úr. 3 (↑1) + Šupiny B 5 − Srst B 2 = 7
    expect(stitchedDefense({ base, parts: [part('skin', 'Šupiny', 5)] })?.value).toBe(7);
    expect(stitchedDefense({ base, parts: [] })).toBeNull();
    // 10 + (5 + 1) × 3 = 28
    expect(stitchedHpMax(base)).toBe(28);
  });

  it('tvorba: 300 + 100 many a 100 + 100 surovin za část, 2 krystaly, odečet i při neúspěchu', () => {
    let c = medicus('sesivanci');
    const parts = [part('limb', 'Drápy', 2), part('head', 'Kly', 3)];
    expect(planStitch(c, base, parts).missing.crystal).toBe(true);
    const k = recipeById('kontrolni_krystal')!;
    c = addBase(c, 'křišťál', 2, 0.1);
    c = setWorkshop(c, { size: 1, kind: 'laborator', access: 'vlastni', here: true });
    c = craft(c, derive(c), k, {}, 30).character;
    c = craft(c, derive(c), k, {}, 30).character;
    expect(crystalCount(c)).toBe(2);
    const p = planStitch(c, base, parts);
    expect([p.mana, p.materials, p.difficulty, p.hours, p.ok]).toEqual([500, 300, 12, 8, true]);
    const mana = c.vitals.manaCurrent;
    const ok = stitch(c, base, parts, 13, { name: 'Šedák' });
    expect(ok.success).toBe(true);
    const cr = alch(ok.character).stitched[0];
    expect([cr.name, cr.hpCurrent, cr.difficulty, cr.parts.length]).toEqual(['Šedák', 28, 12, 2]);
    expect(crystalCount(ok.character)).toBe(1);
    expect(ok.character.vitals.manaCurrent).toBe(mana - 500);
    // vylepšení: obtížnost tvora + nové části, 100/100 za část
    const up = planStitch(ok.character, base, [part('skin', 'Šupiny', 5)], cr);
    expect([up.mana, up.materials, up.difficulty, up.ok]).toEqual([100, 100, 17, true]);
    const fail = stitch(c, base, parts, 12);
    expect(fail.success).toBe(false);
    expect(alch(fail.character).stitched).toHaveLength(0);
    expect(fail.character.vitals.manaCurrent).toBe(mana - 500);
  });
});
