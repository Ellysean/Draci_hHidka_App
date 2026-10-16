import type { ReactNode } from 'react';
import type { IconName } from '../ui/icons';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

/** Zatím prázdná sekce – ukazuje, ve které fázi plánu se doplní. */
export function Placeholder({ title, icon, phase, children }: { title: string; icon: IconName; phase: string; children: ReactNode }) {
  return (
    <Sheet>
      <Ribbon icon={icon}>{title}</Ribbon>
      <div className="placeholder">
        <span className="phase">{phase}</span>
        {children}
      </div>
    </Sheet>
  );
}
