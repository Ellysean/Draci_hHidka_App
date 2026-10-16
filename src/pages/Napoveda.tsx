// NÁPOVĚDA (Fáze 8) – uživatelská příručka v appce. Obsah v help/napoveda.ts.
// Odkaz na sekci: #/napoveda/<id> (např. #/napoveda/boj) – stránka na ni sama sjede.
import { Fragment, useEffect, useMemo, useState } from 'react';
import { HELP, norm, parseInline, sectionText, type HelpSection } from '../help/napoveda';
import { Icon } from '../ui/Icon';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

function Inline({ s }: { s: string }) {
  return (
    <>
      {parseInline(s).map((x, i) => {
        if (x.t === 'b') return <b key={i}>{x.v}</b>;
        if (x.t === 'code') return <code key={i}>{x.v}</code>;
        if (x.t === 'link') return <a key={i} href={x.href}>{x.v}</a>;
        return <Fragment key={i}>{x.v}</Fragment>;
      })}
    </>
  );
}

const sectionFromHash = () => window.location.hash.replace(/^#\/?/, '').split('/')[1] ?? '';

function Section({ s }: { s: HelpSection }) {
  return (
    <Sheet>
      <section id={`help-${s.id}`} className="help-sec" aria-labelledby={`help-h-${s.id}`}>
        <div className="ribbon-row">
          <Ribbon icon={s.icon} id={`help-h-${s.id}`}>{s.title.toUpperCase()}</Ribbon>
          {s.open && <a className="sk-link" href={s.open.href}>{s.open.label} →</a>}
        </div>
        <p className="help-lead">{s.lead}</p>
        {s.blocks.map((b, i) => (
          <div key={i} className="help-block">
            {b.h && <h3>{b.h}</h3>}
            {b.p?.map((t, j) => <p key={j}><Inline s={t} /></p>)}
            {b.list && <ul>{b.list.map((t, j) => <li key={j}><Inline s={t} /></li>)}</ul>}
            {b.tip && <p className="help-tip"><Inline s={b.tip} /></p>}
          </div>
        ))}
      </section>
    </Sheet>
  );
}

export function Napoveda() {
  const [q, setQ] = useState('');
  const [target, setTarget] = useState(sectionFromHash);
  const shown = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return HELP;
    return HELP.filter((s) => { const t = norm(sectionText(s)); return words.every((w) => t.includes(w)); });
  }, [q]);

  // #/napoveda/<sekce> – sjet na sekci (i při změně hashe bez opuštění stránky).
  useEffect(() => {
    const on = () => setTarget(sectionFromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    if (!target) { window.scrollTo(0, 0); return; }
    const t = setTimeout(() => document.getElementById(`help-${target}`)?.scrollIntoView({ block: 'start' }), 30);
    return () => clearTimeout(t);
  }, [target]);

  const go = (id: string) => {
    setQ('');
    if (sectionFromHash() === id) document.getElementById(`help-${id}`)?.scrollIntoView({ block: 'start' });
    else window.location.hash = `#/napoveda/${id}`;
  };

  return (
    <div className="stack help-page">
      <div className="wiz-head">
        <div><Ribbon icon="book">NÁPOVĚDA</Ribbon><h1 className="pg">Jak používat deník</h1></div>
        <div className="steps">
          <span className="small muted">verze {__APP_VERSION__}</span>
          <a className="btn" href="#/postava">← Zpět do deníku</a>
        </div>
      </div>

      <Sheet>
        <div className="help-search">
          <input className="field" type="search" placeholder="Hledat v nápovědě… (např. záloha, přestup, krvácení)" value={q}
            onChange={(e) => setQ(e.target.value)} aria-label="Hledat v nápovědě" />
        </div>
        <nav aria-label="Obsah nápovědy" className="help-toc">
          {HELP.map((s) => (
            <button key={s.id} type="button" className="help-toc-i" onClick={() => go(s.id)}>
              <Icon name={s.icon} /><span><b>{s.title}</b><small>{s.lead}</small></span>
            </button>
          ))}
        </nav>
      </Sheet>

      {q && <p className="small" role="status">{shown.length ? `Nalezeno v ${shown.length} ${shown.length === 1 ? 'sekci' : shown.length < 5 ? 'sekcích' : 'sekcích'}.` : 'Nic nenalezeno – zkus jiné slovo.'}</p>}
      {shown.map((s) => <Section key={s.id} s={s} />)}
    </div>
  );
}
