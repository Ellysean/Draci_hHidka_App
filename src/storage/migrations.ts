// Migrace uložené postavy mezi verzemi schématu (docs/DATA_MODEL.md, sekce E).
// Každá migrace převede data z verze N na N+1. Import z vyšší verze appka odmítne.
import { emptyAlchemist, emptyCleric, emptyCompanion, emptyThief, emptyWarrior, emptyWizard, newCharacter } from '../model/defaults';
import type { Character } from '../model/types';
import { CURRENT_SCHEMA_VERSION } from './schema';

type AnyObj = Record<string, unknown>;

/** MIGRATIONS[n] převádí verzi n → n+1. Zatím prázdné (schéma v1). */
export const MIGRATIONS: Record<number, (data: AnyObj) => AnyObj> = {
  // 1: (d) => ({ ...d, schemaVersion: 2, novePole: ... }),
};

export class SchemaError extends Error {}

const isObj = (x: unknown): x is AnyObj => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Doplní chybějící klíče z výchozí postavy (hluboce u objektů, pole bere z dat). */
function fillDefaults<T>(defaults: T, data: unknown): T {
  if (!isObj(defaults) || !isObj(data)) return (data === undefined ? defaults : data) as T;
  const out: AnyObj = { ...data };
  for (const [k, v] of Object.entries(defaults)) {
    out[k] = k in data ? fillDefaults(v, data[k]) : v;
  }
  return out as T;
}

export function migrate(raw: unknown): Character {
  if (!isObj(raw)) throw new SchemaError('Soubor neobsahuje postavu.');
  let version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : NaN;
  if (!Number.isInteger(version) || version < 1) throw new SchemaError('Neznámá verze dat postavy.');
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new SchemaError(`Postava je z novější verze appky (schéma ${version}, appka umí ${CURRENT_SCHEMA_VERSION}). Aktualizuj appku.`);
  }
  let data: AnyObj = raw;
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new SchemaError(`Chybí migrace ze schématu ${version}.`);
    data = step(data);
    version += 1;
  }
  const filled = fillDefaults(newCharacter(), data);
  // Stav povolání se ve výchozí postavě nevyskytuje (je null) – doplnit nová pole alchymisty zvlášť.
  if (filled.classState.alchymista) filled.classState.alchymista = fillDefaults(emptyAlchemist(), filled.classState.alchymista);
  if (filled.classState.valecnik) filled.classState.valecnik = fillDefaults(emptyWarrior(), filled.classState.valecnik);
  if (filled.classState.kouzelnik) filled.classState.kouzelnik = fillDefaults(emptyWizard(), filled.classState.kouzelnik);
  if (filled.classState.klerik) {
    const { activeAura: _old, ...rest } = filled.classState.klerik as unknown as Record<string, unknown>;
    filled.classState.klerik = fillDefaults(emptyCleric(), rest);
  }
  // Zloděj (7e): starší `{}` doplnit na stav zloděje.
  if (filled.classState.zlodej) filled.classState.zlodej = fillDefaults(emptyThief(), filled.classState.zlodej);
  else if (filled.basic.classId === 'zlodej') filled.classState.zlodej = emptyThief();
  // Přátelé (7c+): starší záznamy doplnit na nový tvar (stav, hodnoty druhu, růst…).
  filled.companions = (Array.isArray(filled.companions) ? filled.companions : []).map((x) => fillDefaults(emptyCompanion(), x));
  filled.schemaVersion = CURRENT_SCHEMA_VERSION;
  return filled;
}
