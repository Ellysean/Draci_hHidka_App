// Zloděj (7e) – změny stavu: denní schopnosti (Druhá šance, Zrcadlení, Výroba jedů), jedy na zbrani, výroba udělátek, zbraní cechu
// a pastí, Siccova síť (nábor, výplata, akce), pověsti a falešné identity. Akce mimo boj jdou přes commit() → záznam zloděje a Vrátit
// (vrací stav zloděje i výzbroj a peníze). Akce v boji (triky, Výhodná pozice, Riskantní útok, Bojová kreativita) jdou přes record().
import { uid } from '../model/defaults';
import type { Character, GearItem, ThiefNetworkMember, ThiefState } from '../model/types';
import { catalogRows } from './catalog';
import { attack, record, setCombat } from './combat';
import type { Derived } from './derive';
import { rollDie } from './dice';
import { acquire, expense, income } from './equipment';
import {
  THIEF, actionBonus, actionCost, actionWhy, craftWhy, memberType, memberWhy, monthlyPay, netAction, poisonById, poisonWhy, riskyWhy, trickCombatWhy,
  zlo, type ThiefItem, type ThiefTrick,
} from './zlodej';

const LOG_MAX = 50;
const UNDO_MAX = 20;

const withThief = (c: Character, s: ThiefState): Character => ({ ...c, classState: { ...c.classState, zlodej: s } });

/** Úprava stavu bez záznamu (přepínače, texty). */
export const setThief = (c: Character, patch: Partial<ThiefState>): Character => withThief(c, { ...zlo(c), ...patch });

/** Provede akci zloděje, zapíše ji do záznamu a uloží stav pro Vrátit (stav zloděje + zbraně, výbava a peníze). */
export function commit(c: Character, text: string, fn: (c: Character, s: ThiefState) => Character, now = new Date().toISOString()): Character {
  const before = zlo(c);
  const { undo: _u, log: _l, ...state } = before;
  const e = c.equipment;
  const next = fn(c, before);
  const after = zlo(next);
  const logUid = uid();
  return withThief(next, {
    ...after,
    log: [{ uid: logUid, at: now, text }, ...before.log].slice(0, LOG_MAX),
    undo: [{ logUid, state, equipment: { weapons: e.weapons, items: e.items, money: e.money } }, ...before.undo].slice(0, UNDO_MAX),
  });
}

export function undoThief(c: Character): Character {
  const S = zlo(c);
  const [u, ...rest] = S.undo;
  if (!u) return c;
  return {
    ...c,
    equipment: { ...c.equipment, ...u.equipment },
    classState: { ...c.classState, zlodej: { ...u.state, undo: rest, log: S.log.filter((l) => l.uid !== u.logUid) } },
  };
}

// ---------------------------------------------------------------- denní schopnosti

export const newDay = (c: Character) => commit(c, 'Nový den – Druhá šance, Zrcadlení a dávka jedu znovu k dispozici', (x, s) =>
  withThief(x, { ...s, secondChanceUsed: false, mirrorUsed: false, poisonMadeToday: false }));

export const useSecondChance = (c: Character, what = '') => commit(c, `Druhá šance${what ? ` – ${what}` : ''} (1× denně; se systémem únavy 8 bodů)`, (x, s) => withThief(x, { ...s, secondChanceUsed: true }));
export const useMirror = (c: Character, what = '') => commit(c, `Zrcadlení${what ? ` – ${what}` : ''} (1× denně)`, (x, s) => withThief(x, { ...s, mirrorUsed: true }));

// ---------------------------------------------------------------- jedy (Výroba jedů, Assassin)

export function makePoison(c: Character, id: string): Character {
  const p = poisonById(id);
  if (!p || poisonWhy(c)) return c;
  return commit(c, `Výroba jedů: dávka ${p.nazev}`, (x, s) => withThief(x, { ...s, poisonMadeToday: true, poisons: { ...s.poisons, [id]: (s.poisons[id] ?? 0) + 1 } }));
}

/** Potření zbraně (Rychlé tasení: okamžitá akce). Zásobu jde zadat i ručně (koupený jed). */
export function applyPoison(c: Character, id: string): Character {
  const p = poisonById(id);
  const S = zlo(c);
  if (!p || !(S.poisons[id] > 0)) return c;
  return commit(c, `Jed na zbrani: ${p.nazev}`, (x, s) => withThief(x, { ...s, weaponPoison: id, poisons: { ...s.poisons, [id]: s.poisons[id] - 1 } }));
}

export function setPoisonStock(c: Character, id: string, n: number): Character {
  return setThief(c, { poisons: { ...zlo(c).poisons, [id]: Math.max(0, Math.trunc(n) || 0) } });
}

/** Jed zapůsobil při prvním Zranění (nebo se setřel) – zbraň je čistá. */
export function poisonSpent(c: Character, hit: boolean): Character {
  const p = poisonById(zlo(c).weaponPoison ?? '');
  if (!p) return c;
  return commit(c, hit ? `${p.nazev}: zásah – cíl hází ${p.nebezpecnost}, jed se setřel` : `${p.nazev}: jed setřen ze zbraně`, (x, s) => withThief(x, { ...s, weaponPoison: null }));
}

// ---------------------------------------------------------------- výroba (Lupičská udělátka, zbraně cechu, pasti)

/** Lupičská udělátka: výroba udělátka (výbava) nebo zbraně cechu (výzbroj). Cena zahrnuje materiál – `pay` ji odečte. */
export function craftGadget(c: Character, kind: 'gear' | 'weapon', id: string, pay: boolean): { character?: Character; error?: string } {
  const row = catalogRows(kind, [], { priced: false }).find((r) => r.id === id);
  if (!row) return { error: 'neznámý předmět' };
  const r = acquire(c, row, { pay });
  if ('error' in r && r.error) return { error: r.error };
  const done = (r as { character: Character }).character;
  return { character: commit(c, `Lupičská udělátka: vyrobeno ${row.name}${pay ? ' (materiál zaplacen)' : ''}`, () => done) };
}

/** Nastražení pasti: výroba proti obtížnosti pasti. Povedená past jde do výbavy. */
export function craftTrap(c: Character, it: ThiefItem, total: number): { character: Character; ok: boolean; text: string } {
  const dc = Number(it.parametry.obtiznost ?? 0);
  const ok = total > dc;
  const text = `Nastražení pasti – ${it.nazev}: ${total} vs. ${dc} – ${ok ? 'povedlo se' : 'nepovedlo se'} (${it.parametry.vyroba})`;
  const item: Omit<GearItem, 'uid'> = { name: `Past – ${it.nazev}`, itemId: null, qty: 1, weightLb: Number(it.parametry.w ?? 0), carried: true, container: null };
  return {
    character: commit(c, text, (x) => (ok ? { ...x, equipment: { ...x.equipment, items: [...x.equipment.items, { ...item, uid: uid() }] } } : x)),
    ok, text,
  };
}

export { craftWhy };

// ---------------------------------------------------------------- Siccova síť

const withNet = (s: ThiefState, patch: Partial<ThiefState['network']>): ThiefState => ({ ...s, network: { ...s.network, ...patch } });

export function addMember(c: Character, type: ThiefNetworkMember['type'], name: string, pay: boolean): { character?: Character; error?: string } {
  const why = memberWhy(c);
  if (why) return { error: why };
  const t = memberType(type);
  if (!t) return { error: 'neznámý typ' };
  let base = c;
  if (pay) {
    const r = expense(c, t.cena * 100, `Nábor do sítě: ${t.typ}${name ? ` ${name}` : ''}`);
    if ('error' in r && r.error) return { error: r.error };
    base = (r as { character: Character }).character;
  }
  const kapo = !zlo(c).network.members.some((m) => m.type === type);
  const m: ThiefNetworkMember = { uid: uid(), type, name: name.trim() || (kapo ? `Kápo – ${t.typ}` : t.typ), kapo, unpaid: 0 };
  return { character: commit(c, `Síť: naverbován ${t.typ}${kapo ? ' (kápo)' : ''} ${name}`.trim() + (pay ? ` – ${t.cena} zl` : ''), (_x, s) => withThief(base, withNet(s, { members: [...s.network.members, m] }))) };
}

export function removeMember(c: Character, u: string, why = 'odešel'): Character {
  const m = zlo(c).network.members.find((x) => x.uid === u);
  if (!m) return c;
  return commit(c, `Síť: ${m.name} ${why}`, (x, s) => {
    let members = s.network.members.filter((q) => q.uid !== u);
    // Kápo odešel – kápem se stává další člen téhož typu.
    if (m.kapo) { const nx = members.find((q) => q.type === m.type); if (nx) members = members.map((q) => (q === nx ? { ...q, kapo: true } : q)); }
    return withThief(x, withNet(s, { members }));
  });
}

export const renameMember = (c: Character, u: string, name: string) =>
  setThief(c, { network: { ...zlo(c).network, members: zlo(c).network.members.map((m) => (m.uid === u ? { ...m, name } : m)) } });

/** Měsíční výplata celé sítě (cena kumpána = měsíční plat). */
export function payMonth(c: Character): { character?: Character; error?: string } {
  const md = monthlyPay(c) * 100;
  if (!md) return { error: 'síť je prázdná' };
  const r = expense(c, md, 'Siccova síť: měsíční výplata');
  if ('error' in r && r.error) return { error: r.error };
  const paid = (r as { character: Character }).character;
  return { character: commit(c, `Síť: výplata ${md / 100} zl`, (_x, s) => withThief(paid, withNet(s, { members: s.network.members.map((m) => ({ ...m, unpaid: 0 })) }))) };
}

/** Měsíc bez výplaty: řadoví členové zběhnou hned, kápové vydrží 3 měsíce (PPP05 s. 268). */
export function skipMonth(c: Character): { character: Character; left: string[] } {
  const S = zlo(c);
  const next = S.network.members.map((m) => ({ ...m, unpaid: m.unpaid + 1 }));
  const left = next.filter((m) => (m.kapo ? m.unpaid > 3 : m.unpaid >= 1));
  const stay = next.filter((m) => !left.includes(m));
  return {
    character: commit(c, `Síť: měsíc bez výplaty${left.length ? ` – odešli: ${left.map((m) => m.name).join(', ')}` : ''}`, (x, s) => withThief(x, withNet(s, { members: stay }))),
    left: left.map((m) => m.name),
  };
}

/**
 * Akce sítě (PPP05 s. 270): zaplatí sazbu za každého zapojeného kumpána (v cizím městě 10×), hodí 1k10 + počet + Podplacení
 * proti obtížnosti PJ. Úspěch = výsledek vyšší. Kapsářství přinese 7 zl za kapsáře, Podplacení dá další akci +5,
 * neúspěšný Zločin = polovina zapojeného týmu chycena.
 */
export function runAction(c: Character, actionId: string, uids: string[], dc: number, o: { foreign?: boolean; pay?: boolean; extra?: number } = {}, die = rollDie):
  { character?: Character; error?: string; text?: string; ok?: boolean } {
  const a = netAction(actionId);
  if (!a) return { error: 'neznámá akce' };
  const why = actionWhy(c, a, uids, !!o.foreign);
  if (why) return { error: why };
  const n = uids.length;
  const cost = actionCost(a, n, !!o.foreign);
  let base = c;
  if (o.pay !== false) {
    const r = expense(c, cost * 100, `Akce sítě: ${a.nazev} (${n}×)`);
    if ('error' in r && r.error) return { error: r.error };
    base = (r as { character: Character }).character;
  }
  const b = actionBonus(c, n, o.extra ?? 0);
  const roll = die(10);
  const total = roll + b.bonus;
  const ok = total > dc;
  let caught: string[] = [];
  if (!ok && a.nebezpecnost === 'Zločin') {
    const team = zlo(c).network.members.filter((m) => uids.includes(m.uid)).sort((p, q) => Number(p.kapo) - Number(q.kapo));
    caught = team.slice(0, Math.ceil(team.length / 2)).map((m) => m.uid);
  }
  if (ok && a.id === 'kapsarstvi') {
    const r = income(base, { gold: 7 * n, silver: 0, copper: 0 }, `Kapsářství: výdělek ${n} × 7 zl`);
    if ('character' in r && r.character) base = r.character;
  }
  const caughtNames = zlo(c).network.members.filter((m) => caught.includes(m.uid)).map((m) => m.name);
  const text = `Akce sítě – ${a.nazev} (${a.nebezpecnost}): k10 ${roll} + ${b.bonus} (${b.parts.join(', ')}) = ${total} vs. ${dc} – ${ok ? 'úspěch' : 'neúspěch'}`
    + `${o.pay !== false ? ` · zaplaceno ${cost} zl` : ''}${ok && a.id === 'kapsarstvi' ? ` · výdělek ${7 * n} zl` : ''}${ok && a.id === 'podplaceni' ? ' · další akce +5' : ''}`
    + `${caughtNames.length ? ` · chyceni: ${caughtNames.join(', ')}` : ''}`;
  const character = commit(c, text, (_x, s) => {
    let members = s.network.members.filter((m) => !caught.includes(m.uid));
    // Kápo chycen – kápem se stává další člen téhož typu.
    for (const t of new Set(s.network.members.filter((m) => caught.includes(m.uid) && m.kapo).map((m) => m.type))) {
      const nx = members.find((m) => m.type === t);
      if (nx && !members.some((m) => m.type === t && m.kapo)) members = members.map((m) => (m === nx ? { ...m, kapo: true } : m));
    }
    return withThief(base, withNet(s, { members, bribe: ok && a.id === 'podplaceni' }));
  });
  return { character, text, ok };
}

// ---------------------------------------------------------------- pověsti, identity

export const addRumor = (c: Character, who: string, plus: boolean, where: string) =>
  commit(c, `Pověsti a drby: ${who} – ${plus ? 'Výhoda +5' : 'Nevýhoda −5'}${where ? ` (${where})` : ''}`, (x, s) => withThief(x, { ...s, rumors: [...s.rumors, { uid: uid(), who, plus, where }] }));
export const removeRumor = (c: Character, u: string) => setThief(c, { rumors: zlo(c).rumors.filter((r) => r.uid !== u) });
export const addIdentity = (c: Character, name: string, note: string) => setThief(c, { identities: [...zlo(c).identities, { uid: uid(), name, note }] });
export const removeIdentity = (c: Character, u: string) => setThief(c, { identities: zlo(c).identities.filter((r) => r.uid !== u) });

// ---------------------------------------------------------------- boj (přes record – Vrátit na záložce Boj)

const zl = (c: Character) => c.play.combat?.zlo ?? {};

/** Použití triku v boji: zapíše ho (jednorázové triky 1× za souboj). */
export function useTrick(c: Character, t: ThiefTrick): Character {
  if (trickCombatWhy(c, t)) return c;
  return record(c, `Zlodějský trik: ${t.n}`, (x) => (t.once ? setCombat(x, { zlo: { ...zl(x), used: [...(zl(x).used ?? []), t.id] } }) : x));
}

/** Oko střelce: 1 kolo střeleckého postoje – výstřel v příštím tahu. */
export const aim = (c: Character) => record(c, 'Oko střelce: míření (1 kolo)', (x) => setCombat(x, { zlo: { ...zl(x), aim: x.play.combat!.round } }));

/** Riskantní útok (Assassin): v tomto kole Obrana za Útok navíc. */
export function risky(c: Character, defLeft: number): Character {
  if (riskyWhy(c, defLeft)) return c;
  return record(c, 'Riskantní útok: obrana vyměněna za útok navíc', (x) => setCombat(x, { zlo: { ...zl(x), risky: x.play.combat!.round } }));
}

/** Bojová kreativita (Lupič): nová improvizovaná zbraň → v tomto kole +5 ÚČ i OČ. */
export const creative = (c: Character) => record(c, 'Bojová kreativita: nová improvizovaná zbraň (+5 ÚČ i OČ v tomto kole)', (x) => setCombat(x, { zlo: { ...zl(x), creative: x.play.combat!.round } }));

/** Útok z Výhodné pozice: běžný Útok, k6 začíná automatickou šestkou; pozice se spotřebuje. */
export function positionAttack(c: Character, d: Derived): Character {
  const a = attack(c, d);
  if (a === c) return c;
  return setCombat(a, { zlo: { ...zl(a), posUsed: true } });
}

/** Znovu získat Výhodnou pozici: vzdá se jednoho Útoku. */
export function regainPosition(c: Character, d: Derived): Character {
  const a = attack(c, d);
  if (a === c) return c;
  const [l, ...rest] = a.play.log;
  return setCombat({ ...a, play: { ...a.play, log: [{ ...l, text: `${l.text} – vzdán kvůli Výhodné pozici` }, ...rest] } }, { zlo: { ...zl(a), posUsed: false } });
}

export { THIEF };
