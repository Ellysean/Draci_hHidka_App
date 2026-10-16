import { CURRENT_SCHEMA_VERSION } from '../storage/schema';
import type { AlchemistState, Character, ClassId, ClassState, ClericState, Companion, CompanionStats, ThiefState, WarriorState, WizardState } from './types';

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

export const emptyAlchemist = (): AlchemistState => ({ materialsCurrent: 0, bases: [], workshop: null, containers: [], crafted: [], stitched: [], constructs: [], constructScrap: { mana: 0, materials: 0 },
  theurg: { staff: { owned: false, mana: 0, astron: '' }, essences: { ohen: 0, voda: 0, vzduch: 0, zeme: 0 }, elementals: [] }, log: [], undo: [] });

export const emptyWarrior = (): WarriorState => ({ combatStyle: null, grip: null });

export const emptyWizard = (): WizardState => ({
  manaDrawsToday: 0, meditatedToday: false,
  staff: { owned: false, kind: 'hul', obor: null, mana: 0, life: 0, inHand: true },
  active: [],
  mods: { quick: false, precise: false, noVoice: false, noGesture: false, interrupted: false, night: false, boostRange: false, boostDuration: false, targets: 1, ritual: 0, fromStaff: false, self: true },
  swaps: { level: 0, n: 0 },
});

/** Klerik (7d) – migrace jím doplní chybějící pole (starší `{ prayersToday, activeAura }`). */
export const emptyCleric = (): ClericState => ({
  prayersToday: 0, missedPrayers: 0, callLevel: null, symbolInHand: true, ritualToday: false, vowKept: true,
  icons: [], sacral: [], offering: false, blessingUsed: false, serviceToday: false, miracleHp: 0,
  holyWeaponUid: null, divineArmor: false, avatar: null,
  mods: { coBeliever: false, silent: false, disturbed: false, place: 'none', foreignSymbol: false, multi: 1, dark: false },
  active: [], messenger: null,
});

/** Zloděj (7e) – migrace jím doplní chybějící pole (starší `{}`). */
export const emptyThief = (): ThiefState => ({
  offhand: null, secondChanceUsed: false, mirrorUsed: false, poisonMadeToday: false, poisons: {}, weaponPoison: null,
  alterEgo: false, identities: [], rumors: [], network: { name: '', symbol: '', seat: '', members: [], bribe: false }, log: [], undo: [],
});

export const emptyCompanionStats = (): CompanionStats => ({
  species: '', level: null, size: null, hp: 1, mana: null, spellsBase: null, mobility: '', attrs: null,
  attacks: [], zo: 0, oc: 0, skills: {}, skillList: [], tricks: {}, special: '', talent: '', dc: null,
});

/** Prázdný přítel (7c+) – migrace jím doplní chybějící pole. */
export const emptyCompanion = (): Companion => ({
  uid: '', kind: 'zvire', typeId: 'vlastni', name: '', status: 'active', joinedLevel: 1, endedLevel: null, pj: false,
  stats: emptyCompanionStats(), hpCurrent: 0, manaCurrent: 0, spells: [], notes: '', grow: [], champion: false, inFight: false,
});

export function emptyClassState(classId: ClassId): ClassState {
  const s: ClassState = { valecnik: null, hranicar: null, kouzelnik: null, klerik: null, zlodej: null, alchymista: null };
  switch (classId) {
    case 'valecnik': s.valecnik = emptyWarrior(); break;
    case 'hranicar': s.hranicar = {}; break;
    case 'kouzelnik': s.kouzelnik = emptyWizard(); break;
    case 'klerik': s.klerik = emptyCleric(); break;
    case 'zlodej': s.zlodej = emptyThief(); break;
    case 'alchymista': s.alchymista = emptyAlchemist(); break;
  }
  return s;
}

/** Prázdná postava (výchozí stav appky, než ji vyplní průvodce tvorbou – Fáze 3). */
export function newCharacter(now = new Date().toISOString()): Character {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: uid(),
    meta: { createdAt: now, updatedAt: now },
    basic: { name: '', raceId: 'clovek', classId: 'valecnik', deity: '', sizeOverride: null, notes: '' },
    attributes: { sil: 10, obr: 10, odo: 10, int: 10, char: 10 },
    attributeLog: [],
    progression: {
      level: 1, experience: 0, levelUps: [], learnedBranches: [], learnedAbilities: [],
      specialization: null, learnedItems: [], flags: {},
    },
    skills: [],
    augmentations: [],
    skillLog: [],
    vitals: { hpCurrent: 10, manaCurrent: 0, manaBonusOverMax: 0, fatigueLevel: 0, fatiguePoints: 0, conditions: [], wounds: [] },
    equipment: {
      weapons: [],
      armor: { itemId: null, custom: null, equipped: true, weightLb: null },
      shield: { itemId: null, custom: null, equipped: false, weightLb: null },
      items: [],
      money: { gold: 0, silver: 0, copper: 0 },
      customCatalog: [],
      ledger: [],
      undo: null,
    },
    companions: [],
    classState: emptyClassState('valecnik'),
    overrides: {},
    notesSections: { freeText: '', experiences: [] },
    play: { combat: null, log: [], undo: [] },
  };
}
