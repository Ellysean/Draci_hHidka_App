import { Shell } from './layout/Shell';
import { useRoute, type RouteId } from './layout/routes';
import { Postava } from './pages/Postava';
import { Listy, Poznamky, Povolani, Pratele } from './pages/Sections';
import { Boj } from './pages/Boj';
import { Dovednosti } from './pages/Dovednosti';
import { Tvorba } from './pages/Tvorba';
import { Prestup } from './pages/Prestup';
import { Vybava } from './pages/Vybava';
import { useStore } from './state/store';
import { useMemo, type JSX } from 'react';
import { Zaloha } from './pages/Zaloha';
import { Tisk } from './pages/Tisk';
import { Napoveda } from './pages/Napoveda';
import { agoText, daysSinceExport, isBlank, loadSettings } from './storage/backup';
import { Icon } from './ui/Icon';

const PAGES: Record<RouteId, () => JSX.Element> = {
  postava: Postava, dovednosti: Dovednosti, poznamky: Poznamky, listy: Listy, povolani: Povolani, pratele: Pratele, boj: Boj, tvorba: Tvorba, prestup: Prestup, vybava: Vybava, zaloha: Zaloha, tisk: Tisk, napoveda: Napoveda,
};

/** Nápověda k aktuální stránce (#/napoveda/<sekce>). */
const HELP_FOR: Partial<Record<RouteId, string>> = {
  postava: 'postava', dovednosti: 'dovednosti', poznamky: 'poznamky', listy: 'poznamky', povolani: 'povolani', pratele: 'pratele', boj: 'boj', vybava: 'vybava',
};

/** Lišta nad deníkem: stav ukládání a poslední zálohy, odkaz na Zálohu a novou postavu (Fáze 8). */
function DenikBar({ route }: { route: RouteId }) {
  const { character, storage } = useStore();
  const blank = isBlank(character);
  // Datum poslední zálohy se mění jen na stránce Záloha – stačí přečíst při změně postavy.
  const days = useMemo(() => daysSinceExport(character, loadSettings(storage)), [character.id, storage]);
  const warn = !blank && (days == null || days > 7);
  return (
    <div className={`proto denik-bar${warn ? ' warn' : ''}`}>
      <span className="save-state">
        Ukládá se automaticky do tohoto prohlížeče.
        {!blank && <> {days == null ? <b>Postava ještě nemá zálohu v souboru.</b> : <>Záloha do souboru: {agoText(days)}.</>}</>}
      </span>
      <span className="sp" />
      <a className={`btn${warn ? ' dark' : ''}`} href="#/zaloha"><Icon name="chest" />Záloha a import</a>
      <a className="btn" href={`#/napoveda${HELP_FOR[route] ? `/${HELP_FOR[route]}` : ''}`} title="Nápověda k této stránce"><Icon name="book" />Nápověda</a>
      <a className="btn dark" href="#/tvorba">+ Nová postava</a>
    </div>
  );
}

export function App() {
  const route = useRoute();
  const { storageMessage, dismissStorageMessage } = useStore();
  const Page = PAGES[route];
  return (
    <Shell route={route}>
      {storageMessage && (
        <div className="banner" role="alert">
          <span>{storageMessage}</span>
          <button type="button" className="btn" onClick={dismissStorageMessage}>Rozumím</button>
        </div>
      )}
      {!['tvorba', 'prestup', 'zaloha', 'tisk', 'napoveda'].includes(route) && <DenikBar route={route} />}
      <Page />
    </Shell>
  );
}
