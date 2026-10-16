import type { ReactNode } from 'react';
import { getClass } from '../rules/data';
import { useStore } from '../state/store';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/icons';
import { ROUTES, hrefFor, type RouteDef, type RouteId } from './routes';

import logoUrl from '../theme/img/logo-wide.svg';

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
        <a className="logo" href="#/postava" aria-label="Dračí hlídka – Osobní deník, na záložku Postava">
          <img src={logoUrl} alt="" width="480" height="350" />
          <span className="visually-hidden">DRAČÍ HLÍDKA – OSOBNÍ DENÍK</span>
        </a>
        <nav aria-label="Sekce deníku">
          <ul className="nav">
            {routes.filter((r) => r.group === 'denik').map((r) => <NavLink key={r.id} r={r} current={route} />)}
            <li className="sep" aria-hidden="true">PŘI HŘE</li>
            {routes.filter((r) => r.group === 'hra').map((r) => <NavLink key={r.id} r={r} current={route} />)}
          </ul>
        </nav>
        <div className="motto">Příběhy tvoří hrdinové</div>
      </aside>
      <main className="main" id="obsah">{children}</main>
    </div>
  );
}
