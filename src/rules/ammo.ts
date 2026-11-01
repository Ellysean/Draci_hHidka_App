// Střelivo u zbraně – bez závislosti na boji (používá ho i derive): které střelivo zbraň používá a jaký dává bonus.
import type { Character, GearItem, WeaponEntry } from '../model/types';
import { getWeapon } from './data';

const wDef = (w: WeaponEntry) => getWeapon(w.itemId);
export const weaponName = (w: WeaponEntry) => wDef(w)?.n ?? w.custom?.name ?? 'zbraň';
export const kindOf = (w: WeaponEntry) => wDef(w)?.kind ?? w.custom?.kind ?? 'melee';

/** Střílí se ze zbraně střelivem (luky, kuše, prak). */
export const usesAmmo = (w: WeaponEntry) => kindOf(w) === 'ranged' || /prak/i.test(weaponName(w));

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

/** Bonus vlastního střeliva (ÚČ, zranění) – z vlastního katalogu, odkud položka pochází. */
export function ammoBonus(c: Character, item: GearItem | null): { atk: number; dmg: number; name: string } | null {
  if (!item || item.qty < 1) return null;
  const def = c.equipment.customCatalog.find((x) => x.id === item.itemId);
  const atk = def?.ammo?.atk ?? 0;
  const dmg = def?.ammo?.dmg ?? 0;
  return atk || dmg ? { atk, dmg, name: item.name } : null;
}
