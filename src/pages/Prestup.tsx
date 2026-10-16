// Průvodce přestupem na vyšší úroveň podle H18 (docs/PROGRESSION_ENGINE.md).
// Spouští ho hráč ručně (tlačítko u Úrovně). Postava se změní až potvrzením v posledním kroku;
// poslední přestup jde vrátit (stav před ním se drží v úložišti).
import { useMemo, useState, type ReactNode } from 'react';
import { ATTR_KEYS, type AttrKey } from '../model/types';
import {
  applyLevelUp, autoGains, canNext, diffRows, emptyLevelUp, gainsCharacterPoints, itemPool, itemsBreakdown, itemsToChoose, nextLevel,
  options, pickParam, progressionFor, progressionName, raiseBlock, raiseCost, specOptions, steps, trickInfo, whyNot, type LevelUpState, type Option,
  companionSpellPool,
} from '../progression/levelup';
import { rollDie } from '../rules/dice';
import { KIND_LABEL, companionView, describeGrowth, growableSkills, growingCompanions, isPackMaster, spellsToPick, thirdGrowth, type GrowthPick } from '../rules/pratele';
import { ATTR_LABELS, SKILLS, getClass, getSkill } from '../rules/data';
import { attributeMod, derive, sgn } from '../rules/derive';
import { saveBeforeLevelUp } from '../storage/localStore';
import { useStore } from '../state/store';
import { Icon } from '../ui/Icon';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

const ATTR_EFFECT: Record<AttrKey, string> = {
  sil: 'ÚČ zbraní tváří v tvář, dovednosti SIL',
  obr: 'ZO, OČ, střelba, iniciativa, pohyblivost',
  odo: 'max. životy, hranice smrti',
  int: 'dovednosti INT, mana / duševní síla',
  char: 'dovednosti CHAR, přízeň',
};

export function Prestup() {
  const { character: c, dispatch } = useStore();
  const [st, setSt] = useState<LevelUpState>(emptyLevelUp);
  const [stepIdx, setStepIdx] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [skillId, setSkillId] = useState('');
  const [ownName, setOwnName] = useState('');
  const [attr, setAttr] = useState<AttrKey>('int');

  const P = progressionFor(c.basic.classId);
  const cls = getClass(c.basic.classId);
  const nl = nextLevel(c);
  const after = useMemo(() => applyLevelUp(c, st), [c, st]);
  const d0 = useMemo(() => derive(c), [c]);
  const d1 = useMemo(() => derive(after), [after]);
  const all = steps(c, st);
  const idx = Math.min(stepIdx, all.length - 1);
  const key = all[idx].key;
  const ok = canNext(c, st, key);

  if (c.progression.level >= 24) {
    return <Sheet><Ribbon icon="up">PŘESTUP NA ÚROVEŇ</Ribbon><p>Postava už je na nejvyšší, 24. úrovni.</p><a className="btn" href="#/postava">Zpět do deníku</a></Sheet>;
  }

  const setPick = (o: Option) => setSt((s) => {
    const next = { ...s, pick: { kind: o.kind, id: o.id }, pickParams: undefined };
    const allowed = new Set(itemPool(c, next).map((p) => p.name));
    // Změna volby může zmenšit počet položek (Paměť na kouzla) – přebytečné odebrat.
    // A zvolená specializace přestane platit, když jí změna volby vzala prerekvizitu.
    const specOk = !!next.spec && specOptions(c, next).some((o) => o.id === next.spec && !o.disabled);
    return { ...next, spec: specOk ? next.spec : null, items: next.items.filter((i) => allowed.has(i)).slice(0, itemsToChoose(c, next)) };
  });

  const confirm = () => {
    saveBeforeLevelUp(c);
    dispatch({ type: 'replace', character: applyLevelUp(c, st) });
    window.location.hash = '#/postava';
  };

  let body: ReactNode = null;

  if (key === 'prehled') {
    const rows: [string, string, boolean][] = [
      ['Nová zvláštní schopnost', `1 volba: schopnost nebo ${P.branchLabel.toLowerCase()}`, true],
      ...(nl >= 6 && !c.progression.specialization ? [['Specializace', 'samostatný krok – nabídne se, jakmile splníš podmínky (i schopností zvolenou teď); nepovinná', true] as [string, string, boolean]] : []),
      ['Charakterové body', gainsCharacterPoints(nl) ? '2 body → +1 stupeň dvěma různým atributům, hned' : '— (každá 3. úroveň)', gainsCharacterPoints(nl)],
      ['Max. životy', 'nové maximum z Tabulky životů podle úrovně a ODO (aktuální se nemění)', true],
      ...(P.energyGrows ? [[`Max. ${(cls.energyName ?? 'energie').toLowerCase()}`, 'nové maximum z tabulky povolání', true] as [string, string, boolean]] : []),
      ['Dovednostní body', nl % 2 === 0 ? `+${cls.skillPointMultiplier * nl}${c.basic.raceId === 'clovek' ? ` + ${nl} (Všestrannost)` : ''}; každá dovednost max. +1 stupeň` : '— nové body jen na sudé úrovni; zbylé body lze utratit', nl % 2 === 0],
      ...(P.choose ? [[P.choose.word[0].toUpperCase() + P.choose.word.slice(1), `${itemsToChoose(c, st)} nové – z ${P.choose.poolLabel ?? 'obecné nabídky'}${P.grantMode === 'access' ? ' a z ovládaných i právě zvolených větví' + (P.choose.perBranch ? ` (max. ${P.choose.perBranch} z jedné)` : '') : ''}`, true] as [string, string, boolean]] : []),
      ...(P.autoAtLevel2 && nl === 2 ? [['Automaticky', `${P.itemWord} 2. úrovně`, true] as [string, string, boolean]] : []),
    ];
    body = (
      <>
        <p className="lead">{cls.name} · {c.progression.level}. → <b>{nl}. úroveň</b>. Postup podle kapitoly Rozvoj postavy (H18):</p>
        <table className="grid"><tbody>{rows.map(([a, b, on]) => <tr key={a}><td><b>{a}</b></td><td className={on ? '' : 'muted'}>{b}</td></tr>)}</tbody></table>
        {!d0.experience.canLevelUp && d0.experience.nextLevelXp != null && (
          <p className="small" style={{ color: 'var(--blood)' }}>Podle zkušeností ({c.progression.experience.toLocaleString('cs')}) ještě chybí {d0.experience.missing?.toLocaleString('cs')} do {nl}. úrovně. Přestoupit jde i tak (rozhoduje Vypravěč).</p>
        )}
        <p className="small muted">Přestup se provede hned, v boji až po jeho skončení. Poslední přestup jde vrátit.</p>
      </>
    );
  }

  if (key === 'volba') {
    const opts = options(c);
    const group = (kind: Option['kind'], title: string) => {
      const list = opts.filter((o) => o.kind === kind);
      if (!list.length) return null;
      return (
        <>
          <h2 className="lbl" style={{ margin: '12px 0 6px' }}>{title}</h2>
          <div className="opts" style={{ maxHeight: 'none' }}>
            {list.map((o) => (
              <button key={o.id} type="button" className="opt" aria-pressed={st.pick?.id === o.id} disabled={!!o.disabled} onClick={() => setPick(o)}>
                <strong>{o.name}</strong><span>{o.text}</span>{o.disabled && <span className="pill">{o.disabled.toUpperCase()}</span>}
              </button>
            ))}
          </div>
        </>
      );
    };
    body = (
      <>
        <p className="lead">Vyber jednu možnost.{nl >= 6 && !c.progression.specialization && ' Specializaci si vybereš v dalším kroku – počítá se i s tím, co zvolíš tady.'}</p>
        {group('branch', `${P.branchLabel} (větve)`)}
        {group('ability', 'Zvláštní schopnosti')}
        {(() => {
          const pp = pickParam(c, st);
          if (!pp) return null;
          const taken = new Set(c.progression.learnedAbilities.filter((a) => a.id === st.pick?.id).map((a) => a.params?.[pp.key]));
          return (
            <div className="box" style={{ textAlign: 'left', marginTop: 12 }}>
              <label className="lbl" htmlFor="lv-param">{pp.label} – {progressionName(c.basic.classId, st.pick!.id)}</label>
              <select id="lv-param" className="field" value={String(st.pickParams?.[pp.key] ?? '')}
                onChange={(e) => setSt((s) => ({ ...s, pickParams: e.target.value ? { [pp.key]: e.target.value } : undefined }))}>
                <option value="">— vyber —</option>
                {pp.options.map((o) => <option key={o.id} value={o.id} disabled={taken.has(o.id)}>{o.name}{taken.has(o.id) ? ' (už máš)' : ''}</option>)}
              </select>
            </div>
          );
        })()}
      </>
    );
  }

  if (key === 'specializace') {
    const specs = specOptions(c, st);
    const any = specs.some((o) => !o.disabled);
    body = (
      <>
        <p className="lead">
          Od 6. úrovně se můžeš specializovat, jakmile máš potřebné schopnosti – včetně té, kterou jsi právě zvolil.
          Specializace je <b>nevratná</b> a ostatní vylučuje. Nemusíš ji brát hned, nabídne se znovu při dalším přestupu.
        </p>
        <div className="opts" style={{ maxHeight: 'none' }}>
          <button type="button" className="opt" aria-pressed={!st.spec} onClick={() => setSt((s) => ({ ...s, spec: null }))}>
            <strong>Zatím bez specializace</strong><span>{any ? 'rozhodnu se později' : 'žádná specializace zatím nemá splněné podmínky'}</span>
          </button>
          {specs.map((o) => (
            <button key={o.id} type="button" className="opt" aria-pressed={st.spec === o.id} disabled={!!o.disabled} onClick={() => setSt((s) => ({ ...s, spec: o.id }))}>
              <strong>{o.name}</strong><span>{o.text}</span>
              {o.details && o.details.grants.length > 0 && <span className="small"><b>Získáš hned:</b> {o.details.grants.join(' · ')}</span>}
              {o.details && o.details.unlocks.length > 0 && <span className="small"><b>Odemkne volitelné schopnosti:</b> {o.details.unlocks.map((u) => u.name).join(', ')}</span>}
              {o.disabled && <span className="pill">{o.disabled.toUpperCase()}</span>}
            </button>
          ))}
        </div>
        {specs.some((o) => o.details?.unlocks.length) && (
          <details className="small" style={{ marginTop: 10 }}>
            <summary>Co přesně odemykají volitelné schopnosti specializací</summary>
            {specs.filter((o) => o.details?.unlocks.length).map((o) => (
              <div key={o.id} style={{ marginTop: 6 }}>
                <b>{o.name}</b>
                <ul style={{ margin: '2px 0 0', paddingLeft: 20 }}>{o.details!.unlocks.map((u) => <li key={u.name}><b>{u.name}</b>{u.text ? ` – ${u.text}` : ''}</li>)}</ul>
              </div>
            ))}
          </details>
        )}
      </>
    );
  }

  if (key === 'atributy') {
    body = (
      <>
        <p className="lead">Dva charakterové body: +1 stupeň <b>dvěma různým</b> atributům. Nejde je odložit.</p>
        <div style={{ display: 'grid', gap: 6 }}>
          {ATTR_KEYS.map((k) => {
            const on = st.attrs.includes(k);
            const m0 = attributeMod(c.attributes[k]);
            const m1 = attributeMod(c.attributes[k] + 1);
            return (
              <button key={k} type="button" className="opt lv-attr" aria-pressed={on} disabled={!on && st.attrs.length >= 2}
                onClick={() => setSt((s) => ({ ...s, attrs: on ? s.attrs.filter((a) => a !== k) : [...s.attrs, k] }))}>
                <span className="shield-s">{ATTR_LABELS[k].short}</span>
                <span><strong>{ATTR_LABELS[k].name}</strong><br /><span className="muted">{ATTR_EFFECT[k]}</span></span>
                <span className="tn" style={{ textAlign: 'right' }}>
                  {c.attributes[k]}{on && <> → <b>{c.attributes[k] + 1}</b></>}<br />
                  {m1 !== m0 ? <span className={`pill ${on ? 'ok' : ''}`}>OPRAVA {sgn(m0)} → {sgn(m1)}</span> : <span className="small muted">oprava {sgn(m0)}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <p className="small muted">Zvýraznění ukazuje, u kterého atributu se změní oprava – tam se přepočítají navazující hodnoty (Pravidlo zpětné opravy).</p>
      </>
    );
  }

  if (key === 'zivoty') {
    body = (
      <>
        <div className="pair" style={{ alignItems: 'end' }}>
          <div className="box" style={{ textAlign: 'left' }}>
            <span className="lbl">Max. životy (Tabulka životů)</span>
            <div className="tn" style={{ fontSize: 22 }}><span className="muted">{d0.hpMax.value}</span> → <b>{d1.hpMax.value}</b> <span className="pill ok">+{d1.hpMax.value - d0.hpMax.value}</span></div>
            <span className="small muted">{d1.hpMax.formula}</span>
          </div>
          <div className="tn">Hranice smrti {d0.deathThreshold.value} → {d1.deathThreshold.value}</div>
        </div>
        {P.energyGrows ? (
          <div className="pair" style={{ alignItems: 'end', marginTop: 12 }}>
            <div className="box" style={{ textAlign: 'left' }}>
              <span className="lbl">Max. {(cls.energyName ?? 'energie').toLowerCase()}</span>
              <div className="tn" style={{ fontSize: 22 }}><span className="muted">{d0.manaMax.value ?? '—'}</span> → <b>{d1.manaMax.value ?? '—'}</b></div>
              <span className="small muted">{d1.manaMax.formula}</span>
            </div>
            <div className="small muted">Aktuální hodnota se doplní až běžnou činností (spánek, meditace, modlitba).</div>
          </div>
        ) : (
          <p className="small muted">{c.basic.classId === 'alchymista' ? 'Alchymista nemá maximum many – nic se nemění.' : c.basic.classId === 'valecnik' ? 'Adrenalin mimo boj má maximum = ODO.' : 'Zloděj manu nemá.'}</p>
        )}
        <p className="small muted">Aktuální životy se přestupem nemění, roste jen maximum.</p>
      </>
    );
  }

  if (key === 'dovednosti') {
    const av = d1.skillPoints.available.value;
    const ownedIds = new Set([...c.skills.map((s) => s.id), ...st.added.map((a) => a.id)]);
    const offer = SKILLS.filter((s) => s.kind !== 'profession' && !ownedIds.has(s.id));
    const learn = () => {
      const add = skillId === '__own'
        ? { id: `custom:${ownName.trim().toLowerCase()}`, customName: ownName.trim(), attribute: attr }
        : { id: skillId, customName: null, attribute: attr };
      setSt((s) => ({ ...s, added: [...s.added, add] }));
      setNewOpen(false); setSkillId(''); setOwnName('');
    };
    body = (
      <>
        <div className="ribbon-row">
          <p className="lead" style={{ margin: 0 }}>Zlepšení na stupeň N stojí N bodů, nová dovednost 1 bod. Každá dovednost nejvýš +1 stupeň za přestup{c.progression.learnedAbilities.some((a) => a.id === 'expertiza') ? ' (Expertiza: jedna až +2, nejvýš na úroveň + 2)' : ''}. Nevyužité body zůstávají.</p>
          <div className="counter"><span className="lbl">K dispozici</span><span className="field num tn calc" style={{ display: 'grid', placeItems: 'center', width: 62 }}>{av}</span></div>
        </div>
        <div className="scroll-x">
          <table className="grid tn">
            <tbody>
              {c.skills.map((s) => {
                const n = st.raised[s.id] ?? 0;
                const block = raiseBlock(c, st, s.id);
                const cost = raiseCost(c, st, s.id);
                return (
                  <tr key={s.id}>
                    <td><b>{s.customName ?? getSkill(s.id)?.name ?? s.id}</b> <span className="muted small">{ATTR_LABELS[s.attribute].short}</span></td>
                    <td className="c">{s.rank}{n > 0 && <> → <b>{s.rank + n}</b></>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="steps" style={{ justifyContent: 'flex-end' }}>
                        {n > 0 && <button className="btn" type="button" onClick={() => setSt((x) => { const r = { ...x.raised }; r[s.id] = n - 1; if (!r[s.id]) delete r[s.id]; return { ...x, raised: r }; })}>Zrušit (+{s.rank + n} b.)</button>}
                        {block
                          ? (n === 0 && <span className="small muted">{block}</span>)
                          : <button className="btn" type="button" disabled={av < cost} onClick={() => setSt((x) => ({ ...x, raised: { ...x.raised, [s.id]: n + 1 } }))}>+1 · {cost} b.</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {st.added.map((a, i) => (
                <tr key={a.id}>
                  <td><b>{a.customName ?? getSkill(a.id)?.name}</b> <span className="muted small">{ATTR_LABELS[a.attribute].short}</span> <span className="pill ok">NOVÁ{a.customName ? ' · VLASTNÍ' : ''}</span></td>
                  <td className="c">1</td>
                  <td style={{ textAlign: 'right' }}><button className="btn" type="button" onClick={() => setSt((x) => ({ ...x, added: x.added.filter((_, j) => j !== i) }))}>Zrušit (+1 b.)</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {newOpen ? (
          <div className="help" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
            <b className="lbl">Nová dovednost · 1 bod · stupeň 1</b>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8, alignItems: 'end' }}>
              <div className="box" style={{ textAlign: 'left' }}>
                <label className="lbl" htmlFor="lv-skill">Dovednost</label>
                <select className="field" id="lv-skill" value={skillId} onChange={(e) => { setSkillId(e.target.value); const s = getSkill(e.target.value); if (s) setAttr(s.defaultAttribute); }}>
                  <option value="">— vyber —</option>
                  <optgroup label="Základní dovednosti (H14)">{offer.filter((s) => s.kind === 'basic').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                  <optgroup label="Rozšířené (Pravidla pro pokročilé)">{offer.filter((s) => s.kind === 'extended').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                  <option value="__own">Jiná – napsat vlastní…</option>
                </select>
              </div>
              {skillId === '__own' && (
                <div className="box" style={{ textAlign: 'left' }}>
                  <label className="lbl" htmlFor="lv-own">Název</label>
                  <input className="field" id="lv-own" value={ownName} onChange={(e) => setOwnName(e.target.value)} />
                </div>
              )}
              <div className="box" style={{ textAlign: 'left' }}>
                <label className="lbl" htmlFor="lv-attr">Atribut</label>
                <select className="field" id="lv-attr" value={attr} onChange={(e) => setAttr(e.target.value as AttrKey)}>
                  {ATTR_KEYS.map((k) => <option key={k} value={k}>{ATTR_LABELS[k].short}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" type="button" onClick={() => setNewOpen(false)}>Zrušit</button>
              <button className="btn dark" type="button" disabled={!skillId || (skillId === '__own' && !ownName.trim())} onClick={learn}>Naučit · 1 b.</button>
            </div>
          </div>
        ) : (
          <button className="addrow" type="button" disabled={av < 1} onClick={() => setNewOpen(true)}><Icon name="plus" className="i14" />NAUČIT NOVOU DOVEDNOST · 1 B.</button>
        )}
      </>
    );
  }

  if (key === 'polozky') {
    const auto = autoGains(c, st);
    const pool = itemPool(c, st);
    const br = itemsBreakdown(c, st);
    const n = br.total;
    const known = new Set(c.progression.learnedItems);
    const lim = P.choose?.perBranch ?? null;
    const perBranch = (b: string | null) => st.items.filter((x) => pool.find((p) => p.name === x && p.branchId === b)).length;
    const groups = [...new Set(pool.map((p) => p.group))];
    body = (
      <>
        {auto.length > 0 && (
          <>
            <h2 className="lbl" style={{ margin: '0 0 6px' }}>Automaticky</h2>
            <ul className="small" style={{ marginTop: 0 }}>{auto.map((x) => <li key={x}>{x} <span className="pill ok">AUTOMATICKY</span></li>)}</ul>
          </>
        )}
        {P.choose && (
          <>
            <h2 className="lbl" style={{ margin: '8px 0 6px' }}>Vyber {n} · {P.choose.word} ({st.items.length}/{n})</h2>
            {br.parts.length > 0 && (
              <p className="small" style={{ margin: '0 0 6px' }}>
                Počet: {br.base} za úroveň{br.parts.map((x) => ` + ${x.n} ${x.label}`).join('')} = <b>{n}</b>
              </p>
            )}
            <p className="small muted" style={{ margin: '0 0 8px' }}>
              Nabídka = {P.choose.poolLabel ?? 'obecná nabídka'}{P.grantMode === 'access' ? ' + všechny ovládané větve včetně nově zvolené' : ''}{lim ? `. Z jedné větve nejvýš ${lim} za úroveň` : ''}.
            </p>
            {groups.map((g) => {
              const items = pool.filter((p) => p.group === g);
              return (
                <div key={g}>
                  <h3 className="lbl" style={{ margin: '10px 0 4px', color: 'var(--ink)' }}>{g}{items[0]?.fresh && <> <span className="pill ok">NOVĚ OTEVŘENO</span></>}</h3>
                  <div className="opts" style={{ maxHeight: 'none' }}>
                    {items.map((p) => {
                      const on = st.items.includes(p.name);
                      const kn = known.has(p.name);
                      const full = !!lim && !!p.branchId && !on && perBranch(p.branchId) >= lim;
                      return (
                        <button key={p.name} type="button" className="opt" aria-pressed={on} disabled={kn || full || (!on && st.items.length >= n)}
                          onClick={() => setSt((s) => ({ ...s, items: on ? s.items.filter((x) => x !== p.name) : [...s.items, p.name] }))}>
                          <strong>{p.name}</strong>
                          {(() => { const t = trickInfo(p.name); return t ? <span className="small">{t.adr} adr. · {t.use}{t.req && t.req !== '-' ? ` · vyžaduje: ${t.req}` : ''}</span> : null; })()}
                          <span>{kn ? 'už umíš' : full ? 'z této školy už máš' : trickInfo(p.name)?.x ?? p.group}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </>
    );
  }

  if (key === 'pratele') {
    const pm = isPackMaster(c);
    const pool = companionSpellPool(c, st);
    const pickOf = (u: string): GrowthPick => st.companions?.[u] ?? { skills: [], spells: [] };
    const setPick = (u: string, p: Partial<GrowthPick>) => setSt((s0) => {
      const all = { ...(s0.companions ?? {}) };
      all[u] = { ...pickOf(u), ...p };
      // Pán zvířat cvičí při přestupu jen jedno zvíře – volba jiného zvířete zruší předchozí.
      if (pm && p.skills?.length) for (const k of Object.keys(all)) if (k !== u && c.companions.find((x) => x.uid === k)?.kind === 'zvire') all[k] = { ...all[k], skills: [] };
      return { ...s0, companions: all };
    });
    body = (
      <>
        <p className="lead">Přátelé, kteří dosáhli úrovně spolu s tebou.{pm ? ' Pán zvířat stihne vycvičit jen jedno zvíře ze smečky (PPP02).' : ''}</p>
        {growingCompanions(c).map((x) => {
          const p = pickOf(x.uid);
          const v = companionView(c, d0, x);
          const third = thirdGrowth(x);
          return (
            <div key={x.uid} className="al-proc">
              <b>{x.name} <span className="small muted">({x.stats.species || KIND_LABEL[x.kind]})</span></b>
              {x.kind === 'zvire' && (
                <>
                  <span className="small">+3 max. životy (→ {v.hpMax + 3}){third ? '; 3. společná úroveň: ÚČ, Zranění, ZO a OČ +1' : ''}. Vyber 2 dovednosti +1 (H09):</span>
                  <div className="chips">
                    {growableSkills(c, x).map((sk) => {
                      const on = p.skills.includes(sk);
                      return <button key={sk} type="button" className="chip" aria-pressed={on} disabled={!on && p.skills.length >= 2}
                        onClick={() => setPick(x.uid, { skills: on ? p.skills.filter((q) => q !== sk) : [...p.skills, sk] })}>{sk}</button>;
                    })}
                  </div>
                </>
              )}
              {x.kind === 'lup' && (
                <>
                  <span className="small">+2 max. životy (PPP05){third ? '; 3. společná úroveň: Postřeh +1 a vyber:' : '.'}</span>
                  {third && (
                    <>
                      <div className="chips">
                        <button type="button" className="chip" aria-pressed={p.pick === 'uc'} onClick={() => setPick(x.uid, { pick: 'uc' })}>ÚČ +1</button>
                        <button type="button" className="chip" aria-pressed={p.pick === 'zo'} onClick={() => setPick(x.uid, { pick: 'zo' })}>ZO a OČ +1</button>
                      </div>
                      <div className="chips">
                        {Object.keys(x.stats.tricks).map((t) => <button key={t} type="button" className="chip" aria-pressed={p.trick === t} onClick={() => setPick(x.uid, { trick: t })}>{t} +1</button>)}
                      </div>
                    </>
                  )}
                </>
              )}
              {x.kind === 'duv' && (
                <>
                  <span className="small">+1k6 max. životy (PPP05){third ? '; 3. společná úroveň – vyber ÚČ, nebo ZO a OČ +1, a dovednost +1:' : '.'}</span>
                  <div className="steps">
                    <button className="btn" type="button" onClick={() => setPick(x.uid, { hp: rollDie(6) })}>⚄ Hodit 1k6</button>
                    <input className="field num tn" type="number" min={1} max={6} value={p.hp ?? ''} aria-label={`Životy navíc – ${x.name}`}
                      onChange={(e) => setPick(x.uid, { hp: Math.max(1, Math.min(6, Math.trunc(Number(e.target.value)) || 1)) })} />
                    {p.hp ? <span className="small">→ max. životy {v.hpMax + p.hp}</span> : null}
                  </div>
                  {third && (
                    <>
                      <div className="chips">
                        <button type="button" className="chip" aria-pressed={p.pick === 'uc'} onClick={() => setPick(x.uid, { pick: 'uc' })}>ÚČ +1</button>
                        <button type="button" className="chip" aria-pressed={p.pick === 'zo'} onClick={() => setPick(x.uid, { pick: 'zo' })}>ZO a OČ +1</button>
                      </div>
                      <input className="field" placeholder="dovednost +1" value={p.skill ?? ''} aria-label={`Dovednost +1 – ${x.name}`} onChange={(e) => setPick(x.uid, { skill: e.target.value })}
                        list={`duv-sk-${x.uid}`} />
                      <datalist id={`duv-sk-${x.uid}`}>{v.skills.map((k) => <option key={k.name} value={k.name} />)}</datalist>
                    </>
                  )}
                </>
              )}
              {x.kind === 'mag' && (() => {
                const avail = pool.filter((sp) => !x.spells.includes(sp));
                const need = Math.min(spellsToPick(x, nl), avail.length);
                return (
                  <>
                    <span className="small">Roste s tebou (H11): životy +2, mana +1{nl % 2 === 0 ? ', ÚČ a OČ +1' : ''}{nl % 4 === 0 ? ', ZO +1' : ''}. {need ? `Vyber ${need} ${need === 1 ? 'kouzlo' : 'kouzla'} z těch, která ovládáš:` : 'Kouzla má přítel všechna, která může mít.'}</span>
                    {need > 0 && (
                      <div className="chips">
                        {avail.map((sp) => {
                          const on = p.spells.includes(sp);
                          return <button key={sp} type="button" className="chip" aria-pressed={on} disabled={!on && p.spells.length >= need}
                            onClick={() => setPick(x.uid, { spells: on ? p.spells.filter((q) => q !== sp) : [...p.spells, sp] })}>{sp}</button>;
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          );
        })}
      </>
    );
  }

  if (key === 'shrnuti') {
    const rows = diffRows(c, after);
    const gained = [
      st.pick && `${st.pick.kind === 'spec' ? 'Specializace' : st.pick.kind === 'branch' ? P.branchLabel : 'Schopnost'}: ${progressionName(c.basic.classId, st.pick.id)}${(() => { const pp = pickParam(c, st); const v = pp && st.pickParams?.[pp.key]; return v ? ` (${pp!.options.find((o) => o.id === v)?.name ?? v})` : ''; })()}`,
      st.spec && `Specializace: ${progressionName(c.basic.classId, st.spec)}`,
      ...Object.entries(st.raised).map(([id, n]) => { const s = c.skills.find((k) => k.id === id)!; return `${s.customName ?? getSkill(id)?.name} ${s.rank} → ${s.rank + n}`; }),
      ...st.added.map((a) => `Nová dovednost ${a.customName ?? getSkill(a.id)?.name} (1)`),
      ...st.items.map((x) => `${P.choose?.word ?? P.itemWord}: ${x}`),
      ...autoGains(c, st).map((x) => `automaticky: ${x}`),
      ...describeGrowth(c, st.companions, nl).map((x) => `přítel – ${x}`),
    ].filter(Boolean) as string[];
    body = (
      <>
        <table className="grid tn">
          <thead><tr><th>Hodnota</th><th className="c">Teď</th><th className="c">Po přestupu</th></tr></thead>
          <tbody>{rows.map(([a, b, x]) => <tr key={a}><td>{a}</td><td className="c muted">{b}</td><td className="c"><b>{x}</b></td></tr>)}</tbody>
        </table>
        <h2 className="lbl" style={{ margin: '12px 0 4px' }}>Získáš</h2>
        <ul style={{ marginTop: 0 }}>{gained.map((g) => <li key={g}>{g}</li>)}</ul>
        {(st.pick?.kind === 'spec' || st.spec) && <p className="pill bad">SPECIALIZACE JE NEVRATNÁ</p>}
      </>
    );
  }

  return (
    <>
      <div className="wiz-head">
        <div><Ribbon icon="up">PŘESTUP NA ÚROVEŇ</Ribbon><h1 className="pg">{c.basic.name || 'Postava'}: {c.progression.level}. → {nl}. úroveň</h1></div>
        <div className="steps"><a className="btn" href="#/postava">Zrušit přestup</a></div>
      </div>
      <nav className="wbar" aria-label="Kroky přestupu">
        {all.map((s, i) => (
          <button key={s.key} type="button" aria-current={i === idx ? 'step' : undefined} className={i < idx ? 'done' : ''}
            disabled={i > idx && all.slice(0, i).some((p) => !canNext(c, st, p.key))} onClick={() => setStepIdx(i)}>
            {i < idx ? '✓' : i + 1} {s.label.toUpperCase()}
          </button>
        ))}
      </nav>
      <Sheet>
        {body}
        <div className="wfoot">
          <button className="btn" type="button" disabled={idx === 0} onClick={() => setStepIdx(idx - 1)}>Zpět</button>
          <span className="small muted">{ok ? '' : whyNot(c, key, st)}</span>
          {key === 'shrnuti'
            ? <button className="btn wine" type="button" onClick={confirm}>Potvrdit přestup</button>
            : <button className="btn dark" type="button" disabled={!ok} onClick={() => { setStepIdx(idx + 1); window.scrollTo(0, 0); }}>Dál</button>}
        </div>
      </Sheet>
    </>
  );
}
