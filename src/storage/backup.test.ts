import { describe as group, expect, it } from 'vitest';
import { newCharacter } from '../model/defaults';
import { sampleKloi } from '../model/sample';
import {
  addRawSnapshot, addSnapshot, daysSinceExport, describe, EXPORT_FORMAT, exportFileName, exportJson, isBlank, listSnapshots,
  loadSettings, markExported, MAX_SNAPSHOTS, parseImport, removeSnapshot, restoreSnapshot, slug,
} from './backup';
import type { StorageAdapter } from './localStore';
import { CURRENT_SCHEMA_VERSION } from './schema';

const memory = (): StorageAdapter & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, read: (k) => data.get(k) ?? null, write: (k, v) => void data.set(k, v), remove: (k) => void data.delete(k) };
};

group('export', () => {
  it('obálka nese značku, verzi appky, souhrn a celou postavu', () => {
    const c = sampleKloi();
    const f = JSON.parse(exportJson(c, '0.14.0', '2026-10-03T10:00:00.000Z'));
    expect(f.format).toBe(EXPORT_FORMAT);
    expect(f.appVersion).toBe('0.14.0');
    expect(f.summary).toBe('Kloi z Mlžného brodu · gnóm · alchymista · 3. úroveň');
    expect(f.character).toEqual(c);
  });
  it('název souboru bez diakritiky s úrovní a datem', () => {
    expect(exportFileName(sampleKloi(), new Date(2026, 9, 3))).toBe('DH-Kloi-z-Mlzneho-brodu-u3-2026-10-03.json');
    expect(exportFileName(newCharacter(), new Date(2026, 0, 5))).toBe('DH-postava-u1-2026-01-05.json');
    expect(slug('Žluťoučký kůň / Ďábel!')).toBe('Zlutoucky-kun-Dabel');
  });
});

group('import', () => {
  it('export → import je beze ztráty', () => {
    const c = sampleKloi();
    const r = parseImport(exportJson(c, '0.14.0'));
    expect(r.ok && r.character).toEqual(c);
    expect(r.ok && r.appVersion).toBe('0.14.0');
  });
  it('bere i holou postavu (zkopírovanou z prohlížeče) a soubor s BOM', () => {
    const c = sampleKloi();
    expect(parseImport(JSON.stringify(c)).ok).toBe(true);
    expect(parseImport('﻿' + exportJson(c, 'x')).ok).toBe(true);
  });
  it('starší záloha bez nových polí se doplní z výchozí postavy', () => {
    const c = sampleKloi() as unknown as Record<string, unknown>;
    delete c.companions;
    delete c.play;
    const r = parseImport(JSON.stringify({ format: EXPORT_FORMAT, formatVersion: 1, character: c }));
    expect(r.ok && r.character.companions).toEqual([]);
    expect(r.ok && r.character.play.log).toEqual([]);
  });
  it('odmítne nesmysly s lidskou hláškou', () => {
    const bad = (t: string) => { const r = parseImport(t); return r.ok ? '' : r.message; };
    expect(bad('{nejde')).toMatch(/JSON/);
    expect(bad('[1,2]')).toMatch(/neobsahuje/);
    expect(bad('{"step":3,"name":"koncept"}')).toMatch(/neobsahuje postavu/);
    expect(bad(JSON.stringify({ format: 'jina-appka', character: {} }))).toMatch(/jiné aplikace/);
    expect(bad(JSON.stringify({ format: EXPORT_FORMAT, formatVersion: 99, character: {} }))).toMatch(/novější/);
    expect(bad(JSON.stringify({ ...newCharacter(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 }))).toMatch(/novější verze/);
  });
  it('varuje před nahrazením jiné postavy a před starší zálohou téže postavy', () => {
    const cur = sampleKloi();
    const other = { ...newCharacter(), basic: { ...newCharacter().basic, name: 'Thorgil' } };
    const r1 = parseImport(exportJson(other, 'x'), cur);
    expect(r1.ok && r1.warnings.join()).toMatch(/jiná postava \(Kloi/);
    const older = { ...cur, meta: { ...cur.meta, updatedAt: '2000-01-01T00:00:00.000Z' } };
    const r2 = parseImport(exportJson(older, 'x'), cur);
    expect(r2.ok && r2.warnings.join()).toMatch(/starší/);
    // Prázdný deník = bez varování
    expect(parseImport(exportJson(other, 'x'), newCharacter()).ok && parseImport(exportJson(other, 'x'), newCharacter())).toMatchObject({ warnings: [] });
  });
});

group('zálohy v prohlížeči', () => {
  it('prázdná postava se nezálohuje, rozehraná ano', () => {
    const s = memory();
    expect(isBlank(newCharacter())).toBe(true);
    expect(addSnapshot(newCharacter(), 'import', s)).toBeNull();
    expect(addSnapshot(sampleKloi(), 'import', s)).not.toBeNull();
    expect(listSnapshots(s)).toHaveLength(1);
  });
  it(`drží nejvýš ${MAX_SNAPSHOTS} nejnovějších, obnova a smazání`, () => {
    const s = memory();
    for (let i = 0; i < MAX_SNAPSHOTS + 2; i++) {
      const c = sampleKloi();
      c.progression.experience = i;
      addSnapshot(c, 'nova', s, `2026-10-0${1 + (i % 9)}T00:00:00Z`);
    }
    const list = listSnapshots(s);
    expect(list).toHaveLength(MAX_SNAPSHOTS);
    expect(list[0].info?.experience).toBe(MAX_SNAPSHOTS + 1);
    const r = restoreSnapshot(list[0]);
    expect(r.ok && r.character.progression.experience).toBe(MAX_SNAPSHOTS + 1);
    removeSnapshot(list[0].uid, s);
    expect(listSnapshots(s)).toHaveLength(MAX_SNAPSHOTS - 1);
  });
  it('poškozená data se uloží jako text a obnova vrátí chybu', () => {
    const s = memory();
    addRawSnapshot('{rozbité', s);
    const [snap] = listSnapshots(s);
    expect(snap.info).toBeNull();
    expect(restoreSnapshot(snap).ok).toBe(false);
  });
  it('plné úložiště: zahodí nejstarší, aby se nová záloha vešla', () => {
    const data = new Map<string, string>();
    const limit = JSON.stringify([1]).length + JSON.stringify(sampleKloi()).length * 2.6; // místo zhruba na 2 zálohy
    const s: StorageAdapter = {
      read: (k) => data.get(k) ?? null,
      write: (k, v) => { if (v.length > limit) throw new Error('QuotaExceeded'); data.set(k, v); },
      remove: (k) => void data.delete(k),
    };
    for (let i = 0; i < 4; i++) addSnapshot(sampleKloi(), 'import', s);
    const n = listSnapshots(s).length;
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThan(4);
  });
});

group('poslední záloha', () => {
  it('počítá dny jen pro tutéž postavu', () => {
    const s = memory();
    const c = sampleKloi();
    expect(daysSinceExport(c, loadSettings(s))).toBeNull();
    markExported(c, s, '2026-10-01T08:00:00Z');
    expect(daysSinceExport(c, loadSettings(s), new Date('2026-10-03T09:00:00Z'))).toBe(2);
    expect(daysSinceExport(newCharacter(), loadSettings(s))).toBeNull();
  });
  it('popis postavy', () => {
    expect(describe({ name: '', raceId: 'elf', classId: 'kouzelnik', level: 6 })).toBe('bez jména · elf · kouzelník · 6. úroveň');
  });
});
