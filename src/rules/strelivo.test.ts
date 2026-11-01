import { describe, expect, it } from 'vitest';
import { sampleKloi } from '../model/sample';
import type { Character } from '../model/types';
import { undoPlay } from './combat';
import { derive } from './derive';
import { ammoOf, onField, pickUp, shoot, throwWeapon } from './strelivo';

const withBolts = (n: number): Character => {
  const c = sampleKloi();
  return { ...c, equipment: { ...c.equipment, items: [...c.equipment.items, { uid: 'b', name: 'Šipka (obyčejná)', itemId: 'doplnek_sipka_obycejna', qty: n, weightLb: 0.03, carried: true, container: null }] } };
};
const withKnives = (c: Character, qty: number): Character => ({ ...c, equipment: { ...c.equipment, activeWeaponUid: 'k', weapons: [...c.equipment.weapons, { uid: 'k', itemId: 'vrhaci_nuz', custom: null, grip: 'one-handed', equipped: true, weightLb: null, qty }] } });

describe('střelivo (v0.18.0)', () => {
  it('kuše najde šipky sama, výstřel ubere kus a dá ho na bojiště', () => {
    let c = withBolts(3);
    expect(ammoOf(c, c.equipment.weapons[1])?.uid).toBe('b');
    c = shoot(c, 'w2').character;
    c = shoot(c, 'w2').character;
    const b = c.equipment.items.find((i) => i.uid === 'b')!;
    expect(b.qty).toBe(1);
    expect(b.spent).toBe(2);
    expect(onField(c)).toEqual([{ what: 'item', uid: 'b', name: b.name, n: 2 }]);
  });
  it('bez střeliva výstřel nejde', () => {
    let c = withBolts(1);
    c = shoot(c, 'w2').character;
    expect(shoot(c, 'w2').error).toMatch(/došlo/);
  });
  it('sebrat 1, zbytek ztracen; Vrátit vrací výstřel', () => {
    let c = shoot(withBolts(2), 'w2').character;
    expect(undoPlay(c).equipment.items.find((i) => i.uid === 'b')!.qty).toBe(2);
    c = shoot(c, 'w2').character;
    c = pickUp(c, 'item', 'b', 1, false);
    c = pickUp(c, 'item', 'b', 5, true);
    const b = c.equipment.items.find((i) => i.uid === 'b')!;
    expect(b.qty).toBe(1);
    expect(b.spent).toBe(0);
  });
});

describe('vrhání (v0.18.0)', () => {
  it('vržený nůž: poslední kus = beze zbraně v ruce, obrana bez zbraně', () => {
    let c = withKnives(sampleKloi(), 2);
    c = throwWeapon(c, 'k').character;
    expect(derive(c).weapons.find((w) => w.uid === 'k')!.away).toBe(false);
    c = throwWeapon(c, 'k').character;
    const d = derive(c);
    expect(d.weapons.find((w) => w.uid === 'k')!.away).toBe(true);
    expect(d.activeWeaponUid).toBeNull();
    expect(throwWeapon(c, 'k').error).toBeTruthy();
  });
  it('vržená dýka tváří v tvář: nejde se s ní bránit; sebrat vrátí do ruky, ztraceno ji odebere', () => {
    let c: Character = { ...sampleKloi(), equipment: { ...sampleKloi().equipment, activeWeaponUid: 'w1' } };
    const oc = derive(c).defenseNumber.value;
    c = throwWeapon(c, 'w1').character;
    expect(derive(c).defenseNumber.value).toBeLessThanOrEqual(oc);
    expect(derive(c).weapons.find((w) => w.uid === 'w1')!.away).toBe(true);
    const back = pickUp(c, 'weapon', 'w1', 1, false);
    expect(derive(back).activeWeaponUid).toBe('w1');
    const lost = pickUp(c, 'weapon', 'w1', 1, true);
    expect(lost.equipment.weapons.some((w) => w.uid === 'w1')).toBe(false);
    expect(lost.equipment.activeWeaponUid).toBeNull();
  });
});

describe('dýka: bodnout nebo vrhnout', () => {
  it('jednoruční dýka nabízí vrh s hodnotami vrhací dýky (OBR), vrhací dýka bodnutí (SIL)', async () => {
    const { altAttack } = await import('./strelivo');
    const c = sampleKloi();
    const d = derive(c);
    const row = d.weapons.find((w) => w.uid === 'w1')!;
    const a = altAttack(c.equipment.weapons[0], row, d.mods)!;
    expect(a.mode).toBe('throw');
    expect(a.improvised).toBe(false);
    expect(a.attackNumber).toBe(row.attackNumber - d.mods.sil + d.mods.obr); // útočnost 3 = 3
    const k = withKnives(c, 1);
    const kr = derive(k).weapons.find((w) => w.uid === 'k')!;
    const m = altAttack(k.equipment.weapons.find((w) => w.uid === 'k')!, kr, d.mods)!;
    expect(m.mode).toBe('melee');
    // kuše ani hvězdice druhý způsob nemají
    expect(altAttack(c.equipment.weapons[1], d.weapons[1], d.mods)).toBeNull();
  });
});
