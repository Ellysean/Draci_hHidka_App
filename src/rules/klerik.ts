// Klerik (7d): prosby H13 + PPP06, nauky, Přízeň, modlitby, Zvolání, volby vzývání, aktivní prosby, poslové,
// bonusy schopností a specializací. Čisté funkce – změny stavu jsou v rules/klerik-akce.ts (přes record()).
// Data: src/data/klerik.json (tools/build-klerik.py ← docs/h13_klerik.json + docs/ppp06_klerik.json).
import klerikJson from '../data/klerik.json';
import { emptyCleric, uid } from '../model/defaults';
import type { Character, ClericActivePrayer, ClericCastMods, ClericMessenger, ClericState } from '../model/types';
import type { Cast } from './hranicar';
import { castLen } from './hranicar';
import type { RoundCount, WeaponBonus, WeaponInfo } from './valecnik';

// ---------------------------------------------------------------- data

export interface PrayerCost { text: string; base: number; perLevel?: number; per?: { cost: number; unit: string; min: number }; alt?: number }
export interface PrayerDc { text: string; base: number | null; step?: number }
export interface PrayerFx {
  heal?: string; perUnit?: boolean; perRound?: boolean; sleep?: boolean; damage?: string; half?: string;
  active?: { zo?: number; atk?: number; def?: number; dr?: number; barrier?: boolean; tempHp?: boolean; weapon?: string; next?: number; note?: string };
  rounds?: number; roundsPerLevel?: number; roundsFromUnits?: boolean; aura?: boolean; posel?: string; note?: string;
}
export interface Prayer {
  id: string; nazev: string; zdroj: 'H13' | 'PPP06'; strana: number; skupina: string; typ: 'prosba' | 'lek';
  cena: PrayerCost; obtiznost: PrayerDc; vyvolani: Cast; dosah: string | null; rozsah: string | null; trvani: string | null;
  overeni: string | null; stitky: string[]; popis: string; temna?: string;
  learn: { requires: string[]; minLevel?: number };
  fx?: PrayerFx;
  zaklad?: string; vyroba?: string; pouziti?: string; cetnost?: string; pocet?: string;
}
export interface ClericAbility { name: string; text: string; source: string; page: number; spec: string | null; minLevel: number | null; grantsItems?: string[] }
interface MessengerRow { n: string; hpPerLevel?: number; hp?: number; vyssi_moc?: number; mobility?: string; attack: string | null; uc?: number; dmg?: number; zo: number; oc: number; growth?: string; ok?: boolean }
interface ClericData {
  pravidla: Record<string, string>;
  sveceni: { nazev: string; strana: number; text: string };
  darZivota: { nazev: string; strana: number; uroven: number; efekt: string };
  nauky: { id: string; nazev: string; efekt: string; popis: string; prosby: string[] }[];
  skupiny: Record<string, string>;
  schopnosti: Record<string, ClericAbility>;
  specializace: Record<string, { name: string; page: number; intro: string; popis: string; requires: string[]; need: number; auto: { id: string; name: string; text: string }[] }>;
  prosby: Prayer[];
  poslove: { h13: { list: Record<string, MessengerRow>; spolecne: string; vyssi_moc: string }; ppp06: { list: Record<string, MessengerRow>; rezistence: string; imunity: string } };
  videniMany: { mana: string; obtiznost: string }[];
}

export const CLERIC = klerikJson as unknown as ClericData;
export const PRAYERS = CLERIC.prosby;
export const prayerByName = (n: string) => PRAYERS.find((p) => p.nazev === n);
export const prayerById = (id: string) => PRAYERS.find((p) => p.id === id);

export const isCleric = (c: Character) => c.basic.classId === 'klerik';
export const hasAbility = (c: Character, id: string) => c.progression.learnedAbilities.some((a) => a.id === id);
export const cle = (c: Character): ClericState => c.classState.klerik ?? emptyCleric();
const spec = (c: Character) => c.progression.specialization;

/** Co klerik ovládá: nauky, schopnosti a specializace (podle id). */
export function clericOwned(c: Character): Set<string> {
  const s = new Set<string>([...c.progression.learnedBranches, ...c.progression.learnedAbilities.map((a) => a.id)]);
  if (spec(c)) s.add(spec(c)!);
  return s;
}

export const groupLabel = (id: string) => CLERIC.skupiny[id] ?? CLERIC.schopnosti[id]?.name ?? id;

/** Proč klerik prosbu (lék) nezná – prázdný řetězec = zná ji. */
export function prayerLock(c: Character, p: Prayer, level = c.progression.level, own = clericOwned(c)): string {
  const miss = p.learn.requires.filter((r) => !own.has(r));
  if (miss.length) return `vyžaduje ${miss.map(groupLabel).join(' + ')}`;
  if (p.learn.minLevel && level < p.learn.minLevel) return `od ${p.learn.minLevel}. úrovně`;
  return '';
}

/** Prosby a léky, které klerik zná – vždy automaticky ze základu, 2. úrovně, nauk a schopností (H13, PPP06). */
export function knownPrayers(c: Character): Prayer[] {
  if (!isCleric(c)) return [];
  const own = clericOwned(c);
  return PRAYERS.filter((p) => !prayerLock(c, p, c.progression.level, own));
}

// ---------------------------------------------------------------- cena, obtížnost, ověření

/** Kolik jednotek (slov, úderů, kol, X…) se zadává; null = cena je pevná. */
export const unitsOf = (p: Prayer) => (p.cena.per ? { label: p.cena.per.unit, min: p.cena.per.min } : null);

export const MESSENGERS = new Set(['posel_bojovnik', 'posel_rovnovahy', 'posel_stezky', 'posel_umlceni', 'posel_bdelosti', 'posel_domeny', 'posel_lovec', 'posel_peceti']);

export interface PrayerPrice { total: number; parts: string[] }

/**
 * Cena prosby v Přízni (H13, PPP06): základ + násobek úrovně klerika + jednotky (slova, kola, X…);
 * souvěrec −1 (min. 1), Jazyk prastarých u poslů −3 (min. 1), Mnohoprosby: každá další +2 oproti předchozí.
 */
export function prayerPrice(c: Character, p: Prayer, units: number, m: ClericCastMods = cle(c).mods, alt = false): PrayerPrice {
  const L = c.progression.level;
  const parts: string[] = [];
  let one = alt && p.cena.alt != null ? p.cena.alt : p.cena.base;
  if (alt && p.cena.alt != null) parts.push(`varianta ${p.cena.alt}`);
  else if (p.cena.base) parts.push(`základ ${p.cena.base}`);
  if (p.cena.perLevel) { one += p.cena.perLevel * L; parts.push(`${p.cena.perLevel > 1 ? `${p.cena.perLevel} × ` : ''}úroveň ${L}`); }
  if (p.cena.per) { const u = Math.max(p.cena.per.min, units); one += p.cena.per.cost * u; parts.push(`${p.cena.per.cost} × ${u} (${p.cena.per.unit})`); }
  if (MESSENGERS.has(p.id) && hasAbility(c, 'jazyk_prastarych')) { one = Math.max(1, one - 3); parts.push('Jazyk prastarých −3'); }
  if (m.coBeliever && one > 1) { one = Math.max(1, one - 1); parts.push('souvěrec −1'); }
  const n = multiN(c, m);
  let total = 0;
  for (let i = 0; i < n; i++) total += one + 2 * i;
  if (n > 1) parts.push(`Mnohoprosby ${n}× (+2 za každou další)`);
  return { total, parts };
}

/** Mnohoprosby (PPP06): kolik stejných proseb najednou. */
export const multiN = (c: Character, m: ClericCastMods = cle(c).mods) => (hasAbility(c, 'mnohoprosby') ? Math.max(1, Math.trunc(m.multi) || 1) : 1);

/** Obtížnost: základ + krok za další slovo / úder / kopí (H13); Oběti −10 (PPP06). null = určí PJ (Vyšší moc…). */
export function prayerDc(c: Character, p: Prayer, units: number): { dc: number | null; parts: string[]; list: number[] } {
  if (p.obtiznost.base == null) return { dc: null, parts: [p.obtiznost.text], list: [] };
  const parts: string[] = [];
  let dc = p.obtiznost.base;
  if (p.obtiznost.step && units > 1) { dc += p.obtiznost.step * (units - 1); parts.push(`+${p.obtiznost.step} × ${units - 1} navíc`); }
  if (cle(c).offering) { dc -= 10; parts.push('Oběti −10'); }
  const n = multiN(c);
  const list = Array.from({ length: n }, (_, i) => dc + 5 * i);
  if (n > 1) parts.push(`Mnohoprosby: ${list.join(' / ')}`);
  return { dc, parts, list };
}

/**
 * Bonus k ověření Prosby (CHAR) navíc k dovednosti (H13, PPP06): Posvátný symbol +2 (od 6. úr. +3), Rituály a obřady +3 na den,
 * bez odříkání −5, vyrušení −5, posvátné místo vlastního boha +5 / cizího −5, symbol jiného boha −5.
 */
export function prayerCheckBonus(c: Character, m: ClericCastMods = cle(c).mods): { bonus: number; parts: string[] } {
  const S = cle(c);
  const parts: string[] = [];
  let b = 0;
  const add = (v: number, t: string) => { b += v; parts.push(`${t} ${v > 0 ? '+' : '−'}${Math.abs(v)}`); };
  if (hasAbility(c, 'posvatny_symbol') && S.symbolInHand) add(c.progression.level >= 6 ? 3 : 2, 'Posvátný symbol');
  if (hasAbility(c, 'ritualy_a_obrady') && S.ritualToday) add(3, 'Rituál');
  if (m.silent) add(-5, 'bez odříkání');
  if (m.disturbed) add(-5, 'vyrušen');
  if (m.place === 'own') add(5, 'posvátné místo');
  if (m.place === 'foreign') add(-5, 'místo cizího boha');
  if (m.foreignSymbol) add(-5, 'symbol jiného boha');
  return { bonus: b, parts };
}

/** Délka vzývání pro hlídání akcí (O / K / D / 2D / Nk / M). Léky = mimo boj. */
export const prayerLen = (p: Prayer) => (p.typ === 'lek' ? 'M' : castLen(p.vyvolani));

/** Proč prosbu nejde vzývat mimo dovednost a Přízeň (Avatar, umlčení, Zastavení dění 1× za souboj). */
export function prayerWhy(c: Character, p: Prayer): string {
  const S = cle(c);
  if (S.avatar?.active) return 'v podobě Avatara';
  if (p.id === 'zastaveni_deni' && c.play.combat?.cle?.stop) return 'jen 1× za souboj';
  if (p.fx?.aura && auraBlocked(c, p)) return 'už máš auru (Zažehnutí aury umožní víc)';
  if (MESSENGERS.has(p.id) && S.messenger && !S.messenger.prayed) return 'posla už máš – dalšího až po pravidelné modlitbě';
  return '';
}

// ---------------------------------------------------------------- aktivní prosby a poslové

const live = (c: Character): ClericActivePrayer[] => {
  const round = c.play.combat?.round ?? null;
  return cle(c).active.filter((a) => a.until == null || round == null || a.until >= round);
};
export const activePrayers = live;

/** V jednu chvíli jen jedna aura (H13) – Zažehnutí aury (Kněz, PPP06) víc najednou. */
export const auraBlocked = (c: Character, p: Prayer) => !!p.fx?.aura && !hasAbility(c, 'zazehnuti_aury') && live(c).some((a) => a.aura && a.id !== p.id);

/** Kolik kol prosba trvá (null = mimo hlídání kol). */
export function prayerRounds(c: Character, p: Prayer, units: number): number | null {
  const f = p.fx;
  if (!f) return null;
  if (f.roundsFromUnits) return Math.max(1, units);
  if (f.roundsPerLevel) return f.roundsPerLevel * c.progression.level;
  return f.rounds ?? null;
}

/** Záznam aktivní prosby na klerika (Štít víry, aury, Andělská zbroj, Kladivo, Božská pomoc…), nebo null. */
export function activeFromPrayer(c: Character, p: Prayer, units: number, round: number | null): Omit<ClericActivePrayer, 'uid'> | null {
  const f = p.fx;
  if (!f || (!f.active && !f.aura)) return null;
  const rounds = prayerRounds(c, p, units);
  if (f.aura && rounds == null && !f.active) return null; // okamžité aury (Probuzení, Strach)
  const a = f.active ?? {};
  return {
    id: p.id, name: p.nazev,
    ...(f.aura ? { aura: true } : {}),
    ...(a.zo ? { zo: a.zo } : {}), ...(a.atk ? { atk: a.atk } : {}), ...(a.def ? { def: a.def } : {}), ...(a.dr ? { dr: a.dr } : {}),
    ...(a.barrier ? { barrier: Math.max(0, units) } : {}),
    ...(a.tempHp ? { tempHp: 10 + c.progression.level } : {}),
    ...(a.weapon ? { note: `zbraň ${a.weapon}` } : a.next ? { note: `+${a.next} k dalšímu hodu` } : a.note ? { note: a.note } : {}),
    until: rounds != null && round != null ? round + rounds : null,
  };
}

/** Bonus k ZO z aktivních proseb (Štít víry +3, Aura svatého štítu +2) – stejné prosby se nesčítají. */
export function clericZo(c: Character): { total: number; parts: string[] } {
  if (!isCleric(c)) return { total: 0, parts: [] };
  const seen = new Set<string>();
  const list = live(c).filter((a) => a.zo && !seen.has(a.id) && seen.add(a.id) && !(a.barrier === 0 && a.id === 'stit_viry'));
  return { total: list.reduce((s, a) => s + (a.zo ?? 0), 0), parts: list.map((a) => `${a.name} +${a.zo}`) };
}

/** Hodnoty posla podle úrovně klerika (H13 Tabulka poslů – ⚠ odhad z příkladu; PPP06 pevné). Hráč je může upravit. */
export function messengerStats(c: Character, id: string): Omit<ClericMessenger, 'uid' | 'until'> {
  const L = c.progression.level;
  const h = CLERIC.poslove.h13.list[id];
  if (h) {
    // Příklad H13: posel bojovník 4. úrovně – ÚČ a OČ +2, ZO +1 proti tabulce → +1 ÚČ/OČ za 2 úrovně, ZO +1 za 4 (⚠ odhad).
    const grow = id === 'posel_bojovnik' ? { uc: Math.floor(L / 2), oc: Math.floor(L / 2), zo: Math.floor(L / 4) } : { uc: 0, oc: 0, zo: 0 };
    const hp = (h.hpPerLevel ?? 0) * L;
    return {
      id, name: h.n, level: L, hp, hpMax: hp, uc: h.uc != null ? h.uc + grow.uc : null, dmg: h.dmg ?? null,
      zo: h.zo + grow.zo, oc: h.oc + grow.oc, higher: L + 10,
      note: `${h.attack ? h.attack : 'neútočí'} · ${h.mobility ?? ''} · hodnoty z OCR H13 – ověř podle tabulky`,
    };
  }
  const p = CLERIC.poslove.ppp06.list[id];
  return {
    id, name: p?.n ?? id, level: L, hp: p?.hp ?? 0, hpMax: p?.hp ?? 0, uc: p?.uc ?? null, dmg: p?.dmg ?? null, zo: p?.zo ?? 0, oc: p?.oc ?? 0,
    higher: p?.vyssi_moc ?? 0, note: `${p?.attack ?? 'neútočí'} · rezistence: ${CLERIC.poslove.ppp06.rezistence} · imunity: ${CLERIC.poslove.ppp06.imunity}`,
  };
}

// ---------------------------------------------------------------- Přízeň, modlitby, Zvolání

/** Pravidelná modlitba: +⅓ maxima (nahoru), nikdy nad maximum (H13). Avatar: měsíc se nedoplňuje (PPP06). */
export function prayerGain(c: Character, max: number | null): number {
  if (max == null || cle(c).avatar?.drained) return 0;
  return Math.max(0, Math.min(Math.ceil(max / 3), max - c.vitals.manaCurrent));
}
export function prayWhy(c: Character, max: number | null): string {
  const S = cle(c);
  if (max == null) return 'zadej maximum Přízně';
  if (S.prayersToday >= 3) return 'dnes už 3 modlitby';
  if (S.avatar?.drained) return 'Avatar – měsíc se Přízeň nedoplňuje';
  if (c.play.combat) return 'mimo boj (1 směna)';
  return '';
}

/** Zvolání (H13): 1× za úroveň, i bez Přízně; neúspěch možnost na úrovni propálí. Flagelantství ji obnoví. */
export const callWhy = (c: Character) => (cle(c).callLevel === c.progression.level ? 'na této úrovni už použito' : '');

/** Dar života (PPP06, automaticky od 6. úrovně): léčivé prosby o ¼ víc, nejméně +1. */
export const darZivota = (c: Character) => isCleric(c) && c.progression.level >= CLERIC.darZivota.uroven;
export const darBonus = (heal: number) => (heal > 0 ? Math.max(1, Math.ceil(heal / 4)) : 0);

/** Hod léčení / zranění prosby: „1k6“, „2k6“, „1k6+3“, „5k6+6“ × jednotky. */
export function rollFormula(f: string, times: number, die: (n: number) => number): { faces: number[]; total: number } {
  const m = f.match(/^(\d+)k(\d+)(?:\+(\d+))?$/);
  if (!m) return { faces: [], total: 0 };
  const faces: number[] = [];
  let total = 0;
  for (let t = 0; t < Math.max(1, times); t++) {
    for (let i = 0; i < +m[1]; i++) { const r = die(+m[2]); faces.push(r); total += r; }
    total += +(m[3] ?? 0);
  }
  return { faces, total };
}

/** Maximum Přízně po úpravách klerika: Asketismus ×2 (slib dodržen), Ikony −10 za každou (PPP06). */
export function clericManaAdjust(c: Character, base: number): { value: number; parts: string[] } {
  if (!isCleric(c)) return { value: base, parts: [] };
  const S = cle(c);
  let v = base;
  const parts: string[] = [];
  if (hasAbility(c, 'asketismus') && S.vowKept) { v *= 2; parts.push('× 2 Asketismus'); }
  if (hasAbility(c, 'ikony') && S.icons.length) { v -= 10 * S.icons.length; parts.push(`− ${10 * S.icons.length} Ikony (${S.icons.length})`); }
  return { value: Math.max(0, v), parts };
}

// ---------------------------------------------------------------- boj

/** Bonusy klerika ke zbrani: Boží bojovník +2 ÚČ/OČ, nauka Bojovníků víry +1 ÚČ, Boj zblízka +1/+1 tváří v tvář, Posvátná zbraň +2, aury. */
export function clericWeaponBonus(c: Character, w: WeaponInfo | null, weaponUid: string | null): WeaponBonus {
  const b: WeaponBonus = { atk: 0, def: 0, dmg: 0, init: 0, parts: [] };
  if (!isCleric(c)) return b;
  if (hasAbility(c, 'bozi_bojovnik')) { b.atk += 2; b.def += 2; b.parts.push('Boží bojovník: ÚČ +2, OČ +2'); }
  if (c.progression.learnedBranches.includes('bojovnici_viry')) { b.atk += 1; b.parts.push('Bojovníci víry: ÚČ +1'); }
  if (spec(c) === 'bojovy_mnich' && (!w || w.kind === 'melee')) { b.atk += 1; b.def += 1; b.parts.push('Boj zblízka: ÚČ +1, OČ +1 (tváří v tvář)'); }
  const S = cle(c);
  if (hasAbility(c, 'posvatna_zbran') && weaponUid && S.holyWeaponUid === weaponUid) { b.atk += 2; b.dmg += 2; b.parts.push('Posvátná zbraň: útočnost +2, zranění +2 (svěcené)'); }
  for (const a of live(c)) {
    if (a.atk) { b.atk += a.atk; b.parts.push(`${a.name}: ÚČ +${a.atk}`); }
    if (a.def) { b.def += a.def; b.parts.push(`${a.name}: OČ +${a.def}`); }
  }
  return b;
}

/** Fanatismus (Bojový mnich, PPP06): 3 Útoky za 2 kola (liché kolo 2, sudé 1), od 12. úrovně 2 každé kolo. */
export function clericRound(c: Character, round: number, base: { atk: RoundCount; def: RoundCount }): { atk: RoundCount; def: RoundCount } {
  if (!isCleric(c) || !hasAbility(c, 'fanatismus')) return base;
  const atk = { ...base.atk, parts: [...base.atk.parts] };
  const two = c.progression.level >= 12 || round % 2 === 1;
  if (two) { atk.n += 1; atk.parts.push(`Fanatismus +1${c.progression.level >= 12 ? '' : ' (liché kolo)'}`); }
  else atk.parts.push(`Fanatismus – další útok v ${round + 1}. kole`);
  return { atk, def: base.def };
}

/** Kvalita zbroje navíc: Boží zbroj +1 (Bojový mnich, posvěcená nošená zbroj). */
export const divineArmorBonus = (c: Character) => (isCleric(c) && hasAbility(c, 'bozi_zbroj') && cle(c).divineArmor ? 1 : 0);

/** Neupadá do bezvědomí (Inkvizitorský výcvik, PPP06) – jako Urputnost. */
export const noKnockout = (c: Character) => isCleric(c) && hasAbility(c, 'inkvizitorsky_vycvik');

/** Situační bonusy – appka je jen ukáže (záložka Klerik, boj). */
export function clericNotes(c: Character): { source: string; text: string }[] {
  if (!isCleric(c)) return [];
  const out: { source: string; text: string }[] = [];
  if (c.progression.learnedBranches.includes('demonologie')) out.push({ source: 'Démonologie', text: '+1 ÚČ i OČ proti běsům, ďáblům, démonům, nemrtvým, neviděným, přírodním, světlým a temným bytostem.' });
  if (c.progression.learnedBranches.includes('zehnani_aurami')) out.push({ source: 'Žehnání aurami', text: 'Čte aury – pozná nemocné, prokleté a požehnané.' });
  if (hasAbility(c, 'dar_slitovani')) out.push({ source: 'Dar slitování', text: CLERIC.schopnosti.dar_slitovani.text });
  if (hasAbility(c, 'pozehnane_zdravi')) out.push({ source: 'Požehnané zdraví', text: 'Imunní vůči nemocem.' });
  for (const id of ['nositel_slova', 'pozehnani', 'lovec_carodejnic', 'posvatny_vliv', 'desobijec', 'nadprirozeny_boj', 'svetlonos', 'kletby', 'bozi_ochrana', 'bozske_mantry']) {
    if (!hasAbility(c, id)) continue;
    const a = CLERIC.schopnosti[id];
    out.push({ source: a.name, text: id === 'desobijec' ? `Proti nemrtvým, neviděným, démonům a nadpozemským +${2 * Math.max(1, Math.floor(c.progression.level / 6))} ÚČ, ZO i Zranění.` : a.text });
  }
  const sp = spec(c) ? CLERIC.specializace[spec(c)!] : null;
  if (sp) for (const a of sp.auto) if (a.id !== 'boj_zblizka') out.push({ source: a.name, text: a.text });
  if (darZivota(c)) out.push({ source: CLERIC.darZivota.nazev, text: CLERIC.darZivota.efekt });
  return out;
}

/**
 * Po zaplacení prosby (mimo boj i v boji): aktivní prosba na klerika (aura, Štít víry…), přivolaný posel,
 * spotřebované Oběti, Zastavení dění 1× za souboj, dočasné životy Božské pomoci.
 */
export function afterPrayer(c: Character, p: Prayer, units: number): Character {
  const round = c.play.combat?.round ?? null;
  const a = activeFromPrayer(c, p, units, round);
  const S = cle(c);
  // Posel stezky / bojovník / rovnováhy / umlčení / lovec mají kartu; strážní a doménoví poslové (PPP06) jen záznam.
  const card = MESSENGERS.has(p.id) && !['posel_peceti', 'posel_bdelosti', 'posel_domeny'].includes(p.id);
  const next: ClericState = {
    ...S, offering: false,
    active: a ? [...S.active.filter((x) => x.id !== p.id), { uid: uid(), ...a }] : S.active,
    messenger: card ? { uid: uid(), ...messengerStats(c, p.id), until: /10 kol/.test(p.trvani ?? '') && round != null ? round + 10 : null } : S.messenger,
  };
  let out: Character = { ...c, classState: { ...c.classState, klerik: next } };
  if (a?.tempHp) out = { ...out, vitals: { ...out.vitals, hpCurrent: out.vitals.hpCurrent + a.tempHp } };
  if (p.id === 'zastaveni_deni' && out.play.combat) out = { ...out, play: { ...out.play, combat: { ...out.play.combat, cle: { ...out.play.combat.cle, stop: true } } } };
  return out;
}

