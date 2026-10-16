import type { HTMLAttributes, ReactNode } from 'react';

/** List pergamenu (s potrhanými okraji). */
export function Sheet({ children, torn = true, className = '', ...rest }: { children: ReactNode; torn?: boolean; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section className={`sheet ${torn ? 'torn' : ''} ${className}`.trim()} {...rest}>
      {children}
    </section>
  );
}
