// Záložka BOJ A STAVY (Fáze 6): hlídání akcí v kole a tahu, životy s mezí vyřazení a hranicí smrti,
// léčení, únava, stavy, bojové hodnoty s hody a záznam rychlých úprav s vrácením (H16, H17).
// Převedeno z odsouhlaseného prototypu v8.3–v9 („vypadá dobře a funkčně“, 18. 9. 2026).
import { useEffect, useState } from 'react';
import type { ActionLength, Character } from '../model/types';
import {
  CRITICAL_WOUNDS, HP_STATE_LABEL, SLEEP_BASE, LEN_NAME, TRICK_TYPE, bleedStacks, canDefend, castBonus, castSpell, changeHp, combatMods,
  condName, continueChannel, defenseVsRanged, doAction, endCombat, endTurn, hasCond, healBy, heavyArmorWorn, hpState,
  knownSpells, knownTricks, lenRounds, lenText, myTurn, newRound, recover, rest, rollInitiative, setBleed, setCombat,
  setFatigue, sleep, spellCheck, spellCost, spellWhy, startCombat, stopChannel, toggleCondition, trickWhy, turnActions, turnCtx,
  turnEffects, undoAction, undoPlay, takeDefense, applyTrick, whyNot, type ActionDef, type SpellDef,
  attack, attackWhy, roundInfo, sacrificeFor, shieldBash, shieldBashAttack, payDeathDelay,
} from '../rules/combat';
import { ValecnikBoj } from './ValecnikBoj';
import { KouzelnikBoj } from './KouzelnikBoj';
import { KlerikBoj } from './KlerikBoj';
import { ZlodejBoj } from './ZlodejBoj';
import { PrateleBoj } from './Pratele';
import { CONDITIONS, FATIGUE, getClass } from '../rules/data';
import { adrenalinAtStart, adrenalinGain, trickPrice } from '../rules/valecnik';
import { sgn, type Derived } from '../rules/derive';
import { useStore } from '../state/store';
import { useDice, RollButton } from '../ui/Dice';
import { CalcField, Labeled } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

const COND_TEXT: Record<string, string> = {
  krvaceni: 'k6 za kolo za každé', otrava: 'podle jedu', paralyza: 'nemůže jednat', vystraseni: 'jen útěk, 3 kola',
  zapaleni: 'k6 ohněm, 3 kola', otreseni: 'tento tah nic', povaleni: 'vztyk = dlouhá akce', omameni: '−5 útok, obrana, inic.',
  oslabeni: '−5 útok, obrana, ZO', oslepeni: '−5 útok, obrana, ověření', zmrz_noha: '−5 nohy, pohyb ÷2, nesprintuje',
  zmrz_ruka: '−5 útok, akt. obrana', zpomaleni: 'pohyb ÷2, −5 OBR, 3 kola',
};

export function Boj() {
  const { character: c, derived: d, dispatch } = useStore();
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 3500); return () => clearTimeout(t); }, [msg]);
  const upd = (fn: (x: Character) => Character) => dispatch({ type: 'update', fn });
  const replace = (next: Character) => upd(() => next);

  return (
    <div className="stack boj-page">
      <div>
        <h1 className="pg">BOJ A STAVY</h1>
        <p className="lead muted">Rychlé úpravy během hry – velká tlačítka, na telefonu palcem. Každá úprava se zapíše a jde vrátit.</p>
      </div>
      {msg && <div className="toast" role="status">{msg}</div>}
      <TahAKolo c={c} d={d} replace={replace} say={setMsg} />
      <PrateleBoj c={c} d={d} replace={replace} say={setMsg} />
      <div className="cols">
        <div className="stack">
          <Zivoty c={c} d={d} replace={replace} say={setMsg} />
          <Sheet>
            <Ribbon icon="hourglass">ÚNAVA</Ribbon>
            <div className="seg" role="group" aria-label="Stupeň únavy">
              {FATIGUE.map((f) => (
                <button key={f.level} type="button" aria-pressed={c.vitals.fatigueLevel === f.level} onClick={() => c.vitals.fatigueLevel !== f.level && replace(setFatigue(c, f.level))}>
                  {f.name}<small>{f.penalty === null ? '—' : f.penalty === 0 ? 'bez postihu' : f.penalty}</small>
                </button>
              ))}
            </div>
            <p className="small muted" style={{ margin: '6px 0 0' }}>Unavená a vyčerpaná postava nesprintuje (H16). Postih se připočte do všech hodů.</p>
          </Sheet>
          <Stavy c={c} replace={replace} />
        </div>
        <div className="stack">
          <BojoveHodnoty c={c} d={d} replace={replace} say={setMsg} />
          <Postihy c={c} />
          <Zaznam c={c} replace={replace} />
        </div>
      </div>
    </div>
  );
}

type P = { c: Character; d: Derived; replace: (c: Character) => void; say: (s: string) => void };

// ---------------------------------------------------------------- životy

function Zivoty({ c, d, replace, say }: P) {
  const [amount, setAmount] = useState(3);
  const max = d.hpMax.value;
  const death = d.deathThreshold.value;
  const hp = c.vitals.hpCurrent;
  const st = hpState(c, d);
  const span = Math.max(1, max - death);
  const pct = (v: number) => ((Math.max(death, Math.min(max, v)) - death) / span) * 100;
  const zero = pct(0);
  const heavy = heavyArmorWorn(d);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sleepHp, setSleepHp] = useState<number>(SLEEP_BASE.hp);
  const [sleepFat, setSleepFat] = useState<number>(SLEEP_BASE.fatigue);
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="heart">ŽIVOTY</Ribbon><span className={`pill ${st === 'ok' ? 'ok' : 'bad'}`}>{HP_STATE_LABEL[st]}</span></div>
      <div className="hp-big"><span className="big tn">{hp}</span><span className="muted tn">/ {max}</span></div>
      <div className="track" style={{ ['--u' as string]: `${(100 / span).toFixed(3)}%` }} role="img"
        aria-label={`Životy ${hp} z ${max}; mez vyřazení 0, hranice smrti ${death}`}>
        <div className="bar" />
        <div className="neg" style={{ width: `${zero}%` }} />
        <div className={`fill ${hp <= 0 ? 'down' : ''}`} style={{ left: `${hp >= 0 ? zero : pct(hp)}%`, width: `${Math.abs(pct(hp) - zero)}%` }} />
        <div className="mark" style={{ left: `${zero}%` }}><span>0 · bezvědomí</span></div>
        <div className="mark b" style={{ left: 0 }}><span style={{ translate: '0 0' }}>{death} hr. smrti</span></div>
        <div className="mark b" style={{ left: '100%' }}><span style={{ translate: '-100% 0' }}>max {max}</span></div>
      </div>
      <div className="steps hp-steps">
        {[-5, -1, 1, 5].map((n) => (
          <button key={n} className={`btn ${n < 0 ? 'wine' : ''}`} type="button" disabled={n > 0 && hp >= max} onClick={() => replace(changeHp(c, d, n))}>{n > 0 ? '+' : '−'}{Math.abs(n)}</button>
        ))}
      </div>
      <div className="steps hp-custom">
        <input className="field num tn" type="number" min={1} value={amount} aria-label="Počet životů" onChange={(e) => setAmount(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} />
        <button className="btn wine" type="button" onClick={() => replace(changeHp(c, d, -amount, `Zranění −${amount}`))}>Zranění</button>
        <button className="btn" type="button" disabled={hp >= max} onClick={() => replace(healBy(c, d, amount, 'Léčení'))}>Léčení</button>
      </div>
      <div className="steps" style={{ marginTop: 8 }}>
        <button className="btn" type="button" onClick={() => replace(rest(c, d))} title="1× za den: +1 život, únava −1 stupeň">Odpočinek</button>
        <button className="btn" type="button" aria-expanded={sleepOpen} onClick={() => setSleepOpen((o) => !o)} title="+2 životy, únava −3 stupně – hodnoty jde před potvrzením upravit">Spánek 8 h…</button>
        <button className="btn" type="button" disabled={c.vitals.fatigueLevel > 0} title={c.vitals.fatigueLevel ? 'Jen když je Svěží' : `Celý den: +${Math.ceil(max / 5)} životů`} onClick={() => replace(recover(c, d))}>Zotavení</button>
        <FirstAid c={c} d={d} replace={replace} say={say} />
      </div>
      {sleepOpen && (
        <div className="warnbar sleep-edit">
          <b>Spánek 8 h</b>
          <label>Životy + <input className="field num tn" type="number" min={0} value={sleepHp} aria-label="Kolik životů spánek vyléčí" onChange={(e) => setSleepHp(Math.max(0, Math.trunc(Number(e.target.value)) || 0))} /></label>
          <label>Únava − <input className="field num tn" type="number" min={0} max={4} value={sleepFat} aria-label="O kolik stupňů klesne únava" onChange={(e) => setSleepFat(Math.max(0, Math.min(4, Math.trunc(Number(e.target.value)) || 0)))} /> stupně</label>
          <button className="btn dark" type="button" onClick={() => { replace(sleep(c, d, sleepHp, sleepFat)); setSleepOpen(false); }}>Potvrdit</button>
          <button className="btn" type="button" onClick={() => { setSleepHp(SLEEP_BASE.hp); setSleepFat(SLEEP_BASE.fatigue); }}>Základní</button>
          <button className="btn" type="button" onClick={() => setSleepOpen(false)}>Zpět</button>
          <span className="small muted" style={{ flexBasis: '100%' }}>Základní efekt +{SLEEP_BASE.hp} životy a únava −{SLEEP_BASE.fatigue} (H17).{heavy ? ' Spí ve střední/těžké zbroji – o případném snížení rozhoduje PJ.' : ' Upravit podle uvážení PJ (spánek ve zbroji, nepohodlí…).'}</span>
        </div>
      )}
      {st === 'out' && <p className="fpop-note" style={{ marginTop: 8 }}>Bezvědomí: žádná akce, nemůže se bránit. Krvácení a jed berou nejvýš 2 životy za kolo. Na 0 se probere za 1k10 směn s 1 životem; pod 0 se léčí 2 životy za 8 hodin (H17).</p>}
      {(st === 'dead' || st === 'dying') && c.play.combat?.war?.fury && !c.play.combat.war.fury.active ? (
        <div className="warnbar" style={{ marginTop: 8 }}>
          <span>Po Vražedné zuřivosti pod Hranicí smrti ({death}): <b>1 adrenalin = odklad smrti o 1 kolo</b>. Jen plazení a jednoduchá činnost; každý další ztracený život stojí 1 adrenalin – bez adrenalinu okamžitá smrt (PPP01).</span>
          {st === 'dying'
            ? <span className="pill">ODKLAD DO KONCE {c.play.combat.round}. KOLA</span>
            : <button className="btn wine" type="button" disabled={c.vitals.manaCurrent < 1} onClick={() => replace(payDeathDelay(c))}>Odložit smrt (−1 adrenalin, zbývá {c.vitals.manaCurrent})</button>}
        </div>
      ) : st === 'dead' && <p className="fpop-note" style={{ marginTop: 8, color: 'var(--blood)' }}>Životy klesly pod Hranici smrti ({death}) – postava umírá (H17). Omyl? Použij Vrátit v Záznamu.</p>}
      <p className="small muted" style={{ margin: '8px 0 0' }}>
        Léčení nikdy nepřekročí maximum. Odpočinek +1 a −1 únava, spánek +2 a −3 únava (hodnoty jde upravit podle PJ), zotavení +⌈max/5⌉ jen svěží.
        {c.basic.raceId === 'barbar' && ' Houževnatost: +2 životy při každém léčení se přičte sama.'}
      </p>
    </Sheet>
  );
}

function FirstAid({ c, d, replace }: P) {
  const rank = d.skills.find((s) => s.id === 'prvni_pomoc')?.rank ?? 0;
  if (!rank) return null;
  return (
    <button className="btn" type="button" disabled={c.vitals.hpCurrent >= d.hpMax.value}
      title={`Hned po boji (do 1 směny): léčí tolik životů, jaký je stupeň První pomoci (${rank}); ověření proti obtížnosti PJ`}
      onClick={() => replace(healBy(c, d, rank, 'První pomoc'))}>První pomoc +{rank}</button>
  );
}

// ---------------------------------------------------------------- stavy

function Stavy({ c, replace }: { c: Character; replace: (c: Character) => void }) {
  const bleed = bleedStacks(c);
  return (
    <Sheet>
      <Ribbon icon="skull">STAVY</Ribbon>
      <div className="cond">
        {CONDITIONS.map((k) => {
          const on = c.vitals.conditions.find((x) => x.id === k.id);
          return (
            <button key={k.id} type="button" aria-pressed={!!on} onClick={() => replace(toggleCondition(c, k.id))}>
              {k.name}{k.id === 'krvaceni' && bleed > 1 ? ` ×${bleed}` : ''}
              <small>
                {COND_TEXT[k.id] ?? k.short}
                {on?.rounds ? ` · ještě ${on.rounds} ${on.rounds === 1 ? 'kolo' : on.rounds < 5 ? 'kola' : 'kol'}` : ''}
                {on && CRITICAL_WOUNDS.has(k.id) ? ' · KRITICKÉ – první pomoc' : ''}
              </small>
            </button>
          );
        })}
      </div>
      {bleed > 0 && (
        <div className="steps" style={{ marginTop: 8, alignItems: 'center' }}>
          <span className="small">Krvácení (sčítá se):</span>
          <button className="btn" type="button" aria-label="méně krvácení" onClick={() => replace(setBleed(c, bleed - 1))}>−</button>
          <b className="tn">×{bleed}</b>
          <button className="btn" type="button" aria-label="další krvácení" onClick={() => replace(setBleed(c, bleed + 1))}>+</button>
        </div>
      )}
      <p className="small muted" style={{ margin: '8px 0 0' }}>
        Stavy na 3 kola se s „Novým kolem“ odpočítají samy, otřesení skončí po tvém tahu, povalení vztykem. Krvácení a zmrzačení jsou kritická
        zranění – bez První pomoci (obtížnost obvykle ~14), lektvaru či kouzla se nezahojí ani při plných životech (H17).
      </p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- bojové hodnoty

function BojoveHodnoty({ c, d, replace, say }: P) {
  const M = combatMods(c);
  const inCombat = !!c.play.combat;
  const defend = (label: string) => () => {
    if (!inCombat) return true;
    const why = canDefend(c, d);
    if (why) { say(`${why[0].toUpperCase()}${why.slice(1)} – bráníš se jen ZO ${d.defenseBase.value + M.zo}`); return false; }
    replace(takeDefense(c, d, label));
    return true;
  };
  const ocr = defenseVsRanged(d) + M.def;
  return (
    <Sheet>
      <Ribbon icon="sword">BOJOVÉ HODNOTY</Ribbon>
      <div className="trio">
        <Labeled label="Iniciativa k6">{(id) => <CalcField id={id} calc={d.initiativeBonus} label="Iniciativa (k6 +)" ovKey="initiativeBonus" />}</Labeled>
        <Labeled label="ZO">{(id) => <CalcField id={id} calc={d.defenseBase} label="Základní obrana" ovKey="defenseBase" warn={d.armorOverloaded} />}</Labeled>
        <Labeled label="Pohyblivost">{(id) => <CalcField id={id} calc={d.mobility} label="Pohyblivost" ovKey="mobility" />}</Labeled>
      </div>
      <div className="scroll-x">
        <table className="grid tn" style={{ marginTop: 12 }}>
          <thead><tr><th>Zbraň</th><th className="c">Útok</th><th className="c">Obrana</th><th className="c">Zran.</th></tr></thead>
          <tbody>
            {d.weapons.length === 0 && <tr><td colSpan={4} className="muted small">Beze zbraně – útočnost i obrana 0.</td></tr>}
            {d.weapons.map((w) => {
              const u = w.attackNumber + M.atk;
              const o = w.kind === 'melee' ? w.defenseNumber + M.def : ocr;
              return (
                <tr key={w.uid} className={w.uid === d.activeWeaponUid ? 'w-active' : ''}>
                  <td><b>{w.name}</b>{w.overloaded && <> <span className="pill bad">PŘETÍŽENÍ −5</span></>}{w.kind !== 'melee' && <> <span className="pill">{w.kind === 'ranged' ? 'STŘ.' : 'VRH.'}</span></>}</td>
                  <td className="c"><RollButton type="k6x" mod={u} label={`Útok – ${w.name}`}>{`ÚČ ${u}`}</RollButton></td>
                  <td className="c"><RollButton type="k6x" mod={o} label={`Obrana – ${w.name}`} onBefore={defend(`Obrana – ${w.name}`)}>{`OČ ${o}`}</RollButton></td>
                  <td className="c">+{w.damageTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="steps" style={{ marginTop: 8 }}>
        <RollButton type="k6" mod={d.initiativeBonus.value + M.init} label="Iniciativa">{`Iniciativa k6 ${sgn(d.initiativeBonus.value + M.init)}`}</RollButton>
        <RollButton type="k6x" mod={ocr} label="Obrana – proti střelbě" onBefore={defend('Obrana proti střelbě')}>{`Proti střelbě OČ ${ocr}`}</RollButton>
      </div>
      <p className="small muted" style={{ margin: '6px 0 0' }}>
        Zranění = (Útok − Obrana) + zranění zbraně. Šestky se přehazují a sčítají; 2 a více = kritický útok / obrana. Proti střelbě se nepočítá obrana zbraně, jen štít.
        {inCombat && ' V boji hod na obranu zabere krátkou akci (1× za kolo).'}
      </p>
    </Sheet>
  );
}

function Postihy({ c }: { c: Character }) {
  const M = combatMods(c);
  const others = c.vitals.conditions.filter((k) => !['omameni', 'oslabeni', 'oslepeni', 'zmrz_ruka'].includes(k.id));
  return (
    <Sheet>
      <Ribbon icon="star">AKTIVNÍ POSTIHY</Ribbon>
      {M.src.length || others.length ? (
        <ul className="log">
          {M.src.map(([a, b]) => <li key={a}><b>{a}</b><span>{b} · <i>v hodech</i></span></li>)}
          {others.map((k) => <li key={k.id}><b>{condName(k.id)}{k.stacks > 1 ? ` ×${k.stacks}` : ''}</b><span>{COND_TEXT[k.id] ?? ''}</span></li>)}
        </ul>
      ) : <p className="muted" style={{ margin: 0 }}>Žádné – postava je svěží a bez stavů.</p>}
      <p className="small muted" style={{ margin: '6px 0 0' }}>Únava, omámení, oslabení, oslepení, zmrzačená ruka a přesila se připočtou rovnou do tlačítek hodů. Zmrzačená noha a zpomalení upraví pohyblivost. Ostatní stavy jen připomínají.</p>
    </Sheet>
  );
}

function Zaznam({ c, replace }: { c: Character; replace: (c: Character) => void }) {
  const fmt = (iso: string) => { try { return new Date(iso).toLocaleTimeString('cs', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  return (
    <Sheet>
      <Ribbon icon="quill">ZÁZNAM</Ribbon>
      {c.play.log.length ? (
        <>
          <ul className="log">{c.play.log.slice(0, 12).map((l) => <li key={l.uid}><span>{l.text}</span><span className="muted small tn">{fmt(l.at)}</span></li>)}</ul>
          {c.play.undo.length > 0 && <button className="addrow" type="button" onClick={() => replace(undoPlay(c))}>↶ VRÁTIT POSLEDNÍ ({c.play.undo.length})</button>}
        </>
      ) : <p className="muted" style={{ margin: 0 }}>Zatím nic. Každá rychlá úprava se zapíše a jde vrátit.</p>}
    </Sheet>
  );
}

// ---------------------------------------------------------------- tah a kolo

function TahAKolo({ c, d, replace, say }: P) {
  const { roll } = useDice();
  const [surprised, setSurprised] = useState(false);
  const B = c.play.combat;
  if (!B) {
    return (
      <Sheet className="tah">
        <Ribbon icon="hourglass">TAH A KOLO</Ribbon>
        <div className="tah-idle">
          <p style={{ margin: 0, maxWidth: '62ch' }}>Pomocník pro <b>akce v boji</b>: hlídá, kolik ti v kole zbývá (1 dlouhá, nebo 2 krátké + okamžité), kdy máš ještě aktivní obranu a co ti zakazují stavy (H16).</p>
          <div className="steps" style={{ alignItems: 'center' }}>
            <label className="small"><input type="checkbox" checked={surprised} onChange={(e) => setSurprised(e.target.checked)} /> Byl jsem překvapen</label>
            <button className="btn dark" type="button" onClick={() => { replace(startCombat(c, surprised)); setSurprised(false); }}><Icon name="sword" />Začít boj</button>
          </div>
        </div>
      </Sheet>
    );
  }
  const x = turnCtx(c, d);
  const M = combatMods(c);
  const acts = turnActions(c, d, x);
  const mine = B.phase === 'turn';
  const lastK = mine && x.free === 1 && !B.defense;
  const R = roundInfo(c, d);
  const defLeft = R.def.unlimited ? Infinity : R.def.n - R.defUsed;
  const multi = R.atk.n > 1 || R.atk.parts.length > 0 || R.def.n > 1 || R.def.unlimited || R.bash;
  const atkWhy = attackWhy(c, d);
  const UC = d.attackNumber.value + M.atk;
  const doAttack = () => {
    const nth = R.atk.n > 1 ? ` ${R.atkUsed + 1}/${R.atk.n}` : '';
    replace(attack(c, d));
    roll('k6x', UC, `Útok${nth} (${UC})`);
  };
  const used = [...(B.defense ? ['OBRANA'] : []), ...B.turnLog.flatMap((l) => (l.len === 'D' ? ['DLOUHÁ', 'DLOUHÁ'] : l.len === 'K' ? ['KRÁTKÁ'] : []))];
  const slot = (i: number) => {
    const u = used[i];
    return <span className={`slot2 ${u ? 'used' : ''} ${u === 'OBRANA' ? 'def' : ''}`}>{u || 'KRÁTKÁ'}<small>{u ? 'použito' : 'volná'}</small></span>;
  };
  const ZO = d.defenseBase.value + M.zo;
  const OC = d.defenseNumber.value + M.def;
  const OCR = defenseVsRanged(d) + M.def;
  const bleed = bleedStacks(c);
  const fire = hasCond(c, 'zapaleni');
  const nDice = bleed + (fire ? 1 : 0);
  const defWhy = canDefend(c, d);
  const defend = (ranged: boolean) => {
    const v = ranged ? OCR : OC;
    replace(takeDefense(c, d, ranged ? 'Aktivní obrana proti střelbě' : 'Aktivní obrana'));
    roll('k6x', v, `Obrana – aktivní${ranged ? ' proti střelbě' : ''} (${v})`);
  };
  const act = (a: ActionDef, len: ActionLength) => replace(doAction(c, d, a.k, len));
  const inst: [string, string][] = [
    ['Okamžitý pohyb', `${x.frac(1 / 10)} sáhů, před nebo po akci, nedělitelný`],
    ['Mluvení', 'pár slov je součástí akce'],
    ...(x.reloadLen === 'O' && x.rangedName ? [['Nabití', `${x.rangedName} – okamžitě`] as [string, string]] : []),
    ...(x.drawLen === 'O' ? [['Tasení', 'lehká krátká zbraň – okamžitě'] as [string, string]] : []),
    ...(c.basic.classId === 'valecnik' ? [['Výkřik (trik)', '1× za kolo'], ['Soustředění (trik)', '1× za kolo, nekombinuje se s jinými triky']] as [string, string][] : []),
  ];
  const group = (g: ActionDef['g']) => (
    <div className="tah-g">
      <b className="lbl">{g}</b>
      <div className="tah-acts">
        {acts.filter((a) => a.g === g).map((a) => (
          <div className="tah-a" key={a.k}>
            <span className="tah-n">{a.n}<small>{a.h}</small></span>
            <span className="tah-l">
              {a.len.map((l) => {
                const why = whyNot(c, a, l, x);
                const warn = !why && l === 'K' && lastK && a.k !== 'vyckavani';
                return (
                  <button key={l} type="button" className={`btn len-${l}`} disabled={!!why}
                    title={why || (warn ? 'Poslední krátká akce – přijdeš o aktivní obranu v tomto kole' : undefined)}
                    onClick={() => act(a, l)}>{LEN_NAME[l]}{warn ? ' ⚠' : ''}</button>
                );
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <Sheet className="tah">
      <div className="ribbon-row">
        <Ribbon icon="hourglass">TAH A KOLO</Ribbon>
        <div className="steps" style={{ alignItems: 'center' }}>
          <span className="big tn" style={{ fontSize: 26 }}>{B.round}. kolo</span>
          <span className="pill tn">INICIATIVA {B.init ?? '—'}</span>
          {B.init == null && (
            <button className="btn" type="button" onClick={() => { const r = rollInitiative(c, d); replace(r.character); say(`Iniciativa: k6 ${r.roll} ${sgn(r.total - r.roll)} = ${r.total}`); }}>⚄ k6 {sgn(d.initiativeBonus.value + M.init)}</button>
          )}
          <label className="small" title="Vypravěč může nechat házet iniciativu každé kolo (H16)">
            <input type="checkbox" checked={B.reroll} onChange={(e) => replace(setCombat(c, { reroll: e.target.checked }))} /> každé kolo
          </label>
          <button className="btn" type="button" onClick={() => { const r = newRound(c); replace(r.character); if (r.ended.length) say(`Skončilo: ${r.ended.join(', ')}`); }}>Nové kolo</button>
          <button className="btn" type="button" onClick={() => { replace(endCombat(c)); if (c.basic.classId === 'valecnik') say('Adrenalin po boji ubývá 1 za kolo'); }}>Ukončit boj</button>
        </div>
      </div>
      <div className="tah-top">
        <div className="tah-budget">
          <div className="slots">{slot(0)}{slot(1)}</div>
          <div className="small muted">Za kolo: <b>1 dlouhá</b> nebo <b>2 krátké</b> + okamžité. Obrana je krátká akce 1× za kolo – ber ji i z tahu jiných.</div>
          {defLeft <= 0 ? <span className="pill">{R.def.n > 1 ? `VŠECH ${R.def.n} OBRAN POUŽITO` : 'OBRANA UŽ POUŽITA'} – DALŠÍ ÚTOKY JEN ZO {ZO}</span>
            : B.defense ? <span className="pill ok">JEŠTĚ {R.def.unlimited ? 'NEOMEZENĚ OBRAN' : `${defLeft} ${defLeft === 1 ? 'OBRANA' : 'OBRANY'}`} (BEZ DALŠÍ AKCE) · OČ {OC} + k6</span>
            : x.free < 1 ? <span className="pill bad">BEZ KRÁTKÉ AKCE – BRÁNÍŠ SE JEN ZO {ZO}</span>
            : x.stunned || x.surprised || x.out ? <span className="pill bad">JEN ZO {ZO}</span>
            : <span className="pill ok">AKTIVNÍ OBRANA PŘIPRAVENA · OČ {OC} + k6</span>}
          <div className="stepper small" style={{ gap: 6 }}>
            <span className="lbl">Útočí na tebe</span>
            <button className="btn" type="button" aria-label="méně útočníků" disabled={B.foes <= 1} onClick={() => replace(setCombat(c, { foes: B.foes - 1 }))}>−</button>
            <b className="tn">{B.foes}</b>
            <button className="btn" type="button" aria-label="více útočníků" onClick={() => replace(setCombat(c, { foes: B.foes + 1 }))}>+</button>
            {B.foes > 1 && <span className="pill bad">OBRANA −{Math.min(3, B.foes)}</span>}
          </div>
          {multi && (
            <div className="small tah-count">
              <b>V tomto kole:</b> útoky <b className="tn">{R.atkUsed}/{R.atk.n}</b>{R.atk.parts.length > 0 && <span className="muted"> ({R.atk.parts.join(', ')})</span>}
              {' · '}obrany <b className="tn">{R.defUsed}/{R.def.unlimited ? '∞' : R.def.n}</b>{R.def.parts.length > 0 && <span className="muted"> ({R.def.parts.join(', ')})</span>}
              {R.bash && <> · <b>útok štítem</b> (Boj štítem – po použití jedno kolo nic)</>}
            </div>
          )}
          {M.src.length > 0 && <div className="small"><b>Započítáno do hodů:</b> {M.src.map(([a, b]) => <span key={a}>{a} <span className="muted">({b})</span> · </span>)}</div>}
        </div>
        <div className="tah-turn">
          {mine ? (
            <>
              <b className="lbl" style={{ color: 'var(--ink)' }}>Tvůj tah</b>
              {nDice > 0 && (
                <div className="warnbar" style={{ margin: '6px 0' }}>
                  Na začátku tahu: {bleed > 0 && <><b>Krvácení{bleed > 1 ? ` ×${bleed}` : ''}</b> {bleed}k6 </>}{fire && <><b>Zapálení</b> k6 ohněm </>}
                  <button className="btn wine" type="button" onClick={() => { const r = turnEffects(c); replace(r.character); say(`Krvácení/oheň: −${r.lost} životů (${r.faces.join('+')})`); }}>⚄ Hodit {nDice}k6 a odečíst</button>
                </div>
              )}
              {hasCond(c, 'otrava') && <p className="small" style={{ margin: '4px 0' }}>Otrava: zranění podle jedu – odečti v Životech.</p>}
              {x.out && <p className="small" style={{ color: 'var(--blood)', margin: '4px 0' }}>Bezvědomí: žádná akce, nemůžeš se bránit.</p>}
              {x.surprised && <p className="small" style={{ color: 'var(--blood)', margin: '4px 0' }}>Překvapení: v 1. kole nemáš žádnou akci, bráníš se jen ZO.</p>}
              {x.stunned && <p className="small" style={{ color: 'var(--blood)', margin: '4px 0' }}>{hasCond(c, 'paralyza') ? 'Paralýza' : 'Otřesení'}: tento tah nemůžeš nic dělat.</p>}
              {hasCond(c, 'povaleni') && <p className="small" style={{ margin: '4px 0' }}>Ležíš: vztyk po povalení je <b>dlouhá</b> akce.</p>}
              <div className="steps" style={{ margin: '6px 0' }}>
                <button className={`btn ${atkWhy ? '' : 'dark'}`} type="button" disabled={!!atkWhy} title={atkWhy || (B.attack ? 'Další útok v rámci akce Útok – bez další akce' : 'Útok (krátká akce) a hod ÚČ + k6')} onClick={doAttack}>
                  ⚄ {B.attack ? 'Další útok' : 'Útok'}{R.atk.n > 1 ? ` ${Math.min(R.atk.n, R.atkUsed + 1)}/${R.atk.n}` : ''} · ÚČ {UC} + k6
                </button>
                {R.bash && (
                  <button className="btn" type="button" title="Boj štítem (Rytíř): dodatečný útok štítem každé druhé kolo – Útočnost = kvalita štítu, Zranění 0"
                    onClick={() => { replace(shieldBash(c, d)); roll('k6x', shieldBashAttack(d) + M.atk, `Útok štítem (${shieldBashAttack(d) + M.atk}, zranění 0)`); }}>
                    ⚄ Útok štítem · {shieldBashAttack(d) + M.atk} + k6
                  </button>
                )}
                {atkWhy && B.attack && <span className="small muted">{atkWhy}</span>}
              </div>
              <ul className="log" style={{ maxHeight: 110 }}>
                {B.turnLog.length ? B.turnLog.map((l, i) => <li key={i}><span>{l.n}</span><b>{l.atk && l.len === 'O' ? 'v rámci útoku' : LEN_NAME[l.len]}</b></li>) : <li className="muted">zatím nic</li>}
              </ul>
              <div className="steps" style={{ marginTop: 6 }}>
                {B.turnLog.length > 0 && <button className="btn" type="button" onClick={() => replace(undoAction(c))}>↶ Vrátit akci</button>}
                <button className="btn dark" type="button" onClick={() => { const r = endTurn(c); replace(r.character); if (r.notes.length) say(r.notes.join(' · ')); else if (x.free < 1 && !B.defense) say(`Do konce kola se bráníš jen ZO ${ZO}`); }}>
                  Konec tahu{c.basic.classId === 'valecnik' && !adrenalinAtStart(c) ? ` (+${adrenalinGain(c, B.round)} adrenalin)` : ''}
                </button>
              </div>
            </>
          ) : (
            <>
              <b className="lbl">{B.phase === 'done' ? 'Tah odehrán – do nového kola se jen bráníš' : 'Čekáš na svůj tah'}</b>
              <div className="steps" style={{ marginTop: 6 }}>
                {B.phase !== 'done' && <button className="btn dark" type="button" onClick={() => replace(myTurn(c))}>▶ Můj tah</button>}
                <button className="btn wine" type="button" disabled={!!defWhy} title={defWhy || (B.defense ? 'Další aktivní obrana – bez další akce' : 'Útočí na tebe – aktivní obrana (krátká akce), OČ + k6')} onClick={() => defend(false)}>⚄ Bráním se{R.def.n > 1 && !R.def.unlimited ? ` ${Math.min(R.def.n, R.defUsed + 1)}/${R.def.n}` : ''} · OČ {OC} + k6</button>
                <button className="btn" type="button" disabled={!!defWhy} title={defWhy || 'Proti střelbě se nepočítá obrana zbraně, jen štít (H16)'} onClick={() => defend(true)}>⚄ Proti střelbě · {OCR} + k6</button>
              </div>
              <p className="small muted" style={{ margin: '6px 0 0' }}>Aktivní obrana stojí krátkou akci z tohoto kola. Když ji použiješ dřív, než jsi na tahu, zbude ti ve tahu jen 1 krátká.</p>
            </>
          )}
        </div>
      </div>
      {mine && (
        <div className="tah-grid">
          {group('Bojové')}{group('Pohybové')}{group('Ostatní')}
          <div className="tah-g">
            <b className="lbl">Okamžité (nic nestojí)</b>
            <ul className="log">{inst.map(([a, b]) => <li key={a}><b>{a}</b><span className="small">{b}</span></li>)}</ul>
          </div>
        </div>
      )}
      {c.basic.classId === 'valecnik' && <ValecnikBoj c={c} d={d} replace={replace} say={say} />}
      {c.basic.classId === 'kouzelnik' && <KouzelnikBoj c={c} d={d} replace={replace} say={say} />}
      {c.basic.classId === 'klerik' && <KlerikBoj c={c} d={d} replace={replace} say={say} />}
      {c.basic.classId === 'zlodej' && <ZlodejBoj c={c} d={d} replace={replace} say={say} />}
      <Magie c={c} d={d} replace={replace} say={say} />
    </Sheet>
  );
}

// ---------------------------------------------------------------- kouzla, prosby, triky

function Magie({ c, d, replace, say }: P) {
  const { roll } = useDice();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const B = c.play.combat!;
  const spells = knownSpells(c);
  const tricks = knownTricks(c);
  if (!spells.length && !tricks.length) return null;
  const cls = getClass(c.basic.classId);
  const en = cls.energyName ?? 'Mana';
  const war = c.basic.classId === 'valecnik';
  const title = { kouzelnik: 'POUŽÍT KOUZLO', hranicar: 'POUŽÍT KOUZLO', klerik: 'VZÝVAT PROSBU', valecnik: 'POUŽÍT BOJOVÝ TRIK' }[c.basic.classId as string] ?? 'POUŽÍT SCHOPNOST';
  const cast = castBonus(c, d);
  const checkRoll = (s: SpellDef, price?: number) => {
    const k = spellCheck(c, d, s);
    const dc = s.dcAdj && price != null ? s.dcAdj(price) : s.o;
    roll('k10', k.bonus, `${s.n} – obtížnost ${dc ?? 'určí PJ'}${k.parts.length ? ` (${k.parts.join(', ')})` : ''}`);
  };
  const M = combatMods(c);

  const spellRow = (s: SpellDef) => {
    const base = spellCost(s, c.progression.level);
    const min = s.units?.min ?? 1;
    const price = base.variable ? Math.max(min, prices[s.n] ?? base.v) : base.v;
    const dc = s.dcAdj ? s.dcAdj(price) : s.o;
    const final = s.adj ? s.adj(price) : price;
    const why = spellWhy(c, d, s, price);
    const multi = lenRounds(s.l) > 1;
    const len = s.l === 'M' ? 'M' : multi ? 'D' : s.l;
    return (
      <tr key={s.n}>
        <td><b>{s.n}</b>{s.x && <div className="small muted">{s.x}</div>}</td>
        <td><span className={`pill len-${len}`}>{lenText(s.l).toUpperCase()}</span></td>
        <td className="c tn">
          {base.variable
            ? <input className="field num tn sp-cost" type="number" min={min} value={price} aria-label={s.units ? `${s.units.label} – ${s.n}` : `Cena – ${s.n}`} onChange={(e) => setPrices((p) => ({ ...p, [s.n]: Math.max(min, Math.trunc(Number(e.target.value)) || min) }))} />
            : s.units ? null : price}
          <div className="small muted">{s.units ? `${s.units.label} · ` : ''}{s.c}{final !== price || s.units ? ` → ${final}` : ''}</div>
        </td>
        <td className="c tn">{dc == null ? 'PJ' : dc || '–'}</td>
        <td style={{ textAlign: 'right' }}>
          <button className={`btn ${why ? '' : 'dark'}`} type="button" disabled={!!why} title={why || undefined}
            onClick={() => { const r = castSpell(c, d, s, price); replace(r.character); if (r.rollNow || (s.dcAdj && !multi && s.l !== 'M')) checkRoll(s, price); else if (multi) say(`${s.n}: sesílání začalo`); }}>
            {multi ? 'Začít' : 'Použít'}
          </button>
          {why && <div className="small muted">{why}</div>}
        </td>
      </tr>
    );
  };
  const trickRow = (t: (typeof tricks)[number]) => {
    const price = trickPrice(c, t, prices[t.n]);
    const why = trickWhy(c, d, t, price);
    const sac = why ? null : sacrificeFor(c, price);
    return (
      <tr key={t.n}>
        <td><b>{t.n}</b><div className="small muted">{t.x}</div>{t.check && t.check !== '-' && <div className="small">Ověření: {t.check}</div>}</td>
        <td><span className="pill">{TRICK_TYPE[t.t].toUpperCase()}{t.extra ? ' +' : ''}</span><div className="small muted">{t.use}</div></td>
        <td className="c tn">
          {t.var
            ? <input className="field num tn sp-cost" type="number" min={t.a} value={Math.max(t.a, prices[t.n] ?? t.a)} aria-label={`Adrenalin – ${t.n}`} onChange={(e) => setPrices((p) => ({ ...p, [t.n]: Math.max(t.a, Math.trunc(Number(e.target.value)) || t.a) }))} />
            : price}
          {(t.var || price !== t.a) && <div className="small muted">{t.adr}{price !== (t.var ? Math.max(t.a, prices[t.n] ?? t.a) : t.a) ? ' · Rutina −1' : ''}</div>}
          {sac && sac.missing > 0 && <div className="small bad-t">Sebeobětování: −{sac.hp} životů</div>}
        </td>
        <td />
        <td style={{ textAlign: 'right' }}>
          <button className={`btn ${why ? '' : 'dark'}`} type="button" disabled={!!why} title={why || undefined}
            onClick={() => {
              const r = applyTrick(c, d, t, price);
              replace(r.character);
              if (r.roll === 'attack') roll('k6x', d.attackNumber.value + M.atk, `Útok – ${t.n}`);
              if (r.roll === 'defense') roll('k6x', d.defenseNumber.value + M.def, `Obrana – ${t.n}`);
            }}>Použít</button>
          {why && <div className="small muted">{why}</div>}
        </td>
      </tr>
    );
  };
  return (
    <div className="tah-sp">
      <div className="ribbon-row"><b className="lbl" style={{ color: 'var(--ink)' }}>{title}</b><span className="small tn">{en}: <b>{c.vitals.manaCurrent}</b></span></div>
      {B.channel && (
        <div className="warnbar" style={{ margin: '0 0 8px' }}>
          Sesíláš <b>{B.channel.n}</b> – zbývá {B.channel.left} {B.channel.left === 1 ? 'dlouhá akce' : 'dlouhé akce'}.
          {B.phase === 'turn' && (
            <button className="btn dark" type="button" disabled={turnCtx(c, d).free < 2} title={turnCtx(c, d).free < 2 ? 'Potřebuješ celou dlouhou akci' : undefined}
              onClick={() => { const s = spells.find((q) => q.n === B.channel!.n); const r = continueChannel(c); replace(r.character); if (r.done && s) { say('Sesílání dokončeno – hoď ověření'); if (s.o || s.dcAdj) checkRoll(s, prices[s.n]); } }}>Pokračovat (dlouhá)</button>
          )}
          <button className="btn" type="button" onClick={() => replace(stopChannel(c))}>Přerušit</button>
        </div>
      )}
      <div className="scroll-x">
        <table className="grid tn sp-table">
          <thead><tr><th>{war ? 'Trik' : c.basic.classId === 'klerik' ? 'Prosba' : 'Kouzlo'}</th><th>Akce</th><th className="c">{war ? 'Adrenalin' : 'Cena'}</th><th className="c">{war ? '' : 'Obtížnost'}</th><th /></tr></thead>
          <tbody>{spells.map(spellRow)}{tricks.map(trickRow)}</tbody>
        </table>
      </div>
      <p className="small muted" style={{ margin: '6px 0 0' }}>
        {war
          ? 'Trik se provádí v rámci akce: „s útokem“ zabere tvůj Útok, „s obranou“ aktivní obranu (se znaménkem + jde o Dodatečný útok / obranu, akci nezabere), soustředění a výkřik jsou 1× za kolo, reakce kdykoli. Adrenalin se odečte hned. Plné znění triků je na záložce Válečník.'
          : `Kouzla na víc dlouhých akcí se sesílají přes několik kol (efekt na konci). Po použití appka odečte ${en.toLowerCase()} a hodí ověření 1k10 ${sgn(cast.bonus)} (${cast.skill}) proti obtížnosti. Jen 1 ${c.basic.classId === 'klerik' ? 'prosba' : 'kouzlo'} za tah (kromě reakcí).${c.basic.classId === 'klerik' ? ' U proseb s proměnnou cenou zadáš počet (slov, úderů, kol, X…) – Přízeň i obtížnost se dopočítají. Plné znění proseb je na záložce Klerik.' : ' Plné znění kouzel je na záložce povolání.'}${c.basic.classId === 'kouzelnik' ? ' Délka, obtížnost i ověření už zahrnují volby sesílání (panel Kouzelník v boji).' : ''}`}
      </p>
    </div>
  );
}
