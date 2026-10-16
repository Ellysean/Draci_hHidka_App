import { describe, expect, it } from 'vitest';
import { derive } from '../rules/derive';
import { applyRecommended, assignDie, attributesDone, learnRecommended, missingRecommended, missingSaveSkills, buildCharacter, buildEquipment, canStep, changeClass, diceState, finalAttributes, firstBlocked, newDraft, type Draft } from './draft';

const lomiel = (): Draft => ({
  ...newDraft(), name: 'Lómiel', raceId: 'elf', classId: 'kouzelnik', method: 'points',
  points: { sil: 4, obr: 4, odo: 5, int: 6, char: 1 },
});

describe('průvodce tvorbou postavy', () => {
  it('příklad H05: Lómiel, elfí kouzelnice, 20 bodů → 9/12/9/16/10', () => {
    expect(finalAttributes(lomiel())).toEqual({ sil: 9, obr: 12, odo: 9, int: 16, char: 10 });
    expect(attributesDone(lomiel())).toBe(true);
  });
  it('20 bodů musí být rozděleno celé', () => {
    const d = { ...lomiel(), points: { sil: 1, obr: 1, odo: 1, int: 1, char: 1 } };
    expect(attributesDone(d)).toBe(false);
  });
  it('hod 6×k6: nejnižší se škrtne a každá hodnota jde použít jednou', () => {
    let d: Draft = { ...newDraft(), raceId: 'clovek', classId: 'valecnik', rolls: [5, 4, 6, 5, 2, 1] };
    expect(diceState(d).struck).toBe(5);
    d = assignDie(d, 'sil', 2); // 6
    d = assignDie(d, 'odo', 2); // přesune šestku ze SIL na ODO
    expect(d.assign).toEqual({ odo: 2 });
    d = assignDie(assignDie(assignDie(assignDie(d, 'sil', 0), 'obr', 1), 'int', 3), 'char', 4);
    expect(finalAttributes(d)).toEqual({ sil: 6 + 5 + 3, obr: 6 + 4, odo: 6 + 6 + 3, int: 6 + 5, char: 6 + 2 });
  });
  it('kroky se odemykají postupně', () => {
    const d = newDraft();
    expect(firstBlocked(d)).toBe(0);
    expect(firstBlocked({ ...d, name: 'X' })).toBe(1);
    expect(canStep({ ...lomiel(), classId: 'klerik' }, 'povolani')).toBe(false);
  });
  it('doporučená výbava válečníka: zvolená zbraň, prošívaná zbroj, 11 zl', () => {
    const d: Draft = { ...lomiel(), classId: 'valecnik', choice: 0 };
    const eq = buildEquipment(d);
    expect(eq.weapons.map((w) => w.itemId)).toEqual(['jednorucni_tesak', 'jednorucni_nuz']);
    expect(eq.armor.itemId).toBe('zbroj_prosivana');
    expect(eq.purseMd).toBe(1100);
    expect(eq.items.find((i) => i.itemId === 'pochoden')?.qty).toBe(3);
  });
  it('nákup na míru odečte cenu z hozených peněz', () => {
    const d: Draft = { ...lomiel(), eqMode: 'custom', gold: 35, cart: [{ kind: 'weapon', id: 'jednorucni_dyka', qty: 1, md: 100 }] };
    expect(buildEquipment(d).purseMd).toBe(3400);
  });
  it('vytvořená postava: dovednosti povolání, životy a mana na maximu', () => {
    const c = buildCharacter({ ...lomiel(), picks: ['Blesk', 'Světlo', 'Levitace'], added: [{ id: 'postreh', customName: null, attribute: 'int' }] });
    const d = derive(c);
    expect(c.skills.filter((s) => s.rank === 3).map((s) => s.id)).toEqual(['mystika', 'vule', 'vzdelani', 'sesilani_kouzel']);
    expect(d.skillPoints.available.value).toBe(2);
    expect(c.vitals.hpCurrent).toBe(d.hpMax.value);
    expect(c.vitals.manaCurrent).toBe(8); // PPP04: 1. úr., INT 16
    expect(c.basic.notes).toBe('');
    expect(c.progression.learnedItems).toEqual(['Blesk', 'Světlo', 'Levitace']);
  });
  it('alchymista začíná s manou 12×INT−24 a surovinami 20×OBR+120', () => {
    const c = buildCharacter({ ...lomiel(), classId: 'alchymista', eqMode: 'recommended', choice: 0 });
    expect(c.vitals.manaCurrent).toBe(12 * c.attributes.int - 24);
    expect(c.classState.alchymista?.materialsCurrent).toBe(20 * c.attributes.obr + 120);
    expect(c.classState.alchymista?.bases).toHaveLength(19); // H10: 19 startovních základů, 7,3 lb
    expect(c.classState.alchymista!.bases.reduce((s, b) => s + b.weightLb * b.qty, 0)).toBeCloseTo(7.3, 5);
  });
  it('změna povolání smaže navázané volby, hod zůstane', () => {
    const d = changeClass({ ...lomiel(), picks: ['Blesk'], choice: 1, rolls: [1, 2, 3, 4, 5, 6] }, 'valecnik');
    expect(d.picks).toEqual([]);
    expect(d.choice).toBeNull();
    expect(d.rolls).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('doporučené dovednosti pro začínající hráče (H05 s. 7)', () => {
  it('kouzelník dostane Hbitost, Postřeh a Výdrž za 3 body', () => {
    const d = applyRecommended(lomiel());
    expect(d.added.map((a) => a.id)).toEqual(['hbitost', 'postreh', 'vydrz']);
    expect(derive(buildCharacter(d)).skillPoints.available.value).toBe(0);
    expect(missingRecommended(d)).toEqual([]);
  });
  it('člověku zbude bod navíc (Všestrannost)', () => {
    const d = applyRecommended({ ...lomiel(), raceId: 'clovek' });
    expect(d.added).toHaveLength(3);
    expect(derive(buildCharacter(d)).skillPoints.available.value).toBe(1);
  });
  it('klerik: místo Znalosti poměrů Etiketa (✔ U 16. 10. 2026)', () => {
    const d = applyRecommended({ ...lomiel(), classId: 'klerik' });
    expect(d.added.map((a) => a.id)).toEqual(['postreh', 'vzdelani', 'etiketa']);
    expect(buildCharacter(d).skills.find((s) => s.id === 'etiketa')).toMatchObject({ source: 'bought', rank: 1 });
  });
  it('chybějící dovednosti pro záchranné hody a jejich naučení za 1 bod', () => {
    let d = lomiel(); // kouzelník má Vůli
    expect(missingSaveSkills(d).map((r) => r.id)).toEqual(['atletika', 'postreh', 'vydrz', 'hbitost']);
    d = learnRecommended(d, missingSaveSkills(d)[0]);
    expect(d.added.map((a) => a.id)).toEqual(['atletika']);
    expect(missingSaveSkills(d)).toHaveLength(3);
    d = learnRecommended(learnRecommended(d, missingSaveSkills(d)[0]), missingSaveSkills(d)[1]);
    expect(derive(buildCharacter(d)).skillPoints.available.value).toBe(0);
    expect(learnRecommended(d, missingSaveSkills(d)[0])).toBe(d); // bez bodů nic
  });
  it('už naučené se nepřidají znovu a nepřekročí se body', () => {
    let d: Draft = { ...lomiel(), added: [{ id: 'postreh', customName: null, attribute: 'int' }, { id: 'atletika', customName: null, attribute: 'sil' }] };
    d = applyRecommended(d);
    expect(d.added.map((a) => a.id)).toEqual(['postreh', 'atletika', 'hbitost']);
    expect(missingRecommended(d).map((r) => r.id)).toEqual(['vydrz']);
  });
});
