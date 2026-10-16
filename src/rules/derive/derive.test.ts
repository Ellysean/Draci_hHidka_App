import { describe, expect, it } from 'vitest';
import { newCharacter } from '../../model/defaults';
import { sampleKloi } from '../../model/sample';
import { attributeMod, derive, lookupByLevel } from './index';
import { HP_TABLE } from '../data';

describe('oprava za atribut (H05)', () => {
  it.each([[1, -5], [4, -3], [9, -1], [10, 0], [11, 0], [15, 2], [16, 3], [19, 4], [22, 6]])('stupeň %i → %i', (v, m) => {
    expect(attributeMod(v)).toBe(m);
  });
});

describe('Kloi – gnómská alchymistka 3. úrovně', () => {
  const d = derive(sampleKloi());
  it('opravy', () => expect(d.mods).toEqual({ sil: -1, obr: 3, odo: 1, int: 2, char: 0 }));
  it('velikost a pohyblivost gnóma', () => {
    expect(d.size.value).toBe('A');
    expect(d.mobility.value).toBe(23);
  });
  it('max. životy z Tabulky životů (3. úr., ODO 12)', () => expect(d.hpMax.value).toBe(16));
  it('hranice smrti', () => expect(d.deathThreshold.value).toBe(-11));
  it('alchymista nemá max. many', () => expect(d.manaMax.value).toBeNull());
  it('ZO = OBR + prošívaná zbroj', () => expect(d.defenseBase.value).toBe(5));
  it('ÚČ/OČ po zbraních', () => {
    const [dyka, kuse] = d.weapons;
    expect([dyka.attackNumber, dyka.defenseNumber]).toEqual([2, 6]);
    expect([kuse.attackNumber, kuse.defenseNumber]).toEqual([9, 5]);
    expect(d.attackNumber.value).toBe(2); // první vybavená zbraň
  });
  it('dovednostní body: 3 + 5×2 (2. úr.) − 5 utracených', () => {
    expect(d.skillPoints.earned).toBe(13);
    expect(d.skillPoints.available.value).toBe(8);
  });
  it('celkový bonus dovednosti = stupeň + oprava', () => {
    expect(d.skills.find((s) => s.id === 'lucba')?.total).toBe(7);
  });
  // výbava 6 + dýka 0,5 + kuše 3,5 + prošívaná 1,8 + (156 + 440)/100 + základy 7,3 (startovní) + 0,3 = 25,4
  it('naložení včetně many, surovin a základů', () => expect(d.load.value).toBe(25.4));
  it('zkušenosti a další úroveň', () => {
    expect(d.experience).toMatchObject({ levelByXp: 3, nextLevelXp: 2200, missing: 900, canLevelUp: false, belowLevel: false });
    expect(d.experience.progress).toBeCloseTo(200 / 1100);
  });
  it('charakterové body na 3. úrovni', () => expect(d.characterPointsDue).toBe(2));
});

describe('další pravidla', () => {
  it('člověk: +1 bod na 1. úrovni a +úroveň na sudých úrovních', () => {
    const c = newCharacter();
    c.basic.raceId = 'clovek';
    c.basic.classId = 'valecnik';
    c.progression.level = 4;
    // 1. úr. 3+1; 2. úr. 3×2+2; 4. úr. 3×4+4 → 4 + 8 + 16
    expect(derive(c).skillPoints.earned).toBe(28);
  });
  it('obr má Hroší kůži +2 k ZO', () => {
    const c = newCharacter();
    c.basic.raceId = 'obr';
    expect(derive(c).defenseBase.value).toBe(2);
  });
  it('přetížení zbroje −5 k ZO', () => {
    const c = newCharacter();
    c.attributes.sil = 9; // oprava −1 < požadavek +0
    c.equipment.armor.itemId = 'zbroj_krouzkova';
    const d = derive(c);
    expect(d.armorOverloaded).toBe(true);
    expect(d.defenseBase.value).toBe(0 + 4 - 5);
  });
  it('mana kouzelníka z tabulky PPP04 (1. úr., INT 15 → 8)', () => {
    const c = newCharacter();
    c.basic.classId = 'kouzelnik';
    c.attributes.int = 15;
    expect(derive(c).manaMax.value).toBe(8);
  });
  it('duševní síla hraničáře z tabulky H09 (✔ U 19. 9. 2026)', () => {
    const c = newCharacter();
    c.basic.classId = 'hranicar';
    c.attributes.int = 10;
    expect(derive(c).manaMax.value).toBe(5); // 1. úr., INT 10
    c.progression.level = 5;
    expect(derive(c).manaMax.value).toBe(15);
    c.progression.level = 6;
    c.attributes.int = 28;
    expect(derive(c).manaMax.value).toBe(37);
  });
  it('hraničář s INT pod tabulkou má 0 duševní síly', () => {
    const c = newCharacter();
    c.basic.classId = 'hranicar';
    c.attributes.int = 3;
    expect(derive(c).manaMax.value).toBe(0);
  });
  it('nad 6. úrovní: H09 pro 6. úroveň + přírůstek PPP02 (✔ U 16. 10. 2026), ruční přepis dál funguje', () => {
    const c = newCharacter();
    c.basic.classId = 'hranicar';
    c.attributes.int = 16;
    c.progression.level = 6;
    expect(derive(c).manaMax.value).toBe(24); // H09
    c.progression.level = 7;
    expect(derive(c).manaMax.value).toBe(26); // 24 + (PPP02 7. úr. 19 − 6. úr. 17)
    expect(derive(c).manaMax.formula).toContain('dopočet');
    c.progression.level = 24;
    expect(derive(c).manaMax.value).toBe(51); // 24 + (44 − 17)
    c.overrides = { manaMax: 20 };
    expect(derive(c).manaMax).toMatchObject({ value: 20, overridden: true });
  });
  it('válečník: adrenalin mimo boj max. ODO, min. 1', () => {
    const c = newCharacter();
    expect(derive(c).manaMax.value).toBe(1);
  });
  it('Skvělá kondice +3 životy za úroveň, Urputnost posune hranici smrti', () => {
    const c = newCharacter();
    c.progression.level = 2;
    c.progression.learnedAbilities = [{ id: 'skvela_kondice' }, { id: 'urputnost' }];
    const d = derive(c);
    expect(d.hpMax.value).toBe(12 + 6);
    expect(d.deathThreshold.value).toBe(-10 - 2);
  });
  it('zmrzačená noha půlí pohyblivost (zaokrouhleno nahoru)', () => {
    const c = newCharacter();
    c.attributes.obr = 13; // +1 → 31
    c.vitals.conditions = [{ id: 'zmrz_noha', stacks: 1, note: '' }];
    expect(derive(c).mobility.value).toBe(16);
  });
  it('tabulka mimo rozsah bere krajní hodnotu', () => {
    expect(lookupByLevel(HP_TABLE, 40, 1)).toEqual({ value: 19, outOfRange: true });
    expect(lookupByLevel(HP_TABLE, 2, 99).value).toBe(47);
  });
  it('ruční přepis (overrides) přebije vzorec a zachová vypočtenou hodnotu', () => {
    const c = newCharacter();
    c.overrides = { hpMax: 30, loadLimit: 40 };
    const d = derive(c);
    expect(d.hpMax).toMatchObject({ value: 30, computed: 10, overridden: true });
    expect(d.loadLimit.value).toBe(40);
  });
});

describe('Fáze 3 – ruční přepis, pohyb, limity, zkušenosti', () => {
  it('přepis max. životů drží vzorcovou hodnotu v computed', () => {
    const c = newCharacter();
    c.overrides.hpMax = 25;
    const d = derive(c);
    expect(d.hpMax).toMatchObject({ value: 25, computed: 10, overridden: true });
  });
  it('přepis velikosti písmenem', () => {
    const c = newCharacter();
    c.overrides.size = 'C';
    expect(derive(c).size).toMatchObject({ value: 'C', computed: 'B', overridden: true });
  });
  it('nečíselný přepis se ignoruje', () => {
    const c = newCharacter();
    c.overrides.mobility = 'abc';
    expect(derive(c).mobility.overridden).toBe(false);
  });
  it('krátké pohyby z pohyblivosti, zaokrouhleno nahoru (H16, H06)', () => {
    const c = newCharacter();
    c.attributes.obr = 16; // +3 → 33
    expect(derive(c).moves).toEqual({ instant: 4, advance: 9, sprint: 33, sneak: 4 });
  });
  it('pohyby se počítají z přepsané pohyblivosti', () => {
    const c = newCharacter();
    c.overrides.mobility = 20;
    expect(derive(c).moves.advance).toBe(5);
  });
  it('Magie pocestných +10 k pohyblivosti', () => {
    const c = newCharacter();
    c.basic.classId = 'hranicar';
    c.progression.learnedBranches = ['magie_pocestnych'];
    expect(derive(c).mobility.value).toBe(40);
  });
  it('přetížení nad ručně zadanou nosností', () => {
    const c = sampleKloi();
    expect(derive(c).overloaded).toBe(false);
    c.overrides.loadLimit = 10;
    expect(derive(c).overloaded).toBe(true);
    c.overrides.loadLimit = 30;
    expect(derive(c).overloaded).toBe(false);
  });
  it('body únavy nad ručně zadaným maximem', () => {
    const c = newCharacter();
    c.vitals.fatiguePoints = 5;
    expect(derive(c).fatigueOver).toBe(false);
    c.overrides.fatigueMax = 4;
    expect(derive(c).fatigueOver).toBe(true);
  });
  it('málo zkušeností pro aktuální úroveň', () => {
    const c = newCharacter();
    c.progression.level = 3;
    c.progression.experience = 600;
    expect(derive(c).experience).toMatchObject({ belowLevel: true, progress: 0 });
  });
  it('24. úroveň nemá další práh', () => {
    const c = newCharacter();
    c.progression.level = 24;
    c.progression.experience = 500000;
    expect(derive(c).experience).toMatchObject({ nextLevelXp: null, progress: null, canLevelUp: false });
  });
});

describe('Zocelení (H09 – platí text: +4 ODO)', () => {
  it('+4 stupně ODO → oprava, životy z tabulky i hranice smrti', () => {
    const c = newCharacter();
    c.basic.classId = 'hranicar';
    c.progression.level = 3;
    c.attributes.odo = 10;
    const before = derive(c);
    c.progression.learnedAbilities = [{ id: 'zoceleni' }];
    const d = derive(c);
    expect(d.attributes.odo).toMatchObject({ value: 14, bonus: 4 });
    expect(c.attributes.odo).toBe(10); // zapsaný základ se nemění
    expect(d.mods.odo).toBe(2);
    expect(d.deathThreshold.value).toBe(-12);
    expect(d.hpMax.value).toBeGreaterThan(before.hpMax.value);
    expect(d.hpMax.formula).toContain('ODO 14');
  });
});

describe('ruční přepis jen celými čísly', () => {
  it('starší desetinný přepis se usekne', () => {
    const c = newCharacter();
    c.overrides.hpMax = 12.7;
    expect(derive(c).hpMax.value).toBe(12);
  });
});

describe('zbraň v ruce', () => {
  it('ÚČ/OČ v boxech jsou ze zvolené zbraně, výchozí je první vybavená', () => {
    const c = sampleKloi();
    const d0 = derive(c);
    expect(d0.activeWeaponUid).toBe(c.equipment.weapons[0].uid);
    c.equipment.activeWeaponUid = c.equipment.weapons[1].uid; // lehká kuše
    const d = derive(c);
    expect([d.attackNumber.value, d.defenseNumber.value]).toEqual([9, 5]);
    expect(d.attackNumber.formula).toContain('Lehká kuše');
  });
  it('neexistující zbraň v ruce → první vybavená', () => {
    const c = sampleKloi();
    c.equipment.activeWeaponUid = 'smazana';
    expect(derive(c).attackNumber.value).toBe(2);
  });
});

describe('dovednosti s více atributy – volba podle situace', () => {
  it('Mechanika má hodnotu pro OBR i INT, jednoatributová nemá volby', () => {
    const c = newCharacter();
    c.attributes.obr = 14; c.attributes.int = 8;
    c.skills = [
      { id: 'mechanika', customName: null, attribute: 'obr', rank: 3, source: 'bought' },
      { id: 'postreh', customName: null, attribute: 'int', rank: 1, source: 'bought' },
    ];
    const d = derive(c);
    const mech = d.skills.find((s) => s.id === 'mechanika')!;
    expect(mech.options.map((o) => o.attribute)).toEqual(['obr', 'int']);
    const obr = mech.options.find((o) => o.attribute === 'obr')!;
    const int = mech.options.find((o) => o.attribute === 'int')!;
    expect(obr.total - int.total).toBe(obr.mod - int.mod);
    expect(obr.mod).toBeGreaterThan(int.mod);
    expect(mech.total).toBe(obr.total); // výchozí atribut
    expect(d.skills.find((s) => s.id === 'postreh')!.options).toEqual([]);
  });
});
