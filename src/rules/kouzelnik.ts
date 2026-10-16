// Kouzelník (7c.2): kouzla H11 + PPP04, obory, schopnosti, hůl, sesílání s postihy a bonusy, aktivní kouzla.
// Data: src/data/magie.json (tools/build-magie.py) a src/data/kouzelnik.json (tools/build-kouzelnik.py).
// Čisté výpočty – změny stavu (meditace, nasátí, Rituál krve…) jsou v rules/kouzelnik-akce.ts.
import magieJson from '../data/magie.json';
import wizJson from '../data/kouzelnik.json';
import type { Character, WizardCastMods, WizardState, WizardStaff } from '../model/types';
import { emptyWizard } from '../model/defaults';
import type { Derived } from './derive';
import type { Cast, MagicSpell } from './hranicar';
import type { RoundCount, WeaponBonus } from './valecnik';
import type { SpellDef } from './combat';

// ---------------------------------------------------------------- data

export interface WizAbility {
  name: string; text: string; full: string; source: string; page: number | null; spec: string | null; minLevel: number | null;
  sesilani?: Record<string, unknown>; efekty?: unknown[]; nasati?: { fixed?: number; len?: string }; technika?: { len: string; fatigue?: number; range: string };
  dominance?: { manaPerDie: number }; duel?: { manaPerRound: number }; manaCap?: number; atk?: number; grantsItems?: string[];
}
export type StaffKind = WizardStaff['kind'];
interface StaffVariant { name: string; spec: string | null; manaPerLevel: number; castBonus: number; extra: string[]; full?: string; weapon?: string; lifePerLevel?: number }
interface WizData {
  pravidla: Record<string, string> & { postihy: { bezReci: number; bezGest: number; bezReciAGest: number; zbroj: string } };
  oborBranch: Record<string, string>;
  oborKey: Record<string, string>;
  schopnosti: Record<string, WizAbility>;
  specializace: Record<string, { name: string; page: number; intro: string; auto: string; requires: string[]; pppAbility: string }>;
  pokrocily: { level: number; intro: string; zaslechnuti: string; pratele: string };
  hul: { page: number; ritual: string; schopnosti: string; manaPerLevel: number; oborBonus: number; varianty: Record<StaffKind, StaffVariant> };
  trik: { mana: number; len: string; text: string };
}

export const WIZ = wizJson as unknown as WizData;
export const WIZARD_SPELLS = (magieJson as unknown as { kouzelnik: { kouzla: MagicSpell[] } }).kouzelnik.kouzla;
export const spellByName = (n: string) => WIZARD_SPELLS.find((s) => s.nazev === n);

/** Názvy oborů (id větve → název). */
export const OBOR_NAME: Record<string, string> = {
  divoka_magie: 'Divoká magie', magie_promen: 'Magie proměn', mentalni_magie: 'Mentální magie',
  ochranna_magie: 'Ochranná magie', vitalni_magie: 'Vitální magie', vysoka_magie: 'Vysoká magie',
};
const SPEC_NAME: Record<string, string> = { bojovy_mag: 'Bojový mág', carodej: 'Čaroděj', nekromant: 'Nekromant' };

/** Obor kouzla jako id větve (divoka_magie…) – u obecných kouzel podle PPP04 s. 213. */
export const spellBranch = (s: MagicSpell): string | null => (s.obor ? WIZ.oborKey[s.obor] ?? null : null);

export const isWizard = (c: Character) => c.basic.classId === 'kouzelnik';
export const hasAbility = (c: Character, id: string) => c.progression.learnedAbilities.some((a) => a.id === id);
export const wiz = (c: Character): WizardState => c.classState.kouzelnik ?? emptyWizard();

/** Obory, ve kterých je kouzelník Magistr (PPP04, opakovaně pro různé obory). */
export const magisterOf = (c: Character): string[] =>
  c.progression.learnedAbilities.filter((a) => a.id === 'magistr_magickeho_oboru').map((a) => String(a.params?.obor ?? '')).filter(Boolean);

// ---------------------------------------------------------------- co kouzelník umí / smí se naučit

export interface LearnCtx { level: number; own: Set<string>; spec: string | null }

/** Kontext učení: obory (id větví), schopnosti a specializace – volitelně s volbami z právě probíhajícího přestupu. */
export function wizardCtx(c: Character, extra?: { level?: number; branch?: string | null; ability?: string | null; spec?: string | null }): LearnCtx {
  const own = new Set<string>([...c.progression.learnedBranches, ...c.progression.learnedAbilities.map((a) => a.id)]);
  if (extra?.branch) own.add(extra.branch);
  if (extra?.ability) own.add(extra.ability);
  const spec = c.progression.specialization ?? extra?.spec ?? null;
  if (spec) own.add(spec);
  return { level: extra?.level ?? c.progression.level, own, spec };
}

/** Kouzla, která dá schopnost automaticky (Sběratel duší → Pokročilá reanimace) – nejdou do běžných slotů. */
export const GRANTED_ONLY = new Set(Object.values(WIZ.schopnosti).flatMap((a) => a.grantsItems ?? []));

/** Proč se kouzelník kouzlo zatím nemůže naučit – prázdný řetězec = smí (obor, 6. úroveň u PPP04, specializace). */
export function learnLock(s: MagicSpell, x: LearnCtx): string {
  const miss = s.learn.requires.map((r) => WIZ.oborBranch[r] ?? r).filter((r) => !x.own.has(r));
  if (miss.length) return `vyžaduje ${miss.map((r) => OBOR_NAME[r] ?? SPEC_NAME[r] ?? WIZ.schopnosti[r]?.name ?? r).join(' + ')}`;
  if (s.learn.minLevel && x.level < s.learn.minLevel) return `od ${s.learn.minLevel}. úrovně`;
  return '';
}

/** Kouzla, která kouzelník zná: naučená (tvorba, přestupy, Záměna) + ta, která dá schopnost automaticky. */
export function knownWizardSpells(c: Character): MagicSpell[] {
  if (!isWizard(c)) return [];
  const names = new Set(c.progression.learnedItems);
  for (const a of c.progression.learnedAbilities) for (const n of WIZ.schopnosti[a.id]?.grantsItems ?? []) names.add(n);
  return WIZARD_SPELLS.filter((s) => names.has(s.nazev));
}

/** Skupina kouzla v nabídce přestupu a na záložce. */
export function spellGroup(s: MagicSpell): string {
  const b = spellBranch(s);
  if (s.skupina === 'obecna') return 'Obecná magie';
  const name = b ? OBOR_NAME[b] : s.skupina;
  if (s.zdroj !== 'PPP04') return name;
  return s.spec ? `${name} – ${SPEC_NAME[s.spec] ?? s.spec} (PPP04)` : `${name} – pro pokročilé (PPP04)`;
}

export interface WizPoolItem { name: string; group: string; branchId: string | null; fresh: boolean }

/**
 * Nabídka kouzel při přestupu: obecná magie, kouzla ovládaných oborů (H11) a od 6. úrovně kouzla pro pokročilé
 * PPP04 ovládaných oborů (u označených jen se specializací, ✔ U 1. 10. 2026). Počítá i s volbou z tohoto přestupu.
 * `branchId` = obor kouzla (i u obecných) – podle něj se hlídají 3 kouzla Magistra.
 */
export function wizardPool(c: Character, now: LearnCtx): WizPoolItem[] {
  const before = wizardCtx(c);
  return WIZARD_SPELLS.filter((s) => !GRANTED_ONLY.has(s.nazev) && !learnLock(s, now)).map((s) => ({
    name: s.nazev, group: spellGroup(s), branchId: spellBranch(s), fresh: !!learnLock(s, before),
  }));
}

// ---------------------------------------------------------------- mana

/** Strop many: s Vládcem many (Čaroděj) o polovinu víc než maximum (PPP04 s. 208: 65 → 98). */
export function manaCap(c: Character, max: number | null): number | null {
  if (max == null) return null;
  return hasAbility(c, 'vladce_many') ? Math.ceil(max * 1.5) : max;
}

/** Meditace (H11): 1× denně, jen Svěží; doplní manu do maxima (s Vládcem many přidá maximum až do stropu). */
export function meditateWhy(c: Character, d: Derived): string {
  if (d.manaMax.value == null) return 'neznámé maximum many';
  if (wiz(c).meditatedToday) return 'dnes už meditoval';
  if (c.vitals.fatigueLevel > 0) return 'jen Svěží (bez únavy)';
  if (c.play.combat) return 'meditace trvá směnu – ne v boji';
  const cap = manaCap(c, d.manaMax.value)!;
  if (c.vitals.manaCurrent >= (hasAbility(c, 'vladce_many') ? cap : d.manaMax.value)) return 'mana je plná';
  return '';
}
export function meditationResult(c: Character, max: number): number {
  const cur = c.vitals.manaCurrent;
  return hasAbility(c, 'vladce_many') ? Math.min(manaCap(c, max)!, cur + max) : Math.max(cur, max);
}

/** Nasátí many (H11): max. tolikrát denně, kolik je úroveň; +1k6 (Citlivost na vichry many: 6) do maxima. */
export function drawWhy(c: Character, d: Derived): string {
  const max = d.manaMax.value;
  if (max == null) return 'neznámé maximum many';
  if (wiz(c).manaDrawsToday >= c.progression.level) return `dnes už ${c.progression.level}× (= úroveň)`;
  if (c.vitals.manaCurrent >= max) return 'mana je plná';
  if (c.play.combat && !hasAbility(c, 'bitevni_trenink')) return 'nasátí trvá minutu – v boji jen s Bitevním tréninkem';
  return '';
}
export const drawFixed = (c: Character) => (hasAbility(c, 'citlivost_na_vichry_many') ? 6 : null);

/** Rituál krve (H11): životy → mana 2 : 1 do maxima; s Nekromantovou dýkou (Krev v manu) až 3 životy za 3 many v kole. */
export function bloodCost(mana: number, dagger: boolean) { return dagger ? mana : 2 * mana; }
export function bloodWhy(c: Character, d: Derived, mana: number, dagger: boolean): string {
  if (!hasAbility(c, 'ritual_krve')) return 'chybí schopnost Rituál krve';
  const max = d.manaMax.value;
  if (mana < 1) return 'zadej manu';
  if (dagger && !(staffOf(c)?.kind === 'dyka')) return 'chybí Nekromantova dýka';
  if (dagger && mana > 3) return 'dýkou nejvýš 3 za kolo';
  if (max != null && c.vitals.manaCurrent + mana > max) return `nejvýš do maxima (${max})`;
  if (c.vitals.hpCurrent - bloodCost(mana, dagger) < 1) return 'málo životů';
  return '';
}

// ---------------------------------------------------------------- hůl

/** Hůl (nebo její varianta), kterou kouzelník vlastní – vyrábí se až od 6. úrovně (PPP04 s. 191). */
export const staffOf = (c: Character): WizardStaff | null => (wiz(c).staff.owned ? wiz(c).staff : null);
export const staffVariant = (k: StaffKind) => WIZ.hul.varianty[k];
export const staffCapacity = (c: Character) => { const s = staffOf(c); return s ? staffVariant(s.kind).manaPerLevel * c.progression.level : 0; };
export const lifeCapacity = (c: Character) => 2 * c.progression.level;
/** Varianty hole, které kouzelník smí vyrobit (běžná hůl vždy, další podle specializace). */
export const staffKinds = (c: Character): StaffKind[] =>
  (Object.keys(WIZ.hul.varianty) as StaffKind[]).filter((k) => !staffVariant(k).spec || staffVariant(k).spec === c.progression.specialization);
export const staffWhy = (c: Character) => (c.progression.level < WIZ.pokrocily.level ? `od ${WIZ.pokrocily.level}. úrovně (Pokročilý kouzelník)` : '');
const staffInHand = (c: Character) => { const s = staffOf(c); return s && s.inHand ? s : null; };

// ---------------------------------------------------------------- sesílání: postihy, bonusy, délka, cena

export interface CastProfile {
  dc: number | null; dcParts: string[];
  bonus: number; bonusParts: string[];
  /** Délka pro boj (O / K / D / 2D / Nk / M) a slovně. */
  len: string;
  lenText: string;
  /** Konečná cena z ceny zadané hráčem (Posílená ochrana, Posilování, Hromadné sesílání). */
  cost: (price: number) => number;
  costParts: string[];
  /** Rozpor ve volbách (Rychlé + Precizní…) – nejde seslat. */
  why: string;
}

const castRounds = (v: Cast): number | null => {
  if (v.kind === 'okamzita') return 0;
  if (v.kind === 'kratka') return 0.5;
  if (v.kind === 'dlouha' || v.kind === 'kola') return Math.max(1, v.n ?? 1);
  return null;
};
const roundsToLen = (r: number | null): string => {
  if (r == null) return 'M';
  if (r === 0) return 'O';
  if (r <= 0.5) return 'K';
  if (r <= 1) return 'D';
  const n = Math.ceil(r);
  return n <= 9 ? `${n}D` : `${n}k`;
};
const lenWords = (l: string) =>
  l === 'O' ? 'okamžitá' : l === 'K' ? 'krátká' : l === 'D' ? 'dlouhá' : l === 'M' ? 'mimo boj' : /^\dD$/.test(l) ? `${l[0]} dlouhé akce` : `${parseInt(l, 10)} kol`;

const armorPenalty = (d: Derived | null) => {
  const a = d?.armor;
  return a && a.equipped && /střední|těžk/i.test(a.category) ? a.quality : 0;
};

export interface CastOpts { book?: boolean }

/**
 * Profil seslání kouzla podle voleb (H11, PPP04): Rychlé kouzlení (½ vyvolání, +3), Precizní (2×, +5), Kouzlení z knih
 * (2×, +3 za cizí obor, +5 za jinou specializaci), bez řeči / gest (−5, Utajené −2), zbroj při gestech (−kvalita),
 * vyrušení (+5, Bojové sesílání ne), hůl (+1 obor, Čarodějova +2), Magistr (+5 obor), Dar noci (+5), róba (+bonus),
 * Rituální kouzlení (+5 za kouzelníka), Posilování (+¼ ceny a +1 za dosah / trvání), Hromadné sesílání (cena × cíle, +2 za cíl navíc),
 * Posílená ochrana (ochranná kouzla −3 many, min. 1).
 */
export function castProfile(c: Character, d: Derived | null, s: MagicSpell, m: WizardCastMods = wiz(c).mods, o: CastOpts = {}): CastProfile {
  const has = (id: string) => hasAbility(c, id);
  const branch = spellBranch(s);
  const bonusParts: string[] = [];
  const dcParts: string[] = [];
  const costParts: string[] = [];
  let bonus = 0;
  let dcAdd = 0;
  const add = (n: number, t: string) => { if (n) { bonus += n; bonusParts.push(`${t} ${n > 0 ? '+' : '−'}${Math.abs(n)}`); } };
  const addDc = (n: number, t: string) => { if (n) { dcAdd += n; dcParts.push(`${t} +${n}`); } };
  let why = '';
  const quick = m.quick && has('rychle_kouzleni');
  const precise = m.precise && has('precizni_kouzleni');
  if (quick && precise) why = 'Rychlé a Precizní kouzlení nejde spojit';
  if (o.book && quick) why = 'Kouzlení z knih nejde s Rychlým kouzlením';

  // délka vyvolání
  let r = castRounds(s.vyvolani);
  const mult = (quick ? 0.5 : 1) * (precise ? 2 : 1) * (o.book ? 2 : 1);
  if (r != null && r > 0 && mult !== 1) r = Math.max(0.5, r * mult);
  const len = roundsToLen(r);

  // obtížnost
  if (quick) addDc(3, 'Rychlé kouzlení');
  if (m.interrupted && !has('bojove_sesilani')) addDc(5, 'vyrušení');
  if (has('posilovani_kouzel')) {
    if (m.boostRange && !/dotek/i.test(s.dosah ?? '')) addDc(1, 'Posilování – dosah ×2');
    if (m.boostDuration && !/^ihned|okamžit/i.test(s.trvani ?? '')) addDc(1, 'Posilování – trvání ×2');
  }
  const targets = has('hromadne_sesilani') ? Math.max(1, Math.min(c.progression.level, Math.trunc(m.targets) || 1)) : 1;
  if (targets > 1) addDc(2 * (targets - 1), `Hromadné sesílání – ${targets} cíle`);
  if (o.book) {
    const own = new Set(c.progression.learnedBranches);
    if (branch && s.skupina !== 'obecna' && !own.has(branch)) addDc(3, `Kouzlení z knih – obor ${OBOR_NAME[branch]}`);
    if (s.spec && s.spec !== c.progression.specialization) addDc(5, `Kouzlení z knih – ${SPEC_NAME[s.spec]}`);
  }
  const base = s.obtiznost.base;

  // bonusy a postihy k ověření
  const st = staffInHand(c);
  if (st && st.obor && branch === st.obor) add(WIZ.hul.oborBonus, `${staffVariant(st.kind).name} (${OBOR_NAME[st.obor]})`);
  if (st && staffVariant(st.kind).castBonus) add(staffVariant(st.kind).castBonus, staffVariant(st.kind).name);
  if (branch && magisterOf(c).includes(branch)) add(5, `Magistr – ${OBOR_NAME[branch]}`);
  if (precise) add(5, 'Precizní kouzlení');
  const hush = has('utajene_kouzleni');
  if (m.noVoice) add(hush ? -2 : -5, `bez řeči${hush ? ' (Utajené)' : ''}`);
  if (m.noGesture) add(hush ? -2 : -5, `bez gest${hush ? ' (Utajené)' : ''}`);
  const ap = armorPenalty(d);
  if (ap && !m.noGesture && !(hush && m.noVoice)) add(-ap, `zbroj při gestech (${d!.armor!.name})`);
  const robe = d?.armor?.equipped ? d.armor.magicBonus : 0;
  if (robe) add(robe, d!.armor!.name);
  if (m.night && has('dar_noci') && (branch === 'vitalni_magie' || branch === 'magie_promen' || s.spec === 'nekromant')) add(5, 'Dar noci');
  if (has('ritualni_kouzleni') && m.ritual > 0) add(5 * Math.trunc(m.ritual), `Rituální kouzlení (${Math.trunc(m.ritual)} kouzelníci)`);

  // cena
  const quarter = has('posilovani_kouzel') ? (m.boostRange && !/dotek/i.test(s.dosah ?? '') ? 1 : 0) + (m.boostDuration && !/^ihned|okamžit/i.test(s.trvani ?? '') ? 1 : 0) : 0;
  const protect = has('posilena_ochrana') && branch === 'ochranna_magie';
  if (quarter) costParts.push(`Posilování +¼ ceny ×${quarter}`);
  if (targets > 1) costParts.push(`× ${targets} cíle`);
  if (protect) costParts.push('Posílená ochrana −3');
  const cost = (price: number) => {
    let p = price;
    if (protect) p = Math.max(1, p - 3);
    if (quarter) p += quarter * Math.max(1, Math.ceil(price / 4));
    return p * targets;
  };

  return {
    dc: base == null ? null : base + dcAdd, dcParts, bonus, bonusParts, len, lenText: lenWords(len), cost, costParts, why,
  };
}

// ---------------------------------------------------------------- kouzla do boje

/** Známá kouzla jako SpellDef pro hlídání akcí – délka, obtížnost a cena podle voleb sesílání; + trik a přivolání hole. */
export function wizardSpellDefs(c: Character): SpellDef[] {
  const out: SpellDef[] = knownWizardSpells(c).map((s) => {
    const p = castProfile(c, null, s);
    const t = s.vyvolani.text.toLowerCase();
    const reaction = /obran|reakc/.test(t) ? 'reakce – v obraně' : '';
    return {
      n: s.nazev, l: p.len, c: s.cena.base == null && !s.cena.variable ? 'X' : s.cena.text, o: p.dc ?? 0,
      x: [reaction, p.dcParts.length ? `obtížnost: ${p.dcParts.join(', ')}` : '', p.costParts.join(', '), s.overeni ? `ověření: ${s.overeni}` : ''].filter(Boolean).join(' · '),
      adj: p.costParts.length ? p.cost : undefined,
    };
  });
  out.push({ n: 'Kouzelnický trik', l: 'D', c: String(WIZ.trik.mana), o: 0, x: 'drobná iluze, bez ověření', free: true });
  if (staffOf(c) && c.progression.level >= WIZ.pokrocily.level) out.push({ n: 'Přivolání hole', l: 'O', c: '1', o: 0, x: `trik – do ruky na ${c.progression.level} sáhů`, free: true });
  return out;
}

// ---------------------------------------------------------------- aktivní kouzla (ZO, Rychlost)

/** Kouzla, která se po seslání na sebe zapíšou mezi aktivní: Magický štít (+5 ZO, 2/kolo), Magická zbroj (+1 ZO za 4 many), Rychlost (3/kolo). */
export function activeFromCast(s: MagicSpell, price: number): { zo?: number; haste?: boolean; rounds: number | null } | null {
  const u = s.ucinek as { defenseBase?: number; perUnit?: boolean; extraShortAction?: number } | undefined;
  if (!u) return null;
  const per = s.cena.base || 1;
  if (u.defenseBase && u.perUnit) return { zo: u.defenseBase * Math.floor(price / per), rounds: null };
  if (u.defenseBase) return { zo: u.defenseBase, rounds: s.cena.per === 'kolo' ? Math.floor(price / per) : null };
  if (u.extraShortAction) return { haste: true, rounds: s.cena.per === 'kolo' ? Math.floor(price / per) : null };
  return null;
}

const live = (c: Character) => {
  const round = c.play.combat?.round ?? null;
  return wiz(c).active.filter((a) => a.until == null || round == null || a.until >= round);
};

/** Bonus k ZO z aktivních kouzel (Magický štít, Magická zbroj) – štíty se nesčítají, bere se nejlepší. */
export function wizardZo(c: Character): { total: number; parts: string[] } {
  if (!isWizard(c)) return { total: 0, parts: [] };
  const act = live(c).filter((a) => a.zo);
  const shield = act.filter((a) => a.id === 'magicky_stit').sort((a, b) => (b.zo ?? 0) - (a.zo ?? 0))[0];
  const rest = act.filter((a) => a.id !== 'magicky_stit');
  const list = [...(shield ? [shield] : []), ...rest];
  return { total: list.reduce((s, a) => s + (a.zo ?? 0), 0), parts: list.map((a) => `${a.name} +${a.zo}`) };
}

/** Rychlost na sebe: krátká akce, útok a obrana navíc (H11). */
export const hasteOn = (c: Character) => isWizard(c) && live(c).some((a) => a.haste);
export const shortCap = (c: Character) => 2 + (hasteOn(c) ? 1 : 0);

/** Útoky a obrany navíc z Rychlosti (doplní počty v rules/combat.ts → roundInfo). */
export function hasteRound(c: Character, r: { atk: RoundCount; def: RoundCount }) {
  if (!hasteOn(c)) return r;
  const bump = (x: RoundCount): RoundCount => ({ ...x, n: x.n + 1, parts: [...x.parts, 'Rychlost +1'] });
  return { atk: bump(r.atk), def: bump(r.def) };
}

/** Bitevní trénink (Bojový mág): +1 Útok (ÚČ); ZO +1 nese efekt v derive. */
export function wizardWeaponBonus(c: Character): WeaponBonus {
  const b: WeaponBonus = { atk: 0, def: 0, dmg: 0, init: 0, parts: [] };
  if (isWizard(c) && hasAbility(c, 'bitevni_trenink')) { b.atk += 1; b.parts.push('Bitevní trénink: ÚČ +1'); }
  return b;
}

// ---------------------------------------------------------------- Záměna kouzel, poznámky

/** Záměna kouzel (PPP04 s. 200): mezi dvěma přestupy nejvýš tolik kouzel, kolik je úroveň. */
export function swapsLeft(c: Character): number {
  if (!hasAbility(c, 'zamena_kouzel')) return 0;
  const s = wiz(c).swaps;
  const used = s.level === c.progression.level ? s.n : 0;
  return Math.max(0, c.progression.level - used);
}

/** Bonusy a schopnosti podle situace – appka je jen ukáže. */
export function wizardNotes(c: Character): { source: string; text: string }[] {
  if (!isWizard(c)) return [];
  const out: { source: string; text: string }[] = [];
  const NOTE: Record<string, string> = {
    aura_moci: 'Výhoda +5 ke všem hodům na Charisma.',
    nemrtvy_druh: 'Nemrtví ho berou jako svého; Výhoda +5 na ověření proti nemrtvým; cítí nemrtvé na 10 sáhů × úroveň.',
    srazlivost_krve: 'Rezistence na bodná a sečná zranění; krvácení se zastaví po 1 kole; krvácivá zranění se hojí 3× rychleji.',
    magicka_zranitelnost: 'Kouzla a hůl zraňují i rezistentní (plně) a imunní (napůl).',
    vitalni_drahy: 'Pozná, jak je tvor zraněný, nemrtvé a hibernované; vidí neviditelné; Výhoda +5 k Postřehu při hledání bytostí.',
    lamani_kouzel: 'Rušící kouzla (Naruš pozornost, Zlom kouzlo, Odraž kouzlo…) sesílá v tahu protivníka, i půlkolová – jen když v kole nekouzlil.',
    zivlomag: 'U kouzel Divoké magie může změnit živel (stejné zranění, jiný efekt).',
    rychly_odpocinek: 'K meditaci stačí 4 hodiny spánku; únava −2 za hodinu spánku.',
  };
  for (const [id, text] of Object.entries(NOTE)) if (hasAbility(c, id)) out.push({ source: WIZ.schopnosti[id].name, text });
  return out;
}
