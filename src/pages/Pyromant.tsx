// Specializace PYROMANT na záložce Alchymie (PPP03 s. 143–162, fáze 7a+.2): odpálení rachejtlí a střel,
// sapérské hody, transmutace kovu a konstrukty (stavitel, karta s palivem, chrlení, vylepšení).
import { useState } from 'react';
import type { Character, Construct } from '../model/types';
import { alch, hasAbility, recipeById } from '../rules/alchemy';
import { sgn, type Derived } from '../rules/derive';
import { skillCheck } from '../rules/medicus';
import {
  CONSTRUCTS, MATERIALS, TRANSMUTATION, alloyMana, brainDef, buildConstruct, burnFuel, constructStats, fuelDef, fuelPerDay, launch,
  nosicCount, planConstruct, refuel, removeConstruct, transmute, transmuteMana, updateConstruct, upgradeConstruct, upgradeDef,
  type ConstructSpec,
} from '../rules/pyromant';
import { useDice } from '../ui/Dice';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

type Upd = (next: Character) => void;
type P = { c: Character; d: Derived; put: Upd; say: (s: string) => void };
const int = (v: string, min = 0) => Math.max(min, Math.trunc(Number(v)) || 0);
const num = (n: number) => (Math.round(n * 100) / 100).toLocaleString('cs');

// ---------------------------------------------------------------- Pyromancie, sapér, transmutace

export function PyromantSheet({ c, d, put, say }: P) {
  const { roll } = useDice();
  const s = alch(c);
  const rockets = s.crafted.filter((x) => !x.ruined && recipeById(x.recipeId)?.launch);
  const [rk, setRk] = useState('');
  const [moving, setMoving] = useState(false);
  const [trap, setTrap] = useState<'najit' | 'nastrazit'>('nastrazit');
  const [trapDc, setTrapDc] = useState(15);
  const [trapRoll, setTrapRoll] = useState<number | null>(null);
  const [from, setFrom] = useState('Železo');
  const [to, setTo] = useState('Stříbro');
  const [alloy, setAlloy] = useState('');
  const [times, setTimes] = useState(1);
  const pyro = skillCheck(c, d, 'pyromancie', 'Pyromancie', 'obr', true);
  const cur = rockets.find((x) => x.uid === rk) ?? rockets[0];
  const lr = cur ? recipeById(cur.recipeId)!.launch! : null;
  const saper = hasAbility(c, 'sapersky_vycvik');
  const trapBase = trap === 'najit' ? skillCheck(c, d, 'postreh', 'Postřeh', 'int') : skillCheck(c, d, 'mechanika', 'Mechanika', 'obr', true);
  const trapBonus = saper ? trapBase.total + 5 : trapBase.total;
  const tMana = alloy ? alloyMana(alloy, times) : transmuteMana(from, to, times);
  return (
    <Sheet>
      <div className="md">
        <div className="ribbon-row"><Ribbon icon="spark">PYROMANT</Ribbon><span className="small muted">{pyro.parts.join(' + ')}</span></div>
        <p className="small" style={{ margin: '0 0 8px' }}>
          Pyromancie dává +5 k Lučbě při výrobě z oboru Nestabilní substance. Výheň přidává bonus dílny k Pyromancii a Mechanice.
        </p>

        {hasAbility(c, 'strely_a_rachejtle') && <>
          <b className="small">ODPÁLENÍ RACHEJTLE / STŘELY</b>
          {rockets.length === 0 ? <p className="small muted" style={{ margin: '2px 0 8px' }}>Žádná vyrobená rachejtle ani střela.</p> : <>
            <div className="al-ws">
              <select className="field" value={cur?.uid} onChange={(e) => setRk(e.target.value)} aria-label="Rachejtle nebo střela">
                {rockets.map((x) => <option key={x.uid} value={x.uid}>{x.name}{(x.qty ?? 1) > 1 ? ` ×${x.qty}` : ''}</option>)}
              </select>
              {lr?.dcMoving && <label className="small al-here"><input type="checkbox" checked={moving} onChange={(e) => setMoving(e.target.checked)} /> pohyblivý cíl</label>}
            </div>
            {lr && <p className="small tn" style={{ margin: '4px 0' }}>
              1k10 {sgn(pyro.total)} vs. <b>{moving && lr.dcMoving ? lr.dcMoving : lr.dc}</b> · {lr.time}{lr.range ? ` · ${lr.range}` : ''}<br />
              <b>zápalná:</b> {lr.fire}<br /><b>výbušná:</b> {lr.blast}
            </p>}
            <div className="steps" style={{ marginBottom: 8 }}>
              <button className="btn dark" type="button" onClick={() => {
                const x = launch(c, cur!.uid, roll('k10', pyro.total, `Odpálení – ${cur!.name}`).total, moving);
                put(x.character); say(x.success ? `${cur!.name}: zásah!` : `${cur!.name} minula cíl.`);
              }}>⚄ Odpálit</button>
            </div>
          </>}
        </>}

        <b className="small">PAST {saper && '(Sapérský výcvik +5)'}</b>
        <div className="al-ws">
          <select className="field" value={trap} onChange={(e) => { setTrap(e.target.value as 'najit' | 'nastrazit'); setTrapRoll(null); }} aria-label="Druh hodu">
            <option value="nastrazit">vyrobit / nastražit / zneškodnit (Mechanika)</option>
            <option value="najit">najít (Postřeh)</option>
          </select>
          <label className="small al-here">obtížnost (PJ) <input className="field num tn" type="number" value={trapDc} onChange={(e) => { setTrapDc(int(e.target.value)); setTrapRoll(null); }} /></label>
        </div>
        <div className="steps small tn" style={{ alignItems: 'center', margin: '4px 0 8px' }}>
          <span>1k10 {sgn(trapBonus)} <span className="muted">({[...trapBase.parts, saper ? 'sapér +5' : ''].filter(Boolean).join(' + ')})</span></span>
          <button className="btn" type="button" onClick={() => setTrapRoll(roll('k10', trapBonus, trap === 'najit' ? 'Najít past' : 'Past – Mechanika').total)}>⚄ Hodit</button>
          {trapRoll != null && <b className={trapRoll > trapDc ? '' : 'bad-t'}>{trapRoll > trapDc ? 'Úspěch' : 'Neúspěch'} ({trapRoll}){trap === 'nastrazit' && trapRoll > trapDc ? ` – kdo past hledá, hází Postřeh vs. ${trapRoll}` : ''}</b>}
        </div>

        {hasAbility(c, 'transmutace_kovu') && <>
          <b className="small">TRANSMUTACE KOVU</b>
          <div className="al-ws">
            <select className="field" value={alloy} onChange={(e) => setAlloy(e.target.value)} aria-label="Druh proměny">
              <option value="">proměna kovu</option>
              {TRANSMUTATION.alloys.map((a) => <option key={a.id} value={a.id}>slitina {a.name}</option>)}
            </select>
            {!alloy && <>
              <select className="field" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Z kovu">{TRANSMUTATION.metals.map((m) => <option key={m}>{m}</option>)}</select>
              <span className="small">→</span>
              <select className="field" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Na kov">{TRANSMUTATION.metals.map((m) => <option key={m}>{m}</option>)}</select>
            </>}
            <select className="field" value={times} onChange={(e) => setTimes(Number(e.target.value))} aria-label="Množství">
              <option value={1}>prsten / amulet (×1)</option><option value={5}>ostří dýky (×5)</option>
            </select>
          </div>
          <p className="small tn" style={{ margin: '4px 0' }}>
            {tMana == null ? 'Stejný kov – nic k proměně.' : <>Potřeba <b>{tMana}</b> many, asi 10 minut.</>}
            {alloy && <> {TRANSMUTATION.alloys.find((a) => a.id === alloy)?.text}</>}
          </p>
          <div className="steps"><button className="btn" type="button" disabled={tMana == null || tMana > c.vitals.manaCurrent} onClick={() => {
            const label = alloy ? `slitina ${TRANSMUTATION.alloys.find((a) => a.id === alloy)?.name}` : `${from} → ${to}`;
            const x = transmute(c, tMana!, `${label}${times > 1 ? ' (ostří dýky)' : ''}`);
            if (x.error) say(x.error); else { put(x.character); say(`Transmutace: ${label}`); }
          }}>Provést (−{tMana ?? 0} many)</button></div>
        </>}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Konstrukty

const defaultSpec = (): ConstructSpec => ({ size: 'B', material: 'Kov', fuel: 'mana', tanks: 0, brain: 2, upgrades: [] });

export function KonstruktySheet({ c, d, put, say }: P) {
  const s = alch(c);
  const [edit, setEdit] = useState<{ uid: string | null } | null>(null);
  if (!hasAbility(c, 'konstrukty')) {
    return (
      <Sheet>
        <Ribbon icon="leaf">KONSTRUKTY</Ribbon>
        <p className="small muted" style={{ margin: 0 }}>Volitelná schopnost Pyromanta <b>Konstrukty</b> (od 6. úrovně) – mechaničtí pomocníci z těla, srdce a mozku.</p>
      </Sheet>
    );
  }
  const scrap = s.constructScrap ?? { mana: 0, materials: 0 };
  return (
    <Sheet>
      <div className="ribbon-row"><Ribbon icon="leaf">KONSTRUKTY</Ribbon><span className="small muted">nosiče: {nosicCount(c)} ks{scrap.mana || scrap.materials ? ` · šrot ${scrap.mana} many / ${scrap.materials} surovin` : ''}</span></div>
      {(s.constructs ?? []).length === 0 && <p className="small muted" style={{ margin: 0 }}>Zatím žádný konstrukt. Výroba potřebuje dílnu s výhní.</p>}
      {(s.constructs ?? []).map((k) => <ConstructCard key={k.uid} k={k} c={c} put={put} say={say} onUpgrade={() => setEdit({ uid: k.uid })} />)}
      {edit ? <ConstructBuilder c={c} d={d} put={put} say={say} existing={s.constructs.find((x) => x.uid === edit.uid) ?? null} onClose={() => setEdit(null)} />
        : <div className="steps" style={{ marginTop: 8 }}><button className="btn dark" type="button" onClick={() => setEdit({ uid: null })}>+ Nový konstrukt…</button></div>}
    </Sheet>
  );
}

function ConstructCard({ k, c, put, say, onUpgrade }: { k: Construct; c: Character; put: Upd; say: (s: string) => void; onUpgrade: () => void }) {
  const st = constructStats(k);
  const [amt, setAmt] = useState(Math.max(1, Math.round(st.fuelCap - k.fuelCurrent)));
  const hp = (v: number) => put(updateConstruct(c, k.uid, { hpCurrent: Math.max(0, Math.min(st.hpMax, v)) }));
  const br = brainDef(k.brain);
  return (
    <div className="al-proc" style={{ marginTop: 0, marginBottom: 8 }}>
      <div className="steps" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <b>{k.name}{k.fuelCurrent <= 0 && <> <span className="pill bad">BEZ PALIVA</span></>}</b>
        <span className="small tn">{k.material}, vel. {k.size} · mozek {k.brain} – {br.name} · obtížnost {k.difficulty}</span>
      </div>
      <div className="steps small tn" style={{ alignItems: 'center' }}>
        <span>ÚČ <b>{st.attack}</b> · OČ <b>{st.defense}</b> · životy <b>{k.hpCurrent}</b>/{st.hpMax}</span>
        {[-5, -1, 1, 5].map((n) => <button key={n} className="btn" type="button" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => hp(k.hpCurrent + n)}>{n > 0 ? `+${n}` : n}</button>)}
      </div>
      <div className="steps small tn" style={{ alignItems: 'center' }}>
        <span>Palivo ({fuelDef(k.fuel).name.toLowerCase()}): <b>{num(k.fuelCurrent)}</b>/{num(st.fuelCap)} {st.fuelUnit} · asi {st.days} dní, {num(fuelPerDay(k))} {st.fuelUnit}/den</span>
        <input className="field num tn" style={{ width: 64, height: 26 }} type="number" min={1} value={amt} onChange={(e) => setAmt(int(e.target.value, 1))} aria-label="Kolik paliva" />
        <button className="btn" type="button" style={{ padding: '2px 7px', fontSize: 11 }} title={k.fuel === 'mana' ? 'Bere se z tvé many' : 'Olej / gem doplň z výbavy ručně'} onClick={() => put(refuel(c, k.uid, amt))}>Doplnit</button>
        <button className="btn" type="button" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => put(burnFuel(c, k.uid, fuelPerDay(k), 'den provozu'))}>−1 den</button>
        {k.upgrades.includes('chrlit') && <button className="btn" type="button" style={{ padding: '2px 7px', fontSize: 11 }} disabled={k.fuelCurrent < st.spray}
          onClick={() => { put(burnFuel(c, k.uid, st.spray, 'chrlení')); say(`${k.name} chrlí – zranění 2× hodnota paliva (${num(st.spray)} ${st.fuelUnit}), olej navíc zapálí (PJ).`); }}>Chrlit (−{num(st.spray)})</button>}
      </div>
      {k.upgrades.length > 0 && <div className="small">vylepšení: {k.upgrades.map((u) => upgradeDef(u)?.name).join(', ')}{k.tanks ? ` · dodatečné nádrže ${k.tanks}` : ''}</div>}
      <div className="small muted">{br.text}</div>
      <input className="field small" style={{ width: '100%', height: 28, marginTop: 4 }} placeholder="Poznámky (instrukce v mozku, zbraň, nosič…)" value={k.note} onChange={(e) => put(updateConstruct(c, k.uid, { note: e.target.value }))} aria-label="Poznámky ke konstruktu" />
      <div className="steps" style={{ marginTop: 4 }}>
        <button className="btn" type="button" onClick={onUpgrade}>Vylepšit…</button>
        <button className="btn" type="button" onClick={() => put(removeConstruct(c, k.uid))}>Odebrat</button>
      </div>
    </div>
  );
}

function ConstructBuilder({ c, d, put, say, existing, onClose }: P & { existing: Construct | null; onClose: () => void }) {
  const { roll } = useDice();
  const [spec, setSpec] = useState<ConstructSpec>(existing ? { size: existing.size, material: existing.material, fuel: existing.fuel, tanks: existing.tanks, brain: existing.brain, upgrades: existing.upgrades } : defaultSpec());
  const [name, setName] = useState('');
  const [result, setResult] = useState<number | ''>('');
  const plan = planConstruct(c, spec, existing);
  const bonus = skillCheck(c, d, 'mechanika', 'Mechanika', 'obr', true);
  const st = constructStats(spec);
  const set = (p: Partial<ConstructSpec>) => setSpec((x) => ({ ...x, ...p }));
  const toggle = (id: string, on: boolean) => set({ upgrades: on ? [...spec.upgrades, id] : spec.upgrades.filter((u) => u !== id) });
  const missing = [plan.missing.nothing && 'nová součást', plan.missing.mana && 'mana', plan.missing.materials && 'suroviny', plan.missing.nosic && 'vyrobený Univerzální nosič'].filter(Boolean);
  const ws = alch(c).workshop;
  const go = (total: number) => {
    if (existing) {
      const x = upgradeConstruct(c, existing.uid, spec.upgrades, spec.tanks, total);
      put(x.character); say(x.success ? `Vylepšení ${existing.name} se povedlo.` : `Vylepšení se nepovedlo (hod ${total} vs. ${plan.difficulty}).`);
    } else {
      const x = buildConstruct(c, spec, total, name);
      put(x.character); say(x.success ? 'Konstrukt je hotový – doplň mu palivo.' : `Neúspěch (hod ${total} vs. ${plan.difficulty}) – šrot, polovina many a surovin zůstává na další konstrukt.`);
    }
    onClose();
  };
  return (
    <div className="al-proc md">
      <b>{existing ? `Vylepšení: ${existing.name}` : 'Nový konstrukt'}</b>
      {!existing && (
        <div className="md-form">
          <label className="kf"><span className="lbl">Jméno</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="volitelně" /></label>
          <label className="kf"><span className="lbl">Velikost</span><select className="field" value={spec.size} onChange={(e) => set({ size: e.target.value as ConstructSpec['size'] })}>{CONSTRUCTS.sizes.map((z) => <option key={z}>{z}</option>)}</select></label>
          <label className="kf"><span className="lbl">Tělo</span><select className="field" value={spec.material} onChange={(e) => set({ material: e.target.value })}>{MATERIALS.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="kf"><span className="lbl">Srdce (palivo)</span><select className="field" value={spec.fuel} onChange={(e) => set({ fuel: e.target.value as ConstructSpec['fuel'] })}>{CONSTRUCTS.fuel.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
          <label className="kf"><span className="lbl">Mozek</span><select className="field" value={spec.brain} onChange={(e) => set({ brain: Number(e.target.value) as ConstructSpec['brain'] })}>{CONSTRUCTS.brains.map((b) => <option key={b.type} value={b.type}>{b.type} – {b.name}</option>)}</select></label>
        </div>
      )}
      <div className="md-form">
        <label className="kf"><span className="lbl">Dodatečné nádrže</span>
          <select className="field" value={spec.tanks} onChange={(e) => set({ tanks: Number(e.target.value) })}>
            {Array.from({ length: CONSTRUCTS.maxTanks + 1 }, (_, i) => i).filter((i) => !existing || i >= existing.tanks).map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
      </div>
      <div className="steps small">
        {CONSTRUCTS.upgrades.map((u) => {
          const had = existing?.upgrades.includes(u.id);
          return <label key={u.id} className="al-here" title={u.note}><input type="checkbox" disabled={had} checked={spec.upgrades.includes(u.id)} onChange={(e) => toggle(u.id, e.target.checked)} /> {u.name}</label>;
        })}
      </div>
      <table className="grid tn small">
        <thead><tr><th>Součást</th><th className="c">Obt.</th><th className="c">Hod.</th><th className="c">Mana</th><th className="c">Sur.</th></tr></thead>
        <tbody>{plan.rows.map((r, i) => <tr key={i}><td>{r.label}</td><td className="c">{r.dc}</td><td className="c">{r.h || ''}</td><td className="c">{r.m || ''}</td><td className="c">{r.s || ''}</td></tr>)}</tbody>
      </table>
      <p className="small tn" style={{ margin: 0 }}>
        Celkem mana <b>{plan.mana}</b> · suroviny <b>{plan.materials}</b> · {plan.hours} h · obtížnost <b>{plan.difficulty}</b>
        {existing && <> (konstrukt {existing.difficulty} + nové součásti)</>}
        {(plan.scrapUsed.mana > 0 || plan.scrapUsed.materials > 0) && <> · ze šrotu {plan.scrapUsed.mana} many / {plan.scrapUsed.materials} surovin</>}
        <br />Výsledek: ÚČ {st.attack}, OČ {st.defense}, životy {st.hpMax}, nádrž {num(st.fuelCap)} {st.fuelUnit} (asi {st.days} dní).
        {!existing && spec.size === 'A' && fuelDef(spec.fuel).note && <> <span className="muted">({fuelDef(spec.fuel).note})</span></>}
      </p>
      <p className="small tn" style={{ margin: 0 }}>Hod: 1k10 {sgn(bonus.total)} <span className="muted">({bonus.parts.join(' + ')})</span> vs. {plan.difficulty} – mana a suroviny se odečtou i při neúspěchu.</p>
      {!ws?.here && <p className="small muted" style={{ margin: 0 }}>Konstrukty se vyrábějí v dílně (nebo jinde s výhní a vybavením) – nastav dílnu, pokud v ní pracuješ.</p>}
      {missing.length > 0 && <p className="small bad-t" style={{ margin: 0 }}>Chybí: {missing.join(', ')}</p>}
      <div className="steps" style={{ alignItems: 'center' }}>
        <button className="btn dark" type="button" disabled={!plan.ok} onClick={() => go(roll('k10', bonus.total, `Konstrukt – Mechanika vs. ${plan.difficulty}`).total)}>⚄ Sestrojit</button>
        <label className="small">nebo výsledek <input className="field num tn" type="number" value={result} onChange={(e) => setResult(e.target.value === '' ? '' : Math.trunc(Number(e.target.value)))} aria-label="Výsledek hodu" /></label>
        <button className="btn" type="button" disabled={!plan.ok || result === ''} onClick={() => result !== '' && go(result)}>Zapsat</button>
        <button className="btn" type="button" onClick={onClose}>Zrušit</button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Tabulky těla, paliva, mozku a vylepšení: PPP03 s. {CONSTRUCTS.pages}.</p>
    </div>
  );
}
