// Potvrzovací dialog (Fáze 8) – nahrazuje window.confirm, který bývá ve vložených
// stránkách a na některých mobilech zablokovaný. Nativní <dialog>: Esc = Zpět,
// fokus se drží uvnitř, pozadí ztmavne.
import { useEffect, useRef, type ReactNode } from 'react';
import { Ribbon } from './Ribbon';
import type { IconName } from './icons';

export interface ConfirmProps {
  title: string;
  icon?: IconName;
  children: ReactNode;
  yes: string;
  no?: string;
  /** Nevratná akce = vínové tlačítko. */
  danger?: boolean;
  /** Ano je zakázané (např. dokud se nevybere volba). */
  yesDisabled?: boolean;
  onYes: () => void;
  onNo: () => void;
}

export function ConfirmDialog({ title, icon = 'quill', children, yes, no = 'Zpět', danger = true, yesDisabled, onYes, onNo }: ConfirmProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const noRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) {
      try { d.showModal(); } catch { d.setAttribute('open', ''); }
    }
    // Výchozí fokus na bezpečnou volbu – Enter omylem nic nepřepíše.
    noRef.current?.focus();
  }, []);
  return (
    <dialog ref={ref} className="confirm" onCancel={(e) => { e.preventDefault(); onNo(); }} aria-labelledby="confirm-title">
      <div className="sheet torn">
        <Ribbon icon={icon} id="confirm-title">{title}</Ribbon>
        <div className="confirm-body">{children}</div>
        <div className="dlg-foot">
          <button ref={noRef} type="button" className="btn" onClick={onNo}>{no}</button>
          <button type="button" className={`btn ${danger ? 'wine' : 'dark'}`} disabled={yesDisabled} onClick={onYes}>{yes}</button>
        </div>
      </div>
    </dialog>
  );
}
