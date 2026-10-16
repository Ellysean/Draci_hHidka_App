// Průvodce tvorbou postavy (docs/CHARACTER_CREATION.md) – čistá logika bez UI.
// Průvodce jen připraví vstupní data; vše odvozené dál počítá derive().
import { emptyClassState, newCharacter, uid } from '../model/defaults';
import { ATTR_KEYS, type AlchemistBase, type ArmorPiece, type AttrKey, type Character, type CharacterSkill, type ClassId, type GearItem, type RaceId, type WeaponEntry } from '../model/types';
import {
  CLASSES,
  LEVEL1,
  RECOMMENDED,
  getArmor,
  getClass,
  getGear,
  getRace,
  getShield,
  getSkill,
  getWeapon,
  type EquipLine,
} from '../rules/data';
import { derive } from '../rules/derive';
import { startingBases } from '../rules/alchemy';
import { mdToMoney } from '../rules/money';
import { SAVE_SKILLS } from '../rules/rasy';

export type CartKind = 'gear' | 'acc' | 'weapon' | 'armor' | 'robe' | 'shield';

export interface CartLine {
  kind: CartKind;
  id: string;
  qty: number;
  md: number; // cena za kus v měďácích
}

export interface AddedSkill {
  id: string; // id ze skills.json nebo "custom:<uuid>"
  customName: string | null;
  attribute: AttrKey;
}

export interface Draft {
  step: number;
  name: string;
  concept: string;
  raceId: RaceId | null;
  classId: ClassId | null;
  deity: string;
  method: 'roll' | 'points';
  rolls: (number | null)[]; // 6 hodů k6
  rerolls: number;
  assign: Partial<Record<AttrKey, number>>; // atribut → index hodu
  points: Record<AttrKey, number>;
  added: AddedSkill[];
  picks: string[];
  eqMode: 'recommended' | 'custom';
  choice: number | null; // index volitelné sady v doporučené výbavě
  gold: number | null; // hod 30 + 1k10 (jen na míru)
  cart: CartLine[];
}

export const STEPS = [
  { key: 'koncept', label: 'Koncept' },
  { key: 'rasa', label: 'Rasa' },
  { key: 'povolani', label: 'Povolání' },
  { key: 'atributy', label: 'Atributy' },
  { key: 'zivoty', label: 'Životy a energie' },
  { key: 'dovednosti', label: 'Dovednosti' },
  { key: 'schopnosti', label: 'Schopnosti' },
  { key: 'vybaveni', label: 'Vybavení' },
  { key: 'shrnuti', label: 'Shrnutí' },
] as const;
export type StepKey = (typeof STEPS)[number]['key'];

export const newDraft = (): Draft => ({
  step: 0, name: '', concept: '', raceId: null, classId: null, deity: '',
  method: 'roll', rolls: [null, null, null, null, null, null], rerolls: 0, assign: {},
  points: { sil: 1, obr: 1, odo: 1, int: 1, char: 1 },
  added: [], picks: [], eqMode: 'recommended', choice: null, gold: null, cart: [],
});

// ---------- atributy ----------

export function diceState(d: Draft) {
  const vals = d.rolls;
  const ok = vals.every((v) => v != null && Number.isInteger(v) && v >= 1 && v <= 6);
  let struck = -1;
  if (ok) {
    struck = 0;
    vals.forEach((v, i) => { if ((v as number) < (vals[struck] as number)) struck = i; });
  }
  return { ok, vals, struck };
}

export const pointsUsed = (d: Draft) => ATTR_KEYS.reduce((s, k) => s + d.points[k], 0);

/** Hod nebo body přidané k rodovému základu (null = zatím nepřiřazeno). */
export function additions(d: Draft): Record<AttrKey, number | null> {
  if (d.method === 'points') return { ...d.points };
  const dice = diceState(d);
  const out = {} as Record<AttrKey, number | null>;
  for (const k of ATTR_KEYS) {
    const i = d.assign[k];
    out[k] = dice.ok && i != null && i !== dice.struck ? (dice.vals[i] as number) : null;
  }
  return out;
}

/** Stupeň = rodový základ + hod/body + 3 za dominantní atribut povolání. */
export function finalAttributes(d: Draft): Record<AttrKey, number | null> {
  const base = d.raceId ? getRace(d.raceId).baseAttributes : null;
  const dom = d.classId ? getClass(d.classId).dominantAttributes : [];
  const add = additions(d);
  const out = {} as Record<AttrKey, number | null>;
  for (const k of ATTR_KEYS) {
    const a = add[k];
    out[k] = base && a != null ? base[k] + a + (dom.includes(k) ? 3 : 0) : null;
  }
  return out;
}

export const attributesDone = (d: Draft) =>
  !!d.raceId && !!d.classId && ATTR_KEYS.every((k) => finalAttributes(d)[k] != null) && (d.method === 'roll' || pointsUsed(d) === 20);

/** Přiřadí hodnotu hodu atributu; hodnota se může použít jen jednou. */
export function assignDie(d: Draft, attr: AttrKey, index: number): Draft {
  const assign = { ...d.assign };
  for (const k of ATTR_KEYS) if (assign[k] === index) delete assign[k];
  assign[attr] = index;
  return { ...d, assign };
}

// ---------- výbava ----------

export interface BuiltEquipment {
  weapons: WeaponEntry[];
  armor: ArmorPiece;
  shield: ArmorPiece;
  items: GearItem[];
  bases: AlchemistBase[];
  purseMd: number;
  lines: { name: string; qty: number; source: string }[];
  spareArmor: number;
}

const CART_LINE_KEY: Record<CartKind, keyof EquipLine> = {
  gear: 'itemId', acc: 'accessoryId', weapon: 'weaponId', armor: 'armorId', robe: 'armorId', shield: 'armorId',
};

export function lineName(l: EquipLine): string {
  if (l.weaponId) return getWeapon(l.weaponId)?.n ?? l.weaponId;
  if (l.armorId) return getArmor(l.armorId)?.n ?? getShield(l.armorId)?.n ?? l.armorId;
  if (l.itemId || l.accessoryId) return getGear(l.itemId ?? l.accessoryId ?? null)?.n ?? '?';
  if (l.special === 'alchymista_startovni_zaklady') return 'Startovní základy (19 ks, H10)';
  return '?';
}

export function buildEquipment(d: Draft): BuiltEquipment {
  const out: BuiltEquipment = {
    weapons: [],
    armor: { itemId: null, custom: null, equipped: true, weightLb: null },
    shield: { itemId: null, custom: null, equipped: false, weightLb: null },
    items: [], bases: [], purseMd: 0, lines: [], spareArmor: 0,
  };
  const addItem = (id: string, qty: number, suffix = '') => {
    const g = getGear(id) ?? getArmor(id) ?? getShield(id);
    const name = (g?.n ?? id) + suffix;
    const ex = out.items.find((i) => i.itemId === id && i.name === name);
    if (ex) ex.qty += qty;
    else out.items.push({ uid: uid(), name, itemId: id, qty, weightLb: g?.w ?? 0, carried: true, container: null });
  };
  const add = (l: EquipLine, source: string) => {
    const qty = l.qty ?? 1;
    out.lines.push({ name: lineName(l), qty, source });
    if (l.weaponId) {
      const w = getWeapon(l.weaponId);
      out.weapons.push({
        uid: uid(), itemId: l.weaponId, custom: null, grip: w?.grip === 'obouruční' ? 'two-handed' : 'one-handed',
        equipped: true, weightLb: null, ...(qty > 1 ? { qty } : {}),
      });
    } else if (l.armorId && getShield(l.armorId)) {
      if (!out.shield.itemId) out.shield = { itemId: l.armorId, custom: null, equipped: true, weightLb: null };
      else { out.spareArmor++; addItem(l.armorId, 1, ' (nenasazeno)'); }
    } else if (l.armorId) {
      if (!out.armor.itemId) out.armor = { itemId: l.armorId, custom: null, equipped: true, weightLb: null };
      else { out.spareArmor++; addItem(l.armorId, 1, ' (nenasazeno)'); }
    } else if (l.special === 'alchymista_startovni_zaklady') {
      // 19 startovních základů (H10 s. 2, celkem 7,3 lb) – jednotlivě, aby šly párovat s recepty.
      out.bases.push(...startingBases());
    } else if (l.itemId || l.accessoryId) {
      addItem((l.itemId ?? l.accessoryId) as string, qty);
    }
  };
  if (d.classId) {
    const R = RECOMMENDED.byClass[d.classId];
    if (d.eqMode === 'recommended') {
      const ch = d.choice != null ? R.choose[d.choice] : null;
      ch?.items.forEach((l) => add(l, 'volba'));
      R.fixed.forEach((l) => add(l, 'povolání'));
      R.items.forEach((l) => add(l, 'povolání'));
      RECOMMENDED.common.forEach((l) => add(l, 'společné'));
      out.purseMd = R.gold * 100;
    } else {
      out.purseMd = (d.gold ?? 0) * 100;
    }
    for (const c of d.cart) {
      add({ [CART_LINE_KEY[c.kind]]: c.id, qty: c.qty } as EquipLine, 'koupeno');
      out.purseMd -= c.md * c.qty;
    }
  }
  return out;
}

// ---------- doporučené dovednosti pro začínající hráče (H05 s. 7) ----------

export interface RecommendedSkill {
  id: string;
  name: string;
  attribute: AttrKey;
}

const rec = (id: string, attribute?: AttrKey): RecommendedSkill => {
  const s = getSkill(id);
  return { id, name: s?.name ?? id, attribute: attribute ?? s?.defaultAttribute ?? 'int' };
};

/** Tabulka dovedností pro začínající hráče (H05 s. 7), sloupec Doporučené dovednosti – každá na 1. stupni. */
export const RECOMMENDED_SKILLS: Record<ClassId, RecommendedSkill[]> = {
  valecnik: [rec('hbitost'), rec('preziti_v_prirode'), rec('zvladnuti_zvirat')],
  hranicar: [rec('prvni_pomoc'), rec('vydrz'), rec('zvladnuti_zvirat')],
  alchymista: [rec('hbitost'), rec('postreh'), rec('preziti_v_prirode')],
  kouzelnik: [rec('hbitost'), rec('postreh'), rec('vydrz')],
  zlodej: [rec('atletika'), rec('mechanika'), rec('postreh')],
  // H05 uvádí „Znalost poměrů (INT/CHAR)“ – ta byla nahrazena Etiketou (✔ U 16. 10. 2026).
  klerik: [rec('postreh'), rec('vzdelani'), rec('etiketa')],
};

/** Dovednosti pro záchranné hody (Atletika, Vůle, Postřeh, Výdrž, Hbitost – ✔ U 3. 10. 2026), které postava nemá. */
export function missingSaveSkills(d: Draft): RecommendedSkill[] {
  if (!d.classId) return [];
  const owned = new Set([...classSkills(d.classId).map((s) => s.id), ...d.added.map((a) => a.id)]);
  return [...SAVE_SKILLS].filter((id) => !owned.has(id)).map((id) => rec(id));
}

/** Naučí jednu doporučenou dovednost (1 bod), pokud ji postava nemá a zbývá bod. */
export function learnRecommended(d: Draft, r: RecommendedSkill): Draft {
  if (draftSkillPointsLeft(d) < 1 || d.added.some((a) => a.id === r.id)) return d;
  return { ...d, added: [...d.added, { id: r.id, customName: null, attribute: r.attribute }] };
}

/** Dovednostní body, které v konceptu ještě zbývají (3, člověk 4, minus nově naučené). */
export function draftSkillPointsLeft(d: Draft): number {
  return derive(buildCharacter(d)).skillPoints.available.value;
}

/** Doporučené dovednosti, které postava ještě nemá. */
export function missingRecommended(d: Draft): RecommendedSkill[] {
  if (!d.classId) return [];
  const owned = new Set([...classSkills(d.classId).map((s) => s.id), ...d.added.map((a) => a.id)]);
  return RECOMMENDED_SKILLS[d.classId].filter((r) => !owned.has(r.id));
}

/** Přidá chybějící doporučené dovednosti (každá za 1 bod), dokud stačí body. */
export function applyRecommended(d: Draft): Draft {
  let left = draftSkillPointsLeft(d);
  const added = [...d.added];
  for (const r of missingRecommended(d)) {
    if (left < 1) break;
    added.push({ id: r.id, customName: null, attribute: r.attribute });
    left--;
  }
  return { ...d, added };
}

// ---------- sestavení postavy ----------

export function classSkills(classId: ClassId): CharacterSkill[] {
  const cls = getClass(classId);
  const mk = (id: string, source: CharacterSkill['source']): CharacterSkill => ({
    id, customName: null, attribute: getSkill(id)?.defaultAttribute ?? 'int', rank: 3, source,
  });
  return [...cls.basicSkills.map((id) => mk(id, 'class-basic')), ...cls.professionSkills.map((id) => mk(id, 'class-profession'))];
}

/** Postava tak, jak ji průvodce vytvoří (i pro živý náhled během tvorby). */
export function buildCharacter(d: Draft, now = new Date().toISOString()): Character {
  const c = newCharacter(now);
  const classId = d.classId ?? 'valecnik';
  const raceId = d.raceId ?? 'clovek';
  const attrs = finalAttributes(d);
  c.basic = { ...c.basic, name: d.name.trim(), raceId, classId, deity: classId === 'klerik' ? d.deity.trim() : '', notes: d.concept.trim() ? `Koncept: ${d.concept.trim()}` : '' };
  for (const k of ATTR_KEYS) c.attributes[k] = attrs[k] ?? 10;
  c.skills = [
    ...(d.classId ? classSkills(d.classId) : []),
    ...d.added.map((a): CharacterSkill => ({ id: a.id, customName: a.customName, attribute: a.attribute, rank: 1, source: a.customName ? 'custom' : 'bought' })),
  ];
  c.skillLog = d.added.map((a) => ({ level: 1, skillId: a.id, from: 0, to: 1, cost: 1 }));
  c.progression.learnedItems = [...d.picks];
  c.classState = emptyClassState(classId);
  const eq = buildEquipment(d);
  c.equipment = { weapons: eq.weapons, armor: eq.armor, shield: eq.shield, items: eq.items, money: mdToMoney(eq.purseMd), customCatalog: [], ledger: [], undo: null };
  if (c.classState.alchymista) c.classState.alchymista.bases = eq.bases;
  const dice = diceState(d);
  const add = additions(d);
  c.meta.creation = {
    attributeMethod: d.method,
    rolls: d.method === 'roll' && dice.ok ? (dice.vals as number[]) : null,
    rerolls: d.rerolls,
    assignment: Object.fromEntries(ATTR_KEYS.map((k) => [k, add[k] ?? 0])) as Record<AttrKey, number>,
    equipmentMode: d.eqMode,
    startingGold: d.eqMode === 'custom' ? d.gold : null,
    purchases: d.cart.map((x) => ({ itemId: x.id, qty: x.qty, priceMd: x.md })),
  };
  // Aktuální životy a energie začínají na maximu (válečníkův adrenalin na 0).
  const der = derive(c);
  c.vitals.hpCurrent = der.hpMax.value;
  if (classId === 'alchymista' && c.classState.alchymista) {
    c.vitals.manaCurrent = alchemistStart(c.attributes.int, c.attributes.obr).mana;
    c.classState.alchymista.materialsCurrent = alchemistStart(c.attributes.int, c.attributes.obr).materials;
  } else if (classId !== 'valecnik') {
    c.vitals.manaCurrent = der.manaMax.value ?? 0;
  }
  return c;
}

/** Start alchymisty (H10): mana = 12 × INT − 24, suroviny = 20 × OBR + 120. */
export const alchemistStart = (intValue: number, obrValue: number) => ({ mana: 12 * intValue - 24, materials: 20 * obrValue + 120 });

// ---------- kroky ----------

export function canStep(d: Draft, key: StepKey): boolean {
  switch (key) {
    case 'koncept': return !!d.name.trim();
    case 'rasa': return !!d.raceId;
    case 'povolani': return !!d.classId && (d.classId !== 'klerik' || !!d.deity.trim());
    case 'atributy': return attributesDone(d);
    case 'schopnosti': { const ch = d.classId ? LEVEL1[d.classId].choose : undefined; return !ch || d.picks.length === ch.n; }
    case 'vybaveni': {
      if (!d.classId) return false;
      if (d.eqMode === 'custom') return d.gold != null;
      return RECOMMENDED.byClass[d.classId].choose.length === 0 || d.choice != null;
    }
    default: return true;
  }
}

export function whyNot(d: Draft, key: StepKey): string {
  switch (key) {
    case 'koncept': return 'Napiš jméno postavy.';
    case 'rasa': return 'Vyber rasu.';
    case 'povolani': return d.classId === 'klerik' ? 'Klerik potřebuje boha.' : 'Vyber povolání.';
    case 'atributy':
      if (d.method === 'points') return `Rozděl všech 20 bodů (zbývá ${20 - pointsUsed(d)}).`;
      return diceState(d).ok ? 'Přiřaď všech 5 hodnot atributům.' : 'Hoď 6×k6, nebo zapiš fyzický hod.';
    case 'schopnosti': { const ch = d.classId ? LEVEL1[d.classId].choose : undefined; return ch ? `Vyber ${ch.n} – ${ch.word}.` : ''; }
    case 'vybaveni': return d.eqMode === 'recommended' ? 'Vyber jednu z nabízených sad.' : 'Hoď počáteční peníze.';
    default: return '';
  }
}

/** Index prvního kroku, který ještě není splněný (dál se nedá skočit). */
export function firstBlocked(d: Draft): number {
  const i = STEPS.findIndex((s) => !canStep(d, s.key));
  return i < 0 ? STEPS.length - 1 : i;
}

/** Co změna povolání smaže (pro upozornění před změnou). */
export function classChangeLosses(d: Draft): string[] {
  if (!d.classId) return [];
  const ch = LEVEL1[d.classId].choose;
  return [
    d.picks.length && ch ? `zvolená ${ch.word}` : '',
    d.choice != null ? 'volbu výzbroje' : '',
    d.cart.length ? 'nákupy v obchodě' : '',
  ].filter(Boolean);
}

export function changeClass(d: Draft, classId: ClassId): Draft {
  const own = new Set(classSkills(classId).map((s) => s.id));
  return { ...d, classId, picks: [], choice: null, cart: [], added: d.added.filter((a) => !own.has(a.id)), deity: classId === 'klerik' ? d.deity : '' };
}

export const classById = (id: ClassId) => CLASSES.find((c) => c.id === id)!;
