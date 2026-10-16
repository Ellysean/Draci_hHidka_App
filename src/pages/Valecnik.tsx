// Záložka VÁLEČNÍK (Fáze 7b): adrenalin a Léčba vlastních zranění, styl boje (Rozvážnost, Proměnlivý úchop),
// zbraně s bonusy, školy boje, Cesty válečníka, schopnosti a specializace, bojové triky s plným zněním (H08, PPP01).
import { useEffect, useMemo, useState } from 'react';
import type { Character, WarriorState } from '../model/types';
import { record } from '../rules/combat';
import { sgn, type Derived } from '../rules/derive';
import { progressionFor, progressionName } from '../progression/levelup';
import {
  TRICKS, TRICK_KIND_LABEL, WARRIOR, adrenalinCapOutside, getPath, hasAbility, knownWarriorTricks, learnCtx, pathRank, schoolsOf,
  selfHeal, situationalNotes, trickLockReason, trickPrice, type TrickKind, type WarriorTrick,
} from '../rules/valecnik';
import { useStore } from '../state/store';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

type Put = (next: Character) => void;
interface P { c: Character; d: Derived; put: Put; say: (m: string) => void }

const ROMAN = ['', 'I', 'II', 'III', 'IV'];

export function Valecnik() {
  const { character: c, derived: d, dispatch } = useStore();
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 4000); return () => clearTimeout(t); }, [msg]);
  const put: Put = (next) => dispatch({ type: 'update', fn: () => next });
  return (
    <div className="stack va-page">
      <div className="vy-head"><h1 className="pg">VÁLEČNÍK</h1></div>
      {msg && <div className="toast" role="status">{msg}</div>}
      <div className="cols">
        <div className="stack">
          <Adrenalin c={c} d={d} put={put} say={setMsg} />
          <Styl c={c} d={d} put={put} say={setMsg} />
          <Zbrane c={c} d={d} put={put} say={setMsg} />
        </div>
        <div className="stack">
          <Skoly c={c} />
          <Cesty c={c} />
          <Schopnosti c={c} />
        </div>
      </div>
      <Triky c={c} d={d} put={put} say={setMsg} />
    </div>
  );
}

// ---------------------------------------------------------------- adrenalin

function Adrenalin({ c, d, put, say }: P) {
  const cur = c.vitals.manaCurrent;
  const inCombat = !!c.play.combat;
  const cap = adrenalinCapOutside(d.mods.odo);
  const missing = Math.max(0, d.hpMax.value - c.vitals.hpCurrent);
  const [n, setN] = useState(1);
  const most = Math.min(cur, Math.ceil(missing / 2));
  const k = Math.max(0, Math.min(n, most));
  const adj = (delta: number) => put(record(c, `Adrenalin ${sgn(delta)}`, (x) => ({ ...x, vitals: { ...x.vitals, manaCurrent: Math.max(0, x.vitals.manaCurrent + delta) } })));
  return (
    <Sheet>
      <Ribbon icon="bolt">ADRENALIN</Ribbon>
      <div className="va-adr">
        <div className="al-res">
          <span className="lbl">Adrenalin</span>
          <b className="al-big tn">{cur}</b>
          <div className="al-adj">
            <button className="btn" type="button" onClick={() => adj(-1)} disabled={cur < 1} aria-label="Adrenalin −1">−1</button>
            <button className="btn" type="button" onClick={() => adj(1)} aria-label="Adrenalin +1">+1</button>
          </div>
        </div>
        <div className="small">
          <p style={{ margin: '0 0 4px' }}>{WARRIOR.general.adrenalin}</p>
          <p style={{ margin: 0 }}>
            Mimo boj max. <b>{cap}</b> (oprava ODO, min. 1){inCombat ? ' · v boji bez limitu' : ''}.
            {hasAbility(c, 'naval_adrenalinu') && ' Nával Adrenalinu: přibývá už na začátku kola.'}
          </p>
          {!inCombat && cur > cap && <p className="bad-t" style={{ margin: '4px 0 0' }}>Mimo boj víc než {cap} – přebytek vyprchá (1 za kolo).</p>}
        </div>
      </div>
      <div className="al-proc">
        <b className="lbl" style={{ color: 'var(--ink)' }}>Léčba vlastních zranění</b>
        <span className="small">{WARRIOR.general.lecba_vlastnich_zraneni}</span>
        <div className="al-ws">
          <label className="small">Adrenalin
            <input className="field num tn" type="number" min={0} max={most} value={k} onChange={(e) => setN(Math.trunc(Number(e.target.value)) || 0)} aria-label="Kolik adrenalinu použít na léčbu" />
          </label>
          <button className="btn dark" type="button" disabled={!k || inCombat} title={inCombat ? 'Až po boji' : undefined}
            onClick={() => { put(record(c, `Léčba vlastních zranění: −${k} adrenalin, +${Math.min(2 * k, missing)} životů`, (x) => selfHeal(x, d.hpMax.value, k))); say(`+${Math.min(2 * k, missing)} životů`); }}>
            Vyléčit +{Math.min(2 * k, missing)} životů
          </button>
          <span className="small muted">životy {c.vitals.hpCurrent}/{d.hpMax.value}{inCombat ? ' · jen po boji' : ''}</span>
        </div>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- styl boje

function Styl({ c, d, put }: P) {
  const st: WarriorState = c.classState.valecnik ?? { combatStyle: null, grip: null };
  const roz = hasAbility(c, 'rozvaznost');
  const uch = hasAbility(c, 'promenlivy_uchop');
  const zam = hasAbility(c, 'zamena');
  const set = (patch: Partial<WarriorState>) => put({ ...c, classState: { ...c.classState, valecnik: { ...st, ...patch } } });
  return (
    <Sheet>
      <Ribbon icon="swords">STYL BOJE</Ribbon>
      {!roz && !uch && !zam && <p className="small muted" style={{ margin: 0 }}>Rozvážnost (H08) a Proměnlivý úchop (PPP01, od 6. úrovně) se volí každé kolo – nabídnou se tu, až je postava bude umět.</p>}
      {roz && (
        <div style={{ marginBottom: 10 }}>
          <b className="lbl" style={{ color: 'var(--ink)' }}>Rozvážnost</b>
          <div className="chips" style={{ marginTop: 4 }}>
            {([[null, 'Běžně'], ['offensive', 'Útočně +3 ÚČ / −1 OČ'], ['defensive', 'Obranně +3 OČ / −1 ÚČ']] as const).map(([v, l]) => (
              <button key={l} type="button" className="chip" aria-pressed={st.combatStyle === v} onClick={() => set({ combatStyle: v })}>{l}</button>
            ))}
          </div>
        </div>
      )}
      {uch && (
        <div style={{ marginBottom: 10 }}>
          <b className="lbl" style={{ color: 'var(--ink)' }}>Proměnlivý úchop</b>
          <div className="chips" style={{ marginTop: 4 }}>
            {([[null, 'Bez bonusu'], ['oz', '+1 OZ'], ['uc', '+2 ÚČ'], ['zr', '+3 Zranění']] as const).map(([v, l]) => (
              <button key={l} type="button" className="chip" aria-pressed={st.grip === v} onClick={() => set({ grip: v })}>{l}</button>
            ))}
          </div>
        </div>
      )}
      {zam && (
        <div style={{ marginBottom: 10 }}>
          <b className="lbl" style={{ color: 'var(--ink)' }}>Záměna</b>
          <span className="small muted"> – atribut pro Útok a Obranu (ne pro triky a dovednosti)</span>
          <div className="chips" style={{ marginTop: 4 }}>
            <span className="small" style={{ alignSelf: 'center' }}>Útok:</span>
            {([[null, 'SIL'], ['obr', 'OBR']] as const).map(([v, l]) => (
              <button key={`a${l}`} type="button" className="chip" aria-pressed={(st.swapAtk ?? null) === v} onClick={() => set({ swapAtk: v })}>{l}</button>
            ))}
            <span className="small" style={{ alignSelf: 'center', marginLeft: 8 }}>Obrana:</span>
            {([[null, 'OBR'], ['sil', 'SIL']] as const).map(([v, l]) => (
              <button key={`d${l}`} type="button" className="chip" aria-pressed={(st.swapDef ?? null) === v} onClick={() => set({ swapDef: v })}>{l}</button>
            ))}
          </div>
        </div>
      )}
      {(roz || uch || zam) && <p className="small" style={{ margin: 0 }}>Zbraň v ruce: <b>ÚČ {d.attackNumber.value} · OČ {d.defenseNumber.value}</b> – volba se promítá do deníku i do hodů v boji; změnit ji jde na začátku každého kola.</p>}
    </Sheet>
  );
}

// ---------------------------------------------------------------- zbraně

function Zbrane({ c, d, put }: P) {
  const notes = situationalNotes(c);
  const dualSchool = c.progression.learnedBranches.includes('skola_boje_se_dvema_zbranemi');
  const st: WarriorState = c.classState.valecnik ?? { combatStyle: null, grip: null };
  const offOptions = d.weapons.filter((w) => w.equipped && w.uid !== d.activeWeaponUid && w.kind !== 'ranged');
  const setOff = (uid: string | null) => put({ ...c, classState: { ...c.classState, valecnik: { ...st, offhand: uid } } });
  return (
    <Sheet>
      <Ribbon icon="sword">ZBRANĚ A BONUSY</Ribbon>
      {d.weapons.length === 0 ? <p className="small muted" style={{ margin: 0 }}>Žádná zbraň – beze zbraně ÚČ {d.attackNumber.value}, OČ {d.defenseNumber.value}.</p> : (
        <div className="scroll-x">
          <table className="grid tn">
            <thead><tr><th>Zbraň</th><th className="c">ÚČ</th><th className="c">OČ</th><th className="c">Zranění</th></tr></thead>
            <tbody>
              {d.weapons.map((w) => (
                <tr key={w.uid}>
                  <td><b>{w.name}</b>{w.uid === d.activeWeaponUid && <> <span className="pill ok">V RUCE</span></>}
                    {w.bonusParts.length > 0 && <div className="small muted">{w.bonusParts.join(' · ')}</div>}
                  </td>
                  <td className="c">{w.attackNumber}</td>
                  <td className="c">{w.kind === 'melee' ? w.defenseNumber : '—'}</td>
                  <td className="c">{w.damageTotal}{w.damageTotal !== w.damage && <div className="small muted">základ {w.damage}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dualSchool && (
        <div className="va-dual">
          <label className="small"><b>Druhá zbraň</b> (sčítá útočnost, obranu i zranění se zbraní v ruce){' '}
            <select className="field" value={st.offhand ?? ''} onChange={(e) => setOff(e.target.value || null)}>
              <option value="">— bez druhé zbraně —</option>
              {offOptions.map((w) => <option key={w.uid} value={w.uid}>{w.name} ({w.category})</option>)}
            </select>
          </label>
          {d.dual && (d.dual.ok
            ? <span className="pill ok">BOJ DVĚMA ZBRANĚMI – {d.dual.offName}</span>
            : <span className="pill bad">NESČÍTÁ SE: {d.dual.why}</span>)}
          <span className="small muted">
            Škola: dvě jednoruční, jedna lehká krátká (nůž, dýka){hasAbility(c, 'mistr_boje_dvema_zbranemi') ? '; Mistr boje dvěma zbraněmi: i těžká + lehká, nebo střední a lehké' : ''}.
            Bonusy Cest se počítají jen za zbraň v ruce. Zbraň v ruce se volí na záložce Postava nebo na stránce Výbava.
          </span>
        </div>
      )}
      {notes.length > 0 && (
        <>
          <h3 className="lbl" style={{ margin: '10px 0 4px', color: 'var(--ink)' }}>Podle situace (appka nepočítá sama)</h3>
          <ul className="small va-notes">{notes.map((n) => <li key={n.source + n.text}><b>{n.source}:</b> {n.text}</li>)}</ul>
        </>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- školy, Cesty, schopnosti

function Skoly({ c }: { c: Character }) {
  const own = new Set(schoolsOf(c));
  return (
    <Sheet>
      <Ribbon icon="shield">BOJOVÉ ŠKOLY</Ribbon>
      <ul className="ab-list va-list">
        {WARRIOR.schools.map((s) => (
          <li key={s.id} className={own.has(s.id) ? '' : 'va-off'}>
            <span className="va-name">{own.has(s.id) ? '✓ ' : ''}{s.name}</span>
            <span className="va-txt">{s.effect}</span>
          </li>
        ))}
      </ul>
      <p className="small muted" style={{ margin: '6px 0 0' }}>Bonusy ovládaných škol se sčítají; škola otevře své triky (z jedné školy nejvýš 1 trik za úroveň). Nová škola se volí při přestupu.</p>
    </Sheet>
  );
}

function Cesty({ c }: { c: Character }) {
  const lv = c.progression.level;
  const owned = WARRIOR.paths.filter((p) => pathRank(c, p.id) > 0);
  return (
    <Sheet>
      <Ribbon icon="star">CESTY VÁLEČNÍKA</Ribbon>
      <p className="small" style={{ margin: '0 0 6px' }}>{WARRIOR.advanced.cesty_valecnika}</p>
      {owned.length === 0 && <p className="small muted" style={{ margin: 0 }}>{lv < 6 ? 'Od 6. úrovně.' : 'Zatím žádná – Cesta se volí při přestupu na 6., 9., 12. … úroveň místo schopnosti.'}</p>}
      {owned.map((p) => {
        const r = pathRank(c, p.id);
        return (
          <div key={p.id} className="va-path">
            <b>{p.name} {ROMAN[r]}{r >= 4 && ' · MISTR'}</b> <span className="small muted">{p.weapons ?? ''}</span>
            <ol className="small">
              {p.ranks.map((k) => <li key={k.rank} className={k.rank <= r ? '' : 'va-off'}>{k.rank <= r ? '✓ ' : ''}<b>{k.name}</b> – {k.effect}</li>)}
              <li className={r >= 4 ? '' : 'va-off'} style={{ listStyle: 'none' }}>{r >= 4 ? '✓ ' : ''}<b>Mistr</b> – {p.master.effect}; trik <i>{p.master.trick}</i></li>
            </ol>
          </div>
        );
      })}
      {owned.length < WARRIOR.paths.length && lv >= 6 && (
        <details className="small"><summary>Ostatní Cesty</summary>
          {WARRIOR.paths.filter((p) => !pathRank(c, p.id)).map((p) => (
            <p key={p.id} style={{ margin: '4px 0' }}><b>{p.name}</b> ({p.weapons ?? 'družina'}): {p.ranks.map((k) => `${ROMAN[k.rank]}. ${k.name}`).join(', ')}; Mistr – {p.master.trick}</p>
          ))}
        </details>
      )}
    </Sheet>
  );
}

function Schopnosti({ c }: { c: Character }) {
  const P = progressionFor('valecnik');
  const spec = c.progression.specialization;
  const sp = spec ? WARRIOR.specs[spec] : null;
  const ids = [...new Set(c.progression.learnedAbilities.map((a) => a.id))].filter((id) => !getPath(id));
  const params = (id: string) => {
    const def = P.abilities.find((a) => a.id === id);
    if (!def?.param) return '';
    const v = c.progression.learnedAbilities.filter((a) => a.id === id).map((a) => def.param!.options.find((o) => o.id === a.params?.[def.param!.key])?.name).filter(Boolean);
    return v.length ? ` (${v.join(', ')})` : ' (skupina nezvolena)';
  };
  return (
    <Sheet>
      <Ribbon icon="fist">SCHOPNOSTI</Ribbon>
      <dl className="va-dl small">
        <dt>Léčba vlastních zranění</dt><dd>{WARRIOR.general.lecba_vlastnich_zraneni}</dd>
        <dt>Bojové triky</dt><dd>{WARRIOR.general.triky_za_uroven}</dd>
        {c.progression.level >= 6 && <><dt>Tovaryš Cechu válečníků</dt><dd>{WARRIOR.advanced.tovarys_cechu}</dd></>}
        {sp && <><dt>{sp.name} (specializace)</dt><dd>{sp.text}</dd><dt>{sp.experience.name}</dt><dd>{sp.experience.text} <span className="pill ok">+3 SE POČÍTÁ</span></dd></>}
        {ids.map((id) => (
          <div key={id} style={{ display: 'contents' }}>
            <dt>{progressionName('valecnik', id)}{params(id)}</dt>
            <dd>{WARRIOR.abilityRules[id] ?? P.abilities.find((a) => a.id === id)?.text ?? ''}</dd>
          </div>
        ))}
      </dl>
      {ids.length === 0 && !sp && <p className="small muted" style={{ margin: '6px 0 0' }}>Volitelné schopnosti se berou při přestupu (od 2. úrovně), od 6. úrovně i pokročilé z PPP01 a specializace.</p>}
    </Sheet>
  );
}

// ---------------------------------------------------------------- triky

type TrickFilter = 'known' | 'open' | 'all';

function Triky({ c, put, say }: P) {
  const [flt, setFlt] = useState<TrickFilter>('known');
  const [kind, setKind] = useState<TrickKind | null>(null);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const known = useMemo(() => new Set(knownWarriorTricks(c).map((t) => t.n)), [c]);
  const ctx = useMemo(() => learnCtx(c), [c]);
  const list = TRICKS.filter((t) => {
    if (flt === 'known' && !known.has(t.n)) return false;
    if (flt === 'open' && (known.has(t.n) || trickLockReason(t, ctx))) return false;
    if (kind && t.t !== kind) return false;
    if (q && !`${t.n} ${t.group} ${t.use}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const setKnown = (t: WarriorTrick, on: boolean) => {
    put({ ...c, progression: { ...c.progression, learnedItems: on ? [...c.progression.learnedItems, t.n] : c.progression.learnedItems.filter((x) => x !== t.n) } });
    say(on ? `Přidán trik ${t.n}` : `Odebrán trik ${t.n}`);
  };
  const rut = hasAbility(c, 'rutina');
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="swords">BOJOVÉ TRIKY</Ribbon><span className="small tn">umí {known.size} · Adrenalin {c.vitals.manaCurrent}</span></div>
      <div className="chips">
        {([['known', `Známé (${known.size})`], ['open', 'Lze se naučit'], ['all', `Všechny (${TRICKS.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={flt === k} onClick={() => setFlt(k)}>{l}</button>
        ))}
        <span style={{ width: 8 }} />
        {(Object.keys(TRICK_KIND_LABEL) as TrickKind[]).map((k) => (
          <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(kind === k ? null : k)}>{TRICK_KIND_LABEL[k]}</button>
        ))}
      </div>
      <div className="al-ws" style={{ marginTop: 8 }}>
        <input className="field" type="search" placeholder="Hledat trik, školu…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Hledat trik" />
        <label className="small al-here"><input type="checkbox" checked={edit} onChange={(e) => setEdit(e.target.checked)} /> Ruční úprava (přepis z papíru)</label>
      </div>
      {rut && <p className="small" style={{ margin: '6px 0 0' }}>Rutina: všechny triky o 1 adrenalin levnější (už započteno v ceně).</p>}
      <div className="al-list">
        {list.length === 0 && <p className="small muted">{flt === 'known' ? 'Postava zatím nezná žádný trik – na 1. úrovni si vybírá 2 základní, pak se učí při přestupu.' : 'Nic neodpovídá filtru.'}</p>}
        {list.map((t) => {
          const lock = trickLockReason(t, ctx);
          const kn = known.has(t.n);
          const price = trickPrice(c, t);
          return (
            <div key={t.id} className="recipe">
              <div>
                <h4><button type="button" className="linkbtn al-name" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>{t.n}</button>
                  {' '}<span className="pill">{TRICK_KIND_LABEL[t.t].toUpperCase()}</span>
                  {kn && <> <span className="pill ok">UMÍ</span></>}
                  {!kn && lock && <> <span className="pill">{lock.toUpperCase()}</span></>}
                </h4>
                <div className="meta">{t.group} · {t.src} s. {t.page} · <b>{t.adr}</b> adr.{rut && t.a > 0 ? ` (s Rutinou ${price}${t.var ? '+' : ''})` : ''} · {t.use}</div>
                {open !== t.id && <div className="small">{t.x}</div>}
              </div>
              {edit && (
                <button className={`btn ${kn ? '' : 'dark'}`} type="button" onClick={() => setKnown(t, !kn)}>{kn ? 'Odebrat' : 'Přidat'}</button>
              )}
              {open === t.id && (
                <div className="al-detail">
                  <dl>
                    <dt>ADRENALIN</dt><dd>{t.adr}</dd>
                    <dt>POUŽITÍ</dt><dd>{t.use}</dd>
                    <dt>VYŽADUJE</dt><dd>{t.req}</dd>
                    <dt>OVĚŘENÍ</dt><dd>{t.check}</dd>
                  </dl>
                  {t.text.split('\n').map((para, i) => <p key={i} style={{ margin: '4px 0' }}>{para}</p>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="small muted" style={{ margin: '8px 0 0' }}>
        Triky se učí při přestupu (průvodce hlídá školy, 6. úroveň, specializaci a Mistry Cest). Ruční úprava je pro přepis rozehrané postavy z papíru. V boji se triky používají na záložce Boj a stavy.
      </p>
    </Sheet>
  );
}
