// Ukázková postava Kloi (gnómská alchymistka, příklady z H10) – pro náhled a testy výpočtů.
import { emptyClassState, newCharacter } from './defaults';
import type { Character } from './types';
import { startingBases } from '../rules/alchemy';

export function sampleKloi(): Character {
  const c = newCharacter();
  c.basic = { ...c.basic, name: 'Kloi z Mlžného brodu', raceId: 'gnom', classId: 'alchymista' };
  c.attributes = { sil: 9, obr: 16, odo: 12, int: 15, char: 11 };
  c.progression.level = 3;
  c.progression.experience = 1300;
  c.progression.learnedBranches = ['alchymisticka_anatomie'];
  c.classState = emptyClassState('alchymista');
  c.classState.alchymista!.materialsCurrent = 440;
  c.classState.alchymista!.bases = [
    ...startingBases(),
    { uid: 'b1', name: 'stříbrný prach', qty: 1, weightLb: 0.1 },
    { uid: 'b2', name: 'vlčí mor', qty: 2, weightLb: 0.1 },
  ];
  c.vitals.hpCurrent = 14;
  c.vitals.manaCurrent = 156;
  c.skills = [
    { id: 'mechanika', customName: null, attribute: 'obr', rank: 3, source: 'class-basic' },
    { id: 'vzdelani', customName: null, attribute: 'int', rank: 3, source: 'class-basic' },
    { id: 'znalost_prirody', customName: null, attribute: 'int', rank: 3, source: 'class-basic' },
    { id: 'prace_s_manou', customName: null, attribute: 'int', rank: 3, source: 'class-profession' },
    { id: 'lucba', customName: null, attribute: 'obr', rank: 4, source: 'class-profession' },
    { id: 'postreh', customName: null, attribute: 'int', rank: 1, source: 'bought' },
  ];
  c.skillLog = [
    { level: 1, skillId: 'postreh', from: 0, to: 1, cost: 1 },
    { level: 2, skillId: 'lucba', from: 3, to: 4, cost: 4 },
  ];
  c.equipment.weapons = [
    { uid: 'w1', itemId: 'jednorucni_dyka', custom: null, grip: 'one-handed', equipped: true, weightLb: null },
    { uid: 'w2', itemId: 'strelne_lehka_kuse', custom: null, grip: 'two-handed', equipped: true, weightLb: null },
  ];
  c.equipment.armor = { itemId: 'zbroj_prosivana', custom: null, equipped: true, weightLb: null };
  c.equipment.money = { gold: 12, silver: 4, copper: 30 };
  c.equipment.items = [
    { uid: 'i1', name: 'Alchymistická truhla', itemId: 'alchymisticka_truhla_zakladni', qty: 1, weightLb: 3, carried: true, container: null },
    { uid: 'i2', name: 'Deka', itemId: 'deka', qty: 1, weightLb: 2, carried: true, container: null },
    { uid: 'i3', name: 'Měch na vodu', itemId: 'mech_na_vodu', qty: 1, weightLb: 1, carried: true, container: null },
  ];
  c.basic.notes = 'Dlužím cechu v Brodu 5 zl za pronájem dílny.\nBratr Tobiáš – poslední zpráva z Hraničních hor.';
  c.notesSections.experiences = [{ text: 'Přežila zával ve štole', impact: 'Bojí se úzkých prostor' }];
  return c;
}
