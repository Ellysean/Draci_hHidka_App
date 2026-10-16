// Kouzelník (7c.2) – změny stavu: meditace, nasátí, Rituál krve, hůl a dýka, sesílání mimo boj, Záměna kouzel,
// a v boji Magická dominance, Mentální souboj a mentální techniky (PPP04). Každá změna jde přes record() → záznam a „Vrátit“.
import { uid } from '../model/defaults';
import type { Character, WizardCastMods, WizardState } from '../model/types';
import { record, staffSplit, turnCtx, withActiveSpell } from './combat';
import type { Derived } from './derive';
import { rollDie } from './dice';
import type { MagicSpell } from './hranicar';
import {
  WIZ, bloodCost, bloodWhy, castProfile, drawFixed, drawWhy, hasAbility, learnLock, lifeCapacity, meditateWhy, meditationResult,
  staffCapacity, staffKinds, staffOf, staffWhy, swapsLeft, wiz, wizardCtx, type StaffKind,
} from './kouzelnik';

const withWiz = (c: Character, fn: (w: WizardState) => WizardState): Character => ({ ...c, classState: { ...c.classState, kouzelnik: fn(wiz(c)) } });

/** Volby sesílání se jen uloží (nejde o herní akci, nezapisuje se do záznamu). */
export const setMods = (c: Character, patch: Partial<WizardCastMods>) => withWiz(c, (w) => ({ ...w, mods: { ...w.mods, ...patch } }));

/** V boji zabere akce celou dlouhou akci (Nasátí s Bitevním tréninkem, Rituál krve, mentální techniky). */
function longAction(c: Character, d: Derived, label: string): Character | string {
  const x = turnCtx(c, d);
  if (!x.B) return c;
  if (x.B.phase !== 'turn') return 'jen ve tvém tahu';
  if (x.out || x.stunned || x.surprised) return 'nemůžeš jednat';
  if (x.free < 2) return 'nemáš dlouhou akci';
  return { ...c, play: { ...c.play, combat: { ...x.B, k: x.B.k + 2, turnLog: [...x.B.turnLog, { n: label, len: 'D', once: null }] } } };
}
export function longWhy(c: Character, d: Derived): string {
  const r = longAction(c, d, '');
  return typeof r === 'string' ? r : '';
}

// ---------------------------------------------------------------- mana

export function meditate(c: Character, d: Derived): Character {
  if (meditateWhy(c, d)) return c;
  const to = meditationResult(c, d.manaMax.value!);
  return record(c, `Meditace: mana ${c.vitals.manaCurrent} → ${to}`, (y) => withWiz({ ...y, vitals: { ...y.vitals, manaCurrent: to } }, (w) => ({ ...w, meditatedToday: true })));
}

export function drawMana(c: Character, d: Derived, die = rollDie): { character: Character; gain: number } {
  if (drawWhy(c, d)) return { character: c, gain: 0 };
  const inFight = c.play.combat ? longAction(c, d, 'Nasátí many') : c;
  if (typeof inFight === 'string') return { character: c, gain: 0 };
  const fixed = drawFixed(c);
  const rolled = fixed ?? die(6);
  const gain = Math.min(rolled, d.manaMax.value! - c.vitals.manaCurrent);
  const n = wiz(c).manaDrawsToday + 1;
  const character = record(c, `Nasátí many ${n}/${c.progression.level}: +${gain}${fixed ? ' (Citlivost na vichry many)' : ` (k6 = ${rolled})`}`, () =>
    withWiz({ ...inFight, vitals: { ...inFight.vitals, manaCurrent: inFight.vitals.manaCurrent + gain } }, (w) => ({ ...w, manaDrawsToday: n })));
  return { character, gain };
}

/** Nový den: meditace a nasátí znovu, aktivní kouzla (nejdéle 6 hodin – Magická zbroj) skončí. */
export const newDay = (c: Character) =>
  record(c, 'Nový den – meditace a nasátí znovu k dispozici', (y) => withWiz(y, (w) => ({ ...w, meditatedToday: false, manaDrawsToday: 0, active: [] })));

export function bloodRitual(c: Character, d: Derived, mana: number, dagger = false): Character {
  if (bloodWhy(c, d, mana, dagger)) return c;
  const hp = bloodCost(mana, dagger);
  const label = `Rituál krve: −${hp} životů, +${mana} many${dagger ? ' (Krev v manu)' : ''}`;
  const inFight = c.play.combat ? longAction(c, d, 'Rituál krve') : c;
  if (typeof inFight === 'string') return c;
  return record(c, label, () => ({ ...inFight, vitals: { ...inFight.vitals, hpCurrent: inFight.vitals.hpCurrent - hp, manaCurrent: inFight.vitals.manaCurrent + mana } }));
}

// ---------------------------------------------------------------- hůl a dýka

/** Rituál hole (PPP04 s. 192): vyčerpá všechnu manu; varianta podle specializace; obor pro +1. */
export function makeStaff(c: Character, kind: StaffKind, obor: string | null): Character {
  if (staffWhy(c) || !staffKinds(c).includes(kind)) return c;
  const name = WIZ.hul.varianty[kind].name;
  return record(c, `Rituál hole: ${name} (mana ${c.vitals.manaCurrent} → 0)`, (y) =>
    withWiz({ ...y, vitals: { ...y.vitals, manaCurrent: 0 } }, (w) => ({ ...w, staff: { owned: true, kind, obor, mana: 0, life: 0, inHand: true } })));
}

export const loseStaff = (c: Character) =>
  record(c, `Ztráta: ${WIZ.hul.varianty[wiz(c).staff.kind].name}`, (y) => withWiz(y, (w) => ({ ...w, staff: { ...w.staff, owned: false, mana: 0, life: 0 } })));

export const setStaffHand = (c: Character, inHand: boolean) => withWiz(c, (w) => ({ ...w, staff: { ...w.staff, inHand } }));

/** Vložení many do hole – 1 kolo (PPP04); nejvýš do kapacity. */
export function storeMana(c: Character, n: number): Character {
  const st = staffOf(c);
  if (!st) return c;
  const k = Math.max(0, Math.min(n, c.vitals.manaCurrent, staffCapacity(c) - st.mana));
  if (!k) return c;
  return record(c, `Do hole: ${k} many`, (y) => withWiz({ ...y, vitals: { ...y.vitals, manaCurrent: y.vitals.manaCurrent - k } }, (w) => ({ ...w, staff: { ...w.staff, mana: w.staff.mana + k } })));
}

/** Uchování života (Nekromantova dýka): za každé 2 obětované životy 1 uložený, nejvýš 2× úroveň. */
export function storeLife(c: Character, hp: number): Character {
  const st = staffOf(c);
  if (!st || st.kind !== 'dyka') return c;
  const room = lifeCapacity(c) - st.life;
  const stored = Math.max(0, Math.min(Math.floor(hp / 2), room, Math.floor((c.vitals.hpCurrent - 1) / 2)));
  if (!stored) return c;
  return record(c, `Uchování života: −${2 * stored} životů, v dýce +${stored}`, (y) =>
    withWiz({ ...y, vitals: { ...y.vitals, hpCurrent: y.vitals.hpCurrent - 2 * stored } }, (w) => ({ ...w, staff: { ...w.staff, life: w.staff.life + stored } })));
}

/** Dýka vrátí uložené životy (na Hranici smrti – PPP04 s. 210). */
export function releaseLife(c: Character, n: number): Character {
  const st = staffOf(c);
  const k = st ? Math.max(0, Math.min(n, st.life)) : 0;
  if (!k) return c;
  return record(c, `Dýka vrací ${k} životů`, (y) => withWiz({ ...y, vitals: { ...y.vitals, hpCurrent: y.vitals.hpCurrent + k } }, (w) => ({ ...w, staff: { ...w.staff, life: w.staff.life - k } })));
}

// ---------------------------------------------------------------- sesílání mimo boj

export interface OutsideCast { character: Character; bonus: number; dc: number | null; parts: string[] }

/** Proč kouzlo teď nejde seslat mimo boj ('' = jde). `book` = Kouzlení z knih (neznámé kouzlo). */
export function outsideWhy(c: Character, d: Derived, s: MagicSpell, price: number, book = false): string {
  if (c.play.combat) return 'probíhá boj – sesílej na záložce Boj a stavy';
  if (book && !hasAbility(c, 'kouzleni_z_knih')) return 'chybí Kouzlení z knih';
  if (book && learnLock(s, wizardCtx(c)) && s.zdroj === 'PPP04' && c.progression.level < 6) return 'kouzla pro pokročilé až od 6. úrovně';
  const p = castProfile(c, d, s, wiz(c).mods, { book });
  if (p.why) return p.why;
  const pay = staffSplit(c, p.cost(price));
  if (pay.own > c.vitals.manaCurrent) return `chybí mana (${c.vitals.manaCurrent}/${pay.own})`;
  return '';
}

export function castOutside(c: Character, d: Derived, s: MagicSpell, price: number, skillBonus: number, book = false): OutsideCast | null {
  if (outsideWhy(c, d, s, price, book)) return null;
  const p = castProfile(c, d, s, wiz(c).mods, { book });
  const final = p.cost(price);
  const pay = staffSplit(c, final);
  const character = record(c, `${s.nazev}${book ? ' (z knihy)' : ''}: −${final} many${pay.staff ? ` (z hole ${pay.staff})` : ''}`, (y) => {
    const z = withWiz({ ...y, vitals: { ...y.vitals, manaCurrent: y.vitals.manaCurrent - pay.own } }, (w) => ({ ...w, staff: { ...w.staff, mana: w.staff.mana - pay.staff } }));
    return withActiveSpell(z, s.nazev, price);
  });
  return { character, bonus: skillBonus + p.bonus, dc: p.dc, parts: p.bonusParts };
}

/** Kouzelnický trik (H11): 1 mana, bez ověření. */
export function castTrick(c: Character, label = 'Kouzelnický trik'): Character {
  if (c.vitals.manaCurrent < WIZ.trik.mana) return c;
  return record(c, `${label}: −${WIZ.trik.mana} many`, (y) => ({ ...y, vitals: { ...y.vitals, manaCurrent: y.vitals.manaCurrent - WIZ.trik.mana } }));
}

export const removeActive = (c: Character, id: string) => {
  const a = wiz(c).active.find((x) => x.uid === id);
  return a ? record(c, `Kouzlo skončilo: ${a.name}`, (y) => withWiz(y, (w) => ({ ...w, active: w.active.filter((x) => x.uid !== id) }))) : c;
};

/** Ruční přidání aktivního kouzla (seslal ho jiný kouzelník, přepis z papíru). */
export function addActive(c: Character, name: string, zo: number, haste: boolean, rounds: number | null): Character {
  const round = c.play.combat?.round ?? 0;
  return record(c, `Působí: ${name}${zo ? ` (ZO +${zo})` : ''}${haste ? ' (Rychlost)' : ''}`, (y) =>
    withWiz(y, (w) => ({ ...w, active: [...w.active, { uid: uid(), id: 'vlastni', name, ...(zo ? { zo } : {}), ...(haste ? { haste } : {}), until: rounds == null ? null : round + rounds }] })));
}

// ---------------------------------------------------------------- Záměna kouzel (PPP04 s. 200)

export function swapWhy(c: Character, from: string, to: MagicSpell | undefined): string {
  if (!hasAbility(c, 'zamena_kouzel')) return 'chybí Záměna kouzel';
  if (!swapsLeft(c)) return `na této úrovni už ${c.progression.level}× zaměněno`;
  if (!c.progression.learnedItems.includes(from)) return 'kouzlo neumíš';
  if (!to) return 'vyber nové kouzlo';
  if (c.progression.learnedItems.includes(to.nazev)) return 'už umíš';
  const lock = learnLock(to, wizardCtx(c));
  return lock;
}

export function swapSpell(c: Character, from: string, to: MagicSpell): Character {
  if (swapWhy(c, from, to)) return c;
  const lvl = c.progression.level;
  return {
    ...withWiz(c, (w) => ({ ...w, swaps: { level: lvl, n: (w.swaps.level === lvl ? w.swaps.n : 0) + 1 } })),
    progression: { ...c.progression, learnedItems: c.progression.learnedItems.map((n) => (n === from ? to.nazev : n)) },
  };
}

// ---------------------------------------------------------------- boj: Magická dominance, Mentální souboj, techniky

export function dominanceWhy(c: Character, n: number): string {
  const B = c.play.combat;
  if (!hasAbility(c, 'magicka_dominance')) return 'chybí Magická dominance';
  if (!B) return 'jen v boji';
  if (B.wiz?.dominance === B.round) return 'v tomto kole už použita';
  if (n < 1) return 'aspoň 1 kostka';
  if (3 * n > c.vitals.manaCurrent) return `málo many (${c.vitals.manaCurrent}/${3 * n})`;
  return '';
}

/** Magická dominance (Bojový mág): za každé 3 many +k6 k Útoku či Obraně tváří v tvář; šestky se nepřehazují; 1× za kolo. */
export function dominance(c: Character, n: number, what: 'útok' | 'obrana', die = rollDie): { character: Character; faces: number[]; sum: number } {
  if (dominanceWhy(c, n)) return { character: c, faces: [], sum: 0 };
  const faces = Array.from({ length: n }, () => die(6));
  const sum = faces.reduce((a, b) => a + b, 0);
  const character = record(c, `Magická dominance (${what}): −${3 * n} many, +${sum} (${faces.join('+')})`, (y) => ({
    ...y, vitals: { ...y.vitals, manaCurrent: y.vitals.manaCurrent - 3 * n },
    play: { ...y.play, combat: y.play.combat ? { ...y.play.combat, wiz: { ...y.play.combat.wiz, dominance: y.play.combat.round } } : null },
  }));
  return { character, faces, sum };
}

export function duelWhy(c: Character, d: Derived): string {
  if (!hasAbility(c, 'mentalni_souboj')) return 'chybí Mentální souboj';
  if (!c.play.combat) return 'jen v boji';
  if (c.vitals.manaCurrent < 2) return 'málo many (2)';
  return longWhy(c, d);
}

/** Mentální souboj (Čaroděj): dlouhá akce, 2 many za kolo; Vůle vs. Vůle oběti, rozdíl = ztracené životy oběti. */
export function mentalDuel(c: Character, d: Derived): Character {
  if (duelWhy(c, d)) return c;
  const x = longAction(c, d, 'Mentální souboj') as Character;
  return record(c, 'Mentální souboj: −2 many', () => ({ ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - 2 } }));
}

export const TECHNIQUES = ['pyrokineze', 'telekineze', 'telepatie', 'transfer_many'] as const;

/** Mentální techniky PPP04 bez many: dlouhá akce, Pyrokineze / Telekineze / Telepatie stojí 1 bod únavy. */
export function technique(c: Character, d: Derived, id: (typeof TECHNIQUES)[number]): Character {
  if (!hasAbility(c, id)) return c;
  const a = WIZ.schopnosti[id];
  const fat = a.technika?.fatigue ?? 0;
  const base = c.play.combat ? longAction(c, d, a.name) : c;
  if (typeof base === 'string') return c;
  return record(c, `${a.name}${fat ? ` – únava +${fat}` : ''}`, () => ({ ...base, vitals: { ...base.vitals, fatiguePoints: base.vitals.fatiguePoints + fat } }));
}
