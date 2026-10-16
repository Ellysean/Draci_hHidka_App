// Specializace MEDICUS na záložce Alchymie (PPP03 s. 127–142, fáze 7a+.1): operace a hody Chirurgie,
// Bojová anatomie, Resuscitace, Plastická chirurgie a Sešívanci (tvorba, vylepšení, karta tvora).
import { useState } from 'react';
import type { Character, StitchPart, StitchedCreature } from '../model/types';
import { alch, hasAbility, type CheckBonus } from '../rules/alchemy';
import { sgn, type Derived } from '../rules/derive';
import {
  HEAD_TYPES, LIMB_TYPES, PART_LABEL, SIZES, SKIN_TYPES, STITCH, SURGERY, augmentOutcome, crystalCount, firstAidBonus, newPart, partAttack,
  partDifficulty, passes, perceptionBonus, planStitch, plasticDc, removeStitched, resuscitationDc, stitch, stitchedDefense, stitchedHpMax,
  surgeryBonus, surgeryHeal, updateStitched,
} from '../rules/medicus';
import { useDice } from '../ui/Dice';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

type Upd = (next: Character) => void;
const int = (v: string, min = -99) => Math.max(min, Math.trunc(Number(v)) || 0);

// ---------------------------------------------------------------- operace a hody

type Op = 'osetreni' | 'bio' | 'mech' | 'plast' | 'resus' | 'ohledani';
const OP_LABEL: Record<Op, string> = {
  osetreni: 'Ošetření rány (Chirurgie)', bio: 'Biologická augmentace', mech: 'Mechanická augmentace', plast: 'Plastická chirurgie – přišití kůže / masky',
  resus: 'Resuscitace', ohledani: 'Bojová anatomie – ohledání mrtvého',
};
const OP_ABILITY: Partial<Record<Op, string>> = { bio: 'biologicka_augmentace', mech: 'mechanicka_augmentace', plast: 'plasticka_chirurgie', resus: 'resuscitace', ohledani: 'bojova_anatomie' };

export function MedicusSheet({ c, d }: { c: Character; d: Derived }) {
  const { roll } = useDice();
  const ops = (Object.keys(OP_LABEL) as Op[]).filter((o) => !OP_ABILITY[o] || hasAbility(c, OP_ABILITY[o]!));
  const [op, setOp] = useState<Op>('osetreni');
  const [dc, setDc] = useState(15);
  const [bioIx, setBioIx] = useState(0);
  const [prev, setPrev] = useState(0);
  const [minutes, setMinutes] = useState(1);
  const [result, setResult] = useState<number | ''>('');
  const cur = ops.includes(op) ? op : 'osetreni';
  const bonus: CheckBonus = cur === 'resus' ? firstAidBonus(c, d) : cur === 'ohledani' ? perceptionBonus(c, d) : surgeryBonus(c, d);
  const target: number | null = cur === 'bio' ? SURGERY.bio[bioIx]?.dc ?? 15 : cur === 'mech' ? SURGERY.mech[bioIx]?.dc ?? 15 : cur === 'plast' ? plasticDc(prev) : cur === 'resus' ? resuscitationDc(minutes) : dc;
  const r = typeof result === 'number' ? result : null;
  const heal = surgeryHeal(d);
  const reset = () => setResult('');

  let verdict: { text: string; bad: boolean } | null = null;
  if (r != null && target != null) {
    if (cur === 'bio' || cur === 'mech') {
      const o = augmentOutcome(r, target, cur);
      verdict = o === 'ok' ? { text: cur === 'bio' ? 'Úspěch – tělo augmentaci přijme, plně funguje po týdnu.' : 'Úspěch – vylepšení funguje hned.', bad: false }
        : o === 'death' ? { text: 'Neúspěch o 5 a víc – pacient obvykle umírá.', bad: true }
        : { text: cur === 'bio' ? 'Neúspěch – orgán či končetina nebude přijata.' : 'Neúspěch – rána se zanítí, vylepšení je nutné vyjmout (jde použít znovu).', bad: true };
    } else {
      const ok = passes(r, target);
      const text: Record<Exclude<Op, 'bio' | 'mech'>, string> = {
        osetreni: ok ? `Úspěch – krvácení zastaveno, vyléčí ${heal} životů (stupeň Chirurgie).` : 'Neúspěch.',
        plast: ok ? 'Úspěch – rány se do týdne dokonale zahojí. Odhalit to jde Postřehem (INT) vs. Chirurgie (OBR).' : 'Neúspěch – výsledný vzhled je všelijaký (PJ).',
        resus: ok ? 'Úspěch – životy těsně nad hranici smrti, zůstává v bezvědomí.' : 'Neúspěch – tvora už oživit nejde; do 24 h lze z orgánů destilovat manu.',
        ohledani: ok ? 'Příčina a čas smrti (s přesností na hodinu) zjištěny.' : 'Nic jistého.',
      };
      verdict = { text: text[cur], bad: !ok };
    }
  }
  return (
    <Sheet>
      <div className="md">
      <div className="ribbon-row"><Ribbon icon="spark">MEDICUS</Ribbon><span className="small muted">Chirurgie st. {heal} · {bonus.parts.join(' + ')}</span></div>
      <p className="small" style={{ margin: '0 0 8px' }}>
        Ošetření trvá 1 směnu: úspěch zastaví krvácení a vyléčí tolik životů, jaký je stupeň Chirurgie. Operace se dělají u pacienta v bezvědomí
        (Uspávací tinktura) ve sterilním prostředí; bonus Laboratoře platí, když v ní pracuješ.
      </p>
      <div className="al-ws">
        <label className="kf"><span className="lbl">Operace / hod</span>
          <select className="field" value={cur} onChange={(e) => { setOp(e.target.value as Op); setBioIx(0); reset(); }}>
            {ops.map((o) => <option key={o} value={o}>{OP_LABEL[o]}</option>)}
          </select>
        </label>
        {(cur === 'bio' || cur === 'mech') && (
          <label className="kf"><span className="lbl">Zákrok</span>
            <select className="field" value={bioIx} onChange={(e) => { setBioIx(Number(e.target.value)); reset(); }}>
              {(cur === 'bio' ? SURGERY.bio : SURGERY.mech).map((x, i) => <option key={i} value={i}>{x.label} ({x.dc})</option>)}
            </select>
          </label>
        )}
        {(cur === 'osetreni' || cur === 'ohledani') && (
          <label className="kf"><span className="lbl">Obtížnost (PJ)</span><input className="field num tn" type="number" value={dc} onChange={(e) => { setDc(int(e.target.value, 0)); reset(); }} /></label>
        )}
        {cur === 'plast' && <label className="kf"><span className="lbl">Předchozí operace pacienta</span><input className="field num tn" type="number" min={0} value={prev} onChange={(e) => { setPrev(int(e.target.value, 0)); reset(); }} /></label>}
        {cur === 'resus' && <label className="kf"><span className="lbl">Minut od smrti</span><input className="field num tn" type="number" min={0} max={6} value={minutes} onChange={(e) => { setMinutes(int(e.target.value, 0)); reset(); }} /></label>}
      </div>
      <p className="small tn" style={{ margin: '8px 0 0' }}>
        Hod: 1k10 {sgn(bonus.total)} <span className="muted">({bonus.parts.join(' + ')})</span>
        {target != null ? <> vs. <b>{target}</b> (hod musí být vyšší)</> : <> – <b className="bad-t">po 5 minutách už resuscitace nejde</b></>}
        {cur === 'bio' && ' · operace 6+ hodin, plná funkce po týdnu'}
        {cur === 'mech' && ' · 6 hodin za vylepšení, potřebuje Bio-rozhraní'}
        {cur === 'resus' && ' · 6 kol'}
        {cur === 'plast' && ' · 6 hodin, každá další operace téhož pacienta +5'}
      </p>
      <div className="steps" style={{ alignItems: 'center', marginTop: 6 }}>
        <button className="btn" type="button" disabled={target == null} onClick={() => setResult(roll('k10', bonus.total, OP_LABEL[cur]).total)}>⚄ Hodit</button>
        <label className="small">nebo výsledek <input className="field num tn" type="number" value={result} onChange={(e) => setResult(e.target.value === '' ? '' : Math.trunc(Number(e.target.value)))} aria-label="Výsledek hodu" /></label>
        {verdict && <span className={`small ${verdict.bad ? 'bad-t' : ''}`}><b>{verdict.text}</b></span>}
      </div>
      {hasAbility(c, 'bojova_anatomie') && (
        <p className="small" style={{ margin: '8px 0 0' }}>
          <b>Bojová anatomie v boji:</b> po zásahu za aspoň 1 život hází cíl ODO vs. tvoje OBR ({sgn(d.mods.obr)}) – při neúspěchu −3 ke všem akcím na 1k10 kol.
          Můžeš také jen působit bolest (Zranění se sníží na 1). Jen na tvory se známou anatomií, kteří cítí bolest.
        </p>
      )}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Sešívanci

type Base = StitchedCreature['base'];
const emptyBase = (): Base => ({ name: '', level: 1, size: 'B', sil: 0, obr: 0, odo: 0, skin: 'Kůže' });

export function SesivanciSheet({ c, d, put, say }: { c: Character; d: Derived; put: Upd; say: (s: string) => void }) {
  const s = alch(c);
  const [edit, setEdit] = useState<{ creatureUid: string | null } | null>(null);
  if (!hasAbility(c, 'sesivanci')) {
    return (
      <Sheet>
        <Ribbon icon="leaf">SEŠÍVANCI</Ribbon>
        <p className="small muted" style={{ margin: 0 }}>Volitelná schopnost Medika <b>Sešívanci</b> (od 6. úrovně, v průvodci přestupem) – sešívání těl různých tvorů ovládaných kontrolním krystalem.</p>
      </Sheet>
    );
  }
  const crystals = crystalCount(c);
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="leaf">SEŠÍVANCI</Ribbon><span className="small muted">kontrolní krystaly: {crystals} ks</span></div>
      {s.stitched.length === 0 && <p className="small muted" style={{ margin: 0 }}>Zatím žádný sešívanec. Nový potřebuje 2 kontrolní krystaly (primární zůstává u tebe, sekundární se vloží do tvora).</p>}
      {s.stitched.map((cr) => <CreatureCard key={cr.uid} cr={cr} c={c} put={put} onUpgrade={() => setEdit({ creatureUid: cr.uid })} />)}
      {edit ? <StitchBuilder c={c} d={d} put={put} say={say} creature={s.stitched.find((x) => x.uid === edit.creatureUid) ?? null} onClose={() => setEdit(null)} />
        : <div className="steps" style={{ marginTop: 8 }}><button className="btn dark" type="button" onClick={() => setEdit({ creatureUid: null })}>+ Nový sešívanec…</button></div>}
      <p className="small muted" style={{ margin: '8px 0 0' }}>
        Rozkaz myšlenkou = krátká akce (i více sešívancům). Primární krystal se musí dotýkat tvého těla; zničení kteréhokoliv krystalu = ztráta kontroly. Složité příkazy nechápe (asi INT 6).
      </p>
    </Sheet>
  );
}

function CreatureCard({ cr, c, put, onUpgrade }: { cr: StitchedCreature; c: Character; put: Upd; onUpgrade: () => void }) {
  const max = stitchedHpMax(cr.base);
  const zo = stitchedDefense(cr);
  const attacks = cr.parts.map((p) => ({ p, a: partAttack(cr.base, p) })).filter((x) => x.a);
  const hp = (v: number) => put(updateStitched(c, cr.uid, { hpCurrent: Math.max(0, Math.min(max, v)) }));
  return (
    <div className="al-proc" style={{ marginTop: 0, marginBottom: 8 }}>
      <div className="steps" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <b>{cr.name}{!cr.alive && <> <span className="pill bad">MRTVÝ</span></>}</b>
        <span className="small tn">základ: {cr.base.name}, úr. {cr.base.level}, vel. {cr.base.size} · SIL {sgn(cr.base.sil)} OBR {sgn(cr.base.obr)} ODO {sgn(cr.base.odo)}</span>
      </div>
      <div className="steps small tn" style={{ alignItems: 'center' }}>
        <span>Životy <b>{cr.hpCurrent}</b>/{max}</span>
        {[-5, -1, 1, 5].map((n) => <button key={n} className="btn" type="button" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => hp(cr.hpCurrent + n)}>{n > 0 ? `+${n}` : n}</button>)}
        <span>· ZO {zo ? <b title={zo.formula}>{zo.value}</b> : <span className="muted">podle bestiáře</span>}</span>
        <span>· obtížnost tvora {cr.difficulty}</span>
      </div>
      {attacks.length > 0 && (
        <ul className="small tn" style={{ margin: 0, paddingLeft: 18 }}>
          {attacks.map(({ p, a }) => <li key={p.uid}>{PART_LABEL[p.kind]} {p.type} ({p.source || '?'}): ÚČ <b>{a!.attack}</b>, útočnost {sgn(a!.damage)} <span className="muted">– {a!.formula}</span></li>)}
        </ul>
      )}
      {cr.parts.filter((p) => p.kind === 'special').map((p) => <div key={p.uid} className="small">speciální část: {p.type} ({p.source || '?'})</div>)}
      <input className="field small" style={{ width: '100%', height: 28, marginTop: 4 }} placeholder="Poznámky (schopnosti z orgánů, příkazy…)" value={cr.note} onChange={(e) => put(updateStitched(c, cr.uid, { note: e.target.value }))} aria-label="Poznámky k sešívanci" />
      <div className="steps" style={{ marginTop: 4 }}>
        {cr.alive && <button className="btn" type="button" onClick={onUpgrade}>Vylepšit…</button>}
        <button className="btn" type="button" onClick={() => put(removeStitched(c, cr.uid))}>Odebrat</button>
      </div>
    </div>
  );
}

function StitchBuilder({ c, d, put, say, creature, onClose }: { c: Character; d: Derived; put: Upd; say: (s: string) => void; creature: StitchedCreature | null; onClose: () => void }) {
  const { roll } = useDice();
  const [name, setName] = useState('');
  const [base, setBase] = useState<Base>(creature?.base ?? emptyBase());
  const [parts, setParts] = useState<StitchPart[]>([]);
  const [result, setResult] = useState<number | ''>('');
  const plan = planStitch(c, base, parts, creature);
  const bonus = surgeryBonus(c, d);
  const setB = (p: Partial<Base>) => setBase((b) => ({ ...b, ...p }));
  const setP = (u: string, p: Partial<StitchPart>) => setParts((l) => l.map((x) => (x.uid === u ? { ...x, ...p } : x)));
  const preview = { base, parts: [...(creature?.parts ?? []), ...parts] };
  const zo = stitchedDefense(preview);
  const r = typeof result === 'number' ? result : null;
  const missing = [plan.missing.base && 'základ (název a úroveň)', plan.missing.parts && 'nová část', plan.missing.mana && 'mana', plan.missing.materials && 'suroviny',
    plan.missing.crystal && 'kontrolní krystaly (potřebuješ 2)'].filter(Boolean);
  const go = (total: number) => {
    const x = stitch(c, base, parts, total, { name, creatureUid: creature?.uid });
    put(x.character);
    say(x.success ? `${creature ? 'Vylepšení' : 'Sešívanec'} se povedl (hod ${total} vs. ${plan.difficulty}).` : `Neúspěch (hod ${total} vs. ${plan.difficulty}) – tvor umírá.`);
    onClose();
  };
  return (
    <div className="al-proc">
      <b>{creature ? `Vylepšení: ${creature.name}` : 'Nový sešívanec'}</b>
      {!creature && <>
        <div className="md-form">
          <label className="kf"><span className="lbl">Jméno</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="volitelně" /></label>
          <label className="kf"><span className="lbl">Základní tělo (živý tvor)</span><input className="field" value={base.name} onChange={(e) => setB({ name: e.target.value })} placeholder="např. vlk" /></label>
          <label className="kf"><span className="lbl">Úroveň</span><input className="field num tn" type="number" min={1} value={base.level} onChange={(e) => setB({ level: int(e.target.value, 1) })} /></label>
          <label className="kf"><span className="lbl">Velikost</span><select className="field" value={base.size} onChange={(e) => setB({ size: e.target.value as Base['size'] })}>{SIZES.map((z) => <option key={z}>{z}</option>)}</select></label>
        </div>
        <div className="md-form">
          {(['sil', 'obr', 'odo'] as const).map((k) => (
            <label key={k} className="kf"><span className="lbl">{k.toUpperCase()} (oprava)</span><input className="field num tn" type="number" value={base[k]} onChange={(e) => setB({ [k]: int(e.target.value) } as Partial<Base>)} /></label>
          ))}
          <label className="kf"><span className="lbl">Pokrytí těla</span><select className="field" value={base.skin} onChange={(e) => setB({ skin: e.target.value })}>{SKIN_TYPES.map((z) => <option key={z}>{z}</option>)}</select></label>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Atributy a úroveň jako v bestiáři; neznámé určí PJ. Max. životy = 10 + (5 + ODO) × úroveň = <b>{stitchedHpMax(base)}</b>.</p>
      </>}
      <div className="steps">
        {(['limb', 'head', 'special', 'skin'] as const).map((k) => <button key={k} className="btn" type="button" onClick={() => setParts((l) => [...l, newPart(k)])}>+ {PART_LABEL[k]}</button>)}
      </div>
      {parts.map((p) => {
        const a = partAttack(base, p);
        const types = p.kind === 'limb' ? LIMB_TYPES : p.kind === 'head' ? HEAD_TYPES : p.kind === 'skin' ? SKIN_TYPES : null;
        return (
          <div className="md-part" key={p.uid}>
            <b className="small">{PART_LABEL[p.kind]}</b>
            {types ? <select className="field" value={p.type} onChange={(e) => setP(p.uid, { type: e.target.value })} aria-label="Typ části">{types.map((t) => <option key={t}>{t}</option>)}</select>
              : <input className="field" value={p.type} onChange={(e) => setP(p.uid, { type: e.target.value })} aria-label="Speciální část" placeholder="křídla, oči, žábry…" />}
            <input className="field" value={p.source} onChange={(e) => setP(p.uid, { source: e.target.value })} aria-label="Z jakého tvora" placeholder="z tvora…" />
            <label className="small">úr. <input className="field num tn" type="number" min={0} value={p.sourceLevel} onChange={(e) => setP(p.uid, { sourceLevel: int(e.target.value, 0) })} aria-label="Úroveň dárce" /></label>
            <span className="small tn">obt. <b>{partDifficulty(p)}</b>{a ? <> · ÚČ {a.attack}, útočnost {sgn(a.damage)}</> : p.kind === 'skin' ? ' · nová ZO' : ''}</span>
            <button className="icon-x" type="button" aria-label="Odebrat část" onClick={() => setParts((l) => l.filter((x) => x.uid !== p.uid))}>×</button>
          </div>
        );
      })}
      <p className="small tn" style={{ margin: 0 }}>
        Mana <b>{plan.mana}</b> · suroviny <b>{plan.materials}</b> · {plan.hours} h · obtížnost <b>{plan.difficulty}</b>
        {creature && <> (tvor {creature.difficulty} + nové části {plan.newDifficulty})</>}
        {zo && <> · ZO {zo.value} <span className="muted">({zo.formula})</span></>}
        <br />Končetina 2 + úr., hlava 5 + úr., speciální část 3 + úr., kůže = úroveň dárce (menší kůží nejde pokrýt většího tvora; křídla stejné nebo větší velikosti).
        {creature && <> Vylepšení stojí 100 many a 100 surovin za novou část (bez základu 300/100).</>}
      </p>
      <p className="small tn" style={{ margin: 0 }}>Hod: 1k10 {sgn(bonus.total)} <span className="muted">({bonus.parts.join(' + ')})</span> vs. {plan.difficulty} – mana a suroviny se odepíšou i při neúspěchu, tvor pak umírá.</p>
      {missing.length > 0 && <p className="small bad-t" style={{ margin: 0 }}>Chybí: {missing.join(', ')}</p>}
      <div className="steps" style={{ alignItems: 'center' }}>
        <button className="btn dark" type="button" disabled={!plan.ok} onClick={() => go(roll('k10', bonus.total, `Sešívanec – Chirurgie vs. ${plan.difficulty}`).total)}>⚄ Operovat</button>
        <label className="small">nebo výsledek <input className="field num tn" type="number" value={result} onChange={(e) => setResult(e.target.value === '' ? '' : Math.trunc(Number(e.target.value)))} aria-label="Výsledek hodu" /></label>
        <button className="btn" type="button" disabled={!plan.ok || r == null} onClick={() => r != null && go(r)}>Zapsat</button>
        <button className="btn" type="button" onClick={onClose}>Zrušit</button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Tabulky: končetiny, hlavy a typy kůže (PPP03 s. {STITCH.pages}).</p>
    </div>
  );
}
