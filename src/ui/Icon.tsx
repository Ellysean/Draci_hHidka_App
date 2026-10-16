import { ICONS, type IconName } from './icons';

/** Ikona ze sady dh-layout (24×24, tah currentColor – barvu bere z textu). */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={`icon ${className ?? ''}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
