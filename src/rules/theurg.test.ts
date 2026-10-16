// 7a+.3 – specializace Theurg z PPP03 (s. 163–190).
import { describe, expect, it } from 'vitest';
import { sampleKloi } from '../model/sample';
import type { Character } from '../model/types';
import { alch, craftBonus, extraMaxFor, knownRecipes, recipeById, setWorkshop, RECIPES } from './alchemy';
import { derive } from './derive';
import { migrate } from '../storage/migrations';
import {
  THEURG, bhutRow, chargeStaff, craftStaff, demonLifespan, elementalDef, elementalStats, planDemons, separateEssences, staffToWeapons,
  summonBhut, summonDemons, summonElemental, theurgState, theurgyBonus, useEssence,
} from './theurg';

const theurg = (...abilities: string[]): Character => {
  const c = sampleKloi();
  c.progression.level = 6;
  c.progression.learnedBranches = ['hvezdne_sestavy', 'krystaly_a_energie'];
  c.progression.specialization = 'theurg';
  c.progression.learnedAbilities.push(...abilities.map((id) => ({ id })));
  c.skills.push({ id: 'theurgie', customName: null, attribute: 'int', rank: 5, source: 'class-profession' });
  c.vitals.manaCurrent = 3000;
  c.classState.alchymista!.materialsCurrent = 3000;
  return c;
};
const ALL = ['astralni_sfery', 'ovladnuti_zivlu', 'ozivle_pomucky', 'portaly_a_zrcadla', 'poslove_zivlu', 'prace_s_esencemi', 'prace_s_vichry_many', 'talismany'];

describe('recepty a data Theurga', () => {
  it('27 receptů ze schopností, 72 řádků démonů, 14 drahokamů', () => {
    expect(RECIPES).toHaveLength(168);
    expect(knownRecipes(theurg(...ALL)).length - knownRecipes(theurg()).length).toBe(27);
    expect(THEURG.demons).toHaveLength(72);
    expect(THEURG.gems).toHaveLength(14);
    expect(recipeById('chodici_truhla')!.requiresMoment).toBe('slunovrat');
    expect(extraMaxFor(recipeById('talisman_diamant')!)).toBe(1000);
  });
  it('talismany Lučbou, oživlé pomůcky Theurgií s bonusem astrolábu', () => {
    let c = theurg(...ALL);
    c = setWorkshop(c, { size: 1, kind: 'astrolab', access: 'vlastni', here: true });
    const d = derive(c);
    const sk = (id: string) => d.skills.find((s) => s.id === id)!.total;
    expect(craftBonus(c, d, false, false, recipeById('ozivly_obusek')!).total).toBe(sk('theurgie') + 2 + 2);
    expect(craftBonus(c, d, false, false, recipeById('talisman_rubin')!).total).toBe(sk('lucba') + 2 + 2);
    expect(theurgyBonus(c, d).total).toBe(sk('theurgie') + 2);
  });
  it('stará data dostanou prázdný stav Theurga', () => {
    const c = theurg();
    const { theurg: _t, ...old } = c.classState.alchymista!;
    const m = migrate({ ...c, classState: { ...c.classState, alchymista: old } });
    expect(m.classState.alchymista!.theurg.staff).toEqual({ owned: false, mana: 0, astron: '' });
  });
});

describe('Theurgova hůl', () => {
  it('výroba 300 many, dobíjení 10 za kolo do 1000, zbraň', () => {
    let c = craftStaff(theurg()).character;
    expect(c.vitals.manaCurrent).toBe(2700);
    const x = chargeStaff(c, 1500);
    expect([theurgState(x.character).staff.mana, x.rounds]).toEqual([1000, 100]);
    c = staffToWeapons(x.character);
    const w = c.equipment.weapons.at(-1)!;
    expect([w.custom?.attack, w.custom?.damage, w.custom?.defense, w.grip]).toEqual([7, 1, 1, 'two-handed']);
    expect(staffToWeapons(c).equipment.weapons).toHaveLength(c.equipment.weapons.length);
  });
});

describe('Astrální sféry', () => {
  it('příklad Kelley: Agresor III + Větrník II + Magik I + Krvesaj II + Našeptávač I = 20', () => {
    const c = theurg('astralni_sfery');
    const ok = planDemons(c, ['naldan_3', 'viledar_2', 'argotar_1', 'ondoreth_2', 'valandir_1'], 'vyrocni');
    expect([ok.difficulty, ok.helperLevels, ok.pestLevels, ok.ok]).toEqual([20, 6, 3, true]);
    expect([ok.mana, ok.materials, ok.hours]).toEqual([75 + 150 + 55, 30 + 60 + 25, 40]);
    // bez stabilizace škůdci nejde, dva démoni z jedné sféry nejdou, okamžik omezuje obtížnost
    expect(planDemons(c, ['naldan_3', 'viledar_2', 'argotar_1'], 'vyrocni').errors.join()).toMatch(/2 škůdců/);
    expect(planDemons(c, ['naldan_3', 'viledar_2', 'argotar_1', 'ondoreth_1', 'valandir_1'], 'vyrocni').errors.join()).toMatch(/úrovně škůdců aspoň 3/);
    expect(planDemons(c, ['naldan_1', 'naldan_2'], 'denni').errors.join()).toMatch(/jeden démon/);
    expect(planDemons(c, ['naldan_3', 'viledar_2', 'argotar_1', 'ondoreth_2', 'valandir_1'], 'mesicni').ok).toBe(false);
    expect(planDemons(c, ['naldan_1'], 'kombinace', 18).momentMax).toBe(21);
  });
  it('úspěch = předmět s démony a životností podle rozdílu, neúspěch jen odečte', () => {
    const c = theurg('astralni_sfery');
    const ids = ['naldan_2', 'kezachiel_1'];
    // dva pomocníci (úr. 2 + 1) → aspoň 1 škůdce s úrovní 2
    expect(planDemons(c, ids, 'mesicni').ok).toBe(false);
    const all = [...ids, 'zarathas_2'];
    const p = planDemons(c, all, 'mesicni');
    expect([p.difficulty, p.ok]).toEqual([5, true]);
    const x = summonDemons(c, all, 'mesicni', 'Meč', 'item', 9);
    expect(x.success).toBe(true);
    expect(x.lifespan).toBe(demonLifespan(4));
    const it = alch(x.character).crafted[0];
    expect([it.name, it.demons?.length]).toEqual(['Meč (Agresor, Obránce)', 3]);
    const f = summonDemons(c, all, 'mesicni', 'Meč', 'item', 5);
    expect(f.success).toBe(false);
    expect(alch(f.character).crafted.some((y) => y.recipeId === 'astralni_predmet')).toBe(false);
    expect(f.character.vitals.manaCurrent).toBe(3000 - p.mana);
  });
});

describe('bhůtové, elementálové, esence', () => {
  it('bhůt bere manu z hole jen při úspěchu', () => {
    let c = craftStaff(theurg('ovladnuti_zivlu')).character;
    expect(summonBhut(c, 'ohen', 3, 30).error).toBeTruthy();
    c = chargeStaff(c, 100).character;
    expect(bhutRow(3)).toMatchObject({ dc: 18, mana: 60 });
    expect(theurgState(summonBhut(c, 'ohen', 3, 18).character).staff.mana).toBe(100);
    expect(theurgState(summonBhut(c, 'ohen', 3, 19).character).staff.mana).toBe(40);
  });
  it('elementál: hodnoty podle stupně, přivolání z hole', () => {
    const terra = elementalStats(elementalDef('terra'), 3);
    expect([terra.mana, terra.dc, terra.level, terra.hp, terra.size, terra.attack, terra.zo, terra.oc]).toEqual([25, 7, 3, 30, 'A', '6/+3 2×', 4, 5]);
    expect(elementalStats(elementalDef('igni'), 1)).toMatchObject({ mana: 10, dc: 5, hp: 10, size: 'A', zo: 3, oc: 3 });
    let c = chargeStaff(craftStaff(theurg('poslove_zivlu')).character, 100).character;
    c = summonElemental(c, 'terra', 3, 8).character;
    const t = theurgState(c);
    expect([t.staff.mana, t.elementals.length, t.elementals[0].hpCurrent]).toEqual([75, 1, 30]);
  });
  it('esence: 1 mana → 1 bod od každé, použití odečte', () => {
    let c = separateEssences(theurg('prace_s_esencemi'), 20).character;
    expect(theurgState(c).essences).toEqual({ ohen: 20, voda: 20, vzduch: 20, zeme: 20 });
    expect(c.vitals.manaCurrent).toBe(2980);
    c = useEssence(c, 'ohen', 18, '„pevný“ oheň').character;
    expect(theurgState(c).essences.ohen).toBe(2);
    expect(useEssence(c, 'ohen', 10, 'x').error).toBeTruthy();
  });
});
