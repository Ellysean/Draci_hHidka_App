// Záložka UMĚNÍ – zloděj (7e): zlodějská umění a dovednosti s hody (Alter ego), denní schopnosti (Druhá šance, Zrcadlení),
// pokročilý zloděj (Speciální předměty, Zlodějský cech), schopnosti a specializace (H12 + PPP05) s ovládáním, triky s plným zněním,
// Výroba jedů (Assassin), Lupičská udělátka a pasti (Lupič), Siccova síť, Pověsti a drby, falešné identity (Sicco).
// V boji se triky používají na záložce Boj a stavy (panel Zloděj v boji).
import { useEffect, useMemo, useState } from 'react';
import type { Character, ThiefNetworkMember } from '../model/types';
import { sgn, type Derived } from '../rules/derive';
import { getWeapon } from '../rules/data';
import { progressionName } from '../progression/levelup';
import {
  THIEF, THIEF_TRICKS, actionCost, actionWhy, craftWhy, groupLabel, guildWeapons, hasAbility, isThief, memberType, memberWhy, monthlyPay,
  networkLimit, poisonById, poisonWhy, thiefNotes, thiefOwned, thiefSkillBonus, trickCheck, trickLock, zlo, type ThiefTrick,
} from '../rules/zlodej';
import {
  addIdentity, addMember, addRumor, applyPoison, craftGadget, craftTrap, makePoison, newDay, payMonth, poisonSpent, removeIdentity, removeMember,
  removeRumor, renameMember, runAction, setPoisonStock, setThief, skipMonth, undoThief, useMirror, useSecondChance,
} from '../rules/zlodej-akce';
import { useStore } from '../state/store';
import { useDice } from '../ui/Dice';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

type Put = (next: Character) => void;
interface P { c: Character; d: Derived; put: Put; say: (m: string) => void }

export function Zlodej() {
  const { character: c, derived: d, dispatch } = useStore();
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 6000); return () => clearTimeout(t); }, [msg]);
  const put: Put = (next) => dispatch({ type: 'update', fn: () => next });
  if (!isThief(c)) return null;
  const own = thiefOwned(c);
  const spec = c.progression.specialization;
  return (
    <div className="stack va-page">
      <div className="vy-head"><h1 className="pg">ZLODĚJSKÉ UMĚNÍ{spec ? ` – ${THIEF.specializace[spec]?.name.toUpperCase()}` : ''}</h1></div>
      {msg && <div className="toast" role="status">{msg}</div>}
      <div className="cols">
        <div className="stack">
          <Umeni c={c} d={d} put={put} say={setMsg} />
          <Denni c={c} d={d} put={put} say={setMsg} />
        </div>
        <div className="stack">
          <Schopnosti c={c} d={d} put={put} say={setMsg} />
        </div>
      </div>
      <Triky c={c} d={d} put={put} say={setMsg} />
      {(own.has('vyroba_jedu') || Object.values(zlo(c).poisons).some((n) => n > 0) || zlo(c).weaponPoison) && <Jedy c={c} d={d} put={put} say={setMsg} />}
      {(own.has('lupicska_udelatka') || own.has('mistrovstvi_zelezneho_klice')) && <Vyroba c={c} d={d} put={put} say={setMsg} />}
      {own.has('siccova_sit') && <Sit c={c} d={d} put={put} say={setMsg} />}
      {own.has('povesti_a_drby') && <Povesti c={c} put={put} />}
      <Zaznam c={c} put={put} />
    </div>
  );
}

// ---------------------------------------------------------------- umění a dovednosti

function Umeni({ c, d }: P) {
  const { roll } = useDice();
  const own = thiefOwned(c);
  const base = THIEF.zaklady.map((z) => ({ id: z.id, name: z.nazev, sub: 'Základy zlodějského umění' }));
  const arts = THIEF.umeni.filter((u) => own.has(u.id)).map((u) => ({ id: u.skill, name: u.nazev, sub: u.triky.join(', ') }));
  const extra = [['umeni_prepadu', 'Umění přepadů'], ['umeni_neferoveho_boje', 'Umění neférového boje'], ['umeni_boje_s_plastem', 'Umění boje s pláštěm']]
    .filter(([id]) => c.skills.some((s) => s.id === id)).map(([id, name]) => ({ id, name, sub: THIEF_TRICKS.filter((t) => t.skill === id).map((t) => t.n).join(', ') }));
  const rows = [...base, ...arts, ...extra];
  const S = zlo(c);
  return (
    <Sheet>
      <Ribbon icon="mask">UMĚNÍ A DOVEDNOSTI</Ribbon>
      {hasAbility(c, 'alter_ego') && (
        <p className="small" style={{ margin: '0 0 6px' }}>Alter ego: {S.alterEgo ? <b>vystupuješ pod falešnou identitou – +5 k dovednostem s CHAR</b> : 'vypnuto (přepínač u schopnosti)'}</p>
      )}
      <table className="grid tn">
        <thead><tr><th>Dovednost</th><th className="c">Stupeň</th><th className="c">Celkem</th><th /></tr></thead>
        <tbody>
          {rows.map((r) => {
            const k = d.skills.find((s) => s.id === r.id);
            const b = thiefSkillBonus(c, d, r.id);
            return (
              <tr key={r.id}>
                <td><b>{r.name}</b><div className="small muted">{r.sub}</div></td>
                <td className="c">{k?.rank ?? '—'}</td>
                <td className="c">{k ? sgn(b.bonus) : '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn" type="button" disabled={!k} onClick={() => roll('k10', b.bonus, `${r.name} (${b.parts.join(', ')})`)}>⚄ k10</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="small muted" style={{ margin: '6px 0 0' }}>{THIEF.pravidla.umeni} Zlepšuje se na záložce Dovednosti (Expertiza od 6. úrovně).</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- denní a pokročilé

function Denni({ c, put, say }: P) {
  const S = zlo(c);
  const own = thiefOwned(c);
  const adv = c.progression.level >= 6;
  return (
    <Sheet>
      <Ribbon icon="hourglass">DEN A CECH</Ribbon>
      <div className="steps">
        <button className="btn" type="button" onClick={() => { put(newDay(c)); say('Nový den'); }}>Nový den</button>
        {own.has('druha_sance') && (
          <button className="btn dark" type="button" disabled={S.secondChanceUsed} title={S.secondChanceUsed ? 'dnes už použito' : 'Zopakuj neúspěšný hod na profesní dovednost'}
            onClick={() => { put(useSecondChance(c)); say('Druhá šance – hoď ověření znovu'); }}>{S.secondChanceUsed ? 'Druhá šance použita' : 'Druhá šance (1× denně)'}</button>
        )}
        {own.has('zrcadleni') && (
          <button className="btn dark" type="button" disabled={S.mirrorUsed} onClick={() => put(useMirror(c))}>{S.mirrorUsed ? 'Zrcadlení použito' : 'Zrcadlení (1× denně)'}</button>
        )}
      </div>
      <dl className="va-dl small" style={{ marginTop: 8 }}>
        <dt>Zlodějská hantýrka</dt><dd>{THIEF.pravidla.hantyrka}</dd>
        {adv ? (
          <>
            <dt>Speciální předměty</dt>
            <dd>{THIEF.pravidla.ppp_specialni_predmety} Bomby a udělátka jsou v katalogu (Výbava a peníze → Vybavení), zbraně cechu na kartě Zbraně (PPP).</dd>
            <dt>Zlodějský cech</dt><dd>{THIEF.pravidla.ppp_cech}</dd>
            <dt>Tajné schránky</dt><dd>{THIEF.pravidla.ppp_schranky} {THIEF.pravidla.ppp_holubi}</dd>
            <dt>Tetování</dt><dd>{THIEF.pravidla.ppp_tetovani}</dd>
          </>
        ) : <><dt>Od 6. úrovně</dt><dd>Speciální předměty Zloděje (černý trh) a Zlodějský cech – automaticky (PPP05).</dd></>}
      </dl>
    </Sheet>
  );
}

// ---------------------------------------------------------------- schopnosti a specializace

function Schopnosti({ c, d, put }: P) {
  const S = zlo(c);
  const spec = c.progression.specialization;
  const sp = spec ? THIEF.specializace[spec] : null;
  const ids = [...new Set(c.progression.learnedAbilities.map((a) => a.id))];
  const notes = thiefNotes(c);
  const [open, setOpen] = useState<string | null>(null);
  const [idName, setIdName] = useState('');
  const melee = c.equipment.weapons;
  return (
    <Sheet>
      <Ribbon icon="star">SCHOPNOSTI</Ribbon>
      <dl className="va-dl small">
        <dt>Základy zlodějského umění</dt><dd>{THIEF.pravidla.zaklady}</dd>
        {sp && (
          <>
            <dt>{sp.name} (specializace)</dt><dd>{sp.intro} <span className="muted">PPP05 s. {sp.page}</span></dd>
            {sp.auto.map((a) => <div key={a.id} style={{ display: 'contents' }}><dt>{a.name}</dt><dd>{a.text} <span className="pill ok">AUTOMATICKY</span></dd></div>)}
          </>
        )}
        {ids.map((id) => {
          const a = THIEF.schopnosti[id];
          const full = open === id;
          return (
            <div key={id} style={{ display: 'contents' }}>
              <dt>
                <button type="button" className="linkbtn" aria-expanded={full} onClick={() => setOpen(full ? null : id)}>{a?.name ?? progressionName('zlodej', id)}</button>
                {a?.spec && a.spec !== spec ? <span className="small muted"> ({THIEF.specializace[a.spec]?.name})</span> : null}
              </dt>
              <dd>
                {full ? a?.text.split('\n').map((t, i) => <span key={i} style={{ display: 'block' }}>{t}</span>) : a?.short ?? ''}
                {a ? <span className="muted"> ({a.source} s. {a.page})</span> : null}
                {id === 'boj_se_dvema_zbranemi' && (
                  <span className="steps">
                    <select className="field" value={S.offhand ?? ''} onChange={(e) => put(setThief(c, { offhand: e.target.value || null }))} aria-label="Druhá zbraň">
                      <option value="">– druhá zbraň (lehká krátká) –</option>
                      {melee.filter((w) => w.uid !== d.activeWeaponUid).map((w) => <option key={w.uid} value={w.uid}>{d.weapons.find((x) => x.uid === w.uid)?.name ?? getWeapon(w.itemId)?.n ?? w.uid}</option>)}
                    </select>
                    {d.dual && <span className={d.dual.ok ? 'small' : 'small bad-t'}>{d.dual.ok ? `sečteno s hlavní zbraní (ÚČ ${d.attackNumber.value})` : d.dual.why}</span>}
                  </span>
                )}
                {id === 'alter_ego' && (
                  <>
                    <label className="chk" style={{ display: 'block' }}><input type="checkbox" checked={S.alterEgo} onChange={(e) => put(setThief(c, { alterEgo: e.target.checked }))} /> Právě vystupuji pod falešnou identitou (+5 k Přesvědčování, Umění proměn a šarmu)</label>
                    {S.identities.map((x) => (
                      <span key={x.uid} style={{ display: 'block' }}><b>{x.name}</b>{x.note ? ` – ${x.note}` : ''} <button type="button" className="fpop-x" aria-label={`Smazat ${x.name}`} onClick={() => put(removeIdentity(c, x.uid))}>×</button></span>
                    ))}
                    <span className="steps">
                      <input className="field" value={idName} placeholder="jméno identity – krycí legenda" onChange={(e) => setIdName(e.target.value)} aria-label="Nová identita" />
                      <button className="btn" type="button" disabled={!idName.trim()} onClick={() => { const [n, ...r] = idName.split('–'); put(addIdentity(c, n.trim(), r.join('–').trim())); setIdName(''); }}>Přidat</button>
                    </span>
                  </>
                )}
                {id === 'sifrovani' && (() => {
                  const b = thiefSkillBonus(c, d, 'cteni_a_psani');
                  return <span className="steps"><DiceBtn label="⚄ Obtížnost šifry" bonus={b.bonus + 5} text={`Šifrování – obtížnost šifry (Čtení a psaní ${sgn(b.bonus)} + 5)`} /><DiceBtn label="⚄ Dešifrovat" bonus={b.bonus + 5} text="Dešifrování – Čtení a psaní +5 vs. obtížnost šifry" /></span>;
                })()}
                {(id === 'lupicuv_partak' || id === 'duvernik') && <span className="muted"> → záložka Přátelé.</span>}
              </dd>
            </div>
          );
        })}
      </dl>
      {notes.length > 0 && (
        <>
          <b className="lbl" style={{ display: 'block', marginTop: 8 }}>Situační bonusy</b>
          <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>{notes.map((n) => <li key={n.source}><b>{n.source}:</b> {n.text}</li>)}</ul>
        </>
      )}
      {!spec && c.progression.level >= 5 && (
        <p className="small muted" style={{ margin: '8px 0 0' }}>
          Specializace od 6. úrovně (při přestupu): {Object.values(THIEF.specializace).map((s) => `${s.name} (${s.requires.map((r) => progressionName('zlodej', r)).join(' + ')})`).join(' · ')}. {THIEF.pravidla.ppp_specializace}
        </p>
      )}
    </Sheet>
  );
}

function DiceBtn({ label, bonus, text }: { label: string; bonus: number; text: string }) {
  const { roll } = useDice();
  return <button className="btn" type="button" onClick={() => roll('k10', bonus, text)}>{label}</button>;
}

// ---------------------------------------------------------------- triky

type Filter = 'known' | 'all';
const USE_LABEL: Record<string, string> = { utok: 'DO ÚTOKU', misto: 'MÍSTO ÚTOKU', obrana: 'DO OBRANY', akce: 'KRÁTKÁ AKCE V BOJI' };

function Triky({ c, d }: P) {
  const { roll } = useDice();
  const [flt, setFlt] = useState<Filter>('known');
  const [grp, setGrp] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const own = useMemo(() => thiefOwned(c), [c]);
  const known = THIEF_TRICKS.filter((t) => !trickLock(c, t, own));
  const pool = flt === 'known' ? known : THIEF_TRICKS;
  const groups = [...new Set(pool.map((t) => t.skupina))];
  const list = pool.filter((t) => (!grp || t.skupina === grp) && (!q || `${t.n} ${t.popis}`.toLowerCase().includes(q.toLowerCase())));
  const check = (t: ThiefTrick) => {
    const b = trickCheck(c, d, t);
    roll('k10', b.bonus, `${t.n} – ${t.overeni} (${b.parts.join(', ')})`);
  };
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="book">ZLODĚJSKÉ TRIKY</Ribbon><span className="small tn">zná {known.length} z {THIEF_TRICKS.length}</span></div>
      <div className="chips">
        {([['known', `Známé (${known.length})`], ['all', `Všechny (${THIEF_TRICKS.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={flt === k} onClick={() => { setFlt(k); setGrp(null); }}>{l}</button>
        ))}
        <span style={{ width: 8 }} />
        {groups.map((g) => <button key={g} type="button" className="chip" aria-pressed={grp === g} onClick={() => setGrp(grp === g ? null : g)}>{groupLabel(g)}</button>)}
      </div>
      <div className="al-ws" style={{ marginTop: 8 }}>
        <input className="field" type="search" placeholder="Hledat trik…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Hledat trik" />
      </div>
      <div className="al-list">
        {list.length === 0 && <p className="small muted">{flt === 'known' ? 'Zatím žádný trik – triky dávají zlodějská umění (přestup) a schopnosti od 6. úrovně.' : 'Nic neodpovídá filtru.'}</p>}
        {list.map((t) => {
          const lock = trickLock(c, t, own);
          const b = trickCheck(c, d, t);
          return (
            <div key={t.id} className="recipe">
              <div>
                <h4>
                  <button type="button" className="linkbtn al-name" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>{t.n}</button>
                  {lock ? <> <span className="pill">{lock.toUpperCase()}</span></> : <> <span className="pill ok">UMÍ</span></>}
                  {t.boj && <> <span className="pill">{USE_LABEL[t.boj]}</span></>}
                  {t.once && <> <span className="pill">JEDNORÁZOVĚ</span></>}
                </h4>
                <div className="meta">{groupLabel(t.skupina)} · {t.zdroj} s. {t.strana} · četnost {t.cetnost} · použití {t.pouziti} · <b>{t.overeni}</b></div>
              </div>
              {!lock && (
                <div className="al-ws" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                  <button className="btn dark" type="button" disabled={!b.have} title={b.have ? undefined : b.parts.join(', ')} onClick={() => check(t)}>⚄ {sgn(b.bonus)}</button>
                </div>
              )}
              {open === t.id && (
                <div className="al-detail">
                  <dl>
                    <dt>ČETNOST</dt><dd>{t.cetnost}</dd>
                    <dt>POUŽITÍ</dt><dd>{t.pouziti}</dd>
                    <dt>OVĚŘENÍ</dt><dd>{t.overeni}</dd>
                  </dl>
                  {t.popis.split('\n').map((para, i) => <p key={i} style={{ margin: '4px 0' }}>{para}</p>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="small muted" style={{ margin: '8px 0 0' }}>{THIEF.pravidla.triky} Triky se nevybírají – dává je každé zlodějské umění a schopnosti Mistrovství…; v boji je použiješ na záložce Boj a stavy.</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- jedy

function Jedy({ c, put, say }: P) {
  const S = zlo(c);
  const pw = poisonWhy(c);
  const on = poisonById(S.weaponPoison ?? '');
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="skull">JEDY</Ribbon>{on && <span className="pill bad">NA ZBRANI: {on.nazev.toUpperCase()}</span>}</div>
      <div className="al-list">
        {THIEF.jedy.map((p) => {
          const n = S.poisons[p.id] ?? 0;
          return (
            <div key={p.id} className="recipe">
              <div>
                <h4>{p.nazev} <span className="pill">{n} {n === 1 ? 'dávka' : n > 1 && n < 5 ? 'dávky' : 'dávek'}</span></h4>
                <div className="meta">{p.zaklad} · trvání {p.trvani} · {p.vzhled} · nebezpečnost <b>{p.nebezpecnost}</b> · PPP05 s. {p.strana}</div>
                <div className="small">{p.popis}</div>
              </div>
              <div className="al-ws" style={{ justifyContent: 'flex-end' }}>
                {thiefOwned(c).has('vyroba_jedu') && <button className="btn" type="button" disabled={!!pw} title={pw || undefined} onClick={() => { put(makePoison(c, p.id)); say(`${p.nazev}: +1 dávka`); }}>Dnešní dávka</button>}
                <button className="btn dark" type="button" disabled={n < 1} onClick={() => put(applyPoison(c, p.id))}>Potřít zbraň</button>
                <input className="field num tn" style={{ width: 60, flex: "none" }} type="number" min={0} value={n} aria-label={`Zásoba – ${p.nazev}`} onChange={(e) => put(setPoisonStock(c, p.id, Number(e.target.value)))} />
              </div>
            </div>
          );
        })}
      </div>
      {on && (
        <div className="steps" style={{ marginTop: 6 }}>
          <span className="small">Jed na zbrani působí při prvním Zranění, pak se setře.</span>
          <button className="btn wine" type="button" onClick={() => put(poisonSpent(c, true))}>Zásah – jed působí</button>
          <button className="btn" type="button" onClick={() => put(poisonSpent(c, false))}>Setřít</button>
        </div>
      )}
      <p className="small muted" style={{ margin: '6px 0 0' }}>{THIEF.schopnosti.vyroba_jedu.text} Rychlé tasení: potření zbraně okamžitou akcí 1× za kolo. Prsten s jedem: jed 2× silnější nebo 2× rychlejší.</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- výroba (Lupič)

function Vyroba({ c, d, put, say }: P) {
  const { roll } = useDice();
  const [pay, setPay] = useState(true);
  const own = thiefOwned(c);
  const gadgets = THIEF.predmety.filter((p) => p.typ === 'udelatko');
  const traps = THIEF.predmety.filter((p) => p.typ === 'past');
  const weapons = guildWeapons();
  const key = thiefSkillBonus(c, d, 'umeni_zelezneho_klice');
  const doCraft = (kind: 'gear' | 'weapon', id: string) => {
    const r = craftGadget(c, kind, id, pay);
    if (r.error) say(r.error); else { put(r.character!); say('Vyrobeno – ve výbavě'); }
  };
  return (
    <Sheet>
      <Ribbon icon="coin">VÝROBA</Ribbon>
      {own.has('lupicska_udelatka') && (
        <>
          <label className="chk small"><input type="checkbox" checked={pay} onChange={(e) => setPay(e.target.checked)} /> Zaplatit materiál (cena předmětu zahrnuje materiál – PPP05)</label>
          <div className="al-list">
            {gadgets.map((g) => (
              <div key={g.id} className="recipe">
                <div><h4>{g.nazev}</h4><div className="meta">výroba {String(g.parametry.vyroba)} · {(g.parametry.cena as [number, string])?.join(' ')} · {String(g.parametry.w)} lb</div><div className="small">{g.popis}</div></div>
                <div className="al-ws" style={{ justifyContent: 'flex-end' }}><button className="btn dark" type="button" onClick={() => doCraft('gear', `zl_${g.id}`)}>Vyrobit</button></div>
              </div>
            ))}
            {weapons.map((w) => {
              const def = getWeapon(w.id);
              return (
                <div key={w.id} className="recipe">
                  <div><h4>{def?.n ?? w.id} <span className="pill">{w.druh === 'assassin' ? 'ASSASSINSKÁ' : w.druh === 'gentleman' ? 'GENTLEMANSKÁ' : 'IMPROVIZOVANÁ'}</span></h4>
                    <div className="meta">Ú/Z/O {def?.att}/{def?.dmg}/{def?.def} · výroba {w.vyroba} · {def?.price ? `${def.price.v} ${def.price.cur}` : '—'}</div></div>
                  <div className="al-ws" style={{ justifyContent: 'flex-end' }}><button className="btn" type="button" onClick={() => doCraft('weapon', w.id)}>Vyrobit</button></div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {own.has('mistrovstvi_zelezneho_klice') && (
        <>
          <b className="lbl" style={{ display: 'block', marginTop: 8 }}>Pasti (Nastražení pasti) – Umění železného klíče {sgn(key.bonus)}</b>
          <div className="al-list">
            {traps.map((t) => (
              <div key={t.id} className="recipe">
                <div><h4>{t.nazev}</h4><div className="meta">obtížnost {String(t.parametry.obtiznost)} · {String(t.parametry.vyzaduje)} · výroba {String(t.parametry.vyroba)}</div><div className="small">{t.popis}</div></div>
                <div className="al-ws" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn dark" type="button" disabled={!!craftWhy(c, t)} onClick={() => {
                    const r = roll('k10', key.bonus, `Nastražení pasti – ${t.nazev} vs. ${t.parametry.obtiznost}`);
                    const x = craftTrap(c, t, r.total); put(x.character); say(x.text);
                  }}>⚄ Vyrobit</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- Siccova síť

function Sit({ c, put, say }: P) {
  const S = zlo(c);
  const N = S.network;
  const [type, setType] = useState<ThiefNetworkMember['type']>('kapsar');
  const [name, setName] = useState('');
  const [pay, setPay] = useState(true);
  const [act, setAct] = useState(THIEF.sit.akce[0].id);
  const [sel, setSel] = useState<string[]>([]);
  const [dc, setDc] = useState(8);
  const [foreign, setForeign] = useState(false);
  const [payAct, setPayAct] = useState(true);
  const a = THIEF.sit.akce.find((x) => x.id === act)!;
  const team = N.members.filter((m) => m.type === a.kumpan);
  const chosen = sel.filter((u) => team.some((m) => m.uid === u));
  const mw = memberWhy(c);
  const aw = actionWhy(c, a, chosen, foreign);
  const setNet = (patch: Partial<typeof N>) => put(setThief(c, { network: { ...N, ...patch } }));
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="person">SICCOVA SÍŤ</Ribbon><span className="small tn">{N.members.length} / {networkLimit(c)} kumpánů · výplata {monthlyPay(c)} zl/měsíc{N.bribe ? ' · PODPLACENO +5' : ''}</span></div>
      <div className="pr-edit">
        <label>Jméno sítě <input className="field" value={N.name} onChange={(e) => setNet({ name: e.target.value })} /></label>
        <label>Symbol <input className="field" value={N.symbol} onChange={(e) => setNet({ symbol: e.target.value })} /></label>
        <label>Sídlo <input className="field" value={N.seat} onChange={(e) => setNet({ seat: e.target.value })} /></label>
      </div>
      <table className="grid tn" style={{ marginTop: 6 }}>
        <thead><tr><th>Kumpán</th><th>Typ</th><th className="c">Bez výplaty</th><th /></tr></thead>
        <tbody>
          {N.members.length === 0 && <tr><td colSpan={4} className="small muted">Síť je prázdná – naverbuj první kumpány (první člen každého typu je kápo).</td></tr>}
          {N.members.map((m) => (
            <tr key={m.uid}>
              <td><input className="field" value={m.name} aria-label={`Jméno – ${m.name}`} onChange={(e) => put(renameMember(c, m.uid, e.target.value))} /></td>
              <td>{memberType(m.type)?.typ}{m.kapo && <> <span className="pill ok">KÁPO</span></>}</td>
              <td className="c">{m.unpaid ? `${m.unpaid} měs.` : '—'}</td>
              <td className="c"><button type="button" className="fpop-x" aria-label={`Propustit ${m.name}`} onClick={() => put(removeMember(c, m.uid, 'propuštěn'))}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="steps" style={{ marginTop: 6 }}>
        <select className="field" value={type} onChange={(e) => setType(e.target.value as ThiefNetworkMember['type'])} aria-label="Typ kumpána">
          {THIEF.sit.kumpani.map((k) => <option key={k.id} value={k.id}>{k.typ} ({k.cena} zl)</option>)}
        </select>
        <input className="field" value={name} placeholder="jméno" onChange={(e) => setName(e.target.value)} aria-label="Jméno kumpána" />
        <label className="chk small"><input type="checkbox" checked={pay} onChange={(e) => setPay(e.target.checked)} /> zaplatit nábor</label>
        <button className="btn dark" type="button" disabled={!!mw} title={mw || undefined} onClick={() => { const r = addMember(c, type, name, pay); if (r.error) say(r.error); else { put(r.character!); setName(''); } }}>Naverbovat</button>
      </div>
      <div className="steps" style={{ marginTop: 6 }}>
        <button className="btn" type="button" disabled={!N.members.length} onClick={() => { const r = payMonth(c); if (r.error) say(r.error); else { put(r.character!); say(`Výplata ${monthlyPay(c)} zl`); } }}>Měsíční výplata ({monthlyPay(c)} zl)</button>
        <button className="btn wine" type="button" disabled={!N.members.length} onClick={() => { const r = skipMonth(c); put(r.character); say(r.left.length ? `Odešli: ${r.left.join(', ')}` : 'Kápové zatím vydrží'); }}>Měsíc bez výplaty</button>
      </div>
      <b className="lbl" style={{ display: 'block', marginTop: 10 }}>Akce sítě</b>
      <div className="steps">
        <select className="field" value={act} onChange={(e) => { setAct(e.target.value); setSel([]); }} aria-label="Akce sítě">
          {THIEF.sit.akce.map((x) => <option key={x.id} value={x.id}>{x.nazev} – {memberType(x.kumpan)?.typ} ({x.nebezpecnost}, {x.cena} zl/kumpán)</option>)}
        </select>
        <label className="small">Obtížnost <input className="field num tn" type="number" value={dc} onChange={(e) => setDc(Math.trunc(Number(e.target.value)) || 0)} /></label>
      </div>
      <p className="small" style={{ margin: '4px 0' }}>{a.popis}</p>
      <div className="chips">
        {team.length === 0 && <span className="small muted">Žádný {memberType(a.kumpan)?.typ} v síti.</span>}
        {team.map((m) => <button key={m.uid} type="button" className="chip" aria-pressed={chosen.includes(m.uid)} onClick={() => setSel(chosen.includes(m.uid) ? chosen.filter((u) => u !== m.uid) : [...chosen, m.uid])}>{m.name}</button>)}
      </div>
      <div className="steps" style={{ marginTop: 6 }}>
        <label className="chk small"><input type="checkbox" checked={foreign} onChange={(e) => setForeign(e.target.checked)} /> cizí město (10×, max. 3)</label>
        <label className="chk small"><input type="checkbox" checked={payAct} onChange={(e) => setPayAct(e.target.checked)} /> zaplatit {actionCost(a, chosen.length, foreign)} zl</label>
        <button className="btn dark" type="button" disabled={!!aw} title={aw || undefined} onClick={() => {
          const r = runAction(c, act, chosen, dc, { foreign, pay: payAct });
          if (r.error) say(r.error); else { put(r.character!); say(r.text!); setSel([]); }
        }}>⚄ Provést (1k10 + {chosen.length}{N.bribe ? ' + 5' : ''})</button>
      </div>
      <dl className="va-dl small" style={{ marginTop: 8 }}>
        {Object.entries(THIEF.sit.pravidla).map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{({ limit: 'Limit', nabor: 'Nábor a plat', sidlo: 'Sídlo', overeni: 'Ověření', nebezpecnost: 'Nebezpečnost', ciziMesto: 'Cizí město', druzina: 'Družina' } as Record<string, string>)[k] ?? k}</dt><dd>{v}</dd></div>)}
      </dl>
    </Sheet>
  );
}

function Povesti({ c, put }: { c: Character; put: Put }) {
  const S = zlo(c);
  const [who, setWho] = useState('');
  const [where, setWhere] = useState('');
  const [plus, setPlus] = useState(true);
  return (
    <Sheet>
      <Ribbon icon="quill">POVĚSTI A DRBY</Ribbon>
      {S.rumors.length === 0 && <p className="small muted">Žádná šířená pověst.</p>}
      {S.rumors.map((r) => (
        <p key={r.uid} className="small" style={{ margin: '0 0 4px' }}>
          <b>{r.who}</b> – <span className={`pill ${r.plus ? 'ok' : 'bad'}`}>{r.plus ? 'VÝHODA +5' : 'NEVÝHODA −5'}</span> k sociálním interakcím{r.where ? ` (${r.where})` : ''}{' '}
          <button type="button" className="fpop-x" aria-label={`Zrušit pověst – ${r.who}`} onClick={() => put(removeRumor(c, r.uid))}>×</button>
        </p>
      ))}
      <div className="steps">
        <input className="field" value={who} placeholder="o kom / o čem" onChange={(e) => setWho(e.target.value)} aria-label="Osoba" />
        <select className="field" value={plus ? '+' : '-'} onChange={(e) => setPlus(e.target.value === '+')} aria-label="Druh pověsti"><option value="+">dobrá (+5)</option><option value="-">špatná (−5)</option></select>
        <input className="field" value={where} placeholder="kde se ví" onChange={(e) => setWhere(e.target.value)} aria-label="Kde" />
        <button className="btn dark" type="button" disabled={!who.trim()} onClick={() => { put(addRumor(c, who.trim(), plus, where.trim())); setWho(''); setWhere(''); }}>Šířit (≥ 1 den)</button>
      </div>
      <p className="small muted" style={{ margin: '6px 0 0' }}>{THIEF.schopnosti.povesti_a_drby?.text}</p>
    </Sheet>
  );
}

function Zaznam({ c, put }: { c: Character; put: Put }) {
  const S = zlo(c);
  if (!S.log.length) return null;
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="book">ZÁZNAM ZLODĚJE</Ribbon>{S.undo.length > 0 && <button className="btn" type="button" onClick={() => put(undoThief(c))}>↶ Vrátit poslední</button>}</div>
      <ul className="log">{S.log.slice(0, 15).map((l) => <li key={l.uid}><span>{l.text}</span><b className="small muted">{new Date(l.at).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</b></li>)}</ul>
      <p className="small muted" style={{ margin: '4px 0 0' }}>Vrátit vrací stav zloděje i výzbroj, výbavu a peníze (historie peněz na záložce Výbava zůstává).</p>
    </Sheet>
  );
}
