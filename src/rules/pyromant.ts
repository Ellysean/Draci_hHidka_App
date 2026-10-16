// Specializace PYROMANT (PPP03 s. 143–162, fáze 7a+.2): konstrukty (tělo, srdce, mozek, vylepšení, palivo),
// odpálení rachejtlí a střel, palné zbraně do výzbroje postavy, sapérské pasti a transmutace kovu. Čisté funkce.
import { uid } from '../model/defaults';
import type { Character, Construct } from '../model/types';
import { CONSTRUCTS, TRANSMUTATION, alch, commit, hasAbility, recipeById, setState, takeOne, type ConstructSize } from './alchemy';

export { CONSTRUCTS, TRANSMUTATION };
export const isPyromant = (c: Character) => c.progression.specialization === 'pyromant';

// ---------------------------------------------------------------- konstrukty

export interface ConstructSpec { size: ConstructSize; material: string; fuel: Construct['fuel']; tanks: number; brain: Construct['brain']; upgrades: string[] }
export interface CostRow { label: string; dc: number; h: number; m: number; s: number }

export const MATERIALS = Object.keys(CONSTRUCTS.body);
export const fuelDef = (id: Construct['fuel']) => CONSTRUCTS.fuel.find((f) => f.id === id)!;
export const brainDef = (t: Construct['brain']) => CONSTRUCTS.brains.find((b) => b.type === t)!;
export const upgradeDef = (id: string) => CONSTRUCTS.upgrades.find((u) => u.id === id);

/** Rozpis ceny součástí: tělo, srdce (palivo), dodatečné nádrže, mozek, vylepšení (PPP03 s. 146–148). */
export function costRows(spec: ConstructSpec, only?: { upgrades: string[]; tanks: number }): CostRow[] {
  const rows: CostRow[] = [];
  const f = fuelDef(spec.fuel);
  if (!only) {
    const b = CONSTRUCTS.body[spec.material][spec.size];
    rows.push({ label: `tělo: ${spec.material.toLowerCase()} (${spec.size})`, dc: b.dc, h: b.h, m: b.m, s: b.s });
    rows.push({ label: `srdce: ${f.name.toLowerCase()}`, dc: f.by[spec.size].dc, h: 0, m: 0, s: f.by[spec.size].s });
    const br = brainDef(spec.brain);
    rows.push({ label: `mozek: ${spec.brain} – ${br.name}`, dc: br.dc, h: 0, m: br.m, s: br.s });
  }
  const tanks = only ? only.tanks : spec.tanks;
  for (let i = 0; i < tanks; i++) rows.push({ label: 'dodatečná nádrž', dc: f.tank.dc, h: 0, m: 0, s: f.tank.s });
  for (const id of only ? only.upgrades : spec.upgrades) {
    const u = upgradeDef(id);
    if (u) rows.push({ label: u.name.toLowerCase(), ...u.by[spec.size] });
  }
  return rows;
}

export const nosicCount = (c: Character) => alch(c).crafted.filter((x) => x.recipeId === 'univerzalni_nosic' && !x.ruined).reduce((n, x) => n + (x.qty ?? 1), 0);

export interface ConstructPlan {
  rows: CostRow[];
  mana: number;
  materials: number;
  hours: number;
  /** Obtížnost hodu Mechaniky – u vylepšení celková obtížnost konstruktu. */
  difficulty: number;
  scrapUsed: { mana: number; materials: number };
  missing: { mana: boolean; materials: boolean; nosic: boolean; nothing: boolean };
  ok: boolean;
}

/** Nový konstrukt (existing = null) nebo vylepšení existujícího o nová vylepšení / nádrže. Šrot sníží cenu nového konstruktu. */
export function planConstruct(c: Character, spec: ConstructSpec, existing: Construct | null = null): ConstructPlan {
  const add = existing ? { upgrades: spec.upgrades.filter((u) => !existing.upgrades.includes(u)), tanks: Math.max(0, spec.tanks - existing.tanks) } : undefined;
  const rows = costRows(existing ? { ...spec, size: existing.size, material: existing.material, fuel: existing.fuel } : spec, add);
  const sum = (k: 'dc' | 'h' | 'm' | 's') => rows.reduce((n, r) => n + r[k], 0);
  const s0 = alch(c);
  const scrap = existing ? { mana: 0, materials: 0 } : s0.constructScrap ?? { mana: 0, materials: 0 };
  const scrapUsed = { mana: Math.min(scrap.mana, sum('m')), materials: Math.min(scrap.materials, sum('s')) };
  const mana = sum('m') - scrapUsed.mana;
  const materials = sum('s') - scrapUsed.materials;
  const needNosic = (existing ? add!.upgrades : spec.upgrades).includes('nosic');
  const missing = {
    mana: mana > c.vitals.manaCurrent,
    materials: materials > s0.materialsCurrent,
    nosic: needNosic && nosicCount(c) < 1,
    nothing: rows.length === 0,
  };
  return {
    rows, mana, materials, hours: sum('h'), difficulty: (existing?.difficulty ?? 0) + sum('dc'), scrapUsed, missing,
    ok: !Object.values(missing).some(Boolean),
  };
}

/** Bojové hodnoty a palivo konstruktu. Zesílená konstrukce: OČ +5, životy +½. */
export function constructStats(k: Pick<Construct, 'size' | 'material' | 'fuel' | 'tanks' | 'upgrades'>) {
  const b = CONSTRUCTS.body[k.material][k.size];
  const strong = k.upgrades.includes('zesilena');
  const f = fuelDef(k.fuel);
  const cap = f.by[k.size].cap;
  return {
    attack: b.uc, defense: b.oc + (strong ? 5 : 0), hpMax: strong ? Math.ceil(b.hp * 1.5) : b.hp,
    fuelCap: cap * (1 + k.tanks), fuelUnit: f.unit, baseCap: cap, days: CONSTRUCTS.daysPerTank * (1 + k.tanks),
    /** Chrlení odčerpá 1/20 kapacity základní nádrže (tabulka vylepšení). */
    spray: Math.round((cap / 20) * 100) / 100,
  };
}

/** Výroba konstruktu: hod Mechaniky (OBR) vs. součet. Mana a suroviny se odečtou vždy; neúspěch = šrot, ½ jde znovu použít. */
export function buildConstruct(c: Character, spec: ConstructSpec, rollTotal: number, name = '', now = new Date().toISOString()): { character: Character; success: boolean; plan: ConstructPlan } {
  const plan = planConstruct(c, spec);
  const success = rollTotal > plan.difficulty;
  const nm = name.trim() || `Konstrukt (${spec.material.toLowerCase()}, ${spec.size})`;
  const text = `Konstrukt: ${nm} – ${success ? 'úspěch' : 'neúspěch, zůstal šrot'} (hod ${rollTotal} vs. ${plan.difficulty}, −${plan.mana} many, −${plan.materials} surovin${plan.scrapUsed.mana || plan.scrapUsed.materials ? `, ze šrotu ${plan.scrapUsed.mana}/${plan.scrapUsed.materials}` : ''})`;
  const character = commit(c, text, (x, s) => {
    let crafted = s.crafted;
    if (spec.upgrades.includes('nosic')) {
      const n = crafted.find((y) => y.recipeId === 'univerzalni_nosic' && !y.ruined);
      if (n) crafted = takeOne(crafted, n.uid, () => []);
    }
    const scrap0 = s.constructScrap ?? { mana: 0, materials: 0 };
    const spentM = plan.mana + plan.scrapUsed.mana, spentS = plan.materials + plan.scrapUsed.materials;
    const scrap = success
      ? { mana: scrap0.mana - plan.scrapUsed.mana, materials: scrap0.materials - plan.scrapUsed.materials }
      : { mana: scrap0.mana - plan.scrapUsed.mana + Math.floor(spentM / 2), materials: scrap0.materials - plan.scrapUsed.materials + Math.floor(spentS / 2) };
    const k: Construct = { uid: uid(), name: nm, ...spec, difficulty: plan.difficulty, hpCurrent: constructStats(spec).hpMax, fuelCurrent: 0, createdAt: now, note: '' };
    const y = { ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - plan.mana } };
    return setState(y, { ...s, crafted, materialsCurrent: s.materialsCurrent - plan.materials, constructScrap: scrap, constructs: success ? [...(s.constructs ?? []), k] : s.constructs ?? [] });
  }, now);
  return { character, success, plan };
}

/** Vylepšení: zaplatí nové součásti a hod Mechaniky vs. celková obtížnost; neúspěch = součásti propadnou. */
export function upgradeConstruct(c: Character, kUid: string, upgrades: string[], tanks: number, rollTotal: number, now = new Date().toISOString()) {
  const k = alch(c).constructs.find((x) => x.uid === kUid);
  if (!k) return { character: c, success: false };
  const spec = { size: k.size, material: k.material, fuel: k.fuel, brain: k.brain, upgrades: [...new Set([...k.upgrades, ...upgrades])], tanks: Math.min(CONSTRUCTS.maxTanks, Math.max(k.tanks, tanks)) };
  const plan = planConstruct(c, spec, k);
  const success = rollTotal > plan.difficulty;
  const character = commit(c, `Vylepšení konstruktu ${k.name}: ${plan.rows.map((r) => r.label).join(', ')} – ${success ? 'úspěch' : 'neúspěch'} (hod ${rollTotal} vs. ${plan.difficulty}, −${plan.mana} many, −${plan.materials} surovin)`, (x, s) => {
    let crafted = s.crafted;
    if (spec.upgrades.includes('nosic') && !k.upgrades.includes('nosic')) {
      const n = crafted.find((y) => y.recipeId === 'univerzalni_nosic' && !y.ruined);
      if (n) crafted = takeOne(crafted, n.uid, () => []);
    }
    const before = constructStats(k).hpMax;
    const next: Construct = success ? { ...k, upgrades: spec.upgrades, tanks: spec.tanks, difficulty: plan.difficulty, hpCurrent: k.hpCurrent + constructStats(spec).hpMax - before } : k;
    const y = { ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - plan.mana } };
    return setState(y, { ...s, crafted, materialsCurrent: s.materialsCurrent - plan.materials, constructs: s.constructs.map((z) => (z.uid === kUid ? next : z)) });
  }, now);
  return { character, success, plan };
}

/** Doplnění paliva: mana se bere z alchymistovy many, olej a gem se jen zapíšou. Nikdy nad kapacitu. */
export function refuel(c: Character, kUid: string, amount: number): Character {
  const k = alch(c).constructs.find((x) => x.uid === kUid);
  if (!k) return c;
  const st = constructStats(k);
  let n = Math.min(st.fuelCap - k.fuelCurrent, Math.max(0, amount));
  if (k.fuel === 'mana') n = Math.min(n, c.vitals.manaCurrent);
  if (n <= 0) return c;
  return commit(c, `${k.name}: palivo +${n} ${st.fuelUnit}${k.fuel === 'mana' ? ` (−${n} many)` : ''}`, (x, s) => ({
    ...setState(x, { ...s, constructs: s.constructs.map((z) => (z.uid === kUid ? { ...z, fuelCurrent: z.fuelCurrent + n } : z)) }),
    vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - (k.fuel === 'mana' ? n : 0) },
  }));
}

/** Spotřeba paliva (dny provozu nebo chrlení 1/20 základní nádrže). */
export function burnFuel(c: Character, kUid: string, amount: number, why: string): Character {
  const k = alch(c).constructs.find((x) => x.uid === kUid);
  if (!k) return c;
  const n = Math.round(Math.min(k.fuelCurrent, Math.max(0, amount)) * 100) / 100;
  if (n <= 0) return c;
  return commit(c, `${k.name}: ${why} (−${n} ${constructStats(k).fuelUnit})`, (x, s) =>
    setState(x, { ...s, constructs: s.constructs.map((z) => (z.uid === kUid ? { ...z, fuelCurrent: Math.round((z.fuelCurrent - n) * 100) / 100 } : z)) }));
}

/** Palivo na jeden den provozu (nádrž = 10 dní). */
export const fuelPerDay = (k: Pick<Construct, 'size' | 'fuel'>) => fuelDef(k.fuel).by[k.size].cap / CONSTRUCTS.daysPerTank;

export const updateConstruct = (c: Character, kUid: string, patch: Partial<Pick<Construct, 'hpCurrent' | 'note' | 'name'>>) => {
  const s = alch(c);
  return { ...c, classState: { ...c.classState, alchymista: { ...s, constructs: s.constructs.map((x) => (x.uid === kUid ? { ...x, ...patch } : x)) } } };
};
export const removeConstruct = (c: Character, kUid: string) =>
  commit(c, `Konstrukt odebrán: ${alch(c).constructs.find((x) => x.uid === kUid)?.name ?? ''}`, (x, s) => setState(x, { ...s, constructs: s.constructs.filter((y) => y.uid !== kUid) }));

// ---------------------------------------------------------------- rachejtle a střely

/** Odpálení vyrobené rachejtle či střely: hod Pyromancie vs. obtížnost (pohyblivý cíl u střel vyšší); kus se spotřebuje. */
export function launch(c: Character, itemUid: string, rollTotal: number, moving = false): { character: Character; success: boolean; dc: number | null } {
  const it = alch(c).crafted.find((x) => x.uid === itemUid);
  const r = it ? recipeById(it.recipeId) : undefined;
  if (!it || !r?.launch) return { character: c, success: false, dc: null };
  const dc = moving && r.launch.dcMoving ? r.launch.dcMoving : r.launch.dc;
  const success = rollTotal > dc;
  const character = commit(c, `Odpálení: ${it.name} – ${success ? 'zásah' : 'minula cíl'} (Pyromancie ${rollTotal} vs. ${dc}${moving ? ', pohyblivý cíl' : ''})`, (x, s) =>
    setState(x, { ...s, crafted: takeOne(s.crafted, itemUid, () => []) }));
  return { character, success, dc };
}

// ---------------------------------------------------------------- palné zbraně

/** Vyrobenou palnou zbraň přesune mezi zbraně postavy (vlastní zbraň s parametry z PPP03). */
export function firearmToWeapons(c: Character, itemUid: string): Character {
  const it = alch(c).crafted.find((x) => x.uid === itemUid);
  const r = it ? recipeById(it.recipeId) : undefined;
  if (!it || !r?.weapon) return c;
  const w = r.weapon;
  return commit(c, `Do zbraní: ${it.name} (útočnost ${w.attack}, zranění ${w.damage}, obrana ${w.defense})`, (x, s) => {
    const y = setState(x, { ...s, crafted: takeOne(s.crafted, itemUid, () => []) });
    return {
      ...y,
      equipment: {
        ...y.equipment,
        weapons: [...y.equipment.weapons, {
          uid: uid(), itemId: null, grip: w.hands === 1 ? 'one-handed' : 'two-handed', equipped: false, weightLb: r.weightLb ?? null,
          custom: { name: `${r.name} (dostřel ${w.range}, nabití ${w.reload})`, attack: w.attack, damage: w.damage, defense: w.defense, strReq: null, kind: 'ranged', category: 'Palné zbraně', damageTypes: [] },
        }],
      },
    };
  });
}

// ---------------------------------------------------------------- transmutace kovu

/** Mana na proměnu kovu (řádek = zdroj, sloupec = cíl) × náročnost (1 = prsten / amulet, 5 = ostří dýky). */
export function transmuteMana(from: string, to: string, times = 1): number | null {
  const i = TRANSMUTATION.metals.indexOf(to);
  const v = TRANSMUTATION.table[from]?.[i];
  return v == null ? null : v * Math.max(1, times);
}
export const alloyMana = (id: string, times = 1) => (TRANSMUTATION.alloys.find((a) => a.id === id)?.mana ?? 0) * Math.max(1, times);

export function transmute(c: Character, mana: number, text: string): { character: Character; error?: string } {
  if (!hasAbility(c, 'transmutace_kovu')) return { character: c, error: 'Chybí schopnost Transmutace kovu.' };
  if (mana > c.vitals.manaCurrent) return { character: c, error: 'Nedostatek many.' };
  return { character: commit(c, `Transmutace: ${text} (−${mana} many)`, (x) => ({ ...x, vitals: { ...x.vitals, manaCurrent: x.vitals.manaCurrent - mana } })) };
}
