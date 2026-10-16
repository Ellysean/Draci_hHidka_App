// Válečník v boji (7b.2): Vražedná zuřivost a Cesta krve (Berserkr), Cesta strategie, Velení, Bojové rozkazy
// a Sebeobětování (Rytíř), Nával adrenalinu. Panel na záložce BOJ A STAVY pod hlídáním akcí (H08, PPP01).
import { useState } from 'react';
import type { Character } from '../model/types';
import {
  activeStrategy, bloodRush, bloodRushWhy, bloodWound, declareStrategy, furyCheck, furyTrap, furyWhy, giveOrder, orderWhy,
  setCommand, startFury, strategyWhy, willBonus,
} from '../rules/combat';
import { sgn, type Derived } from '../rules/derive';
import { BATTLE_ORDERS, commandBonus, furyOn, hasAbility, pathRank, strategyOptions, strategyRounds } from '../rules/valecnik';

type P = { c: Character; d: Derived; replace: (c: Character) => void; say: (s: string) => void };

export function ValecnikBoj({ c, d, replace, say }: P) {
  const [wound, setWound] = useState(10);
  const B = c.play.combat;
  if (!B) return null;
  const W = B.war ?? {};
  const has = (id: string) => hasAbility(c, id);
  const strat = strategyOptions(c);
  const show = has('vrazedna_zurivost') || has('cesta_krve') || strat.length > 0 || has('veleni') || has('bojove_rozkazy') || has('sebeobetovani') || has('naval_adrenalinu');
  if (!show) return null;
  const f = W.fury;
  const st = activeStrategy(c);
  const sacReady = W.sacrificeReady ?? 0;
  return (
    <div className="tah-sp va-boj">
      <b className="lbl" style={{ color: 'var(--ink)' }}>VÁLEČNÍK V BOJI</b>
      <div className="va-boj-grid">
        {has('vrazedna_zurivost') && (
          <div className="va-box">
            <b>Vražedná zuřivost</b>
            {!f ? (
              <>
                <span className="small muted">1× za boj. Přerod trvá kolo, pak +2 adrenalinu za kolo, +1 Útok, Hranice smrti = −max. životů (−{d.hpMax.value}).</span>
                <button className="btn wine" type="button" disabled={!!furyWhy(c)} title={furyWhy(c) || undefined} onClick={() => replace(startFury(c))}>Propadnout zuřivosti</button>
              </>
            ) : f.active ? (
              <>
                <span className={`pill ${f.mad ? 'bad' : 'ok'}`}>{furyOn(c) ? (f.mad ? 'ŠÍLENSTVÍ – ÚTOČÍ NA NEJBLIŽŠÍHO' : 'ZUŘIVOST ÚČINKUJE') : 'PŘEROD – ÚČINKY OD PŘÍŠTÍHO KOLA'}</span>
                {f.check ? (
                  <button className="btn dark" type="button"
                    onClick={() => { const r = furyCheck(c, d); replace(r.character); say(r.freed ? `Vůle ${r.total} > ${r.trap} – Berserkr se vymanil ze zuřivosti` : `Vůle ${r.total} ≤ ${r.trap} – šílenství, zuřivost pokračuje`); }}>
                    ⚄ Past Vůle vs. {furyTrap(c)} (k10 {sgn(willBonus(d))})
                  </button>
                ) : furyOn(c) && <span className="small muted">Na konci kola (Nové kolo) se hází past Vůle vs. {Math.max(2, B.round - f.start + 1)}; vymaní se jen výsledek nad pastí.</span>}
              </>
            ) : <span className="small muted">Skončila v {f.ended}. kole. Pod Hranicí smrti: 1 adrenalin = odklad smrti o 1 kolo (v Životech).</span>}
          </div>
        )}
        {has('cesta_krve') && (
          <div className="va-box">
            <b>Cesta krve</b>
            <button className="btn wine" type="button" disabled={!!bloodRushWhy(c)} title={bloodRushWhy(c) || 'Nabuzení na začátku boje: 1k6 zranění sobě, +1 adrenalin za každý život'}
              onClick={() => { const r = bloodRush(c); replace(r.character); if (r.n) say(`Nabuzení: −${r.n} životů, +${r.n} adrenalin`); }}>⚄ Nabuzení 1k6{W.bloodRush ? ' ✔' : ''}</button>
            <span className="small muted">Vzdal ses obrany a nechal se zranit – za každých načatých 10 bodů +1k6 adrenalinu:</span>
            <div className="steps">
              <input className="field num tn" type="number" min={1} value={wound} aria-label="Utržené zranění" onChange={(e) => setWound(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} />
              <button className="btn wine" type="button" onClick={() => { const r = bloodWound(c, wound); replace(r.character); say(`Cesta krve: −${wound} životů, +${r.gain} adrenalin (${r.faces.join('+')})`); }}>Zranění bez obrany (+{Math.ceil(wound / 10)}k6)</button>
            </div>
          </div>
        )}
        {strat.length > 0 && (
          <div className="va-box">
            <b>Cesta strategie {['', 'I', 'II', 'III', 'IV'][pathRank(c, 'cesta_strategie')]}</b>
            {W.strategy ? (
              <span className={`pill ${st ? 'ok' : ''}`}>
                {W.strategy.kind === 'utok' ? 'ÚTOČNÁ' : 'OBRANNÁ'} +{W.strategy.bonus} · {W.strategy.to == null ? 'celý boj' : `kola ${W.strategy.from}–${W.strategy.to}`}{st ? '' : B.round < W.strategy.from ? ' · ještě ne' : ' · vypršela'}
              </span>
            ) : (
              <>
                <span className="small muted">Pokyny družině = dlouhá akce (před bojem hned), platí {strategyRounds(c)} kola pro válečníka i družinu; 1× za souboj. Obranná navíc + k Reflexu.</span>
                <div className="steps">
                  {strat.map((o) => (
                    <button key={o.kind} className="btn" type="button" disabled={!!strategyWhy(c)} title={strategyWhy(c) || undefined} onClick={() => replace(declareStrategy(c, o.kind))}>{o.label}</button>
                  ))}
                  {pathRank(c, 'cesta_strategie') >= 4 && strat.map((o) => (
                    <button key={`m${o.kind}`} className="btn" type="button" disabled={!!strategyWhy(c, true)} title={strategyWhy(c, true) || 'Strategie na místo: příprava 1 hodina, platí celý boj'}
                      onClick={() => replace(declareStrategy(c, o.kind, true))}>{o.kind === 'utok' ? 'Útočná' : 'Obranná'} na místo (celý boj)</button>
                  ))}
                </div>
              </>
            )}
            <span className="small muted">Strategie na skupinu (III.): bonusy rozdělené členům – zapiš ručně. Prodloužení: trik Přeskupení.</span>
          </div>
        )}
        {has('veleni') && (
          <div className="va-box">
            <b>Velení – rozkaz družině</b>
            <div className="chips">
              {([[null, 'Žádný'], ['utok', `Útočný +${commandBonus(c)} ÚČ`], ['obrana', `Obranný +${commandBonus(c)} OČ`]] as const).map(([v, l]) => (
                <button key={l} type="button" className="chip" aria-pressed={(W.command ?? null) === v} onClick={() => (W.command ?? null) !== v && replace(setCommand(c, v))}>{l}</button>
              ))}
            </div>
            <span className="small muted">Platí pro ty, kdo rozkaz poslechnou, do odvolání; měnit jde každé kolo.</span>
          </div>
        )}
        {has('bojove_rozkazy') && (
          <div className="va-box">
            <b>Bojové rozkazy {W.order ? <span className="pill">{W.order}</span> : null}</b>
            <div className="chips">
              {BATTLE_ORDERS.map(([o, h]) => (
                <button key={o} type="button" className="chip" aria-pressed={W.order === o} disabled={!!orderWhy(c) && W.order !== o} title={orderWhy(c) || h} onClick={() => replace(giveOrder(c, o))}>{o}<small> {h}</small></button>
              ))}
            </div>
            <span className="small muted">1 rozkaz za kolo jedné inteligentní bytosti; ne v kole s trikem typu Výkřik.</span>
          </div>
        )}
        {has('sebeobetovani') && (
          <div className="va-box">
            <b>Sebeobětování</b>
            <span className="small">{sacReady > B.round ? `Znovu až v ${sacReady}. kole.` : 'Připraveno: chybějící adrenalin na trik zaplatíš dvojnásobkem životů (nabídne se u triku).'}</span>
          </div>
        )}
        {has('naval_adrenalinu') && (
          <div className="va-box">
            <b>Nával adrenalinu</b>
            <span className="small muted">Adrenalin přibývá na začátku kola (Nové kolo, začátek boje), ne na konci tahu.</span>
          </div>
        )}
      </div>
    </div>
  );
}
