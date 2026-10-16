// Válečník (Fáze 7b): triky, školy, Cesty, schopnosti a jejich bonusy ke zbraním – H08 + PPP01.
// Čisté funkce nad postavou; nic nepočítá z derive (derive naopak používá weaponBonus / passiveEffects).
import valecnikJson from '../data/valecnik.json';
import type { Character } from '../model/types';
import type { WeaponDef } from './data';

export type TrickKind = 'utok' | 'obrana' | 'soustr' | 'pohyb' | 'reakce' | 'vykrik';

export interface TrickLearn { level: number; school?: string; spec?: string; path?: string; abilities?: string[] }

export interface WarriorTrick {
  id: string;
  n: string;
  src: 'H08' | 'PPP01';
  page: number;
  group: string;
  /** Adrenalin tak, jak ho uvádí pravidla („2 nebo 3“, „2 za kolo“…). */
  adr: string;
  /** Výchozí (nejnižší) cena v adrenalinu. */
  a: number;
  /** Cenu upraví hráč (volitelná / za kolo / za cíl). */
  var: boolean;
  opts?: number[];
  use: string;
  t: TrickKind;
  roll: 'attack' | 'defense' | null;
  /** Dodatečný útok / Dodatečná obrana – nespotřebuje běžný Útok ani Aktivní obranu. */
  extra: boolean;
  req: string;
  check: string;
  learn: TrickLearn;
  /** Krátké shrnutí do tabulky v boji. */
  x: string;
  text: string;
}

export interface PathBonus { atk?: number; wdef?: number; dmg?: number; init?: number; atkMelee?: number; atkThrown?: number; defMelee?: number }
export interface PathRank { rank: number; name: string; effect: string; bonus: PathBonus; cond?: string }
export interface PathDef {
  id: string; name: string; weapons: string | null; page: number; note: string | null;
  ranks: PathRank[];
  master: { effect: string; bonus: PathBonus; trick: string };
}
export interface SchoolDef { id: string; name: string; effect: string; conditional: boolean }
export interface WarriorSpec {
  name: string; text: string; requiresH08: string[]; requiresPPP: string[];
  experience: { id: string; name: string; text: string; skills: string[] };
}

export const WARRIOR = valecnikJson as unknown as {
  general: { adrenalin: string; lecba_vlastnich_zraneni: string; triky_za_uroven: string };
  trickTypes: Record<string, string>;
  schools: SchoolDef[];
  paths: PathDef[];
  specs: Record<string, WarriorSpec>;
  advanced: Record<string, string>;
  abilityRules: Record<string, string>;
  tricks: WarriorTrick[];
};

export const TRICKS = WARRIOR.tricks;
const trickByName = new Map(TRICKS.map((t) => [t.n, t]));
export const getTrick = (name: string) => trickByName.get(name);

export const TRICK_KIND_LABEL: Record<TrickKind, string> = {
  utok: 's útokem', obrana: 's obranou', soustr: 'soustředění', pohyb: 'pohyb', reakce: 'reakce', vykrik: 'výkřik',
};

// ---------------------------------------------------------------- co postava ovládá

export const isWarrior = (c: Character) => c.basic.classId === 'valecnik';
export const hasAbility = (c: Character, id: string) => c.progression.learnedAbilities.some((a) => a.id === id);
export const abilityCount = (c: Character, id: string) => c.progression.learnedAbilities.filter((a) => a.id === id).length;
/** Stupeň Cesty (0–4); 4 = Mistr. */
export const pathRank = (c: Character, pathId: string) => Math.min(4, abilityCount(c, pathId));
export const getPath = (id: string) => WARRIOR.paths.find((p) => p.id === id);
/** Školy boje, které postava ovládá – H08 větve i Škola boje na koni (PPP01, schopnost). */
export const schoolsOf = (c: Character) => [...c.progression.learnedBranches, ...(hasAbility(c, 'skola_boje_na_koni') ? ['skola_boje_na_koni'] : [])];
export const schoolName = (id: string) => WARRIOR.schools.find((s) => s.id === id)?.name ?? id;

/** Známé triky (učí se jménem, jak je zapisuje průvodce i papírový deník). */
export function knownWarriorTricks(c: Character): WarriorTrick[] {
  if (!isWarrior(c)) return [];
  const own = new Set(c.progression.learnedItems);
  return TRICKS.filter((t) => own.has(t.n));
}

/** Rozvrh schopností pro výpočet dostupnosti triku (umožní započítat i volby z právě probíhajícího přestupu). */
export interface LearnCtx { level: number; schools: Set<string>; abilities: Map<string, number>; spec: string | null }

export function learnCtx(c: Character, extra?: { level?: number; school?: string | null; ability?: string | null; spec?: string | null }): LearnCtx {
  const abilities = new Map<string, number>();
  for (const a of c.progression.learnedAbilities) abilities.set(a.id, (abilities.get(a.id) ?? 0) + 1);
  if (extra?.ability) abilities.set(extra.ability, (abilities.get(extra.ability) ?? 0) + 1);
  const schools = new Set(c.progression.learnedBranches);
  if (extra?.school) schools.add(extra.school);
  if (abilities.has('skola_boje_na_koni')) schools.add('skola_boje_na_koni');
  return { level: extra?.level ?? c.progression.level, schools, abilities, spec: extra?.spec ?? c.progression.specialization };
}

/** Proč se trik zatím nedá naučit ('' = dá). „Vyžaduje“ je podle PPP01 omezení pro naučení i provedení. */
export function trickLockReason(t: WarriorTrick, x: LearnCtx): string {
  const L = t.learn;
  if (L.level > x.level) return `od ${L.level}. úrovně`;
  if (L.school && !x.schools.has(L.school)) return schoolName(L.school);
  if (L.spec && x.spec !== L.spec) return WARRIOR.specs[L.spec]?.name ?? L.spec;
  if (L.path && (x.abilities.get(L.path) ?? 0) < 4) return `Mistr – ${getPath(L.path)?.name ?? L.path}`;
  for (const a of L.abilities ?? []) if (!x.abilities.has(a)) return a === 'vicenasobny_utok' ? 'Vícenásobný útok' : a === 'zrucnost_se_zbrani' ? 'Zručnost se zbraní' : a;
  return '';
}

/** Skupina triku, na kterou se vztahuje limit „z jedné školy nejvýš 1 trik za úroveň“ (H08). */
export const trickSchool = (t: WarriorTrick) => t.learn.school ?? null;

// ---------------------------------------------------------------- cena triku

/** Rutina (Šermíř, PPP01): všechny válečnické triky o 1 adrenalin levnější. */
export const rutinaDiscount = (c: Character) => (hasAbility(c, 'rutina') ? 1 : 0);

/** Skutečná cena triku (zvolená u proměnné ceny) po slevě z Rutiny, nikdy pod 0. */
export function trickPrice(c: Character, t: WarriorTrick, chosen?: number): number {
  const base = t.var ? Math.max(t.a, Math.trunc(chosen ?? t.a)) : t.a;
  return Math.max(0, base - rutinaDiscount(c));
}

// ---------------------------------------------------------------- zbraně: skupina a Cesta

export type WeaponGroup = 'drtive' | 'bodne' | 'secne' | 'vrhaci' | 'strelne' | 'beze_zbrane';
export const WEAPON_GROUP_LABEL: Record<WeaponGroup, string> = {
  drtive: 'drtivé', bodne: 'bodné', secne: 'sečné', vrhaci: 'vrhací', strelne: 'střelné', beze_zbrane: 'boj beze zbraně',
};

export interface WeaponInfo { name: string; kind: 'melee' | 'ranged' | 'thrown'; category: string; dmgTypes: string[]; grip?: string; /** Druh zbraně Zlodějského cechu (PPP05): assassin / gentleman / improv. */ zl?: string }

export function weaponInfo(def: WeaponDef | undefined, custom: { name: string; kind: 'melee' | 'ranged' | 'thrown'; category: string; damageTypes: string[] } | null): WeaponInfo {
  return def
    ? { name: def.n, kind: def.kind, category: def.cat, dmgTypes: def.dmgTypes ?? [], grip: def.grip, ...(def.zl ? { zl: def.zl } : {}) }
    : { name: custom?.name ?? '', kind: custom?.kind ?? 'melee', category: custom?.category ?? '', dmgTypes: custom?.damageTypes ?? [] };
}

/** Skupiny zbraní pro Mistrovství ve zbrani (H08): podle druhu zranění, vrhací, střelné, beze zbraně. */
export function weaponGroups(w: WeaponInfo | null): WeaponGroup[] {
  if (!w || /beze zbraně/i.test(w.category) || /^pěsti$/i.test(w.name)) return ['beze_zbrane'];
  // Střelné a vrhací zbraně tvoří vlastní skupinu (šíp je sice „bodný“, luk ale není bodná zbraň).
  if (w.kind === 'ranged') return ['strelne'];
  if (w.kind === 'thrown') return ['vrhaci'];
  const g = new Set<WeaponGroup>();
  for (const t of w.dmgTypes) {
    if (/drtiv/i.test(t)) g.add('drtive');
    if (/bodn/i.test(t)) g.add('bodne');
    if (/sečn/i.test(t)) g.add('secne');
  }
  return [...g];
}

const FAMILY: [string, RegExp][] = [
  ['cesta_mece', /meč|šavl|kord|rapír|katana/i],
  ['cesta_sekery', /seker|sekyr|sudlic|halapart/i],
  ['cesta_hole_a_kopi', /hůl|oštěp|kopí|pík|trojzub|vidl/i],
  ['cesta_kladiva', /kladiv|palcát|palic|řemdih|cep|kyj|obušek/i],
];
/** Cesta, jejíž bonusy se počítají s touto zbraní (podle názvu – meče, sekery, hole a kopí, kladiva). */
export function weaponPath(w: WeaponInfo | null): string | null {
  if (!w || w.kind === 'ranged') return null;
  return FAMILY.find(([, re]) => re.test(w.name))?.[0] ?? null;
}

/** Součet číselných bonusů Cesty do daného stupně (včetně Mistra na 4. stupni). */
export function pathBonus(p: PathDef, rank: number): Required<PathBonus> {
  const out: Required<PathBonus> = { atk: 0, wdef: 0, dmg: 0, init: 0, atkMelee: 0, atkThrown: 0, defMelee: 0 };
  const add = (b: PathBonus) => { for (const [k, v] of Object.entries(b)) out[k as keyof PathBonus] += v ?? 0; };
  p.ranks.filter((r) => r.rank <= rank).forEach((r) => add(r.bonus));
  if (rank >= 4) add(p.master.bonus);
  return out;
}

// ---------------------------------------------------------------- bonusy ke zbrani (derive)

export interface WeaponBonus { atk: number; def: number; dmg: number; init: number; parts: string[] }

export interface WeaponCtx {
  /** Opravy atributů po bonusech schopností. */
  sil: number;
  obr: number;
  shieldOn: boolean;
  shieldQ: number;
}

const sg = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/**
 * Bonusy válečníka ke zbrani (null = boj beze zbraně): školy, Mistrovství ve zbrani, Cesty,
 * Bijec, Klidná ruka, Rozvážnost (styl), Proměnlivý úchop, Záměna, Drtivý dopad.
 * Bonusy vázané na situaci (soupeř ve zbroji, druhé kolo…) se nepočítají – ukazuje je záložka Válečník.
 */
export function weaponBonus(c: Character, w: WeaponInfo | null, x: WeaponCtx): WeaponBonus {
  const b: WeaponBonus = { atk: 0, def: 0, dmg: 0, init: 0, parts: [] };
  if (!isWarrior(c)) return b;
  const add = (label: string, o: Partial<Omit<WeaponBonus, 'parts'>>) => {
    const txt = Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${{ atk: 'ÚČ', def: 'OČ', dmg: 'zranění', init: 'iniciativa' }[k]} ${sg(v!)}`).join(', ');
    if (!txt) return;
    for (const [k, v] of Object.entries(o)) b[k as 'atk'] += v ?? 0;
    b.parts.push(`${label}: ${txt}`);
  };
  const branches = new Set(c.progression.learnedBranches);
  const groups = weaponGroups(w);
  const unarmed = groups.includes('beze_zbrane');
  const melee = !w || w.kind === 'melee';

  // Školy boje (H08): jednoruční a obouruční platí vždy, drtiči kostí jen beze zbraně.
  if (branches.has('skola_boje_s_jednorucni_zbrani')) add('Škola s jednoruční zbraní', { def: 1 });
  if (branches.has('skola_boje_s_obourucni_zbrani')) add('Škola s obouruční zbraní', { dmg: 2 });
  if (unarmed && branches.has('skola_drticu_kosti')) add('Škola drtičů kostí', { atk: 3, def: 3 });
  if (unarmed && hasAbility(c, 'bijec')) add('Bijec', { atk: 5, def: 5 });
  // Mistrovství ve zbrani – +2 ÚČ/OČ, jen jeden bonus bez ohledu na počet skupin.
  const mastery = c.progression.learnedAbilities.filter((a) => a.id === 'mistrovstvi_ve_zbrani').map((a) => a.params?.group as WeaponGroup | undefined);
  const hit = mastery.find((g) => g && groups.includes(g));
  if (hit) add(`Mistrovství ve zbrani (${WEAPON_GROUP_LABEL[hit]})`, { atk: 2, def: 2 });
  if (w?.kind === 'ranged' && hasAbility(c, 'klidna_ruka')) add('Klidná ruka', { atk: 3 });
  // Drtivý dopad: střední a těžké vrhací zbraně se SIL místo OBR.
  if (w?.kind === 'thrown' && /střední|těžké/i.test(w.category) && hasAbility(c, 'drtivy_dopad') && x.sil > x.obr) add('Drtivý dopad (SIL místo OBR)', { atk: x.sil - x.obr });
  // Záměna (Šermíř): atribut pro Útok a pro Obranu volí hráč na záložce Válečník (✔ U 30. 9. 2026, v0.8.5).
  if (hasAbility(c, 'zamena')) {
    const st = c.classState.valecnik;
    if (melee && st?.swapAtk === 'obr') add('Záměna (Útok s OBR místo SIL)', { atk: x.obr - x.sil });
    if (st?.swapDef === 'sil') add('Záměna (Obrana se SIL místo OBR)', { def: x.sil - x.obr });
  }
  // Cesty válečníka (PPP01) – jen se zbraněmi dané Cesty.
  const pid = weaponPath(w);
  const path = pid ? getPath(pid) : undefined;
  const rank = pid ? pathRank(c, pid) : 0;
  if (path && rank > 0) {
    const pb = pathBonus(path, rank);
    const thrown = w?.kind === 'thrown';
    add(`${path.name} ${['', 'I', 'II', 'III', 'IV'][rank]}${rank >= 4 ? ' + Mistr' : ''}`, {
      atk: pb.atk + (thrown ? pb.atkThrown : pb.atkMelee),
      def: melee ? pb.wdef + pb.defMelee : 0,
      dmg: pb.dmg,
      init: pb.init,
    });
  }
  // Styl boje a úchop (volí se každé kolo, stav v classState.valecnik).
  const st = c.classState.valecnik;
  if (st?.combatStyle && hasAbility(c, 'rozvaznost')) add(st.combatStyle === 'offensive' ? 'Rozvážnost – útočný styl' : 'Rozvážnost – obranný styl', st.combatStyle === 'offensive' ? { atk: 3, def: -1 } : { atk: -1, def: 3 });
  if (st?.grip && hasAbility(c, 'promenlivy_uchop') && w) add('Proměnlivý úchop', st.grip === 'oz' ? { def: 1 } : st.grip === 'uc' ? { atk: 2 } : { dmg: 3 });
  return b;
}

/** Škola boje se štítem (H08): do obrany se započítá Obrana štítu i Obrana zbraně najednou. */
export const shieldAndWeapon = (c: Character) => isWarrior(c) && c.progression.learnedBranches.includes('skola_boje_se_stitem');

/** Bonusy, které appka sama nezapočítá, protože závisí na situaci v boji (přehled na záložce Válečník). */
export function situationalNotes(c: Character): { source: string; text: string }[] {
  if (!isWarrior(c)) return [];
  const out: { source: string; text: string }[] = [];
  for (const p of WARRIOR.paths) {
    const r = pathRank(c, p.id);
    if (!r) continue;
    // Rychlou čepel, Přehmátnutí a Útočnou/Obrannou strategii už počítá hlídání akcí v boji (7b.2).
    for (const k of p.ranks.filter((x) => x.rank <= r && (x.cond || !Object.keys(x.bonus).length) && !AUTO_RANKS.has(x.name))) out.push({ source: `${p.name} – ${k.name}`, text: k.effect });
    if (r >= 4 && p.id === 'cesta_kladiva') out.push({ source: `${p.name} – Mistr`, text: 'další +1 k Útoku proti kroužkové či těžší zbroji' });
    if (r >= 4 && p.id === 'cesta_strategie') out.push({ source: `${p.name} – Mistr`, text: p.master.effect });
  }
  // Počet útoků a obran (Vícenásobný útok, Bijec, Rychlý hrot, zuřivost, Boj štítem), Nával adrenalinu a boj dvěma
  // zbraněmi hlídá od 7b.2 appka sama – tady zůstává jen to, co závisí na protivníkovi nebo situaci.
  const txt: [string, string][] = [
    ['veleni', `rozkaz družině: +${c.progression.level >= 6 ? 2 : 1} ÚČ nebo OČ${pathRank(c, 'cesta_strategie') >= 4 ? ' (Mistr strategie +2 navíc)' : ''}`],
    ['urputnost', 'při 0 a méně životech neupadá do bezvědomí; po boji 1 směna na doléčení nad Mez vyřazení'],
    ['drsnak', 'každé fyzické Zranění −2 (ne jed, magie, krvácení)'],
    ['prace_s_tezistem', 'větší než protivník: +1 ÚČ za třídu (max +2); menší: +1 OČ za třídu (max +3)'],
    ['skola_boje_na_koni', 'na jezdeckém zvířeti +1 ÚČ i OČ; Jízdu na zvířeti lze ověřit Atletikou'],
    ['cteni_vzdalenosti', '+2 k ZO při boji tváří v tvář'],
    ['boj_s_presilou', 'po 3 kolech se stejnou skupinou +3 k Útoku (postih za přesilu se nepočítá)'],
    ['rytmus_boje', 'proti stejnému protivníkovi +1 ÚČ i OČ každé další kolo (max +10)'],
    ['krupobiti', 'v těžké zbroji Zranění ze střelby a vrhu na polovinu'],
    ['boj_stitem', 'štít jako primární zbraň: útočnost i OZ = kvalita štítu, zranění 0; aktivní Obranou kryje sousední postavu celým OČ'],
  ];
  for (const [id, t] of txt) if (hasAbility(c, id)) out.push({ source: nameOfAbility(id), text: t });
  return out;
}

const AUTO_RANKS = new Set(['Rychlá čepel', 'Přehmátnutí', 'Útočná strategie', 'Obranná strategie']);

const NAMES: Record<string, string> = {
  vicenasobny_utok: 'Vícenásobný útok', veleni: 'Velení', urputnost: 'Urputnost', drsnak: 'Drsňák', bijec: 'Bijec', naval_adrenalinu: 'Nával Adrenalinu',
  prace_s_tezistem: 'Práce s těžištěm', skola_boje_na_koni: 'Škola boje na koni', cteni_vzdalenosti: 'Čtení vzdálenosti', boj_s_presilou: 'Boj s přesilou',
  rychly_hrot: 'Rychlý hrot', rytmus_boje: 'Rytmus boje', krupobiti: 'Krupobití', boj_stitem: 'Boj štítem', vrazedna_zurivost: 'Vražedná zuřivost',
};
const nameOfAbility = (id: string) => NAMES[id] ?? id;

/** Mimo boj udrží válečník nejvýš opravu za ODO adrenalinu (min. 1), v boji bez limitu (H08). */
export const adrenalinCapOutside = (odoMod: number) => Math.max(1, odoMod);

/** Léčba vlastních zranění (H08): 1 adrenalin = 2 životy, jen čerstvé rány, nad maximum ne. */
export function selfHeal(c: Character, hpMax: number, points: number): Character {
  const n = Math.max(0, Math.min(Math.trunc(points), c.vitals.manaCurrent, Math.ceil((hpMax - c.vitals.hpCurrent) / 2)));
  if (!n) return c;
  return { ...c, vitals: { ...c.vitals, manaCurrent: c.vitals.manaCurrent - n, hpCurrent: Math.min(hpMax, c.vitals.hpCurrent + 2 * n) } };
}

// ================================================================ 7b.2 – boj válečníka

// ---------------------------------------------------------------- boj dvěma zbraněmi

type WeightClass = 'short' | 'light' | 'medium' | 'heavy' | 'vheavy' | 'other';
/** Váhová třída jednoruční zbraně podle kategorie H15 (lehká krátká = nůž, dýka…). */
export function weightClass(category: string): WeightClass {
  if (/krátk/i.test(category) && /lehk/i.test(category)) return 'short';
  if (/velmi těžk/i.test(category)) return 'vheavy';
  if (/^lehk/i.test(category)) return 'light';
  if (/^středn/i.test(category)) return 'medium';
  if (/^těžk/i.test(category)) return 'heavy';
  return 'other';
}

/**
 * Proč nejde bojovat touto dvojicí zbraní se sčítáním parametrů ('' = jde).
 * Škola boje se dvěma zbraněmi (H08): dvě jednoruční, jedna z nich lehká krátká.
 * Mistr boje dvěma zbraněmi (Šermíř, PPP01): navíc těžká + lehká, nebo libovolná kombinace středních a lehkých.
 */
export function dualWieldWhy(c: Character, main: WeaponInfo | null, off: WeaponInfo | null, shieldOn: boolean): string {
  if (!isWarrior(c) || !c.progression.learnedBranches.includes('skola_boje_se_dvema_zbranemi')) return 'chybí Škola boje se dvěma zbraněmi';
  if (!main || !off) return 'vyber dvě zbraně';
  if (shieldOn) return 'v ruce je štít';
  for (const w of [main, off]) {
    if (w.kind === 'ranged') return `${w.name}: střelná zbraň`;
    if (/obouruč/i.test(w.grip ?? '') || /obouruč/i.test(w.category)) return `${w.name}: obouruční zbraň`;
    if (weaponGroups(w).includes('beze_zbrane')) return `${w.name}: boj beze zbraně`;
  }
  const a = weightClass(main.category);
  const b = weightClass(off.category);
  if (a === 'short' || b === 'short') return a === 'vheavy' || b === 'vheavy' ? 'velmi těžká zbraň' : '';
  if (!hasAbility(c, 'mistr_boje_dvema_zbranemi')) return 'jedna ze zbraní musí být lehká krátká (bez Mistra boje dvěma zbraněmi)';
  const ok = (x: WeightClass, y: WeightClass) => (x === 'heavy' && y === 'light') || (['medium', 'light'].includes(x) && ['medium', 'light'].includes(y));
  return ok(a, b) || ok(b, a) ? '' : 'Mistr boje dvěma zbraněmi: těžká + lehká, nebo střední a lehké';
}

// ---------------------------------------------------------------- útoky a obrany za kolo

export interface RoundCount { n: number; unlimited: boolean; parts: string[]; /** Útoky s cooldownem (id schopností) – spotřebují se až jako poslední. */ cdSources: string[] }
export interface ActiveWeapon { kind: 'melee' | 'ranged' | 'thrown'; groups: string[]; path: string | null; none: boolean; name?: string; category?: string }

/** Vražedná zuřivost účinkuje (přerod trvá kolo, pak až do vymanění). */
export function furyOn(c: Character, round = c.play.combat?.round ?? 0): boolean {
  const f = c.play.combat?.war?.fury;
  return !!f && f.active && round > f.start;
}

/**
 * „Každé druhé kolo“ = cooldown od kola použití (✔ U 28. 9. 2026): schopnost je k dispozici, pokud nebyla použita
 * v předchozím kole (v kole použití zůstává dostupná, dokud se útok nevrátí).
 */
export const cdReady = (cd: Record<string, number> | undefined, id: string, round: number) => {
  const last = cd?.[id];
  return last == null || last === round || last <= round - 2;
};

/**
 * Počet útoků v kole (H08, PPP01): Vícenásobný útok (3 za 2 kola, od 6. úrovně 2 každé kolo – jen tváří v tvář),
 * Bijec (beze zbraně), Rychlý hrot (bodná zbraň), Vražedná zuřivost; Rychlá čepel a Přehmátnutí s cooldownem
 * (po použití jedno kolo nic). Vícenásobný útok pod 6. úrovní dá druhý útok v lichých kolech boje.
 */
export function attacksPerRound(c: Character, w: ActiveWeapon, round: number, cd?: Record<string, number>): RoundCount {
  const out: RoundCount = { n: 1, unlimited: false, parts: [], cdSources: [] };
  if (!isWarrior(c)) return out;
  const add = (label: string, k = 1) => { out.n += k; out.parts.push(`${label} +${k}`); };
  const melee = w.kind === 'melee';
  // Vícenásobný útok od 6. úrovně každé kolo; pod 6. úrovní cooldown (✔ U 28. 9. 2026) – níž s ostatními.
  const multi = melee && hasAbility(c, 'vicenasobny_utok');
  if (multi && c.progression.level >= 6) add('Vícenásobný útok');
  if ((w.none || w.groups.includes('beze_zbrane')) && hasAbility(c, 'bijec')) add('Bijec');
  if (melee && w.groups.includes('bodne') && hasAbility(c, 'rychly_hrot')) add('Rychlý hrot');
  if (furyOn(c, round)) add('Vražedná zuřivost');
  const cdAdd = (id: string, label: string) => {
    if (cdReady(cd, id, round)) { add(label); out.cdSources.push(id); } else out.parts.push(`${label} – znovu v ${(cd?.[id] ?? 0) + 2}. kole`);
  };
  if (multi && c.progression.level < 6) cdAdd('vicenasobny_utok', 'Vícenásobný útok');
  if (melee && w.path === 'cesta_mece' && pathRank(c, 'cesta_mece') >= 3) cdAdd('rychla_cepel', 'Rychlá čepel');
  if (melee && w.path === 'cesta_hole_a_kopi' && pathRank(c, 'cesta_hole_a_kopi') >= 4) cdAdd('prehmatnuti', 'Přehmátnutí');
  return out;
}

/**
 * Aktivní obrany za kolo: **obran je stejně jako útoků** (✔ U 30. 9. 2026, v0.8.4) – Vícenásobný útok, Bijec,
 * Rychlý hrot, Vražedná zuřivost, Rychlá čepel, Přehmátnutí; dodatečné útoky (triky, útok štítem) se nepočítají.
 * Jedna krátká akce Obrana obsahuje všechny obrany kola. Zakrytí se štítem proti jedinému protivníkovi bez omezení.
 */
export function defensesPerRound(c: Character, w: ActiveWeapon, round: number, shieldOn: boolean, foes: number, cd?: Record<string, number>): RoundCount {
  const a = attacksPerRound(c, w, round, cd);
  const out: RoundCount = { n: a.n, unlimited: false, parts: [...a.parts], cdSources: [...a.cdSources] };
  if (!isWarrior(c)) return out;
  if (shieldOn && foes <= 1 && hasAbility(c, 'zakryti')) { out.unlimited = true; out.parts.push('Zakrytí – proti jedinému protivníkovi bez omezení'); }
  return out;
}

/** Dodatečný útok štítem každé druhé kolo (Boj štítem, Rytíř) – se štítem a jinou hlavní zbraní; cooldown od použití. */
export const shieldBashRound = (c: Character, round: number, shieldOn: boolean, armed: boolean, cd?: Record<string, number>) =>
  isWarrior(c) && hasAbility(c, 'boj_stitem') && shieldOn && armed && cdReady(cd, 'boj_stitem', round);

/** Adrenalin za kolo: +1, ve Vražedné zuřivosti +2. Nával Adrenalinu ho dává na začátku kola místo na konci tahu. */
export const adrenalinGain = (c: Character, round: number) => (furyOn(c, round) ? 2 : 1);
export const adrenalinAtStart = (c: Character) => isWarrior(c) && hasAbility(c, 'naval_adrenalinu');

// ---------------------------------------------------------------- strategie a rozkazy

/** Cesta strategie (PPP01): bonus = stupeň Cesty; obranná od 2. stupně; trvá 3 kola (Mistr 5), Strategie na místo celý boj. */
export function strategyOptions(c: Character): { kind: 'utok' | 'obrana'; bonus: number; label: string }[] {
  const r = pathRank(c, 'cesta_strategie');
  if (!r) return [];
  return [
    { kind: 'utok', bonus: r, label: `Útočná: +${r} k Útoku a Iniciativě` },
    ...(r >= 2 ? [{ kind: 'obrana' as const, bonus: r, label: `Obranná: +${r} do Obrany a k Reflexu` }] : []),
  ];
}
export const strategyRounds = (c: Character) => (pathRank(c, 'cesta_strategie') >= 4 ? 5 : 3);

/** Velení (H08): rozkaz +1 (od 6. úrovně +2), Mistr Cesty strategie +2 navíc. */
export const commandBonus = (c: Character) => (c.progression.level >= 6 ? 2 : 1) + (pathRank(c, 'cesta_strategie') >= 4 ? 2 : 0);

export const BATTLE_ORDERS: [string, string][] = [
  ['Udeř!', 'Útok navíc'], ['Kryj se!', 'Obrana navíc'], ['Přesun!', 'Krátký pohyb navíc'],
  ['Zbraně!', 'přezbrojení jako okamžitá akce'], ['K zemi!', '+5 proti střelbě'], ['Vztyk!', 'okamžitě na nohy'],
];
