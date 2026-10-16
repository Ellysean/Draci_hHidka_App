// Jediný zdroj pravdy: stav = uložená postava. Vše odvozené počítá derive().
import { emptyClassState, newCharacter } from '../model/defaults';
import type { Character, ClassId } from '../model/types';

export type Path = readonly (string | number)[];

export type Action =
  | { type: 'set'; path: Path; value: unknown }
  | { type: 'update'; fn: (c: Character) => Character }
  | { type: 'setClass'; classId: ClassId }
  | { type: 'replace'; character: Character }
  | { type: 'new' };

/** Neměnné nastavení hodnoty v zanořené struktuře. */
export function setIn<T>(obj: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  const src = (obj ?? (typeof head === 'number' ? [] : {})) as Record<string | number, unknown>;
  const next = setIn(src[head], rest, value);
  if (Object.is(next, src[head])) return obj;
  if (Array.isArray(src)) {
    const copy = src.slice();
    copy[head as number] = next;
    return copy as T;
  }
  return { ...src, [head]: next } as T;
}

const touch = (c: Character, now: string): Character => ({ ...c, meta: { ...c.meta, updatedAt: now } });

export function reducer(state: Character, action: Action, now = new Date().toISOString()): Character {
  switch (action.type) {
    case 'set': {
      const next = setIn(state, action.path, action.value);
      return next === state ? state : touch(next, now);
    }
    case 'update':
      return touch(action.fn(state), now);
    case 'setClass':
      if (state.basic.classId === action.classId) return state;
      return touch({ ...state, basic: { ...state.basic, classId: action.classId }, classState: emptyClassState(action.classId) }, now);
    case 'replace':
      return action.character;
    case 'new':
      return newCharacter(now);
  }
}
