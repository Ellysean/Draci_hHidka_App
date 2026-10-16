// Fáze 8 – záloha postavy: export do souboru, import ze souboru a automatické
// zálohy v prohlížeči (před importem, novou postavou, obnovou; poškozená data).
// Čistá logika bez DOM – stahování a výběr souboru řeší pages/Zaloha.tsx.
import { getClass, getRace } from '../rules/data';
import type { Character, ClassId, RaceId } from '../model/types';
import { browserStorage, SETTINGS_KEY, type StorageAdapter } from './localStore';
import { migrate, SchemaError } from './migrations';

/** Značka souboru zálohy – podle ní import pozná, že jde o deník DH. */
export const EXPORT_FORMAT = 'dh-denik/postava';
export const EXPORT_FORMAT_VERSION = 1;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  formatVersion: number;
  appVersion: string;
  exportedAt: string;
  /** Krátký popis pro člověka, který soubor otevře v editoru. */
  summary: string;
  character: Character;
}

export interface CharacterInfo {
  id: string;
  name: string;
  raceId: RaceId;
  classId: ClassId;
  level: number;
  experience: number;
  updatedAt: string;
}

export const characterInfo = (c: Character): CharacterInfo => ({
  id: c.id,
  name: c.basic.name,
  raceId: c.basic.raceId,
  classId: c.basic.classId,
  level: c.progression.level,
  experience: c.progression.experience,
  updatedAt: c.meta.updatedAt,
});

/** „Kloi · elf · alchymista · 3. úroveň“ */
export function describe(i: Pick<CharacterInfo, 'name' | 'raceId' | 'classId' | 'level'>): string {
  const race = getRace(i.raceId)?.name?.toLowerCase() ?? i.raceId;
  const cls = getClass(i.classId)?.name?.toLowerCase() ?? i.classId;
  return `${i.name || 'bez jména'} · ${race} · ${cls} · ${i.level}. úroveň`;
}

/** Je co ztratit? Prázdná výchozí postava (bez jména, nikdy neupravená) se nezálohuje. */
export const isBlank = (c: Character) =>
  !c.basic.name.trim() && c.progression.level <= 1 && c.progression.experience === 0 && c.meta.updatedAt === c.meta.createdAt;

export function exportPayload(c: Character, appVersion: string, now = new Date().toISOString()): ExportFile {
  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    appVersion,
    exportedAt: now,
    summary: describe(characterInfo(c)),
    character: c,
  };
}

export const exportJson = (c: Character, appVersion: string, now?: string) => JSON.stringify(exportPayload(c, appVersion, now), null, 2);

/** Jméno bez diakritiky a zvláštních znaků – bezpečné na Windows, Androidu i v e-mailu. */
export function slug(s: string): string {
  const out = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return out || 'postava';
}

/** DH-Kloi-u3-2026-10-03.json */
export function exportFileName(c: Character, now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `DH-${slug(c.basic.name)}-u${c.progression.level}-${d}.json`;
}

// ---------- import ----------

export type ImportResult =
  | { ok: true; character: Character; info: CharacterInfo; exportedAt: string | null; appVersion: string | null; warnings: string[] }
  | { ok: false; message: string };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Přečte soubor zálohy. Bere obálku exportu i „holou“ postavu (např. zkopírovanou
 * z localStorage). Projde migrací schématu – starší zálohy se doplní, novější odmítne.
 */
export function parseImport(text: string, current?: Character): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { ok: false, message: 'Soubor není platný JSON – nejde o zálohu deníku (nebo je poškozený).' };
  }
  if (!isObj(raw)) return { ok: false, message: 'Soubor neobsahuje postavu.' };

  let data: unknown = raw;
  let exportedAt: string | null = null;
  let appVersion: string | null = null;
  if ('format' in raw) {
    if (raw.format !== EXPORT_FORMAT) return { ok: false, message: 'Soubor je z jiné aplikace nebo jiného druhu zálohy, než je postava deníku.' };
    if (typeof raw.formatVersion === 'number' && raw.formatVersion > EXPORT_FORMAT_VERSION) {
      return { ok: false, message: 'Záloha je z novější verze appky. Aktualizuj appku a zkus to znovu.' };
    }
    data = raw.character;
    exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : null;
    appVersion = typeof raw.appVersion === 'string' ? raw.appVersion : null;
  } else if (!('basic' in raw) || !('schemaVersion' in raw)) {
    // Koncept z průvodce tvorbou nebo cokoli jiného
    return { ok: false, message: 'Soubor neobsahuje postavu deníku.' };
  }

  let character: Character;
  try {
    character = migrate(data);
  } catch (e) {
    return { ok: false, message: e instanceof SchemaError ? e.message : 'Postavu ze souboru nejde načíst – data jsou poškozená.' };
  }
  if (!isObj(character.basic) || typeof character.basic.name !== 'string' || !isObj(character.progression)) {
    return { ok: false, message: 'Postavu ze souboru nejde načíst – chybí základní údaje.' };
  }

  const warnings: string[] = [];
  if (current && !isBlank(current)) {
    if (current.id === character.id) {
      if (character.meta.updatedAt < current.meta.updatedAt) {
        warnings.push('Záloha je starší než postava v deníku – změny provedené od zálohy se ztratí.');
      }
    } else {
      warnings.push(`V deníku je jiná postava (${current.basic.name || 'bez jména'}). Import ji nahradí.`);
    }
  }
  return { ok: true, character, info: characterInfo(character), exportedAt, appVersion, warnings };
}

// ---------- automatické zálohy v prohlížeči ----------

export const SNAPSHOTS_KEY = 'dh-denik/zalohy';
export const MAX_SNAPSHOTS = 6;

export type SnapshotReason = 'import' | 'nova' | 'ukazka' | 'obnova' | 'poskozena';

export const SNAPSHOT_REASON: Record<SnapshotReason, string> = {
  import: 'před importem',
  nova: 'před novou postavou',
  ukazka: 'před načtením ukázky',
  obnova: 'před obnovením zálohy',
  poskozena: 'poškozená data (nešla načíst)',
};

export interface Snapshot {
  uid: string;
  at: string;
  reason: SnapshotReason;
  /** Popis postavy; u poškozených dat null. */
  info: CharacterInfo | null;
  /** Postava jako JSON (u poškozených dat původní text). */
  data: string;
}

export function listSnapshots(storage: StorageAdapter = browserStorage): Snapshot[] {
  const raw = storage.read(SNAPSHOTS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr.filter((x) => isObj(x) && typeof x.data === 'string') as Snapshot[]) : [];
  } catch {
    return [];
  }
}

function writeSnapshots(list: Snapshot[], storage: StorageAdapter): boolean {
  // Plné úložiště: zahazovat nejstarší, dokud se nevejde.
  for (let n = list.length; n >= 0; n--) {
    try {
      if (n === 0) storage.remove(SNAPSHOTS_KEY);
      else storage.write(SNAPSHOTS_KEY, JSON.stringify(list.slice(0, n)));
      return n === list.length;
    } catch {
      /* zkusit menší seznam */
    }
  }
  return false;
}

const newUid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Uloží zálohu postavy (nejnovější první, nejvýš MAX_SNAPSHOTS). Prázdnou postavu přeskočí. */
export function addSnapshot(c: Character, reason: SnapshotReason, storage: StorageAdapter = browserStorage, now = new Date().toISOString()): Snapshot | null {
  if (isBlank(c)) return null;
  const snap: Snapshot = { uid: newUid(), at: now, reason, info: characterInfo(c), data: JSON.stringify(c) };
  writeSnapshots([snap, ...listSnapshots(storage)].slice(0, MAX_SNAPSHOTS), storage);
  return snap;
}

/** Záloha nečitelných dat (store při spuštění) – aby šla aspoň stáhnout. */
export function addRawSnapshot(raw: string, storage: StorageAdapter = browserStorage, now = new Date().toISOString()) {
  const snap: Snapshot = { uid: newUid(), at: now, reason: 'poskozena', info: null, data: raw };
  writeSnapshots([snap, ...listSnapshots(storage)].slice(0, MAX_SNAPSHOTS), storage);
}

export function removeSnapshot(uid: string, storage: StorageAdapter = browserStorage) {
  writeSnapshots(listSnapshots(storage).filter((s) => s.uid !== uid), storage);
}

/** Postava ze zálohy, nebo chybová hláška (poškozená data). */
export function restoreSnapshot(s: Snapshot): ImportResult {
  return parseImport(s.data);
}

// ---------- nastavení: kdy byla poslední záloha ----------

export interface BackupSettings {
  lastExportAt: string | null;
  lastExportCharId: string | null;
}

export function loadSettings(storage: StorageAdapter = browserStorage): BackupSettings {
  try {
    const s = JSON.parse(storage.read(SETTINGS_KEY) ?? '{}');
    return { lastExportAt: s.lastExportAt ?? null, lastExportCharId: s.lastExportCharId ?? null };
  } catch {
    return { lastExportAt: null, lastExportCharId: null };
  }
}

export function markExported(c: Character, storage: StorageAdapter = browserStorage, now = new Date().toISOString()) {
  let prev: Record<string, unknown> = {};
  try { prev = JSON.parse(storage.read(SETTINGS_KEY) ?? '{}'); } catch { /* nic */ }
  try { storage.write(SETTINGS_KEY, JSON.stringify({ ...prev, lastExportAt: now, lastExportCharId: c.id })); } catch { /* nic */ }
}

/** Kolik dní uběhlo od poslední zálohy této postavy (null = ještě nikdy). */
export function daysSinceExport(c: Character, s: BackupSettings, now = new Date()): number | null {
  if (!s.lastExportAt || s.lastExportCharId !== c.id) return null;
  return Math.max(0, Math.floor((now.getTime() - new Date(s.lastExportAt).getTime()) / 86_400_000));
}

/** „dnes“, „včera“, „před 3 dny“, „před 12 dny“ */
export function agoText(days: number): string {
  if (days <= 0) return 'dnes';
  if (days === 1) return 'včera';
  return `před ${days} dny`;
}
