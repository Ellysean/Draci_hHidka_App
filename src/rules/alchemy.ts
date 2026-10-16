// Alchymista (milník 7a): zdroje, dílna, známé recepty, kontrola a výroba, destilace, transformace,
// dlouhodobý sběr, vnímání many (H10, PPP03 – dílny). Čisté funkce nad postavou.
import alchemyJson from '../data/alchymie.json';
import { emptyAlchemist, uid } from '../model/defaults';
import type { AlchemistBase, AlchemistState, Character, CraftedItem, CreatureSize, Workshop } from '../model/types';
import type { Derived } from './derive';
import { sgn } from './derive';
import { getArmor, getShield, getWeapon } from './data';
import { payMoney } from './equipment';
import { formatMd, moneyToMd } from './money';

// ---------------------------------------------------------------- data

export interface BaseReq { baseId: string; text: string; match: string[][]; optional?: boolean; free?: boolean; /** Kolik kusů (Magický kompas: 4× jehla). */ qty?: number }
export interface RecipeDef {
  id: string;
  name: string;
  latinName: string | null;
  tier: 'basic' | 'level2' | 'branch' | 'ability' | 'specialization';
  /** H10 (výchozí) nebo PPP03 (7a.2). */
  source?: 'H10' | 'PPP03';
  kind: 'elixir' | 'lektvar' | 'jed' | 'predmet' | 'ostatni';
  /** false = lektvar se nepije (Houbovrah, Likvidátor…) – nepočítá se do limitu 1 + 1. */
  drinkable?: boolean;
  /** `wand` = přídavná mana omezená dřevem hůlky (PPP03, Tabulka základu hůlek). */
  mana: { base: number | null; extraMax?: number; wand?: boolean; variants?: { label: string; base: number }[]; variable?: boolean; text?: string };
  materials: number | null;
  /** Suroviny variant (index jako `mana.variants`) – Křišťálová mísa 100 / 200. */
  materialsVariants?: number[];
  bases: BaseReq[];
  /** workshopKind = jen ve speciální dílně (Laboratoř Medika…, PPP03). */
  craftTime: { text: string; workshopRequired: boolean; workshopKind?: Workshop['kind'] };
  /** Dovednost pro hod výroby místo Lučby (Mechanika u mechanických implantátů, PPP03). */
  craftSkill?: string;
  /** Kolik kusů dá jedna výroba (Kule 10, Náboj 5 – PPP03). */
  yieldQty?: number;
  /** Text surovin, když nejde o jedno číslo („2 za každou“). */
  materialsText?: string;
  /** Hmotnost kusu v lb (palné zbraně, munice). */
  weightLb?: number;
  /** Palná zbraň (PPP03, Pyromant) – jde přidat mezi zbraně postavy. */
  weapon?: { range: string; attack: number; damage: number; defense: number; rate: string; ammo: string; reload: string; hands: 1 | 2 };
  /** Rachejtle a střely (PPP03, Pyromant): hod Pyromancie vs. dc (dcMoving na pohyblivý cíl) a účinky hlavic. */
  launch?: { dc: number; dcMoving?: number; time: string; range?: string; fire: string; blast: string };
  difficulty: { value: number | null; variants?: number[]; variable?: boolean; text?: string };
  durationText: string | null;
  lifespanText: string | null;
  frequencyText: string | null;
  useText: string | null;
  check: string | null;
  requires: { branch?: string; ability?: string; abilities?: string[]; specialization?: string } | null;
  requiresMoment: string | null;
  tags: string[];
  description: string | null;
  rules: string | null;
  pages: string | null;
}
export interface WorkshopDef { size: 1 | 2 | 3 | 4; name: string; setupZl: number; equipZl: number; upkeep: string; maxMana: number; maxMaterials: number; distill: number; bonus: number; rentHour: string; upkeepHours: number }

const A = alchemyJson as unknown as {
  recipes: RecipeDef[];
  art: { min: number; amount: string; perceive: number; process: number }[];
  siberio: { organs: { attr: string; organ: string; color: string }[]; byBonus: { bonus: number; mana: number; difficulty: number }[]; materials: number; limit: string };
  startingBases: { name: string; weightLb: number; baseId: string }[];
  workshops: WorkshopDef[];
  containers: { itemId: string; n: string; mana: number; materials: number }[];
  branchText: Record<string, string>;
  prices: { manaMd: number; materialsMd: number };
  wandWoods: { id: string; name: string; maxMana: number }[];
  combatSideEffects: { roll: number; name: string; text: string; success?: boolean }[];
  concentrateEffects: string[];
  ppp03Abilities: Record<string, string>;
  stitch: StitchTables;
  constructs: ConstructTables;
  theurg: TheurgTables;
  transmutation: { metals: string[]; table: Record<string, (number | null)[]>; alloys: { id: string; name: string; mana: number; text: string }[]; pages: string };
  surgery: { bio: { label: string; dc: number }[]; mech: { label: string; dc: number }[] };
};

export type { CreatureSize };
export type ConstructSize = 'A' | 'B' | 'C';
export interface DemonRow { id: string; sphere: string; demon: string; cat: 'pomocnik' | 'skudce'; level: number; text: string; dc: number; mana: number; materials: number }
export interface ElementalDef {
  id: 'igni' | 'undina' | 'terra' | 'sylfa'; name: string; mana: [number, number]; dc: [number, number]; level: [number, number]; hp: [number, number];
  attrs: string; sizes: [number, number | null, string][]; mobility: string; attack: [number, number]; attacks: number; zo: number; oc: number;
  immune: string; weak: string; abilities: string[];
}
export interface TheurgTables {
  demons: DemonRow[];
  moments: { id: string; name: string; max: number | null; shortGame: string }[];
  lifespan: { min: number; max: number | null; text: string }[];
  bhuts: {
    kinds: { id: string; name: string; text: string }[];
    rows: { st: number; dc: number; mana: number; dur: string; z1: string; d1: number | null; z2: string; d2: number | null; z3: string; d3: number | null }[];
    materials: { name: string; hp: number }[];
    damage: { upTo: number; name: string }[];
  };
  elementals: ElementalDef[];
  essences: { kinds: { id: 'ohen' | 'voda' | 'vzduch' | 'zeme'; name: string; color: string }[]; perMana: number; manaPerShift: number; effects: Record<string, [string, number][]> };
  gems: { id: string; name: string; rarity: number; maxMana: number }[];
  staff: { attack: number; damage: number; defense: number; reach: string; weightLb: number; priceZl: number; maxMana: number; chargePerRound: number; craftMana: number; craftText: string };
}
type Cost = { dc: number; h: number; m: number; s: number };
export interface ConstructTables {
  sizes: ConstructSize[];
  body: Record<string, Record<ConstructSize, Cost & { uc: number; oc: number; hp: number }>>;
  upgrades: { id: string; name: string; note?: string; by: Record<ConstructSize, Cost> }[];
  fuel: { id: 'olej' | 'mana' | 'gem'; name: string; unit: string; note?: string; by: Record<ConstructSize, { s: number; dc: number; cap: number }>; tank: { dc: number; s: number } }[];
  brains: { type: 1 | 2 | 3 | 4; name: string; dc: number; m: number; s: number; text: string }[];
  maxTanks: number;
  daysPerTank: number;
  pages: string;
}
export interface StitchTables {
  sizes: CreatureSize[];
  limbs: Record<string, Record<CreatureSize, [number, number]>>;
  heads: Record<string, Record<CreatureSize, [number, number]>>;
  skins: Record<string, Record<CreatureSize, number>>;
  mana: { base: number; perPart: number };
  materials: { base: number; perPart: number };
  hoursPerPart: number;
  difficulty: { limb: number; head: number; special: number; skin: number };
  pages: string;
}
export const RECIPES = A.recipes;
export const ART = A.art;
export const SIBERIO = A.siberio;
export const WORKSHOPS = A.workshops;
export const CONTAINERS = A.containers;
export const BRANCH_TEXT = A.branchText;
export const ALCH_PRICES = A.prices;
export const STARTING_BASES = A.startingBases;
export const WAND_WOODS = A.wandWoods;
export const COMBAT_SIDE_EFFECTS = A.combatSideEffects;
export const CONCENTRATE_EFFECTS = A.concentrateEffects;
/** Plná pravidla 12 obecných schopností PPP03 (7a.2). */
export const PPP03_RULES = A.ppp03Abilities;
export const STITCH = A.stitch;
export const SURGERY = A.surgery;
export const CONSTRUCTS = A.constructs;
export const TRANSMUTATION = A.transmutation;
export const THEURG = A.theurg;
export const recipeById = (id: string) => RECIPES.find((r) => r.id === id);

export const TIER_LABEL: Record<RecipeDef['tier'], string> = { basic: 'základní', level2: 'od 2. úrovně', branch: 'oborový', ability: 'schopnost', specialization: 'specializace' };
export const WORKSHOP_KIND: Record<Workshop['kind'], { name: string; spec: string | null }> = {
  zakladni: { name: 'Alchymistická dílna', spec: null },
  laborator: { name: 'Laboratoř (Medicus)', spec: 'medicus' },
  vyhen: { name: 'Výheň (Pyromant)', spec: 'pyromant' },
  astrolab: { name: 'Astroláb (Theurg)', spec: 'theurg' },
};

/** Startovní základy (H10): 19 kusů, 7,3 lb. */
export const startingBases = (): AlchemistBase[] => STARTING_BASES.map((b) => ({ uid: uid(), name: b.name, qty: 1, weightLb: b.weightLb, baseId: b.baseId }));

/** Stav alchymisty s doplněnými novými poli (starší data). */
export function alch(c: Character): AlchemistState {
  const s = c.classState.alchymista;
  return { ...emptyAlchemist(), ...(s ?? {}) };
}

// ---------------------------------------------------------------- tabulka umění

/** Řádek Tabulky alchymistického umění pro množství many/surovin (rozsah 10–19 ✔ U 25. 9. 2026). */
export function artRow(amount: number) {
  const n = Math.max(1, Math.floor(amount));
  let row = ART[0];
  for (const r of ART) if (n >= r.min) row = r;
  return row;
}

/** Nejmenší množství many, které Vnímání many s daným výsledkem hodu odhalí (hod musí být vyšší). */
export function perceiveMin(roll: number): number | null {
  const ok = ART.filter((r) => roll > r.perceive);
  return ok.length ? ok[0].min : null;
}

/** Dlouhodobý sběr (H10): nejvyšší řádek, jehož obtížnost hod překonal; mana za 10 h, suroviny za 1 h. */
export function gatherYield(roll: number, focus: 'mana' | 'materials', hours: number): { amount: number; row: typeof ART[number] | null; fail: boolean } {
  if (roll <= 5) return { amount: 0, row: null, fail: true };
  const beaten = ART.filter((r) => roll > r.process);
  const row = beaten.at(-1) ?? null;
  if (!row) return { amount: 0, row: null, fail: false };
  const h = Math.max(0, Math.min(10, hours));
  return { amount: Math.ceil(focus === 'mana' ? (row.min * h) / 10 : row.min * h), row, fail: false };
}

// ---------------------------------------------------------------- dílna a kapacita

export const workshopDef = (w: Workshop | null) => (w ? WORKSHOPS.find((x) => x.size === w.size) ?? null : null);
const hasBranch = (c: Character, id: string) => c.progression.learnedBranches.includes(id);
export const hasAbility = (c: Character, id: string) => c.progression.learnedAbilities.some((a) => a.id === id);
/** Vlastní funkční výrobek daného receptu (Kotlík samovar, Pokročilá destilační aparatura). */
export const ownsCrafted = (c: Character, recipeId: string) => alch(c).crafted.some((x) => x.recipeId === recipeId && !x.ruined);

/** Kapacita: vlastní dílna, jinak nádoby ve výbavě (Krystaly a energie ×2). */
export function capacity(c: Character): { mana: number; materials: number; source: string } {
  const s = alch(c);
  const ws = workshopDef(s.workshop);
  if (ws && s.workshop?.access === 'vlastni') return { mana: ws.maxMana, materials: ws.maxMaterials, source: `vlastní dílna – ${ws.name.toLowerCase()}` };
  const k = hasBranch(c, 'krystaly_a_energie') ? 2 : 1;
  let mana = 0, materials = 0;
  const parts: string[] = [];
  for (const it of c.equipment.items) {
    const def = CONTAINERS.find((x) => x.itemId === it.itemId);
    if (!def) continue;
    mana += def.mana * it.qty * k;
    materials += def.materials * it.qty * k;
    parts.push(`${it.qty > 1 ? `${it.qty}× ` : ''}${def.n}`);
  }
  return { mana, materials, source: parts.length ? `nádoby: ${parts.join(', ')}${k > 1 ? ' (Krystaly a energie ×2)' : ''}` : 'žádné nádoby ve výbavě' };
}

// ---------------------------------------------------------------- bonusy k hodům

export interface CheckBonus { total: number; parts: string[] }

const skillTotal = (d: Derived, id: string) => d.skills.find((s) => s.id === id);

/** Bonus dílny platí, když v ní alchymista právě pracuje (PPP03: Lučba + dovednost dílny). */
const workshopBonus = (c: Character, skill = 'lucba'): number => {
  const s = alch(c);
  const ws = workshopDef(s.workshop);
  if (!ws || !s.workshop?.here) return 0;
  return skill === 'lucba' || skill === 'prace_s_manou' || WORKSHOP_SKILLS[s.workshop.kind].includes(skill) ? ws.bonus : 0;
};
/** Dovednosti, ke kterým dává bonus speciální dílna (PPP03: Lučba + dovednost vázaná k typu dílny). */
export const WORKSHOP_SKILLS: Record<Workshop['kind'], string[]> = { zakladni: [], laborator: ['chirurgie'], vyhen: ['pyromancie', 'mechanika'], astrolab: ['theurgie'] };

/** Výroba: 1k10 + OBR + Lučba (+ dílna, + gnóm Zručnost +2, + Precizní výroba +5). */
export function craftBonus(c: Character, d: Derived, precise = false, combat = false, r?: RecipeDef): CheckBonus {
  const skill = r?.craftSkill ?? 'lucba';
  const sk = skillTotal(d, skill);
  const label = ({ lucba: 'Lučba', mechanika: 'Mechanika', chirurgie: 'Chirurgie', pyromancie: 'Pyromancie', theurgie: 'Theurgie', vyroba_svitku: 'Výroba svitků' } as Record<string, string>)[skill] ?? skill;
  const parts: string[] = [sk ? `${label} ${sgn(sk.total)} (OBR ${sgn(sk.mod)}, st. ${sk.rank}${sk.bonus ? `, ${sgn(sk.bonus)}` : ''})` : `OBR ${sgn(d.mods.obr)} (bez dovednosti ${label})`];
  let total = sk ? sk.total : d.mods.obr;
  const w = workshopBonus(c, skill);
  if (w) { total += w; parts.push(`dílna +${w}`); }
  // Cestovní alchymie (PPP03): +2 k Lučbě při výrobě mimo alchymistickou dílnu.
  else if (skill === 'lucba' && !alch(c).workshop?.here && hasAbility(c, 'cestovni_alchymie')) { total += 2; parts.push('Cestovní alchymie +2'); }
  if (c.basic.raceId === 'gnom') { total += 2; parts.push('Zručnost +2'); }
  if (precise) { total += 5; parts.push('Precizní výroba +5'); }
  if (combat) { total -= 5; parts.push('Bojová konzumace −5'); }
  // Specializace (PPP03): Pyromancie +5 k Lučbě u Nestabilních substancí, Theurgie +5 u Hvězdných sestav.
  const spec = c.progression.specialization;
  const inBranch = (id: string, tag: string) => !!r && (r.requires?.branch === id || r.tags.some((t) => t.startsWith(tag)));
  if (skill === 'lucba' && spec === 'pyromant' && inBranch('nestabilni_substance', 'Nestabilní substance')) { total += 5; parts.push('Pyromancie +5'); }
  if (skill === 'lucba' && spec === 'theurg' && inBranch('hvezdne_sestavy', 'Hvězdné sestavy')) { total += 5; parts.push('Theurgie +5'); }
  return { total, parts };
}

/** Destilace / sběr many / vnímání: 1k10 + INT + Práce s manou (+ dílna u destilace a sběru). */
export function manaBonus(c: Character, d: Derived, withWorkshop = true): CheckBonus {
  const sk = skillTotal(d, 'prace_s_manou');
  const parts = [sk ? `Práce s manou ${sgn(sk.total)} (INT ${sgn(sk.mod)}, st. ${sk.rank})` : `INT ${sgn(d.mods.int)} (bez dovednosti)`];
  let total = sk ? sk.total : d.mods.int;
  const w = withWorkshop ? workshopBonus(c) : 0;
  if (w) { total += w; parts.push(`dílna +${w}`); }
  return { total, parts };
}

/** Transformace / sběr surovin: 1k10 + OBR + Lučba (+ dílna). */
export function materialsBonus(c: Character, d: Derived): CheckBonus {
  const sk = skillTotal(d, 'lucba');
  const parts = [sk ? `Lučba ${sgn(sk.total)} (OBR ${sgn(sk.mod)}, st. ${sk.rank})` : `OBR ${sgn(d.mods.obr)} (bez Lučby)`];
  let total = sk ? sk.total : d.mods.obr;
  const w = workshopBonus(c);
  if (w) { total += w; parts.push(`dílna +${w}`); }
  return { total, parts };
}

// ---------------------------------------------------------------- známé recepty

export function knownRecipes(c: Character): RecipeDef[] {
  return RECIPES.filter((r) => {
    if (r.tier === 'basic') return true;
    if (r.tier === 'level2') return c.progression.level >= 2;
    if (r.requires?.specialization && c.progression.specialization !== r.requires.specialization) return false;
    if (r.requires?.branch) return hasBranch(c, r.requires.branch);
    if (r.requires?.ability) return hasAbility(c, r.requires.ability) && (r.requires.abilities ?? []).every((a) => hasAbility(c, a));
    return !!r.requires?.specialization;
  });
}

// ---------------------------------------------------------------- párování základů

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

export type BaseSource = 'base' | 'item' | 'weapon' | 'shield' | 'armor';
export interface BaseCandidate { source: BaseSource; uid: string; name: string; qty: number }

/** Všechno, co může posloužit jako základ: inventář základů, výbava, zbraně, štít, zbroj. */
export function baseCandidates(c: Character): BaseCandidate[] {
  const out: BaseCandidate[] = alch(c).bases.filter((b) => b.qty > 0).map((b) => ({ source: 'base' as const, uid: b.uid, name: b.name, qty: b.qty }));
  for (const it of c.equipment.items) if (it.qty > 0) out.push({ source: 'item', uid: it.uid, name: it.name, qty: it.qty });
  for (const w of c.equipment.weapons) out.push({ source: 'weapon', uid: w.uid, name: getWeapon(w.itemId)?.n ?? w.custom?.name ?? 'zbraň', qty: w.qty ?? 1 });
  const sh = c.equipment.shield;
  if (sh.itemId || sh.custom) out.push({ source: 'shield', uid: 'shield', name: getShield(sh.itemId)?.n ?? sh.custom?.name ?? 'štít', qty: 1 });
  const ar = c.equipment.armor;
  if ((ar.itemId && ar.itemId !== 'zbroj_zadna_saty') || ar.custom) out.push({ source: 'armor', uid: 'armor', name: getArmor(ar.itemId)?.n ?? ar.custom?.name ?? 'zbroj', qty: 1 });
  return out;
}

export function baseMatches(req: BaseReq, cand: BaseCandidate, c?: Character): boolean {
  if (cand.source === 'base' && c) {
    const b = alch(c).bases.find((x) => x.uid === cand.uid);
    if (b?.baseId && b.baseId === req.baseId) return true;
  }
  const n = norm(cand.name);
  return req.match.some((alt) => alt.every((stem) => n.includes(stem)));
}

/** Automatický výběr základů: pro každý požadovaný základ první vhodný kus (každý kus jen jednou). */
export function autoAssign(c: Character, r: RecipeDef, extra: BaseReq[] = []): (BaseCandidate | null)[] {
  const cands = baseCandidates(c);
  const used = new Map<string, number>();
  return [...r.bases, ...extra].map((req) => {
    if (req.free) return null;
    // Přednost má inventář základů před výbavou.
    const n = req.qty ?? 1;
    const pick = cands.find((x) => baseMatches(req, x, c) && (used.get(x.uid) ?? 0) + n <= x.qty);
    if (pick) used.set(pick.uid, (used.get(pick.uid) ?? 0) + n);
    return pick ?? null;
  });
}

/** Forma olej: navíc 2 dl oleje jako základ (H10). */
export const OIL_BASE: BaseReq = { baseId: 'olej', text: 'olej (2 dl) – forma oleje', match: [['olej']] };
export const canBeOil = (r: RecipeDef) => r.kind === 'lektvar' || r.kind === 'elixir' || r.kind === 'jed';

// ---------------------------------------------------------------- výroba

export interface CraftOptions {
  /** Index varianty many/obtížnosti (Bomba zesílená), -1 = základní. */
  variant?: number;
  /** Přídavná mana (magické předměty). */
  extraMana?: number;
  /** Ručně zadaná mana/obtížnost (svitek X, Sibériovy elixíry přes `siberioBonus`). */
  manualMana?: number;
  manualDifficulty?: number;
  siberioBonus?: number;
  efficient?: boolean;
  precise?: boolean;
  form?: 'potion' | 'oil';
  /** Ruční přiřazení základů (index požadavku → kandidát nebo null = substituce/PJ). */
  assign?: (BaseCandidate | null)[];
  /** Základ nahrazen se souhlasem PJ (Substituce) – nechybí, ale neodečte se. */
  substituted?: boolean[];
  /** Hromadná výroba (PPP03): počet dávek ≥ 1. */
  batch?: number;
  /** Koncentrované substance (PPP03): index efektu z CONCENTRATE_EFFECTS, -1/undefined = bez. */
  concentrate?: number;
  /** Bojová konzumace (PPP03): −5 k hodu, +25 % many a surovin, vypije se hned. */
  combat?: boolean;
  /** Kotlík samovar (PPP03): −5 surovin za každou dávku lektvaru či jedu. */
  samovar?: boolean;
  /** Dřevo hůlky (PPP03) – strop přídavné many. */
  wandWood?: string;
}

// ---------------------------------------------------------------- schopnosti PPP03, které mění výrobu

const isSubstance = (r: RecipeDef) => r.kind === 'lektvar' || r.kind === 'elixir' || r.kind === 'jed' || r.tags.some((t) => t.startsWith('Nestabilní substance'));
/** Hromadná výroba: lektvary, elixíry, jedy a výbušniny (Nestabilní substance). */
export const canBatch = (c: Character, r: RecipeDef) => hasAbility(c, 'hromadna_vyroba') && isSubstance(r);
/** Koncentrované substance: lektvary, elixíry, jedy a recepty oboru Nestabilní substance. */
export const canConcentrate = (c: Character, r: RecipeDef) => hasAbility(c, 'koncentrovane_substance') && isSubstance(r);
/** Bojová konzumace: jednoduché lektvary a elixíry, které se pijí (o „jednoduchosti“ rozhoduje PJ). */
export const canCombatConsume = (c: Character, r: RecipeDef) => hasAbility(c, 'bojova_konzumace') && (r.kind === 'lektvar' || r.kind === 'elixir') && r.drinkable !== false;
export const canSamovar = (c: Character, r: RecipeDef) => (r.kind === 'lektvar' || r.kind === 'jed') && ownsCrafted(c, 'kotlik_samovar');
/** Strop přídavné many: hůlky podle dřeva, jinak podle receptu. */
export function extraMaxFor(r: RecipeDef, o: CraftOptions = {}, c?: Character): number | null {
  if (r.mana.extraMax == null) return null;
  const base = !r.mana.wand ? r.mana.extraMax : (WAND_WOODS.find((w) => w.id === o.wandWood) ?? WAND_WOODS[0]).maxMana;
  // Práce s energií (PPP03, Pyromant): přídavnou manu jde navýšit až na dvojnásobek.
  return c && hasAbility(c, 'prace_s_energii') ? base * 2 : base;
}

export interface CraftPlan {
  mana: number;
  materials: number;
  difficulty: number | null;
  reqs: BaseReq[];
  assign: (BaseCandidate | null)[];
  missing: { mana: boolean; materials: boolean; bases: string[]; workshop: boolean; value: boolean };
  ok: boolean;
  timeText: string;
  extraMana: number;
  batch: number;
  combat: boolean;
}

export function planCraft(c: Character, r: RecipeDef, o: CraftOptions = {}): CraftPlan {
  const s = alch(c);
  let mana = r.mana.base ?? 0;
  let diff = r.difficulty.value;
  const vi = o.variant ?? -1;
  if (vi >= 0 && r.mana.variants?.[vi]) mana = r.mana.variants[vi].base;
  if (vi >= 0 && r.difficulty.variants?.[vi] != null) diff = r.difficulty.variants[vi];
  if (r.id === 'siberiovy_posilujici_elixiry') {
    const row = SIBERIO.byBonus.find((x) => x.bonus === (o.siberioBonus ?? 1)) ?? SIBERIO.byBonus[0];
    mana = row.mana;
    diff = row.difficulty;
  }
  if (r.mana.variable && r.id !== 'siberiovy_posilujici_elixiry') mana = Math.max(0, o.manualMana ?? 0);
  if (r.difficulty.variable && r.id !== 'siberiovy_posilujici_elixiry') diff = o.manualDifficulty ?? null;
  const exMax = extraMaxFor(r, o, c);
  const extra = exMax ? Math.max(0, Math.min(exMax, o.extraMana ?? 0)) : 0;
  let materials = r.materials ?? 0;
  if (vi >= 0 && r.materialsVariants?.[vi] != null) materials = r.materialsVariants[vi];
  // Efektivní výroba: −¼ many a surovin (zaokrouhleno nahoru, H06), +¼ času.
  if (o.efficient) { mana = Math.ceil(mana * 0.75); materials = Math.ceil(materials * 0.75); }
  // Koncentrované substance: o polovinu vyšší cena (mana i suroviny).
  const conc = canConcentrate(c, r) && o.concentrate != null && o.concentrate >= 0;
  if (conc) { mana = Math.ceil(mana * 1.5); materials = Math.ceil(materials * 1.5); }
  // Bojová konzumace: spotřeba many a surovin +25 %.
  const combat = !!o.combat && canCombatConsume(c, r);
  if (combat) { mana = Math.ceil(mana * 1.25); materials = Math.ceil(materials * 1.25); }
  // Hromadná výroba: mana a suroviny × dávky, obtížnost +1 za každou další dávku (základy jen jednou).
  const batch = canBatch(c, r) ? Math.max(1, Math.trunc(o.batch ?? 1)) : 1;
  mana *= batch;
  materials *= batch;
  if (diff != null) diff += batch - 1;
  // Kotlík samovar: −5 surovin za každý lektvar či jed.
  if (o.samovar && canSamovar(c, r)) materials = Math.max(0, materials - 5 * batch);
  const totalMana = mana + extra * batch;
  const reqs = o.form === 'oil' ? [...r.bases, OIL_BASE] : r.bases;
  const assign = o.assign && o.assign.length === reqs.length ? o.assign : autoAssign(c, r, o.form === 'oil' ? [OIL_BASE] : []);
  const missingBases = reqs.filter((q, i) => !q.free && !q.optional && !assign[i] && !o.substituted?.[i]).map((q) => q.text);
  const ws = workshopDef(s.workshop);
  const workshopMissing = r.craftTime.workshopRequired && !(ws && s.workshop?.here && (!r.craftTime.workshopKind || s.workshop.kind === r.craftTime.workshopKind));
  const missing = {
    mana: totalMana > c.vitals.manaCurrent,
    materials: materials > s.materialsCurrent,
    bases: missingBases,
    workshop: workshopMissing,
    value: diff == null || (!!r.mana.variable && r.id !== 'siberiovy_posilujici_elixiry' && !((o.manualMana ?? 0) > 0)),
  };
  let timeText = r.craftTime.text;
  if (o.efficient) timeText += ' + ¼ (Efektivní výroba)';
  if (o.precise) timeText += ' × 2 (Precizní výroba)';
  if (combat) timeText = '1 kolo (dlouhá akce – Bojová konzumace)';
  return {
    mana: totalMana, materials, difficulty: diff, reqs, assign, missing, timeText, extraMana: extra, batch, combat,
    ok: !missing.mana && !missing.materials && !missingBases.length && !workshopMissing && !missing.value,
  };
}

/** Co receptu chybí pro filtr (mana / suroviny / základy / dílna). */
export function recipeMissing(c: Character, r: RecipeDef) {
  const p = planCraft(c, r, r.id === 'siberiovy_posilujici_elixiry' ? { siberioBonus: 1 } : {});
  return { ...p.missing, value: false, ok: !p.missing.mana && !p.missing.materials && !p.missing.bases.length && !p.missing.workshop, plan: p };
}

// ---------------------------------------------------------------- záznam a vrácení

const LOG_MAX = 60;
const UNDO_MAX = 15;

export function commit(c: Character, text: string, fn: (c: Character, s: AlchemistState) => Character, now = new Date().toISOString()): Character {
  const before = alch(c);
  const { undo: _u, log: _l, ...state } = before;
  const e = c.equipment;
  const snapshot = { mana: c.vitals.manaCurrent, state, equipment: { weapons: e.weapons, items: e.items, armor: e.armor, shield: e.shield, money: e.money, activeWeaponUid: e.activeWeaponUid, ledger: e.ledger } };
  const next = fn(c, before);
  const after = alch(next);
  const logUid = uid();
  return {
    ...next,
    classState: {
      ...next.classState,
      alchymista: {
        ...after,
        log: [{ uid: logUid, at: now, text }, ...before.log].slice(0, LOG_MAX),
        undo: [{ logUid, ...snapshot }, ...before.undo].slice(0, UNDO_MAX),
      },
    },
  };
}

export function undoAlchemy(c: Character): Character {
  const s = alch(c);
  const [u, ...rest] = s.undo;
  if (!u) return c;
  return {
    ...c,
    vitals: { ...c.vitals, manaCurrent: u.mana },
    equipment: { ...c.equipment, ...u.equipment },
    classState: { ...c.classState, alchymista: { ...u.state, undo: rest, log: s.log.filter((l) => l.uid !== u.logUid) } },
  };
}

export const setState = (c: Character, s: AlchemistState): Character => ({ ...c, classState: { ...c.classState, alchymista: s } });

/** Odebere 1 kus použitého základu (inventář základů, výbava, zbraň, štít, zbroj). */
function consume(c: Character, cand: BaseCandidate): Character {
  const s = alch(c);
  switch (cand.source) {
    case 'base':
      return setState(c, { ...s, bases: s.bases.flatMap((b) => (b.uid !== cand.uid ? [b] : b.qty > 1 ? [{ ...b, qty: b.qty - 1 }] : [])) });
    case 'item':
      return { ...c, equipment: { ...c.equipment, items: c.equipment.items.flatMap((i) => (i.uid !== cand.uid ? [i] : i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : [])) } };
    case 'weapon': {
      const weapons = c.equipment.weapons.flatMap((w) => (w.uid !== cand.uid ? [w] : (w.qty ?? 1) > 1 ? [{ ...w, qty: (w.qty ?? 1) - 1 }] : []));
      return { ...c, equipment: { ...c.equipment, weapons, activeWeaponUid: weapons.some((w) => w.uid === c.equipment.activeWeaponUid) ? c.equipment.activeWeaponUid : null } };
    }
    case 'shield':
      return { ...c, equipment: { ...c.equipment, shield: { itemId: null, custom: null, equipped: false, weightLb: null } } };
    case 'armor':
      return { ...c, equipment: { ...c.equipment, armor: { itemId: null, custom: null, equipped: true, weightLb: null } } };
  }
}

/**
 * Výroba (H10): mana, suroviny a základy se odepíšou VŽDY, i při neúspěchu. Úspěch = hod > obtížnost;
 * výsledek hodu je Nebezpečnost předmětu (hráč ji smí snížit – `danger`).
 */
export function craft(c: Character, d: Derived, r: RecipeDef, o: CraftOptions, rollTotal: number, danger?: number, now = new Date().toISOString(), sideRoll?: number):
  { character: Character; success: boolean; error?: string; sideEffect?: typeof COMBAT_SIDE_EFFECTS[number] } {
  const p = planCraft(c, r, o);
  if (!p.ok) return { character: c, success: false, error: 'Něco chybí – zkontroluj manu, suroviny, základy a dílnu.' };
  const success = p.difficulty != null && rollTotal > p.difficulty;
  // Bojová konzumace: při neúspěchu vedlejší účinek 1k10 na 1 směnu (6 = Rovnováha: lektvar se přesto povedl, dvojnásobný účinek).
  const side = p.combat && !success ? COMBAT_SIDE_EFFECTS.find((x) => x.roll === Math.max(1, Math.min(10, sideRoll ?? 1 + Math.floor(Math.random() * 10)))) : undefined;
  const made = success || !!side?.success;
  const boost = canConcentrate(c, r) && o.concentrate != null && o.concentrate >= 0 ? CONCENTRATE_EFFECTS[o.concentrate] : null;
  const variant = (o.variant ?? -1) >= 0 ? r.mana.variants?.[o.variant!]?.label : r.id === 'siberiovy_posilujici_elixiry' ? `+${o.siberioBonus ?? 1}` : undefined;
  const wood = r.mana.wand ? WAND_WOODS.find((w) => w.id === o.wandWood) ?? WAND_WOODS[0] : null;
  const name = `${r.name}${variant ? ` (${variant})` : ''}${wood ? ` (${wood.name})` : ''}${o.form === 'oil' ? ' – olej' : ''}`;
  const head = p.combat ? (made ? 'Bojová konzumace – vypito' : 'Bojová konzumace se nezdařila') : made ? 'Vyrobeno' : 'Nezdařilo se';
  const tail = [p.batch > 1 ? `${p.batch} dávky` : '', boost ? `posíleno: ${boost}` : '', side ? `vedlejší účinek ${side.roll}: ${side.name} – ${side.text} (1 směna)` : ''].filter(Boolean).join('; ');
  const character = commit(c, `${head}: ${name} – hod ${rollTotal} vs. ${p.difficulty}, −${p.mana} many, −${p.materials} surovin${tail ? ` (${tail})` : ''}`, (x) => {
    let y: Character = { ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - p.mana } };
    const s0 = alch(y);
    y = setState(y, { ...s0, materialsCurrent: s0.materialsCurrent - p.materials });
    p.assign.forEach((cand, i) => { if (cand && !o.substituted?.[i]) for (let k = 0; k < (p.reqs[i].qty ?? 1); k++) y = consume(y, cand); });
    if (made) {
      const s1 = alch(y);
      const notes = [r.lifespanText ? `životnost ${r.lifespanText}` : '', boost ? `posíleno: ${boost}` : '', side?.success ? 'dvojnásobný účinek (Bojová konzumace)' : ''].filter(Boolean);
      const item: CraftedItem = {
        uid: uid(), recipeId: r.id, name, form: o.form ?? 'potion', danger: Math.min(rollTotal, Math.max(1, danger ?? rollTotal)),
        extraManaLeft: r.mana.extraMax ? p.extraMana : null, extraManaMax: r.mana.extraMax ? p.extraMana : null,
        craftedAt: now, note: notes.join(' · '), qty: p.batch * (r.yieldQty ?? 1),
        difficulty: p.difficulty, manaSpent: Math.round(p.mana / p.batch / (r.yieldQty ?? 1)), materialsSpent: Math.round(p.materials / p.batch / (r.yieldQty ?? 1)),
        ...(p.combat ? { active: true } : {}),
      };
      y = setState(y, { ...s1, crafted: [item, ...s1.crafted] });
    }
    return y;
  }, now);
  void d;
  return { character, success: made, sideEffect: side };
}

// ---------------------------------------------------------------- výrobky

export const ACTIVE_LIMIT = (c: Character) => (hasAbility(c, 'odolnost_vuci_jedum') ? 2 : 1);

/** Pozření lektvaru/elixíru: limit 1 + 1 aktivní (Odolnost vůči jedům 2 + 2). Vrací varování, když je překročen. */
export function useCrafted(c: Character, itemUid: string): { character: Character; warning?: string } {
  const s = alch(c);
  const it = s.crafted.find((x) => x.uid === itemUid);
  if (!it) return { character: c };
  const r = recipeById(it.recipeId);
  const drinkable = r && (r.kind === 'lektvar' || r.kind === 'elixir') && r.drinkable !== false && it.form === 'potion';
  let warning: string | undefined;
  if (drinkable) {
    const same = s.crafted.filter((x) => x.active && recipeById(x.recipeId)?.kind === r.kind).length;
    if (same >= ACTIVE_LIMIT(c)) warning = `Už působí ${same} ${r.kind === 'elixir' ? 'elixír' : 'lektvar'} – víc najednou nejde (H10), rozhodne PJ.`;
  }
  const character = commit(c, `Použito: ${it.name}${drinkable ? ' – působí' : ''}`, (x, st) => setState(x, {
    ...st,
    crafted: takeOne(st.crafted, itemUid, drinkable ? (y) => [{ ...y, uid: uid(), qty: 1, active: true }] : () => []),
  }));
  return { character, warning };
}

/** Vezme 1 kus ze stohu (qty) a nahradí ho výsledkem `fn` (prázdné = spotřebováno). */
export function takeOne(list: CraftedItem[], itemUid: string, fn: (it: CraftedItem) => CraftedItem[]): CraftedItem[] {
  return list.flatMap((y) => {
    if (y.uid !== itemUid) return [y];
    const rest = (y.qty ?? 1) > 1 ? [{ ...y, qty: (y.qty ?? 1) - 1 }] : [];
    const out = fn(y);
    return out.length && (y.qty ?? 1) <= 1 ? out.map((z) => ({ ...z, uid: y.uid })) : [...out, ...rest];
  });
}

export const endEffect = (c: Character, itemUid: string) =>
  commit(c, `Účinek skončil: ${alch(c).crafted.find((x) => x.uid === itemUid)?.name ?? ''}`, (x, st) => setState(x, { ...st, crafted: st.crafted.filter((y) => y.uid !== itemUid) }));

export const discardCrafted = (c: Character, itemUid: string) =>
  commit(c, `Zahozeno: ${alch(c).crafted.find((x) => x.uid === itemUid)?.name ?? ''}`, (x, st) => setState(x, { ...st, crafted: takeOne(st.crafted, itemUid, () => []) }));

// ---------------------------------------------------------------- výrobky ve Výbavě

/** Výrobky, které alchymista nese jako předměty (ve Výbavě) – bez právě působících (vypitých). */
export const craftedInGear = (c: Character): CraftedItem[] =>
  c.basic.classId === 'alchymista' ? alch(c).crafted.filter((x) => !x.active) : [];

/** Hodnota zdrojů v 1 kusu (čistá mana a suroviny podle H10) v md – jen orientačně pro prodej, cenu určí PJ. */
export function craftedValueMd(it: CraftedItem): number {
  const r = recipeById(it.recipeId);
  const mana = it.manaSpent ?? r?.mana.base ?? 0;
  const mat = it.materialsSpent ?? r?.materials ?? 0;
  return Math.max(0, Math.round(mana * ALCH_PRICES.manaMd + mat * ALCH_PRICES.materialsMd));
}

/** Nese / nenese výrobek u sebe (naložení). */
export const setCraftedCarried = (c: Character, itemUid: string, carried: boolean): Character =>
  setState(c, { ...alch(c), crafted: alch(c).crafted.map((x) => (x.uid === itemUid ? { ...x, carried } : x)) });

/**
 * Odebrání výrobku z Výbavy – prodej (`saleMd` > 0 připíše peníze do měšce a historie peněz) nebo zahození.
 * Zapisuje se do záznamu alchymie, vrátit jde tamtéž.
 */
export function removeCrafted(c: Character, itemUid: string, { qty, saleMd = 0, now = new Date().toISOString() }: { qty?: number; saleMd?: number; now?: string } = {}): Character {
  const it = alch(c).crafted.find((x) => x.uid === itemUid);
  if (!it) return c;
  const have = it.qty ?? 1;
  const n = Math.min(have, Math.max(1, qty ?? have));
  const md = Math.max(0, Math.round(saleMd));
  const label = `${it.name}${n > 1 ? ` ×${n}` : ''}`;
  return commit(c, `${md > 0 ? `Prodáno za ${formatMd(md)}` : 'Zahozeno'}: ${label}`, (x, st) => {
    const crafted = n >= have ? st.crafted.filter((y) => y.uid !== itemUid) : st.crafted.map((y) => (y.uid === itemUid ? { ...y, qty: have - n } : y));
    let y = setState(x, { ...st, crafted });
    if (md > 0) {
      const m = y.equipment.money;
      const money = { gold: m.gold + Math.floor(md / 100), silver: m.silver + Math.floor((md % 100) / 10), copper: m.copper + (md % 10) };
      const ledger = [{ uid: uid(), at: now, text: `Prodáno: ${label}`, deltaMd: md }, ...y.equipment.ledger].slice(0, 100);
      y = { ...y, equipment: { ...y.equipment, money, ledger } };
    }
    return y;
  }, now);
}

// ---------------------------------------------------------------- Recyklátor a Sabotér (PPP03)

/** Obtížnost výroby kusu (uložená, jinak z receptu). */
export const itemDifficulty = (it: CraftedItem): number | null => it.difficulty ?? recipeById(it.recipeId)?.difficulty.value ?? null;

/** Recyklace (Recyklátor): kus se rozebere – vrátí se základy a polovina many i surovin, které v něm zůstaly. */
export function recycleInfo(it: CraftedItem): { mana: number; materials: number; bases: BaseReq[] } {
  const r = recipeById(it.recipeId);
  const manaIn = Math.max(0, (it.manaSpent ?? r?.mana.base ?? 0) - (it.extraManaMax ?? 0) + (it.extraManaLeft ?? 0));
  const matIn = it.materialsSpent ?? r?.materials ?? 0;
  return { mana: Math.floor(manaIn / 2), materials: Math.floor(matIn / 2), bases: (r?.bases ?? []).filter((b) => !b.free) };
}

export function recycle(c: Character, itemUid: string): Character {
  const it = alch(c).crafted.find((x) => x.uid === itemUid);
  if (!it || !hasAbility(c, 'recyklator')) return c;
  const back = recycleInfo(it);
  return commit(c, `Recyklace: ${it.name} → základ zpět, +${back.mana} many, +${back.materials} surovin`, (x, st) => {
    let bases = st.bases;
    for (const b of back.bases) {
      const n = b.qty ?? 1;
      const have = bases.find((z) => z.baseId === b.baseId);
      bases = have ? bases.map((z) => (z === have ? { ...z, qty: z.qty + n } : z)) : [...bases, { uid: uid(), name: b.text, qty: n, weightLb: 0, baseId: b.baseId }];
    }
    return {
      ...setState(x, { ...st, bases, materialsCurrent: st.materialsCurrent + back.materials, crafted: takeOne(st.crafted, itemUid, () => []) }),
      vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent + back.mana },
    };
  });
}

/** Sabotáž (Sabotér): Lučba vs. obtížnost výroby; úspěch = podmínka se zapíše, neúspěch = výrobek znehodnocen. */
export function sabotage(c: Character, itemUid: string, condition: string, rollTotal: number): { character: Character; success: boolean; difficulty: number | null } {
  const it = alch(c).crafted.find((x) => x.uid === itemUid);
  if (!it || !hasAbility(c, 'saboter')) return { character: c, success: false, difficulty: null };
  const difficulty = itemDifficulty(it);
  const success = difficulty != null && rollTotal > difficulty;
  const character = commit(c, success ? `Sabotáž: ${it.name} – ${condition} (hod ${rollTotal} vs. ${difficulty})` : `Sabotáž se nezdařila: ${it.name} je znehodnocen (hod ${rollTotal} vs. ${difficulty})`,
    (x, st) => setState(x, { ...st, crafted: takeOne(st.crafted, itemUid, (y) => [{ ...y, uid: uid(), qty: 1, ...(success ? { sabotage: condition } : { ruined: true }) }]) }));
  return { character, success, difficulty };
}

/** Čerpání / dobíjení přídavné many (dobíjet jde jen s oborem Krystaly a energie, z vlastní zásoby). */
export function drainExtra(c: Character, itemUid: string, amount: number): Character {
  const it = alch(c).crafted.find((x) => x.uid === itemUid);
  if (!it || it.extraManaLeft == null) return c;
  const n = Math.min(it.extraManaLeft, Math.max(0, amount));
  return commit(c, `${it.name}: −${n} přídavné many`, (x, st) => setState(x, { ...st, crafted: st.crafted.map((y) => (y.uid === itemUid ? { ...y, extraManaLeft: (y.extraManaLeft ?? 0) - n } : y)) }));
}

export function rechargeExtra(c: Character, itemUid: string, amount: number): Character {
  const it = alch(c).crafted.find((x) => x.uid === itemUid);
  if (!it || it.extraManaLeft == null || it.extraManaMax == null) return c;
  const n = Math.min(it.extraManaMax - it.extraManaLeft, Math.max(0, amount), c.vitals.manaCurrent);
  if (n <= 0) return c;
  return commit(c, `${it.name}: dobito +${n} přídavné many (−${n} many)`, (x, st) => ({
    ...setState(x, { ...st, crafted: st.crafted.map((y) => (y.uid === itemUid ? { ...y, extraManaLeft: (y.extraManaLeft ?? 0) + n } : y)) }),
    vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - n },
  }));
}

export const canRecharge = (c: Character, r: RecipeDef | undefined) => !!r && (
  (hasBranch(c, 'krystaly_a_energie') && r.requires?.branch === 'krystaly_a_energie')
  // Práce s energií (Pyromant): dobíjí přídavnou manu magických předmětů; Kapsulační gem dobíjí Pyromant s Kapsulačními gemy.
  || (hasAbility(c, 'prace_s_energii') && r.mana.extraMax != null)
  || (r.id === 'kapsulacni_gem' && hasAbility(c, 'kapsulacni_gemy')));

// ---------------------------------------------------------------- zdroje: destilace, transformace, sběr, nákup

/** Destilace (H10): obtížnost podle množství many ve zdroji; úspěch = hod > obtížnost, jinak zdroj ztracen. */
export function distill(c: Character, amount: number, rollTotal: number): { character: Character; success: boolean; difficulty: number } {
  const difficulty = artRow(amount).process;
  const success = rollTotal > difficulty;
  const character = commit(c, success ? `Destilace: +${amount} many (hod ${rollTotal} vs. ${difficulty})` : `Destilace se nezdařila – zdroj (${amount} many) ztracen (hod ${rollTotal} vs. ${difficulty})`,
    (x) => (success ? { ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent + amount } } : x));
  return { character, success, difficulty };
}

export function transform(c: Character, amount: number, rollTotal: number): { character: Character; success: boolean; difficulty: number } {
  const difficulty = artRow(amount).process;
  const success = rollTotal > difficulty;
  const character = commit(c, success ? `Transformace: +${amount} surovin (hod ${rollTotal} vs. ${difficulty})` : `Transformace se nezdařila – zdroj (${amount} surovin) ztracen (hod ${rollTotal} vs. ${difficulty})`,
    (x, s) => (success ? setState(x, { ...s, materialsCurrent: s.materialsCurrent + amount }) : x));
  return { character, success, difficulty };
}

/** Doba zpracování (hodiny): destilace 10× st. Práce s manou za hodinu (dílna 2–5× rychleji), transformace 100× st. Lučby. */
export function processHours(c: Character, d: Derived, kind: 'mana' | 'materials', amount: number): number | null {
  const rank = d.skills.find((s) => s.id === (kind === 'mana' ? 'prace_s_manou' : 'lucba'))?.rank ?? 0;
  if (!rank) return null;
  const per = kind === 'mana' ? 10 * rank : 100 * rank;
  const s = alch(c);
  let speed = kind === 'mana' && s.workshop?.here ? workshopDef(s.workshop)?.distill ?? 1 : 1;
  // Pokročilá destilační aparatura (PPP03): vliv hodu se počítá po půlhodinách → destilace 2× rychleji.
  if (kind === 'mana' && ownsCrafted(c, 'pokrocila_destilacni_aparatura')) speed *= 2;
  return Math.round((amount / per / speed) * 10) / 10;
}

export function gather(c: Character, focus: 'mana' | 'materials', hours: number, rollTotal: number) {
  const g = gatherYield(rollTotal, focus, hours);
  const what = focus === 'mana' ? 'many' : 'surovin';
  const text = g.fail ? `Dlouhodobý sběr (${hours} h): neúspěch (hod ${rollTotal}) – nic a něco nepříjemného (PJ)` : `Dlouhodobý sběr (${hours} h): +${g.amount} ${what} (hod ${rollTotal})`;
  const character = commit(c, text, (x, s) => (focus === 'mana'
    ? { ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent + g.amount } }
    : setState(x, { ...s, materialsCurrent: s.materialsCurrent + g.amount })));
  return { character, ...g };
}

/** Nákup čisté many (3 st/bod) nebo surovin (3 md/bod) – H10. */
export function buyResource(c: Character, kind: 'mana' | 'materials', amount: number): { character: Character; error?: string } {
  const n = Math.max(0, Math.trunc(amount));
  if (!n) return { character: c, error: 'Zadej množství.' };
  const cost = n * (kind === 'mana' ? ALCH_PRICES.manaMd : ALCH_PRICES.materialsMd);
  const money = payMoney(c.equipment.money, cost);
  if (!money) return { character: c, error: `Na to nemáš – stojí ${formatMd(cost)}, máš ${formatMd(moneyToMd(c.equipment.money))}.` };
  const character = commit(c, `Nákup: +${n} ${kind === 'mana' ? 'many' : 'surovin'} za ${formatMd(cost)}`, (x, s) => {
    const y = { ...x, equipment: { ...x.equipment, money } };
    return kind === 'mana' ? { ...y, vitals: { ...y.vitals, manaCurrent: y.vitals.manaCurrent + n } } : setState(y, { ...s, materialsCurrent: s.materialsCurrent + n });
  });
  return { character };
}

/** Ruční úprava zásob (spotřeba, nález, oprava zápisu). */
export const adjustResource = (c: Character, kind: 'mana' | 'materials', delta: number, note = '') =>
  commit(c, `${kind === 'mana' ? 'Mana' : 'Suroviny'} ${sgn(delta)}${note ? ` – ${note}` : ''}`, (x, s) => (kind === 'mana'
    ? { ...x, vitals: { ...x.vitals, manaCurrent: Math.max(0, x.vitals.manaCurrent + delta) } }
    : setState(x, { ...s, materialsCurrent: Math.max(0, s.materialsCurrent + delta) })));

// ---------------------------------------------------------------- základy a dílna

export function addBase(c: Character, name: string, qty: number, weightLb: number, baseId?: string): Character {
  const n = name.trim();
  if (!n) return c;
  return commit(c, `Základ: +${qty}× ${n}`, (x, s) => {
    const ex = s.bases.find((b) => b.name === n && (b.baseId ?? null) === (baseId ?? null));
    const bases = ex ? s.bases.map((b) => (b === ex ? { ...b, qty: b.qty + qty } : b)) : [...s.bases, { uid: uid(), name: n, qty, weightLb, ...(baseId ? { baseId } : {}) }];
    return setState(x, { ...s, bases });
  });
}

export const setBaseQty = (c: Character, baseUid: string, qty: number) => {
  const s = alch(c);
  const b = s.bases.find((x) => x.uid === baseUid);
  if (!b) return c;
  return commit(c, qty <= 0 ? `Základ odebrán: ${b.name}` : `Základ ${b.name}: ${b.qty} → ${qty}`, (x, st) =>
    setState(x, { ...st, bases: qty <= 0 ? st.bases.filter((y) => y.uid !== baseUid) : st.bases.map((y) => (y.uid === baseUid ? { ...y, qty } : y)) }));
};

export const setWorkshop = (c: Character, w: Workshop | null) =>
  commit(c, w ? `Dílna: ${WORKSHOP_KIND[w.kind].name} – ${workshopDef(w)?.name.toLowerCase()} (${w.access}${w.here ? ', pracuji v ní' : ''})` : 'Dílna: žádná', (x, s) => setState(x, { ...s, workshop: w }));

/** Všechny názvy základů z receptů (nabídka při přidání základu). */
export const ALL_BASES: { baseId: string; text: string }[] = (() => {
  const m = new Map<string, string>();
  for (const b of STARTING_BASES) m.set(b.baseId, b.name);
  for (const r of RECIPES) for (const b of r.bases) if (!b.free && !m.has(b.baseId)) m.set(b.baseId, b.text);
  return [...m].map(([baseId, text]) => ({ baseId, text })).sort((a, b) => a.text.localeCompare(b.text, 'cs'));
})();
