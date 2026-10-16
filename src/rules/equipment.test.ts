import { describe, expect, it } from 'vitest';
import { sampleKloi } from '../model/sample';
import { newCharacter } from '../model/defaults';
import { catalogRows, customRow } from './catalog';
import { derive } from './derive';
import {
  salePriceMd, acquire, equipFromItems, expense, income, payMoney, removeItem, removePiece, removeWeapon, saveCustom, undoLast, unequipPiece,
} from './equipment';
import { moneyToMd } from './money';

const row = (tab: Parameters<typeof catalogRows>[0], id: string) => catalogRows(tab, [], { priced: false }).find((r) => r.id === id)!;
const ok = (r: ReturnType<typeof acquire>) => {
  if (!r.character) throw new Error(r.error);
  return r.character;
};

describe('peníze (1 zl = 10 st = 100 md)', () => {
  it('platí nejdřív drobnými a vrací co nejméně mincí', () => {
    expect(payMoney({ gold: 12, silver: 0, copper: 0 }, 5)).toEqual({ gold: 11, silver: 9, copper: 5 });
    expect(payMoney({ gold: 12, silver: 4, copper: 30 }, 200)).toEqual({ gold: 10, silver: 7, copper: 0 });
    expect(payMoney({ gold: 0, silver: 3, copper: 2 }, 25)).toEqual({ gold: 0, silver: 0, copper: 7 });
    expect(payMoney({ gold: 1, silver: 0, copper: 0 }, 101)).toBeNull();
  });
  it('hodnota měšce po platbě odpovídá', () => {
    for (const price of [1, 9, 10, 99, 100, 155, 1234]) {
      const m = { gold: 15, silver: 7, copper: 3 };
      expect(moneyToMd(payMoney(m, price)!)).toBe(moneyToMd(m) - price);
    }
  });
  it('příjem, výdaj, historie a vrácení', () => {
    let c = newCharacter();
    c = income(c, { gold: 3, silver: 0, copper: 0 }, 'Odměna').character!;
    c = expense(c, 45, 'Nocleh').character!;
    expect(c.equipment.money).toEqual({ gold: 2, silver: 5, copper: 5 });
    expect(c.equipment.ledger.map((l) => l.deltaMd)).toEqual([-45, 300]);
    expect(expense(c, 1000, 'Kůň').error).toMatch(/chybí/);
    c = undoLast(c);
    expect(c.equipment.money).toEqual({ gold: 3, silver: 0, copper: 0 });
    expect(c.equipment.ledger).toHaveLength(1);
  });
});

describe('nákup a výzbroj', () => {
  it('koupě zbraně odečte cenu a přepočítá naložení', () => {
    let c = sampleKloi();
    const before = derive(c).load.value;
    const mec = row('weapon', 'jednorucni_kratky_mec');
    c = ok(acquire(c, mec, { pay: true }));
    expect(moneyToMd(c.equipment.money)).toBe(moneyToMd(sampleKloi().equipment.money) - mec.md);
    expect(derive(c).load.value).toBeCloseTo(before + (mec.w ?? 0), 5);
    expect(c.equipment.ledger[0].text).toContain(mec.name);
  });
  it('bez peněz nic nekoupí', () => {
    const c = newCharacter();
    expect(acquire(c, row('armor', 'zbroj_platova'), { pay: true }).error).toMatch(/nemáš/);
  });
  it('vrhací zbraně se sčítají do jednoho řádku', () => {
    const hv = catalogRows('weapon').find((r) => r.weapon?.kind === 'thrown')!;
    let c = newCharacter();
    c = ok(acquire(c, hv, { qty: 2 }));
    c = ok(acquire(c, hv, { qty: 2 }));
    expect(c.equipment.weapons).toHaveLength(1);
    expect(c.equipment.weapons[0].qty).toBe(4);
    c = removeWeapon(c, c.equipment.weapons[0].uid, { qty: 1 });
    expect(c.equipment.weapons[0].qty).toBe(3);
  });
  it('nová zbroj se nasadí, stará jde do výbavy a jde ji znovu nasadit', () => {
    let c = sampleKloi(); // prošívaná
    c = ok(acquire(c, row('armor', 'zbroj_kozena')));
    expect(c.equipment.armor.itemId).toBe('zbroj_kozena');
    const spare = c.equipment.items.find((i) => i.piece?.slot === 'armor')!;
    expect(spare.itemId).toBe('zbroj_prosivana');
    expect(derive(c).defenseBase.value).toBe(3 + 3); // OBR 16 → +3, kožená 3
    c = equipFromItems(c, spare.uid);
    expect(c.equipment.armor.itemId).toBe('zbroj_prosivana');
    expect(c.equipment.items.some((i) => i.itemId === 'zbroj_kozena' && i.piece)).toBe(true);
  });
  it('sundání zbroje do výbavy nemění naložení, prodej ho sníží a přidá peníze', () => {
    let c = sampleKloi();
    const load = derive(c).load.value;
    c = unequipPiece(c, 'armor');
    expect(derive(c).load.value).toBe(load);
    expect(derive(c).defenseBase.value).toBe(3);
    const it = c.equipment.items.find((i) => i.piece)!;
    const money = moneyToMd(c.equipment.money);
    c = removeItem(c, it.uid, { saleMd: 150 });
    expect(moneyToMd(c.equipment.money)).toBe(money + 150);
    expect(c.equipment.ledger[0]).toMatchObject({ deltaMd: 150 });
  });
  it('štít nad síly: −5 k OČ; štít váží, i když není v ruce', () => {
    let c = sampleKloi(); // SIL 9 → −1
    c = ok(acquire(c, row('shield', 'stit_paveza')));
    const d = derive(c);
    expect(d.shieldOverloaded).toBe(true);
    expect(d.defenseNumber.formula).toContain('přetížení štítu');
    const w = d.shield!.weightLb;
    c = { ...c, equipment: { ...c.equipment, shield: { ...c.equipment.shield, equipped: false } } };
    expect(derive(c).shieldOverloaded).toBe(false);
    expect(derive(c).loadParts.find((p) => p.label === 'Štít')!.lb).toBe(w);
    c = removePiece(c, 'shield');
    expect(derive(c).shield).toBeNull();
  });
  it('vlastní položky z katalogu postavy', () => {
    let c = newCharacter();
    const r = saveCustom(c, {
      type: 'weapon', name: 'Trpasličí sekyra', weightLb: 4, price: { v: 3, cur: 'zl' }, desc: 'od kováře Borina',
      weapon: { name: '', attack: 2, damage: 4, defense: 1, strReq: 1, kind: 'melee', category: 'Střední', damageTypes: ['sečná'], grip: 'one-handed' },
    });
    c = r.character;
    c.equipment.money = { gold: 5, silver: 0, copper: 0 };
    c = ok(acquire(c, customRow(r.item), { pay: true }));
    expect(c.equipment.money.gold).toBe(2);
    const d = derive(c);
    expect(d.weapons[0]).toMatchObject({ name: 'Trpasličí sekyra', attack: 2, overloaded: true, weightLb: 4 });
    const armor = saveCustom(c, { type: 'armor', name: 'Dračí šupiny', weightLb: 10, price: null, desc: '', armor: { quality: 6, strReq: null, category: 'Střední', stealth: -3 } });
    c = ok(acquire(armor.character, customRow(armor.item)));
    expect(derive(c).armor).toMatchObject({ name: 'Dračí šupiny', quality: 6, stealth: -3, custom: true });
    c = unequipPiece(c, 'armor');
    c = equipFromItems(c, c.equipment.items.find((i) => i.piece)!.uid);
    expect(derive(c).armor).toMatchObject({ name: 'Dračí šupiny', quality: 6 });
  });
  it('vrácení poslední změny vrátí výzbroj i peníze', () => {
    const start = sampleKloi();
    const c = ok(acquire(start, row('gear', 'lano'), { pay: true, qty: 2 }));
    const back = undoLast(c);
    expect(back.equipment.items).toEqual(start.equipment.items);
    expect(back.equipment.money).toEqual(start.equipment.money);
    expect(back.equipment.undo).toBeNull();
  });
});

describe('prodej', () => {
  it('standardní výkup = polovina kupní ceny, nahoru', () => {
    expect(salePriceMd(1000)).toBe(500);
    expect(salePriceMd(7)).toBe(4);
    expect(salePriceMd(0)).toBe(0);
  });
});
