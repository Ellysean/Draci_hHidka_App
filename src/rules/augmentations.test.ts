// Augmentace na postavě (PPP03) – zaškrtnuté efekty v derive.
import { describe, expect, it } from 'vitest';
import { sampleKloi } from '../model/sample';
import { migrate } from '../storage/migrations';
import { toggleAugmentation } from './augmentations';
import { derive } from './derive';

describe('augmentace na postavě', () => {
  it('bez zaškrtnutí nic nemění, stará data dostanou prázdný seznam', () => {
    const c = sampleKloi();
    const { augmentations: _a, ...old } = c;
    expect(migrate(old).augmentations).toEqual([]);
    const d = derive(c);
    expect(d.attributes.char.value).toBe(11);
  });
  it('Umělá paže: SIL 26 (+8), CHAR −7', () => {
    const c = toggleAugmentation(sampleKloi(), 'umela_paze', true);
    const d = derive(c);
    expect(d.attributes.sil.value).toBe(26);
    expect(d.mods.sil).toBe(8);
    expect(d.attributes.char.value).toBe(4);
  });
  it('Charisma nikdy pod 1, Druhý mozek INT +5', () => {
    let c = toggleAugmentation(sampleKloi(), 'druhy_mozek', true);
    c = toggleAugmentation(c, 'exoskelet', true);
    const base = derive(sampleKloi());
    const d = derive(c);
    expect(d.attributes.char.value).toBe(1);
    expect(d.mods.char).toBe(-5);
    expect(d.attributes.int.value).toBe(20);
    expect(d.defenseBase.value).toBe(base.defenseBase.value + 3);
  });
  it('Druhé srdce +⅓ životů, Umělá noha pohyblivost ×2, vypnutí vrátí hodnoty', () => {
    const base = derive(sampleKloi());
    let c = toggleAugmentation(sampleKloi(), 'druhe_srdce', true);
    c = toggleAugmentation(c, 'umela_noha', true);
    const d = derive(c);
    expect(d.hpMax.value).toBe(base.hpMax.value + Math.ceil(base.hpMax.value / 3));
    expect(d.mobility.value).toBe(base.mobility.value * 2);
    c = toggleAugmentation(toggleAugmentation(c, 'druhe_srdce', false), 'umela_noha', false);
    expect(derive(c).hpMax.value).toBe(base.hpMax.value);
    expect(c.augmentations).toEqual([]);
  });
});
