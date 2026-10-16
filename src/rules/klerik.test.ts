// 7d – klerik: prosby H13 + PPP06, nauky, Přízeň, volby vzývání, aktivní prosby, poslové, schopnosti, přestup, boj.
import { describe, expect, it } from 'vitest';
import { buildCharacter, newDraft } from '../creation/draft';
import type { Character } from '../model/types';
import { autoGains, emptyLevelUp, options, specOptions } from '../progression/levelup';
import { migrate } from '../storage/migrations';
import { castSpell, endCombat, hpState, knownSpells, myTurn, newRound, roundInfo, spellCheck, startCombat, turnCtx } from './combat';
import { derive } from './derive';
import {
  CLERIC, PRAYERS, activePrayers, callWhy, cle, clericZo, darBonus, knownPrayers, messengerStats, prayWhy, prayerByName, prayerCheckBonus,
  prayerDc, prayerPrice,
} from './klerik';
import { addIcon, call, flagellation, hitBarrier, pray, prayOutside, rollHeal, setCleric, setMods } from './klerik-akce';

const cleric = (level = 1): Character => {
  const c = buildCharacter({ ...newDraft(), name: 'Věrovít', raceId: 'clovek', classId: 'klerik', deity: 'Freya', method: 'points', points: { sil: 3, obr: 3, odo: 4, int: 3, char: 7 }, picks: [], choice: 0 });
  c.progression.level = level;
  c.equipment.weapons = [];
  c.equipment.shield = { itemId: null, custom: null, equipped: false, weightLb: null };
  c.equipment.armor = { itemId: null, custom: null, equipped: false, weightLb: null };
  c.equipment.activeWeaponUid = null;
  return c;
};
const learn = (c: Character, ...ids: string[]) => { c.progression.learnedAbilities.push(...ids.map((id) => ({ id }))); return c; };
const names = (c: Character) => knownPrayers(c).map((p) => p.nazev);
const P = (n: string) => prayerByName(n)!;

describe('data klerika (H13 + PPP06)', () => {
  it('35 proseb H13, 28 proseb a 5 léků PPP06, 6 nauk po 4 prosbách, 42 schopností', () => {
    expect(PRAYERS.filter((p) => p.zdroj === 'H13')).toHaveLength(35);
    expect(PRAYERS.filter((p) => p.zdroj === 'PPP06' && p.typ === 'prosba')).toHaveLength(28);
    expect(PRAYERS.filter((p) => p.typ === 'lek')).toHaveLength(5);
    expect(new Set(PRAYERS.map((p) => p.id)).size).toBe(PRAYERS.length);
    expect(CLERIC.nauky.map((n) => n.prosby.length)).toEqual([4, 4, 4, 4, 4, 4]);
    expect(Object.keys(CLERIC.schopnosti)).toHaveLength(42);
    expect(PRAYERS.every((p) => p.popis.length > 40)).toBe(true);
  });
  it('strojová cena, obtížnost a vzývání', () => {
    expect(P('Léčivé slovo').cena).toMatchObject({ base: 0, per: { cost: 3, unit: 'slovo', min: 1 } });
    expect(P('Léčivé slovo').obtiznost).toMatchObject({ base: 6, step: 2 });
    expect(P('Posel bojovník').cena).toMatchObject({ base: 0, perLevel: 3 });
    expect(P('Andělská zbroj').cena).toMatchObject({ base: 5, perLevel: 1 });
    expect(P('Uzdrav otravu').cena).toMatchObject({ base: 4, alt: 8 });
    expect(P('Štít víry').cena).toMatchObject({ base: 5, per: { cost: 1, min: 0 } });
    expect(P('Očištění').vyvolani).toMatchObject({ kind: 'dlouha', n: 2 });
    expect(P('Svatá zbroj').vyvolani.kind).toBe('okamzita');
    expect(P('Odhal démona').obtiznost.base).toBeNull();
  });
});

describe('prosby klerika – vždy automaticky', () => {
  it('1. úroveň 5 základních, od 2. úrovně +6 obecných', () => {
    const c = cleric();
    expect(names(c)).toEqual(['Léčivé slovo', 'Očištění', 'Štít víry', 'Úder moci', 'Uzdrav otravu']);
    c.progression.level = 2;
    expect(names(c)).toHaveLength(11);
  });
  it('nauka dá 4 prosby, schopnost PPP06 své prosby, Výcvik lazaretních léčitelů léky', () => {
    const c = cleric(6);
    c.progression.learnedBranches.push('milosrdenstvi');
    expect(names(c)).toEqual(expect.arrayContaining(['Napravení těla', 'Odstraň paralýzu', 'Udržení života', 'Uzdrav nemocného']));
    learn(c, 'strazce_mysteria', 'vycvik_lazaretnich_lecitelu');
    expect(names(c)).toEqual(expect.arrayContaining(['Mezisvět', 'Znamení života', 'Lék svatého Jana']));
    expect(knownSpells(c).map((s) => s.n)).not.toContain('Lék svatého Jana');
  });
});

describe('cena, obtížnost a ověření (H13, PPP06)', () => {
  it('Léčivé slovo za 3 slova: 9 Přízně, obtížnost 10; Posel bojovník na 4. úrovni 12 (příklad H13)', () => {
    const c = cleric(4);
    expect(prayerPrice(c, P('Léčivé slovo'), 3).total).toBe(9);
    expect(prayerDc(c, P('Léčivé slovo'), 3).dc).toBe(10);
    expect(prayerPrice(c, P('Posel bojovník'), 1).total).toBe(12);
    learn(c, 'jazyk_prastarych');
    expect(prayerPrice(c, P('Posel bojovník'), 1).total).toBe(9);
  });
  it('souvěrec −1 (vždy aspoň 1); Mnohoprosby 4× = 24 Přízně, obtížnosti 6/11/16/21 (příklad PPP06)', () => {
    let c = cleric(6);
    c = setMods(c, { coBeliever: true });
    expect(prayerPrice(c, P('Léčivé slovo'), 1).total).toBe(2);
    c = learn(setMods(c, { coBeliever: false, multi: 4 }), 'mnohoprosby');
    expect(prayerPrice(c, P('Léčivé slovo'), 1).total).toBe(24);
    expect(prayerDc(c, P('Léčivé slovo'), 1).list).toEqual([6, 11, 16, 21]);
  });
  it('Posvátný symbol +2 (od 6. úr. +3), rituál +3, bez odříkání a vyrušení −5; Oběti −10 obtížnost', () => {
    let c = learn(cleric(5), 'posvatny_symbol', 'ritualy_a_obrady', 'obeti');
    expect(prayerCheckBonus(c).bonus).toBe(2);
    c.progression.level = 6;
    c = setCleric(c, { ritualToday: true });
    expect(prayerCheckBonus(c).bonus).toBe(6);
    c = setMods(c, { silent: true, disturbed: true });
    expect(prayerCheckBonus(c).bonus).toBe(-4);
    c = { ...c, classState: { ...c.classState, klerik: { ...cle(c), offering: true } } };
    expect(prayerDc(c, P('Napravení těla'), 1).dc).toBe(0);
  });
});

describe('Přízeň, modlitby a Zvolání', () => {
  it('modlitba +⅓ maxima (nahoru), ne nad maximum, 3× denně', () => {
    let c = cleric(3);
    const max = derive(c).manaMax.value!;
    c.vitals.manaCurrent = 0;
    c = pray(c, derive(c));
    expect(c.vitals.manaCurrent).toBe(Math.ceil(max / 3));
    c = pray(pray(c, derive(c)), derive(c));
    expect(c.vitals.manaCurrent).toBe(max);
    expect(prayWhy(c, max)).toBe('dnes už 3 modlitby');
  });
  it('Zvolání 1× za úroveň, Flagelantství ho obnoví (životy na 1)', () => {
    let c = learn(cleric(6), 'flagelantstvi');
    c = call(c, 'Léčivé slovo', false);
    expect(callWhy(c)).not.toBe('');
    c = flagellation(c);
    expect(callWhy(c)).toBe('');
    expect(c.vitals.hpCurrent).toBe(1);
  });
  it('Asketismus ×2 a Ikony −10 do maxima Přízně; Osvícení +2/úroveň', () => {
    let c = cleric(6);
    const base = derive(c).manaMax.value!;
    c = learn(c, 'asketismus');
    expect(derive(c).manaMax.value).toBe(2 * base);
    c = setCleric(learn(c, 'ikony'), { vowKept: false });
    c = addIcon(c, 'Léčivé slovo');
    expect(derive(c).manaMax.value).toBe(base - 10);
    c = learn(cleric(6), 'osviceni');
    expect(derive(c).manaMax.value).toBe(base + 12);
  });
  it('Dar života od 6. úrovně: léčení +¼, nejméně +1', () => {
    expect(darBonus(3)).toBe(1);
    expect(darBonus(9)).toBe(3);
    const six = () => 6;
    expect(rollHeal(cleric(5), P('Léčivé slovo'), 2, six)!.total).toBe(12);
    expect(rollHeal(cleric(6), P('Léčivé slovo'), 2, six)!.total).toBe(15);
  });
});

describe('bonusy v deníku', () => {
  it('Boží bojovník +2 ÚČ/OČ, Bojovníci víry +1 ÚČ, Milosrdenství +1 První pomoc, Svatá pravda +1 Vůle, Paladinský výcvik ODO +1', () => {
    const c = cleric(6);
    const d0 = derive(c);
    learn(c, 'bozi_bojovnik', 'paladinsky_vycvik');
    c.progression.learnedBranches.push('bojovnici_viry', 'milosrdenstvi', 'svata_pravda');
    const d = derive(c);
    expect(d.attackNumber.value - d0.attackNumber.value).toBe(3);
    expect(d.defenseNumber.value - d0.defenseNumber.value).toBe(2);
    expect(d.skills.find((s) => s.id === 'prvni_pomoc')!.bonus).toBe(1);
    expect(d.skills.find((s) => s.id === 'vule')!.bonus).toBe(1);
    expect(d.attributes.odo.bonus).toBe(1);
  });
  it('Bojový mnich: Boj zblízka +1/+1 beze zbraně (tváří v tvář)', () => {
    const c = cleric(6);
    const d0 = derive(c);
    c.progression.specialization = 'bojovy_mnich';
    expect(derive(c).attackNumber.value - d0.attackNumber.value).toBe(1);
  });
});

describe('boj klerika', () => {
  const fight = (c: Character) => myTurn(startCombat(c, false));
  it('Štít víry za X = 4: 9 Přízně, ZO +3, bariéra pohltí zranění; po 5 kolech skončí', () => {
    let c = cleric(2);
    c.vitals.manaCurrent = 20;
    c.vitals.hpCurrent = 10;
    c = fight(c);
    const s = knownSpells(c).find((x) => x.n === 'Štít víry')!;
    expect(s.units).toMatchObject({ min: 0 });
    const zo0 = derive(c).defenseBase.value;
    c = castSpell(c, derive(c), s, 4).character;
    expect(c.vitals.manaCurrent).toBe(11);
    expect(derive(c).defenseBase.value).toBe(zo0 + 3);
    expect(clericZo(c).total).toBe(3);
    c = hitBarrier(c, 6);
    expect(c.vitals.hpCurrent).toBe(8);
    expect(activePrayers(c)).toHaveLength(0);
    c = castSpell(myTurn(newRound(c).character), derive(c), s, 2).character;
    for (let i = 0; i < 6; i++) c = newRound(c).character;
    expect(activePrayers(c)).toHaveLength(0);
  });
  it('aura jen jedna najednou; Zažehnutí aury víc; konec boje aury ukončí', () => {
    let c = cleric(6);
    c.progression.learnedBranches.push('zehnani_aurami');
    c.vitals.manaCurrent = 40;
    c = fight(c);
    const by = (n: string) => knownSpells(c).find((x) => x.n === n)!;
    c = castSpell(c, derive(c), by('Aura svatého štítu'), 3).character;
    expect(activePrayers(c)[0]).toMatchObject({ aura: true, zo: 2, until: 4 });
    c = myTurn(newRound(c).character);
    expect(castSpell(c, derive(c), by('Aura ocelové pěsti'), 2).character).toBe(c);
    c = endCombat(c);
    expect(activePrayers(c)).toHaveLength(0);
  });
  it('ověření prosby v boji zahrne Posvátný symbol', () => {
    const c = learn(cleric(2), 'posvatny_symbol');
    const s = knownSpells(c)[0];
    expect(spellCheck(c, derive(c), s).parts).toContain('Posvátný symbol +2');
  });
  it('Posel bojovník: karta s životy 5 × úroveň, po 10 kolech odejde', () => {
    let c = cleric(4);
    c.progression.learnedBranches.push('bozi_patroni');
    c.vitals.manaCurrent = 20;
    c = fight(c);
    c = castSpell(c, derive(c), knownSpells(c).find((x) => x.n === 'Posel bojovník')!, 1).character;
    expect(cle(c).messenger).toMatchObject({ name: 'Posel bojovník', hp: 20, uc: 10, oc: 10, zo: 9 });
    expect(messengerStats(c, 'posel_lovec')).toMatchObject({ hp: 35, uc: 5, oc: 8 });
    for (let i = 0; i < 11; i++) c = newRound(c).character;
    expect(cle(c).messenger).toBeNull();
  });
  it('Fanatismus: 2 útoky v lichém kole, 1 v sudém, od 12. úrovně vždy 2', () => {
    let c = learn(cleric(6), 'fanatismus');
    c = fight(c);
    expect(roundInfo(c, derive(c)).atk.n).toBe(2);
    c = newRound(c).character;
    expect(roundInfo(c, derive(c)).atk.n).toBe(1);
    c.progression.level = 12;
    expect(roundInfo(c, derive(c)).atk.n).toBe(2);
  });
  it('Inkvizitorský výcvik: pod Mezí vyřazení neupadá do bezvědomí', () => {
    const c = learn(cleric(6), 'inkvizitorsky_vycvik');
    c.vitals.hpCurrent = -2;
    expect(hpState(c, derive(c))).toBe('badly');
    expect(turnCtx(fight(c), derive(c)).out).toBe(false);
  });
});

describe('mimo boj, přestup a migrace', () => {
  it('vzývání mimo boj: odečte Přízeň, vrátí obtížnost a bonus', () => {
    const c = cleric(2);
    c.vitals.manaCurrent = 10;
    const r = prayOutside(c, derive(c), P('Léčivé slovo'), 2, 5)!;
    expect(r.character.vitals.manaCurrent).toBe(4);
    expect(r.dc).toBe(8);
    expect(r.bonus).toBe(5);
  });
  it('přestup: nauka dá 4 prosby; od 6. úrovně PPP06 schopnosti; specializace 2 ze 3', () => {
    const c = cleric(5);
    const st = { ...emptyLevelUp(), pick: { kind: 'branch' as const, id: 'demonologie' } };
    expect(autoGains(c, st)).toEqual(expect.arrayContaining(['Najdi temnotu', 'Ošálení temnoty']));
    expect(options(c).find((o) => o.id === 'asketismus')?.disabled).toBeNull();
    expect(autoGains(c, emptyLevelUp())).toContain('Pokročilý klerik – Dar života: léčivé prosby o ¼ silnější (nejméně +1 život)');
    c.progression.learnedBranches.push('milosrdenstvi');
    learn(c, 'pozehnane_zdravi');
    const knez = specOptions(c, emptyLevelUp()).find((o) => o.id === 'knez')!;
    expect(knez.disabled).toBeNull();
    expect(knez.details?.grants[0]).toMatch(/^Milosrdenství \(Kněz\)/);
    expect(specOptions(c, emptyLevelUp()).find((o) => o.id === 'exorcista')!.disabled).toBe('splněno 0 z 2');
  });
  it('starší uložený stav klerika se doplní na nový tvar', () => {
    const c = cleric();
    const raw = JSON.parse(JSON.stringify({ ...c, classState: { ...c.classState, klerik: { prayersToday: 2, activeAura: 'x' } } }));
    const m = migrate(raw);
    expect(m.classState.klerik).toMatchObject({ prayersToday: 2, callLevel: null, active: [], mods: { multi: 1 } });
    expect('activeAura' in m.classState.klerik!).toBe(false);
  });
});
