/** Hod kostkou s férovou náhodou (crypto.getRandomValues, VISUAL_STYLE.md → Kostky). */
export function rollDie(sides: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / sides) * sides;
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return (x % sides) + 1;
}

export type CheckOutcome = 'critical' | 'fumble' | null;
export interface CheckRoll { die: number; second: number | null; bonus: number; total: number; outcome: CheckOutcome }

/**
 * Ověřovací hod 1k10 + bonus (H06). S volitelným pravidlem kritických/fatálních výsledků:
 * padne-li 10, druhá k10 sudá = Kritický úspěch; padne-li 1, druhá k10 lichá = Fatální neúspěch.
 */
export function rollCheck(bonus: number, criticals = true, die = rollDie): CheckRoll {
  const d = die(10);
  let second: number | null = null;
  let outcome: CheckOutcome = null;
  if (criticals && (d === 10 || d === 1)) {
    second = die(10);
    if (d === 10 && second % 2 === 0) outcome = 'critical';
    if (d === 1 && second % 2 === 1) outcome = 'fumble';
  }
  return { die: d, second, bonus, total: d + bonus, outcome };
}

// ---------------------------------------------------------------- panel Kostky (VISUAL_STYLE.md → Kostky)

/** k6 prostá, k6 ⟳6 (útok/obrana), k6x6 = Výhodná pozice (první kostka rovnou 6, PPP05), k10 ověření, k10 prostá, Fate 1dF / 4dF. */
export type DiceType = 'k6' | 'k6x' | 'k6x6' | 'k10' | 'k10p' | '1dF' | '4dF';

export const DICE_LABEL: Record<DiceType, string> = { k6: 'k6', k6x: 'k6 ⟳6', k6x6: '6 + k6 ⟳6', k10: 'k10 ověření', k10p: 'k10', '1dF': '1dF', '4dF': '4dF' };

export interface DiceFace { v: number | string; hi?: boolean; second?: boolean }

export interface DiceResult {
  type: DiceType;
  label: string;
  faces: DiceFace[];
  base: number;
  mod: number;
  total: number;
  /** Počet šestek u k6 ⟳6. */
  sixes: number;
  info: string;
  tone: 'ok' | 'bad' | '';
}

/** k6 se šestkami, které se přehazují a sčítají (útok, obrana – H16). */
export function rollExploding(die = rollDie): { faces: number[]; sum: number; sixes: number } {
  const faces: number[] = [];
  let r: number;
  do { r = die(6); faces.push(r); } while (r === 6 && faces.length < 50);
  return { faces, sum: faces.reduce((a, b) => a + b, 0), sixes: faces.filter((f) => f === 6).length };
}

export function rollDice(type: DiceType, mod = 0, label = '', criticals = true, die = rollDie): DiceResult {
  let faces: DiceFace[] = [];
  let base = 0, sixes = 0, info = '';
  let tone: DiceResult['tone'] = '';
  if (type === 'k6') {
    base = die(6);
    faces = [{ v: base }];
  } else if (type === 'k6x' || type === 'k6x6') {
    const x = rollExploding(die);
    // Výhodná pozice (Assassin, PPP05): místo prvního hodu rovnou 6, pak se hází dál.
    if (type === 'k6x6') { x.faces.unshift(6); x.sum += 6; x.sixes += 1; }
    faces = x.faces.map((v) => ({ v, hi: v === 6 }));
    base = x.sum;
    sixes = x.sixes;
    const defense = /^Obrana/.test(label);
    if (sixes >= 2) {
      info = defense
        ? `${sixes}× šestka – KRITICKÁ OBRANA: při boji tváří v tvář můžeš útočníkovi způsobit Krvácení nebo Zmrzačení ruky/nohy (H16)`
        : `${sixes}× šestka – KRITICKÝ ÚTOK, pokud zraníš: Krvácení, nebo Zmrzačení ruky/nohy (H16)`;
      info += ' · padne-li i protivníkovi víc šestek, platí jen s převahou aspoň 2 šestek';
      tone = 'ok';
    } else if (sixes === 1) info = 'šestka – přehozeno a sečteno';
  } else if (type === 'k10' || type === 'k10p') {
    const c = rollCheck(0, type === 'k10' && criticals, die);
    base = c.die;
    faces = [{ v: c.die, hi: c.die === 10 || c.die === 1 }];
    if (c.second != null) {
      faces.push({ v: c.second, second: true });
      if (c.die === 10) info = c.outcome === 'critical' ? 'KRITICKÝ ÚSPĚCH (druhá k10 sudá)' : '10, ale druhá k10 lichá – vyhodnocení se nemění';
      else info = c.outcome === 'fumble' ? 'FATÁLNÍ NEÚSPĚCH (druhá k10 lichá)' : '1, ale druhá k10 sudá – vyhodnocení se nemění';
      tone = c.outcome === 'critical' ? 'ok' : c.outcome === 'fumble' ? 'bad' : '';
    }
  } else {
    const n = type === '1dF' ? 1 : 4;
    for (let i = 0; i < n; i++) {
      const r = die(3) - 2;
      faces.push({ v: r < 0 ? '−' : r > 0 ? '+' : '0', hi: r !== 0 });
      base += r;
    }
  }
  return { type, label, faces, base, mod, total: base + mod, sixes, info, tone };
}
