// Přátelé a zvířata (7c+, docs/COMPANIONS.md): zvířecí přítel a smečka Pána zvířat (H09, PPP02), Hraničářův kůň (PPP02),
// kouzelníkův přítel (H11, PPP04) a Lupičův parťák (PPP05). Čisté funkce nad postavou; změny během hry jdou přes record()
// (záznam a Vrátit na záložce Boj a stavy vrací i přátele). Data: src/data/pratele.json (tools/build-pratele.py).
import pratJson from '../data/pratele.json';
import { emptyCompanionStats, uid } from '../model/defaults';
import type { AttrKey, Character, Companion, CompanionGrowth, CompanionKind, CompanionStats } from '../model/types';
import { record } from './combat';
import { attributeMod, sgn, type Derived } from './derive';
import { rollCheck, rollDie } from './dice';
import { knownWizardSpells } from './kouzelnik';

// ---------------------------------------------------------------- data

export interface SpeciesDef {
  id: string; kind: CompanionKind; name: string; src: string; page: number | null;
  tame?: number; tameNote?: string; dc?: number; minLevel?: number | null;
  level: number | null; size: string | null; hp: number; mana?: number; spells?: number; mobility: string;
  attrs: Record<AttrKey, number | null> | null; attacks: { n: string; atk: number | null; dmg: number | null }[];
  zo: number; oc: number; skills?: Record<string, number>; skillList?: string[]; tricks?: Record<string, number>;
  special?: string; talent?: string;
}
interface PratData {
  druhy: SpeciesDef[];
  magSkillAttr: Record<string, AttrKey | 'pan'>;
  rust: Record<CompanionKind, { src: string; text: string; hp?: number; skills?: number; newSkills?: string[] }>;
  pravidla: Record<string, string>;
}
export const PRAT = pratJson as unknown as PratData;
export const SPECIES = PRAT.druhy;
export const speciesOf = (id: string) => SPECIES.find((s) => s.id === id);

export const KIND_LABEL: Record<CompanionKind, string> = { zvire: 'Zvířecí přítel', kun: 'Hraničářův kůň', mag: 'Kouzelníkův přítel', lup: 'Lupičův parťák', duv: 'Důvěrník' };
export const STATUS_LABEL: Record<Companion['status'], string> = { active: 'AKTIVNÍ', dead: 'MRTVÝ', released: 'ROZLOUČENÍ' };

const has = (c: Character, id: string) => c.progression.learnedAbilities.some((a) => a.id === id);
export const isPackMaster = (c: Character) => c.basic.classId === 'hranicar' && c.progression.specialization === 'pan_zvirat';

/** Hodnoty druhu jako výchozí stav nového přítele. */
export function statsFrom(sp: SpeciesDef | undefined): CompanionStats {
  const e = emptyCompanionStats();
  if (!sp) return e;
  return {
    ...e, species: sp.name, level: sp.level, size: sp.size, hp: sp.hp, mana: sp.mana ?? null, spellsBase: sp.spells ?? null, mobility: sp.mobility,
    attrs: sp.attrs ? { ...sp.attrs } : null, attacks: sp.attacks.map((a) => ({ ...a })), zo: sp.zo, oc: sp.oc, skills: { ...(sp.skills ?? {}) },
    skillList: [...(sp.skillList ?? [])], tricks: { ...(sp.tricks ?? {}) }, special: sp.special ?? '', talent: sp.talent ?? '', dc: sp.tame ?? sp.dc ?? null,
  };
}

// ---------------------------------------------------------------- odvozené hodnoty

export interface CompanionView {
  level: number | null;
  size: string | null;
  hpMax: number;
  deathThreshold: number;
  manaMax: number | null;
  spellsMax: number | null;
  mobility: string;
  attacks: { n: string; atk: number | null; dmg: number | null }[];
  zo: number;
  oc: number;
  skills: { name: string; value: number; note?: string }[];
  tricks: { name: string; value: number }[];
  /** Odkud se hodnoty vzaly (růst, šampion, úroveň kouzelníka). */
  parts: string[];
  /** Chybějící hodnoty, které je třeba doplnit (vlastní tvor bez úrovně, velikosti nebo útoku). */
  missing: string[];
}

/** Velikost o třídu větší (Zvířecí šampion): A0/A1/A → B, B → C … */
export function sizeUp(s: string | null): string | null {
  if (!s) return s;
  const L = s[0].toUpperCase();
  const i = ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(L);
  return i < 0 || i >= 5 ? s : ['A', 'B', 'C', 'D', 'E', 'F'][i + 1];
}

const addMob = (m: string, n: number) => (/^\d+/.test(m) ? m.replace(/^\d+/, (x) => String(+x + n)) : m);

export function companionView(c: Character, d: Derived | null, x: Companion): CompanionView {
  const s = x.stats;
  const parts: string[] = [];
  const missing: string[] = [];
  const odo = s.attrs?.odo;
  const v: CompanionView = {
    level: s.level, size: s.size, hpMax: s.hp, deathThreshold: -(10 + (odo != null ? attributeMod(odo) : 0)), manaMax: s.mana, spellsMax: s.spellsBase,
    mobility: s.mobility, attacks: s.attacks.map((a) => ({ ...a })), zo: s.zo, oc: s.oc,
    skills: Object.entries(s.skills).map(([name, value]) => ({ name, value })),
    tricks: Object.entries(s.tricks).map(([name, value]) => ({ name, value })), parts, missing,
  };
  const bumpSkill = (name: string, n: number) => {
    const k = v.skills.find((q) => q.name === name);
    if (k) k.value += n; else v.skills.push({ name, value: n });
  };
  if (x.kind === 'zvire') {
    const n = x.grow.length;
    const k3 = Math.floor(n / 3);
    if (n) {
      v.hpMax += 3 * n;
      if (v.level != null) v.level += n;
      for (const e of x.grow) for (const sk of e.skills) bumpSkill(sk, 1);
      parts.push(`růst ${n}× (H09): životy +${3 * n}${k3 ? `, ÚČ/Zranění/ZO/OČ +${k3}` : ''}`);
    }
    if (k3) { for (const a of v.attacks) { if (a.atk != null) a.atk += k3; if (a.dmg != null) a.dmg += k3; } v.zo += k3; v.oc += k3; }
    if (x.champion) {
      v.hpMax += 20; v.zo += 3; v.oc += 3; v.mobility = addMob(v.mobility, 15); v.size = sizeUp(v.size);
      for (const a of v.attacks) if (a.atk != null) a.atk += 3;
      parts.push('Zvířecí šampion: velikost +1 třída, životy +20, pohyblivost +15, ÚČ +3, ZO +3 (tím i OČ)');
    }
    if (s.level == null) missing.push('úroveň');
    if (!s.size) missing.push('velikost');
    if (s.attacks.some((a) => a.atk == null)) missing.push('útok');
  }
  if (x.kind === 'lup') {
    const n = x.grow.length;
    if (n) {
      v.hpMax += 2 * n;
      const uc = x.grow.filter((e) => e.pick === 'uc').length;
      const zo = x.grow.filter((e) => e.pick === 'zo').length;
      const k3 = Math.floor(n / 3);
      for (const a of v.attacks) if (a.atk != null) a.atk += uc;
      v.zo += zo; v.oc += zo;
      if (k3) bumpSkill('Postřeh', k3);
      for (const e of x.grow) if (e.trick) { const t = v.tricks.find((q) => q.name === e.trick); if (t) t.value += 1; }
      parts.push(`růst ${n}× (PPP05): životy +${2 * n}${k3 ? `, Postřeh +${k3}` : ''}${uc ? `, ÚČ +${uc}` : ''}${zo ? `, ZO a OČ +${zo}` : ''}`);
    }
  }
  if (x.kind === 'duv') {
    // PPP05 s. 273: +1k6 životů za společnou úroveň; každá 3. úroveň +1 ÚČ nebo ZO (a OČ) a +1 stupeň vybrané dovednosti.
    const n = x.grow.length;
    if (n) {
      const hp = x.grow.reduce((a, e) => a + (e.hp ?? 0), 0);
      v.hpMax += hp;
      const uc = x.grow.filter((e) => e.pick === 'uc').length;
      const zo = x.grow.filter((e) => e.pick === 'zo').length;
      for (const a of v.attacks) if (a.atk != null) a.atk += uc;
      v.zo += zo; v.oc += zo;
      for (const e of x.grow) if (e.skill) bumpSkill(e.skill, 1);
      parts.push(`růst ${n}× (PPP05): životy +${hp}${uc ? `, ÚČ +${uc}` : ''}${zo ? `, ZO a OČ +${zo}` : ''}`);
    }
  }
  if (x.kind === 'mag') {
    // H11: životy +2, mana +1, kouzlo +1 za úroveň; ÚČ a OČ +1 za 2 úrovně, ZO +1 za 4 úrovně.
    const L = c.progression.level;
    v.level = L;
    v.hpMax = s.hp + 2 * L;
    v.manaMax = (s.mana ?? 0) + L;
    v.spellsMax = (s.spellsBase ?? 0) + L;
    const h = Math.floor(L / 2);
    const q = Math.floor(L / 4);
    for (const a of v.attacks) if (a.atk != null) a.atk += h;
    v.oc += h; v.zo += q;
    parts.push(`${L}. úroveň kouzelníka: životy +${2 * L}, mana +${L}, kouzla +${L}, ÚČ a OČ +${h}, ZO +${q}`);
    for (const name of s.skillList) {
      const attr = PRAT.magSkillAttr[name];
      if (attr === 'pan') {
        // Sesílání kouzel: INT a stupeň jako pán, bez jeho dalších bonusů (H11).
        const k = d?.skills.find((q2) => q2.id === 'sesilani_kouzel');
        v.skills.push({ name, value: k ? k.rank + k.mod : 0, note: 'jako pán (INT + stupeň)' });
      } else if (attr) {
        const av = attr === 'int' ? c.attributes.int : s.attrs?.[attr] ?? null;
        v.skills.push({ name, value: L + (av != null ? attributeMod(av) : 0), note: `úroveň ${L} ${attr === 'int' ? 'INT pána' : attr.toUpperCase()} ${sgn(av != null ? attributeMod(av) : 0)}` });
      }
    }
  }
  return v;
}

/** Stav tvora podle životů (V14): 0 = bezvědomí, pod hranicí smrti = mrtvý. */
export function companionHpState(v: CompanionView, hp: number): 'ok' | 'out' | 'dead' {
  if (hp < v.deathThreshold) return 'dead';
  if (hp <= 0) return 'out';
  return 'ok';
}

// ---------------------------------------------------------------- kdo smí mít jakého přítele

export const activeOf = (c: Character, kind: CompanionKind) => c.companions.filter((x) => x.kind === kind && x.status === 'active');

/** Součet úrovní smečky (Pán zvířat) – zvířata bez zadané úrovně se nepočítají. */
export function packLevel(c: Character): { sum: number; unknown: number } {
  let sum = 0; let unknown = 0;
  for (const x of activeOf(c, 'zvire')) {
    const l = companionView(c, null, x).level;
    if (l == null) unknown += 1; else sum += l;
  }
  return { sum, unknown };
}

/** Schopnost, která přítele daného druhu umožňuje. */
export const KIND_ABILITY: Record<CompanionKind, { cls: string; id: string; name: string }> = {
  zvire: { cls: 'hranicar', id: 'ochocovani_zvirat', name: 'Ochočování zvířat (hraničář)' },
  kun: { cls: 'hranicar', id: 'hranicaruv_kun', name: 'Hraničářův kůň (hraničář od 6. úr.)' },
  mag: { cls: 'kouzelnik', id: 'vyvolani_pritele', name: 'Vyvolání přítele (kouzelník)' },
  lup: { cls: 'zlodej', id: 'lupicuv_partak', name: 'Lupičův parťák (Lupič)' },
  duv: { cls: 'zlodej', id: 'duvernik', name: 'Důvěrník (Sicco)' },
};

/** Má postava schopnost na daný druh přítele? */
export const kindAllowed = (c: Character, kind: CompanionKind) => c.basic.classId === KIND_ABILITY[kind].cls && has(c, KIND_ABILITY[kind].id);

/**
 * Proč teď nejde získat přítele (prázdný řetězec = jde). Bez schopnosti, nad limit nebo před dalším přestupem
 * jde přítel přidat jen se souhlasem PJ.
 */
export function acquireWhy(c: Character, kind: CompanionKind, speciesId: string | null = null, level: number | null = null): string {
  if (!kindAllowed(c, kind)) return `chybí schopnost ${KIND_ABILITY[kind].name}`;
  const lv = c.progression.level;
  const sp = speciesId ? speciesOf(speciesId) : undefined;
  const ended = c.companions.filter((x) => x.kind === kind && x.status !== 'active' && x.endedLevel === lv);
  if (kind === 'zvire') {
    // Hraničář: po smrti zvířete nové až po přestupu (H09); Pán zvířat má smečku do součtu úrovní (PPP02).
    if (ended.some((x) => x.status === 'dead')) return 'po smrti zvířete nové až po přestupu na další úroveň';
    if (isPackMaster(c)) {
      const p = packLevel(c);
      const add = level ?? sp?.level ?? null;
      if (add != null && p.sum + add > lv) return `smečka by měla úroveň ${p.sum + add} > ${lv} (úroveň Pána zvířat)`;
      return '';
    }
    return activeOf(c, 'zvire').length ? 'najednou jen 1 ochočené zvíře (víc jen Pán zvířat)' : '';
  }
  if (activeOf(c, kind).length) return 'najednou jen jeden';
  if (ended.length) return 'nový až na další úrovni';
  if (kind === 'mag' && sp) {
    if (sp.minLevel && lv < sp.minLevel) return `${sp.name} od ${sp.minLevel}. úrovně (PPP04)`;
    if (c.companions.some((x) => x.kind === 'mag' && x.typeId === sp.id && x.status === 'dead')) return `${sp.name} – přítele tohoto druhu už nikdy nepřivolá (zahynul)`;
  }
  return '';
}

// ---------------------------------------------------------------- získání

function newCompanion(c: Character, kind: CompanionKind, typeId: string, stats: CompanionStats, name: string, pj: boolean, spells: string[] = []): Companion {
  const x: Companion = {
    uid: uid(), kind, typeId, name: name.trim() || stats.species || KIND_LABEL[kind], status: 'active', joinedLevel: c.progression.level, endedLevel: null, pj,
    stats, hpCurrent: 0, manaCurrent: 0, spells, notes: '', grow: [], champion: false, inFight: false,
  };
  const v = companionView(c, null, x);
  return { ...x, hpCurrent: v.hpMax, manaCurrent: v.manaMax ?? 0 };
}

const withCompanions = (c: Character, fn: (l: Companion[]) => Companion[]): Character => ({ ...c, companions: fn(c.companions) });

/** Přidá přítele bez hodu (kůň, parťák, přepis z papíru, se souhlasem PJ). */
export function addCompanion(c: Character, kind: CompanionKind, typeId: string, stats: CompanionStats, o: { name?: string; pj?: boolean; spells?: string[]; how?: string } = {}): Character {
  const x = newCompanion(c, kind, typeId, stats, o.name ?? '', !!o.pj, o.spells ?? []);
  return record(c, `${o.how ?? 'Nový přítel'}: ${x.name}${x.stats.species && x.stats.species !== x.name ? ` (${x.stats.species})` : ''}${o.pj ? ' – se souhlasem PJ' : ''}`, (y) => withCompanions(y, (l) => [...l, x]));
}

/** Bonus k ochočení: Ochočování zvířat (CHAR) + Výhoda za mládě a Spřízněnost se zvířaty. */
export function tameBonus(c: Character, d: Derived, young: boolean): { bonus: number; parts: string[] } {
  const k = d.skills.find((s) => s.id === 'ochocovani_zvirat');
  const parts = [k ? `Ochočování zvířat ${sgn(k.total)}` : 'bez dovednosti Ochočování zvířat'];
  let bonus = k?.total ?? 0;
  if (young) { bonus += 5; parts.push('mládě +5'); }
  if (has(c, 'spriznenost_se_zviraty')) { bonus += 5; parts.push('Spřízněnost se zvířaty +5'); }
  return { bonus, parts };
}

/**
 * Ochočení (H09 s. 8): k10 + Ochočování zvířat vs. obtížnost ochočení – úspěch = výsledek vyšší. Při úspěchu přibude přítel,
 * při neúspěchu jen záznam (nový pokus o stejné zvíře zítra). Trvá 1k6 směn.
 */
export function tame(c: Character, d: Derived, typeId: string, stats: CompanionStats, o: { name?: string; young?: boolean; pj?: boolean; criticals?: boolean }, die = rollDie):
  { character: Character; total: number; dc: number; success: boolean; shifts: number; text: string } {
  const dc = stats.dc ?? 0;
  const { bonus } = tameBonus(c, d, !!o.young);
  const r = rollCheck(bonus, o.criticals ?? true, die);
  const success = r.outcome === 'critical' || (r.outcome !== 'fumble' && r.total > dc);
  const shifts = die(6);
  const text = `Ochočení ${stats.species || o.name || 'zvířete'}: k10 ${r.die}${r.second != null ? `/${r.second}` : ''} ${sgn(bonus)} = ${r.total} vs. ${dc}${r.outcome === 'critical' ? ' (kritický úspěch)' : r.outcome === 'fumble' ? ' (fatální neúspěch)' : ''} – ${success ? 'úspěch' : 'neúspěch, znovu zítra'} (${shifts} ${shifts === 1 ? 'směna' : shifts < 5 ? 'směny' : 'směn'})`;
  if (!success) return { character: record(c, text, (y) => y), total: r.total, dc, success, shifts, text };
  const x = newCompanion(c, 'zvire', typeId, stats, o.name ?? '', !!o.pj);
  return { character: record(c, text, (y) => withCompanions(y, (l) => [...l, x])), total: r.total, dc, success, shifts, text };
}

/** Vyvolání přítele (H11 s. 13): potřebuje plnou manu, vyzáří se celé maximum (i při neúspěchu). */
export function summonWhy(c: Character, d: Derived): string {
  const max = d.manaMax.value;
  if (max == null) return 'neznámé maximum many';
  return c.vitals.manaCurrent < max ? `potřebuje plnou manu (${c.vitals.manaCurrent}/${max}) – vyzáří se celé maximum` : '';
}

export function summon(c: Character, d: Derived, typeId: string, stats: CompanionStats, o: { name?: string; spells?: string[]; pj?: boolean; criticals?: boolean }, die = rollDie):
  { character: Character; total: number; dc: number; success: boolean; text: string } {
  const dc = stats.dc ?? 0;
  const k = d.skills.find((s) => s.id === 'sesilani_kouzel');
  const bonus = k?.total ?? 0;
  const max = d.manaMax.value ?? 0;
  const r = rollCheck(bonus, o.criticals ?? true, die);
  const success = r.outcome === 'critical' || (r.outcome !== 'fumble' && r.total > dc);
  const text = `Vyvolání přítele – ${stats.species}: k10 ${r.die}${r.second != null ? `/${r.second}` : ''} ${sgn(bonus)} = ${r.total} vs. ${dc} – ${success ? 'úspěch' : 'neúspěch'}; mana −${max}`;
  const x = success ? newCompanion(c, 'mag', typeId, stats, o.name ?? '', !!o.pj, o.spells ?? []) : null;
  return {
    character: record(c, text, (y) => ({ ...withCompanions(y, (l) => (x ? [...l, x] : l)), vitals: { ...y.vitals, manaCurrent: Math.max(0, y.vitals.manaCurrent - max) } })),
    total: r.total, dc, success, text,
  };
}

/** Kouzla, která může kouzelníkův přítel mít – jen ta, která ovládá pán (Sdílení kouzel, H11). */
export const shareableSpells = (c: Character) => knownWizardSpells(c).map((s) => s.nazev);

// ---------------------------------------------------------------- během hry

const findC = (c: Character, u: string) => c.companions.find((x) => x.uid === u);

/** Úprava bez záznamu (jméno, poznámky, ruční hodnoty). */
export const updateCompanion = (c: Character, u: string, patch: Partial<Companion>): Character =>
  withCompanions(c, (l) => l.map((x) => (x.uid === u ? { ...x, ...patch } : x)));

export const updateStats = (c: Character, u: string, patch: Partial<CompanionStats>): Character =>
  withCompanions(c, (l) => l.map((x) => (x.uid === u ? { ...x, stats: { ...x.stats, ...patch } } : x)));

/** Zranění / léčení přítele (léčení nejvýš do maxima). */
export function companionHp(c: Character, d: Derived | null, u: string, delta: number): Character {
  const x = findC(c, u);
  if (!x || !delta) return c;
  const max = companionView(c, d, x).hpMax;
  const hp = delta > 0 ? Math.max(x.hpCurrent, Math.min(max, x.hpCurrent + delta)) : x.hpCurrent + delta;
  return record(c, `${x.name}: životy ${sgn(delta)} (${hp}/${max})`, (y) => updateCompanion(y, u, { hpCurrent: hp }));
}

export function companionMana(c: Character, d: Derived | null, u: string, delta: number): Character {
  const x = findC(c, u);
  if (!x || !delta) return c;
  const max = companionView(c, d, x).manaMax ?? 0;
  const m = Math.max(0, Math.min(max, x.manaCurrent + delta));
  return record(c, `${x.name}: mana ${sgn(delta)} (${m}/${max})`, (y) => updateCompanion(y, u, { manaCurrent: m }));
}

/** Doplnění many přítele při pánově meditaci (musí se ho dotýkat, H11). */
export function refillMana(c: Character, d: Derived | null, u: string): Character {
  const x = findC(c, u);
  if (!x) return c;
  const max = companionView(c, d, x).manaMax ?? 0;
  return record(c, `${x.name}: mana doplněna (${max})`, (y) => updateCompanion(y, u, { manaCurrent: max }));
}

/** Ztráta přítele – smrt, nebo rozloučení (svoboda, zrušení pouta). Záznam zůstává v deníku. */
export function endCompanion(c: Character, u: string, how: 'dead' | 'released'): Character {
  const x = findC(c, u);
  if (!x) return c;
  return record(c, `${x.name}: ${how === 'dead' ? 'zemřel' : 'rozloučení'}`, (y) => updateCompanion(y, u, { status: how, endedLevel: y.progression.level, inFight: false }));
}

export function removeCompanion(c: Character, u: string): Character {
  const x = findC(c, u);
  if (!x) return c;
  return record(c, `${x.name}: odebrán z deníku`, (y) => withCompanions(y, (l) => l.filter((q) => q.uid !== u)));
}

export const setInFight = (c: Character, u: string, on: boolean) => updateCompanion(c, u, { inFight: on });

/** Zvířecí šampion (PPP02 s. 107): jedno zvíře smečky; pánovi natrvalo −2 max. Duševní síly (derive podle Companion.champion). */
export function championWhy(c: Character, u: string): string {
  if (!has(c, 'zvireci_sampion')) return 'chybí schopnost Zvířecí šampion';
  if (c.companions.some((x) => x.champion)) return 'šampion už je stvořen';
  const x = findC(c, u);
  if (!x || x.kind !== 'zvire' || x.status !== 'active') return 'jen živé zvíře smečky';
  return '';
}

export function makeChampion(c: Character, u: string): Character {
  if (championWhy(c, u)) return c;
  const x = findC(c, u)!;
  return record(c, `${x.name} se stal Zvířecím šampionem (max. Duševní síla −2 natrvalo)`, (y) => updateCompanion(y, u, { champion: true, hpCurrent: x.hpCurrent + 20 }));
}

/** Boj ve smečce (PPP02 s. 105): +1 ÚČ i OČ Pána zvířat za každého člena smečky v boji, nejvýš +5. */
export function packBonus(c: Character): number {
  if (!has(c, 'boj_ve_smecce')) return 0;
  return Math.min(5, c.companions.filter((x) => x.kind === 'zvire' && x.status === 'active' && x.inFight).length);
}

// ---------------------------------------------------------------- přestup

/** Výběr pro jednoho přítele v průvodci přestupem. */
export interface GrowthPick { skills: string[]; pick?: 'uc' | 'zo'; trick?: string; spells: string[]; /** Důvěrník: hod 1k6 na životy a dovednost +1. */ hp?: number; skill?: string }
export type CompanionPicks = Record<string, GrowthPick>;

/** Přátelé, kteří při tomto přestupu rostou (dosáhli úrovně spolu s pánem). */
export function growingCompanions(c: Character): Companion[] {
  return c.companions.filter((x) => x.status === 'active' && x.kind !== 'kun' && x.joinedLevel <= c.progression.level);
}

/** Dovednosti, které může zvíře zlepšit (H09): známé + Atletika, Akrobacie, Výdrž, Postřeh, Vůle. */
export function growableSkills(c: Character, x: Companion): string[] {
  const v = companionView(c, null, x);
  return [...new Set([...v.skills.map((s) => s.name), ...(PRAT.rust.zvire.newSkills ?? [])])];
}

/** Tato růstová úroveň je 3. (6., 9. …) → navíc ÚČ/ZO (H09) nebo volba ÚČ/ZO a trik (PPP05). */
export const thirdGrowth = (x: Companion) => (x.grow.length + 1) % 3 === 0;

/** Kolik kouzel přítel při přestupu přibere (1 za úroveň kouzelníka; doplní i dříve nevybraná). */
export function spellsToPick(x: Companion, nextLevel: number): number {
  const base = x.stats.spellsBase ?? 0;
  return Math.max(0, base + nextLevel - x.spells.length);
}

/** Proč výběr pro přátele ještě nestačí ('' = v pořádku). Pán zvířat cvičí při přestupu jen jedno zvíře. */
export function companionStepWhy(c: Character, picks: CompanionPicks, pool: string[]): string {
  const animals = growingCompanions(c).filter((x) => x.kind === 'zvire');
  const chosen = animals.filter((x) => (picks[x.uid]?.skills.length ?? 0) > 0);
  if (isPackMaster(c) && animals.length) {
    if (chosen.length > 1) return 'Pán zvířat cvičí při přestupu jen jedno zvíře.';
    if (chosen.length === 0) return 'Vyber jedno zvíře smečky a 2 dovednosti.';
  }
  for (const x of growingCompanions(c)) {
    const p = picks[x.uid];
    if (x.kind === 'zvire' && (!isPackMaster(c) || chosen.includes(x)) && (p?.skills.length ?? 0) !== 2) return `${x.name}: vyber 2 dovednosti (+1).`;
    if (x.kind === 'lup' && thirdGrowth(x)) {
      if (!p?.pick) return `${x.name}: vyber ÚČ, nebo ZO a OČ.`;
      if (Object.keys(x.stats.tricks).length && !p.trick) return `${x.name}: vyber trik +1.`;
    }
    if (x.kind === 'duv') {
      if (!p?.hp || p.hp < 1 || p.hp > 6) return `${x.name}: hoď 1k6 na životy navíc.`;
      if (thirdGrowth(x) && !p.pick) return `${x.name}: vyber ÚČ, nebo ZO a OČ.`;
      if (thirdGrowth(x) && !p.skill?.trim()) return `${x.name}: vyber dovednost +1.`;
    }
    if (x.kind === 'mag') {
      const avail = pool.filter((s) => !x.spells.includes(s)).length;
      const need = Math.min(spellsToPick(x, c.progression.level + 1), avail);
      if ((p?.spells.length ?? 0) !== need) return `${x.name}: vyber ${need} ${need === 1 ? 'kouzlo' : 'kouzla'}.`;
    }
  }
  return '';
}

/** Promítne růst přátel do postavy (volá applyLevelUp). */
export function applyCompanionGrowth(c: Character, picks: CompanionPicks | undefined, nl: number): Companion[] {
  const pm = isPackMaster(c);
  return c.companions.map((x) => {
    if (x.status !== 'active' || x.kind === 'kun' || x.joinedLevel > c.progression.level) return x;
    const p = picks?.[x.uid];
    if (x.kind === 'mag') return p?.spells.length ? { ...x, spells: [...x.spells, ...p.spells] } : x;
    if (x.kind === 'zvire') {
      if (pm && !(p?.skills.length)) return x;
      const e: CompanionGrowth = { level: nl, skills: [...(p?.skills ?? [])] };
      const next = { ...x, grow: [...x.grow, e] };
      // Nové maximum: +3 životy (aktuální se zvýší o totéž, ať zvíře „neubude“).
      return { ...next, hpCurrent: x.hpCurrent + 3 };
    }
    if (x.kind === 'duv') {
      const hp = Math.max(0, Math.min(6, p?.hp ?? 0));
      const e: CompanionGrowth = { level: nl, skills: [], hp, ...(p?.pick && thirdGrowth(x) ? { pick: p.pick } : {}), ...(p?.skill && thirdGrowth(x) ? { skill: p.skill.trim() } : {}) };
      return { ...x, grow: [...x.grow, e], hpCurrent: x.hpCurrent + hp };
    }
    const e: CompanionGrowth = { level: nl, skills: [], ...(p?.pick && thirdGrowth(x) ? { pick: p.pick } : {}), ...(p?.trick && thirdGrowth(x) ? { trick: p.trick } : {}) };
    return { ...x, grow: [...x.grow, e], hpCurrent: x.hpCurrent + 2 };
  });
}

/** Čitelný souhrn růstu přátel pro shrnutí přestupu. */
export function describeGrowth(c: Character, picks: CompanionPicks | undefined, nl: number): string[] {
  const out: string[] = [];
  const pm = isPackMaster(c);
  for (const x of growingCompanions(c)) {
    const p = picks?.[x.uid];
    if (x.kind === 'mag') {
      out.push(`${x.name}: ${nl}. úroveň (životy +2, mana +1${nl % 2 === 0 ? ', ÚČ a OČ +1' : ''}${nl % 4 === 0 ? ', ZO +1' : ''})${p?.spells.length ? `, kouzla: ${p.spells.join(', ')}` : ''}`);
    } else if (x.kind === 'zvire') {
      if (pm && !p?.skills.length) continue;
      out.push(`${x.name}: životy +3, ${p?.skills.map((s) => `${s} +1`).join(', ') ?? ''}${thirdGrowth(x) ? ', ÚČ, Zranění, ZO a OČ +1' : ''}`);
    } else if (x.kind === 'duv') {
      out.push(`${x.name}: životy +${p?.hp ?? '?'}${thirdGrowth(x) ? `, ${p?.pick === 'zo' ? 'ZO a OČ' : 'ÚČ'} +1${p?.skill ? `, ${p.skill} +1` : ''}` : ''}`);
    } else if (x.kind === 'lup') {
      out.push(`${x.name}: životy +2${thirdGrowth(x) ? `, ${p?.pick === 'zo' ? 'ZO a OČ' : 'ÚČ'} +1, Postřeh +1${p?.trick ? `, ${p.trick} +1` : ''}` : ''}`);
    }
  }
  return out;
}
