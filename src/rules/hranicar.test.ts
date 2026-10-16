// 7c.1 – hraničář: kouzla H09 + PPP02, směry, schopnosti, specializace, přestup, boj.
import { describe, expect, it } from 'vitest';
import { buildCharacter, newDraft } from '../creation/draft';
import type { Character } from '../model/types';
import { applyLevelUp, autoGains, emptyLevelUp, options, skillGrants, specOptions } from '../progression/levelup';
import { knownSpells, roundInfo, startCombat, takeDefense, canDefend, attack, attackWhy, newRound, endTurn, myTurn } from './combat';
import { derive } from './derive';
import { RANGER, RANGER_SPELLS, knownRangerSpells, spellLock, toSpellDef } from './hranicar';

const ranger = (level = 1): Character => {
  const c = buildCharacter({ ...newDraft(), name: 'Skal', raceId: 'clovek', classId: 'hranicar', method: 'points', points: { sil: 3, obr: 6, odo: 4, int: 5, char: 2 }, picks: [], choice: 0 });
  c.progression.level = level;
  c.equipment.weapons = [];
  c.equipment.shield = { itemId: null, custom: null, equipped: false, weightLb: null };
  c.equipment.armor = { itemId: null, custom: null, equipped: false, weightLb: null };
  c.equipment.activeWeaponUid = null;
  return c;
};
const learn = (c: Character, ...ids: string[]) => { c.progression.learnedAbilities.push(...ids.map((id) => ({ id }))); return c; };
const arm = (c: Character, itemId: string) => {
  c.equipment.weapons = [...c.equipment.weapons, { uid: itemId, itemId, custom: null, grip: 'two-handed', equipped: true, weightLb: null }];
  c.equipment.activeWeaponUid = itemId;
  return c;
};
const names = (c: Character) => knownRangerSpells(c).map((s) => s.nazev);

describe('data hraničáře (H09 + PPP02)', () => {
  it('108 položek: 13 kouzel H09, 83 kouzel, 6 magických pastí a 6 odvarů z PPP02; 4 pasti H09 s popisem', () => {
    expect(RANGER_SPELLS).toHaveLength(108);
    expect(RANGER_SPELLS.filter((s) => s.zdroj === 'H09')).toHaveLength(13);
    expect(RANGER_SPELLS.filter((s) => s.typ === 'past')).toHaveLength(6);
    expect(RANGER_SPELLS.filter((s) => s.typ === 'odvar')).toHaveLength(6);
    expect(new Set(RANGER_SPELLS.map((s) => s.id)).size).toBe(108);
    expect(RANGER.pasti.polozky.map((p) => [p.nazev, p.obtiznost])).toEqual([['Jáma', 10], ['Čelisti', 6], ['Beranidlo', 12], ['Oko', 8]]);
    expect(RANGER.pasti.polozky.every((p) => p.popis.length > 50)).toBe(true);
  });
  it('kouzla do boje: délka vyvolání, cena a obtížnost', () => {
    const by = (n: string) => toSpellDef(RANGER_SPELLS.find((s) => s.nazev === n)!);
    expect(by('Uzdrav lehká zranění')).toMatchObject({ l: 'K', c: '3 za uzdravení', o: 6 });
    expect(by('Rozdělej oheň').l).toBe('10k');
    expect(by('Najdi zvíře').l).toBe('2D');
    expect(by('Utužení').x).toContain('reakce');
    expect(by('Dvojitý švih').l).toBe('O');
  });
});

describe('kouzla hraničáře – vždy automaticky (✔ U 1. 10. 2026)', () => {
  it('1. úroveň = 4 základní kouzla; směr dá svá 3 kouzla', () => {
    const c = ranger();
    expect(names(c)).toEqual(['Najdi úkryt', 'Najdi vodu', 'Rozdělej oheň', 'Znamení']);
    c.progression.learnedBranches.push('magie_prirody');
    expect(names(c)).toEqual(expect.arrayContaining(['Neutralizuj jed', 'Úder varování', 'Uzdrav lehká zranění']));
    expect(knownSpells(c).map((s) => s.n)).toContain('Úder varování');
  });
  it('Další hraničářská kouzla až od 6. úrovně a jen ke známému směru', () => {
    const c = ranger(5);
    c.progression.learnedBranches.push('magie_prirody');
    const uder = RANGER_SPELLS.find((s) => s.nazev === 'Úder nenávisti')!;
    expect(spellLock(c, uder)).toBe('od 6. úrovně');
    c.progression.level = 6;
    expect(names(c)).toEqual(expect.arrayContaining(['Úder nenávisti', 'Uzdrav těžká zranění']));
    expect(names(c)).not.toContain('Sledování'); // Magie pocestných nezná
  });
  it('schopnost dá všechna svá kouzla; Druid dostane Druidova kouzla se specializací', () => {
    const c = learn(ranger(6), 'hranicarsky_luk');
    expect(names(c)).toEqual(expect.arrayContaining(['Déšť šípů', 'Jasná střela', 'Ochromující šíp', 'Plamenný šíp', 'Trefa do černého']));
    expect(names(c)).not.toContain('Obří růst');
    c.progression.specialization = 'druid';
    expect(names(c)).toEqual(expect.arrayContaining(['Obří růst', 'Uvadni', 'Trnový štít']));
    expect(names(c)).not.toContain('Bludný kořen'); // Magie lesa je volitelná schopnost Druida
  });
});

describe('přestup hraničáře', () => {
  it('nabídka: PPP02 schopnosti od 6. úrovně, schopnosti specializace jen se specializací (bez ní 1× za 6 úrovní)', () => {
    const c = ranger(4);
    const o = (x: Character, id: string) => options(x).find((a) => a.id === id)!;
    expect(o(c, 'ostrazitost').disabled).toBe('od 6. úrovně');
    expect(o(c, 'zoceleni').disabled).toBeNull();
    expect(o(c, 'magie_lesa').disabled).toBe('jen Druid');
    const c5 = ranger(5);
    expect(o(c5, 'ostrazitost').disabled).toBeNull();
    expect(o(c5, 'magie_lesa').disabled).toBeNull(); // přestup na 6. úroveň bez specializace
  });
  it('na 6. úrovni automaticky Výroba šípů, Pohyb v terénu a Přírodní překážky na 5. stupni', () => {
    const c = ranger(5);
    const st = emptyLevelUp();
    expect(skillGrants(c, st).map((g) => [g.id, g.rank])).toEqual([['vyroba_sipu', 5], ['pohyb_v_terenu', 5], ['prirodni_prekazky', 5]]);
    expect(autoGains(c, st).join(' ')).toContain('Další hraničářská kouzla');
    const x = applyLevelUp(c, { ...st, pick: { kind: 'ability', id: 'hranicarsky_luk' } });
    expect(x.skills.find((s) => s.id === 'vyroba_sipu')?.rank).toBe(5);
    expect(autoGains(c, { ...st, pick: { kind: 'ability', id: 'hranicarsky_luk' } }).join(' ')).toContain('Déšť šípů');
  });
  it('specializace Chodec: podmínky H09 a Znalost místních poměrů na 5. stupni', () => {
    const c = ranger(5);
    c.progression.learnedBranches.push('magie_pocestnych');
    const st = { ...emptyLevelUp(), pick: { kind: 'ability' as const, id: 'pruzkumnictvi' }, spec: 'chodec' };
    expect(specOptions(c, st).find((s) => s.id === 'chodec')!.disabled).toBeNull();
    const x = applyLevelUp(c, st);
    expect(x.progression.specialization).toBe('chodec');
    expect(x.skills.find((s) => s.id === 'znalost_mistnich_pomeru')?.rank).toBe(5);
    expect(x.skills.find((s) => s.id === 'liceni_pasti')?.rank).toBe(3);
  });
});

describe('deník a boj hraničáře', () => {
  it('Ostražitost +3 iniciativa, Světoběžník 6× úroveň bodů', () => {
    const c = ranger(6);
    const d0 = derive(c);
    learn(c, 'ostrazitost', 'svetobeznik');
    const d1 = derive(c);
    expect(d1.initiativeBonus.value - d0.initiativeBonus.value).toBe(3);
    expect(d1.skillPoints.available.value - d0.skillPoints.available.value).toBe(2 + 4 + 6);
  });
  it('Rychlá střelba z luku: 2, 1, 2… útoků i obran; od 6. úrovně 2 každé kolo', () => {
    let c = learn(arm(ranger(3), 'strelne_kratky_luk'), 'rychla_strelba');
    let x = myTurn(startCombat(c, false));
    expect(roundInfo(x, derive(x)).atk.n).toBe(2);
    expect(roundInfo(x, derive(x)).def.n).toBe(2);
    x = myTurn(newRound(endTurn(x).character).character);
    expect(roundInfo(x, derive(x)).atk.n).toBe(1);
    c = learn(arm(ranger(6), 'strelne_kratky_luk'), 'rychla_strelba');
    x = myTurn(newRound(endTurn(myTurn(startCombat(c, false))).character).character);
    expect(roundInfo(x, derive(x)).atk.n).toBe(2);
    const d = derive(x);
    x = attack(x, d);
    x = attack(x, d);
    expect(attackWhy(x, d)).toBe('všech 2 útoků použito');
  });
  it('Bojová hůl: s holí OČ +2 a obrana navíc v jedné krátké akci', () => {
    const c = arm(ranger(2), 'obourucni_drevena_hul');
    const d0 = derive(c);
    learn(c, 'bojova_hul');
    const d = derive(c);
    expect(d.defenseNumber.value - d0.defenseNumber.value).toBe(2);
    let x = startCombat(c, false);
    x = takeDefense(x, d);
    x = takeDefense(x, d);
    expect([x.play.combat!.k, x.play.combat!.defUsed]).toEqual([1, 2]);
    expect(canDefend(x, d)).toBe('všech 2 obran v kole použito');
  });
});
