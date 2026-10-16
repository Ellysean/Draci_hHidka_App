// Datový model postavy – zrcadlí docs/DATA_MODEL.md (sekce A).
// Ukládá se jen to, co hráč zadal nebo co se stalo. Vše odvozené počítá src/rules/derive.

export type AttrKey = 'sil' | 'obr' | 'odo' | 'int' | 'char';
export const ATTR_KEYS: readonly AttrKey[] = ['sil', 'obr', 'odo', 'int', 'char'];

export type RaceId = 'barbar' | 'clovek' | 'elf' | 'gnom' | 'obr' | 'pulcik' | 'trpaslik';
export type ClassId = 'valecnik' | 'hranicar' | 'alchymista' | 'kouzelnik' | 'zlodej' | 'klerik';
export type Size = 'A' | 'B' | 'C';

export interface Basic {
  name: string;
  raceId: RaceId;
  classId: ClassId;
  deity: string;
  sizeOverride: Size | null;
  notes: string;
}

export interface LevelUpRecord {
  level: number;
  choices: { slot: string; id: string; params?: Record<string, unknown> }[];
}

export interface LearnedAbility {
  id: string;
  params?: Record<string, unknown>;
  rank?: number;
}

export interface Progression {
  level: number;
  experience: number;
  levelUps: LevelUpRecord[];
  learnedBranches: string[];
  learnedAbilities: LearnedAbility[];
  specialization: string | null;
  learnedItems: string[];
  flags: Record<string, unknown>;
}

export type SkillSource = 'class-basic' | 'class-profession' | 'ability' | 'bought' | 'custom';

export interface CharacterSkill {
  id: string; // id z data/skills.json nebo "custom:<uuid>"
  customName: string | null;
  attribute: AttrKey; // zvolený atribut (u dvouatributových dovedností)
  rank: number; // stupeň zvládnutí, celé číslo ≥ 1
  source: SkillSource;
}

export interface SkillLogEntry {
  level: number;
  skillId: string;
  from: number; // 0 = nová dovednost
  to: number;
  cost: number;
}

export interface Condition {
  id: string;
  /** Počet souběžných výskytů (Krvácení ×N). */
  stacks: number;
  note: string;
  /** Kolik kol stav ještě trvá (stavy na 3 kola, H16); null = do ošetření / ručního konce. */
  rounds?: number | null;
}

export interface Vitals {
  hpCurrent: number;
  manaCurrent: number;
  manaBonusOverMax: number;
  fatigueLevel: number; // 0 Svěží … 4 Zcela vyčerpaná
  fatiguePoints: number;
  conditions: Condition[];
  wounds: { text: string; kind: string }[];
}

export type WeaponKind = 'melee' | 'ranged' | 'thrown';

export interface CustomWeapon {
  name: string;
  attack: number;
  damage: number;
  defense: number;
  strReq: number | null;
  kind: WeaponKind;
  category: string;
  damageTypes: string[];
}

export interface WeaponEntry {
  uid: string;
  itemId: string | null; // null = vlastní zbraň
  custom: CustomWeapon | null;
  grip: 'one-handed' | 'two-handed';
  equipped: boolean;
  weightLb: number | null;
  /** Počet kusů (vrhací zbraně, např. 4 hvězdice). Chybí = 1. */
  qty?: number;
}

export interface ArmorPiece {
  itemId: string | null;
  custom: { name: string; quality: number; strReq: number | null; category: string; stealth?: number | null } | null;
  equipped: boolean;
  weightLb: number | null;
}

export interface GearItem {
  uid: string;
  name: string;
  itemId: string | null;
  qty: number;
  weightLb: number;
  carried: boolean;
  container: string | null;
  /** Sundaná zbroj / štít ve výbavě (u vlastních kusů nese i parametry) – jde znovu nasadit. */
  piece?: { slot: 'armor' | 'shield'; custom: ArmorPiece['custom'] };
  /** Alchymistický výrobek (lektvar, elixír, jed, předmět…) přidaný z katalogu – odkaz na recept (H10, PPP03). */
  alch?: GearAlchemy;
}

export type AlchemyProductKind = 'elixir' | 'lektvar' | 'jed' | 'predmet' | 'ostatni';

export interface GearAlchemy {
  recipeId: string;
  kind: AlchemyProductKind;
  /** Nebezpečnost (výsledek hodu výrobce) – zapíše hráč podle toho, co mu výrobce řekne; null = neznámá. */
  danger?: number | null;
  /** Kolik se za kus zaplatilo (md) – pro předvyplnění prodeje. Výrobky nemají v pravidlech pevnou cenu. */
  priceMd?: number;
}

export interface Money {
  gold: number;
  silver: number;
  copper: number;
}

/** Cena v měně z tabulky (zrcadlí Price z rules/data). */
export interface ItemPrice {
  v: number;
  cur: 'zl' | 'st' | 'md';
}

export type CustomItemType = 'weapon' | 'armor' | 'shield' | 'gear';

/** Vlastní položka mimo pravidla (schvaluje PJ) – šablona pro opakované přidání/nákup. */
export interface CustomCatalogItem {
  id: string; // "custom:<uuid>"
  type: CustomItemType;
  name: string;
  weightLb: number;
  price: ItemPrice | null;
  desc: string;
  weapon?: CustomWeapon & { grip: 'one-handed' | 'two-handed' };
  armor?: { quality: number; strReq: number | null; category: string; stealth: number | null };
}

/** Pohyb peněz (příjem, výdaj, nákup, prodej). */
export interface LedgerEntry {
  uid: string;
  at: string;
  text: string;
  deltaMd: number;
}

export interface Equipment {
  weapons: WeaponEntry[];
  /** Zbraň v ruce – z ní se berou ÚČ/OČ v boxech vedle tabulky. Chybí = první vybavená. */
  activeWeaponUid?: string | null;
  armor: ArmorPiece;
  shield: ArmorPiece;
  items: GearItem[];
  money: Money;
  /** Vlastní položky (Fáze 5) – nabízí je katalog na kartě Vlastní. */
  customCatalog: CustomCatalogItem[];
  /** Historie peněz, nejnovější první (max. 100 záznamů). */
  ledger: LedgerEntry[];
  /** Stav výzbroje a peněz před poslední změnou – pro „Vrátit“. */
  undo: { text: string; snapshot: Omit<Equipment, 'undo' | 'ledger' | 'customCatalog'>; ledgerUid: string | null } | null;
}

/** Základ (primární ingredience) v inventáři alchymisty. */
export interface AlchemistBase {
  uid: string;
  name: string;
  qty: number;
  weightLb: number;
  /** Odkaz na základ receptu (přesné párování); chybí = páruje se podle názvu. */
  baseId?: string;
}

/** Alchymistická dílna (PPP03, ✔ U 22. 9. 2026) – majetek se 4 velikostmi, ne přepínač. */
export interface Workshop {
  size: 1 | 2 | 3 | 4;
  kind: 'zakladni' | 'laborator' | 'vyhen' | 'astrolab';
  access: 'vlastni' | 'pronajem' | 'cech';
  /** Alchymista je teď v dílně (bonus, recepty „v dílně“, rychlejší destilace). */
  here: boolean;
}

/** Vyrobený alchymistický předmět. */
export interface CraftedItem {
  uid: string;
  recipeId: string;
  name: string;
  form: 'potion' | 'oil';
  /** Nebezpečnost = výsledek hodu při výrobě (lze dobrovolně snížit). */
  danger: number;
  extraManaLeft: number | null;
  extraManaMax: number | null;
  craftedAt: string;
  note: string;
  qty: number;
  /** Právě působí (vypitý lektvar/elixír) – hlídá limit 1 + 1. */
  active?: boolean;
  /** Obtížnost výroby a spotřeba na 1 kus (Sabotér, Recyklátor – PPP03). */
  difficulty?: number | null;
  manaSpent?: number;
  materialsSpent?: number;
  /** Sabotáž (PPP03): podmínka, za které výrobek selže / změní chování. */
  sabotage?: string;
  /** Znehodnoceno nepovedenou sabotáží. */
  ruined?: boolean;
  /** Infuze a inhalace (PPP03, Medicus): injekce = půl flakónu se stejným účinkem, aerosol = poloviční účinek. */
  injection?: boolean;
  aerosol?: boolean;
  /** Démoni zakletí v předmětu (Astrální sféry – PPP03, Theurg). */
  demons?: string[];
  /** Nese u sebe (zobrazuje se ve Výbavě a počítá do naložení). Chybí = ano. */
  carried?: boolean;
}

/** Velikost tvora A–F (bestiář, Sešívanci – PPP03). */
export type CreatureSize = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/** Přišitá část sešívance (PPP03 s. 140–141). T = transplantát. */
export interface StitchPart {
  uid: string;
  kind: 'limb' | 'head' | 'special' | 'skin';
  /** Typ z tabulky (Drápy, Kly, Šupiny…), u speciální části volný popis (křídla, oči…). */
  type: string;
  /** Z jakého tvora část pochází a jeho úroveň. */
  source: string;
  sourceLevel: number;
}

/** Přivolaný elementál Theurga (PPP03 s. 180–183). */
export interface SummonedElemental {
  uid: string;
  kind: 'igni' | 'undina' | 'terra' | 'sylfa';
  grade: number;
  hpCurrent: number;
  summonedAt: string;
  note: string;
}

/** Stav Theurga: hůl s Astronem (mana a polapený démon), esence, elementálové. */
export interface TheurgState {
  staff: { owned: boolean; mana: number; astron: string };
  essences: { ohen: number; voda: number; vzduch: number; zeme: number };
  elementals: SummonedElemental[];
}

/** Mechanický konstrukt Pyromanta (PPP03 s. 145–149). */
export interface Construct {
  uid: string;
  name: string;
  size: 'A' | 'B' | 'C';
  /** Materiál těla: Kámen, Keramika, Kov, Kombinace. */
  material: string;
  fuel: 'olej' | 'mana' | 'gem';
  /** Dodatečné nádrže (0–2). */
  tanks: number;
  brain: 1 | 2 | 3 | 4;
  /** Vylepšení (letat, plavat, zesilena, nosic, chrlit, rychlost). */
  upgrades: string[];
  /** Celková obtížnost (součet) – vylepšení se ověřuje proti ní. */
  difficulty: number;
  hpCurrent: number;
  /** Palivo v nádrži (l oleje nebo body many). */
  fuelCurrent: number;
  createdAt: string;
  note: string;
}

/** Sešívanec Medika – základní tělo (Z) + přišité části. Atributy jsou opravy (bestiář). */
export interface StitchedCreature {
  uid: string;
  name: string;
  base: { name: string; level: number; size: CreatureSize; sil: number; obr: number; odo: number; skin: string };
  parts: StitchPart[];
  /** Obtížnost tvorby (součet), při vylepšení se k ní přičítá. */
  difficulty: number;
  hpCurrent: number;
  alive: boolean;
  createdAt: string;
  note: string;
}

export interface AlchemyLogEntry { uid: string; at: string; text: string }

export interface AlchemistState {
  materialsCurrent: number;
  bases: AlchemistBase[];
  /** @deprecated nahrazeno `workshop` (PPP03). */
  workshopAccess?: boolean;
  workshop: Workshop | null;
  containers: { itemId: string; manaCapacity: number | null }[];
  crafted: CraftedItem[];
  /** Sešívanci Medika (PPP03, 7a+.1). */
  stitched: StitchedCreature[];
  /** Konstrukty Pyromanta (PPP03, 7a+.2) a mana/suroviny ze šrotu nepovedeného konstruktu (jen na další konstrukt). */
  constructs: Construct[];
  constructScrap: { mana: number; materials: number };
  /** Theurg (PPP03, 7a+.3). */
  theurg: TheurgState;
  /** Záznam alchymie (výroba, destilace…), nejnovější první. */
  log: AlchemyLogEntry[];
  /** Stav před poslední akcí alchymie (mana, stav alchymisty, výbava) – pro „Vrátit“. */
  undo: { logUid: string; mana: number; state: Omit<AlchemistState, 'undo' | 'log'>; equipment: Pick<Equipment, 'weapons' | 'items' | 'armor' | 'shield' | 'money' | 'activeWeaponUid'> & { ledger?: LedgerEntry[] } }[];
}

/** Druh přítele (7c+, COMPANIONS.md): zvířecí přítel / smečka (H09, PPP02), kůň (PPP02), kouzelníkův přítel (H11, PPP04), Lupičův parťák a Důvěrník Sicca (PPP05). */
export type CompanionKind = 'zvire' | 'kun' | 'mag' | 'lup' | 'duv';

export interface CompanionAttack { n: string; atk: number | null; dmg: number | null }

/**
 * Hodnoty tvora při získání (z tabulky druhu nebo zadané ručně – lze upravit na kartě).
 * U kouzelníkova přítele jsou to základy, ke kterým se přičítá úroveň kouzelníka (H11).
 */
export interface CompanionStats {
  species: string;
  level: number | null;
  size: string | null;
  hp: number;
  mana: number | null;
  spellsBase: number | null;
  mobility: string;
  attrs: Record<AttrKey, number | null> | null;
  attacks: CompanionAttack[];
  zo: number;
  oc: number;
  /** Dovednosti s hodnotou (bonus k hodu k10). */
  skills: Record<string, number>;
  /** Kouzelníkův přítel: dovednosti na stupni úrovně kouzelníka + atribut tvora (H11). */
  skillList: string[];
  /** Lupičův parťák: zlodějské triky s hodnotou (PPP05). */
  tricks: Record<string, number>;
  special: string;
  talent: string;
  /** Obtížnost ochočení / vyvolání. */
  dc: number | null;
}

/** Růst při přestupu pána (H09 / PPP05) a kouzla vybraná kouzelníkovu příteli. */
export interface CompanionGrowth {
  level: number;
  skills: string[];
  /** Lupičův parťák, každá 3. úroveň: +1 ÚČ, nebo +1 ZO a OČ. */
  pick?: 'uc' | 'zo';
  trick?: string;
  spells?: string[];
  /** Důvěrník (PPP05): hod 1k6 na životy navíc; každá 3. úroveň dovednost +1. */
  hp?: number;
  skill?: string;
}

export interface Companion {
  uid: string;
  kind: CompanionKind;
  /** id druhu z data/pratele.json, nebo "vlastni". */
  typeId: string;
  name: string;
  status: 'active' | 'dead' | 'released';
  /** Úroveň pána při získání a při ztrátě (nový přítel nejdřív po dalším přestupu). */
  joinedLevel: number;
  endedLevel: number | null;
  /** Mimo podmínky pravidel – se souhlasem PJ. */
  pj: boolean;
  stats: CompanionStats;
  hpCurrent: number;
  manaCurrent: number;
  spells: string[];
  notes: string;
  grow: CompanionGrowth[];
  /** Zvířecí šampion (Pán zvířat, PPP02). */
  champion: boolean;
  /** Bojuje v aktuálním boji (Boj ve smečce, panel v boji). */
  inFight: boolean;
}

/** Válečník (Fáze 7b): volby, které se mění každé kolo. */
export interface WarriorState {
  /** Rozvážnost (H08): útočný / obranný styl boje. */
  combatStyle: 'offensive' | 'defensive' | null;
  /** Proměnlivý úchop (PPP01): +1 OZ / +2 ÚČ / +3 Zranění. */
  grip: 'oz' | 'uc' | 'zr' | null;
  /** Druhá zbraň (uid) pro boj dvěma zbraněmi – Škola boje se dvěma zbraněmi (H08), Mistr boje dvěma zbraněmi (PPP01). */
  offhand?: string | null;
  /** Záměna (Šermíř, PPP01): atribut pro Útok a pro Obranu volí hráč (✔ U 30. 9. 2026). null = běžně (Útok SIL, Obrana OBR). */
  swapAtk?: 'sil' | 'obr' | null;
  swapDef?: 'sil' | 'obr' | null;
}

/** Kouzlo působící na kouzelníka (7c.2): Magický štít / Magická zbroj do ZO, Rychlost = akce navíc. */
export interface WizardActiveSpell {
  uid: string;
  /** id kouzla (magie.json) nebo schopnosti (energeticka_zbran). */
  id: string;
  name: string;
  /** Bonus k Základní obraně. */
  zo?: number;
  /** Rychlost: krátká akce, útok a obrana navíc. */
  haste?: boolean;
  /** Poslední kolo boje, kdy ještě působí (trvání se počítá od kola po seslání, H11); null = do zrušení. */
  until: number | null;
  note?: string;
}

/** Volby sesílání (7c.2) – platí na záložce Kouzelník i v boji, dokud je hráč nezmění. */
export interface WizardCastMods {
  /** Rychlé kouzlení (H11): ½ vyvolání, obtížnost +3. */
  quick: boolean;
  /** Precizní kouzlení (PPP04): 2× vyvolání, +5. */
  precise: boolean;
  noVoice: boolean;
  noGesture: boolean;
  /** Vyrušen při sesílání: obtížnost +5 (Bojové sesílání ruší). */
  interrupted: boolean;
  /** Dar noci (Nekromant): je noc. */
  night: boolean;
  /** Posilování kouzel: dvojnásobný dosah / trvání. */
  boostRange: boolean;
  boostDuration: boolean;
  /** Hromadné sesílání (Čaroděj): počet cílů. */
  targets: number;
  /** Rituální kouzlení: počet zúčastněných kouzelníků (+5 za každého). */
  ritual: number;
  /** Platit nejdřív manou z hole. */
  fromStaff: boolean;
  /** Kouzlo na sebe – Magický štít, Magická zbroj a Rychlost se zapíšou mezi aktivní. */
  self: boolean;
}

/** Kouzelníkova hůl a její varianty (PPP04 s. 192, 202, 206, 210). */
export interface WizardStaff {
  owned: boolean;
  kind: 'hul' | 'zbran' | 'carodej' | 'dyka';
  /** Zlepšené sesílání: obor (id větve), ke kterému dává +1. */
  obor: string | null;
  mana: number;
  /** Nekromantova dýka: uložené životy (Uchování života). */
  life: number;
  inHand: boolean;
}

export interface WizardState {
  manaDrawsToday: number;
  meditatedToday: boolean;
  staff: WizardStaff;
  active: WizardActiveSpell[];
  mods: WizardCastMods;
  /** Záměna kouzel (PPP04): kolik kouzel už bylo zaměněno na dané úrovni. */
  swaps: { level: number; n: number };
}

/** Aktivní prosba klerika (7d): bonusy na klerika do derive, trvání v kolech boje. */
export interface ClericActivePrayer {
  uid: string;
  id: string;
  name: string;
  /** Aura (nauka Žehnání aurami) – bez Zažehnutí aury jen jedna najednou (H13). */
  aura?: boolean;
  zo?: number;
  atk?: number;
  def?: number;
  /** Pohlcení zranění za kolo (Andělská zbroj). */
  dr?: number;
  /** Zbývající životy bariéry (Štít víry). */
  barrier?: number;
  /** Dočasné životy nad maximum (Božská pomoc) – po skončení zmizí. */
  tempHp?: number;
  note?: string;
  /** Do konce kola (včetně); null = mimo boj / do zrušení. */
  until: number | null;
}

/** Přivolaný posel (nauka Božích patronů, Jazyk prastarých) – karta s upravitelnými hodnotami. */
export interface ClericMessenger {
  uid: string;
  id: string;
  name: string;
  level: number;
  hp: number;
  hpMax: number;
  uc: number | null;
  dmg: number | null;
  zo: number;
  oc: number;
  higher: number;
  note: string;
  until: number | null;
  /** Od přivolání proběhla pravidelná modlitba – smí se povolat další posel (H13). */
  prayed?: boolean;
}

/** Volby vzývání (H13, PPP06) – platí pro další prosbu. */
export interface ClericCastMods {
  /** Prosba na souvěrce: −1 Přízeň (min. 1). */
  coBeliever: boolean;
  /** Bez odříkání (roubík, mlčení): −5. */
  silent: boolean;
  /** Vyrušen při vzývání: −5. */
  disturbed: boolean;
  /** Posvátné místo vlastního boha +5 / cizího −5 / symbol jiného boha −5. */
  place: 'none' | 'own' | 'foreign';
  foreignSymbol: boolean;
  /** Mnohoprosby (PPP06): kolik stejných proseb najednou (1 = běžně). */
  multi: number;
  /** Temná alternativa (jen záznam). */
  dark: boolean;
}

export interface ClericState {
  /** Pravidelné modlitby dnes (0–3). */
  prayersToday: number;
  /** Vynechané modlitby (H13: varování, pak ztráta náklonnosti). */
  missedPrayers: number;
  /** Úroveň, na které bylo použito Zvolání (H13: 1× za úroveň); null = k dispozici. */
  callLevel: number | null;
  /** Posvátný symbol v ruce (schopnost Posvátný symbol: +2, od 6. úr. +3). */
  symbolInHand: boolean;
  /** Rituály a obřady: +3 k Prosbám na 1 den. */
  ritualToday: boolean;
  /** Asketismus (PPP06): slib chudoby dodržen → maximum Přízně ×2. */
  vowKept: boolean;
  /** Ikony (PPP06): každá −10 max. Přízně natrvalo. */
  icons: { uid: string; prayer: string }[];
  /** Sakrální předměty (PPP06): nejvýš úroveň aktivních. */
  sacral: { uid: string; prayer: string }[];
  /** Oběti (PPP06): obtížnost příští prosby −10. */
  offering: boolean;
  /** Požehnání (PPP06) – použito dnes. */
  blessingUsed: boolean;
  /** Bohoslužby (PPP06) – dnes už proběhly. */
  serviceToday: boolean;
  /** Zázraky (PPP06): životy ztracené zázraky, vrací je jen čas (1 za den). */
  miracleHp: number;
  /** Posvátná zbraň (Bojový mnich): uid zbraně. */
  holyWeaponUid: string | null;
  /** Boží zbroj (Bojový mnich): nošená zbroj je posvěcená (+1 kvalita). */
  divineArmor: boolean;
  /** Avatar (Kněz): `active` = v podobě Avatara (do kola `until`, mimo boj null); `drained` = měsíc se nedoplňuje Přízeň. */
  avatar: { active: boolean; until: number | null; drained: boolean } | null;
  mods: ClericCastMods;
  active: ClericActivePrayer[];
  messenger: ClericMessenger | null;
}

/** Člen Siccovy sítě (PPP05 s. 268–269). Kápo = první člen svého typu (vydrží 3 měsíce bez výplaty). */
export interface ThiefNetworkMember {
  uid: string;
  type: 'kapsar' | 'ksefar' | 'ocko' | 'ranar' | 'vrah';
  name: string;
  kapo: boolean;
  /** Měsíce bez výplaty po sobě. */
  unpaid: number;
}

export interface ThiefLogEntry { uid: string; at: string; text: string }

/** Zloděj (7e, H12 + PPP05): denní schopnosti, jedy, Siccova síť, pověsti, falešné identity. */
export interface ThiefState {
  /** Druhá zbraň (uid) pro Boj se dvěma zbraněmi (PPP05). */
  offhand: string | null;
  /** Druhá šance (Lupič) a Zrcadlení (Sicco) – 1× denně; Výroba jedů – 1 dávka denně. */
  secondChanceUsed: boolean;
  mirrorUsed: boolean;
  poisonMadeToday: boolean;
  /** Dávky jedů (id z zlodej.json → počet). */
  poisons: Record<string, number>;
  /** Jed na zbrani – působí při prvním Zranění, pak se setře. */
  weaponPoison: string | null;
  /** Alter ego (Sicco): právě vystupuje pod falešnou identitou → Výhoda +5 k zlodějským dovednostem s CHAR. */
  alterEgo: boolean;
  identities: { uid: string; name: string; note: string }[];
  /** Pověsti a drby (Sicco): kdo, Výhoda/Nevýhoda, kde se ví. */
  rumors: { uid: string; who: string; plus: boolean; where: string }[];
  network: {
    name: string;
    symbol: string;
    seat: string;
    members: ThiefNetworkMember[];
    /** Podplacení se povedlo – další akce sítě má Výhodu +5. */
    bribe: boolean;
  };
  /** Záznam zloděje (výroba, síť, denní schopnosti), nejnovější první. */
  log: ThiefLogEntry[];
  /** Stav před poslední akcí (stav zloděje + výzbroj a peníze) – pro „Vrátit“. */
  undo: { logUid: string; state: Omit<ThiefState, 'undo' | 'log'>; equipment: Pick<Equipment, 'weapons' | 'items' | 'money'> }[];
}

export interface ClassState {
  valecnik: WarriorState | null;
  hranicar: Record<string, never> | null;
  kouzelnik: WizardState | null;
  klerik: ClericState | null;
  zlodej: ThiefState | null;
  alchymista: AlchemistState | null;
}

/** Klíče odvozených hodnot, které jde ručně přepsat (overrides). */
export type OverridableKey =
  | 'hpMax'
  | 'deathThreshold'
  | 'manaMax'
  | 'defenseBase'
  | 'attackNumber'
  | 'defenseNumber'
  | 'initiativeBonus'
  | 'mobility'
  | 'load'
  | 'loadLimit'
  | 'fatigueMax'
  | 'size'
  | 'skillPointsAvailable';

export type Overrides = Partial<Record<OverridableKey, number | string>>;

/** Záznam o tvorbě postavy průvodcem (audit, nic se z něj nepočítá). */
export interface CreationRecord {
  attributeMethod: 'roll' | 'points';
  rolls: number[] | null;
  rerolls: number;
  assignment: Record<AttrKey, number>;
  equipmentMode: 'recommended' | 'custom';
  startingGold: number | null;
  purchases: { itemId: string; qty: number; priceMd: number }[];
}

/** Délka akce v boji (H16): okamžitá, krátká, dlouhá. */
export type ActionLength = 'O' | 'K' | 'D';

export interface CombatTurnEntry {
  n: string;
  len: ActionLength;
  once: 'attack' | 'cast' | null;
  /** Kolik útoků záznam spotřeboval (pro „Vrátit akci“ u více útoků za kolo, 7b.2). */
  atk?: number;
  /** Schopnost s cooldownem, kterou záznam spotřeboval, a její předchozí kolo použití (pro „Vrátit akci“). */
  cd?: string;
  cdPrev?: number | null;
}

/** Hlídání akcí v boji (H16) – tah = 1 dlouhá NEBO 2 krátké + okamžité, Obrana = krátká 1× za kolo. */
export interface CombatState {
  round: number;
  init: number | null;
  /** Iniciativa se hází každé kolo (volitelné pravidlo H16). */
  reroll: boolean;
  /** Kolik protivníků na postavu útočí (přesila). */
  foes: number;
  surprised: boolean;
  phase: 'wait' | 'turn' | 'done';
  /** Použité krátké akce v kole (dlouhá = 2, obrana = 1). */
  k: number;
  attack: boolean;
  cast: boolean;
  defense: boolean;
  focusTrick: boolean;
  /** Trik typu Výkřik už v tomto kole (1× za kolo, H08). */
  shout?: boolean;
  turnLog: CombatTurnEntry[];
  /** Kouzlo sesílané přes víc dlouhých akcí. */
  channel: { n: string; left: number } | null;
  /** Kolik útoků / aktivních obran už v kole proběhlo (7b.2; chybí-li, odvodí se z attack/defense). */
  atkUsed?: number;
  defUsed?: number;
  /** Dodatečný útok štítem (Boj štítem, PPP01) v tomto kole už proběhl. */
  shieldAtk?: boolean;
  /** Válečník (7b.2): Vražedná zuřivost, Cesta krve, Sebeobětování, strategie a rozkazy. */
  war?: WarriorCombat;
  /** Kouzelník (7c.2): Magická dominance – kolo posledního použití (1× za kolo). */
  wiz?: { dominance?: number };
  /** Klerik (7d): Zastavení dění 1× za souboj. */
  cle?: { stop?: boolean };
  /** Zloděj (7e): Výhodná pozice spotřebována, Riskantní útok / Bojová kreativita / míření (kolo), jednorázové triky v souboji. */
  zlo?: ThiefCombat;
}

export interface ThiefCombat {
  /** Výhodná pozice (Assassin) je spotřebována – znovu za cenu jednoho Útoku. */
  posUsed?: boolean;
  /** Kolo, ve kterém Assassin vyměnil Obranu za Útok (Riskantní útok). */
  risky?: number;
  /** Kolo s novou improvizovanou zbraní (Bojová kreativita, +5 ÚČ i OČ). */
  creative?: number;
  /** Kolo míření (Oko střelce) – výstřel s Výhodou +5 v dalším tahu. */
  aim?: number;
  /** Jednorázové triky už použité v tomto souboji (id). */
  used?: string[];
}

/** Stav válečníka v jednom boji (7b.2, H08 + PPP01). */
export interface WarriorCombat {
  /** Vražedná zuřivost (Berserkr): přerod v kole `start`, účinky od kola start + 1; `check` = na konci kola se musí hodit past Vůle. */
  fury?: { start: number; active: boolean; mad: boolean; check: boolean; ended: number | null } | null;
  /** Cesta krve – nabuzení (1× za boj). */
  bloodRush?: boolean;
  /** Sebeobětování (Rytíř): znovu až od tohoto kola. */
  sacrificeReady?: number;
  /** Cesta strategie: vyhlášená strategie (1× za boj), platí od kola `from` do `to` (null = celý boj). */
  strategy?: { kind: 'utok' | 'obrana'; bonus: number; from: number; to: number | null } | null;
  /** Velení: rozkaz družině (platí do odvolání). */
  command?: 'utok' | 'obrana' | null;
  /** Bojové rozkazy (Rytíř): rozkaz tohoto kola. */
  order?: string | null;
  /** Schopnosti „každé druhé kolo“ (Rychlá čepel, Přehmátnutí, Boj štítem): kolo posledního použití – znovu až o kolo později (✔ U 28. 9. 2026). */
  cd?: Record<string, number>;
  /** Odklad smrti po Vražedné zuřivosti (placeno adrenalinem) – do tohoto kola včetně. */
  deathDelay?: number | null;
}

export interface PlayLogEntry {
  uid: string;
  at: string;
  text: string;
}

/** Stav hry na záložce Boj a stavy: probíhající boj, záznam rychlých úprav a jejich vrácení. */
export interface PlayState {
  combat: CombatState | null;
  /** Nejnovější první, max. 50. */
  log: PlayLogEntry[];
  /** Stav životů/energie/stavů a boje před poslední úpravou (nejnovější první, max. 20). */
  undo: { logUid: string; vitals: Vitals; combat: CombatState | null; wiz?: WizardState | null; cle?: ClericState | null; comp?: Companion[] }[];
}

export interface Character {
  schemaVersion: number;
  id: string;
  meta: { createdAt: string; updatedAt: string; creation?: CreationRecord };
  basic: Basic;
  attributes: Record<AttrKey, number>;
  attributeLog: { level: number; raised: AttrKey[] }[];
  progression: Progression;
  skills: CharacterSkill[];
  /** Aktivní augmentace na postavě (PPP03 – id receptu, např. umela_paze); efekty počítá derive. */
  augmentations: string[];
  skillLog: SkillLogEntry[];
  vitals: Vitals;
  equipment: Equipment;
  companions: Companion[];
  classState: ClassState;
  overrides: Overrides;
  notesSections: { freeText: string; experiences: { text: string; impact: string }[] };
  play: PlayState;
}
