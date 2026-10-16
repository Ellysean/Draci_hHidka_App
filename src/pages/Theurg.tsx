// Specializace THEURG na záložce Alchymie (PPP03 s. 163–190, fáze 7a+.3): Theurgova hůl s Astronem, bhůtové,
// esence, Astrální sféry (předměty s démony) a Poslové živlů (elementálové).
import { useState } from 'react';
import type { Character, SummonedElemental } from '../model/types';
import { alch, hasAbility } from '../rules/alchemy';
import { sgn, type Derived } from '../rules/derive';
import {
  THEURG, bhutRow, chargeStaff, craftStaff, demonLabel, dismissElemental, elementalDef, elementalStats, planDemons, separateEssences,
  setAstron, setStaffOwned, staffToWeapons, summonBhut, summonDemons, summonElemental, theurgState, theurgyBonus, updateElemental, useEssence,
  type EssenceKind,
} from '../rules/theurg';
import { useDice } from '../ui/Dice';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

type Upd = (next: Character) => void;
type P = { c: Character; d: Derived; put: Upd; say: (s: string) => void };
const int = (v: string, min = 0) => Math.max(min, Math.trunc(Number(v)) || 0);
const sm = { padding: '2px 7px', fontSize: 11 } as const;

// ---------------------------------------------------------------- hůl, bhůtové, esence

export function TheurgSheet({ c, d, put, say }: P) {
  const { roll } = useDice();
  const t = theurgState(c);
  const S = THEURG.staff;
  const bonus = theurgyBonus(c, d);
  const [charge, setCharge] = useState(100);
  const [astron, setAstronText] = useState('');
  const [bk, setBk] = useState(THEURG.bhuts.kinds[0].id);
  const [bst, setBst] = useState(1);
  const [ek, setEk] = useState<EssenceKind>('ohen');
  const [sep, setSep] = useState(10);
  const row = bhutRow(bst);
  const hasStaffWeapon = c.equipment.weapons.some((w) => w.custom?.name.startsWith('Theurgova hůl'));
  return (
    <Sheet>
      <div className="md">
        <div className="ribbon-row"><Ribbon icon="spark">THEURG</Ribbon><span className="small muted">{bonus.parts.join(' + ')}</span></div>
        <p className="small" style={{ margin: '0 0 8px' }}>Theurgie dává +5 k Lučbě při výrobě z oboru Hvězdné sestavy. Astroláb přidává bonus dílny i k Theurgii.</p>

        <b className="small">THEURGOVA HŮL</b>
        {!t.staff.owned ? (
          <>
            <p className="small" style={{ margin: '2px 0 4px' }}>{S.craftText}. Celkem {S.craftMana} many.</p>
            <div className="steps">
              <button className="btn dark" type="button" disabled={c.vitals.manaCurrent < S.craftMana} onClick={() => { const x = craftStaff(c); if (x.error) say(x.error); else put(x.character); }}>Vyrobit hůl (−{S.craftMana} many)</button>
              <button className="btn" type="button" onClick={() => put(setStaffOwned(c, true))}>Hůl už mám</button>
            </div>
          </>
        ) : (
          <>
            <p className="small tn" style={{ margin: '2px 0 4px' }}>
              Mana v holi <b>{t.staff.mana}</b>/{S.maxMana} · dobíjení {S.chargePerRound} many za kolo · v boji útočnost {S.attack}, zranění {S.damage}, obrana {S.defense}, dosah {S.reach}, +5 proti démonům a elementálům
            </p>
            <div className="steps small" style={{ alignItems: 'center' }}>
              <input className="field num tn" type="number" min={1} value={charge} onChange={(e) => setCharge(int(e.target.value, 1))} aria-label="Kolik many do hole" />
              <button className="btn" type="button" style={sm} onClick={() => { const x = chargeStaff(c, charge); if (x.rounds) { put(x.character); say(`Hůl dobita za ${x.rounds} kol.`); } }}>Dobít z many</button>
              {!hasStaffWeapon && <button className="btn" type="button" style={sm} onClick={() => { put(staffToWeapons(c)); say('Hůl je mezi zbraněmi (nenasazená).'); }}>Do zbraní</button>}
              <button className="btn" type="button" style={sm} onClick={() => put(setStaffOwned(c, false))}>Odebrat hůl</button>
            </div>
            <p className="small" style={{ margin: '6px 0 2px' }}><b>Astron:</b> {t.staff.astron || <span className="muted">prázdný</span>}</p>
            <div className="steps small" style={{ alignItems: 'center', marginBottom: 8 }}>
              {t.staff.astron
                ? <button className="btn" type="button" style={sm} onClick={() => put(setAstron(c, ''))}>Démona přenést do předmětu / propustit</button>
                : <><input className="field" value={astron} onChange={(e) => setAstronText(e.target.value)} placeholder="polapený démon (ručně)" aria-label="Démon v Astronu" style={{ flex: 1, minWidth: 140 }} />
                  <button className="btn" type="button" style={sm} disabled={!astron.trim()} onClick={() => { put(setAstron(c, astron.trim())); setAstronText(''); }}>Zapsat</button></>}
            </div>
          </>
        )}

        {hasAbility(c, 'ovladnuti_zivlu') && <>
          <b className="small">OVLÁDNUTÍ ŽIVLŮ – BHŮT</b>
          <div className="al-ws">
            <select className="field" value={bk} onChange={(e) => setBk(e.target.value)} aria-label="Bhůt">{THEURG.bhuts.kinds.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>
            <select className="field" value={bst} onChange={(e) => setBst(Number(e.target.value))} aria-label="Stupeň">{THEURG.bhuts.rows.map((r) => <option key={r.st} value={r.st}>{r.st}. stupeň</option>)}</select>
          </div>
          <p className="small tn" style={{ margin: '4px 0' }}>
            1k10 {sgn(bonus.total)} vs. <b>{row.dc}</b> · <b>{row.mana}</b> many z hole · formování 5 kol, pak {row.dur} · až {c.progression.level * 100} sáhů daleko<br />
            I. zóna {row.z1} sáhů: {row.d1 ?? '—'} · II. zóna {row.z2}: {row.d2 ?? '— (jen Vůle)'} · III. zóna {row.z3}: {row.d3 ?? '— (jen Vůle)'} <span className="muted">(životy na sáh²; bez poškození Vůle (INT) vs. {10 + bst}, jinak panika 1k10 kol)</span>
          </p>
          <div className="steps" style={{ marginBottom: 8 }}>
            <button className="btn dark" type="button" disabled={!t.staff.owned || t.staff.mana < row.mana} onClick={() => {
              const x = summonBhut(c, bk, bst, roll('k10', bonus.total, `Bhůt ${bst}. stupně`).total);
              if (x.error) say(x.error); else { put(x.character); say(x.success ? `Bhůt se formuje – za 5 kol plná síla na ${row.dur}.` : 'Sféra Sirael neodpověděla.'); }
            }}>⚄ Vyvolat</button>
            {!t.staff.owned && <span className="small muted">potřebuje hůl</span>}
          </div>
        </>}

        {hasAbility(c, 'prace_s_esencemi') && <>
          <b className="small">ESENCE</b>
          <p className="small tn" style={{ margin: '2px 0 4px' }}>
            {THEURG.essences.kinds.map((k) => <span key={k.id} style={{ marginRight: 10 }}>{k.name} ({k.color}) <b>{t.essences[k.id]}</b></span>)}
          </p>
          <div className="steps small" style={{ alignItems: 'center' }}>
            <input className="field num tn" type="number" min={1} value={sep} onChange={(e) => setSep(int(e.target.value, 1))} aria-label="Kolik many separovat" />
            <button className="btn" type="button" style={sm} onClick={() => { const x = separateEssences(c, sep); if (x.shifts) { put(x.character); say(`Separace ${x.shifts} směn: +${Math.min(sep, c.vitals.manaCurrent)} od každé esence.`); } }}>Separovat (1 mana → 4 esence)</button>
          </div>
          <div className="al-ws" style={{ marginTop: 4 }}>
            <select className="field" value={ek} onChange={(e) => setEk(e.target.value as EssenceKind)} aria-label="Esence">{THEURG.essences.kinds.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>
          </div>
          <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {THEURG.essences.effects[ek].map(([txt, n]) => (
              <li key={txt}>{txt} <b>[{n}]</b> <button className="btn" type="button" style={sm} disabled={t.essences[ek] < n} onClick={() => { const x = useEssence(c, ek, n, txt); if (x.error) say(x.error); else put(x.character); }}>Použít</button></li>
            ))}
          </ul>
          <p className="small muted" style={{ margin: '4px 0 0' }}>Účinek na konci kola, trvá 2k6 kol, tvorové do velikosti C, úspěch automatický (jako kouzelnický trik).</p>
        </>}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Astrální sféry

export function AstralniSferySheet({ c, d, put, say }: P) {
  const { roll } = useDice();
  const [pick, setPick] = useState<Record<string, string>>({});
  const [moment, setMoment] = useState('mesicni');
  const [x3, setX3] = useState(15);
  const [base, setBase] = useState('');
  const [target, setTarget] = useState<'item' | 'astron'>('item');
  const [result, setResult] = useState<number | ''>('');
  if (!hasAbility(c, 'astralni_sfery')) return null;
  const ids = Object.values(pick).filter(Boolean);
  const plan = planDemons(c, ids, moment, x3);
  const bonus = theurgyBonus(c, d);
  const t = theurgState(c);
  const spheres = [...new Map(THEURG.demons.map((r) => [r.sphere, r])).values()];
  const astronBusy = target === 'astron' && (!t.staff.owned || !!t.staff.astron);
  const go = (total: number) => {
    const x = summonDemons(c, ids, moment, base.trim(), target, total, x3);
    put(x.character);
    say(x.success ? `Démon polapen – životnost: ${x.lifespan}` : 'Démon unikl (nebo vnikl náhodný škůdce – PJ).');
    setResult('');
  };
  return (
    <Sheet>
      <div className="md">
        <div className="ribbon-row"><Ribbon icon="star">ASTRÁLNÍ SFÉRY</Ribbon><span className="small muted">předmět s démony</span></div>
        <div className="md-form">
          <label className="kf"><span className="lbl">Předmět (základ)</span><input className="field" value={base} onChange={(e) => setBase(e.target.value)} placeholder="meč, prsten, čelenka…" /></label>
          <label className="kf"><span className="lbl">Magický okamžik</span>
            <select className="field" value={moment} onChange={(e) => setMoment(e.target.value)}>{THEURG.moments.map((m) => <option key={m.id} value={m.id}>{m.name}{m.max ? ` – max. ${m.max}` : ''}</option>)}</select>
          </label>
          {moment === 'kombinace' && <label className="kf"><span className="lbl">Slabší okamžik X</span><input className="field num tn" type="number" value={x3} onChange={(e) => setX3(int(e.target.value))} /></label>}
          <label className="kf"><span className="lbl">Kam démona</span>
            <select className="field" value={target} onChange={(e) => setTarget(e.target.value as 'item' | 'astron')}><option value="item">do předmětu</option><option value="astron">do Astronu hole</option></select>
          </label>
        </div>
        <table className="grid small" style={{ marginTop: 6 }}>
          <thead><tr><th>Sféra (démon)</th><th>Úroveň</th><th className="c">Obt.</th><th className="c">Mana/sur.</th></tr></thead>
          <tbody>
            {spheres.map((sp) => {
              const rows = THEURG.demons.filter((r) => r.sphere === sp.sphere);
              const cur = rows.find((r) => r.id === pick[sp.sphere]);
              return (
                <tr key={sp.sphere}>
                  <td>{sp.sphere} <span className="muted">({sp.demon}{sp.cat === 'skudce' ? ', škůdce' : ''})</span></td>
                  <td>
                    <select className="field" style={{ height: 28, width: '100%' }} value={pick[sp.sphere] ?? ''} onChange={(e) => setPick((p) => ({ ...p, [sp.sphere]: e.target.value }))} aria-label={`Sféra ${sp.sphere}`}>
                      <option value="">—</option>
                      {rows.map((r) => <option key={r.id} value={r.id}>{['', 'I', 'II', 'III', 'IV', 'V'][r.level]}: {r.text}</option>)}
                    </select>
                  </td>
                  <td className="c tn">{cur ? sgn(cur.dc) : ''}</td>
                  <td className="c tn">{cur && cur.mana ? `${cur.mana}/${cur.materials}` : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="small tn" style={{ margin: '6px 0 0' }}>
          {plan.rows.length ? plan.rows.map(demonLabel).join(', ') : 'Vyber démony.'}<br />
          Obtížnost <b>{plan.difficulty}</b>{plan.momentMax != null && <> (okamžik max. {plan.momentMax})</>} · příprava <b>{plan.mana}</b> many a <b>{plan.materials}</b> surovin, {plan.hours} h · obřad 4 směny + 1 kolo ·
          pomocníci {plan.helperLevels} úr., škůdci {plan.pestLevels} úr.
        </p>
        <p className="small tn" style={{ margin: 0 }}>Hod: 1k10 {sgn(bonus.total)} <span className="muted">({bonus.parts.join(' + ')})</span> vs. {plan.difficulty}; rozdíl určí životnost. Mana a suroviny se odečtou i při neúspěchu.</p>
        {plan.errors.length > 0 && <p className="small bad-t" style={{ margin: 0 }}>Chybí / nelze: {plan.errors.join(' · ')}</p>}
        {astronBusy && <p className="small bad-t" style={{ margin: 0 }}>{t.staff.owned ? 'Astron už drží démona – jen jeden najednou.' : 'Astron je v holi – nejdřív hůl.'}</p>}
        <div className="steps" style={{ alignItems: 'center', marginTop: 4 }}>
          <button className="btn dark" type="button" disabled={!plan.ok || astronBusy} onClick={() => go(roll('k10', bonus.total, `Astrální sféry – Theurgie vs. ${plan.difficulty}`).total)}>⚄ Otevřít trhlinu</button>
          <label className="small">nebo výsledek <input className="field num tn" type="number" value={result} onChange={(e) => setResult(e.target.value === '' ? '' : Math.trunc(Number(e.target.value)))} aria-label="Výsledek hodu" /></label>
          <button className="btn" type="button" disabled={!plan.ok || astronBusy || result === ''} onClick={() => result !== '' && go(result)}>Zapsat</button>
          <button className="btn" type="button" onClick={() => setPick({})}>Vyčistit</button>
        </div>
        <details className="help-d" style={{ marginTop: 6 }}>
          <summary>ŽIVOTNOST DÉMONŮ</summary>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{THEURG.lifespan.map((l) => <li key={l.min}>rozdíl {l.min}{l.max == null ? '+' : l.max !== l.min ? `–${l.max}` : ''}: {l.text}</li>)}</ul>
        </details>
        <p className="small muted" style={{ margin: '4px 0 0' }}>{alch(c).crafted.filter((x) => x.demons).length} předmětů s démony ve Výrobcích.</p>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Poslové živlů

export function PosloveSheet({ c, d, put, say }: P) {
  const { roll } = useDice();
  const [kind, setKind] = useState<SummonedElemental['kind']>('igni');
  const [grade, setGrade] = useState(1);
  if (!hasAbility(c, 'poslove_zivlu')) return null;
  const t = theurgState(c);
  const e = elementalDef(kind);
  const st = elementalStats(e, grade);
  const bonus = theurgyBonus(c, d);
  return (
    <Sheet>
      <div className="md">
        <div className="ribbon-row"><Ribbon icon="leaf">POSLOVÉ ŽIVLŮ</Ribbon><span className="small muted">mana v holi {t.staff.mana}</span></div>
        {t.elementals.map((el) => {
          const def = elementalDef(el.kind);
          const s = elementalStats(def, el.grade);
          return (
            <div key={el.uid} className="al-proc" style={{ marginTop: 0, marginBottom: 8 }}>
              <div className="steps" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <b>{def.name}, {el.grade}. stupeň</b>
                <span className="small tn">vydrží {s.days} {s.days === 1 ? 'den' : s.days < 5 ? 'dny' : 'dní'} od {new Date(el.summonedAt).toLocaleDateString('cs')}</span>
              </div>
              <div className="steps small tn" style={{ alignItems: 'center' }}>
                <span>ÚČ {s.attack} · ZO {s.zo} · OČ {s.oc} · životy <b>{el.hpCurrent}</b>/{s.hp}</span>
                {[-5, -1, 1, 5].map((n) => <button key={n} className="btn" type="button" style={sm} onClick={() => put(updateElemental(c, el.uid, { hpCurrent: Math.max(0, Math.min(s.hp, el.hpCurrent + n)) }))}>{n > 0 ? `+${n}` : n}</button>)}
              </div>
              <input className="field small" style={{ width: '100%', height: 28, marginTop: 4 }} placeholder="Příkazy, poznámky…" value={el.note} onChange={(ev) => put(updateElemental(c, el.uid, { note: ev.target.value }))} aria-label="Poznámky k elementálovi" />
              <div className="steps" style={{ marginTop: 4 }}><button className="btn" type="button" onClick={() => put(dismissElemental(c, el.uid))}>Propustit</button></div>
            </div>
          );
        })}
        <div className="al-ws">
          <select className="field" value={kind} onChange={(ev) => setKind(ev.target.value as SummonedElemental['kind'])} aria-label="Elementál">{THEURG.elementals.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <label className="small al-here">stupeň <input className="field num tn" type="number" min={1} value={grade} onChange={(ev) => setGrade(int(ev.target.value, 1))} /></label>
        </div>
        <p className="small tn" style={{ margin: '4px 0' }}>
          Mana z hole <b>{st.mana}</b> · obtížnost <b>{st.dc}</b> · úroveň {st.level} · životy {st.hp} · velikost {st.size} · pohyblivost {e.mobility}<br />
          ÚČ {st.attack} · ZO {st.zo} · OČ {st.oc} · {e.attrs}<br />
          <b>Imunita:</b> {e.immune} · <b>Slabina:</b> {e.weak}
        </p>
        <ul className="small" style={{ margin: '0 0 4px', paddingLeft: 18 }}>{e.abilities.map((a) => <li key={a}>{a}</li>)}</ul>
        <div className="steps" style={{ alignItems: 'center' }}>
          <button className="btn dark" type="button" disabled={!t.staff.owned || t.staff.mana < st.mana} onClick={() => {
            const x = summonElemental(c, kind, grade, roll('k10', bonus.total, `${e.name} – Theurgie vs. ${st.dc}`).total);
            if (x.error) say(x.error); else { put(x.character); say(x.success ? `${e.name} přišel a čeká na příkazy.` : 'Sféra Sirael neodpověděla.'); }
          }}>⚄ Přivolat</button>
          <span className="small muted">vzorek živlu + úder holí; hodnoty: tabulka platí pro 1. stupeň, přírůstek za každý další</span>
        </div>
      </div>
    </Sheet>
  );
}
