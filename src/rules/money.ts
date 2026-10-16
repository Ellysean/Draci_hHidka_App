// Peníze: kurz 1 zl = 10 st = 100 md (RULES_FORMULAS.md §10, ✔ U).
import type { Money } from '../model/types';
import type { Price } from './data';

const PER_MD = { zl: 100, st: 10, md: 1 } as const;

/** Cena v měďácích. */
export const priceMd = (p: Price | null | undefined) => (p ? Math.round(p.v * PER_MD[p.cur]) : 0);

export const moneyToMd = (m: Money) => m.gold * 100 + m.silver * 10 + m.copper;

/** Rozmění částku v md na mince (zlaté drží, dokud to jde). */
export const mdToMoney = (md: number): Money => {
  const n = Math.max(0, Math.round(md));
  return { gold: Math.floor(n / 100), silver: Math.floor((n % 100) / 10), copper: n % 10 };
};

export const formatMd = (md: number) => {
  const { gold, silver, copper } = mdToMoney(md);
  return [gold && `${gold} zl`, silver && `${silver} st`, copper && `${copper} md`].filter(Boolean).join(' ') || '0 zl';
};

export const formatPrice = (p: Price | null | undefined) => (p ? `${p.v} ${p.cur}` : '—');
