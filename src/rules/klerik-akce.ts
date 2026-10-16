// Klerik (7d) – změny stavu: modlitby, Zvolání, Svěcení, vzývání mimo boj, aktivní prosby a poslové,
// schopnosti PPP06 (Bohoslužby, Flagelantství, Požehnání, Ikony, Sakrální předměty, Oběti, Avatar, Zázraky).
// Každá herní změna jde přes record() → záznam a „Vrátit“ (vrací i stav klerika).
import { uid } from '../model/defaults';
import type { Character, ClericCastMods, ClericState } from '../model/types';
import { changeHp, record } from './combat';
import type { Derived } from './derive';
import { rollDie } from './dice';
import {
  CLERIC, afterPrayer, callWhy, cle, darBonus, darZivota, hasAbility, prayWhy, prayerCheckBonus,
  prayerDc, prayerGain, prayerPrice, prayerWhy, rollFormula, type Prayer,
} from './klerik';

const withCle = (c: Character, fn: (s: ClericState) => ClericState): Character => ({ ...c, classState: { ...c.classState, klerik: fn(cle(c)) } });
const mana = (c: Character, v: number): Character => ({ ...c, vitals: { ...c.vitals, manaCurrent: v } });

/** Volby vzývání a přepínače stavu se jen uloží (nejde o herní akci, nezapisují se do záznamu). */
export const setMods = (c: Character, patch: Partial<ClericCastMods>) => withCle(c, (s) => ({ ...s, mods: { ...s.mods, ...patch } }));
export const setCleric = (c: Character, patch: Partial<Pick<ClericState, 'symbolInHand' | 'ritualToday' | 'vowKept' | 'divineArmor' | 'holyWeaponUid'>>) =>
  withCle(c, (s) => ({ ...s, ...patch }));

// ---------------------------------------------------------------- Přízeň

/** Pravidelná modlitba (1 směna): +⅓ maxima Přízně, max. 3× denně; povolí dalšího posla (H13). */
export function pray(c: Character, d: Derived): Character {
  const max = d.manaMax.value;
  if (prayWhy(c, max)) return c;
  const gain = prayerGain(c, max);
  const n = cle(c).prayersToday + 1;
  return record(c, `Pravidelná modlitba ${n}/3: Přízeň +${gain}`, (y) => withCle(mana(y, y.vitals.manaCurrent + gain), (s) => ({
    ...s, prayersToday: n, missedPrayers: 0, messenger: s.messenger ? { ...s.messenger, prayed: true } : null,
  })));
}

/** Vynechaná modlitba (H13): nejdřív varování, opakovaně ztráta náklonnosti boha – rozhodne PJ. */
export const missPrayer = (c: Character) =>
  record(c, `Vynechaná modlitba (${cle(c).missedPrayers + 1}×) – ${cle(c).missedPrayers ? 'hrozí ztráta náklonnosti boha (PJ)' : 'bůh varuje: příští modlitba nic nevrátí'}`,
    (y) => withCle(y, (s) => ({ ...s, missedPrayers: s.missedPrayers + 1 })));

/** Jednorázová Přízeň od PJ za mimořádný skutek – smí přesáhnout maximum (H13). */
export const grantFavor = (c: Character, n: number) =>
  n > 0 ? record(c, `Zvláštní Přízeň od PJ +${n}`, (y) => mana(y, y.vitals.manaCurrent + n)) : c;

/** Nový den: modlitby, rituál, Požehnání a Bohoslužby znovu; mimobojové prosby skončí; Zázraky vrátí 1 život. */
export function newDay(c: Character): Character {
  const healed = cle(c).miracleHp > 0 ? 1 : 0;
  return record(c, `Nový den – modlitby a denní schopnosti znovu${healed ? ' · Zázraky: +1 život' : ''}`, (y) => withCle(
    healed ? { ...y, vitals: { ...y.vitals, hpCurrent: y.vitals.hpCurrent + 1 } } : y,
    (s) => ({ ...s, prayersToday: 0, ritualToday: false, blessingUsed: false, serviceToday: false, miracleHp: Math.max(0, s.miracleHp - healed), active: s.active.filter((a) => a.until != null) }),
  ));
}

/** Zvolání (H13): v nejvyšší nouzi, okamžitě a i bez Přízně; 1× za úroveň (o vyslyšení rozhodne PJ). */
export function call(c: Character, prayerName: string, heard: boolean): Character {
  if (callWhy(c)) return c;
  return record(c, `Zvolání – ${prayerName || 'prosba v nouzi'}: ${heard ? 'vyslyšeno' : 'nevyslyšeno, možnost na této úrovni propadla'}`, (y) => withCle(y, (s) => ({ ...s, callLevel: y.progression.level })));
}

/** Svěcení (H13): 1 Přízeň – litr vody (5 flakónů svěcené vody do výbavy) nebo jeden předmět. */
export function consecrate(c: Character, what: 'voda' | 'predmet', label = ''): Character {
  if (c.vitals.manaCurrent < 1) return c;
  return record(c, what === 'voda' ? 'Svěcení: 5 flakónů svěcené vody (−1 Přízeň)' : `Svěcení: ${label || 'předmět'} (−1 Přízeň)`, (y) => {
    const z = mana(y, y.vitals.manaCurrent - 1);
    if (what !== 'voda') return z;
    const items = [...z.equipment.items];
    const i = items.findIndex((it) => it.name === 'Svěcená voda (flakón)');
    if (i >= 0) items[i] = { ...items[i], qty: items[i].qty + 5 };
    else items.push({ uid: uid(), name: 'Svěcená voda (flakón)', itemId: null, qty: 5, weightLb: 0.2, carried: true, container: null });
    return { ...z, equipment: { ...z.equipment, items } };
  });
}

// ---------------------------------------------------------------- vzývání mimo boj

export interface OutsidePrayer { character: Character; bonus: number; dc: number | null; dcList: number[]; parts: string[]; price: number }

/** Proč prosbu teď nejde vzývat mimo boj. */
export function outsideWhy(c: Character, p: Prayer, units: number, alt = false): string {
  const w = prayerWhy(c, p);
  if (w) return w;
  const price = prayerPrice(c, p, units, cle(c).mods, alt).total;
  if (price > c.vitals.manaCurrent) return `málo Přízně (${c.vitals.manaCurrent}/${price})`;
  return '';
}

/** Vzývání mimo boj: odečte Přízeň, zapíše aktivní prosbu / posla, spotřebuje Oběti. Hod dělá UI. */
export function prayOutside(c: Character, d: Derived, p: Prayer, units: number, skillBonus: number, alt = false): OutsidePrayer | null {
  if (outsideWhy(c, p, units, alt)) return null;
  const price = prayerPrice(c, p, units, cle(c).mods, alt);
  const dc = prayerDc(c, p, units);
  const chk = prayerCheckBonus(c);
  const character = record(c, `${p.nazev}: −${price.total} Přízně${cle(c).mods.dark ? ' (temná alternativa)' : ''}`, (y) => afterPrayer(mana(y, y.vitals.manaCurrent - price.total), p, units));
  void d;
  return { character, bonus: skillBonus + chk.bonus, dc: dc.dc, dcList: dc.list, parts: [...chk.parts, ...dc.parts], price: price.total };
}

/** Léčení prosbou: hod (× slova), Dar života +¼ (min. +1) od 6. úrovně (PPP06). */
export function rollHeal(c: Character, p: Prayer, units: number, die = rollDie): { faces: number[]; base: number; bonus: number; total: number } | null {
  const f = p.fx?.heal;
  if (!f) return null;
  const r = rollFormula(f, p.fx?.perUnit ? units : 1, die);
  const bonus = darZivota(c) && p.typ === 'prosba' ? darBonus(r.total) : 0;
  return { faces: r.faces, base: r.total, bonus, total: r.total + bonus };
}

/** Hod zranění prosbou (Úder moci, Kopí pravého světla) × počet. */
export function rollDamage(p: Prayer, units: number, die = rollDie) {
  const f = p.fx?.damage;
  return f ? rollFormula(f, p.fx?.perUnit ? units : 1, die) : null;
}

/** Vyléčí klerika výsledkem prosby (nikdy nad maximum). */
export const healSelf = (c: Character, d: Derived, n: number, label: string) => changeHp(c, d, n, `${label}: vyléčeno +${n} (na sebe)`);

// ---------------------------------------------------------------- aktivní prosby a posel

export const removeActive = (c: Character, uidA: string) => {
  const a = cle(c).active.find((x) => x.uid === uidA);
  if (!a) return c;
  return record(c, `${a.name} – ukončeno`, (y) => {
    const z = withCle(y, (s) => ({ ...s, active: s.active.filter((x) => x.uid !== uidA) }));
    // Božská pomoc (PPP06): po skončení přijde o dodatečné životy.
    return a.tempHp ? { ...z, vitals: { ...z.vitals, hpCurrent: z.vitals.hpCurrent - a.tempHp } } : z;
  });
};

/** Zásah do bariéry Štítu víry: nejdřív ubývají životy bariéře, zbytek jde na klerika (H13). */
export function hitBarrier(c: Character, dmg: number): Character {
  const a = cle(c).active.find((x) => x.barrier != null && x.barrier > 0);
  if (!a || dmg <= 0) return c;
  const absorbed = Math.min(a.barrier!, dmg);
  const rest = dmg - absorbed;
  const left = a.barrier! - absorbed;
  return record(c, `${a.name}: bariéra pohltila ${absorbed}${rest ? `, na klerika ${rest}` : ''}${left ? ` (zbývá ${left})` : ' – bariéra padla'}`, (y) => withCle(
    { ...y, vitals: { ...y.vitals, hpCurrent: y.vitals.hpCurrent - rest } },
    (s) => ({ ...s, active: left ? s.active.map((x) => (x.uid === a.uid ? { ...x, barrier: left } : x)) : s.active.filter((x) => x.uid !== a.uid) }),
  ));
}

export const setMessenger = (c: Character, patch: Partial<NonNullable<ClericState['messenger']>>) =>
  withCle(c, (s) => ({ ...s, messenger: s.messenger ? { ...s.messenger, ...patch } : null }));
export const dismissMessenger = (c: Character) =>
  cle(c).messenger ? record(c, `${cle(c).messenger!.name} – odvolán`, (y) => withCle(y, (s) => ({ ...s, messenger: null }))) : c;

// ---------------------------------------------------------------- schopnosti PPP06

/** Bohoslužby (1 h, 1× denně): +1 aktuální Přízeň za účastníka (nejvýš do maxima); účastníci +3 k Vůli na 24 h. */
export function service(c: Character, d: Derived, n: number): Character {
  if (!hasAbility(c, 'bohosluzby') || cle(c).serviceToday || n < 1) return c;
  const max = d.manaMax.value ?? Infinity;
  const gain = Math.max(0, Math.min(n, max - c.vitals.manaCurrent));
  return record(c, `Bohoslužby (${n} účastníků): Přízeň +${gain}, všichni +3 k Vůli na 24 h`, (y) => withCle(mana(y, y.vitals.manaCurrent + gain), (s) => ({ ...s, serviceToday: true })));
}

/** Flagelantství (1 směna, 1× týdně): životy na 1, obnoví Zvolání. */
export const flagellation = (c: Character) =>
  hasAbility(c, 'flagelantstvi') ? record(c, 'Flagelantství: životy na 1, Zvolání znovu k dispozici', (y) => withCle({ ...y, vitals: { ...y.vitals, hpCurrent: 1 } }, (s) => ({ ...s, callLevel: null }))) : c;

/** Požehnání (1× denně): přehoď hod a vyber lepší. */
export const blessing = (c: Character) =>
  hasAbility(c, 'pozehnani') && !cle(c).blessingUsed ? record(c, 'Požehnání: hod přehozen (vyber lepší)', (y) => withCle(y, (s) => ({ ...s, blessingUsed: true }))) : c;

/** Oběti (1 směna): obtížnost příští prosby −10. */
export const offering = (c: Character, what: string) =>
  hasAbility(c, 'obeti') ? record(c, `Oběť${what ? `: ${what}` : ''} – příští prosba −10 obtížnost`, (y) => withCle(y, (s) => ({ ...s, offering: true }))) : c;

/** Ikona (1 den): −10 max. Přízně natrvalo. */
export const addIcon = (c: Character, prayer: string) =>
  hasAbility(c, 'ikony') ? record(c, `Ikona – ${prayer}: max. Přízeň −10 natrvalo`, (y) => withCle(y, (s) => ({ ...s, icons: [...s.icons, { uid: uid(), prayer }] }))) : c;
export const removeIcon = (c: Character, id: string) =>
  record(c, 'Ikona zničena – maximum Přízně se nevrací (PPP06), záznam odebrán', (y) => withCle(y, (s) => ({ ...s, icons: s.icons.filter((x) => x.uid !== id) })));

/** Sakrální předmět (1 h): vloží veškerou (maximální) Přízeň; aktivních nejvýš tolik, kolik je úroveň. */
export function sacralWhy(c: Character, d: Derived): string {
  if (!hasAbility(c, 'sakralni_predmety')) return 'chybí schopnost';
  if (cle(c).sacral.length >= c.progression.level) return `nejvýš ${c.progression.level} aktivních`;
  const max = d.manaMax.value;
  if (max == null || c.vitals.manaCurrent < max) return `potřebuješ plnou Přízeň (${c.vitals.manaCurrent}/${max ?? '?'})`;
  return '';
}
export const makeSacral = (c: Character, d: Derived, prayer: string) =>
  sacralWhy(c, d) ? c : record(c, `Sakrální předmět – ${prayer}: vložena veškerá Přízeň`, (y) => withCle(mana(y, 0), (s) => ({ ...s, sacral: [...s.sacral, { uid: uid(), prayer }] })));
export const useSacral = (c: Character, id: string) =>
  record(c, `Sakrální předmět použit – ${cle(c).sacral.find((x) => x.uid === id)?.prayer ?? ''}`, (y) => withCle(y, (s) => ({ ...s, sacral: s.sacral.filter((x) => x.uid !== id) })));

/** Zázrak (PPP06): stojí 1k6 životů, které vrací jen čas (1 za den). */
export function miracle(c: Character, label: string, die = rollDie): { character: Character; hp: number } {
  const hp = die(6);
  return { hp, character: record(c, `Zázrak${label ? ` – ${label}` : ''}: −${hp} životů (vrací jen čas)`, (y) => withCle({ ...y, vitals: { ...y.vitals, hpCurrent: y.vitals.hpCurrent - hp } }, (s) => ({ ...s, miracleHp: s.miracleHp + hp }))) };
}

/** Avatar (Kněz): přijde o veškerou Přízeň (měsíc se nedoplňuje); 1 kolo modlitba + 3 kola proměna, trvá 10 × úroveň kol. */
export function avatarStart(c: Character): Character {
  if (!hasAbility(c, 'avatar') || cle(c).avatar?.active) return c;
  const round = c.play.combat?.round ?? null;
  const until = round != null ? round + 4 + 10 * c.progression.level : null;
  return record(c, `Avatar: Přízeň → 0, proměna 1 + 3 kola, trvá ${10 * c.progression.level} kol`, (y) => withCle(mana(y, 0), (s) => ({ ...s, avatar: { active: true, until, drained: true } })));
}
/** Konec Avatara: 1 život a božské vyčerpání (do vydatného spánku). */
export const avatarEnd = (c: Character) =>
  cle(c).avatar?.active ? record(c, 'Avatar skončil – 1 život, vyčerpání do vydatného spánku', (y) => withCle({ ...y, vitals: { ...y.vitals, hpCurrent: 1 } }, (s) => ({ ...s, avatar: { active: false, until: null, drained: true } }))) : c;
/** Měsíc po Avatarovi uplynul – Přízeň se zase doplňuje. */
export const avatarMonthOver = (c: Character) => record(c, 'Měsíc po Avatarovi uplynul – Přízeň se zase doplňuje', (y) => withCle(y, (s) => ({ ...s, avatar: null })));

export const RULES = CLERIC.pravidla;

/** Výroba léku (Výcvik lazaretních léčitelů, PPP06): zaplatí Přízeň; po úspěšném hodu Znalosti přírody se přidá do výbavy. */
export function brewWhy(c: Character, p: Prayer): string {
  if (p.typ !== 'lek') return '';
  if (c.play.combat) return 'mimo boj';
  return p.cena.base > c.vitals.manaCurrent ? `málo Přízně (${c.vitals.manaCurrent}/${p.cena.base})` : '';
}
export const brewPay = (c: Character, p: Prayer) =>
  brewWhy(c, p) ? c : record(c, `${p.nazev}: výroba (${p.vyroba ?? ''}) −${p.cena.base} Přízně`, (y) => mana(y, y.vitals.manaCurrent - p.cena.base));
export function brewAdd(c: Character, p: Prayer): Character {
  const qty = parseInt(p.pocet ?? '1', 10) || 1;
  return record(c, `${p.nazev} – do výbavy (${qty}×, četnost ${p.cetnost ?? '?'})`, (y) => ({
    ...y, equipment: { ...y.equipment, items: [...y.equipment.items, { uid: uid(), name: p.nazev, itemId: null, qty, weightLb: 0.2, carried: true, container: null }] },
  }));
}
