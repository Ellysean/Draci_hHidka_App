import { useEffect, useState, type CSSProperties } from 'react';

/**
 * Pole pro počet kusů: při psaní jde smazat (prázdné = zatím nic), kliknutím se obsah označí,
 * po opuštění pole se doplní platná hodnota (min–max). Hodnota se hlásí hned, jak je platná.
 */
export function QtyInput({ value, onChange, min = 1, max, id, label, className = 'field num tn', style }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
  id?: string; label: string; className?: string; style?: CSSProperties;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText((t) => (t === '' || Number(t) === value ? t : String(value))); }, [value]);
  const clamp = (n: number) => Math.max(min, max != null ? Math.min(max, n) : n);
  return (
    <input className={className} id={id} type="text" inputMode="numeric" aria-label={label} value={text} style={style}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const t = e.target.value.replace(/\D/g, '');
        setText(t);
        if (t !== '') onChange(clamp(Math.trunc(Number(t))));
      }}
      onBlur={() => { const v = text === '' ? min : clamp(Math.trunc(Number(text))); setText(String(v)); if (v !== value) onChange(v); }} />
  );
}
