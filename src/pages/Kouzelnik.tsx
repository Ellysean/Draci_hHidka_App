// Záložka KOUZELNÍK (7c.2): mana (meditace, nasátí, Rituál krve, triky), hůl a její varianty, aktivní kouzla, obory,
// schopnosti a specializace, volby sesílání (Rychlé, Precizní, bez řeči / gest…) a kouzla H11 + PPP04 s plným zněním,
// filtrem podle oborů a sesíláním mimo boj. V boji se kouzla sesílají na záložce Boj a stavy.
import { useEffect, useMemo, useState } from 'react';
import type { Character, WizardCastMods } from '../model/types';
import { castBonus, record } from '../rules/combat';
import { sgn, type Derived } from '../rules/derive';
import type { MagicSpell } from '../rules/hranicar';
import {
  OBOR_NAME, WIZ, WIZARD_SPELLS, bloodWhy, castProfile, drawFixed, drawWhy, hasAbility, knownWizardSpells, learnLock, lifeCapacity, manaCap,
  meditateWhy, spellBranch, spellGroup, staffCapacity, staffKinds, staffOf, staffVariant, staffWhy, swapsLeft, wiz, wizardCtx, wizardNotes,
  type StaffKind,
} from '../rules/kouzelnik';
import {
  TECHNIQUES, addActive, bloodRitual, castOutside, castTrick, drawMana, loseStaff, makeStaff, meditate, newDay, outsideWhy, releaseLife,
  removeActive, setMods, setStaffHand, storeLife, storeMana, swapSpell, swapWhy, technique,
} from '../rules/kouzelnik-akce';
import { progressionName } from '../progression/levelup';
import { useStore } from '../state/store';
import { useDice } from '../ui/Dice';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

type Put = (next: Character) => void;
interface P { c: Character; d: Derived; put: Put; say: (m: string) => void }

export function Kouzelnik() {
  const { character: c, derived: d, dispatch } = useStore();
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 4000); return () => clearTimeout(t); }, [msg]);
  const put: Put = (next) => dispatch({ type: 'update', fn: () => next });
  return (
    <div className="stack va-page">
      <div className="vy-head"><h1 className="pg">KOUZELNÍK</h1></div>
      {msg && <div className="toast" role="status">{msg}</div>}
      <div className="cols">
        <div className="stack">
          <Mana c={c} d={d} put={put} say={setMsg} />
          <Hul c={c} d={d} put={put} say={setMsg} />
          <Aktivni c={c} d={d} put={put} say={setMsg} />
        </div>
        <div className="stack">
          <Obory c={c} />
          <Schopnosti c={c} d={d} put={put} say={setMsg} />
        </div>
      </div>
      <Volby c={c} put={put} />
      <Kouzla c={c} d={d} put={put} say={setMsg} />
    </div>
  );
}

// ---------------------------------------------------------------- mana

function Mana({ c, d, put, say }: P) {
  const [blood, setBlood] = useState(2);
  const [dagger, setDagger] = useState(false);
  const W = wiz(c);
  const cur = c.vitals.manaCurrent;
  const max = d.manaMax.value;
  const cap = manaCap(c, max);
  const adj = (delta: number) => put(record(c, `Mana ${sgn(delta)}`, (x) => ({ ...x, vitals: { ...x.vitals, manaCurrent: Math.max(0, x.vitals.manaCurrent + delta) } })));
  const medWhy = meditateWhy(c, d);
  const drWhy = drawWhy(c, d);
  const blWhy = bloodWhy(c, d, blood, dagger);
  const isDagger = staffOf(c)?.kind === 'dyka';
  return (
    <Sheet>
      <Ribbon icon="spark">MANA</Ribbon>
      <div className="va-adr">
        <div className="al-res">
          <span className="lbl">Mana</span>
          <b className="al-big tn">{cur}<small className="muted"> / {max ?? '?'}</small></b>
          {cap != null && max != null && cap > max && <span className="small muted">strop {cap} (Vládce many)</span>}
          <div className="al-adj">
            <button className="btn" type="button" onClick={() => adj(-1)} disabled={cur < 1} aria-label="Mana −1">−1</button>
            <button className="btn" type="button" onClick={() => adj(1)} aria-label="Mana +1">+1</button>
          </div>
        </div>
        <div className="small">
          <p style={{ margin: '0 0 6px' }}>{WIZ.pravidla.meditace}</p>
          <div className="steps">
            <button className="btn dark" type="button" disabled={!!medWhy} title={medWhy || undefined}
              onClick={() => { const n = meditate(c, d); put(n); say(`Meditace: mana ${n.vitals.manaCurrent}`); }}>Meditace{W.meditatedToday ? ' ✔' : ''}</button>
            <button className="btn" type="button" disabled={!!drWhy} title={drWhy || (drawFixed(c) ? 'Citlivost na vichry many: vždy 6' : '+1k6 many')}
              onClick={() => { const r = drawMana(c, d); put(r.character); say(`Nasátí: +${r.gain} many`); }}>Nasátí {drawFixed(c) ? '+6' : '+1k6'} ({W.manaDrawsToday}/{c.progression.level})</button>
            <button className="btn" type="button" disabled={cur < WIZ.trik.mana} onClick={() => { put(castTrick(c)); say('Kouzelnický trik: −1 mana'); }}>Trik (1)</button>
            <button className="btn" type="button" onClick={() => { put(newDay(c)); say('Nový den'); }}>Nový den</button>
          </div>
          {(medWhy || drWhy) && <p className="small muted" style={{ margin: '4px 0 0' }}>{medWhy && `Meditace: ${medWhy}. `}{drWhy && `Nasátí: ${drWhy}.`}</p>}
          <p className="small muted" style={{ margin: '6px 0 0' }}>{WIZ.pravidla.nasati}{hasAbility(c, 'bitevni_trenink') ? ' Bitevní trénink: v boji za 1 kolo (dlouhá akce).' : ''}</p>
        </div>
      </div>
      {hasAbility(c, 'ritual_krve') && (
        <div className="va-box" style={{ marginTop: 10 }}>
          <b>Rituál krve</b>
          <span className="small muted">{WIZ.schopnosti.ritual_krve.text}{c.play.combat ? ' V boji dlouhá akce.' : ''}</span>
          <div className="steps">
            <label className="small">Many <input className="field num tn" type="number" min={1} max={dagger ? 3 : undefined} value={blood} onChange={(e) => setBlood(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} aria-label="Many z Rituálu krve" /></label>
            {isDagger && <label className="small"><input type="checkbox" checked={dagger} onChange={(e) => setDagger(e.target.checked)} /> Krev v manu (dýka, 1 : 1, max. 3)</label>}
            <button className="btn wine" type="button" disabled={!!blWhy} title={blWhy || undefined}
              onClick={() => { put(bloodRitual(c, d, blood, dagger)); say(`Rituál krve: +${blood} many`); }}>−{dagger ? blood : 2 * blood} životů → +{blood} many</button>
          </div>
          {blWhy && <span className="small muted">{blWhy}</span>}
        </div>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- hůl

function Hul({ c, put, say }: P) {
  const kinds = staffKinds(c);
  const [kind, setKind] = useState<StaffKind>(kinds[kinds.length - 1] ?? 'hul');
  const [obor, setObor] = useState<string>(c.progression.learnedBranches[0] ?? '');
  const [n, setN] = useState(5);
  const [askLose, setAskLose] = useState(false);
  const [hp, setHp] = useState(4);
  const st = staffOf(c);
  const why = staffWhy(c);
  if (why && !st) {
    return (
      <Sheet>
        <Ribbon icon="star">KOUZELNÍKOVA HŮL</Ribbon>
        <p className="small muted" style={{ margin: 0 }}>Hůl si kouzelník vyrobí rituálem od 6. úrovně (Pokročilý kouzelník, PPP04 s. 192) – +1 k oboru, ukládání many, přivolání do ruky.</p>
      </Sheet>
    );
  }
  if (!st) {
    return (
      <Sheet>
        <Ribbon icon="star">KOUZELNÍKOVA HŮL</Ribbon>
        <p className="small" style={{ margin: '0 0 6px' }}>Rituál po dni půstu a meditace, od západu do svítání: vyčerpá všechnu manu; hůl je magická jen v rukou tvůrce. Zvol variantu a obor, ke kterému dá +1.</p>
        <details className="small" style={{ margin: '0 0 6px' }}><summary className="muted">plné znění (PPP04 s. {WIZ.hul.page})</summary>{WIZ.hul.ritual.split('\n').map((t, i) => <p key={i} style={{ margin: '4px 0' }}>{t}</p>)}</details>
        <div className="steps">
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value as StaffKind)} aria-label="Druh hole">
            {kinds.map((k) => <option key={k} value={k}>{staffVariant(k).name}</option>)}
          </select>
          <select className="field" value={obor} onChange={(e) => setObor(e.target.value)} aria-label="Obor pro +1">
            <option value="">— obor pro +1 —</option>
            {Object.entries(OBOR_NAME).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <button className="btn dark" type="button" onClick={() => { put(makeStaff(c, kind, obor || null)); say(`${staffVariant(kind).name} vyrobena – mana vyčerpána`); }}>Rituál hole (vyčerpá manu)</button>
        </div>
      </Sheet>
    );
  }
  const v = staffVariant(st.kind);
  const capN = staffCapacity(c);
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="star">{v.name.toUpperCase()}</Ribbon><span className="small tn">mana {st.mana} / {capN}{st.kind === 'dyka' ? ` · životy ${st.life} / ${lifeCapacity(c)}` : ''}</span></div>
      <dl className="va-dl small">
        <dt>V ruce</dt><dd><label><input type="checkbox" checked={st.inHand} onChange={(e) => put(setStaffHand(c, e.target.checked))} /> drží {v.name.toLowerCase()} – bonusy platí</label></dd>
        <dt>Zlepšené sesílání</dt><dd>{st.obor ? `+${WIZ.hul.oborBonus} ke kouzlům oboru ${OBOR_NAME[st.obor]}` : 'obor nezvolen'}</dd>
        <dt>Ukládání many</dt><dd>{v.manaPerLevel} za úroveň ({capN}); vložení trvá kolo. Při sesílání zaškrtni „Platit z hole“.</dd>
        {v.extra.map((x, i) => <div key={i} style={{ display: 'contents' }}><dt>{i === 0 ? 'Navíc' : ''}</dt><dd>{x}</dd></div>)}
        {v.weapon && <><dt>Jako zbraň</dt><dd>{v.weapon} (přidej ji do výzbroje jako vlastní zbraň)</dd></>}
      </dl>
      <div className="steps" style={{ marginTop: 8 }}>
        <input className="field num tn" type="number" min={1} value={n} onChange={(e) => setN(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} aria-label="Many do hole" />
        <button className="btn" type="button" disabled={st.mana >= capN || c.vitals.manaCurrent < 1} onClick={() => put(storeMana(c, n))}>Vložit do hole</button>
        <button className="btn" type="button" disabled={c.vitals.manaCurrent < 1} onClick={() => { put(castTrick(c, 'Přivolání hole')); say('Hůl přivolána do ruky'); }}>Přivolat (trik, 1)</button>
        <button className="btn" type="button" onClick={() => setAskLose(true)}>Ztráta</button>
      </div>
      {askLose && (
        <ConfirmDialog title="ZTRÁTA HOLE" icon="skull" yes="Ano, ztracena" onYes={() => { put(loseStaff(c)); setAskLose(false); }} onNo={() => setAskLose(false)}>
          <p>Opravdu je {v.name.toLowerCase()} ztracena nebo zničena?</p>
        </ConfirmDialog>
      )}
      {st.kind === 'dyka' && (
        <div className="steps" style={{ marginTop: 8 }}>
          <span className="small">Uchování života (rituál 1 směna):</span>
          <input className="field num tn" type="number" min={2} step={2} value={hp} onChange={(e) => setHp(Math.max(2, Math.trunc(Number(e.target.value)) || 2))} aria-label="Obětovat životů" />
          <button className="btn wine" type="button" disabled={st.life >= lifeCapacity(c)} onClick={() => put(storeLife(c, hp))}>−{hp} životů → +{Math.floor(hp / 2)}</button>
          <button className="btn dark" type="button" disabled={!st.life} onClick={() => { put(releaseLife(c, st.life)); say(`Dýka vrátila ${st.life} životů`); }}>Dýka vrací {st.life}</button>
        </div>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- aktivní kouzla

function Aktivni({ c, d, put }: P) {
  const [name, setName] = useState('');
  const [zo, setZo] = useState(0);
  const W = wiz(c);
  const round = c.play.combat?.round ?? null;
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="shield">PŮSOBÍ NA MNĚ</Ribbon><span className="small tn">ZO {d.defenseBase.value}</span></div>
      {W.active.length === 0 && <p className="small muted" style={{ margin: 0 }}>Magický štít, Magická zbroj a Rychlost seslané na sebe se sem zapíšou samy (volba „na sebe“). Štít dává ZO +5, zbroj +1 za 4 many, Rychlost krátkou akci, útok a obranu navíc.</p>}
      <ul className="small va-notes">
        {W.active.map((a) => (
          <li key={a.uid}>
            <b>{a.name}</b>{a.zo ? ` · ZO +${a.zo}` : ''}{a.haste ? ' · +1 krátká akce, útok a obrana' : ''}
            {a.until != null ? ` · do ${a.until}. kola${round != null ? ` (teď ${round}.)` : ''}` : ' · do zrušení'}
            {' '}<button type="button" className="fpop-x" aria-label={`Ukončit ${a.name}`} onClick={() => put(removeActive(c, a.uid))}>×</button>
          </li>
        ))}
      </ul>
      <details style={{ marginTop: 6 }}>
        <summary className="small">Přidat ručně (seslal jiný kouzelník…)</summary>
        <div className="steps" style={{ marginTop: 6 }}>
          <input className="field" placeholder="Název" value={name} onChange={(e) => setName(e.target.value)} aria-label="Název kouzla" />
          <label className="small">ZO + <input className="field num tn" type="number" min={0} value={zo} onChange={(e) => setZo(Math.max(0, Math.trunc(Number(e.target.value)) || 0))} aria-label="Bonus k ZO" /></label>
          <button className="btn" type="button" disabled={!name.trim()} onClick={() => { put(addActive(c, name.trim(), zo, /rychlost/i.test(name), null)); setName(''); setZo(0); }}>Přidat</button>
        </div>
      </details>
    </Sheet>
  );
}

// ---------------------------------------------------------------- obory

function Obory({ c }: { c: Character }) {
  const own = new Set(c.progression.learnedBranches);
  const mag = new Set(c.progression.learnedAbilities.filter((a) => a.id === 'magistr_magickeho_oboru').map((a) => String(a.params?.obor)));
  return (
    <Sheet>
      <Ribbon icon="book">OBORY MAGIE</Ribbon>
      <ul className="ab-list va-list">
        {Object.entries(OBOR_NAME).map(([id, name]) => {
          const list = WIZARD_SPELLS.filter((s) => spellBranch(s) === id && s.skupina !== 'obecna' && s.zdroj === 'H11').map((s) => s.nazev);
          return (
            <li key={id} className={own.has(id) ? '' : 'va-off'}>
              <span className="va-name">{own.has(id) ? '✓ ' : ''}{name}{mag.has(id) ? ' · MAGISTR' : ''}</span>
              <span className="va-txt">{list.join(', ')}</span>
            </li>
          );
        })}
      </ul>
      <p className="small muted" style={{ margin: '6px 0 0' }}>Obor se volí při přestupu místo schopnosti a jen otevře nabídku – kouzla se učí do slotů (2 za úroveň, ✔ U). Od 6. úrovně přibudou kouzla pro pokročilé (PPP04) ovládaných oborů.</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- schopnosti

function Schopnosti({ c, d, put, say }: P) {
  const { roll } = useDice();
  const spec = c.progression.specialization;
  const sp = spec ? WIZ.specializace[spec] : null;
  const ids = [...new Set(c.progression.learnedAbilities.map((a) => a.id))];
  const notes = wizardNotes(c);
  const lv = c.progression.level;
  const cast = castBonus(c, d);
  const magister = (id: string) => c.progression.learnedAbilities.filter((a) => a.id === id).map((a) => OBOR_NAME[String(a.params?.obor)] ?? '').filter(Boolean);
  return (
    <Sheet>
      <Ribbon icon="mask">SCHOPNOSTI</Ribbon>
      <dl className="va-dl small">
        <dt>Kouzelnická magie</dt><dd>Sesílání kouzel (INT) na 3. stupni; 3 kouzla obecné magie; kouzelnické triky.</dd>
        {lv >= WIZ.pokrocily.level && (
          <>
            <dt>Pokročilý kouzelník</dt><dd>Kouzelníkova hůl, Zaslechnutí kouzla; další přátelé – had, havran, netopýr (7c+).</dd>
            <dt>Zaslechnutí kouzla</dt>
            <dd>Krátká akce: Sesílání kouzel vs. Sesílání kouzel zdroje.{' '}
              <button className="btn" type="button" onClick={() => roll('k10', cast.bonus, 'Zaslechnutí kouzla – vs. Sesílání kouzel zdroje')}>⚄ {sgn(cast.bonus)}</button>
            </dd>
          </>
        )}
        {sp && (
          <>
            <dt>{sp.name} (specializace)</dt><dd>{sp.auto} <span className="pill ok">AUTOMATICKY</span> <span className="muted">PPP04 s. {sp.page}</span></dd>
          </>
        )}
        {ids.map((id) => {
          const a = WIZ.schopnosti[id];
          const m = id === 'magistr_magickeho_oboru' ? magister(id) : [];
          return (
            <div key={id} style={{ display: 'contents' }}>
              <dt>{a?.name ?? progressionName('kouzelnik', id)}{m.length ? ` (${m.join(', ')})` : ''}</dt>
              <dd>
                {a?.text}{a?.source === 'PPP04' ? <span className="muted"> (PPP04 s. {a.page})</span> : null}
                {a && a.full !== a.text && <details><summary className="small muted">plné znění</summary>{a.full.split('\n').map((p, i) => <p key={i} style={{ margin: '4px 0' }}>{p}</p>)}</details>}
                {(TECHNIQUES as readonly string[]).includes(id) && (
                  <button className="btn" type="button" style={{ marginTop: 4 }} onClick={() => { put(technique(c, d, id as (typeof TECHNIQUES)[number])); say(`${a.name}${a.technika?.fatigue ? ' – únava +1' : ''}`); }}>
                    Použít{a.technika?.fatigue ? ' (+1 únava)' : ''}
                  </button>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {ids.length === 0 && !sp && <p className="small muted" style={{ margin: '6px 0 0' }}>Schopnosti a obory se berou při přestupu, od 6. úrovně i pokročilé (PPP04) a specializace Bojový mág, Čaroděj a Nekromant.</p>}
      {notes.length > 0 && (
        <>
          <h3 className="lbl" style={{ margin: '10px 0 4px', color: 'var(--ink)' }}>Podle situace (appka nepočítá sama)</h3>
          <ul className="small va-notes">{notes.map((n) => <li key={n.source}><b>{n.source}:</b> {n.text}</li>)}</ul>
        </>
      )}
      <p className="small muted" style={{ margin: '8px 0 0' }}>Koncentrace many, Vládce many, Bitevní trénink, Posílená ochrana, hůl, Magistr a postihy sesílání se počítají samy; Rychlé a Precizní kouzlení, bez řeči / gest a další volby jsou v sekci Volby sesílání.</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- volby sesílání

function Volby({ c, put }: { c: Character; put: Put }) {
  const m = wiz(c).mods;
  const has = (id: string) => hasAbility(c, id);
  const set = (patch: Partial<WizardCastMods>) => put(setMods(c, patch));
  const tog = (k: keyof WizardCastMods, label: string, show = true, title?: string) =>
    show ? <button key={k} type="button" className="chip" aria-pressed={!!m[k]} title={title} onClick={() => set({ [k]: !m[k] } as Partial<WizardCastMods>)}>{label}</button> : null;
  return (
    <Sheet>
      <Ribbon icon="bolt">VOLBY SESÍLÁNÍ</Ribbon>
      <div className="chips">
        {tog('quick', 'Rychlé kouzlení (½ vyvolání, +3)', has('rychle_kouzleni'))}
        {tog('precise', 'Precizní kouzlení (2×, +5)', has('precizni_kouzleni'))}
        {tog('noVoice', `Bez řeči (${has('utajene_kouzleni') ? '−2' : '−5'})`)}
        {tog('noGesture', `Bez gest (${has('utajene_kouzleni') ? '−2' : '−5'})`)}
        {tog('interrupted', has('bojove_sesilani') ? 'Vyrušen (Bojové sesílání – bez postihu)' : 'Vyrušen (+5 obtížnost)')}
        {tog('night', 'Je noc (Dar noci +5)', has('dar_noci'))}
        {tog('boostRange', 'Posílit dosah (×2, +¼ ceny, +1)', has('posilovani_kouzel'))}
        {tog('boostDuration', 'Posílit trvání (×2, +¼ ceny, +1)', has('posilovani_kouzel'))}
        {tog('fromStaff', 'Platit z hole', !!staffOf(c))}
        {tog('self', 'Štít / zbroj / Rychlost na sebe')}
      </div>
      <div className="steps" style={{ marginTop: 8 }}>
        {has('hromadne_sesilani') && (
          <label className="small">Hromadné sesílání – cílů <input className="field num tn" type="number" min={1} max={c.progression.level} value={m.targets} onChange={(e) => set({ targets: Math.max(1, Math.min(c.progression.level, Math.trunc(Number(e.target.value)) || 1)) })} aria-label="Počet cílů" /></label>
        )}
        {has('ritualni_kouzleni') && (
          <label className="small">Rituální kouzlení – kouzelníků <input className="field num tn" type="number" min={0} value={m.ritual} onChange={(e) => set({ ritual: Math.max(0, Math.trunc(Number(e.target.value)) || 0) })} aria-label="Počet kouzelníků v rituálu" /></label>
        )}
      </div>
      <p className="small muted" style={{ margin: '6px 0 0' }}>
        Volby platí pro sesílání tady i v boji, dokud je nezměníš. {WIZ.pravidla.postihy.zbroj}; {WIZ.pravidla.vyruseni} {WIZ.pravidla.limit}
      </p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- kouzla

type Filter = 'known' | 'learnable' | 'all';

function Kouzla({ c, d, put, say }: P) {
  const { roll } = useDice();
  const [flt, setFlt] = useState<Filter>('known');
  const [grp, setGrp] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const known = useMemo(() => new Set(knownWizardSpells(c).map((s) => s.id)), [c]);
  const ctx = useMemo(() => wizardCtx(c), [c]);
  const cast = castBonus(c, d);
  const book = hasAbility(c, 'kouzleni_z_knih');
  const swaps = swapsLeft(c);
  const pool = flt === 'known' ? WIZARD_SPELLS.filter((s) => known.has(s.id))
    : flt === 'learnable' ? WIZARD_SPELLS.filter((s) => !known.has(s.id) && !learnLock(s, ctx)) : WIZARD_SPELLS;
  const groups = [...new Set(pool.map(spellGroup))];
  const list = pool.filter((s) => (!grp || spellGroup(s) === grp) && (!q || `${s.nazev} ${s.popis} ${s.zaklinadlo ?? ''} ${s.latinsky ?? ''}`.toLowerCase().includes(q.toLowerCase())));
  const priceOf = (s: MagicSpell) => (s.cena.variable || s.cena.base == null ? Math.max(1, prices[s.id] ?? (s.cena.base || 1)) : s.cena.base ?? 0);
  const doCast = (s: MagicSpell, fromBook: boolean) => {
    const r = castOutside(c, d, s, priceOf(s), cast.bonus, fromBook);
    if (!r) return;
    put(r.character);
    roll('k10', r.bonus, `${s.nazev}${fromBook ? ' (z knihy)' : ''} – Sesílání kouzel${r.dc != null ? ` vs. ${r.dc}` : ''} (musí být vyšší)`);
  };
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="book">KOUZLA</Ribbon><span className="small tn">zná {known.size} · mana {c.vitals.manaCurrent} · Sesílání kouzel {sgn(cast.bonus)}</span></div>
      <div className="chips">
        {([['known', `Známá (${known.size})`], ['learnable', 'Může se naučit'], ['all', `Všechna (${WIZARD_SPELLS.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={flt === k} onClick={() => { setFlt(k); setGrp(null); }}>{l}</button>
        ))}
        <span style={{ width: 8 }} />
        {groups.map((g) => <button key={g} type="button" className="chip" aria-pressed={grp === g} onClick={() => setGrp(grp === g ? null : g)}>{g}</button>)}
      </div>
      <div className="al-ws" style={{ marginTop: 8 }}>
        <input className="field" type="search" placeholder="Hledat kouzlo, zaklínadlo…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Hledat kouzlo" />
      </div>
      {c.play.combat && <p className="small" style={{ margin: '6px 0 0' }}>Probíhá boj – kouzla s hlídáním akcí sesílej na záložce Boj a stavy.</p>}
      {swapFrom && (
        <div className="warnbar" style={{ margin: '8px 0' }}>
          Záměna kouzel: místo <b>{swapFrom}</b> vyber nové kouzlo (filtr „Může se naučit“) · zbývá {swaps} záměn na této úrovni.
          <button className="btn" type="button" onClick={() => setSwapFrom(null)}>Zrušit</button>
        </div>
      )}
      <div className="al-list">
        {list.length === 0 && <p className="small muted">{flt === 'known' ? 'Kouzla se učí při tvorbě postavy a při přestupu (2 za úroveň).' : 'Nic neodpovídá filtru.'}</p>}
        {list.map((s) => {
          const kn = known.has(s.id);
          const lock = learnLock(s, ctx);
          const price = priceOf(s);
          const variable = s.cena.variable || s.cena.base == null;
          const p = castProfile(c, d, s, wiz(c).mods, { book: !kn });
          const why = kn ? outsideWhy(c, d, s, price) : book ? outsideWhy(c, d, s, price, true) : '';
          const swapWhyTxt = swapFrom ? swapWhy(c, swapFrom, s) : '';
          return (
            <div key={s.id} className="recipe">
              <div>
                <h4><button type="button" className="linkbtn al-name" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>{s.nazev}</button>
                  {kn ? <> <span className="pill ok">UMÍ</span></> : lock ? <> <span className="pill">{lock.toUpperCase()}</span></> : <> <span className="pill">LZE NAUČIT</span></>}
                </h4>
                <div className="meta">{spellGroup(s)} · {s.zdroj} s. {s.strana} · <b>{s.cena.text}</b> many · obtížnost {s.obtiznost.text}{p.dc != null && p.dc !== s.obtiznost.base ? ` → ${p.dc}` : ''} · {s.vyvolani.text}{p.dcParts.length || wiz(c).mods.quick || wiz(c).mods.precise || !kn ? ` → ${p.lenText}` : ''}</div>
                {(p.bonusParts.length > 0 || p.costParts.length > 0 || p.dcParts.length > 0) && (
                  <div className="meta">{[...p.bonusParts, ...p.dcParts, ...p.costParts].join(' · ')}</div>
                )}
              </div>
              <div className="al-ws" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {(kn || book) && variable && <input className="field num tn sp-cost" style={{ minWidth: 0 }} type="number" min={1} value={price} aria-label={`Mana – ${s.nazev}`} onChange={(e) => setPrices((x) => ({ ...x, [s.id]: Math.max(1, Math.trunc(Number(e.target.value)) || 1) }))} />}
                {kn && <button className="btn dark" type="button" disabled={!!why} title={why || `Cena ${p.cost(price)}`} onClick={() => doCast(s, false)}>Seslat ⚄{p.cost(price) !== price ? ` (${p.cost(price)})` : ''}</button>}
                {!kn && book && <button className="btn" type="button" disabled={!!why} title={why || 'Kouzlení z knih: 2× delší vyvolání, obtížnost +3 / +5'} onClick={() => doCast(s, true)}>Z knihy ⚄</button>}
                {kn && swaps > 0 && !swapFrom && s.nazev !== 'Pokročilá reanimace' && <button className="btn" type="button" onClick={() => { setSwapFrom(s.nazev); setFlt('learnable'); setGrp(null); }}>Zaměnit</button>}
                {swapFrom && !kn && <button className="btn dark" type="button" disabled={!!swapWhyTxt} title={swapWhyTxt || undefined}
                  onClick={() => { put(swapSpell(c, swapFrom, s)); say(`Záměna: ${swapFrom} → ${s.nazev} (projeví se po meditaci)`); setSwapFrom(null); setFlt('known'); }}>Místo „{swapFrom}“</button>}
                {why && (kn || book) && <span className="small muted" style={{ width: '100%', textAlign: 'right' }}>{why}</span>}
              </div>
              {open === s.id && (
                <div className="al-detail">
                  <dl>
                    <dt>MANA</dt><dd>{s.cena.text}</dd>
                    {s.dosah && <><dt>DOSAH</dt><dd>{s.dosah}</dd></>}
                    {s.rozsah && <><dt>ROZSAH</dt><dd>{s.rozsah}</dd></>}
                    {s.trvani && <><dt>TRVÁNÍ</dt><dd>{s.trvani}</dd></>}
                    <dt>VYVOLÁNÍ</dt><dd>{s.vyvolani.text}</dd>
                    {s.overeni && <><dt>OVĚŘENÍ</dt><dd>{s.overeni}</dd></>}
                    <dt>OBTÍŽNOST</dt><dd>{s.obtiznost.text}</dd>
                    {s.zaklad && <><dt>ZÁKLAD</dt><dd>{s.zaklad}</dd></>}
                    {(s.zaklinadlo || s.latinsky) && <><dt>ZAKLÍNADLO</dt><dd><i>{s.zaklinadlo ?? s.latinsky}</i></dd></>}
                  </dl>
                  {s.popis.split('\n').map((para, i) => <p key={i} style={{ margin: '4px 0' }}>{para}</p>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="small muted" style={{ margin: '8px 0 0' }}>
        Seslat odečte manu (případně nejdřív z hole) a hodí k10 + Sesílání kouzel s bonusy a postihy z voleb; výsledek musí být vyšší než obtížnost. Proměnnou cenu (za kolo, za střelu…) zadej do políčka – appka z ní spočítá i trvání štítu a Rychlosti.
      </p>
    </Sheet>
  );
}
