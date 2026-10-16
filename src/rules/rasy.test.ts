// Rodové schopnosti (H04): plné znění všech ras, situační bonusy jen jako připomínka, záchranné hody.
import { describe, expect, it } from 'vitest';
import { newCharacter } from '../model/defaults';
import { RACES } from './data';
import { derive } from './derive';
import { RACE_ABILITY, SAVE_SKILLS, raceSkillNote } from './rasy';

describe('rodové schopnosti', () => {
  it('každá rasa má plné znění', () => {
    for (const r of RACES) expect(RACE_ABILITY[r.id].text.length).toBeGreaterThan(80);
  });
  it('situační bonusy se nezapočítávají, jen připomínají', () => {
    const c = newCharacter();
    c.basic.raceId = 'gnom';
    c.skills.push({ id: 'mechanika', customName: null, attribute: 'obr', rank: 3, source: 'bought' });
    expect(raceSkillNote(c, 'mechanika')).toMatchObject({ bonus: 2 });
    expect(raceSkillNote(c, 'hbitost')).toBeNull();
    const d = derive(c);
    expect(d.skills.find((s) => s.id === 'mechanika')!.bonus).toBe(0);
    c.basic.raceId = 'elf';
    expect(raceSkillNote(c, 'postreh')?.when).toMatch(/zrak/);
    c.basic.raceId = 'trpaslik';
    expect(raceSkillNote(c, 'postreh')).toBeNull();
  });
  it('záchranné hody: Atletika, Vůle, Postřeh, Výdrž, Hbitost', () => {
    expect([...SAVE_SKILLS].sort()).toEqual(['atletika', 'hbitost', 'postreh', 'vule', 'vydrz']);
  });
});
