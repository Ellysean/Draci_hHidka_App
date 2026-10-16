// Popover „jak se hodnota počítá“ + ruční přepis (overrides) – Fáze 3.
// Vykresluje se přes portál do <body>: listy pergamenu mají clip-path, který by
// obyčejný absolutně umístěný popover ořízl.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import type { OverridableKey } from '../model/types';
import type { Calc } from '../rules/derive';
import { useOptionalStore } from '../state/store';

const W = 320;
const GAP = 6;
const MOBILE = 820;

type Pos = { top: number; left: number; mobile: boolean };

function place(anchor: HTMLElement): Pos {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  if (vw < MOBILE) return { top: 0, left: 0, mobile: true };
  const left = Math.max(8, Math.min(r.left, vw - W - 8));
  return { top: r.bottom + GAP, left, mobile: false };
}

const fmt = (v: number | string | null | undefined) => (v == null ? '—' : String(v));

/** Ruční přepis bere jen celá čísla (✔ U): nechá číslice a případné minus na začátku. */
export const intOnly = (raw: string) => {
  // Desetinnou část (za čárkou/tečkou) zahodit – z „12,5“ je 12, ne 125.
  const t = raw.trim().split(/[.,]/)[0];
  return (t.startsWith('-') || t.startsWith('−') ? '-' : '') + t.replace(/[^0-9]/g, '');
};

/**
 * Obecný popover ukotvený k tlačítku (portál, pozice, Esc / klik mimo).
 * `children(open, toggle, ref)` vykreslí spouštěcí tlačítko, `content(close)` obsah.
 */
export function Popover({ title, content, children, onOpen }: {
  title: ReactNode;
  content: (close: () => void) => ReactNode;
  children: (open: boolean, toggle: () => void, ref: Ref<HTMLButtonElement>) => ReactNode;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const close = useCallback((focusBack = true) => {
    setOpen(false);
    if (focusBack) anchor.current?.focus();
  }, []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    if (open) onOpen?.();
    // jen při otevření
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const upd = () => anchor.current && setPos(place(anchor.current));
    upd();
    window.addEventListener('resize', upd);
    window.addEventListener('scroll', upd, true);
    return () => { window.removeEventListener('resize', upd); window.removeEventListener('scroll', upd, true); };
  }, [open]);

  // Nevejde-li se pod pole, otevřít nad ním.
  useLayoutEffect(() => {
    if (!open || !pos || pos.mobile || !box.current || !anchor.current) return;
    const h = box.current.offsetHeight;
    if (pos.top + h > window.innerHeight - 8) {
      const above = anchor.current.getBoundingClientRect().top - GAP - h;
      if (above >= 8 && above !== pos.top) setPos({ ...pos, top: above });
    }
  }, [open, pos]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || anchor.current?.contains(t)) return;
      close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    const t = setTimeout(() => box.current?.querySelector<HTMLElement>('input,select,button')?.focus(), 0);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); clearTimeout(t); };
  }, [open, close]);

  const pop = open && pos && (
    <>
      {pos.mobile && <div className="fpop-scrim" aria-hidden="true" />}
      <div
        ref={box}
        className={`fpop ${pos.mobile ? 'mobile' : ''}`}
        role="dialog"
        aria-modal={pos.mobile || undefined}
        aria-labelledby={titleId}
        style={pos.mobile ? undefined : { top: pos.top, left: pos.left, width: W }}
      >
        <div className="fpop-h">
          <b id={titleId}>{title}</b>
          <button type="button" className="fpop-x" aria-label="Zavřít" onClick={() => close()}>×</button>
        </div>
        {content(() => close())}
      </div>
    </>
  );

  return (
    <>
      {children(open, toggle, anchor)}
      {pop && createPortal(pop, document.body)}
    </>
  );
}

export function FormulaPopover({ calc, label, ovKey, sizeChoice, extra, children }: {
  calc: Calc<number | string | null>;
  label?: string;
  ovKey?: OverridableKey;
  sizeChoice?: boolean;
  extra?: ReactNode;
  children: (open: boolean, toggle: () => void, ref: Ref<HTMLButtonElement>) => ReactNode;
}) {
  const store = useOptionalStore();
  const [draft, setDraft] = useState('');
  const inputId = useId();
  const canOverride = !!(ovKey && store);

  const setOverride = (value: number | string | null) => {
    if (!store || !ovKey) return;
    store.dispatch({
      type: 'update',
      fn: (c) => {
        const next = { ...c.overrides };
        if (value === null || value === '') delete next[ovKey];
        else next[ovKey] = value;
        return { ...c, overrides: next };
      },
    });
  };

  const formulaValue = calc.overridden ? calc.computed : calc.value;
  return (
    <Popover
      title={label ?? 'Vypočtená hodnota'}
      onOpen={() => setDraft(calc.value == null ? '' : intOnly(String(Math.round(Number(calc.value)))))}
      content={(close) => {
        const apply = () => {
          if (sizeChoice) { setOverride(draft || null); return; }
          const n = Number(draft);
          if (draft === '' || draft === '-' || !Number.isInteger(n)) return;
          setOverride(n);
          close();
        };
        return (
          <>
            <div className="fpop-row">
              <span className="lbl">{calc.overridden ? 'Podle vzorce' : 'Hodnota'}</span>
              <span className="fpop-v tn">{fmt(formulaValue)}</span>
            </div>
            <p className="fpop-f">{calc.formula}</p>
            {calc.overridden && (
              <p className="fpop-note">Ručně přepsáno na <b className="tn">{fmt(calc.value)}</b>. Vzorec se dál počítá na pozadí.</p>
            )}
            {extra}
            {canOverride && (
              <form className="fpop-ovr" onSubmit={(e) => { e.preventDefault(); apply(); }}>
                <label className="lbl" htmlFor={inputId}>Ruční přepis</label>
                <div className="fpop-ovr-row">
                  {sizeChoice ? (
                    <select id={inputId} className="field" value={calc.overridden ? String(calc.value) : ''} onChange={(e) => setOverride(e.target.value || null)}>
                      <option value="">podle rasy ({fmt(formulaValue)})</option>
                      <option value="A">A – malá</option>
                      <option value="B">B – střední</option>
                      <option value="C">C – velká</option>
                    </select>
                  ) : (
                    <>
                      <input id={inputId} className="field num tn" inputMode="numeric" value={draft} onChange={(e) => setDraft(intOnly(e.target.value))} />
                      <button className="btn dark" type="submit">Použít</button>
                    </>
                  )}
                </div>
                {calc.overridden && (
                  <button className="addrow" type="button" onClick={() => { setOverride(null); close(); }}>↺ VRÁTIT NA VZOREC</button>
                )}
              </form>
            )}
          </>
        );
      }}
    >
      {children}
    </Popover>
  );
}
