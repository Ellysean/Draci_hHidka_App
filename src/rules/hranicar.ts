// Hraničář (7c.1): kouzla H09 + PPP02, směry magie, schopnosti, specializace, pasti, bojové schopnosti.
// Data: src/data/magie.json (tools/build-magie.py) a src/data/hranicar.json (tools/build-hranicar.py).
import magieJson from '../data/magie.json';
import rangerJson from '../data/hranicar.json';
import type { Character } from '../model/types';
import type { ActiveWeapon, RoundCount, WeaponBonus, WeaponInfo } from './valecnik';

// ---------------------------------------------------------------- data

export interface Cost { text: string; base?: number | null; per?: string; variable?: boolean; perTargetLevel?: number; alt?: number }
export interface Dc { text: string; base: number | null; step?: number; stepPer?: string }
export interface Cast { text: string; kind: 'okamzita' | 'kratka' | 'dlouha' | 'kola' | 'minuty' | 'smeny' | 'hodiny' | 'jine'; n: number | null; rounds: number | null }
export interface MagicSpell {
  id: string; nazev: string; zdroj: string; strana: number | null; trida: string; skupina: string; typ: 'kouzlo' | 'past' | 'odvar';
  cena: Cost; obtiznost: Dc; vyvolani: Cast; dosah: string | null; rozsah: string | null; trvani: string | null;
  overeni: string | null; stitky: string[]; popis: string; zaklad?: string; cetnost?: string; pouziti?: string;
  ucinek?: Record<string, unknown>;
  learn: { mode: 'auto' | 'pick'; requires: string[]; minLevel?: number };
  /** Kouzelník (H11, PPP04): obor (divoka, ochranna…), specializace, zaklínadlo / latinský název. */
  obor?: string; spec?: string; zaklinadlo?: string; latinsky?: string;
}
export interface Trap {
  id: string; nazev: string; vyroba: string; vyzaduje: string; obtiznost: number; cena?: string; popis: string;
  ucinek: { damage?: string; damageType?: string; save?: string; escape?: string; trapped?: boolean; knockback?: string; maxSize?: string; penalty?: number; after?: string; onFail?: Record<string, unknown> };
}
interface RangerData {
  pravidla: Record<string, string>;
  smery: { id: string; nazev: string; efekt: string; popis: string; kouzla_auto: string[] }[];
  schopnosti: Record<string, { name: string; text: string; source: string; page: number | null; spec: string | null; minLevel: number | null }>;
  specializace: Record<string, { name: string; page: number; auto: { name: string; text: string }[]; rules: string[]; requires: string[] }>;
  pokrocily: { level: number; skills: { id: string; name: string; rank: number; text: string }[]; spells: string };
  pasti: { pravidlo: string; polozky: Trap[] };
}

export const RANGER = rangerJson as unknown as RangerData;
export const RANGER_SPELLS = (magieJson as unknown as { hranicar: { kouzla: MagicSpell[] } }).hranicar.kouzla;

/** Čitelný název skupiny kouzel (směr, schopnost, specializace). */
export const GROUP_LABEL: Record<string, string> = {
  zakladni: 'Základní kouzla', magie_pocestnych: 'Magie pocestných', magie_prirody: 'Magie přírody', magie_zvirat: 'Magie zvířat',
  dalsi_hranicarska_kouzla_od_6_ur: 'Další hraničářská kouzla (od 6. úr.)', magie_hranicarskeho_luku: 'Magie Hraničářského luku',
  magie_hranicarskeho_kone: 'Magie Hraničářského koně', chodecka_magie: 'Chodecká magie', magie_lovcu_monster: 'Magie lovců monster',
  magie_chodcova_mece: 'Magie Chodcova meče', soustredeni_dusevni_sily: 'Soustředění Duševní síly', magicke_pasti: 'Magické pasti',
  druidova_kouzla: 'Druidova kouzla', dary_prirody: 'Dary přírody', druidske_ritualy: 'Druidské rituály', magie_lesa: 'Magie lesa',
  magie_hvozdu: 'Magie hvozdu', divoke_pokriky: 'Divoké pokřiky', magie_smecky: 'Magie smečky', pokrocila_magie_zvirat: 'Pokročilá Magie zvířat',
};

export const isRanger = (c: Character) => c.basic.classId === 'hranicar';
export const hasAbility = (c: Character, id: string) => c.progression.learnedAbilities.some((a) => a.id === id);

/** Co postava ovládá: směry, schopnosti a specializace (podle id). */
export function rangerOwned(c: Character): Set<string> {
  const s = new Set<string>([...c.progression.learnedBranches, ...c.progression.learnedAbilities.map((a) => a.id)]);
  if (c.progression.specialization) s.add(c.progression.specialization);
  return s;
}

/** Proč hraničář kouzlo (past, odvar) nezná – prázdný řetězec = zná ho. */
export function spellLock(c: Character, s: MagicSpell, level = c.progression.level, own = rangerOwned(c)): string {
  const miss = s.learn.requires.filter((r) => !own.has(r));
  if (miss.length) return `vyžaduje ${miss.map((r) => GROUP_LABEL[r] ?? RANGER.schopnosti[r]?.name ?? RANGER.specializace[r]?.name ?? r).join(' + ')}`;
  if (s.learn.minLevel && level < s.learn.minLevel) return `od ${s.learn.minLevel}. úrovně`;
  return '';
}

/** Kouzla, pasti a odvary, které hraničář zná – vždy automaticky ze směrů, schopností a specializace (✔ U). */
export function knownRangerSpells(c: Character): MagicSpell[] {
  if (!isRanger(c)) return [];
  const own = rangerOwned(c);
  return RANGER_SPELLS.filter((s) => !spellLock(c, s, c.progression.level, own));
}

/** Délka vyvolání ve zkratce boje (O / K / D / 2D / Nk / M), jak ji používá hlídání akcí. */
export function castLen(v: Cast): string {
  switch (v.kind) {
    case 'okamzita': return 'O';
    case 'kratka': return 'K';
    case 'dlouha': return (v.n ?? 1) > 1 ? `${Math.min(9, v.n!)}D` : 'D';
    case 'kola': return (v.n ?? 1) > 1 ? `${v.n}k` : 'D';
    default: return 'M';
  }
}

/** Převod na tvar kouzla pro boj (SpellDef v rules/combat.ts). */
export function toSpellDef(s: MagicSpell): { n: string; l: string; c: string; o: number; x: string } {
  const t = s.vyvolani.text.toLowerCase();
  const reaction = /obran/.test(t) ? 'reakce – v obraně' : /útok/.test(t) ? 'v útoku' : '';
  return {
    n: s.nazev,
    l: s.typ === 'kouzlo' ? castLen(s.vyvolani) : 'M',
    c: s.cena.base == null && !s.cena.variable ? 'X' : s.cena.text,
    o: s.obtiznost.base ?? 0,
    x: [reaction, s.overeni ? `ověření: ${s.overeni}` : ''].filter(Boolean).join(' · '),
  };
}

// ---------------------------------------------------------------- Duševní síla

/** Obnova Duševní síly do maxima – jen když je hraničář Svěží (H09). */
export function restoreWhy(c: Character): string {
  return c.vitals.fatigueLevel > 0 ? 'jen Svěží (bez únavy)' : '';
}

// ---------------------------------------------------------------- boj

const isBow = (w: ActiveWeapon) => w.kind === 'ranged' && /luk/i.test(w.name ?? '');
const isStaff = (w: ActiveWeapon) => w.kind === 'melee' && w.path === 'cesta_hole_a_kopi';

/**
 * Útoky a obrany hraničáře za kolo (H09): Rychlá střelba z luku = 3 útoky (i obrany) za 2 kola – v lichém kole 2,
 * v sudém 1; od 6. úrovně 2 každé kolo. Bojová hůl: s holí, kopím a dřevcovými zbraněmi 1 Aktivní obrana navíc.
 */
export function rangerRound(c: Character, w: ActiveWeapon, round: number): { atk: RoundCount; def: RoundCount } {
  const atk: RoundCount = { n: 1, unlimited: false, parts: [], cdSources: [] };
  const def: RoundCount = { n: 1, unlimited: false, parts: [], cdSources: [] };
  if (!isRanger(c)) return { atk, def };
  if (isBow(w) && hasAbility(c, 'rychla_strelba')) {
    const two = c.progression.level >= 6 || round % 2 === 1;
    if (two) {
      for (const x of [atk, def]) { x.n += 1; x.parts.push(`Rychlá střelba +1${c.progression.level >= 6 ? '' : ' (liché kolo)'}`); }
    } else {
      for (const x of [atk, def]) x.parts.push(`Rychlá střelba – další v ${round + 1}. kole`);
    }
  }
  if (isStaff(w) && hasAbility(c, 'bojova_hul')) { def.n += 1; def.parts.push('Bojová hůl +1'); }
  return { atk, def };
}

/** Bonusy hraničáře ke zbrani: Bojová hůl +2 OČ, Obratné ostří (OBR místo SIL u mečů, je-li lepší). */
export function rangerWeaponBonus(c: Character, w: WeaponInfo | null, x: { sil: number; obr: number; path: string | null }): WeaponBonus {
  const b: WeaponBonus = { atk: 0, def: 0, dmg: 0, init: 0, parts: [] };
  if (!isRanger(c) || !w) return b;
  if (w.kind === 'melee' && x.path === 'cesta_hole_a_kopi' && hasAbility(c, 'bojova_hul')) { b.def += 2; b.parts.push('Bojová hůl: OČ +2, obrana navíc'); }
  if (w.kind === 'melee' && x.path === 'cesta_mece' && hasAbility(c, 'obratne_ostri') && x.obr > x.sil) {
    b.atk += x.obr - x.sil; b.parts.push(`Obratné ostří (OBR místo SIL): ÚČ +${x.obr - x.sil}`);
  }
  return b;
}

/** Bonusy, které závisejí na situaci – appka je jen ukáže (záložka Příroda, boj). */
export function rangerNotes(c: Character): { source: string; text: string }[] {
  if (!isRanger(c)) return [];
  const out: { source: string; text: string }[] = [];
  const say = (id: string, text?: string) => { if (hasAbility(c, id) || c.progression.specialization === id) out.push({ source: RANGER.schopnosti[id]?.name ?? RANGER.specializace[id]?.name ?? id, text: text ?? RANGER.schopnosti[id]?.text ?? '' }); };
  say('boj_se_zviraty', '+2 ÚČ i OČ proti zvířatům, bestiím a hmyzu.');
  say('presna_strelba', '1 kolo míření (při více útocích vynechá jeden) → další útok +6. Neživý cíl do 20 sáhů obvykle zasáhne automaticky.');
  say('lovcova_korist');
  say('strelba_na_kratkou_vzdalenost');
  say('urputna_strelba');
  say('instinkt_lovce');
  say('jista_ruka');
  say('boj_ve_smecce');
  if (c.progression.specialization === 'druid') out.push({ source: 'Druidské svěcení', text: 'Ve hvozdu Výhoda +5 k Pouto s přírodou, v běžné přírodě +3; ve městech Nevýhoda −5 u Druidových kouzel.' });
  return out;
}

// ---------------------------------------------------------------- pasti

/** Pasti H09 se líčí dovedností Líčení pastí (Průzkumnictví); proč to nejde, nebo ''. */
export const trapWhy = (c: Character) => (c.skills.some((s) => s.id === 'liceni_pasti') ? '' : 'chybí dovednost Líčení pastí (Průzkumnictví)');
