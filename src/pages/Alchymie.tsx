// Záložka ALCHYMIE (milník 7a): zdroje (mana, suroviny, základy), dílna, známé recepty s filtrem
// „Lze vyrobit / Něco chybí“, výroba s kontrolou a odečtem i při neúspěchu, výrobky a záznam (H10, PPP03).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Character, Workshop } from '../model/types';
import {
  ACTIVE_LIMIT, ALCH_PRICES, ALL_BASES, BRANCH_TEXT, SIBERIO, TIER_LABEL, WORKSHOPS, WORKSHOP_KIND, addBase, adjustResource, alch,
  artRow, baseCandidates, baseMatches, buyResource, canBeOil, canRecharge, capacity, craft, craftBonus, discardCrafted, distill,
  drainExtra, endEffect, gather, gatherYield, knownRecipes, manaBonus, materialsBonus, perceiveMin, planCraft, processHours,
  recipeById, recipeMissing, rechargeExtra, setBaseQty, setWorkshop, transform, undoAlchemy, useCrafted, workshopDef,
  COMBAT_SIDE_EFFECTS, CONCENTRATE_EFFECTS, PPP03_RULES, WAND_WOODS, canBatch, canCombatConsume, canConcentrate, canSamovar, extraMaxFor,
  itemDifficulty, recycle, recycleInfo, sabotage, WORKSHOP_SKILLS,
  type BaseCandidate, type CraftOptions, type RecipeDef,
} from '../rules/alchemy';
import { progressionFor, progressionName } from '../progression/levelup';
import { canInfuse, isMedicus, makeAerosol, splitInjection } from '../rules/medicus';
import { MedicusSheet, SesivanciSheet } from './Medicus';
import { KonstruktySheet, PyromantSheet } from './Pyromant';
import { firearmToWeapons, isPyromant } from '../rules/pyromant';
import { isTheurg } from '../rules/theurg';
import { AstralniSferySheet, PosloveSheet, TheurgSheet } from './Theurg';
import { sgn, type Derived } from '../rules/derive';
import { formatMd } from '../rules/money';
import { useStore } from '../state/store';
import { useDice } from '../ui/Dice';
import { Icon } from '../ui/Icon';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

type Upd = (next: Character) => void;
const SKILL_LABEL: Record<string, string> = { lucba: 'Lučba', mechanika: 'Mechanika', chirurgie: 'Chirurgie', pyromancie: 'Pyromancie', theurgie: 'Theurgie', vyroba_svitku: 'Výroba svitků' };
const skillLabel = (id: string) => SKILL_LABEL[id] ?? id;
const WS_WHERE: Record<Workshop['kind'], string> = { zakladni: 'v dílně', laborator: 'v laboratoři', vyhen: 've výhni', astrolab: 'v astrolábu' };
const wsWhere = (r: RecipeDef) => WS_WHERE[r.craftTime.workshopKind ?? 'zakladni'];
const wsName = (r: RecipeDef) => (r.craftTime.workshopKind ? WORKSHOP_KIND[r.craftTime.workshopKind].name.replace(/ \(.*\)/, '').toLowerCase() : 'dílna');
const cz = (n: number) => n.toLocaleString('cs');
const hasAb = (c: Character, id: string) => c.progression.learnedAbilities.some((a) => a.id === id);

export function Alchymie() {
  const { character: c, derived: d, dispatch } = useStore();
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 4000); return () => clearTimeout(t); }, [msg]);
  const put: Upd = (next) => dispatch({ type: 'update', fn: () => next });
  const s = alch(c);
  return (
    <div className="stack al-page">
      <div className="vy-head">
        <h1 className="pg">ALCHYMIE</h1>
        {s.undo.length > 0 && <button className="btn" type="button" onClick={() => put(undoAlchemy(c))} title={s.log[0]?.text}>↶ Vrátit: {s.log[0]?.text.slice(0, 40)}{(s.log[0]?.text.length ?? 0) > 40 ? '…' : ''}</button>}
      </div>
      {msg && <div className="toast" role="status">{msg}</div>}
      <div className="cols">
        <div className="stack">
          <Zdroje c={c} d={d} put={put} say={setMsg} />
          <Dilna c={c} put={put} />
          <Zaklady c={c} put={put} />
        </div>
        <div className="stack">
          <Vyrobky c={c} d={d} put={put} say={setMsg} />
          <Obory c={c} />
          <Zaznam c={c} />
        </div>
      </div>
      {isMedicus(c) && (
        <div className="cols">
          <MedicusSheet c={c} d={d} />
          <SesivanciSheet c={c} d={d} put={put} say={setMsg} />
        </div>
      )}
      {isPyromant(c) && (
        <div className="cols">
          <PyromantSheet c={c} d={d} put={put} say={setMsg} />
          <KonstruktySheet c={c} d={d} put={put} say={setMsg} />
        </div>
      )}
      {isTheurg(c) && <>
        <div className="cols">
          <TheurgSheet c={c} d={d} put={put} say={setMsg} />
          <PosloveSheet c={c} d={d} put={put} say={setMsg} />
        </div>
        <AstralniSferySheet c={c} d={d} put={put} say={setMsg} />
      </>}
      <Recepty c={c} d={d} put={put} say={setMsg} />
    </div>
  );
}

type P = { c: Character; d: Derived; put: Upd; say: (s: string) => void };

// ---------------------------------------------------------------- zdroje

type Proc = 'destilace' | 'transformace' | 'sber' | 'vnimani' | 'nakup' | null;

function Zdroje({ c, d, put, say }: P) {
  const s = alch(c);
  const cap = capacity(c);
  const [proc, setProc] = useState<Proc>(null);
  const [adj, setAdj] = useState({ mana: 0, materials: 0 });
  const overM = cap.mana > 0 && c.vitals.manaCurrent > cap.mana;
  const overS = cap.materials > 0 && s.materialsCurrent > cap.materials;
  const weight = Math.round(((c.vitals.manaCurrent + s.materialsCurrent) / 100) * 10) / 10;
  const res = (kind: 'mana' | 'materials', label: string, value: number, max: number, over: boolean) => (
    <div className="al-res">
      <span className="lbl">{label}</span>
      <b className={`al-big tn ${over ? 'bad-t' : ''}`}>{cz(value)}</b>
      <span className="small muted tn">{max ? `z ${cz(max)}` : 'bez nádob'}</span>
      <span className="al-adj">
        <input className="field num tn" type="number" value={adj[kind] || ''} placeholder="±" aria-label={`Upravit ${label.toLowerCase()} o`}
          onChange={(e) => setAdj((a) => ({ ...a, [kind]: Math.trunc(Number(e.target.value)) || 0 }))} />
        <button className="btn" type="button" disabled={!adj[kind]} onClick={() => { put(adjustResource(c, kind, adj[kind])); setAdj((a) => ({ ...a, [kind]: 0 })); }}>Upravit</button>
      </span>
    </div>
  );
  return (
    <Sheet>
      <Ribbon icon="flask">ZDROJE</Ribbon>
      <div className="al-resrow">
        {res('mana', 'Mana', c.vitals.manaCurrent, cap.mana, overM)}
        {res('materials', 'Suroviny', s.materialsCurrent, cap.materials, overS)}
      </div>
      <p className="small muted" style={{ margin: '6px 0 0' }}>
        Kapacita: {cap.source}. Mana a suroviny váží {weight} lb (100 bodů = 1 lb).
        {(overM || overS) && <span className="bad-t"> Víc, než se vejde – dokup nádoby nebo zařiď dílnu.</span>}
      </p>
      <div className="chips" style={{ marginTop: 10 }}>
        {([['destilace', 'Destilace'], ['transformace', 'Transformace'], ['sber', 'Dlouhodobý sběr'], ['vnimani', 'Vnímání many'], ['nakup', 'Nákup']] as const).map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={proc === k} onClick={() => setProc(proc === k ? null : k)}>{l}</button>
        ))}
      </div>
      {proc && <Process key={proc} kind={proc} c={c} d={d} put={put} say={say} close={() => setProc(null)} />}
    </Sheet>
  );
}

function Process({ kind, c, d, put, say, close }: P & { kind: NonNullable<Proc>; close: () => void }) {
  const { roll } = useDice();
  const [amount, setAmount] = useState(kind === 'nakup' ? 10 : 30);
  const [hours, setHours] = useState(1);
  const [focus, setFocus] = useState<'mana' | 'materials'>('materials');
  const [buyKind, setBuyKind] = useState<'mana' | 'materials'>('mana');
  const [result, setResult] = useState<number | ''>('');
  const bonus = kind === 'destilace' ? manaBonus(c, d) : kind === 'vnimani' ? manaBonus(c, d, false) : kind === 'transformace' ? materialsBonus(c, d)
    : focus === 'mana' ? manaBonus(c, d) : materialsBonus(c, d);
  const diff = kind === 'destilace' || kind === 'transformace' ? artRow(amount).process : null;
  const doRoll = (label: string) => { const r = roll('k10', bonus.total, label); setResult(r.total); };
  const r = typeof result === 'number' ? result : null;

  if (kind === 'nakup') {
    const price = amount * (buyKind === 'mana' ? ALCH_PRICES.manaMd : ALCH_PRICES.materialsMd);
    return (
      <div className="al-proc">
        <p className="small" style={{ margin: 0 }}>Čistá mana stojí 3 st za bod, čisté suroviny 3 md za bod (H10). Mince se rozmění.</p>
        <div className="steps">
          <select className="field" value={buyKind} onChange={(e) => setBuyKind(e.target.value as 'mana' | 'materials')} aria-label="Co koupit"><option value="mana">mana</option><option value="materials">suroviny</option></select>
          <input className="field num tn" type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} aria-label="Množství" />
          <span className="small tn">= {formatMd(price)}</span>
          <button className="btn dark" type="button" onClick={() => { const x = buyResource(c, buyKind, amount); if (x.error) say(x.error); else { put(x.character); close(); } }}>Koupit</button>
        </div>
      </div>
    );
  }
  const intro: Record<string, string> = {
    destilace: 'Zdroj s manou (PJ řekne kolik). Hod 1k10 + INT + Práce s manou musí být vyšší než obtížnost, jinak je zdroj ztracen. Hází se na začátku.',
    transformace: 'Zdroj surovin (PJ řekne kolik). Hod 1k10 + OBR + Lučba musí být vyšší než obtížnost, jinak je zdroj ztracen.',
    sber: 'Zjednodušený sběr (max. 10 h denně, náročná činnost). Podle hodu tabulka umění určí zisk: mana za 10 h, suroviny za 1 h. Hod 5 a méně = neúspěch.',
    vnimani: 'Asi minuta soustředění. Hod určí, od jakého množství many ji v předmětu poznáš; o přesném obsahu rozhoduje PJ.',
  };
  const hoursNeed = kind === 'destilace' ? processHours(c, d, 'mana', amount) : kind === 'transformace' ? processHours(c, d, 'materials', amount) : null;
  return (
    <div className="al-proc">
      <p className="small" style={{ margin: 0 }}>{intro[kind]}</p>
      <div className="steps" style={{ alignItems: 'center' }}>
        {(kind === 'destilace' || kind === 'transformace') && (
          <label className="small">Množství ve zdroji <input className="field num tn" type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} /></label>
        )}
        {kind === 'sber' && <>
          <select className="field" value={focus} onChange={(e) => setFocus(e.target.value as 'mana' | 'materials')} aria-label="Zaměření sběru"><option value="materials">suroviny</option><option value="mana">mana</option></select>
          <label className="small">hodin <input className="field num tn" type="number" min={1} max={10} value={hours} onChange={(e) => setHours(Math.max(1, Math.min(10, Math.trunc(Number(e.target.value)) || 1)))} /></label>
        </>}
      </div>
      <p className="small tn" style={{ margin: 0 }}>
        Hod: 1k10 {sgn(bonus.total)} <span className="muted">({bonus.parts.join(' + ')})</span>
        {diff != null && <> · obtížnost <b>{diff}</b> (hod musí být vyšší)</>}
        {hoursNeed != null && <> · doba asi {hoursNeed} h</>}
      </p>
      <div className="steps" style={{ alignItems: 'center' }}>
        <button className="btn" type="button" onClick={() => doRoll(kind === 'vnimani' ? 'Vnímání many' : kind === 'sber' ? `Sběr ${focus === 'mana' ? 'many' : 'surovin'}` : kind === 'destilace' ? 'Destilace' : 'Transformace')}>⚄ Hodit</button>
        <label className="small">nebo výsledek <input className="field num tn" type="number" value={result} onChange={(e) => setResult(e.target.value === '' ? '' : Math.trunc(Number(e.target.value)))} aria-label="Výsledek hodu" /></label>
        {r != null && kind === 'vnimani' && <span className="small">{perceiveMin(r) != null ? <>Poznáš manu od <b>{cz(perceiveMin(r)!)}</b> bodů výš.</> : 'Nic nezjistíš – znovu až po přestupu.'}</span>}
        {r != null && kind === 'sber' && (() => { const g = gatherYield(r, focus, hours); return <span className="small">{g.fail ? 'Neúspěch – nic a navíc něco nepříjemného (PJ).' : <>Zisk <b>{g.amount}</b> {focus === 'mana' ? 'many' : 'surovin'}.</>}</span>; })()}
        {r != null && diff != null && <span className={`small ${r > diff ? '' : 'bad-t'}`}>{r > diff ? 'Úspěch' : 'Neúspěch – zdroj ztracen'}</span>}
      </div>
      <div className="steps">
        {kind !== 'vnimani' && (
          <button className="btn dark" type="button" disabled={r == null} onClick={() => {
            if (r == null) return;
            if (kind === 'destilace') { const x = distill(c, amount, r); put(x.character); say(x.success ? `Destilace: +${amount} many` : 'Destilace se nezdařila – zdroj ztracen'); }
            if (kind === 'transformace') { const x = transform(c, amount, r); put(x.character); say(x.success ? `Transformace: +${amount} surovin` : 'Transformace se nezdařila – zdroj ztracen'); }
            if (kind === 'sber') { const x = gather(c, focus, hours, r); put(x.character); say(x.fail ? 'Sběr se nezdařil' : `Sběr: +${x.amount}`); }
            close();
          }}>Zapsat výsledek</button>
        )}
        <button className="btn" type="button" onClick={close}>Zavřít</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- dílna

function Dilna({ c, put }: { c: Character; put: Upd }) {
  const s = alch(c);
  const w = s.workshop;
  const def = workshopDef(w);
  const spec = c.progression.specialization;
  const set = (patch: Partial<Workshop> | null) => put(setWorkshop(c, patch === null ? null : { size: 1, kind: 'zakladni', access: 'vlastni', here: true, ...(w ?? {}), ...patch }));
  return (
    <Sheet>
      <Ribbon icon="flask">DÍLNA</Ribbon>
      <div className="al-ws">
        <label className="kf"><span className="lbl">Velikost</span>
          <select className="field" value={w?.size ?? 0} onChange={(e) => { const v = Number(e.target.value); set(v ? { size: v as Workshop['size'] } : null); }}>
            <option value={0}>žádná</option>
            {WORKSHOPS.map((x) => <option key={x.size} value={x.size}>{x.size}. {x.name}</option>)}
          </select>
        </label>
        {w && <>
          <label className="kf"><span className="lbl">Druh</span>
            <select className="field" value={w.kind} onChange={(e) => set({ kind: e.target.value as Workshop['kind'] })}>
              {(Object.keys(WORKSHOP_KIND) as Workshop['kind'][]).map((k) => (
                <option key={k} value={k} disabled={!!WORKSHOP_KIND[k].spec && WORKSHOP_KIND[k].spec !== spec}>{WORKSHOP_KIND[k].name}</option>
              ))}
            </select>
          </label>
          <label className="kf"><span className="lbl">Přístup</span>
            <select className="field" value={w.access} onChange={(e) => set({ access: e.target.value as Workshop['access'] })}>
              <option value="vlastni">vlastní</option><option value="pronajem">pronájem</option><option value="cech">cech</option>
            </select>
          </label>
          <label className="small al-here"><input type="checkbox" checked={w.here} onChange={(e) => set({ here: e.target.checked })} /> právě v ní pracuji</label>
        </>}
      </div>
      {def ? (
        <p className="small" style={{ margin: '8px 0 0' }}>
          Bonus <b>+{def.bonus}</b> k Lučbě (a destilaci){w && WORKSHOP_SKILLS[w.kind].length ? ` i k ${WORKSHOP_SKILLS[w.kind].map(skillLabel).join(' a ')}` : ''} {w?.here ? '– platí' : '– platí jen při práci v dílně'} · recepty „v dílně“ {w?.here ? 'odemčené' : 'jen na místě'} ·
          destilace {def.distill}× rychlejší · max. {cz(def.maxMana)} many a {cz(def.maxMaterials)} surovin {w?.access === 'vlastni' ? '(vlastní dílna = tvoje kapacita)' : '(kapacita jen ve vlastní dílně)'} ·
          {w?.access === 'pronajem' ? ` pronájem ${def.rentHour}/h` : ` údržba ${def.upkeep} denně (nebo ${def.upkeepHours} h práce)`} · zřízení {cz(def.setupZl)} + {cz(def.equipZl)} zl
        </p>
      ) : <p className="small muted" style={{ margin: '8px 0 0' }}>Bez dílny nejdou recepty „v dílně“ (magické předměty) a mana se drží jen v nádobách. Dílna má 4 velikosti (PPP03).</p>}
    </Sheet>
  );
}

// ---------------------------------------------------------------- základy

function Zaklady({ c, put }: { c: Character; put: Upd }) {
  const s = alch(c);
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [w, setW] = useState('0.2');
  const known = ALL_BASES.find((b) => b.text === name);
  return (
    <Sheet>
      <Ribbon icon="leaf">ZÁKLADY</Ribbon>
      <div className="scroll-x">
        <table className="grid tn vy-table">
          <thead><tr><th>Základ</th><th className="c">Ks</th><th className="c">lb/ks</th><th /></tr></thead>
          <tbody>
            {s.bases.length === 0 && <tr><td colSpan={4} className="muted small">Žádné základy. Recepty můžou použít i věci z výbavy (dýka, štít, lucerna…).</td></tr>}
            {s.bases.map((b) => (
              <tr key={b.uid}>
                <td>{b.name}</td>
                <td className="c"><span className="steps vy-qty">
                  <button className="btn" type="button" aria-label={`Ubrat ${b.name}`} onClick={() => put(setBaseQty(c, b.uid, b.qty - 1))}>−</button>
                  <span>{b.qty}</span>
                  <button className="btn" type="button" aria-label={`Přidat ${b.name}`} onClick={() => put(setBaseQty(c, b.uid, b.qty + 1))}>+</button>
                </span></td>
                <td className="c">{b.weightLb}</td>
                <td className="c acts"><button className="icon-x" type="button" aria-label={`Odebrat ${b.name}`} onClick={() => put(setBaseQty(c, b.uid, 0))}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="steps al-addbase">
        <input className="field" list="al-bases" placeholder="Nový základ (z receptů nebo vlastní)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Název základu" />
        <datalist id="al-bases">{ALL_BASES.map((b) => <option key={b.baseId} value={b.text} />)}</datalist>
        <input className="field num tn" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} aria-label="Počet kusů" />
        <input className="field num tn" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} aria-label="Hmotnost kusu v lb" title="lb za kus" />
        <button className="btn dark" type="button" disabled={!name.trim()} onClick={() => { put(addBase(c, name, qty, Math.max(0, Number(w.replace(',', '.')) || 0), known?.baseId)); setName(''); setQty(1); }}>Přidat</button>
      </div>
      <p className="small muted" style={{ margin: '6px 0 0' }}>Základy z nabídky se k receptům spárují přesně, vlastní podle názvu. Při výrobě jde základ vybrat i ručně.</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- recepty

type Filter = 'vse' | 'ok' | 'miss';
type MissKey = 'mana' | 'materials' | 'bases' | 'workshop';
const MISS_LABEL: Record<MissKey, string> = { mana: 'mana', materials: 'suroviny', bases: 'základy', workshop: 'dílna' };

function Recepty({ c, d, put, say }: P) {
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filter>('vse');
  const [miss, setMiss] = useState<Set<MissKey>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [crafting, setCrafting] = useState<RecipeDef | null>(null);
  const rows = useMemo(() => knownRecipes(c).map((r) => ({ r, m: recipeMissing(c, r) })), [c]);
  const count = (fn: (x: (typeof rows)[number]) => boolean) => rows.filter(fn).length;
  const nMiss = (m: (typeof rows)[number]['m']) => (m.mana ? 1 : 0) + (m.materials ? 1 : 0) + m.bases.length + (m.workshop ? 1 : 0);
  const list = rows
    .filter(({ r }) => r.name.toLowerCase().includes(q.trim().toLowerCase()))
    .filter(({ m }) => f === 'vse' || (f === 'ok' ? m.ok : !m.ok))
    .filter(({ m }) => f !== 'miss' || !miss.size || [...miss].some((k) => (k === 'bases' ? m.bases.length > 0 : m[k])))
    .sort((a, b) => Number(b.m.ok) - Number(a.m.ok) || nMiss(a.m) - nMiss(b.m) || a.r.name.localeCompare(b.r.name, 'cs'));
  const toggleMiss = (k: MissKey) => setMiss((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="book">RECEPTY</Ribbon><span className="small muted">{rows.length} známých · {count((x) => x.m.ok)} lze vyrobit</span></div>
      <div className="steps" style={{ alignItems: 'center' }}>
        <input className="field" placeholder="Hledat recept…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Hledat recept" style={{ flex: 1, minWidth: 160 }} />
        <div className="chips">
          <button type="button" className="chip" aria-pressed={f === 'vse'} onClick={() => setF('vse')}>Vše ({rows.length})</button>
          <button type="button" className="chip" aria-pressed={f === 'ok'} onClick={() => setF('ok')}>Lze vyrobit ({count((x) => x.m.ok)})</button>
          <button type="button" className="chip" aria-pressed={f === 'miss'} onClick={() => setF('miss')}>Něco chybí ({count((x) => !x.m.ok)})</button>
        </div>
      </div>
      {f === 'miss' && (
        <div className="chips" style={{ marginTop: 6 }}>
          <span className="small muted">Chybí:</span>
          {(Object.keys(MISS_LABEL) as MissKey[]).map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={miss.has(k)} onClick={() => toggleMiss(k)}>
              {MISS_LABEL[k]} ({count((x) => (k === 'bases' ? x.m.bases.length > 0 : x.m[k]))})
            </button>
          ))}
        </div>
      )}
      <div className="al-list">
        {list.length === 0 && <p className="muted">Nic neodpovídá.</p>}
        {list.map(({ r, m }) => (
          <div className="recipe al-recipe" key={r.id}>
            <div>
              <h4>
                <button type="button" className="linkbtn al-name" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>{r.name}</button>
                {' '}<span className="pill">{r.tier === 'ability' && r.requires?.ability ? progressionName('alchymista', r.requires.ability).toUpperCase() : r.tier === 'specialization' ? (r.tags[0] ?? TIER_LABEL[r.tier]).toUpperCase() : TIER_LABEL[r.tier].toUpperCase()}</span>
                {r.craftTime.workshopRequired && <> <span className={`pill ${m.workshop ? 'bad' : ''}`}>{wsWhere(r).toUpperCase()}</span></>}
                {r.craftSkill && <> <span className="pill">{skillLabel(r.craftSkill).toUpperCase()}</span></>}
                {r.requiresMoment && <> <span className="pill">{r.requiresMoment.toUpperCase()}</span></>}
                {m.ok && <> <span className="pill ok">MŮŽEŠ VYROBIT</span></>}
              </h4>
              <div className="meta tn">
                <span className={m.mana ? 'miss' : ''}>mana {r.mana.text ?? r.mana.base}</span> · <span className={m.materials ? 'miss' : ''}>suroviny {r.materialsText ?? r.materials ?? '—'}</span> ·
                obtížnost {r.difficulty.text ?? r.difficulty.value} · {r.craftTime.text}
              </div>
              <div className="meta">
                základ: {r.bases.map((b, i) => <span key={i} className={m.bases.includes(b.text) ? 'miss' : ''}>{i ? ', ' : ''}{b.text}{b.optional ? ' (nepovinný)' : ''}</span>)}
              </div>
              {!m.ok && <div className="meta miss">Chybí: {[m.mana && 'mana', m.materials && 'suroviny', ...m.bases, m.workshop && wsName(r)].filter(Boolean).join(', ')}</div>}
            </div>
            <button className={`btn ${m.ok ? 'dark' : ''}`} type="button" onClick={() => setCrafting(r)}>Vyrobit…</button>
            {open === r.id && <RecipeDetail r={r} />}
          </div>
        ))}
      </div>
      {crafting && <CraftDialog r={crafting} c={c} d={d} put={put} say={say} onClose={() => setCrafting(null)} />}
    </Sheet>
  );
}

function RecipeDetail({ r }: { r: RecipeDef }) {
  const rows: [string, string | null][] = [
    ['Latinsky', r.latinName], ['Popis', r.description], ['Trvání', r.durationText], ['Životnost', r.lifespanText], ['Četnost', r.frequencyText],
    ['Použití', r.useText], ['Ověření', r.check], ['Výroba', r.craftTime.text], ['Hod výroby', r.craftSkill ? `1k10 + ${skillLabel(r.craftSkill)} (místo Lučby)` : null], ['Štítky', r.tags.join(', ') || null], [`Strana ${r.source ?? 'H10'}`, r.pages],
  ];
  return (
    <div className="al-detail">
      <dl>{rows.filter(([, v]) => v).map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k.toUpperCase()}</dt><dd>{v}</dd></div>)}</dl>
      {r.id === 'siberiovy_posilujici_elixiry' && (
        <table className="grid tn small"><thead><tr><th>Bonus</th><th className="c">Mana</th><th className="c">Obtížnost</th></tr></thead>
          <tbody>{SIBERIO.byBonus.map((x) => <tr key={x.bonus}><td>+{x.bonus}</td><td className="c">{x.mana}</td><td className="c">{x.difficulty}</td></tr>)}</tbody></table>
      )}
      {r.rules && <p>{r.rules}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- výroba

function CraftDialog({ r, c, d, put, say, onClose }: P & { r: RecipeDef; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { roll } = useDice();
  useEffect(() => { const dlg = ref.current; if (dlg && !dlg.open) dlg.showModal(); }, []);
  const [o, setO] = useState<CraftOptions>({ variant: -1, extraMana: extraMaxFor(r, {}, c) ?? 0, siberioBonus: 1, form: 'potion', manualMana: 0, batch: 1, concentrate: -1, wandWood: WAND_WOODS[0].id });
  const exMax = extraMaxFor(r, o, c);
  const reqs = o.form === 'oil' ? [...r.bases, { baseId: 'olej', text: 'olej (2 dl) – forma oleje', match: [['olej']] }] : r.bases;
  const cands = baseCandidates(c);
  const [assign, setAssign] = useState<(BaseCandidate | null)[] | null>(null);
  const [subst, setSubst] = useState<boolean[]>([]);
  const opts: CraftOptions = { ...o, assign: assign && assign.length === reqs.length ? assign : undefined, substituted: subst };
  const plan = planCraft(c, r, opts);
  const bonus = craftBonus(c, d, !!o.precise, plan.combat, r);
  const [result, setResult] = useState<number | ''>('');
  const [danger, setDanger] = useState<number | ''>('');
  const upd = (patch: Partial<CraftOptions>) => { setO((x) => ({ ...x, ...patch })); if ('form' in patch) { setAssign(null); setSubst([]); } };
  const res = typeof result === 'number' ? result : null;
  const success = res != null && plan.difficulty != null && res > plan.difficulty;
  const setOne = (i: number, uid: string) => {
    const base = plan.assign.slice();
    base[i] = uid === '' ? null : cands.find((x) => x.uid === uid) ?? null;
    setAssign(base);
  };
  const substitution = hasAb(c, 'substituce');
  return (
    <dialog ref={ref} className="wide" onClose={onClose} aria-labelledby="craft-title">
      <div className="sheet torn">
        <Ribbon icon="flask" id="craft-title">VÝROBA: {r.name.toUpperCase()}</Ribbon>
        <div className="al-craft">
          <div className="stack" style={{ gap: 10 }}>
            {r.mana.variants && (
              <label className="kf"><span className="lbl">Varianta</span>
                <select className="field" value={o.variant} onChange={(e) => upd({ variant: Number(e.target.value) })}>
                  <option value={-1}>základní – mana {r.mana.base}{r.materialsVariants ? `, suroviny ${r.materials}` : ''}, obtížnost {r.difficulty.value}</option>
                  {r.mana.variants.map((v, i) => <option key={i} value={i}>{v.label} – mana {v.base}{r.materialsVariants?.[i] != null ? `, suroviny ${r.materialsVariants[i]}` : ''}{r.difficulty.variants?.[i] ? `, obtížnost ${r.difficulty.variants[i]}` : ''}</option>)}
                </select>
              </label>
            )}
            {r.id === 'siberiovy_posilujici_elixiry' && (
              <label className="kf"><span className="lbl">Bonus k opravě (nesmí být vyšší než oprava původního vlastníka orgánu)</span>
                <select className="field" value={o.siberioBonus} onChange={(e) => upd({ siberioBonus: Number(e.target.value) })}>
                  {SIBERIO.byBonus.map((x) => <option key={x.bonus} value={x.bonus}>+{x.bonus} – mana {x.mana}, obtížnost {x.difficulty}</option>)}
                </select>
              </label>
            )}
            {r.mana.variable && r.id !== 'siberiovy_posilujici_elixiry' && (
              <div className="steps">
                <label className="kf"><span className="lbl">Mana (cena kouzla)</span><input className="field num tn" type="number" min={1} value={o.manualMana || ''} onChange={(e) => upd({ manualMana: Math.max(0, Math.trunc(Number(e.target.value)) || 0) })} /></label>
                <label className="kf"><span className="lbl">Obtížnost kouzla</span><input className="field num tn" type="number" min={1} value={o.manualDifficulty ?? ''} onChange={(e) => upd({ manualDifficulty: e.target.value === '' ? undefined : Math.trunc(Number(e.target.value)) })} /></label>
              </div>
            )}
            {r.difficulty.variable && !r.mana.variable && (
              <label className="kf"><span className="lbl">Obtížnost – {r.difficulty.text ?? 'určí PJ'}</span><input className="field num tn" type="number" min={1} value={o.manualDifficulty ?? ''} onChange={(e) => upd({ manualDifficulty: e.target.value === '' ? undefined : Math.trunc(Number(e.target.value)) })} /></label>
            )}
            {r.mana.wand && (
              <label className="kf"><span className="lbl">Dřevo hůlky (Tabulka základu hůlek, PPP03)</span>
                <select className="field" value={o.wandWood} onChange={(e) => { const w = WAND_WOODS.find((x) => x.id === e.target.value)!; upd({ wandWood: w.id, extraMana: Math.min(o.extraMana ?? 0, w.maxMana) || w.maxMana }); }}>
                  {WAND_WOODS.map((w) => <option key={w.id} value={w.id}>{w.name} – max. {w.maxMana} přídavné many</option>)}
                </select>
              </label>
            )}
            {exMax != null && (
              <label className="kf"><span className="lbl">Přídavná mana (max. {exMax}{plan.batch > 1 ? ', za každý kus' : ''})</span>
                <input className="field num tn" type="number" min={0} max={exMax} value={Math.min(o.extraMana ?? 0, exMax)} onChange={(e) => upd({ extraMana: Math.max(0, Math.min(exMax, Math.trunc(Number(e.target.value)) || 0)) })} />
              </label>
            )}
            {(canBatch(c, r) || canConcentrate(c, r)) && (
              <div className="steps">
                {canBatch(c, r) && (
                  <label className="kf"><span className="lbl">Hromadná výroba – dávek</span>
                    <input className="field num tn" type="number" min={1} value={o.batch ?? 1} style={{ width: 70 }} onChange={(e) => upd({ batch: Math.max(1, Math.trunc(Number(e.target.value)) || 1) })} />
                  </label>
                )}
                {canConcentrate(c, r) && (
                  <label className="kf"><span className="lbl">Koncentrované substance (+½ many a surovin)</span>
                    <select className="field" value={o.concentrate ?? -1} onChange={(e) => upd({ concentrate: Number(e.target.value) })}>
                      <option value={-1}>bez posílení</option>
                      {CONCENTRATE_EFFECTS.map((x, i) => <option key={i} value={i}>{x}</option>)}
                    </select>
                  </label>
                )}
              </div>
            )}
            <div className="steps">
              {canBeOil(r) && <label className="small"><input type="checkbox" checked={o.form === 'oil'} onChange={(e) => upd({ form: e.target.checked ? 'oil' : 'potion' })} /> forma oleje (+2 dl oleje)</label>}
              {hasAb(c, 'efektivni_vyroba') && <label className="small"><input type="checkbox" checked={!!o.efficient} onChange={(e) => upd({ efficient: e.target.checked })} /> Efektivní výroba (−¼ many a surovin, +¼ času)</label>}
              {hasAb(c, 'precizni_vyroba') && <label className="small"><input type="checkbox" checked={!!o.precise} onChange={(e) => upd({ precise: e.target.checked })} /> Precizní výroba (+5, 2× čas)</label>}
              {canSamovar(c, r) && <label className="small"><input type="checkbox" checked={!!o.samovar} onChange={(e) => upd({ samovar: e.target.checked })} /> Kotlík samovar (−5 surovin za dávku)</label>}
              {canCombatConsume(c, r) && <label className="small"><input type="checkbox" checked={!!o.combat} onChange={(e) => upd({ combat: e.target.checked })} /> Bojová konzumace (v boji: −5 k hodu, +25 % many a surovin, vypiješ hned)</label>}
            </div>
            {plan.combat && (
              <details className="small"><summary>Vedlejší účinky při neúspěchu (1k10, 1 směna)</summary>
                <ol className="small" style={{ margin: '4px 0 0', paddingLeft: 22 }}>{COMBAT_SIDE_EFFECTS.map((x) => <li key={x.roll}><b>{x.name}</b> – {x.text}</li>)}</ol>
              </details>
            )}
            <table className="grid tn small al-bases">
              <thead><tr><th>Základ</th><th>Použije se</th></tr></thead>
              <tbody>
                {reqs.map((q, i) => {
                  const cur = plan.assign[i];
                  const good = cands.filter((x) => baseMatches(q, x, c));
                  return (
                    <tr key={i}>
                      <td className={!cur && !q.free && !q.optional && !subst[i] ? 'bad-t' : ''}>{q.text}{q.optional ? ' (nepovinný)' : ''}</td>
                      <td>
                        {q.free ? <span className="muted">vždy po ruce</span> : (
                          <>
                            <select className="field" value={cur?.uid ?? ''} onChange={(e) => setOne(i, e.target.value)} aria-label={`Základ: ${q.text}`}>
                              <option value="">— {q.optional ? 'bez' : 'chybí'} —</option>
                              {good.length > 0 && <optgroup label="Odpovídá">{good.map((x) => <option key={x.uid} value={x.uid}>{x.name}{x.qty > 1 ? ` (${x.qty})` : ''}{x.source !== 'base' ? ' · výbava' : ''}</option>)}</optgroup>}
                              <optgroup label="Jiné (se svolením PJ)">{cands.filter((x) => !good.includes(x)).map((x) => <option key={x.uid} value={x.uid}>{x.name}{x.source !== 'base' ? ' · výbava' : ''}</option>)}</optgroup>
                            </select>
                            {!cur && !q.optional && (
                              <label className="small"><input type="checkbox" checked={!!subst[i]} onChange={(e) => setSubst((s) => { const n = s.slice(); n[i] = e.target.checked; return n; })} /> {substitution ? 'Substituce (PJ)' : 'zajistí PJ'}</label>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <aside className="cart">
            <b className="lbl">Spotřeba (i při neúspěchu)</b>
            <dl className="pv">
              <dt>Mana</dt><dd className={plan.missing.mana ? 'bad-t' : ''}>{plan.mana} / {c.vitals.manaCurrent}</dd>
              <dt>Suroviny</dt><dd className={plan.missing.materials ? 'bad-t' : ''}>{plan.materials} / {alch(c).materialsCurrent}</dd>
              <dt>Obtížnost</dt><dd>{plan.difficulty ?? '—'}</dd>
              <dt>Čas</dt><dd style={{ fontWeight: 400 }}>{plan.timeText}</dd>
            </dl>
            {plan.missing.workshop && <p className="small bad-t">Recept se vyrábí {wsWhere(r)} – nastav {r.craftTime.workshopKind ? `druh dílny ${WORKSHOP_KIND[r.craftTime.workshopKind].name}` : 'dílnu'} a „právě v ní pracuji“.</p>}
            {r.requiresMoment && <p className="small">Magický okamžik: <b>{r.requiresMoment}</b> (hlídá PJ).</p>}
            <p className="small tn" style={{ margin: '8px 0 4px' }}>Hod 1k10 {sgn(bonus.total)}<br /><span className="muted">{bonus.parts.join(' + ')}</span></p>
            <div className="steps" style={{ alignItems: 'center' }}>
              <button className="btn" type="button" onClick={() => { const x = roll('k10', bonus.total, `Výroba – ${r.name}`); setResult(x.total); setDanger(''); }}>⚄ Hodit</button>
              <input className="field num tn" type="number" value={result} placeholder="výsledek" aria-label="Výsledek hodu" style={{ width: 80 }}
                onChange={(e) => { setResult(e.target.value === '' ? '' : Math.trunc(Number(e.target.value))); setDanger(''); }} />
            </div>
            {res != null && plan.difficulty != null && (
              success ? (
                <label className="small" style={{ display: 'block', marginTop: 6 }}>Úspěch – Nebezpečnost
                  <input className="field num tn" type="number" min={1} max={res} value={danger === '' ? res : danger} style={{ width: 70, marginLeft: 6 }}
                    onChange={(e) => setDanger(Math.max(1, Math.min(res, Math.trunc(Number(e.target.value)) || 1)))} aria-label="Nebezpečnost (lze snížit)" />
                </label>
              ) : <p className="small bad-t" style={{ margin: '6px 0 0' }}>Neúspěch (musí být vyšší než {plan.difficulty}) – zdroje propadnou.{plan.combat ? ' Appka hodí k10 na vedlejší účinek.' : ''}</p>
            )}
          </aside>
        </div>
        <div className="dlg-foot">
          <span className="small muted">{plan.ok ? 'Mana, suroviny a základy se odepíšou i při neúspěchu (H10).' : `Chybí: ${[plan.missing.mana && 'mana', plan.missing.materials && 'suroviny', ...plan.missing.bases, plan.missing.workshop && wsName(r), plan.missing.value && 'cena/obtížnost'].filter(Boolean).join(', ')}`}</span>
          <span className="steps">
            <button className="btn" type="button" onClick={() => ref.current?.close()}>Zpět</button>
            <button className="btn dark" type="button" disabled={!plan.ok || res == null}
              onClick={() => {
                const x = craft(c, d, r, opts, res!, danger === '' ? undefined : danger);
                if (x.error) { say(x.error); return; }
                put(x.character);
                const side = x.sideEffect ? ` Vedlejší účinek (${x.sideEffect.roll}): ${x.sideEffect.name} – ${x.sideEffect.text}.` : '';
                say(x.success ? `${plan.combat ? 'Vypito' : 'Vyrobeno'}: ${r.name}${plan.batch > 1 ? ` ×${plan.batch}` : ''} (Nebezpečnost ${danger === '' ? res : danger}).${side}` : `${r.name}: ${plan.combat ? 'bojová konzumace' : 'výroba'} se nezdařila, zdroje propadly.${side}`);
                ref.current?.close();
              }}>{res == null ? 'Nejdřív hoď' : success ? 'Vyrobit' : 'Zapsat neúspěch'}</button>
          </span>
        </div>
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------- výrobky, obory, záznam

function Vyrobky({ c, d, put, say }: P) {
  const s = alch(c);
  const { roll } = useDice();
  const [amt, setAmt] = useState<Record<string, number>>({});
  const [sab, setSab] = useState<{ uid: string; cond: string } | null>(null);
  const canRecycle = hasAb(c, 'recyklator');
  const canSabotage = hasAb(c, 'saboter');
  const active = s.crafted.filter((x) => x.active);
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="spark">VÝROBKY</Ribbon><span className="small muted">aktivní lektvary/elixíry: max. {ACTIVE_LIMIT(c)} + {ACTIVE_LIMIT(c)} · výrobky jsou i ve <a href="#/vybava">Výbavě</a> (počítají se do naložení)</span></div>
      {s.crafted.length === 0 ? <p className="muted small" style={{ margin: 0 }}>Zatím nic vyrobeno.</p> : (
        <ul className="log al-items">
          {s.crafted.map((it) => {
            const r = recipeById(it.recipeId);
            return (
              <li key={it.uid}>
                <span>
                  <b>{it.name}</b>{(it.qty ?? 1) > 1 && <span className="tn"> ×{it.qty}</span>}{it.active && <> <span className="pill ok">PŮSOBÍ</span></>}{!it.active && it.carried === false && <> <span className="pill">NENESE</span></>}
                  {it.ruined && <> <span className="pill bad">ZNEHODNOCENO</span></>}
                  {it.injection && <> <span className="pill">INJEKCE</span></>}{it.aerosol && <> <span className="pill">AEROSOL ½</span></>}
                  <span className="small muted"> · nebezpečnost {it.danger}{it.note ? ` · ${it.note}` : ''}{r?.frequencyText ? ` · četnost ${r.frequencyText}` : ''}</span>
                  {it.sabotage && <span className="small"> · <b>sabotáž:</b> {it.sabotage}</span>}
                  {it.demons && <span className="small" style={{ display: 'block' }}>{it.demons.map((x) => <span key={x} style={{ display: 'block' }}>· {x}</span>)}</span>}
                  {sab?.uid === it.uid && (
                    <span className="steps small" style={{ marginTop: 4 }}>
                      <input className="field" value={sab.cond} placeholder="kdy selže / jak se změní" aria-label="Podmínka sabotáže" onChange={(e) => setSab({ uid: it.uid, cond: e.target.value })} />
                      <button className="btn dark" type="button" disabled={!sab.cond.trim()} onClick={() => {
                        const b = materialsBonus(c, d);
                        const x = sabotage(c, it.uid, sab.cond.trim(), roll('k10', b.total, `Sabotáž – ${it.name}`).total);
                        put(x.character); setSab(null);
                        say(x.success ? `Sabotáž se zdařila (obtížnost ${x.difficulty}).` : `Sabotáž se nezdařila – ${it.name} je znehodnocen (obtížnost ${x.difficulty}).`);
                      }}>⚄ Lučba vs. {itemDifficulty(it) ?? '?'}</button>
                      <button className="btn" type="button" onClick={() => setSab(null)}>Zpět</button>
                    </span>
                  )}
                  {it.extraManaLeft != null && (
                    <span className="small tn al-extra"> · přídavná mana <b>{it.extraManaLeft}</b>/{it.extraManaMax}
                      <input className="field num tn" type="number" min={1} value={amt[it.uid] ?? 1} onChange={(e) => setAmt((a) => ({ ...a, [it.uid]: Math.max(1, Math.trunc(Number(e.target.value)) || 1) }))} aria-label="Kolik many" />
                      <button className="btn" type="button" disabled={!it.extraManaLeft} onClick={() => put(drainExtra(c, it.uid, amt[it.uid] ?? 1))}>Čerpat</button>
                      {canRecharge(c, r) && <button className="btn" type="button" onClick={() => put(rechargeExtra(c, it.uid, amt[it.uid] ?? 1))}>Dobít</button>}
                    </span>
                  )}
                </span>
                <span className="steps" style={{ flexWrap: 'nowrap' }}>
                  {it.active
                    ? <button className="btn" type="button" onClick={() => put(endEffect(c, it.uid))}>Konec účinku</button>
                    : it.demons ? null : <button className="btn dark" type="button" onClick={() => { const x = useCrafted(c, it.uid); put(x.character); if (x.warning) say(x.warning); }}>Použít</button>}
                  {r?.weapon && !it.ruined && <button className="btn" type="button" title="Přidá zbraň mezi zbraně postavy (Výbava)" onClick={() => { put(firearmToWeapons(c, it.uid)); say(`${it.name} je mezi zbraněmi (nenasazená).`); }}>Do zbraní</button>}
                  {canInfuse(c, it, r?.kind) && <>
                    <button className="btn" type="button" title="Infuze a inhalace: 1 flakón → 2 dávky injekcí se stejným účinkem (vpich do žíly)" onClick={() => { put(splitInjection(c, it.uid)); say(`${it.name}: 2 dávky injekce`); }}>Injekce</button>
                    <button className="btn" type="button" title="Infuze a inhalace: aerosol – rozbitý flakón 2 sáhy kolem dopadu, rozprašovač do 5 sáhů, poloviční účinek" onClick={() => { put(makeAerosol(c, it.uid)); say(`${it.name}: aerosol (½ účinku)`); }}>Aerosol</button>
                  </>}
                  {canSabotage && !it.sabotage && !it.ruined && !it.active && <button className="btn" type="button" title="Sabotér (PPP03): trvá tolik kol, jaká je obtížnost výroby" onClick={() => setSab({ uid: it.uid, cond: '' })}>Sabotáž</button>}
                  {canRecycle && !it.active && (() => { const b = recycleInfo(it); return (
                    <button className="btn" type="button" title={`Recyklátor (PPP03): základ zpět, +${b.mana} many, +${b.materials} surovin`} onClick={() => { put(recycle(c, it.uid)); say(`Recyklováno: ${it.name} (+${b.mana} many, +${b.materials} surovin, základ zpět)`); }}>Recyklovat</button>
                  ); })()}
                  <button className="icon-x" type="button" aria-label={`Zahodit ${it.name}`} onClick={() => put(discardCrafted(c, it.uid))}>×</button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {active.length > 0 && <p className="small muted" style={{ margin: '6px 0 0' }}>Na postavě smí působit nejvýš {ACTIVE_LIMIT(c)} elixír a {ACTIVE_LIMIT(c)} lektvar (H10); četnost = jak často smí pít tentýž.</p>}
    </Sheet>
  );
}

function Obory({ c }: { c: Character }) {
  const br = c.progression.learnedBranches;
  const spec = c.progression.specialization;
  return (
    <Sheet>
      <Ribbon icon="star">OBORY A SCHOPNOSTI</Ribbon>
      {br.length === 0 && !spec ? <p className="small muted" style={{ margin: 0 }}>Zatím žádný obor – první se volí při přestupu (každý dá 4 recepty automaticky).</p> : (
        <ul className="ab-list" style={{ columns: 1 }}>
          {br.map((b) => <li key={b}>{progressionName('alchymista', b)}<span style={{ whiteSpace: 'normal', textAlign: 'right' }}>{BRANCH_TEXT[b] ?? ''}</span></li>)}
          {spec && <li>{progressionName('alchymista', spec)}<span style={{ whiteSpace: 'normal', textAlign: 'right' }}>specializace · {(progressionFor('alchymista').specializations.find((x) => x.id === spec)?.grants ?? []).join(' · ')}</span></li>}
          {c.progression.learnedAbilities.map((a, i) => <li key={`${a.id}-${i}`}>{progressionName('alchymista', a.id)}<span>schopnost</span></li>)}
        </ul>
      )}
      {c.progression.learnedAbilities.some((a) => PPP03_RULES[a.id]) && (
        <details className="small" style={{ marginTop: 6 }}><summary>Pravidla schopností z PPP03</summary>
          {[...new Set(c.progression.learnedAbilities.map((a) => a.id))].filter((id) => PPP03_RULES[id]).map((id) => (
            <p key={id} style={{ margin: '4px 0' }}><b>{progressionName('alchymista', id)}:</b> {PPP03_RULES[id]}</p>
          ))}
        </details>
      )}
      <p style={{ margin: '6px 0 0' }}><a className="sk-link" href="#/prestup"><Icon name="up" className="i14" /> Nový obor nebo schopnost → průvodce přestupem</a></p>
    </Sheet>
  );
}

function Zaznam({ c }: { c: Character }) {
  const s = alch(c);
  const fmt = (iso: string) => { try { return new Date(iso).toLocaleString('cs', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  return (
    <Sheet>
      <Ribbon icon="quill">ZÁZNAM ALCHYMIE</Ribbon>
      {s.log.length ? <ul className="log">{s.log.slice(0, 12).map((l) => <li key={l.uid}><span>{l.text}</span><span className="small muted tn">{fmt(l.at)}</span></li>)}</ul>
        : <p className="small muted" style={{ margin: 0 }}>Výroba, destilace, nákupy a úpravy zásob se zapíšou sem a jdou vrátit (tlačítko nahoře).</p>}
    </Sheet>
  );
}
