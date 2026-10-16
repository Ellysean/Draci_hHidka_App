// Zloděj (7e): zlodějská umění a triky (H12 + PPP05), schopnosti a specializace (Assassin, Lupič, Sicco),
// bonusy ke zbraním, útoky a obrany za kolo (Vrhání dýk, Svižné ostří, Riskantní útok), jedy, pasti, udělátka a Siccova síť.
// Čisté funkce – změny stavu jsou v rules/zlodej-akce.ts. Data: src/data/zlodej.json (tools/build-zlodej.py ← docs/h12 + docs/ppp05).
import zlodejJson from '../data/zlodej.json';
import { emptyThief } from '../model/defaults';
import type { Character, CombatState, ThiefCombat, ThiefNetworkMember, ThiefState } from '../model/types';
import type { Derived } from './derive';
import { weaponGroups, type ActiveWeapon, type RoundCount, type WeaponBonus, type WeaponInfo } from './valecnik';

// ---------------------------------------------------------------- data

export type TrickUse = 'utok' | 'misto' | 'obrana' | 'akce' | null;
export interface ThiefTrickFx { atk?: number; atkPen?: number; def?: number; defFail?: number; aim?: boolean; ranged?: boolean; note?: string }
export interface ThiefTrick {
  id: string; n: string; skupina: string; skill: string; zdroj: 'H12' | 'PPP05'; strana: number;
  cetnost: string; pouziti: string; overeni: string; popis: string; boj: TrickUse; once: boolean; fx?: ThiefTrickFx;
}
export interface ThiefAbility {
  name: string; short: string; text: string; source: 'H12' | 'PPP05'; page: number; spec: string | null; minLevel: number | null;
  grantsItems?: string[]; grantsSkills?: { id: string; rank: number }[]; skillPlus?: string[];
}
export interface ThiefItem { typ: 'bomba' | 'udelatko' | 'klic' | 'past'; id: string; nazev: string; strana: number; parametry: Record<string, unknown>; popis: string }
export interface ThiefPoison { id: string; nazev: string; strana: number; zaklad: string; trvani: string; vzhled: string; nebezpecnost: string; popis: string }
export interface NetworkAction { id: string; nazev: string; nebezpecnost: 'Přestupek' | 'Zločin'; kumpan: ThiefNetworkMember['type']; cena: number; popis: string }
interface ThiefData {
  pravidla: Record<string, string>;
  zaklady: { id: string; nazev: string; atribut: string; overeni: string; popis: string }[];
  umeni: { id: string; skill: string; nazev: string; atribut: string; popis: string; triky: string[] }[];
  skupiny: Record<string, string>;
  schopnosti: Record<string, ThiefAbility>;
  specializace: Record<string, { name: string; page: number; intro: string; popis: string; requires: string[]; requiresPpp: string[]; need: number; auto: { id: string; name: string; text: string }[] }>;
  triky: ThiefTrick[];
  predmety: ThiefItem[];
  jedy: ThiefPoison[];
  zbrane: Record<string, { druh: 'assassin' | 'gentleman' | 'improv'; vyroba: string | null; popis: string }>;
  sit: {
    kumpani: { id: ThiefNetworkMember['type']; typ: string; cena: number; akce: string[]; popis: string }[];
    akce: NetworkAction[];
    pravidla: Record<string, string>;
  };
  duvernik: Record<string, unknown>;
}

export const THIEF = zlodejJson as unknown as ThiefData;
export const THIEF_TRICKS = THIEF.triky;
export const trickByName = (n: string) => THIEF_TRICKS.find((t) => t.n === n);
export const trickById = (id: string) => THIEF_TRICKS.find((t) => t.id === id);
export const poisonById = (id: string) => THIEF.jedy.find((p) => p.id === id);
export const itemById = (id: string) => THIEF.predmety.find((p) => p.id === id);
export const memberType = (id: string) => THIEF.sit.kumpani.find((k) => k.id === id);
export const netAction = (id: string) => THIEF.sit.akce.find((a) => a.id === id);

export const isThief = (c: Character) => c.basic.classId === 'zlodej';
export const hasAbility = (c: Character, id: string) => c.progression.learnedAbilities.some((a) => a.id === id);
export const zlo = (c: Character): ThiefState => c.classState.zlodej ?? emptyThief();
const spec = (c: Character) => c.progression.specialization;
const sgn = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0');
export const groupLabel = (id: string) => THIEF.skupiny[id] ?? id;

/** Co zloděj ovládá: umění, schopnosti, specializace a její automatické schopnosti (podle id). */
export function thiefOwned(c: Character): Set<string> {
  const s = new Set<string>([...c.progression.learnedBranches, ...c.progression.learnedAbilities.map((a) => a.id)]);
  const sp = spec(c);
  if (sp) {
    s.add(sp);
    for (const a of THIEF.specializace[sp]?.auto ?? []) s.add(a.id);
  }
  return s;
}

/** Má automatickou schopnost specializace (Vražedné zbraně, Improvizované zbraně, Siccova síť…). */
export const hasSpecAuto = (c: Character, id: string) => isThief(c) && thiefOwned(c).has(id);

// ---------------------------------------------------------------- triky

/** Proč trik zloděj nezná ('' = zná). Triky se neučí ze slotů – dávají je umění a schopnosti automaticky (H12, PPP05). */
export function trickLock(c: Character, t: ThiefTrick, own = thiefOwned(c)): string {
  if (own.has(t.skupina)) return '';
  return `chybí ${groupLabel(t.skupina)}`;
}

export const knownThiefTricks = (c: Character): ThiefTrick[] => {
  if (!isThief(c)) return [];
  const own = thiefOwned(c);
  return THIEF_TRICKS.filter((t) => !trickLock(c, t, own));
};

/** Zlodějské dovednosti s CHAR (Alter ego: Výhoda +5). */
const CHAR_SKILLS = new Set(['presvedcovani', 'umeni_promen', 'umeni_sarmu']);

/** Bonus k ověření dovednosti zloděje: celkový bonus dovednosti + Alter ego (+5 u CHAR, když vystupuje pod falešnou identitou). */
export function thiefSkillBonus(c: Character, d: Derived, skillId: string): { bonus: number; parts: string[]; have: boolean; name: string } {
  const k = d.skills.find((s) => s.id === skillId);
  const parts: string[] = [];
  let bonus = 0;
  const name = k?.name ?? skillId;
  if (k) { bonus += k.total; parts.push(`${k.name} ${sgn(k.total)}`); }
  else parts.push(`${name} – dovednost chybí`);
  if (isThief(c) && hasAbility(c, 'alter_ego') && zlo(c).alterEgo && CHAR_SKILLS.has(skillId)) { bonus += 5; parts.push('Alter ego +5'); }
  return { bonus, parts, have: !!k, name };
}

/** Ověření triku: k10 + Umění (dovednost, ke které trik patří). */
export const trickCheck = (c: Character, d: Derived, t: ThiefTrick) => thiefSkillBonus(c, d, t.skill);

/** Jednorázové triky (četnost „jednorázově“) – v boji 1× za souboj (PPP05 s. 240). */
export const usedTricks = (B: CombatState | null | undefined) => new Set(B?.zlo?.used ?? []);

/** Proč trik teď v boji nejde ('' = jde). */
export function trickCombatWhy(c: Character, t: ThiefTrick): string {
  const B = c.play.combat;
  if (!B) return 'boj neběží';
  if (!t.boj) return 'trik mimo boj';
  if (t.once && usedTricks(B).has(t.id)) return 'jednorázový – v tomto souboji už použit';
  if (t.fx?.aim && !(B.zlo?.aim != null && B.zlo.aim < B.round)) return B.zlo?.aim === B.round ? 'míříš – vystřelíš v příštím kole' : 'nejdřív 1 kolo míření';
  return '';
}

// ---------------------------------------------------------------- zbraně

/** Boj beze zbraně: bez zbraně, pěsti, okované rukavice, boxer (H12 příklad Kramáře: rukavice + Boj beze zbraně). */
const unarmed = (w: WeaponInfo | null) => !w || weaponGroups(w).includes('beze_zbrane') || /rukavic|boxer/i.test(w.name);
const isLight = (w: WeaponInfo | null) => unarmed(w) || /^lehk/i.test(w!.category);
const isCrossbow = (w: WeaponInfo | null) => !!w && w.kind === 'ranged' && /kuš|foukač|mechanism/i.test(`${w.name} ${w.category}`);

/** Druh zbraně cechu: z dat (vyzbroj.json `zl`), u vlastních zbraní podle kategorie. */
export function weaponKindZl(w: WeaponInfo | null): 'assassin' | 'gentleman' | 'improv' | null {
  if (!w) return null;
  if (w.zl === 'assassin' || w.zl === 'gentleman' || w.zl === 'improv') return w.zl;
  if (/assassin/i.test(w.category)) return 'assassin';
  if (/gentleman/i.test(w.category)) return 'gentleman';
  if (/improviz/i.test(`${w.category} ${w.name}`)) return 'improv';
  return null;
}

/** Atribut, kterým se splňuje požadavek zbraně (Technika nabíjení: kuše OBR místo SIL). */
export const strReqAttr = (c: Character, w: WeaponInfo | null): 'sil' | 'obr' => (isThief(c) && hasAbility(c, 'technika_nabijeni') && isCrossbow(w) ? 'obr' : 'sil');

/**
 * Bonusy zloděje ke zbrani (do derive): Boj beze zbraně +3 ÚČ/OČ, Vražedné ostří +2 ÚČ/OČ, Zákeřná kuše +2 ÚČ a Zranění,
 * Citlivá místa +3 Zranění, Obratný bojovník (OBR místo SIL), Vražedné zbraně / Improvizované zbraně / Zbraně gentlemana +3 ÚČ/OČ.
 */
export function thiefWeaponBonus(c: Character, w: WeaponInfo | null, x: { sil: number; obr: number; shieldOn: boolean }): WeaponBonus {
  const b: WeaponBonus = { atk: 0, def: 0, dmg: 0, init: 0, parts: [] };
  if (!isThief(c)) return b;
  const has = (id: string) => hasAbility(c, id);
  const own = thiefOwned(c);
  const bare = unarmed(w);
  const melee = !w || w.kind === 'melee';
  if (bare && melee && !x.shieldOn && has('boj_beze_zbrane')) { b.atk += 3; b.def += 3; b.parts.push('Boj beze zbraně +3 ÚČ/OČ'); }
  const stab = !!w && !bare && /^lehk/i.test(w.category) && (/krátk/i.test(w.category) || w.dmgTypes.some((t) => /bodn/i.test(t)));
  if (stab && has('vrazedne_ostri')) { b.atk += 2; b.def += 2; b.parts.push('Vražedné ostří +2 ÚČ/OČ'); }
  if (isCrossbow(w) && has('zakerna_kuse')) { b.atk += 2; b.dmg += 2; b.parts.push('Zákeřná kuše +2 ÚČ a Zranění'); }
  if ((w?.kind === 'ranged' || w?.kind === 'thrown' || isLight(w)) && has('citliva_mista')) { b.dmg += 3; b.parts.push('Citlivá místa +3 Zranění'); }
  if (melee && isLight(w) && has('obratny_bojovnik') && x.obr > x.sil) { b.atk += x.obr - x.sil; b.parts.push(`Obratný bojovník (OBR místo SIL) ÚČ +${x.obr - x.sil}`); }
  const zl = weaponKindZl(w);
  const SPEC_W: [string, string, string][] = [['assassin', 'vrazedne_zbrane', 'Vražedné zbraně'], ['improv', 'improvizovane_zbrane', 'Improvizované zbraně'], ['gentleman', 'zbrane_gentlemana', 'Zbraně gentlemana']];
  for (const [kind, id, name] of SPEC_W) if (zl === kind && own.has(id)) { b.atk += 3; b.def += 3; b.parts.push(`${name} +3 ÚČ/OČ`); }
  return b;
}

/** Boj se dvěma zbraněmi (PPP05): hlavní beze zbraně nebo lehká jednoruční, druhá lehká krátká; bez štítu. */
export function thiefDualWhy(c: Character, main: WeaponInfo | null, off: WeaponInfo | null, shieldOn: boolean): string {
  if (!isThief(c) || !hasAbility(c, 'boj_se_dvema_zbranemi')) return 'chybí Boj se dvěma zbraněmi';
  if (!main || !off) return 'vyber dvě zbraně';
  if (shieldOn) return 'v ruce je štít';
  if (main.kind === 'ranged' || off.kind === 'ranged') return 'střelná zbraň';
  if (!unarmed(main) && (!/^lehk/i.test(main.category) || /obouruč/i.test(main.grip ?? ''))) return `${main.name}: hlavní zbraň musí být lehká jednoruční (nebo boj beze zbraně)`;
  if (!/^lehk.*krátk/i.test(off.category)) return `${off.name}: ve druhé ruce jen lehká krátká zbraň`;
  return '';
}

// ---------------------------------------------------------------- útoky a obrany za kolo

const isLightThrown = (w: ActiveWeapon) => w.kind === 'thrown' && /lehk/i.test(w.category ?? '');
const isLightMelee = (w: ActiveWeapon) => w.kind === 'melee' && (w.none || w.groups.includes('beze_zbrane') || /^lehk/i.test(w.category ?? ''));

/**
 * Útoky a obrany zloděje v kole: Vrhání dýk (3 vrhy a 3 obrany za 2 kola, od 6. úrovně 2 každé kolo – H12),
 * Svižné ostří (3 útoky za 2 kola, od 12. úrovně 2 každé kolo – PPP05), Riskantní útok (Obrana za Útok, 1× za kolo).
 */
export function thiefRound(c: Character, w: ActiveWeapon, round: number, B: CombatState | null): { atk: RoundCount; def: RoundCount } {
  const atk: RoundCount = { n: 1, unlimited: false, parts: [], cdSources: [] };
  const def: RoundCount = { n: 1, unlimited: false, parts: [], cdSources: [] };
  if (!isThief(c)) return { atk, def };
  const L = c.progression.level;
  const odd = round % 2 === 1;
  if (isLightThrown(w) && hasAbility(c, 'vrhani_dyk')) {
    // Útoky: 2-1-2-1…, od 6. úrovně 2 každé kolo. Obrany: 3 za 2 kola (výklad: i od 6. úrovně).
    if (L >= 6 || odd) { atk.n += 1; atk.parts.push(`Vrhání dýk +1${L >= 6 ? '' : ' (liché kolo)'}`); }
    else atk.parts.push(`Vrhání dýk – další v ${round + 1}. kole`);
    if (odd) { def.n += 1; def.parts.push('Vrhání dýk +1 (liché kolo)'); }
  } else if (isLightMelee(w) && hasAbility(c, 'svizne_ostri')) {
    if (L >= 12 || odd) { atk.n += 1; atk.parts.push(`Svižné ostří +1${L >= 12 ? '' : ' (liché kolo)'}`); }
    else atk.parts.push(`Svižné ostří – další v ${round + 1}. kole`);
  }
  if (B?.zlo?.risky === round && hasAbility(c, 'riskantni_utok')) {
    atk.n += 1; def.n = Math.max(0, def.n - 1);
    atk.parts.push('Riskantní útok +1'); def.parts.push('Riskantní útok −1');
  }
  return { atk, def };
}

/** Riskantní útok jde vyhlásit? (1× za kolo, zbývá-li obrana). */
export function riskyWhy(c: Character, defLeft: number): string {
  const B = c.play.combat;
  if (!hasAbility(c, 'riskantni_utok')) return 'chybí Riskantní útok';
  if (!B) return 'boj neběží';
  if (B.zlo?.risky === B.round) return 'v tomto kole už použit';
  if (defLeft < 1) return 'žádná obrana k výměně';
  return '';
}

/** Výhodná pozice (Assassin): první Útok v souboji s automatickou 6; znovu se získá vzdáním jednoho Útoku. */
export const positionReady = (c: Character) => isThief(c) && hasAbility(c, 'vyhodna_pozice') && !!c.play.combat && !c.play.combat.zlo?.posUsed;

/** Bonusy zloděje do hodů v boji (combatMods): Bojová kreativita +5 ÚČ i OČ v kole s novou improvizovanou zbraní. */
export function thiefCombatMods(c: Character): [string, { atk?: number; def?: number }][] {
  const B = c.play.combat;
  if (!B || !isThief(c)) return [];
  const out: [string, { atk?: number; def?: number }][] = [];
  if (hasAbility(c, 'bojova_kreativita') && B.zlo?.creative === B.round) out.push(['Bojová kreativita', { atk: 5, def: 5 }]);
  return out;
}

export const thiefCombat = (B: CombatState): ThiefCombat => B.zlo ?? {};

// ---------------------------------------------------------------- situační poznámky

export function thiefNotes(c: Character): { source: string; text: string }[] {
  if (!isThief(c)) return [];
  const out: { source: string; text: string }[] = [];
  const say = (id: string, text: string) => { if (hasAbility(c, id)) out.push({ source: THIEF.schopnosti[id]?.name ?? id, text }); };
  say('sesty_smysl', 'Výhoda +5 k náhlým hodům na Postřeh a Reflex (ne při cíleném hledání ani Cíleném útoku). Iniciativa +3 je v deníku.');
  say('nocni_zivel', 'Ve tmě na bezprostřední vzdálenost bez Nevýhody (útok tváří v tvář, dovednosti).');
  say('rychle_taseni', '1× za kolo okamžitou akcí přezbrojit, vypít lektvar nebo aplikovat jed.');
  say('mistr_uteku', 'Při Přesunu / Sprintu se může bránit OČ (Pohyblivost +10 je v deníku).');
  say('cileny_utok', 'Útok −5 na hlavu / ruku / nohu, po zásahu Reflex vs. Reflex.');
  say('assassinace', 'Zásah tvora, který tě nevidí nebo se nemůže bránit (vyplýtvaná Aktivní obrana, paralýza…) = dvojnásobné Zranění.');
  say('vejir_dyk', 'Dva vrhací projektily najednou, každý s Nevýhodou −5, i na různé cíle.');
  say('improvizace', 'Odhalen po neúspěchu profesní dovednosti → 1 tah navíc (ne v souboji, těsně před ním ano).');
  say('odezirani_ze_rtu', 'Do 20 sáhů s výhledem na rty pochytí kontext řeči (zná-li jazyk).');
  say('technika_nabijeni', 'Kuše: požadavek SIL nahrazuje OBR (počítá deník).');
  say('alter_ego', 'Pod falešnou identitou Výhoda +5 ke zlodějským dovednostem s CHAR (přepínač na záložce Zloděj).');
  return out;
}

// ---------------------------------------------------------------- Siccova síť

/** Limit kumpánů = úroveň Sicca (PPP05 s. 268). */
export const networkLimit = (c: Character) => c.progression.level;
export const activeMembers = (c: Character) => zlo(c).network.members;
/** Měsíční výplata celé sítě (cena kumpána = nábor i měsíční plat). */
export const monthlyPay = (c: Character) => activeMembers(c).reduce((s, m) => s + (memberType(m.type)?.cena ?? 0), 0);

export function memberWhy(c: Character): string {
  if (!thiefOwned(c).has('siccova_sit')) return 'jen Sicco (Siccova síť)';
  return activeMembers(c).length >= networkLimit(c) ? `síť má už ${activeMembers(c).length} kumpánů (limit = úroveň ${networkLimit(c)})` : '';
}

/** Cena akce: sazba × zapojení kumpáni; v cizím městě 10× (nejvýš 3 kumpáni). */
export const actionCost = (a: NetworkAction, n: number, foreign: boolean) => a.cena * n * (foreign ? 10 : 1);

/** Bonus k ověření akce: 1 za každého zapojeného kumpána + Výhoda +5 po Podplacení. */
export function actionBonus(c: Character, n: number, extra = 0): { bonus: number; parts: string[] } {
  const parts = [`${n} ${n === 1 ? 'kumpán' : n < 5 ? 'kumpáni' : 'kumpánů'} +${n}`];
  let bonus = n;
  if (zlo(c).network.bribe) { bonus += 5; parts.push('Podplacení +5'); }
  if (extra) { bonus += extra; parts.push(`zkušenost ${sgn(extra)}`); }
  return { bonus, parts };
}

export function actionWhy(c: Character, a: NetworkAction, uids: string[], foreign: boolean): string {
  if (!thiefOwned(c).has('siccova_sit')) return 'jen Sicco (Siccova síť)';
  if (!uids.length) return `vyber kumpány (${memberType(a.kumpan)?.typ})`;
  if (foreign && uids.length > 3) return 'v cizím městě nejvýš 3 kumpáni';
  return '';
}

// ---------------------------------------------------------------- výroba (Lupičská udělátka, pasti, jedy)

export function craftWhy(c: Character, it: ThiefItem): string {
  const own = thiefOwned(c);
  if (it.typ === 'udelatko') return own.has('lupicska_udelatka') ? '' : 'chybí Lupičská udělátka';
  if (it.typ === 'past') return own.has('mistrovstvi_zelezneho_klice') ? '' : 'chybí trik Nastražení pasti (Mistrovství železného klíče)';
  if (it.typ === 'bomba') return 'vyrobí Alchymista (1 směna) – kup na černém trhu';
  if (it.typ === 'klic') return 'vyrobí alchymista – kup u cechovního alchymisty nebo získej výcvikem';
  return '';
}

/** Zbraně cechu, které umí vyrobit Lupič s Lupičskými udělátky (id ve vyzbroj.json). */
export const guildWeapons = () => Object.entries(THIEF.zbrane).filter(([, z]) => z.vyroba).map(([id, z]) => ({ id, ...z }));

export function poisonWhy(c: Character): string {
  if (!thiefOwned(c).has('vyroba_jedu')) return 'chybí Výroba jedů';
  return zlo(c).poisonMadeToday ? 'dnes už máš dávku' : '';
}
