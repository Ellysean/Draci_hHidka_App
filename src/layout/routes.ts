import { useEffect, useState } from 'react';
import type { IconName } from '../ui/icons';

// Hash routing (#/postava …) – funguje bez serveru, z file:// i v Capacitoru.
export type RouteId = 'postava' | 'dovednosti' | 'poznamky' | 'listy' | 'povolani' | 'pratele' | 'boj' | 'tvorba' | 'prestup' | 'vybava' | 'zaloha' | 'tisk' | 'napoveda';

export interface RouteDef {
  id: RouteId;
  label: string;
  /** Kratší popisek pro spodní lištu na mobilu. */
  short?: string;
  icon: IconName;
  group: 'denik' | 'hra' | 'skryte';
}

/** 5. záložka (povolání) dostává popisek a ikonu podle povolání postavy – viz Shell. */
export const ROUTES: RouteDef[] = [
  { id: 'postava', label: 'POSTAVA', icon: 'person', group: 'denik' },
  { id: 'dovednosti', label: 'DOVEDNOSTI', short: 'DOVED.', icon: 'swords', group: 'denik' },
  { id: 'poznamky', label: 'POZNÁMKY', short: 'POZN.', icon: 'quill', group: 'denik' },
  { id: 'listy', label: 'LISTY', icon: 'book', group: 'denik' },
  { id: 'povolani', label: 'POVOLÁNÍ', icon: 'star', group: 'denik' },
  { id: 'pratele', label: 'PŘÁTELÉ', icon: 'paw', group: 'denik' },
  { id: 'boj', label: 'BOJ A STAVY', short: 'BOJ', icon: 'battle', group: 'hra' },
  // Průvodce tvorbou postavy – bez položky v navigaci, otevírá se tlačítkem Nová postava.
  { id: 'tvorba', label: 'NOVÁ POSTAVA', icon: 'plus', group: 'skryte' },
  { id: 'prestup', label: 'PŘESTUP', icon: 'up', group: 'skryte' },
  // Výbava a peníze (Fáze 5) – otevírá se ze záložky Postava.
  { id: 'vybava', label: 'VÝBAVA', icon: 'bag', group: 'skryte' },
  // Fáze 8 – záloha, import a tisk; otevírá se z lišty nad deníkem.
  { id: 'zaloha', label: 'ZÁLOHA', icon: 'chest', group: 'skryte' },
  { id: 'tisk', label: 'TISK', icon: 'print', group: 'skryte' },
  { id: 'napoveda', label: 'NÁPOVĚDA', icon: 'help', group: 'skryte' },
];

const DEFAULT: RouteId = 'postava';

export function parseHash(hash: string): RouteId {
  const id = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return (ROUTES.some((r) => r.id === id) ? id : DEFAULT) as RouteId;
}

export const hrefFor = (id: RouteId) => `#/${id}`;

export function useRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      const next = parseHash(window.location.hash);
      // V rámci nápovědy (#/napoveda/<sekce>) neskákat nahoru – stránka sjede na sekci sama.
      setRoute((prev) => {
        if (!(prev === 'napoveda' && next === 'napoveda')) window.scrollTo(0, 0);
        return next;
      });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
