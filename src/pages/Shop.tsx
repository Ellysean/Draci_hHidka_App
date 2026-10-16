// Obchod během tvorby postavy (CHARACTER_CREATION.md → Krok 8 B). Nákup odečte cenu hned,
// během tvorby jde vrátit za plnou cenu. Ve Fázi 5 se stejné okno použije v deníku.
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCharacter, buildEquipment, lineName, type CartKind, type Draft } from '../creation/draft';
import { catalogRows, SHOP_TABS, type CatalogRow } from '../rules/catalog';
import { derive } from '../rules/derive';
import { formatMd, formatPrice } from '../rules/money';
import { Ribbon } from '../ui/Ribbon';

type ShopRow = CatalogRow & { kind: CartKind };

const TABS = SHOP_TABS as [CartKind, string][];
const rows = (tab: CartKind) => catalogRows(tab) as ShopRow[];

export function Shop({ d, update, onClose }: { d: Draft; update: (f: (d: Draft) => Draft) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<CartKind>('gear');
  const [q, setQ] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    const dlg = ref.current;
    if (dlg && !dlg.open) dlg.showModal();
  }, []);

  const eq = buildEquipment(d);
  const der = useMemo(() => derive(buildCharacter(d)), [d]);
  const purse = eq.purseMd;
  const spent = d.cart.reduce((a, c) => a + c.md * c.qty, 0);
  const list = rows(tab).filter((x) => x.name.toLowerCase().includes(q.toLowerCase()));

  const warnings = (x: ShopRow): [string, string][] => {
    const w: [string, string][] = [];
    if (x.req != null && der.mods.sil < x.req) w.push(['bad', 'SIL NESTAČÍ · −5']);
    if (d.classId === 'zlodej' && x.kind === 'armor' && x.armor?.stealth) w.push(['', `HLUČNÁ – PLÍŽENÍ ${x.armor.stealth}`]);
    if (d.classId === 'kouzelnik' && (x.kind === 'shield' || (x.kind === 'armor' && x.armor?.cat !== 'Lehké'))) w.push(['', 'ZTÍŽÍ KOUZLENÍ']);
    if ((x.kind === 'armor' || x.kind === 'robe') && eq.armor.itemId) w.push(['', 'UŽ MÁŠ ZBROJ']);
    if (x.kind === 'shield' && eq.shield.itemId) w.push(['', 'UŽ MÁŠ ŠTÍT']);
    return w;
  };

  const buy = (x: ShopRow) => {
    const n = x.multi ? Math.max(1, qty[x.id] ?? 1) : 1;
    if (x.md * n > purse) return;
    update((dd) => {
      const ex = x.multi ? dd.cart.find((c) => c.kind === x.kind && c.id === x.id) : undefined;
      const cart = ex ? dd.cart.map((c) => (c === ex ? { ...c, qty: c.qty + n } : c)) : [...dd.cart, { kind: x.kind, id: x.id, qty: n, md: x.md }];
      return { ...dd, cart };
    });
    setToast(`Koupeno: ${x.name}${n > 1 ? ` ×${n}` : ''} (−${formatMd(x.md * n)})`);
  };

  const cartName = (kind: CartKind, id: string) =>
    lineName(kind === 'weapon' ? { weaponId: id } : kind === 'gear' ? { itemId: id } : kind === 'acc' ? { accessoryId: id } : { armorId: id });

  return (
    <dialog ref={ref} className="wide" onClose={onClose} aria-labelledby="shop-title">
      <div className="sheet torn">
        <Ribbon icon="coin" id="shop-title">OBCHOD</Ribbon>
        <div className="purse tn" aria-live="polite">
          <span className="lbl" style={{ color: 'var(--atmos)' }}>Měšec</span>
          <b>{formatMd(purse)}</b>
          <span className="small" style={{ color: 'var(--atmos)' }}>utraceno {formatMd(spent)} · kurz 1 zl = 10 st = 100 md</span>
        </div>
        <div className="shopgrid" style={{ marginTop: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="chips">{TABS.map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
              <input className="field" id="shop-q" placeholder="Hledat…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 140, height: 32 }} aria-label="Hledat v obchodě" />
            </div>
            <div className="scroll-x" style={{ maxHeight: '52vh', overflow: 'auto', borderTop: '1.5px solid var(--ink)', marginTop: 8 }}>
              {list.length ? (
                <table className="grid tn">
                  <thead><tr><th>Položka</th><th className="c">lb</th><th className="c">Cena</th><th className="c">Ks</th><th /></tr></thead>
                  <tbody>
                    {list.map((x) => {
                      const n = x.multi ? Math.max(1, qty[x.id] ?? 1) : 1;
                      const short = x.md * n - purse;
                      return (
                        <tr key={x.id}>
                          <td>
                            <b>{x.name}</b>
                            <div className="small muted">{x.desc}</div>
                            {warnings(x).map(([c, t]) => <span key={t}> <span className={`pill ${c}`}>{t}</span></span>)}
                          </td>
                          <td className="c">{x.w ?? '—'}</td>
                          <td className="c" style={{ whiteSpace: 'nowrap' }}>{formatPrice(x.price)}</td>
                          <td style={{ width: 70 }}>
                            {x.multi && (
                              <input className="field num tn" type="number" min={1} id={`sq-${x.id}`} aria-label="Počet kusů" value={n} style={{ height: 30, fontSize: 15 }}
                                onChange={(e) => setQty((s) => ({ ...s, [x.id]: Math.max(1, Math.trunc(Number(e.target.value)) || 1) }))} />
                            )}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {short > 0 && <><span className="small" style={{ color: 'var(--blood)' }}>chybí {formatMd(short)}</span><br /></>}
                            <button className="btn dark" type="button" disabled={short > 0} onClick={() => buy(x)}>Koupit</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : <p className="muted">Nic neodpovídá.</p>}
            </div>
          </div>
          <aside className="cart">
            <b className="lbl">Nakoupeno</b>
            {d.cart.length ? (
              <ul className="log" style={{ maxHeight: '44vh' }}>
                {d.cart.map((c, i) => (
                  <li key={`${c.kind}-${c.id}-${i}`}>
                    <span>{cartName(c.kind, c.id)}{c.qty > 1 ? ` ×${c.qty}` : ''}<br /><span className="small muted">{formatMd(c.md * c.qty)}</span></span>
                    <button className="btn" type="button" onClick={() => { update((dd) => ({ ...dd, cart: dd.cart.filter((_, j) => j !== i) })); setToast(`Vráceno (+${formatMd(c.md * c.qty)})`); }}>Vrátit</button>
                  </li>
                ))}
              </ul>
            ) : <p className="small muted">Zatím nic. Na co nemáš, je zašedlé.</p>}
            <p className="small tn" style={{ margin: '8px 0 0' }}>Naložení postavy: <b>{der.load.value} lb</b></p>
            <p className="small muted">Během tvorby postavy jde nákup vrátit za plnou cenu.</p>
          </aside>
        </div>
        <div className="dlg-foot">
          <span className="small muted" role="status">{toast || 'Ceny jsou orientační (H15). Zbraně, zbroj a štít se po vytvoření postavy rovnou nasadí.'}</span>
          <button className="btn dark" type="button" onClick={() => ref.current?.close()}>Hotovo</button>
        </div>
      </div>
    </dialog>
  );
}
