// Plovoucí panel Kostky (VISUAL_STYLE.md → Kostky, prototyp v8–v9): k6, k6 ⟳6, k10 ověření,
// k10 prostá, 1dF a 4dF, oprava, přepínač kritických/fatálních výsledků a historie 8 hodů.
// Historie žije jen v běhu appky (neukládá se do postavy ani exportu).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { sgn } from '../rules/derive';
import { DICE_LABEL, rollDice, type DiceResult, type DiceType } from '../rules/dice';
import { Ribbon } from './Ribbon';
import { Icon } from './Icon';

interface DiceApi {
  /** Hodí a otevře panel s výsledkem. */
  roll: (type: DiceType, mod?: number, label?: string) => DiceResult;
  criticals: boolean;
  open: () => void;
}

const Ctx = createContext<DiceApi | null>(null);
const CRIT_KEY = 'dh-denik/kostky-kriticke';

const readCrit = () => { try { return localStorage.getItem(CRIT_KEY) !== '0'; } catch { return true; } };

export function DiceProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);
  const [hist, setHist] = useState<DiceResult[]>([]);
  const [mod, setMod] = useState(0);
  const [crit, setCritState] = useState(readCrit);
  const [anim, setAnim] = useState(0);
  const setCrit = (v: boolean) => { setCritState(v); try { localStorage.setItem(CRIT_KEY, v ? '1' : '0'); } catch { /* bez úložiště */ } };

  const roll = useCallback((type: DiceType, m = 0, label = '') => {
    const r = rollDice(type, m, label, crit);
    setHist((h) => [r, ...h].slice(0, 8));
    setShown(true);
    setAnim((a) => a + 1);
    return r;
  }, [crit]);
  const api = useMemo(() => ({ roll, criticals: crit, open: () => setShown(true) }), [roll, crit]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <DiceFab shown={shown} toggle={() => setShown((s) => !s)} />
      {shown && <DiceTray hist={hist} mod={mod} setMod={setMod} crit={crit} setCrit={setCrit} anim={anim} roll={roll} close={() => setShown(false)} />}
    </Ctx.Provider>
  );
}

export function useDice(): DiceApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDice mimo DiceProvider');
  return v;
}

function DiceFab({ shown, toggle }: { shown: boolean; toggle: () => void }) {
  return (
    <button type="button" className="dice-fab" aria-expanded={shown} aria-controls="dice-tray" title="Kostky" aria-label="Kostky" onClick={toggle}>
      <Icon name="dice" />
    </button>
  );
}

const BTNS: [DiceType, string, boolean][] = [
  ['k6', 'iniciativa, prostý', false], ['k6x', 'útok, obrana', true], ['k10', 'ověření', true],
  ['k10p', 'prostá', false], ['1dF', 'fate − 0 +', false], ['4dF', 'fate −4 až +4', false],
];

function DiceTray({ hist, mod, setMod, crit, setCrit, anim, roll, close }: {
  hist: DiceResult[]; mod: number; setMod: (n: number) => void; crit: boolean; setCrit: (v: boolean) => void; anim: number;
  roll: DiceApi['roll']; close: () => void;
}) {
  const L = hist[0];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);
  const total = (r: DiceResult) => `${r.type.includes('dF') && r.total > 0 ? '+' : ''}${r.total}`;
  return (
    <div className="tray" id="dice-tray" ref={ref} role="dialog" aria-label="Kostky">
      <div className="sheet torn">
        <div className="ribbon-row"><Ribbon icon="dice">KOSTKY</Ribbon><button type="button" className="fpop-x" aria-label="Zavřít kostky" onClick={close}>×</button></div>
        <div className="dice-btns">
          {BTNS.map(([t, s, dark]) => (
            <button key={t} className={`btn ${dark ? 'dark' : ''}`} type="button" onClick={() => roll(t, mod)}>{DICE_LABEL[t]}<small>{s}</small></button>
          ))}
        </div>
        <div className="dice-opts">
          <label className="small" htmlFor="dice-mod">Oprava
            <input className="field num tn" type="number" id="dice-mod" value={mod} onChange={(e) => setMod(Math.trunc(Number(e.target.value)) || 0)} />
          </label>
          <label className="small"><input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} /> Kritické/fatální (H06)</label>
        </div>
        <div className="roll-out" aria-live="polite">
          {L ? (
            <>
              <div className="small muted">{L.label ? `${L.label} · ` : ''}{DICE_LABEL[L.type]}{L.mod ? ` ${sgn(L.mod)}` : ''}</div>
              <div className="roll-row">
                <span className="tot tn" key={anim}>{total(L)}</span>
                <div className="faces">{L.faces.map((f, i) => <span key={i} className={`face ${f.hi ? 'hi' : ''} ${f.second ? 'second' : ''}`} title={f.second ? 'druhá k10' : undefined}>{f.v}</span>)}</div>
              </div>
              {L.info && <span className={`pill ${L.tone} roll-info`}>{L.info}</span>}
            </>
          ) : <span className="muted small">Vyber kostku. Tlačítka ⚄ u zbraní, iniciativy a dovedností hodí rovnou s opravou.</span>}
        </div>
        {hist.length > 1 && (
          <ul className="log" style={{ marginTop: 8 }}>
            {hist.slice(1).map((h, i) => (
              <li key={i}><span>{h.label || DICE_LABEL[h.type]}</span><b className="tn">{total(h)}{h.tone ? ` · ${h.tone === 'ok' ? 'krit.' : 'fatál'}` : ''}</b></li>
            ))}
          </ul>
        )}
        <p className="small muted" style={{ margin: '8px 0 0' }}>Hody jsou volitelné – fyzický hod jde vždy zapsat ručně.</p>
      </div>
    </div>
  );
}

/** Tlačítko ⚄ s opravou – hodí přes panel Kostky. */
export function RollButton({ type, mod, label, children, onBefore, disabled, title }: {
  type: DiceType; mod: number; label: string; children: ReactNode; onBefore?: () => boolean | void; disabled?: boolean; title?: string;
}) {
  const { roll } = useDice();
  return (
    <button type="button" className="rollbtn tn" disabled={disabled} title={title ?? `Hodit ${DICE_LABEL[type]} ${sgn(mod)}`}
      onClick={() => { if (onBefore && onBefore() === false) return; roll(type, mod, label); }}>
      {children}
    </button>
  );
}
