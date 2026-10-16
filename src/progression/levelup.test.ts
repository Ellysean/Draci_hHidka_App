import { describe, expect, it } from 'vitest';
import { buildCharacter, newDraft } from '../creation/draft';
import { sampleKloi } from '../model/sample';
import { derive } from '../rules/derive';
import { applyLevelUp, autoGains, canNext, emptyLevelUp, itemPool, itemsToChoose, options, raiseBlock, raiseCost, specOptions, steps } from './levelup';

const warrior = (level = 1) => {
  const c = buildCharacter({ ...newDraft(), name: 'Thorgil', raceId: 'trpaslik', classId: 'valecnik', method: 'points', points: { sil: 6, obr: 3, odo: 6, int: 3, char: 2 }, picks: ['Rychlý úder', 'Zuřivý útok'], choice: 0 });
  c.progression.level = level;
  return c;
};

describe('přestup na úroveň (H18)', () => {
  it('Kloi 3 → 4: kroky bez charakterových bodů, alchymista volí obor a získá jeho recepty automaticky', () => {
    const c = sampleKloi();
    const st = { ...emptyLevelUp(), pick: { kind: 'branch' as const, id: 'krystaly_a_energie' } };
    expect(steps(c, st).map((s) => s.key)).toEqual(['prehled', 'volba', 'zivoty', 'dovednosti', 'polozky', 'shrnuti']);
    expect(autoGains(c, st)).toEqual(['Amulet many', 'Kvantogen', 'Prsten blesku', 'Světloprach']);
    const x = applyLevelUp(c, st);
    expect(x.progression.level).toBe(4);
    expect(x.progression.learnedBranches).toContain('krystaly_a_energie');
    expect(x.progression.levelUps.at(-1)?.choices[0]).toEqual({ slot: 'branch', id: 'krystaly_a_energie' });
    expect(derive(x).hpMax.value).toBe(19); // Tabulka životů: 4. úr., ODO 12
    expect(x.vitals.hpCurrent).toBe(c.vitals.hpCurrent); // aktuální se nemění
  });
  it('už naučený obor a specializace před 6. úrovní jsou zamčené', () => {
    const o = options(sampleKloi());
    expect(o.find((x) => x.id === 'alchymisticka_anatomie')?.disabled).toBe('už naučeno');
    expect(specOptions(sampleKloi(), emptyLevelUp()).find((x) => x.id === 'medicus')?.disabled).toBe('od 6. úrovně');
  });
  it('každá 3. úroveň: dva různé atributy +1', () => {
    const c = warrior(2);
    const st = { ...emptyLevelUp(), pick: { kind: 'ability' as const, id: 'skvela_kondice' }, attrs: ['odo', 'obr'] as ('odo' | 'obr')[] };
    expect(steps(c, st).some((s) => s.key === 'atributy')).toBe(true);
    const x = applyLevelUp(c, st);
    expect(x.attributes.odo).toBe(c.attributes.odo + 1);
    expect(x.attributeLog.at(-1)).toEqual({ level: 3, raised: ['odo', 'obr'] });
    expect(derive(x).characterPointsDue).toBe(0);
    expect(derive(x).hpMax.formula).toContain('skvela_kondice');
  });
  it('válečník: nabídka triků zahrnuje nově zvolenou školu, 1 trik (od 6. úr. 2)', () => {
    const c = warrior(1);
    const st = { ...emptyLevelUp(), pick: { kind: 'branch' as const, id: 'skola_boje_se_stitem' } };
    const pool = itemPool(c, st);
    expect(pool.some((p) => p.name === 'Zámek' && p.fresh)).toBe(true);
    expect(itemsToChoose(c)).toBe(1);
    expect(itemsToChoose(warrior(5))).toBe(2);
    expect(canNext(c, st, 'polozky')).toBe(false);
    expect(canNext(c, { ...st, items: ['Zámek'] }, 'polozky')).toBe(true);
  });
  it('dovednosti: max +1 stupeň za přestup, cena = cílový stupeň', () => {
    const c = warrior(1);
    const st = emptyLevelUp();
    expect(raiseCost(c, st, 'atletika')).toBe(4);
    const st2 = { ...st, raised: { atletika: 1 } };
    expect(raiseBlock(c, st2, 'atletika')).toBe('už zlepšeno');
    const x = applyLevelUp(c, { ...st2, pick: { kind: 'ability', id: 'urputnost' } });
    expect(x.skills.find((s) => s.id === 'atletika')?.rank).toBe(4);
    const d = derive(x);
    expect(d.skillPoints.earned).toBe(3 + 3 * 2);
    expect(d.skillPoints.spent).toBe(4);
  });
});

describe('Paměť na kouzla (H11, zpětná oprava H06)', () => {
  const mage = (level: number) => {
    const c = warrior(level);
    c.basic.classId = 'kouzelnik';
    return c;
  };
  const pickPamet = { ...emptyLevelUp(), pick: { kind: 'ability' as const, id: 'pamet_na_kouzla' } };
  it('bez schopnosti 2 kouzla za úroveň', () => expect(itemsToChoose(mage(1), emptyLevelUp())).toBe(2));
  it('zvolená při přestupu na 2. úroveň: +1 za 2. a +1 zpětně za 1. → 4', () => {
    expect(itemsToChoose(mage(1), pickPamet)).toBe(4);
  });
  it('zvolená na 4. úrovni: +4 (příklad z H06) → 6', () => {
    expect(itemsToChoose(mage(3), pickPamet)).toBe(6);
  });
  it('už naučená: 3 kouzla za každou další úroveň', () => {
    const c = mage(4);
    c.progression.learnedAbilities = [{ id: 'pamet_na_kouzla' }];
    expect(itemsToChoose(c, emptyLevelUp())).toBe(3);
  });
  it('krok Kouzla vyžaduje plný počet', () => {
    const c = mage(1);
    expect(canNext(c, { ...pickPamet, items: ['Blesk', 'Oheň'] }, 'polozky')).toBe(false);
    expect(canNext(c, { ...pickPamet, items: ['Blesk', 'Oheň', 'Světlo', 'Rychlost'] }, 'polozky')).toBe(true);
  });
});

describe('ostatní povolání – zisky ze schopností a větví', () => {
  const mk = (cls: 'hranicar' | 'alchymista' | 'zlodej' | 'valecnik', level = 3) => {
    const c = warrior(level);
    c.basic.classId = cls;
    return c;
  };
  const pick = (kind: 'ability' | 'branch', id: string) => ({ ...emptyLevelUp(), pick: { kind, id } });
  it('Hraničář: Průzkumnictví dá Kamufláž a Líčení pastí na 3. stupni zdarma', () => {
    const c = mk('hranicar');
    const st = pick('ability', 'pruzkumnictvi');
    expect(autoGains(c, st)).toEqual(['dovednost Kamufláž na 3. stupni', 'dovednost Líčení pastí na 3. stupni']);
    const x = applyLevelUp(c, st);
    expect(x.skills.filter((s) => ['kamuflaz', 'liceni_pasti'].includes(s.id)).map((s) => [s.rank, s.attribute, s.source])).toEqual([[3, 'obr', 'ability'], [3, 'obr', 'ability']]);
    expect(derive(x).skillPoints.available.value).toBe(derive(applyLevelUp(c, emptyLevelUp())).skillPoints.available.value);
  });
  it('Hraničář: Magie přírody +1 ke Znalosti přírody', () => {
    const c = mk('hranicar');
    c.skills.push({ id: 'znalost_prirody', customName: null, attribute: 'int', rank: 3, source: 'class-basic' });
    const before = derive(c).skills.find((s) => s.id === 'znalost_prirody')!.total;
    const x = applyLevelUp(c, pick('branch', 'magie_prirody'));
    expect(derive(x).skills.find((s) => s.id === 'znalost_prirody')!.total).toBe(before + 1);
  });
  it('Alchymista: Pokročilá identifikace (INT) na 3. stupni', () => {
    const x = applyLevelUp(mk('alchymista'), pick('ability', 'pokrocila_identifikace'));
    expect(x.skills.find((s) => s.id === 'pokrocila_identifikace')).toMatchObject({ rank: 3, attribute: 'int' });
  });
  it('Zloděj: umění dá 3 triky a dovednost Umění … na 3. stupni', () => {
    const c = mk('zlodej');
    const st = pick('branch', 'sarm');
    expect(autoGains(c, st)).toEqual(['dovednost Umění šarmu na 3. stupni', 'Odhad lidí', 'Odvedení pozornosti', 'Získání důvěry']);
    expect(applyLevelUp(c, st).skills.find((s) => s.id === 'umeni_sarmu')).toMatchObject({ rank: 3, attribute: 'char' });
  });
  it('Válečník: Mistrovství ve zbrani jde vzít znovu, jiné schopnosti ne', () => {
    const c = mk('valecnik');
    c.progression.learnedAbilities = [{ id: 'mistrovstvi_ve_zbrani' }, { id: 'rozvaznost' }];
    const o = options(c);
    expect(o.find((x) => x.id === 'mistrovstvi_ve_zbrani')?.disabled).toBeNull();
    expect(o.find((x) => x.id === 'rozvaznost')?.disabled).toBe('už naučeno');
  });
  it('schopnosti „za každou úroveň“ platí zpětně (Skvělá kondice, Osvícení)', () => {
    const v = mk('valecnik', 3);
    const a = derive(applyLevelUp(v, emptyLevelUp())).hpMax.value;
    expect(derive(applyLevelUp(v, pick('ability', 'skvela_kondice'))).hpMax.value).toBe(a + 3 * 4);
    const k = warrior(3);
    k.basic.classId = 'klerik';
    const m = derive(applyLevelUp(k, emptyLevelUp())).manaMax.value!;
    expect(derive(applyLevelUp(k, pick('ability', 'osviceni'))).manaMax.value).toBe(m + 2 * 4);
  });
});

describe('specializace jako samostatný krok (✔ U)', () => {
  const w5 = () => {
    const c = warrior(5);
    c.progression.learnedBranches = ['skola_boje_s_bodnou_zbrani'];
    return c;
  };
  it('na 6. úrovni je krok Specializace hned po Schopnosti', () => {
    const keys = steps(w5(), emptyLevelUp()).map((s) => s.key);
    expect(keys.slice(0, 3)).toEqual(['prehled', 'volba', 'specializace']);
    expect(steps(warrior(3), emptyLevelUp()).some((s) => s.key === 'specializace')).toBe(false);
  });
  it('specializace se v nabídce Schopnost už neobjevuje', () => {
    expect(options(w5()).some((o) => o.kind === 'spec')).toBe(false);
  });
  it('poslední prerekvizita zvolená na téže úrovni odemkne specializaci', () => {
    const c = w5();
    expect(specOptions(c, emptyLevelUp()).find((o) => o.id === 'sermir')?.disabled).toBe('splněno 1 z 2');
    const st = { ...emptyLevelUp(), pick: { kind: 'ability' as const, id: 'rozvaznost' } };
    expect(specOptions(c, st).find((o) => o.id === 'sermir')?.disabled).toBeNull();
    const x = applyLevelUp(c, { ...st, spec: 'sermir' });
    expect(x.progression.specialization).toBe('sermir');
    expect(x.progression.learnedAbilities.map((a) => a.id)).toContain('rozvaznost');
    expect(x.progression.levelUps.at(-1)?.choices.slice(0, 2)).toEqual([{ slot: 'ability', id: 'rozvaznost' }, { slot: 'spec', id: 'sermir' }]);
  });
  it('krok je nepovinný a po získání specializace zmizí', () => {
    const c = w5();
    expect(canNext(c, emptyLevelUp(), 'specializace')).toBe(true);
    c.progression.specialization = 'sermir';
    expect(steps(c, emptyLevelUp()).some((s) => s.key === 'specializace')).toBe(false);
  });
});
