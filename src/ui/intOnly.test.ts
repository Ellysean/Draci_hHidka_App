import { describe, expect, it } from 'vitest';
import { intOnly } from './FormulaPopover';

describe('intOnly – vstup ručního přepisu', () => {
  it.each([['12', '12'], ['12,5', '12'], ['1.5', '1'], ['-11', '-11'], ['−3', '-3'], ['abc', ''], [' 7 ', '7']])('%s → %s', (a, b) => expect(intOnly(a)).toBe(b));
});
