// 7b.2 – boj válečníka: útoky a obrany za kolo, boj dvěma zbraněmi, Nával adrenalinu, Vražedná zuřivost,
// Cesta krve, Sebeobětování, Cesta strategie, Velení a Bojové rozkazy (H08, PPP01).
import { describe, expect, it } from 'vitest';
import { buildCharacter, newDraft } from '../creation/draft';
import type { Character } from '../model/types';
import {
  applyTrick, attack, attackWhy, bloodRush, bloodWound, canDefend, combatMods, declareStrategy, doAction, endTurn, furyCheck, giveOrder,
  hpState, myTurn, newRound, payDeathDelay, roundInfo, setCommand, shieldBash, startCombat, startFury, strategyWhy, takeDefense,
  trickWhy, undoAction,
} from './combat';
import { derive } from './derive';
import { dualWieldWhy, getTrick, weaponInfo } from './valecnik';
import { getWeapon } from './data';

const warrior = (level = 1): Character => {
  const c = buildCharacter({ ...newDraft(), name: 'Baldur', raceId: 'clovek', classId: 'valecnik', method: 'points', points: { sil: 6, obr: 4, odo: 5, int: 3, char: 2 }, picks: ['Rychlý úder', 'Zuřivý útok'], choice: 0 });
  c.progression.level = level;
  c.equipment.weapons = [];
  c.equipment.shield = { itemId: null, custom: null, equipped: false, weightLb: null };
  c.equipment.armor = { itemId: null, custom: null, equipped: false, weightLb: null };
  c.equipment.activeWeaponUid = null;
  c.vitals.manaCurrent = 0;
  return c;
};
const arm = (c: Character, itemId: string, active = true) => {
  c.equipment.weapons = [...c.equipment.weapons, { uid: itemId, itemId, custom: null, grip: 'one-handed', equipped: true, weightLb: null }];
  if (active) c.equipment.activeWeaponUid = itemId;
  return c;
};
const learn = (c: Character, ...ids: string[]) => { c.progression.learnedAbilities.push(...ids.map((id) => ({ id }))); return c; };
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };
const inTurn = (c: Character) => myTurn(startCombat(c, false));
const nextTurn = (c: Character) => myTurn(newRound(endTurn(c).character).character);

describe('útoky a obrany za kolo (7b.2)', () => {
  it('Vícenásobný útok: pod 6. úrovní cooldown (útok i obrana navíc, po použití kolo nic), od 6. úrovně 2 každé kolo; jen tváří v tvář', () => {
    const c = arm(learn(warrior(4), 'vicenasobny_utok'), 'jednorucni_savle');
    let x = inTurn(c);
    let d = derive(x);
    expect(roundInfo(x, d).atk.n).toBe(2);
    expect(roundInfo(x, d).def.n).toBe(2);
    x = attack(attack(x, d), d); // 1. kolo dvakrát
    expect(x.play.combat!.war!.cd).toEqual({ vicenasobny_utok: 1 });
    x = nextTurn(x);
    d = derive(x);
    expect(roundInfo(x, d).atk.n).toBe(1); // 2. kolo jednou
    expect(roundInfo(x, d).def.n).toBe(1);
    x = nextTurn(x);
    expect(roundInfo(x, derive(x)).atk.n).toBe(2); // 3. kolo zase dvakrát
    // obrana navíc spotřebuje stejný cooldown
    let z = startCombat(c, false);
    const dz = derive(z);
    z = takeDefense(takeDefense(z, dz), dz);
    expect(z.play.combat!.war!.cd).toEqual({ vicenasobny_utok: 1 });
    const c6 = arm(learn(warrior(6), 'vicenasobny_utok'), 'jednorucni_savle');
    let y = inTurn(c6);
    y = attack(attack(y, derive(y)), derive(y));
    y = nextTurn(y);
    expect(roundInfo(y, derive(y)).atk).toMatchObject({ n: 2, parts: ['Vícenásobný útok +1'] });
    const bow = arm(learn(warrior(6), 'vicenasobny_utok'), 'strelne_kratky_luk');
    y = inTurn(bow);
    expect(roundInfo(y, derive(y)).atk.n).toBe(1);
  });
  it('první útok zabere krátkou akci, další jsou součástí téže akce; vrácení odečte útok', () => {
    const c = arm(learn(warrior(6), 'vicenasobny_utok', 'rychly_hrot'), 'jednorucni_rapir');
    let x = inTurn(c);
    const d = derive(x);
    expect(roundInfo(x, d).atk.n).toBe(3); // Vícenásobný útok + Rychlý hrot (bodná)
    x = attack(x, d);
    expect([x.play.combat!.k, x.play.combat!.atkUsed]).toEqual([1, 1]);
    x = attack(x, d);
    x = attack(x, d);
    expect([x.play.combat!.k, x.play.combat!.atkUsed]).toEqual([1, 3]);
    expect(attackWhy(x, d)).toBe('všech 3 útoků použito');
    x = undoAction(x);
    expect(x.play.combat!.atkUsed).toBe(2);
    expect(attackWhy(x, d)).toBe('');
    // trik s útokem spotřebuje jeden z útoků
    x = { ...x, vitals: { ...x.vitals, manaCurrent: 9 } };
    expect(trickWhy(x, d, getTrick('Výpad')!)).toBe('');
    x = applyTrick(x, d, getTrick('Výpad')!).character;
    expect(x.play.combat!.atkUsed).toBe(3);
    expect(trickWhy(x, d, getTrick('Výpad')!)).toBe('všech 3 útoků použito');
  });
  it('akce Útok z nabídky se počítá jako první útok', () => {
    const c = arm(learn(warrior(6), 'vicenasobny_utok'), 'jednorucni_savle');
    let x = inTurn(c);
    const d = derive(x);
    x = doAction(x, d, 'utok', 'K');
    expect(x.play.combat!.atkUsed).toBe(1);
    x = attack(x, d);
    expect([x.play.combat!.k, x.play.combat!.atkUsed]).toEqual([1, 2]);
  });
  it('obrany: druhá z Vícenásobného útoku bez další akce; Zakrytí se štítem proti jedinému protivníkovi bez omezení', () => {
    const c = arm(learn(warrior(6), 'vicenasobny_utok'), 'jednorucni_savle');
    let x = startCombat(c, false);
    const d = derive(x);
    x = takeDefense(x, d);
    x = takeDefense(x, d);
    expect([x.play.combat!.k, x.play.combat!.defUsed]).toEqual([1, 2]);
    expect(canDefend(x, d)).toBe('všech 2 obran v kole použito');
    const r = arm(learn(warrior(6), 'zakryti'), 'jednorucni_savle');
    r.equipment.shield = { itemId: 'stit_dreveny_stit', custom: null, equipped: true, weightLb: null };
    let y = startCombat(r, false);
    const dy = derive(y);
    for (let i = 0; i < 4; i++) y = takeDefense(y, dy);
    expect(y.play.combat!.defUsed).toBe(4);
    y = { ...y, play: { ...y.play, combat: { ...y.play.combat!, foes: 2 } } };
    expect(canDefend(y, derive(y))).toBe('obrana už v tomto kole použita');
  });
  it('obran je v kole stejně jako útoků (✔ U 30. 9. 2026): Rychlý hrot, Bijec i Zuřivost přidají i obranu; triky ne', () => {
    const c = arm(learn(warrior(6), 'vicenasobny_utok', 'rychly_hrot'), 'jednorucni_rapir');
    let x = startCombat(c, false);
    const d = derive(x);
    const r = roundInfo(x, d);
    expect([r.atk.n, r.def.n]).toEqual([3, 3]);
    for (let i = 0; i < 3; i++) x = takeDefense(x, d);
    expect([x.play.combat!.k, x.play.combat!.defUsed]).toEqual([1, 3]); // jedna krátká akce Obrana
    expect(canDefend(x, d)).toBe('všech 3 obran v kole použito');
    const b = learn(warrior(1), 'bijec'); // beze zbraně, pod 6. úrovní
    const y = startCombat(b, false);
    expect(roundInfo(y, derive(y)).def.n).toBe(2);
  });
  it('Bijec beze zbraně; Rychlá čepel, Přehmátnutí a Boj štítem = cooldown od kola použití (✔ U)', () => {
    let x = inTurn(learn(warrior(6), 'bijec'));
    expect(roundInfo(x, derive(x)).atk.parts).toEqual(['Bijec +1']);
    const m = arm(learn(warrior(12), 'cesta_mece', 'cesta_mece', 'cesta_mece'), 'jednorucni_savle');
    x = inTurn(m);
    let d = derive(x);
    expect(roundInfo(x, d).atk.parts).toEqual(['Rychlá čepel +1']); // hned v 1. kole
    x = attack(attack(x, d), d);
    expect(x.play.combat!.war!.cd).toEqual({ rychla_cepel: 1 });
    expect(roundInfo(x, d).atk.n).toBe(2); // v kole použití dál platí
    x = undoAction(x);
    expect(x.play.combat!.war!.cd).toEqual({});
    x = attack(x, d);
    x = nextTurn(x);
    d = derive(x);
    expect(roundInfo(x, d).atk).toMatchObject({ n: 1, parts: ['Rychlá čepel – znovu v 3. kole'] });
    x = nextTurn(x);
    expect(roundInfo(x, derive(x)).atk.n).toBe(2);
    // nepoužitá schopnost zůstává k dispozici i v dalším kole
    const k = arm(learn(warrior(15), 'cesta_hole_a_kopi', 'cesta_hole_a_kopi', 'cesta_hole_a_kopi', 'cesta_hole_a_kopi'), 'jednorucni_ostep');
    x = nextTurn(inTurn(k));
    expect(roundInfo(x, derive(x)).atk.parts).toEqual(['Přehmátnutí +1']);
    const s = arm(learn(warrior(6), 'boj_stitem'), 'jednorucni_savle');
    s.equipment.shield = { itemId: 'stit_zelezny_stit', custom: null, equipped: true, weightLb: null };
    x = inTurn(s);
    expect(roundInfo(x, derive(x)).bash).toBe(true);
    x = shieldBash(x, derive(x));
    expect(roundInfo(x, derive(x)).bash).toBe(false);
    x = nextTurn(x);
    expect(roundInfo(x, derive(x)).bash).toBe(false);
    x = nextTurn(x);
    expect(roundInfo(x, derive(x)).bash).toBe(true);
  });
});

describe('boj dvěma zbraněmi (Škola H08, Mistr PPP01)', () => {
  const info = (id: string) => weaponInfo(getWeapon(id), null);
  it('škola: jednoruční + lehká krátká; Mistr: těžká + lehká, střední + střední; obouruční nikdy', () => {
    const c = warrior(6);
    c.progression.learnedBranches = ['skola_boje_se_dvema_zbranemi'];
    expect(dualWieldWhy(c, info('jednorucni_savle'), info('jednorucni_dyka'), false)).toBe('');
    expect(dualWieldWhy(c, info('jednorucni_mec_bastard'), info('jednorucni_nuz'), false)).toBe('');
    expect(dualWieldWhy(c, info('jednorucni_savle'), info('jednorucni_sekera'), false)).toContain('lehká krátká');
    expect(dualWieldWhy(c, info('jednorucni_savle'), info('jednorucni_dyka'), true)).toBe('v ruce je štít');
    expect(dualWieldWhy(c, info('obourucni_katana'), info('jednorucni_dyka'), false)).toContain('obouruční');
    learn(c, 'mistr_boje_dvema_zbranemi');
    expect(dualWieldWhy(c, info('jednorucni_savle'), info('jednorucni_sekera'), false)).toBe('');
    expect(dualWieldWhy(c, info('jednorucni_mec_bastard'), info('jednorucni_kord'), false)).toBe('');
    expect(dualWieldWhy(c, info('jednorucni_mec_bastard'), info('jednorucni_savle'), false)).toContain('Mistr');
    expect(dualWieldWhy(warrior(6), info('jednorucni_savle'), info('jednorucni_dyka'), false)).toContain('Škola');
  });
  it('v deníku se útočnost, obrana i zranění obou zbraní sečtou ke zbrani v ruce', () => {
    const c = arm(arm(warrior(6), 'jednorucni_dyka', false), 'jednorucni_savle');
    c.progression.learnedBranches = ['skola_boje_se_dvema_zbranemi'];
    const before = derive(c);
    c.classState.valecnik = { combatStyle: null, grip: null, offhand: 'jednorucni_dyka' };
    const d = derive(c);
    expect(d.dual).toMatchObject({ ok: true, offName: 'Dýka' });
    expect(d.attackNumber.value).toBe(before.attackNumber.value + 3);
    expect(d.defenseNumber.value).toBe(before.defenseNumber.value + 1);
    const w = d.weapons.find((x) => x.uid === 'jednorucni_savle')!;
    expect(w.damageTotal).toBe(2 + 1);
    expect(w.bonusParts.at(-1)).toContain('Druhá zbraň – Dýka');
  });
});

describe('adrenalin a Berserkr (7b.2)', () => {
  it('Nával adrenalinu: +1 na začátku boje a každého kola, na konci tahu nic', () => {
    let x = inTurn(learn(warrior(6), 'naval_adrenalinu'));
    expect(x.vitals.manaCurrent).toBe(1);
    x = endTurn(x).character;
    expect(x.vitals.manaCurrent).toBe(1);
    x = newRound(x).character;
    expect(x.vitals.manaCurrent).toBe(2);
    let y = endTurn(inTurn(warrior(6))).character;
    expect(y.vitals.manaCurrent).toBe(1);
    y = newRound(y).character;
    expect(y.vitals.manaCurrent).toBe(1);
  });
  it('Vražedná zuřivost: přerod, pak +2 adrenalin, útok navíc a Hranice smrti −max; past Vůle vs. 2 (+1/kolo)', () => {
    const c = arm(learn(warrior(6), 'vrazedna_zurivost'), 'jednorucni_savle');
    let x = startFury(inTurn(c));
    let d = derive(x);
    expect(roundInfo(x, d).atk.n).toBe(1); // přerod
    expect(endTurn(x).character.vitals.manaCurrent).toBe(1);
    expect(startFury(x)).toBe(x); // 1× za boj
    x = nextTurn(x);
    d = derive(x);
    expect(roundInfo(x, d).atk.parts).toEqual(['Vražedná zuřivost +1']);
    expect(d.deathThreshold.value).toBe(-d.hpMax.value);
    x = endTurn(x).character;
    expect(x.vitals.manaCurrent).toBe(1 + 2);
    x = newRound(x).character;
    expect(x.play.combat!.war!.fury!.check).toBe(true);
    // neúspěch: výsledek nepřekoná past 2 → šílenství, zuřivost trvá
    const bad = furyCheck(x, derive(x), seq(1, 3));
    expect(bad.trap).toBe(2);
    expect(bad.freed).toBe(false);
    expect(bad.character.play.combat!.war!.fury).toMatchObject({ active: true, mad: true, check: false });
    // úspěch v dalším kole: past 3
    let y = newRound(endTurn(myTurn(bad.character)).character).character;
    const ok = furyCheck(y, derive(y), seq(9));
    expect([ok.trap, ok.freed]).toEqual([3, true]);
    y = ok.character;
    expect(derive(y).deathThreshold.value).toBeGreaterThan(-derive(y).hpMax.value);
    // pod Hranicí smrti po zuřivosti: odklad za adrenalin
    y = { ...y, vitals: { ...y.vitals, hpCurrent: -30, manaCurrent: 2 } };
    expect(hpState(y, derive(y))).toBe('dead');
    y = payDeathDelay(y);
    expect(hpState(y, derive(y))).toBe('dying');
    expect(y.vitals.manaCurrent).toBe(1);
  });
  it('Cesta krve: nabuzení 1k6 sobě = +adrenalin (dlouhá akce, 1× jen v 1. kole); zranění bez obrany +1k6 za načatých 10', () => {
    const c = learn(warrior(6), 'cesta_krve');
    const hp = c.vitals.hpCurrent;
    let x = startCombat(c, false);
    const pre = bloodRush(x, seq(4));
    expect(pre.character.vitals).toMatchObject({ hpCurrent: hp - 4, manaCurrent: 4 });
    expect(pre.character.play.combat!.k).toBe(0); // před bojem nic nestojí
    expect(bloodRush(pre.character, seq(4)).n).toBe(0);
    x = bloodRush(myTurn(x), seq(2)).character;
    expect(x.play.combat!.k).toBe(2);
    const w = bloodWound(x, 11, seq(3, 5));
    expect(w.gain).toBe(8);
    expect(w.character.vitals.hpCurrent).toBe(hp - 2 - 11);
  });
});

describe('Rytíř a Cesta strategie (7b.2)', () => {
  it('Sebeobětování: chybějící adrenalin za 2× životy, pak pauza tolik kol, kolik získal', () => {
    const c = arm(learn(warrior(6), 'sebeobetovani'), 'jednorucni_savle');
    c.progression.learnedItems.push('Série útoků');
    let x = inTurn(c);
    const hp = x.vitals.hpCurrent;
    const d = derive(x);
    const t = getTrick('Zuřivý útok')!; // 2 adrenalin
    expect(trickWhy(x, d, t)).toBe('');
    x = applyTrick(x, d, t).character;
    expect(x.vitals).toMatchObject({ manaCurrent: 0, hpCurrent: hp - 4 });
    expect(x.play.combat!.war!.sacrificeReady).toBe(4);
    expect(trickWhy(x, d, getTrick('Série útoků')!, 1)).toContain('až v 4. kole');
    expect(trickWhy(inTurn(arm(warrior(6), 'jednorucni_savle')), d, t)).toContain('málo adrenalinu');
  });
  it('strategie: před bojem hned, jinak dlouhá akce a od dalšího kola; 3 kola (Mistr 5); bonus = stupeň; 1× za souboj', () => {
    const c = learn(warrior(9), 'cesta_strategie', 'cesta_strategie');
    let x = startCombat(c, false);
    x = declareStrategy(x, 'utok');
    expect(combatMods(x)).toMatchObject({ atk: 2, init: 2 });
    expect(strategyWhy(x)).toContain('jen jednou');
    let y = myTurn(startCombat(c, false));
    y = declareStrategy(y, 'obrana');
    expect(y.play.combat!.k).toBe(2);
    expect(combatMods(y).def).toBe(0);
    y = nextTurn(y);
    expect(combatMods(y).def).toBe(2);
    y = nextTurn(nextTurn(nextTurn(y)));
    expect(combatMods(y).def).toBe(0); // kola 2–4
    expect(strategyWhy(startCombat(c, false), true)).toContain('IV. stupně');
  });
  it('Velení a Bojové rozkazy: rozkaz 1× za kolo, ne s Výkřikem; Boj s přesilou bez postihu', () => {
    const c = learn(warrior(6), 'veleni', 'bojove_rozkazy', 'boj_s_presilou');
    c.progression.learnedItems.push('Válečný pokřik');
    c.vitals.manaCurrent = 3;
    let x = inTurn(c);
    x = setCommand(x, 'utok');
    expect(x.play.log[0].text).toBe('Velení: útočný rozkaz +2 ÚČ');
    x = giveOrder(x, 'Udeř!');
    expect(x.play.combat!.war!.order).toBe('Udeř!');
    expect(giveOrder(x, 'Kryj se!')).toBe(x);
    expect(trickWhy(x, derive(x), getTrick('Válečný pokřik')!)).toBe('v tomto kole už zazněl bojový rozkaz');
    x = nextTurn(x);
    expect(x.play.combat!.war!.order).toBeNull();
    x = { ...x, play: { ...x.play, combat: { ...x.play.combat!, foes: 3 } } };
    expect(combatMods(x).def).toBe(0);
  });
});
