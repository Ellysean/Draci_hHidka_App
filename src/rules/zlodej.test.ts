// 7e – zloděj: data H12 + PPP05, umění a triky, schopnosti a specializace, bonusy ke zbraním, útoky za kolo, triky v boji,
// Výhodná pozice, jedy, výroba, Siccova síť, Důvěrník, migrace.
import { describe, expect, it } from 'vitest';
import { buildCharacter, newDraft } from '../creation/draft';
import { uid } from '../model/defaults';
import type { Character, WeaponEntry } from '../model/types';
import { PROGRESSION, applyLevelUp, autoGains, emptyLevelUp, specOptions } from '../progression/levelup';
import { migrate } from '../storage/migrations';
import { combatMods, myTurn, newRound, roundInfo, setCombat, startCombat } from './combat';
import { derive } from './derive';
import { rollDice } from './dice';
import { addCompanion, applyCompanionGrowth, companionView, companionStepWhy, statsFrom, speciesOf } from './pratele';
import {
  THIEF, THIEF_TRICKS, knownThiefTricks, positionReady, riskyWhy, thiefSkillBonus, trickByName, trickCombatWhy, zlo,
} from './zlodej';
import {
  addMember, applyPoison, craftGadget, craftTrap, makePoison, newDay, payMonth, positionAttack, regainPosition, risky, runAction, setThief, skipMonth,
  undoThief, useTrick, creative,
} from './zlodej-akce';

const thief = (level = 1): Character => {
  const c = buildCharacter({ ...newDraft(), name: 'Kvítko', raceId: 'clovek', classId: 'zlodej', method: 'points', points: { sil: 3, obr: 7, odo: 4, int: 3, char: 3 }, picks: [], choice: 0 });
  c.progression.level = level;
  c.equipment.weapons = [];
  c.equipment.shield = { itemId: null, custom: null, equipped: false, weightLb: null };
  c.equipment.armor = { itemId: null, custom: null, equipped: false, weightLb: null };
  c.equipment.activeWeaponUid = null;
  c.equipment.money = { gold: 500, silver: 0, copper: 0 };
  return c;
};
const learn = (c: Character, ...ids: string[]) => { c.progression.learnedAbilities.push(...ids.map((id) => ({ id }))); return c; };
const arm = (c: Character, itemId: string, active = true): string => {
  const w: WeaponEntry = { uid: uid(), itemId, custom: null, grip: 'one-handed', equipped: true, weightLb: null };
  c.equipment.weapons.push(w);
  if (active) c.equipment.activeWeaponUid = w.uid;
  return w.uid;
};
const row = (c: Character, uidW: string) => derive(c).weapons.find((w) => w.uid === uidW)!;
const fight = (c: Character) => myTurn(startCombat(c, false));

describe('data zloděje (H12 + PPP05)', () => {
  it('18 triků H12 (6 umění × 3), 31 triků PPP05, 42 schopností, 3 specializace', () => {
    expect(THIEF_TRICKS.filter((t) => t.zdroj === 'H12')).toHaveLength(18);
    expect(THIEF_TRICKS.filter((t) => t.zdroj === 'PPP05')).toHaveLength(31);
    expect(THIEF.umeni.map((u) => u.triky.length)).toEqual([3, 3, 3, 3, 3, 3]);
    expect(Object.keys(THIEF.schopnosti)).toHaveLength(42);
    expect(new Set(THIEF_TRICKS.map((t) => t.id)).size).toBe(THIEF_TRICKS.length);
    expect(THIEF_TRICKS.every((t) => t.popis.length > 40)).toBe(true);
    expect(Object.keys(THIEF.specializace)).toEqual(['assassin', 'lupic', 'sicco']);
  });
  it('triky v boji: druh použití a jednorázové', () => {
    expect(trickByName('Falešný útok')).toMatchObject({ boj: 'utok', once: true, skill: 'umeni_rvacu' });
    expect(trickByName('Omráčení')?.boj).toBe('misto');
    expect(trickByName('Flexibilita')).toMatchObject({ boj: 'obrana', fx: { def: 5, defFail: -5 } });
    expect(trickByName('Lezení')?.boj).toBeNull();
    expect(trickByName('Mimika')?.skill).toBe('umeni_promen');
    expect(trickByName('Manipulace')?.skill).toBe('presvedcovani');
  });
  it('blok v progression: umění s dovedností na 3. stupni, Mistrovství s triky, nová umění na 5. stupni, specializace podle H12', () => {
    const P = PROGRESSION.zlodej;
    expect(P.branches).toHaveLength(6);
    expect(P.branches.every((b) => b.grantsSkills?.[0].rank === 3 && b.items?.length === 3)).toBe(true);
    expect(P.abilities.find((a) => a.id === 'mistrovstvi_zlatky')).toMatchObject({ minLevel: 6, grantsItems: ['Handlování', 'Ukrytí předmětu'] });
    expect(P.abilities.find((a) => a.id === 'umeni_prepadu')).toMatchObject({ requiresSpecialization: 'assassin', grantsSkills: [{ id: 'umeni_prepadu', rank: 5 }] });
    expect(P.specializations.find((s) => s.id === 'lupic')?.requires).toEqual(['kocici_pohyb', 'boj_beze_zbrane']);
    expect(P.abilities.find((a) => a.id === 'lupicuv_partak')?.requiresSpecialization).toBe('lupic');
  });
});

describe('umění, triky a přestup', () => {
  it('triky dávají umění a schopnosti automaticky', () => {
    const c = thief(6);
    expect(knownThiefTricks(c)).toHaveLength(0);
    c.progression.learnedBranches.push('sarm');
    learn(c, 'mistrovstvi_zlatky');
    expect(knownThiefTricks(c).map((t) => t.n)).toEqual(['Odhad lidí', 'Odvedení pozornosti', 'Získání důvěry', 'Handlování', 'Ukrytí předmětu']);
  });
  it('Umění přepadů (Assassin) dá dovednost na 5. stupni a 3 triky; 6. úroveň dá Cech', () => {
    const c = thief(6);
    c.progression.specialization = 'assassin';
    const st = { ...emptyLevelUp(), pick: { kind: 'ability' as const, id: 'umeni_prepadu' } };
    expect(autoGains(c, st)[0]).toBe('dovednost Umění přepadů na 5. stupni');
    const x = applyLevelUp(c, st);
    expect(x.skills.find((s) => s.id === 'umeni_prepadu')).toMatchObject({ rank: 5, attribute: 'obr' });
    expect(knownThiefTricks(x).map((t) => t.n)).toEqual(['Hlavounova finta', 'Kontrolovaná trajektorie', 'Prohození pozic']);
    expect(autoGains(thief(5), emptyLevelUp()).some((g) => g.includes('Zlodějský cech'))).toBe(true);
  });
  it('specializace: podmínky H12 (Umění skrývání + Vrhání dýk)', () => {
    const c = thief(5);
    c.progression.learnedBranches.push('skryvani');
    const st = { ...emptyLevelUp(), pick: { kind: 'ability' as const, id: 'vrhani_dyk' } };
    expect(specOptions(c, st).find((o) => o.id === 'assassin')?.disabled).toBeNull();
    expect(specOptions(c, emptyLevelUp()).find((o) => o.id === 'assassin')?.disabled).toBe('splněno 1 z 2');
  });
  it('Mistrovství … +1 k dovednostem, Šestý smysl +3 Iniciativa, Mistr útěku +10, Alter ego +5 k CHAR', () => {
    const c = thief(6);
    const before = derive(c);
    learn(c, 'mistrovstvi_zlatky', 'sesty_smysl', 'mistr_uteku', 'alter_ego');
    const d = derive(c);
    expect(d.skills.find((s) => s.id === 'odhad_ceny')!.total).toBe(before.skills.find((s) => s.id === 'odhad_ceny')!.total + 1);
    expect(d.initiativeBonus.value).toBe(before.initiativeBonus.value + 3);
    expect(d.mobility.value).toBe(before.mobility.value + 10);
    const p0 = thiefSkillBonus(c, d, 'presvedcovani').bonus;
    const on = setThief(c, { alterEgo: true });
    expect(thiefSkillBonus(on, derive(on), 'presvedcovani').bonus).toBe(p0 + 5);
    expect(thiefSkillBonus(on, derive(on), 'vybirani_kapes').bonus).toBe(thiefSkillBonus(c, d, 'vybirani_kapes').bonus);
  });
});

describe('bonusy ke zbraním', () => {
  it('Boj beze zbraně +3 ÚČ/OČ jen bez zbraně a štítu', () => {
    const c = thief();
    const a = derive(c);
    learn(c, 'boj_beze_zbrane');
    const b = derive(c);
    expect(b.attackNumber.value).toBe(a.attackNumber.value + 3);
    expect(b.defenseNumber.value).toBe(a.defenseNumber.value + 3);
    const g = arm(c, 'jednorucni_okovane_rukavice');
    expect(row(c, g).bonusParts).toContain('Boj beze zbraně +3 ÚČ/OČ');
  });
  it('Vražedné ostří, Vražedné zbraně (Assassin), Citlivá místa', () => {
    const c = thief(6);
    learn(c, 'vrazedne_ostri', 'citliva_mista');
    const s = arm(c, 'assassin_dyka_uto');
    const plain = row(c, s);
    expect(plain.bonusParts).toEqual(['Vražedné ostří +2 ÚČ/OČ', 'Citlivá místa +3 Zranění']);
    c.progression.specialization = 'assassin';
    const r = row(c, s);
    expect(r.attackNumber).toBe(plain.attackNumber + 3);
    expect(r.damageTotal).toBe(3 + 3);
    // Krátký meč je lehká bodná zbraň (Vražedné ostří platí), Sochor lehká nebodná (jen Citlivá místa).
    expect(row(c, arm(c, 'jednorucni_kratky_mec', false)).bonusParts).toContain('Vražedné ostří +2 ÚČ/OČ');
    expect(row(c, arm(c, 'sochor', false)).bonusParts).toEqual(['Citlivá místa +3 Zranění']);
  });
  it('Zákeřná kuše +2 ÚČ a Zranění; Technika nabíjení – požadavek kuše na OBR', () => {
    const c = thief();
    c.attributes.sil = 8; c.attributes.obr = 16;
    const t = arm(c, 'strelne_tezka_kuse');
    expect(row(c, t).overloaded).toBe(true);
    learn(c, 'technika_nabijeni', 'zakerna_kuse');
    const r = row(c, t);
    expect(r.overloaded).toBe(false);
    expect(r.bonusParts).toContain('Zákeřná kuše +2 ÚČ a Zranění');
    expect(r.damageTotal).toBe(12);
  });
  it('Boj se dvěma zbraněmi: dýka + levouruční dýka se sčítají, krátký meč ve druhé ruce ne', () => {
    const c = thief(6);
    learn(c, 'boj_se_dvema_zbranemi');
    const a = arm(c, 'jednorucni_dyka');
    const b = arm(c, 'jednorucni_levourucni_dyka', false);
    const one = derive(c).attackNumber.value;
    const x = setThief(c, { offhand: b });
    expect(derive(x).dual).toMatchObject({ ok: true });
    expect(derive(x).attackNumber.value).toBe(one + 3);
    const m = arm(x, 'jednorucni_kratky_mec', false);
    expect(derive(setThief(x, { offhand: m })).dual?.ok).toBe(false);
    expect(a).toBeTruthy();
  });
});

describe('boj', () => {
  it('Vrhání dýk: 2-1-2 útoky a obrany, od 6. úrovně 2 útoky každé kolo', () => {
    const c = learn(thief(3), 'vrhani_dyk');
    arm(c, 'vrhaci_dyka');
    let f = fight(c);
    expect([roundInfo(f, derive(f)).atk.n, roundInfo(f, derive(f)).def.n]).toEqual([2, 2]);
    f = newRound(f).character;
    expect([roundInfo(f, derive(f)).atk.n, roundInfo(f, derive(f)).def.n]).toEqual([1, 1]);
    f.progression.level = 6;
    expect(roundInfo(f, derive(f)).atk.n).toBe(2);
  });
  it('Svižné ostří: 3 útoky za 2 kola s lehkou zbraní, od 12. úrovně 2 každé kolo', () => {
    const c = learn(thief(6), 'svizne_ostri');
    arm(c, 'jednorucni_dyka');
    let f = fight(c);
    expect(roundInfo(f, derive(f)).atk.n).toBe(2);
    f = newRound(f).character;
    expect(roundInfo(f, derive(f)).atk.n).toBe(1);
    f.progression.level = 12;
    expect(roundInfo(f, derive(f)).atk.n).toBe(2);
  });
  it('Riskantní útok: obrana za útok, 1× za kolo; Bojová kreativita +5', () => {
    const c = learn(thief(6), 'riskantni_utok', 'bojova_kreativita');
    let f = fight(c);
    f = risky(f, 1);
    const r = roundInfo(f, derive(f));
    expect([r.atk.n, r.def.n]).toEqual([2, 0]);
    expect(riskyWhy(f, 1)).toBe('v tomto kole už použit');
    f = creative(f);
    expect(combatMods(f)).toMatchObject({ atk: 5, def: 5 });
    f = newRound(f).character;
    expect(combatMods(f).atk).toBe(0);
  });
  it('jednorázový trik jen 1× za souboj; Oko střelce až po kole míření', () => {
    const c = thief(3);
    c.progression.learnedBranches.push('rvaci');
    let f = fight(c);
    const t = trickByName('Falešný útok')!;
    expect(trickCombatWhy(f, t)).toBe('');
    f = useTrick(f, t);
    expect(trickCombatWhy(f, t)).toMatch(/jednorázový/);
    expect(trickCombatWhy(f, trickByName('Oko střelce')!)).toBe('nejdřív 1 kolo míření');
    f = setCombat(f, { zlo: { ...f.play.combat!.zlo, aim: 1 } });
    expect(trickCombatWhy(f, trickByName('Oko střelce')!)).toMatch(/příštím/);
    f = newRound(f).character;
    expect(trickCombatWhy(f, trickByName('Oko střelce')!)).toBe('');
  });
  it('Výhodná pozice: první útok z pozice, znovu za cenu útoku; kostka 6 + k6', () => {
    const c = learn(thief(6), 'vyhodna_pozice', 'svizne_ostri');
    arm(c, 'jednorucni_dyka');
    let f = fight(c);
    expect(positionReady(f)).toBe(true);
    f = positionAttack(f, derive(f));
    expect(positionReady(f)).toBe(false);
    f = regainPosition(f, derive(f));
    expect(positionReady(f)).toBe(true);
    expect(f.play.combat!.atkUsed).toBe(2);
    const seq = [3];
    const r = rollDice('k6x6', 4, 'Útok', true, () => seq.shift() ?? 1);
    expect(r.faces.map((x) => x.v)).toEqual([6, 3]);
    expect(r.total).toBe(13);
  });
});

describe('jedy, výroba, síť', () => {
  it('Výroba jedů: 1 dávka denně, potření zbraně, Nový den, Vrátit', () => {
    const c = thief(6);
    c.progression.specialization = 'assassin';
    learn(c, 'vyroba_jedu');
    let x = makePoison(c, 'cerna_smrt');
    expect(zlo(x).poisons.cerna_smrt).toBe(1);
    expect(makePoison(x, 'mesicni_polibek')).toBe(x);
    x = applyPoison(x, 'cerna_smrt');
    expect(zlo(x)).toMatchObject({ weaponPoison: 'cerna_smrt', poisons: { cerna_smrt: 0 } });
    x = newDay(x);
    expect(zlo(x).poisonMadeToday).toBe(false);
    x = undoThief(undoThief(x));
    expect(zlo(x).weaponPoison).toBeNull();
    expect(zlo(x).poisons.cerna_smrt).toBe(1);
  });
  it('Lupičská udělátka: výroba za materiál; Nastražení pasti s hodem', () => {
    const c = thief(6);
    c.progression.specialization = 'lupic';
    learn(c, 'lupicska_udelatka', 'mistrovstvi_zelezneho_klice');
    const r = craftGadget(c, 'gear', 'zl_padak', true);
    expect(r.character!.equipment.items.some((i) => i.name === 'Padák')).toBe(true);
    expect(r.character!.equipment.money.gold).toBe(400);
    const w = craftGadget(c, 'weapon', 'sochor', false);
    expect(w.character!.equipment.weapons.some((x) => x.itemId === 'sochor')).toBe(true);
    const past = THIEF.predmety.find((p) => p.id === 'sipkova_past')!;
    expect(craftTrap(c, past, 14).ok).toBe(false);
    expect(craftTrap(c, past, 15).character.equipment.items.some((i) => i.name === 'Past – Šipková past')).toBe(true);
  });
  it('Siccova síť: kápo, limit = úroveň, výplata, měsíc bez výplaty, akce', () => {
    let c = thief(6);
    c.progression.specialization = 'sicco';
    c = addMember(c, 'kapsar', 'Fousek', true).character!;
    c = addMember(c, 'kapsar', '', true).character!;
    c = addMember(c, 'ranar', 'Hora', false).character!;
    expect(zlo(c).network.members.map((m) => m.kapo)).toEqual([true, false, true]);
    expect(c.equipment.money.gold).toBe(480);
    c = payMonth(c).character!;
    expect(c.equipment.money.gold).toBe(445);
    const s1 = skipMonth(c);
    expect(s1.left).toEqual(['Kapsář']);
    let x = s1.character;
    for (let i = 0; i < 3; i++) x = skipMonth(x).character;
    expect(zlo(x).network.members).toHaveLength(0);
    // Kapsářství: 3 kapsáři, 1k10 + 3 vs. 6, úspěch → 3 × 7 zl, sazba 3 × 5 zl
    c = addMember(c, 'kapsar', 'Lísek', false).character!;
    const kap = zlo(c).network.members.filter((m) => m.type === 'kapsar').map((m) => m.uid);
    const ok = runAction(c, 'kapsarstvi', kap, 6, {}, () => 5);
    expect(ok.ok).toBe(true);
    expect(ok.character!.equipment.money.gold).toBe(445 - 15 + 21);
    // Loupež (Zločin): neúspěch → polovina týmu chycena (nejdřív řadoví)
    const bad = runAction(c, 'loupez', kap, 20, { pay: false }, () => 1);
    expect(bad.ok).toBe(false);
    expect(zlo(bad.character!).network.members.filter((m) => m.type === 'kapsar').map((m) => m.name)).toEqual(['Fousek']);
    expect(bad.text).toMatch(/chyceni: Kapsář, Lísek/);
    let big = thief(2);
    big.progression.specialization = 'sicco';
    big = addMember(big, 'ocko', '', false).character!;
    big = addMember(big, 'ocko', '', false).character!;
    expect(addMember(big, 'ocko', '', false).error).toMatch(/limit/);
  });
  it('Důvěrník (Sicco): +1k6 životů za úroveň, každá 3. ÚČ nebo ZO a dovednost +1', () => {
    let c = thief(6);
    c.progression.specialization = 'sicco';
    learn(c, 'duvernik');
    c = addCompanion(c, 'duv', 'duvernik', statsFrom(speciesOf('duvernik')), { name: 'Bruno' });
    const u = c.companions[0].uid;
    expect(companionStepWhy(c, {}, [])).toMatch(/1k6/);
    for (let i = 0; i < 3; i++) {
      const third = i === 2;
      c = { ...c, companions: applyCompanionGrowth(c, { [u]: { skills: [], spells: [], hp: 4, ...(third ? { pick: 'uc' as const, skill: 'Vůle' } : {}) } }, 7 + i) };
    }
    const v = companionView(c, null, c.companions[0]);
    expect(v.hpMax).toBe(62);
    expect(v.attacks[0].atk).toBe(10);
    expect(v.skills).toEqual([{ name: 'Vůle', value: 1 }]);
  });
  it('migrace: starší `{}` doplní stav zloděje', () => {
    const c = thief();
    const raw = JSON.parse(JSON.stringify(c));
    raw.classState.zlodej = {};
    const m = migrate(raw);
    expect(m.classState.zlodej).toMatchObject({ offhand: null, poisons: {}, network: { members: [] }, log: [] });
  });
});
