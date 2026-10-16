// 7c.2 – kouzelník: kouzla H11 + PPP04, obory, přestup, mana, hůl, sesílání s postihy a bonusy, boj.
import { describe, expect, it } from 'vitest';
import { buildCharacter, newDraft } from '../creation/draft';
import type { Character } from '../model/types';
import {
  applyLevelUp, autoGains, canNext, emptyLevelUp, itemPool, itemsBreakdown, magisterWhy, options, pickParam, specOptions,
  type LevelUpState,
} from '../progression/levelup';
import { attack, attackWhy, canDefend, castSpell, knownSpells, newRound, roundInfo, spellCheck, spellWhy, startCombat, myTurn, takeDefense, turnCtx } from './combat';
import { derive } from './derive';
import {
  WIZ, WIZARD_SPELLS, castProfile, knownWizardSpells, learnLock, manaCap, spellBranch, spellByName, staffCapacity, swapsLeft, wizardCtx,
} from './kouzelnik';
import {
  bloodRitual, castOutside, dominance, drawMana, makeStaff, meditate, mentalDuel, newDay, setMods, storeLife, storeMana, swapSpell, swapWhy,
} from './kouzelnik-akce';

const wizard = (level = 1, picks = ['Blesk', 'Magický štít', 'Rychlost']): Character => {
  const c = buildCharacter({ ...newDraft(), name: 'Meredil', raceId: 'clovek', classId: 'kouzelnik', method: 'points', points: { sil: 2, obr: 5, odo: 4, int: 8, char: 1 }, picks, choice: 0 });
  c.progression.level = level;
  c.equipment.weapons = [];
  c.equipment.shield = { itemId: null, custom: null, equipped: false, weightLb: null };
  c.equipment.armor = { itemId: null, custom: null, equipped: false, weightLb: null };
  c.equipment.activeWeaponUid = null;
  c.vitals.manaCurrent = 20;
  return c;
};
const learn = (c: Character, ...ids: string[]) => { c.progression.learnedAbilities.push(...ids.map((id) => ({ id }))); return c; };
const pick = (_c: Character, st: Partial<LevelUpState>): LevelUpState => ({ ...emptyLevelUp(), ...st });
const sp = (n: string) => spellByName(n)!;

describe('data kouzelníka (H11 + PPP04)', () => {
  it('145 kouzel: 13 obecných, 6 oborů × 6, 96 pro pokročilé; 42 schopností (6 H11, 12 PPP04, 3 × 8 specializací)', () => {
    expect(WIZARD_SPELLS).toHaveLength(145);
    expect(WIZARD_SPELLS.filter((s) => s.skupina === 'obecna')).toHaveLength(13);
    expect(WIZARD_SPELLS.filter((s) => s.zdroj === 'PPP04')).toHaveLength(96);
    expect(Object.keys(WIZ.schopnosti)).toHaveLength(42);
    expect(Object.values(WIZ.schopnosti).filter((a) => a.spec === 'nekromant').map((a) => a.name)).toContain('Sběratel duší');
    expect(WIZ.schopnosti.magistr_magickeho_oboru.full).toMatch(/bonus \+5/);
  });
  it('obecná kouzla mají obor podle PPP04 s. 213 (Blesk – Divoká, Rychlost – Vitální)', () => {
    expect(spellBranch(sp('Blesk'))).toBe('divoka_magie');
    expect(spellBranch(sp('Rychlost'))).toBe('vitalni_magie');
    expect(spellBranch(sp('Magická zbroj'))).toBe('ochranna_magie');
  });
});

describe('kouzla a přestup (✔ U 1. 10. 2026)', () => {
  it('zná jen naučená kouzla – obor kouzlo navíc nedává', () => {
    const c = wizard(2);
    c.progression.learnedBranches.push('divoka_magie');
    expect(knownWizardSpells(c).map((s) => s.nazev)).toEqual(['Blesk', 'Magický štít', 'Rychlost']);
    expect(knownSpells(c).map((s) => s.n)).toEqual(['Blesk', 'Magický štít', 'Rychlost', 'Kouzelnický trik']);
  });
  it('nabídka přestupu: obecná + obor (i právě zvolený); PPP04 až od 6. úrovně a se specializací', () => {
    const c = wizard(4);
    const st = pick(c, { pick: { kind: 'branch', id: 'ochranna_magie' } });
    const pool = itemPool(c, st);
    expect(pool.find((p) => p.name === 'Magická zbroj')).toMatchObject({ group: 'Ochranná magie', fresh: true });
    expect(pool.some((p) => p.name === 'Malé ochranné kouzlo')).toBe(false); // PPP04 až od 6. úr.
    const c6 = wizard(5);
    c6.progression.learnedBranches.push('ochranna_magie', 'divoka_magie');
    const pool6 = itemPool(c6, pick(c6, { pick: { kind: 'ability', id: 'koncentrace_many' } }));
    expect(pool6.find((p) => p.name === 'Malé ochranné kouzlo')?.group).toBe('Ochranná magie – pro pokročilé (PPP04)');
    expect(pool6.some((p) => p.name === 'Kamenná kůže')).toBe(false); // jen Bojový mág
    const withSpec = itemPool(c6, pick(c6, { pick: { kind: 'ability', id: 'koncentrace_many' }, spec: 'bojovy_mag' }));
    expect(withSpec.find((p) => p.name === 'Kamenná kůže')?.group).toBe('Ochranná magie – Bojový mág (PPP04)');
  });
  it('Hibernace jen Nekromant; Pokročilá reanimace jen ze Sběratele duší (nad rámec slotů)', () => {
    const c = wizard(8);
    c.progression.learnedBranches.push('vitalni_magie', 'magie_promen');
    expect(learnLock(sp('Hibernace'), wizardCtx(c))).toMatch(/Nekromant/);
    c.progression.specialization = 'nekromant';
    expect(learnLock(sp('Hibernace'), wizardCtx(c))).toBe('');
    expect(itemPool(c, emptyLevelUp()).some((p) => p.name === 'Pokročilá reanimace')).toBe(false);
    learn(c, 'sberatel_dusi');
    expect(knownWizardSpells(c).map((s) => s.nazev)).toContain('Pokročilá reanimace');
  });
  it('schopnosti: PPP04 od 6. úrovně, specializační jen se specializací; specializace podle dvou oborů', () => {
    const c = wizard(4);
    const o = (x: Character, id: string) => options(x).find((a) => a.id === id)!;
    expect(o(c, 'precizni_kouzleni').disabled).toBe('od 6. úrovně');
    expect(o(c, 'rychle_kouzleni').disabled).toBeNull();
    const c5 = wizard(5);
    c5.progression.learnedBranches.push('divoka_magie');
    const st = pick(c5, { pick: { kind: 'branch', id: 'ochranna_magie' } });
    expect(specOptions(c5, st).find((s) => s.id === 'bojovy_mag')!.disabled).toBeNull();
    expect(autoGains(c5, { ...st, spec: 'bojovy_mag' })).toEqual(expect.arrayContaining([expect.stringMatching(/Zbraň Bojového mága/), expect.stringMatching(/Kouzelníkova hůl/)]));
  });
  it('Magistr magického oboru: jen ovládaný obor, +3 kouzla oboru navíc a +5 k sesílání', () => {
    const c = wizard(6);
    expect(options(c).find((a) => a.id === 'magistr_magickeho_oboru')!.disabled).toBe('nejdřív obor magie');
    c.progression.learnedBranches.push('divoka_magie');
    const st = pick(c, { pick: { kind: 'ability', id: 'magistr_magickeho_oboru' }, pickParams: { obor: 'divoka_magie' } });
    expect(pickParam(c, st)!.options.map((x) => x.id)).toEqual(['divoka_magie']);
    expect(itemsBreakdown(c, st).total).toBe(5);
    const two = { ...st, items: ['Levitace', 'Teleport', 'Kukátko', 'Oheň', 'Beranidlo'] };
    expect(magisterWhy(c, two)).toMatch(/aspoň 3/);
    expect(canNext(c, two, 'polozky')).toBe(false);
    const ok = { ...st, items: ['Oheň', 'Beranidlo', 'Mrazivá střela', 'Bleskový šíp', 'Teleport'] };
    expect(canNext(c, ok, 'polozky')).toBe(true);
    const after = applyLevelUp(c, ok);
    expect(castProfile(after, null, sp('Oheň')).bonusParts).toContain('Magistr – Divoká magie +5');
    expect(castProfile(after, null, sp('Teleport')).bonus).toBe(0);
  });
});

describe('mana, meditace, nasátí, Rituál krve', () => {
  it('meditace 1× denně jen Svěží; Vládce many přidá maximum až do stropu ×1,5', () => {
    const c = wizard(3);
    const d = derive(c);
    const max = d.manaMax.value!;
    c.vitals.manaCurrent = 2;
    const m = meditate(c, d);
    expect(m.vitals.manaCurrent).toBe(max);
    expect(meditate(m, derive(m))).toBe(m); // podruhé ne
    const v = learn(wizard(12), 'vladce_many');
    const dv = derive(v);
    v.vitals.manaCurrent = 10;
    expect(manaCap(v, 65)).toBe(98); // příklad PPP04 s. 208
    expect(meditate(v, dv).vitals.manaCurrent).toBe(Math.min(10 + dv.manaMax.value!, manaCap(v, dv.manaMax.value)!));
    const nd = newDay(m);
    expect(nd.classState.kouzelnik!.meditatedToday).toBe(false);
  });
  it('nasátí: max. úroveň× denně, +1k6 do maxima; Citlivost na vichry many = 6', () => {
    const c = wizard(1);
    c.vitals.manaCurrent = 0;
    const r = drawMana(c, derive(c), () => 4);
    expect(r.gain).toBe(Math.min(4, derive(c).manaMax.value!));
    expect(drawMana(r.character, derive(r.character), () => 4).gain).toBe(0); // 1. úroveň = 1× denně
    const s = learn(wizard(6), 'citlivost_na_vichry_many');
    s.vitals.manaCurrent = 0;
    expect(drawMana(s, derive(s), () => 1).gain).toBe(6);
  });
  it('Rituál krve 2 : 1, s dýkou (Krev v manu) 1 : 1 a nejvýš 3', () => {
    const c = learn(wizard(6), 'ritual_krve');
    c.vitals.manaCurrent = 0;
    const hp = c.vitals.hpCurrent;
    const r = bloodRitual(c, derive(c), 3);
    expect([r.vitals.hpCurrent, r.vitals.manaCurrent]).toEqual([hp - 6, 3]);
    c.progression.specialization = 'nekromant';
    const k = makeStaff(c, 'dyka', null);
    const r2 = bloodRitual(k, derive(k), 3, true);
    expect([r2.vitals.hpCurrent, r2.vitals.manaCurrent]).toEqual([hp - 3, 3]);
    expect(bloodRitual(k, derive(k), 4, true)).toBe(k);
  });
});

describe('hůl (PPP04 s. 192)', () => {
  it('až od 6. úrovně; +1 k oboru; mana 2× úroveň (Čarodějova hůl 3× a +2); dýka ukládá životy', () => {
    expect(makeStaff(wizard(5), 'hul', 'divoka_magie').classState.kouzelnik!.staff.owned).toBe(false);
    const c = makeStaff(wizard(6), 'hul', 'divoka_magie');
    expect(c.vitals.manaCurrent).toBe(0); // rituál vyčerpá manu
    expect(staffCapacity(c)).toBe(12);
    expect(castProfile(c, null, sp('Blesk')).bonusParts).toContain('Kouzelníkova hůl (Divoká magie) +1');
    c.vitals.manaCurrent = 20;
    expect(storeMana(c, 50).classState.kouzelnik!.staff.mana).toBe(12);
    const ca = wizard(6);
    ca.progression.specialization = 'carodej';
    const h = makeStaff(ca, 'carodej', null);
    expect(staffCapacity(h)).toBe(18);
    expect(castProfile(h, null, sp('Blesk')).bonus).toBe(2);
    expect(makeStaff(wizard(6), 'carodej', null).classState.kouzelnik!.staff.owned).toBe(false); // jen Čaroděj
    const n = wizard(6);
    n.progression.specialization = 'nekromant';
    n.vitals.hpCurrent = 40;
    const dy = storeLife(makeStaff(n, 'dyka', null), 30);
    expect([dy.classState.kouzelnik!.staff.life, dy.vitals.hpCurrent]).toEqual([12, 16]); // nejvýš 2× úroveň
  });
});

describe('sesílání: postihy a bonusy (H11, PPP04)', () => {
  it('Rychlé kouzlení: ½ vyvolání (nejméně krátká), +3; Precizní 2× a +5; nejdou spojit', () => {
    const c = learn(wizard(6), 'rychle_kouzleni', 'precizni_kouzleni');
    expect(castProfile(c, null, sp('Rychlost')).len).toBe('D');
    const q = setMods(c, { quick: true });
    expect(castProfile(q, null, sp('Rychlost'))).toMatchObject({ len: 'K', dc: 9 });
    expect(castProfile(q, null, sp('Magický štít')).len).toBe('K'); // krátká zůstane krátká
    const p = setMods(c, { precise: true });
    expect(castProfile(p, null, sp('Magický štít'))).toMatchObject({ len: 'D', bonus: 5 });
    expect(castProfile(setMods(c, { quick: true, precise: true }), null, sp('Blesk')).why).toMatch(/nejde spojit/);
  });
  it('bez řeči a gest −5 (Utajené −2), zbroj při gestech −kvalita, róba +bonus, vyrušení +5', () => {
    const c = wizard(6);
    c.equipment.armor = { itemId: 'zbroj_krouzkova', custom: null, equipped: true, weightLb: null };
    const d = derive(c);
    expect(d.armor?.category).toBe('Střední');
    expect(castProfile(c, d, sp('Blesk')).bonus).toBe(-4);
    const quiet = setMods(c, { noGesture: true });
    expect(castProfile(quiet, d, sp('Blesk')).bonus).toBe(-5);
    const hush = learn(setMods(c, { noGesture: true, noVoice: true }), 'utajene_kouzleni');
    expect(castProfile(hush, d, sp('Blesk')).bonus).toBe(-4);
    expect(castProfile(setMods(c, { interrupted: true }), d, sp('Blesk')).dc).toBe(sp('Blesk').obtiznost.base! + 5);
    const robe = wizard(6);
    robe.equipment.armor = { itemId: 'roba_roba', custom: null, equipped: true, weightLb: null };
    const dr = derive(robe);
    expect(castProfile(robe, dr, sp('Blesk')).bonus).toBe(dr.armor!.magicBonus);
  });
  it('Posílená ochrana −3 many u ochranných; Hromadné sesílání cena × cíle a +2 za cíl; Posilování +¼ a +1', () => {
    const b = learn(wizard(6), 'posilena_ochrana');
    expect(castProfile(b, null, sp('Magický štít')).cost(10)).toBe(7);
    expect(castProfile(b, null, sp('Magický štít')).cost(2)).toBe(1);
    const h = learn(setMods(wizard(6), { targets: 3 }), 'hromadne_sesilani');
    const neviditelnost = castProfile(h, null, sp('Neviditelnost'));
    expect(neviditelnost.cost(6)).toBe(18); // příklad PPP04 s. 206
    expect(neviditelnost.dc).toBe(sp('Neviditelnost').obtiznost.base! + 4);
    const p = learn(setMods(wizard(6), { boostRange: true }), 'posilovani_kouzel');
    expect(castProfile(p, null, sp('Blesk')).cost(8)).toBe(10);
  });
  it('Kouzlení z knih: neznámé kouzlo 2× déle, +3 za cizí obor', () => {
    const c = learn(wizard(3), 'kouzleni_z_knih');
    c.play.combat = null;
    const p = castProfile(c, null, sp('Ohnivá koule'), c.classState.kouzelnik!.mods, { book: true });
    expect(p.dc).toBe(sp('Ohnivá koule').obtiznost.base! + 3);
    const r = castOutside(c, derive(c), sp('Ohnivá koule'), 4, 5, true);
    expect(r?.dc).toBe(p.dc);
  });
  it('Magický štít a Magická zbroj na sebe do ZO, Rychlost = krátká akce, útok a obrana navíc', () => {
    const c = wizard(4, ['Magický štít', 'Rychlost', 'Blesk']);
    c.progression.learnedItems.push('Magická zbroj');
    c.vitals.manaCurrent = 40;
    const zo = derive(c).defenseBase.value;
    const r = castOutside(c, derive(c), sp('Magická zbroj'), 8, 0)!;
    expect(derive(r.character).defenseBase.value).toBe(zo + 2);
    let f = startCombat(r.character, false);
    f = myTurn(f);
    const shield = knownSpells(f).find((s) => s.n === 'Magický štít')!;
    f = castSpell(f, derive(f), shield, 4).character; // 2 kola
    expect(derive(f).defenseBase.value).toBe(zo + 7);
    f = newRound(f).character; // 2. kolo – ještě působí
    f = newRound(f).character; // 3. kolo – ještě působí (od kola po seslání)
    expect(derive(f).defenseBase.value).toBe(zo + 7);
    f = newRound(f).character; // 4. kolo – skončilo
    expect(derive(f).defenseBase.value).toBe(zo + 2);
    f = myTurn(f);
    const haste = knownSpells(f).find((s) => s.n === 'Rychlost')!;
    f = castSpell(f, derive(f), haste, 6).character; // dlouhá akce, 2 kola
    f = myTurn(newRound(f).character);
    expect(turnCtx(f, derive(f)).free).toBe(3);
    expect(roundInfo(f, derive(f)).atk.n).toBe(2);
    f = attack(f, derive(f));
    expect(attackWhy(f, derive(f))).toBe('');
  });
});

describe('kouzelník v boji (PPP04)', () => {
  it('Bojové sesílání: půlkolové kouzlo nezabere akci, při dlouhém se dá bránit', () => {
    const c = learn(wizard(6, ['Blesk', 'Magický štít', 'Rychlost']), 'bojove_sesilani');
    let f = myTurn(startCombat(c, false));
    const blesk = knownSpells(f).find((s) => s.n === 'Blesk')!;
    f = castSpell(f, derive(f), blesk, 2).character;
    expect(turnCtx(f, derive(f)).free).toBe(2);
    let g = myTurn(startCombat(c, false));
    g = castSpell(g, derive(g), knownSpells(g).find((s) => s.n === 'Rychlost')!, 3).character;
    expect(canDefend(g, derive(g))).toBe('');
    g = takeDefense(g, derive(g));
    expect(g.play.combat!.defense).toBe(true);
  });
  it('Magická dominance: 3 many za k6, 1× za kolo; Mentální souboj dlouhá akce za 2 many', () => {
    const c = learn(wizard(6), 'magicka_dominance', 'mentalni_souboj');
    const f = myTurn(startCombat(c, false));
    const r = dominance(f, 2, 'útok', () => 6);
    expect([r.sum, r.character.vitals.manaCurrent]).toEqual([12, 14]);
    expect(dominance(r.character, 1, 'obrana').faces).toEqual([]);
    const m = mentalDuel(f, derive(f));
    expect([m.vitals.manaCurrent, m.play.combat!.k]).toEqual([18, 2]);
  });
  it('ověření kouzla v boji zahrnuje hůl a Magistra; spellWhy hlídá manu včetně hole', () => {
    const c = makeStaff(wizard(6), 'hul', 'divoka_magie');
    c.vitals.manaCurrent = 1;
    const f = myTurn(startCombat(storeMana({ ...c, vitals: { ...c.vitals, manaCurrent: 10 } }, 10), false));
    const blesk = knownSpells(f).find((s) => s.n === 'Blesk')!;
    expect(spellWhy(f, derive(f), blesk, 4)).toMatch(/chybí/);
    const g = setMods(f, { fromStaff: true });
    expect(spellWhy(g, derive(g), blesk, 4)).toBe('');
    const after = castSpell(g, derive(g), blesk, 4).character;
    expect(after.classState.kouzelnik!.staff.mana).toBe(6);
    expect(spellCheck(g, derive(g), blesk).parts).toContain('Kouzelníkova hůl (Divoká magie) +1');
  });
  it('Záměna kouzel: nejvýš úroveň× mezi přestupy, jen za kouzlo, které se smí naučit', () => {
    const c = learn(wizard(6), 'zamena_kouzel');
    expect(swapsLeft(c)).toBe(6);
    expect(swapWhy(c, 'Blesk', sp('Ohnivá koule'))).toMatch(/Divoká magie/);
    const s = swapSpell(c, 'Blesk', sp('Světlo'));
    expect(s.progression.learnedItems).toEqual(['Světlo', 'Magický štít', 'Rychlost']);
    expect(swapsLeft(s)).toBe(5);
  });
});
