import { describe, expect, it } from 'vitest';
import { newCharacter } from '../model/defaults';
import { sampleKloi } from '../model/sample';
import { migrate, SchemaError } from './migrations';
import { loadCharacter, saveCharacter, STORAGE_KEY, type StorageAdapter } from './localStore';
import { CURRENT_SCHEMA_VERSION } from './schema';

const memory = (): StorageAdapter & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, read: (k) => data.get(k) ?? null, write: (k, v) => void data.set(k, v), remove: (k) => void data.delete(k) };
};

describe('úložiště', () => {
  it('prázdné úložiště', () => expect(loadCharacter(memory()).status).toBe('empty'));
  it('uložení a načtení je beze ztráty', () => {
    const s = memory();
    const c = sampleKloi();
    expect(saveCharacter(c, s)).toBeNull();
    const r = loadCharacter(s);
    expect(r.status === 'ok' && r.character).toEqual(c);
  });
  it('poškozená data vrátí chybu i s původním obsahem', () => {
    const s = memory();
    s.data.set(STORAGE_KEY, '{nejde');
    const r = loadCharacter(s);
    expect(r.status).toBe('error');
  });
  it('plné úložiště vrátí hlášku místo pádu', () => {
    const s: StorageAdapter = { read: () => null, write: () => { throw new Error('QuotaExceeded'); }, remove: () => {} };
    expect(saveCharacter(newCharacter(), s)).toMatch(/nepodařilo/);
  });
});

describe('migrace schématu', () => {
  it('odmítne data z novější verze appky', () => {
    expect(() => migrate({ ...newCharacter(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 })).toThrow(SchemaError);
  });
  it('odmítne data bez verze', () => expect(() => migrate({ basic: {} })).toThrow(SchemaError));
  it('doplní chybějící pole z výchozí postavy', () => {
    const c = newCharacter() as unknown as Record<string, unknown>;
    delete c.companions;
    delete (c.vitals as Record<string, unknown>).conditions;
    const m = migrate(c);
    expect(m.companions).toEqual([]);
    expect(m.vitals.conditions).toEqual([]);
  });
});
