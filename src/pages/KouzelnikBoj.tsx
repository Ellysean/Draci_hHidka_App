// Kouzelník v boji (7c.2): volby sesílání (Rychlé / Precizní kouzlení, bez řeči a gest, vyrušení, platit z hole),
// aktivní kouzla (Magický štít / Zbroj do ZO, Rychlost), Rituál krve, Nasátí s Bitevním tréninkem, Magická dominance
// a Mentální souboj (PPP04). Panel na záložce BOJ A STAVY pod hlídáním akcí.
import { useState } from 'react';
import type { Character, WizardCastMods } from '../model/types';
import { combatMods, willBonus } from '../rules/combat';
import { sgn, type Derived } from '../rules/derive';
import { WIZ, bloodWhy, drawWhy, hasAbility, hasteOn, staffOf, wiz, wizardZo } from '../rules/kouzelnik';
import { bloodRitual, dominance, dominanceWhy, drawMana, duelWhy, mentalDuel, removeActive, setMods } from '../rules/kouzelnik-akce';
import { useDice } from '../ui/Dice';

type P = { c: Character; d: Derived; replace: (c: Character) => void; say: (s: string) => void };

export function KouzelnikBoj({ c, d, replace, say }: P) {
  const { roll } = useDice();
  const [blood, setBlood] = useState(2);
  const [dom, setDom] = useState(1);
  const B = c.play.combat;
  if (!B) return null;
  const W = wiz(c);
  const m = W.mods;
  const has = (id: string) => hasAbility(c, id);
  const set = (patch: Partial<WizardCastMods>) => replace(setMods(c, patch));
  const tog = (k: keyof WizardCastMods, label: string, show = true) =>
    show ? <button key={k} type="button" className="chip" aria-pressed={!!m[k]} onClick={() => set({ [k]: !m[k] } as Partial<WizardCastMods>)}>{label}</button> : null;
  const zo = wizardZo(c);
  const M = combatMods(c);
  const dagger = staffOf(c)?.kind === 'dyka';
  const blWhy = bloodWhy(c, d, blood, false);
  const drWhy = drawWhy(c, d);
  const domWhy = dominanceWhy(c, dom);
  const dWhy = duelWhy(c, d);
  return (
    <div className="tah-sp va-boj">
      <b className="lbl" style={{ color: 'var(--ink)' }}>KOUZELNÍK V BOJI</b>
      <div className="chips" style={{ marginTop: 6 }}>
        {tog('quick', 'Rychlé kouzlení ½ · +3', has('rychle_kouzleni'))}
        {tog('precise', 'Precizní 2× · +5', has('precizni_kouzleni'))}
        {tog('noVoice', `Bez řeči ${has('utajene_kouzleni') ? '−2' : '−5'}`)}
        {tog('noGesture', `Bez gest ${has('utajene_kouzleni') ? '−2' : '−5'}`)}
        {tog('interrupted', has('bojove_sesilani') ? 'Vyrušen (bez postihu)' : 'Vyrušen +5')}
        {tog('fromStaff', 'Platit z hole', !!staffOf(c))}
        {tog('self', 'Na sebe')}
      </div>
      <div className="va-boj-grid">
        <div className="va-box">
          <b>Působí na mně</b>
          {W.active.length === 0 && <span className="small muted">Magický štít (ZO +5), Magická zbroj (+1 za 4 many) a Rychlost na sebe se zapíšou po seslání.</span>}
          {W.active.map((a) => (
            <span key={a.uid} className="small">{a.name}{a.zo ? ` ZO +${a.zo}` : ''}{a.haste ? ' · akce, útok a obrana navíc' : ''}{a.until != null ? ` · do ${a.until}. kola` : ''}{' '}
              <button type="button" className="fpop-x" aria-label={`Ukončit ${a.name}`} onClick={() => replace(removeActive(c, a.uid))}>×</button></span>
          ))}
          {(zo.total > 0 || hasteOn(c)) && <span className="small tn">ZO {d.defenseBase.value}{zo.total ? ` (z toho kouzla +${zo.total})` : ''}{hasteOn(c) ? ' · 3 krátké akce v tahu' : ''}</span>}
        </div>
        {has('ritual_krve') && (
          <div className="va-box">
            <b>Rituál krve</b>
            <span className="small muted">Dlouhá akce, životy → mana 2 : 1 (do maxima).{dagger ? ' S dýkou až 3 : 3 – na záložce Kouzelník.' : ''}</span>
            <div className="steps">
              <input className="field num tn" type="number" min={1} value={blood} onChange={(e) => setBlood(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} aria-label="Many z Rituálu krve" />
              <button className="btn wine" type="button" disabled={!!blWhy} title={blWhy || undefined} onClick={() => { replace(bloodRitual(c, d, blood)); say(`Rituál krve: +${blood} many`); }}>−{2 * blood} životů → +{blood}</button>
            </div>
          </div>
        )}
        {has('bitevni_trenink') && (
          <div className="va-box">
            <b>Nasátí many (Bitevní trénink)</b>
            <span className="small muted">Za 1 kolo (dlouhá akce) místo minuty; {W.manaDrawsToday}/{c.progression.level} dnes.</span>
            <button className="btn" type="button" disabled={!!drWhy} title={drWhy || undefined} onClick={() => { const r = drawMana(c, d); replace(r.character); say(`Nasátí: +${r.gain} many`); }}>Nasát +1k6</button>
          </div>
        )}
        {has('magicka_dominance') && (
          <div className="va-box">
            <b>Magická dominance</b>
            <span className="small muted">3 many za každou k6 navíc k Útoku či Obraně tváří v tvář (šestky se nepřehazují), 1× za kolo, ohlásit před hodem.</span>
            <div className="steps">
              <input className="field num tn" type="number" min={1} value={dom} onChange={(e) => setDom(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} aria-label="Kostek navíc" />
              {(['útok', 'obrana'] as const).map((w) => (
                <button key={w} className="btn wine" type="button" disabled={!!domWhy} title={domWhy || undefined}
                  onClick={() => { const r = dominance(c, dom, w); replace(r.character); say(`Dominance (${w}): +${r.sum} (${r.faces.join('+')}) k hodu`); }}>
                  {w === 'útok' ? `Útok ${d.attackNumber.value + M.atk}` : `Obrana ${d.defenseNumber.value + M.def}`} +{dom}k6 (−{3 * dom})
                </button>
              ))}
            </div>
          </div>
        )}
        {has('mentalni_souboj') && (
          <div className="va-box">
            <b>Mentální souboj</b>
            <span className="small muted">Dlouhá akce, 2 many za kolo. Vůle vs. Vůle oběti – rozdíl = ztracené životy a oběť má na kolo Nevýhodu −5.</span>
            <button className="btn wine" type="button" disabled={!!dWhy} title={dWhy || undefined}
              onClick={() => { replace(mentalDuel(c, d)); roll('k10', willBonus(d), 'Mentální souboj – Vůle vs. Vůle oběti'); }}>⚄ Vůle {sgn(willBonus(d))} (−2 many)</button>
          </div>
        )}
        {has('bojove_sesilani') && (
          <div className="va-box"><b>Bojové sesílání</b><span className="small muted">Půlkolové kouzlo nezabere akci (zbude Útok i Obrana); při kouzle na celé kolo se dá bránit; vyrušení bez postihu – appka hlídá sama.</span></div>
        )}
        {has('energeticka_zbran') && (
          <div className="va-box"><b>Energetická zbraň</b><span className="small muted">{WIZ.schopnosti.energeticka_zbran.text} Půl kola, 1 mana za 10 kol; široký meč 5/+1/+2 a štít +2, magická. Bez many: k6 = 6 → zbraň na 10 kol.</span></div>
        )}
        {has('lamani_kouzel') && (
          <div className="va-box"><b>Lámání kouzel</b><span className="small muted">Rušící kouzlo i půlkolové sesílá okamžitě v tahu protivníka – jen když v tomto kole nekouzlil{B.cast ? ' (teď už kouzlil)' : ''}.</span></div>
        )}
      </div>
    </div>
  );
}
