// Klerik v boji (7d): volby vzývání (souvěrec, bez odříkání, vyrušení, posvátné místo, cizí symbol, Mnohoprosby, temná alternativa),
// aktivní prosby na klerikovi (aury, Štít víry s bariérou, Andělská zbroj, Božská pomoc…), přivolaný posel, Zvolání,
// hody léčení a zranění proseb (Dar života), Požehnání. Panel na záložce BOJ A STAVY pod hlídáním akcí.
import { useState } from 'react';
import type { Character, ClericCastMods } from '../model/types';
import { castBonus } from '../rules/combat';
import { sgn, type Derived } from '../rules/derive';
import { rollExploding } from '../rules/dice';
import { activePrayers, callWhy, cle, darZivota, hasAbility, knownPrayers, multiN, prayerCheckBonus } from '../rules/klerik';
import { blessing, call, dismissMessenger, healSelf, hitBarrier, removeActive, rollDamage, rollHeal, setCleric, setMessenger, setMods } from '../rules/klerik-akce';
import { useDice } from '../ui/Dice';

type P = { c: Character; d: Derived; replace: (c: Character) => void; say: (s: string) => void };

export function KlerikBoj({ c, d, replace, say }: P) {
  const { roll } = useDice();
  const [barrierHit, setBarrierHit] = useState(3);
  const [fxId, setFxId] = useState('');
  const [fxUnits, setFxUnits] = useState(1);
  const [callName, setCallName] = useState('');
  const [lastHeal, setLastHeal] = useState<number | null>(null);
  const B = c.play.combat;
  if (!B) return null;
  const S = cle(c);
  const has = (id: string) => hasAbility(c, id);
  const chk = prayerCheckBonus(c);
  const cast = castBonus(c, d);
  const known = knownPrayers(c);
  const fxList = known.filter((p) => p.typ === 'prosba' && (p.fx?.heal || p.fx?.damage));
  const fxP = fxList.find((p) => p.id === fxId) ?? fxList[0];
  const act = activePrayers(c);
  const M = S.messenger;
  const cw = callWhy(c);
  return (
    <div className="tah-sp va-boj">
      <b className="lbl" style={{ color: 'var(--ink)' }}>KLERIK V BOJI</b>
      <ClericCastOptions c={c} replace={replace} />
      <p className="small muted" style={{ margin: '4px 0 0' }}>
        Ověření Prosby: {sgn(cast.bonus + chk.bonus)}{chk.parts.length ? ` (${chk.parts.join(', ')})` : ''}{S.offering ? ' · Oběť: příští prosba −10 obtížnost' : ''}
        {multiN(c) > 1 ? ` · Mnohoprosby: ${multiN(c)}× – každá další +5 obtížnost a +2 Přízeň` : ''}
      </p>
      <div className="va-boj-grid">
        <div className="va-box">
          <b>Působí na mně</b>
          {act.length === 0 && <span className="small muted">Štít víry, aury, Andělská zbroj, Kladivo na čarodějnice, Božská pomoc… se zapíšou po vzývání (bonusy jdou rovnou do ZO, ÚČ a OČ).</span>}
          {act.map((a) => (
            <span key={a.uid} className="small">
              {a.name}{a.zo ? ` ZO +${a.zo}` : ''}{a.atk ? ` ÚČ +${a.atk}` : ''}{a.def ? ` OČ +${a.def}` : ''}{a.dr ? ` · pohltí ${a.dr} zranění za kolo` : ''}
              {a.barrier != null ? ` · bariéra ${a.barrier}` : ''}{a.tempHp ? ` · +${a.tempHp} životů dočasně` : ''}{a.note ? ` · ${a.note}` : ''}{a.until != null ? ` · do ${a.until}. kola` : ''}{' '}
              <button type="button" className="fpop-x" aria-label={`Ukončit ${a.name}`} onClick={() => replace(removeActive(c, a.uid))}>×</button>
            </span>
          ))}
          {act.some((a) => a.barrier) && (
            <div className="steps">
              <input className="field num tn" type="number" min={1} value={barrierHit} onChange={(e) => setBarrierHit(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} aria-label="Zranění do bariéry" />
              <button className="btn" type="button" onClick={() => replace(hitBarrier(c, barrierHit))}>Zásah −{barrierHit} (nejdřív bariéra)</button>
            </div>
          )}
        </div>
        {fxP && (
          <div className="va-box">
            <b>Léčení a zranění proseb</b>
            <span className="small muted">Hod po úspěšném vzývání.{darZivota(c) ? ' Dar života: léčení +¼ (min. +1).' : ''}</span>
            <div className="steps">
              <select className="field" value={fxP.id} onChange={(e) => setFxId(e.target.value)} aria-label="Prosba">
                {fxList.map((p) => <option key={p.id} value={p.id}>{p.nazev} ({p.fx?.heal ?? p.fx?.damage}{p.fx?.perUnit ? ' ×' : ''})</option>)}
              </select>
              {fxP.fx?.perUnit && <input className="field num tn" type="number" min={1} value={fxUnits} onChange={(e) => setFxUnits(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} aria-label="Počet" />}
              <button className="btn dark" type="button" onClick={() => {
                if (fxP.fx?.heal) { const r = rollHeal(c, fxP, fxUnits)!; setLastHeal(r.total); say(`${fxP.nazev}: ${r.faces.join('+')} = ${r.base}${r.bonus ? ` + ${r.bonus} Dar života` : ''} → léčí ${r.total}`); }
                else { const r = rollDamage(fxP, fxUnits)!; setLastHeal(null); say(`${fxP.nazev}: zranění ${r.total} (${r.faces.join('+')})${fxP.fx?.half ? ` – ${fxP.fx.half}` : ''}`); }
              }}>⚄ Hodit</button>
              {lastHeal != null && <button className="btn" type="button" onClick={() => { replace(healSelf(c, d, lastHeal, fxP.nazev)); setLastHeal(null); }}>Na sebe +{lastHeal}</button>}
            </div>
          </div>
        )}
        {M && (
          <div className="va-box">
            <b>{M.name} ({M.level}. úr.)</b>
            <span className="small">Životy <input className="field num tn" type="number" value={M.hp} style={{ width: 56 }} aria-label="Životy posla" onChange={(e) => replace(setMessenger(c, { hp: Math.trunc(Number(e.target.value)) || 0 }))} /> / {M.hpMax}
              {' '}· ZO {M.zo} · OČ {M.oc}{M.uc != null ? ` · ÚČ ${M.uc}/+${M.dmg ?? 0}` : ''} · Vyšší moc {M.higher}{M.until != null ? ` · do ${M.until}. kola` : ''}</span>
            <span className="small muted">{M.note}</span>
            <div className="steps">
              {M.uc != null && <button className="btn" type="button" onClick={() => { const r = rollExploding(); say(`${M.name} – útok: ${M.uc} + ${r.faces.join('+')} = ${M.uc! + r.sum}${r.sixes >= 2 ? ' · kritický' : ''}`); }}>⚄ Útok {M.uc}</button>}
              <button className="btn" type="button" onClick={() => { const r = rollExploding(); say(`${M.name} – obrana: ${M.oc} + ${r.faces.join('+')} = ${M.oc + r.sum}`); }}>⚄ Obrana {M.oc}</button>
              <button className="btn" type="button" onClick={() => replace(dismissMessenger(c))}>Odvolat</button>
            </div>
          </div>
        )}
        <div className="va-box">
          <b>Zvolání</b>
          <span className="small muted">V nejvyšší nouzi (posoudí PJ): okamžitě, kdykoli, i bez Přízně. 1× za úroveň{cw ? ' – na této úrovni už použito' : ''}.</span>
          <div className="steps">
            <select className="field" value={callName} onChange={(e) => setCallName(e.target.value)} aria-label="Prosba pro Zvolání">
              <option value="">– prosba –</option>
              {known.filter((p) => p.typ === 'prosba').map((p) => <option key={p.id} value={p.nazev}>{p.nazev}</option>)}
            </select>
            <button className="btn wine" type="button" disabled={!!cw} title={cw || undefined} onClick={() => { replace(call(c, callName, true)); roll('k10', cast.bonus + chk.bonus, `Zvolání – ${callName || 'prosba'} (PJ rozhodne o vyslyšení)`); }}>Vyslyšeno</button>
            <button className="btn" type="button" disabled={!!cw} title={cw || undefined} onClick={() => replace(call(c, callName, false))}>Nevyslyšeno</button>
          </div>
        </div>
        {has('pozehnani') && (
          <div className="va-box">
            <b>Požehnání</b>
            <span className="small muted">1× denně po ověřovacím či bojovém hodu: hoď znovu a vyber lepší.</span>
            <button className="btn" type="button" disabled={S.blessingUsed} title={S.blessingUsed ? 'dnes už použito' : undefined} onClick={() => replace(blessing(c))}>Použít Požehnání</button>
          </div>
        )}
        {has('fanatismus') && <div className="va-box"><b>Fanatismus</b><span className="small muted">{c.progression.level >= 12 ? '2 útoky každé kolo' : '3 útoky za 2 kola (liché kolo 2, sudé 1)'} – počítá hlídání akcí.</span></div>}
        {has('inkvizitorsky_vycvik') && <div className="va-box"><b>Inkvizitorský výcvik</b><span className="small muted">Pod Mezí vyřazení neupadá do bezvědomí – jedná až do smrti.</span></div>}
      </div>
    </div>
  );
}

/** Volby vzývání (H13, PPP06) – sdílí panel v boji i záložka Víra. */
export function ClericCastOptions({ c, replace }: { c: Character; replace: (c: Character) => void }) {
  const S = cle(c);
  const m = S.mods;
  const has = (id: string) => hasAbility(c, id);
  const set = (patch: Partial<ClericCastMods>) => replace(setMods(c, patch));
  const tog = (k: 'coBeliever' | 'silent' | 'disturbed' | 'foreignSymbol' | 'dark', label: string) =>
    <button key={k} type="button" className="chip" aria-pressed={!!m[k]} onClick={() => set({ [k]: !m[k] })}>{label}</button>;
  return (
    <div className="chips" style={{ marginTop: 6 }}>
      {has('posvatny_symbol') && (
        <button type="button" className="chip" aria-pressed={S.symbolInHand} onClick={() => replace(setCleric(c, { symbolInHand: !S.symbolInHand }))}>
          Symbol v ruce +{c.progression.level >= 6 ? 3 : 2}
        </button>
      )}
      {tog('coBeliever', 'Na souvěrce −1 Přízeň')}
      {tog('silent', 'Bez odříkání −5')}
      {tog('disturbed', 'Vyrušen −5')}
      {(['none', 'own', 'foreign'] as const).map((p) => (
        <button key={p} type="button" className="chip" aria-pressed={m.place === p} onClick={() => set({ place: p })}>
          {p === 'none' ? 'Běžné místo' : p === 'own' ? 'Posvátné místo +5' : 'Místo cizího boha −5'}
        </button>
      ))}
      {tog('foreignSymbol', 'Symbol jiného boha −5')}
      {tog('dark', 'Temná alternativa')}
      {has('mnohoprosby') && (
        <label className="chip">Mnohoprosby ×
          <input className="field num tn" type="number" min={1} max={9} value={multiN(c)} style={{ width: 44, marginLeft: 4 }} aria-label="Počet stejných proseb"
            onChange={(e) => set({ multi: Math.max(1, Math.min(9, Math.trunc(Number(e.target.value)) || 1)) })} />
        </label>
      )}
    </div>
  );
}
