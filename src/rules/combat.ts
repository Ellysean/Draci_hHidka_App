// Boj a stavy (Fáze 6): životy, léčení, únava, stavy, hlídání akcí v tahu (H16, H17).
// Převedeno z odsouhlaseného prototypu v8.3–v9. Čisté funkce nad postavou – každá rychlá
// úprava jde přes record(), který zapíše záznam a uloží stav pro „Vrátit“.
import { isRanger, knownRangerSpells, rangerRound, toSpellDef } from './hranicar';
import { activeFromCast, castProfile, hasteRound, isWizard, shortCap, spellByName, staffOf, wiz, wizardSpellDefs } from './kouzelnik';
import { uid } from '../model/defaults';
import { packBonus } from './pratele';
import { afterPrayer, clericRound, isCleric, knownPrayers, noKnockout, prayerByName, prayerCheckBonus, prayerDc, prayerLen, prayerPrice, prayerWhy, unitsOf } from './klerik';
import type { ActionLength, Character, CombatState, Condition, WarriorCombat } from '../model/types';
import { CONDITIONS, FATIGUE, getSkill } from './data';
import type { Derived } from './derive';
import { sgn } from './derive';
import { rollDie } from './dice';
import { robeBonus } from './equipment';
import { isThief, thiefCombatMods, thiefRound } from './zlodej';
import {
  TRICK_KIND_LABEL, adrenalinAtStart, adrenalinGain, attacksPerRound, commandBonus, defensesPerRound, furyOn, hasAbility, isWarrior,
  knownWarriorTricks, pathRank, shieldBashRound, strategyRounds, type ActiveWeapon, type RoundCount, type WarriorTrick,
} from './valecnik';

// ---------------------------------------------------------------- záznam a vrácení

const LOG_MAX = 50;
const UNDO_MAX = 20;

/** Provede úpravu, zapíše ji do záznamu a uloží předchozí stav životů/stavů/boje pro „Vrátit“. */
export function record(c: Character, text: string, fn: (c: Character) => Character, now = new Date().toISOString()): Character {
  const next = fn(c);
  const logUid = uid();
  return {
    ...next,
    play: {
      ...next.play,
      log: [{ uid: logUid, at: now, text }, ...c.play.log].slice(0, LOG_MAX),
      undo: [{ logUid, vitals: c.vitals, combat: c.play.combat, ...(c.classState.kouzelnik ? { wiz: c.classState.kouzelnik } : {}), ...(c.classState.klerik ? { cle: c.classState.klerik } : {}), ...(c.companions.length || next.companions.length ? { comp: c.companions } : {}) }, ...c.play.undo].slice(0, UNDO_MAX),
    },
  };
}

export function undoPlay(c: Character): Character {
  const [u, ...rest] = c.play.undo;
  if (!u) return c;
  return {
    ...c, vitals: u.vitals, play: { combat: u.combat, undo: rest, log: c.play.log.filter((l) => l.uid !== u.logUid) },
    // Kouzelník (7c.2): hůl, aktivní kouzla a denní počty se vracejí s ostatním.
    ...(u.wiz && c.classState.kouzelnik ? { classState: { ...c.classState, kouzelnik: u.wiz } } : {}),
    // Klerik (7d): aktivní prosby, posel, modlitby a denní schopnosti se vracejí s ostatním.
    ...(u.cle && c.classState.klerik ? { classState: { ...c.classState, klerik: u.cle } } : {}),
    // Přátelé (7c+): životy, mana, získání a ztráta přítele se vracejí s ostatním.
    ...(u.comp ? { companions: u.comp } : {}),
  };
}

// ---------------------------------------------------------------- životy

export type HpState = 'dead' | 'dying' | 'out' | 'badly' | 'ok';
export const HP_STATE_LABEL: Record<HpState, string> = { dead: 'MRTVÁ', dying: 'UMÍRÁ – ODKLAD', out: 'V BEZVĚDOMÍ', badly: 'TĚŽCE ZRANĚNÁ', ok: 'BOJESCHOPNÁ' };

/** Mez vyřazení 0 → bezvědomí; pod Hranicí smrti → smrt (H17). Těžce zraněná pod třetinou maxima. */
export function hpState(c: Character, d: Derived): HpState {
  const hp = c.vitals.hpCurrent;
  if (hp < d.deathThreshold.value) {
    // Po Vražedné zuřivosti (PPP01): 1 adrenalin = odklad smrti o 1 kolo.
    const B = c.play.combat;
    return B?.war?.deathDelay != null && B.war.deathDelay >= B.round ? 'dying' : 'dead';
  }
  // Urputnost (H08): válečník při 0 a méně životech neupadá do bezvědomí, bojuje dál.
  // Inkvizitorský výcvik (Bojový mnich, PPP06): stejně – jedná až do smrti.
  if (hp <= 0) return hasAbility(c, 'urputnost') || noKnockout(c) ? 'badly' : 'out';
  if (hp < d.hpMax.value / 3) return 'badly';
  return 'ok';
}

const setHp = (c: Character, hp: number): Character => ({ ...c, vitals: { ...c.vitals, hpCurrent: hp } });

/** Léčení nikdy nepřekročí maximum (H17); zranění nemá spodní mez (smrt hlídá hpState). */
function healTo(c: Character, d: Derived, amount: number): number {
  const cur = c.vitals.hpCurrent;
  if (amount <= 0) return cur + amount;
  return cur >= d.hpMax.value ? cur : Math.min(d.hpMax.value, cur + amount);
}

/** Houževnatost (Barbar, H05): +2 životy při každém léčení. */
export const toughness = (c: Character) => (c.basic.raceId === 'barbar' ? 2 : 0);

export function changeHp(c: Character, d: Derived, delta: number, text?: string): Character {
  if (!delta) return c;
  return record(c, text ?? `Životy ${sgn(delta)}`, (x) => setHp(x, healTo(x, d, delta)));
}

/** Léčení z rychlých akcí (odpočinek, spánek, zotavení, první pomoc) – přičte Houževnatost. */
function healAction(c: Character, d: Derived, amount: number, fatigue: number | null, text: string): Character {
  const t = toughness(c);
  const total = amount + (amount > 0 ? t : 0);
  return record(c, `${text}${t && amount > 0 ? ` (vč. Houževnatosti +${t})` : ''}`, (x) => ({
    ...x,
    vitals: { ...x.vitals, hpCurrent: healTo(x, d, total), fatigueLevel: fatigue == null ? x.vitals.fatigueLevel : fatigue },
  }));
}

/** Nosí střední nebo těžkou zbroj – spánek v ní léčí jen polovinu (H17). */
export const heavyArmorWorn = (d: Derived) => !!d.armor?.equipped && /střední|těžk/i.test(d.armor.category);

/** Odpočinek (1× za den): +1 život, únava −1 stupeň. */
export const rest = (c: Character, d: Derived) =>
  tuhy(c)
    ? healAction(c, d, 5, Math.max(0, c.vitals.fatigueLevel - 1), 'Odpočinek: +1 život (+4 Tuhý kořínek), únava −1 stupeň')
    : healAction(c, d, 1, Math.max(0, c.vitals.fatigueLevel - 1), 'Odpočinek: +1 život, únava −1 stupeň');

/** Tuhý kořínek (Berserkr, PPP01): každý spánek i odpočinek léčí o 4 životy víc. */
export const TUHY_KORINEK = 4;
const tuhy = (c: Character) => (hasAbility(c, 'tuhy_korinek') ? TUHY_KORINEK : 0);

/**
 * Spánek 8 h: základní efekt +2 životy a únava −3 stupně (H17). Pravidlo pro spánek ve zbroji
 * se hodně ohýbá podle uvážení PJ (✔ U 24. 9. 2026) – appka nabídne základní hodnoty a hráč je
 * může před potvrzením přepsat.
 */
export const SLEEP_BASE = { hp: 2, fatigue: 3 } as const;

export function sleep(c: Character, d: Derived, hp: number = SLEEP_BASE.hp, fatigue: number = SLEEP_BASE.fatigue): Character {
  const h = Math.max(0, Math.trunc(hp));
  const f = Math.max(0, Math.trunc(fatigue));
  const edited = h !== SLEEP_BASE.hp || f !== SLEEP_BASE.fatigue;
  const tk = tuhy(c);
  return healAction(c, d, h + tk, Math.max(0, c.vitals.fatigueLevel - f), `Spánek: +${h} ${h === 1 ? 'život' : h >= 2 && h <= 4 ? 'životy' : 'životů'}${tk ? ` (+${tk} Tuhý kořínek)` : ''}, únava −${f} ${f === 1 ? 'stupeň' : f >= 2 && f <= 4 ? 'stupně' : 'stupňů'}${edited ? ' (upraveno podle PJ)' : ''}`);
}

/** Zotavení (celý den, jen Svěží): +⌈max/5⌉ životů. */
export function recover(c: Character, d: Derived): Character {
  if (c.vitals.fatigueLevel > 0) return c;
  const n = Math.ceil(d.hpMax.value / 5);
  return healAction(c, d, n, 0, `Zotavení: +${n} životů`);
}

/** Léčení z první pomoci, kouzla, lektvaru – hráč zadá počet. */
export const healBy = (c: Character, d: Derived, n: number, source: string) => healAction(c, d, n, null, `${source}: +${n} životů`);

// ---------------------------------------------------------------- únava a stavy

export const setFatigue = (c: Character, level: number) =>
  record(c, `Únava: ${FATIGUE[level]?.name ?? level}`, (x) => ({ ...x, vitals: { ...x.vitals, fatigueLevel: level } }));

/** Stavy, které bez zásahu trvají 3 kola (H16). */
export const COND_ROUNDS: Record<string, number> = { omameni: 3, oslabeni: 3, oslepeni: 3, vystraseni: 3, zapaleni: 3, zpomaleni: 3 };
/** Kritická zranění – bez První pomoci (obtížnost obvykle ~14), lektvaru či kouzla se nezahojí (H17). */
export const CRITICAL_WOUNDS = new Set(['krvaceni', 'zmrz_noha', 'zmrz_ruka']);

export const condName = (id: string) => CONDITIONS.find((x) => x.id === id)?.name ?? id;
export const hasCond = (c: Character, id: string) => c.vitals.conditions.some((x) => x.id === id);
export const bleedStacks = (c: Character) => c.vitals.conditions.find((x) => x.id === 'krvaceni')?.stacks ?? 0;

export function toggleCondition(c: Character, id: string): Character {
  const on = hasCond(c, id);
  return record(c, `${on ? 'Konec' : 'Stav'}: ${condName(id)}`, (x) => ({
    ...x,
    vitals: {
      ...x.vitals,
      conditions: on
        ? x.vitals.conditions.filter((k) => k.id !== id)
        : [...x.vitals.conditions, { id, stacks: 1, note: '', rounds: COND_ROUNDS[id] ?? null } as Condition],
    },
  }));
}

/** Krvácení se sčítá (každé k6 za kolo); Zapálení se jen prodlouží, max. o 3 kola (H16). */
export function setBleed(c: Character, stacks: number): Character {
  const n = Math.max(0, Math.trunc(stacks));
  return record(c, n ? `Krvácení ×${n}` : 'Konec: Krvácení', (x) => {
    const rest = x.vitals.conditions.filter((k) => k.id !== 'krvaceni');
    return { ...x, vitals: { ...x.vitals, conditions: n ? [...rest, { id: 'krvaceni', stacks: n, note: '', rounds: null }] : rest } };
  });
}

// ---------------------------------------------------------------- postihy do hodů

export interface CombatMods { atk: number; def: number; zo: number; init: number; chk: number; src: [string, string][] }

/** Postihy ze stavů, únavy a přesily, které se připočtou rovnou do hodů (H16, prototyp v9). */
export function combatMods(c: Character): CombatMods {
  const m: CombatMods = { atk: 0, def: 0, zo: 0, init: 0, chk: 0, src: [] };
  const NM = { atk: 'útok', def: 'obrana', zo: 'ZO', init: 'iniciativa', chk: 'ověření' } as const;
  const add = (n: string, o: Partial<Record<keyof typeof NM, number>>) => {
    m.src.push([n, Object.entries(o).map(([k, v]) => `${NM[k as keyof typeof NM]} ${sgn(v!)}`).join(', ')]);
    for (const [k, v] of Object.entries(o)) m[k as keyof typeof NM] += v!;
  };
  const f = FATIGUE[c.vitals.fatigueLevel]?.penalty ?? 0;
  if (f) add(`Únava: ${FATIGUE[c.vitals.fatigueLevel].name}`, { atk: f, def: f, init: f, chk: f });
  if (hasCond(c, 'omameni')) add('Omámení', { atk: -5, def: -5, init: -5 });
  if (hasCond(c, 'oslabeni')) add('Oslabení', { atk: -5, def: -5, zo: -5 });
  if (hasCond(c, 'oslepeni')) add('Oslepení', { atk: -5, def: -5, chk: -5 });
  if (hasCond(c, 'zmrz_ruka')) add('Zmrzačená ruka', { atk: -5, def: -5 });
  const foes = c.play.combat?.foes ?? 1;
  // Boj s přesilou (Šermíř, PPP01): žádné postihy za více nepřátel.
  if (foes > 1 && !hasAbility(c, 'boj_s_presilou')) add(`Přesila – ${foes} útočníci`, { def: -Math.min(3, foes) });
  // Boj ve smečce (Pán zvířat, PPP02): +1 ÚČ i OČ za každého člena smečky v boji, max. +5.
  const pb = packBonus(c);
  if (pb) add(`Boj ve smečce – ${pb} ${pb === 1 ? 'zvíře' : 'zvířata'}`, { atk: pb, def: pb });
  // Zloděj (7e): Bojová kreativita.
  for (const [n, o] of thiefCombatMods(c)) add(n, o);
  const st = activeStrategy(c);
  if (st) add(st.kind === 'utok' ? 'Útočná strategie' : 'Obranná strategie', st.kind === 'utok' ? { atk: st.bonus, init: st.bonus } : { def: st.bonus });
  return m;
}

/** OČ proti střelbě: jen ZO + kvalita štítu, obrana zbraně se nepočítá (H16). */
export const defenseVsRanged = (d: Derived) => d.defenseBase.value + (d.shield?.equipped ? d.shield.quality : 0) - (d.shieldOverloaded ? 5 : 0);

// ---------------------------------------------------------------- boj: kolo a tah

export const newCombat = (surprised = false): CombatState => ({
  round: 1, init: null, reroll: false, foes: 1, surprised, phase: 'wait', k: 0,
  attack: false, cast: false, defense: false, focusTrick: false, shout: false, turnLog: [], channel: null,
});

const withCombat = (c: Character, fn: (b: CombatState) => CombatState): Character =>
  c.play.combat ? { ...c, play: { ...c.play, combat: fn(c.play.combat) } } : c;

export function startCombat(c: Character, surprised: boolean): Character {
  // Nával Adrenalinu (PPP01): adrenalin přibývá už na začátku kola – tedy i hned v 1. kole.
  const early = adrenalinAtStart(c);
  return record(c, `${surprised ? 'Začátek boje (překvapen)' : 'Začátek boje'}${early ? ' · Nával adrenalinu +1' : ''}`, (x) => ({
    ...x,
    play: { ...x.play, combat: newCombat(surprised) },
    vitals: early ? { ...x.vitals, manaCurrent: x.vitals.manaCurrent + 1 } : x.vitals,
  }));
}

/** Úprava stavu válečníka v boji (7b.2). */
const withWar = (c: Character, fn: (w: WarriorCombat, b: CombatState) => WarriorCombat): Character =>
  withCombat(c, (b) => ({ ...b, war: fn(b.war ?? {}, b) }));

export function endCombat(c: Character): Character {
  // Klerik (7d): prosby s trváním v kolech (aury, Štít víry…) a posel na 10 kol koncem boje skončí.
  const K = c.classState.klerik;
  return record(c, 'Konec boje', (x) => ({
    ...x, play: { ...x.play, combat: null },
    ...(K ? { classState: { ...x.classState, klerik: { ...K, active: K.active.filter((a) => a.until == null), messenger: K.messenger?.until != null ? null : K.messenger } } } : {}),
  }));
}

export function rollInitiative(c: Character, d: Derived, die = rollDie): { character: Character; roll: number; total: number } {
  const r = die(6);
  const total = r + d.initiativeBonus.value + combatMods(c).init;
  return { character: record(c, `Iniciativa: k6 ${r} ${sgn(total - r)} = ${total}`, (x) => withCombat(x, (b) => ({ ...b, init: total }))), roll: r, total };
}

export const setCombat = (c: Character, patch: Partial<CombatState>) => withCombat(c, (b) => ({ ...b, ...patch }));

export const myTurn = (c: Character) => withCombat(c, (b) => ({ ...b, phase: 'turn', attack: false, cast: false, turnLog: [] }));

/** Konec tahu: válečník +1 adrenalin, Otřesení trvá jen jeden tah (H16). */
export function endTurn(c: Character): { character: Character; notes: string[] } {
  const notes: string[] = [];
  const stunned = hasCond(c, 'otreseni');
  // Adrenalin +1 na konci tahu (H08); Vražedná zuřivost +2; s Návalem adrenalinu přibývá na začátku kola místo toho.
  const gain = isWarrior(c) && !adrenalinAtStart(c) ? adrenalinGain(c, c.play.combat?.round ?? 1) : 0;
  const war = gain > 0;
  if (war) notes.push(`Adrenalin +${gain}`);
  if (stunned) notes.push('Otřesení odeznělo');
  const character = record(c, `Konec tahu${notes.length ? ` (${notes.join(', ')})` : ''}`, (x) => ({
    ...withCombat(x, (b) => ({ ...b, phase: 'done' })),
    vitals: {
      ...x.vitals,
      manaCurrent: x.vitals.manaCurrent + gain,
      conditions: stunned ? x.vitals.conditions.filter((k) => k.id !== 'otreseni') : x.vitals.conditions,
    },
  }));
  return { character, notes };
}

/** Nové kolo: obnoví akce a obranu, odečte trvání stavů na 3 kola. */
export function newRound(c: Character): { character: Character; ended: string[] } {
  const ended: string[] = [];
  const conditions = c.vitals.conditions.flatMap((k) => {
    if (k.rounds == null) return [k];
    const left = k.rounds - 1;
    if (left <= 0) { ended.push(condName(k.id)); return []; }
    return [{ ...k, rounds: left }];
  });
  const B = c.play.combat;
  const next = (B?.round ?? 0) + 1;
  // Nával Adrenalinu: adrenalin na začátku nového kola (ve Vražedné zuřivosti +2).
  const gain = B && adrenalinAtStart(c) ? adrenalinGain(c, next) : 0;
  // Vražedná zuřivost: na konci každého kola, kdy účinkovala, past Vůle (CHAR) vs. 2 (+1 každé další kolo).
  const furyCheck = !!B && furyOn(c, B.round);
  // Kouzelník: aktivní kouzla s trváním v kolech (Magický štít, Rychlost) vyprší.
  const W = c.classState.kouzelnik;
  const expired = W && B ? W.active.filter((a) => a.until != null && a.until < next) : [];
  if (expired.length) ended.push(...expired.map((a) => a.name));
  // Klerik (7d): aktivní prosby, posel a Avatar s trváním v kolech vyprší; Božská pomoc vezme dodatečné životy.
  const K = c.classState.klerik;
  const kExp = K && B ? K.active.filter((a) => a.until != null && a.until < next) : [];
  const kMsg = !!(K?.messenger && B && K.messenger.until != null && K.messenger.until < next);
  const kAvatar = !!(K?.avatar?.active && B && K.avatar.until != null && K.avatar.until < next);
  const kTemp = kExp.reduce((s, a) => s + (a.tempHp ?? 0), 0);
  if (kExp.length) ended.push(...kExp.map((a) => a.name));
  if (kMsg) ended.push(K!.messenger!.name);
  if (kAvatar) ended.push('Avatar (1 život, vyčerpání)');
  const notes = [...(ended.length ? [`skončilo: ${ended.join(', ')}`] : []), ...(gain ? [`Nával adrenalinu +${gain}`] : []), ...(furyCheck ? ['zuřivost: hoď past Vůle'] : [])];
  const character = record(c, `Nové kolo${notes.length ? ` – ${notes.join(' · ')}` : ''}`, (x) => ({
    ...withCombat(x, (b) => ({
      ...b, round: b.round + 1, k: 0, defense: false, focusTrick: false, shout: false, attack: false, cast: false, phase: 'wait', turnLog: [], init: b.reroll ? null : b.init,
      atkUsed: 0, defUsed: 0, shieldAtk: false,
      war: b.war ? { ...b.war, order: null, fury: b.war.fury && furyCheck ? { ...b.war.fury, check: true } : b.war.fury } : b.war,
    })),
    vitals: { ...x.vitals, conditions, manaCurrent: x.vitals.manaCurrent + gain, hpCurrent: kAvatar ? 1 : x.vitals.hpCurrent - kTemp },
    ...(expired.length && x.classState.kouzelnik ? { classState: { ...x.classState, kouzelnik: { ...x.classState.kouzelnik, active: x.classState.kouzelnik.active.filter((a) => !expired.includes(a)) } } } : {}),
    ...((kExp.length || kMsg || kAvatar) && x.classState.klerik ? { classState: { ...x.classState, klerik: {
      ...x.classState.klerik, active: x.classState.klerik.active.filter((a) => !kExp.includes(a)), messenger: kMsg ? null : x.classState.klerik.messenger,
      avatar: kAvatar ? { active: false, until: null, drained: true } : x.classState.klerik.avatar,
    } } } : {}),
  }));
  return { character, ended };
}

/**
 * Efekty na začátku tahu (H16): Krvácení k6 za každé, Zapálení k6. V bezvědomí nejvýš 2 životy
 * za kolo (H17). Otrava je podle jedu – odečítá se ručně.
 */
export function turnEffects(c: Character, die = rollDie): { character: Character; lost: number; faces: number[] } {
  const n = bleedStacks(c) + (hasCond(c, 'zapaleni') ? 1 : 0);
  const faces = Array.from({ length: n }, () => die(6));
  const raw = faces.reduce((a, b) => a + b, 0);
  const lost = c.vitals.hpCurrent <= 0 ? Math.min(2, raw) : raw;
  const note = lost < raw ? ` – v bezvědomí nejvýš 2 za kolo` : '';
  return { character: record(c, `Efekty na začátku tahu: −${lost} (${faces.join('+')})${note}`, (x) => setHp(x, x.vitals.hpCurrent - lost)), lost, faces };
}

// ---------------------------------------------------------------- akce v tahu

export interface ActionDef { k: string; n: string; g: 'Bojové' | 'Pohybové' | 'Ostatní'; len: ActionLength[]; once?: 'attack' | 'cast'; h: string; block?: string | null }

export interface TurnCtx {
  B: CombatState | null;
  mob: number;
  stunned: boolean;
  surprised: boolean;
  noSprint: boolean;
  free: number;
  out: boolean;
  frac: (x: number) => number;
  rangedName: string | null;
  reloadLen: ActionLength | null;
  drawLen: ActionLength;
}

export const LEN_NAME: Record<ActionLength, string> = { O: 'okamžitá', K: 'krátká', D: 'dlouhá' };

export function turnCtx(c: Character, d: Derived): TurnCtx {
  const B = c.play.combat;
  const has = (id: string) => hasCond(c, id);
  const mob = d.mobility.value;
  const armed = d.weapons.filter((w) => w.equipped);
  const ranged = armed.find((w) => w.kind === 'ranged') ?? null;
  const cat = (w: typeof armed[number]) => w.category;
  const reloadLen = (): ActionLength | null => {
    if (!ranged) return null;
    const n = ranged.name.toLowerCase();
    if (/luk|prak|lehká kuše/.test(n) || /lehké střelné/i.test(cat(ranged))) return 'O';
    if (/kuše/.test(n) && /těžk/i.test(cat(ranged))) return 'D';
    if (/kuše/.test(n)) return 'K';
    return 'O';
  };
  return {
    B, mob,
    stunned: has('otreseni') || has('paralyza'),
    surprised: !!B?.surprised && B.round === 1,
    noSprint: has('zmrz_noha') || has('zpomaleni') || c.vitals.fatigueLevel >= 2,
    // Rychlost (kouzelník, H11): krátká akce navíc.
    free: B ? shortCap(c) - B.k : 0,
    out: c.vitals.hpCurrent <= 0 && !hasAbility(c, 'urputnost') && !noKnockout(c),
    frac: (x) => Math.ceil(mob * x),
    rangedName: ranged?.name ?? null,
    reloadLen: reloadLen(),
    drawLen: armed.length && armed.every((w) => /krátké/i.test(cat(w))) ? 'O' : 'K',
  };
}

const MAGIC_CLASSES = ['kouzelnik', 'hranicar', 'klerik'];

export function turnActions(c: Character, d: Derived, x: TurnCtx): ActionDef[] {
  const M = combatMods(c);
  const magic = MAGIC_CLASSES.includes(c.basic.classId);
  const blockSprint = x.noSprint ? (hasCond(c, 'zmrz_noha') ? 'zmrzačená noha' : hasCond(c, 'zpomaleni') ? 'zpomalení' : 'únava') : null;
  return [
    { k: 'utok', n: 'Útok', g: 'Bojové', len: ['K'], once: 'attack', h: `ÚČ ${d.attackNumber.value + M.atk} + k6 · 1× za tah` },
    ...(magic ? [{ k: 'kouzleni', n: c.basic.classId === 'klerik' ? 'Vzývání prosby' : 'Kouzlení', g: 'Bojové', len: ['O', 'K', 'D'], once: 'cast', h: 'délka = vyvolání kouzla · 1× za tah' } as ActionDef] : []),
    ...(x.rangedName && x.reloadLen ? [{ k: 'nabiti', n: `Nabití – ${x.rangedName.toLowerCase()}`, g: 'Bojové', len: [x.reloadLen], h: x.reloadLen === 'O' ? 'luk, prak, lehká kuše – okamžitě' : 'podle typu kuše' } as ActionDef] : []),
    { k: 'postup', n: 'Postup', g: 'Pohybové', len: ['K'], h: `${x.frac(1 / 4)} sáhů (¼ pohyblivosti)` },
    { k: 'sprint', n: 'Sprint', g: 'Pohybové', len: ['D'], h: `${x.mob} sáhů`, block: blockSprint },
    { k: 'plizeni', n: 'Plížení / lezení', g: 'Pohybové', len: ['D'], h: `${x.frac(1 / 10)} sáhů` },
    { k: 'vztyk', n: 'Vztyk z leže', g: 'Pohybové', len: ['K', 'D'], h: 'K: lehl sis sám · D: povalený' },
    { k: 'tasit', n: 'Tasení / přezbrojení', g: 'Ostatní', len: ['O', 'K', 'D'], h: 'O lehká krátká · K jiná · D výměna zbraně' },
    { k: 'dovednost', n: 'Použití dovednosti', g: 'Ostatní', len: ['K', 'D'], h: 'K jednoduché (vykopnout dveře) · D složité' },
    { k: 'predmet', n: 'Použití předmětu', g: 'Ostatní', len: ['K', 'D'], h: 'lektvar K · zapálení bomby D' },
    { k: 'soustredeni', n: 'Soustředění', g: 'Ostatní', len: ['K', 'D'], h: 'udržení kouzla / prosby' },
    { k: 'vyckavani', n: 'Vyčkávání', g: 'Ostatní', len: ['K'], h: 'dokončíš tah po jiném účastníkovi' },
  ];
}

/** Proč akci teď nejde použít (prázdný řetězec = jde). */
export function whyNot(c: Character, a: ActionDef, len: ActionLength, x: TurnCtx): string {
  const B = x.B;
  if (!B) return 'boj neběží';
  if (B.phase !== 'turn') return 'není tvůj tah';
  if (x.out) return 'bezvědomí – žádná akce';
  if (x.surprised) return 'překvapen – 1. kolo bez akcí';
  if (x.stunned) return hasCond(c, 'paralyza') ? 'paralýza' : 'otřesení – tento tah nic';
  if (hasCond(c, 'vystraseni') && a.k !== 'sprint') return 'vystrašení – jen útěk';
  if (a.block) return a.block;
  if (a.once && B[a.once]) return 'už v tomto tahu';
  if (a.k === 'vztyk' && len === 'K' && hasCond(c, 'povaleni')) return 'povalený – vztyk je dlouhá akce';
  if (len === 'K' && x.free < 1) return 'nemáš krátkou akci';
  if (len === 'D' && x.free < 2) return B.defense ? 'krátkou sis vzal na obranu' : 'už jsi použil krátkou';
  return '';
}

const cost = (len: ActionLength) => (len === 'K' ? 1 : len === 'D' ? 2 : 0);

export function doAction(c: Character, d: Derived, key: string, len: ActionLength): Character {
  const x = turnCtx(c, d);
  const a = turnActions(c, d, x).find((q) => q.k === key);
  if (!a || whyNot(c, a, len, x)) return c;
  const standUp = a.k === 'vztyk' && hasCond(c, 'povaleni');
  return record(c, `${a.n} (${LEN_NAME[len]})${standUp ? ' – povalení skončilo' : ''}`, (y) => ({
    ...withCombat(y, (b) => ({
      ...b, k: b.k + cost(len), ...(a.once ? { [a.once]: true } : {}),
      ...(a.k === 'utok' ? { atkUsed: usedAtk(b) + 1 } : {}),
      turnLog: [...b.turnLog, { n: a.n, len, once: a.once ?? null, ...(a.k === 'utok' ? { atk: 1 } : {}) }],
    })),
    vitals: standUp ? { ...y.vitals, conditions: y.vitals.conditions.filter((k) => k.id !== 'povaleni') } : y.vitals,
  }));
}

export function undoAction(c: Character): Character {
  const B = c.play.combat;
  const last = B?.turnLog.at(-1);
  if (!B || !last) return c;
  return record(c, `Vráceno: ${last.n}`, (y) => withCombat(y, (b) => ({
    ...b, k: Math.max(0, b.k - cost(last.len)), ...(last.once ? { [last.once]: false } : {}), turnLog: b.turnLog.slice(0, -1),
    ...(last.atk ? { atkUsed: Math.max(0, usedAtk(b) - last.atk) } : {}),
    ...(last.cd === 'boj_stitem' ? { shieldAtk: false } : {}),
    ...(last.cd ? { war: { ...b.war, cd: Object.fromEntries(Object.entries({ ...b.war?.cd, [last.cd]: last.cdPrev ?? null }).filter(([, v]) => v != null)) as Record<string, number> } } : {}),
  })));
}

// ---------------------------------------------------------------- útoky a obrany v kole (7b.2)

/** Kolik útoků / obran v kole proběhlo (starší uložený boj má jen příznaky attack/defense). */
export const usedAtk = (b: CombatState) => b.atkUsed ?? (b.attack ? 1 : 0);
export const usedDef = (b: CombatState) => b.defUsed ?? (b.defense ? 1 : 0);

/** Zbraň v ruce pro počítání útoků (skupina, Cesta, druh). */
export function activeWeapon(d: Derived): ActiveWeapon {
  const w = d.weapons.find((x) => x.uid === d.activeWeaponUid);
  return w ? { kind: w.kind, groups: w.groups, path: w.path, none: false, name: w.name, category: w.category } : { kind: 'melee', groups: ['beze_zbrane'], path: null, none: true };
}

export interface RoundInfo { round: number; atk: RoundCount; def: RoundCount; bash: boolean; atkUsed: number; defUsed: number }

/** Útoky a aktivní obrany, které má postava v aktuálním kole (1 + válečnické schopnosti). */
export function roundInfo(c: Character, d: Derived): RoundInfo {
  const B = c.play.combat;
  const round = B?.round ?? 1;
  const w = activeWeapon(d);
  const shieldOn = !!d.shield?.equipped;
  const rg = isRanger(c) ? rangerRound(c, w, round) : null;
  // Rychlost (kouzelník na sebe, H11): útok a obrana navíc.
  const zl = isThief(c) ? thiefRound(c, w, round, B) : null;
  const base = zl ?? { atk: rg ? rg.atk : attacksPerRound(c, w, round, B?.war?.cd), def: rg ? rg.def : defensesPerRound(c, w, round, shieldOn, B?.foes ?? 1, B?.war?.cd) };
  const hr0 = isWizard(c) ? hasteRound(c, base) : base;
  // Fanatismus (Bojový mnich, PPP06): 3 útoky za 2 kola, od 12. úrovně 2 každé kolo.
  const hr = isCleric(c) ? clericRound(c, round, hr0) : hr0;
  return {
    round,
    atk: hr.atk,
    def: hr.def,
    bash: shieldBashRound(c, round, shieldOn, !w.none, B?.war?.cd) && !B?.shieldAtk,
    atkUsed: B ? usedAtk(B) : 0,
    defUsed: B ? usedDef(B) : 0,
  };
}

/** Aktivní obrana: první stojí krátkou akci (1× za kolo, i mimo vlastní tah – H16); další z Vícenásobného útoku / Zakrytí nic. */
export function canDefend(c: Character, d: Derived): string {
  const x = turnCtx(c, d);
  if (!x.B) return 'boj neběží';
  if (x.out) return 'bezvědomí';
  const r = roundInfo(c, d);
  if (!r.def.unlimited && r.defUsed >= r.def.n) return r.def.n > 1 ? `všech ${r.def.n} obran v kole použito` : 'obrana už v tomto kole použita';
  // Bojové sesílání (Bojový mág): i při sesílání kouzla se dokáže aktivně bránit.
  const castDef = isWizard(c) && hasAbility(c, 'bojove_sesilani') && x.B.cast;
  if (!x.B.defense && x.free < 1 && !castDef) return 'nemáš volnou krátkou akci';
  if (x.stunned) return 'nemůžeš jednat';
  if (x.surprised) return 'překvapen – jen ZO';
  return '';
}

const defenseStep = (b: CombatState, cdId?: string): CombatState => ({
  ...b, defense: true, k: b.defense ? b.k : b.k + 1, defUsed: usedDef(b) + 1, war: cdId ? useCd(b, cdId).war : b.war,
});

/** Obrana navíc s cooldownem (Vícenásobný útok pod 6. úrovní) se spotřebuje až po obranách bez omezení. */
function nextDefCd(r: RoundInfo): string | undefined {
  if (r.def.unlimited) return undefined;
  const base = r.def.n - r.def.cdSources.length;
  return r.defUsed + 1 > base ? r.def.cdSources[r.defUsed - base] : undefined;
}

export function takeDefense(c: Character, d: Derived, label = 'Aktivní obrana'): Character {
  if (canDefend(c, d)) return c;
  const B = c.play.combat!;
  const r = roundInfo(c, d);
  const nth = r.def.n > 1 || r.def.unlimited ? ` ${r.defUsed + 1}${r.def.unlimited ? '' : `/${r.def.n}`}` : '';
  const cdId = nextDefCd(r);
  return record(c, `${label}${nth} (${B.defense ? 'bez další akce' : 'krátká akce'})`, (y) => withCombat(y, (b) => defenseStep(b, cdId)));
}

/** Další útok v kole: první zabere krátkou akci Útok, další (Vícenásobný útok, Bijec, Rychlý hrot…) jsou součástí téže akce. */
export function attackWhy(c: Character, d: Derived): string {
  const x = turnCtx(c, d);
  const B = x.B;
  if (!B) return 'boj neběží';
  if (B.phase !== 'turn') return 'jen ve tvém tahu';
  if (x.out) return 'bezvědomí – žádná akce';
  if (x.surprised) return 'překvapen – 1. kolo bez akcí';
  if (x.stunned) return 'nemůžeš jednat';
  if (hasCond(c, 'vystraseni')) return 'vystrašení – jen útěk';
  if (!B.attack) return x.free < 1 ? 'nemáš krátkou akci' : '';
  const r = roundInfo(c, d);
  return r.atkUsed >= r.atk.n ? (r.atk.n > 1 ? `všech ${r.atk.n} útoků použito` : 'útok už proběhl') : '';
}

const CD_NAME: Record<string, string> = { rychla_cepel: 'Rychlá čepel', prehmatnuti: 'Přehmátnutí', vicenasobny_utok: 'Vícenásobný útok', boj_stitem: 'Boj štítem' };

/** Schopnost s cooldownem, kterou spotřebuje další útok (ty se berou až po útocích bez omezení). */
function nextCd(r: RoundInfo): string | undefined {
  const base = r.atk.n - r.atk.cdSources.length;
  return r.atkUsed + 1 > base ? r.atk.cdSources[r.atkUsed - base] : undefined;
}

/** Zapíše použití schopnosti s cooldownem do stavu boje; vrací údaje pro „Vrátit akci“. */
function useCd(b: CombatState, id: string | undefined): { war: CombatState['war']; extra: { cd?: string; cdPrev?: number | null } } {
  if (!id) return { war: b.war, extra: {} };
  const prev = b.war?.cd?.[id] ?? null;
  return { war: { ...b.war, cd: { ...b.war?.cd, [id]: b.round } }, extra: { cd: id, cdPrev: prev } };
}

const attackStep = (b: CombatState, n: string, cdId?: string): CombatState => {
  const u = useCd(b, cdId);
  return b.attack
    ? { ...b, war: u.war, atkUsed: usedAtk(b) + 1, turnLog: [...b.turnLog, { n, len: 'O', once: null, atk: 1, ...u.extra }] }
    : { ...b, war: u.war, attack: true, k: b.k + 1, atkUsed: usedAtk(b) + 1, turnLog: [...b.turnLog, { n, len: 'K', once: 'attack', atk: 1, ...u.extra }] };
};

export function attack(c: Character, d: Derived): Character {
  if (attackWhy(c, d)) return c;
  const r = roundInfo(c, d);
  const cdId = nextCd(r);
  const label = `Útok${r.atk.n > 1 ? ` ${r.atkUsed + 1}/${r.atk.n}` : ''}${cdId ? ` (${CD_NAME[cdId] ?? cdId})` : ''}`;
  return record(c, label, (y) => withCombat(y, (b) => attackStep(b, label, cdId)));
}

/** Dodatečný útok štítem každé druhé kolo (Boj štítem): Útočnost = kvalita štítu, Zranění 0. */
export const shieldBashAttack = (d: Derived) => d.mods.sil + (d.shield?.quality ?? 0) - (d.shieldOverloaded ? 5 : 0);
export function shieldBash(c: Character, d: Derived): Character {
  const B = c.play.combat;
  if (!B || B.phase !== 'turn' || !roundInfo(c, d).bash || turnCtx(c, d).out) return c;
  return record(c, 'Boj štítem: dodatečný útok štítem', (y) => withCombat(y, (b) => {
    const u = useCd(b, 'boj_stitem');
    return { ...b, war: u.war, shieldAtk: true, turnLog: [...b.turnLog, { n: 'Útok štítem (dodatečný)', len: 'O', once: null, ...u.extra }] };
  }));
}

// ---------------------------------------------------------------- kouzla, prosby, triky (výřez – plná data Fáze 7)

export interface SpellDef {
  n: string; l: string; c: string; o: number; x: string;
  /** Kouzelník (7c.2): konečná cena z ceny zadané hráčem (Posílená ochrana, Posilování, Hromadné sesílání). */
  adj?: (price: number) => number;
  /** Bez ověření (Kouzelnický trik, přivolání hole). */
  free?: boolean;
  /** Klerik (7d): hráč zadává jednotky (slova, údery, kola, X…) místo ceny; `adj` z nich spočte Přízeň. */
  units?: { label: string; min: number };
  /** Obtížnost podle jednotek (Léčivé slovo +2 za další slovo, Oběti −10); null = určí PJ. */
  dcAdj?: (units: number) => number | null;
}
/** Bojový trik válečníka – plná data z H08 a PPP01 (src/data/valecnik.json, Fáze 7b). */
export type TrickDef = WarriorTrick;

export const TRICK_TYPE = TRICK_KIND_LABEL;

export const lenText = (l: string) =>
  l === 'O' ? 'okamžitá' : l === 'K' ? 'krátká' : l === 'D' ? 'dlouhá' : l === 'M' ? 'mimo boj' : /^\dD$/.test(l) ? `${l[0]} dlouhé akce` : `${parseInt(l, 10)} kol`;
/** Počet dlouhých akcí, přes které se kouzlo sesílá. */
export const lenRounds = (l: string) => (/^\dD$/.test(l) ? +l[0] : /k$/.test(l) ? parseInt(l, 10) : 1);
const spellLen = (s: SpellDef): ActionLength | 'M' => (s.l === 'M' ? 'M' : lenRounds(s.l) > 1 ? 'D' : (s.l as ActionLength));

/** Výchozí cena kouzla; `variable` = hráč cenu upraví (za X, za kolo, úroveň cíle…). */
export function spellCost(s: SpellDef, level: number): { v: number; variable: boolean } {
  if (s.units) return { v: Math.max(1, s.units.min), variable: true };
  const t = s.c;
  let m: RegExpMatchArray | null;
  if (/^X$/.test(t)) return { v: 1, variable: true };
  if ((m = t.match(/^(\d+)×\s*úroveň klerika/))) return { v: +m[1] * level, variable: false };
  if (/^úroveň klerika/.test(t)) return { v: level, variable: false };
  if (/úroveň cíle/.test(t)) return { v: parseInt(t, 10) || 1, variable: true };
  return { v: (parseInt(t, 10) || 0) + (/\+ X/.test(t) ? 1 : 0), variable: /za |\+ X|\(/.test(t) };
}

export function knownSpells(c: Character): SpellDef[] {
  const cls = c.basic.classId;
  // Hraničář (7c.1): plná data H09 + PPP02, kouzla dostává automaticky ze směrů, schopností a specializace.
  if (cls === 'hranicar') return knownRangerSpells(c).filter((s) => s.typ === 'kouzlo').map(toSpellDef);
  // Kouzelník (7c.2): plná data H11 + PPP04, délka a obtížnost podle voleb sesílání (Rychlé, Precizní…).
  if (cls === 'kouzelnik') return wizardSpellDefs(c);
  // Klerik (7d): plná data H13 + PPP06, prosby automaticky ze základu, 2. úrovně, nauk a schopností.
  if (cls === 'klerik') return knownPrayers(c).filter((p) => p.typ === 'prosba').map((p) => prayerDef(c, p));
  return [];
}


/** Prosba klerika jako kouzlo pro boj: délka, cena z jednotek, obtížnost, poznámka (reakce, ověření, efekt). */
export function prayerDef(c: Character, p: import('./klerik').Prayer): SpellDef {
  const u = unitsOf(p);
  const reaction = p.id === 'svata_zbroj' || p.id === 'vraceni_uderu';
  const x = [reaction ? 'reakce' : '', p.fx?.note ?? '', p.fx?.heal ? `léčí ${p.fx.heal}${p.fx.perUnit ? ' za slovo' : ''}` : '', p.fx?.damage ? `zranění ${p.fx.damage}${p.fx.perUnit ? ' za každé' : ''}` : '',
    p.overeni ? `ověření: ${p.overeni}` : '', p.fx?.aura ? 'aura' : ''].filter(Boolean).join(' · ');
  return {
    n: p.nazev, l: prayerLen(p), c: p.cena.text, o: p.obtiznost.base ?? 0, x,
    ...(u ? { units: u } : {}),
    adj: (n: number) => prayerPrice(c, p, n).total,
    dcAdj: (n: number) => prayerDc(c, p, n).dc,
  };
}

export const knownTricks = (c: Character): TrickDef[] => knownWarriorTricks(c);

/** Dovednost pro ověření kouzla / prosby. */
export const CAST_SKILL: Partial<Record<string, string>> = { kouzelnik: 'sesilani_kouzel', hranicar: 'pouto_s_prirodou', klerik: 'prosby' };

export function castBonus(c: Character, d: Derived): { bonus: number; skill: string } {
  const id = CAST_SKILL[c.basic.classId];
  const sk = d.skills.find((s) => s.id === id);
  const name = getSkill(id ?? '')?.name ?? 'Sesílání';
  return { bonus: (sk ? sk.total : 0) + combatMods(c).chk, skill: sk ? name : `${name} (nemáš – jen oprava 0)` };
}

/** Ověření konkrétního kouzla: dovednost + u kouzelníka hůl, Magistr, postihy bez řeči / gest, zbroj, róba… (H11, PPP04). */
export function spellCheck(c: Character, d: Derived, s: SpellDef): { bonus: number; parts: string[] } {
  const base = castBonus(c, d);
  if (isCleric(c)) { const k = prayerCheckBonus(c); return { bonus: base.bonus + k.bonus, parts: k.parts }; }
  const sp = isWizard(c) ? spellByName(s.n) : undefined;
  if (!sp) {
    // Hraničář: róba usnadňuje i přírodní kouzla (H15).
    const robe = c.basic.classId === 'hranicar' ? robeBonus(c) : { value: 0, name: '' };
    return robe.value ? { bonus: base.bonus + robe.value, parts: [`${robe.name} +${robe.value}`] } : { bonus: base.bonus, parts: [] };
  }
  const p = castProfile(c, d, sp);
  return { bonus: base.bonus + p.bonus, parts: p.bonusParts };
}

/** Kolik many zaplatí hůl a kolik kouzelník (Platit z hole – PPP04). */
export function staffSplit(c: Character, price: number): { staff: number; own: number } {
  const st = isWizard(c) ? staffOf(c) : null;
  const staff = st && st.inHand && wiz(c).mods.fromStaff ? Math.min(st.mana, price) : 0;
  return { staff, own: price - staff };
}

/** Kouzlo zapsané mezi aktivní (Magický štít, Magická zbroj, Rychlost na sebe). */
export function withActiveSpell(c: Character, name: string, entered: number): Character {
  const sp = isWizard(c) && wiz(c).mods.self ? spellByName(name) : undefined;
  const a = sp ? activeFromCast(sp, entered) : null;
  if (!sp || !a) return c;
  const round = c.play.combat?.round ?? 0;
  const W = wiz(c);
  const entry = { uid: uid(), id: sp.id, name: sp.nazev, ...(a.zo ? { zo: a.zo } : {}), ...(a.haste ? { haste: true } : {}), until: a.rounds == null ? null : round + a.rounds };
  return { ...c, classState: { ...c.classState, kouzelnik: { ...W, active: [...W.active.filter((x) => x.id !== sp.id), entry] } } };
}

export function spellWhy(c: Character, d: Derived, s: SpellDef, price: number): string {
  const x = turnCtx(c, d);
  const B = x.B;
  if (!B) return 'boj neběží';
  const len = spellLen(s);
  const reaction = /reakce/.test(s.x);
  if (len === 'M') return 'mimo boj';
  if (x.out) return 'bezvědomí';
  if (B.phase !== 'turn' && !reaction) return 'není tvůj tah';
  if (x.stunned || x.surprised) return 'nemůžeš jednat';
  if (B.cast && !reaction) return 'v tomto tahu už jsi kouzlil';
  if (B.channel) return 'už sesíláš jiné kouzlo';
  const pay = staffSplit(c, s.adj ? s.adj(price) : price);
  if (pay.own > c.vitals.manaCurrent) return `chybí energie (${c.vitals.manaCurrent}/${pay.own})`;
  const sp = isWizard(c) ? spellByName(s.n) : undefined;
  const pw = sp ? castProfile(c, d, sp).why : '';
  if (pw) return pw;
  const kp = isCleric(c) ? prayerByName(s.n) : undefined;
  const kw = kp ? prayerWhy(c, kp) : '';
  if (kw) return kw;
  if (len === 'K' && x.free < 1 && !castsFree(c, s)) return 'nemáš krátkou akci';
  if (len === 'D' && x.free < 2) return 'dlouhá akce už nejde';
  return '';
}

/** Bojové sesílání (Bojový mág, PPP04): půlkolové kouzlo nezabere akci – zbude Útok i Obrana. */
const castsFree = (c: Character, s: SpellDef) => isWizard(c) && hasAbility(c, 'bojove_sesilani') && s.l === 'K' && !s.free;

/** Použije kouzlo: odečte energii a akci. Vrací, zda se má hned házet ověření (kouzlo na 1 akci). */
export function castSpell(c: Character, d: Derived, s: SpellDef, price: number): { character: Character; rollNow: boolean } {
  if (spellWhy(c, d, s, price)) return { character: c, rollNow: false };
  const n = lenRounds(s.l);
  const len = n > 1 ? 'D' : (s.l as ActionLength);
  const reaction = /reakce/.test(s.x);
  const final = s.adj ? s.adj(price) : price;
  const pay = staffSplit(c, final);
  const free = castsFree(c, s);
  const txt = `${s.n}: −${final}${pay.staff ? ` (z hole ${pay.staff})` : ''}${free ? ' · Bojové sesílání – bez akce' : ''} ${n > 1 ? `(sesílání začalo, zbývá ${n - 1} dl. akce)` : ''}`.trim();
  const character = record(c, txt, (y) => {
    const z: Character = {
      ...withCombat(y, (b) => ({
        ...b, k: b.k + (free ? 0 : cost(len)), cast: reaction ? b.cast : true,
        turnLog: [...b.turnLog, { n: `${s.n} (−${final})`, len: free ? 'O' : len, once: reaction ? null : 'cast' }],
        channel: n > 1 ? { n: s.n, left: n - 1 } : b.channel,
      })),
      vitals: { ...y.vitals, manaCurrent: y.vitals.manaCurrent - pay.own },
    };
    const W = z.classState.kouzelnik;
    const paid = pay.staff && W ? { ...z, classState: { ...z.classState, kouzelnik: { ...W, staff: { ...W.staff, mana: W.staff.mana - pay.staff } } } } : z;
    // Klerik (7d): aktivní prosba, posel, Oběti – hned po zaplacení (vícekolové vzývání už má Přízeň odečtenou).
    const kp = isCleric(paid) ? prayerByName(s.n) : undefined;
    const prayed = kp ? afterPrayer(paid, kp, price) : paid;
    return n <= 1 ? withActiveSpell(prayed, s.n, price) : prayed;
  });
  return { character, rollNow: n <= 1 && !!s.o && !s.free };
}

/** Pokračování vícekolového kouzla (dlouhá akce). Vrací, zda je sesílání dokončené. */
export function continueChannel(c: Character): { character: Character; done: boolean } {
  const B = c.play.combat;
  if (!B?.channel || shortCap(c) - B.k < 2 || B.phase !== 'turn') return { character: c, done: false };
  const left = B.channel.left - 1;
  const character = record(c, `${B.channel.n}: pokračuje${left <= 0 ? ' – dokončeno' : ''}`, (y) => withCombat(y, (b) => ({
    ...b, k: b.k + 2, cast: true, turnLog: [...b.turnLog, { n: `${B.channel!.n} (pokračuje)`, len: 'D', once: 'cast' }],
    channel: left > 0 ? { ...b.channel!, left } : null,
  })));
  return { character, done: left <= 0 };
}

export const stopChannel = (c: Character) =>
  record(c, `Sesílání přerušeno: ${c.play.combat?.channel?.n ?? ''} – energie propadla`, (y) => withCombat(y, (b) => ({ ...b, channel: null })));

/** Sebeobětování (Rytíř, PPP01): chybějící adrenalin zaplatí dvojnásobkem životů; znovu až po tolika kolech, kolik získal. */
export function sacrificeFor(c: Character, price: number): { missing: number; hp: number; why: string } {
  const missing = Math.max(0, price - c.vitals.manaCurrent);
  if (!missing) return { missing: 0, hp: 0, why: '' };
  const B = c.play.combat;
  if (!hasAbility(c, 'sebeobetovani') || !B) return { missing, hp: 0, why: `málo adrenalinu (${c.vitals.manaCurrent}/${price})` };
  const ready = B.war?.sacrificeReady ?? 0;
  if (ready > B.round) return { missing, hp: 0, why: `málo adrenalinu (${c.vitals.manaCurrent}/${price}) · Sebeobětování až v ${ready}. kole` };
  return { missing, hp: 2 * missing, why: '' };
}

export function trickWhy(c: Character, d: Derived, t: TrickDef, price = t.a): string {
  const x = turnCtx(c, d);
  const B = x.B;
  if (!B) return 'boj neběží';
  const sac = sacrificeFor(c, price);
  if (sac.why) return sac.why;
  if (x.out || x.stunned || x.surprised) return 'nemůžeš jednat';
  switch (t.t) {
    case 'utok':
      if (t.extra) return '';
      return attackWhy(c, d);
    case 'obrana':
      if (t.extra) return '';
      return canDefend(c, d);
    case 'pohyb': return B.phase !== 'turn' ? 'jen ve tvém tahu' : x.free < 1 ? 'nemáš krátkou akci' : '';
    case 'soustr': return B.focusTrick ? 'soustředění už v tomto kole' : '';
    // Bojové rozkazy (Rytíř) nejdou kombinovat s triky typu Výkřik.
    case 'vykrik': return B.shout ? 'výkřik už v tomto kole' : B.war?.order ? 'v tomto kole už zazněl bojový rozkaz' : '';
    default: return '';
  }
}

/**
 * Trik válečníka: odečte adrenalin (cena po Rutině, u proměnné ceny zvolená) a zabere příslušnou akci.
 * Dodatečný útok / Dodatečná obrana a reakce akci nezabírají; výkřik a soustředění jsou 1× za kolo.
 * Vrací, co hodit (útok/obrana).
 */
export function applyTrick(c: Character, d: Derived, t: TrickDef, price = t.a): { character: Character; roll: 'attack' | 'defense' | null } {
  if (trickWhy(c, d, t, price)) return { character: c, roll: null };
  const sac = sacrificeFor(c, price);
  const trickCd = t.t === 'utok' && !t.extra ? nextCd(roundInfo(c, d)) : undefined;
  const trickDefCd = t.t === 'obrana' && !t.extra ? nextDefCd(roundInfo(c, d)) : undefined;
  // Přeskupení (Mistr Cesty strategie): prodlouží / obnoví vyhlášenou strategii.
  const regroup = t.n === 'Přeskupení' && !!c.play.combat?.war?.strategy;
  const text = `Trik ${t.n}: ${sac.missing ? `−${price - sac.missing} adrenalin, Sebeobětování −${sac.hp} životů` : `−${price} adrenalin`}${regroup ? ' – strategie obnovena' : ''}`;
  const character = record(c, text, (y) => ({
    ...withCombat(y, (b) => {
      const log = (n: string, len: ActionLength) => (b.phase === 'turn' ? [...b.turnLog, { n, len, once: null }] : b.turnLog);
      const war = sac.missing || regroup ? {
        ...b.war,
        ...(sac.missing ? { sacrificeReady: b.round + sac.missing + 1 } : {}),
        ...(regroup && b.war?.strategy ? { strategy: { ...b.war.strategy, from: Math.min(b.war.strategy.from, b.round), to: b.war.strategy.to == null ? null : b.round + strategyRounds(y) - 1 } } : {}),
      } : b.war;
      const bb = { ...b, war };
      switch (t.t) {
        case 'utok':
          if (t.extra) return { ...bb, turnLog: log(`${t.n} (dodatečný útok)`, 'O') };
          return attackStep(bb, `Útok + ${t.n}`, trickCd);
        case 'obrana':
          return t.extra ? bb : defenseStep(bb, trickDefCd);
        case 'pohyb': return { ...bb, k: b.k + 1, turnLog: [...b.turnLog, { n: `Postup + ${t.n}`, len: 'K', once: null }] };
        case 'soustr': return { ...bb, focusTrick: true, turnLog: log(`${t.n} (soustředění)`, 'O') };
        case 'vykrik': return { ...bb, shout: true, turnLog: log(`${t.n} (výkřik)`, 'O') };
        default: return { ...bb, turnLog: log(`${t.n} (reakce)`, 'O') };
      }
    }),
    vitals: { ...y.vitals, manaCurrent: y.vitals.manaCurrent - price + sac.missing, hpCurrent: y.vitals.hpCurrent - sac.hp },
  }));
  return { character, roll: t.roll };
}

// ---------------------------------------------------------------- válečník v boji (7b.2): strategie, rozkazy, zuřivost, Cesta krve

/** Strategie platná v aktuálním kole (Cesta strategie, PPP01) – platí pro válečníka i družinu. */
export function activeStrategy(c: Character): { kind: 'utok' | 'obrana'; bonus: number } | null {
  const B = c.play.combat;
  const s = B?.war?.strategy;
  if (!B || !s || B.round < s.from || (s.to != null && B.round > s.to)) return null;
  return s;
}

/** Před bojem = 1. kolo, ještě nikdo z tvé strany nejednal (bez akce, platí hned). Jinak dlouhá akce ve tvém tahu. */
const beforeFight = (B: CombatState) => B.round === 1 && B.phase === 'wait' && B.k === 0 && !B.attack && !B.defense;

export function strategyWhy(c: Character, whole = false): string {
  const B = c.play.combat;
  if (!B) return 'boj neběží';
  const r = pathRank(c, 'cesta_strategie');
  if (!r) return 'chybí Cesta strategie';
  if (B.war?.strategy) return 'strategii lze v souboji určit jen jednou (prodloužení: trik Přeskupení)';
  if (whole) return r < 4 ? 'Strategie na místo až od IV. stupně' : beforeFight(B) ? '' : 'Strategie na místo se připravuje před bojem (1 hodina)';
  if (beforeFight(B)) return '';
  if (B.phase !== 'turn') return 'jen ve tvém tahu nebo před bojem';
  return B.k > 0 ? 'předání pokynů je dlouhá akce' : '';
}

/**
 * Vyhlásí strategii družině: předání pokynů trvá celé kolo (dlouhá akce), efekt od dalšího kola na 3 kola (Mistr 5).
 * Před bojem platí hned od 1. kola; Strategie na místo (IV. stupeň, příprava 1 hodina) celý boj.
 */
export function declareStrategy(c: Character, kind: 'utok' | 'obrana', whole = false): Character {
  if (strategyWhy(c, whole)) return c;
  const B = c.play.combat!;
  const r = pathRank(c, 'cesta_strategie');
  if (kind === 'obrana' && r < 2) return c;
  const pre = beforeFight(B);
  const from = pre ? 1 : B.round + 1;
  const to = whole ? null : from + strategyRounds(c) - 1;
  const name = kind === 'utok' ? `Útočná strategie +${r}` : `Obranná strategie +${r}`;
  return record(c, `${name}${whole ? ' – na místo, celý boj' : ` – kola ${from}–${to}`}${pre ? ' (před bojem)' : ''}`, (y) => withCombat(y, (b) => ({
    ...b,
    ...(pre ? {} : { k: 2, turnLog: [...b.turnLog, { n: `Pokyny družině – ${name}`, len: 'D' as const, once: null }] }),
    war: { ...b.war, strategy: { kind, bonus: r, from, to } },
  })));
}

/** Velení (H08): útočný / obranný rozkaz platí do odvolání, končí s bojem. Bonus je pro ostatní, ne pro válečníka. */
export function setCommand(c: Character, kind: 'utok' | 'obrana' | null): Character {
  if (!c.play.combat || !hasAbility(c, 'veleni')) return c;
  const n = commandBonus(c);
  return record(c, kind ? `Velení: ${kind === 'utok' ? `útočný rozkaz +${n} ÚČ` : `obranný rozkaz +${n} OČ`}` : 'Velení: rozkaz odvolán', (y) => withWar(y, (w) => ({ ...w, command: kind })));
}

/** Bojové rozkazy (Rytíř): 1 rozkaz za kolo jedné inteligentní bytosti, ne v kole s trikem typu Výkřik. */
export function orderWhy(c: Character): string {
  const B = c.play.combat;
  if (!B) return 'boj neběží';
  if (!hasAbility(c, 'bojove_rozkazy')) return 'chybí Bojové rozkazy';
  if (B.war?.order) return 'rozkaz už v tomto kole';
  if (B.shout) return 'v tomto kole už byl trik typu Výkřik';
  if (turnCtx0(c)) return 'nemůžeš jednat';
  return '';
}
const turnCtx0 = (c: Character) => (c.vitals.hpCurrent <= 0 && !hasAbility(c, 'urputnost') && !noKnockout(c)) || hasCond(c, 'otreseni') || hasCond(c, 'paralyza');

export function giveOrder(c: Character, order: string, whom = ''): Character {
  if (orderWhy(c)) return c;
  return record(c, `Bojový rozkaz ${order}${whom ? ` → ${whom}` : ''}`, (y) => withWar(y, (w) => ({ ...w, order })));
}

// --- Vražedná zuřivost (Berserkr, PPP01)

export function furyWhy(c: Character): string {
  const B = c.play.combat;
  if (!B) return 'boj neběží';
  if (!hasAbility(c, 'vrazedna_zurivost')) return 'chybí Vražedná zuřivost';
  if (B.war?.fury) return 'jen jednou za boj';
  return c.vitals.hpCurrent <= 0 && !hasAbility(c, 'urputnost') && !noKnockout(c) ? 'bezvědomí' : '';
}

/** Přerod trvá kolo; od dalšího kola +2 adrenalinu za kolo, +1 útok, Hranice smrti = −max. životů. */
export function startFury(c: Character): Character {
  if (furyWhy(c)) return c;
  const r = c.play.combat!.round;
  return record(c, `Vražedná zuřivost – přerod (účinky od ${r + 1}. kola)`, (y) => withWar(y, (w) => ({ ...w, fury: { start: r, active: true, mad: false, check: false, ended: null } })));
}

/** Past Vůle (CHAR) vs. 2, +1 za každé další kolo zuřivosti. */
export const furyTrap = (c: Character) => {
  const B = c.play.combat;
  const f = B?.war?.fury;
  return B && f ? Math.max(2, B.round - f.start) : 2;
};
export const willBonus = (d: Derived) => d.skills.find((s) => s.id === 'vule')?.total ?? d.mods.char;

/**
 * Hod na konci kola zuřivosti: výsledek musí past překonat – pak se Berserkr vymaní, jinak propadá šílenství
 * (útočí na nejbližšího) a zuřivost pokračuje.
 */
export function furyCheck(c: Character, d: Derived, die = rollDie): { character: Character; total: number; trap: number; freed: boolean } {
  const f = c.play.combat?.war?.fury;
  const trap = furyTrap(c);
  if (!f?.active) return { character: c, total: 0, trap, freed: false };
  const bonus = willBonus(d) + combatMods(c).chk;
  const roll = die(10);
  const total = roll + bonus;
  const freed = total > trap;
  const round = c.play.combat!.round;
  const character = record(c, `Vražedná zuřivost – past Vůle ${trap}: k10 ${roll} ${sgn(bonus)} = ${total} → ${freed ? 'vymanil se' : 'ŠÍLENSTVÍ, zuřivost pokračuje'}`, (y) =>
    withWar(y, (w) => ({ ...w, fury: { ...f, check: false, ...(freed ? { active: false, mad: false, ended: round } : { mad: true }) } })));
  return { character, total, trap, freed };
}

/** Pod Hranicí smrti po zuřivosti: 1 adrenalin = odklad smrti o 1 kolo. */
export function payDeathDelay(c: Character): Character {
  const B = c.play.combat;
  if (!B || c.vitals.manaCurrent < 1) return c;
  return record(c, 'Odklad smrti o 1 kolo: −1 adrenalin', (y) => ({
    ...withWar(y, (w) => ({ ...w, deathDelay: B.round })),
    vitals: { ...y.vitals, manaCurrent: y.vitals.manaCurrent - 1 },
  }));
}

// --- Cesta krve (Berserkr, PPP01)

export function bloodRushWhy(c: Character): string {
  const B = c.play.combat;
  if (!B) return 'boj neběží';
  if (!hasAbility(c, 'cesta_krve')) return 'chybí Cesta krve';
  if (B.war?.bloodRush) return 'nabuzení jen jednou';
  if (B.round > 1) return 'jen na začátku boje';
  if (beforeFight(B)) return '';
  return B.phase !== 'turn' ? 've tvém tahu nebo před bojem' : B.k > 0 ? 'nabuzení trvá celé kolo (dlouhá akce)' : '';
}

/** Nabuzení: 1k6 zranění sobě → +1 adrenalin za každý ztracený život. */
export function bloodRush(c: Character, die = rollDie): { character: Character; n: number } {
  if (bloodRushWhy(c)) return { character: c, n: 0 };
  const n = die(6);
  const pre = beforeFight(c.play.combat!);
  const character = record(c, `Cesta krve – nabuzení: −${n} životů, +${n} adrenalin`, (y) => ({
    ...withCombat(y, (b) => ({
      ...b, ...(pre ? {} : { k: 2, turnLog: [...b.turnLog, { n: 'Cesta krve – nabuzení', len: 'D' as const, once: null }] }),
      war: { ...b.war, bloodRush: true },
    })),
    vitals: { ...y.vitals, hpCurrent: y.vitals.hpCurrent - n, manaCurrent: y.vitals.manaCurrent + n },
  }));
  return { character, n };
}

/** Vzdal se Obrany a nechal se zranit: za každých načatých 10 bodů Zranění +1k6 adrenalinu (i při přepadení). */
export function bloodWound(c: Character, dmg: number, die = rollDie): { character: Character; gain: number; faces: number[] } {
  const n = Math.max(0, Math.trunc(dmg));
  if (!n || !c.play.combat || !hasAbility(c, 'cesta_krve')) return { character: c, gain: 0, faces: [] };
  const faces = Array.from({ length: Math.ceil(n / 10) }, () => die(6));
  const gain = faces.reduce((a, b) => a + b, 0);
  const character = record(c, `Cesta krve – bez obrany −${n} životů, +${gain} adrenalin (${faces.join('+')})`, (y) => ({
    ...y, vitals: { ...y.vitals, hpCurrent: y.vitals.hpCurrent - n, manaCurrent: y.vitals.manaCurrent + gain },
  }));
  return { character, gain, faces };
}
