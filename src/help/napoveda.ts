// Obsah stránky NÁPOVĚDA (Fáze 8) – uživatelská příručka pro hráče a testery.
// Data odděleně od komponenty: text jde upravovat bez zásahu do UI a stejný obsah
// slouží i sdílené příručce mimo appku. Při nové funkci doplň příslušnou sekci.
import type { IconName } from '../ui/icons';

export interface HelpBlock {
  /** Podnadpis bloku. */
  h?: string;
  /** Odstavce. **tučně** a `#/odkaz|text` se vykreslí (viz renderInline). */
  p?: string[];
  /** Odrážky. */
  list?: string[];
  /** Zvýrazněný tip. */
  tip?: string;
}

export interface HelpSection {
  id: string;
  title: string;
  icon: IconName;
  /** Jedna věta – v obsahu a pod nadpisem. */
  lead: string;
  blocks: HelpBlock[];
  /** Kam v appce sekce vede. */
  open?: { href: string; label: string };
}

export const HELP: HelpSection[] = [
  {
    id: 'zaciname',
    title: 'Začínáme',
    icon: 'star',
    lead: 'Co appka umí, kde jsou data a jak začít.',
    blocks: [
      {
        p: [
          'Osobní deník je elektronický **deník postavy pro Dračí hlídku** (verze pravidel 1.2.5 + rozšíření PPP). Všechno, co je na papírovém deníku, zapisuješ sem – a appka za tebe dopočítá odvozené hodnoty (opravy atributů, životy, útočné a obranné číslo, naložení, dovednostní body…), hlídá pravidla přestupu a pomáhá při hře (boj, kostky, kouzla, alchymie).',
          'Appka drží **jednu postavu**. Ukládá se **jen do tohoto prohlížeče** na tomhle zařízení – bez účtu a bez serveru. Pro přenos na jiné zařízení a jako pojistku slouží **soubor zálohy** (viz [#/napoveda/zaloha|Záloha, import a tisk]).',
        ],
      },
      {
        h: 'Tři způsoby, jak začít',
        list: [
          '**Průvodce tvorbou** – tlačítko **+ Nová postava** v liště nahoře. Provede tě krok za krokem podle H05.',
          '**Prázdný deník** – když přepisuješ rozehranou postavu z papíru (Záloha a import → Nová postava → Prázdný deník). Vše vyplníš ručně.',
          '**Ukázka: Kloi** – hotová gnómí alchymistka 3. úrovně na vyzkoušení (tamtéž).',
          '**Načíst ze souboru** – postava od spoluhráče nebo z jiného zařízení.',
        ],
      },
      {
        h: 'Kde co najdeš',
        list: [
          '**Na počítači** je navigace v levém panelu, **na telefonu** ve spodní liště (zkrácené popisky).',
          'Záložky deníku: **Postava, Dovednosti, Poznámky, Listy, záložka povolání** (Triky / Příroda / Alchymie / Kouzla / Umění / Víra) **a Přátelé**. Při hře: **Boj a stavy**.',
          'Lišta nad deníkem: stav ukládání, kdy byla naposledy záloha do souboru, **Záloha a import**, **Nápověda** a **+ Nová postava**.',
          'Kulaté tlačítko vpravo dole otevře **Kostky**.',
        ],
      },
    ],
  },
  {
    id: 'ovladani',
    title: 'Jak se deník ovládá',
    icon: 'quill',
    lead: 'Barvy polí, vzorce, ruční přepis, hody a vracení změn.',
    blocks: [
      {
        h: 'Druhy polí',
        list: [
          '**Bílé pole** – zapisuješ ty (jméno, stupně atributů, aktuální životy, mince…).',
          '**Šedé pole s ƒ** – appka ho počítá. **Klepni na něj** a uvidíš vzorec, ze kterého hodnota vzešla (např. „Max. životy = tabulka(úroveň, ODO) + Skvělá kondice“).',
          '**✎ Ruční přepis** – v okénku vzorce můžeš hodnotu přepsat (rozhodnutí PJ, pravidlo, které appka nezná, přepis z papíru). Přepsané pole je označené a tlačítkem **Vrátit na vzorec** ho vrátíš.',
          '**ⓘ** – info bublina s plným zněním (rodové schopnosti, situační bonusy u dovedností, tabulka zkušeností…).',
          '**⚄** – tlačítko hodu: hodí správnou kostkou s bonusem a výsledek ukáže v panelu Kostky.',
        ],
      },
      {
        h: 'Ukládání a vracení',
        list: [
          'Každá změna se **uloží sama** (do půl vteřiny, a hned při zavření nebo schování stránky). Tlačítko Uložit neexistuje.',
          'Většina akcí při hře má **Záznam** a **Vrátit** (boj a životy, výbava a peníze, alchymie, akce povolání). Vrátit bere poslední krok zpět – i několikrát po sobě.',
          'Přestup na úroveň jde vrátit jednou: **Vrátit poslední přestup** na záložce Postava.',
          'Nevratné věci (nahrazení postavy, smazání zálohy, ztráta hole…) se vždy ptají v potvrzovacím okně. Výchozí volba je **Zpět**.',
        ],
        tip: 'Appka počítá podle pravidel, ale **poslední slovo má PJ**. Když se rozhodne jinak, použij ruční přepis – nic se tím nerozbije.',
      },
    ],
  },
  {
    id: 'tvorba',
    title: 'Nová postava (průvodce)',
    icon: 'plus',
    lead: 'Devět kroků podle H05 – od konceptu po vybavení.',
    open: { href: '#/tvorba', label: 'Otevřít průvodce' },
    blocks: [
      {
        p: ['Kroky: **Koncept → Rasa → Povolání → Atributy → Životy a energie → Dovednosti → Schopnosti → Vybavení → Shrnutí**. Na další krok se dostaneš, až je ten současný hotový; pod tlačítkem Dál je vždy napsané, co ještě chybí. Vpravo (na telefonu pod krokem) je průběžný **náhled** postavy.'],
        list: [
          '**Atributy** – rozdělení bodů podle rasy a povolání, opravy se ukazují hned.',
          '**Životy a energie** – z tabulek, nic se nezadává ručně.',
          '**Dovednosti** – základní a profesní dovednosti povolání a body na další. Kdo začíná, může jedním tlačítkem vzít **doporučené dovednosti** z H05; rámeček **Záchranné hody** ukáže, které z dovedností pro záchranné hody (Atletika, Vůle, Postřeh, Výdrž, Hbitost) postavě chybí, a naučí je za 1 bod.',
          '**Vybavení** – doporučená výbava podle povolání, nebo **na míru** s obchodem (nákup s rozměňováním mincí, kurz 1 zl = 10 st = 100 md).',
        ],
      },
      {
        list: [
          'Rozpracovaná postava (koncept) se ukládá zvlášť. **Zavřít (koncept zůstane)** tě pustí zpět do deníku a příště pokračuješ, kde jsi skončil. **Zahodit** začne znovu.',
          '**Vytvořit postavu** ve Shrnutí nahradí postavu v deníku. Pokud tam už nějaká je, appka se zeptá a starou postavu uloží mezi **zálohy v prohlížeči** – jde ji obnovit.',
        ],
      },
    ],
  },
  {
    id: 'postava',
    title: 'Záložka Postava',
    icon: 'person',
    lead: 'Hlavní list deníku – základní údaje, atributy, životy, energie, výzbroj.',
    open: { href: '#/postava', label: 'Otevřít Postavu' },
    blocks: [
      {
        list: [
          '**Povolání a rasa** – výběr ve štítu uprostřed. U rozehrané postavy se změna potvrzuje (přepočítá velikost, pohyblivost, schopnosti a body). U klerika je pole **Bůh**.',
          '**Atributy** – zapisuješ stupně, opravy se počítají. Bonusy schopností (např. Zocelení) se přičtou, zapsaný základ zůstane. Upozornění na nerozdělené charakterové body.',
          '**Životy** – max. z Tabulky životů (úroveň × ODO) + schopnosti; aktuální zapisuješ; hranice smrti se počítá. **Mana / Duševní síla / Přízeň / Adrenalin** podle povolání.',
          '**Únava, naložení, pohyblivost, velikost** – nosnost a max. únavu zadáváš ručně (pravidla je v tabulce neuvádějí); při překročení se hodnota zvýrazní.',
          '**Zkušenosti a úroveň** – ukazatel postupu, ⓘ ukáže, kolik chybí do další úrovně a prahy dalších úrovní. Když je zkušeností dost, objeví se **MŮŽEŠ PŘESTOUPIT** a tlačítko **PŘESTUP**.',
          '**Zvláštní schopnosti** – rodová schopnost (ⓘ = plné znění z H04), schopnosti 1. úrovně, specializace, větve, naučené schopnosti a položky. U alchymisty i **Augmentace** (zaškrtnutím se zapnou jejich efekty).',
          '**Zbraně, Zbroj a štít, Peníze, Výbava** – přehled; úpravy přes odkaz na stránku [#/vybava|Výbava a peníze].',
        ],
      },
    ],
  },
  {
    id: 'prestup',
    title: 'Přestup na úroveň',
    icon: 'up',
    lead: 'Průvodce podle H18 – schopnosti, atributy, životy, dovednosti a položky.',
    blocks: [
      {
        p: ['Tlačítko **PŘESTUP** u úrovně na záložce Postava. Kroky se skládají podle povolání a úrovně:'],
        list: [
          '**Přehled** – co nová úroveň přinese.',
          '**Schopnost** – volba schopnosti / větve (obor, směr, škola, nauka, umění…). Nabízí jen to, na co má postava nárok; u zamčených je důvod.',
          '**Specializace** – od 6. úrovně, nepovinná; nabízí se při každém dalším přestupu, dokud ji postava nemá. Podmínky se počítají i se schopností zvolenou na téže úrovni.',
          '**Atributy** – charakterové body na úrovních, kde se získávají.',
          '**Životy (a energie)** – z tabulek, automaticky.',
          '**Dovednosti** – nové body, každá dovednost **nejvýš +1 stupeň za úroveň** (Expertiza: na sudé úrovni jedna dovednost až +2).',
          '**Kouzla / triky / prosby / recepty** – nové položky z povoleného výběru (počty hlídá appka).',
          '**Přátelé** – růst zvířecího přítele, parťáka nebo Důvěrníka.',
          '**Shrnutí** – před → po; teprve **Potvrdit** změny zapíše.',
        ],
        tip: 'Spletl ses? **Vrátit poslední přestup** na záložce Postava vrátí postavu do stavu před přestupem (jen poslední přestup a jen v tomto prohlížeči).',
      },
    ],
  },
  {
    id: 'dovednosti',
    title: 'Dovednosti',
    icon: 'swords',
    lead: 'Stupně, body, zlepšování s limitem, nové dovednosti a hody.',
    open: { href: '#/dovednosti', label: 'Otevřít Dovednosti' },
    blocks: [
      {
        list: [
          'U každé dovednosti: **atribut** (u dvouatributových si vybereš), stupeň, oprava, bonusy schopností a **celkový bonus**; štítek odkud je (povolání / profesní / schopnost / koupená / vlastní).',
          '**Dovednostní body** – získáno / utraceno / zbývá, rozpis po úrovních a historie.',
          '**Zlepšit** o stupeň stojí body; limit **+1 stupeň na dovednost za úroveň** (Expertiza výjimkou). Zlepšení z aktuální úrovně jde **vrátit** (↶, body zpět).',
          '**Nová dovednost** za 1 bod – ze seznamu obecných, nebo **vlastní** (název + atribut; štítek VLASTNÍ = schvaluje PJ). Koupenou nebo vlastní jde odebrat a body se vrátí.',
          '**Ruční úprava stupňů** (přepínač) – pro přepis z papíru, bez bodů a bez záznamu.',
          '**⚄ Hod** = k10 + bonus; s přepínačem kritických výsledků (H06) hodí appka při 1 nebo 10 i druhou k10.',
          'Štítek **ZÁCHRANNÝ HOD** mají Atletika, Vůle, Postřeh, Výdrž a Hbitost. ⓘ u dovednosti upozorní na situační bonus rodové schopnosti – započítá ho PJ.',
          'Rozbalovací **přehled všech dovedností z pravidel** ukáže, co která dělá a odkud se bere.',
        ],
      },
    ],
  },
  {
    id: 'vybava',
    title: 'Výbava a peníze',
    icon: 'bag',
    lead: 'Měšec, nákup z katalogu H15, vlastní předměty, naložení.',
    open: { href: '#/vybava', label: 'Otevřít Výbavu' },
    blocks: [
      {
        list: [
          '**Měšec** – Příjem / Výdaj s poznámkou a **historií**, „rozměnit na nejméně mincí“. Kurz 1 zl = 10 st = 100 md.',
          '**Katalog** – zbraně, zbroje, róby, štíty, doplňky a vybavení z H15 (+ zlodějské zbraně a udělátka). **Přidat** = bez placení (nález, přepis z papíru), **Koupit** = zaplatí, nejdřív drobnými, nazpět co nejméně mincí. Před pořízením ukáže, jak se změní ÚČ/OČ nebo ZO, a upozorní na nedostatečnou SIL apod.',
          '**Vlastní položky** – zbraň, zbroj, štít nebo předmět s vlastními parametry; uloží se do katalogu na kartě Vlastní.',
          '**Prodej** při odebrání – předvyplněná **polovina kupní ceny**, jinou cenu určí PJ.',
          '**Nese** – přepínač u předmětu; nenesené se nepočítá do naložení. Počty kusů −/+.',
          'Nová zbroj či štít se rovnou nasadí, dosavadní kus jde do výbavy a odtud jde **znovu nasadit**.',
          'Kontrola SIL: přetížení zbraní −5 k ÚČ/OČ, štítem −5 k OČ. Štítky SIL NESTAČÍ, plížení, MAGIE +X u rób.',
          '**Naložení** s rozpisem (výbava / zbraně / zbroj / štít / alchymie). **Vrátit poslední změnu** výzbroje a peněz.',
        ],
      },
    ],
  },
  {
    id: 'boj',
    title: 'Boj a stavy',
    icon: 'heart',
    lead: 'Životy, léčení, únava, stavy a hlídání akcí v tahu podle H16 a H17.',
    open: { href: '#/boj', label: 'Otevřít Boj a stavy' },
    blocks: [
      {
        h: 'Životy a léčení',
        list: [
          'Stupnice životů (0 · bezvědomí, hranice smrti, maximum) a **stav postavy** – bojeschopná / těžce zraněná / v bezvědomí / mrtvá.',
          'Rychlé **−5 −1 +1 +5**, libovolné **Zranění** a **Léčení** (nikdy nad maximum).',
          '**Odpočinek** (+1 život, únava −1), **Spánek 8 h…** (+2, únava −3 – hodnoty jde před potvrzením upravit podle PJ), **Zotavení** (+⌈max/5⌉, jen svěží postava), **První pomoc** (+stupeň dovednosti).',
          'Krvácení a zmrzačení jsou kritická zranění – potřebují První pomoc (H17).',
        ],
      },
      {
        h: 'Stavy a únava',
        list: [
          '**Stavy** (omámení, oslabení, oslepení, povalení, otřesení, krvácení ×N, zapálení…) – stavy na 3 kola se samy odpočítávají.',
          '**Aktivní postihy** – co se právě odečítá od hodů (únava, stavy, přesila, zmrzačená ruka) a proč.',
        ],
      },
      {
        h: 'Tah a kolo',
        list: [
          '**Začít boj** → iniciativa (hod, volitelně každé kolo), případně překvapení.',
          'V tahu **2 krátké akce nebo 1 dlouhá** + okamžité; poslední krátká akce má ⚠. **Aktivní obrana** 1× za kolo i mimo tah (OČ + k6 s explodující šestkou a kritem).',
          'Stavy blokují akce i s důvodem (např. povalení → vztyk je dlouhá akce). Na začátku tahu se samy hodí a odečtou efekty (krvácení, zapálení).',
          '**Přesila** – obrana −1 až −3 (Boj s přesilou ji ruší).',
          '**Kouzla, prosby a triky v boji** – s cenou, délkou vyvolání (i víckolové) a ověřením. Panel povolání (Válečník / Kouzelník / Klerik / Zloděj v boji) přidá jeho specifické volby.',
          '**Nové kolo**, **Ukončit boj**. Panel **Přátelé v boji** pro zvířata a pomocníky.',
        ],
      },
      {
        h: 'Bojové hodnoty a záznam',
        list: [
          'ÚČ, OČ, ZO a iniciativa s tlačítky hodu ⚄ útoku a obrany u každé zbraně; obrana proti střelbě (jen se štítem).',
          '**Záznam** posledních 50 úprav a **Vrátit** až 20 kroků zpět – přežije i obnovení stránky.',
        ],
      },
    ],
  },
  {
    id: 'kostky',
    title: 'Kostky',
    icon: 'spark',
    lead: 'Plovoucí panel s hody podle H06.',
    blocks: [
      {
        list: [
          'Otevře se kulatým tlačítkem vpravo dole (na každé stránce).',
          '**k6**, **k6 ⟳6** (explodující šestka – útok a obrana; kritický úspěch při 2+ šestkách), **k10 ověření** (s druhou k10 při kritickém / fatálním výsledku), **k10 prostá**, **1dF**, **4dF**.',
          'Pole **oprava** se přičte k hodu. Historie posledních 8 hodů (neukládá se).',
          'Přepínač **Kritické/fatální (H06)** – zapnutý je výchozí; platí i pro hody z dovedností a boje.',
        ],
      },
    ],
  },
  {
    id: 'povolani',
    title: 'Záložka povolání',
    icon: 'book',
    lead: 'Pátá záložka se mění podle povolání – mechaniky z H08–H13 a PPP01–06.',
    open: { href: '#/povolani', label: 'Otevřít záložku povolání' },
    blocks: [
      {
        p: ['Všechny kouzla, triky, prosby, recepty a schopnosti mají **plné znění** a **filtr** (známé / může se naučit / všechny). Co postava zná, se bere automaticky z jejích schopností a větví – ruční úprava je možná tam, kde to pravidla nechávají na volbě.'],
      },
      {
        h: 'Válečník – záložka TRIKY',
        list: [
          'Adrenalin, Léčba vlastních zranění, styl boje (Rozvážnost, Proměnlivý úchop, Záměna), zbraně s bonusy, bojové školy, Cesty I–IV a Mistr, schopnosti, 116 triků.',
          'V boji: více útoků a obran za kolo (Vícenásobný útok, Bijec…), boj dvěma zbraněmi, Nával adrenalinu, Vražedná zuřivost, Cesta krve, Sebeobětování, strategie, Velení a Bojové rozkazy.',
        ],
      },
      {
        h: 'Hraničář – záložka PŘÍRODA',
        list: [
          'Duševní síla s obnovou (jen svěží; úrovně 1–6 podle H09, vyšší dopočtené přírůstky z PPP02), směry hraničářské magie, schopnosti a specializace, situační bonusy, **pasti** s hodem Líčení pastí, kouzla a odvary se sesíláním mimo boj.',
          'V boji: Rychlá střelba, Bojová hůl, kouzla z plných dat.',
        ],
      },
      {
        h: 'Kouzelník – záložka KOUZLA',
        list: [
          'Mana (meditace 1×/den, nasátí, Vládce many), Rituál krve, **hůl** (rituál od 6. úr., ukládání many, přivolání), kouzla působící na postavu, obory, schopnosti, mentální techniky.',
          '**Volby sesílání** – rychlé, precizní, bez řeči / gest, utajené, zbroj, róba, vyrušení… – appka z nich spočítá délku, obtížnost i cenu. Kouzlení z knih, Záměna kouzel.',
          'V boji: Magický štít / Zbroj do ZO, Rychlost (3 krátké akce), Bojové sesílání, Mentální souboj.',
        ],
      },
      {
        h: 'Alchymista – záložka ALCHYMIE',
        list: [
          'Zdroje (destilace, transformace, sběr, vnímání many, nákup), **dílna** (4 velikosti), základy, 52+ receptů s filtrem **Lze vyrobit / Něco chybí**, výroba s hodem, výrobky (použití, recyklace, sabotáž), záznam s vrácením.',
          'Schopnosti PPP03 od 6. úrovně (hromadná výroba, koncentrované substance, hůlky…).',
          'Specializace: **Medicus** (operace, augmentace, sešívanci), **Pyromant** (konstrukty, odpálení, palné zbraně, transmutace), **Theurg** (hůl s Astronem, démoni, bhůtové, elementálové, esence).',
        ],
      },
      {
        h: 'Klerik – záložka VÍRA',
        list: [
          'Přízeň a modlitby (+⅓ max., 3×/den), Svěcení (svěcená voda do výbavy), teologické nauky, schopnosti, prosby s plným zněním a temnými alternativami, léky, Zvolání, Požehnání, Oběti, Ikony, Zázraky.',
          'Volby vzývání (posvátný symbol, rituál, posvátné místo, vyrušení…). Prosby s jednotkami (slova, údery, kola) – Přízeň i obtížnost se dopočítají. **Posel** má kartu s ruční úpravou hodnot.',
        ],
      },
      {
        h: 'Zloděj – záložka UMĚNÍ',
        list: [
          'Umění a dovednosti s hody, Den a cech (Druhá šance, Zrcadlení), schopnosti a specializace (Assassin, Lupič, Sicco), zlodějské triky, **jedy**, **výroba** udělátek, zbraní cechu a pastí, **Siccova síť** (nábor, výplata, akce sítě), pověsti a drby.',
          'V boji: triky, Oko střelce, Výhodná pozice, Riskantní útok, Bojová kreativita, Vrhání dýk.',
        ],
      },
    ],
  },
  {
    id: 'pratele',
    title: 'Přátelé a zvířata',
    icon: 'paw',
    lead: 'Zvířecí přítel, smečka, kůň, kouzelníkův přítel, parťák, Důvěrník.',
    open: { href: '#/pratele', label: 'Otevřít Přátele' },
    blocks: [
      {
        list: [
          '**Nový přítel** – appka řekne, jestli ho postava smí mít (schopnost, počet, úroveň); jinak jde přidat **se souhlasem PJ**.',
          '**Ochočení** (k10 + Ochočování zvířat, bonusy za mládě a Spřízněnost) a **vyvolání** přítele kouzelníka (jen s plnou manou).',
          '**Karta přítele** – životy, mana, útoky, ZO, OČ, dovednosti s hody ⚄; hodnoty jde ručně upravit.',
          '**Smečka** Pána zvířat, **Zvířecí šampion**, **Boj ve smečce** (+1 ÚČ a OČ za zvíře v boji, max. +5).',
          'Růst přítele se řeší v **přestupu** (krok Přátelé). Odešlí a zesnulí zůstávají v přehledu.',
        ],
      },
    ],
  },
  {
    id: 'poznamky',
    title: 'Poznámky a Listy',
    icon: 'quill',
    lead: 'Volné poznámky, zážitky a připravované Listy.',
    open: { href: '#/poznamky', label: 'Otevřít Poznámky' },
    blocks: [
      {
        list: [
          '**Poznámky** – volný text, sdílený s poznámkami na záložce Postava.',
          '**Zážitky** – tabulka „co postavu potkalo / jak ji to změnilo“.',
          '**Listy** – zatím jen připravené místo; plná znění schopností, kouzel, triků a proseb najdeš na záložce povolání.',
        ],
      },
    ],
  },
  {
    id: 'zaloha',
    title: 'Záloha, import a tisk',
    icon: 'chest',
    lead: 'Jak nepřijít o postavu a jak ji přenést jinam.',
    open: { href: '#/zaloha', label: 'Otevřít Zálohu a import' },
    blocks: [
      {
        h: 'Proč zálohovat',
        p: ['Postava je jen v úložišti **tohoto prohlížeče**. Smazání dat prohlížeče, anonymní okno, jiný prohlížeč, nový telefon – a postava tam není. Proto si po každém sezení stáhni **soubor zálohy**. Lišta nad deníkem připomene, kdy byla poslední záloha (zčervená, když nikdy nebo před víc než týdnem).'],
      },
      {
        h: 'Uložit do souboru',
        list: [
          '**Stáhnout zálohu** – soubor `DH-jméno-u3-2026-10-03.json`. Ulož ho na disk, OneDrive / Google Disk nebo si ho pošli e-mailem.',
          '**Sdílet…** (na telefonu) – pošle soubor rovnou do Disku, e-mailu nebo chatu.',
          '**Tisk / PDF** – souhrn postavy na jednu stranu A4 (v dialogu tisku zvol „Uložit jako PDF“). Papírová pojistka ke stolu a pro PJ; obnovit z něj postavu nejde.',
        ],
      },
      {
        h: 'Načíst ze souboru',
        list: [
          '**Vybrat soubor…** (na počítači jde soubor i přetáhnout). Appka ukáže náhled – kdo to je, úroveň, zkušenosti, kdy byla záloha udělaná – a varuje, když je v deníku jiná postava nebo když je záloha starší než postava v deníku.',
          'Načtená postava **nahradí** současnou. Zaškrtnutím „Nejdřív stáhnout zálohu současné postavy“ si ji před tím uložíš do souboru.',
          'Zálohy ze starších verzí appky se doplní samy; soubor z novější verze appka odmítne (aktualizuj appku).',
        ],
      },
      {
        h: 'Zálohy v prohlížeči',
        p: ['Před **každým nahrazením** postavy (import, nová postava, prázdný deník, ukázka, obnova) appka současnou postavu sama uloží. Drží posledních 6 – každou jde **Obnovit**, **Stáhnout** do souboru nebo smazat. Jsou ale pořád jen v tomhle prohlížeči, soubor nenahradí.'],
        tip: '**Víc postav?** Appka drží jednu, ale můžeš je střídat: stáhni zálohu jedné, načti druhou. Každá postava má svůj soubor.',
      },
    ],
  },
  {
    id: 'telefon',
    title: 'Na telefonu a tabletu',
    icon: 'person',
    lead: 'Co je na malé obrazovce jinak.',
    blocks: [
      {
        list: [
          'Navigace je ve **spodní liště** se zkrácenými popisky (DOVED., POZN., BOJ…). Lišta Záloha a import / Nápověda / Nová postava je nahoře na stránce.',
          'Tabulky (dovednosti, výbava) se skládají do karet. Okénko vzorce se otevírá jako panel zespodu.',
          'Přenos z počítače na telefon: na počítači **Stáhnout zálohu** → soubor si pošli (e-mail, Disk) → na telefonu **Vybrat soubor…**.',
          'Na telefonu jde zálohu **Sdílet…** přímo do aplikací.',
        ],
      },
    ],
  },
  {
    id: 'testovani',
    title: 'Pro testery',
    icon: 'skull',
    lead: 'Co zkoušet a jak hlásit chyby.',
    blocks: [
      {
        h: 'Co zkoušet',
        list: [
          'Založ si postavu **průvodcem** – nebo přepiš svou rozehranou postavu z papíru a porovnej hodnoty.',
          'Odehraj v appce **jedno sezení**: boj, léčení, kouzla / triky / prosby / alchymie, nákup, zkušenosti a **přestup**.',
          'Zkus **zálohu a import** na jiném zařízení a **tisk do PDF**.',
          'Na telefonu: dá se to ovládat jednou rukou u stolu? Je něco moc malé nebo schované?',
        ],
      },
      {
        h: 'Jak nahlásit chybu',
        list: [
          '**Kde** (záložka, sekce, tlačítko) a **co jsi dělal** krok za krokem.',
          '**Co čekáš** a **co appka udělala** – u výpočtů i odkaz na pravidla (kniha, strana).',
          '**Snímek obrazovky** a ideálně **soubor zálohy postavy** (Záloha a import → Stáhnout zálohu) – chybu jde pak přesně zopakovat.',
          '**Verzi appky** – je v záhlaví Nápovědy a v patičce tisku.',
        ],
        tip: 'Rozpor s pravidly není vždy chyba – u sporných míst appka používá **výklad**, který jde po dohodě s PJ upravit. Pošli ho i tak, rozhodne se společně.',
      },
    ],
  },
  {
    id: 'otazky',
    title: 'Časté otázky',
    icon: 'hourglass',
    lead: 'Rychlé odpovědi na typické situace.',
    blocks: [
      {
        h: 'Zmizela mi postava!',
        p: ['Nejdřív se podívej do **Záloha a import → Zálohy v prohlížeči** – pokud se postava jen nahradila, je tam. Když byla smazána data prohlížeče, pomůže jen **soubor zálohy**. Pokud se postava nedá načíst (poškozená data), appka je uloží mezi zálohy jako „nečitelná data“ – stáhni je a pošli k opravě.'],
      },
      {
        h: 'Hodnota nesedí s papírem / s PJ',
        p: ['Klepni na šedé pole – vzorec ukáže, z čeho appka počítala. Pokud je správně jinak, použij **✎ ruční přepis** a nahlas to (viz Pro testery).'],
      },
      {
        h: 'Nejde mi zlepšit dovednost',
        p: ['Na každé úrovni jde dovednost zlepšit jen o 1 stupeň (výjimka Expertiza). U tlačítka je vždy důvod. Pro přepis z papíru zapni **Ruční úpravu stupňů**.'],
      },
      {
        h: 'V přestupu nemůžu vybrat schopnost',
        p: ['Zamčené volby ukazují důvod (úroveň, podmínka specializace, počet). Když PJ povolí výjimku, schopnost jde doplnit ručně na záložce povolání nebo přepisem hodnot.'],
      },
      {
        h: 'Chci začít znovu',
        p: ['**+ Nová postava** (průvodce) nebo **Záloha a import → Prázdný deník**. Současná postava se před nahrazením sama uloží mezi zálohy v prohlížeči.'],
      },
    ],
  },
];

/** Prostý text sekce pro vyhledávání (bez formátovacích značek). */
export function sectionText(s: HelpSection): string {
  const parts = [s.title, s.lead, ...s.blocks.flatMap((b) => [b.h ?? '', ...(b.p ?? []), ...(b.list ?? []), b.tip ?? ''])];
  return parts.join(' ').replace(/\*\*/g, '').replace(/\[#\/[^|\]]+\|([^\]]+)\]/g, '$1');
}

/** Normalizace pro hledání bez ohledu na diakritiku a velikost písmen. */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Inline formát: **tučně**, `kód`, [#/odkaz|text]. */
export type InlinePart = { t: 'text' | 'b' | 'code'; v: string } | { t: 'link'; href: string; v: string };

export function parseInline(s: string): InlinePart[] {
  const out: InlinePart[] = [];
  const re = /\*\*(.+?)\*\*|`(.+?)`|\[(#\/[^|\]]+)\|([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) });
    if (m[1] != null) out.push({ t: 'b', v: m[1] });
    else if (m[2] != null) out.push({ t: 'code', v: m[2] });
    else out.push({ t: 'link', href: m[3], v: m[4] });
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
  return out;
}
