// Střelivo a vrhání (feedback testerů, v0.18.0): výstřel ubere kus střeliva, vržená zbraň leží na bojišti.
// Vystřelené šípy i vržené zbraně jde po boji sebrat zpět, nebo odepsat jako ztracené.
import type { Character, GearItem, WeaponEntry } from '../model/types';
import { getWeapon } from './data';
import { record } from './combat';
import { isAmmo } from './catalog';

const wDef = (w: WeaponEntry) => getWeapon(w.itemId);
export const weaponName = (w: WeaponEntry) => wDef(w)?.n ?? w.custom?.name ?? 'zbraň';
const kindOf = (w: WeaponEntry) => wDef(w)?.kind ?? w.custom?.kind ?? 'melee';

/** Střílí se ze zbraně střelivem (luky, kuše, prak). */
export const usesAmmo = (w: WeaponEntry) => kindOf(w) === 'ranged' || /prak/i.test(weaponName(w));
/** Zbraň jde vrhnout (vrhací zbraně; zbraně tváří v tvář jako improvizovaný hod – postih určí PJ). Střelné a prak ne. */
export const canThrow = (w: WeaponEntry) => !usesAmmo(w);
export const isThrownKind = (w: WeaponEntry) => kindOf(w) === 'thrown' && !usesAmmo(w);
export const availOf = (w: WeaponEntry) => Math.max(0, (w.qty ?? 1) - (w.thrownOut ?? 0));

/** Položky výbavy, které se dají použít jako střelivo – šípy a šipky z pravidel napřed, pak ostatní (vlastní šípy, kameny…). */
export function ammoChoices(c: Character): { ammo: GearItem[]; other: GearItem[] } {
  const ok = c.equipment.items.filter((i) => !i.piece && !i.weapon && !i.alch && !/^doplnek_toulec/.test(i.itemId ?? ''));
  const rule = (i: GearItem) => (!!i.itemId && isAmmo(i.itemId)) || /šíp|šipk|kamen|kulk|náboj/i.test(i.name);
  return { ammo: ok.filter(rule), other: ok.filter((i) => !rule(i)) };
}

/** Střelivo zvolené u zbraně (když zvolené už není, nabídne se první šíp / šipka ve výbavě). */
export function ammoOf(c: Character, w: WeaponEntry): GearItem | null {
  const items = c.equipment.items;
  const chosen = w.ammoItemUid ? items.find((i) => i.uid === w.ammoItemUid) : undefined;
  if (chosen) return chosen;
  if (w.ammoItemUid) return null;
  const name = weaponName(w).toLowerCase();
  const want = /kuš/.test(name) ? /šipk|sipka/i : /luk/.test(name) ? /šíp(?!k)|_sip_/i : /kamen|kulk/i;
  return items.find((i) => want.test(`${i.name} ${i.itemId ?? ''}`) && !i.weapon && !i.piece) ?? null;
}

export function setAmmo(c: Character, weaponUid: string, itemUid: string | null): Character {
  return { ...c, equipment: { ...c.equipment, weapons: c.equipment.weapons.map((w) => (w.uid === weaponUid ? { ...w, ammoItemUid: itemUid } : w)) } };
}

type R = { character: Character; error?: string; text?: string };

/** Výstřel: ubere 1 kus zvoleného střeliva (přesune ho mezi vystřelené). */
export function shoot(c: Character, weaponUid: string): R {
  const w = c.equipment.weapons.find((x) => x.uid === weaponUid);
  if (!w || !usesAmmo(w)) return { character: c };
  const a = ammoOf(c, w);
  if (!a || a.qty < 1) return { character: c, error: `${weaponName(w)}: došlo střelivo${a ? ` (${a.name})` : ' – vyber střelivo'}` };
  const items = c.equipment.items.map((i) => (i === a ? { ...i, qty: i.qty - 1, spent: (i.spent ?? 0) + 1 } : i));
  const weapons = w.ammoItemUid === a.uid ? c.equipment.weapons : c.equipment.weapons.map((x) => (x === w ? { ...x, ammoItemUid: a.uid } : x));
  const text = `Výstřel – ${weaponName(w)}: ${a.name} (zbývá ${a.qty - 1})`;
  return { character: record(c, text, (y) => ({ ...y, equipment: { ...y.equipment, items, weapons } })), text };
}

/** Vrhnutí: 1 kus zbraně leží na bojišti; poslední vržený kus znamená, že zbraň nemáš v ruce (ani na obranu). */
export function throwWeapon(c: Character, weaponUid: string, inHandUid?: string | null): R {
  const w = c.equipment.weapons.find((x) => x.uid === weaponUid);
  if (!w || !canThrow(w)) return { character: c };
  const left = availOf(w);
  if (left < 1) return { character: c, error: `${weaponName(w)}: nic k vrhnutí – všechno už leží na bojišti` };
  const weapons = c.equipment.weapons.map((x) => (x === w ? { ...x, thrownOut: (x.thrownOut ?? 0) + 1 } : x));
  const text = `Vrženo – ${weaponName(w)}${left - 1 > 0 ? ` (zbývá ${left - 1})` : ' – zbraň už v ruce nemáš'}`;
  // Vrhl zbraň, kterou držel (i výchozí, nevybranou) – zůstane v ruce „prázdno“, další zbraň se sama nevezme.
  const activeWeaponUid = inHandUid === weaponUid ? weaponUid : c.equipment.activeWeaponUid;
  return { character: record(c, text, (y) => ({ ...y, equipment: { ...y.equipment, weapons, activeWeaponUid } })), text };
}

/** Co leží na bojišti: vystřelené střelivo a vržené zbraně. */
export function onField(c: Character): { what: 'item' | 'weapon'; uid: string; name: string; n: number }[] {
  return [
    ...c.equipment.weapons.filter((w) => (w.thrownOut ?? 0) > 0).map((w) => ({ what: 'weapon' as const, uid: w.uid, name: weaponName(w), n: w.thrownOut! })),
    ...c.equipment.items.filter((i) => (i.spent ?? 0) > 0).map((i) => ({ what: 'item' as const, uid: i.uid, name: i.name, n: i.spent! })),
  ];
}

/** Sebrat (`lost` = false) nebo odepsat jako ztracené (`lost` = true) n kusů z bojiště. */
export function pickUp(c: Character, what: 'item' | 'weapon', uid: string, n: number, lost: boolean): Character {
  const eq = c.equipment;
  if (what === 'item') {
    const it = eq.items.find((i) => i.uid === uid);
    if (!it?.spent) return c;
    const k = Math.min(it.spent, Math.max(1, Math.trunc(n)));
    const items = eq.items
      .map((i) => (i === it ? { ...i, spent: i.spent! - k, qty: lost ? i.qty : i.qty + k } : i))
      .filter((i) => i.qty > 0 || (i.spent ?? 0) > 0 || i.uid !== uid);
    return record(c, `${lost ? 'Ztraceno' : 'Sebráno'}: ${it.name} ×${k}`, (y) => ({ ...y, equipment: { ...y.equipment, items } }));
  }
  const w = eq.weapons.find((x) => x.uid === uid);
  if (!w?.thrownOut) return c;
  const k = Math.min(w.thrownOut, Math.max(1, Math.trunc(n)));
  const qty = (w.qty ?? 1) - (lost ? k : 0);
  const weapons = qty > 0
    ? eq.weapons.map((x) => (x === w ? { ...x, thrownOut: x.thrownOut! - k, qty } : x))
    : eq.weapons.filter((x) => x !== w);
  const activeWeaponUid = qty > 0 ? eq.activeWeaponUid : eq.activeWeaponUid === uid ? null : eq.activeWeaponUid;
  return record(c, `${lost ? 'Ztraceno' : 'Sebráno'}: ${weaponName(w)} ×${k}`, (y) => ({ ...y, equipment: { ...y.equipment, weapons, activeWeaponUid } }));
}

// ---------------------------------------------------------------- dvojí použití (bodnout / vrhnout)

/** Párová varianta zbraně v H15 (jednoruční dýka ↔ vrhací dýka, nůž, sekera, oštěp). */
function pairOf(w: WeaponEntry) {
  const id = w.itemId ?? '';
  const m = /^(jednorucni|vrhaci)_(.+)$/.exec(id);
  if (!m) return undefined;
  return getWeapon(`${m[1] === 'jednorucni' ? 'vrhaci' : 'jednorucni'}_${m[2]}`);
}

/** Zbraně, které se nedají použít na blízko (hvězdice, kámen, koule, flakón). */
const throwOnly = (w: WeaponEntry) => /hvězdic|kámen|koule|flakón/i.test(weaponName(w));

export interface AltAttack {
  mode: 'throw' | 'melee';
  attackNumber: number;
  damageTotal: number;
  /** Bez páru v pravidlech – improvizovaný hod, postih určí PJ. */
  improvised: boolean;
}

/**
 * Druhý způsob útoku stejnou zbraní: dýka na blízko → vrh (OBR + útočnost vrhací dýky), vrhací dýka → bodnutí
 * (SIL + útočnost dýky). Zbraň tváří v tvář bez páru jde vrhnout improvizovaně (stejná útočnost, postih PJ).
 */
export function altAttack(w: WeaponEntry, row: { kind: string; attack: number; damage: number; attackNumber: number; damageTotal: number }, mods: { sil: number; obr: number }): AltAttack | null {
  if (usesAmmo(w)) return null;
  const melee = row.kind === 'melee';
  if (!melee && throwOnly(w)) return null;
  const p = pairOf(w);
  if (!melee && !p) return null; // vrhací zbraň bez varianty na blízko (vrhací sekera…)
  const mode = melee ? 'throw' : 'melee';
  const att = p?.att ?? row.attack;
  const dmg = p?.dmg ?? row.damage;
  const base = melee ? mods.obr - mods.sil : mods.sil - mods.obr;
  return { mode, attackNumber: row.attackNumber + base - row.attack + att, damageTotal: row.damageTotal - row.damage + dmg, improvised: !p };
}
