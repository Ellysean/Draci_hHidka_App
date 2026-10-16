import { describe, expect, it } from 'vitest';
import { newCharacter } from '../model/defaults';
import { reducer, setIn } from './reducer';

describe('reducer', () => {
  it('setIn je neměnné a sdílí nezměněné větve', () => {
    const a = { x: { y: 1 }, z: { w: 2 } };
    const b = setIn(a, ['x', 'y'], 5);
    expect(b).toEqual({ x: { y: 5 }, z: { w: 2 } });
    expect(a.x.y).toBe(1);
    expect(b.z).toBe(a.z);
    expect(setIn(a, ['x', 'y'], 1)).toBe(a);
  });
  it('set mění hodnotu a aktualizuje updatedAt', () => {
    const c = newCharacter('2026-01-01T00:00:00.000Z');
    const n = reducer(c, { type: 'set', path: ['attributes', 'sil'], value: 14 }, '2026-02-02T00:00:00.000Z');
    expect(n.attributes.sil).toBe(14);
    expect(n.meta.updatedAt).toBe('2026-02-02T00:00:00.000Z');
  });
  it('změna povolání vymění blok classState', () => {
    const c = newCharacter();
    const n = reducer(c, { type: 'setClass', classId: 'alchymista' });
    expect(n.classState.valecnik).toBeNull();
    expect(n.classState.alchymista?.materialsCurrent).toBe(0);
  });
});
