// 7a+.2 – specializace Pyromant z PPP03 (s. 143–162).
import { describe, expect, it } from 'vitest';
import { sampleKloi } from '../model/sample';
import type { Character } from '../model/types';
import { addBase, alch, craft, craftBonus, extraMaxFor, knownRecipes, planCraft, recipeById, setWorkshop, canRecharge } from './alchemy';
import { derive } from './derive';
import {
  buildConstruct, burnFuel, constructStats, costRows, firearmToWeapons, launch, planConstruct, refuel, transmute, transmuteMana, upgradeConstruct,
  type ConstructSpec,
} from './pyromant';

const pyromant = (...abilities: string[]): Character => {
  const c = sampleKloi();
  c.progression.level = 6;
  c.progression.learnedBranches = ['nestabilni_substance', 'magicke_predmety'];
  c.progression.specialization = 'pyromant';
  c.progression.learnedAbilities.push(...abilities.map((id) => ({ id })));
  c.skills.push({ id: 'pyromancie', customName: null, attribute: 'obr', rank: 5, source: 'class-profession' });
  c.vitals.manaCurrent = 3000;
  c.classState.alchymista!.materialsCurrent = 3000;
  return c;
};
const ALL = ['kapsulacni_gemy', 'konstrukty', 'mistr_nestabilnich_substanci', 'palne_zbrane', 'prace_s_energii', 'sapersky_vycvik', 'strely_a_rachejtle', 'transmutace_kovu'];

describe('recepty Pyromanta', () => {
  it('32 receptů ze schopností', () => {
    const base = knownRecipes(pyromant()).length;
    const all = knownRecipes(pyromant(...ALL));
    expect(all.length - base).toBe(32);
    expect(all.map((r) => r.id)).toEqual(expect.arrayContaining(['chrlic', 'slzny_plyn', 'pistole', 'turet', 'kule', 'replikator', 'nasl' + 'apna_past', 'rizena_strela', 'kapsulacni_gem']));
  });

  it('palné zbraně se vyrábějí Mechanikou, rachejtle Pyromancií, plyny Lučbou s +5', () => {
    let c = pyromant(...ALL);
    c = setWorkshop(c, { size: 2, kind: 'vyhen', access: 'vlastni', here: true });
    const d = derive(c);
    const sk = (id: string) => d.skills.find((s) => s.id === id)!.total;
    expect(craftBonus(c, d, false, false, recipeById('pistole')!).total).toBe(sk('mechanika') + 3 + 2);
    expect(craftBonus(c, d, false, false, recipeById('lehka_rachejtle')!).total).toBe(sk('pyromancie') + 3 + 2);
    expect(craftBonus(c, d, false, false, recipeById('mrazivy_plyn')!).total).toBe(sk('lucba') + 3 + 2 + 5);
    expect(craftBonus(c, d, false, false, recipeById('chrlic')!).parts.some((p) => p.includes('Pyromancie +5'))).toBe(false);
  });

  it('Mistr nestabilních substancí: CHAR −5', () => {
    expect(derive(pyromant('mistr_nestabilnich_substanci')).attributes.char.value).toBe(6);
  });

  it('Práce s energií zdvojnásobí přídavnou manu a umí dobíjet', () => {
    const r = recipeById('hraci_skrinka')!;
    expect(extraMaxFor(r, {}, pyromant())).toBe(100);
    expect(extraMaxFor(r, {}, pyromant('prace_s_energii'))).toBe(200);
    expect(canRecharge(pyromant('prace_s_energii'), r)).toBe(true);
    expect(canRecharge(pyromant(), r)).toBe(false);
  });

  it('kule: jedna výroba = 10 kusů', () => {
    let c = addBase(pyromant('palne_zbrane'), 'olověné slitky', 1, 0.5);
    expect(planCraft(c, recipeById('kule')!).ok).toBe(true);
    c = craft(c, derive(c), recipeById('kule')!, {}, 30).character;
    expect(alch(c).crafted.find((x) => x.recipeId === 'kule')!.qty).toBe(10);
  });

  it('palná zbraň jde do zbraní postavy, rachejtle se odpálí', () => {
    let c = addBase(pyromant('palne_zbrane', 'strely_a_rachejtle'), 'železo', 1, 1);
    c = addBase(c, 'černý prach', 1, 0.2);
    c = craft(c, derive(c), recipeById('pistole')!, {}, 30).character;
    const gun = alch(c).crafted.find((x) => x.recipeId === 'pistole')!;
    const n = c.equipment.weapons.length;
    c = firearmToWeapons(c, gun.uid);
    const w = c.equipment.weapons[n];
    expect([w.custom?.attack, w.custom?.damage, w.custom?.defense, w.grip]).toEqual([10, 10, 1, 'one-handed']);
    expect(alch(c).crafted.some((x) => x.recipeId === 'pistole')).toBe(false);
    c = craft(c, derive(c), recipeById('lehka_rachejtle')!, {}, 30).character;
    const rk = alch(c).crafted.find((x) => x.recipeId === 'lehka_rachejtle')!;
    const hit = launch(c, rk.uid, 14);
    expect([hit.success, hit.dc]).toEqual([true, 13]);
    expect(alch(hit.character).crafted.some((x) => x.recipeId === 'lehka_rachejtle')).toBe(false);
    expect(launch(c, rk.uid, 13).success).toBe(false);
  });

  it('transmutace podle tabulky', () => {
    expect(transmuteMana('Měď', 'Zlato')).toBe(400);
    expect(transmuteMana('Zlato', 'Měď')).toBe(5);
    expect(transmuteMana('Železo', 'Stříbro', 5)).toBe(500);
    expect(transmuteMana('Železo', 'Železo')).toBeNull();
    const c = pyromant('transmutace_kovu');
    expect(transmute(c, 100, 'Železo → Stříbro').character.vitals.manaCurrent).toBe(2900);
    expect(transmute(pyromant(), 100, 'x').error).toBeTruthy();
  });
});

describe('konstrukty', () => {
  const spec: ConstructSpec = { size: 'B', material: 'Kov', fuel: 'mana', tanks: 1, brain: 2, upgrades: ['zesilena'] };

  it('cena a obtížnost jako součet tabulek', () => {
    // tělo Kov B 11/12 h/250 m/40 s + srdce mana B 5/180 s + nádrž 5/80 s + mozek Servant 4/30 m/5 s + zesílená B 5/4 h/35 m/130 s
    const rows = costRows(spec);
    expect(rows).toHaveLength(5);
    const p = planConstruct(pyromant('konstrukty'), spec);
    expect([p.difficulty, p.hours, p.mana, p.materials]).toEqual([30, 16, 315, 435]);
    const st = constructStats(spec);
    expect([st.attack, st.defense, st.hpMax, st.fuelCap, st.days, st.spray]).toEqual([9, 13, 53, 120, 20, 3]);
  });

  it('úspěch = konstrukt bez paliva, neúspěch = šrot s ½ na další konstrukt', () => {
    const c = pyromant('konstrukty');
    const ok = buildConstruct(c, spec, 31, 'Klapka');
    expect(ok.success).toBe(true);
    const k = alch(ok.character).constructs[0];
    expect([k.name, k.hpCurrent, k.fuelCurrent, k.difficulty]).toEqual(['Klapka', 53, 0, 30]);
    let x = refuel(ok.character, k.uid, 500);
    expect(alch(x).constructs[0].fuelCurrent).toBe(120);
    expect(x.vitals.manaCurrent).toBe(ok.character.vitals.manaCurrent - 120);
    x = burnFuel(x, k.uid, 3, 'chrlení');
    expect(alch(x).constructs[0].fuelCurrent).toBe(117);

    const fail = buildConstruct(c, spec, 30);
    expect(fail.success).toBe(false);
    expect(alch(fail.character).constructs).toHaveLength(0);
    expect(alch(fail.character).constructScrap).toEqual({ mana: 157, materials: 217 });
    const next = planConstruct(fail.character, spec);
    expect([next.mana, next.materials, next.scrapUsed.mana]).toEqual([315 - 157, 435 - 217, 157]);
  });

  it('vylepšení: nové součásti vs. celková obtížnost, nosič se spotřebuje', () => {
    const c = pyromant('konstrukty');
    let x = buildConstruct(c, spec, 31).character;
    const k = alch(x).constructs[0];
    const p = planConstruct(x, { ...spec, upgrades: ['zesilena', 'nosic'] }, k);
    expect([p.rows.length, p.difficulty, p.missing.nosic]).toEqual([1, 32, true]);
    x = addBase(x, 'kovové pruty', 1, 1);
    x = craft(x, derive(x), recipeById('univerzalni_nosic')!, {}, 30).character;
    expect(planConstruct(x, { ...spec, upgrades: ['zesilena', 'nosic'] }, k).ok).toBe(true);
    const up = upgradeConstruct(x, k.uid, ['nosic'], 1, 33);
    expect(up.success).toBe(true);
    expect(alch(up.character).constructs[0].upgrades).toEqual(['zesilena', 'nosic']);
    expect(alch(up.character).crafted.some((y) => y.recipeId === 'univerzalni_nosic')).toBe(false);
  });
});
