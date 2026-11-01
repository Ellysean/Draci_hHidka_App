// Balík B zpětné vazby testerů (v0.17.0): upravená kopie předmětu, výměna zbraně v boji.
import { describe, expect, it } from 'vitest';
import { sampleKloi } from '../model/sample';
import type { Character } from '../model/types';
import { catalogRows, draftFromRow } from './catalog';
import { doAction, myTurn, startCombat, swapLen, switchWeapon, undoPlay } from './combat';
import { derive } from './derive';
import { draftFromOwned, replaceOwned, saveCustom, shieldInHand, takeWeapon } from './equipment';

const withShield = (c: Character): Character => ({ ...c, equipment: { ...c.equipment, shield: { itemId: 'stit_dreveny_stit', custom: null, equipped: true, weightLb: null } } });

describe('upravená kopie předmětu (B1)', () => {
  it('kopie řádku katalogu má hvězdičku a parametry originálu', () => {
    const row = catalogRows('shield').find((r) => r.id === 'stit_dreveny_stit')!;
    const d = draftFromRow(row)!;
    expect(d.name).toBe(`${row.name} *`);
    expect(d.type).toBe('shield');
    expect(d.armor!.quality).toBe(row.armor!.q);
    expect(d.copyOf).toBe(row.name);
    const w = draftFromRow(catalogRows('weapon').find((r) => r.id === 'obourucni_kosa')!)!;
    expect(w.weapon!.grip).toBe('two-handed');
    expect(draftFromRow(catalogRows('alch')[0])).toBeNull();
  });
  it('dřevěný štít +1: kopie z výbavy, uložení a výměna za nasazený kus', () => {
    let c = withShield(sampleKloi());
    const oc = derive(c).defenseNumber.value;
    const draft = draftFromOwned(c, { what: 'shield' })!;
    const s = saveCustom(c, { ...draft, armor: { ...draft.armor!, quality: draft.armor!.quality + 1 } });
    c = replaceOwned(s.character, { what: 'shield' }, s.item);
    expect(c.equipment.shield.custom?.name).toMatch(/\*$/);
    expect(c.equipment.shield.equipped).toBe(true);
    expect(derive(c).defenseNumber.value).toBe(oc + 1);
    expect(c.equipment.customCatalog).toHaveLength(1);
  });
  it('zbraň: upravená kopie drží uid a zbraň v ruce', () => {
    let c = sampleKloi();
    c = { ...c, equipment: { ...c.equipment, activeWeaponUid: 'w1' } };
    const draft = draftFromOwned(c, { what: 'weapon', uid: 'w1' })!;
    const s = saveCustom(c, { ...draft, weapon: { ...draft.weapon!, damage: draft.weapon!.damage + 1 } });
    const before = derive(c).weapons.find((w) => w.uid === 'w1')!;
    c = replaceOwned(s.character, { what: 'weapon', uid: 'w1' }, s.item);
    const after = derive(c).weapons.find((w) => w.uid === 'w1')!;
    expect(after.name).toMatch(/\*$/);
    expect(after.damageTotal).toBe(before.damageTotal + 1);
    expect(c.equipment.activeWeaponUid).toBe('w1');
  });
});

describe('zbraň a štít v ruce (B2)', () => {
  it('obouruční zbraň odloží štít; se štítem v ruce ho vzít nejde', () => {
    const c = withShield(sampleKloi());
    const r = takeWeapon(c, 'w2'); // lehká kuše – obouruční
    expect(r.shieldDown).toBe(true);
    expect(r.character.equipment.shield.equipped).toBe(false);
    expect(shieldInHand(r.character, true, 'w2')).toBeNull();
    const back = takeWeapon(r.character, 'w1').character;
    expect(shieldInHand(back, true, 'w1')!.equipment.shield.equipped).toBe(true);
  });
  it('mimo boj zdarma, v boji výměna = dlouhá akce (H16), Vrátit vrátí zbraň i štít', () => {
    let c = withShield(sampleKloi());
    c = { ...c, equipment: { ...c.equipment, activeWeaponUid: 'w1' } };
    expect(switchWeapon(c, derive(c), 'w2').character.play.combat).toBeNull();
    c = myTurn(startCombat(c, false));
    const d = derive(c);
    expect(swapLen(d, 'w2')).toBe('D');
    const r = switchWeapon(c, d, 'w2');
    expect(r.error).toBeUndefined();
    expect(r.character.equipment.activeWeaponUid).toBe('w2');
    expect(r.character.equipment.shield.equipped).toBe(false);
    expect(r.character.play.combat!.k).toBe(2);
    const u = undoPlay(r.character);
    expect(u.equipment.activeWeaponUid).toBe('w1');
    expect(u.equipment.shield.equipped).toBe(true);
  });
  it('bez volné akce přezbrojit nejde', () => {
    let c = myTurn(startCombat({ ...sampleKloi(), equipment: { ...sampleKloi().equipment, activeWeaponUid: 'w1' } }, false));
    c = doAction(c, derive(c), 'postup', 'K');
    const r = switchWeapon(c, derive(c), 'w2');
    expect(r.error).toMatch(/Přezbrojení/);
    expect(r.character.equipment.activeWeaponUid).toBe('w1');
  });
});
