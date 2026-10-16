// Katalog výzbroje a výbavy v deníku (Fáze 5): výběr z pravidel (H15, PPP05), alchymistické výrobky
// (H10, PPP03) nebo vlastní položky, „Přidat“ bez placení (přepis z papíru, nález) nebo „Koupit“ s odečtením z měšce.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AlchemyProductKind, Character, CustomCatalogItem, CustomItemType, ItemPrice, WeaponKind } from '../model/types';
import { DIARY_TABS, WEAPON_KIND, catalogRows, type CatalogKind, type CatalogRow } from '../rules/catalog';
import { derive, sgn } from '../rules/derive';
import { acquire, deleteCustom, saveCustom, slotEmpty, pieceName } from '../rules/equipment';
import { formatMd, formatPrice, moneyToMd, priceMd } from '../rules/money';
import { useStore } from '../state/store';
import { Ribbon } from '../ui/Ribbon';

const TABS: [CatalogKind, string][] = [...DIARY_TABS, ['custom', 'Vlastní']];

const ALCH_FILTER: [AlchemyProductKind | 'all', string][] = [
  ['all', 'Vše'], ['lektvar', 'Lektvary'], ['elixir', 'Elixíry'], ['jed', 'Jedy'], ['ostatni', 'Ostatní'], ['predmet', 'Předměty'],
];
const ALCH_COUNT = (k: AlchemyProductKind | 'all') => catalogRows('alch').filter((r) => k === 'all' || r.alch!.kind === k).length;

/** Cena alchymistického výrobku zadaná hráčem (pravidla ji neurčují – dle PJ / obchodníka). */
type PriceInput = { v: string; cur: ItemPrice['cur'] };
const parsePrice = (p: PriceInput | undefined): ItemPrice | null => {
  const v = p ? Number(p.v.replace(',', '.')) : 0;
  return p && Number.isFinite(v) && v > 0 ? { v, cur: p.cur } : null;
};

function preview(c: Character, row: CatalogRow): string {
  const k = row.custom?.type ?? row.kind;
  if (k !== 'weapon' && k !== 'armor' && k !== 'robe' && k !== 'shield') return '';
  const r = acquire(c, row);
  if (!r.character) return '';
  const before = derive(c);
  const after = derive(r.character);
  const kind = row.custom?.type ?? row.kind;
  if (kind === 'weapon') {
    const w = after.weapons.find((x) => !c.equipment.weapons.some((y) => y.uid === x.uid)) ?? after.weapons.find((x) => x.name === row.name);
    return w ? `ÚČ ${w.attackNumber} · OČ ${w.defenseNumber}` : '';
  }
  if (kind === 'armor' || kind === 'robe') return `ZO ${before.defenseBase.value} → ${after.defenseBase.value}`;
  if (kind === 'shield') return `OČ ${before.defenseNumber.value} → ${after.defenseNumber.value}`;
  return '';
}

export function Katalog({ initialTab = 'gear', onClose }: { initialTab?: CatalogKind; onClose: () => void }) {
  const { character: c, derived: d, dispatch } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<CatalogKind>(initialTab);
  const [q, setQ] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState<CustomCatalogItem | 'new' | null>(null);
  const [alchKind, setAlchKind] = useState<AlchemyProductKind | 'all'>('all');
  const [alchPrice, setAlchPrice] = useState<Record<string, PriceInput>>({});

  useEffect(() => {
    const dlg = ref.current;
    if (dlg && !dlg.open) dlg.showModal();
  }, []);

  const purse = moneyToMd(c.equipment.money);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalogRows(tab, c.equipment.customCatalog, { priced: false })
      .filter((x) => !x.alch || alchKind === 'all' || x.alch.kind === alchKind)
      .filter((x) => x.name.toLowerCase().includes(needle) || (x.alch?.latinName ?? '').toLowerCase().includes(needle))
      .map((x) => {
        if (!x.alch) return x;
        const price = parsePrice(alchPrice[x.id]);
        return { ...x, price, md: priceMd(price) };
      });
  }, [tab, q, c.equipment.customCatalog, alchKind, alchPrice]);

  const warnings = (x: CatalogRow): [string, string][] => {
    const w: [string, string][] = [];
    const kind = x.custom?.type ?? x.kind;
    const stealth = x.armor?.stealth ?? x.custom?.armor?.stealth;
    const cat = x.armor?.cat ?? x.custom?.armor?.category ?? '';
    if (x.req != null && d.mods.sil < x.req) w.push(['bad', `SIL MIN. ${sgn(x.req)} · −5`]);
    if (c.basic.classId === 'zlodej' && stealth) w.push(['', `HLUČNÁ – PLÍŽENÍ ${stealth}`]);
    if (c.basic.classId === 'kouzelnik' && (kind === 'shield' || ((kind === 'armor' || kind === 'robe') && !/lehk/i.test(cat)))) w.push(['', 'ZTÍŽÍ KOUZLENÍ']);
    if ((kind === 'armor' || kind === 'robe') && !slotEmpty(c.equipment.armor)) w.push(['', `VYMĚNÍ: ${pieceName('armor', c.equipment.armor).toUpperCase()}`]);
    if (kind === 'shield' && !slotEmpty(c.equipment.shield)) w.push(['', `VYMĚNÍ: ${pieceName('shield', c.equipment.shield).toUpperCase()}`]);
    return w;
  };

  const take = (x: CatalogRow, pay: boolean) => {
    const n = x.multi ? Math.max(1, qty[x.id] ?? 1) : 1;
    const r = acquire(c, x, { qty: n, pay });
    if (!r.character) { setToast(r.error); return; }
    const next = r.character;
    dispatch({ type: 'update', fn: () => next });
    const kind = x.custom?.type ?? x.kind;
    const where = kind === 'armor' || kind === 'robe' || kind === 'shield' ? ' – nasazeno' : kind === 'weapon' ? ' – mezi zbraněmi' : ' – ve výbavě';
    if (x.alch) setAlchPrice((s) => { const { [x.id]: _drop, ...rest } = s; return rest; });
    setToast(`${pay ? 'Koupeno' : 'Přidáno'}: ${x.name}${n > 1 ? ` ×${n}` : ''}${pay ? ` (−${formatMd(x.md * n)})` : ''}${where}`);
  };

  return (
    <dialog ref={ref} className="wide" onClose={onClose} aria-labelledby="kat-title">
      <div className="sheet torn">
        <Ribbon icon="bag" id="kat-title">KATALOG VÝZBROJE A VÝBAVY</Ribbon>
        <div className="purse tn" aria-live="polite">
          <span className="lbl" style={{ color: 'var(--atmos)' }}>Měšec</span>
          <b>{formatMd(purse)}</b>
          <span className="small" style={{ color: 'var(--atmos)' }}>Přidat = bez placení (nález, přepis z papíru) · Koupit = odečte cenu a rozmění mince</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
          <div className="chips">{TABS.map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={tab === k} onClick={() => { setTab(k); setEditing(null); }}>{l}{k === 'custom' && c.equipment.customCatalog.length ? ` (${c.equipment.customCatalog.length})` : ''}</button>)}</div>
          <input className="field" placeholder="Hledat…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 140, height: 32 }} aria-label="Hledat v katalogu" />
        </div>

        {tab === 'alch' && (
          <div className="chips" role="group" aria-label="Druh výrobku" style={{ marginTop: 8 }}>
            {ALCH_FILTER.map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={alchKind === k} onClick={() => setAlchKind(k)}>{l} ({ALCH_COUNT(k)})</button>)}
          </div>
        )}

        {tab === 'custom' && (
          editing ? (
            <CustomForm
              initial={editing === 'new' ? null : editing}
              onCancel={() => setEditing(null)}
              onSave={(item, andAdd) => {
                const saved = saveCustom(c, item);
                let next = saved.character;
                let msg = `Uloženo do vlastního katalogu: ${saved.item.name}`;
                if (andAdd) {
                  const r = acquire(next, catalogRows('custom', next.equipment.customCatalog).find((x) => x.id === saved.item.id)!);
                  if (r.character) { next = r.character; msg += ' a přidáno'; }
                }
                const done = next;
                dispatch({ type: 'update', fn: () => done });
                setToast(msg);
                setEditing(null);
              }}
            />
          ) : (
            <button className="addrow" type="button" onClick={() => setEditing('new')}>+ NOVÁ VLASTNÍ POLOŽKA (zbraň, zbroj, štít, vybavení)</button>
          )
        )}

        <div className="scroll-x kat-list">
          {list.length ? (
            <table className="grid tn kat-table">
              <thead><tr><th>Položka</th><th className="c">lb</th><th className="c">Cena</th><th className="c">Ks</th><th /></tr></thead>
              <tbody>
                {list.map((x) => {
                  const n = x.multi ? Math.max(1, qty[x.id] ?? 1) : 1;
                  const short = x.md * n - purse;
                  const pv = preview(c, x);
                  return (
                    <tr key={x.id}>
                      <td className="kat-n">
                        <b>{x.name}</b>
                        {x.alch?.latinName && <span className="small muted"> <i>{x.alch.latinName}</i></span>}
                        <div className="small muted">{x.desc}</div>
                        {x.alch?.rules && (
                          <details className="small">
                            <summary>Účinek{x.alch.pages ? ` (${x.alch.source} s. ${x.alch.pages})` : ''}</summary>
                            <p style={{ margin: '4px 0', whiteSpace: 'pre-line' }}>{x.alch.rules}</p>
                          </details>
                        )}
                        {pv && <span className="pill ok">{pv}</span>}
                        {warnings(x).map(([cl, t]) => <span key={t}> <span className={`pill ${cl}`}>{t}</span></span>)}
                        {x.custom && (
                          <span className="kat-own">
                            <button className="linkbtn" type="button" onClick={() => setEditing(x.custom!)}>upravit</button>
                            <button className="linkbtn" type="button" onClick={() => { dispatch({ type: 'update', fn: (cc) => deleteCustom(cc, x.id) }); setToast(`Smazáno z katalogu: ${x.name} (postavě zůstává)`); }}>smazat z katalogu</button>
                          </span>
                        )}
                      </td>
                      <td className="c kat-w">{x.w ?? '—'}</td>
                      <td className="c kat-p" style={{ whiteSpace: 'nowrap' }}>
                        {x.alch ? (
                          <span style={{ display: 'inline-flex', gap: 2 }} title="Výrobky nemají v pravidlech pevnou cenu – zadej, kolik chce obchodník / PJ">
                            <input className="field num tn" inputMode="decimal" placeholder="dle PJ" aria-label={`Cena – ${x.name}`} style={{ width: 62, height: 30, fontSize: 15 }}
                              value={alchPrice[x.id]?.v ?? ''} onChange={(e) => setAlchPrice((s) => ({ ...s, [x.id]: { v: e.target.value, cur: s[x.id]?.cur ?? 'zl' } }))} />
                            <select className="field" aria-label={`Měna – ${x.name}`} style={{ height: 30, width: 52, padding: '0 2px' }}
                              value={alchPrice[x.id]?.cur ?? 'zl'} onChange={(e) => setAlchPrice((s) => ({ ...s, [x.id]: { v: s[x.id]?.v ?? '', cur: e.target.value as ItemPrice['cur'] } }))}>
                              <option value="zl">zl</option><option value="st">st</option><option value="md">md</option>
                            </select>
                          </span>
                        ) : formatPrice(x.price)}
                      </td>
                      <td className="kat-q" style={{ width: 70 }}>
                        {x.multi && (
                          <input className="field num tn" type="number" min={1} aria-label={`Počet kusů – ${x.name}`} value={n} style={{ height: 30, fontSize: 15 }}
                            onChange={(e) => setQty((s) => ({ ...s, [x.id]: Math.max(1, Math.trunc(Number(e.target.value)) || 1) }))} />
                        )}
                      </td>
                      <td className="kat-b" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn" type="button" onClick={() => take(x, false)}>Přidat</button>{' '}
                        <button className="btn dark" type="button" disabled={short > 0 || !x.price} title={!x.price ? (x.alch ? 'Nejdřív zadej cenu' : 'Bez ceny') : short > 0 ? `Chybí ${formatMd(short)}` : undefined} onClick={() => take(x, true)}>Koupit</button>
                        {x.price && short > 0 && <div className="small" style={{ color: 'var(--blood)' }}>chybí {formatMd(short)}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <p className="muted">{tab === 'custom' && !q ? 'Zatím žádné vlastní položky. Vlastní věci schvaluje PJ.' : 'Nic neodpovídá.'}</p>}
        </div>
        <div className="dlg-foot">
          <span className="small muted" role="status">{toast || (tab === 'alch'
            ? 'Výrobky podle H10 a PPP03. Pravidla neurčují jejich cenu – ke koupi zadej cenu podle PJ. Lektvary, elixíry a jedy váží jako flakón (0,2 lb); váhu jde ve výbavě přepsat.'
            : 'Ceny a parametry podle H15. Zbroj a štít se rovnou nasadí, dosavadní jde do výbavy.')}</span>
          <button className="btn dark" type="button" onClick={() => ref.current?.close()}>Hotovo</button>
        </div>
      </div>
    </dialog>
  );
}

const TYPE_LABEL: Record<CustomItemType, string> = { weapon: 'Zbraň', armor: 'Zbroj', shield: 'Štít', gear: 'Vybavení' };

function CustomForm({ initial, onSave, onCancel }: { initial: CustomCatalogItem | null; onSave: (x: Omit<CustomCatalogItem, 'id'> & { id?: string }, andAdd: boolean) => void; onCancel: () => void }) {
  const [type, setType] = useState<CustomItemType>(initial?.type ?? 'weapon');
  const [name, setName] = useState(initial?.name ?? '');
  const [weight, setWeight] = useState(String(initial?.weightLb ?? ''));
  const [price, setPrice] = useState(initial?.price ? String(initial.price.v) : '');
  const [cur, setCur] = useState<ItemPrice['cur']>(initial?.price?.cur ?? 'zl');
  const [desc, setDesc] = useState(initial?.desc ?? '');
  const w0 = initial?.weapon;
  const a0 = initial?.armor;
  const [att, setAtt] = useState(String(w0?.attack ?? 0));
  const [dmg, setDmg] = useState(String(w0?.damage ?? 0));
  const [def, setDef] = useState(String(w0?.defense ?? 0));
  const [kind, setKind] = useState<WeaponKind>(w0?.kind ?? 'melee');
  const [grip, setGrip] = useState<'one-handed' | 'two-handed'>(w0?.grip ?? 'one-handed');
  const [quality, setQuality] = useState(String(a0?.quality ?? 1));
  const [stealth, setStealth] = useState(a0?.stealth != null ? String(a0.stealth) : '');
  const [category, setCategory] = useState(a0?.category ?? w0?.category ?? 'Lehké');
  const [req, setReq] = useState(String(w0?.strReq ?? a0?.strReq ?? ''));

  const int = (s: string) => Math.trunc(Number(s)) || 0;
  const num = (s: string) => Math.max(0, Number(String(s).replace(',', '.')) || 0);
  const optInt = (s: string) => (s.trim() === '' ? null : int(s));
  const valid = name.trim().length > 0;

  const build = (): Omit<CustomCatalogItem, 'id'> & { id?: string } => ({
    ...(initial ? { id: initial.id } : {}),
    type, name, weightLb: num(weight), desc,
    price: price.trim() === '' ? null : { v: num(price), cur },
    ...(type === 'weapon' ? { weapon: { name, attack: int(att), damage: int(dmg), defense: int(def), strReq: optInt(req), kind, category, damageTypes: [], grip } } : {}),
    ...(type === 'armor' || type === 'shield' ? { armor: { quality: int(quality), strReq: optInt(req), category, stealth: type === 'armor' ? optInt(stealth) : null } } : {}),
  });

  const f = (label: string, value: string, set: (v: string) => void, props: Record<string, unknown> = {}) => (
    <label className="kf"><span className="lbl">{label}</span><input className="field" value={value} onChange={(e) => set(e.target.value)} {...props} /></label>
  );

  return (
    <form className="kat-form" onSubmit={(e) => { e.preventDefault(); if (valid) onSave(build(), false); }}>
      <div className="chips" role="group" aria-label="Druh položky">
        {(Object.keys(TYPE_LABEL) as CustomItemType[]).map((t) => <button key={t} type="button" className="chip" aria-pressed={type === t} onClick={() => setType(t)}>{TYPE_LABEL[t]}</button>)}
      </div>
      <div className="kf-grid">
        {f('Název', name, setName, { required: true, autoComplete: 'off', style: { minWidth: 180 } })}
        {f('Hmotnost (lb)', weight, setWeight, { inputMode: 'decimal' })}
        <label className="kf"><span className="lbl">Cena</span>
          <span style={{ display: 'flex', gap: 4 }}>
            <input className="field" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="bez ceny" aria-label="Cena" />
            <select className="field" value={cur} onChange={(e) => setCur(e.target.value as ItemPrice['cur'])} aria-label="Měna"><option value="zl">zl</option><option value="st">st</option><option value="md">md</option></select>
          </span>
        </label>
        {type === 'weapon' && <>
          {f('Útočnost', att, setAtt, { inputMode: 'numeric' })}
          {f('Zranění', dmg, setDmg, { inputMode: 'numeric' })}
          {f('Obrana', def, setDef, { inputMode: 'numeric' })}
          <label className="kf"><span className="lbl">Druh</span>
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value as WeaponKind)}>
              {(Object.keys(WEAPON_KIND) as WeaponKind[]).map((k) => <option key={k} value={k}>{WEAPON_KIND[k]}</option>)}
            </select>
          </label>
          <label className="kf"><span className="lbl">Držení</span>
            <select className="field" value={grip} onChange={(e) => setGrip(e.target.value as 'one-handed' | 'two-handed')}>
              <option value="one-handed">jednoruční</option><option value="two-handed">obouruční</option>
            </select>
          </label>
        </>}
        {(type === 'armor' || type === 'shield') && <>
          {f('Kvalita', quality, setQuality, { inputMode: 'numeric' })}
          {type === 'armor' && f('Plížení (postih)', stealth, setStealth, { inputMode: 'numeric', placeholder: 'bez postihu' })}
        </>}
        {type !== 'gear' && <>
          {f('SIL min. (oprava)', req, setReq, { inputMode: 'numeric', placeholder: 'bez omezení' })}
          {f('Kategorie', category, setCategory)}
        </>}
      </div>
      {f('Popis / poznámka', desc, setDesc)}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn dark" type="submit" disabled={!valid}>Uložit do katalogu</button>
        {!initial && <button className="btn" type="button" disabled={!valid} onClick={() => onSave(build(), true)}>Uložit a přidat postavě</button>}
        <button className="btn" type="button" onClick={onCancel}>Zpět</button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Vlastní položky nejsou v pravidlech – parametry schvaluje PJ. Úprava v katalogu nemění kusy, které už postava má.</p>
    </form>
  );
}
