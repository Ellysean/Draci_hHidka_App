// Vybavení, výzbroj a peníze v deníku (Fáze 5, H15, RULES_FORMULAS.md §10).
// Čisté funkce nad postavou: vrací novou postavu, nebo { error } s hláškou pro hráče.
import { uid } from '../model/defaults';
import type { ArmorPiece, Character, CustomCatalogItem, Equipment, GearAlchemy, GearItem, Money, WeaponEntry } from '../model/types';
import type { CatalogRow } from './catalog';
import { getArmor, getGear, getShield, getWeapon } from './data';
import { formatMd, moneyToMd } from './money';

export type Result = { character: Character; error?: undefined } | { character?: undefined; error: string };

// ---------------------------------------------------------------- peníze

/**
 * Zaplatí částku v md. Platí se nejdřív drobnými (md, pak st, pak zl) a nazpět se
 * vrací co nejméně mincí (✔ U: „zlaté drží, dokud to jde; nejdřív platí drobnými“).
 * Vrací null, když na to postava nemá.
 */
export function payMoney(m: Money, priceMdAmount: number): Money | null {
  const price = Math.max(0, Math.round(priceMdAmount));
  if (moneyToMd(m) < price) return null;
  let need = price;
  const useC = Math.min(m.copper, need);
  need -= useC;
  const useS = Math.min(m.silver, Math.ceil(need / 10));
  need -= useS * 10;
  const useG = Math.max(0, Math.ceil(need / 100));
  need -= useG * 100;
  const change = -need; // přeplatek, vždy < 100 md
  return {
    gold: m.gold - useG,
    silver: m.silver - useS + Math.floor(change / 10),
    copper: m.copper - useC + (change % 10),
  };
}

export const addMoney = (m: Money, add: Money): Money => ({
  gold: m.gold + Math.max(0, add.gold), silver: m.silver + Math.max(0, add.silver), copper: m.copper + Math.max(0, add.copper),
});

/** Rozmění mince na co nejmenší počet (10 md → 1 st, 10 st → 1 zl). */
export const normalizeMoney = (m: Money): Money => {
  const md = moneyToMd(m);
  return { gold: Math.floor(md / 100), silver: Math.floor((md % 100) / 10), copper: md % 10 };
};

const LEDGER_MAX = 100;

function snapshot(eq: Equipment): NonNullable<Equipment['undo']>['snapshot'] {
  const { undo: _u, ledger: _l, customCatalog: _c, ...rest } = eq;
  return rest;
}

/** Zapíše změnu výzbroje/peněz: uloží stav před ní pro „Vrátit“ a případně pohyb peněz. */
function commit(c: Character, eq: Equipment, text: string, deltaMd: number | null, now: string): Character {
  const entry = deltaMd == null ? null : { uid: uid(), at: now, text, deltaMd };
  return {
    ...c,
    equipment: {
      ...eq,
      ledger: entry ? [entry, ...c.equipment.ledger].slice(0, LEDGER_MAX) : c.equipment.ledger,
      undo: { text, snapshot: snapshot(c.equipment), ledgerUid: entry?.uid ?? null },
    },
  };
}

/** Příjem (odměna, prodej mimo katalog…). */
export function income(c: Character, add: Money, text: string, now = new Date().toISOString()): Result {
  const md = moneyToMd(add);
  if (md <= 0) return { error: 'Zadej částku.' };
  const eq = { ...c.equipment, money: addMoney(c.equipment.money, add) };
  return { character: commit(c, eq, text || 'Příjem', md, now) };
}

/** Výdaj (útrata mimo katalog – nocleh, úplatek…); mince se rozmění. */
export function expense(c: Character, md: number, text: string, now = new Date().toISOString()): Result {
  if (md <= 0) return { error: 'Zadej částku.' };
  const money = payMoney(c.equipment.money, md);
  if (!money) return { error: `Na to nemáš – chybí ${formatMd(md - moneyToMd(c.equipment.money))}.` };
  return { character: commit(c, { ...c.equipment, money }, text || 'Výdaj', -md, now) };
}

/** Vrátí poslední změnu výzbroje/peněz (a smaže její záznam v historii peněz). */
export function undoLast(c: Character): Character {
  const u = c.equipment.undo;
  if (!u) return c;
  return {
    ...c,
    equipment: {
      ...c.equipment,
      ...u.snapshot,
      ledger: u.ledgerUid ? c.equipment.ledger.filter((l) => l.uid !== u.ledgerUid) : c.equipment.ledger,
      undo: null,
    },
  };
}

// ---------------------------------------------------------------- výzbroj a výbava

/** Prázdný slot zbroje/štítu (šaty se počítají jako žádná zbroj). */
export const slotEmpty = (p: ArmorPiece) => (!p.itemId || p.itemId === 'zbroj_zadna_saty') && !p.custom;

export const pieceName = (slot: 'armor' | 'shield', p: ArmorPiece) =>
  (slot === 'armor' ? getArmor(p.itemId) : getShield(p.itemId))?.n ?? p.custom?.name ?? '—';

const pieceWeight = (slot: 'armor' | 'shield', p: ArmorPiece) =>
  p.weightLb ?? (slot === 'armor' ? getArmor(p.itemId) : getShield(p.itemId))?.w ?? 0;

/** Přesune kus ze slotu do výbavy (jde znovu nasadit). */
function pieceToItem(slot: 'armor' | 'shield', p: ArmorPiece): GearItem {
  return {
    uid: uid(), name: pieceName(slot, p), itemId: p.itemId, qty: 1, weightLb: pieceWeight(slot, p),
    carried: true, container: null, piece: { slot, custom: p.custom },
  };
}

const EMPTY_PIECE = (slot: 'armor' | 'shield'): ArmorPiece => ({ itemId: null, custom: null, equipped: slot === 'armor', weightLb: null });

/** Nasadí kus do slotu; předchozí (není-li prázdný) jde do výbavy. */
function putOn(eq: Equipment, slot: 'armor' | 'shield', piece: ArmorPiece): Equipment {
  const old = eq[slot];
  const items = slotEmpty(old) ? eq.items : [...eq.items, pieceToItem(slot, old)];
  return { ...eq, items, [slot]: piece };
}

function addGear(items: GearItem[], item: Omit<GearItem, 'uid'>): GearItem[] {
  const ex = items.find((i) => !i.piece && i.itemId === item.itemId && i.name === item.name && i.weightLb === item.weightLb
    && (i.alch?.danger ?? null) === (item.alch?.danger ?? null));
  if (ex) return items.map((i) => (i === ex ? { ...i, qty: i.qty + item.qty } : i));
  return [...items, { ...item, uid: uid() }];
}

function addWeapon(eq: Equipment, entry: Omit<WeaponEntry, 'uid'>): Equipment {
  const qty = entry.qty ?? 1;
  const kind = getWeapon(entry.itemId)?.kind ?? entry.custom?.kind;
  // Vrhací zbraně se stejného druhu sčítají do jednoho řádku (4 hvězdice).
  const ex = kind === 'thrown' ? eq.weapons.find((w) => w.itemId === entry.itemId && (w.custom?.name ?? null) === (entry.custom?.name ?? null)) : undefined;
  if (ex) return { ...eq, weapons: eq.weapons.map((w) => (w === ex ? { ...w, qty: (w.qty ?? 1) + qty } : w)) };
  const w: WeaponEntry = { ...entry, uid: uid() };
  if (qty <= 1) delete w.qty;
  return { ...eq, weapons: [...eq.weapons, w] };
}

/** Přidá řádek katalogu do výzbroje/výbavy (bez placení). */
function place(eq: Equipment, row: CatalogRow, qty: number): Equipment {
  const x = row.custom;
  if (row.kind === 'weapon') {
    const def = getWeapon(row.id);
    return addWeapon(eq, { itemId: row.id, custom: null, grip: def?.grip === 'obouruční' ? 'two-handed' : 'one-handed', equipped: true, weightLb: null, qty });
  }
  if (row.kind === 'armor' || row.kind === 'robe') return putOn(eq, 'armor', { itemId: row.id, custom: null, equipped: true, weightLb: null });
  if (row.kind === 'shield') return putOn(eq, 'shield', { itemId: row.id, custom: null, equipped: true, weightLb: null });
  if (x?.type === 'weapon' && x.weapon) {
    const { grip, ...custom } = x.weapon;
    return addWeapon(eq, { itemId: null, custom: { ...custom, name: x.name }, grip, equipped: true, weightLb: x.weightLb, qty });
  }
  if ((x?.type === 'armor' || x?.type === 'shield') && x.armor) {
    const a = x.armor;
    return putOn(eq, x.type, { itemId: null, custom: { name: x.name, quality: a.quality, strReq: a.strReq, category: a.category, stealth: a.stealth }, equipped: true, weightLb: x.weightLb });
  }
  if (x) return { ...eq, items: addGear(eq.items, { name: x.name, itemId: x.id, qty, weightLb: x.weightLb, carried: true, container: null }) };
  if (row.kind === 'alch' && row.alch) {
    const alch: GearAlchemy = { recipeId: row.alch.recipeId, kind: row.alch.kind, ...(row.md > 0 ? { priceMd: row.md } : {}) };
    return { ...eq, items: addGear(eq.items, { name: row.name, itemId: row.id, qty, weightLb: row.w ?? 0, carried: true, container: null, alch }) };
  }
  const g = getGear(row.id);
  return { ...eq, items: addGear(eq.items, { name: g?.n ?? row.name, itemId: row.id, qty, weightLb: g?.w ?? row.w ?? 0, carried: true, container: null }) };
}

/**
 * Přidá položku z katalogu. `pay` = koupit (cena se odečte z měšce, mince se rozmění).
 * Zbroj a štít se rovnou nasadí, dosavadní kus jde do výbavy.
 */
export function acquire(c: Character, row: CatalogRow, { qty = 1, pay = false, now = new Date().toISOString() } = {}): Result {
  const n = row.multi ? Math.max(1, Math.trunc(qty) || 1) : 1;
  let eq = place(c.equipment, row, n);
  const label = `${row.name}${n > 1 ? ` ×${n}` : ''}`;
  if (!pay) return { character: commit(c, eq, `Přidáno: ${label}`, null, now) };
  const cost = row.md * n;
  const money = payMoney(c.equipment.money, cost);
  if (!money) return { error: `Na ${label} nemáš – chybí ${formatMd(cost - moneyToMd(c.equipment.money))}.` };
  eq = { ...eq, money };
  return { character: commit(c, eq, `Koupeno: ${label}`, -cost, now) };
}

/** Prodej nebo odebrání – `saleMd` > 0 připíše peníze. */
function finish(c: Character, eq: Equipment, name: string, saleMd: number, now: string): Character {
  const md = Math.round(saleMd);
  if (md > 0) return commit(c, { ...eq, money: keepCoins(eq.money, md) }, `Prodáno: ${name}`, md, now);
  return commit(c, eq, `Odebráno: ${name}`, null, now);
}

/** Připíše částku v co nejméně mincích a nechá stávající mince, jak jsou. */
const keepCoins = (m: Money, md: number): Money => ({
  gold: m.gold + Math.floor(md / 100), silver: m.silver + Math.floor((md % 100) / 10), copper: m.copper + (md % 10),
});

export function removeWeapon(c: Character, weaponUid: string, { qty, saleMd = 0, now = new Date().toISOString() }: { qty?: number; saleMd?: number; now?: string } = {}): Character {
  const w = c.equipment.weapons.find((x) => x.uid === weaponUid);
  if (!w) return c;
  const name = getWeapon(w.itemId)?.n ?? w.custom?.name ?? 'zbraň';
  const have = w.qty ?? 1;
  const n = Math.min(have, Math.max(1, qty ?? have));
  const weapons = n >= have
    ? c.equipment.weapons.filter((x) => x.uid !== weaponUid)
    : c.equipment.weapons.map((x) => (x.uid === weaponUid ? { ...x, qty: have - n } : x));
  const activeWeaponUid = n >= have && c.equipment.activeWeaponUid === weaponUid ? null : c.equipment.activeWeaponUid;
  return finish(c, { ...c.equipment, weapons, activeWeaponUid }, `${name}${n > 1 ? ` ×${n}` : ''}`, saleMd, now);
}

export function removeItem(c: Character, itemUid: string, { qty, saleMd = 0, now = new Date().toISOString() }: { qty?: number; saleMd?: number; now?: string } = {}): Character {
  const it = c.equipment.items.find((x) => x.uid === itemUid);
  if (!it) return c;
  const n = Math.min(it.qty, Math.max(1, qty ?? it.qty));
  const items = n >= it.qty ? c.equipment.items.filter((x) => x.uid !== itemUid) : c.equipment.items.map((x) => (x.uid === itemUid ? { ...x, qty: x.qty - n } : x));
  return finish(c, { ...c.equipment, items }, `${it.name}${n > 1 ? ` ×${n}` : ''}`, saleMd, now);
}

/**
 * Použije (vypije, hodí, aplikuje) jeden kus předmětu z výbavy – typicky lektvar, elixír či jed.
 * Kus zmizí z výbavy, změna jde vrátit.
 */
export function consumeItem(c: Character, itemUid: string, now = new Date().toISOString()): Character {
  const it = c.equipment.items.find((x) => x.uid === itemUid);
  if (!it || it.qty < 1) return c;
  const items = it.qty > 1 ? c.equipment.items.map((x) => (x === it ? { ...x, qty: x.qty - 1 } : x)) : c.equipment.items.filter((x) => x !== it);
  const verb = it.alch?.kind === 'lektvar' || it.alch?.kind === 'elixir' ? 'Vypito' : 'Použito';
  return commit(c, { ...c.equipment, items }, `${verb}: ${it.name}`, null, now);
}

/** Odebere zbroj/štít ze slotu úplně (prodej, zničení). */
export function removePiece(c: Character, slot: 'armor' | 'shield', { saleMd = 0, now = new Date().toISOString() } = {}): Character {
  const p = c.equipment[slot];
  if (slotEmpty(p)) return c;
  return finish(c, { ...c.equipment, [slot]: EMPTY_PIECE(slot) }, pieceName(slot, p), saleMd, now);
}

/** Sundá zbroj/štít do výbavy. */
export function unequipPiece(c: Character, slot: 'armor' | 'shield', now = new Date().toISOString()): Character {
  const p = c.equipment[slot];
  if (slotEmpty(p)) return c;
  const eq = { ...c.equipment, [slot]: EMPTY_PIECE(slot), items: [...c.equipment.items, pieceToItem(slot, p)] };
  return commit(c, eq, `Sundáno do výbavy: ${pieceName(slot, p)}`, null, now);
}

/** Nasadí zbroj/štít z výbavy (dosavadní kus jde do výbavy). */
export function equipFromItems(c: Character, itemUid: string, now = new Date().toISOString()): Character {
  const it = c.equipment.items.find((x) => x.uid === itemUid);
  const slot = it?.piece?.slot ?? (it && getShield(it.itemId) ? 'shield' : it && getArmor(it.itemId) ? 'armor' : null);
  if (!it || !slot) return c;
  const rest = it.qty > 1 ? c.equipment.items.map((x) => (x === it ? { ...x, qty: x.qty - 1 } : x)) : c.equipment.items.filter((x) => x !== it);
  const def = slot === 'armor' ? getArmor(it.itemId) : getShield(it.itemId);
  const piece: ArmorPiece = { itemId: def ? it.itemId : null, custom: def ? null : (it.piece?.custom ?? null), equipped: true, weightLb: def ? null : it.weightLb };
  const eq = putOn({ ...c.equipment, items: rest }, slot, piece);
  return commit(c, eq, `Nasazeno: ${it.name}`, null, now);
}

/** Lze položku výbavy nasadit jako zbroj/štít? */
export const itemSlot = (it: GearItem): 'armor' | 'shield' | null =>
  it.piece?.slot ?? (getShield(it.itemId) ? 'shield' : getArmor(it.itemId) ? 'armor' : null);

/** Standardní prodej = polovina kupní ceny (✔ U 24. 9. 2026), zaokrouhleno nahoru (H06). */
export const salePriceMd = (buyMd: number) => Math.ceil(Math.max(0, buyMd) / 2);

/** Katalogová cena kusu v md (pro předvyplnění prodeje), 0 = neznámá. */
export function unitPriceMd(c: Character, what: { itemId: string | null; alch?: GearAlchemy }): number {
  if (what.alch) return what.alch.priceMd ?? 0;
  const id = what.itemId;
  if (!id) return 0;
  const custom = c.equipment.customCatalog.find((x) => x.id === id);
  const p = custom?.price ?? getWeapon(id)?.price ?? getArmor(id)?.price ?? getShield(id)?.price ?? getGear(id)?.price ?? null;
  return p ? Math.round(p.v * { zl: 100, st: 10, md: 1 }[p.cur]) : 0;
}

// ---------------------------------------------------------------- vlastní katalog

export function saveCustom(c: Character, item: Omit<CustomCatalogItem, 'id'> & { id?: string }): { character: Character; item: CustomCatalogItem } {
  const full: CustomCatalogItem = { ...item, name: item.name.trim(), id: item.id ?? `custom:${uid()}` };
  const list = c.equipment.customCatalog;
  const customCatalog = list.some((x) => x.id === full.id) ? list.map((x) => (x.id === full.id ? full : x)) : [...list, full];
  return { character: { ...c, equipment: { ...c.equipment, customCatalog } }, item: full };
}

export function deleteCustom(c: Character, id: string): Character {
  return { ...c, equipment: { ...c.equipment, customCatalog: c.equipment.customCatalog.filter((x) => x.id !== id) } };
}

/**
 * Bonus nasazené róby k ověření magie (H15: „Sesílání kouzel i proseb je v nich mnohem snazší“) – platí pro kouzla
 * kouzelníka a hraničáře i pro prosby klerika. Nenasazená róba ani vlastní zbroj bonus nedávají.
 */
export function robeBonus(c: Character): { value: number; name: string } {
  const a = c.equipment.armor;
  const def = a.equipped ? getArmor(a.itemId) : undefined;
  return { value: def?.magicBonus ?? 0, name: def?.n ?? '' };
}
