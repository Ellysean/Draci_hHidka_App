// Záložka PŘÍRODA – hraničář (7c.1): Duševní síla, směry magie, schopnosti a specializace, pasti (H09 + magické
// pasti PPP02), kouzla s plným zněním a sesílání mimo boj (H09, PPP02). V boji se kouzla sesílají na záložce Boj a stavy.
import { useEffect, useMemo, useState } from 'react';
import type { Character } from '../model/types';
import { record } from '../rules/combat';
import { robeBonus } from '../rules/equipment';
import { sgn, type Derived } from '../rules/derive';
import { GROUP_LABEL, RANGER, RANGER_SPELLS, knownRangerSpells, rangerNotes, rangerOwned, restoreWhy, spellLock, trapWhy, type MagicSpell } from '../rules/hranicar';
import { progressionName } from '../progression/levelup';
import { useStore } from '../state/store';
import { useDice } from '../ui/Dice';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

type Put = (next: Character) => void;
interface P { c: Character; d: Derived; put: Put; say: (m: string) => void }

export function Hranicar() {
  const { character: c, derived: d, dispatch } = useStore();
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 4000); return () => clearTimeout(t); }, [msg]);
  const put: Put = (next) => dispatch({ type: 'update', fn: () => next });
  return (
    <div className="stack va-page">
      <div className="vy-head"><h1 className="pg">HRANIČÁŘ</h1></div>
      {msg && <div className="toast" role="status">{msg}</div>}
      <div className="cols">
        <div className="stack">
          <DusevniSila c={c} d={d} put={put} say={setMsg} />
          <Smery c={c} />
          <Pasti c={c} d={d} put={put} say={setMsg} />
        </div>
        <div className="stack">
          <Schopnosti c={c} />
        </div>
      </div>
      <Kouzla c={c} d={d} put={put} say={setMsg} />
    </div>
  );
}

// ---------------------------------------------------------------- Duševní síla

function DusevniSila({ c, d, put, say }: P) {
  const cur = c.vitals.manaCurrent;
  const max = d.manaMax.value;
  const why = restoreWhy(c);
  const adj = (delta: number) => put(record(c, `Duševní síla ${sgn(delta)}`, (x) => ({ ...x, vitals: { ...x.vitals, manaCurrent: Math.max(0, x.vitals.manaCurrent + delta) } })));
  return (
    <Sheet>
      <Ribbon icon="leaf">DUŠEVNÍ SÍLA</Ribbon>
      <div className="va-adr">
        <div className="al-res">
          <span className="lbl">Duševní síla</span>
          <b className="al-big tn">{cur}<small className="muted"> / {max ?? '?'}</small></b>
          <div className="al-adj">
            <button className="btn" type="button" onClick={() => adj(-1)} disabled={cur < 1} aria-label="Duševní síla −1">−1</button>
            <button className="btn" type="button" onClick={() => adj(1)} aria-label="Duševní síla +1">+1</button>
          </div>
        </div>
        <div className="small">
          <p style={{ margin: '0 0 4px' }}>Maximum podle Tabulky Duševní síly hraničáře (INT × úroveň, H09); doplní se do maxima, když je hraničář Svěží.</p>
          <p style={{ margin: '0 0 6px' }}>{RANGER.pravidla.overeni} {RANGER.pravidla.bez_gest}</p>
          <button className="btn dark" type="button" disabled={!!why || max == null || cur >= max} title={why || undefined}
            onClick={() => { put(record(c, `Duševní síla obnovena na ${max}`, (x) => ({ ...x, vitals: { ...x.vitals, manaCurrent: max ?? x.vitals.manaCurrent } }))); say(`Duševní síla ${max}`); }}>
            Obnovit do maxima
          </button>
          {why && <span className="small muted"> {why}</span>}
          {max == null && <p className="small bad-t" style={{ margin: '4px 0 0' }}>Tabulka H09 má jen úrovně 1–6 – maximum zadej ručně na záložce Postava (✎).</p>}
        </div>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- směry

function Smery({ c }: { c: Character }) {
  const own = new Set(c.progression.learnedBranches);
  return (
    <Sheet>
      <Ribbon icon="star">SMĚRY HRANIČÁŘSKÉ MAGIE</Ribbon>
      <ul className="ab-list va-list">
        {RANGER.smery.map((s) => (
          <li key={s.id} className={own.has(s.id) ? '' : 'va-off'}>
            <span className="va-name">{own.has(s.id) ? '✓ ' : ''}{s.nazev}</span>
            <span className="va-txt">{s.efekt} Kouzla: {s.kouzla_auto.map((id) => RANGER_SPELLS.find((k) => k.id === id)?.nazev ?? id).join(', ')}</span>
          </li>
        ))}
      </ul>
      <p className="small muted" style={{ margin: '6px 0 0' }}>Směr se volí při přestupu místo schopnosti a dá všechna svá kouzla hned. Od 6. úrovně přibudou ke každému známému směru 2 další kouzla (PPP02).</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- schopnosti a specializace

function Schopnosti({ c }: { c: Character }) {
  const spec = c.progression.specialization;
  const sp = spec ? RANGER.specializace[spec] : null;
  const ids = [...new Set(c.progression.learnedAbilities.map((a) => a.id))];
  const count = (id: string) => c.progression.learnedAbilities.filter((a) => a.id === id).length;
  const lv = c.progression.level;
  const notes = rangerNotes(c);
  return (
    <Sheet>
      <Ribbon icon="paw">SCHOPNOSTI</Ribbon>
      <dl className="va-dl small">
        <dt>Hraničářské umění</dt><dd>Lov (OBR), Vnímání přírody (INT) a Stopování (INT) na 3. stupni.</dd>
        <dt>Hraničářská magie</dt><dd>Pouto s přírodou (INT) na 3. stupni; 4 základní kouzla.</dd>
        {lv >= RANGER.pokrocily.level && (
          <><dt>Pokročilý hraničář (6. úr.)</dt><dd>{RANGER.pokrocily.skills.map((s) => `${s.name} (${s.rank}. st.)`).join(', ')} – {RANGER.pokrocily.spells}</dd></>
        )}
        {sp && (
          <>
            <dt>{sp.name} (specializace)</dt><dd>PPP02 s. {sp.page}</dd>
            {sp.auto.map((a) => <div key={a.name} style={{ display: 'contents' }}><dt>{a.name}</dt><dd>{a.text} <span className="pill ok">AUTOMATICKY</span></dd></div>)}
            {sp.rules.map((r, i) => <div key={i} style={{ display: 'contents' }}><dt>{i === 0 ? 'Pravidla Druida' : ''}</dt><dd>{r}</dd></div>)}
          </>
        )}
        {ids.map((id) => {
          const a = RANGER.schopnosti[id];
          return (
            <div key={id} style={{ display: 'contents' }}>
              <dt>{a?.name ?? progressionName('hranicar', id)}{count(id) > 1 ? ` ×${count(id)}` : ''}</dt>
              <dd>{a?.text ?? ''}{a?.source && a.source !== 'H09' ? <span className="muted"> ({a.source} s. {a.page})</span> : null}</dd>
            </div>
          );
        })}
      </dl>
      {ids.length === 0 && !sp && <p className="small muted" style={{ margin: '6px 0 0' }}>Volitelné schopnosti a směry se berou při přestupu (od 2. úrovně), od 6. úrovně i pokročilé z PPP02 a specializace Chodec, Druid a Pán zvířat.</p>}
      {notes.length > 0 && (
        <>
          <h3 className="lbl" style={{ margin: '10px 0 4px', color: 'var(--ink)' }}>Podle situace (appka nepočítá sama)</h3>
          <ul className="small va-notes">{notes.map((n) => <li key={n.source}><b>{n.source}:</b> {n.text}</li>)}</ul>
        </>
      )}
      <p className="small muted" style={{ margin: '8px 0 0' }}>Bojová hůl, Obratné ostří, Moudrost, Ostražitost, Světoběžník, Zocelení a bonusy směrů se počítají v deníku samy; Rychlou střelbu a obranu navíc s holí hlídá boj.</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- pasti

function Pasti({ c, d }: P) {
  const { roll } = useDice();
  const why = trapWhy(c);
  const sk = d.skills.find((s) => s.id === 'liceni_pasti');
  const magic = knownRangerSpells(c).filter((s) => s.typ === 'past');
  if (why && !magic.length) {
    return (
      <Sheet>
        <Ribbon icon="skull">PASTI</Ribbon>
        <p className="small muted" style={{ margin: 0 }}>Pasti líčí hraničář se schopností Průzkumnictví (dovednost Líčení pastí). {RANGER.pasti.pravidlo}</p>
      </Sheet>
    );
  }
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="skull">PASTI</Ribbon>{sk && <span className="small tn">Líčení pastí {sgn(sk.total)}</span>}</div>
      <p className="small" style={{ margin: '0 0 6px' }}>{RANGER.pasti.pravidlo}</p>
      {!why && RANGER.pasti.polozky.map((t) => (
        <details key={t.id} className="recipe" style={{ display: 'block' }}>
          <summary>
            <b>{t.nazev}</b> <span className="small muted">obtížnost {t.obtiznost} · {t.vyroba} · {t.vyzaduje}{t.cena ? ` · ${t.cena}` : ''}</span>{' '}
            <button className="btn dark" type="button" onClick={(e) => { e.preventDefault(); roll('k10', sk?.total ?? 0, `Líčení pastí – ${t.nazev} (obtížnost ${t.obtiznost})`); }}>⚄ Nalíčit</button>
          </summary>
          <p className="small" style={{ margin: '4px 0' }}>{t.popis}</p>
          <p className="small muted" style={{ margin: 0 }}>
            {t.ucinek.damage && <>Zranění {t.ucinek.damage}{t.ucinek.damageType ? ` (${t.ucinek.damageType})` : ''}. </>}
            {t.ucinek.save && <>Záchrana: {t.ucinek.save}. </>}
            {t.ucinek.escape && <>Vyproštění: {t.ucinek.escape}. </>}
          </p>
        </details>
      ))}
      {magic.length > 0 && (
        <p className="small" style={{ margin: '8px 0 0' }}><b>Magické pasti (Chodec):</b> {magic.map((s) => `${s.nazev} (${s.cena.text} DS, obt. ${s.obtiznost.base})`).join(', ')} – plné znění v seznamu kouzel níže, líčí se Poutem s přírodou.</p>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- kouzla

type Filter = 'known' | 'all';

function Kouzla({ c, d, put, say }: P) {
  const { roll } = useDice();
  const [flt, setFlt] = useState<Filter>('known');
  const [grp, setGrp] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const known = useMemo(() => new Set(knownRangerSpells(c).map((s) => s.id)), [c]);
  const own = useMemo(() => rangerOwned(c), [c]);
  const pouto = d.skills.find((s) => s.id === 'pouto_s_prirodou');
  const robe = robeBonus(c);
  const bonus = (pouto?.total ?? 0) + robe.value;
  const pool = flt === 'known' ? RANGER_SPELLS.filter((s) => known.has(s.id)) : RANGER_SPELLS;
  const groups = [...new Set(pool.map((s) => s.skupina))];
  const list = pool.filter((s) => (!grp || s.skupina === grp) && (!q || `${s.nazev} ${s.popis}`.toLowerCase().includes(q.toLowerCase())));
  const inCombat = !!c.play.combat;
  const cast = (s: MagicSpell) => {
    const price = s.cena.variable || s.cena.base == null ? Math.max(0, prices[s.id] ?? s.cena.base ?? 1) : s.cena.base ?? 0;
    if (price > c.vitals.manaCurrent) { say(`Chybí Duševní síla (${c.vitals.manaCurrent}/${price})`); return; }
    put(record(c, `${s.nazev}: −${price} Duševní síly`, (x) => ({ ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - price } })));
    const dc = s.obtiznost.base;
    roll('k10', bonus, `${s.nazev} – Pouto s přírodou${dc != null ? ` vs. ${dc}` : ''} (musí být vyšší)`);
  };
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="book">KOUZLA</Ribbon><span className="small tn">zná {known.size} · Duševní síla {c.vitals.manaCurrent} · Pouto s přírodou {sgn(bonus)}{robe.value ? ` (vč. ${robe.name} +${robe.value})` : ''}</span></div>
      <div className="chips">
        {([['known', `Známá (${known.size})`], ['all', `Všechna (${RANGER_SPELLS.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={flt === k} onClick={() => { setFlt(k); setGrp(null); }}>{l}</button>
        ))}
        <span style={{ width: 8 }} />
        {groups.map((g) => (
          <button key={g} type="button" className="chip" aria-pressed={grp === g} onClick={() => setGrp(grp === g ? null : g)}>{GROUP_LABEL[g] ?? g}</button>
        ))}
      </div>
      <div className="al-ws" style={{ marginTop: 8 }}>
        <input className="field" type="search" placeholder="Hledat kouzlo…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Hledat kouzlo" />
      </div>
      {inCombat && <p className="small" style={{ margin: '6px 0 0' }}>Probíhá boj – kouzla s hlídáním akcí sesílej na záložce Boj a stavy.</p>}
      <div className="al-list">
        {list.length === 0 && <p className="small muted">{flt === 'known' ? 'Hraničář zatím zná jen to, co dají směry a schopnosti.' : 'Nic neodpovídá filtru.'}</p>}
        {list.map((s) => {
          const lock = spellLock(c, s, c.progression.level, own);
          const kn = !lock;
          const variable = s.cena.variable || s.cena.base == null;
          const price = variable ? Math.max(0, prices[s.id] ?? s.cena.base ?? 1) : s.cena.base ?? 0;
          return (
            <div key={s.id} className="recipe">
              <div>
                <h4><button type="button" className="linkbtn al-name" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>{s.nazev}</button>
                  {s.typ !== 'kouzlo' && <> <span className="pill">{s.typ.toUpperCase()}</span></>}
                  {kn ? <> <span className="pill ok">UMÍ</span></> : <> <span className="pill">{lock.toUpperCase()}</span></>}
                </h4>
                <div className="meta">{GROUP_LABEL[s.skupina] ?? s.skupina} · {s.zdroj} s. {s.strana} · <b>{s.cena.text}</b> DS · obtížnost {s.obtiznost.text} · {s.vyvolani.text}</div>
              </div>
              {kn && s.typ === 'kouzlo' && (
                <div className="al-ws" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                  {variable && <input className="field num tn sp-cost" style={{ minWidth: 0 }} type="number" min={0} value={price} aria-label={`Duševní síla – ${s.nazev}`} onChange={(e) => setPrices((p) => ({ ...p, [s.id]: Math.max(0, Math.trunc(Number(e.target.value)) || 0) }))} />}
                  <button className="btn dark" type="button" disabled={price > c.vitals.manaCurrent} title={price > c.vitals.manaCurrent ? 'Málo Duševní síly' : undefined} onClick={() => cast(s)}>Seslat ⚄</button>
                </div>
              )}
              {open === s.id && (
                <div className="al-detail">
                  <dl>
                    <dt>DUŠEVNÍ SÍLA</dt><dd>{s.cena.text}</dd>
                    {s.dosah && <><dt>DOSAH</dt><dd>{s.dosah}</dd></>}
                    {s.rozsah && <><dt>ROZSAH</dt><dd>{s.rozsah}</dd></>}
                    {s.trvani && <><dt>TRVÁNÍ</dt><dd>{s.trvani}</dd></>}
                    <dt>{s.typ === 'kouzlo' ? 'VYVOLÁNÍ' : 'VÝROBA'}</dt><dd>{s.vyvolani.text}</dd>
                    {s.overeni && <><dt>OVĚŘENÍ</dt><dd>{s.overeni}</dd></>}
                    <dt>OBTÍŽNOST</dt><dd>{s.obtiznost.text}</dd>
                    {s.zaklad && <><dt>ZÁKLAD</dt><dd>{s.zaklad}</dd></>}
                    {s.cetnost && <><dt>ČETNOST</dt><dd>{s.cetnost}</dd></>}
                  </dl>
                  {s.popis.split('\n').map((para, i) => <p key={i} style={{ margin: '4px 0' }}>{para}</p>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="small muted" style={{ margin: '8px 0 0' }}>
        Hraničář si kouzla nevybírá – dostane je se směrem magie, schopností nebo specializací (✔ U). Seslat odečte Duševní sílu a hodí k10 + Pouto s přírodou; výsledek musí být vyšší než obtížnost. Proměnnou cenu (za úder, za cíl…) zadej do políčka.
      </p>
    </Sheet>
  );
}
