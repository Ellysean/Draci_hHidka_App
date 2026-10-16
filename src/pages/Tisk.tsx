// TISK (Fáze 8): souhrn postavy na papír / do PDF („Uložit jako PDF“ v dialogu tisku).
// Papírová záloha ke stolu a pro PJ – jen hodnoty, bez ovládání. Styl theme/zaloha.css (@media print).
import { ATTR_KEYS } from '../model/types';
import { ATTR_LABELS, CONDITIONS, FATIGUE, getClass, getRace, getSkill } from '../rules/data';
import { sgn } from '../rules/derive';
import { craftedInGear } from '../rules/alchemy';
import { companionView } from '../rules/pratele';
import { formatMd, moneyToMd } from '../rules/money';
import { abilityRows } from '../rules/summary';
import { progressionName } from '../progression/levelup';
import { useStore } from '../state/store';
import { Icon } from '../ui/Icon';

const cz = (n: number) => n.toLocaleString('cs');

export function Tisk() {
  const { character: c, derived: d } = useStore();
  const cls = getClass(c.basic.classId);
  const race = getRace(c.basic.raceId);
  const abilities = abilityRows(c);
  const items = [
    ...c.equipment.items.filter((i) => i.qty > 0),
    ...craftedInGear(c).map((x) => ({ uid: x.uid, name: x.name, qty: x.qty ?? 1, carried: x.carried !== false })),
  ];
  const comps = c.companions.filter((x) => x.status === 'active');
  const conditions = c.vitals.conditions;
  const money = c.equipment.money;

  return (
    <div className="tisk">
      <div className="tisk-bar noprint">
        <a className="btn" href="#/zaloha">← Zpět</a>
        <span className="small">Souhrn postavy na papír. V dialogu tisku jde zvolit i <b>Uložit jako PDF</b>.</span>
        <button type="button" className="btn dark" onClick={() => window.print()}><Icon name="print" />Tisknout</button>
      </div>

      <article className="tisk-page">
        <header className="tisk-head">
          <div>
            <h1>{c.basic.name || 'Bez jména'}</h1>
            <p>{race.name} · {cls.name} · {c.progression.level}. úroveň
              {c.progression.specialization && <> · {progressionName(c.basic.classId, c.progression.specialization)}</>}
              {c.basic.deity && <> · bůh: {c.basic.deity}</>}</p>
          </div>
          <div className="tisk-meta">
            <span>Zkušenosti <b>{cz(c.progression.experience)}</b>{d.experience.nextLevelXp != null && <> / {cz(d.experience.nextLevelXp)}</>}</span>
            <span>Velikost <b>{d.size.value}</b> · Pohyblivost <b>{d.mobility.value}</b></span>
          </div>
        </header>

        <section className="tisk-grid4">
          <div className="tisk-box">
            <h2>Atributy</h2>
            <table><tbody>
              {ATTR_KEYS.map((k) => (
                <tr key={k}><th>{ATTR_LABELS[k].name}</th><td>{d.attributes[k].value}</td><td>{sgn(d.mods[k])}</td></tr>
              ))}
            </tbody></table>
          </div>
          <div className="tisk-box">
            <h2>Životy a energie</h2>
            <table><tbody>
              <tr><th>Životy</th><td>{c.vitals.hpCurrent} / {d.hpMax.value}</td></tr>
              <tr><th>Hranice smrti</th><td>{d.deathThreshold.value}</td></tr>
              {cls.energyName && <tr><th>{cls.energyName}</th><td>{c.vitals.manaCurrent}{d.manaMax.value != null && <> / {d.manaMax.value}</>}</td></tr>}
              <tr><th>Únava</th><td>{FATIGUE.find((f) => f.level === c.vitals.fatigueLevel)?.name ?? c.vitals.fatigueLevel}</td></tr>
              {conditions.length > 0 && <tr><th>Stavy</th><td>{conditions.map((x) => (CONDITIONS.find((k) => k.id === x.id)?.name ?? x.id) + (x.stacks > 1 ? ` ×${x.stacks}` : '')).join(', ')}</td></tr>}
            </tbody></table>
          </div>
          <div className="tisk-box">
            <h2>Boj</h2>
            <table><tbody>
              <tr><th>Útočné číslo</th><td>{d.attackNumber.value}</td></tr>
              <tr><th>Obranné číslo</th><td>{d.defenseNumber.value}</td></tr>
              <tr><th>Zbroj (ZO)</th><td>{d.defenseBase.value}</td></tr>
              <tr><th>Iniciativa</th><td>{sgn(d.initiativeBonus.value)}</td></tr>
            </tbody></table>
          </div>
          <div className="tisk-box">
            <h2>Pohyb a naložení</h2>
            <table><tbody>
              <tr><th>Okamžitý / postup</th><td>{d.moves.instant} / {d.moves.advance}</td></tr>
              <tr><th>Sprint / plížení</th><td>{d.moves.sprint} / {d.moves.sneak}</td></tr>
              <tr><th>Naložení</th><td>{cz(d.load.value)} lb{d.loadLimit.value != null && <> / {cz(d.loadLimit.value)}</>}</td></tr>
            </tbody></table>
          </div>
        </section>

        <section className="tisk-box">
          <h2>Zbraně, zbroj a štít</h2>
          <table className="tisk-tab">
            <thead><tr><th>Zbraň</th><th>Kategorie</th><th>ÚČ zbr.</th><th>Zranění</th><th>OČ zbr.</th><th>ÚČ celk.</th><th>OČ celk.</th></tr></thead>
            <tbody>
              {d.weapons.length === 0 && <tr><td colSpan={7}>—</td></tr>}
              {d.weapons.map((w) => (
                <tr key={w.uid}>
                  <td>{w.name}{w.uid === d.activeWeaponUid ? ' (v ruce)' : ''}</td><td>{w.category}</td>
                  <td>{sgn(w.attack)}</td><td>{sgn(w.damageTotal)}</td><td>{sgn(w.defense)}</td>
                  <td><b>{w.attackNumber}</b></td><td><b>{w.defenseNumber}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="tisk-line">
            Zbroj: <b>{d.armor ? `${d.armor.name} (kvalita ${d.armor.quality})` : '—'}</b>
            {' · '}Štít: <b>{d.shield ? `${d.shield.name} (kvalita ${d.shield.quality})` : '—'}</b>
          </p>
        </section>

        <section className="tisk-grid2">
          <div className="tisk-box">
            <h2>Dovednosti</h2>
            <table className="tisk-tab">
              <thead><tr><th>Dovednost</th><th>Atr.</th><th>Stupeň</th><th>Celkem</th></tr></thead>
              <tbody>
                {d.skills.length === 0 && <tr><td colSpan={4}>—</td></tr>}
                {d.skills.map((s) => (
                  <tr key={s.id}><td>{s.name || getSkill(s.id)?.name || s.id}</td><td>{ATTR_LABELS[s.attribute].short}</td><td>{s.rank}</td><td><b>{sgn(s.total)}</b></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tisk-box">
            <h2>Schopnosti a položky</h2>
            <ul className="tisk-list">
              {abilities.map(([n, k], i) => <li key={`${n}-${i}`}>{n} <i>· {k}</i></li>)}
            </ul>
          </div>
        </section>

        <section className="tisk-grid2">
          <div className="tisk-box">
            <h2>Výbava</h2>
            <p className="tisk-line">Peníze: <b>{money.gold} zl, {money.silver} st, {money.copper} md</b> (celkem {formatMd(moneyToMd(money))})</p>
            <ul className="tisk-list cols2">
              {items.length === 0 && <li>—</li>}
              {items.map((i) => <li key={i.uid}>{i.name}{i.qty > 1 ? ` ×${i.qty}` : ''}{!i.carried ? ' (nenese)' : ''}</li>)}
            </ul>
          </div>
          <div className="tisk-box">
            <h2>Přátelé a zvířata</h2>
            {comps.length === 0 ? <p className="tisk-line">—</p> : (
              <ul className="tisk-list">
                {comps.map((x) => {
                  const v = companionView(c, d, x);
                  return <li key={x.uid}><b>{x.name || x.typeId}</b> · životy {x.hpCurrent}/{v.hpMax} · ZO {v.zo} · OČ {v.oc}{v.attacks.length > 0 && <> · {v.attacks.map((a) => `${a.n} ${a.atk ?? '?'}/${a.dmg != null ? sgn(a.dmg) : '?'}`).join(', ')}</>}</li>;
                })}
              </ul>
            )}
          </div>
        </section>

        {(c.basic.notes.trim() || c.notesSections.experiences.length > 0) && (
          <section className="tisk-box">
            <h2>Poznámky</h2>
            {c.basic.notes.trim() && <p className="tisk-notes">{c.basic.notes}</p>}
            {c.notesSections.experiences.length > 0 && (
              <ul className="tisk-list">
                {c.notesSections.experiences.filter((e) => e.text.trim()).map((e, i) => <li key={i}>{e.text}{e.impact && <i> – {e.impact}</i>}</li>)}
              </ul>
            )}
          </section>
        )}

        <footer className="tisk-foot">Osobní deník Dračí hlídky {__APP_VERSION__} · vytištěno {new Date().toLocaleDateString('cs')} · plný stav postavy je v souboru zálohy (.json)</footer>
      </article>
    </div>
  );
}
