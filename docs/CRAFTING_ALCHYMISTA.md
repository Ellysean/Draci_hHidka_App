# Milník: Alchymistův deník + crafting (go/no-go)

> Klíčový milník projektu. Crafting alchymisty je nejsložitější subsystém
> appky – pokud ho datový model a UI unesou, zbylých pět povolání je jen
> jednodušší varianta stejného principu. Dělá se **jako první ze všech
> povolání**, hned po univerzální části deníku (Fáze 0–6 v `PLAN.md`).
> Součástí milníku je ověření **univerzálního progression enginu**
> (`PROGRESSION_ENGINE.md`) – alchymistické obory jsou větve s
> `grantMode: "grantAll"`.
>
> Verze 6 (27. 9. 2026) – **7a+.1 Medicus** z PPP03 (dodáno celé PDF 27. 9. 2026) – viz „7a+.1“ níže.
>
> Verze 5 (25. 9. 2026) – uživatel dodal **xlsx s recepty a tabulkami H10**
> (`claude/data/alchymie_recepty.json`): všech 52 receptů + obecný svitek
> s úplným textem, kompletní Tabulka alchymistického umění a Sibériovy
> elixíry. **Milník už neblokují žádná chybějící data.**
>
> Verze 4 (22. 9. 2026) – zapracováno **PPP03** (dodáno uživatelem) a
> vyplnitelný **Alchymistův pokročilý deník**; rozhodnut rozsah milníku
> a model dílny.
> Zrcadlí `docs/CRAFTING_ALCHYMISTA.md` v kódovém repozitáři appky.

## Rozsah milníku ✔ U 22. 9. 2026

PPP03 není sada štítků, ale plnohodnotné rozšíření (80 stran, ~70 nových
předmětů, 13 obecných volitelných schopností od 6. úrovně a 8+8+8
schopností u specializací). Aby milník zůstal dosažitelný, dělí se na dvě
části:

- **7a (go/no-go)** = celý `H10` (52 receptů, 3 specializace, obory,
  progression engine, crafting) **+ z PPP03 tabulka alchymistických dílen
  a 13 obecných volitelných schopností** včetně předmětů, které odemykají
  (Cestovní alchymie, Forenzika, Herbalista, Laboratorní specialista,
  Magické hůlky, Travičství, …).
- **7a+ (po 7a)** = specializační rozšíření z PPP03 – Konstrukty,
  Sešívanci a augmentace, Astrální sféry a démoni, Poslové živlů,
  Palné zbraně, Střely a rachejtle, Talismany, Transmutace kovu a
  jejich tabulky.

Strukturovaný přehled PPP03 (dílny, všechny schopnosti, jejich předměty a
seznam dalších tabulek) je v `claude/data/ppp03_alchymista.json`.

## Zdroje pravidel

- `H10_Alchymista_1.2.5_FINAL.pdf` – kompletní text (recepty, obory,
  schopnosti, specializace). Tabulky jsou jen obrázky: **Tabulka many a
  surovin na 1. úrovni** ❌, **Tabulka alchymistického umění** (obtížnost
  destilace/transformace, vnímání many, sběr – první dva řádky ❌),
  **Tabulka nádob na manu** ✔ (dodána v xlsx 19. 9. 2026), tabulka
  Sibériových elixírů ❌.
- `Draci_hlidka_PPP_03_Alchymista.pdf` – **dodáno 22. 9. 2026** ✔,
  textová vrstva je čitelná → `claude/data/ppp03_alchymista.json`.
- `Alchymista-Pokrocily_denik.pdf` – papírový vzor. **Vytěžen 22. 9. 2026**
  z vyplnitelné verze (544 formulářových polí) →
  `claude/data/denik_alchymista_pole.json`. Recepty se na papíře vedou
  jako tabulka NÁZEV / MANA / SUROVINY / ZÁKLAD / OBTÍŽNOST / POZNÁMKA,
  15 řádků na první a 34 na druhé straně.
- `H14_Dovednosti` – Práce s manou (INT), Lučba (OBR) jsou profesní.

**Data H10 kompletní ✔ (25. 9. 2026):** recepty → `claude/data/alchymie_recepty.json`
(13 základních, 15 dalších od 2. úrovně, 4 × 6 oborových, Magický svitek u Výroby
svitků; u každého mana/přídavná mana/varianta, suroviny, základy s `baseId`, výroba
a dílna, obtížnost, trvání, životnost, četnost, použití, ověření, požadavek oboru a
okamžiku, štítky, popis a úplný text). Tabulka alchymistického umění a Sibériovy
elixíry → `alchymie_tabulky.json` a `alchymie_recepty.json → siberio`.

K potvrzení (U): 3. řádek tabulky umění je v originále 10–24 a překrývá se s 20–39 –
appka počítá 10–19. U receptu Sliz je v originále „2 roky“ ve sloupci Trvání (nejspíš
životnost).

## Herní mechanika (opraveno)

Tři zdroje: **Mana** (číslo, Destilace – Práce s manou/INT),
**Suroviny** (číslo, Transformace – Lučba/OBR), **Základ** (konkrétní
ingredience, inventář kusů). 100 bodů many nebo surovin = 1 lb.

- Start: mana podle **stupně** INT, suroviny podle **stupně** OBR (✔ = 12×INT − 24 a 20×OBR + 120;
  příklad Kloi INT 15 / OBR 16 → 156 many / 440 surovin) + 19 startovních
  základů (celkem 7,3 lb, seznam v H10 – jeden kus na každý základní recept).
- **Strop many a surovin = kapacita alchymistické dílny** (PPP03, ✔ U
  22. 9. 2026): 1 200 / 6 000 u malé až 10 000 / 50 000 u věže. Bez dílny
  drží alchymista manu jen v nádobách (`containers[]`). Tím padá dřívější
  nejasnost „maximum zřejmě není“.
- Recepty: **13 základních** (od 1. úrovně), **15 dalších** automaticky od
  2. úrovně, **4 recepty za každý obor** automaticky při jeho naučení,
  plus předměty odemčené volitelnými schopnostmi z PPP03.
- **Výroba**: odepíše se mana, suroviny, základy (**i při neúspěchu**) →
  hod `1k10 + OBR + Lučba (+ bonus dílny, +2 gnóm Zručnost, +5
  Precizní výroba)` > Obtížnost. Výsledek hodu = **Nebezpečnost** vyrobeného
  kusu (hráč ji smí dobrovolně snížit). Hod zadá hráč, nebo hodí appka.
- Forma lektvar ↔ olej: +2 dl oleje jako základ, jinak stejné.
- Na postavě max. 1 aktivní elixír + 1 lektvar; Četnost = cooldown stejného
  jména (Odolnost vůči jedům: ignoruje četnost, 2+2 aktivní).
- Magické předměty: základní + **přídavná mana** (čerpá se použitím);
  obor Krystaly a energie umí dobíjet (stupeň Práce s manou za směnu),
  u Pyromanta navíc schopnost Práce s energií (7a+).
- Výrobek nesmí být základem jiného výrobku.
- Volitelné schopnosti ovlivňující výrobu: Efektivní výroba (−¼ many a
  surovin, +¼ času, volba při každé výrobě), Precizní výroba (+5, 2× čas),
  Substituce (náhrada základu, rozhoduje PJ), Výroba svitků (dovednost,
  vyžaduje kouzelníka), Pokročilá identifikace (dovednost); z PPP03 navíc
  Hromadná výroba, Koncentrované substance, Recyklátor a Sabotér.

## Alchymistická dílna ✔ U 22. 9. 2026 (platí PPP03)

Dílna **není přepínač ani schopnost** – je to majetek se čtyřmi
velikostmi (`claude/data/ppp03_alchymista.json` → `dilny`):

| Velikost | Zřízení | Denní údržba | Max. mana | Max. suroviny | Destilace | Bonus | Pronájem / h |
|---|---|---|---|---|---|---|---|
| 1. Malá (1 místnost) | 400 + 300 zl | 1 st | 1 200 | 6 000 | 2× | +2 | 5 st |
| 2. Střední (2–3 místnosti) | 1 000 + 800 zl | 3 st | 3 000 | 15 000 | 3× | +3 | 1 zl |
| 3. Velká (celý dům) | 2 000 + 1 000 zl | 1 zl | 6 000 | 30 000 | 4× | +4 | 5 zl |
| 4. Věž | 5 000 + 3 000 zl | 3 zl | 10 000 | 50 000 | 5× | +5 | 20 zl |

- Bonus posiluje **Lučbu** a dovednost vázanou k typu dílny; platí bez
  omezení úrovní (nahrazuje starší výklad z H10 „+1 jen do 6. úrovně“).
- Zařízení nové dílny trvá 1 týden; údržbu lze zaplatit, nebo odpracovat
  (počet hodin = číslo velikosti).
- Speciální varianty jsou tytéž velikosti: **Laboratoř** (Medicus),
  **Výheň** (Pyromant), **Astroláb** (Theurg).
- Dílna odemyká recepty „Výroba: v dílně“ a zrychluje destilaci.

## Datový model

Stav alchymisty je v `character.classState.alchymista` (viz `DATA_MODEL.md`):
`materialsCurrent`, `bases[]`, `workshop`, `containers[]`, `crafted[]`
(s `danger`, `form`, `extraManaLeft`, `usesLeft`, poznámkou k životnosti).
Mana je ve sdíleném `vitals.manaCurrent`.

`workshop` nahrazuje dřívější boolean `workshopAccess`:

```jsonc
"workshop": {
  "size": 2,              // 1–4 podle Tabulky alchymistických dílen, null = žádná
  "kind": "zakladni",     // zakladni | laborator | vyhen | astrolab
  "access": "vlastni"     // vlastni | pronajem | cech – pronájem platí jen po dobu práce
}
```

```jsonc
// src/data/items-alchymista.json – jeden recept
{
  "id": "bomba",
  "name": "Bomba",
  "latinName": null,
  "tier": "branch",                    // basic | level2 | branch | ability | specialization
  "source": "H10",                     // H10 | PPP03
  "category": "vybusniny",             // lektvary | jedy | vybusniny | prsteny | zbrane | zbroje | ostatni
  "mana": { "base": 0, "variants": [ { "label": "zesílená", "base": 30, "difficulty": 10 } ], "extraMax": null },
  "materials": 150,
  "bases": ["železná koule", "zápalná šňůra"],
  "durationText": "ihned",
  "lifespanText": "2 roky",
  "craftTime": { "text": "15 minut (1 směna)", "workshopRequired": false },
  "frequencyText": null,
  "useText": "vržení",
  "check": "Výdrž (ODO) vs. Nebezpečnost",
  "difficulty": 9,
  "requires": { "allOf": [ { "branch": "obor_nestabilni_substance" } ] },
  "requiresMoment": null,              // "půlnoc" | "úplněk" | "slunovrat" …
  "tags": ["Nestabilní substance", "zranění Drtivé", "zranění Ohnivé", "zranění Plošné"],
  "oilForm": false,
  "description": "…"
}
```

Předmět odemčený volitelnou schopností má `tier: "ability"` a
`requires.allOf: [{ "ability": "forenzika" }]` – stejný mechanismus jako
u oborů, žádná zvláštní větev.

Pro spolehlivé párování základů má každý základ v receptu i v inventáři
mít `baseId` (např. `alchymistuv_lih`), ne jen text – prototyp páruje
podle podobnosti názvů, což u reálných dat nestačí.

## Seznam známých receptů – filtr podle zdrojů (prototyp v8)

Nad seznamem receptů:

- **Hledání** podle názvu.
- **Filtr** (čipy s počty): **Vše** · **Lze vyrobit** (mana, suroviny,
  všechny základy a případně dílna jsou k dispozici) · **Něco chybí**.
- U „Něco chybí“ druhá řada čipů **Chybí: mana / suroviny / základy /
  dílna** (víc najednou = recept, kterému chybí kterákoli z vybraných věcí;
  bez výběru = všechny nevyrobitelné).
- Řazení: nejdřív vyrobitelné, pak podle počtu chybějících věcí a abecedy.
- U receptu štítek **MŮŽEŠ VYROBIT**, chybějící hodnoty (mana, suroviny,
  konkrétní základ, „v dílně“) **červeně** + řádek „Chybí: …“; tlačítko
  Vyrobit aktivní jen u vyrobitelných.
- Filtr se přepočítá okamžitě při změně many/surovin/základů nebo
  dílny.

Do budoucna (Fáze 7a): započítat Efektivní výrobu (−¼ many a surovin) do
kontroly „lze vyrobit“, Substituci jako „chybí základ – lze nahradit (PJ)“,
a `requiresMoment` (půlnoc, úplněk…) jako informativní štítek.

## Akce „Vyrobit předmět“

1. Hráč vybere recept ze **známých receptů** (`knownItems` z enginu).
2. Appka zkontroluje: manu, suroviny (po případné Efektivní výrobě), základy,
   `requires`, dílnu. Chybějící věci ukáže konkrétně.
3. Po potvrzení odečte zdroje, zeptá se na výsledek hodu (nebo hodí k10)
   a při úspěchu přidá kus do `crafted[]` s Nebezpečností.

## Checklist milníku 7a

- [x] Vytěžit `Alchymista-Pokrocily_denik.pdf` (22. 9. 2026, vyplnitelná verze).
- [x] Dodat a vytěžit `PPP03` (22. 9. 2026) → `data/ppp03_alchymista.json`.
- [x] Získat zbylé obrazové tabulky z H10 (xlsx od uživatele 25. 9. 2026).
- [x] Převést **všech 13 + 15 + 24 receptů** z H10 (25. 9. 2026 → `claude/data/alchymie_recepty.json`,
      do appky jako `src/data/alchymie-recepty.json`) – původně plánováno jako `items-alchymista.json`
      (text je kompletní, jde to rovnou), se `baseId` u základů.
- [x] **7a.2 (25. 9. 2026, v0.7.1):** 30 předmětů odemykaných obecnými schopnostmi PPP03 (Cestovní alchymie 5,
      Forenzika 5, Herbalista 5, Laboratorní specialista 4, Magické hůlky 5 + Hůlka s kouzlem, Travičství 5) –
      zdroj `docs/ppp03_recepty.json` (generuje `tools/ppp03_recepty_src.py`), sloučeno do `src/data/alchymie.json`.
- [x] Obory (`grantAll`, 4 recepty každý – opraveny seznamy podle xlsx), volitelné schopnosti H10,
      3 specializace, 15 receptů automaticky na 2. úrovni (`src/data/progression.json`). **+ 12 obecných schopností PPP03 od 6. úrovně (7a.2 ✔).**
- [x] Progression engine (průvodce přestupem, `knownRecipes()` dopočítá recepty z úrovně, oborů a schopností).
- [x] Zdroje: mana/suroviny – Destilace, Transformace, Dlouhodobý sběr, Vnímání many, nákup (3 st / 3 md za bod),
      ruční úprava; kapacita z nádob ve výbavě (Krystaly a energie ×2) nebo z vlastní dílny.
- [x] Inventář základů (19 startovních jednotlivě, přidání z nabídky základů receptů nebo vlastní, hmotnost do naložení).
- [x] Seznam známých receptů + detail receptu (úplný text z H10).
- [x] **Filtr receptů: Vše / Lze vyrobit / Něco chybí (+ co chybí), hledání.**
- [x] Akce Vyrobit (varianty, přídavná mana, Sibériovy elixíry, forma oleje, Efektivní/Precizní výroba, ruční výběr
      základů i z výbavy, Substituce/PJ, hod appkou nebo ručně, odečet i při neúspěchu, Nebezpečnost lze snížit).
- [x] Inventář výrobků (životnost, četnost, přídavná mana čerpat/dobít, forma, aktivní účinky s limitem 1 + 1).
- [x] **Dílna: velikost 1–4, typ, vlastní/pronájem/cech, „právě v ní pracuji“**, bonus do hodů, limity
      many a surovin, odemčení receptů „v dílně“, rychlost destilace.
- [x] Naložení počítá manu/suroviny (100 = 1 lb) a základy.
- [x] Záznam alchymie a **Vrátit** (výroba, zdroje, nákupy – včetně spotřebované výbavy a peněz).

**Stav 25. 9. 2026 (v0.7.1): 7a.1 + 7a.2 hotovo** – celý H10 a 12 obecných schopností PPP03 v appce. Milník 7a
**✅ GO – ověřeno u uživatele 25. 9. 2026** (`npm test` 158/158, `npm run dev` OK, „alchymie vypadá dobře“). Milník 7a
čeká na ověření u uživatele (go/no-go).

### 7a.2 – obecné schopnosti PPP03 (s. 4–16) v appce

Tabulka PPP03 má **12** obecných schopností (dřívější „13“ byl překlep). Všechny od 6. úrovně v průvodci přestupem.

| Schopnost | Jak ji appka počítá |
|---|---|
| Artefakty | opakovatelná volba; jen pravidla (vlastnosti artefaktu určuje PJ) |
| Bojová konzumace | volba ve výrobě lektvaru/elixíru: −5 k hodu, +25 % many a surovin, výrobek hned PŮSOBÍ; neúspěch → appka hodí k10 na vedlejší účinek (6 = Rovnováha: povedlo se, dvojnásobný účinek) |
| Cestovní alchymie | +2 k Lučbě při výrobě mimo dílnu; 5 receptů |
| Forenzika | +2 k Postřehu (efekt `skill:postreh`); 5 receptů |
| Herbalista | pravidla pěstování (PJ); 5 receptů (Houbovrah, Likvidátor, Manamutace se nepijí) |
| Hromadná výroba | počet dávek: mana a suroviny × dávky, obtížnost +1 za další dávku, základy jednou; výrobek ×n, pití bere po kuse |
| Koncentrované substance | výběr efektu (4 možnosti): mana a suroviny ×1,5, poznámka „posíleno: …“ u výrobku |
| Laboratorní specialista | dovednostní body 5× úroveň místo 4× zpětně; 4 recepty; Pokročilá destilační aparatura (vlastní výrobek) = destilace 2× rychleji |
| Magické hůlky | 5 hůlek + Hůlka s kouzlem (jen s Výrobou svitků); přídavná mana podle dřeva: dub 50, třešeň 100, jasan 200, ebonit 500 |
| Recyklátor | tlačítko Recyklovat u výrobku: základy zpět + ½ zbylé many a surovin; oprava jen jako pravidlo |
| Sabotér | tlačítko Sabotáž: podmínka + hod Lučba vs. obtížnost výroby; neúspěch = ZNEHODNOCENO |
| Travičství | Odolnost 2× proti jedům (pravidlo); 5 receptů (Antisérum s obtížností podle jedu) |

Navíc: Kotlík samovar (vlastní výrobek) = volba −5 surovin za dávku lektvaru či jedu; Magický kompas bere 4 jehly.

**Specializace v přestupu (25. 9. 2026, podle zpětné vazby U):** krok Specializace ukazuje u Medika, Pyromanta
a Theurga, co dají hned (speciální dílna, profesní dovednost na 5. stupni – Chirurgie / Pyromancie / Theurgie,
Pyromancie a Theurgie +5 k Lučbě u svého oboru, Theurgova hůl) a 8 volitelných schopností, které odemknou.
Těch 24 schopností je v `progression.json` (`requiresSpecialization`, od 6. úrovně) – jdou zvolit, jejich předměty
a tabulky doplní 7a+. PPP03 uvádí u specializací i třetí podmínku (Substituce / Výroba svitků / Precizní výroba) –
platí ale rozhodnutí ✔ U 22. 9. 2026: podmínky podle H (dvě).

K potvrzení (U): hůlky mají u výroby „/ doma“ – appka je bere jako výrobu **v dílně**.

K potvrzení (U): bonus dílny se v appce přičítá k Lučbě **i k Práci s manou** (destilace, sběr many) – PPP03 říká
„Lučba + dovednost vázaná k typu dílny“, H10 zmiňuje bonus laboratoře u destilace.

## Checklist 7a+ (PPP03 specializace, až po 7a)

- [x] **Medicus – 7a+.1 hotovo 27. 9. 2026 (v0.7.2)**: tinktury Chirurgie (4), Biologická augmentace (4),
      Infuze a inhalace (6 + injekce/aerosol), Mechanická augmentace (Bio-rozhraní + 4, výroba Mechanikou),
      Sešívanci (kontrolní krystal, stavitel s tabulkami končetin, hlav a kůže), Tetování (6 inkoustů),
      hody Bojové anatomie, Resuscitace a Plastické chirurgie; Laboratoř = bonus k Chirurgii. Detail níže.
- [x] **Pyromant – 7a+.2 hotovo 27. 9. 2026 (v0.7.3)**: 32 receptů (Kapsulační gem, Univerzální nosič, Chrlič
      a 4 plyny, 5 palných zbraní + kule, náboje, černý prach, 5 předmětů Práce s energií, 5 sapérských, 7 střel
      a rachejtlí), stavitel konstruktů podle tabulek, odpálení rachejtlí, palné zbraně do výzbroje, sapérský hod,
      transmutace kovu. Detail níže.
- [x] **Theurg – 7a+.3 hotovo 27. 9. 2026 (v0.7.4)**: Theurgova hůl (výroba, mana 1000, Astron, do zbraní), Astrální
      sféry (stavitel předmětu s démony – 72 řádků Tabulky vlastností démonů, pravidla stabilizace, magické okamžiky,
      životnost), bhůtové, elementálové, esence, 27 receptů (Oživlé pomůcky 5, Portály a zrcadla 4, Vichry many 4,
      Talismany 14) a Tabulka drahokamů. Detail níže. **Tím je celé PPP03 v appce.**

### 7a+.1 – Medicus (PPP03 s. 127–142) v appce

| Část | Jak ji appka počítá |
|---|---|
| Chirurgie (každý Medicus) | dovednost na 5. st.; list MEDICUS: ošetření vs. X (PJ) → zastaví krvácení, vyléčí tolik životů, jaký je stupeň; bonus Laboratoře jen při práci v ní; 4 tinktury (Paralyzující, Proti bolesti, Uspávací, Konzervační lák) |
| Biologická augmentace | 4 recepty jen v laboratoři; hod operace 15 / 20 / 25, neúspěch o 5 a víc = smrt pacienta |
| Mechanická augmentace | Bio-rozhraní (v laboratoři) + Exoskelet, Mechanické oko, Umělá noha, Umělá paže – výroba 1k10 + Mechanika (ne Lučba, bez bonusu laboratoře); operace 15 / 20 / 25 |
| Infuze a inhalace | 6 receptů; u lektvaru/elixíru/jedu tlačítka **Injekce** (1 flakón → 2 dávky, stejný účinek) a **Aerosol** (½ účinku) |
| Tetování | 6 inkoustů jako výrobky (nepočítají se do limitu 1 + 1) |
| Sešívanci | Kontrolní krystal (v laboratoři); stavitel: základ Z (úroveň, velikost A–F, opravy SIL/OBR/ODO, pokrytí), části (končetina 2 + úr., hlava 5 + úr., speciální 3 + úr., kůže = úr.), mana 300 + 100/část, suroviny 100 + 100/část, 4 h/část; útok ÚČ = SIL (Z) + ½ úr. (T) + tabulka, ZO = OBR (Z) + ¼ úr. (Z) + kůže (T) − kůže (Z), životy 10 + (5 + ODO) × úr.; hod Chirurgie vs. součet, neúspěch = tvor umírá, odečet i tak; nový tvor spotřebuje 1 krystal (musí zůstat primární – celkem 2) |
| Bojová anatomie | ohledání Postřeh vs. X; v boji jen pravidlo (cíl hází ODO vs. OBR Medika, −3 na 1k10 kol) |
| Resuscitace | První pomoc vs. 15 + 3 za minutu, nejvýš 5 minut |
| Plastická chirurgie | přišití kůže / masky Chirurgie vs. 15, +5 za každou další operaci pacienta |

Rozhodnuto ✔ U 27. 9. 2026:
- **Vylepšení sešívance** = 100 many a 100 surovin za novou část (bez základu 300 / 100), obtížnost základ + nové části.
- **Inkousty protekce mrazu / ohně** zůstávají podle knihy (pero fénixe / voda ledovce), i když to vypadá prohozeně.
- **Augmentace na postavě** = zaškrtávací pole „aktivní“ na záložce Postava (Zvláštní schopnosti → Augmentace), pro
  každou postavu, ne jen alchymistu. Efekty počítá derive: Druhý mozek INT +5, Druhé srdce max. životy +⅓, Exoskelet
  ZO +3, Umělá noha pohyblivost ×2, Umělá paže SIL nejméně 26; snížení Charismatu (−2 až −10, nikdy pod 1).
  Ostatní (létání, útok navíc, Výdrž ×2, Nevýhoda k jemné mechanice) jsou poznámky u zaškrtávátka.

### 7a+.2 – Pyromant (PPP03 s. 143–162) v appce

| Část | Jak ji appka počítá |
|---|---|
| Pyromancie (každý Pyromant) | dovednost na 5. st.; +5 k **Lučbě** u Nestabilních substancí (ne u receptů vyráběných Pyromancií či Mechanikou); Výheň dává bonus dílny i k Pyromancii a Mechanice |
| Kapsulační gemy | recept Kapsulační gem: 30 + přídavná mana (běžně do 100), hod Výroba svitků vs. 15 (+ obtížnost kouzla); Pyromant gem dobíjí |
| Konstrukty | Univerzální nosič (recept); stavitel: velikost A–C, tělo (Kámen / Keramika / Kov / Kombinace), srdce (olej / mana / gem), 0–2 dodatečné nádrže, mozek 1–4, vylepšení (létat, plavat, zesílená, nosič, chrlit, rychlost) – obtížnost, hodiny, mana a suroviny jako součet tabulek; hod Mechanika vs. součet; neúspěch = šrot, ½ many a surovin se odečte z ceny dalšího konstruktu; karta: ÚČ, OČ, životy (zesílená OČ +5, životy +½), palivo (nádrž na 10 dní, mana se bere z tvé many), −1 den, chrlení; vylepšení = nové součásti vs. celková obtížnost |
| Mistr nestabilních substancí | CHAR −5 (derive, nikdy pod 1); Chrlič (Pyromancie) a 4 plyny; rezistence jako pravidlo |
| Palné zbraně | Pistole, Ručnice, Hákovnice, Polní dělo (Mechanika) → tlačítko **Do zbraní** přidá vlastní zbraň s útočností, zraněním, obranou, dostřelem a nabitím; Turét; kule ×10 a náboje ×5 za výrobu, černý prach |
| Práce s energií | přídavná mana při výrobě až 2×; dobíjení přídavné many všech předmětů; 5 receptů |
| Sapérský výcvik | hod na past +5 (Mechanika na výrobu/nastražení/zneškodnění, Postřeh na nalezení); 5 receptů |
| Střely a rachejtle | Hmoždíř (Mechanika) a 6 receptů (Pyromancie); **Odpálit**: hod Pyromancie vs. obtížnost (řízená a naváděná střela vyšší na pohyblivý cíl), kus se spotřebuje, zobrazí účinek zápalné i výbušné hlavice |
| Transmutace kovu | kalkulačka many podle tabulky (řádek zdroj → sloupec cíl) a speciálních slitin, ×5 pro ostří dýky; Provést odečte manu |

Výklady z textu (bez potvrzení není potřeba měnit, jen pro kontrolu):
- Palivo mana, velikost A: v tabulce chybí číslo obtížnosti → appka +5 jako u B a C.
- Chrlení: tabulka vylepšení říká 1/20 základní nádrže, text u Konstruktů 1/10 denního paliva → appka podle tabulky (1/20).
- Odpalovací krystal potřebuje „bombu“ – vyrobená Bomba jako základ nejde (výrobek nesmí být základem, H10), vyber ji ručně
  nebo označ jako zajištěnou PJ.

### 7a+.3 – Theurg (PPP03 s. 163–190) v appce

| Část | Jak ji appka počítá |
|---|---|
| Theurgie (každý Theurg) | dovednost na 5. st. (INT); +5 k Lučbě u Hvězdných sestav; Astroláb dává bonus dílny i k Theurgii |
| Theurgova hůl | Vyrobit (300 many) nebo „Hůl už mám“; mana v holi 0–1000, dobití z vlastní many 10 za kolo; Astron (1 démon); **Do zbraní** – útočnost 7, zranění 1, obrana 1, obouruční, +5 proti démonům a elementálům |
| Astrální sféry | stavitel: předmět, magický okamžik (strop obtížnosti 12–24 nebo X + 3), cíl předmět / Astron, z každé sféry nejvýš 1 řádek; kontrola stabilizace (≥ pomocníci − 1 škůdců, úrovně škůdců ≥ ½ úrovní pomocníků); obtížnost, mana, suroviny a hodiny přípravy jako součet; hod Theurgie – rozdíl určí životnost; výsledek jako výrobek se seznamem démonů (bez tlačítka Použít) |
| Ovládnutí živlů | bhůt (4 druhy, stupeň 1–9): obtížnost, mana z hole (jen při úspěchu), trvání, zóny a poškození z Tabulky efektu bhůtů |
| Poslové živlů | Igni, Undina, Terra, Sylfa: hodnoty podle stupně, přivolání z many hole, karta se životy, příkazy a propuštěním |
| Práce s esencemi | zásoba 4 esencí; separace 1 mana → 1 bod od každé (10 many za směnu); efekty z knihy s cenou a tlačítkem Použít |
| Oživlé pomůcky, Portály a zrcadla, Vichry many | recepty (výroba Theurgií, kde ji kniha uvádí; magický okamžik jako štítek) |
| Talismany | 14 receptů, Lučba, mana = přídavná mana do stropu drahokamu (čerpání tlačítkem Čerpat) |

Rozhodnuto ✔ U 27. 9. 2026:
- **Elementálové**: hodnota v tabulce platí pro 1. stupeň, „+X za každý stupeň“ se přičítá za každý další (Terra 3. st. = 25 many, 30 životů).
- **Zrcadlo duší**: přídavná mana 30 za stupeň nebezpečnosti, strop appky 900 (nebezpečnost 30) stačí.

Poznámky k textu: bhůt 7. stupně, III. zóna jen „95“; Oživlé pomůcky mají v textu 5 receptů (tabulka jmenuje 4);
esence vzduchu „odolnost proti …“ bez upřesnění; Citrínový talisman bez stropu many (appka 400 z Tabulky drahokamů).

## Definice hotovo (7a)

Hráč v appce: má alchymistu, vidí manu/suroviny/základy, vybere známý
recept (i přes filtr „Lze vyrobit“), vyrobí předmět (appka správně
zkontroluje a odečte zdroje, i při neúspěchu), vidí výrobek s Nebezpečností
a životností, nastaví si dílnu (velikost a typ), která změní bonus, limity
i dostupné recepty, a při přestupu se naučí obor nebo volitelnou schopnost,
která mu automaticky přidá příslušné recepty. Bez chyb ve výpočtech oproti
`H10` a `PPP03`.
