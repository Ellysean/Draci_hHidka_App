// Průvodce tvorbou postavy – 9 kroků podle H05 (docs/CHARACTER_CREATION.md).
// Stav je koncept v úložišti; aktivní postava se nahradí až v posledním kroku.
import { useMemo, useState, type ReactNode } from 'react';
import {
  STEPS, additions, assignDie, buildCharacter, buildEquipment, canStep, changeClass, classChangeLosses, classSkills,
  diceState, finalAttributes, firstBlocked, lineName, pointsUsed, whyNot, type Draft,
} from '../creation/draft';
import { useDraft } from '../creation/useDraft';
import { ATTR_KEYS, type AttrKey, type ClassId, type RaceId } from '../model/types';
import { ATTR_LABELS, CLASSES, CONCEPTS, LEVEL1, RACES, RECOMMENDED, SKILLS, getClass, getRace, getSkill, getWeapon, type EquipLine } from '../rules/data';
import { attributeMod, derive, sgn } from '../rules/derive';
import { rollDie } from '../rules/dice';
import { formatMd } from '../rules/money';
import { useStore } from '../state/store';
import { Icon } from '../ui/Icon';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { isBlank } from '../storage/backup';
import { Shop } from './Shop';

type Update = (patch: Partial<Draft> | ((d: Draft) => Draft)) => void;

const ENERGY_HINT: Record<ClassId, string> = {
  valecnik: 'Adrenalin (mimo boj max. ODO)', hranicar: 'Duševní síla podle INT', alchymista: 'Mana podle INT, suroviny podle OBR',
  kouzelnik: 'Mana podle INT', zlodej: 'bez many', klerik: 'Přízeň podle CHAR',
};

function Confirm({ text, yes, no, onYes, onNo }: { text: ReactNode; yes: string; no: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="warnbar" role="alert">
      <span style={{ flex: 1, minWidth: 200 }}>{text}</span>
      <button className="btn wine" type="button" onClick={onYes}>{yes}</button>
      <button className="btn" type="button" onClick={onNo}>{no}</button>
    </div>
  );
}

const MiniAttrs = ({ values }: { values: Record<AttrKey, number | null> }) => (
  <div className="mini tn">
    {ATTR_KEYS.map((k) => (
      <span key={k}>{ATTR_LABELS[k].short}<b>{values[k] ?? '·'}</b>{values[k] != null && <i>{sgn(attributeMod(values[k] as number))}</i>}</span>
    ))}
  </div>
);

// ---------- kroky ----------

function StepKoncept({ d, update }: { d: Draft; update: Update }) {
  return (
    <>
      <p className="lead">Nejdřív pár slov o tom, koho chceš hrát. Koncept pomůže při dalších volbách a uloží se do Poznámek.</p>
      <div className="box" style={{ textAlign: 'left' }}>
        <label className="lbl" htmlFor="wz-name">Jméno</label>
        <input className="field" id="wz-name" value={d.name} onChange={(e) => update({ name: e.target.value })} placeholder="např. Thorgil" style={{ font: '700 22px/1 var(--f-display)', height: 44 }} />
      </div>
      <div className="box" style={{ textAlign: 'left', marginTop: 12 }}>
        <label className="lbl" htmlFor="wz-concept">Koncept postavy</label>
        <textarea className="field" id="wz-concept" rows={2} value={d.concept} onChange={(e) => update({ concept: e.target.value })} placeholder="několik slov o postavě" style={{ resize: 'vertical', font: 'italic 17px/1.35 var(--f-hand)' }} />
      </div>
      <p className="small muted" style={{ margin: '10px 0 4px' }}>Příklady z pravidel (klepnutím převezmeš):</p>
      <div className="chips">
        {CONCEPTS.map((c) => <button key={c} type="button" className="chip" onClick={() => update({ concept: c })}>{c}</button>)}
      </div>
    </>
  );
}

function StepRasa({ d, update }: { d: Draft; update: Update }) {
  return (
    <>
      <p className="lead">Rasa určí velikost, pohyblivost, rodovou schopnost a základ atributů.</p>
      <div className="cards">
        {RACES.map((r) => (
          <button key={r.id} type="button" className="card" aria-pressed={d.raceId === r.id} onClick={() => update({ raceId: r.id as RaceId })}>
            <strong>{r.name}</strong>
            <span className="muted">Velikost {r.size} · pohyblivost {r.mobilityBase} + OBR</span>
            <span><b>{r.ability.name}</b> – {r.ability.text}</span>
            <MiniAttrs values={r.baseAttributes} />
          </button>
        ))}
      </div>
    </>
  );
}

function StepPovolani({ d, update }: { d: Draft; update: Update }) {
  const [pending, setPending] = useState<ClassId | null>(null);
  const pick = (id: ClassId) => {
    if (id === d.classId) return;
    if (d.classId && classChangeLosses(d).length) setPending(id);
    else update((x) => changeClass(x, id));
  };
  return (
    <>
      <p className="lead">Povolání dá +3 dvěma dominantním atributům, tři blízké dovednosti na stupni 3 a schopnosti 1. úrovně.</p>
      {pending && (
        <Confirm
          text={<>Změna povolání smaže: {classChangeLosses(d).join(', ')}. Hod kostkami a rasa zůstanou.</>}
          yes="Změnit povolání" no="Ponechat"
          onYes={() => { update((x) => changeClass(x, pending)); setPending(null); }}
          onNo={() => setPending(null)}
        />
      )}
      <div className="cards">
        {CLASSES.map((c) => {
          const L = LEVEL1[c.id];
          return (
            <button key={c.id} type="button" className="card" aria-pressed={d.classId === c.id} onClick={() => pick(c.id)}>
              <strong>{c.name}</strong>
              <span><b>+3</b> {c.dominantAttributes.map((a) => ATTR_LABELS[a].short).join(' a ')}</span>
              <span className="muted">
                Dovednosti: {c.basicSkills.map((s) => getSkill(s)?.name ?? s).join(', ')}
                {c.professionSkills.length > 0 && `; profesní ${c.professionSkills.map((s) => getSkill(s)?.name ?? s).join(', ')}`}
              </span>
              <span className="muted">{ENERGY_HINT[c.id]}</span>
              <span>{[...L.abilities, L.choose ? `volba ${L.choose.n} – ${L.choose.word}` : '', L.auto.length ? L.autoWord : ''].filter(Boolean).join(' · ')}</span>
            </button>
          );
        })}
      </div>
      {d.classId === 'klerik' && (
        <div className="box" style={{ textAlign: 'left', maxWidth: 320, marginTop: 12 }}>
          <label className="lbl" htmlFor="wz-deity">Bůh (klerik)</label>
          <input className="field" id="wz-deity" value={d.deity} onChange={(e) => update({ deity: e.target.value })} placeholder="např. Freya" />
        </div>
      )}
    </>
  );
}

function StepAtributy({ d, update }: { d: Draft; update: Update }) {
  const [sel, setSel] = useState<number | null>(null);
  const [askReroll, setAskReroll] = useState(false);
  const dice = diceState(d);
  const add = additions(d);
  const fin = finalAttributes(d);
  const base = getRace(d.raceId as RaceId).baseAttributes;
  const dom = getClass(d.classId as ClassId).dominantAttributes;
  const usedBy = (i: number) => ATTR_KEYS.find((k) => d.assign[k] === i);
  const roll = () => { update({ rolls: Array.from({ length: 6 }, () => rollDie(6)), assign: {} }); setSel(null); };
  const left = 20 - pointsUsed(d);

  return (
    <>
      <p className="lead">Stupeň = rodový základ + hod nebo body + 3 za dominantní atribut povolání.</p>
      <div className="seg" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 420 }} role="group" aria-label="Způsob určení atributů">
        <button type="button" aria-pressed={d.method === 'roll'} onClick={() => update({ method: 'roll' })}>Hod kostkou<small>6×k6, nejnižší se škrtne</small></button>
        <button type="button" aria-pressed={d.method === 'points'} onClick={() => update({ method: 'points' })}>20 bodů<small>1–6 do každého atributu</small></button>
      </div>

      {d.method === 'roll' && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
            {dice.ok
              ? <button className="btn" type="button" onClick={() => setAskReroll(true)}>⚄ Hodit znovu</button>
              : <button className="btn dark" type="button" onClick={roll}>⚄ Hodit 6×k6</button>}
            <span className="small muted">nebo zapiš fyzický hod:</span>
            {d.rolls.map((r, i) => (
              <input
                key={i} className="field num tn" type="number" min={1} max={6} id={`wz-r${i}`} aria-label={`Hod ${i + 1}`}
                value={r ?? ''} style={{ width: 48, height: 34, padding: 2 }}
                onChange={(e) => {
                  const v = e.target.value === '' ? null : Math.max(1, Math.min(6, Math.trunc(Number(e.target.value)) || 1));
                  update((x) => ({ ...x, rolls: x.rolls.map((y, j) => (j === i ? v : y)), assign: {} }));
                }}
              />
            ))}
            {d.rerolls > 0 && <span className="pill">PŘEHOZENO {d.rerolls}×</span>}
          </div>
          {askReroll && (
            <Confirm
              text="Opravdu hodit znovu? Přiřazení se zruší a přehození se zapíše (ať je to fér vůči Vypravěči)."
              yes="Hodit znovu" no="Nechat"
              onYes={() => { update((x) => ({ ...x, rerolls: x.rerolls + 1 })); roll(); setAskReroll(false); }}
              onNo={() => setAskReroll(false)}
            />
          )}
          {dice.ok && (
            <>
              <p className="small muted" style={{ margin: '12px 0 6px' }}>Vyber hodnotu a pak atribut, ke kterému patří. Hodnotu jde přesunout jinam.</p>
              <div className="chips" role="group" aria-label="Hozené hodnoty">
                {dice.vals.map((v, i) => {
                  if (i === dice.struck) return <span key={i} className="die struck" title="Nejnižší hod se škrtá">{v}</span>;
                  const u = usedBy(i);
                  return (
                    <button key={i} type="button" className={`die ${u ? 'used' : ''}`} aria-pressed={sel === i} onClick={() => setSel(sel === i ? null : i)} title={u ? `přiřazeno k ${ATTR_LABELS[u].short}` : 'volná hodnota'}>
                      {v}{u && <small>{ATTR_LABELS[u].short}</small>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
      {d.method === 'points' && <p className="tn" style={{ margin: '12px 0 0' }}>Zbývá rozdělit <b style={{ fontSize: 20 }}>{left}</b> z 20 bodů.</p>}

      <div className="scroll-x" style={{ marginTop: 12 }}>
        <table className="grid tn atab">
          <thead><tr><th>Atribut</th><th className="c">Rasa</th><th className="c">{d.method === 'roll' ? 'Hod' : 'Body'}</th><th className="c">Povolání</th><th className="c">Stupeň</th><th className="c">Oprava</th></tr></thead>
          <tbody>
            {ATTR_KEYS.map((k) => (
              <tr key={k}>
                <td><span className="shield-s">{ATTR_LABELS[k].short}</span> {ATTR_LABELS[k].name}</td>
                <td className="c">{base[k]}</td>
                <td className="c">
                  {d.method === 'points' ? (
                    <div className="stepper">
                      <button className="btn" type="button" aria-label={`ubrat ${ATTR_LABELS[k].short}`} disabled={d.points[k] <= 1} onClick={() => update((x) => ({ ...x, points: { ...x.points, [k]: x.points[k] - 1 } }))}>−</button>
                      <b className="tn">{d.points[k]}</b>
                      <button className="btn" type="button" aria-label={`přidat ${ATTR_LABELS[k].short}`} disabled={d.points[k] >= 6 || left <= 0} onClick={() => update((x) => ({ ...x, points: { ...x.points, [k]: x.points[k] + 1 } }))}>+</button>
                    </div>
                  ) : (
                    <button
                      type="button" className={`slot tn ${add[k] != null ? 'on' : ''}`} disabled={!dice.ok} aria-label={`Hodnota pro ${ATTR_LABELS[k].short}`}
                      onClick={() => {
                        if (sel != null) { update((x) => assignDie(x, k, sel)); setSel(null); }
                        else if (d.assign[k] != null) update((x) => { const a = { ...x.assign }; delete a[k]; return { ...x, assign: a }; });
                      }}
                    >
                      {add[k] ?? (sel != null ? 'sem' : '—')}
                    </button>
                  )}
                </td>
                <td className="c">{dom.includes(k) ? <b>+3</b> : <span className="muted">–</span>}</td>
                <td className="c"><b style={{ fontSize: 20 }}>{fin[k] ?? '—'}</b></td>
                <td className="c">{fin[k] != null ? sgn(attributeMod(fin[k] as number)) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">Příklad z H05: elfí kouzelnice Lómiel, 20 bodů rozdělených 4/4/5/6/1 → stupně 9/12/9/16/10.</p>
    </>
  );
}

function StepZivoty({ d }: { d: Draft }) {
  const c = buildCharacter(d);
  const der = derive(c);
  const cls = getClass(c.basic.classId);
  const en: [string, ReactNode, string] =
    cls.id === 'valecnik' ? ['Adrenalin', `mimo boj max. ${der.manaMax.value}`, 'Roste o 1 na konci každého tvého tahu v boji; na začátku 0.']
      : cls.id === 'zlodej' ? ['Energie', '—', 'Zloděj manu nemá.']
        : cls.id === 'alchymista' ? ['Mana a suroviny', `${c.vitals.manaCurrent} / ${c.classState.alchymista?.materialsCurrent}`, `Mana = 12 × INT ${c.attributes.int} − 24 · suroviny = 20 × OBR ${c.attributes.obr} + 120 (H10). Alchymista nemá maximum, omezují ho nádoby.`]
          : [cls.energyName ?? 'Energie', der.manaMax.value ?? '—', `${der.manaMax.formula}. Začínáš na maximu.`];
  return (
    <>
      <p className="lead">Tyhle hodnoty se spočítají samy z atributů a povolání.</p>
      <div className="trio">
        <div className="box"><span className="lbl">Max. životy</span><span className="field num tn calc" style={{ display: 'grid', placeItems: 'center' }}>{der.hpMax.value}</span><span className="small muted">10 + ODO {sgn(der.mods.odo)}</span></div>
        <div className="box"><span className="lbl">Hranice smrti</span><span className="field num tn calc" style={{ display: 'grid', placeItems: 'center' }}>{der.deathThreshold.value}</span><span className="small muted">−(10 + ODO)</span></div>
        <div className="box"><span className="lbl">Pohyblivost</span><span className="field num tn calc" style={{ display: 'grid', placeItems: 'center' }}>{der.mobility.value}</span><span className="small muted">{der.mobility.formula}</span></div>
      </div>
      <div className="help" style={{ gridTemplateColumns: 'auto 1fr', marginTop: 14, alignItems: 'center' }}>
        <div className="big tn" style={{ fontSize: 30 }}>{en[1]}</div>
        <div><b className="lbl">{en[0]}</b><div className="small">{en[2]}</div></div>
      </div>
      <p className="small muted">Aktuální životy a energie začínají na maximu. Max. životy dál rostou podle Tabulky životů při každém přestupu.</p>
    </>
  );
}

function StepDovednosti({ d, update }: { d: Draft; update: Update }) {
  const [open, setOpen] = useState(false);
  const [skillId, setSkillId] = useState('');
  const [ownName, setOwnName] = useState('');
  const [attr, setAttr] = useState<AttrKey>('int');
  const c = buildCharacter(d);
  const der = derive(c);
  const left = der.skillPoints.available.value;
  const owned = new Set(c.skills.map((s) => s.id));
  const offer = SKILLS.filter((s) => s.kind !== 'profession' && !owned.has(s.id));
  const classOwn = new Set(classSkills(d.classId as ClassId).map((s) => s.id));

  const learn = () => {
    if (skillId === '__own') {
      if (!ownName.trim()) return;
      update((x) => ({ ...x, added: [...x.added, { id: `custom:${ownName.trim().toLowerCase()}`, customName: ownName.trim(), attribute: attr }] }));
    } else if (skillId) {
      update((x) => ({ ...x, added: [...x.added, { id: skillId, customName: null, attribute: attr }] }));
    }
    setOpen(false); setSkillId(''); setOwnName('');
  };

  return (
    <>
      <div className="ribbon-row">
        <p className="lead" style={{ margin: 0 }}>Blízké a profesní dovednosti povolání máš rovnou na stupni 3. Body můžeš utratit za nové dovednosti na stupni 1, nebo si je nechat na další úroveň.</p>
        <div className="counter"><span className="lbl">Body</span><span className="field num tn calc" style={{ display: 'grid', placeItems: 'center', width: 62 }}>{left}</span></div>
      </div>
      <table className="grid tn" style={{ marginTop: 8 }}>
        <thead><tr><th>Dovednost</th><th className="c">Atribut</th><th className="c">Stupeň</th><th>Zdroj</th><th /></tr></thead>
        <tbody>
          {c.skills.map((s) => {
            const ai = d.added.findIndex((a) => a.id === s.id);
            return (
              <tr key={s.id}>
                <td><b>{s.customName ?? getSkill(s.id)?.name ?? s.id}</b></td>
                <td className="c">{ATTR_LABELS[s.attribute].short}</td>
                <td className="c">{s.rank}</td>
                <td><span className={`pill ${ai >= 0 ? 'ok' : ''}`}>{ai >= 0 ? (s.customName ? 'VLASTNÍ' : 'NOVÁ · 1 B.') : classOwn.has(s.id) && s.source === 'class-profession' ? 'PROFESNÍ' : 'ZÁKLADNÍ'}</span></td>
                <td style={{ textAlign: 'right' }}>
                  {ai >= 0
                    ? <button className="btn" type="button" onClick={() => update((x) => ({ ...x, added: x.added.filter((_, j) => j !== ai) }))}>Zrušit (+1 b.)</button>
                    : <span className="small muted">z povolání</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {open ? (
        <div className="help" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
          <b className="lbl">Nová dovednost · 1 bod · stupeň 1</b>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8, alignItems: 'end' }}>
            <div className="box" style={{ textAlign: 'left' }}>
              <label className="lbl" htmlFor="wz-skill">Dovednost</label>
              <select className="field" id="wz-skill" value={skillId} onChange={(e) => { setSkillId(e.target.value); const s = getSkill(e.target.value); if (s) setAttr(s.defaultAttribute); }}>
                <option value="">— vyber —</option>
                <optgroup label="Základní dovednosti (H14)">{offer.filter((s) => s.kind === 'basic').map((s) => <option key={s.id} value={s.id}>{s.name} ({s.attributes.map((a) => ATTR_LABELS[a].short).join('/')})</option>)}</optgroup>
                <optgroup label="Rozšířené (Pravidla pro pokročilé)">{offer.filter((s) => s.kind === 'extended').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                <option value="__own">Jiná – napsat vlastní…</option>
              </select>
            </div>
            {skillId === '__own' && (
              <div className="box" style={{ textAlign: 'left' }}>
                <label className="lbl" htmlFor="wz-own">Název</label>
                <input className="field" id="wz-own" value={ownName} onChange={(e) => setOwnName(e.target.value)} placeholder="např. Lodní plavba" />
              </div>
            )}
            <div className="box" style={{ textAlign: 'left' }}>
              <label className="lbl" htmlFor="wz-attr">Atribut</label>
              <select className="field" id="wz-attr" value={attr} onChange={(e) => setAttr(e.target.value as AttrKey)}>
                {ATTR_KEYS.map((k) => <option key={k} value={k}>{ATTR_LABELS[k].short}</option>)}
              </select>
            </div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Atribut je předvyplněný podle pravidel, u dvouatributových dovedností rozhoduje PJ. Vlastní dovednost schvaluje PJ.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" type="button" onClick={() => setOpen(false)}>Zrušit</button>
            <button className="btn dark" type="button" disabled={!skillId || (skillId === '__own' && !ownName.trim())} onClick={learn}>Naučit · 1 b.</button>
          </div>
        </div>
      ) : (
        <button className="addrow" type="button" disabled={left < 1} onClick={() => setOpen(true)}><Icon name="plus" className="i14" />NAUČIT NOVOU DOVEDNOST · 1 BOD</button>
      )}
      {d.raceId === 'clovek' && <p className="small muted">Člověk má díky Všestrannosti 4 body místo 3.</p>}
      <p className="small muted">Na 1. úrovni jde body použít jen na nové dovednosti (H05). Profesní dovednosti se bodově koupit nedají.</p>
    </>
  );
}

function StepSchopnosti({ d, update }: { d: Draft; update: Update }) {
  const cls = d.classId as ClassId;
  const L = LEVEL1[cls];
  const race = getRace(d.raceId as RaceId);
  const toggle = (n: string) => update((x) => ({ ...x, picks: x.picks.includes(n) ? x.picks.filter((p) => p !== n) : [...x.picks, n] }));
  return (
    <>
      <p className="lead">Co postava umí od začátku.</p>
      <h3 className="lbl" style={{ margin: '0 0 6px' }}>Automaticky</h3>
      <ul className="ab-list" style={{ columns: 1 }}>
        <li>{race.ability.name}<span>rodová · {race.ability.text}</span></li>
        {L.abilities.map((a) => <li key={a}>{a}<span>1. úroveň</span></li>)}
        {getClass(cls).professionSkills.map((s) => <li key={s}>{getSkill(s)?.name ?? s}<span>profesní dovednost · stupeň 3</span></li>)}
        {L.auto.map((a) => <li key={a}>{a}<span>{L.autoWord}</span></li>)}
      </ul>
      {L.choose ? (
        <>
          <h3 className="lbl" style={{ margin: '16px 0 6px' }}>Vyber {L.choose.n} – {L.choose.word} ({d.picks.length}/{L.choose.n})</h3>
          <div className="opts" style={{ maxHeight: 'none' }}>
            {L.choose.pool.map((n) => {
              const on = d.picks.includes(n);
              return (
                <button key={n} type="button" className="opt" aria-pressed={on} disabled={!on && d.picks.length >= (L.choose?.n ?? 0)} onClick={() => toggle(n)}>
                  <strong>{n}</strong><span>{L.choose?.itemLabel}</span>
                </button>
              );
            })}
          </div>
          {cls === 'kouzelnik' && <p className="small muted">Výběr kouzel neomezuje jejich cena v maně – můžeš vzít i dražší kouzlo, než kolik máš teď many.</p>}
        </>
      ) : (
        <p className="muted">{cls === 'zlodej' ? 'Zloděj na 1. úrovni nic nevybírá – zlodějské triky získává až se zlodějskými uměními.' : 'Na 1. úrovni tu není co vybírat.'}</p>
      )}
    </>
  );
}

function StepVybaveni({ d, update, openShop }: { d: Draft; update: Update; openShop: () => void }) {
  const [pendingMode, setPendingMode] = useState<Draft['eqMode'] | null>(null);
  const cls = d.classId as ClassId;
  const R = RECOMMENDED.byClass[cls];
  const eq = buildEquipment(d);
  const der = derive(buildCharacter(d));
  const lineTxt = (l: EquipLine) => `${lineName(l)}${(l.qty ?? 1) > 1 ? ` ×${l.qty}` : ''}`;
  const preview = (l: EquipLine) => {
    const w = getWeapon(l.weaponId ?? null);
    if (!w) return null;
    const base = w.kind === 'melee' ? der.mods.sil : der.mods.obr;
    const over = w.req != null && der.mods.sil < w.req;
    return <span key={w.id} className="tn small">ÚČ {base + w.att - (over ? 5 : 0)} · Ú/Z/O {w.att}/{w.dmg}/{w.def}{over && <> <span className="pill bad">PŘETÍŽENÍ −5</span></>}</span>;
  };
  const setMode = (m: Draft['eqMode']) => {
    if (m === d.eqMode) return;
    if (d.cart.length || (d.eqMode === 'custom' && d.gold != null)) setPendingMode(m);
    else update({ eqMode: m });
  };
  return (
    <>
      <p className="lead">Začátečníkům stačí doporučená výbava. Na míru si koupíš všechno sám za počáteční peníze.</p>
      <div className="seg" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 460 }} role="group" aria-label="Způsob výbavy">
        <button type="button" aria-pressed={d.eqMode === 'recommended'} onClick={() => setMode('recommended')}>Doporučené<small>rychlé · zdarma + {R.gold} zl</small></button>
        <button type="button" aria-pressed={d.eqMode === 'custom'} onClick={() => setMode('custom')}>Na míru<small>30 + 1k10 zl a obchod</small></button>
      </div>
      {pendingMode && (
        <Confirm
          text={`Přepnutím se zahodí nákupy${d.eqMode === 'custom' && d.gold != null ? ' i hozené peníze' : ''}. Pokračovat?`}
          yes="Přepnout" no="Nechat"
          onYes={() => { update({ eqMode: pendingMode, cart: [], gold: null }); setPendingMode(null); }}
          onNo={() => setPendingMode(null)}
        />
      )}
      {d.eqMode === 'recommended' ? (
        <>
          {R.choose.length > 0 && (
            <>
              <h3 className="lbl" style={{ margin: '14px 0 6px' }}>Vyber jednu sadu (zdarma)</h3>
              <div className="cards">
                {R.choose.map((c, i) => (
                  <button key={c.label} type="button" className="card" aria-pressed={d.choice === i} onClick={() => update({ choice: i })}>
                    <strong>{c.label}</strong>
                    {c.items.map(preview)}
                    <span className="muted small">{c.items.map(lineTxt).join(', ')}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="pair" style={{ marginTop: 14, alignItems: 'start' }}>
            <div>
              <h3 className="lbl" style={{ margin: '0 0 6px' }}>Podle povolání · {getClass(cls).name}</h3>
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                {[...R.fixed, ...R.items].map((l, i) => <li key={i}>{lineTxt(l)}</li>)}
                <li><b>{R.gold} zl</b> do měšce</li>
              </ul>
            </div>
            <div>
              <h3 className="lbl" style={{ margin: '0 0 6px' }}>Společná výbava</h3>
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{RECOMMENDED.common.map((l, i) => <li key={i}>{lineTxt(l)}</li>)}</ul>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
            <button className="btn" type="button" onClick={openShop}><Icon name="coin" />Dokoupit za {formatMd(eq.purseMd)}</button>
            {d.cart.length > 0 && <span className="small">V obchodě koupeno {d.cart.reduce((a, c) => a + c.qty, 0)} ks.</span>}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end', marginTop: 14 }}>
            <div className="box" style={{ textAlign: 'left' }}>
              <label className="lbl" htmlFor="wz-gold">Počáteční peníze (zl)</label>
              <input className="field num tn" type="number" id="wz-gold" value={d.gold ?? ''} placeholder="31–40" style={{ width: 110 }}
                onChange={(e) => update({ gold: e.target.value === '' ? null : Math.max(0, Math.trunc(Number(e.target.value)) || 0) })} />
            </div>
            <button className="btn" type="button" disabled={d.gold != null} onClick={() => update({ gold: 30 + rollDie(10) })}>⚄ Hodit 30 + 1k10</button>
            <button className="btn dark" type="button" disabled={d.gold == null} onClick={openShop}><Icon name="coin" />Otevřít obchod</button>
          </div>
          {d.cart.length > 0
            ? <><h3 className="lbl" style={{ margin: '14px 0 6px' }}>Nakoupeno</h3><ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{eq.lines.map((l, i) => <li key={i}>{l.name}{l.qty > 1 ? ` ×${l.qty}` : ''}</li>)}</ul></>
            : <p className="small muted">Zatím nic nekoupeno. Zbraň a zbroj si vyber v obchodě – nejdřív ověř, jestli na ni máš Sílu.</p>}
        </>
      )}
      <p className="tn" style={{ margin: '14px 0 0' }}>V měšci: <b>{formatMd(eq.purseMd)}</b> · naložení výbavy <b>{der.load.value} lb</b></p>
    </>
  );
}

function StepShrnuti({ d, currentName }: { d: Draft; currentName: string }) {
  const c = buildCharacter(d);
  const der = derive(c);
  const eq = buildEquipment(d);
  const cls = getClass(c.basic.classId);
  const race = getRace(c.basic.raceId);
  const warn: string[] = [];
  const sp = der.skillPoints.available.value;
  if (sp > 0) warn.push(`${sp} ${sp === 1 ? 'dovednostní bod zůstává' : 'dovednostní body zůstávají'} na další úroveň.`);
  if (der.weapons.some((w) => w.overloaded)) warn.push('Některá zbraň vyžaduje vyšší SIL – přetížení −5.');
  if (der.armorOverloaded) warn.push('Zbroj vyžaduje vyšší SIL – přetížení −5 k ZO.');
  if (!c.equipment.weapons.length) warn.push('Postava nemá žádnou zbraň.');
  if (eq.spareArmor) warn.push('Koupená zbroj nebo štít navíc je jen ve výbavě.');
  const energy = cls.id === 'alchymista' ? `${c.vitals.manaCurrent} / ${c.classState.alchymista?.materialsCurrent}` : cls.id === 'zlodej' ? '—' : cls.id === 'valecnik' ? `0 (mimo boj max. ${der.manaMax.value})` : String(c.vitals.manaCurrent);
  const rows: [string, string][] = [
    ['Rasa / povolání', `${race.name} · ${cls.name}${cls.id === 'klerik' ? ` boha ${c.basic.deity}` : ''}`],
    ['Atributy', ATTR_KEYS.map((k) => `${ATTR_LABELS[k].short} ${c.attributes[k]} (${sgn(der.mods[k])})`).join(' · ')],
    ['Životy / hranice smrti', `${der.hpMax.value} / ${der.deathThreshold.value}`],
    ['Pohyblivost · velikost', `${der.mobility.value} · ${der.size.value}`],
    ['ZO · ÚČ / OČ', `${der.defenseBase.value} · ${der.attackNumber.value} / ${der.defenseNumber.value}`],
    [cls.id === 'alchymista' ? 'Mana / suroviny' : cls.energyName ?? 'Energie', energy],
    ['Dovednosti', der.skills.map((s) => `${s.name} ${s.rank}`).join(', ')],
    ['Schopnosti', [race.ability.name, ...LEVEL1[cls.id].abilities, ...d.picks].join(', ')],
    ['Zbraně', der.weapons.map((w) => w.name).join(', ') || '—'],
    ['Výbava', c.equipment.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ') + (eq.bases.length ? ', startovní základy' : '')],
    ['Peníze', formatMd(eq.purseMd)],
    ['Naložení', `${der.load.value} lb`],
  ];
  return (
    <>
      <p className="lead">Takhle bude postava vypadat v deníku. Všechno půjde dál upravit ručně.</p>
      <h2 className="pg" style={{ margin: '0 0 8px' }}>{c.basic.name}</h2>
      <table className="grid"><tbody>{rows.map(([a, b]) => <tr key={a}><td className="lbl" style={{ width: 170, verticalAlign: 'top', paddingTop: 7 }}>{a}</td><td>{b}</td></tr>)}</tbody></table>
      {warn.length > 0 && (
        <div className="help" style={{ gridTemplateColumns: '1fr', marginTop: 12 }}>
          <b className="lbl">Upozornění</b>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{warn.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}
      {currentName && <p className="small" style={{ color: 'var(--blood)' }}>Vytvořením se nahradí současná postava „{currentName}“.</p>}
    </>
  );
}

function Preview({ d }: { d: Draft }) {
  const c = useMemo(() => buildCharacter(d), [d]);
  const der = useMemo(() => derive(c), [c]);
  const eq = useMemo(() => buildEquipment(d), [d]);
  const done = canStep(d, 'atributy');
  const cls = d.classId ? getClass(d.classId) : null;
  return (
    <Sheet className="wprev" aria-label="Náhled postavy">
      <Ribbon icon="person">NÁHLED</Ribbon>
      <b style={{ font: '700 19px/1.15 var(--f-display)', display: 'block' }}>{d.name || <span className="muted">bez jména</span>}</b>
      <div className="small muted">{d.raceId ? getRace(d.raceId).name : 'rasa ?'} · {cls ? cls.name : 'povolání ?'}</div>
      {d.raceId && d.classId && <div style={{ margin: '10px 0' }}><MiniAttrs values={finalAttributes(d)} /></div>}
      <dl className="pv tn">
        {done ? (
          <>
            <dt>Životy</dt><dd>{der.hpMax.value}</dd>
            <dt>Hr. smrti</dt><dd>{der.deathThreshold.value}</dd>
            <dt>Pohyblivost</dt><dd>{der.mobility.value}</dd>
            <dt>{cls?.id === 'alchymista' ? 'Mana / suroviny' : cls?.energyName ?? 'Energie'}</dt>
            <dd>{cls?.id === 'alchymista' ? `${c.vitals.manaCurrent} / ${c.classState.alchymista?.materialsCurrent}` : cls?.id === 'zlodej' ? '—' : cls?.id === 'valecnik' ? '0' : c.vitals.manaCurrent}</dd>
            <dt>ZO</dt><dd>{der.defenseBase.value}</dd>
          </>
        ) : (
          <><dt>Atributy</dt><dd className="muted">po kroku 4</dd></>
        )}
        {cls && <><dt>Dovednostní body</dt><dd>{der.skillPoints.available.value}</dd><dt>Peníze</dt><dd>{formatMd(eq.purseMd)}</dd></>}
      </dl>
    </Sheet>
  );
}

// ---------- průvodce ----------

export function Tvorba() {
  const { character, replaceWith } = useStore();
  const { draft: d, update, discard } = useDraft();
  const [shop, setShop] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  const [askCreate, setAskCreate] = useState(false);
  const fb = firstBlocked(d);
  const step = Math.min(d.step, fb);
  const key = STEPS[step].key;
  const ok = canStep(d, key);
  const go = (i: number) => { update({ step: i }); window.scrollTo(0, 0); };

  // Současná postava se před nahrazením uloží mezi zálohy v prohlížeči (Fáze 8).
  const create = () => {
    replaceWith(buildCharacter(d), 'nova');
    discard();
    window.location.hash = '#/postava';
  };
  const requestCreate = () => (isBlank(character) ? create() : setAskCreate(true));

  let body: ReactNode = null;
  switch (key) {
    case 'koncept': body = <StepKoncept d={d} update={update} />; break;
    case 'rasa': body = <StepRasa d={d} update={update} />; break;
    case 'povolani': body = <StepPovolani d={d} update={update} />; break;
    case 'atributy': body = <StepAtributy d={d} update={update} />; break;
    case 'zivoty': body = <StepZivoty d={d} />; break;
    case 'dovednosti': body = <StepDovednosti d={d} update={update} />; break;
    case 'schopnosti': body = <StepSchopnosti d={d} update={update} />; break;
    case 'vybaveni': body = <StepVybaveni d={d} update={update} openShop={() => setShop(true)} />; break;
    case 'shrnuti': body = <StepShrnuti d={d} currentName={character.basic.name} />; break;
  }

  return (
    <>
      <div className="wiz-head">
        <div><Ribbon icon="plus">NOVÁ POSTAVA</Ribbon><h1 className="pg">{STEPS[step].label}</h1></div>
        <div className="steps">
          <a className="btn" href="#/postava">Zavřít (koncept zůstane)</a>
          <button className="btn" type="button" onClick={() => setAskDiscard(true)}>Zahodit</button>
        </div>
      </div>
      {askDiscard && (
        <Confirm text="Zahodit rozpracovanou postavu a začít znovu? Současná postava v deníku zůstane beze změny." yes="Zahodit" no="Nechat"
          onYes={() => { discard(); setAskDiscard(false); }} onNo={() => setAskDiscard(false)} />
      )}
      <nav className="wbar" aria-label="Kroky tvorby postavy">
        {STEPS.map((s, i) => {
          const passed = i < step && canStep(d, s.key);
          return (
            <button key={s.key} type="button" aria-current={i === step ? 'step' : undefined} className={passed ? 'done' : ''} disabled={i > fb} onClick={() => go(i)}>
              {passed ? '✓' : i + 1} {s.label.toUpperCase()}
            </button>
          );
        })}
      </nav>
      <div className="wgrid">
        <Sheet>
          {body}
          <div className="wfoot">
            <button className="btn" type="button" disabled={step === 0} onClick={() => go(step - 1)}>Zpět</button>
            <span className="small muted">{ok ? '' : whyNot(d, key)}</span>
            {key === 'shrnuti'
              ? <button className="btn wine" type="button" onClick={requestCreate}>Vytvořit postavu</button>
              : <button className="btn dark" type="button" disabled={!ok} onClick={() => go(step + 1)}>Dál</button>}
          </div>
        </Sheet>
        <Preview d={d} />
      </div>
      {askCreate && (
        <ConfirmDialog title="VYTVOŘIT POSTAVU" icon="plus" yes="Vytvořit a nahradit" onYes={create} onNo={() => setAskCreate(false)}>
          <p>Nová postava <b>{d.name || 'bez jména'}</b> nahradí v deníku současnou postavu <b>{character.basic.name || 'bez jména'}</b>.</p>
          <p className="small">Současná postava se uloží mezi <b>zálohy v prohlížeči</b> (stránka <a href="#/zaloha">Záloha a import</a>), odkud jde obnovit nebo stáhnout do souboru.</p>
        </ConfirmDialog>
      )}
      {shop && <Shop d={d} update={update} onClose={() => setShop(false)} />}
    </>
  );
}
