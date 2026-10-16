import type { ReactNode } from 'react';
import { getClass } from '../rules/data';
import { useStore } from '../state/store';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/icons';
import { ROUTES, hrefFor, type RouteDef, type RouteId } from './routes';

const Dragon = () => (
  <svg viewBox="0 0 80 58" fill="currentColor" aria-hidden="true">
    <path d="M8 40c6-10 14-15 24-15-4-5-4-11 1-17 1 6 4 9 9 10 4-6 11-9 20-8-6 3-9 7-9 12 6 1 11 5 14 11-6-3-12-3-17 0 2 5 1 10-3 15 0-5-3-8-8-9-6 5-14 6-23 3 5-1 8-4 9-8-7-1-13 1-17 6z" />
  </svg>
);

function NavLink({ r, current }: { r: RouteDef; current: RouteId }) {
  return (
    <li>
      {/* <a> místo <button>: odkaz na sekci jde otevřít i v nové kartě */}
      <a className="nav-btn" href={hrefFor(r.id)} aria-current={current === r.id ? 'page' : undefined}>
        <Icon name={r.icon} />
        <span className="bl long">{r.label}</span>
        <span className="bl short" aria-hidden="true">{r.short ?? r.label}</span>
      </a>
    </li>
  );
}

export function Shell({ route, children }: { route: RouteId; children: ReactNode }) {
  const { character } = useStore();
  const cls = getClass(character.basic.classId);
  const routes = ROUTES.map((r) => (r.id === 'povolani' ? { ...r, label: cls.tabLabel, icon: cls.icon as IconName } : r));
  return (
    <div className="app">
      <aside className="side">
        <div className="logo">
          <Dragon />
          <div><b>DRAČÍ HLÍDKA</b><small>OSOBNÍ DENÍK</small></div>
        </div>
        <nav aria-label="Sekce deníku">
          <ul className="nav">
            {routes.filter((r) => r.group === 'denik').map((r) => <NavLink key={r.id} r={r} current={route} />)}
            <li className="sep" aria-hidden="true">PŘI HŘE</li>
            {routes.filter((r) => r.group === 'hra').map((r) => <NavLink key={r.id} r={r} current={route} />)}
          </ul>
        </nav>
        <div className="motto"><Dragon />Příběhy tvoří hrdinové</div>
      </aside>
      <main className="main" id="obsah">{children}</main>
    </div>
  );
}
