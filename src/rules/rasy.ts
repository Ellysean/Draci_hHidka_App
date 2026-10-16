// Rodové zvláštní schopnosti (H04) – plné znění pro info bublinu v deníku a situační bonusy k dovednostem.
// Automaticky se počítá jen Hroší kůže (ZO +2, races.json), Houževnatost (+2 při léčení, rules/combat.ts)
// a Všestrannost (dovednostní body, derive). Orlí zrak, Zručnost a Tichošlápek jsou situační – appka bonus
// jen připomene u dovednosti, započte ho PJ (✔ U 3. 10. 2026). Vidění ve tmě je jen informace.
import type { Character, RaceId } from '../model/types';

export interface RaceAbilityInfo {
  /** Plné znění z H04. */
  text: string;
  /** auto = započítává deník, situ = připomínka (rozhodne PJ), info = jen popis. */
  kind: 'auto' | 'situ' | 'info';
  /** Situační bonus: k jakým dovednostem a kdy. */
  situ?: { bonus: number; skills: string[]; when: string };
}

export const RACE_ABILITY: Record<RaceId, RaceAbilityInfo> = {
  barbar: {
    kind: 'auto',
    text: 'Tvrdý život učinil barbary velmi odolnými – vyrovnali se s nepřízní počasí, zraněními i nemocemi, a jejich tělo se naučilo lépe hojit. Kdykoliv se barbar nějakou formou léčí, získává 2 životy navíc (není-li uvedeno jinak). Deník to přičítá sám při léčení na záložce Boj a stavy.',
  },
  clovek: {
    kind: 'auto',
    text: 'Lidé jsou známí přirozenou zvídavostí a schopností učit se. Díky Všestrannosti získávají na začátku hry (a při každém přestupu na další úroveň) o tolik dovednostních bodů navíc, kolik je jejich úroveň. Deník to započítává do dovednostních bodů (body se získávají na sudých úrovních).',
  },
  elf: {
    kind: 'situ',
    text: 'Elfové vidí velmi ostře na dvakrát větší vzdálenost než ostatní. Ke všem ověřovacím hodům vyžadujícím ostrý zrak (Postřeh, Stopování, Alchymistovo Vnímání many a podobné hody) si započítávají bonus +2. Bonus se nevztahuje k útoku ani k obraně. Když tě Vypravěč nechá hodit na Postřeh, oznam mu výsledek a připomeň Orlí zrak – pokud jde o něco, co lze postřehnout očima, připočte bonus.',
    situ: { bonus: 2, skills: ['postreh', 'stopovani'], when: 'jde-li o ostrý zrak (co lze postřehnout očima)' },
  },
  gnom: {
    kind: 'situ',
    text: 'Gnómové mají citlivé ruce, velkou představivost, smysl pro detail a přesný odhad. Získávají bonus +2 ke všem ověřovacím hodům založeným na jemné práci rukou (Alchymistova Lučba, Mechanika, Zlodějovo Vybírání kapes a Umění železného klíče, Umění při hraní na hudební nástroj a podobné hody). Bonus se nevztahuje na akce spoléhající na koordinaci celého těla a sílu (Hbitost, šplh, střelba a boj obecně).',
    situ: { bonus: 2, skills: ['lucba', 'mechanika', 'vybirani_kapes', 'umeni_zelezneho_klice', 'umeni', 'remesla'], when: 'jde-li o jemnou práci rukou' },
  },
  obr: {
    kind: 'auto',
    text: 'Kůže obrů je tvrdá a rohovitá – trny, střepy ani špičaté větve ji neproniknou. Obři získávají k Základní obraně zvláštní bonus +2. Deník ho započítává do ZO.',
  },
  pulcik: {
    kind: 'situ',
    text: 'Půlčíci se díky chlupatým chodidlům pohybují naprosto neslyšně, i po štěrkové cestě – ale jen bez bot. Mají bonus +2 ke všem ověřovacím hodům vyžadujícím nenápadné přesuny a utajení (Hbitost při plížení, Zlodějovo Umění skrývání a podobné hody). Bonus zaniká, má-li na sobě půlčík nezajištěné zdroje hluku (kroužková košile, nádobí…).',
    situ: { bonus: 2, skills: ['hbitost', 'umeni_skryvani'], when: 'při plížení a utajení bez bot (a bez hlučné výbavy)' },
  },
  trpaslik: {
    kind: 'info',
    text: 'Trpaslíci mají dar nočního vidění z odvěkého života v podzemí: v naprosté tmě vidí až na vzdálenost 30 sáhů. Nerozeznají barvy, vše vidí v odstínech šedi, ale ve tmě se pohybují rychle a bezpečně.',
  },
};

export const raceAbilityInfo = (c: Character) => RACE_ABILITY[c.basic.raceId];

/** Situační rodový bonus k dovednosti (připomínka v deníku, nezapočítává se). */
export function raceSkillNote(c: Character, skillId: string): { bonus: number; when: string } | null {
  const s = RACE_ABILITY[c.basic.raceId]?.situ;
  return s && s.skills.includes(skillId) ? { bonus: s.bonus, when: s.when } : null;
}

/** Dovednosti, které se používají k záchranným hodům (✔ U 3. 10. 2026). */
export const SAVE_SKILLS = new Set(['atletika', 'vule', 'postreh', 'vydrz', 'hbitost']);
