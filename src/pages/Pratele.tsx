// Záložka PŘÁTELÉ (7c+, docs/COMPANIONS.md): zvířecí přítel a smečka Pána zvířat (H09, PPP02), Hraničářův kůň (PPP02),
// kouzelníkův přítel (H11, PPP04) a Lupičův parťák (PPP05) – karta s hodnotami a hody, životy, získání (ochočení, vyvolání,
// pouto), ztráta, Zvířecí šampion. Panel PrateleBoj se ukazuje na záložce Boj a stavy. Růst je krok Přátelé v přestupu.
import { useEffect, useMemo, useState } from 'react';
import type { Character, Companion, CompanionKind, CompanionStats } from '../model/types';
import { sgn, type Derived } from '../rules/derive';
import {
  KIND_ABILITY, KIND_LABEL, PRAT, SPECIES, acquireWhy, activeOf, addCompanion, championWhy, companionHp, companionHpState,
  companionMana, companionView, endCompanion, isPackMaster, kindAllowed, makeChampion, packBonus, packLevel, refillMana, removeCompanion,
  setInFight, shareableSpells, speciesOf, statsFrom, summon, summonWhy, tame, tameBonus, updateCompanion, updateStats,
} from '../rules/pratele';
import { useStore } from '../state/store';
import { useDice } from '../ui/Dice';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

type Put = (next: Character) => void;
const KINDS: CompanionKind[] = ['zvire', 'kun', 'mag', 'lup', 'duv'];

export function Pratele() {
  const { character: c, derived: d, dispatch } = useStore();
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 4500); return () => clearTimeout(t); }, [msg]);
  const put: Put = (next) => dispatch({ type: 'update', fn: () => next });
  const active = c.companions.filter((x) => x.status === 'active');
  const lost = c.companions.filter((x) => x.status !== 'active');
  const allowed = KINDS.filter((k) => kindAllowed(c, k));
  return (
    <div className="stack va-page pr-page">
      <div className="vy-head"><h1 className="pg">PŘÁTELÉ A ZVÍŘATA</h1></div>
      {msg && <div className="toast" role="status">{msg}</div>}
      {isPackMaster(c) && <Smecka c={c} />}
      {active.length === 0 && (
        <Sheet>
          <Ribbon icon="paw">PŘÁTELÉ</Ribbon>
          <p className="small" style={{ margin: 0 }}>
            {allowed.length
              ? `Zatím žádný přítel. ${allowed.map((k) => KIND_LABEL[k]).join(', ')} – získáš ho níže.`
              : 'Přítele dávají schopnosti: Ochočování zvířat a Hraničářův kůň (hraničář), Vyvolání přítele (kouzelník), Lupičův parťák (Lupič). Bez nich jde přítel přidat jen se souhlasem PJ.'}
          </p>
        </Sheet>
      )}
      <div className="pr-grid">
        {active.map((x) => <CompanionCard key={x.uid} c={c} d={d} x={x} put={put} say={setMsg} />)}
      </div>
      <NovyPritel c={c} d={d} put={put} say={setMsg} />
      {lost.length > 0 && (
        <Sheet>
          <Ribbon icon="skull">ODEŠLÍ A ZESNULÍ</Ribbon>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {lost.map((x) => (
              <li key={x.uid}>
                <b>{x.name}</b> ({x.stats.species || KIND_LABEL[x.kind]}) – {x.status === 'dead' ? 'zemřel' : 'rozloučení'} na {x.endedLevel}. úrovni{' '}
                {x.champion ? <span className="muted">(šampion – záznam drží postih −2 Duševní síly)</span> : <button className="linkbtn" type="button" onClick={() => put(removeCompanion(c, x.uid))}>odebrat z deníku</button>}
              </li>
            ))}
          </ul>
        </Sheet>
      )}
      <Pravidla c={c} />
    </div>
  );
}

// ---------------------------------------------------------------- smečka

function Smecka({ c }: { c: Character }) {
  const p = packLevel(c);
  const pb = packBonus(c);
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="paw">SMEČKA</Ribbon><span className="small tn">úroveň smečky {p.sum}{p.unknown ? ` + ${p.unknown}× ?` : ''} / {c.progression.level}</span></div>
      <p className="small" style={{ margin: 0 }}>{PRAT.pravidla.smecka} {PRAT.pravidla.dalsiPratele}</p>
      {p.unknown > 0 && <p className="small bad-t" style={{ margin: '4px 0 0' }}>U {p.unknown} zvířat chybí úroveň – doplň ji na kartě (Upravit hodnoty).</p>}
      {pb > 0 && <p className="small" style={{ margin: '4px 0 0' }}><b>Boj ve smečce:</b> ÚČ i OČ +{pb} (zvířata označená V boji) – přičítá se v boji samo.</p>}
    </Sheet>
  );
}

// ---------------------------------------------------------------- karta přítele

export function CompanionCard({ c, d, x, put, say, compact = false }: { c: Character; d: Derived; x: Companion; put: Put; say: (m: string) => void; compact?: boolean }) {
  const { roll } = useDice();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState<'dead' | 'released' | null>(null);
  const v = companionView(c, d, x);
  const st = companionHpState(v, x.hpCurrent);
  const champ = x.kind === 'zvire' && !x.champion && !championWhy(c, x.uid);
  return (
    <Sheet className="pr-card">
      <div className="pr-head">
        {compact ? <b>{x.name}</b> : (
          <input className="field pr-name" value={x.name} aria-label="Jméno přítele" onChange={(e) => put(updateCompanion(c, x.uid, { name: e.target.value }))} />
        )}
        <span className="small muted">{x.stats.species || KIND_LABEL[x.kind]}</span>
        <span className="pill">{KIND_LABEL[x.kind].toUpperCase()}</span>
        {x.champion && <span className="pill ok">ŠAMPION</span>}
        {x.pj && <span className="pill">SE SOUHLASEM PJ</span>}
        {st !== 'ok' && <span className="pill bad">{st === 'dead' ? 'POD HRANICÍ SMRTI' : 'V BEZVĚDOMÍ'}</span>}
      </div>
      <div className="pr-stats tn">
        <div className="pr-hp">
          <span className="lbl">Životy</span>
          <b className="al-big">{x.hpCurrent}<small className="muted"> / {v.hpMax}</small></b>
          <div className="steps">
            {[-5, -1, 1, 5].map((n) => (
              <button key={n} className="btn" type="button" style={{ padding: '2px 8px' }} aria-label={`${x.name}: životy ${sgn(n)}`} onClick={() => put(companionHp(c, d, x.uid, n))}>{n > 0 ? `+${n}` : n}</button>
            ))}
          </div>
          <span className="small muted">hranice smrti {v.deathThreshold}</span>
        </div>
        {v.manaMax != null && (
          <div className="pr-hp">
            <span className="lbl">Mana</span>
            <b className="al-big">{x.manaCurrent}<small className="muted"> / {v.manaMax}</small></b>
            <div className="steps">
              <button className="btn" type="button" style={{ padding: '2px 8px' }} aria-label={`${x.name}: mana −1`} disabled={x.manaCurrent < 1} onClick={() => put(companionMana(c, d, x.uid, -1))}>−1</button>
              <button className="btn" type="button" style={{ padding: '2px 8px' }} aria-label={`${x.name}: mana +1`} onClick={() => put(companionMana(c, d, x.uid, 1))}>+1</button>
              <button className="btn" type="button" style={{ padding: '2px 8px' }} title="Při pánově meditaci, když se ho dotýká (H11)" onClick={() => put(refillMana(c, d, x.uid))}>Doplnit</button>
            </div>
          </div>
        )}
        <dl className="pr-dl">
          <dt>Úroveň</dt><dd>{v.level ?? <span className="bad-t">?</span>}</dd>
          <dt>Velikost</dt><dd>{v.size ?? <span className="bad-t">?</span>}</dd>
          <dt>Pohyblivost</dt><dd>{v.mobility || '—'}</dd>
          <dt>ZO</dt><dd>{v.zo}</dd>
          <dt>OČ</dt><dd>
            {v.oc} <button className="rollbtn tn" type="button" onClick={() => roll('k6x', v.oc, `${x.name} – obrana`)}>⚄</button>
          </dd>
          {!compact && x.stats.attrs && <><dt>Atributy</dt><dd className="small">{(['sil', 'obr', 'odo', 'int', 'char'] as const).map((k) => `${k.toUpperCase()} ${x.kind === 'mag' && k === 'int' ? 'pána' : x.stats.attrs![k] ?? '–'}`).join(' · ')}</dd></>}
        </dl>
      </div>
      <div className="pr-row">
        <span className="lbl">Útok</span>
        {v.attacks.length === 0 && <span className="small muted">—</span>}
        {v.attacks.map((a, i) => (
          <span key={i} className="pr-atk">
            {a.n}: <b>{a.atk ?? '?'}</b>/{a.dmg != null ? sgn(a.dmg) : '?'}
            {a.atk != null && <button className="rollbtn tn" type="button" onClick={() => roll('k6x', a.atk!, `${x.name} – ${a.n} (zranění ${sgn(a.dmg ?? 0)})`)}>⚄</button>}
          </span>
        ))}
      </div>
      {v.skills.length > 0 && (
        <div className="pr-row">
          <span className="lbl">Dovednosti</span>
          <span className="chips">
            {v.skills.map((s) => (
              <button key={s.name} type="button" className="chip" title={s.note ? `${s.note} – hodit k10` : 'Hodit k10'} onClick={() => roll('k10', s.value, `${x.name} – ${s.name}`)}>{s.name} {sgn(s.value)} ⚄</button>
            ))}
          </span>
        </div>
      )}
      {v.tricks.length > 0 && (
        <div className="pr-row">
          <span className="lbl">Triky</span>
          <span className="chips">
            {v.tricks.map((s) => <button key={s.name} type="button" className="chip" onClick={() => roll('k10', s.value, `${x.name} – ${s.name}`)}>{s.name} {sgn(s.value)} ⚄</button>)}
          </span>
        </div>
      )}
      {!compact && x.kind === 'mag' && <Kouzla c={c} x={x} v={v} put={put} />}
      {!compact && (x.stats.talent || x.stats.special) && (
        <p className="small" style={{ margin: '6px 0 0' }}>
          {x.stats.talent && <><b>Talent pro pána:</b> {x.stats.talent} </>}
          {x.stats.special && <><b>Zvláštní:</b> {x.stats.special}</>}
        </p>
      )}
      {!compact && v.parts.length > 0 && <p className="small muted" style={{ margin: '4px 0 0' }}>{v.parts.join(' · ')}</p>}
      {v.missing.length > 0 && <p className="small bad-t" style={{ margin: '4px 0 0' }}>Chybí {v.missing.join(', ')} – doplň v Upravit hodnoty.</p>}
      <div className="steps" style={{ marginTop: 6, alignItems: 'center' }}>
        <label className="small"><input type="checkbox" checked={x.inFight} onChange={(e) => put(setInFight(c, x.uid, e.target.checked))} /> V boji</label>
        {!compact && (
          <>
            <button className="btn" type="button" onClick={() => setEdit(!edit)} aria-expanded={edit}>Upravit hodnoty</button>
            {champ && <button className="btn dark" type="button" title={PRAT.pravidla.sampion} onClick={() => { put(makeChampion(c, x.uid)); say(`${x.name} je Zvířecí šampion – max. Duševní síla −2.`); }}>Učinit šampionem</button>}
            {confirm ? (
              <>
                <span className="small" role="alert">{confirm === 'dead' ? `${x.name} zemřel?` : `Rozloučit se s ${x.name}?`}</span>
                <button className="btn wine" type="button" onClick={() => { put(endCompanion(c, x.uid, confirm)); setConfirm(null); say(x.kind === 'mag' && confirm === 'dead' ? 'Tvora stejného druhu si kouzelník už nikdy nepřivolá; jiného až na další úrovni.' : 'Nového přítele až po přestupu na další úroveň (podle pravidel druhu).'); }}>Ano</button>
                <button className="btn" type="button" onClick={() => setConfirm(null)}>Zpět</button>
              </>
            ) : (
              <>
                <button className="btn" type="button" onClick={() => setConfirm('dead')}>Zemřel</button>
                <button className="btn" type="button" onClick={() => setConfirm('released')}>{x.kind === 'kun' ? 'Zrušit pouto' : 'Rozloučit se'}</button>
              </>
            )}
          </>
        )}
      </div>
      {!compact && edit && <StatsEditor c={c} x={x} put={put} />}
      {!compact && (
        <input className="field small" style={{ width: '100%', height: 28, marginTop: 6 }} placeholder="Poznámky (povely, výcvik, příhody…)" value={x.notes}
          onChange={(e) => put(updateCompanion(c, x.uid, { notes: e.target.value }))} aria-label={`Poznámky – ${x.name}`} />
      )}
    </Sheet>
  );
}

function Kouzla({ c, x, v, put }: { c: Character; x: Companion; v: ReturnType<typeof companionView>; put: Put }) {
  const [adding, setAdding] = useState('');
  const pool = shareableSpells(c).filter((s) => !x.spells.includes(s));
  const max = v.spellsMax ?? 0;
  return (
    <div className="pr-row">
      <span className="lbl">Kouzla {x.spells.length}/{max}</span>
      <span className="chips">
        {x.spells.map((s) => (
          <span key={s} className="chip">{s} <button type="button" className="linkbtn" aria-label={`Odebrat kouzlo ${s}`} onClick={() => put(updateCompanion(c, x.uid, { spells: x.spells.filter((q) => q !== s) }))}>×</button></span>
        ))}
        {x.spells.length < max && pool.length > 0 && (
          <span className="steps">
            <select className="field" value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Přidat kouzlo příteli">
              <option value="">+ kouzlo pána…</option>
              {pool.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn" type="button" disabled={!adding} onClick={() => { put(updateCompanion(c, x.uid, { spells: [...x.spells, adding] })); setAdding(''); }}>Přidat</button>
          </span>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- ruční úprava hodnot

const fmtMap = (m: Record<string, number>) => Object.entries(m).map(([k, n]) => `${k} ${n}`).join(', ');
const parseMap = (t: string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const part of t.split(',')) {
    const m = part.trim().match(/^(.*?)\s+([+-−]?\d+)$/);
    if (m) out[m[1].trim()] = Number(m[2].replace('−', '-'));
  }
  return out;
};
const num = (s: string) => (s.trim() === '' ? null : Number.isFinite(Number(s)) ? Math.trunc(Number(s)) : null);

function StatsEditor({ c, x, put }: { c: Character; x: Companion; put: Put }) {
  const s = x.stats;
  const set = (p: Partial<CompanionStats>) => put(updateStats(c, x.uid, p));
  const [skills, setSkills] = useState(fmtMap(s.skills));
  const [tricks, setTricks] = useState(fmtMap(s.tricks));
  const setAtk = (i: number, p: Partial<CompanionStats['attacks'][number]>) => set({ attacks: s.attacks.map((a, j) => (j === i ? { ...a, ...p } : a)) });
  return (
    <div className="al-proc">
      <b className="small">Hodnoty {x.kind === 'mag' ? 'základu (bez úrovně kouzelníka)' : 'při získání (bez růstu)'}</b>
      <div className="pr-edit">
        <label>Druh <input className="field" value={s.species} onChange={(e) => set({ species: e.target.value })} /></label>
        {x.kind !== 'mag' && <label>Úroveň <input className="field num" type="number" value={s.level ?? ''} onChange={(e) => set({ level: num(e.target.value) })} /></label>}
        <label>Velikost <input className="field num" value={s.size ?? ''} onChange={(e) => set({ size: e.target.value.trim() || null })} /></label>
        <label>Životy {x.kind === 'mag' ? '(základ)' : ''} <input className="field num" type="number" value={s.hp} onChange={(e) => set({ hp: num(e.target.value) ?? 0 })} /></label>
        {x.kind === 'mag' && <label>Mana (základ) <input className="field num" type="number" value={s.mana ?? ''} onChange={(e) => set({ mana: num(e.target.value) })} /></label>}
        {x.kind === 'mag' && <label>Kouzel (základ) <input className="field num" type="number" value={s.spellsBase ?? ''} onChange={(e) => set({ spellsBase: num(e.target.value) })} /></label>}
        <label>Pohyblivost <input className="field" value={s.mobility} onChange={(e) => set({ mobility: e.target.value })} /></label>
        <label>ZO <input className="field num" type="number" value={s.zo} onChange={(e) => set({ zo: num(e.target.value) ?? 0 })} /></label>
        <label>OČ <input className="field num" type="number" value={s.oc} onChange={(e) => set({ oc: num(e.target.value) ?? 0 })} /></label>
      </div>
      {s.attacks.map((a, i) => (
        <div key={i} className="pr-edit">
          <label>Útok <input className="field" value={a.n} onChange={(e) => setAtk(i, { n: e.target.value })} /></label>
          <label>ÚČ <input className="field num" type="number" value={a.atk ?? ''} onChange={(e) => setAtk(i, { atk: num(e.target.value) })} /></label>
          <label>Zranění <input className="field num" type="number" value={a.dmg ?? ''} onChange={(e) => setAtk(i, { dmg: num(e.target.value) })} /></label>
          <button className="btn" type="button" onClick={() => set({ attacks: s.attacks.filter((_, j) => j !== i) })}>×</button>
        </div>
      ))}
      <div><button className="btn" type="button" onClick={() => set({ attacks: [...s.attacks, { n: 'útok', atk: 0, dmg: 0 }] })}>+ útok</button></div>
      {x.kind !== 'mag' && <label className="small">Dovednosti (např. „Postřeh 5, Stopování 7“)
        <input className="field" style={{ width: '100%' }} value={skills} onChange={(e) => setSkills(e.target.value)} onBlur={() => set({ skills: parseMap(skills) })} /></label>}
      {(x.kind === 'lup' || x.kind === 'duv') && <label className="small">Triky <input className="field" style={{ width: '100%' }} value={tricks} onChange={(e) => setTricks(e.target.value)} onBlur={() => set({ tricks: parseMap(tricks) })} /></label>}
      <label className="small">Zvláštní schopnosti <input className="field" style={{ width: '100%' }} value={s.special} onChange={(e) => set({ special: e.target.value })} /></label>
    </div>
  );
}

// ---------------------------------------------------------------- nový přítel

function NovyPritel({ c, d, put, say }: { c: Character; d: Derived; put: Put; say: (m: string) => void }) {
  const { criticals } = useDice();
  const allowed = KINDS.filter((k) => kindAllowed(c, k));
  const [pj, setPj] = useState(false);
  const kinds = pj ? KINDS : allowed;
  const [kind, setKind] = useState<CompanionKind>(allowed[0] ?? 'zvire');
  const k = kinds.includes(kind) ? kind : kinds[0];
  const list = SPECIES.filter((s) => s.kind === k);
  const [spId, setSpId] = useState('');
  const sp = speciesOf(spId);
  const speciesId = sp && sp.kind === k ? sp.id : list[0]?.id ?? 'vlastni';
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState('');
  const [young, setYoung] = useState(false);
  const [customDc, setCustomDc] = useState('');
  const [spells, setSpells] = useState<string[]>([]);
  const stats = useMemo(() => {
    if (custom) return { ...statsFrom(undefined), species: name || 'vlastní tvor', dc: num(customDc) };
    return statsFrom(speciesOf(speciesId));
  }, [custom, speciesId, name, customDc]);
  const typeId = custom ? 'vlastni' : speciesId;
  if (!kinds.length && !pj) {
    return (
      <Sheet>
        <Ribbon icon="plus">NOVÝ PŘÍTEL</Ribbon>
        <label className="small"><input type="checkbox" checked={pj} onChange={(e) => setPj(e.target.checked)} /> Přidat přítele se souhlasem PJ (mimo pravidla povolání)</label>
      </Sheet>
    );
  }
  const why = pj ? '' : acquireWhy(c, k, custom ? null : speciesId, custom ? null : stats.level);
  const magWhy = k === 'mag' ? summonWhy(c, d) : '';
  const spellMax = k === 'mag' ? (stats.spellsBase ?? 0) + c.progression.level : 0;
  const pool = shareableSpells(c);
  const tb = tameBonus(c, d, young);
  const reset = () => { setName(''); setSpells([]); setYoung(false); };
  const doTame = () => {
    const r = tame(c, d, typeId, stats, { name, young, pj, criticals });
    put(r.character); say(r.text); if (r.success) reset();
  };
  const doSummon = () => {
    const r = summon(c, d, typeId, stats, { name, spells, pj, criticals });
    put(r.character); say(r.text); if (r.success) reset();
  };
  const doAdd = (how: string) => {
    put(addCompanion(c, k, typeId, stats, { name, pj, spells: k === 'mag' ? spells : [], how }));
    say(`${name || stats.species} – přidán.`); reset();
  };
  return (
    <Sheet>
      <Ribbon icon="plus">NOVÝ PŘÍTEL</Ribbon>
      <div className="chips">
        {kinds.map((q) => <button key={q} type="button" className="chip" aria-pressed={q === k} onClick={() => { setKind(q); setSpId(''); setCustom(false); }}>{KIND_LABEL[q]}</button>)}
      </div>
      <div className="pr-edit" style={{ marginTop: 8 }}>
        <label>Druh
          <select className="field" value={custom ? 'vlastni' : speciesId} onChange={(e) => { setCustom(e.target.value === 'vlastni'); setSpId(e.target.value); }}>
            {list.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.src}{s.tame != null ? `, ochočitelnost ${s.tame}` : ''}{s.dc != null ? `, obtížnost ${s.dc}` : ''}{s.minLevel ? `, od ${s.minLevel}. úr.` : ''})</option>)}
            <option value="vlastni">Jiný tvor (hodnoty ručně, např. z Bestiáře)</option>
          </select>
        </label>
        <label>Jméno <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={stats.species} /></label>
        {custom && (k === 'zvire' || k === 'mag') && <label>{k === 'zvire' ? 'Ochočitelnost' : 'Obtížnost'} <input className="field num" type="number" value={customDc} onChange={(e) => setCustomDc(e.target.value)} /></label>}
      </div>
      {!custom && <SpeciesPreview stats={stats} kind={k} level={c.progression.level} />}
      {k === 'mag' && (
        <div className="pr-row">
          <span className="lbl">Kouzla {spells.length}/{spellMax}</span>
          <span className="chips">
            {pool.length === 0 && <span className="small muted">Kouzelník zatím žádná kouzla nezná.</span>}
            {pool.map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={spells.includes(s)} disabled={!spells.includes(s) && spells.length >= spellMax}
                onClick={() => setSpells((l) => (l.includes(s) ? l.filter((q) => q !== s) : [...l, s]))}>{s}</button>
            ))}
          </span>
        </div>
      )}
      <label className="small" style={{ display: 'block', marginTop: 6 }}><input type="checkbox" checked={pj} onChange={(e) => setPj(e.target.checked)} /> Se souhlasem PJ (mimo podmínky pravidel)</label>
      {why && <p className="small bad-t" style={{ margin: '4px 0 0' }}>{why}</p>}
      <div className="steps" style={{ marginTop: 8, alignItems: 'center' }}>
        {k === 'zvire' && (
          <>
            <label className="small"><input type="checkbox" checked={young} onChange={(e) => setYoung(e.target.checked)} /> mládě (+5)</label>
            <button className="btn dark" type="button" disabled={!!why || stats.dc == null} title={stats.dc == null ? 'Zadej ochočitelnost' : undefined} onClick={doTame}>⚄ Ochočit</button>
            <span className="small muted">k10 {sgn(tb.bonus)} ({tb.parts.join(', ')}) vs. {stats.dc ?? '?'} · 1k6 směn</span>
          </>
        )}
        {k === 'mag' && (
          <>
            <button className="btn dark" type="button" disabled={!!why || !!magWhy || stats.dc == null} title={magWhy || undefined} onClick={doSummon}>⚄ Vyvolat (rituál)</button>
            <span className="small muted">Sesílání kouzel vs. {stats.dc ?? '?'} · {magWhy || `vyzáří se ${d.manaMax.value ?? '?'} many`}</span>
          </>
        )}
        {(k === 'kun' || k === 'lup' || k === 'duv') && <button className="btn dark" type="button" disabled={!!why} onClick={() => doAdd(k === 'kun' ? 'Duševní pouto s koněm' : k === 'duv' ? 'Důvěrník' : 'Lupičův parťák')}>{k === 'kun' ? 'Navázat pouto (1 hodina)' : k === 'duv' ? 'Přidat důvěrníka' : 'Přidat parťáka'}</button>}
        {(k === 'zvire' || k === 'mag') && <button className="btn" type="button" disabled={!!why} onClick={() => doAdd('Přítel (bez hodu)')}>Přidat bez hodu</button>}
      </div>
      {!pj && activeOf(c, k).length > 0 && k !== 'zvire' && <p className="small muted" style={{ margin: '4px 0 0' }}>{KIND_ABILITY[k].name}: najednou jen jeden.</p>}
    </Sheet>
  );
}

function SpeciesPreview({ stats, kind, level }: { stats: CompanionStats; kind: CompanionKind; level: number }) {
  const atk = stats.attacks.map((a) => `${a.n} ${a.atk ?? '?'}/${a.dmg != null ? sgn(a.dmg) : '?'}`).join(', ');
  return (
    <p className="small tn" style={{ margin: '6px 0 0' }}>
      {kind === 'mag'
        ? <>Životy {stats.hp} + 2×{level} = <b>{stats.hp + 2 * level}</b> · mana {(stats.mana ?? 0) + level} · kouzel {(stats.spellsBase ?? 0) + level} · </>
        : <>Životy <b>{stats.hp}</b> · úroveň {stats.level ?? '?'} · velikost {stats.size ?? '?'} · </>}
      pohyb {stats.mobility} · útok {atk || '—'} · ZO {stats.zo} · OČ {stats.oc}
      {Object.keys(stats.skills).length > 0 && <> · {fmtMap(stats.skills)}</>}
      {Object.keys(stats.tricks).length > 0 && <> · triky: {fmtMap(stats.tricks)}</>}
      {stats.talent && <><br /><b>Talent:</b> {stats.talent}</>}
      {stats.special && <><br /><b>Zvláštní:</b> {stats.special}</>}
    </p>
  );
}

// ---------------------------------------------------------------- pravidla

function Pravidla({ c }: { c: Character }) {
  const P = PRAT.pravidla;
  const kinds = KINDS.filter((k) => kindAllowed(c, k) || c.companions.some((x) => x.kind === k));
  const show = kinds.length ? kinds : KINDS;
  const txt: Record<CompanionKind, string[]> = {
    zvire: [P.ochoceni, P.komunikace, P.ztrataZvire, PRAT.rust.zvire.text, ...(isPackMaster(c) ? [P.bojVeSmecce, P.sampion] : [])],
    kun: [P.kun, PRAT.rust.kun.text],
    mag: [P.vyvolani, P.magPouto, P.ztrataMag, PRAT.rust.mag.text],
    lup: [P.partak, PRAT.rust.lup.text],
    duv: [P.duvernik, PRAT.rust.duv.text],
  };
  return (
    <Sheet>
      <Ribbon icon="book">PRAVIDLA PŘÁTEL</Ribbon>
      <dl className="va-dl small">
        {show.map((k) => <div key={k} style={{ display: 'contents' }}><dt>{KIND_LABEL[k]}</dt><dd>{txt[k].map((t, i) => <p key={i} style={{ margin: '0 0 4px' }}>{t}</p>)}</dd></div>)}
        <dt>Životy tvora</dt><dd>{P.hraniceSmrti}</dd>
      </dl>
    </Sheet>
  );
}

// ---------------------------------------------------------------- v boji

/** Panel na záložce Boj a stavy – přátelé s kartou v kompaktní podobě. */
export function PrateleBoj({ c, d, replace, say }: { c: Character; d: Derived; replace: Put; say: (m: string) => void }) {
  const active = c.companions.filter((x) => x.status === 'active');
  if (!active.length) return null;
  const pb = packBonus(c);
  return (
    <div className="stack">
      <div className="ribbon-row"><Ribbon icon="paw">PŘÁTELÉ V BOJI</Ribbon>{pb > 0 && <span className="small tn">Boj ve smečce: ÚČ i OČ +{pb}</span>}</div>
      <div className="pr-grid">
        {active.map((x) => <CompanionCard key={x.uid} c={c} d={d} x={x} put={replace} say={say} compact />)}
      </div>
      <p className="small muted" style={{ margin: 0 }}>Přítel jedná ve tahu pána (rozkazy podle druhu). Životy přítele vrací i tlačítko Vrátit. Celou kartu najdeš na záložce Přátelé.</p>
    </div>
  );
}
