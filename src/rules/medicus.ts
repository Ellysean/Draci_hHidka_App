// Specializace MEDICUS (PPP03 s. 127–142, fáze 7a+.1): Chirurgie a operace, Bojová anatomie, Resuscitace,
// Plastická chirurgie, Infuze a inhalace (injekce / aerosol) a Sešívanci. Čisté funkce nad postavou.
import { uid } from '../model/defaults';
import type { Character, CraftedItem, CreatureSize, StitchPart, StitchedCreature } from '../model/types';
import { STITCH, SURGERY, WORKSHOP_SKILLS, alch, commit, hasAbility, setState, takeOne, workshopDef, type CheckBonus } from './alchemy';
import type { Derived } from './derive';
import { sgn } from './derive';

export { STITCH, SURGERY };
export const isMedicus = (c: Character) => c.progression.specialization === 'medicus';
const up = (n: number) => Math.ceil(n);

// ---------------------------------------------------------------- bonusy k hodům

export function skillCheck(c: Character, d: Derived, id: string, label: string, attr: 'obr' | 'int', withWorkshop = false): CheckBonus {
  const sk = d.skills.find((s) => s.id === id);
  const parts = [sk ? `${label} ${sgn(sk.total)} (${sk.attribute.toUpperCase()} ${sgn(sk.mod)}, st. ${sk.rank})` : `${attr.toUpperCase()} ${sgn(d.mods[attr])} (bez dovednosti ${label})`];
  let total = sk ? sk.total : d.mods[attr];
  if (withWorkshop) {
    const s = alch(c);
    const ws = workshopDef(s.workshop);
    if (ws && s.workshop?.here && WORKSHOP_SKILLS[s.workshop.kind].includes(id)) { total += ws.bonus; parts.push(`${({ zakladni: 'dílna', laborator: 'laboratoř', vyhen: 'výheň', astrolab: 'astroláb' } as const)[s.workshop.kind]} +${ws.bonus}`); }
  }
  return { total, parts };
}

/** Chirurgie (OBR) + bonus Laboratoře, když v ní Medicus pracuje (PPP03 s. 128). */
export const surgeryBonus = (c: Character, d: Derived) => skillCheck(c, d, 'chirurgie', 'Chirurgie', 'obr', true);
export const firstAidBonus = (c: Character, d: Derived) => skillCheck(c, d, 'prvni_pomoc', 'První pomoc', 'obr');
export const perceptionBonus = (c: Character, d: Derived) => skillCheck(c, d, 'postreh', 'Postřeh', 'int');

/** Úspěch = hod vyšší než obtížnost (stejně jako výroba). */
export const passes = (total: number, dc: number) => total > dc;

/** Ošetření Chirurgií: zastaví krvácení a vyléčí tolik životů, jaký je stupeň dovednosti. */
export const surgeryHeal = (d: Derived) => d.skills.find((s) => s.id === 'chirurgie')?.rank ?? 0;

/** Augmentace: neúspěch o 5 a víc pod obtížnost = obvykle smrt pacienta (biologická, s. 130). */
export function augmentOutcome(total: number, dc: number, kind: 'bio' | 'mech'): 'ok' | 'fail' | 'death' {
  if (passes(total, dc)) return 'ok';
  return kind === 'bio' && total <= dc - 5 ? 'death' : 'fail';
}

/** Resuscitace (s. 139): První pomoc vs. 15 + 3 za každou minutu od smrti, nejvýš 5 minut. */
export const resuscitationDc = (minutes: number): number | null => (minutes > 5 ? null : 15 + 3 * Math.max(0, Math.trunc(minutes)));

/** Plastická chirurgie – přišití kůže / masky (s. 137): 15, každá další operace téhož pacienta +5. */
export const plasticDc = (previousOps: number) => 15 + 5 * Math.max(0, Math.trunc(previousOps));

// ---------------------------------------------------------------- Infuze a inhalace

export const canInfuse = (c: Character, it: CraftedItem, kind: string | undefined) =>
  hasAbility(c, 'infuze_a_inhalace') && !it.injection && !it.aerosol && !it.active && !it.ruined && (kind === 'lektvar' || kind === 'elixir' || kind === 'jed');

/** Injekce: 1 flakón → 2 dávky se stejným účinkem (vpich přímo do žíly). */
export const splitInjection = (c: Character, itemUid: string) =>
  commit(c, `Injekce: ${alch(c).crafted.find((x) => x.uid === itemUid)?.name ?? ''} rozdělen na 2 dávky`, (x, s) =>
    setState(x, { ...s, crafted: takeOne(s.crafted, itemUid, (y) => [{ ...y, uid: uid(), qty: 2, injection: true, note: [y.note, 'injekce – stejný účinek'].filter(Boolean).join(' · ') }]) }));

/** Aerosol: flakón rozbitý na 2 sáhy nebo rozprašovač do 5 sáhů, poloviční účinek. */
export const makeAerosol = (c: Character, itemUid: string) =>
  commit(c, `Aerosol: ${alch(c).crafted.find((x) => x.uid === itemUid)?.name ?? ''}`, (x, s) =>
    setState(x, { ...s, crafted: takeOne(s.crafted, itemUid, (y) => [{ ...y, uid: uid(), qty: 1, aerosol: true, note: [y.note, 'aerosol – ½ účinku'].filter(Boolean).join(' · ') }]) }));

// ---------------------------------------------------------------- Sešívanci

export const LIMB_TYPES = Object.keys(STITCH.limbs);
export const HEAD_TYPES = Object.keys(STITCH.heads);
export const SKIN_TYPES = Object.keys(STITCH.skins);
export const PART_LABEL: Record<StitchPart['kind'], string> = { limb: 'končetina', head: 'hlava', special: 'speciální část', skin: 'kůže' };

/** Obtížnost přidání části: končetina 2 + úr. (T), hlava 5 + úr. (T), speciální 3 + úr. (T), kůže = úr. (T). */
export const partDifficulty = (p: Pick<StitchPart, 'kind' | 'sourceLevel'>) => STITCH.difficulty[p.kind] + Math.max(0, p.sourceLevel);

/** Útok z přišité končetiny či hlavy: ÚČ = SIL (Z) + ½ úrovně (T) + ÚČ části; útočnost z tabulky. */
export function partAttack(base: StitchedCreature['base'], p: StitchPart): { attack: number; damage: number; formula: string } | null {
  const row = p.kind === 'limb' ? STITCH.limbs[p.type] : p.kind === 'head' ? STITCH.heads[p.type] : null;
  if (!row) return null;
  const [un, dmg] = row[base.size];
  const half = up(p.sourceLevel / 2);
  return { attack: base.sil + half + un, damage: dmg, formula: `SIL ${sgn(base.sil)} + ½ úr. ${half} + ${p.type} (${base.size}) ${un}` };
}

/** Nová kůže: ZO = OBR (Z) + ¼ úrovně (Z) + typ kůže (T) − typ kůže (Z); bez výměny null (ZO z bestiáře). */
export function stitchedDefense(cr: Pick<StitchedCreature, 'base' | 'parts'>): { value: number; formula: string } | null {
  const skin = [...cr.parts].reverse().find((p) => p.kind === 'skin');
  if (!skin) return null;
  const t = STITCH.skins[skin.type]?.[cr.base.size];
  const z = STITCH.skins[cr.base.skin]?.[cr.base.size];
  if (t == null || z == null) return null;
  const q = up(cr.base.level / 4);
  return { value: cr.base.obr + q + t - z, formula: `OBR ${sgn(cr.base.obr)} + ¼ úr. ${q} + ${skin.type} ${t} − ${cr.base.skin} ${z}` };
}

/** Max. životy = 10 + ((5 + ODO) × úroveň těla). */
export const stitchedHpMax = (base: StitchedCreature['base']) => Math.max(1, 10 + (5 + base.odo) * Math.max(1, base.level));

export const crystalCount = (c: Character) => alch(c).crafted.filter((x) => x.recipeId === 'kontrolni_krystal' && !x.ruined).reduce((n, x) => n + (x.qty ?? 1), 0);

export interface StitchPlan {
  mana: number;
  materials: number;
  hours: number;
  difficulty: number;
  newDifficulty: number;
  missing: { mana: boolean; materials: boolean; crystal: boolean; parts: boolean; base: boolean };
  ok: boolean;
}

/**
 * Tvorba (creature = null): mana 300 + 100 a suroviny 100 + 100 za každou novou část, obtížnost = součet částí.
 * Vylepšení: 100 many a 100 surovin za novou část (bez základu 300/100, ✔ U 27. 9. 2026), obtížnost = základ + nové části.
 * Nový sešívanec potřebuje sekundární kontrolní krystal a primární musí zůstat u Medika (celkem aspoň 2 kusy).
 */
export function planStitch(c: Character, base: StitchedCreature['base'], newParts: StitchPart[], creature: StitchedCreature | null = null): StitchPlan {
  const n = newParts.length;
  const mana = (creature ? 0 : STITCH.mana.base) + STITCH.mana.perPart * n;
  const materials = (creature ? 0 : STITCH.materials.base) + STITCH.materials.perPart * n;
  const newDifficulty = newParts.reduce((sum, p) => sum + partDifficulty(p), 0);
  const difficulty = (creature?.difficulty ?? 0) + newDifficulty;
  const missing = {
    mana: mana > c.vitals.manaCurrent,
    materials: materials > alch(c).materialsCurrent,
    crystal: !creature && crystalCount(c) < 2,
    parts: creature ? n === 0 : false,
    base: !base.name.trim() || base.level < 1,
  };
  return { mana, materials, hours: Math.max(1, n) * STITCH.hoursPerPart, difficulty, newDifficulty, missing, ok: !Object.values(missing).some(Boolean) };
}

/** Provede operaci: odečte manu a suroviny (i při neúspěchu), nový tvor spotřebuje 1 kontrolní krystal. */
export function stitch(c: Character, base: StitchedCreature['base'], newParts: StitchPart[], rollTotal: number, opts: { name?: string; creatureUid?: string } = {}, now = new Date().toISOString()):
  { character: Character; success: boolean; plan: StitchPlan } {
  const s0 = alch(c);
  const creature = opts.creatureUid ? s0.stitched.find((x) => x.uid === opts.creatureUid) ?? null : null;
  const plan = planStitch(c, base, newParts, creature);
  const success = passes(rollTotal, plan.difficulty);
  const name = creature?.name ?? (opts.name?.trim() || `Sešívanec (${base.name})`);
  const text = `${creature ? 'Vylepšení' : 'Sešívanec'}: ${name} – ${success ? 'úspěch' : 'neúspěch, tvor umírá'} (hod ${rollTotal} vs. ${plan.difficulty}, −${plan.mana} many, −${plan.materials} surovin)`;
  const character = commit(c, text, (x, s) => {
    let crafted = s.crafted;
    if (!creature) {
      const k = crafted.find((y) => y.recipeId === 'kontrolni_krystal' && !y.ruined);
      if (k) crafted = takeOne(crafted, k.uid, () => []);
    }
    const parts = [...(creature?.parts ?? []), ...newParts];
    const cr: StitchedCreature = creature
      ? { ...creature, parts, difficulty: plan.difficulty, alive: success && creature.alive, hpCurrent: success ? creature.hpCurrent : 0 }
      : { uid: uid(), name, base, parts, difficulty: plan.difficulty, hpCurrent: success ? stitchedHpMax(base) : 0, alive: success, createdAt: now, note: '' };
    const stitched = creature ? s.stitched.map((y) => (y.uid === creature.uid ? cr : y)) : success ? [...s.stitched, cr] : s.stitched;
    const y = { ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - plan.mana } };
    return setState(y, { ...s, crafted, stitched, materialsCurrent: s.materialsCurrent - plan.materials });
  }, now);
  return { character, success, plan };
}

export const updateStitched = (c: Character, crUid: string, patch: Partial<Pick<StitchedCreature, 'hpCurrent' | 'note' | 'name' | 'alive'>>) => {
  const s = alch(c);
  return { ...c, classState: { ...c.classState, alchymista: { ...s, stitched: s.stitched.map((x) => (x.uid === crUid ? { ...x, ...patch } : x)) } } };
};

export const removeStitched = (c: Character, crUid: string) =>
  commit(c, `Sešívanec odebrán: ${alch(c).stitched.find((x) => x.uid === crUid)?.name ?? ''}`, (x, s) => setState(x, { ...s, stitched: s.stitched.filter((y) => y.uid !== crUid) }));

export const newPart = (kind: StitchPart['kind']): StitchPart => ({
  uid: uid(), kind, source: '', sourceLevel: 1,
  type: kind === 'limb' ? LIMB_TYPES[0] : kind === 'head' ? HEAD_TYPES[0] : kind === 'skin' ? SKIN_TYPES[0] : 'křídla',
});

export const SIZES: CreatureSize[] = STITCH.sizes;
