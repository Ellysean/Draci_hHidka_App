// Přestup na vyšší úroveň podle H18 (docs/PROGRESSION_ENGINE.md) – čistá logika bez UI.
// Průvodce jen zapíše volby; maxima (životy, mana, body) dál počítá derive().
import type { AddedSkill } from '../creation/draft';
import { ATTR_KEYS, type AttrKey, type Character, type ClassId, type LevelUpRecord } from '../model/types';
import progressionJson from '../data/progression.json';
import { MAX_LEVEL, getSkill } from '../rules/data';
import { derive } from '../rules/derive';
import { TRICKS, WARRIOR, learnCtx, trickLockReason, trickSchool, type WarriorTrick } from '../rules/valecnik';
import { OBOR_NAME, wizardCtx, wizardPool } from '../rules/kouzelnik';
import { applyCompanionGrowth, companionStepWhy, describeGrowth, growingCompanions, shareableSpells, type CompanionPicks } from '../rules/pratele';

/** Profesní dovednost, kterou schopnost/větev dá rovnou na daném stupni (mimo dovednostní body). */
export interface SkillGrant { id: string; rank: number }
export interface BranchDef { id: string; name: string; items: string[] | null; grantsSkills?: SkillGrant[]; effect?: string }
export interface AbilityDef {
  id: string; name: string; text: string | null; minLevel: number | null; requiresSpecialization: string | null;
  /** Položek (kouzel…) navíc za každou úroveň, se zpětnou opravou (Paměť na kouzla, H11/H06). */
  extraItemsPerLevel?: number;
  grantsSkills?: SkillGrant[];
  /** Jde volit opakovaně (Mistrovství ve zbrani – další skupina zbraní, H08; Cesty válečníka). */
  repeatable?: boolean;
  /** Nejvyšší počet opakování (Cesty: 4 stupně, pak Mistr). */
  maxRank?: number;
  /** Jen na každé N-té úrovni od minLevel (Cesty: 6., 9., 12. …). */
  levelStep?: number;
  /** Popisky stupňů (Cesty). */
  ranks?: string[];
  /** Parametr volby (Mistrovství ve zbrani: skupina zbraní). */
  param?: { key: string; label: string; options: { id: string; name: string }[] };
  source?: string;
  /** Položky (kouzla), které schopnost dá automaticky všechny (hraničář PPP02: Hraničářský luk, Magie lesa… ✔ U). */
  grantsItems?: string[];
  /** Položek navíc jednorázově při volbě (Magistr magického oboru: 3 kouzla oboru, PPP04). */
  extraItems?: number;
}
export interface SpecDef {
  id: string; name: string; need: number; requires: string[];
  /** Co specializace dá hned při volbě (dílna, dovednost, bonusy – PPP03). */
  grants?: string[];
  grantsSkills?: SkillGrant[];
}
export interface ClassProgression {
  branchLabel: string;
  branchGrant: string;
  grantMode: 'access' | 'grantAll';
  itemWord: string;
  energyGrows: boolean;
  branches: BranchDef[];
  abilities: AbilityDef[];
  specializations: SpecDef[];
  choose: { n: number; nFrom6: number | null; word: string; poolLabel: string | null; pool: string[]; perBranch: number | null } | null;
  autoAtLevel2: string[] | null;
  /** Co povolání dostane automaticky na dané úrovni (hraničář na 6.: Výroba šípů… na 5. stupni, PPP02). */
  levelGrants?: { level: number; text: string; grantsSkills?: SkillGrant[] }[];
}

export const PROGRESSION = progressionJson as unknown as Record<ClassId, ClassProgression>;
export const progressionFor = (cls: ClassId) => PROGRESSION[cls];

/** Název libovolné větve / schopnosti / specializace podle id (pro výpisy v deníku). */
export function progressionName(cls: ClassId, id: string): string {
  const P = PROGRESSION[cls];
  return P.branches.find((b) => b.id === id)?.name ?? P.abilities.find((a) => a.id === id)?.name ?? P.specializations.find((s) => s.id === id)?.name ?? id;
}

export type PickKind = 'branch' | 'ability' | 'spec';
export interface Pick { kind: PickKind; id: string }

export interface LevelUpState {
  pick: Pick | null;
  /** Parametr zvolené schopnosti (Mistrovství ve zbrani → skupina zbraní). */
  pickParams?: Record<string, unknown>;
  /** Specializace – samostatný krok od 6. úrovně; počítá i s právě zvolenou schopností/větví (✔ U). */
  spec: string | null;
  attrs: AttrKey[]; // charakterové body (každá 3. úroveň): 2 různé atributy
  raised: Record<string, number>; // skillId → o kolik stupňů
  added: AddedSkill[];
  items: string[];
  /** Růst přátel (7c+): dovednosti zvířete, volba parťáka, kouzla kouzelníkova přítele – podle uid přítele. */
  companions?: CompanionPicks;
}

export const emptyLevelUp = (): LevelUpState => ({ pick: null, spec: null, attrs: [], raised: {}, added: [], items: [] });

export const nextLevel = (c: Character) => c.progression.level + 1;
export const canLevelUp = (c: Character) => c.progression.level < MAX_LEVEL;
export const gainsCharacterPoints = (level: number) => level % 3 === 0;

const owned = (c: Character) => new Set([...c.progression.learnedBranches, ...c.progression.learnedAbilities.map((a) => a.id)]);

export interface Option {
  kind: PickKind; id: string; name: string; text: string; disabled: string | null;
  /** Rozpis „co získáš“ (specializace): automatické zisky a volitelné schopnosti, které odemkne. */
  details?: { grants: string[]; unlocks: { name: string; text: string | null }[] };
}

export function options(c: Character): Option[] {
  const P = progressionFor(c.basic.classId);
  const nl = nextLevel(c);
  const own = owned(c);
  const spec = c.progression.specialization;
  // PPP: bez specializace smí postava na každé 6. úrovni vzít 1 schopnost libovolné specializace (✔ U).
  const anySpec = !spec && nl % 6 === 0;
  return [
    ...P.branches.map((b): Option => ({
      kind: 'branch', id: b.id, name: b.name,
      text: `${P.branchLabel} · ${b.effect ? `${b.effect} · ` : ''}${b.items ? (b.effect ? `${P.itemWord}: ` : '') + b.items.join(', ') : P.branchGrant}`,
      disabled: own.has(b.id) ? 'už naučeno' : null,
    })),
    ...P.abilities.map((a): Option => {
      const n = c.progression.learnedAbilities.filter((x) => x.id === a.id).length;
      const rankTxt = a.ranks && a.maxRank ? (n >= a.maxRank ? ' · zvládnuto, Mistr' : ` · ${n ? `máš ${n}. stupeň → ` : ''}${n + 1}. stupeň: ${a.ranks[n]}${n + 1 === a.maxRank ? ` + ${a.ranks[a.maxRank]}` : ''}`) : '';
      const stepOk = !a.levelStep || !a.minLevel || (nl >= a.minLevel && (nl - a.minLevel) % a.levelStep === 0);
      const specLock = a.requiresSpecialization && spec !== a.requiresSpecialization;
      const noParam = a.param && paramOptions(c, a).every((o) => o.taken) ? `nejdřív ${a.param.label.toLowerCase()}` : null;
      return {
        kind: 'ability', id: a.id, name: a.name,
        text: (a.text ?? 'zvláštní schopnost') + (a.ranks ? rankTxt : a.repeatable && n ? ` · už máš ${n}×` : '')
          + (specLock && anySpec ? ` · bez specializace – schopnost specializace ${progressionName(c.basic.classId, a.requiresSpecialization!)} (1× za 6 úrovní)` : ''),
        disabled: own.has(a.id) && !a.repeatable ? 'už naučeno'
          : a.maxRank && n >= a.maxRank ? 'zvládnuto'
            : a.minLevel && a.minLevel > nl ? `od ${a.minLevel}. úrovně`
              : !stepOk ? `jen na ${a.minLevel}., ${a.minLevel! + a.levelStep!}., ${a.minLevel! + 2 * a.levelStep!}. … úrovni`
                : specLock && !anySpec ? `jen ${progressionName(c.basic.classId, a.requiresSpecialization!)}` : noParam,
      };
    }),
  ];
}

/** Parametr, který zvolená schopnost potřebuje (Mistrovství ve zbrani), nebo null. */
export function pickParam(c: Character, st: LevelUpState) {
  if (st.pick?.kind !== 'ability') return null;
  const a = progressionFor(c.basic.classId).abilities.find((x) => x.id === st.pick?.id);
  if (!a?.param) return null;
  // Magistr magického oboru (PPP04): jen obor, který kouzelník ovládá.
  return a.param.key === 'obor' ? { ...a.param, options: a.param.options.filter((o) => c.progression.learnedBranches.includes(o.id)) } : a.param;
}

/** Možnosti parametru s příznakem „už máš“ (opakovaně volitelná schopnost – vždy jiná volba). */
export function paramOptions(c: Character, a: AbilityDef): { id: string; name: string; taken: boolean }[] {
  if (!a.param) return [];
  const taken = new Set(c.progression.learnedAbilities.filter((x) => x.id === a.id).map((x) => x.params?.[a.param!.key]));
  const opts = a.param.key === 'obor' ? a.param.options.filter((o) => c.progression.learnedBranches.includes(o.id)) : a.param.options;
  return opts.map((o) => ({ ...o, taken: taken.has(o.id) }));
}

/** Má přestup krok Specializace? Od 6. úrovně, dokud postava specializaci nemá. */
export const hasSpecStep = (c: Character) => nextLevel(c) >= 6 && !c.progression.specialization;

/**
 * Nabídka specializací – samostatný krok (✔ U 19. 9. 2026): podmínky se vyhodnocují
 * i s právě zvolenou schopností/větví, takže poslední prerekvizitu jde vzít na stejné úrovni.
 */
export function specOptions(c: Character, st: LevelUpState): Option[] {
  const P = progressionFor(c.basic.classId);
  const own = owned(c);
  if (st.pick && st.pick.kind !== 'spec') own.add(st.pick.id);
  return P.specializations.map((s): Option => {
    const met = s.requires.filter((r) => own.has(r)).length;
    return {
      kind: 'spec', id: s.id, name: s.name,
      text: s.requires.map((r) => `${own.has(r) ? '✓' : '✗'} ${progressionName(c.basic.classId, r)}${st.pick?.id === r ? ' (teď)' : ''}`).join(' · ')
        + (s.requires.length > s.need ? ` (stačí ${s.need} ze ${s.requires.length})` : ''),
      disabled: c.progression.specialization ? 'specializaci už máš' : nextLevel(c) < 6 ? 'od 6. úrovně' : met < s.need ? `splněno ${met} z ${s.need}` : null,
      details: {
        grants: s.grants ?? [],
        unlocks: P.abilities.filter((a) => a.requiresSpecialization === s.id).map((a) => ({ name: a.name, text: a.text })),
      },
    };
  });
}

/** Rozpis počtu položek k výběru na nové úrovni (pro průvodce). */
export interface ItemsBreakdown { total: number; base: number; parts: { label: string; n: number }[] }

/**
 * Kolik položek (triků, kouzel) se na nové úrovni vybírá.
 * Schopnost s `extraItemsPerLevel` (Paměť na kouzla) přidá +1 za každou další úroveň;
 * když se právě teď volí, platí Pravidlo zpětné opravy (H06): +1 za novou úroveň
 * a +1 za každou předchozí včetně první → celkem +nová úroveň.
 */
export function itemsBreakdown(c: Character, st?: LevelUpState): ItemsBreakdown {
  const P = progressionFor(c.basic.classId);
  if (!P.choose) return { total: 0, base: 0, parts: [] };
  const nl = nextLevel(c);
  const base = P.choose.nFrom6 && nl >= 6 ? P.choose.nFrom6 : P.choose.n;
  const parts: { label: string; n: number }[] = [];
  const own = new Set(c.progression.learnedAbilities.map((a) => a.id));
  for (const a of P.abilities) {
    const per = a.extraItemsPerLevel ?? 0;
    if (!per) continue;
    if (own.has(a.id)) parts.push({ label: a.name, n: per });
    else if (st?.pick?.kind === 'ability' && st.pick.id === a.id) {
      parts.push({ label: `${a.name} (${nl}. úroveň)`, n: per });
      if (nl > 1) parts.push({ label: `${a.name} – zpětně za úrovně 1–${nl - 1}`, n: per * (nl - 1) });
    }
  }
  // Magistr magického oboru (PPP04): 3 kouzla oboru navíc, jednorázově při volbě.
  if (st?.pick?.kind === 'ability') {
    const a = P.abilities.find((x) => x.id === st.pick?.id);
    if (a?.extraItems) {
      const o = a.param && st.pickParams?.[a.param.key];
      parts.push({ label: `${a.name}${o ? ` – ${OBOR_NAME[String(o)] ?? o}` : ''} (kouzla oboru)`, n: a.extraItems });
    }
  }
  return { total: base + parts.reduce((s, x) => s + x.n, 0), base, parts };
}

export function itemsToChoose(c: Character, st?: LevelUpState): number {
  return itemsBreakdown(c, st).total;
}

export interface PoolItem { name: string; group: string; branchId: string | null; fresh: boolean }

/** Nabídka položek: obecná + (u povolání s přístupem) všechny ovládané větve včetně právě zvolené. */
export function itemPool(c: Character, st: LevelUpState): PoolItem[] {
  const P = progressionFor(c.basic.classId);
  if (!P.choose) return [];
  if (c.basic.classId === 'valecnik') return warriorPool(c, st);
  if (c.basic.classId === 'kouzelnik') {
    const now = wizardCtx(c, { level: nextLevel(c), branch: st.pick?.kind === 'branch' ? st.pick.id : null, ability: st.pick?.kind === 'ability' ? st.pick.id : null, spec: st.spec });
    return wizardPool(c, now);
  }
  const out: PoolItem[] = P.choose.pool.map((name) => ({ name, group: P.choose?.poolLabel ?? 'obecná nabídka', branchId: null, fresh: false }));
  if (P.grantMode === 'access') {
    const branchIds = [...c.progression.learnedBranches, ...(st.pick?.kind === 'branch' ? [st.pick.id] : [])];
    for (const id of branchIds) {
      const b = P.branches.find((x) => x.id === id);
      for (const name of b?.items ?? []) out.push({ name, group: b!.name, branchId: id, fresh: !c.progression.learnedBranches.includes(id) });
    }
  }
  return out;
}

/** Název skupiny triku v nabídce průvodce: školy H08 a PPP01 dohromady, pokročilé obecné zvlášť. */
function trickGroup(t: WarriorTrick): string {
  if (t.group === 'Základní') return 'Základní triky';
  if (t.group === 'Obecné') return 'Obecné pokročilé triky (od 6. úrovně)';
  return t.group;
}

/**
 * Nabídka triků válečníka (H08 + PPP01): základní, triky ovládaných škol (H08 hned, PPP01 od 6. úrovně),
 * pokročilé obecné od 6. úrovně, triky specializace a Mistrů Cest. Počítá i s volbou z tohoto přestupu
 * (nová škola, Škola boje na koni, Zručnost se zbraní, 4. stupeň Cesty, nová specializace).
 */
function warriorPool(c: Character, st: LevelUpState): PoolItem[] {
  const nl = nextLevel(c);
  const now = learnCtx(c, { level: nl, school: st.pick?.kind === 'branch' ? st.pick.id : null, ability: st.pick?.kind === 'ability' ? st.pick.id : null, spec: c.progression.specialization ?? st.spec });
  const before = learnCtx(c);
  return TRICKS.filter((t) => !trickLockReason(t, now)).map((t) => ({
    name: t.n, group: trickGroup(t), branchId: trickSchool(t), fresh: !!trickLockReason(t, before),
  }));
}

/** Plný záznam triku podle jména (pro průvodce: cena, použití, text). */
export const trickInfo = (name: string) => TRICKS.find((t) => t.n === name);

/** Profesní dovednosti, které zvolená schopnost/větev dá rovnou (H09, H10, H12). */
export function skillGrants(c: Character, st: LevelUpState): SkillGrant[] {
  const P = progressionFor(c.basic.classId);
  const out: SkillGrant[] = [];
  if (st.pick && st.pick.kind !== 'spec') {
    const src = st.pick.kind === 'branch' ? P.branches.find((b) => b.id === st.pick?.id) : P.abilities.find((a) => a.id === st.pick?.id);
    out.push(...(src?.grantsSkills ?? []));
  }
  // Specializace (PPP03): profesní dovednost na 5. stupni (Chirurgie, Pyromancie, Theurgie).
  const specId = st.pick?.kind === 'spec' ? st.pick.id : !c.progression.specialization ? st.spec : null;
  if (specId) out.push(...(P.specializations.find((x) => x.id === specId)?.grantsSkills ?? []));
  // Automatické zisky úrovně (hraničář 6. úr. – PPP02).
  for (const g of P.levelGrants ?? []) if (g.level === nextLevel(c)) out.push(...(g.grantsSkills ?? []));
  return out.filter((g) => (c.skills.find((s) => s.id === g.id)?.rank ?? 0) < g.rank);
}

/** Automatické zisky, které se neukládají (engine je dopočítá z povolání, úrovně a větví). */
export function autoGains(c: Character, st: LevelUpState): string[] {
  const P = progressionFor(c.basic.classId);
  const out: string[] = [];
  for (const g of skillGrants(c, st)) out.push(`dovednost ${getSkill(g.id)?.name ?? g.id} na ${g.rank}. stupni`);
  const specId = st.pick?.kind === 'spec' ? st.pick.id : !c.progression.specialization ? st.spec : null;
  const spec = specId ? P.specializations.find((x) => x.id === specId) : null;
  if (spec) out.push(...(spec.grants ?? []).filter((g) => !g.startsWith('dovednost ')));
  if (P.autoAtLevel2 && nextLevel(c) === 2) out.push(...P.autoAtLevel2);
  for (const g of P.levelGrants ?? []) if (g.level === nextLevel(c) && !g.grantsSkills) out.push(g.text);
  if (st.pick?.kind === 'ability') {
    const a = P.abilities.find((x) => x.id === st.pick?.id);
    if (a?.grantsItems?.length) out.push(`${a.name} – ${P.itemWord}: ${a.grantsItems.join(', ')}`);
  }
  // Cesty válečníka: 4. stupeň = Mistr, odemkne speciální trik (PPP01).
  if (c.basic.classId === 'valecnik' && st.pick?.kind === 'ability') {
    const path = WARRIOR.paths.find((p) => p.id === st.pick?.id);
    const n = c.progression.learnedAbilities.filter((a) => a.id === st.pick?.id).length + 1;
    if (path && n === 4) out.push(`Mistr – ${path.name}: ${path.master.effect}; můžeš se naučit trik ${path.master.trick}`);
    if (path && n < 4) out.push(`${path.name} – ${n}. stupeň: ${path.ranks[n - 1].name} (${path.ranks[n - 1].effect})`);
  }
  if (c.basic.classId === 'valecnik' && nextLevel(c) === 6) out.push('Tovaryš Cechu válečníků: od 6. úrovně 2 triky za úroveň (PPP01)');
  if (st.pick?.kind === 'branch' && P.grantMode === 'grantAll') {
    const b = P.branches.find((x) => x.id === st.pick?.id);
    out.push(...(b?.items ?? [`${P.branchGrant} (seznam doplní data z pravidel)`]));
  }
  return out;
}

export type StepKey = 'prehled' | 'volba' | 'specializace' | 'atributy' | 'zivoty' | 'dovednosti' | 'polozky' | 'pratele' | 'shrnuti';

export function steps(c: Character, st: LevelUpState): { key: StepKey; label: string }[] {
  const P = progressionFor(c.basic.classId);
  const nl = nextLevel(c);
  const s: { key: StepKey; label: string }[] = [{ key: 'prehled', label: 'Přehled' }, { key: 'volba', label: 'Schopnost' }];
  if (hasSpecStep(c)) s.push({ key: 'specializace', label: 'Specializace' });
  if (gainsCharacterPoints(nl)) s.push({ key: 'atributy', label: 'Atributy' });
  s.push({ key: 'zivoty', label: P.energyGrows ? 'Životy a energie' : 'Životy' });
  s.push({ key: 'dovednosti', label: 'Dovednosti' });
  if (P.choose || autoGains(c, st).length) s.push({ key: 'polozky', label: P.choose ? P.choose.word[0].toUpperCase() + P.choose.word.slice(1) : `Nové ${P.itemWord}` });
  if (growingCompanions(c).length) s.push({ key: 'pratele', label: 'Přátelé' });
  s.push({ key: 'shrnuti', label: 'Shrnutí' });
  return s;
}

export function canNext(c: Character, st: LevelUpState, key: StepKey): boolean {
  switch (key) {
    case 'volba': { const pp = pickParam(c, st); return !!st.pick && (!pp || !!st.pickParams?.[pp.key]); }
    case 'atributy': return st.attrs.length === 2;
    case 'polozky': return !progressionFor(c.basic.classId).choose || (st.items.length === itemsToChoose(c, st) && !magisterWhy(c, st));
    case 'pratele': return !companionStepWhy(c, st.companions ?? {}, companionSpellPool(c, st));
    default: return true;
  }
}

/**
 * Magistr magického oboru (PPP04): 3 kouzla navíc musí patřit do oboru magisterské hodnosti
 * (pokud jich tolik v nabídce je). Vrací důvod, proč výběr ještě nestačí, jinak ''.
 */
export function magisterWhy(c: Character, st: LevelUpState): string {
  if (c.basic.classId !== 'kouzelnik' || st.pick?.kind !== 'ability' || st.pick.id !== 'magistr_magickeho_oboru') return '';
  const obor = String(st.pickParams?.obor ?? '');
  if (!obor) return '';
  const pool = itemPool(c, st).filter((p) => p.branchId === obor && !c.progression.learnedItems.includes(p.name));
  const need = Math.min(3, pool.length);
  const have = st.items.filter((i) => pool.some((p) => p.name === i)).length;
  return have < need ? `Magistr – ${OBOR_NAME[obor] ?? obor}: vyber aspoň ${need} kouzla tohoto oboru (máš ${have}).` : '';
}

export function whyNot(c: Character, key: StepKey, st?: LevelUpState): string {
  switch (key) {
    case 'volba': return st?.pick && pickParam(c, st) ? `Vyber: ${pickParam(c, st)!.label.toLowerCase()}.` : 'Vyber jednu možnost.';
    case 'atributy': return 'Vyber dva různé atributy.';
    case 'pratele': return st ? companionStepWhy(c, st.companions ?? {}, companionSpellPool(c, st)) : '';
    case 'polozky': return (st && st.items.length === itemsToChoose(c, st) && magisterWhy(c, st)) || `Vyber ${itemsToChoose(c, st)} – ${progressionFor(c.basic.classId).choose?.word ?? ''}.`;
    default: return '';
  }
}

/** Kouzla, ze kterých jde vybírat kouzelníkovu příteli: co pán ovládá, včetně kouzel vybraných v tomto přestupu (H11). */
export const companionSpellPool = (c: Character, st: LevelUpState) => [...new Set([...shareableSpells(c), ...(c.basic.classId === 'kouzelnik' ? st.items : [])])];

// ---------- dovednosti ----------

export const hasExpertise = (c: Character) => c.progression.learnedAbilities.some((a) => a.id === 'expertiza');

/** Proč dovednost nejde zlepšit o další stupeň (prázdný řetězec = jde). H14/H18: max +1 za přestup, výjimka Expertiza. */
export function raiseBlock(c: Character, st: LevelUpState, skillId: string): string {
  const nl = nextLevel(c);
  const already = st.raised[skillId] ?? 0;
  const exp = hasExpertise(c) && nl % 2 === 0;
  const otherHasTwo = Object.entries(st.raised).some(([id, n]) => id !== skillId && n >= 2);
  const limit = exp && !otherHasTwo ? 2 : 1;
  if (already >= limit) return exp && already === 1 && otherHasTwo ? 'Expertiza už použita' : 'už zlepšeno';
  const rank = (c.skills.find((s) => s.id === skillId)?.rank ?? 0) + already;
  if (already >= 1 && rank + 1 > nl + 2) return `max. stupeň ${nl + 2}`;
  return '';
}

/** Cena zlepšení o jeden stupeň = cílový stupeň. */
export const raiseCost = (c: Character, st: LevelUpState, skillId: string) => (c.skills.find((s) => s.id === skillId)?.rank ?? 0) + (st.raised[skillId] ?? 0) + 1;

// ---------- promítnutí voleb ----------

export function applyLevelUp(c: Character, st: LevelUpState, now = new Date().toISOString()): Character {
  const nl = nextLevel(c);
  const x: Character = structuredClone(c);
  x.progression.level = nl;
  for (const a of st.attrs) x.attributes[a] += 1;
  if (st.attrs.length) x.attributeLog = [...x.attributeLog, { level: nl, raised: [...st.attrs] }];
  if (st.pick?.kind === 'branch') x.progression.learnedBranches = [...x.progression.learnedBranches, st.pick.id];
  if (st.pick?.kind === 'ability') x.progression.learnedAbilities = [...x.progression.learnedAbilities, { id: st.pick.id, ...(st.pickParams ? { params: { ...st.pickParams } } : {}) }];
  if (st.pick?.kind === 'spec') x.progression.specialization = st.pick.id;
  if (st.spec && !x.progression.specialization) x.progression.specialization = st.spec;
  for (const [id, n] of Object.entries(st.raised)) {
    const s = x.skills.find((k) => k.id === id);
    if (!s || !n) continue;
    for (let i = 0; i < n; i++) {
      x.skillLog.push({ level: nl, skillId: id, from: s.rank, to: s.rank + 1, cost: s.rank + 1 });
      s.rank += 1;
    }
  }
  // Profesní dovednosti ze schopnosti/větve – zdarma, mimo dovednostní body (nejdou do skillLog s cenou).
  for (const g of skillGrants(c, st)) {
    const def = getSkill(g.id);
    const s = x.skills.find((k) => k.id === g.id);
    if (s) s.rank = Math.max(s.rank, g.rank);
    else x.skills.push({ id: g.id, customName: null, attribute: def?.defaultAttribute ?? 'int', rank: g.rank, source: 'ability' });
  }
  for (const a of st.added) {
    x.skills.push({ id: a.id, customName: a.customName, attribute: a.attribute, rank: 1, source: a.customName ? 'custom' : 'bought' });
    x.skillLog.push({ level: nl, skillId: a.id, from: 0, to: 1, cost: 1 });
  }
  x.progression.learnedItems = [...x.progression.learnedItems, ...st.items];
  // Přátelé (7c+): růst zvířete / parťáka a kouzla kouzelníkova přítele.
  x.companions = applyCompanionGrowth(c, st.companions, nl);
  const growth = describeGrowth(c, st.companions, nl);
  const record: LevelUpRecord = {
    level: nl,
    choices: [
      ...(st.pick ? [{ slot: st.pick.kind, id: st.pick.id, ...(st.pickParams ? { params: { ...st.pickParams } } : {}) }] : []),
      ...(st.spec ? [{ slot: 'spec', id: st.spec }] : []),
      ...st.attrs.map((a) => ({ slot: 'attribute', id: a })),
      ...st.items.map((i) => ({ slot: 'item', id: i })),
      ...Object.entries(st.raised).map(([id, n]) => ({ slot: 'skill-raise', id, params: { by: n } })),
      ...st.added.map((a) => ({ slot: 'skill-new', id: a.id })),
      ...growth.map((t) => ({ slot: 'companion', id: t })),
    ],
  };
  x.progression.levelUps = [...x.progression.levelUps, record];
  x.meta = { ...x.meta, updatedAt: now };
  return x;
}

/** Čitelný souhrn jednoho přestupu (historie). */
export function describeLevelUp(cls: ClassId, r: LevelUpRecord): string[] {
  return r.choices.map((ch) => {
    switch (ch.slot) {
      case 'branch': case 'spec': return progressionName(cls, ch.id);
      case 'ability': {
        const def = PROGRESSION[cls].abilities.find((x) => x.id === ch.id);
        const g = def?.param && ch.params?.[def.param.key];
        const opt = g ? def!.param!.options.find((o) => o.id === g)?.name ?? String(g) : null;
        return `${progressionName(cls, ch.id)}${opt ? ` (${opt})` : ''}`;
      }
      case 'attribute': return `${ch.id.toUpperCase()} +1`;
      case 'skill-raise': return `${getSkill(ch.id)?.name ?? ch.id} +${(ch.params?.by as number) ?? 1}`;
      case 'skill-new': return `nová dovednost ${getSkill(ch.id)?.name ?? ch.id.replace(/^custom:/, '')}`;
      default: return ch.id;
    }
  });
}

/** Rozdíly před → po pro shrnutí. */
export function diffRows(before: Character, after: Character): [string, string, string][] {
  const a = derive(before);
  const b = derive(after);
  const rows: [string, string, string][] = [
    ['Úroveň', String(before.progression.level), String(after.progression.level)],
    ['Max. životy', String(a.hpMax.value), String(b.hpMax.value)],
    ['Hranice smrti', String(a.deathThreshold.value), String(b.deathThreshold.value)],
    ...ATTR_KEYS.map((k): [string, string, string] => [k.toUpperCase(), `${before.attributes[k]}`, `${after.attributes[k]}`]),
    ['ZO', String(a.defenseBase.value), String(b.defenseBase.value)],
    ['ÚČ / OČ', `${a.attackNumber.value} / ${a.defenseNumber.value}`, `${b.attackNumber.value} / ${b.defenseNumber.value}`],
    ['Pohyblivost', String(a.mobility.value), String(b.mobility.value)],
    ['Max. energie', String(a.manaMax.value ?? '—'), String(b.manaMax.value ?? '—')],
    ['Dovednostní body k dispozici', String(a.skillPoints.available.value), String(b.skillPoints.available.value)],
  ];
  return rows.filter(([, x, y]) => x !== y);
}
