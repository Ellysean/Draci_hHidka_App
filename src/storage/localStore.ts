// Lokální úložiště postavy (bez účtu, bez serveru). Adaptér jde později vyměnit
// za IndexedDB nebo Capacitor Preferences (Fáze 10) bez zásahu do zbytku appky.
import type { Character } from '../model/types';
import { migrate, SchemaError } from './migrations';

export interface StorageAdapter {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export const STORAGE_KEY = 'dh-denik/postava';
export const SETTINGS_KEY = 'dh-denik/nastaveni';

export const browserStorage: StorageAdapter = {
  read: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  write: (k, v) => { localStorage.setItem(k, v); },
  remove: (k) => { try { localStorage.removeItem(k); } catch { /* nic */ } },
};

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; character: Character }
  | { status: 'error'; message: string; raw: string };

export function loadCharacter(storage: StorageAdapter = browserStorage): LoadResult {
  const raw = storage.read(STORAGE_KEY);
  if (!raw) return { status: 'empty' };
  try {
    return { status: 'ok', character: migrate(JSON.parse(raw)) };
  } catch (e) {
    const message = e instanceof SchemaError ? e.message : 'Uložená postava je poškozená a nejde načíst.';
    return { status: 'error', message, raw };
  }
}

/** Vrací chybovou hlášku, nebo null při úspěchu (např. plné úložiště). */
export function saveCharacter(c: Character, storage: StorageAdapter = browserStorage): string | null {
  try {
    storage.write(STORAGE_KEY, JSON.stringify(c));
    return null;
  } catch {
    return 'Postavu se nepodařilo uložit – úložiště prohlížeče je plné nebo zakázané.';
  }
}

/** Záloha poškozených dat, aby se při založení nové postavy nic neztratilo. */
export function backupRaw(raw: string, storage: StorageAdapter = browserStorage) {
  try { storage.write(`${STORAGE_KEY}/zaloha-${Date.now()}`, raw); } catch { /* nic */ }
}

// ---------- vrácení posledního přestupu ----------
// Stav postavy před posledním přestupem (jen v tomhle prohlížeči, není součástí exportu).
export const BEFORE_LEVELUP_KEY = 'dh-denik/pred-prestupem';

export function saveBeforeLevelUp(c: Character, storage: StorageAdapter = browserStorage) {
  try { storage.write(BEFORE_LEVELUP_KEY, JSON.stringify(c)); } catch { /* bez možnosti vrácení */ }
}

/** Postava před posledním přestupem, pokud patří k aktuální postavě a úrovni. */
export function loadBeforeLevelUp(current: Character, storage: StorageAdapter = browserStorage): Character | null {
  const raw = storage.read(BEFORE_LEVELUP_KEY);
  if (!raw) return null;
  try {
    const c = migrate(JSON.parse(raw));
    return c.id === current.id && c.progression.level === current.progression.level - 1 ? c : null;
  } catch { return null; }
}

export const clearBeforeLevelUp = (storage: StorageAdapter = browserStorage) => storage.remove(BEFORE_LEVELUP_KEY);
