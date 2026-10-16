import { describe, expect, it } from 'vitest';
import { ROUTES, parseHash } from '../layout/routes';
import { HELP, norm, parseInline, sectionText } from './napoveda';

describe('nápověda', () => {
  it('sekce mají jedinečná id', () => {
    expect(new Set(HELP.map((s) => s.id)).size).toBe(HELP.length);
  });
  it('všechny odkazy vedou na existující stránku a sekci', () => {
    const links = HELP.flatMap((s) => [
      ...(s.open ? [s.open.href] : []),
      ...s.blocks.flatMap((b) => [...(b.p ?? []), ...(b.list ?? []), b.tip ?? ''])
        .flatMap((t) => parseInline(t).flatMap((x) => (x.t === 'link' ? [x.href] : []))),
    ]);
    expect(links.length).toBeGreaterThan(5);
    for (const l of links) {
      const [route, sec] = l.replace(/^#\//, '').split('/');
      expect(ROUTES.some((r) => r.id === route), l).toBe(true);
      expect(parseHash(l)).toBe(route);
      if (route === 'napoveda' && sec) expect(HELP.some((s) => s.id === sec), l).toBe(true);
    }
  });
  it('formát: tučně, kód, odkaz', () => {
    expect(parseInline('a **b** `c` [#/boj|Boj] d')).toEqual([
      { t: 'text', v: 'a ' }, { t: 'b', v: 'b' }, { t: 'text', v: ' ' }, { t: 'code', v: 'c' }, { t: 'text', v: ' ' },
      { t: 'link', href: '#/boj', v: 'Boj' }, { t: 'text', v: ' d' },
    ]);
  });
  it('hledání bez diakritiky najde sekci zálohy', () => {
    const hit = HELP.filter((s) => norm(sectionText(s)).includes(norm('zaloha')));
    expect(hit.map((s) => s.id)).toContain('zaloha');
    expect(sectionText(HELP[0])).not.toMatch(/\*\*|\[#/);
  });
});
