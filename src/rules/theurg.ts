// Specializace THEURG (PPP03 s. 163–190, fáze 7a+.3): Theurgova hůl s Astronem, Astrální sféry (předměty s démony),
// Ovládnutí živlů (bhůtové), Poslové živlů (elementálové), Práce s esencemi. Talismany, portály, oživlé pomůcky a
// vichry many jsou běžné recepty. Čisté funkce nad postavou.
import { uid } from '../model/defaults';
import type { Character, CraftedItem, SummonedElemental, TheurgState } from '../model/types';
import { THEURG, alch, commit, setState, type CheckBonus, type DemonRow, type ElementalDef } from './alchemy';
import type { Derived } from './derive';
import { skillCheck } from './medicus';

export { THEURG };
export const isTheurg = (c: Character) => c.progression.specialization === 'theurg';
export const theurgState = (c: Character): TheurgState =>
  alch(c).theurg ?? { staff: { owned: false, mana: 0, astron: '' }, essences: { ohen: 0, voda: 0, vzduch: 0, zeme: 0 }, elementals: [] };
const putT = (c: Character, t: TheurgState) => setState(c, { ...alch(c), theurg: t });

/** Theurgie (INT) + bonus Astrolábu, když v něm Theurg pracuje. */
export const theurgyBonus = (c: Character, d: Derived): CheckBonus => skillCheck(c, d, 'theurgie', 'Theurgie', 'int', true);
/** Úspěch = hod vyšší než obtížnost (rozdíl ≥ 1 – Tabulka životnosti démonů). */
const passes = (total: number, dc: number) => total > dc;

// ---------------------------------------------------------------- Theurgova hůl

const S = THEURG.staff;

/** Výroba hole: balzamovací olej 200 many + Astron 100 many (úplněk). */
export function craftStaff(c: Character): { character: Character; error?: string } {
  if (theurgState(c).staff.owned) return { character: c, error: 'Hůl už máš.' };
  if (c.vitals.manaCurrent < S.craftMana) return { character: c, error: `Na hůl je potřeba ${S.craftMana} many.` };
  return {
    character: commit(c, `Theurgova hůl vyrobena (−${S.craftMana} many)`, (x) => {
      const y = { ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - S.craftMana } };
      const t = theurgState(y);
      return putT(y, { ...t, staff: { ...t.staff, owned: true } });
    }),
  };
}

/** Hůl zapsaná bez výroby (získaná jinak) nebo ztracená. */
export const setStaffOwned = (c: Character, owned: boolean) =>
  commit(c, owned ? 'Theurgova hůl zapsána' : 'Theurgova hůl odebrána', (x) => { const t = theurgState(x); return putT(x, { ...t, staff: { ...t.staff, owned } }); });

/** Dobití hole z vlastní many (10 bodů za kolo, nejvýš 1000). Vrací i počet kol. */
export function chargeStaff(c: Character, amount: number): { character: Character; rounds: number } {
  const t = theurgState(c);
  const n = Math.min(S.maxMana - t.staff.mana, Math.max(0, Math.trunc(amount)), c.vitals.manaCurrent);
  if (n <= 0) return { character: c, rounds: 0 };
  const rounds = Math.ceil(n / S.chargePerRound);
  return {
    rounds,
    character: commit(c, `Hůl dobita +${n} many (${rounds} kol)`, (x) => {
      const y = { ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - n } };
      const tt = theurgState(y);
      return putT(y, { ...tt, staff: { ...tt.staff, mana: tt.staff.mana + n } });
    }),
  };
}

export const setAstron = (c: Character, astron: string) =>
  commit(c, astron ? `Astron: ${astron}` : 'Astron uvolněn', (x) => { const t = theurgState(x); return putT(x, { ...t, staff: { ...t.staff, astron } }); });

/** Hůl do zbraní postavy: lehká obouruční drtivá zbraň (útočnost 7, zranění 1, obrana 1). */
export function staffToWeapons(c: Character): Character {
  if (c.equipment.weapons.some((w) => w.custom?.name.startsWith('Theurgova hůl'))) return c;
  return commit(c, 'Do zbraní: Theurgova hůl', (x) => ({
    ...x,
    equipment: {
      ...x.equipment,
      weapons: [...x.equipment.weapons, {
        uid: uid(), itemId: null, grip: 'two-handed', equipped: false, weightLb: S.weightLb,
        custom: { name: `Theurgova hůl (dosah ${S.reach}, +5 proti démonům a elementálům)`, attack: S.attack, damage: S.damage, defense: S.defense, strReq: null, kind: 'melee', category: 'Lehké obouruční', damageTypes: ['drtivé'] },
      }],
    },
  }));
}

// ---------------------------------------------------------------- Astrální sféry – předměty s démony

export const demonById = (id: string) => THEURG.demons.find((x) => x.id === id);
const ROMAN = ['', 'I.', 'II.', 'III.', 'IV.', 'V.'];
export const demonLabel = (r: DemonRow) => `${r.demon} ${ROMAN[r.level]} (${r.sphere})`;

export interface DemonPlan {
  rows: DemonRow[];
  difficulty: number;
  mana: number;
  materials: number;
  /** Příprava předmětu v hodinách (2× obtížnost), obřad navíc 4 směny + 1 kolo. */
  hours: number;
  helperLevels: number;
  pestLevels: number;
  errors: string[];
  momentMax: number | null;
  ok: boolean;
}

/**
 * Pravidla výběru (PPP03 s. 167): z každé sféry nejvýš jeden řádek; se dvěma a více pomocníky aspoň (pomocníci − 1)
 * škůdců a součet úrovní škůdců aspoň polovina součtu úrovní pomocníků. Obtížnost nesmí přesáhnout magický okamžik.
 */
export function planDemons(c: Character, ids: string[], momentId: string, momentCustom?: number): DemonPlan {
  const rows = ids.map(demonById).filter((x): x is DemonRow => !!x);
  const helpers = rows.filter((r) => r.cat === 'pomocnik');
  const pests = rows.filter((r) => r.cat === 'skudce');
  const helperLevels = helpers.reduce((n, r) => n + r.level, 0);
  const pestLevels = pests.reduce((n, r) => n + r.level, 0);
  const difficulty = rows.reduce((n, r) => n + r.dc, 0);
  const errors: string[] = [];
  const spheres = rows.map((r) => r.sphere);
  const dup = spheres.filter((s, i) => spheres.indexOf(s) !== i);
  if (dup.length) errors.push(`z každé sféry jen jeden démon (${[...new Set(dup)].join(', ')})`);
  if (!helpers.length) errors.push('aspoň jeden démon pomocník');
  if (helpers.length >= 2) {
    if (pests.length < helpers.length - 1) errors.push(`potřeba aspoň ${helpers.length - 1} škůdců`);
    if (pestLevels * 2 < helperLevels) errors.push(`úrovně škůdců aspoň ${Math.ceil(helperLevels / 2)} (teď ${pestLevels})`);
  }
  const m = THEURG.moments.find((x) => x.id === momentId);
  const momentMax = m ? (m.max ?? (momentCustom != null ? momentCustom + 3 : null)) : null;
  if (momentMax != null && difficulty > momentMax) errors.push(`obtížnost ${difficulty} přesahuje magický okamžik (max. ${momentMax})`);
  const mana = rows.reduce((n, r) => n + r.mana, 0);
  const materials = rows.reduce((n, r) => n + r.materials, 0);
  if (mana > c.vitals.manaCurrent) errors.push('mana');
  if (materials > alch(c).materialsCurrent) errors.push('suroviny');
  return { rows, difficulty, mana, materials, hours: 2 * Math.max(0, difficulty), helperLevels, pestLevels, errors, momentMax, ok: rows.length > 0 && !errors.length };
}

/** Životnost démona podle rozdílu hodu a obtížnosti (Tabulka životnosti démonů). */
export const demonLifespan = (margin: number) => THEURG.lifespan.find((l) => margin >= l.min && (l.max == null || margin <= l.max))?.text ?? null;

/**
 * Obřad: mana a suroviny přípravy se odečtou vždy. Úspěch = démoni v předmětu (výrobek) nebo jeden démon v Astronu hole.
 * Neúspěch = démon unikne nebo do předmětu vnikne náhodný škůdce (PJ).
 */
export function summonDemons(c: Character, ids: string[], momentId: string, baseItem: string, target: 'item' | 'astron', rollTotal: number, momentCustom?: number, now = new Date().toISOString()):
  { character: Character; success: boolean; plan: DemonPlan; lifespan: string | null } {
  const plan = planDemons(c, ids, momentId, momentCustom);
  const success = passes(rollTotal, plan.difficulty);
  const lifespan = success ? demonLifespan(rollTotal - plan.difficulty) : null;
  const names = plan.rows.map(demonLabel);
  const text = `Astrální sféry: ${baseItem || 'předmět'} ← ${names.join(', ')} – ${success ? `úspěch (${lifespan})` : 'neúspěch, démon unikl nebo vnikl škůdce'} (Theurgie ${rollTotal} vs. ${plan.difficulty}, −${plan.mana} many, −${plan.materials} surovin)`;
  const character = commit(c, text, (x, s) => {
    let y: Character = { ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - plan.mana } };
    y = setState(y, { ...s, materialsCurrent: s.materialsCurrent - plan.materials });
    if (!success) return y;
    if (target === 'astron') {
      const t = theurgState(y);
      return putT(y, { ...t, staff: { ...t.staff, astron: `${names.join(', ')} – ${lifespan}` } });
    }
    const item: CraftedItem = {
      uid: uid(), recipeId: 'astralni_predmet', name: `${baseItem || 'Předmět'} (${plan.rows.filter((r) => r.cat === 'pomocnik').map((r) => r.demon).join(', ')})`,
      form: 'potion', danger: rollTotal, extraManaLeft: null, extraManaMax: null, craftedAt: now, qty: 1, difficulty: plan.difficulty,
      note: `životnost: ${lifespan}`, demons: plan.rows.map((r) => `${demonLabel(r)}: ${r.text}`),
    };
    const s1 = alch(y);
    return setState(y, { ...s1, crafted: [item, ...s1.crafted] });
  }, now);
  return { character, success, plan, lifespan };
}

// ---------------------------------------------------------------- Ovládnutí živlů – bhůtové

export const bhutRow = (st: number) => THEURG.bhuts.rows.find((r) => r.st === st) ?? THEURG.bhuts.rows[0];

/** Vyvolání bhůta: Theurgie vs. obtížnost stupně; při úspěchu si vezme manu z hole. */
export function summonBhut(c: Character, kindId: string, st: number, rollTotal: number): { character: Character; success: boolean; error?: string } {
  const row = bhutRow(st);
  const t = theurgState(c);
  if (!t.staff.owned) return { character: c, success: false, error: 'Bhůta vyvoláš jen holí.' };
  if (t.staff.mana < row.mana) return { character: c, success: false, error: `V holi je jen ${t.staff.mana} many, bhůt ${st}. stupně potřebuje ${row.mana}.` };
  const kind = THEURG.bhuts.kinds.find((k) => k.id === kindId);
  const success = passes(rollTotal, row.dc);
  const character = commit(c, `Bhůt ${kind?.name ?? ''} ${st}. stupně – ${success ? `vyvolán na ${row.dur} (−${row.mana} many z hole)` : 'nepodařilo se'} (Theurgie ${rollTotal} vs. ${row.dc})`, (x) => {
    if (!success) return x;
    const tt = theurgState(x);
    return putT(x, { ...tt, staff: { ...tt.staff, mana: tt.staff.mana - row.mana } });
  });
  return { character, success };
}

// ---------------------------------------------------------------- Poslové živlů – elementálové

export const elementalDef = (id: SummonedElemental['kind']) => THEURG.elementals.find((e) => e.id === id)!;
const at = (v: [number, number], grade: number) => v[0] + v[1] * (Math.max(1, grade) - 1);

/** Hodnoty elementála daného stupně – údaj v tabulce platí pro 1. stupeň (✔ U 27. 9. 2026), přírůstek za každý další. */
export function elementalStats(e: ElementalDef, grade: number) {
  const g = Math.max(1, Math.trunc(grade));
  return {
    mana: at(e.mana, g), dc: at(e.dc, g), level: at(e.level, g), hp: at(e.hp, g),
    size: e.sizes.find(([a, b]) => g >= a && (b == null || g <= b))?.[2] ?? 'D',
    attack: `${e.attack[0] + (g - 1)}/${e.attack[1] >= 0 ? '+' : ''}${e.attack[1]} ${e.attacks}×`,
    zo: e.zo + Math.floor(g / 2), oc: e.oc + (g - 1), days: g,
  };
}

export function summonElemental(c: Character, kind: SummonedElemental['kind'], grade: number, rollTotal: number, now = new Date().toISOString()):
  { character: Character; success: boolean; error?: string } {
  const e = elementalDef(kind);
  const st = elementalStats(e, grade);
  const t = theurgState(c);
  if (!t.staff.owned) return { character: c, success: false, error: 'Elementála přivoláš jen holí.' };
  if (t.staff.mana < st.mana) return { character: c, success: false, error: `V holi je jen ${t.staff.mana} many, potřeba ${st.mana}.` };
  const success = passes(rollTotal, st.dc);
  const character = commit(c, `Posel živlů ${e.name} ${grade}. stupně – ${success ? `přivolán (−${st.mana} many z hole, ${st.days} dní)` : 'nepodařilo se'} (Theurgie ${rollTotal} vs. ${st.dc})`, (x) => {
    if (!success) return x;
    const tt = theurgState(x);
    const el: SummonedElemental = { uid: uid(), kind, grade, hpCurrent: st.hp, summonedAt: now, note: '' };
    return putT(x, { ...tt, staff: { ...tt.staff, mana: tt.staff.mana - st.mana }, elementals: [...tt.elementals, el] });
  }, now);
  return { character, success };
}

export const updateElemental = (c: Character, eUid: string, patch: Partial<Pick<SummonedElemental, 'hpCurrent' | 'note'>>) => {
  const t = theurgState(c);
  return putT(c, { ...t, elementals: t.elementals.map((x) => (x.uid === eUid ? { ...x, ...patch } : x)) });
};
export const dismissElemental = (c: Character, eUid: string) =>
  commit(c, `Elementál odešel do sféry Sirael: ${elementalDef(theurgState(c).elementals.find((x) => x.uid === eUid)?.kind ?? 'igni').name}`, (x) => {
    const t = theurgState(x);
    return putT(x, { ...t, elementals: t.elementals.filter((y) => y.uid !== eUid) });
  });

// ---------------------------------------------------------------- Práce s esencemi

export type EssenceKind = keyof TheurgState['essences'];

/** Separace: z 1 many 4 body esencí (po jednom od každého živlu); 10 many za směnu. */
export function separateEssences(c: Character, mana: number): { character: Character; shifts: number } {
  const n = Math.min(Math.max(0, Math.trunc(mana)), c.vitals.manaCurrent);
  if (n <= 0) return { character: c, shifts: 0 };
  const shifts = Math.ceil(n / THEURG.essences.manaPerShift);
  return {
    shifts,
    character: commit(c, `Separace esencí: −${n} many → +${n} od každé esence (${shifts} směn)`, (x) => {
      const y = { ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - n } };
      const t = theurgState(y);
      const e = t.essences;
      return putT(y, { ...t, essences: { ohen: e.ohen + n, voda: e.voda + n, vzduch: e.vzduch + n, zeme: e.zeme + n } });
    }),
  };
}

export function useEssence(c: Character, kind: EssenceKind, amount: number, what: string): { character: Character; error?: string } {
  const t = theurgState(c);
  if (t.essences[kind] < amount) return { character: c, error: `Esence (${kind}) je jen ${t.essences[kind]}.` };
  return {
    character: commit(c, `Esence ${THEURG.essences.kinds.find((k) => k.id === kind)?.name}: ${what} (−${amount})`, (x) => {
      const tt = theurgState(x);
      return putT(x, { ...tt, essences: { ...tt.essences, [kind]: tt.essences[kind] - amount } });
    }),
  };
}
