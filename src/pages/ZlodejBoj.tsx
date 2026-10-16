// Zloděj v boji (7e): zlodějské triky do útoku / místo útoku / do obrany s ověřením (jednorázové 1× za souboj), útok a obrana
// s trikem (Dokonalá muška, Oko střelce +5, Otřesení −5, Flexibilita ±5), Výhodná pozice (6 + k6), Riskantní útok, Bojová kreativita,
// Cílený útok, jed na zbrani a situační bonusy. Panel na záložce BOJ A STAVY pod hlídáním akcí.
import type { Character } from '../model/types';
import { attack, attackWhy, canDefend, combatMods, roundInfo, takeDefense } from '../rules/combat';
import { sgn, type Derived } from '../rules/derive';
import {
  hasAbility, knownThiefTricks, poisonById, positionReady, riskyWhy, thiefNotes, thiefOwned, thiefSkillBonus, trickCheck, trickCombatWhy, zlo, type ThiefTrick,
} from '../rules/zlodej';
import { aim, creative, poisonSpent, positionAttack, regainPosition, risky, useTrick } from '../rules/zlodej-akce';
import { useDice } from '../ui/Dice';

type P = { c: Character; d: Derived; replace: (c: Character) => void; say: (s: string) => void };

const USE: Record<string, string> = { utok: 'DO ÚTOKU', misto: 'MÍSTO ÚTOKU', obrana: 'DO OBRANY', akce: 'KRÁTKÁ AKCE' };

export function ZlodejBoj({ c, d, replace, say }: P) {
  const { roll } = useDice();
  const B = c.play.combat;
  if (!B) return null;
  const M = combatMods(c);
  const R = roundInfo(c, d);
  const UC = d.attackNumber.value + M.atk;
  const OC = d.defenseNumber.value + M.def;
  const atkWhy = attackWhy(c, d);
  const defWhy = canDefend(c, d);
  const defLeft = R.def.unlimited ? 9 : R.def.n - R.defUsed;
  const tricks = knownThiefTricks(c).filter((t) => t.boj);
  const notes = thiefNotes(c);
  const own = thiefOwned(c);
  const S = zlo(c);
  const poison = poisonById(S.weaponPoison ?? '');
  const ready = positionReady(c);
  const rw = riskyWhy(c, defLeft);
  const has = (id: string) => hasAbility(c, id);
  if (!tricks.length && !notes.length && !poison && !has('vyhodna_pozice') && !has('riskantni_utok') && !has('bojova_kreativita') && !has('cileny_utok')) return null;

  const check = (t: ThiefTrick) => {
    const b = trickCheck(c, d, t);
    replace(useTrick(c, t));
    roll('k10', b.bonus, `${t.n} – ${t.overeni} (${b.parts.join(', ')})`);
  };
  const atkWith = (label: string, mod: number) => {
    replace(attack(c, d));
    roll('k6x', UC + mod, `Útok – ${label} (${UC} ${sgn(mod)})`);
  };
  const defWith = (label: string, mod: number) => {
    replace(takeDefense(c, d, `Aktivní obrana – ${label}`));
    roll('k6x', OC + mod, `Obrana – ${label} (${OC} ${sgn(mod)})`);
  };
  const reflex = thiefSkillBonus(c, d, 'reflex');

  return (
    <div className="tah-sp va-boj">
      <b className="lbl" style={{ color: 'var(--ink)' }}>ZLODĚJ V BOJI</b>
      <div className="va-boj-grid">
        {(has('vyhodna_pozice') || has('riskantni_utok') || has('bojova_kreativita') || has('cileny_utok')) && (
          <div className="va-box">
            <b>Schopnosti</b>
            {has('vyhodna_pozice') && (
              <div className="steps">
                {ready
                  ? <button className="btn dark" type="button" disabled={!!atkWhy} title={atkWhy || 'První Útok: místo k6 rovnou 6 a hází se dál (PPP05)'}
                      onClick={() => { replace(positionAttack(c, d)); roll('k6x6', UC, `Útok z Výhodné pozice (${UC} + 6 + k6)`); }}>⚄ Útok z Výhodné pozice · {UC} + 6 + k6</button>
                  : <button className="btn" type="button" disabled={!!atkWhy} title={atkWhy || 'Vzdá se jednoho Útoku – další Útok znovu z Výhodné pozice'}
                      onClick={() => { replace(regainPosition(c, d)); say('Výhodná pozice znovu připravena'); }}>Získat Výhodnou pozici (vzdát útok)</button>}
              </div>
            )}
            {has('riskantni_utok') && (
              <div className="steps">
                <button className="btn" type="button" disabled={!!rw} title={rw || 'Jedna Obrana za Útok navíc v tomto kole'} onClick={() => replace(risky(c, defLeft))}>Riskantní útok (obrana → útok)</button>
                {B.zlo?.risky === B.round && <span className="pill ok">TOTO KOLO</span>}
              </div>
            )}
            {has('bojova_kreativita') && (
              <div className="steps">
                <button className="btn" type="button" disabled={B.zlo?.creative === B.round} onClick={() => replace(creative(c))}>Bojová kreativita – nová improvizovaná zbraň</button>
                {B.zlo?.creative === B.round && <span className="pill ok">+5 ÚČ I OČ</span>}
              </div>
            )}
            {has('cileny_utok') && (
              <div className="steps">
                <button className="btn" type="button" disabled={!!atkWhy} title={atkWhy || 'Útok −5 na hlavu, ruku nebo nohu'} onClick={() => atkWith('Cílený útok', -5)}>⚄ Cílený útok · {UC - 5} + k6</button>
                <button className="btn" type="button" onClick={() => roll('k10', reflex.bonus, `Cílený útok – Reflex vs. Reflex (${reflex.parts.join(', ')})`)}>⚄ Reflex {sgn(reflex.bonus)}</button>
              </div>
            )}
          </div>
        )}
        {poison && (
          <div className="va-box">
            <b>Jed na zbrani: {poison.nazev}</b>
            <span className="small">{poison.popis} Cíl hází {poison.nebezpecnost}; trvání {poison.trvani}.</span>
            <div className="steps">
              <button className="btn wine" type="button" onClick={() => replace(poisonSpent(c, true))}>Zranil – jed působí</button>
              <button className="btn" type="button" onClick={() => replace(poisonSpent(c, false))}>Setřít</button>
            </div>
          </div>
        )}
        {notes.length > 0 && (
          <div className="va-box">
            <b>Situační bonusy</b>
            {notes.map((n) => <span key={n.source} className="small"><b>{n.source}:</b> {n.text}</span>)}
          </div>
        )}
      </div>
      {tricks.length > 0 && (
        <div className="scroll-x">
          <table className="grid tn sp-table">
            <thead><tr><th>Trik</th><th>Použití</th><th className="c">Ověření</th><th /></tr></thead>
            <tbody>
              {tricks.map((t) => {
                const why = trickCombatWhy(c, t);
                const b = trickCheck(c, d, t);
                const fx = t.fx;
                return (
                  <tr key={t.id}>
                    <td><b>{t.n}</b>{fx?.note && <div className="small muted">{fx.note}</div>}<div className="small">Ověření: {t.overeni}</div></td>
                    <td><span className="pill">{USE[t.boj!]}</span>{t.once && <div className="small muted">1× za souboj{B.zlo?.used?.includes(t.id) ? ' – použit' : ''}</div>}</td>
                    <td className="c">{sgn(b.bonus)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="steps" style={{ justifyContent: 'flex-end' }}>
                        {fx?.aim && B.zlo?.aim == null && <button className="btn" type="button" onClick={() => replace(aim(c))}>Mířit (1 kolo)</button>}
                        <button className={`btn ${why ? '' : 'dark'}`} type="button" disabled={!!why || !b.have} title={why || undefined} onClick={() => check(t)}>⚄ Ověřit</button>
                        {(fx?.atk || fx?.atkPen) && <button className="btn" type="button" disabled={!!atkWhy} title={atkWhy || 'Útok s trikem (zabere útok)'} onClick={() => atkWith(t.n, fx.atk ?? fx.atkPen ?? 0)}>⚄ Útok {sgn(fx.atk ?? fx.atkPen ?? 0)}</button>}
                        {fx?.def && (
                          <>
                            <button className="btn" type="button" disabled={!!defWhy} title={defWhy || 'Trik vyšel'} onClick={() => defWith(`${t.n} (vyšel)`, fx.def!)}>⚄ Obrana {sgn(fx.def)}</button>
                            <button className="btn" type="button" disabled={!!defWhy} title={defWhy || 'Trik nevyšel'} onClick={() => defWith(`${t.n} (nevyšel)`, fx.defFail ?? 0)}>{sgn(fx.defFail ?? 0)}</button>
                          </>
                        )}
                      </div>
                      {why && <div className="small muted">{why}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="small muted" style={{ margin: '6px 0 0' }}>
        Ke každému Útoku či Obraně jen jeden trik (nesčítají se); při víc útocích za kolo jde trik zkusit u každého. Ověření = k10 + Umění, ke kterému trik patří
        {own.has('alter_ego') && S.alterEgo ? ' (Alter ego +5 u CHAR)' : ''}. Triky „do útoku“ jsou součástí běžného útoku, „místo útoku“ ho nahrazují – útok zapiš tlačítkem Útok nahoře. Plné znění triků je na záložce Umění.
      </p>
    </div>
  );
}
