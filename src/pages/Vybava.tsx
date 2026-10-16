// Stránka VÝBAVA (Fáze 5): měšec s historií, zbraně, zbroj a štít, výbava (vč. lektvarů a dalších
// alchymistických výrobků – H10, PPP03) a naložení.
// Otevírá se ze záložky Postava (sekce Zbraně, Zbroj a štít, Peníze, Výbava).
import { useState } from 'react';
import type { Character, Money } from '../model/types';
import type { CatalogKind } from '../rules/catalog';
import { craftedInGear, craftedValueMd, recipeById, removeCrafted, setCraftedCarried, undoAlchemy, useCrafted } from '../rules/alchemy';
import { ALCH_KIND, WEAPON_KIND, alchemyRowByRecipe, productWeightLb } from '../rules/catalog';
import { sgn } from '../rules/derive';
import {
  equipFromItems, expense, income, itemSlot, salePriceMd, normalizeMoney, removeItem, removePiece, removeWeapon, undoLast, unequipPiece, unitPriceMd, consumeItem,
} from '../rules/equipment';
import { formatMd, moneyToMd } from '../rules/money';
import { useStore } from '../state/store';
import { CalcField, Labeled, NumberField } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';
import { Katalog } from './Katalog';
import { LoadLimit } from './Postava';

type Removing = { what: 'weapon' | 'item' | 'crafted'; uid: string; qty: number; max: number; name: string; unitMd: number } | { what: 'armor' | 'shield'; name: string; unitMd: number; qty: 1; max: 1; uid?: undefined };

const ZERO: Money = { gold: 0, silver: 0, copper: 0 };
const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('cs', { day: 'numeric', month: 'numeric' }); } catch { return ''; } };

function MoneyInputs({ value, onChange, idPrefix }: { value: Money; onChange: (m: Money) => void; idPrefix: string }) {
  return (
    <span className="money-in">
      {([['gold', 'zl'], ['silver', 'st'], ['copper', 'md']] as const).map(([k, l]) => (
        <label key={k} htmlFor={`${idPrefix}-${k}`}>
          <NumberField id={`${idPrefix}-${k}`} value={value[k]} min={0} onChange={(v) => onChange({ ...value, [k]: v })} />
          <span className="small">{l}</span>
        </label>
      ))}
    </span>
  );
}

export function Vybava() {
  const { character: c, derived: d, set, dispatch } = useStore();
  const [kat, setKat] = useState<CatalogKind | null>(null);
  const [amount, setAmount] = useState<Money>(ZERO);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [removing, setRemoving] = useState<Removing | null>(null);
  const [sale, setSale] = useState<Money>(ZERO);
  // Hláška k výrobkům alchymisty (jejich akce se zapisují do záznamu alchymie – vrací se tam, nebo tlačítkem tady).
  const [alchMsg, setAlchMsg] = useState('');
  const crafted = craftedInGear(c);
  const upd = (fn: (x: Character) => Character) => dispatch({ type: 'update', fn });
  const eq = c.equipment;

  const money = (kind: 'in' | 'out') => {
    const r = kind === 'in' ? income(c, amount, note.trim()) : expense(c, moneyToMd(amount), note.trim());
    if (!r.character) { setMsg(r.error); return; }
    const next = r.character;
    upd(() => next);
    setMsg(`${kind === 'in' ? 'Připsáno' : 'Zaplaceno'} ${formatMd(moneyToMd(amount))}.`);
    setAmount(ZERO);
    setNote('');
  };

  const askRemove = (r: Removing) => {
    setRemoving(r);
    // Standardní prodej = polovina kupní ceny (✔ U 24. 9. 2026), zaokrouhleno nahoru (H06); PJ může cenu přepsat.
    const md = salePriceMd(r.unitMd * r.qty);
    setSale({ gold: Math.floor(md / 100), silver: Math.floor((md % 100) / 10), copper: md % 10 });
  };
  const doRemove = (sell: boolean) => {
    if (!removing) return;
    const saleMd = sell ? moneyToMd(sale) : 0;
    const r = removing;
    if (r.what === 'crafted') {
      upd((x) => removeCrafted(x, r.uid, { qty: r.qty, saleMd }));
      setAlchMsg(`${saleMd > 0 ? 'Prodáno' : 'Zahozeno'}: ${r.name} – zapsáno v záznamu alchymie.`);
      setRemoving(null);
      return;
    }
    upd((x) => (r.what === 'weapon' ? removeWeapon(x, r.uid, { qty: r.qty, saleMd })
      : r.what === 'item' ? removeItem(x, r.uid, { qty: r.qty, saleMd })
      : removePiece(x, r.what as 'armor' | 'shield', { saleMd })));
    setRemoving(null);
  };

  const removePanel = (scope: 'weapon' | 'item' | 'piece') => {
    if (!removing) return null;
    const inScope = scope === 'piece' ? removing.what === 'armor' || removing.what === 'shield' : scope === 'item' ? removing.what === 'item' || removing.what === 'crafted' : removing.what === scope;
    if (!inScope) return null;
    return (
      <div className="warnbar" role="alert">
        <span style={{ flex: '1 1 100%' }}>
          Odebrat <b>{removing.name}</b>
          {removing.max > 1 && (
            <> – kusů <input className="field num tn" type="number" min={1} max={removing.max} value={removing.qty} aria-label="Kolik kusů odebrat" style={{ width: 64, height: 28, display: 'inline-block' }}
              onChange={(e) => askRemove({ ...removing, qty: Math.max(1, Math.min(removing.max, Math.trunc(Number(e.target.value)) || 1)) } as Removing)} /> z {removing.max}</>
          )}
          ? {removing.what === 'crafted'
            ? 'Předvyplněná je polovina hodnoty many a surovin v kusu (H10) – výrobky nemají pevnou cenu, určí ji PJ.'
            : 'Standardní výkupní cena je polovina kupní (předvyplněná); jinou cenu určí PJ – stačí ji přepsat.'} Částka se připíše do měšce.
        </span>
        <button className="btn" type="button" onClick={() => doRemove(false)}>Jen odebrat</button>
        <span className="sale">Prodat za <MoneyInputs idPrefix="sale" value={sale} onChange={setSale} /></span>
        <button className="btn wine" type="button" disabled={moneyToMd(sale) <= 0} onClick={() => doRemove(true)}>Prodat</button>
        <button className="btn" type="button" onClick={() => setRemoving(null)}>Zpět</button>
      </div>
    );
  };

  const armorRow = (slot: 'armor' | 'shield') => {
    const p = slot === 'armor' ? d.armor : d.shield;
    const piece = eq[slot];
    const empty = !p || (slot === 'armor' && piece.itemId === 'zbroj_zadna_saty');
    return (
      <tr key={slot}>
        <td className="lbl">{slot === 'armor' ? 'Zbroj' : 'Štít'}</td>
        <td>
          {p ? p.name : <span className="muted">—</span>}
          {p?.custom && <> <span className="pill">VLASTNÍ</span></>}
          {p?.overloaded && <> <span className="pill bad" title={`Požadovaná SIL min. ${sgn(p.strReq ?? 0)}, máš ${sgn(d.mods.sil)}`}>SIL NESTAČÍ · −5 {slot === 'armor' ? 'ZO' : 'OČ'}</span></>}
          {p?.stealth ? <> <span className="pill">PLÍŽENÍ {p.stealth}</span></> : null}
          {p?.magicBonus ? <> <span className="pill" title="Bonus k ověření magie – započítá se ve Fázi 7">MAGIE +{p.magicBonus}</span></> : null}
        </td>
        <td className="c">{p ? p.quality : '—'}</td>
        <td className="c">{p?.strReq != null ? `min. ${sgn(p.strReq)}` : '—'}</td>
        <td className="c">{p ? p.weightLb : '—'}</td>
        <td className="c">
          {p && !empty && (
            <input type="checkbox" checked={piece.equipped} aria-label={slot === 'armor' ? 'Zbroj na sobě' : 'Štít v ruce'}
              title={slot === 'armor' ? 'Na sobě (jinak nese, ale nechrání)' : 'V ruce (jinak nese na zádech)'}
              onChange={(e) => set(['equipment', slot, 'equipped'], e.target.checked)} />
          )}
        </td>
        <td className="c acts">
          {p && !empty && <>
            <button className="btn" type="button" title="Sundat do výbavy" onClick={() => upd((x) => unequipPiece(x, slot))}>Do výbavy</button>
            <button className="icon-x" type="button" aria-label={`Odebrat ${p.name}`} onClick={() => askRemove({ what: slot, name: p.name, unitMd: unitPriceMd(c, piece), qty: 1, max: 1 })}>×</button>
          </>}
        </td>
      </tr>
    );
  };

  return (
    <div className="stack vy-page">
      <div className="vy-head">
        <a className="btn" href="#/postava">← Postava</a>
        <h1 className="pg">VÝBAVA A PENÍZE</h1>
        <button className="btn dark" type="button" onClick={() => setKat('gear')}><Icon name="bag" />KATALOG</button>
      </div>
      {eq.undo && (
        <div className="warnbar">
          <span style={{ flex: 1 }}>Poslední změna: <b>{eq.undo.text}</b></span>
          <button className="btn" type="button" onClick={() => upd(undoLast)}>↶ Vrátit</button>
        </div>
      )}

      <div className="cols">
        <div className="stack">
          <Sheet>
            <Ribbon icon="sword">ZBRANĚ</Ribbon>
            <div className="scroll-x">
              <table className="grid tn vy-table">
                <thead><tr><th style={{ width: 28 }}><span className="visually-hidden">V ruce</span></th><th>Název</th><th className="c" title="Útočnost / zranění / obrana">Ú/Z/O</th><th className="c">SIL</th><th className="c">ÚČ/OČ</th><th className="c">lb</th><th /></tr></thead>
                <tbody>
                  {d.weapons.length === 0 && <tr><td colSpan={7} className="muted small">Žádná zbraň – beze zbraně SIL + 0.</td></tr>}
                  {d.weapons.map((w) => {
                    const entry = eq.weapons.find((x) => x.uid === w.uid)!;
                    return (
                      <tr key={w.uid} className={w.uid === d.activeWeaponUid ? 'w-active' : ''}>
                        <td className="c"><input type="radio" name="vy-active" checked={w.uid === d.activeWeaponUid} aria-label={`${w.name} v ruce`} onChange={() => set(['equipment', 'activeWeaponUid'], w.uid)} /></td>
                        <td>
                          {(entry.qty ?? 1) > 1 && <b>{entry.qty}× </b>}{w.name}
                          {' '}<span className="pill">{WEAPON_KIND[w.kind].toUpperCase()}</span>
                          {entry.custom && <> <span className="pill">VLASTNÍ</span></>}
                          {entry.grip === 'two-handed' && <> <span className="pill">OBOURUČNÍ</span></>}
                        </td>
                        <td className="c">{w.attack}/{w.damage}/{w.defense}</td>
                        <td className="c">{w.strReq != null ? <span className={w.overloaded ? 'bad-t' : ''} title={w.overloaded ? `Přetížení −5 (máš SIL ${sgn(d.mods.sil)})` : undefined}>min. {sgn(w.strReq)}</span> : '—'}</td>
                        <td className="c">{w.attackNumber}/{w.defenseNumber}{w.overloaded && <> <span className="pill bad">−5</span></>}</td>
                        <td className="c">{w.weightLb}</td>
                        <td className="c acts"><button className="icon-x" type="button" aria-label={`Odebrat ${w.name}`} onClick={() => askRemove({ what: 'weapon', uid: w.uid, name: w.name, qty: entry.qty ?? 1, max: entry.qty ?? 1, unitMd: unitPriceMd(c, entry) })}>×</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {removePanel('weapon')}
            <div className="vy-add">
              <button className="addrow" type="button" onClick={() => setKat('weapon')}>+ ZBRAŇ Z KATALOGU</button>
              <button className="addrow" type="button" onClick={() => setKat('custom')}>+ VLASTNÍ ZBRAŇ</button>
            </div>
            <div className="vy-sum">
              <Labeled label="ÚČ">{(id) => <CalcField id={id} calc={d.attackNumber} label="Útočné číslo" ovKey="attackNumber" />}</Labeled>
              <Labeled label="OČ">{(id) => <CalcField id={id} calc={d.defenseNumber} label="Obranné číslo" ovKey="defenseNumber" warn={d.shieldOverloaded} />}</Labeled>
              <span className="small muted">V ruce: {d.weapons.find((w) => w.uid === d.activeWeaponUid)?.name ?? 'beze zbraně'}. Požadovaná SIL = minimální oprava SIL; když nestačí, přetížení −5 (H15).</span>
            </div>
          </Sheet>

          <Sheet>
            <Ribbon icon="shield">ZBROJ A ŠTÍT</Ribbon>
            <div className="scroll-x">
              <table className="grid tn vy-table">
                <thead><tr><th /><th>Název</th><th className="c">Kvalita</th><th className="c">SIL</th><th className="c">lb</th><th className="c" title="Na sobě / v ruce">Nas.</th><th /></tr></thead>
                <tbody>{armorRow('armor')}{armorRow('shield')}</tbody>
              </table>
            </div>
            {removePanel('piece')}
            <div className="vy-add">
              <button className="addrow" type="button" onClick={() => setKat('armor')}>+ ZBROJ</button>
              <button className="addrow" type="button" onClick={() => setKat('robe')}>+ RÓBA</button>
              <button className="addrow" type="button" onClick={() => setKat('shield')}>+ ŠTÍT</button>
              <button className="addrow" type="button" onClick={() => setKat('custom')}>+ VLASTNÍ</button>
            </div>
            <div className="vy-sum">
              <Labeled label="ZO">{(id) => <CalcField id={id} calc={d.defenseBase} warn={d.armorOverloaded} label="Základní obrana" ovKey="defenseBase" />}</Labeled>
              <span className="small muted">Nová zbroj či štít se nasadí a dosavadní jde do výbavy, odkud jde zase nasadit. Sundaná zbroj pořád váží.</span>
            </div>
          </Sheet>
        </div>

        <div className="stack">
          <Sheet>
            <Ribbon icon="coin">MĚŠEC</Ribbon>
            <div className="trio">
              {([['gold', 'Zlaté'], ['silver', 'Stříbrné'], ['copper', 'Měděné']] as const).map(([k, l]) => (
                <Labeled key={k} label={l}>{(id) => <NumberField id={id} value={eq.money[k]} min={0} onChange={(v) => set(['equipment', 'money', k], v)} />}</Labeled>
              ))}
            </div>
            <p className="small tn" style={{ margin: '6px 0 0' }}>
              Celkem <b>{formatMd(moneyToMd(eq.money))}</b> ({moneyToMd(eq.money).toLocaleString('cs')} md) · 1 zl = 10 st = 100 md
              {' '}<button className="linkbtn" type="button" onClick={() => set(['equipment', 'money'], normalizeMoney(eq.money))}>rozměnit na nejméně mincí</button>
            </p>
            <div className="vy-money">
              <MoneyInputs idPrefix="amt" value={amount} onChange={setAmount} />
              <input className="field" placeholder="Za co (odměna, nocleh…)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Poznámka k platbě" />
              <button className="btn" type="button" disabled={moneyToMd(amount) <= 0} onClick={() => money('in')}>+ Příjem</button>
              <button className="btn dark" type="button" disabled={moneyToMd(amount) <= 0} onClick={() => money('out')}>− Výdaj</button>
            </div>
            {msg && <p className="small" role="status" style={{ margin: '4px 0 0' }}>{msg}</p>}
            <details className="help-d" style={{ marginTop: 8 }}>
              <summary><Icon name="book" className="i14" /> HISTORIE PENĚZ ({eq.ledger.length})</summary>
              {eq.ledger.length ? (
                <table className="grid tn small"><tbody>
                  {eq.ledger.map((l) => (
                    <tr key={l.uid}><td className="muted" style={{ width: 48 }}>{fmtDate(l.at)}</td><td>{l.text}</td><td className={`c ${l.deltaMd < 0 ? 'bad-t' : ''}`} style={{ whiteSpace: 'nowrap' }}>{l.deltaMd < 0 ? '−' : '+'}{formatMd(Math.abs(l.deltaMd))}</td></tr>
                  ))}
                </tbody></table>
              ) : <p className="small muted">Zatím žádné platby. Ruční přepis mincí nahoře se nezapisuje.</p>}
            </details>
          </Sheet>

          <Sheet>
            <Ribbon icon="bag">VÝBAVA</Ribbon>
            <div className="scroll-x">
              <table className="grid tn vy-table">
                <thead><tr><th className="c" title="Nese u sebe (počítá se do naložení)">Nese</th><th>Předmět</th><th className="c">Ks</th><th className="c">lb/ks</th><th className="c">lb</th><th /></tr></thead>
                <tbody>
                  {eq.items.length === 0 && crafted.length === 0 && <tr><td colSpan={6} className="muted small">Prázdná výbava.</td></tr>}
                  {eq.items.map((it, i) => {
                    const slot = itemSlot(it);
                    return (
                      <tr key={it.uid} className={it.carried ? '' : 'vy-off'}>
                        <td className="c"><input type="checkbox" checked={it.carried} aria-label={`${it.name} – nese u sebe`} onChange={(e) => set(['equipment', 'items', i, 'carried'], e.target.checked)} /></td>
                        <td>
                          <input className="vy-name" value={it.name} aria-label="Název předmětu" onChange={(e) => set(['equipment', 'items', i, 'name'], e.target.value)} />
                          {slot && <button className="btn vy-equip" type="button" onClick={() => upd((x) => equipFromItems(x, it.uid))}>Nasadit {slot === 'armor' ? 'zbroj' : 'štít'}</button>}
                          {it.alch && <AlchInfo index={i} />}
                        </td>
                        <td className="c">
                          <span className="steps vy-qty">
                            <button className="btn" type="button" aria-label={`Ubrat ${it.name}`} disabled={it.qty <= 1} onClick={() => set(['equipment', 'items', i, 'qty'], it.qty - 1)}>−</button>
                            <span>{it.qty}</span>
                            <button className="btn" type="button" aria-label={`Přidat ${it.name}`} onClick={() => set(['equipment', 'items', i, 'qty'], it.qty + 1)}>+</button>
                          </span>
                        </td>
                        <td className="c">
                          <input className="vy-w tn" inputMode="decimal" aria-label={`Hmotnost kusu – ${it.name}`} value={String(it.weightLb)}
                            onChange={(e) => { const v = Number(e.target.value.replace(',', '.')); if (Number.isFinite(v) && v >= 0) set(['equipment', 'items', i, 'weightLb'], v); }} />
                        </td>
                        <td className="c">{Math.round(it.weightLb * it.qty * 100) / 100}</td>
                        <td className="c acts"><button className="icon-x" type="button" aria-label={`Odebrat ${it.name}`} onClick={() => askRemove({ what: 'item', uid: it.uid, name: it.name, qty: it.qty, max: it.qty, unitMd: unitPriceMd(c, it) })}>×</button></td>
                      </tr>
                    );
                  })}
                  {crafted.map((it) => {
                    const r = recipeById(it.recipeId);
                    const kind = r?.kind;
                    const w = productWeightLb(it.recipeId);
                    const qty = it.qty ?? 1;
                    const carried = it.carried !== false;
                    const drink = (kind === 'lektvar' || kind === 'elixir') && r?.drinkable !== false && it.form === 'potion';
                    return (
                      <tr key={it.uid} className={carried ? '' : 'vy-off'}>
                        <td className="c"><input type="checkbox" checked={carried} aria-label={`${it.name} – nese u sebe`} onChange={(e) => upd((x) => setCraftedCarried(x, it.uid, e.target.checked))} /></td>
                        <td>
                          <span>{it.name}</span>
                          <div className="small" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                            {kind && <span className="pill">{ALCH_KIND[kind].toUpperCase()}</span>}
                            <span className="pill ok" title="Vyrobeno alchymistou – podrobnosti a další akce na záložce Alchymie">VLASTNÍ VÝROBA</span>
                            {it.ruined && <span className="pill bad">ZNEHODNOCENO</span>}
                            {!it.demons && (
                              <button className="btn" type="button" title="Použije 1 kus (stejně jako na záložce Alchymie)"
                                onClick={() => { const x = useCrafted(c, it.uid); upd(() => x.character); setAlchMsg(`${drink ? 'Vypito' : 'Použito'}: ${it.name}${drink ? ' – působí (Alchymie → Výrobky)' : ''}.${x.warning ? ` ${x.warning}` : ''}`); }}>
                                {drink ? 'Vypít' : 'Použít'}
                              </button>
                            )}
                            <span className="muted" title="Nebezpečnost = výsledek hodu při výrobě (H10)">Nebezp. {it.danger}</span>
                            <a className="linkbtn" href="#/povolani" title="Injekce, recyklace, sabotáž, přídavná mana…">další akce v Alchymii →</a>
                          </div>
                        </td>
                        <td className="c tn">{qty}</td>
                        <td className="c">{w}</td>
                        <td className="c">{Math.round(w * qty * 100) / 100}</td>
                        <td className="c acts"><button className="icon-x" type="button" aria-label={`Odebrat ${it.name}`} onClick={() => askRemove({ what: 'crafted', uid: it.uid, name: it.name, qty, max: qty, unitMd: craftedValueMd(it) })}>×</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {alchMsg && (
              <div className="warnbar" role="status">
                <span style={{ flex: 1 }}>{alchMsg}</span>
                <button className="btn" type="button" onClick={() => { upd(undoAlchemy); setAlchMsg(''); }}>↶ Vrátit</button>
                <button className="btn" type="button" aria-label="Zavřít" onClick={() => setAlchMsg('')}>×</button>
              </div>
            )}
            {removePanel('item')}
            <div className="vy-add">
              <button className="addrow" type="button" onClick={() => setKat('gear')}>+ Z KATALOGU</button>
              <button className="addrow" type="button" onClick={() => setKat('alch')}>+ LEKTVAR / ALCHYMIE</button>
              <button className="addrow" type="button" onClick={() => setKat('acc')}>+ DOPLNĚK KE ZBRANI</button>
              <button className="addrow" type="button" onClick={() => setKat('custom')}>+ VLASTNÍ PŘEDMĚT</button>
            </div>
          </Sheet>

          <Sheet>
            <Ribbon icon="hourglass">NALOŽENÍ</Ribbon>
            <table className="grid tn">
              <tbody>
                {d.loadParts.map((p) => <tr key={p.label}><td>{p.label}</td><td className="c" style={{ width: 90 }}>{p.lb} lb</td></tr>)}
                <tr><td><b>Celkem</b>{d.load.overridden && <span className="small muted"> (ručně přepsáno, podle vzorce {String(d.load.computed)} lb)</span>}</td><td className="c"><b className={d.overloaded ? 'bad-t' : ''}>{d.load.value} lb</b></td></tr>
              </tbody>
            </table>
            <LoadLimit />
            <p className="small muted" style={{ margin: '6px 0 0' }}>Nenesené předměty (zaškrtnutí „Nese“) se do naložení nepočítají. Nosnost zadává hráč ručně podle PJ.</p>
          </Sheet>
        </div>
      </div>

      {kat && <Katalog initialTab={kat} onClose={() => setKat(null)} />}
    </div>
  );
}

/** Alchymistický výrobek ve výbavě: druh, nebezpečnost, použití (−1 ks) a účinek z receptu. */
function AlchInfo({ index }: { index: number }) {
  const { character: c, set, dispatch } = useStore();
  const it = c.equipment.items[index];
  if (!it?.alch) return null;
  const a = it.alch;
  const row = alchemyRowByRecipe(a.recipeId);
  const drink = a.kind === 'lektvar' || a.kind === 'elixir';
  return (
    <div className="small" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
      <span className="pill">{ALCH_KIND[a.kind].toUpperCase()}</span>
      <button className="btn" type="button" title="Ubere 1 kus z výbavy (jde vrátit)"
        onClick={() => dispatch({ type: 'update', fn: (x) => consumeItem(x, it.uid) })}>{drink ? 'Vypít' : 'Použít'}</button>
      {a.kind !== 'predmet' && <label style={{ whiteSpace: 'nowrap' }} title="Nebezpečnost = výsledek hodu výrobce při výrobě (H10). Zeptej se alchymisty, který výrobek vyrobil.">
        Nebezp.{' '}
        <input className="vy-w tn" inputMode="numeric" style={{ width: 36 }} aria-label={`Nebezpečnost – ${it.name}`} placeholder="?"
          value={a.danger == null ? '' : String(a.danger)}
          onChange={(e) => { const t = e.target.value.trim(); const v = Math.trunc(Number(t)); set(['equipment', 'items', index, 'alch', 'danger'], t === '' || !Number.isFinite(v) ? null : v); }} />
      </label>}
      {row?.alch?.rules && (
        <details style={{ flex: '1 1 100%' }}>
          <summary>Účinek{row.alch.pages ? ` (${row.alch.source} s. ${row.alch.pages})` : ''}</summary>
          <p style={{ margin: '4px 0', whiteSpace: 'pre-line' }}>{row.alch.rules}</p>
        </details>
      )}
    </div>
  );
}
