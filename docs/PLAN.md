# Plán vývoje – Osobní deník (Dračí hlídka)

> Zadání: webová aplikace (1. fáze), následně Android port. Deník s
> automatickými výpočty odvozených hodnot a **průvodcem tvorbou postavy**
> (přidáno 18. 9. 2026, `claude/CHARACTER_CREATION.md`). Ukládání dat
> pouze lokálně v prohlížeči (bez účtu, bez serveru), s export/import jako
> zálohou. Technologie: React. Appka drží jednu aktivní postavu, jen pro
> vlastní/skupinové použití (nezveřejňuje se).
>
> **Vizuální layout je zadaný uživatelem jako závazný mockup** (viz
> `claude/VISUAL_STYLE.md`) – appka ho věrně replikuje, doladěný podle
> grafického manuálu hry.
>
> **Klíčový milník:** Alchymistův deník včetně craftingu (viz
> `claude/CRAFTING_ALCHYMISTA.md`) je go/no-go bod projektu – dělá se hned
> po zvládnutí univerzální části deníku (Fáze 0–6), ještě před
> dokončením zbylých povolání ve Fázi 7. Součástí milníku je
> **univerzální progression engine** (`claude/PROGRESSION_ENGINE.md`).

Každá fáze má checklist. Zaškrtávej `[x]` při dokončení úkolu, ať je stav
projektu čitelný i při navázání v jiné session. (Tenhle soubor je zrcadlo
`PLAN.md` z kódového repozitáře appky – při postupu aktualizuj oba.)

## Fáze 0 – Podklady a datový model

- [x] **Struktura a pořadí polí papírového deníku vytěžena** (22. 9. 2026,
      uživatel dodal `DH_Osobni_denik_vyplnitelny.pdf` = vyplnitelná verze
      **Alchymistova pokročilého deníku**, 2 strany / 544 AcroForm polí).
      Textová vrstva pořád chybí, ale názvy a pozice polí dávají přesnou
      strukturu → `claude/data/denik_alchymista_pole.json` (+ `docs/` v repu).
      Pokrývá i univerzální část (hlavička, životy, mana/suroviny, zbraně,
      atributy, zbroj a štít, dovednosti, peníze, poznámky) a alchymistovy
      recepty (15 + 34 řádků, sloupce NÁZEV / MANA / SUROVINY / ZÁKLAD /
      OBTÍŽNOST / POZNÁMKA), magické předměty, zvláštní schopnosti, vybavení.
- [x] Vypsat vzorce pro odvozené hodnoty → `claude/RULES_FORMULAS.md`.
- [x] Vypsat profesní specifika všech 6 povolání → `claude/CLASSES.md`.
- [x] Sestavit datový model postavy → `claude/DATA_MODEL.md`.
- [x] Aktualizovat `PROGRESSION_ENGINE.md` a `CRAFTING_ALCHYMISTA.md`.
- [x] Opravit `RULES_SOURCES.md`.
- [x] Technologický stack: **React** (Capacitor pro Android).
- [x] **Tabulky zbraní, zbrojí, rób, štítů a doplňků (H15)** – dodal
      uživatel jako xlsx (16. 9. 2026) → `claude/data/vyzbroj.json`.
- [x] **Souhrn tabulek ze všech PDF** (xlsx od uživatele 18. 9. 2026) →
      přehled a rozpory v `claude/TABULKY_XLSX.md`; nově
      `data/zkusenosti.json` (H18), `data/opravy_atributu.json` (H05, shoda se
      vzorcem), `data/pratele.json` (H09 zvířecí přátelé + růst, H13 poslové),
      `data/alchymie_tabulky.json` (nádoby, ceny, tabulka alchymistického umění).
- [x] **PPP03 Alchymista – celé PDF** dodáno 27. 9. 2026 (80 stran, textová vrstva čitelná i s tabulkami).
- [ ] **Zbývající nečitelné kusy:** ~~startovní mana a suroviny, první dva řádky tabulky alchymistického
      umění, Sibériovy elixíry (H10)~~ ✔ **xlsx od uživatele 25. 9. 2026** (+ všech 52 receptů s úplným textem →
      `claude/data/alchymie_recepty.json`); ~~úroveň a velikost psa/vlka lesního/sokola a ÚČ sokola
      (H09 s. 14)~~ ✔ přepis tabulky od uživatele 1. 10. 2026; atributy poslů H13 – ✔ U 3. 10. 2026 ruční úprava na kartě posla.
- [x] ~~Dodat kapitolu „Užitečné informace“ (nosnost, naložení, únava)~~ →
      **✔ U 22. 9. 2026: nosnost a max. únava zůstávají natrvalo ruční pole**
      (s varováním při překročení). Kapitola se nedohledává, tabulky se
      nedopočítávají – není to už blokující položka.
- [x] ~~Dodat `Draci_hlidka_PPP_03_Alchymista`~~ – **dodáno 22. 9. 2026** ✔,
      textová vrstva čitelná → `claude/data/ppp03_alchymista.json`. Není to sada
      štítků, ale 80stránkové rozšíření: tabulka alchymistických dílen, 13 obecných
      volitelných schopností od 6. úrovně a 8+8+8 schopností u Medika, Pyromanta
      a Theurga, ~70 nových předmětů (konstrukty, sešívanci, démoni, palné zbraně,
      talismany). **Rozsah milníku proto rozdělen na 7a a 7a+ ✔ U 22. 9. 2026** –
      viz `CRAFTING_ALCHYMISTA.md`.
- [x] ~~Rozhodnout rozpory (viz `CLASSES.md`, `TABULKY_XLSX.md`)~~ – **všechny uzavřené:**
      **✔ U 19. 9. 2026:** text pravidel má přednost před souhrnnou tabulkou
      (Zocelení +4 ODO, Expertiza podle detailního popisu).
      **✔ U 22. 9. 2026:** podmínky specializací se berou **podle `H`** (dvě pevné
      podmínky, PPP třetí podmínka se nepoužívá; Klerikovo „2 ze 3“ z H13 zůstává);
      dovednostní body Zloděje **jen na sudých úrovních** (H14), jednotně pro všechny
      zdroje bodů. Obojí už takhle je v `CLASSES.md`, `PROGRESSION_ENGINE.md`
      i v `src/data/progression.json` – tady se jen dopsalo potvrzení.

## Fáze 1 – Klikací prototyp / drátěný model ✅ UZAVŘENO 16. 9. 2026

- [x] Vizuální layout podle mockupu → `claude/VISUAL_STYLE.md`.
- [x] Nápovědný box u Dovedností = sbalený.
- [x] Grafický manuál vytěžen (tonální škála → CSS proměnné, fonty Alegreya).
- [x] Klikací prototyp (HTML artifact „Osobní deník Dračí hlídky“).
- [x] Odsouhlaseno – rozhodnutí v `VISUAL_STYLE.md` → „Rozhodnutí Fáze 1“.

Úpravy po uzavření (na přání uživatele, promítnuté do prototypu):
- v3 – **průvodce přestupem podle H18** (`PROGRESSION_ENGINE.md`).
- v4 – **výběr zbraní, zbrojí a štítů ze seznamu**.
- v5 – **limit zlepšení dovednosti +1 stupeň za přestup** (výjimka
  Expertiza) a **nová dovednost ze seznamu nebo vlastní** (`RULES_FORMULAS.md` §7).
- v6 – **import tabulek výzbroje z H15** (xlsx od uživatele), nákup s
  rozměňováním mincí, doplňky ke zbraním do výbavy.
- v7 – potvrzené výklady: požadovaná SIL = minimální oprava SIL (zobrazeno
  „min. +X“), kurz 1 zl = 10 st = 100 md, platí tabulka H15.
- v8 – **průvodce tvorbou postavy** podle `CHARACTER_CREATION.md` + obchod,
  energie z tabulek (`energie.json`), obecné předměty (`gear.json`).
- v8.1 – oprava přestupu: kouzla oborů (Kouzelník) a triky škol (Válečník)
  jsou v poolu hned po zvolení větve (`access`), Válečník max 1 trik/škola,
  od 6. úr. 2 triky; seznamy z H11/H08.
- v8.2 – **Tabulka životů** zapracována: max. životy = tabulka(úroveň, ODO) + bonusy
  schopností; v přestupu se už nic nezadává ručně. `hpGains` v modelu odpadá
  (upravit `DATA_MODEL.md`, `PROGRESSION_ENGINE.md` při další revizi).
- v8.3 – **hlídání akcí v boji** (Boj a stavy → Tah a kolo, podle H16).
- v8.4 – aktivní obrana = OČ + k6 s explodující šestkou a kritem jako u útoku.
- v8.5 – **kouzla, prosby a triky v boji** s délkou akce, cenou a obtížností.
- v9 (18. 9. 2026) – uživatel: boj „vypadá dobře a funkčně, chybí doladit
  detaily“ → doladěno podle H16: postihy ze stavů a únavy, přesila, Boj ve
  smečce v hodech; obrana proti střelbě; krvácení ×N a zapálení se hodí a
  odečtou na začátku tahu; otřesení skončí po tahu; vztyk po povalení jen
  dlouhá akce; volitelná iniciativa každé kolo.
  **Nový modul Přátelé a zvířata** → `claude/COMPANIONS.md` (zvířecí přítel,
  smečka Pána zvířat, kůň, kouzelníkův přítel, Lupičův parťák; karta, boj,
  přestup, ochočení/vyvolání, ztráta). Záložka PŘÁTELÉ v navigaci.
- v9.1 (18. 9. 2026) – ze souhrnu tabulek: pes, vlk lesní a sokol z H09
  (ochočitelnost, atributy, ÚČ/ZO/OČ, dovednosti) a **růst zvířecího přítele
  podle H09** v průvodci přestupem (+3 životy, 2 dovednosti +1, každá 3.
  úroveň ÚČ/zranění/ZO/OČ +1; Pán zvířat jen jedno zvíře za úroveň);
  **tabulka zkušeností** u pole Zkušenosti (kolik chybí, „můžeš přestoupit“).

## Fáze 1b – Průvodce tvorbou postavy (návrh → prototyp)

- [x] Změna zadání: průvodce tvorbou postavy přidán ✔ U (18. 9. 2026).
- [x] Návrh v1 → `claude/CHARACTER_CREATION.md`.
- [x] Tabulky od uživatele → `claude/data/tvorba_postavy.json`.
- [x] Dodatečné vybavení podle povolání a energie → `claude/data/energie.json`.
- [x] Tabulka životů ✔, tabulka oprav ✔ (ověřeno 18. 9. 2026), základní
      vybavení ✔, doporučená společná výbava ✔.
- [x] **Doporučené dovednosti pro začínající hráče** (H05 s. 7) v kroku Dovednosti – hotovo 16. 10. 2026 (v0.15.1):
      rámeček s doporučením a tlačítko „Použít doporučené“ (za body, dokud stačí); klerikova „Znalost poměrů“
      **byla nahrazena Etiketou ✔ U 16. 10. 2026** (v0.15.3). Navíc rámeček **Záchranné hody** – které z dovedností
      Atletika, Vůle, Postřeh, Výdrž, Hbitost postavě chybí, s naučením za 1 bod; štítek ZÁCHRANNÝ HOD i v průvodci.
      **✔ U 16. 10. 2026: První pomoc = OBR / INT podle tabulek H05 a H14** (nadpis v textu H14 uvádí jen OBR; v0.15.5).
- [x] Vyřešit otevřené otázky v `CHARACTER_CREATION.md` ✔ U (18. 9. 2026).
- [x] Odsouhlasit návrh (18. 9. 2026).
- [x] Prototyp průvodce – **v8 klikacího prototypu** (18. 9. 2026).
- [ ] Zpětná vazba uživatele k v8 (boj: ✔ „vypadá dobře“, 18. 9. 2026) a k v9.

## Fáze 2 – Základní kostra appky ✅ HOTOVO 18. 9. 2026, ověřeno u uživatele 19. 9. 2026

- [x] Založit React projekt (Vite 6 + React 19 + TS strict + Vitest), vlastní
      hash routing mezi 7 sekcemi (Postava, Dovednosti, Poznámky, Listy,
      5. záložka podle povolání, Přátelé, Boj a stavy); boční panel na
      desktopu, spodní lišta s krátkými popisky na mobilu (< 820 px).
- [x] Vizuální theme přes CSS proměnné (`theme/tokens.css`, `sheet.css`,
      `texture.ts` – převzato z prototypu v9.1) a komponenty `Sheet`, `Ribbon`,
      `Labeled`/`TextField`/`NumberField`/`CalcField`, `Icon`.
- [x] Datový model v TS (`model/types.ts`), `derive()` s formulí u každé
      hodnoty a `overrides`, reducer + React kontext (jeden zdroj pravdy).
      Záložka Postava je napojená na store (jméno, povolání, rasa, atributy,
      životy, mana, únava, peníze, poznámky, zkušenosti, úroveň; zbraně,
      zbroj, výbava a dovednosti zatím jen zobrazené).
- [x] Ukládání do localStorage s auto-ukládáním (400 ms + při skrytí
      stránky), `schemaVersion` a migrace; poškozená data se zazálohují.
- [x] 41 testů (výpočty na postavě Kloi, pravidla ras/povolání, přetížení,
      přepis, úložiště, migrace, reducer).
- Pozn.: rozdíly kódu proti `DATA_MODEL.md` (`skillLog`, `companions[]`,
  `skills[].attribute`) jsou popsané v `claude/ARCHITEKTURA.md`.
- 19. 9. 2026: opravený xlsx tabulek (`TABULKY_XLSX.md` → Revize) – nádoby alchymisty
  doplněny; **duševní síla hraničáře podle H09** ✔ U (jen úrovně 1–6, nad 6. úrovní ruční
  zadání); Dalekohled zůstává 5 zl ✔ U. 43 testů.
- 19. 9. 2026 u uživatele (Windows, Node 24): `npm install` OK, `npm test` 43/43 ✔,
  `npm run dev` (Vite 6.4) běží. Appka je navíc publikovaná jako artifact „Deník Dračí hlídky“.
- Pozn.: sandbox neměl přístup k npm – build ověřen přes Bun a Chromium;
  `npm install && npm test && npm run build` je potřeba pustit u uživatele.

## Fáze 3 – Základní údaje, atributy a tvorba postavy ✅ HOTOVO 19. 9. 2026

- [x] Formuláře: jméno, rasa, povolání, **bůh** (pole u Klerika, u jiných jen když je vyplněný),
      velikost, pohyblivost. Změna rasy/povolání u rozehrané postavy se potvrzuje.
- [x] Zadání 5 atributů + zobrazení oprav; upozornění na nerozdělené charakterové body.
- [x] Pohyblivost (+ krátké pohyby H16: okamžitý 1/10, postup 1/4, sprint, plížení 1/10;
      Magie pocestných +10), naložení (součet) a únava – **nosnost a max. únava zatím ručně**
      (chybí „Užitečné informace“); nad limitem se hodnota zvýrazní.
- [x] **Popover vzorce + ruční přepis** (`overrides`) u všech vypočtených polí
      (`ui/FormulaPopover.tsx`, portál do `<body>` kvůli clip-path listů; na mobilu spodní panel;
      Esc / klik mimo zavře; „Vrátit na vzorec“). Velikost se přepisuje výběrem A/B/C.
- [x] Zkušenosti a hranice úrovní: ukazatel postupu, „málo zk. pro úroveň“, rozbalovací
      Tabulka zkušeností (H18) s vyznačenou úrovní.
- [x] **Průvodce tvorbou postavy** – kroky 1–5 + koncept v úložišti (19. 9. 2026, na přání
      uživatele předsunuto: celý průvodce 1–9 v `src/creation` + `pages/Tvorba.tsx`, obchod
      `pages/Shop.tsx`, 9 testů vč. příkladu Lómiel z H05).
- [x] **Info okénko ⓘ u Zkušeností** (19. 9. 2026, na přání uživatele): kolik zk. je potřeba na
      další úroveň a kolik chybí, % splnění a prahy tří dalších úrovní (`Popover` v `ui/FormulaPopover.tsx`).
- [x] Navíc: záložka Poznámky – volné poznámky + **tabulka zážitků** (zážitek / dopad).
- 67 testů (10 nových: přepisy, pohyby, nosnost, únava, zkušenosti). Verze 0.3.0.

## Fáze 4 – Dovednosti ✅ HOTOVO 22. 9. 2026 (v0.4.0)

- [x] Seznam dovedností postavy + rozbalovací **přehled všech dovedností z pravidel**
      (15 základních H14, 6 rozšířených PPP, profesní s informací, odkud se berou).
- [x] Stupeň zvládnutí (celé číslo ≥ 1), **volba atributu** u dvouatributových (od v0.15.4 hod pro každý atribut podle situace),
      oprava, bonusy schopností (`skill:<id>`), celkový bonus; štítek zdroje
      (povolání / profesní / schopnost / koupená / vlastní).
- [x] **Hod ⚄ k10 + bonus** u každé dovednosti s kritickým/fatálním výsledkem (H06,
      přepínač, výchozí zapnuto) – `rollCheck()` v `rules/dice.ts` pro plovoucí panel Kostky (Fáze 6).
- [x] Dovednostní body: získáno / utraceno / zbývá, rozpis **po úrovních** (získáno i utraceno),
      historie ze `skillLog`; ruční přepis bodů zůstává (✎).
- [x] **Limit +1 stupeň na dovednost za úroveň** přes `skillLog` – zlepšení mimo průvodce
      se počítá k aktuální úrovni; Expertiza (sudá úroveň, jedna až +2, strop úroveň + 2);
      **vrácení** zlepšení z aktuální úrovně (↶, body zpět).
- [x] **Nová dovednost** za 1 bod: výběr ze seznamu (jen obecné), nebo vlastní název +
      atribut (štítek VLASTNÍ = schvaluje PJ); **odebrání** koupené/vlastní vrátí body.
- [x] **Ruční úprava stupňů** (přepínač) pro přepis rozehrané postavy z papíru – bez bodů a záznamu.
- [x] Průvodce tvorbou – krok 6 Dovednosti (19. 9. 2026).
- Logika v `src/rules/skills.ts`, stránka `src/pages/Dovednosti.tsx`, 9 nových testů (102 celkem).
  Na mobilu se řádky skládají do karet.

## Fáze 5 – Vybavení, zbraně a zbroj ✅ HOTOVO 23. 9. 2026 (v0.5.0)

- [x] Evidence vybavení a peněz (`H15`) – stránka **VÝBAVA A PENÍZE** (`#/vybava`, odkazy ze sekcí
      Zbraně, Zbroj a štít, Peníze a Výbava na záložce Postava): měšec s **příjmem / výdajem**,
      poznámkou a **historií peněz** (max. 100 záznamů), „rozměnit na nejméně mincí“; výbava s počty
      (−/+), hmotností za kus, přepínačem **Nese** (nenesené se nepočítá do naložení) a přejmenováním.
- [x] Zbraně/zbroje/štíty s kontrolou požadované SIL (přetížení −5) – nově i **štít** (−5 k OČ);
      štítky SIL NESTAČÍ, plížení, magie róby; zbraň v ruce, vrhací zbraně po kusech.
- [x] **Výběr ze seznamu z pravidel** + **vlastní položky** → `equipment.customCatalog`
      (zbraň / zbroj / štít / vybavení, úprava a mazání v katalogu, „Uložit a přidat postavě“).
- [x] Katalog výzbroje z H15 → `claude/data/vyzbroj.json` + 9 zlodějských zbraní z PPP05.
- [x] **Nákup** v zl/st/md s rozměňováním mincí – platí se nejdřív drobnými, nazpět co nejméně mincí
      (`payMoney`). Katalog má u položky **Přidat** (bez placení – nález, přepis z papíru) a **Koupit**,
      náhled ÚČ/OČ či ZO po pořízení a upozornění (SIL, hlučná zbroj u zloděje, kouzelník, výměna kusu).
      **Prodej** při odebrání: standardně **polovina kupní ceny** (předvyplněno, ✔ U 24. 9. 2026), jinou cenu určí PJ ručně.
- [x] Katalog základního vybavení (H15) → `claude/data/gear.json` (35 předmětů).
- [x] Přepočet naložení při změně vybavení – rozpis v sekci Naložení (výbava / zbraně / zbroj / štít /
      alchymie); štít a sundaná zbroj váží, i když nejsou nasazené. Nosnost dál ručně.
- [x] Nová zbroj či štít se rovnou nasadí, dosavadní kus jde do výbavy, odkud jde **znovu nasadit**
      (u vlastních kusů se parametry drží v `GearItem.piece`).
- [x] **Vrátit poslední změnu** výzbroje/peněz (`equipment.undo`, snapshot bez historie).
- [x] Bonus róby k ověření magie – kouzelník od 7c.2, **klerik (prosby) a hraničář (kouzla v boji i mimo) od v0.15.1**
      (16. 10. 2026, H15: „Sesílání kouzel i proseb je v nich mnohem snazší“; `robeBonus()` v `rules/equipment.ts`).
      **✔ U 16. 10. 2026: róba platí pro kouzelníka, klerika i hraničáře.**
- [x] Průvodce tvorbou – krok 8 Vybavení (doporučené / na míru s obchodem, 19. 9. 2026).
- Logika v `src/rules/equipment.ts` a `src/rules/catalog.ts` (sdílí i obchod průvodce), stránky
  `pages/Vybava.tsx` a `pages/Katalog.tsx`; 11 nových testů (113 celkem). Model bez nové verze schématu –
  nová pole (`customCatalog`, `ledger`, `undo`) doplní `migrate()` z výchozí postavy.
- **Zobrazení na mobilu odsouhlaseno ✔ U 24. 9. 2026** (publikovaná verze v0.5.0 v artifactu „Deník Dračí hlídky“).
- ✔ U 24. 9. 2026: přetížení štítem = **−5 k OČ**; prodej = **½ kupní ceny**, nebo cena určená PJ ručně.

## Fáze 6 – Boj, životy, léčení a kostky ✅ HOTOVO 24. 9. 2026 (v0.6.0)

- **Ověřeno u uživatele 25. 9. 2026:** `npm install`, `npm test` 130/130, `npm run build` OK; ruční proklikání Fáze 5 a 6
  (výbava, boj, kostky, mobil) „vypadá dobře“ ✔ U. Upozornění npm (2 moderate v dev nástrojích, esbuild install-scripts,
  chunk > 500 kB) řešit ve Fázi 9.

- [x] Životy, hranice smrti, mez vyřazení, kritická zranění (`H16`, `H17`) – záložka **BOJ A STAVY**:
      stupnice životů (0 · bezvědomí, hranice smrti, max), stav postavy (bojeschopná / těžce zraněná /
      v bezvědomí / mrtvá), −5 −1 +1 +5 a libovolné Zranění/Léčení; **Odpočinek** +1 a únava −1, **Spánek**
      +2 a únava −3 s editovatelnými hodnotami (spánek ve zbroji podle uvážení PJ ✔ U), **Zotavení** +⌈max/5⌉ jen svěží, **První pomoc**
      +stupeň dovednosti; léčení nikdy nad maximum; **Houževnatost barbara +2** při každém léčení se přičte
      sama. Krvácení a zmrzačení označené jako kritická zranění (potřebují První pomoc, H17).
- [x] ÚČ, OČ, ZO, iniciativa odvozené z atributů/vybavení/schopností – sekce Bojové hodnoty s hody ⚄
      útoku a obrany u každé zbraně, obrana proti střelbě (jen štít), iniciativa.
- [x] Rychlé úpravy během hry – **Záznam** (posledních 50) a **Vrátit poslední** (až 20 kroků, přežije
      obnovení stránky, `character.play`).
- [x] **Hlídání akcí v boji** podle prototypu v8.3–v9: kolo, iniciativa (i každé kolo), 2 krátké / 1 dlouhá
      + okamžité, aktivní obrana 1× za kolo i mimo tah, přesila (obrana −1 až −3), překvapení, stavy blokují
      akce s důvodem, ⚠ u poslední krátké akce, efekty na začátku tahu (krvácení ×N + zapálení, v bezvědomí
      nejvýš 2), stavy na 3 kola se odpočítají, otřesení končí po tahu, vztyk ruší povalení, válečník
      +1 adrenalin za tah. **Kouzla, prosby a triky v boji** (cena, délka vyvolání, víckolové sesílání,
      ověření k10 + Sesílání kouzel / Pouto s přírodou / Prosby) – data převedena do `src/data/combat-magic.json`
      (výřez z prototypu, úplnost ověří Fáze 7).
- [x] **Přátelé v boji** (v9) – hotovo v 7c+ (v0.11.0): panel PŘÁTELÉ V BOJI na záložce Boj a stavy, Boj ve smečce v postizích.
- [x] **Kostky** – plovoucí tlačítko a panel: k6, k6 ⟳6 (kritický útok / obrana při 2+ šestkách), k10 ověření
      s druhou k10 (H06, přepínač), k10 prostá, 1dF, 4dF, oprava, historie 8 hodů (neukládá se).
- Postihy do hodů: únava, omámení, oslabení, oslepení, zmrzačená ruka, přesila.
- Logika `src/rules/combat.ts`, `rules/dice.ts` (rollDice), `ui/Dice.tsx`, stránka `pages/Boj.tsx`,
  styly `theme/boj.css`; 16 nových testů (129 celkem). Opraveno přetékání sloupců na mobilu pro všechny stránky.
- ✔ U 24. 9. 2026: spánek = základní efekt (+2 životy, únava −3), hodnoty jde před potvrzením upravit podle PJ (ve zbroji se pravidlo ohýbá).

## Fáze 7 – Zvláštní schopnosti a povolání-specifika

- [x] **Rodová schopnost – hotovo 3. 10. 2026:** plné znění z H04 v info bublině (i) u schopnosti na záložce Postava (`rules/rasy.ts`).
      Automaticky dál Hroší kůže (ZO +2), Houževnatost (+2 při léčení) a Všestrannost (body). **✔ U 3. 10. 2026:** Orlí zrak, Zručnost
      a Tichošlápek se NEzapočítávají – jen bublina (i) u dotčených dovedností (Postřeh, Stopování / Lučba, Mechanika, Vybírání kapes,
      Umění železného klíče, Umění, Řemesla / Hbitost, Umění skrývání), rozhodne PJ. Vidění ve tmě jen text.
      **✔ U:** Atletika, Vůle, Postřeh, Výdrž a Hbitost označené na záložce Dovednosti štítkem ZÁCHRANNÝ HOD. 3 nové testy (317 celkem).
- [x] **7a. MILNÍK (go/no-go): Alchymista + crafting + progression engine** – **✅ GO ✔ U 25. 9. 2026** („alchymie vypadá dobře“) – **data H10 kompletní ✔ 25. 9. 2026**;
      **7a.1 hotovo 25. 9. 2026 (v0.7.0)**: záložka ALCHYMIE – zdroje (destilace, transformace, sběr, vnímání many, nákup),
      dílna, základy, 52 receptů s filtrem Lze vyrobit / Něco chybí, výroba, výrobky, záznam s vrácením (13 nových testů,
      143 celkem). **7a.2 hotovo 25. 9. 2026 (v0.7.1)**: 12 obecných schopností PPP03 od 6. úrovně a 30 jejich předmětů
      (hůlky podle dřeva, Hromadná výroba, Koncentrované substance, Bojová konzumace, Recyklátor, Sabotér, Laboratorní
      specialista 5× body, Forenzika +2 Postřeh, Cestovní alchymie +2 mimo dílnu; 15 nových testů, 158 celkem).
      Ověřeno u uživatele 25. 9. 2026: `npm test` 158/158, `npm run dev` OK, proklikání ✔ → **GO**. Detail v `CRAFTING_ALCHYMISTA.md`.
      (nádoby a tabulka alchymistického umění → `data/alchymie_tabulky.json`).
      **Rozsah ✔ U 22. 9. 2026:** celý H10 (52 receptů, obory, 3 specializace)
      **+ z PPP03 tabulka dílen a 13 obecných volitelných schopností** s jejich
      předměty. **Dílna = 4 velikosti podle PPP03 ✔ U** (bonus +2 až +5 bez omezení
      úrovní, strop many 1 200–10 000 a surovin 6 000–50 000) – nahrazuje boolean
      přepínač i výklad „+1 do 6. úrovně“ z H10; tím je zodpovězená i otázka stropu
      many a surovin.
- [ ] **7a+. PPP03 specializační rozšíření** (až po 7a) – rozděleno ✔ U 25. 9. 2026 na tři kroky:
  - [x] **7a+.1 Medicus – hotovo 27. 9. 2026 (v0.7.2):** 26 receptů (tinktury Chirurgie, augmentace, infuze, tetování,
        kontrolní krystal), injekce/aerosol, list MEDICUS (hody operací, resuscitace, plastika, anatomie), SEŠÍVANCI
        (stavitel podle tabulek končetin, hlav a kůže, karta tvora se životy, útoky a ZO), Laboratoř → bonus k Chirurgii.
        14 nových testů (174 celkem), augmentace na postavě se zaškrtávacím polem. Detail v `CRAFTING_ALCHYMISTA.md`.
  - [x] **7a+.2 Pyromant – hotovo 27. 9. 2026 (v0.7.3):** 32 receptů, stavitel konstruktů (tělo, srdce, mozek, nádrže,
        vylepšení, šrot, palivo, chrlení), odpálení rachejtlí a střel, palné zbraně do výzbroje, sapérský hod,
        transmutace kovu, Mistr nestabilních substancí CHAR −5. 10 nových testů (184 celkem).
  - [x] **7a+.3 Theurg – hotovo 27. 9. 2026 (v0.7.4):** hůl s Astronem, stavitel předmětů s démony, bhůtové,
        elementálové, esence, 27 receptů (talismany, portály, oživlé pomůcky, vichry many). 9 nových testů (193 celkem).
        **Celé PPP03 je v appce.**
- [x] **7b. Válečník** – hotovo 28. 9. 2026, rozděleno na dva kroky:
  - [x] **7b.1 hotovo 27. 9. 2026 (v0.8.0):** data H08 + PPP01 (`tools/h08_valecnik_src.py`, `tools/ppp01_valecnik_src.py` →
        `tools/build-valecnik.py` → `src/data/valecnik.json` + blok válečníka v `progression.json`): 116 triků s plným zněním
        (23 H08 + 93 PPP01), 6 škol + Škola boje na koni, 5 Cest se stupni I–IV a Mistrem, 12 schopností od 6. úrovně,
        3 × 8 schopností specializací, Životní zkušenosti. **Přestup:** nabídka triků podle škol / 6. úrovně / specializace /
        Mistra Cesty / Zručnosti se zbraní (max. 1 ze školy za úroveň, od 6. úr. 2 triky), Cesty jen na 6., 9., 12. … úrovni,
        Mistrovství ve zbrani s volbou skupiny zbraní, bez specializace 1 schopnost specializace na každé 6. úrovni.
        **Deník:** záložka VÁLEČNÍK (adrenalin, Léčba vlastních zranění, Rozvážnost a Proměnlivý úchop, zbraně s bonusy,
        školy, Cesty, schopnosti, triky s filtrem a ruční úpravou); bonusy ke zbraním v derive (školy, Mistrovství, Cesty,
        Bijec, Klidná ruka, Záměna, Drtivý dopad, Zakrytí, Mistr zbroje, Železný muž, Mrštnost, Zjizvená kůže…).
        **Boj:** triky podle druhu (útok / obrana / dodatečný / reakce / výkřik 1× za kolo / soustředění), proměnná cena,
        Rutina, Urputnost (bez bezvědomí), Tuhý kořínek +4. 15 nových testů (208 celkem).
        Výklady: rozpory tabulka × text (Proměnlivý úchop, Mistr zbroje, Rychlý hrot) podle textu; Průrazné ostří v PDF
        je (+3 k Útoku proti nekovové/žádné zbroji); Mistrovství – střelné a vrhací zbraně jen jako vlastní skupina.
  - [x] **7b.2 Boj válečníka – hotovo 28. 9. 2026 (v0.8.1):** počítadlo útoků a obran v kole (`roundInfo` v `rules/combat.ts`):
        Vícenásobný útok (pod 6. úr. cooldown – útok i obrana navíc, pak kolo nic; od 6. úr. 2 každé kolo; jen tváří v tvář), Bijec, Rychlý hrot, Rychlá čepel
        a Přehmátnutí (cooldown), Vražedná zuřivost +1; první útok = krátká akce Útok, další v rámci téže akce (tlačítko
        „⚄ Další útok“), první obrana = krátká akce, další bez akce; Zakrytí se štítem proti 1 protivníkovi bez omezení obran;
        Boj štítem = útok štítem (cooldown) (ÚČ = SIL + kvalita štítu, zranění 0). **Boj dvěma zbraněmi** (volba Druhé
        zbraně na záložce Válečník, `dualWieldWhy`): Škola = jednoruční + lehká krátká, Mistr boje dvěma zbraněmi = i těžká + lehká
        nebo střední a lehké; útočnost, obrana i zranění se sečtou, bonusy Cest jen za zbraň v ruce. **Nával adrenalinu** (+1 na
        začátku kola a boje místo konce tahu). **Vražedná zuřivost** (přerod 1 kolo, pak +2 adrenalin/kolo, +1 útok, Hranice smrti
        −max; po každém kole past Vůle vs. 2, +1/kolo – vymaní jen výsledek nad pastí, jinak šílenství; po skončení odklad smrti
        za 1 adrenalin/kolo). **Cesta krve** (nabuzení 1k6 = dlouhá akce, před bojem zdarma; zranění bez obrany +1k6 za načatých 10).
        **Sebeobětování** (chybějící adrenalin za 2× životy, pauza tolik kol, kolik získal). **Cesta strategie** (útočná/obranná
        +stupeň pro válečníka i družinu, dlouhá akce → od dalšího kola, před bojem hned; 3 kola, Mistr 5; na místo celý boj;
        Přeskupení obnoví). **Velení** (rozkaz družině +1/+2, Mistr strategie +2) a **Bojové rozkazy** (1 za kolo, ne s Výkřikem).
        Boj s přesilou ruší postih za přesilu. Panel VÁLEČNÍK V BOJI (`pages/ValecnikBoj.tsx`). 13 nových testů (221 celkem).
        **✔ U 28. 9. 2026: „každé druhé kolo“ = cooldown od kola použití** (Rychlá čepel, Přehmátnutí, Boj štítem a Vícenásobný útok pod 6. úr. –
        po použití jedno kolo nic, pak znovu; `war.cd`, v0.8.3). Výklady k potvrzení (U): extra útoky/obrany nestojí další akci; zuřivost končí, jen když
        hod past **překoná** (rovnost nestačí); Sebeobětování platí i za částečně chybějící adrenalin.
- [x] **7c. Hraničář a Kouzelník** – kouzla, směry/obory, specializace, pasti hraničáře (detail `docs/MAGIE_7C.md`):
  - [x] **7c.0 Data – hotovo 1. 10. 2026:** `tools/h09_hranicar_src.py` → `docs/h09_hranicar.json` (13 kouzel H09, 3 směry,
        9 schopností, specializace, pravidla), `tools/h11_kouzelnik_src.py` → `docs/h11_kouzelnik.json` (49 kouzel H11 se
        zaklínadly, 6 oborů, 6 schopností, pravidla), `tools/spell_norm.py` (cena / obtížnost / vyvolání strojově),
        `tools/build-magie.py` → `src/data/magie.json` (sloučí H09+PPP02 a H11+PPP04; potřebuje `docs/ppp02_hranicar.json`
        a `docs/ppp04_kouzelnik.json` z projektu).
        **✔ U 1. 10. 2026:** obor kouzelníka kouzlo navíc nedává; PPP02 „Další hraničářská kouzla“ automaticky od 6. úr.
        jen se známým směrem; specializace dá své pevné věci automaticky, kouzla zvolené schopnosti (luk, kůň, Chodecká
        magie…) dostane hraničář všechna; kouzla pro pokročilé PPP04 do běžných slotů až od 6. úr. a jen se znalostí oboru
        (± specializace). **Chybí:** Tabulka pastí H09 (obrázek) – dodá uživatel.
  - [x] **7c.1 Hraničář – hotovo 1. 10. 2026 (v0.9.0):** `tools/build-hranicar.py` → `src/data/hranicar.json` + blok hraničáře
        v `progression.json` (45 schopností: 9 H09, 12 PPP02 od 6. úr., 3 × 8 specializací; Lovcova kořist opakovaně po 3 úrovních;
        specializace s automatickými schopnostmi a Znalostí místních poměrů na 5. st.). Engine přestupu: `AbilityDef.grantsItems`
        (kouzla schopnosti automaticky), `ClassProgression.levelGrants` (6. úr.: Výroba šípů, Pohyb v terénu, Přírodní překážky na 5. st.).
        `rules/hranicar.ts`: známá kouzla vždy automaticky ze směrů / schopností / specializace (`spellLock`, `knownRangerSpells`),
        převod do boje (`toSpellDef` – délka, cena, obtížnost, reakce), Rychlá střelba (2-1-2…, od 6. úr. 2/kolo, útoky i obrany),
        Bojová hůl (+2 OČ, obrana navíc), Obratné ostří a Moudrost (bere se lepší atribut), Ostražitost, Světoběžník.
        Záložka **PŘÍRODA** (`pages/Hranicar.tsx`): Duševní síla s obnovou (jen Svěží), směry, schopnosti a specializace, situační
        bonusy, pasti H09 s hodem Líčení pastí, 108 kouzel/pastí/odvarů s plným zněním, filtrem a sesíláním mimo boj (k10 + Pouto).
        11 nových testů (234 celkem). Přátelé (kůň, zvířecí přítel, smečka) zůstávají na 7c+.
  - [x] **7c.2 Kouzelník – hotovo 1. 10. 2026 (v0.10.0):** `tools/build-kouzelnik.py` → `src/data/kouzelnik.json` + blok kouzelníka
        v `progression.json` (42 schopností: 6 H11, 12 PPP04 od 6. úr., 3 × 8 specializací s plným zněním z přepisu PPP04; hůl a varianty).
        **Přestup:** 2 kouzla/úr. z obecné magie a ovládaných oborů (i právě zvoleného), PPP04 od 6. úr. a u označených se specializací,
        Paměť na kouzla, **Magistr** (obor jen ovládaný, opakovaně, +3 kouzla oboru navíc – hlídá se, +5 k sesílání), Sběratel duší →
        Pokročilá reanimace nad rámec, na 6. úr. Pokročilý kouzelník. **Záložka KOUZELNÍK:** mana (meditace 1×/den jen Svěží, Vládce many
        strop ×1,5, nasátí úroveň×/den +1k6 / Citlivost 6, triky, Nový den), Rituál krve (2 : 1, dýka 1 : 1 max. 3), **hůl** (rituál
        od 6. úr., +1 obor, mana 2×/3× úroveň, Zbraň Bojového mága / Čarodějova hůl +2 / Nekromantova dýka s Uchováním života,
        přivolání), aktivní kouzla na sobě, obory, schopnosti s plným zněním, mentální techniky (+1 únava), Zaslechnutí kouzla,
        **volby sesílání** (Rychlé ½ +3, Precizní 2× +5, bez řeči / gest −5 / Utajené −2, zbroj při gestech −kvalita, róba +bonus,
        vyrušení +5, Dar noci, Posilování, Hromadné sesílání, Rituální kouzlení, Posílená ochrana −3, platit z hole), 145 kouzel
        s filtrem (známá / může se naučit / všechna, podle oborů), sesílání mimo boj, Kouzlení z knih, Záměna kouzel.
        **Boj:** kouzla z plných dat s délkou/obtížností podle voleb a ověřením s bonusy, **Magický štít / Zbroj do ZO**, **Rychlost =
        3 krátké akce + útok a obrana navíc** (trvání od kola po seslání), Bojové sesílání, Bitevní trénink (+1 ÚČ/ZO, nasátí za kolo),
        Magická dominance, Mentální souboj, Rituál krve jako dlouhá akce; Vrátit vrací i hůl a aktivní kouzla. 20 nových testů (254 celkem).
        **✔ U 1. 10. 2026:** Bitevní trénink ZO +1 (text) místo OČ (tabulka); Utajené kouzlení ruší postih zbroje, když kouzlí
        bez gest nebo bez řeči; Magický štít se se štítem nesčítá; Rychlost se zapíše jen „na sebe“; Krev v manu = 1 : 1 až 3 za kolo;
        PPP třetí podmínka specializace (schopnost) se dál nepoužívá.
- [x] **7c+. Modul Přátelé a zvířata – hotovo 1. 10. 2026 (v0.11.0)** (`COMPANIONS.md`, prototyp v9.1):
      `tools/build-pratele.py` → `src/data/pratele.json` (18 druhů: pes, vlk lesní, sokol H09; vlk šedý, vlk alfa, rys, medvěd V14;
      Hraničářův kůň PPP02; krysa, kočka, sova H11; had, havran, netopýr PPP04; potkan, papoušek, kočka, opice PPP05; růst a pravidla).
      `rules/pratele.ts`: hodnoty přítele (`companionView` – růst H09 / PPP05, kouzelníkův přítel podle úrovně pána H11, šampion,
      hranice smrti −(10 + ODO)), kdo smí mít přítele (`acquireWhy` – schopnost, 1 najednou, smečka do součtu úrovní, nový po ztrátě až
      na další úrovni, mrtvý druh kouzelník už nikdy, had/havran/netopýr od 6. úr.; jinak „se souhlasem PJ“), **ochočení** (k10 +
      Ochočování zvířat, +5 mládě, +5 Spřízněnost > ochočitelnost, 1k6 směn), **vyvolání** (jen s plnou manou, vyzáří se maximum i při
      neúspěchu, Sesílání kouzel > obtížnost, kouzla jen z pánových), pouto s koněm, parťák, životy a mana přítele, smrt / rozloučení,
      **Zvířecí šampion** (−2 max. Duševní síly), **Boj ve smečce** (+1 ÚČ i OČ za zvíře v boji, max. +5 – v `combatMods`).
      Záložka **PŘÁTELÉ** (`pages/Pratele.tsx`): karty s hody útoku, obrany a dovedností, ruční úprava hodnot, nový přítel, smečka,
      odešlí a zesnulí, pravidla. **Přestup:** krok Přátelé (zvíře 2 dovednosti +1 a +3 životy, každá 3. úroveň ÚČ/Zranění/ZO/OČ +1;
      Pán zvířat jen jedno zvíře; parťák +2 životy, každá 3. úroveň ÚČ nebo ZO a OČ, Postřeh a trik +1; přítel kouzelníka kouzla navíc).
      **Vrátit** v záznamu boje vrací i přátele (`PlayState.undo[].comp`). 17 nových testů (271 celkem).
      **Výklady k potvrzení (U):** tabulka PPP04 (had/havran/netopýr) se počítá stejně jako H11 – uvedené hodnoty jsou základ, k němuž
      se přičítá úroveň (životy „8 + 2× úroveň“ to v tabulce říká výslovně); u PPP04 přátel tabulka nemá atributy → dovednosti jen Postřeh
      z tabulky + Sesílání kouzel pána; zvíře s každým růstem získá i +1 úroveň (kvůli součtu smečky); hraničář po **rozloučení** smí
      ochočit nové zvíře hned, po smrti až po přestupu; kůň neroste (PPP02 růst neuvádí); +5 za mládě podle `COMPANIONS.md`.
      **H09 s. 14 doplněna ✔ 1. 10. 2026** (přepis tabulky od uživatele → `docs/pravidla/hranicar/H09_Zvireci_pratele_AI.json`):
      pes, vlk lesní a sokol jsou na 1. úrovni, velikost A / A / A1, sokol spáry 1/+3 – data přátel jsou kompletní.
      Poslové klerika (H13) přesunuti do 7d.
- [x] **7d. Klerik – hotovo 1. 10. 2026 (v0.12.0)** (H13 + PPP06):
      **Data:** `tools/h13_klerik_src.py` → `docs/h13_klerik.json` (35 proseb s plným zněním a temnými alternativami, 6 nauk, 6 schopností,
      specializace, pravidla Přízně, modliteb, Zvolání a Svěcení), `tools/ppp06_klerik_src.py` → `docs/ppp06_klerik.json` (28 proseb, 5 léků,
      Dar života, 12 schopností od 6. úr., 3 × (1 automatická + 8 volitelných) schopností specializací s plným zněním, tabulka poslů a vidění many),
      `tools/build-klerik.py` → `src/data/klerik.json` (68 položek se strojovou cenou – základ, × úroveň, za jednotku; obtížností s krokem; vzýváním
      a efekty) + blok `klerik` v `progression.json` (nauky s prosbami a bonusem, 42 schopností s `grantsItems`, specializace 2 ze 3 s automatickou
      schopností, Dar života na 6. úrovni). `combat-magic.json` zrušen (všechna povolání už mají plná data).
      **Logika:** `rules/klerik.ts` (prosby vždy automaticky, cena: souvěrec −1, Jazyk prastarých −3 u poslů, Mnohoprosby +2/+5 za další; ověření:
      Posvátný symbol +2/+3, Rituál +3, bez odříkání / vyrušen / cizí symbol / místo cizího boha −5, posvátné místo +5, Oběti −10 obtížnost;
      aktivní prosby do ZO / ÚČ / OČ – Štít víry s bariérou, aury (jen 1 bez Zažehnutí aury), Andělská zbroj, Kladivo, Božská pomoc s dočasnými
      životy; poslové s kartou; Asketismus ×2 a Ikony −10 do max. Přízně; Boží bojovník, Bojovníci víry, Boj zblízka, Posvátná zbraň, Boží zbroj,
      Fanatismus, Inkvizitorský výcvik; Dar života +¼), `rules/klerik-akce.ts` (modlitba +⅓ max 3×/den, vynechaná modlitba, Nový den, Zvolání 1×/úr.,
      Svěcení – 5 flakónů svěcené vody do výbavy, zvláštní Přízeň od PJ, vzývání mimo boj, hody léčení/zranění, Bohoslužby, Flagelantství,
      Požehnání, Oběti, Ikony, Sakrální předměty, Avatar, Zázraky, výroba léků). Derive: Milosrdenství +1 První pomoc, Svatá pravda +1 Vůle,
      Výcvik lazaretních léčitelů, Paladinský výcvik ODO +1.
      **UI:** záložka **VÍRA** (`pages/Klerik.tsx`: Přízeň a modlitby, Svěcení, nauky, schopnosti s ovládáním, 68 proseb a léků s filtrem a plným
      zněním, volby vzývání) a panel **KLERIK V BOJI** (`pages/KlerikBoj.tsx`: volby vzývání, aktivní prosby, bariéra, posel s hody, léčení/zranění,
      Zvolání, Požehnání). V boji prosby s počtem jednotek (slova, údery, kola, X) – Přízeň i obtížnost se dopočítají. Vrátit vrací i stav klerika.
      22 nových testů (293 celkem).
      **✔ U 3. 10. 2026:** hodnoty poslů zůstávají na ruční úpravu na kartě (síla posla se odvíjí od Přízně vložené do vyvolání), předvyplněné
      jsou jen orientačně (OCR H13 + odhad z příkladu); Zázraky – 1k6 životů se odečítá tlačítkem „Zázrak“, ne automaticky u 4 proseb zázraků;
      Bohoslužby přidají Přízeň jen do maxima; Božská pomoc po skončení odečte dodatečné životy (10 + úroveň). Text má přednost před tabulkou PPP06
      (Bohoslužby +3, Posvátná zbraň +2, Flagelantství = Zvolání).
- [x] **7e. Zloděj – hotovo 3. 10. 2026 (v0.13.0)** (H12 + PPP05):
      **Data:** `tools/h12_zlodej_src.py` → `docs/h12_zlodej.json` (6 umění × 3 triky s plným zněním, 6 schopností, Základy, Hantýrka),
      `tools/ppp05_zlodej_src.py` → `docs/ppp05_zlodej.json` (12 obecných schopností od 6. úr., 3 × (2 automatické + 8 volitelných) schopností
      specializací s plným zněním, 31 triků, bomby, udělátka, Magický klíč, pasti, jedy, zbraně cechu, Siccova síť, Důvěrník),
      `tools/build-zlodej.py` → `src/data/zlodej.json` (49 triků s druhem použití v boji, jednorázovostí a strojovými efekty) + blok `zlodej`
      v `progression.json` (umění s dovedností na 3. st., Mistrovství s `grantsItems`, Umění přepadů / neférového boje / boje s pláštěm na 5. st.,
      6. úroveň: Speciální předměty a Zlodějský cech); 3 nové profesní dovednosti v `skills.json`, druhy zbraní cechu (`zl`) a 2 improvizované
      zbraně ve `vyzbroj.json`, bomby a udělátka v `gear.json` (černý trh). Důvěrník přidán do `build-pratele.py` (druh přítele `duv`).
      **Logika:** `rules/zlodej.ts` (triky vždy automaticky z umění a schopností, ověření k10 + Umění, Alter ego +5 k CHAR, bonusy ke zbraním –
      Boj beze zbraně +3, Vražedné ostří +2, Zákeřná kuše +2/+2, Citlivá místa +3, Obratný bojovník, Vražedné / Improvizované zbraně / Zbraně gentlemana
      +3; Technika nabíjení; Boj se dvěma zbraněmi; útoky a obrany za kolo – Vrhání dýk, Svižné ostří, Riskantní útok; Bojová kreativita; síť),
      `rules/zlodej-akce.ts` (záznam + Vrátit vč. výzbroje a peněz: Nový den, Druhá šance, Zrcadlení, jedy, výroba udělátek / zbraní cechu / pastí,
      síť – nábor, kápo, výplata, měsíc bez výplaty, akce 1k10 + kumpáni s cenou, Kapsářstvím, Podplacením a chycením půlky týmu; v boji triky,
      Oko střelce, Výhodná pozice, Riskantní útok, Bojová kreativita přes `record`). Derive: Mistrovství +1, Šestý smysl +3 Iniciativa, Mistr útěku +10.
      Kostka `k6x6` (Výhodná pozice = 6 + k6 ⟳6).
      **UI:** záložka **UMĚNÍ** (`pages/Zlodej.tsx`: dovednosti s hody, Den a cech, schopnosti s plným zněním a ovládáním, triky s filtrem,
      Jedy, Výroba, Siccova síť, Pověsti a drby, záznam) a panel **ZLODĚJ V BOJI** (`pages/ZlodejBoj.tsx`). Důvěrník na záložce Přátelé
      (+1k6 životů za úroveň s hodem v přestupu). 21 nových testů (314 celkem).
      **Výklady ✔ U 3. 10. 2026** (při testování se případně upraví): Vrhání dýk – obrany 3 za 2 kola i od 6. úrovně (zvýší se jen útoky); okované rukavice a boxer = boj beze zbraně
      (příklad Kramáře H12); krátký meč je „lehká bodná“ zbraň pro Vražedné ostří; akce sítě uspěje, když je výsledek VYŠŠÍ než obtížnost;
      neúspěšný Zločin = chycena polovina zapojených zaokrouhleno nahoru (nejdřív řadoví, pak kápo); Lupičská udělátka – cena předmětu = cena materiálu
      (zaplatit lze vypnout); bomby vyrábí Alchymista – zloděj je kupuje na černém trhu (v katalogu); Důvěrník ZO +1 zvedá i OČ.
- [x] Rozvoj postavy / přestup na úroveň – průvodce podle H18 (19. 9. 2026, na přání uživatele
      předsunuto: `src/progression/levelup.ts` + `pages/Prestup.tsx`, data větví/schopností/
      specializací `data/progression.json`, historie a vrácení posledního přestupu, 5 testů).
      **Paměť na kouzla** (Kouzelník): +1 kouzlo za každou další úroveň, při volbě zpětně +1 za každou
      předchozí úroveň (H11, H06) – `extraItemsPerLevel` v datech schopnosti (19. 9. 2026).
      Kontrola ostatních povolání (19. 9. 2026): schopnosti „za každou úroveň“ (Skvělá kondice, Urputnost,
      Požehnané zdraví, Osvícení, Koncentrace many) platí zpětně ✔; nově **`grantsSkills`** – Léčitelství,
      Ochočování zvířat, Průzkumnictví (Kamufláž + Líčení pastí), Pokročilá identifikace, Výroba svitků
      a zlodějská umění dají profesní dovednost na 3. stupni zdarma; umění zloděje mají své 3 triky;
      **Mistrovství ve zbrani** jde volit opakovaně; Magie přírody / zvířat +1 k Znalosti přírody /
      Zvládnutí zvířat. **Zocelení** = +4 stupně ODO (text má
      přednost před tabulkou ✔ U) – derive počítá atributy včetně bonusů schopností (`attr:odo`),
      zapsaný základ se nemění. **Válečnické školy ✔ U 22. 9. 2026: všechny fungují stejně** –
      jeden a týž mechanismus (efekt školy v datech), jen s vlastní hodnotou: bodná, jednoruční
      +1 OČ, obouruční +2 zranění, drtiči +3 beze zbraně. Zbývá dopsat efekty do dat.
      Otevřené: Magistr magického oboru (PPP04), prosby nauk klerika (chybí seznamy).
      **Specializace = samostatný krok** přestupu od 6. úrovně (✔ U 19. 9. 2026): podmínky se počítají
      i se schopností/větví zvolenou na téže úrovni, krok je nepovinný a nabízí se při každém dalším
      přestupu, dokud postava specializaci nemá (`specOptions`, `LevelUpState.spec`).
      Zbývá: plná znění položek (Listy), efekty dalších schopností. (Krok Přátelé hotový v 7c+.)
- [x] Průvodce tvorbou – krok 7 Schopnosti a položky 1. úrovně a krok 9 Shrnutí (19. 9. 2026;
      plná znění položek doplní Listy ve Fázi 7).

## Fáze 8 – Export/import (záloha) ✅ HOTOVO 3. 10. 2026 (v0.14.0)

- [x] **Export** aktivní postavy do JSON – stránka **ZÁLOHA A IMPORT** (`#/zaloha`, tlačítko v liště nad deníkem):
      „Stáhnout zálohu“ → `DH-<jméno bez diakritiky>-u<úroveň>-<datum>.json`, obálka `{ format: 'dh-denik/postava',
      formatVersion, appVersion, exportedAt, summary, character }`; na mobilu navíc **Sdílet…** (Web Share – Disk, e-mail, chat).
      Lišta nad deníkem ukazuje, kdy byla postava naposledy zálohovaná do souboru (varování, když nikdy nebo před > 7 dny).
- [x] **Tisk / PDF** – stránka `#/tisk`: souhrn postavy na 1 stranu A4 (atributy, životy a energie, bojové hodnoty, pohyb,
      zbraně, zbroj a štít, dovednosti, schopnosti, výbava a peníze, přátelé, poznámky a zážitky); „Uložit jako PDF“ v dialogu tisku.
- [x] **Import** ze souboru (výběr nebo přetažení): bere obálku exportu i holou postavu, soubor s BOM; projde `migrate()` –
      starší zálohy se doplní, novější schéma / formát odmítne s hláškou. Náhled (postava, zkušenosti, kdy upravená / zálohovaná,
      verze appky) a varování (jiná postava v deníku, starší záloha téže postavy). Volba „nejdřív stáhnout zálohu současné postavy“.
- [x] **Zálohy v prohlížeči** (`dh-denik/zalohy`, posledních 6): automaticky před každým nahrazením postavy (import, nová postava
      z průvodce, prázdný deník, ukázka, obnova) a poškozená data při spuštění; Obnovit / Stáhnout / Smazat. Prázdný deník se nezálohuje,
      plné úložiště zahodí nejstarší. Nahrazení postavy maže i „Vrátit poslední přestup“ (patří k předchozí postavě).
- [x] **Potvrzovací dialog** `ui/ConfirmDialog.tsx` (nativní `<dialog>`, Esc = Zpět, výchozí fokus na Zpět) – import, obnova,
      ukázka, prázdný deník, smazání zálohy, **Vytvořit postavu** v průvodci (když deník není prázdný) a Ztráta hole kouzelníka
      (poslední `window.confirm`). Vývojová lišta nahrazena lištou deníku.
- Logika `storage/backup.ts` (+ `store.replaceWith`), stránky `pages/Zaloha.tsx`, `pages/Tisk.tsx`, `ui/download.ts`, styly
  `theme/zaloha.css` (vč. `@media print`), souhrn schopností vytažen do `rules/summary.ts`. Verze appky z `package.json`
  (`__APP_VERSION__` ve `vite.config.ts`). 13 nových testů (330 celkem).
- [x] **Nápověda** (uživatelská příručka) přímo v appce – stránka `#/napoveda` (tlačítko Nápověda v liště nad deníkem otevře
      sekci k aktuální stránce, odkaz `#/napoveda/<sekce>`): 16 sekcí (začínáme, ovládání, tvorba, Postava, přestup, dovednosti,
      výbava, boj, kostky, záložky povolání, přátelé, poznámky, záloha, telefon, pro testery, časté otázky), obsah s popisky,
      hledání bez diakritiky. Obsah v `src/help/napoveda.ts` (data), stránka `pages/Napoveda.tsx`; 4 testy (334 celkem).
      Appka i s nápovědou publikovaná jako sdílený artifact pro testery (3. 10. 2026).
- [ ] Ověření u uživatele: `npm test`, export → import na jiném zařízení / v jiném prohlížeči, tisk do PDF, mobil.

## Fáze 9 – Ladění, testování, grafický layout, PWA

- [ ] Testovací případy pro výpočty (Thorgil, Lómiel, Baldur, Kloi ✔ základ, Koutlosh).
- [ ] Testování použitelnosti při hraní.
- [x] **Plnohodnotný grafický layout – zapracováno 10. 10. 2026 (v0.15.0)**: balíček `dh-layout` (varianta C, vygenerovaný
      v ChatGPT podle `ZADANI_GRAFIKA_ChatGPT.md`, opravy kola 2 podle `ZADANI_OPRAVY_GRAFIKA_ChatGPT.md`). Pergamen s texturou
      a ornamentálním rámem, vínová kůže v panelu, logo s drakem, svinuté stuhy s ikonou v kroužku, nová sada 44 ikon, písma Alegreya
      přibalená v appce (offline), favicon. **✔ U 8. 10. 2026: teplejší list `--sheet #ebe5d8`** (dřív `#d3d0c9`). Vrstva `theme/skin.css`
      přebíjí jen vzhled stávajících tříd, logika a rozvržení beze změny; 334 testů ✔, build ✔, proklikáno v Chromiu (desktop i mobil).
      Ověření u uživatele: `npm run dev`, proklikání všech záložek na PC i telefonu.
- [ ] PWA – offline provoz, instalace na plochu/telefon.

## Fáze 10 – Android verze

- [ ] Zabalit appku pro Android (Capacitor / TWA).
- [ ] Otestovat na mobilu.
- [ ] Distribuce (APK / obchod).

## Aktuální stav

**16. 10. 2026 – v0.15.1 až v0.15.5 (nasazeno na GitHub Pages).** v0.15.5: První pomoc OBR / INT (✔ U). v0.15.4: dovednosti se dvěma atributy mají bonus a hod pro každý atribut (volba podle situace, ✔ U); vlastní dovednosti dál jeden atribut. Doporučené dovednosti pro začátečníky v průvodci tvorbou (H05 s. 7),
róba platí i pro prosby a kouzla hraničáře. Tabulka pastí H09 už v appce je (ověřeno proti obrázku v PDF – shoda). Duševní síla
hraničáře nad 6. úrovní (v0.15.2): H09 má tabulku jen pro úrovně 1–6 (potvrzeno přepisem U), **✔ U 16. 10. 2026 úrovně 7–24 =
hodnota H09 pro 6. úroveň + přírůstek z tabulky PPP02** proti její 6. úrovni (INT 4–5 podle sloupce INT 6); vzorec to v popoveru uvádí.
**Postup změn:** úpravy se dělají v klonu GitHub repa, push do `main` (testy → build → Pages), změněné soubory se zkopírují
i do lokální složky. Složky `docs/` a `tools/` jsou jen lokálně (na GitHubu není).

**10. 10. 2026 – grafický layout Fáze 9 zapracován (v0.15.0).** Nový vzhled z balíčku `dh-layout` (detail u Fáze 9 a v
`ARCHITEKTURA.md` → Vzhled). Původní styly a komponenty zazálohované v `docs/zaloha-pred-fazi9/`. Další: ověření u uživatele,
pak testování s hráči a PWA.

**3. 10. 2026 – Fáze 8 hotová (v0.14.0):** stránka Záloha a import (export do .json, sdílení, import s náhledem a migrací,
zálohy v prohlížeči před každým nahrazením postavy, obnova), Tisk / PDF souhrnu postavy, potvrzovací dialogy místo `window.confirm`.
`npm test` 334/334 v cloudu, build OK, proklikáno v Chromiu (desktop i mobil). **Nápověda v appce** (`#/napoveda`) a sdílený artifact
pro ~3 testery. Další: ověření u uživatele a testování, pak Fáze 9.

**3. 10. 2026 – 7e Zloděj hotový (v0.13.0), tím celá Fáze 7 kromě rodových schopností.** Záložka UMĚNÍ, triky H12 + PPP05 s plným zněním,
schopnosti a specializace Assassin / Lupič / Sicco, jedy, výroba, Siccova síť, Důvěrník, panel Zloděj v boji (detail u 7e). `npm test` 314/314
v cloudu. **Proklikáno u uživatele 3. 10. 2026 ✔ U („vypadá to asi dobře“).** Výklady 7e ✔ U 3. 10. 2026 (upraví se, kdyby testování ukázalo jinak). Rodové schopnosti a záchranné hody doplněny – **Fáze 7 hotová**. Další: Fáze 8 (export/import + uživatelská příručka).

**1. 10. 2026 – 7d Klerik hotový (v0.12.0).** Záložka VÍRA, prosby H13 + PPP06 s plným zněním, Přízeň a modlitby, Zvolání, Svěcení,
nauky, schopnosti a specializace, panel Klerik v boji (detail u 7d). `npm test` 293/293 v cloudu. Další: ověření u uživatele (`npm test`,
proklikání záložky Víra a boje klerika), pak **7e Zloděj**. Výklady 7d ✔ U 3. 10. 2026 (poslové ručně).

**1. 10. 2026 – 7c+ Přátelé a zvířata hotové (v0.11.0).** Záložka PŘÁTELÉ (zvířecí přítel, smečka Pána zvířat, kůň, kouzelníkův
přítel, Lupičův parťák), ochočení a vyvolání s hodem, životy a hody přítele, šampion, Boj ve smečce, panel v boji a krok Přátelé
v přestupu (detail u 7c+). Tabulka zvířecích přátel H09 doplněna z přepisu uživatele. **Ověřeno u uživatele 1. 10. 2026:**
`npm test` 271/271 ✔. Další: proklikání záložky Přátelé, pak **7d Klerik**.

**1. 10. 2026 – 7c.2 Kouzelník hotový (v0.10.0), tím celé 7c (bez 7c+).** Záložka KOUZELNÍK, přestup s obory, PPP04 kouzly
a schopnostmi, Magistrem a specializacemi, hůl, volby sesílání a kouzelník v boji (detail výše). **Ověřeno u uživatele 1. 10. 2026:** `npm test` 254/254 ✔.
Další: proklikání záložky Kouzelník a boje, pak **7c+ Přátelé** nebo **7d Klerik**.

**1. 10. 2026 – 7c.1 Hraničář hotový (v0.9.0).** Záložka PŘÍRODA, přestup se směry, PPP02 schopnostmi a specializacemi,
kouzla v boji z plných dat, Rychlá střelba a Bojová hůl v hlídání akcí. Další: ověření u uživatele (`npm test` 234/234,
proklikání), pak **7c.2 Kouzelník**.

**1. 10. 2026 – v0.8.4 + v0.8.5 doplněny do repa znovu** (v repu chyběly, zůstaly jen v jiné session): **obran je v kole
stejně jako útoků** (`defensesPerRound` = `attacksPerRound` + Zakrytí bez omezení; dodatečné útoky z triků a útok štítem se
nepočítají; všechny obrany kola v jedné krátké akci Obrana) a **Záměna = volba hráče** (`WarriorState.swapAtk` / `swapDef`,
záložka Válečník → Styl boje; bez volby se nic nemění). 223 testů. Další: proklikání boje válečníka, pak 7c.1.

**1. 10. 2026 – 7c.0 data Hraničáře a Kouzelníka hotová** (bez přístupu k repu, nahráno dodatečně): H09 a H11 přepsané do
zdrojových skriptů s plným zněním kouzel, slučovací `tools/build-magie.py`, výklady potvrzené ✔ U (viz 7c výše a
`docs/MAGIE_7C.md`). Další: doplnit `docs/ppp02_hranicar.json` + `docs/ppp04_kouzelnik.json` z projektu, spustit
`python tools/build-magie.py`, pak **7c.1 Hraničář**. Čeká se na Tabulku pastí H09.

**28. 9. 2026 – 7b.2 Boj válečníka hotový (v0.8.1), tím celé 7b.** Více útoků a obran za kolo, boj dvěma zbraněmi, Nával
adrenalinu, Vražedná zuřivost, Cesta krve, Sebeobětování, strategie, Velení a Bojové rozkazy (detail výše u 7b.2).
Další: ověření u uživatele (`npm test` 221/221, proklikání boje válečníka), pak **7c Hraničář a Kouzelník**.

**27. 9. 2026 – 7b.1 Válečník hotový (v0.8.0).** Záložka VÁLEČNÍK, přestup s Cestami a pokročilými triky, bonusy ke zbraním,
triky v boji s plnými daty. **Ověřeno u uživatele 28. 9. 2026:** `npm test` 208/208, `npm run dev` OK, proklikání ✔ U („vypadá dobře“).
Další: **7b.2** (boj válečníka). K potvrzení (U): text má přednost před tabulkou u Proměnlivého úchopu / Mistra zbroje /
Rychlého hrotu; luk není „bodná“ zbraň pro Mistrovství; Záměna bere automaticky lepší z SIL a OBR.

**27. 9. 2026 – 7a+.3 Theurg hotový (v0.7.4), tím celé 7a+ (PPP03).** Ověřeno u uživatele: v0.7.3 `npm test` 184/184,
`npm run dev` OK ✔. ✔ U 27. 9. 2026: elementálové – tabulka = 1. stupeň + přírůstek za každý další; Zrcadlo duší strop 900.
Další: proklikání Theurga u uživatele, pak **7b Válečník**
(podklady PPP01–06 už jsou v projektu jako `claude/data/ppp0X_*.json`).

**27. 9. 2026 – 7a+.2 Pyromant hotový (v0.7.3).** Pyromant podle PPP03 s. 143–162 (detail a výklady v
`CRAFTING_ALCHYMISTA.md` → 7a+.2). Další: **ověření 7a+.1 a 7a+.2 u uživatele**, pak 7a+.3 Theurg.

**27. 9. 2026 – 7a+.1 Medicus hotový (v0.7.2).** Uživatel dodal celé PPP03 (80 s., textová vrstva čitelná).
Medicus podle s. 127–142: recepty, operace a sešívanci (viz `CRAFTING_ALCHYMISTA.md` → 7a+.1). Pro zdroje dalších
povolání je v repu složka `docs/pravidla/` (podsložka pro každé povolání). Další: **ověření 7a+.1 u uživatele**,
pak 7a+.2 Pyromant. ✔ U 27. 9. 2026: vylepšení sešívance 100/100 za část; inkousty podle knihy; augmentace =
zaškrtávací pole „aktivní“ na záložce Postava s automatickými efekty (4 nové testy, 174 celkem).

**25. 9. 2026 – milník 7a ✅ GO (✔ U „alchymie vypadá dobře“).** Doplněno podle zpětné vazby: krok Specializace
v přestupu ukazuje, co Medicus / Pyromant / Theurg dají hned (dílna, dovednost na 5. st., bonus +5) a 8 volitelných
schopností, které odemknou (24 schopností v `progression.json`, předměty doplnila 7a+). Stále k potvrzení: hůlky
„/ doma“ = v dílně; bonus dílny i k Práci s manou.

**25. 9. 2026 – milník 7a.2 hotový (v0.7.1):** 12 obecných schopností alchymisty z PPP03 (s. 4–16) a 30 předmětů,
které odemykají. Tím je celý rozsah milníku 7a v appce. Další: **ověření milníku u uživatele (go/no-go)**, pak 7a+
nebo 7b. K potvrzení (U): hůlky „/ doma“ = výroba v dílně; bonus dílny i k Práci s manou.

**25. 9. 2026 – milník 7a.1 hotový (v0.7.0):** Alchymista podle H10 – recepty, výroba, zdroje, dílna, výrobky.
Rozhodnuto ✔ U: tabulka umění 10–19, Sliz „2 roky“ = životnost. Další: **7a.2 (PPP03 schopnosti)**, pak ověření milníku u uživatele.

**24. 9. 2026 – Fáze 6 hotová (v0.6.0):** záložka Boj a stavy – životy s mezí vyřazení a hranicí smrti,
léčení, únava, stavy, hlídání akcí v tahu, kouzla a triky v boji, panel Kostky, záznam s vrácením.
Další na řadě: **milník 7a – Alchymista + crafting + progression engine**. Fáze 5 a 6 ověřeny u uživatele 25. 9. 2026 ✔.

**23. 9. 2026 – Fáze 5 hotová (v0.5.0):** stránka Výbava a peníze – katalog z H15 s nákupem a rozměňováním
mincí, vlastní položky, příjem/výdaj s historií, prodej, výměna zbroje a štítu, rozpis naložení, vrácení
poslední změny; kontrola SIL i u štítu. Další na řadě: **Fáze 6 – Boj, životy, léčení a kostky**.

**22. 9. 2026 (3) – Fáze 4 hotová (v0.4.0):** záložka Dovednosti – zlepšování s limitem +1
za úroveň a vrácením, nová dovednost ze seznamu i vlastní, volba atributu, hod k10 s kritickým/
fatálním výsledkem, rozpis bodů po úrovních a historie. Další na řadě: **Fáze 5 – Vybavení**.

**22. 9. 2026 (2) – dodán PPP03 Alchymista.** Vytěžen do
`claude/data/ppp03_alchymista.json`. Milník rozdělen na **7a** (H10 + dílny +
13 obecných schopností z PPP03) a **7a+** (specializační rozšíření). Dílna se
mění z přepínače na majetek se 4 velikostmi. Pro 7a už zbývají jen tři obrazové
tabulky z H10.


**22. 9. 2026 – uzavřené rozpory a podklady (✔ U):** specializace podle `H`; dovednostní body
Zloděje na sudých úrovních; **válečnické školy fungují všechny stejně**; **nosnost a max. únava
zůstávají ruční** (kapitola „Užitečné informace“ se nedohledává); vytěžen vyplnitelný
**Alchymistův deník** (544 polí) → `claude/data/denik_alchymista_pole.json`.
Pro milník 7a tím zbývají jen: **PPP03 Alchymista**, obrazové tabulky z H10 (start many/surovin,
první dva řádky alchymistického umění, Sibériovy elixíry) a přepis ~52 receptů do JSON.


**19. 9. 2026 – Fáze 3 hotová (v0.3.0):** klepnutím na šedé pole s ƒ se ukáže vzorec a jde ho ručně
přepsat (✎), pole Bůh, potvrzení změny rasy/povolání, krátké pohyby, ruční nosnost a max. únava
s varováním, Tabulka zkušeností, zážitky v Poznámkách. Další na řadě: **Fáze 4 – Dovednosti**.

**19. 9. 2026 – průvodce přestupem v React appce** (tlačítko PŘESTUP u Úrovně): volba schopnosti/
větve/specializace, charakterové body, životy a energie, dovednosti (limit +1, Expertiza), položky,
shrnutí před → po; historie přestupů a „Vrátit poslední přestup“. 57 testů.

**19. 9. 2026 – průvodce tvorbou postavy v React appce** (tlačítko „+ Nová postava“, při prázdném
deníku výzva na záložce Postava). Koncept se ukládá zvlášť (`dh-denik/koncept`), postava se
nahradí až tlačítkem „Vytvořit postavu“. 52 testů.


**18. 9. 2026 – Fáze 2 hotová:** React kostra (`draci-hlidka-denik/`,
verze 0.2.0) – navigace, theme, model, derive, store, úložiště, testy.
Pořadí dál: (1) uživatel ověří `npm install && npm run dev` a vzhled,
(2) Fáze 3 (formuláře, popover vzorců s ručním přepisem, průvodce tvorbou),
(3) Fáze 4–6, (4) milník 7a, (5) 7b–7e, export, PWA, Android.
Souběžně: zpětná vazba k prototypu v9.1, chybějící podklady (Užitečné
informace, PPP03, nečitelné kusy H09).

Duševní síla hraničáře 7–24 ✔ dopočet H09 + přírůstky PPP02 (v0.15.2). Tabulka pastí H09 ✔ (v datech od 7c.1).
K potvrzení: výklad tabulky PPP04 (had/havran/netopýr = hodnoty pro 6. úroveň);
Zocelení +3 vs. +4.
