// Přístup k pravidlovým datům (src/data/*.json). Postava odkazuje jen ID.
import racesJson from '../data/races.json';
import classesJson from '../data/classes.json';
import skillsJson from '../data/skills.json';
import conditionsJson from '../data/conditions.json';
import vyzbrojJson from '../data/vyzbroj.json';
import gearJson from '../data/gear.json';
import hpTable from '../data/tables/zivoty.json';
import xpTable from '../data/tables/zkusenosti.json';
import energyTables from '../data/tables/energie.json';
import fatigueJson from '../data/tables/fatigue.json';
import level1Json from '../data/level1.json';
import recommendedJson from '../data/recommended-equipment.json';
import type { AttrKey, ClassId, RaceId, Size, WeaponKind } from '../model/types';

export interface Effect {
  target: string;
  op: 'add';
  value: number;
  per?: 'level';
}

export interface RaceDef {
  id: RaceId;
  name: string;
  size: Size;
  mobilityBase: number;
  ability: { name: string; text: string; effects: Effect[] };
  baseAttributes: Record<AttrKey, number>;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  tabLabel: string;
  icon: string;
  energyName: string | null;
  skillPointMultiplier: number;
  dominantAttributes: AttrKey[];
  basicSkills: string[];
  professionSkills: string[];
  energyTable: 'kouzelnik' | 'hranicar' | 'klerik' | null;
}

export interface SkillDef {
  id: string;
  name: string;
  attributes: AttrKey[];
  defaultAttribute: AttrKey;
  kind: 'basic' | 'extended' | 'profession';
  /** Profesní dovednost jen ze schopnosti/větve (grantsSkills), ne ze startu povolání. */
  grantedOnly?: boolean;
  classId?: ClassId;
}

export interface Price {
  v: number;
  cur: 'zl' | 'st' | 'md';
}

export interface WeaponDef {
  id: string;
  n: string;
  grp: string;
  cat: string;
  grip: string;
  kind: WeaponKind;
  dmgTypes: string[];
  att: number;
  dmg: number;
  def: number;
  req: number | null;
  w: number | null;
  price: Price | null;
  /** Zbraň Zlodějského cechu (PPP05): assassin / gentleman / improv. */
  zl?: string;
  desc?: string;
  vyroba?: string;
}

export interface ArmorDef {
  id: string;
  n: string;
  cat: string;
  q: number;
  req: number | null;
  w: number | null;
  price: Price | null;
  magicBonus?: number;
  stealth?: number | null;
}

export interface TableByLevel {
  attribute: AttrKey;
  attributeMin: number;
  byLevel: number[][];
  /** Kolik úrovní je přímo z pravidel – vyšší jsou dopočtené (hraničář: H09 1–6, dál přírůstky PPP02). */
  sourceLevels?: number;
}

export const RACES = racesJson as RaceDef[];
export const CLASSES = classesJson as ClassDef[];
export const SKILLS = skillsJson as SkillDef[];
export const CONDITIONS = conditionsJson as { id: string; name: string; short: string }[];
export const FATIGUE = fatigueJson as { level: number; name: string; penalty: number | null }[];
export const WEAPONS = vyzbrojJson.weapons as WeaponDef[];
export const ARMORS = [...vyzbrojJson.armor, ...vyzbrojJson.robes] as ArmorDef[];
export const SHIELDS = vyzbrojJson.shields as ArmorDef[];
export interface GearDef {
  id: string;
  n: string;
  w: number | null;
  price: Price | null;
  desc?: string;
}
export const GEAR = gearJson as GearDef[];
export const ACCESSORIES = vyzbrojJson.accessories as GearDef[];
export const ROBES = vyzbrojJson.robes as ArmorDef[];

export interface Level1Def {
  abilities: string[];
  auto: string[];
  autoWord?: string;
  choose?: { n: number; word: string; itemLabel: string; pool: string[] };
}
export const LEVEL1 = level1Json.byClass as Record<ClassId, Level1Def>;
export const CONCEPTS = level1Json.concepts as string[];

/** Řádek doporučené výbavy (H05) – odkaz na jednu z kategorií katalogu. */
export interface EquipLine {
  itemId?: string;
  weaponId?: string;
  armorId?: string;
  accessoryId?: string;
  special?: string;
  note?: string;
  qty?: number;
}
export const RECOMMENDED = recommendedJson as unknown as {
  common: EquipLine[];
  byClass: Record<ClassId, { items: EquipLine[]; fixed: EquipLine[]; choose: { label: string; items: EquipLine[] }[]; gold: number }>;
};

export const HP_TABLE = hpTable as { attributeMin: number; byLevel: number[][] };
export const XP_BY_LEVEL = xpTable.xpByLevel as number[];
export const ENERGY = energyTables as unknown as Record<'kouzelnik' | 'hranicar' | 'klerik', TableByLevel>;

export const MAX_LEVEL = 24;

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const raceMap = byId(RACES);
const classMap = byId(CLASSES);
const skillMap = byId(SKILLS);
const weaponMap = byId(WEAPONS);
const armorMap = byId(ARMORS);
const shieldMap = byId(SHIELDS);
const gearMap = byId([...GEAR, ...ACCESSORIES]);

export const getRace = (id: RaceId): RaceDef => raceMap.get(id) ?? RACES[1];
export const getClass = (id: ClassId): ClassDef => classMap.get(id) ?? CLASSES[0];
export const getSkill = (id: string) => skillMap.get(id);
export const getWeapon = (id: string | null) => (id ? weaponMap.get(id) : undefined);
export const getArmor = (id: string | null) => (id ? armorMap.get(id) : undefined);
export const getShield = (id: string | null) => (id ? shieldMap.get(id) : undefined);
export const getGear = (id: string | null) => (id ? gearMap.get(id) : undefined);

export const ATTR_LABELS: Record<AttrKey, { name: string; short: string }> = {
  sil: { name: 'Síla', short: 'SIL' },
  obr: { name: 'Obratnost', short: 'OBR' },
  odo: { name: 'Odolnost', short: 'ODO' },
  int: { name: 'Inteligence', short: 'INT' },
  char: { name: 'Charisma', short: 'CHAR' },
};
