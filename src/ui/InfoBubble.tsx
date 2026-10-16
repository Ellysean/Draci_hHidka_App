// Info bublina (i) – krátké vysvětlení pravidla v popoveru (rodové schopnosti, situační bonusy…).
import type { ReactNode } from 'react';
import { Popover } from './FormulaPopover';

export function InfoBubble({ title, label, children, small = false }: { title: ReactNode; label: string; children: ReactNode; small?: boolean }) {
  return (
    <Popover title={title} content={() => <div className="xp-info small">{children}</div>}>
      {(open, toggle, ref) => (
        <button ref={ref} type="button" className={`info-btn${small ? ' info-sm' : ''}`} aria-haspopup="dialog" aria-expanded={open} aria-label={label} title={label} onClick={toggle}>i</button>
      )}
    </Popover>
  );
}
