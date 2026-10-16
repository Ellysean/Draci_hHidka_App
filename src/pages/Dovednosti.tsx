// Záložka Dovednosti (Fáze 4): stupeň, atribut, celkový bonus, hod k10, dovednostní body,
// zlepšení s limitem +1 za úroveň (skillLog), nová dovednost ze seznamu nebo vlastní.
import { useState } from 'react';
import { ATTR_KEYS, type AttrKey, type Character } from '../model/types';
import { ATTR_LABELS, CLASSES, SKILLS, getClass } from '../rules/data';
import { sgn } from '../rules/derive';
import { rollCheck, type CheckRoll } from '../rules/dice';
import {
  SOURCE_LABEL, addBlock, addSkill, canRemove, hasExpertise, purchasable, raiseBlockNow, raiseCostNow, raiseSkill,
  refundOnRemove, removeSkill, setSkillAttribute, setSkillRankManual, skillAttributes, skillName, spentByLevel, undoRaise, undoableRaise,
} from '../rules/skills';
import { useStore } from '../state/store';
import { CalcField } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { InfoBubble } from '../ui/InfoBubble';
import { SAVE_SKILLS, raceSkillNote } from '../rules/rasy';
import { getRace } from '../rules/data';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

const ROLL_TEXT: Record<string, string> = { critical: 'KRITICKÝ ÚSPĚCH', fumble: 'FATÁLNÍ NEÚSPĚCH' };

export function Dovednosti() {
  const { character: c, derived: d, dispatch } = useStore();
  const [manual, setManual] = useState(false);
  const [criticals, setCriticals] = useState(true);
  const [rolls, setRolls] = useState<Record<string, CheckRoll & { attr?: AttrKey }>>({});
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const upd = (fn: (x: Character) => Character) => dispatch({ type: 'update', fn });

  const level = c.progression.level;
  const cls = getClass(c.basic.classId);
  const exp = hasExpertise(c);
  const spent = spentByLevel(c);

  const roll = (id: string, total: number, attr?: AttrKey) => setRolls((r) => ({ ...r, [id]: { ...rollCheck(total, criticals), attr } }));

  const table = (
    <Sheet>
      <div className="ribbon-row">
        <Ribbon icon="swords">DOVEDNOSTI</Ribbon>
        <div className="counter"><span className="lbl">Dovednostní<br />body</span><CalcField calc={d.skillPoints.available} label="Dovednostní body k utracení" ovKey="skillPointsAvailable" /></div>
      </div>
      <details className="help-d">
        <summary><Icon name="book" className="i14" /> JAK FUNGUJÍ DOVEDNOSTI</summary>
        <div className="help">
          <div className="ics">{ATTR_KEYS.map((k) => <i key={k}>{ATTR_LABELS[k].short}</i>)}</div>
          <ul>
            <li>Ověření = 1k10 + oprava atributu + stupeň (+ bonusy schopností).</li>
            <li>Dovednosti se dvěma atributy (Mechanika, Etiketa, Umění, Řemesla, Zvládnutí zvířat…) mají <b>hod pro každý atribut</b> – hoď na ten, který odpovídá tomu, co postava právě dělá (rozhoduje PJ).</li>
            <li>Zlepšení na stupeň N stojí N bodů, nová dovednost 1 bod (stupeň 1). Nevyužité body zůstávají.</li>
            <li>Každá dovednost nejvýš <b>+1 stupeň za úroveň</b>{exp ? ' – Expertiza: na sudé úrovni jedna dovednost až +2, nejvýš na úroveň + 2' : ''}. Zlepšení tady se počítá k aktuální ({level}.) úrovni, stejně jako v průvodci přestupem.</li>
            <li>Profesní dovednosti nejdou koupit – dává je schopnost povolání (na 3. stupni).</li>
            <li><b>Záchranné hody</b> (ověření proti pasti, jedu, pádu… – vyzve PJ) se hází na Atletiku, Vůli, Postřeh, Výdrž a Hbitost; v tabulce jsou označené.</li>
            <li>Situační bonusy rodové schopnosti (Orlí zrak, Zručnost, Tichošlápek) ukazuje bublina (i) u dovednosti – nezapočítávají se, rozhodne PJ.</li>
          </ul>
        </div>
      </details>

      <div className="sk-tools">
        <label className="small"><input type="checkbox" checked={criticals} onChange={(e) => setCriticals(e.target.checked)} /> kritické/fatální výsledky (H06)</label>
        <label className="small"><input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} /> ruční úprava stupňů (přepis z papíru, bez bodů)</label>
      </div>

      <div className="scroll-x">
        <table className="grid tn sk-table">
          <thead>
            <tr>
              <th>Dovednost</th><th className="c">Atribut</th><th className="c">Stupeň</th><th className="c sk-opt">Oprava</th><th className="c">Celkem</th><th className="c">Hod</th><th style={{ textAlign: 'right' }}>Zlepšit</th>
            </tr>
          </thead>
          <tbody>
            {d.skills.length === 0 && <tr><td colSpan={7} className="muted small">Postava zatím nemá žádné dovednosti – přidej je níž, nebo založ postavu průvodcem.</td></tr>}
            {d.skills.map((s) => {
              const cs = c.skills.find((k) => k.id === s.id)!;
              const attrs = skillAttributes(cs);
              const block = raiseBlockNow(c, s.id);
              const cost = raiseCostNow(c, s.id);
              const undo = undoableRaise(c, s.id);
              const r = rolls[s.id];
              return (
                <tr key={s.id}>
                  <td className="sk-n">
                    <b>{s.name}</b>{' '}
                    <span className={`pill${s.source === 'custom' ? ' bad' : ''}`} title={s.source === 'custom' ? 'Dovednost mimo seznam – schvaluje PJ' : undefined}>{SOURCE_LABEL[s.source].toUpperCase()}</span>
                    {SAVE_SKILLS.has(s.id) && <> <span className="pill save" title="Používá se k záchranným hodům (ověření proti pasti, jedu, pádu… – vyzve PJ)">ZÁCHRANNÝ HOD</span></>}
                    {(() => {
                      const rn = raceSkillNote(c, s.id);
                      const race = getRace(c.basic.raceId);
                      return rn ? (
                        <InfoBubble small title={`${race.ability.name} (${race.name})`} label={`Rodový bonus k ${s.name}`}>
                          <p style={{ margin: 0 }}><b>+{rn.bonus}</b> k {s.name}, {rn.when}.</p>
                          <p className="muted" style={{ margin: 0 }}>Situační – v Celkem ani v hodu započtený není. Připomeň ho PJ; když uzná, přičti +{rn.bonus} k výsledku.</p>
                        </InfoBubble>
                      ) : null;
                    })()}
                    {canRemove(cs) && (confirmRemove === s.id ? (
                      <span className="sk-confirm small"> Odebrat a vrátit {refundOnRemove(c, s.id)} b.?{' '}
                        <button className="btn" type="button" onClick={() => { upd((x) => removeSkill(x, s.id)); setConfirmRemove(null); }}>Ano</button>{' '}
                        <button className="btn" type="button" onClick={() => setConfirmRemove(null)}>Ne</button>
                      </span>
                    ) : (
                      <button type="button" className="fpop-x" aria-label={`Odebrat dovednost ${s.name}`} title="Odebrat (body se vrátí)" onClick={() => setConfirmRemove(s.id)}>×</button>
                    ))}
                  </td>
                  <td className="c sk-a">
                    {s.options.length > 1 ? (
                      <span title="Atribut se volí podle situace – hoď na ten, který odpovídá tomu, co postava dělá (rozhodne PJ)">{s.options.map((o) => ATTR_LABELS[o.attribute].short).join(' / ')}</span>
                    ) : attrs.length > 1 ? (
                      <select className="sk-attr" aria-label={`Atribut pro ${s.name}`} value={s.attribute} onChange={(e) => upd((x) => setSkillAttribute(x, s.id, e.target.value as AttrKey))}>
                        {attrs.map((a) => <option key={a} value={a}>{ATTR_LABELS[a].short}</option>)}
                      </select>
                    ) : ATTR_LABELS[s.attribute].short}
                  </td>
                  <td className="c sk-s">
                    {manual ? (
                      <input className="sk-rank" type="number" min={1} step={1} aria-label={`Stupeň ${s.name}`} value={s.rank} onChange={(e) => upd((x) => setSkillRankManual(x, s.id, Number(e.target.value)))} />
                    ) : <b>{s.rank}</b>}
                  </td>
                  <td className="c sk-opt" title={s.bonusParts.length ? `bonusy: ${s.bonusParts.join(', ')}` : undefined}>
                    {s.options.length > 1
                      ? s.options.map((o) => sgn(o.mod)).join(' / ')
                      : sgn(s.mod)}
                    {s.bonus ? <span className="muted small"> {sgn(s.bonus)}</span> : null}
                  </td>
                  <td className={`c sk-t${s.options.length > 1 ? ' multi' : ''}`}>
                    {s.options.length > 1
                      ? <b>{s.options.map((o) => `${ATTR_LABELS[o.attribute].short} ${sgn(o.total)}`).join(' · ')}</b>
                      : <b>{sgn(s.total)}</b>}
                  </td>
                  <td className="c sk-h">
                    {s.options.length > 1 ? (
                      <div className="sk-rolls">
                        {s.options.map((o) => (
                          <button key={o.attribute} className="btn sk-roll" type="button" aria-label={`Hodit k10 ${sgn(o.total)} na ${s.name} s ${ATTR_LABELS[o.attribute].short}`} onClick={() => roll(s.id, o.total, o.attribute)}>
                            ⚄ {ATTR_LABELS[o.attribute].short} {sgn(o.total)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button className="btn sk-roll" type="button" aria-label={`Hodit k10 ${sgn(s.total)} na ${s.name}`} onClick={() => roll(s.id, s.total)}>⚄ k10 {sgn(s.total)}</button>
                    )}
                    {r && (
                      <div className={`sk-res${r.outcome ? ` ${r.outcome}` : ''}`} aria-live="polite">
                        <b>{r.total}</b> <span className="muted small">({r.attr ? `${ATTR_LABELS[r.attr].short}: ` : ''}{r.die}{r.second != null ? ` → ${r.second}` : ''} {sgn(r.bonus)})</span>
                        {r.outcome && <div className="small"><b>{ROLL_TEXT[r.outcome]}</b></div>}
                      </div>
                    )}
                  </td>
                  <td className="sk-z" style={{ textAlign: 'right' }}>
                    <div className="steps" style={{ justifyContent: 'flex-end' }}>
                      {undo && <button className="btn" type="button" title="Vrátit zlepšení z této úrovně" onClick={() => upd((x) => undoRaise(x, s.id))}>↶ {undo.entry.cost} b.</button>}
                      {block
                        ? <span className="small muted">{block}</span>
                        : <button className="btn" type="button" onClick={() => upd((x) => raiseSkill(x, s.id))}>+1 · {cost} b.</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <NewSkill />
    </Sheet>
  );

  const points = (
    <Sheet>
      <Ribbon icon="star">DOVEDNOSTNÍ BODY</Ribbon>
      <div className="trio sk-sum">
        <div className="box"><span className="lbl">Získáno</span><b className="tn">{d.skillPoints.earned}</b></div>
        <div className="box"><span className="lbl">Utraceno</span><b className="tn">{d.skillPoints.spent}</b></div>
        <div className="box"><span className="lbl">Zbývá</span><b className="tn">{d.skillPoints.available.value}</b></div>
      </div>
      {d.skillPoints.available.overridden && <p className="small bad-t">Počet bodů je ručně přepsaný (✎) – nákupy se řídí přepsanou hodnotou.</p>}
      <table className="grid tn" style={{ marginTop: 8 }}>
        <thead><tr><th>Úroveň</th><th className="c">Získáno</th><th className="c">Utraceno</th></tr></thead>
        <tbody>
          {Array.from({ length: level }, (_, i) => i + 1).map((l) => {
            const got = d.skillPoints.byLevel.find((x) => x.level === l)?.points ?? 0;
            const sp = spent.get(l) ?? 0;
            if (!got && !sp && l !== level) return null;
            return <tr key={l} className={l === level ? 'w-active' : undefined}><td>{l}.</td><td className="c">{got || '–'}</td><td className="c">{sp || '–'}</td></tr>;
          })}
        </tbody>
      </table>
      <p className="small muted">
        1. úroveň 3 body{c.basic.raceId === 'clovek' ? ' + 1 (Všestrannost)' : ''}; pak jen na sudých úrovních {cls.skillPointMultiplier} × úroveň
        {c.basic.raceId === 'clovek' ? ' + úroveň (Všestrannost)' : ''}{exp ? ' + 1 (Expertiza)' : ''}.
      </p>
      <SkillHistory />
    </Sheet>
  );

  return (
    <div className="stack sk-page">
      {table}
      <div className="cols">{points}<Catalog /></div>
    </div>
  );
}

function NewSkill() {
  const { character: c, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const [skillId, setSkillId] = useState('');
  const [ownName, setOwnName] = useState('');
  const [attr, setAttr] = useState<AttrKey>('int');
  const offer = purchasable(c);
  const own = skillId === '__own';
  const req = own ? { customName: ownName } : { id: skillId };
  const block = addBlock(c, req);
  const def = SKILLS.find((s) => s.id === skillId);
  const attrs: AttrKey[] = own ? [...ATTR_KEYS] : def?.attributes ?? [...ATTR_KEYS];

  if (!open) return <button className="addrow" type="button" onClick={() => setOpen(true)}>+ NOVÁ DOVEDNOST (1 bod)</button>;
  return (
    <div className="help" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
      <b className="lbl">Nová dovednost · 1 bod · stupeň 1</b>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8, alignItems: 'end' }}>
        <div className="box" style={{ textAlign: 'left' }}>
          <label className="lbl" htmlFor="sk-new">Dovednost</label>
          <select className="field" id="sk-new" value={skillId} onChange={(e) => { setSkillId(e.target.value); const s = SKILLS.find((x) => x.id === e.target.value); if (s) setAttr(s.defaultAttribute); }}>
            <option value="">— vyber —</option>
            <optgroup label="Základní dovednosti (H14)">{offer.filter((s) => s.kind === 'basic').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
            <optgroup label="Rozšířené (Pravidla pro pokročilé)">{offer.filter((s) => s.kind === 'extended').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
            <option value="__own">Jiná – napsat vlastní…</option>
          </select>
        </div>
        {own && (
          <div className="box" style={{ textAlign: 'left' }}>
            <label className="lbl" htmlFor="sk-own">Název</label>
            <input className="field" id="sk-own" value={ownName} onChange={(e) => setOwnName(e.target.value)} />
          </div>
        )}
        <div className="box" style={{ textAlign: 'left' }}>
          <label className="lbl" htmlFor="sk-attr">Atribut</label>
          <select className="field" id="sk-attr" value={attrs.includes(attr) ? attr : attrs[0]} onChange={(e) => setAttr(e.target.value as AttrKey)}>
            {attrs.map((a) => <option key={a} value={a}>{ATTR_LABELS[a].name}</option>)}
          </select>
        </div>
      </div>
      {own && <p className="small muted" style={{ margin: 0 }}>Dovednost mimo seznam schvaluje PJ.</p>}
      {skillId && block && <p className="small bad-t" style={{ margin: 0 }}>{block}</p>}
      <div className="steps">
        <button className="btn dark" type="button" disabled={!!block} onClick={() => {
          const a = attrs.includes(attr) ? attr : attrs[0];
          dispatch({ type: 'update', fn: (x) => addSkill(x, { ...req, attribute: a }) });
          setOpen(false); setSkillId(''); setOwnName('');
        }}>Naučit se (−1 b.)</button>
        <button className="btn" type="button" onClick={() => setOpen(false)}>Zavřít</button>
      </div>
    </div>
  );
}

function SkillHistory() {
  const { character: c } = useStore();
  if (!c.skillLog.length) return null;
  const rows = [...c.skillLog].reverse();
  return (
    <details className="help-d">
      <summary><Icon name="book" className="i14" /> HISTORIE ({c.skillLog.length})</summary>
      <table className="grid tn small">
        <tbody>
          {rows.map((e, i) => (
            <tr key={i}><td>{e.level}. úr.</td><td>{skillName(c, e.skillId)}</td><td className="c">{e.from === 0 ? 'nová' : `${e.from} → ${e.to}`}</td><td className="c">−{e.cost}</td></tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Přehled všech dovedností z pravidel – co postava má a jak se k ostatním dostat. */
function Catalog() {
  const { character: c } = useStore();
  const owned = new Set(c.skills.map((s) => s.id));
  const group = (title: string, list: typeof SKILLS, note: (s: (typeof SKILLS)[number]) => string) => (
    <>
      <tr><th colSpan={3}>{title}</th></tr>
      {list.map((s) => (
        <tr key={s.id} className={owned.has(s.id) ? 'w-active' : undefined}>
          <td>{s.name}</td>
          <td className="c">{s.attributes.map((a) => ATTR_LABELS[a].short).join('/')}</td>
          <td className="small muted">{owned.has(s.id) ? 'má' : note(s)}</td>
        </tr>
      ))}
    </>
  );
  const byClass = (s: (typeof SKILLS)[number]) => {
    const holder = CLASSES.filter((k) => k.professionSkills.includes(s.id)).map((k) => k.name);
    const who = s.classId ? CLASSES.find((k) => k.id === s.classId)?.name : holder.join(', ');
    return s.grantedOnly || !holder.length ? `schopnost${who ? ` (${who})` : ''}` : `start ${who}`;
  };
  return (
    <Sheet>
      <details className="help-d">
        <summary><Icon name="book" className="i14" /> VŠECHNY DOVEDNOSTI Z PRAVIDEL</summary>
        <table className="grid tn">
          <tbody>
            {group('Základní (H14)', SKILLS.filter((s) => s.kind === 'basic'), () => '1 bod')}
            {group('Rozšířené (PPP)', SKILLS.filter((s) => s.kind === 'extended'), () => '1 bod')}
            {group('Profesní', SKILLS.filter((s) => s.kind === 'profession'), byClass)}
          </tbody>
        </table>
      </details>
    </Sheet>
  );
}
