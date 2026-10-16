// Záložka VÍRA – klerik (7d): Přízeň a pravidelné modlitby, Zvolání, Svěcení, bůh, teologické nauky, schopnosti
// a specializace (H13 + PPP06) s ovládáním (Bohoslužby, Flagelantství, Ikony, Sakrální předměty, Oběti, Avatar, Zázraky),
// prosby a léky s plným zněním a vzývání mimo boj. V boji se prosby vzývají na záložce Boj a stavy.
import { useEffect, useMemo, useState } from 'react';
import type { Character } from '../model/types';
import { castBonus, record } from '../rules/combat';
import { sgn, type Derived } from '../rules/derive';
import {
  CLERIC, PRAYERS, activePrayers, callWhy, clericNotes, clericOwned, cle, darZivota, groupLabel, knownPrayers, prayWhy,
  prayerCheckBonus, prayerDc, prayerGain, prayerLock, prayerPrice, unitsOf, type Prayer,
} from '../rules/klerik';
import {
  addIcon, avatarEnd, avatarMonthOver, avatarStart, blessing, brewAdd, brewPay, brewWhy, consecrate, dismissMessenger, flagellation, grantFavor,
  healSelf, makeSacral, miracle, missPrayer, newDay, offering, outsideWhy, pray, prayOutside, removeActive, removeIcon, rollDamage, rollHeal,
  sacralWhy, service, setCleric, useSacral,
} from '../rules/klerik-akce';
import { progressionName } from '../progression/levelup';
import { ClericCastOptions } from './KlerikBoj';
import { useStore } from '../state/store';
import { useDice } from '../ui/Dice';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

type Put = (next: Character) => void;
interface P { c: Character; d: Derived; put: Put; say: (m: string) => void }

export function Klerik() {
  const { character: c, derived: d, dispatch } = useStore();
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 5000); return () => clearTimeout(t); }, [msg]);
  const put: Put = (next) => dispatch({ type: 'update', fn: () => next });
  return (
    <div className="stack va-page">
      <div className="vy-head"><h1 className="pg">VÍRA{c.basic.deity ? ` – ${c.basic.deity.toUpperCase()}` : ''}</h1></div>
      {msg && <div className="toast" role="status">{msg}</div>}
      <div className="cols">
        <div className="stack">
          <Prizen c={c} d={d} put={put} say={setMsg} />
          <Nauky c={c} />
        </div>
        <div className="stack">
          <Schopnosti c={c} d={d} put={put} say={setMsg} />
        </div>
      </div>
      <Prosby c={c} d={d} put={put} say={setMsg} />
    </div>
  );
}

// ---------------------------------------------------------------- Přízeň, modlitby, Zvolání, Svěcení

function Prizen({ c, d, put, say }: P) {
  const S = cle(c);
  const cur = c.vitals.manaCurrent;
  const max = d.manaMax.value;
  const pw = prayWhy(c, max);
  const gain = prayerGain(c, max);
  const cw = callWhy(c);
  const [favor, setFavor] = useState(5);
  const [item, setItem] = useState('');
  const adj = (delta: number) => put(record(c, `Přízeň ${sgn(delta)}`, (x) => ({ ...x, vitals: { ...x.vitals, manaCurrent: Math.max(0, x.vitals.manaCurrent + delta) } })));
  const act = activePrayers(c);
  return (
    <Sheet>
      <Ribbon icon="sun">PŘÍZEŇ</Ribbon>
      <div className="va-adr">
        <div className="al-res">
          <span className="lbl">Přízeň</span>
          <b className="al-big tn">{cur}<small className="muted"> / {max ?? '?'}</small></b>
          <div className="al-adj">
            <button className="btn" type="button" onClick={() => adj(-1)} disabled={cur < 1} aria-label="Přízeň −1">−1</button>
            <button className="btn" type="button" onClick={() => adj(1)} aria-label="Přízeň +1">+1</button>
          </div>
        </div>
        <div className="small">
          <p style={{ margin: '0 0 4px' }}>{CLERIC.pravidla.modlitby}</p>
          <div className="steps">
            <button className="btn dark" type="button" disabled={!!pw || gain < 1} title={pw || (gain < 1 ? 'Přízeň je plná' : undefined)}
              onClick={() => { put(pray(c, d)); say(`Modlitba: Přízeň +${gain}`); }}>Modlitba +{gain} ({S.prayersToday}/3)</button>
            <button className="btn" type="button" onClick={() => put(missPrayer(c))}>Vynechaná modlitba</button>
            <button className="btn" type="button" onClick={() => { put(newDay(c)); say('Nový den'); }}>Nový den</button>
          </div>
          {S.missedPrayers > 0 && <p className="small bad-t" style={{ margin: '4px 0 0' }}>Vynechané modlitby: {S.missedPrayers} – {S.missedPrayers > 1 ? 'hrozí ztráta náklonnosti boha (PJ).' : 'bůh varuje.'}</p>}
          {S.avatar?.drained && <p className="small bad-t" style={{ margin: '4px 0 0' }}>Po Avatarovi se Přízeň měsíc nedoplňuje. <button className="linkbtn" type="button" onClick={() => put(avatarMonthOver(c))}>Měsíc uplynul</button></p>}
        </div>
      </div>
      <dl className="va-dl small" style={{ marginTop: 8 }}>
        <dt>Zvolání</dt>
        <dd>{cw ? 'Na této úrovni už použito.' : 'K dispozici (1× za úroveň).'} {CLERIC.pravidla.zvolani} <span className="muted">Použij v panelu Klerik v boji nebo zapiš ručně v záznamu.</span></dd>
        <dt>Zvláštní Přízeň</dt>
        <dd>
          <span className="steps">
            <input className="field num tn" type="number" min={1} value={favor} onChange={(e) => setFavor(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} aria-label="Zvláštní Přízeň od PJ" />
            <button className="btn" type="button" onClick={() => put(grantFavor(c, favor))}>+{favor} od PJ (i nad maximum)</button>
          </span>
        </dd>
        <dt>{CLERIC.sveceni.nazev}</dt>
        <dd>
          {CLERIC.sveceni.text}
          <span className="steps">
            <button className="btn" type="button" disabled={cur < 1} onClick={() => { put(consecrate(c, 'voda')); say('5 flakónů svěcené vody ve výbavě'); }}>Voda (5 flakónů) −1</button>
            <input className="field" value={item} placeholder="zbraň / předmět" onChange={(e) => setItem(e.target.value)} aria-label="Posvětit předmět" />
            <button className="btn" type="button" disabled={cur < 1} onClick={() => put(consecrate(c, 'predmet', item))}>Posvětit −1</button>
          </span>
        </dd>
        {act.length > 0 && (
          <>
            <dt>Působí</dt>
            <dd>{act.map((a) => (
              <span key={a.uid} className="small" style={{ display: 'block' }}>{a.name}{a.zo ? ` · ZO +${a.zo}` : ''}{a.atk ? ` · ÚČ +${a.atk}` : ''}{a.note ? ` · ${a.note}` : ''}{' '}
                <button type="button" className="fpop-x" aria-label={`Ukončit ${a.name}`} onClick={() => put(removeActive(c, a.uid))}>×</button></span>
            ))}</dd>
          </>
        )}
        {S.messenger && (
          <>
            <dt>Posel</dt>
            <dd>{S.messenger.name} – životy {S.messenger.hp}/{S.messenger.hpMax}, ZO {S.messenger.zo}, OČ {S.messenger.oc}{S.messenger.uc != null ? `, ÚČ ${S.messenger.uc}/+${S.messenger.dmg ?? 0}` : ''}{' '}
              <button className="linkbtn" type="button" onClick={() => put(dismissMessenger(c))}>odvolat</button></dd>
          </>
        )}
      </dl>
    </Sheet>
  );
}

// ---------------------------------------------------------------- nauky

function Nauky({ c }: { c: Character }) {
  const own = new Set(c.progression.learnedBranches);
  return (
    <Sheet>
      <Ribbon icon="book">TEOLOGICKÉ NAUKY</Ribbon>
      <ul className="ab-list va-list">
        {CLERIC.nauky.map((n) => (
          <li key={n.id} className={own.has(n.id) ? '' : 'va-off'}>
            <span className="va-name">{own.has(n.id) ? '✓ ' : ''}{n.nazev}</span>
            <span className="va-txt">{n.efekt} Prosby: {n.prosby.join(', ')}.</span>
          </li>
        ))}
      </ul>
      <p className="small muted" style={{ margin: '6px 0 0' }}>Nauka se volí při přestupu místo schopnosti a dá všechny své 4 prosby hned (H13). Bonusy nauk se počítají v deníku samy (ÚČ, První pomoc, Vůle).</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- schopnosti a specializace

function Schopnosti({ c, d, put, say }: P) {
  const S = cle(c);
  const spec = c.progression.specialization;
  const sp = spec ? CLERIC.specializace[spec] : null;
  const ids = [...new Set(c.progression.learnedAbilities.map((a) => a.id))];
  const notes = clericNotes(c);
  const known = knownPrayers(c).filter((p) => p.typ === 'prosba');
  const [people, setPeople] = useState(3);
  const [iconP, setIconP] = useState('');
  const [sacP, setSacP] = useState('');
  const [what, setWhat] = useState('');
  const sw = sacralWhy(c, d);
  const melee = c.equipment.weapons;
  return (
    <Sheet>
      <Ribbon icon="star">SCHOPNOSTI</Ribbon>
      <dl className="va-dl small">
        <dt>Spojení s bohem</dt><dd>Prosby (CHAR) na 3. stupni; 5 základních proseb, od 2. úrovně 6 obecných proseb vyšší úrovně.</dd>
        <dt>Svěcení</dt><dd>Rituál za 1 Přízeň (viz Přízeň).</dd>
        {darZivota(c) && <><dt>{CLERIC.darZivota.nazev} (6. úr.)</dt><dd>{CLERIC.darZivota.efekt} <span className="pill ok">AUTOMATICKY</span></dd></>}
        {sp && (
          <>
            <dt>{sp.name} (specializace)</dt><dd>{sp.intro} <span className="muted">PPP06 s. {sp.page}</span></dd>
            {sp.auto.map((a) => <div key={a.id} style={{ display: 'contents' }}><dt>{a.name}</dt><dd>{a.text} <span className="pill ok">AUTOMATICKY</span></dd></div>)}
          </>
        )}
        {ids.map((id) => {
          const a = CLERIC.schopnosti[id];
          return (
            <div key={id} style={{ display: 'contents' }}>
              <dt>{a?.name ?? progressionName('klerik', id)}</dt>
              <dd>
                {a?.text ?? ''}{a?.source === 'PPP06' ? <span className="muted"> (PPP06 s. {a.page})</span> : null}
                {id === 'posvatny_symbol' && (
                  <label className="chk" style={{ display: 'block' }}><input type="checkbox" checked={S.symbolInHand} onChange={(e) => put(setCleric(c, { symbolInHand: e.target.checked }))} /> Symbol držím v ruce (+{c.progression.level >= 6 ? 3 : 2} k Prosbám)</label>
                )}
                {id === 'ritualy_a_obrady' && (
                  <label className="chk" style={{ display: 'block' }}><input type="checkbox" checked={S.ritualToday} onChange={(e) => put(setCleric(c, { ritualToday: e.target.checked }))} /> Obřad dnes proveden (+3 k Prosbám na 1 den)</label>
                )}
                {id === 'asketismus' && (
                  <label className="chk" style={{ display: 'block' }}><input type="checkbox" checked={S.vowKept} onChange={(e) => put(setCleric(c, { vowKept: e.target.checked }))} /> Slib chudoby dodržen (maximum Přízně ×2)</label>
                )}
                {id === 'bozi_zbroj' && (
                  <label className="chk" style={{ display: 'block' }}><input type="checkbox" checked={S.divineArmor} onChange={(e) => put(setCleric(c, { divineArmor: e.target.checked }))} /> Nošená zbroj je Boží zbroj (+1 kvalita v ZO)</label>
                )}
                {id === 'posvatna_zbran' && (
                  <span className="steps"><select className="field" value={S.holyWeaponUid ?? ''} onChange={(e) => put(setCleric(c, { holyWeaponUid: e.target.value || null }))} aria-label="Posvátná zbraň">
                    <option value="">– zvol zbraň –</option>
                    {melee.map((w) => <option key={w.uid} value={w.uid}>{d.weapons.find((x) => x.uid === w.uid)?.name ?? w.uid}</option>)}
                  </select></span>
                )}
                {id === 'bohosluzby' && (
                  <span className="steps">
                    <input className="field num tn" type="number" min={1} value={people} onChange={(e) => setPeople(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} aria-label="Počet účastníků" />
                    <button className="btn" type="button" disabled={S.serviceToday} title={S.serviceToday ? 'dnes už proběhly' : undefined} onClick={() => { put(service(c, d, people)); say('Bohoslužby – účastníci +3 k Vůli na 24 h'); }}>Bohoslužby</button>
                  </span>
                )}
                {id === 'flagelantstvi' && <span className="steps"><button className="btn wine" type="button" onClick={() => put(flagellation(c))}>Flagelantství – životy na 1, Zvolání znovu</button></span>}
                {id === 'pozehnani' && <span className="steps"><button className="btn" type="button" disabled={S.blessingUsed} onClick={() => put(blessing(c))}>{S.blessingUsed ? 'Dnes už použito' : 'Použít Požehnání'}</button></span>}
                {id === 'obeti' && (
                  <span className="steps">
                    <input className="field" value={what} placeholder="co obětuje" onChange={(e) => setWhat(e.target.value)} aria-label="Oběť" />
                    <button className="btn" type="button" disabled={S.offering} onClick={() => put(offering(c, what))}>{S.offering ? 'Oběť připravena (−10)' : 'Obětovat'}</button>
                  </span>
                )}
                {id === 'ikony' && (
                  <span style={{ display: 'block' }}>
                    {S.icons.map((x) => <span key={x.uid} className="small" style={{ display: 'block' }}>Ikona: {x.prayer} <button type="button" className="fpop-x" aria-label={`Odebrat ikonu ${x.prayer}`} onClick={() => put(removeIcon(c, x.uid))}>×</button></span>)}
                    <span className="steps">
                      <select className="field" value={iconP} onChange={(e) => setIconP(e.target.value)} aria-label="Prosba ikony"><option value="">– prosba –</option>{known.map((p) => <option key={p.id}>{p.nazev}</option>)}</select>
                      <button className="btn" type="button" disabled={!iconP} onClick={() => put(addIcon(c, iconP))}>Vyrobit ikonu (−10 max.)</button>
                    </span>
                  </span>
                )}
                {id === 'sakralni_predmety' && (
                  <span style={{ display: 'block' }}>
                    {S.sacral.map((x) => <span key={x.uid} className="small" style={{ display: 'block' }}>Sakrální předmět: {x.prayer} <button className="linkbtn" type="button" onClick={() => put(useSacral(c, x.uid))}>použit</button></span>)}
                    <span className="steps">
                      <select className="field" value={sacP} onChange={(e) => setSacP(e.target.value)} aria-label="Prosba předmětu"><option value="">– prosba –</option>{known.map((p) => <option key={p.id}>{p.nazev}</option>)}</select>
                      <button className="btn" type="button" disabled={!sacP || !!sw} title={sw || undefined} onClick={() => put(makeSacral(c, d, sacP))}>Zasvětit ({S.sacral.length}/{c.progression.level})</button>
                    </span>
                  </span>
                )}
                {id === 'avatar' && (
                  <span className="steps">
                    {S.avatar?.active
                      ? <button className="btn wine" type="button" onClick={() => put(avatarEnd(c))}>Ukončit Avatara{S.avatar.until != null ? ` (do ${S.avatar.until}. kola)` : ''}</button>
                      : <button className="btn wine" type="button" onClick={() => { put(avatarStart(c)); say('Avatar: Přízeň → 0'); }}>Proměna v Avatara</button>}
                  </span>
                )}
                {id === 'zazraky' && (
                  <span className="steps">
                    <button className="btn wine" type="button" onClick={() => { const r = miracle(c, ''); put(r.character); say(`Zázrak: −${r.hp} životů`); }}>Zázrak (−1k6 životů)</button>
                    {S.miracleHp > 0 && <span className="small muted">čas vrátí ještě {S.miracleHp} (1 za den)</span>}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {ids.length === 0 && !sp && <p className="small muted" style={{ margin: '6px 0 0' }}>Nauky a volitelné schopnosti se berou při přestupu (od 2. úrovně), od 6. úrovně i pokročilé z PPP06 a specializace Bojový mnich, Exorcista a Kněz (stačí 2 ze 3 podmínek).</p>}
      {notes.length > 0 && (
        <>
          <h3 className="lbl" style={{ margin: '10px 0 4px', color: 'var(--ink)' }}>Podle situace (appka nepočítá sama)</h3>
          <ul className="small va-notes">{notes.map((n) => <li key={n.source}><b>{n.source}:</b> {n.text}</li>)}</ul>
        </>
      )}
      <p className="small muted" style={{ margin: '8px 0 0' }}>Boží bojovník, nauky, Osvícení, Požehnané zdraví, Výcvik lazaretních léčitelů, Paladinský výcvik, Boj zblízka, Posvátná zbraň, Boží zbroj, Asketismus a Ikony se počítají v deníku samy; Fanatismus a Inkvizitorský výcvik hlídá boj.</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- prosby a léky

type Filter = 'known' | 'all';

function Prosby({ c, d, put, say }: P) {
  const { roll } = useDice();
  const [flt, setFlt] = useState<Filter>('known');
  const [grp, setGrp] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [units, setUnits] = useState<Record<string, number>>({});
  const [alt, setAlt] = useState<Record<string, boolean>>({});
  const [after, setAfter] = useState<{ id: string; heal?: number } | null>(null);
  const known = useMemo(() => new Set(knownPrayers(c).map((p) => p.id)), [c]);
  const own = useMemo(() => clericOwned(c), [c]);
  const cast = castBonus(c, d);
  const zp = d.skills.find((s) => s.id === 'znalost_prirody');
  const pool = flt === 'known' ? PRAYERS.filter((p) => known.has(p.id)) : PRAYERS;
  const groups = [...new Set(pool.map((p) => p.skupina))];
  const list = pool.filter((p) => (!grp || p.skupina === grp) && (!q || `${p.nazev} ${p.popis} ${p.temna ?? ''}`.toLowerCase().includes(q.toLowerCase())));
  const inCombat = !!c.play.combat;
  const chk = prayerCheckBonus(c);
  const doPray = (p: Prayer, u: number) => {
    const r = prayOutside(c, d, p, u, cast.bonus, !!alt[p.id]);
    if (!r) return;
    put(r.character);
    roll('k10', r.bonus, `${p.nazev} – Prosby vs. ${r.dc ?? p.obtiznost.text}${r.dcList.length > 1 ? ` (${r.dcList.join(' / ')})` : ''} (musí být vyšší)${r.parts.length ? ` · ${r.parts.join(', ')}` : ''}`);
    if (p.fx?.heal || p.fx?.damage) setAfter({ id: p.id });
  };
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="book">PROSBY</Ribbon><span className="small tn">zná {known.size} · Přízeň {c.vitals.manaCurrent} · Prosby {sgn(cast.bonus + chk.bonus)}</span></div>
      <div className="chips">
        {([['known', `Známé (${known.size})`], ['all', `Všechny (${PRAYERS.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={flt === k} onClick={() => { setFlt(k); setGrp(null); }}>{l}</button>
        ))}
        <span style={{ width: 8 }} />
        {groups.map((g) => (
          <button key={g} type="button" className="chip" aria-pressed={grp === g} onClick={() => setGrp(grp === g ? null : g)}>{groupLabel(g)}</button>
        ))}
      </div>
      <ClericCastOptions c={c} replace={put} />
      <div className="al-ws" style={{ marginTop: 8 }}>
        <input className="field" type="search" placeholder="Hledat prosbu…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Hledat prosbu" />
      </div>
      {inCombat && <p className="small" style={{ margin: '6px 0 0' }}>Probíhá boj – prosby s hlídáním akcí vzývej na záložce Boj a stavy.</p>}
      <div className="al-list">
        {list.length === 0 && <p className="small muted">Nic neodpovídá filtru.</p>}
        {list.map((p) => {
          const lock = prayerLock(c, p, c.progression.level, own);
          const kn = !lock;
          const un = unitsOf(p);
          const u = Math.max(un?.min ?? 1, units[p.id] ?? Math.max(1, un?.min ?? 1));
          const price = p.typ === 'lek' ? p.cena.base : prayerPrice(c, p, u, cle(c).mods, !!alt[p.id]).total;
          const dc = p.typ === 'lek' ? null : prayerDc(c, p, u).dc;
          const why = p.typ === 'lek' ? brewWhy(c, p) : inCombat ? 'v boji na záložce Boj' : outsideWhy(c, p, u, !!alt[p.id]);
          const fx = after?.id === p.id ? p : null;
          return (
            <div key={p.id} className="recipe">
              <div>
                <h4><button type="button" className="linkbtn al-name" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>{p.nazev}</button>
                  {p.typ === 'lek' && <> <span className="pill">LÉK</span></>}
                  {p.temna && <> <span className="pill">TEMNÁ ALT.</span></>}
                  {kn ? <> <span className="pill ok">UMÍ</span></> : <> <span className="pill">{lock.toUpperCase()}</span></>}
                </h4>
                <div className="meta">{groupLabel(p.skupina)} · {p.zdroj} s. {p.strana} · <b>{p.cena.text}</b> Přízně{p.typ === 'lek' ? '' : ` → ${price}`} · obtížnost {p.obtiznost.text}{dc != null && dc !== p.obtiznost.base ? ` → ${dc}` : ''} · {p.typ === 'lek' ? `výroba ${p.vyroba}` : p.vyvolani.text}</div>
              </div>
              {kn && (
                <div className="al-ws" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                  {un && p.typ !== 'lek' && <input className="field num tn sp-cost" style={{ minWidth: 0 }} type="number" min={un.min} value={u} title={un.label} aria-label={`${un.label} – ${p.nazev}`} onChange={(e) => setUnits((x) => ({ ...x, [p.id]: Math.max(un.min, Math.trunc(Number(e.target.value)) || un.min) }))} />}
                  {p.cena.alt != null && p.typ !== 'lek' && (
                    <label className="chk small"><input type="checkbox" checked={!!alt[p.id]} onChange={(e) => setAlt((x) => ({ ...x, [p.id]: e.target.checked }))} /> {p.cena.alt === 0 ? 'bez Přízně' : `za ${p.cena.alt}`}</label>
                  )}
                  {p.typ === 'lek'
                    ? <button className="btn dark" type="button" disabled={!!why} title={why || undefined} onClick={() => { put(brewPay(c, p)); setAfter({ id: p.id }); roll('k10', zp?.total ?? 0, `${p.nazev} – Znalost přírody vs. ${p.obtiznost.text}`); }}>Vyrobit ⚄</button>
                    : <button className="btn dark" type="button" disabled={!!why} title={why || undefined} onClick={() => doPray(p, u)}>Vzývat ⚄</button>}
                </div>
              )}
              {fx && (
                <div className="al-ws" style={{ justifyContent: 'flex-end' }}>
                  {p.typ === 'lek' && <button className="btn" type="button" onClick={() => { put(brewAdd(c, p)); setAfter(null); say(`${p.nazev} ve výbavě`); }}>Povedlo se → do výbavy</button>}
                  {p.typ !== 'lek' && p.fx?.heal && after?.heal == null && <button className="btn" type="button" onClick={() => { const r = rollHeal(c, p, u)!; setAfter({ id: p.id, heal: r.total }); say(`${p.nazev}: léčí ${r.total} (${r.faces.join('+')}${r.bonus ? ` + ${r.bonus} Dar života` : ''})`); }}>⚄ Léčení {p.fx.heal}{p.fx.perUnit ? ` × ${u}` : ''}</button>}
                  {after?.heal != null && <button className="btn" type="button" onClick={() => { put(healSelf(c, d, after.heal!, p.nazev)); setAfter(null); }}>Na sebe +{after.heal}</button>}
                  {p.fx?.damage && <button className="btn" type="button" onClick={() => { const r = rollDamage(p, u)!; say(`${p.nazev}: zranění ${r.total} (${r.faces.join('+')})`); setAfter(null); }}>⚄ Zranění {p.fx.damage}{p.fx.perUnit ? ` × ${u}` : ''}</button>}
                  <button className="linkbtn" type="button" onClick={() => setAfter(null)}>hotovo</button>
                </div>
              )}
              {open === p.id && (
                <div className="al-detail">
                  <dl>
                    <dt>PŘÍZEŇ</dt><dd>{p.cena.text}</dd>
                    {p.dosah && <><dt>DOSAH</dt><dd>{p.dosah}</dd></>}
                    {p.rozsah && <><dt>ROZSAH</dt><dd>{p.rozsah}</dd></>}
                    {p.trvani && <><dt>TRVÁNÍ</dt><dd>{p.trvani}</dd></>}
                    <dt>{p.typ === 'lek' ? 'VÝROBA' : 'VZÝVÁNÍ'}</dt><dd>{p.typ === 'lek' ? p.vyroba : p.vyvolani.text}</dd>
                    {p.overeni && <><dt>OVĚŘENÍ</dt><dd>{p.overeni}</dd></>}
                    <dt>OBTÍŽNOST</dt><dd>{p.obtiznost.text}</dd>
                    {p.zaklad && <><dt>ZÁKLAD</dt><dd>{p.zaklad}</dd></>}
                    {p.pouziti && <><dt>POUŽITÍ</dt><dd>{p.pouziti}</dd></>}
                    {p.cetnost && <><dt>ČETNOST</dt><dd>{p.cetnost}</dd></>}
                    {p.pocet && <><dt>POČET</dt><dd>{p.pocet}</dd></>}
                    {p.stitky.length > 0 && <><dt>ŠTÍTKY</dt><dd>{p.stitky.join(', ')}</dd></>}
                  </dl>
                  {p.popis.split('\n').map((para, i) => <p key={i} style={{ margin: '4px 0' }}>{para}</p>)}
                  {p.temna && <p style={{ margin: '6px 0 0' }}><b>Temná alternativa:</b> {p.temna}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="small muted" style={{ margin: '8px 0 0' }}>
        Klerik si prosby nevybírá – dostane je automaticky (základní, od 2. úrovně obecné, nauky a schopnosti PPP06). Vzývat odečte Přízeň a hodí k10 + Prosby; výsledek musí být VYŠŠÍ než obtížnost.
        Proměnnou cenu (slova, údery, kola, X) zadej do políčka. Volby vzývání (souvěrec, bez odříkání, posvátné místo…) nad seznamem platí i v boji.
      </p>
    </Sheet>
  );
}
