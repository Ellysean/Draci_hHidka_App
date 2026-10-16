// Odvozené hodnoty postavy – čisté funkce, nic se neukládá.
// Vzorce a zdroje: docs/RULES_FORMULAS.md. Všechno se počítá z aktuálního stavu,
// takže automaticky platí Pravidlo zpětné opravy (H06).
import { productWeightLb } from '../catalog';
import { activeAugmentations, augmentationEffects } from '../augmentations';
import { rangerWeaponBonus } from '../hranicar';
import { clericManaAdjust, clericWeaponBonus, clericZo, divineArmorBonus } from '../klerik';
import { wizardWeaponBonus, wizardZo } from '../kouzelnik';
import { isThief, strReqAttr, thiefDualWhy, thiefWeaponBonus } from '../zlodej';
import { WARRIOR, dualWieldWhy, furyOn, hasAbility as hasAb, isWarrior, shieldAndWeapon, weaponBonus, weaponGroups, weaponInfo, weaponPath, type WeaponBonus } from '../valecnik';
import {
  ATTR_LABELS,
  ENERGY,
  HP_TABLE,
  MAX_LEVEL,
  XP_BY_LEVEL,
  getArmor,
  getClass,
  getRace,
  getShield,
  getSkill,
  getWeapon,
  type ArmorDef,
  type Effect,
  type TableByLevel,
} from '../data';
import { ATTR_KEYS, type ArmorPiece, type AttrKey, type Character, type CharacterSkill, type OverridableKey, type WeaponKind } from '../../model/types';

/** Vypočtená hodnota se vzorcem pro popover a příznakem ručního přepisu. */
export interface Calc<T = number | null> {
  value: T;
  formula: string;
  /** Hodnota podle vzorce, pokud ji hráč ručně přepsal. */
  computed?: T;
  overridden: boolean;
}

export const sgn = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0');

/** Oprava za atribut (H05, ověřeno proti tabulce 18. 9. 2026). */
export const attributeMod = (value: number) => Math.floor((value - 10) / 2);

export const clampLevel = (level: number) => Math.max(1, Math.min(MAX_LEVEL, Math.floor(level) || 1));

/** Vyhledání v tabulce „úroveň × stupeň atributu“; mimo rozsah se použije krajní sloupec. */
export function lookupByLevel(table: { attributeMin: number; byLevel: number[][] }, attrValue: number, level: number) {
  const row = table.byLevel[clampLevel(level) - 1];
  const i = Math.max(0, Math.min(row.length - 1, Math.floor(attrValue) - table.attributeMin));
  return { value: row[i], outOfRange: attrValue < table.attributeMin || attrValue > table.attributeMin + row.length - 1 };
}

const plain = <T>(value: T, formula: string): Calc<T> => ({ value, formula, overridden: false });

/** Známé mechanické efekty schopností (do naplnění progression dat ve Fázi 7). */
const ABILITY_EFFECTS: Record<string, Effect[]> = {
  skvela_kondice: [{ target: 'hpMax', op: 'add', value: 3, per: 'level' }],
  pozehnane_zdravi: [{ target: 'hpMax', op: 'add', value: 2, per: 'level' }],
  tuhy_korinek: [{ target: 'hpMax', op: 'add', value: 1, per: 'level' }],
  urputnost: [{ target: 'deathThreshold', op: 'add', value: -1, per: 'level' }],
  skola_boje_s_bodnou_zbrani: [{ target: 'initiativeBonus', op: 'add', value: 2 }],
  koncentrace_many: [{ target: 'manaMax', op: 'add', value: 2, per: 'level' }],
  // Bojový mág (PPP04): Bitevní trénink ZO +1 (ÚČ +1 v rules/kouzelnik.ts), Posílená ochrana ZO +2.
  bitevni_trenink: [{ target: 'defenseBase', op: 'add', value: 1 }],
  posilena_ochrana: [{ target: 'defenseBase', op: 'add', value: 2 }],
  osviceni: [{ target: 'manaMax', op: 'add', value: 2, per: 'level' }],
  magie_pocestnych: [{ target: 'mobility', op: 'add', value: 10 }],
  // Zocelení (H09): jednorázově +4 stupně ODO – platí text schopnosti, ne souhrnná tabulka (+3) ✔ U.
  zoceleni: [{ target: 'attr:odo', op: 'add', value: 4 }],
  // Směry hraničáře: +1 k dovednosti (H09, CLASSES.md).
  magie_prirody: [{ target: 'skill:znalost_prirody', op: 'add', value: 1 }],
  magie_zvirat: [{ target: 'skill:zvladnuti_zvirat', op: 'add', value: 1 }],
  // Ostražitost (PPP02, hraničář od 6. úrovně): trvale +3 k Postřehu, Reflexu a Iniciativě.
  ostrazitost: [{ target: 'skill:postreh', op: 'add', value: 3 }, { target: 'skill:reflex', op: 'add', value: 3 }, { target: 'initiativeBonus', op: 'add', value: 3 }],
  // Obor alchymisty Hvězdné sestavy (H10): +1 ke všem ověřením Vůle.
  hvezdne_sestavy: [{ target: 'skill:vule', op: 'add', value: 1 }],
  // Forenzika (PPP03, alchymista od 6. úrovně): +2 ke všem ověřením Postřehu.
  forenzika: [{ target: 'skill:postreh', op: 'add', value: 2 }],
  // Mistr nestabilních substancí (PPP03, Pyromant): Charisma natrvalo −5 (nikdy pod 1).
  mistr_nestabilnich_substanci: [{ target: 'attr:char', op: 'add', value: -5 }],
  // Válečník – PPP01 (7b). Podmíněné bonusy (zbraň, zbroj, štít) počítá rules/valecnik.ts níže.
  drsnak: [{ target: 'skill:vydrz', op: 'add', value: 3 }],
  zjizvena_kuze: [{ target: 'defenseBase', op: 'add', value: 2 }],
  smysly_bestie: [{ target: 'skill:postreh', op: 'add', value: 3 }, { target: 'skill:reflex', op: 'add', value: 3 }],
  zelezny_muz: [{ target: 'skill:vydrz', op: 'add', value: 5 }],
  sermirska_obratnost: [{ target: 'skill:atletika', op: 'add', value: 3 }, { target: 'skill:akrobacie', op: 'add', value: 3 }, { target: 'initiativeBonus', op: 'add', value: 3 }],
  // Klerik (H13, PPP06 – 7d): nauky +1 k dovednosti, Výcvik lazaretních léčitelů, Paladinský výcvik (základ ODO +1).
  milosrdenstvi: [{ target: 'skill:prvni_pomoc', op: 'add', value: 1 }],
  svata_pravda: [{ target: 'skill:vule', op: 'add', value: 1 }],
  vycvik_lazaretnich_lecitelu: [{ target: 'skill:prvni_pomoc', op: 'add', value: 1 }, { target: 'skill:znalost_prirody', op: 'add', value: 1 }],
  paladinsky_vycvik: [{ target: 'attr:odo', op: 'add', value: 1 }],
  // Zloděj (PPP05 – 7e): Mistrovství … +1 k dovednostem, Šestý smysl +3 Iniciativa, Mistr útěku +10 Pohyblivost.
  mistrovstvi_sily_osobnosti: [{ target: 'skill:hazardni_hry', op: 'add', value: 1 }, { target: 'skill:presvedcovani', op: 'add', value: 1 }],
  mistrovstvi_zlatky: [{ target: 'skill:odhad_ceny', op: 'add', value: 1 }, { target: 'skill:vybirani_kapes', op: 'add', value: 1 }],
  mistrovstvi_rvacu: [{ target: 'skill:umeni_rvacu', op: 'add', value: 1 }],
  mistrovstvi_skryvani: [{ target: 'skill:umeni_skryvani', op: 'add', value: 1 }],
  mistrovstvi_kociciho_pohybu: [{ target: 'skill:umeni_kociciho_pohybu', op: 'add', value: 1 }],
  mistrovstvi_zelezneho_klice: [{ target: 'skill:umeni_zelezneho_klice', op: 'add', value: 1 }],
  mistrovstvi_promen: [{ target: 'skill:umeni_promen', op: 'add', value: 1 }],
  mistrovstvi_sarmu: [{ target: 'skill:umeni_sarmu', op: 'add', value: 1 }],
  sesty_smysl: [{ target: 'initiativeBonus', op: 'add', value: 3 }],
  mistr_uteku: [{ target: 'mobility', op: 'add', value: 10 }],
  // Životní zkušenost specializace (PPP01): +3 ke třem dovednostem – efekt nese id specializace.
  ...Object.fromEntries(Object.entries(WARRIOR.specs).map(([id, sp]) => [id, sp.experience.skills.map((k) => ({ target: `skill:${k}`, op: 'add' as const, value: 3 }))])),
};

const EFFECT_SOURCE: Record<string, string> = {
  ...Object.fromEntries(Object.entries(WARRIOR.specs).map(([id, sp]) => [id, sp.experience.name])),
  koncentrace_many: 'Koncentrace many', osviceni: 'Osvícení', bitevni_trenink: 'Bitevní trénink', posilena_ochrana: 'Posílená ochrana',
  milosrdenstvi: 'Milosrdenství', svata_pravda: 'Svatá pravda', vycvik_lazaretnich_lecitelu: 'Výcvik lazaretních léčitelů', paladinsky_vycvik: 'Paladinský výcvik',
  mistrovstvi_sily_osobnosti: 'Mistrovství síly osobnosti', mistrovstvi_zlatky: 'Mistrovství zlatky', mistrovstvi_rvacu: 'Mistrovství rváčů',
  mistrovstvi_skryvani: 'Mistrovství skrývání', mistrovstvi_kociciho_pohybu: 'Mistrovství kočičího pohybu', mistrovstvi_zelezneho_klice: 'Mistrovství železného klíče',
  mistrovstvi_promen: 'Mistrovství proměn', mistrovstvi_sarmu: 'Mistrovství šarmu', sesty_smysl: 'Šestý smysl', mistr_uteku: 'Mistr útěku',
  drsnak: 'Drsňák', zjizvena_kuze: 'Zjizvená kůže', smysly_bestie: 'Smysly bestie', zelezny_muz: 'Železný muž', sermirska_obratnost: 'Šermířská obratnost',
};

/** Krátké pohyby za kolo (H16), zaokrouhluje se nahoru (H06). */
export interface Moves { instant: number; advance: number; sprint: number; sneak: number }
export const movesFor = (mobility: number): Moves => {
  const m = Math.max(0, mobility);
  return { instant: Math.ceil(m / 10), advance: Math.ceil(m / 4), sprint: m, sneak: Math.ceil(m / 10) };
};

function collectEffects(c: Character): { source: string; effect: Effect }[] {
  const race = getRace(c.basic.raceId);
  const out = race.ability.effects.map((effect) => ({ source: race.ability.name, effect }));
  // Schopnosti i větve (bojové školy, obory…) nesou efekty stejně.
  // Mistrovství ve zbrani a Cesty se dají vzít víckrát – efekt se ale počítá jednou.
  const ids = new Set([...c.progression.learnedAbilities.map((a) => a.id), ...c.progression.learnedBranches]);
  // Specializace válečníka nese Životní zkušenost (PPP01); u jiných povolání v tabulce nic není.
  if (c.progression.specialization && c.basic.classId === 'valecnik') ids.add(c.progression.specialization);
  for (const id of ids) {
    for (const effect of ABILITY_EFFECTS[id] ?? []) out.push({ source: EFFECT_SOURCE[id] ?? id, effect });
  }
  // Zvířecí šampion (Pán zvířat, PPP02): stvořením šampiona natrvalo −2 max. Duševní síly (platí i po jeho smrti,
  // dokud záznam o něm zůstává v deníku; Vrátit v záznamu boje vrací šampiona i postih zároveň).
  if (c.companions?.some((x) => x.champion)) out.push({ source: 'Zvířecí šampion', effect: { target: 'manaMax', op: 'add', value: -2 } });
  // Augmentace zaškrtnuté na postavě (PPP03).
  out.push(...augmentationEffects(c));
  return out;
}

function effectSum(c: Character, target: string): { total: number; parts: string[] } {
  let total = 0;
  const parts: string[] = [];
  for (const { source, effect } of collectEffects(c)) {
    if (effect.target !== target) continue;
    const v = effect.value * (effect.per === 'level' ? c.progression.level : 1);
    total += v;
    parts.push(`${source} ${sgn(v)}`);
  }
  return { total, parts };
}

export interface WeaponRow {
  uid: string;
  name: string;
  kind: WeaponKind;
  /** Kategorie z H15 (Lehké krátké, Lehké střelné …). */
  category: string;
  attack: number;
  damage: number;
  defense: number;
  strReq: number | null;
  weightLb: number;
  equipped: boolean;
  overloaded: boolean;
  attackNumber: number;
  defenseNumber: number;
  /** Zranění zbraně včetně bonusů (škola s obouruční zbraní, Cesty, úchop…). */
  damageTotal: number;
  /** Rozpis bonusů válečníka k této zbrani (Fáze 7b). */
  bonusParts: string[];
  /** Skupiny zbraně (drtivé, bodné… – H08) a Cesta válečníka, ke které patří (7b.2). */
  groups: string[];
  path: string | null;
}

/** Nasazená zbroj / štít s parametry pro deník. */
export interface PieceInfo {
  name: string;
  quality: number;
  strReq: number | null;
  overloaded: boolean;
  /** Postih k plížení (H15, střední a těžké zbroje). */
  stealth: number | null;
  /** Bonus róby k ověření magie (Fáze 7). */
  magicBonus: number;
  weightLb: number;
  equipped: boolean;
  custom: boolean;
  /** Kategorie z H15 (Lehké / Střední / Těžké …). */
  category: string;
}

export interface Derived {
  mods: Record<AttrKey, number>;
  /** Stupně atributů po bonusech schopností a jejich rozpis (zapsaný základ je v character.attributes). */
  attributes: Record<AttrKey, { value: number; bonus: number; parts: string[] }>;
  level: number;
  size: Calc<string>;
  mobility: Calc<number>;
  hpMax: Calc<number>;
  deathThreshold: Calc<number>;
  manaMax: Calc<number | null>;
  defenseBase: Calc<number>;
  armorOverloaded: boolean;
  shieldOverloaded: boolean;
  armor: PieceInfo | null;
  shield: PieceInfo | null;
  loadParts: { label: string; lb: number }[];
  weapons: WeaponRow[];
  /** uid zbraně, ze které jsou ÚČ/OČ (null = beze zbraně). */
  activeWeaponUid: string | null;
  /** Boj dvěma zbraněmi (7b.2): druhá zbraň, jejíž parametry se přičítají ke zbrani v ruce; why = proč ne. */
  dual: { offUid: string; offName: string; ok: boolean; why: string } | null;
  attackNumber: Calc<number>;
  defenseNumber: Calc<number>;
  initiativeBonus: Calc<number>;
  load: Calc<number>;
  loadLimit: Calc<number | null>;
  fatigueMax: Calc<number | null>;
  skillPoints: { earned: number; spent: number; available: Calc<number>; byLevel: { level: number; points: number }[] };
  skills: { id: string; name: string; attribute: AttrKey; rank: number; mod: number; bonus: number; bonusParts: string[]; total: number; source: CharacterSkill['source'] }[];
  experience: {
    levelByXp: number;
    nextLevelXp: number | null;
    missing: number | null;
    canLevelUp: boolean;
    /** Zkušenosti nestačí ani na aktuální úroveň (ruční úprava, chyba zápisu). */
    belowLevel: boolean;
    /** Postup od prahu aktuální úrovně k další (0–1), null na 24. úrovni. */
    progress: number | null;
  };
  /** Naložení nad ručně zadanou nosností. */
  overloaded: boolean;
  /** Body únavy nad ručně zadaným maximem. */
  fatigueOver: boolean;
  moves: Moves;
  characterPointsDue: number;
}

export function derive(c: Character): Derived {
  const level = clampLevel(c.progression.level);
  // Stupně atributů včetně bonusů schopností (Zocelení) – z nich se počítají opravy i tabulky.
  const attrBonus = Object.fromEntries(ATTR_KEYS.map((k) => [k, effectSum(c, `attr:${k}`)])) as Record<AttrKey, { total: number; parts: string[] }>;
  const attrs = Object.fromEntries(ATTR_KEYS.map((k) => [k, (Number(c.attributes[k]) || 0) + attrBonus[k].total])) as Record<AttrKey, number>;
  // Augmentace (PPP03): Umělá paže = SIL nejméně 26; zohyzdění nesnižuje Charisma pod 1.
  const augs = activeAugmentations(c);
  for (const a of augs) {
    if (a.silAtLeast != null && attrs.sil < a.silAtLeast) {
      attrBonus.sil = { total: attrBonus.sil.total + a.silAtLeast - attrs.sil, parts: [...attrBonus.sil.parts, `${a.name}: SIL ${a.silAtLeast}`] };
      attrs.sil = a.silAtLeast;
    }
  }
  if (attrBonus.char.total < 0 && attrs.char < 1) {
    attrBonus.char = { total: attrBonus.char.total + 1 - attrs.char, parts: [...attrBonus.char.parts, 'nejméně 1'] };
    attrs.char = 1;
  }
  const m = Object.fromEntries(ATTR_KEYS.map((k) => [k, attributeMod(attrs[k])])) as Record<AttrKey, number>;
  const race = getRace(c.basic.raceId);
  const cls = getClass(c.basic.classId);
  const has = (condId: string) => c.vitals.conditions.some((x) => x.id === condId);

  // --- velikost, pohyblivost ---
  // sizeOverride je starší místo ručně zvolené velikosti – nově overrides.size (popover vzorce).
  const size = plain<string>(c.basic.sizeOverride ?? race.size, c.basic.sizeOverride ? 'ručně zvolená velikost' : `Velikost z rasy ${race.name} (A malá, B střední, C velká)`);
  const slowed = has('zmrz_noha') || has('zpomaleni');
  const mobB = effectSum(c, 'mobility');
  // Mrštnost (Berserkr, PPP01): +2 k Pohyblivosti, ZO a ověřením OBR – jen bez zbroje nebo v lehké.
  const armorDef0 = getArmor(c.equipment.armor.itemId);
  const armorCat = c.equipment.armor.equipped ? (armorDef0?.cat ?? c.equipment.armor.custom?.category ?? '') : '';
  const mrstnost = isWarrior(c) && hasAb(c, 'mrstnost') && (!armorCat || /^lehk/i.test(armorCat) || (armorDef0?.q ?? 1) === 0);
  if (mrstnost) { mobB.total += 2; mobB.parts.push('Mrštnost +2'); }
  const legs = augs.some((a) => a.mobilityX2);
  const mobilityRaw = (race.mobilityBase + m.obr + mobB.total) * (legs ? 2 : 1);
  const mobility = plain(
    slowed ? Math.ceil(mobilityRaw / 2) : mobilityRaw,
    `${legs ? '(' : ''}${race.mobilityBase} (${race.name}) + OBR ${sgn(m.obr)}${mobB.parts.length ? ' + ' + mobB.parts.join(' + ') : ''}${legs ? ') × 2 (Umělá noha)' : ''}${slowed ? ' ; ÷2 (zmrzačená noha / zpomalení)' : ''}`,
  );

  // --- životy ---
  const odo = attrs.odo;
  const hpT = lookupByLevel(HP_TABLE, odo, level);
  const hpB = effectSum(c, 'hpMax');
  const heart = augs.some((a) => a.hpThird) ? Math.ceil((hpT.value + hpB.total) / 3) : 0;
  const hpMax = plain(
    hpT.value + hpB.total + heart,
    `Tabulka životů: ${level}. úroveň, ODO ${odo} → ${hpT.value}${hpB.parts.length ? ' + ' + hpB.parts.join(' + ') : ''}${heart ? ` + ⅓ Druhé srdce ${heart}` : ''}${hpT.outOfRange ? ' (ODO mimo tabulku 4–28, použita krajní hodnota)' : ''}`,
  );
  const dtB = effectSum(c, 'deathThreshold');
  const dtBase = -(10 + m.odo) + dtB.total;
  const dtTxt = `−(10 + ODO ${sgn(m.odo)})${dtB.parts.length ? ' ; ' + dtB.parts.join(', ') : ''}`;
  // Vražedná zuřivost (Berserkr, PPP01): Hranice smrti klesne na −maximum životů.
  const fury = isWarrior(c) && furyOn(c) && -hpMax.value < dtBase;
  const deathThreshold = plain(fury ? -hpMax.value : dtBase, fury ? `Vražedná zuřivost: −max. životů (jinak ${dtBase} = ${dtTxt})` : dtTxt);

  // --- mana / energie ---
  let manaMax: Calc<number | null>;
  if (cls.energyTable) {
    const t: TableByLevel = ENERGY[cls.energyTable];
    const av = attrs[t.attribute];
    const bonus = effectSum(c, 'manaMax');
    const below = av < t.attributeMin;
    if (level > t.byLevel.length) {
      // Tabulka v podkladech nepokrývá tuhle úroveň (H09: jen 1–6) – hodnotu zadá hráč ručně.
      manaMax = plain(null, `Tabulka ${cls.energyName} v podkladech končí ${t.byLevel.length}. úrovní – zadej maximum ručně`);
    } else {
      const v = below ? 0 : lookupByLevel(t, av, level).value;
      // Klerik (PPP06): Asketismus ×2, Ikony −10 za každou.
      const adj = clericManaAdjust(c, v + bonus.total);
      const txt = `Tabulka: ${cls.energyName}, ${level}. úroveň, ${ATTR_LABELS[t.attribute].short} ${av}${below ? ' (pod tabulkou → 0)' : ''}${bonus.parts.length ? ' + ' + bonus.parts.join(' + ') : ''}`;
      manaMax = plain(adj.value, adj.parts.length ? `(${txt}) ${adj.parts.join(' ')}` : txt);
    }
  } else if (cls.id === 'valecnik') {
    manaMax = plain(Math.max(1, m.odo), `Adrenalin: mimo boj max. ODO ${sgn(m.odo)} (min. 1), v boji bez limitu`);
  } else if (cls.id === 'alchymista') {
    manaMax = plain(null, 'Alchymista nemá maximum many – omezuje ho kapacita nádob');
  } else {
    manaMax = plain(null, `${cls.name} manu nemá`);
  }

  // --- zbroj, štít, ZO ---
  const armorDef = armorDef0;
  const armorQ0 = c.equipment.armor.equipped ? (armorDef?.q ?? c.equipment.armor.custom?.quality ?? 0) : 0;
  // Mistr zbroje (Rytíř, PPP01): +3 ke kvalitě nošené zbroje (platí text schopnosti).
  const armorMaster = isWarrior(c) && hasAb(c, 'mistr_zbroje') && c.equipment.armor.equipped && (armorDef || c.equipment.armor.custom) ? 3 : 0;
  // Boží zbroj (Bojový mnich, PPP06): posvěcená nošená zbroj +1 kvalita.
  const divine = c.equipment.armor.equipped && (armorDef0 || c.equipment.armor.custom) ? divineArmorBonus(c) : 0;
  const armorQ = armorQ0 + armorMaster + divine;
  const armorReq = armorDef ? armorDef.req : (c.equipment.armor.custom?.strReq ?? null);
  const armorOverloaded = c.equipment.armor.equipped && armorReq != null && m.sil < armorReq;
  const zoB = effectSum(c, 'defenseBase');
  // Moudrost (PPP02, hraničář od 6. úrovně): ZO může počítat z INT místo OBR – appka bere lepší.
  if (c.basic.classId === 'hranicar' && hasAb(c, 'moudrost') && m.int > m.obr) { zoB.total += m.int - m.obr; zoB.parts.push(`Moudrost (INT místo OBR) +${m.int - m.obr}`); }
  if (mrstnost) { zoB.total += 2; zoB.parts.push('Mrštnost +2'); }
  // Kouzelník (7c.2): Magický štít +5, Magická zbroj +1 za 4 many – aktivní kouzla na sobě.
  const wz = wizardZo(c);
  if (wz.total) { zoB.total += wz.total; zoB.parts.push(...wz.parts); }
  // Klerik (7d): Štít víry +3, Aura svatého štítu +2 – aktivní prosby na sobě.
  const kz = clericZo(c);
  if (kz.total) { zoB.total += kz.total; zoB.parts.push(...kz.parts); }
  const shieldDef = getShield(c.equipment.shield.itemId);
  const shieldHave = !!(shieldDef || c.equipment.shield.custom);
  const shieldOn = c.equipment.shield.equipped && shieldHave;
  const shieldQ = shieldOn ? (shieldDef?.q ?? c.equipment.shield.custom?.quality ?? 0) : 0;
  // Zakrytí (Rytíř, PPP01): kvalita štítu se vždy počítá do ZO – v aktivní obraně se pak už nepřičítá znovu.
  const shieldInZo = isWarrior(c) && hasAb(c, 'zakryti') && shieldOn ? shieldQ : 0;
  if (shieldInZo) { zoB.total += shieldInZo; zoB.parts.push(`Zakrytí (štít) +${shieldInZo}`); }
  const defenseBase = plain(
    m.obr + armorQ + zoB.total - (armorOverloaded ? 5 : 0),
    `OBR ${sgn(m.obr)} + kvalita zbroje ${armorQ0}${armorMaster ? ` + ${armorMaster} Mistr zbroje` : ''}${divine ? ' + 1 Boží zbroj' : ''}${zoB.parts.length ? ' + ' + zoB.parts.join(' + ') : ''}${armorOverloaded ? ' − 5 přetížení zbroje' : ''}`,
  );
  const shieldReq = shieldDef ? shieldDef.req : (c.equipment.shield.custom?.strReq ?? null);
  // Štít nad síly postavy: přetížení −5 k OČ (H15, stejně jako u zbraně).
  const shieldOverloaded = shieldOn && shieldReq != null && m.sil < shieldReq;
  const pieceInfo = (def: ArmorDef | undefined, p: ArmorPiece, req: number | null, overloaded: boolean): PieceInfo | null =>
    def || p.custom
      ? {
          name: def?.n ?? p.custom?.name ?? '—', quality: def?.q ?? p.custom?.quality ?? 0, strReq: req, overloaded,
          stealth: def ? (def.stealth ?? null) : (p.custom?.stealth ?? null), magicBonus: def?.magicBonus ?? 0,
          weightLb: p.weightLb ?? def?.w ?? 0, equipped: p.equipped, custom: !def, category: def?.cat ?? p.custom?.category ?? '',
        }
      : null;

  // --- zbraně, ÚČ/OČ ---
  const both = shieldAndWeapon(c);
  const wBonus = (info: ReturnType<typeof weaponInfo> | null, wUid: string | null = null): WeaponBonus => {
    const a = weaponBonus(c, info, { sil: m.sil, obr: m.obr, shieldOn, shieldQ });
    // Hraničář (H09): Bojová hůl, Obratné ostří.
    const r = rangerWeaponBonus(c, info, { sil: m.sil, obr: m.obr, path: weaponPath(info) });
    // Kouzelník (PPP04): Bitevní trénink +1 Útok.
    const z = wizardWeaponBonus(c);
    // Klerik (7d): Boží bojovník, Bojovníci víry, Boj zblízka, Posvátná zbraň, aury a Božská pomoc.
    const k = clericWeaponBonus(c, info, wUid);
    // Zloděj (7e): Boj beze zbraně, Vražedné ostří, Zákeřná kuše, Citlivá místa, Obratný bojovník, zbraně specializací.
    const t = thiefWeaponBonus(c, info, { sil: m.sil, obr: m.obr, shieldOn });
    return { atk: a.atk + r.atk + z.atk + k.atk + t.atk, def: a.def + r.def + k.def + t.def, dmg: a.dmg + r.dmg + k.dmg + t.dmg, init: a.init + r.init, parts: [...a.parts, ...r.parts, ...z.parts, ...k.parts, ...t.parts] };
  };
  const bare = wBonus(null);
  const weapons: (WeaponRow & { init: number; info: ReturnType<typeof weaponInfo> })[] = c.equipment.weapons.map((w) => {
    const def = getWeapon(w.itemId);
    const name = def?.n ?? w.custom?.name ?? '?';
    const kind: WeaponKind = def?.kind ?? w.custom?.kind ?? 'melee';
    const attack = def?.att ?? w.custom?.attack ?? 0;
    const damage = def?.dmg ?? w.custom?.damage ?? 0;
    const defense = def?.def ?? w.custom?.defense ?? 0;
    const strReq = def ? def.req : (w.custom?.strReq ?? null);
    const info = weaponInfo(def, w.custom);
    // Technika nabíjení (Zloděj, PPP05): u kuší požadavek SIL nahradí OBR.
    const overloaded = strReq != null && m[strReqAttr(c, info)] < strReq;
    const base = kind === 'melee' ? m.sil : m.obr;
    const weaponDef = kind === 'melee' ? defense : 0;
    // Škola boje se štítem (H08): štít i obrana zbraně najednou; se Zakrytím je štít už v ZO.
    const parry = (shieldOn && !shieldInZo ? shieldQ : 0) + (!shieldOn || shieldInZo || both ? weaponDef : 0);
    const wb = wBonus(info, w.uid);
    return {
      uid: w.uid, name, kind, category: def?.cat ?? w.custom?.category ?? '', attack, damage, defense, strReq, equipped: w.equipped, overloaded,
      weightLb: (w.weightLb ?? def?.w ?? 0) * (w.qty ?? 1),
      attackNumber: base + attack + wb.atk - (overloaded ? 5 : 0),
      defenseNumber: defenseBase.value + parry + wb.def - (overloaded ? 5 : 0) - (shieldOverloaded ? 5 : 0),
      damageTotal: damage + wb.dmg,
      bonusParts: wb.parts,
      init: wb.init,
      groups: weaponGroups(info),
      path: weaponPath(info),
      info,
    };
  });
  // Zbraň v ruce: zvolená hráčem, jinak první vybavená.
  const first = weapons.find((w) => w.uid === c.equipment.activeWeaponUid) ?? weapons.find((w) => w.equipped);
  // Boj dvěma zbraněmi (H08 Škola, PPP01 Mistr): Útočnost, Zranění i Obrana obou zbraní se sčítají; bonusy Cest jen za jednu.
  let dual: Derived['dual'] = null;
  const offUid = c.classState.valecnik?.offhand ?? c.classState.zlodej?.offhand ?? null;
  const off = offUid ? weapons.find((w) => w.uid === offUid && w.equipped && w.uid !== first?.uid) : undefined;
  if (off && first) {
    const why = isThief(c) ? thiefDualWhy(c, first.info, off.info, shieldOn) : dualWieldWhy(c, first.info, off.info, shieldOn);
    dual = { offUid: off.uid, offName: off.name, ok: !why, why };
    if (!why) {
      const pen = off.overloaded ? 5 : 0;
      first.attackNumber += off.attack - pen;
      first.defenseNumber += off.defense - pen;
      first.damageTotal += off.damage;
      first.bonusParts = [...first.bonusParts, `Druhá zbraň – ${off.name}: útočnost ${sgn(off.attack)}, obrana ${sgn(off.defense)}, zranění ${sgn(off.damage)}${pen ? ', −5 přetížení' : ''}`];
    }
  }
  const bonusTxt = (parts: string[]) => (parts.length ? ` ; ${parts.join(' ; ')}` : '');
  const parryTxt = (w: WeaponRow) => {
    const wd = w.kind === 'melee' ? w.defense : 0;
    if (!shieldOn) return `obrana zbraně ${wd}`;
    if (shieldInZo) return `obrana zbraně ${wd} (štít je v ZO – Zakrytí)`;
    return both ? `kvalita štítu ${shieldQ} + obrana zbraně ${wd} (Škola boje se štítem)` : `kvalita štítu ${shieldQ}`;
  };
  const bareDef = defenseBase.value + (shieldOn && !shieldInZo ? shieldQ : 0) + bare.def - (shieldOverloaded ? 5 : 0);
  const attackNumber = plain(
    first ? first.attackNumber : m.sil + bare.atk,
    first
      ? `${first.name}: ${first.kind === 'melee' ? 'SIL' : 'OBR'} + útočnost ${first.attack}${first.overloaded ? ' − 5 přetížení' : ''}${bonusTxt(first.bonusParts)}`
      : `beze zbraně: SIL + 0${bonusTxt(bare.parts)}`,
  );
  const defenseNumber = plain(
    first ? first.defenseNumber : bareDef,
    first
      ? `ZO ${defenseBase.value} + ${parryTxt(first)}${first.overloaded ? ' − 5 přetížení zbraně' : ''}${shieldOverloaded ? ' − 5 přetížení štítu' : ''}${bonusTxt(first.bonusParts)}`
      : `ZO ${defenseBase.value}${shieldOn && !shieldInZo ? ` + kvalita štítu ${shieldQ}` : ''} (beze zbraně)${bonusTxt(bare.parts)}`,
  );
  const initB = effectSum(c, 'initiativeBonus');
  // Cesta hole a kopí: +Iniciativa jen se zbraní dané Cesty v ruce.
  const wInit = first ? first.init : bare.init;
  if (wInit) { initB.total += wInit; initB.parts.push(`Cesta (zbraň v ruce) ${sgn(wInit)}`); }
  const initiativeBonus = plain(m.obr + initB.total, `k6 + OBR ${sgn(m.obr)}${initB.parts.length ? ' + ' + initB.parts.join(' + ') : ''}`);

  // --- naložení ---
  const eq = c.equipment;
  const items = eq.items.filter((i) => i.carried).reduce((s, i) => s + (i.weightLb || 0) * (i.qty || 0), 0);
  const weaponsW = weapons.reduce((s, w) => s + (w.weightLb || 0), 0);
  // Železný muž (Rytíř, PPP01): váha zbroje se nepočítá do Naložení.
  const ironMan = isWarrior(c) && hasAb(c, 'zelezny_muz');
  const armorW = ironMan ? 0 : (eq.armor.weightLb ?? armorDef?.w ?? 0);
  // Štít i sundaná zbroj ve slotu se nesou pořád – váží, i když nejsou v ruce / na těle.
  const shieldW = shieldHave ? (eq.shield.weightLb ?? shieldDef?.w ?? 0) : 0;
  const alch = c.basic.classId === 'alchymista' ? c.classState.alchymista : null;
  const alchW = alch ? (c.vitals.manaCurrent + alch.materialsCurrent) / 100 + alch.bases.reduce((s, b) => s + b.qty * b.weightLb, 0) : 0;
  // Výrobky alchymisty jsou ve Výbavě (✔ U 11. 10. 2026) – nesené se počítají do naložení; působící (vypité) ne.
  const craftedW = alch ? (alch.crafted ?? []).filter((x) => !x.active && x.carried !== false).reduce((s, x) => s + productWeightLb(x.recipeId) * (x.qty ?? 1), 0) : 0;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const loadParts = [
    { label: 'Výbava (nesená)', lb: r1(items) },
    { label: 'Zbraně', lb: r1(weaponsW) },
    { label: ironMan ? 'Zbroj (Železný muž – nepočítá se)' : 'Zbroj', lb: r1(armorW) },
    { label: 'Štít', lb: r1(shieldW) },
    ...(alch ? [{ label: 'Mana, suroviny a základy', lb: r1(alchW) }, { label: 'Alchymistické výrobky', lb: r1(craftedW) }] : []),
  ];
  const load = plain(
    r1(items + weaponsW + armorW + shieldW + alchW + craftedW),
    loadParts.filter((p) => p.lb).map((p) => `${p.label.toLowerCase()} ${p.lb}`).join(' + ') + ' (lb)' || '0 (lb)',
  );
  const loadLimit = plain<number | null>(null, 'Nosnost (lb) – tabulka chybí (kapitola „Užitečné informace“), zadej ji ručně podle PJ.');
  const fatigueMax = plain<number | null>(null, 'Max. body únavy – tabulka chybí (kapitola „Užitečné informace“), zadej je ručně podle PJ.');

  // --- dovednostní body (H14, H18; jen sudé úrovně ✔ U) ---
  const human = c.basic.raceId === 'clovek';
  // Laboratorní specialista (PPP03): 5× úroveň místo 4×, se zpětnou opravou (platí pro všechny úrovně).
  const labSpec = (c.basic.classId === 'alchymista' && c.progression.learnedAbilities.some((x) => x.id === 'laboratorni_specialista'))
    // Světoběžník (PPP02, hraničář od 6. úrovně): 6× úroveň místo 5×, zpětně.
    || (c.basic.classId === 'hranicar' && c.progression.learnedAbilities.some((x) => x.id === 'svetobeznik'));
  const mult = cls.skillPointMultiplier + (labSpec ? 1 : 0);
  const byLevel = [{ level: 1, points: 3 + (human ? 1 : 0) }];
  for (let l = 2; l <= level; l++) {
    if (l % 2 === 0) byLevel.push({ level: l, points: mult * l + (human ? l : 0) });
  }
  // Expertiza (Zloděj, PPP05): +1 bod na každé sudé úrovni od jejího naučení ✔ U.
  if (c.progression.learnedAbilities.some((a) => a.id === 'expertiza')) {
    const from = c.progression.levelUps.find((u) => u.choices.some((ch) => ch.id === 'expertiza'))?.level ?? 6;
    for (const x of byLevel) if (x.level >= from && x.level % 2 === 0) x.points += 1;
  }
  const earned = byLevel.reduce((s, x) => s + x.points, 0);
  const spent = c.skillLog.reduce((s, x) => s + x.cost, 0);
  const available = plain(earned - spent, `získáno ${earned} (3 na 1. úr. + ${mult} × úroveň na sudých úrovních${labSpec ? (c.basic.classId === 'hranicar' ? ' – Světoběžník' : ' – Laboratorní specialista') : ''}${human ? ' + Všestrannost' : ''}) − utraceno ${spent}`);

  const skills = c.skills.map((s) => {
    const def = getSkill(s.id);
    const eff = effectSum(c, `skill:${s.id}`);
    if (mrstnost && s.attribute === 'obr') { eff.total += 2; eff.parts.push('Mrštnost +2'); }
    return { id: s.id, name: s.customName ?? def?.name ?? s.id, attribute: s.attribute, rank: s.rank, mod: m[s.attribute], bonus: eff.total, bonusParts: eff.parts, total: s.rank + m[s.attribute] + eff.total, source: s.source };
  });

  // --- zkušenosti ---
  const xp = c.progression.experience || 0;
  let levelByXp = 1;
  XP_BY_LEVEL.forEach((need, i) => { if (xp >= need) levelByXp = i + 1; });
  const nextLevelXp = level < MAX_LEVEL ? XP_BY_LEVEL[level] : null;
  const experience = {
    levelByXp,
    nextLevelXp,
    missing: nextLevelXp == null ? null : Math.max(0, nextLevelXp - xp),
    canLevelUp: nextLevelXp != null && xp >= nextLevelXp,
    belowLevel: xp < XP_BY_LEVEL[level - 1],
    progress: nextLevelXp == null ? null : Math.max(0, Math.min(1, (xp - XP_BY_LEVEL[level - 1]) / (nextLevelXp - XP_BY_LEVEL[level - 1]))),
  };
  const characterPointsDue = Math.floor(level / 3) * 2 - c.attributeLog.reduce((s, x) => s + x.raised.length, 0);

  const d: Derived = {
    mods: m,
    activeWeaponUid: first?.uid ?? null,
    dual,
    attributes: Object.fromEntries(ATTR_KEYS.map((k) => [k, { value: attrs[k], bonus: attrBonus[k].total, parts: attrBonus[k].parts }])) as Derived['attributes'],
    level, size, mobility, hpMax, deathThreshold, manaMax, defenseBase, armorOverloaded, weapons,
    shieldOverloaded, loadParts,
    armor: pieceInfo(armorDef, c.equipment.armor, armorReq, armorOverloaded),
    shield: pieceInfo(shieldDef, c.equipment.shield, shieldReq, shieldOverloaded),
    attackNumber, defenseNumber, initiativeBonus, load, loadLimit, fatigueMax,
    skillPoints: { earned, spent, available, byLevel }, skills, experience, characterPointsDue,
    overloaded: false, fatigueOver: false, moves: movesFor(mobility.value),
  };
  applyOverrides(d, c);
  // Až po přepisech – porovnává se s tím, co hráč vidí.
  d.moves = movesFor(d.mobility.value);
  d.overloaded = d.loadLimit.value != null && d.load.value > d.loadLimit.value;
  d.fatigueOver = d.fatigueMax.value != null && c.vitals.fatiguePoints > d.fatigueMax.value;
  return d;
}

const OVERRIDE_TARGETS: Partial<Record<OverridableKey, (d: Derived) => Calc<number | string | null>>> = {
  hpMax: (d) => d.hpMax,
  deathThreshold: (d) => d.deathThreshold,
  manaMax: (d) => d.manaMax,
  defenseBase: (d) => d.defenseBase,
  attackNumber: (d) => d.attackNumber,
  defenseNumber: (d) => d.defenseNumber,
  initiativeBonus: (d) => d.initiativeBonus,
  mobility: (d) => d.mobility,
  load: (d) => d.load,
  loadLimit: (d) => d.loadLimit,
  fatigueMax: (d) => d.fatigueMax,
  size: (d) => d.size,
  skillPointsAvailable: (d) => d.skillPoints.available,
};

function applyOverrides(d: Derived, c: Character) {
  for (const [key, raw] of Object.entries(c.overrides) as [OverridableKey, number | string | undefined][]) {
    if (raw === undefined || raw === '') continue;
    const target = OVERRIDE_TARGETS[key]?.(d);
    if (!target) continue;
    // Přepisy jsou jen celá čísla (✔ U) – starší desetinné hodnoty se useknou.
    const v = key === 'size' ? String(raw) : Math.trunc(Number(raw));
    if (typeof v === 'number' && !Number.isFinite(v)) continue;
    target.computed = target.value;
    target.value = v;
    target.overridden = true;
  }
}
