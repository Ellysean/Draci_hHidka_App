import { describe, expect, it } from 'vitest';
import { sampleKloi } from '../model/sample';
import { derive } from './derive';
import { rollCheck } from './dice';
import {
  addBlock, addSkill, purchasable, raiseBlockNow, raiseSkill, raisedAtLevel, removeSkill, setSkillAttribute,
  setSkillRankManual, undoRaise, undoableRaise,
} from './skills';

describe('dovednosti mimo průvodce (Fáze 4)', () => {
  it('Kloi 3. úr.: získáno 13 (3 + 5×2), utraceno 5, zbývá 8; celkový bonus = stupeň + oprava', () => {
    const d = derive(sampleKloi());
    expect(d.skillPoints.earned).toBe(13);
    expect(d.skillPoints.spent).toBe(5);
    expect(d.skillPoints.available.value).toBe(8);
    const lucba = d.skills.find((s) => s.id === 'lucba')!;
    expect(lucba).toMatchObject({ rank: 4, mod: 3, total: 7, source: 'class-profession' });
  });

  it('zlepšení stojí cílový stupeň, zapíše se k aktuální úrovni a podruhé na téže úrovni nejde', () => {
    const c = raiseSkill(sampleKloi(), 'mechanika');
    expect(c.skills.find((s) => s.id === 'mechanika')!.rank).toBe(4);
    expect(c.skillLog.at(-1)).toEqual({ level: 3, skillId: 'mechanika', from: 3, to: 4, cost: 4 });
    expect(derive(c).skillPoints.available.value).toBe(4);
    expect(raisedAtLevel(c, 'mechanika')).toBe(1);
    expect(raiseBlockNow(c, 'mechanika')).toBe('už zlepšeno na 3. úr.');
    expect(raiseSkill(c, 'mechanika')).toBe(c);
  });

  it('bez bodů nejde zlepšit; zlepšení z minulé úrovně limit neblokuje', () => {
    const c = sampleKloi();
    expect(raiseBlockNow(c, 'lucba')).toBe(''); // zlepšeno na 2. úr., teď 3. úr., cena 5 ≤ 8
    const poor = raiseSkill(raiseSkill(c, 'lucba'), 'vzdelani'); // 8 − 5 = 3, Vzdělání stojí 4
    expect(raiseBlockNow(poor, 'vzdelani')).toBe('chybí body (4)');
  });

  it('vrácení zlepšení z aktuální úrovně vrátí stupeň i body; starší úrovně vrátit nejde', () => {
    const c = sampleKloi();
    expect(undoableRaise(c, 'lucba')).toBeNull(); // zlepšeno na 2. úrovni
    const x = undoRaise(raiseSkill(c, 'vzdelani'), 'vzdelani');
    expect(x.skills).toEqual(c.skills);
    expect(x.skillLog).toEqual(c.skillLog);
  });

  it('Expertiza: na sudé úrovni jedna dovednost až +2 (nejvýš úroveň + 2), druhá už jen +1', () => {
    const c = sampleKloi();
    c.progression.level = 4;
    c.progression.learnedAbilities = [{ id: 'expertiza' }];
    c.overrides.skillPointsAvailable = 50;
    let x = raiseSkill(raiseSkill(c, 'mechanika'), 'mechanika');
    expect(x.skills.find((s) => s.id === 'mechanika')!.rank).toBe(5);
    expect(raiseBlockNow(x, 'mechanika')).toBe('už zlepšeno na 4. úr.');
    x = raiseSkill(x, 'vzdelani');
    expect(raiseBlockNow(x, 'vzdelani')).toBe('Expertiza už použita');
    // strop úroveň + 2 u druhého stupně
    const hi = { ...c, skills: c.skills.map((s) => (s.id === 'lucba' ? { ...s, rank: 5 } : s)) };
    expect(raiseBlockNow(raiseSkill(hi, 'lucba'), 'lucba')).toBe('max. stupeň 6');
  });

  it('nová dovednost: jen obecná za 1 bod; profesní nejde, duplicitní nejde, vlastní s názvem', () => {
    const c = sampleKloi();
    expect(purchasable(c).some((s) => s.kind === 'profession')).toBe(false);
    expect(purchasable(c).some((s) => s.id === 'postreh')).toBe(false);
    expect(addBlock(c, { id: 'postreh' })).toBe('Tuhle dovednost už postava má.');
    expect(addBlock(c, { id: 'stopovani' })).toBe('Profesní dovednost dává jen schopnost povolání.');
    expect(addBlock(c, { customName: '  ' })).toBe('Napiš název dovednosti.');
    const x = addSkill(addSkill(c, { id: 'akrobacie', attribute: 'obr' }), { customName: 'Lodní řemeslo', attribute: 'sil' });
    expect(x.skills.slice(-2)).toEqual([
      { id: 'akrobacie', customName: null, attribute: 'obr', rank: 1, source: 'bought' },
      { id: 'custom:lodní řemeslo', customName: 'Lodní řemeslo', attribute: 'sil', rank: 1, source: 'custom' },
    ]);
    expect(derive(x).skillPoints.available.value).toBe(6);
    expect(addBlock(x, { customName: 'lodní řemeslo' })).toBe('Tuhle dovednost už postava má.');
  });

  it('odebrat jde jen koupenou/vlastní dovednost a body se vrátí', () => {
    const c = sampleKloi();
    expect(removeSkill(c, 'lucba')).toBe(c);
    const x = removeSkill(c, 'postreh');
    expect(x.skills.some((s) => s.id === 'postreh')).toBe(false);
    expect(derive(x).skillPoints.available.value).toBe(9);
  });

  it('atribut jde změnit jen na povolený; ruční stupeň je celé číslo ≥ 1 bez záznamu', () => {
    const c = sampleKloi();
    expect(setSkillAttribute(c, 'mechanika', 'int').skills[0].attribute).toBe('int');
    expect(setSkillAttribute(c, 'vzdelani', 'sil').skills[1].attribute).toBe('int');
    const m = setSkillRankManual(c, 'vzdelani', 0);
    expect(m.skills[1].rank).toBe(1);
    expect(setSkillRankManual(c, 'vzdelani', 6.4).skills[1].rank).toBe(6);
    expect(m.skillLog).toEqual(c.skillLog);
  });
});

describe('ověřovací hod k10 (H06)', () => {
  const seq = (...xs: number[]) => () => xs.shift()!;
  it('10 a sudá = kritický úspěch, 1 a lichá = fatální neúspěch, jinak bez druhého hodu', () => {
    expect(rollCheck(5, true, seq(10, 4))).toEqual({ die: 10, second: 4, bonus: 5, total: 15, outcome: 'critical' });
    expect(rollCheck(5, true, seq(10, 3)).outcome).toBeNull();
    expect(rollCheck(2, true, seq(1, 7))).toMatchObject({ total: 3, outcome: 'fumble' });
    expect(rollCheck(2, true, seq(6))).toEqual({ die: 6, second: null, bonus: 2, total: 8, outcome: null });
    expect(rollCheck(2, false, seq(10))).toMatchObject({ second: null, outcome: null });
  });
});
