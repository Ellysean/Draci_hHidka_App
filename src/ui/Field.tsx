import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import type { Calc } from '../rules/derive';
import type { OverridableKey } from '../model/types';
import { FormulaPopover } from './FormulaPopover';

/** Popisek + libovolný vstup (box z deníku). */
export function Labeled({ label, children, className = 'box' }: { label: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label className="lbl" htmlFor={id}>{label}</label>
      {children(id)}
    </div>
  );
}

export function TextField({ id, value, onChange, className = '', ...rest }: { id?: string; value: string; onChange: (v: string) => void; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <input id={id} className={`field ${className}`.trim()} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

/** Celé číslo; prázdné pole se ukládá jako min (nebo 0). */
export function NumberField({ id, value, onChange, min, max, className = '', ...rest }: { id?: string; value: number; onChange: (v: number) => void; min?: number; max?: number; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'>) {
  return (
    <input
      id={id}
      className={`field num tn ${className}`.trim()}
      type="number"
      inputMode="numeric"
      value={Number.isFinite(value) ? value : ''}
      min={min}
      max={max}
      onChange={(e) => {
        let v = Math.trunc(Number(e.target.value));
        if (!Number.isFinite(v) || e.target.value === '') v = min ?? 0;
        if (max != null) v = Math.min(max, v);
        if (min != null) v = Math.max(min, v);
        onChange(v);
      }}
      {...rest}
    />
  );
}

/**
 * Vypočtené pole (šedé, značka ƒ). Klepnutím se otevře popover se vzorcem;
 * s `ovKey` jde hodnotu ručně přepsat (overrides) a zase vrátit na vzorec.
 */
export function CalcField({ id, calc, format, warn, label, ovKey, sizeChoice, extra }: {
  id?: string;
  calc: Calc<number | string | null>;
  format?: (v: number | string | null) => string;
  warn?: boolean;
  /** Název hodnoty v hlavičce popoveru. */
  label?: string;
  ovKey?: OverridableKey;
  /** Přepis výběrem velikosti A/B/C místo čísla. */
  sizeChoice?: boolean;
  /** Doplňující obsah popoveru (tabulka, poznámka). */
  extra?: ReactNode;
}) {
  const shown = format ? format(calc.value) : calc.value == null ? '—' : String(calc.value);
  const aria = calc.overridden ? `${shown}, ručně přepsáno` : shown;
  return (
    <FormulaPopover calc={calc} label={label} ovKey={ovKey} sizeChoice={sizeChoice} extra={extra}>
      {(open, toggle, ref) => (
        <button
          ref={ref}
          id={id}
          type="button"
          className={`field num calc tn ${calc.overridden ? 'ovr' : ''} ${warn ? 'warn' : ''}`.trim()}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`${label ? label + ': ' : ''}${aria}. Zobrazit vzorec${ovKey ? ' a ruční přepis' : ''}`}
          onClick={toggle}
        >
          {shown}
        </button>
      )}
    </FormulaPopover>
  );
}
