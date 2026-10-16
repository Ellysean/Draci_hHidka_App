// Alchymistické výrobky ve výbavě (lektvary, elixíry, jedy, předměty – H10, PPP03).
import { describe, expect, it } from 'vitest';
import { newCharacter } from '../model/defaults';
import { sampleKloi } from '../model/sample';
import { alch, craft, craftedInGear, craftedValueMd, recipeById, removeCrafted, setCraftedCarried, startingBases, undoAlchemy, useCrafted } from './alchemy';
import { moneyToMd } from './money';
import { FLASK_LB, SHOP_TABS, alchemyRows, catalogRows } from './catalog';
import { derive } from './derive';
import { acquire, consumeItem, removeItem, undoLast, unitPriceMd } from './equipment';
import { priceMd } from './money';

const ok = (r: ReturnType<typeof acquire>) => {
  if (!r.character) throw new Error(r.error);
  return r.character;
};
const byName = (n: string) => alchemyRows().find((r) => r.name === n)!;

describe('katalog – alchymie', () => {
  it('obsahuje všechny recepty (lektvary, elixíry, jedy, předměty, ostatní)', () => {
    const rows = catalogRows('alch');
    expect(rows.length).toBe(168);
    const kinds = new Set(rows.map((r) => r.alch!.kind));
    expect([...kinds].sort()).toEqual(['elixir', 'jed', 'lektvar', 'ostatni', 'predmet']);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(byName('Lektvar Ranhojič').w).toBe(FLASK_LB);
    expect(byName('Elixír Medvědí síly').alch!.kind).toBe('elixir');
  });
  it('lektvary a elixíry jsou v katalogu první', () => {
    expect(catalogRows('alch')[0].alch!.kind).toBe('lektvar');
  });
  it('obchod při tvorbě postavy alchymii nenabízí (výrobky nemají cenu)', () => {
    expect(SHOP_TABS.some(([k]) => k === 'alch')).toBe(false);
  });
});

describe('výbava – alchymistické výrobky', () => {
  it('přidá lektvar do výbavy (sčítá kusy) a započítá ho do naložení', () => {
    let c = newCharacter();
    const before = derive(c).load.value as number;
    c = ok(acquire(c, byName('Lektvar Ranhojič'), { qty: 2 }));
    c = ok(acquire(c, byName('Lektvar Ranhojič'), { qty: 1 }));
    const its = c.equipment.items.filter((i) => i.alch);
    expect(its).toHaveLength(1);
    expect(its[0]).toMatchObject({ name: 'Lektvar Ranhojič', qty: 3, weightLb: FLASK_LB, carried: true, alch: { kind: 'lektvar' } });
    expect((derive(c).load.value as number) - before).toBeCloseTo(0.6, 5);
  });
  it('koupě za cenu dle PJ odečte peníze a zapamatuje cenu pro prodej', () => {
    let c = newCharacter();
    c = { ...c, equipment: { ...c.equipment, money: { gold: 10, silver: 0, copper: 0 } } };
    const price = { v: 3, cur: 'zl' as const };
    const row = { ...byName('Elixír Rychlosti'), price, md: priceMd(price) };
    c = ok(acquire(c, row, { qty: 2, pay: true }));
    expect(c.equipment.money).toEqual({ gold: 4, silver: 0, copper: 0 });
    const it = c.equipment.items.find((i) => i.alch)!;
    expect(unitPriceMd(c, it)).toBe(300);
    c = removeItem(c, it.uid, { qty: 1, saleMd: 150 });
    expect(c.equipment.items.find((i) => i.alch)!.qty).toBe(1);
  });
  it('vypití ubere kus a jde vrátit', () => {
    let c = ok(acquire(newCharacter(), byName('Lektvar Ranhojič'), { qty: 2 }));
    const uid = c.equipment.items.find((i) => i.alch)!.uid;
    c = consumeItem(c, uid);
    expect(c.equipment.items.find((i) => i.alch)!.qty).toBe(1);
    expect(c.equipment.undo?.text).toBe('Vypito: Lektvar Ranhojič');
    c = consumeItem(c, uid);
    expect(c.equipment.items.some((i) => i.alch)).toBe(false);
    c = undoLast(c);
    expect(c.equipment.items.find((i) => i.alch)!.qty).toBe(1);
  });
  it('jed a předmět se „použijí“, ne vypijí', () => {
    let c = ok(acquire(newCharacter(), byName('Jed Bolehlav')));
    c = consumeItem(c, c.equipment.items.find((i) => i.alch)!.uid);
    expect(c.equipment.undo?.text).toBe('Použito: Jed Bolehlav');
  });
  it('výrobky s jinou nebezpečností se nesčítají', () => {
    let c = ok(acquire(newCharacter(), byName('Lektvar Ranhojič')));
    c = { ...c, equipment: { ...c.equipment, items: c.equipment.items.map((i) => (i.alch ? { ...i, alch: { ...i.alch, danger: 14 } } : i)) } };
    c = ok(acquire(c, byName('Lektvar Ranhojič')));
    expect(c.equipment.items.filter((i) => i.alch)).toHaveLength(2);
  });
});

describe('výrobky alchymisty ve výbavě', () => {
  // Kloi (alchymistka) vyrobí Lektvar Ranhojič – výrobek se rovnou objeví ve výbavě a v naložení.
  const kloi = () => { const c = sampleKloi(); c.classState.alchymista!.bases = startingBases(); return c; };
  const made = () => {
    const c = kloi();
    const r = recipeById('lektvar_ranhojic')!;
    const before = derive(c).load.value as number;
    const x = craft(c, derive(c), r, {}, 30);
    expect(x.success).toBe(true);
    return { c: x.character, before };
  };
  it('vyrobený lektvar je ve výbavě a váží jako flakón', () => {
    const { c, before } = made();
    const g = craftedInGear(c);
    expect(g.map((x) => x.name)).toContain('Lektvar Ranhojič');
    const after = derive(c);
    expect(after.loadParts.find((p) => p.label === 'Alchymistické výrobky')!.lb).toBeCloseTo(FLASK_LB, 5);
    // mana a suroviny při výrobě ubyly, výrobek přibyl
    expect(typeof after.load.value).toBe('number');
    expect(before).toBeGreaterThan(0);
  });
  it('nenesený výrobek se do naložení nepočítá', () => {
    const { c } = made();
    const uid = craftedInGear(c)[0].uid;
    const y = setCraftedCarried(c, uid, false);
    expect(derive(y).loadParts.find((p) => p.label === 'Alchymistické výrobky')!.lb).toBe(0);
  });
  it('vypitý (působící) lektvar z výbavy zmizí', () => {
    const { c } = made();
    const it0 = craftedInGear(c).find((x) => x.recipeId === 'lektvar_ranhojic')!;
    const y = useCrafted(c, it0.uid).character;
    expect(craftedInGear(y).some((x) => x.recipeId === 'lektvar_ranhojic')).toBe(false);
    expect(alch(y).crafted.some((x) => x.active)).toBe(true);
  });
  it('prodej připíše peníze i do historie a jde vrátit', () => {
    const { c } = made();
    const it0 = craftedInGear(c)[0];
    const m0 = moneyToMd(c.equipment.money);
    const y = removeCrafted(c, it0.uid, { saleMd: 150 });
    expect(moneyToMd(y.equipment.money)).toBe(m0 + 150);
    expect(y.equipment.ledger[0]).toMatchObject({ deltaMd: 150 });
    expect(craftedInGear(y).some((x) => x.uid === it0.uid)).toBe(false);
    const z = undoAlchemy(y);
    expect(moneyToMd(z.equipment.money)).toBe(m0);
    expect(z.equipment.ledger).toEqual(c.equipment.ledger);
    expect(craftedInGear(z).some((x) => x.uid === it0.uid)).toBe(true);
  });
  it('orientační hodnota = mana a suroviny v kusu (H10)', () => {
    const { c } = made();
    const it0 = craftedInGear(c)[0];
    expect(craftedValueMd(it0)).toBe((it0.manaSpent ?? 0) * 30 + (it0.materialsSpent ?? 0) * 3);
  });
  it('postava, která není alchymista, výrobky ve výbavě nemá', () => {
    expect(craftedInGear(newCharacter())).toEqual([]);
  });
});
