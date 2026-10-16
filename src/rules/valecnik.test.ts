import { describe, expect, it } from 'vitest';
import { buildCharacter, newDraft } from '../creation/draft';
import { migrate } from '../storage/migrations';
import { applyLevelUp, canNext, describeLevelUp, emptyLevelUp, itemPool, options, type LevelUpState } from '../progression/levelup';
import type { Character } from '../model/types';
import { applyTrick, endTurn, hpState, myTurn, newRound, sleep, startCombat, trickWhy } from './combat';
import { derive } from './derive';
import {
  TRICKS, WARRIOR, getTrick, learnCtx, pathRank, trickLockReason, trickPrice, weaponGroups, weaponInfo, weaponPath,
} from './valecnik';
import { getWeapon } from './data';

const warrior = (level = 1): Character => {
  const c = buildCharacter({ ...newDraft(), name: 'Baldur', raceId: 'clovek', classId: 'valecnik', method: 'points', points: { sil: 6, obr: 4, odo: 5, int: 3, char: 2 }, picks: ['Rychlý úder', 'Zuřivý útok'], choice: 0 });
  c.progression.level = level;
  c.equipment.weapons = [];
  c.equipment.shield = { itemId: null, custom: null, equipped: false, weightLb: null };
  c.equipment.armor = { itemId: null, custom: null, equipped: false, weightLb: null };
  c.equipment.activeWeaponUid = null;
  return c;
};
const arm = (c: Character, itemId: string) => {
  c.equipment.weapons = [...c.equipment.weapons, { uid: itemId, itemId, custom: null, grip: 'one-handed', equipped: true, weightLb: null }];
  c.equipment.activeWeaponUid = itemId;
  return c;
};
const learn = (c: Character, ...ids: string[]) => { c.progression.learnedAbilities.push(...ids.map((id) => ({ id }))); return c; };

describe('data válečníka (H08 + PPP01)', () => {
  it('116 triků s jedinečnými jmény, všechny skupiny PPP01 po 8 (Obecné 12, na koni 4, Mistři 1)', () => {
    expect(TRICKS).toHaveLength(116);
    expect(new Set(TRICKS.map((t) => t.n)).size).toBe(116);
    const by = (g: string) => TRICKS.filter((t) => t.src === 'PPP01' && t.group === g).length;
    expect(by('Obecné')).toBe(12);
    expect(by('Škola boje se štítem')).toBe(8);
    expect(by('Škola boje na koni')).toBe(4);
    expect(by('Mistr Cesty meče')).toBe(1);
    expect(WARRIOR.paths.map((p) => p.master.trick)).toEqual(['Mordýřský úder', 'Hákování', 'Úchop za konec', 'Odhození', 'Přeskupení']);
  });
  it('druh triku a cena: dodatečný útok, výkřik, proměnná cena', () => {
    expect(getTrick('Úhyb a sek')).toMatchObject({ t: 'obrana', a: 3, var: false });
    expect(getTrick('Série útoků')).toMatchObject({ t: 'utok', extra: true, var: true, a: 1 });
    expect(getTrick('Válečný pokřik')).toMatchObject({ t: 'vykrik', a: 1 });
    expect(getTrick('Odklonění štítu')).toMatchObject({ opts: [2, 3], var: true });
    expect(getTrick('Průrazné ostří')).toBeUndefined(); // stupeň Cesty, ne trik
    expect(WARRIOR.paths.find((p) => p.id === 'cesta_sekery')!.ranks[3].effect).toContain('nekovovou');
  });
  it('podmínky naučení: škola, 6. úroveň, specializace, Mistr Cesty, Zručnost se zbraní', () => {
    const c = warrior(6);
    c.progression.learnedBranches = ['skola_boje_s_bodnou_zbrani'];
    const x = learnCtx(c);
    expect(trickLockReason(getTrick('Výpad')!, x)).toBe('');
    expect(trickLockReason(getTrick('Kavace')!, x)).toBe('');
    expect(trickLockReason(getTrick('Kavace')!, learnCtx(c, { level: 5 }))).toBe('od 6. úrovně');
    expect(trickLockReason(getTrick('Zámek')!, x)).toBe('Škola boje se štítem');
    expect(trickLockReason(getTrick('Louskáček')!, x)).toBe('Berserkr');
    expect(trickLockReason(getTrick('Mordýřský úder')!, x)).toContain('Mistr');
    expect(trickLockReason(getTrick('Přehmátnutí')!, x)).toBe('Zručnost se zbraní');
  });
});

describe('přestup válečníka (7b)', () => {
  it('nabídka triků: H08 škola hned, PPP01 triky školy a obecné pokročilé až od 6. úrovně', () => {
    const c = warrior(1);
    const st: LevelUpState = { ...emptyLevelUp(), pick: { kind: 'branch', id: 'skola_boje_s_bodnou_zbrani' } };
    const names = itemPool(c, st).map((p) => p.name);
    expect(names).toContain('Výpad');
    expect(names).not.toContain('Kavace');
    expect(names).not.toContain('Úkrok');
    const c5 = warrior(5);
    c5.progression.learnedBranches = ['skola_boje_s_bodnou_zbrani'];
    const pool6 = itemPool(c5, { ...emptyLevelUp(), pick: { kind: 'ability', id: 'bijec' } });
    expect(pool6.find((p) => p.name === 'Kavace')).toMatchObject({ branchId: 'skola_boje_s_bodnou_zbrani', fresh: true });
    expect(pool6.some((p) => p.name === 'Úkrok')).toBe(true);
  });
  it('Cesta: jen na 6., 9., 12. úrovni, stupně až po Mistra, Mistr odemkne speciální trik', () => {
    const c5 = warrior(5);
    expect(options(c5).find((o) => o.id === 'cesta_mece')?.disabled).toBeNull();
    expect(options(warrior(6)).find((o) => o.id === 'cesta_mece')?.disabled).toContain('jen na 6., 9., 12.');
    const c = warrior(14);
    learn(c, 'cesta_mece', 'cesta_mece', 'cesta_mece');
    const st: LevelUpState = { ...emptyLevelUp(), pick: { kind: 'ability', id: 'cesta_mece' } };
    expect(itemPool(c, st).some((p) => p.name === 'Mordýřský úder' && p.fresh)).toBe(true);
    const x = applyLevelUp(c, st);
    expect(pathRank(x, 'cesta_mece')).toBe(4);
    expect(options(x).find((o) => o.id === 'cesta_mece')?.disabled).toBe('zvládnuto');
  });
  it('Mistrovství ve zbrani: bez skupiny nejde dál, skupina se uloží a ukáže v historii', () => {
    const c = warrior(2);
    const st: LevelUpState = { ...emptyLevelUp(), pick: { kind: 'ability', id: 'mistrovstvi_ve_zbrani' } };
    expect(canNext(c, st, 'volba')).toBe(false);
    const st2 = { ...st, pickParams: { group: 'secne' } };
    expect(canNext(c, st2, 'volba')).toBe(true);
    const x = applyLevelUp(c, st2);
    expect(x.progression.learnedAbilities.at(-1)).toEqual({ id: 'mistrovstvi_ve_zbrani', params: { group: 'secne' } });
    expect(describeLevelUp('valecnik', x.progression.levelUps.at(-1)!)[0]).toBe('Mistrovství ve zbrani (sečné)');
  });
  it('bez specializace smí na každé 6. úrovni vzít schopnost libovolné specializace', () => {
    expect(options(warrior(5)).find((o) => o.id === 'zjizvena_kuze')?.disabled).toBeNull();
    expect(options(warrior(6)).find((o) => o.id === 'zjizvena_kuze')?.disabled).toBe('jen Berserkr');
    const r = warrior(11);
    r.progression.specialization = 'rytir';
    expect(options(r).find((o) => o.id === 'zjizvena_kuze')?.disabled).toBe('jen Berserkr');
    expect(options(r).find((o) => o.id === 'zakryti')?.disabled).toBeNull();
  });
});

describe('bonusy válečníka v deníku (derive)', () => {
  it('skupina a Cesta zbraně podle názvu a druhu', () => {
    expect(weaponGroups(weaponInfo(getWeapon('jednorucni_savle'), null))).toEqual(['secne']);
    expect(weaponGroups(weaponInfo(getWeapon('strelne_kratky_luk'), null))).toEqual(['strelne']);
    expect(weaponGroups(weaponInfo(getWeapon('jednorucni_pesti'), null))).toEqual(['beze_zbrane']);
    expect(weaponPath(weaponInfo(getWeapon('obourucni_dlouhy_mec'), null))).toBe('cesta_mece');
    expect(weaponPath(weaponInfo(getWeapon('jednorucni_valecne_kladivo_palcat'), null))).toBe('cesta_kladiva');
    expect(weaponPath(weaponInfo(getWeapon('obourucni_kopi'), null))).toBe('cesta_hole_a_kopi');
  });
  it('školy a Mistrovství: jednoruční +1 OČ, obouruční +2 zranění, Mistrovství +2 ÚČ/OČ jen se svou skupinou', () => {
    const c = arm(warrior(3), 'jednorucni_savle');
    const d0 = derive(c).weapons[0];
    c.progression.learnedBranches = ['skola_boje_s_jednorucni_zbrani', 'skola_boje_s_obourucni_zbrani'];
    c.progression.learnedAbilities.push({ id: 'mistrovstvi_ve_zbrani', params: { group: 'secne' } }, { id: 'mistrovstvi_ve_zbrani', params: { group: 'drtive' } });
    const w = derive(c).weapons[0];
    expect(w.attackNumber - d0.attackNumber).toBe(2);
    expect(w.defenseNumber - d0.defenseNumber).toBe(3);
    expect(w.damageTotal).toBe(d0.damage + 2);
    expect(derive(c).attackNumber.formula).toContain('Mistrovství ve zbrani (sečné)');
  });
  it('Záměna = volba hráče (✔ U 30. 9. 2026): bez volby nic, Útok s OBR / Obrana se SIL zvlášť', () => {
    const c = learn(arm(warrior(6), 'jednorucni_savle'), 'zamena');
    const d0 = derive(c).weapons[0];
    expect(derive(c).attackNumber.formula).not.toContain('Záměna');
    c.classState.valecnik = { combatStyle: null, grip: null, swapDef: 'sil' };
    const d1 = derive(c).weapons[0];
    const diff = d1.defenseNumber - d0.defenseNumber; // Baldur má SIL lepší než OBR
    expect(diff).toBeGreaterThan(0);
    expect(d1.attackNumber).toBe(d0.attackNumber);
    c.classState.valecnik = { combatStyle: null, grip: null, swapAtk: 'obr', swapDef: null };
    const d2 = derive(c).weapons[0];
    expect([d2.attackNumber - d0.attackNumber, d2.defenseNumber]).toEqual([-diff, d0.defenseNumber]);
  });
  it('Cesta meče II + Rozvážnost útočně; Cesta hole dá iniciativu jen s kopím v ruce', () => {
    const c = arm(warrior(9), 'obourucni_dlouhy_mec');
    const a0 = derive(c).weapons[0];
    learn(c, 'cesta_mece', 'cesta_mece', 'rozvaznost');
    c.classState.valecnik = { combatStyle: 'offensive', grip: null };
    const a = derive(c).weapons[0];
    expect(a.attackNumber - a0.attackNumber).toBe(2 + 3);
    expect(a.defenseNumber - a0.defenseNumber).toBe(2 - 1);
    const k = arm(warrior(6), 'obourucni_kopi');
    const i0 = derive(k).initiativeBonus.value;
    learn(k, 'cesta_hole_a_kopi');
    expect(derive(k).initiativeBonus.value).toBe(i0 + 2);
    k.equipment.activeWeaponUid = null;
    k.equipment.weapons[0].equipped = false;
    expect(derive(k).initiativeBonus.value).toBe(i0);
  });
  it('Škola boje se štítem sečte štít i zbraň; Zakrytí dá štít do ZO; Mistr zbroje +3 KZ; Železný muž', () => {
    const c = arm(warrior(6), 'jednorucni_savle');
    c.equipment.shield = { itemId: 'stit_dreveny_stit', custom: null, equipped: true, weightLb: null };
    c.equipment.armor = { itemId: 'zbroj_krouzkova', custom: null, equipped: true, weightLb: null };
    const d0 = derive(c);
    c.progression.learnedBranches = ['skola_boje_se_stitem'];
    expect(derive(c).weapons[0].defenseNumber).toBe(d0.weapons[0].defenseNumber + 2); // + obrana šavle 2
    c.progression.specialization = 'rytir';
    learn(c, 'zakryti', 'mistr_zbroje', 'zelezny_muz');
    const d = derive(c);
    expect(d.defenseBase.value).toBe(d0.defenseBase.value + 4 + 3);
    expect(d.weapons[0].defenseNumber).toBe(d0.weapons[0].defenseNumber + 2 + 3); // štít už v ZO, nepočítá se dvakrát
    expect(d.load.value).toBeCloseTo(d0.load.value - 15, 5);
  });
  it('Životní zkušenost specializace +3 k dovednostem, Mrštnost jen bez těžké zbroje', () => {
    const c = warrior(6);
    c.skills.push({ id: 'historie', customName: null, attribute: 'int', rank: 1, source: 'bought' });
    const h0 = derive(c).skills.find((s) => s.id === 'historie')!.total;
    c.progression.specialization = 'rytir';
    expect(derive(c).skills.find((s) => s.id === 'historie')!.total).toBe(h0 + 3);
    const b = warrior(6);
    const z0 = derive(b).defenseBase.value;
    learn(b, 'mrstnost');
    expect(derive(b).defenseBase.value).toBe(z0 + 2);
    b.equipment.armor = { itemId: 'zbroj_platova', custom: null, equipped: true, weightLb: null };
    const plate = derive(b);
    b.progression.learnedAbilities = [];
    expect(plate.defenseBase.value).toBe(derive(b).defenseBase.value);
  });
});

describe('triky a schopnosti v boji', () => {
  const inTurn = (c: Character) => myTurn(startCombat(c, false));
  it('dodatečný útok nezabere Útok, výkřik jen 1× za kolo, Rutina zlevní', () => {
    const c = warrior(8);
    c.progression.learnedItems.push('Série útoků', 'Válečný pokřik');
    c.vitals.manaCurrent = 6;
    let x = inTurn(c);
    const d = derive(x);
    x = applyTrick(x, d, getTrick('Série útoků')!, 2).character;
    expect(x.play.combat!.attack).toBe(false);
    expect(x.vitals.manaCurrent).toBe(4);
    x = applyTrick(x, d, getTrick('Válečný pokřik')!).character;
    expect(trickWhy(x, d, getTrick('Válečný pokřik')!)).toBe('výkřik už v tomto kole');
    x = newRound(endTurn(x).character).character;
    expect(trickWhy(x, derive(x), getTrick('Válečný pokřik')!)).toBe('');
    learn(c, 'rutina');
    expect(trickPrice(c, getTrick('Zuřivý útok')!)).toBe(1);
    expect(trickPrice(c, getTrick('Rychlý úder')!)).toBe(0);
    expect(trickPrice(c, getTrick('Série útoků')!, 3)).toBe(2);
  });
  it('Urputnost: při 0 životech neupadá do bezvědomí; Tuhý kořínek +4 ke spánku', () => {
    const c = learn(warrior(4), 'urputnost');
    c.vitals.hpCurrent = -2;
    expect(hpState(c, derive(c))).toBe('badly');
    const t = learn(warrior(6), 'tuhy_korinek');
    t.vitals.hpCurrent = 1;
    expect(sleep(t, derive(t)).vitals.hpCurrent).toBe(1 + 2 + 4);
  });
  it('migrace doplní válečníkovi nové pole úchopu', () => {
    const c = warrior(1) as unknown as Record<string, unknown>;
    (c.classState as Record<string, unknown>).valecnik = { combatStyle: 'offensive' };
    expect(migrate(c).classState.valecnik).toEqual({ combatStyle: 'offensive', grip: null });
  });
});
