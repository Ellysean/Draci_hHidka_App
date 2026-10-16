// Záložka POSTAVA – kostra podle závazného mockupu (docs/VISUAL_STYLE.md).
// Fáze 2: napojení na store a derive. Výběry z pravidel, popover vzorců,
// průvodce tvorbou (#/tvorba) a přestupem (#/prestup) jsou samostatné stránky.
import { ATTR_KEYS, type ClassId, type RaceId } from '../model/types';
import { useMemo, useState } from 'react';
import { describeLevelUp } from '../progression/levelup';
import { abilityRows } from '../rules/summary';
import { clearBeforeLevelUp, loadBeforeLevelUp } from '../storage/localStore';
import { ATTR_LABELS, CLASSES, FATIGUE, MAX_LEVEL, RACES, XP_BY_LEVEL, getArmor, getClass, getRace, getShield } from '../rules/data';
import { sgn } from '../rules/derive';
import { craftedInGear } from '../rules/alchemy';
import { productWeightLb } from '../rules/catalog';
import { AUGMENTATIONS, toggleAugmentation } from '../rules/augmentations';
import { useStore } from '../state/store';
import { CalcField, Labeled, NumberField, TextField } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { Popover } from '../ui/FormulaPopover';
import { InfoBubble } from '../ui/InfoBubble';
import { raceAbilityInfo } from '../rules/rasy';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

const cz = (n: number) => n.toLocaleString('cs');

type PendingChange = { kind: 'class'; id: ClassId } | { kind: 'race'; id: RaceId };

export function Postava() {
  const { character: c, derived: d, set, dispatch } = useStore();
  const cls = getClass(c.basic.classId);
  const race = getRace(c.basic.raceId);
  const armorName = getArmor(c.equipment.armor.itemId)?.n ?? c.equipment.armor.custom?.name ?? '—';
  const shieldName = getShield(c.equipment.shield.itemId)?.n ?? c.equipment.shield.custom?.name ?? '—';
  const abilities = abilityRows(c);
  const [askUndo, setAskUndo] = useState(false);
  const [pending, setPending] = useState<PendingChange | null>(null);
  // U rozehrané postavy (průvodce, přestupy, schopnosti) se změna rasy/povolání potvrzuje.
  const established = !!c.meta.creation || c.progression.level > 1 || c.progression.levelUps.length > 0
    || c.progression.learnedAbilities.length > 0 || c.progression.learnedBranches.length > 0;
  const applyChange = (ch: PendingChange) => {
    if (ch.kind === 'class') dispatch({ type: 'setClass', classId: ch.id });
    else set(['basic', 'raceId'], ch.id);
    setPending(null);
  };
  const requestChange = (ch: PendingChange) => (established ? setPending(ch) : applyChange(ch));
  const showDeity = c.basic.classId === 'klerik' || !!c.basic.deity;
  const before = useMemo(() => loadBeforeLevelUp(c), [c]);

  const left = (
    <div className="stack">
      <Sheet aria-labelledby="rib-jmeno">
        <div className="name-row">
          <label htmlFor="f-name" className="ribbon" id="rib-jmeno" style={{ marginBottom: 6 }}><Icon name="person" />JMÉNO</label>
          <TextField id="f-name" value={c.basic.name} onChange={(v) => set(['basic', 'name'], v)} autoComplete="off" placeholder="Jméno postavy" />
        </div>
        {showDeity && (
          <Labeled label={c.basic.classId === 'klerik' ? 'Bůh (klerik slouží)' : 'Bůh'} className="box deity">
            {(id) => <TextField id={id} value={c.basic.deity} onChange={(v) => set(['basic', 'deity'], v)} autoComplete="off" placeholder="Jméno boha" />}
          </Labeled>
        )}
        <div className="crest">
          <Labeled label="Naložení" className="cell l1">
            {(id) => (
              <CalcField
                id={id} calc={d.load} label="Naložení (lb)" ovKey="load" warn={d.overloaded}
                extra={<LoadLimit />}
              />
            )}
          </Labeled>
          <div className="mid">
            <Labeled label="Povolání">
              {(id) => (
                <select id={id} className="field" value={pending?.kind === 'class' ? pending.id : c.basic.classId} onChange={(e) => requestChange({ kind: 'class', id: e.target.value as ClassId })}>
                  {CLASSES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              )}
            </Labeled>
            <Labeled label="Rasa">
              {(id) => (
                <select id={id} className="field" value={pending?.kind === 'race' ? pending.id : c.basic.raceId} onChange={(e) => requestChange({ kind: 'race', id: e.target.value as RaceId })}>
                  {RACES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              )}
            </Labeled>
          </div>
          <Labeled label="Velikost" className="cell r1">{(id) => <CalcField id={id} calc={d.size} label="Velikost" ovKey="size" sizeChoice />}</Labeled>
          <div className="cell l2">
            <span className="lbl">Únava</span>
            <a className="field num" href="#/boj" style={{ fontSize: 13, color: 'inherit', textDecoration: 'none', display: 'grid', placeItems: 'center' }} title="Otevřít Boj a stavy">
              {FATIGUE[c.vitals.fatigueLevel]?.name ?? '—'}
            </a>
          </div>
          <Labeled label="Pohyblivost" className="cell r2">
            {(id) => (
              <CalcField
                id={id} calc={d.mobility} label="Pohyblivost (sáhů za kolo)" ovKey="mobility"
                extra={
                  <table className="grid tn"><tbody>
                    <tr><td>Okamžitý pohyb (1/10)</td><td className="c">{d.moves.instant}</td></tr>
                    <tr><td>Postup (1/4)</td><td className="c">{d.moves.advance}</td></tr>
                    <tr><td>Sprint</td><td className="c">{d.moves.sprint}</td></tr>
                    <tr><td>Plížení (1/10)</td><td className="c">{d.moves.sneak}</td></tr>
                  </tbody></table>
                }
              />
            )}
          </Labeled>
        </div>
        {pending && (
          <div className="warnbar chg-warn" role="alert">
            <span style={{ flex: 1 }}>
              {pending.kind === 'class'
                ? <>Změnit povolání na <b>{getClass(pending.id).name}</b>? Stav povolání (adrenalin, alchymie…) se vynuluje a schopnosti, větve a položky z přestupů patří původnímu povolání – u rozehrané postavy je lepší založit novou průvodcem.</>
                : <>Změnit rasu na <b>{getRace(pending.id).name}</b>? Přepočítá se velikost, pohyblivost, rodová schopnost a dovednostní body; atributy zůstanou, jak jsou.</>}
            </span>
            <button className="btn wine" type="button" onClick={() => applyChange(pending)}>Změnit</button>
            <button className="btn" type="button" onClick={() => setPending(null)}>Nechat</button>
          </div>
        )}
      </Sheet>

      <Sheet>
        <div className="vitals">
          <div>
            <Ribbon icon="heart">ŽIVOTY</Ribbon>
            <div className="trio">
              <Labeled label="Max">{(id) => <CalcField id={id} calc={d.hpMax} label="Max. životy" ovKey="hpMax" />}</Labeled>
              <Labeled label="Aktuální">{(id) => <NumberField id={id} value={c.vitals.hpCurrent} min={-999} className={c.vitals.hpCurrent <= 0 ? 'warn-in' : ''} onChange={(v) => set(['vitals', 'hpCurrent'], v)} />}</Labeled>
              <Labeled label="Hr. smrti">{(id) => <CalcField id={id} calc={d.deathThreshold} label="Hranice smrti" ovKey="deathThreshold" />}</Labeled>
            </div>
          </div>
          <div>
            <Ribbon icon="bolt">{(cls.energyName ?? 'Mana').toUpperCase()}</Ribbon>
            <div className="pair">
              <Labeled label="Max">{(id) => <CalcField id={id} calc={d.manaMax} label={`Max. ${(cls.energyName ?? 'mana').toLowerCase()}`} ovKey={cls.energyName ? 'manaMax' : undefined} />}</Labeled>
              <Labeled label="Aktuální">
                {(id) => <NumberField id={id} value={c.vitals.manaCurrent} min={0} disabled={!cls.energyName} onChange={(v) => set(['vitals', 'manaCurrent'], v)} />}
              </Labeled>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Ribbon icon="hourglass">ÚNAVA</Ribbon>
          <div className="pair" style={{ maxWidth: '50%', minWidth: 220 }}>
            <Labeled label="Max">{(id) => <CalcField id={id} calc={d.fatigueMax} label="Max. body únavy" ovKey="fatigueMax" />}</Labeled>
            <Labeled label="Aktuální">{(id) => <NumberField id={id} value={c.vitals.fatiguePoints} min={0} className={d.fatigueOver ? 'warn-in' : ''} onChange={(v) => set(['vitals', 'fatiguePoints'], v)} />}</Labeled>
          </div>
        </div>
      </Sheet>

      <Sheet>
        <Ribbon icon="star">ATRIBUTY</Ribbon>
        <div style={{ display: 'grid', gap: 6 }}>
          <div className="attr-row" aria-hidden="true"><span className="lbl">Stupeň</span><span /><span /><span className="lbl" style={{ textAlign: 'center' }}>Oprava</span></div>
          {ATTR_KEYS.map((k) => (
            <div className="attr-row" key={k}>
              <NumberField value={c.attributes[k]} min={1} max={40} aria-label={`${ATTR_LABELS[k].name} – stupeň`} onChange={(v) => set(['attributes', k], v)} />
              <span className="shield" aria-hidden="true">{ATTR_LABELS[k].short}</span>
              <span className="nm">
                {ATTR_LABELS[k].name.toUpperCase()}
                {d.attributes[k].bonus !== 0 && (
                  <span className="pill ok" title={`Stupeň se schopnostmi: ${d.attributes[k].value} (${d.attributes[k].parts.join(', ')})`} style={{ marginLeft: 6 }}>
                    {sgn(d.attributes[k].bonus)} → {d.attributes[k].value}
                  </span>
                )}
              </span>
              <span className="mod tn" aria-label={`oprava ${sgn(d.mods[k])}`}>{sgn(d.mods[k])}</span>
            </div>
          ))}
        </div>
        {d.characterPointsDue > 0 && (
          <p className="small muted" style={{ margin: '8px 0 0' }}>
            Nerozdělené charakterové body: <b className="tn">{d.characterPointsDue}</b> (každá 3. úroveň 2 body, +1 dvěma různým atributům) – rozdělují se v průvodci přestupem.
          </p>
        )}
      </Sheet>

      <Sheet>
        <div className="ribbon-row"><Ribbon icon="sword">ZBRANĚ</Ribbon><a className="sk-link" href="#/vybava">Upravit a koupit →</a></div>
        <div className="w-side">
          <div className="scroll-x">
            <table className="grid tn">
              <thead><tr><th style={{ width: 28 }}><span className="visually-hidden">V ruce</span></th><th>Název</th><th className="c">Útočnost</th><th className="c">Zranění</th><th className="c">Obrana</th><th className="c" title="ÚČ / OČ s touto zbraní">ÚČ/OČ</th></tr></thead>
              <tbody>
                {d.weapons.length === 0 && <tr><td colSpan={6} className="muted small">Zatím žádná zbraň – přidáš ji v sekci Výbava.</td></tr>}
                {d.weapons.map((w) => (
                  <tr key={w.uid} className={w.uid === d.activeWeaponUid ? 'w-active' : ''}>
                    <td className="c">
                      <input
                        type="radio" name="active-weapon" checked={w.uid === d.activeWeaponUid}
                        aria-label={`${w.name} v ruce – ÚČ/OČ vedle tabulky podle ní`} title="Zbraň v ruce"
                        onChange={() => set(['equipment', 'activeWeaponUid'], w.uid)}
                      />
                    </td>
                    <td>{w.name}</td><td className="c">{w.attack}</td><td className="c">{w.damage}</td><td className="c">{w.defense}</td>
                    <td className="c muted small">
                      {w.attackNumber}/{w.defenseNumber}
                      {w.kind !== 'melee' && <> <span className="pill">{w.kind === 'ranged' ? 'STŘ.' : 'VRH.'}</span></>}
                      {w.overloaded && <> <span className="pill bad">−5</span></>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sum">
            <Labeled label="ÚČ">{(id) => <CalcField id={id} calc={d.attackNumber} label="Útočné číslo" ovKey="attackNumber" />}</Labeled>
            <Labeled label="OČ">{(id) => <CalcField id={id} calc={d.defenseNumber} label="Obranné číslo" ovKey="defenseNumber" />}</Labeled>
            <span className="small muted w-hand">{d.weapons.find((w) => w.uid === d.activeWeaponUid)?.name ?? 'beze zbraně'}</span>
          </div>
        </div>
      </Sheet>

      <Sheet>
        <div className="ribbon-row"><Ribbon icon="shield">ZBROJ A ŠTÍT</Ribbon><a className="sk-link" href="#/vybava">Upravit →</a></div>
        <div className="w-side">
          <table className="grid">
            <thead><tr><th /><th>Název</th><th className="c">Kvalita</th></tr></thead>
            <tbody>
              <tr><td className="lbl">Zbroj</td><td>{armorName}{d.armor && !c.equipment.armor.equipped && <span className="small muted"> (sundaná)</span>}{d.armorOverloaded && <> <span className="pill bad">−5</span></>}</td><td className="c">{d.armor?.quality ?? 0}</td></tr>
              <tr><td className="lbl">Štít</td><td>{shieldName}{d.shield && !c.equipment.shield.equipped && <span className="small muted"> (na zádech)</span>}{d.shieldOverloaded && <> <span className="pill bad">−5</span></>}</td><td className="c">{d.shield?.quality ?? '—'}</td></tr>
            </tbody>
          </table>
          <div className="sum"><Labeled label="ZO">{(id) => <CalcField id={id} calc={d.defenseBase} warn={d.armorOverloaded} label="Základní obrana" ovKey="defenseBase" />}</Labeled></div>
        </div>
      </Sheet>

      <Sheet>
        <div className="pair money-pair">
          <div>
            <div className="ribbon-row"><Ribbon icon="coin">PENÍZE</Ribbon><a className="sk-link" href="#/vybava">Příjem, výdaj →</a></div>
            <div className="trio">
              {([['gold', 'Zlaté'], ['silver', 'Stříbrné'], ['copper', 'Měděné']] as const).map(([k, l]) => (
                <Labeled key={k} label={l}>{(id) => <NumberField id={id} value={c.equipment.money[k]} min={0} onChange={(v) => set(['equipment', 'money', k], v)} />}</Labeled>
              ))}
            </div>
          </div>
          <div>
            <div className="ribbon-row"><Ribbon icon="bag">VÝBAVA</Ribbon><a className="sk-link" href="#/vybava">Upravit →</a></div>
            <table className="grid tn">
              <tbody>
                {c.equipment.items.length === 0 && craftedInGear(c).length === 0 && <tr><td className="muted small">Prázdná výbava.</td></tr>}
                {c.equipment.items.map((it) => (
                  <tr key={it.uid} className={it.carried ? '' : 'vy-off'} title={it.carried ? undefined : 'Nenese u sebe'}><td>{it.qty > 1 ? `${it.qty}× ` : ''}{it.name}</td><td className="c muted small" style={{ width: 70 }}>{it.weightLb} lb</td></tr>
                ))}
                {craftedInGear(c).map((it) => (
                  <tr key={it.uid} className={it.carried !== false ? '' : 'vy-off'} title="Vlastní výroba (Alchymie)"><td>{(it.qty ?? 1) > 1 ? `${it.qty}× ` : ''}{it.name}</td><td className="c muted small" style={{ width: 70 }}>{productWeightLb(it.recipeId)} lb</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Sheet>
    </div>
  );

  const right = (
    <div className="stack">
      <Sheet>
        <div className="ribbon-row"><label htmlFor="f-notes" className="ribbon"><Icon name="quill" />POZNÁMKY</label></div>
        <textarea id="f-notes" className="lined" value={c.basic.notes} onChange={(e) => set(['basic', 'notes'], e.target.value)} />
      </Sheet>

      <Sheet>
        <Ribbon icon="spark">ZVLÁŠTNÍ SCHOPNOSTI</Ribbon>
        <ul className="ab-list">
          {abilities.map(([a, s], i) => (
            <li key={`${s}-${a}-${i}`}>
              {i === 0 ? (
                <span className="ab-r">{a}
                  <InfoBubble small title={`${a} – rodová schopnost (${race.name})`} label={`Rodová schopnost ${a} – co dělá`}>
                    <p style={{ margin: 0 }}>{raceAbilityInfo(c).text}</p>
                    <p className="muted" style={{ margin: 0 }}>{raceAbilityInfo(c).kind === 'auto' ? 'Deník započítává sám.' : raceAbilityInfo(c).kind === 'situ' ? 'Situační – deník bonus jen připomene u dovednosti (i), započte ho PJ podle situace.' : 'Jen informace pro hru.'}</p>
                  </InfoBubble>
                </span>
              ) : a}
              <span>{s}</span>
            </li>
          ))}
          {Array.from({ length: Math.max(0, 6 - abilities.length) }, (_, i) => <li key={`e${i}`} aria-hidden="true">&nbsp;</li>)}
        </ul>
        <Augmentace />
      </Sheet>

      <Sheet>
        <div className="ribbon-row">
          <Ribbon icon="swords">DOVEDNOSTI</Ribbon>
          <div className="counter"><span className="lbl">Dovednostní<br />body</span><CalcField calc={d.skillPoints.available} label="Dovednostní body k utracení" ovKey="skillPointsAvailable" /></div>
        </div>
        <details className="help-d">
          <summary><Icon name="book" className="i14" /> JAK VYPLŇOVAT DOVEDNOSTI</summary>
          <div className="help">
            <div className="ics">{ATTR_KEYS.map((k) => <i key={k}>{ATTR_LABELS[k].short}</i>)}</div>
            <ul>
              <li>Ověření = 1k10 + oprava atributu + stupeň.</li>
              <li>U každé dovednosti zvol atribut (u dvouatributových rozhoduje PJ).</li>
              <li>Stupeň zvládnutí je libovolné celé číslo od 1.</li>
            </ul>
          </div>
        </details>
        <table className="grid tn" style={{ marginTop: 6 }}>
          <thead><tr><th>Název</th><th className="c">Atribut</th><th className="c">Stupeň</th><th className="c">Celkem</th></tr></thead>
          <tbody>
            {d.skills.length === 0 && <tr><td colSpan={4} className="muted small">Zatím žádné dovednosti.</td></tr>}
            {d.skills.map((s) => (
              <tr key={s.id}><td>{s.name}</td><td className="c">{s.options.length ? s.options.map((o) => ATTR_LABELS[o.attribute].short).join(' / ') : ATTR_LABELS[s.attribute].short}</td><td className="c">{s.rank}</td><td className="c">{s.options.length ? s.options.map((o) => sgn(o.total)).join(' / ') : sgn(s.total)}</td></tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: '6px 0 0' }}><a className="sk-link" href="#/dovednosti">Zlepšit, přidat a hodit → záložka Dovednosti</a></p>
      </Sheet>

      <Sheet>
        <div className="pair">
          <Labeled label="Zkušenosti">
            {(id) => (
              <>
                <div className="xp-row">
                  <NumberField id={id} value={c.progression.experience} min={0} onChange={(v) => set(['progression', 'experience'], v)} />
                  <XpInfo level={c.progression.level} xp={c.progression.experience} />
                </div>
                {d.experience.progress != null && (
                  <div className="xpbar" role="progressbar" aria-label="Postup k další úrovni" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(d.experience.progress * 100)}>
                    <i style={{ width: `${d.experience.progress * 100}%` }} />
                  </div>
                )}
                {d.experience.belowLevel && (
                  <span className="pill bad" title={`${c.progression.level}. úroveň začíná na ${cz(XP_BY_LEVEL[c.progression.level - 1])} zk.`}>MÁLO ZK. PRO {c.progression.level}. ÚR.</span>
                )}
                {d.experience.nextLevelXp == null ? (
                  <span className="small muted">nejvyšší úroveň</span>
                ) : d.experience.canLevelUp ? (
                  <span className="pill ok">MŮŽEŠ PŘESTOUPIT ({cz(d.experience.nextLevelXp)})</span>
                ) : (
                  <span className="small muted tn">další úroveň od {cz(d.experience.nextLevelXp)} · chybí {cz(d.experience.missing ?? 0)}</span>
                )}
              </>
            )}
          </Labeled>
          <Labeled label="Úroveň">
            {(id) => (
              <div style={{ display: 'flex', gap: 6 }}>
                <output id={id} className="field num tn" style={{ display: 'grid', placeItems: 'center' }}>{c.progression.level}</output>
                {c.progression.level < 24 && (
                  <a className={`btn ${d.experience.canLevelUp ? 'wine' : 'dark'}`} href="#/prestup" title="Průvodce přestupem na další úroveň (H18)"><Icon name="up" />PŘESTUP</a>
                )}
              </div>
            )}
          </Labeled>
        </div>
        <details className="help-d" style={{ marginTop: 8 }}>
          <summary><Icon name="book" className="i14" /> TABULKA ZKUŠENOSTÍ (H18)</summary>
          <XpTable level={c.progression.level} xp={c.progression.experience} />
        </details>
        {c.progression.levelUps.length > 0 && (
          <details className="help-d" style={{ marginTop: 8 }}>
            <summary><Icon name="book" className="i14" /> HISTORIE PŘESTUPŮ ({c.progression.levelUps.length})</summary>
            <table className="grid small"><tbody>
              {c.progression.levelUps.map((u) => <tr key={u.level}><td className="tn"><b>{u.level}.</b></td><td>{describeLevelUp(c.basic.classId, u).join(' · ')}</td></tr>)}
            </tbody></table>
            {before && (
              askUndo ? (
                <div className="warnbar" role="alert">
                  <span style={{ flex: 1 }}>Vrátit postavu na {before.progression.level}. úroveň? Zruší se všechny volby posledního přestupu i změny provedené od něj.</span>
                  <button className="btn wine" type="button" onClick={() => { dispatch({ type: 'replace', character: before }); clearBeforeLevelUp(); setAskUndo(false); }}>Vrátit</button>
                  <button className="btn" type="button" onClick={() => setAskUndo(false)}>Nechat</button>
                </div>
              ) : <button className="addrow" type="button" onClick={() => setAskUndo(true)}>VRÁTIT POSLEDNÍ PŘESTUP</button>
            )}
          </details>
        )}
      </Sheet>
    </div>
  );

  const empty = !c.basic.name && !c.meta.creation;
  return (
    <>
      {empty && (
        <Sheet className="cta">
          <Ribbon icon="plus">NOVÁ POSTAVA</Ribbon>
          <p className="lead">Deník je zatím prázdný. Průvodce tě provede tvorbou postavy krok za krokem podle kapitoly Tvorba postavy (H05) – rasa, povolání, atributy, dovednosti a výbava.</p>
          <a className="btn dark" href="#/tvorba">Založit postavu průvodcem</a>
        </Sheet>
      )}
      <div className="cols">{left}{right}</div>
    </>
  );
}

/** Nosnost do popoveru Naložení – tabulka chybí (Užitečné informace), zadává se ručně. */
export function LoadLimit() {
  const { character: c, derived: d, dispatch } = useStore();
  const v = c.overrides.loadLimit;
  const setLimit = (n: number | null) => dispatch({
    type: 'update',
    fn: (x) => {
      const o = { ...x.overrides };
      if (n == null) delete o.loadLimit; else o.loadLimit = n;
      return { ...x, overrides: o };
    },
  });
  return (
    <div className="fpop-ovr">
      <label className="lbl" htmlFor="f-load-limit">Nosnost (lb) – zadej podle PJ</label>
      <input
        id="f-load-limit" className="field num tn" inputMode="numeric" placeholder="neznámá"
        value={v == null ? '' : String(v)}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9]/g, '');
          setLimit(t === '' ? null : Number(t));
        }}
      />
      {d.loadLimit.value != null && (
        <span className={`small ${d.overloaded ? 'bad-t' : 'muted'}`}>
          {d.overloaded ? `Přetížená o ${Math.round((d.load.value - d.loadLimit.value) * 10) / 10} lb.` : `Volno ${Math.round((d.loadLimit.value - d.load.value) * 10) / 10} lb.`}
        </span>
      )}
    </div>
  );
}

function XpTable({ level, xp }: { level: number; xp: number }) {
  const rows = XP_BY_LEVEL.map((need, i) => ({ lvl: i + 1, need }));
  const tier = (l: number) => (l <= 5 ? 'začátečník' : l <= 11 ? 'pokročilý' : l <= 17 ? 'expert' : 'legenda');
  return (
    <div className="scroll-x">
      <table className="grid tn small xp-table">
        <thead><tr><th>Úroveň</th><th className="c">Od zk.</th><th>Stupeň</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.lvl} className={r.lvl === level ? 'cur' : xp >= r.need && r.lvl > level ? 'ready' : ''}>
              <td>{r.lvl}.{r.lvl === level ? ' ◂' : ''}</td>
              <td className="c">{cz(r.need)}</td>
              <td className="muted">{tier(r.lvl)}{r.lvl === MAX_LEVEL ? ' (max.)' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Info okénko u Zkušeností: kolik je potřeba na další úroveň a na ty po ní. */
function XpInfo({ level, xp }: { level: number; xp: number }) {
  const next = level < MAX_LEVEL ? XP_BY_LEVEL[level] : null;
  const from = XP_BY_LEVEL[level - 1];
  const missing = next == null ? null : Math.max(0, next - xp);
  const pct = next == null ? null : Math.round(Math.max(0, Math.min(1, (xp - from) / (next - from))) * 100);
  let byXp = 1;
  XP_BY_LEVEL.forEach((need, i) => { if (xp >= need) byXp = i + 1; });
  const upcoming = XP_BY_LEVEL.map((need, i) => ({ lvl: i + 1, need })).filter((r) => r.lvl > level + 1).slice(0, 3);
  return (
    <Popover
      title="Zkušenosti na další úroveň"
      content={() => (
        <div className="xp-info">
          {next == null ? (
            <p className="fpop-f">Postava je na nejvyšší, {MAX_LEVEL}. úrovni – další přestup už není.</p>
          ) : (
            <>
              <div className="fpop-row">
                <span className="lbl">{level + 1}. úroveň od</span>
                <span className="fpop-v tn">{cz(next)} zk.</span>
              </div>
              <div className="fpop-row">
                <span className="lbl">{missing === 0 ? 'Chybí' : 'Ještě chybí'}</span>
                <span className={`fpop-v tn ${missing === 0 ? '' : 'bad-t'}`}>{cz(missing ?? 0)} zk.</span>
              </div>
              <div className="xpbar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
              <p className="small muted tn" style={{ margin: 0 }}>
                Máš {cz(xp)} zk. · {level}. úroveň začíná na {cz(from)} · splněno {pct} %
              </p>
              {missing === 0 && (
                <p className="fpop-note">
                  Můžeš přestoupit na {level + 1}. úroveň{byXp > level + 1 ? ` (zkušenosti už stačí až na ${byXp}. úroveň – přestupuje se po jedné)` : ''}.
                </p>
              )}
              {upcoming.length > 0 && (
                <table className="grid tn"><tbody>
                  {upcoming.map((r) => (
                    <tr key={r.lvl}><td>{r.lvl}. úroveň</td><td className="c">{cz(r.need)}</td><td className="c muted">{xp >= r.need ? 'splněno' : `chybí ${cz(r.need - xp)}`}</td></tr>
                  ))}
                </tbody></table>
              )}
            </>
          )}
          <p className="small muted" style={{ margin: 0 }}>Zkušenosti se při přestupu nenulují (H18).</p>
        </div>
      )}
    >
      {(open, toggle, ref) => (
        <button ref={ref} type="button" className="info-btn" aria-haspopup="dialog" aria-expanded={open} aria-label="Kolik zkušeností chybí na další úroveň" title="Kolik zkušeností chybí na další úroveň" onClick={toggle}>i</button>
      )}
    </Popover>
  );
}

/** Augmentace od Medika (PPP03) – zaškrtnutá = aktivní, efekty se promítnou do atributů, ZO, životů a pohyblivosti. */
function Augmentace() {
  const { character: c, dispatch } = useStore();
  const on = c.augmentations ?? [];
  const eff = (a: (typeof AUGMENTATIONS)[number]) => [
    ...a.effects.map((e) => (e.target === 'attr:int' ? `INT ${sgn(e.value)}` : e.target === 'defenseBase' ? `ZO ${sgn(e.value)}` : '')),
    a.silAtLeast ? `SIL ${a.silAtLeast}` : '', a.hpThird ? 'životy +⅓' : '', a.mobilityX2 ? 'pohyblivost ×2' : '', a.charLoss ? `CHAR −${a.charLoss}` : '',
  ].filter(Boolean).join(', ');
  return (
    <details className="help-d" open={on.length > 0} style={{ marginTop: 6 }}>
      <summary><Icon name="spark" className="i14" /> AUGMENTACE{on.length ? ` (${on.length} aktivní)` : ''}</summary>
      <div className="help" style={{ display: 'block' }}>
        <p className="small" style={{ margin: '0 0 4px' }}>Zaškrtni augmentace, které postava má (provádí je Medicus, PPP03). Efekty se započítají samy.</p>
        {AUGMENTATIONS.map((a) => (
          <label key={a.id} className="small" style={{ display: 'flex', gap: 6, alignItems: 'baseline', padding: '2px 0' }}>
            <input type="checkbox" checked={on.includes(a.id)} onChange={(e) => dispatch({ type: 'update', fn: (x) => toggleAugmentation(x, a.id, e.target.checked) })} />
            <span><b>{a.name}</b> <span className="muted">– {eff(a)}{eff(a) ? '; ' : ''}{a.note}</span></span>
          </label>
        ))}
      </div>
    </details>
  );
}
