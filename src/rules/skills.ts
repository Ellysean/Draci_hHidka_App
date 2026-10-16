// Dovednosti mimo průvodce (Fáze 4) – čisté funkce nad postavou.
// Pravidla: RULES_FORMULAS.md §7 (H14, H18, PPP05 Expertiza).
// Zlepšení provedené mimo průvodce přestupem se počítá k aktuální úrovni (skillLog.level).
import type { AttrKey, Character, CharacterSkill, SkillSource } from '../model/types';
import { ATTR_KEYS } from '../model/types';
import { SKILLS, getSkill, type SkillDef } from './data';
import { derive } from './derive';

export const SOURCE_LABEL: Record<SkillSource, string> = {
  'class-basic': 'povolání',
  'class-profession': 'profesní',
  ability: 'schopnost',
  bought: 'koupená',
  custom: 'vlastní',
};

export const hasExpertise = (c: Character) => c.progression.learnedAbilities.some((a) => a.id === 'expertiza');

/** Atributy, ze kterých si hráč může vybrat (vlastní dovednost = kterýkoli). */
export function skillAttributes(s: CharacterSkill): AttrKey[] {
  const def = getSkill(s.id);
  return def ? def.attributes : [...ATTR_KEYS];
}

/** O kolik stupňů už byla dovednost zlepšena na aktuální úrovni (nové naučení se nepočítá). */
export function raisedAtLevel(c: Character, skillId: string, level = c.progression.level): number {
  return c.skillLog.filter((e) => e.level === level && e.skillId === skillId && e.from > 0).reduce((n, e) => n + (e.to - e.from), 0);
}

/** Body k utracení, jak je hráč vidí (včetně ručního přepisu). */
export const pointsAvailable = (c: Character) => derive(c).skillPoints.available.value;

/** Proč dovednost teď nejde zlepšit o stupeň ('' = jde). Limit +1 za úroveň; Expertiza na sudé úrovni jedna až +2, nejvýš na úroveň + 2. */
export function raiseBlockNow(c: Character, skillId: string): string {
  const s = c.skills.find((k) => k.id === skillId);
  if (!s) return 'dovednost chybí';
  const level = c.progression.level;
  const already = raisedAtLevel(c, skillId);
  const exp = hasExpertise(c) && level % 2 === 0;
  const otherHasTwo = c.skills.some((k) => k.id !== skillId && raisedAtLevel(c, k.id) >= 2);
  const limit = exp && !otherHasTwo ? 2 : 1;
  if (already >= limit) return exp && already === 1 && otherHasTwo ? 'Expertiza už použita' : `už zlepšeno na ${level}. úr.`;
  if (already >= 1 && s.rank + 1 > level + 2) return `max. stupeň ${level + 2}`;
  const cost = s.rank + 1;
  if (pointsAvailable(c) < cost) return `chybí body (${cost})`;
  return '';
}

export const raiseCostNow = (c: Character, skillId: string) => (c.skills.find((k) => k.id === skillId)?.rank ?? 0) + 1;

export function raiseSkill(c: Character, skillId: string): Character {
  if (raiseBlockNow(c, skillId)) return c;
  const from = c.skills.find((s) => s.id === skillId)!.rank;
  return {
    ...c,
    skills: c.skills.map((s) => (s.id === skillId ? { ...s, rank: from + 1 } : s)),
    skillLog: [...c.skillLog, { level: c.progression.level, skillId, from, to: from + 1, cost: from + 1 }],
  };
}

/** Poslední zlepšení dovednosti na aktuální úrovni, které jde vrátit (jen když sedí se současným stupněm). */
export function undoableRaise(c: Character, skillId: string) {
  const s = c.skills.find((k) => k.id === skillId);
  for (let i = c.skillLog.length - 1; i >= 0; i--) {
    const e = c.skillLog[i];
    if (e.skillId !== skillId) continue;
    return e.level === c.progression.level && e.from > 0 && s && e.to === s.rank ? { index: i, entry: e } : null;
  }
  return null;
}

export function undoRaise(c: Character, skillId: string): Character {
  const u = undoableRaise(c, skillId);
  if (!u) return c;
  return {
    ...c,
    skills: c.skills.map((s) => (s.id === skillId ? { ...s, rank: u.entry.from } : s)),
    skillLog: c.skillLog.filter((_, i) => i !== u.index),
  };
}

/** Obecné dovednosti, které jde koupit za 1 bod (profesní jen ze schopnosti – H14 ✔ U). */
export function purchasable(c: Character): SkillDef[] {
  const owned = new Set(c.skills.map((s) => s.id));
  return SKILLS.filter((s) => s.kind !== 'profession' && !owned.has(s.id));
}

export const customId = (name: string) => `custom:${name.trim().toLowerCase()}`;

/** Proč novou dovednost nejde přidat ('' = jde). */
export function addBlock(c: Character, add: { id?: string; customName?: string }): string {
  const id = add.customName != null ? customId(add.customName) : add.id ?? '';
  if (add.customName != null && !add.customName.trim()) return 'Napiš název dovednosti.';
  if (!id) return 'Vyber dovednost.';
  if (c.skills.some((s) => s.id === id || (s.customName ?? getSkill(s.id)?.name ?? '').toLowerCase() === (add.customName ?? '').trim().toLowerCase())) return 'Tuhle dovednost už postava má.';
  if (add.customName == null && getSkill(id)?.kind === 'profession') return 'Profesní dovednost dává jen schopnost povolání.';
  if (pointsAvailable(c) < 1) return 'Nová dovednost stojí 1 bod – žádný nezbývá.';
  return '';
}

export function addSkill(c: Character, add: { id?: string; customName?: string; attribute: AttrKey }): Character {
  if (addBlock(c, add)) return c;
  const custom = add.customName != null;
  const id = custom ? customId(add.customName!) : add.id!;
  return {
    ...c,
    skills: [...c.skills, { id, customName: custom ? add.customName!.trim() : null, attribute: add.attribute, rank: 1, source: custom ? 'custom' : 'bought' }],
    skillLog: [...c.skillLog, { level: c.progression.level, skillId: id, from: 0, to: 1, cost: 1 }],
  };
}

/** Odebrat jde jen koupenou/vlastní dovednost; body utracené za ni se vrátí (záznamy ve skillLog zmizí). */
export const canRemove = (s: CharacterSkill) => s.source === 'bought' || s.source === 'custom';

export function removeSkill(c: Character, skillId: string): Character {
  const s = c.skills.find((k) => k.id === skillId);
  if (!s || !canRemove(s)) return c;
  return { ...c, skills: c.skills.filter((k) => k.id !== skillId), skillLog: c.skillLog.filter((e) => e.skillId !== skillId) };
}

export const refundOnRemove = (c: Character, skillId: string) => c.skillLog.filter((e) => e.skillId === skillId).reduce((n, e) => n + e.cost, 0);

export function setSkillAttribute(c: Character, skillId: string, attribute: AttrKey): Character {
  return { ...c, skills: c.skills.map((s) => (s.id === skillId && skillAttributes(s).includes(attribute) ? { ...s, attribute } : s)) };
}

/** Ruční oprava stupně (přepis z papírového deníku) – bez bodů a bez záznamu do skillLog. */
export function setSkillRankManual(c: Character, skillId: string, rank: number): Character {
  const r = Math.max(1, Math.round(rank || 1));
  return { ...c, skills: c.skills.map((s) => (s.id === skillId ? { ...s, rank: r } : s)) };
}

/** Utracené body po úrovních (pro rozpis vedle získaných). */
export function spentByLevel(c: Character): Map<number, number> {
  const m = new Map<number, number>();
  for (const e of c.skillLog) m.set(e.level, (m.get(e.level) ?? 0) + e.cost);
  return m;
}

export function skillName(c: Character, skillId: string): string {
  const s = c.skills.find((k) => k.id === skillId);
  return s?.customName ?? getSkill(skillId)?.name ?? skillId.replace(/^custom:/, '');
}
