// Augmentace na postavě (PPP03, Medicus – Biologická a Mechanická augmentace). Hráč zaškrtne, které má postava
// aktivní, a derive promítne číselné efekty (atributy, ZO, životy, pohyblivost); zbytek je poznámka.
import type { Character } from '../model/types';
import type { Effect } from './data';

export interface AugmentationDef {
  id: string;
  name: string;
  kind: 'bio' | 'mech';
  /** Přičítané efekty (stejný mechanismus jako schopnosti). */
  effects: Effect[];
  /** Snížení základu Charismatu (výsledek nikdy pod 1). */
  charLoss: number;
  /** Síla nejméně na této hodnotě (Umělá paže 26). */
  silAtLeast?: number;
  /** Max. životy + třetina (Druhé srdce). */
  hpThird?: boolean;
  /** Pohyblivost ×2 (Umělá noha). */
  mobilityX2?: boolean;
  note: string;
}

export const AUGMENTATIONS: AugmentationDef[] = [
  { id: 'druhy_mozek', name: 'Druhý mozek', kind: 'bio', effects: [{ target: 'attr:int', op: 'add', value: 5 }], charLoss: 10, note: 'bdělý spánek – stačí 3 hodiny denně a vnímá okolí' },
  { id: 'druhe_srdce', name: 'Druhé srdce', kind: 'bio', effects: [], charLoss: 0, hpThird: true, note: 'Výdrž ×2; při fatálním zranění jednoho srdce se vše vrátí na předchozí úroveň; viditelná jizva = CHAR −1 (ručně)' },
  { id: 'vili_kridla', name: 'Vílí křídla', kind: 'bio', effects: [], charLoss: 5, note: 'létání (po měsíci rekonvalescence)' },
  { id: 'zabra', name: 'Žábra', kind: 'bio', effects: [], charLoss: 5, note: 'dýchání pod vodou; denně aspoň směnu ve vodě, jinak přestanou fungovat' },
  { id: 'exoskelet', name: 'Exoskelet', kind: 'mech', effects: [{ target: 'defenseBase', op: 'add', value: 3 }], charLoss: 10, note: 'útok navíc v každém kole; úchyty jako Univerzální nosič' },
  { id: 'mechanicke_oko', name: 'Mechanické oko', kind: 'mech', effects: [], charLoss: 5, note: 'vidí v noci jako ve dne, tepelná stopa, dohled jako elfí zrak' },
  { id: 'umela_noha', name: 'Umělá noha', kind: 'mech', effects: [], charLoss: 2, mobilityX2: true, note: 'skok 2× výš (platí už s jednou nohou)' },
  { id: 'umela_paze', name: 'Umělá paže', kind: 'mech', effects: [], charLoss: 7, silAtLeast: 26, note: 'útok navíc v každém kole; Nevýhoda −5 k jemné mechanice a střelbě' },
];

export const augmentationById = (id: string) => AUGMENTATIONS.find((a) => a.id === id);
export const activeAugmentations = (c: Character): AugmentationDef[] =>
  (c.augmentations ?? []).map(augmentationById).filter((a): a is AugmentationDef => !!a);

/** Efekty pro derive (atributy, ZO…) včetně snížení Charismatu. */
export const augmentationEffects = (c: Character): { source: string; effect: Effect }[] =>
  activeAugmentations(c).flatMap((a) => [
    ...a.effects.map((effect) => ({ source: a.name, effect })),
    ...(a.charLoss ? [{ source: a.name, effect: { target: 'attr:char', op: 'add' as const, value: -a.charLoss } }] : []),
  ]);

export const toggleAugmentation = (c: Character, id: string, on: boolean): Character => {
  const list = (c.augmentations ?? []).filter((x) => x !== id);
  return { ...c, augmentations: on ? [...list, id] : list };
};
