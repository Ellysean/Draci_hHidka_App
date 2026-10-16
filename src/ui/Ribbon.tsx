import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';

/** Nadpis sekce ve tvaru stuhy (img/ribbon.svg) s ikonou v kroužku. */
export function Ribbon({ icon, children, id }: { icon: IconName; children: ReactNode; id?: string }) {
  return (
    <h2 className="ribbon" id={id}>
      <Icon name={icon} />
      <span className="ribbon__title">{children}</span>
    </h2>
  );
}
