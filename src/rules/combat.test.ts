import { describe, expect, it } from 'vitest';
import { newCharacter } from '../model/defaults';
import { sampleKloi } from '../model/sample';
import type { Character } from '../model/types';
import {
  applyTrick, bleedStacks, canDefend, castSpell, changeHp, combatMods, continueChannel, doAction, endTurn, healBy, hpState,
  knownSpells, knownTricks, newRound, recover, rest, setBleed, sleep, spellCost, startCombat, takeDefense, toggleCondition,
  turnActions, turnCtx, turnEffects, undoAction, undoPlay, whyNot, myTurn,
} from './combat';
import { derive } from './derive';
import { rollDice } from './dice';

const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };
const fighting = (c: Character) => myTurn(startCombat(c, false));

describe('životy (H17)', () => {
  it('mez vyřazení 0, hranice smrti, těžce zraněná pod třetinou', () => {
    const c = sampleKloi(); // max 14? (tabulka, 3. úr., ODO 12), hranice −11
    const d = derive(c);
    const at = (hp: number) => hpState({ ...c, vitals: { ...c.vitals, hpCurrent: hp } }, d);
    expect(at(d.hpMax.value)).toBe('ok');
    expect(at(1)).toBe('badly');
    expect(at(0)).toBe('out');
    expect(at(d.deathThreshold.value)).toBe('out');
    expect(at(d.deathThreshold.value - 1)).toBe('dead');
  });
  it('léčení nepřekročí maximum, zranění jde pod nulu, vše jde vrátit', () => {
    let c = sampleKloi();
    const d = derive(c);
    c = changeHp(c, d, 50);
    expect(c.vitals.hpCurrent).toBe(d.hpMax.value);
    c = changeHp(c, d, -30);
    expect(c.vitals.hpCurrent).toBe(d.hpMax.value - 30);
    expect(c.play.log[0].text).toBe('Životy −30');
    c = undoPlay(c);
    expect(c.vitals.hpCurrent).toBe(d.hpMax.value);
    expect(c.play.log).toHaveLength(1);
  });
  it('odpočinek, spánek, zotavení; Houževnatost barbara +2', () => {
    let c = sampleKloi();
    const d = derive(c);
    c = { ...c, vitals: { ...c.vitals, hpCurrent: 2, fatigueLevel: 3 } };
    c = rest(c, d);
    expect([c.vitals.hpCurrent, c.vitals.fatigueLevel]).toEqual([3, 2]);
    expect(recover(c, d)).toBe(c); // jen svěží
    c = sleep(c, d);
    expect([c.vitals.hpCurrent, c.vitals.fatigueLevel]).toEqual([5, 0]);
    c = recover(c, d);
    expect(c.vitals.hpCurrent).toBe(5 + Math.ceil(d.hpMax.value / 5));
    const b = { ...sampleKloi(), basic: { ...sampleKloi().basic, raceId: 'barbar' as const } };
    const bb = healBy({ ...b, vitals: { ...b.vitals, hpCurrent: 1 } }, derive(b), 3, 'První pomoc');
    expect(bb.vitals.hpCurrent).toBe(6);
    expect(bb.play.log[0].text).toContain('Houževnatost');
  });
  it('spánek: základní efekt i ve zbroji, hodnoty jde upravit podle PJ', () => {
    let c = sampleKloi();
    c = { ...c, equipment: { ...c.equipment, armor: { itemId: 'zbroj_krouzkova', custom: null, equipped: true, weightLb: null } }, vitals: { ...c.vitals, hpCurrent: 1, fatigueLevel: 3 } };
    const d = derive(c);
    const base = sleep(c, d);
    expect([base.vitals.hpCurrent, base.vitals.fatigueLevel]).toEqual([3, 0]);
    const pj = sleep(c, d, 1, 2);
    expect([pj.vitals.hpCurrent, pj.vitals.fatigueLevel]).toEqual([2, 1]);
    expect(pj.play.log[0].text).toContain('upraveno podle PJ');
  });
});

describe('stavy a postihy (H16)', () => {
  it('únava, stavy a přesila se připočtou do hodů', () => {
    let c = newCharacter();
    c = { ...c, vitals: { ...c.vitals, fatigueLevel: 2 } };
    c = toggleCondition(c, 'oslabeni');
    c = startCombat(c, false);
    c = { ...c, play: { ...c.play, combat: { ...c.play.combat!, foes: 5 } } };
    const m = combatMods(c);
    expect([m.atk, m.def, m.zo, m.init, m.chk]).toEqual([-9, -12, -5, -4, -4]);
  });
  it('stavy na 3 kola se odpočítají, krvácení se sčítá', () => {
    let c = startCombat(newCharacter(), false);
    c = toggleCondition(c, 'omameni');
    c = setBleed(c, 2);
    expect(bleedStacks(c)).toBe(2);
    for (let i = 0; i < 2; i++) c = newRound(c).character;
    expect(c.vitals.conditions.find((k) => k.id === 'omameni')?.rounds).toBe(1);
    const r = newRound(c);
    expect(r.ended).toEqual(['Omámení']);
    expect(r.character.vitals.conditions.map((k) => k.id)).toEqual(['krvaceni']);
  });
  it('efekty na začátku tahu: krvácení ×2 + zapálení, v bezvědomí nejvýš 2', () => {
    let c = toggleCondition(setBleed(newCharacter(), 2), 'zapaleni');
    c = { ...c, vitals: { ...c.vitals, hpCurrent: 20 } };
    const r = turnEffects(c, seq(3, 4, 5));
    expect(r.lost).toBe(12);
    expect(r.character.vitals.hpCurrent).toBe(8);
    const out = turnEffects({ ...c, vitals: { ...c.vitals, hpCurrent: 0 } }, seq(6, 6, 6));
    expect(out.lost).toBe(2);
  });
  it('válečník: konec tahu +1 adrenalin, otřesení skončí', () => {
    let c = newCharacter();
    c = toggleCondition(fighting(c), 'otreseni');
    const r = endTurn(c);
    expect(r.character.vitals.manaCurrent).toBe(c.vitals.manaCurrent + 1);
    expect(r.character.vitals.conditions).toHaveLength(0);
  });
});

describe('akce v tahu (1 dlouhá NEBO 2 krátké + okamžité)', () => {
  it('útok 1× za tah, obrana bere krátkou akci, dlouhá jen s celým tahem', () => {
    let c = fighting(newCharacter());
    let d = derive(c);
    c = doAction(c, d, 'utok', 'K');
    d = derive(c);
    const x = turnCtx(c, d);
    const acts = turnActions(c, d, x);
    const utok = acts.find((a) => a.k === 'utok')!;
    const sprint = acts.find((a) => a.k === 'sprint')!;
    expect(whyNot(c, utok, 'K', x)).toBe('už v tomto tahu');
    expect(whyNot(c, sprint, 'D', x)).toBe('už jsi použil krátkou');
    expect(canDefend(c, d)).toBe('');
    c = takeDefense(c, d);
    expect(c.play.combat!.k).toBe(2);
    expect(canDefend(c, derive(c))).toMatch(/už v tomto kole/);
    const x2 = turnCtx(c, derive(c));
    expect(whyNot(c, acts.find((a) => a.k === 'postup')!, 'K', x2)).toBe('nemáš krátkou akci');
    c = undoAction(c);
    expect(c.play.combat!.attack).toBe(false);
  });
  it('povalení: vztyk je dlouhá akce a stav skončí', () => {
    let c = toggleCondition(fighting(newCharacter()), 'povaleni');
    const d = derive(c);
    const x = turnCtx(c, d);
    const vztyk = turnActions(c, d, x).find((a) => a.k === 'vztyk')!;
    expect(whyNot(c, vztyk, 'K', x)).toMatch(/dlouhá/);
    c = doAction(c, d, 'vztyk', 'D');
    expect(c.vitals.conditions).toHaveLength(0);
  });
  it('sprint blokuje únava i zmrzačená noha; překvapení v 1. kole', () => {
    let c = fighting(newCharacter());
    c = { ...c, vitals: { ...c.vitals, fatigueLevel: 2 } };
    const d = derive(c);
    const x = turnCtx(c, d);
    expect(whyNot(c, turnActions(c, d, x).find((a) => a.k === 'sprint')!, 'D', x)).toBe('únava');
    const s = myTurn(startCombat(newCharacter(), true));
    expect(canDefend(s, derive(s))).toMatch(/překvapen/);
  });
});

describe('kouzla a triky (výřez – Fáze 7 doplní)', () => {
  it('kouzelník: známá kouzla, cena, sesílání přes víc kol', () => {
    let c = newCharacter();
    c = { ...c, basic: { ...c.basic, classId: 'kouzelnik' }, progression: { ...c.progression, learnedItems: ['Blesk', 'Teleport', 'Kukátko'] }, vitals: { ...c.vitals, manaCurrent: 10 } };
    const names = knownSpells(c).map((s) => s.n);
    expect(names).toEqual(expect.arrayContaining(['Kouzelnický trik', 'Blesk', 'Teleport', 'Kukátko']));
    expect(names).toHaveLength(4);
    const blesk = knownSpells(c).find((s) => s.n === 'Blesk')!;
    expect(spellCost(blesk, 1)).toEqual({ v: 2, variable: true });
    c = fighting(c);
    const r = castSpell(c, derive(c), blesk, 2);
    expect(r.rollNow).toBe(true);
    expect(r.character.vitals.manaCurrent).toBe(8);
    expect(r.character.play.combat!.cast).toBe(true);
  });
  it('klerik od 2. úrovně a hraničář ze směru magie', () => {
    let k = newCharacter();
    k = { ...k, basic: { ...k.basic, classId: 'klerik' }, progression: { ...k.progression, level: 2 } };
    expect(knownSpells(k).map((s) => s.n)).toEqual(expect.arrayContaining(['Léčivé slovo', 'Požehnání zdaru']));
    // Svěcení je rituál mimo boj (záložka Klerik, 7d), v boji se nenabízí.
    expect(knownSpells(k).map((s) => s.n)).not.toContain('Svěcení');
    let h = newCharacter();
    h = { ...h, basic: { ...h.basic, classId: 'hranicar' }, progression: { ...h.progression, learnedBranches: ['magie_prirody'] } };
    expect(knownSpells(h).map((s) => s.n)).toEqual(expect.arrayContaining(['Najdi vodu', 'Uzdrav lehká zranění']));
  });
  it('kouzlo na víc dlouhých akcí a trik válečníka', () => {
    let c = newCharacter();
    c = { ...c, basic: { ...c.basic, classId: 'kouzelnik' }, progression: { ...c.progression, learnedItems: ['Bertoldův zámek'] }, vitals: { ...c.vitals, manaCurrent: 5 } };
    c = fighting(c);
    const s = knownSpells(c).find((q) => q.n === 'Bertoldův zámek')!;
    c = castSpell(c, derive(c), s, 1).character;
    expect(c.play.combat!.channel).toEqual({ n: 'Bertoldův zámek', left: 1 });
    c = myTurn(newRound(c).character);
    const r = continueChannel(c);
    expect(r.done).toBe(true);
    let w = newCharacter();
    w = { ...w, progression: { ...w.progression, learnedItems: ['Zuřivý útok'] }, vitals: { ...w.vitals, manaCurrent: 3 } };
    w = fighting(w);
    const t = knownTricks(w)[0];
    const u = applyTrick(w, derive(w), t);
    expect(u.character.vitals.manaCurrent).toBe(1);
    expect(u.character.play.combat!.focusTrick).toBe(true);
  });
});

describe('kostky', () => {
  it('k6 ⟳6 přehazuje šestky a hlásí kritický útok', () => {
    const r = rollDice('k6x', 5, 'Útok – meč', true, seq(6, 6, 2));
    expect([r.base, r.total, r.sixes, r.tone]).toEqual([14, 19, 2, 'ok']);
    expect(r.info).toMatch(/KRITICKÝ ÚTOK/);
    const o = rollDice('k6x', 3, 'Obrana – štít', true, seq(6, 6, 1));
    expect(o.info).toMatch(/KRITICKÁ OBRANA/);
  });
  it('k10 ověření s druhou k10 a Fate', () => {
    expect(rollDice('k10', 2, '', true, seq(10, 4)).tone).toBe('ok');
    expect(rollDice('k10', 2, '', true, seq(1, 3)).tone).toBe('bad');
    expect(rollDice('k10', 2, '', false, seq(1, 3)).faces).toHaveLength(1);
    expect(rollDice('4dF', 0, '', true, seq(1, 3, 2, 3)).total).toBe(1);
  });
});
