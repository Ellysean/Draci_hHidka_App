// Souhrn schopností postavy (záložka Postava a tisk – Fáze 8).
import type { Character } from '../model/types';
import { progressionFor, progressionName } from '../progression/levelup';
import { LEVEL1, getRace } from './data';

/** [název, druh] – rodová, 1. úroveň, specializace, větve, schopnosti (se stupni a parametry), položky. */
export function abilityRows(c: Character): [string, string][] {
  const race = getRace(c.basic.raceId);
  const P = progressionFor(c.basic.classId);
  return [
    [race.ability.name, 'rodová'],
    ...LEVEL1[c.basic.classId].abilities.map((a): [string, string] => [a, '1. úroveň']),
    ...(c.progression.specialization ? [[progressionName(c.basic.classId, c.progression.specialization), 'specializace'] as [string, string]] : []),
    ...c.progression.learnedBranches.map((b): [string, string] => [progressionName(c.basic.classId, b), P.branchLabel.toLowerCase()]),
    ...[...new Set(c.progression.learnedAbilities.map((a) => a.id))].map((id): [string, string] => {
      const def = P.abilities.find((x) => x.id === id);
      const all = c.progression.learnedAbilities.filter((x) => x.id === id);
      // Cesty válečníka: stupeň I–IV (4 = Mistr); Mistrovství ve zbrani: vybrané skupiny zbraní.
      if (def?.ranks) return [`${progressionName(c.basic.classId, id)} ${['', 'I', 'II', 'III', 'IV'][Math.min(4, all.length)]}${all.length >= 4 ? ' · Mistr' : ''}`, 'cesta'];
      const params = def?.param ? all.map((x) => def.param!.options.find((o) => o.id === x.params?.[def.param!.key])?.name).filter(Boolean) : [];
      return [`${progressionName(c.basic.classId, id)}${params.length ? ` (${params.join(', ')})` : all.length > 1 ? ` ${all.length}×` : ''}`, 'schopnost'];
    }),
    ...c.progression.learnedItems.map((i): [string, string] => [i, P.itemWord]),
  ];
}
