// Sekce, které se naplní v dalších fázích (docs/PLAN.md). Kostra je drží v navigaci.
import { getClass } from '../rules/data';
import { useStore } from '../state/store';
import type { IconName } from '../ui/icons';
import { Placeholder } from './Placeholder';
import { Alchymie } from './Alchymie';
import { Valecnik } from './Valecnik';
import { Hranicar } from './Hranicar';
import { Kouzelnik } from './Kouzelnik';
import { Klerik } from './Klerik';
import { Zlodej } from './Zlodej';
import { Icon } from '../ui/Icon';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

export function Poznamky() {
  const { character: c, set, dispatch } = useStore();
  const rows = c.notesSections.experiences;
  const setRows = (next: typeof rows) => set(['notesSections', 'experiences'], next);
  return (
    <div className="stack">
      <Sheet>
        <div className="ribbon-row"><label htmlFor="notes-free" className="ribbon"><Icon name="quill" /><span className="ribbon__title">POZNÁMKY</span></label></div>
        <textarea id="notes-free" className="lined" value={c.basic.notes} onChange={(e) => set(['basic', 'notes'], e.target.value)} />
        <p className="small muted" style={{ margin: '6px 0 0' }}>Sdílené s poznámkami na záložce Postava.</p>
      </Sheet>
      <Sheet>
        <Ribbon icon="book">ZÁŽITKY</Ribbon>
        <table className="grid">
          <thead><tr><th>Zážitek</th><th style={{ width: '38%' }}>Dopad na postavu</th><th style={{ width: 34 }} /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="muted small">Zatím žádné zážitky – co postavu potkalo a jak ji to změnilo.</td></tr>}
            {rows.map((r, i) => (
              <tr key={i}>
                <td><input aria-label={`Zážitek ${i + 1}`} value={r.text} onChange={(e) => set(['notesSections', 'experiences', i, 'text'], e.target.value)} /></td>
                <td><input aria-label={`Dopad zážitku ${i + 1}`} value={r.impact} onChange={(e) => set(['notesSections', 'experiences', i, 'impact'], e.target.value)} /></td>
                <td className="c"><button type="button" className="fpop-x" aria-label={`Smazat zážitek ${i + 1}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="addrow" type="button" onClick={() => dispatch({ type: 'update', fn: (x) => ({ ...x, notesSections: { ...x.notesSections, experiences: [...x.notesSections.experiences, { text: '', impact: '' }] } }) })}>+ PŘIDAT ZÁŽITEK</button>
      </Sheet>
    </div>
  );
}

export const Listy = () => (
  <Placeholder title="LISTY" icon="book" phase="FÁZE 7">
    <p>Plné znění všeho, co postava umí – schopnosti, obory, kouzla, recepty, triky a prosby – s filtrem a rozbalovacími kartami.</p>
  </Placeholder>
);

export function Povolani() {
  const { character } = useStore();
  const cls = getClass(character.basic.classId);
  if (cls.id === 'alchymista') return <Alchymie />;
  if (cls.id === 'valecnik') return <Valecnik />;
  if (cls.id === 'hranicar') return <Hranicar />;
  if (cls.id === 'kouzelnik') return <Kouzelnik />;
  if (cls.id === 'klerik') return <Klerik />;
  if (cls.id === 'zlodej') return <Zlodej />;
  const what: Record<string, string> = {};
  return (
    <Placeholder title={cls.tabLabel} icon={cls.icon as IconName} phase="FÁZE 7">
      <p>{what[cls.id]}</p>
    </Placeholder>
  );
}

export { Pratele } from './Pratele';
