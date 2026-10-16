import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { Character } from '../model/types';
import { derive, type Derived } from '../rules/derive';
import { backupRaw, browserStorage, clearBeforeLevelUp, loadCharacter, saveCharacter, type StorageAdapter } from '../storage/localStore';
import { addRawSnapshot, addSnapshot, type SnapshotReason } from '../storage/backup';
import { newCharacter } from '../model/defaults';
import { reducer, type Action, type Path } from './reducer';

interface Store {
  character: Character;
  derived: Derived;
  dispatch: (a: Action) => void;
  set: (path: Path, value: unknown) => void;
  /** Hláška o problému s úložištěm (načtení/uložení), nebo null. */
  storageMessage: string | null;
  dismissStorageMessage: () => void;
  /** Nahradí postavu (import, nová postava, ukázka, obnova) – předtím ji zazálohuje v prohlížeči. */
  replaceWith: (next: Character, reason: SnapshotReason) => void;
  /** Úložiště (záloha, nastavení) – v testech paměťové. */
  storage: StorageAdapter;
}

const Ctx = createContext<Store | null>(null);

const SAVE_DELAY_MS = 400;

function init(storage: StorageAdapter): { character: Character; message: string | null } {
  const r = loadCharacter(storage);
  if (r.status === 'ok') return { character: r.character, message: null };
  if (r.status === 'error') {
    backupRaw(r.raw, storage);
    addRawSnapshot(r.raw, storage);
    return { character: newCharacter(), message: `${r.message} Původní data jsou zazálohovaná v prohlížeči.` };
  }
  return { character: newCharacter(), message: null };
}

export function CharacterProvider({ children, storage = browserStorage }: { children: ReactNode; storage?: StorageAdapter }) {
  const [boot] = useState(() => init(storage));
  const [character, dispatchRaw] = useReducer((s: Character, a: Action) => reducer(s, a), boot.character);
  const [storageMessage, setStorageMessage] = useState<string | null>(boot.message);
  const derived = useMemo(() => derive(character), [character]);

  // --- auto-ukládání s krátkým zpožděním + okamžitě při skrytí stránky ---
  const latest = useRef(character);
  const dirty = useRef(false);
  const first = useRef(true);
  const flush = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    const err = saveCharacter(latest.current, storage);
    if (err) setStorageMessage(err);
  }, [storage]);

  useEffect(() => {
    latest.current = character;
    if (first.current) { first.current = false; return; }
    dirty.current = true;
    const t = setTimeout(flush, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [character, flush]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onHide); };
  }, [flush]);

  const set = useCallback((path: Path, value: unknown) => dispatchRaw({ type: 'set', path, value }), []);
  const replaceWith = useCallback((next: Character, reason: SnapshotReason) => {
    addSnapshot(latest.current, reason, storage);
    // Vrácení posledního přestupu patří k předchozí postavě.
    clearBeforeLevelUp(storage);
    dispatchRaw({ type: 'replace', character: next });
    // Uložit hned – nečekat na zpoždění (import je cenný, zavření karty by ho nemělo ztratit).
    latest.current = next;
    const err = saveCharacter(next, storage);
    if (err) setStorageMessage(err);
  }, [storage]);
  const value = useMemo<Store>(() => ({
    character, derived, dispatch: dispatchRaw, set, storageMessage,
    dismissStorageMessage: () => setStorageMessage(null),
    replaceWith, storage,
  }), [character, derived, set, storageMessage, replaceWith, storage]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Store, nebo null mimo <CharacterProvider> (sdílené UI komponenty). */
export function useOptionalStore(): Store | null {
  return useContext(Ctx);
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore musí být uvnitř <CharacterProvider>');
  return s;
}
