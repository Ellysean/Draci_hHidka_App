import { useCallback, useEffect, useState } from 'react';
import { newDraft, type Draft } from './draft';

// Rozpracovaný průvodce se ukládá jako koncept odděleně od aktivní postavy
// (není součástí postavy ani exportu – CHARACTER_CREATION.md, zásada 5).
export const DRAFT_KEY = 'dh-denik/koncept';

function load(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...newDraft(), ...(JSON.parse(raw) as Partial<Draft>) };
  } catch { /* poškozený nebo nedostupný koncept → začít znovu */ }
  return newDraft();
}

export function useDraft() {
  const [draft, setDraft] = useState<Draft>(load);
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* úložiště nedostupné */ }
  }, [draft]);
  const update = useCallback((patch: Partial<Draft> | ((d: Draft) => Draft)) => {
    setDraft((d) => (typeof patch === 'function' ? patch(d) : { ...d, ...patch }));
  }, []);
  const discard = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* nic */ }
    setDraft(newDraft());
  }, []);
  return { draft, update, discard };
}
