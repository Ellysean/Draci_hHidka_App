# Architektura appky (Fáze 2 – kostra)

> Zrcadlí `claude/ARCHITEKTURA.md` v Claude projektu. Doplňuje
> `DATA_MODEL.md` o to, jak je model postavený v kódu.

## Technologie

- **React 19 + TypeScript (strict) + Vite 6**, testy **Vitest**.
- Žádné další runtime závislosti. Routing je vlastní **hash routing**
  (`#/postava`, `#/dovednosti` …) – funguje bez serveru, z `file://` i v
  Capacitoru (Fáze 10). `vite.config.ts` má `base: './'`.

## Tok dat (jeden zdroj pravdy)

```
localStorage ──load+migrate──► reducer state (Character) ──derive()──► Derived
      ▲                              │  dispatch(set/update/setClass/replace/new)
      └──── auto-save 400 ms, hned při skrytí stránky ◄──┘
```

- `state/reducer.ts` – neměnné úpravy (`setIn` podle cesty), každá změna
  nastaví `meta.updatedAt`. Změna povolání vymění blok `classState`.
- `state/store.tsx` – `CharacterProvider` + `useStore()` vrací
  `{ character, derived, set, dispatch, storageMessage, replaceWith, storage }`. `derived` se
  přepočítá jen při změně postavy (`useMemo`).
- `rules/derive` – čisté funkce. Každá hodnota je `Calc { value, formula,
  computed?, overridden }` – `formula` je text pro popover (Fáze 3),
  `overrides` z postavy přebijí výsledek a vzorcová hodnota zůstane v
  `computed`.
- Efekty schopností jsou data (`{ target, op, value, per }`). Do naplnění
  progression dat (Fáze 7) je v `derive` malá tabulka známých efektů
  (Skvělá kondice, Požehnané zdraví, Tuhý kořínek, Urputnost, Škola boje s
  bodnou zbraní, Koncentrace many, Osvícení) + rodové efekty z `races.json`.

## Úložiště

- `storage/localStore.ts` – adaptér `StorageAdapter` (read/write/remove);
  výchozí je localStorage pod klíčem `dh-denik/postava`. Adaptér jde
  vyměnit za IndexedDB / Capacitor Preferences.
- `storage/schema.ts` – `CURRENT_SCHEMA_VERSION = 1`.
- `storage/migrations.ts` – `MIGRATIONS[n]` převádí n → n+1; data z novější
  verze appka odmítne s hláškou; chybějící pole doplní z výchozí postavy.
- Poškozená data se nezahodí: zazálohují se pod `dh-denik/postava/zaloha-<čas>`
  a appka ukáže hlášku. Plné úložiště = hláška, ne pád.
- Stejná funkce `migrate()` poslouží importu JSON ve Fázi 8.

## Rozdíly proti `DATA_MODEL.md` v1 (zapracovat při revizi)

- `skillPointsSpentLog` → **`skillLog`** `{ level, skillId, from, to, cost }` –
  z jednoho záznamu jde i utracení bodů, i limit +1 stupeň za úroveň.
- `skills[].attribute` – zvolený atribut dovednosti (u dvouatributových).
- **`companions[]`** na nejvyšší úrovni postavy (modul Přátelé, `COMPANIONS.md`)
  místo `hranicar.animalCompanion` / `kouzelnik.familiar`.
- `hpGains` neexistuje (max. životy z Tabulky životů, v8.2).
- Overrides mají pevný seznam klíčů `OverridableKey` (hpMax, deathThreshold,
  manaMax, defenseBase, attackNumber, defenseNumber, initiativeBonus,
  mobility, load, loadLimit, fatigueMax, size, skillPointsAvailable).
- Ruční velikost se nově ukládá do `overrides.size`; `basic.sizeOverride` zůstává
  jen kvůli starším datům (derive ho stále čte jako první).

## Popover vzorce a ruční přepis (Fáze 3)

- `CalcField` (`ui/Field.tsx`) je tlačítko; klepnutí otevře `FormulaPopover`
  (`ui/FormulaPopover.tsx`) se vzorcem (`Calc.formula`), hodnotou podle vzorce
  (`computed`) a – je-li zadané `ovKey` – polem pro ruční přepis a „Vrátit na vzorec“.
- Popover se vykresluje portálem do `<body>` (listy mají `clip-path`), pozice
  `fixed` pod polem (nad ním, když se nevejde); pod 820 px spodní panel se
  ztmavením. Esc a klik mimo zavírají, fokus se vrací na pole.
- `useOptionalStore()` – komponenta funguje i mimo `CharacterProvider` (pak bez přepisu).
- `derive` po přepisech dopočítá `moves` (krátké pohyby), `overloaded`
  (naložení > nosnost) a `fatigueOver` (body únavy > max.) – porovnává se s tím,
  co hráč vidí.

## Vzhled

- `theme/tokens.css` – barvy a písma (tokeny z `VISUAL_STYLE.md`).
- `theme/sheet.css` – pergamen, stuhy, pole, štít povolání, mobilní lišta
  (převzato z odsouhlaseného prototypu v9.1).
- `theme/texture.ts` – šum papíru a potrhané okraje jako CSS proměnné.
- Komponenty `Sheet`, `Ribbon`, `Labeled`/`TextField`/`NumberField`/`CalcField`,
  `Icon`. Fáze 9 vymění textury, ikony a logo tady – logika se nemění.
- Mobil (< 820 px): jeden sloupec, spodní lišta se 7 položkami (krátké
  popisky DOVED., POZN., BOJ).

### Grafická vrstva Fáze 9 (v0.15.0, 10. 10. 2026)

- Zdroj: balíček `dh-layout/` v kořeni repa (varianta C z ChatGPT, kolo 2). Do appky převzato:
  `theme/img/` (textury `paper`, `ground`, `leather`, `ribbon.svg`, rám `torn-edge.svg`, `dragon-watermark.svg`, `logo-wide.svg`,
  `logo-square-512.png` jako favicon), `theme/fonts/` + `theme/fonts.css` (Alegreya SC / Sans / Italic, WOFF2 latin + latin-ext,
  OFL – žádný odkaz na Google Fonts, appka funguje offline).
- `theme/skin.css` se načítá jako poslední a **přebíjí jen vzhled** stávajících tříd (`.side`, `.nav-btn`, `.sheet`, `.ribbon`,
  `.field`, `.calc`, `.btn`, `.pill`, `.chip`, `.fpop`, dialogy, kostky, boj…). Názvy tříd z kontraktu balíčku (`.field__input`,
  `.nav-item` …) se v appce nepoužívají – stejné vizuální řešení je namapované na třídy appky.
- `theme/tokens.css`: `--sheet #ebe5d8` (✔ U), nové tokeny `--edge`, `--line`, `--quiet`, `--light-ink`, `--wine-line`,
  `--danger-bg`, stíny a cesty k texturám (`--texture-*`, `--art-*`).
- `ui/icons.ts` generovaný z `dh-layout/icons.svg` (44 ikon; navíc `battle`, `wizard`, `dice`, `help` …; `upload` a `chest`
  zůstaly z v9.1). `Icon` dává třídu `.icon`, tah bere z `<g>` uvnitř ikony.
- `Ribbon` obaluje text do `.ribbon__title` (verzálky v datech se zobrazují jako kapitálky Alegreya SC, celý text v tmavém pásu).
- `Shell`: logo z `logo-wide.svg`, motto s drakem jako vodoznak (CSS maska). Mobil: logo v horní liště, motto skryté,
  na konci stránky volné místo pod plovoucí kostkou.
- Tisk: bílý papír bez textur a rámů.
- Záloha původních souborů: `docs/zaloha-pred-fazi9/`.

## Data pravidel (`src/data`)

Převzata z prototypu v9.1 skripty v `tools/` (kanonické zdroje jsou
`claude/data/*.json` v projektu): `races.json`, `classes.json`,
`skills.json` (15 základních, 6 rozšířených, 12 profesních), `conditions.json`,
`vyzbroj.json` (H15 + zlodějské zbraně PPP05), `gear.json`,
`recommended-equipment.json`, `tables/zivoty.json`, `tables/energie.json`,
`tables/zkusenosti.json`, `tables/fatigue.json`.

Duševní síla hraničáře je od 19. 9. 2026 z **H09** (✔ U, `claude/data/dusevni_sila_H09.json`),
ne z PPP02; tabulka má jen úrovně 1–6, nad nimi `derive` vrací `null` a hráč zadá
maximum ručně (overrides).

## Dovednosti (Fáze 4)

- `rules/skills.ts` – čisté funkce nad postavou: `raiseSkill` / `undoRaise` / `raiseBlockNow`
  (limit +1 za úroveň z `skillLog`, Expertiza), `addSkill` / `addBlock` (jen obecné dovednosti,
  vlastní = `custom:<název>`), `removeSkill` (jen koupené/vlastní, body se vrátí),
  `setSkillAttribute`, `setSkillRankManual` (přepis z papíru bez záznamu).
- Zlepšení mimo průvodce přestupem se zapisuje do `skillLog` s **aktuální** úrovní, takže průvodce
  i záložka sdílejí jeden limit. Body k utracení = hodnota, kterou hráč vidí (i ručně přepsaná).
- `derive().skills[]` nově nese `mod`, `bonus`, `bonusParts` a `source`.
- `rules/dice.ts` → `rollCheck(bonus, criticals)` – ověřovací k10 podle H06.

## Výbava a peníze (Fáze 5)

- `rules/catalog.ts` – řádky katalogu (H15, PPP05 + `customCatalog`), sdílí je obchod průvodce i deník.
- `rules/equipment.ts` – čisté funkce: `payMoney` (nejdřív drobnými, nazpět co nejméně mincí), `income`,
  `expense`, `acquire` (Přidat / Koupit), `removeWeapon` / `removeItem` / `removePiece` (volitelně prodej),
  `unequipPiece`, `equipFromItems`, `saveCustom` / `deleteCustom`, `undoLast`.
- Každá změna přes tyto funkce uloží `equipment.undo` (stav výzbroje a peněz před ní) a pohyb peněz
  zapíše do `equipment.ledger`. Ruční přepis mincí se nezapisuje.
- `derive` nově vrací `armor` / `shield` (`PieceInfo`), `shieldOverloaded` (−5 k OČ) a `loadParts`
  (rozpis naložení). Štít ve slotu váží i mimo ruku.
- Nová pole modelu: `equipment.customCatalog`, `equipment.ledger`, `equipment.undo`, `GearItem.piece`,
  `ArmorPiece.custom.stealth`. Schéma zůstává v1 – doplní je `fillDefaults` v `migrate()`.

## Boj a stavy, kostky (Fáze 6)

- `rules/combat.ts` – čisté funkce: `record()` (každá rychlá úprava zapíše záznam a uloží stav `vitals` +
  `play.combat` pro `undoPlay`), životy (`hpState`, `changeHp`, `rest`, `sleep`, `recover`, `healBy`),
  stavy (`toggleCondition` s `rounds`, `setBleed` se `stacks`), postihy do hodů (`combatMods`), boj
  (`startCombat`, `rollInitiative`, `myTurn`, `doAction`/`whyNot`, `takeDefense`, `endTurn`, `newRound`,
  `turnEffects`), kouzla a triky (`knownSpells`, `spellCost`, `castSpell`, `continueChannel`, `applyTrick`).
- Nová data postavy: `character.play = { combat, log, undo }`, `Condition.rounds`. Schéma zůstává v1 – doplní
  `migrate()`.
- ~~`src/data/combat-magic.json`~~ – výřez kouzel z prototypu; od 7d zrušen (plná data povolání v `magie.json`, `valecnik.json`, `klerik.json`).
- `ui/Dice.tsx` – `DiceProvider` (kolem App), plovoucí tlačítko a panel Kostky, `useDice().roll()` a
  `RollButton`. Historie hodů jen v paměti; přepínač kritických výsledků v localStorage (nastavení appky).
- `derive` nově vrací `category` u zbraní a zbroje/štítu (délka nabití, spánek ve zbroji).

## Alchymista (milník 7a.1)

- Data `src/data/alchymie.json` generuje `tools/build-alchemy.py` z `docs/alchymie_recepty.json` (xlsx od uživatele):
  53 receptů s klíčovými slovy pro párování základů (`bases[].match` – kmeny bez diakritiky, alternativy),
  tabulka umění, Sibériovy elixíry, 19 startovních základů, 4 dílny (PPP03), nádoby, texty oborů.
- `rules/alchemy.ts` – `knownRecipes` (úroveň, obory, schopnosti), `planCraft` / `recipeMissing` (co chybí),
  `craft` (odečet i při neúspěchu, Nebezpečnost), `distill` / `transform` / `gather` / `perceiveMin`, `buyResource`,
  `capacity` (nádoby ×2 s Krystaly, vlastní dílna), výrobky (`useCrafted` s limitem 1 + 1, přídavná mana).
  Každá akce jde přes `commit()` → `classState.alchymista.log` + `undo` (snapshot many, stavu alchymisty a výbavy).
- Model: `AlchemistState` má `workshop` (velikost, druh, přístup, `here`), `bases[].baseId`, `crafted[]` (`CraftedItem`),
  `log`, `undo`; `migrate()` doplní nová pole i u existující alchymistky. `workshopAccess` je zastaralé.
- Stránka `pages/Alchymie.tsx` na 5. záložce (ALCHYMIE), styly `theme/alchymie.css`.
- Základy receptu hledá appka v inventáři základů i ve výbavě (zbraně, štít, zbroj, předměty); hráč je může
  v dialogu výroby vybrat ručně nebo označit jako Substituci / zajištěné PJ.

## Alchymie – schopnosti PPP03 (7a.2)

- Data: `docs/ppp03_recepty.json` (zdroj, generuje `tools/ppp03_recepty_src.py`) → `tools/build-alchemy.py` je sloučí do
  `src/data/alchymie.json` (`recipes` s `source: "PPP03"`, `wandWoods`, `combatSideEffects`, `concentrateEffects`,
  `ppp03Abilities` = plná pravidla). Schopnosti jsou v `src/data/progression.json` (`minLevel: 6`, Artefakty `repeatable`).
- `RecipeDef` nově: `source`, `drinkable: false` (lektvary, které se nepijí), `mana.wand` (strop přídavné many podle dřeva),
  `materialsVariants`, `requires.abilities` (Hůlka s kouzlem vyžaduje i Výrobu svitků); `BaseReq.qty` (4 jehly).
- `CraftOptions` nově: `batch`, `concentrate`, `combat`, `samovar`, `wandWood`; `CraftPlan` vrací `batch` a `combat`.
  Pořadí úprav ceny: varianta → Efektivní ×¾ → Koncentrované ×1,5 → Bojová konzumace ×1,25 → × dávky → samovar −5/dávka.
- `CraftedItem` nově: `difficulty`, `manaSpent`, `materialsSpent` (na kus), `sabotage`, `ruined`; `qty` > 1 u hromadné
  výroby – použití/zahození bere po kuse (`takeOne`).
- Nové funkce: `recycle`, `recycleInfo`, `sabotage`, `itemDifficulty`, `extraMaxFor`, `canBatch`, `canConcentrate`,
  `canCombatConsume`, `canSamovar`, `ownsCrafted`. `derive`: Laboratorní specialista (násobek bodů +1 zpětně), Forenzika
  (`skill:postreh` +2).

## Alchymie – specializace Medicus z PPP03 (7a+.1, v0.7.2)

- Data: `tools/ppp03_medicus_src.py` → `docs/ppp03_medicus.json` → `tools/build-alchemy.py` → `src/data/alchymie.json`
  (26 receptů, pravidla 8 schopností v `ppp03Abilities`, tabulky sešívanců `stitch`, obtížnosti augmentací `surgery`).
- `RecipeDef` nově: `tier: 'specialization'` + `requires.specialization` (tinktury Chirurgie zná každý Medicus),
  `craftTime.workshopKind` (jen v Laboratoři), `craftSkill` (mechanické implantáty se vyrábějí Mechanikou místo Lučby).
  `WORKSHOP_SKILLS` – ke které dovednosti dává speciální dílna bonus (laboratoř → Chirurgie, výheň → Pyromancie a Mechanika,
  astroláb → Theurgie); Lučba a Práce s manou ho mají vždy. Cestovní alchymie +2 platí jen pro Lučbu mimo dílnu.
- `rules/medicus.ts` – `surgeryBonus` (Chirurgie + laboratoř), `augmentOutcome` (o 5 a víc pod = smrt u biologické),
  `resuscitationDc`, `plasticDc`, `splitInjection` / `makeAerosol` (Infuze a inhalace), sešívanci: `partDifficulty`,
  `partAttack`, `stitchedDefense`, `stitchedHpMax`, `planStitch`, `stitch` (přes `commit()` → záznam a Vrátit).
  `commit`, `setState`, `takeOne` jsou nově exportované z `alchemy.ts`.
- Model: `AlchemistState.stitched[]` (`StitchedCreature`: základ Z s opravami atributů, `parts[]`, obtížnost, životy),
  `CraftedItem.injection` / `aerosol`, typ `CreatureSize` (A–F). `migrate()` doplní `stitched: []` samo.
- UI `pages/Medicus.tsx` (na záložce Alchymie jen u Medika): listy MEDICUS (hody operací) a SEŠÍVANCI (karty + stavitel).
- Augmentace na postavě: `Character.augmentations: string[]` (id aktivních, výchozí `[]`), definice a efekty
  v `rules/augmentations.ts` (`AUGMENTATIONS`, `augmentationEffects` → `collectEffects`, v derive navíc SIL nejméně 26,
  CHAR nejméně 1, životy +⅓, pohyblivost ×2). UI: `Augmentace` v `pages/Postava.tsx` (Zvláštní schopnosti).

## Alchymie – specializace Pyromant z PPP03 (7a+.2, v0.7.3)

- Data: `tools/ppp03_pyromant_src.py` → `docs/ppp03_pyromant.json` → `tools/build-alchemy.py` → `src/data/alchymie.json`
  (32 receptů, pravidla 8 schopností, `constructs` = tabulky těla / paliva / mozku / vylepšení, `transmutation`).
- `RecipeDef` nově: `yieldQty` (kule ×10, náboje ×5 – `craft` násobí `qty`), `materialsText`, `weightLb`, `weapon`
  (palná zbraň → `firearmToWeapons`), `launch` (obtížnost odpálení a účinky hlavic). `craftSkill` i `vyroba_svitku`.
- `extraMaxFor(r, o, c)` – Práce s energií ×2; `canRecharge` – Práce s energií (všechny předměty s přídavnou manou),
  Kapsulační gem. Bonus specializace +5 platí jen pro hod Lučbou. `derive`: Mistr nestabilních substancí CHAR −5, CHAR nikdy pod 1.
- `rules/pyromant.ts` – `costRows`, `planConstruct` (šrot, nosič), `constructStats`, `buildConstruct`, `upgradeConstruct`,
  `refuel` / `burnFuel` / `fuelPerDay`, `launch`, `firearmToWeapons`, `transmuteMana` / `alloyMana` / `transmute`.
  `rules/medicus.ts` exportuje `skillCheck` (dovednost + bonus speciální dílny).
- Model: `AlchemistState.constructs[]` (`Construct`) a `constructScrap`; `migrate()` doplní samo.
- UI `pages/Pyromant.tsx` (jen u Pyromanta): listy PYROMANT (odpálení, past, transmutace) a KONSTRUKTY (karty + stavitel);
  u výrobků s `weapon` tlačítko Do zbraní.

## Alchymie – specializace Theurg z PPP03 (7a+.3, v0.7.4)

- Data: `tools/ppp03_theurg_src.py` → `docs/ppp03_theurg.json` → `tools/build-alchemy.py` → `src/data/alchymie.json`
  (27 receptů, pravidla 8 schopností, `theurg` = démoni, magické okamžiky, životnost, bhůtové, elementálové, esence,
  drahokamy, hůl). `requiresMoment` nově u receptů Theurga (slunovrat, úplněk, zatmění měsíce…).
- `rules/theurg.ts` – hůl (`craftStaff`, `setStaffOwned`, `chargeStaff`, `setAstron`, `staffToWeapons`), Astrální sféry
  (`planDemons` s pravidly stabilizace a okamžiku, `summonDemons`, `demonLifespan`), `summonBhut`, elementálové
  (`elementalStats`, `summonElemental`, `updateElemental`, `dismissElemental`), esence (`separateEssences`, `useEssence`).
- Model: `AlchemistState.theurg` (`TheurgState`: staff, essences, elementals), `CraftedItem.demons`; `migrate()` doplní samo.
- UI `pages/Theurg.tsx` (jen u Theurga): listy THEURG (hůl, bhůt, esence), POSLOVÉ ŽIVLŮ a ASTRÁLNÍ SFÉRY.

## Válečník (7b.1, v0.8.0)

- Data: `tools/h08_valecnik_src.py` → `docs/h08_valecnik.json`, `tools/ppp01_valecnik_src.py` → `docs/ppp01_valecnik.json`
  (Cesty, schopnosti, specializace + 93 triků), `tools/build-valecnik.py` → `src/data/valecnik.json` (triky s druhem pro boj,
  cenou, podmínkami naučení `learn`, krátkým shrnutím `x` a plným textem; školy, Cesty s číselnými bonusy, pravidla schopností)
  a přepíše blok `valecnik` v `src/data/progression.json`. Triky válečníka už nejsou v `combat-magic.json`.
- `rules/valecnik.ts` – `knownWarriorTricks`, `learnCtx` / `trickLockReason` (škola, 6. úroveň, specializace, Mistr Cesty,
  Zručnost se zbraní / Vícenásobný útok), `trickPrice` (Rutina), `weaponGroups` / `weaponPath` (skupina zbraně pro Mistrovství,
  Cesta podle názvu), `weaponBonus` (bonusy ke zbrani do derive), `situationalNotes`, `selfHeal`.
- `AbilityDef` nově: `maxRank`, `levelStep`, `ranks` (Cesty = opakovaná schopnost, stupeň = počet), `param` (Mistrovství ve zbrani
  → `LearnedAbility.params.group`, `LevelUpState.pickParams`). `options()`: bez specializace 1 schopnost specializace na každé
  6. úrovni. `itemPool()` u válečníka = `warriorPool` (triky podle `learn`, `branchId` = škola kvůli limitu 1 za úroveň).
- `derive`: `WeaponRow.damageTotal`, `bonusParts`; štít + zbraň (Škola se štítem), Zakrytí (štít v ZO), Mistr zbroje (+3 KZ),
  Železný muž (zbroj se nepočítá do naložení), Mrštnost (jen bez zbroje / v lehké), Životní zkušenost přes id specializace,
  iniciativa z Cesty jen se zbraní v ruce.
- Model: `ClassState.valecnik` = `WarriorState { combatStyle, grip }`, `CombatState.shout` (výkřik 1× za kolo); `migrate()` doplní.
- `combat.ts`: `TrickDef = WarriorTrick`, `trickWhy/applyTrick(c, d, t, price)` podle druhu triku; Urputnost v `hpState`/`turnCtx`,
  Tuhý kořínek v `rest`/`sleep`. UI `pages/Valecnik.tsx` (5. záložka), styly `theme/valecnik.css`.

## Hraničář (7c.1, v0.9.0)

- Data: `tools/h09_hranicar_src.py` → `docs/h09_hranicar.json`, `tools/ppp02_hranicar_src.py` (z přepisu `docs/pravidla/PPP02_Hranicar_AI.json`)
  → `docs/ppp02_hranicar.json`, `tools/build-magie.py` → `src/data/magie.json` (kouzla hraničáře i kouzelníka, jednotné schéma s `learn`),
  `tools/build-hranicar.py` → `src/data/hranicar.json` (pravidla, směry, texty schopností, specializace, pasti H09) + blok `hranicar` v `progression.json`.
- `progression/levelup.ts`: `AbilityDef.grantsItems` (schopnost dá všechna svá kouzla – zobrazí se v přestupu), `ClassProgression.levelGrants`
  (automatické zisky úrovně, i profesní dovednosti přes `skillGrants`).
- `rules/hranicar.ts`: `RANGER`, `RANGER_SPELLS`, `spellLock` / `knownRangerSpells` (vše automaticky, `learn.requires` + `minLevel`), `toSpellDef`
  (pro `knownSpells` v `combat.ts`), `rangerRound` (Rychlá střelba, Bojová hůl – `roundInfo` ho použije místo válečnických počtů),
  `rangerWeaponBonus` (derive), `rangerNotes`, `restoreWhy`, `trapWhy`. `ActiveWeapon.name` kvůli rozpoznání luku.
- `derive`: Ostražitost (efekty), Světoběžník (násobek bodů +1 jako Laboratorní specialista), Moudrost (ZO z INT, je-li lepší).
- UI `pages/Hranicar.tsx` na 5. záložce (PŘÍRODA); styly převzaté z válečníka a alchymie (`va-*`, `al-*`, `recipe`).

## Kouzelník (7c.2, v0.10.0)

- Data: `tools/build-kouzelnik.py` → `src/data/kouzelnik.json` (pravidla H11, mapa obor ↔ větev, 42 schopností s krátkým textem,
  plným zněním z přepisu `docs/pravidla/PPP04_Kouzelnik_AI.json` a strojovými parametry, specializace, hůl a její varianty,
  pokročilý kouzelník) + blok `kouzelnik` v `progression.json` (6 oborů, 6 H11 + 12 PPP04 od 6. úr. + 3 × 8 specializačních
  schopností, Magistr s parametrem `obor`, `extraItems: 3`; Sběratel duší `grantsItems`). Kouzla dál v `src/data/magie.json`.
- `progression/levelup.ts`: `AbilityDef.extraItems` (jednorázově položek navíc), `paramOptions` / `pickParam` filtrují obor na ovládané,
  `magisterWhy` (3 kouzla oboru Magistra) v `canNext`; `itemPool` u kouzelníka = `wizardPool` (obecná + obory, PPP04 od 6. úr.
  a se specializací, i s volbou z téhož přestupu; `branchId` = obor kouzla).
- `rules/kouzelnik.ts` (čisté): `knownWizardSpells`, `learnLock`, `wizardCtx`, `castProfile` (délka, obtížnost, bonus, cena podle
  voleb a schopností), `wizardSpellDefs` (pro `knownSpells`), mana (`manaCap`, `meditateWhy`, `drawWhy`, `bloodWhy`), hůl,
  aktivní kouzla (`activeFromCast`, `wizardZo`, `hasteOn`, `shortCap`, `hasteRound`), `wizardWeaponBonus`, `swapsLeft`, `wizardNotes`.
- `rules/kouzelnik-akce.ts` (změny stavu přes `record`): meditace, nasátí, nový den, Rituál krve, hůl / dýka, `castOutside`,
  triky, aktivní kouzla, Záměna kouzel, Magická dominance, Mentální souboj, mentální techniky.
- Model: `ClassState.kouzelnik` = `WizardState { manaDrawsToday, meditatedToday, staff, active, mods, swaps }`, `CombatState.wiz`,
  `PlayState.undo[].wiz` (Vrátit vrací i stav kouzelníka); `migrate()` doplní z `emptyWizard()`.
- `combat.ts`: `turnCtx.free = shortCap − k` (Rychlost = 3 krátké), dlouhá akce = `free ≥ 2`; `SpellDef.adj` / `free`; `spellCheck`
  (ověření s bonusy kouzla), `staffSplit` (platba z hole), `withActiveSpell`; Bojové sesílání (K kouzlo bez akce, obrana i při D);
  `newRound` ukončí aktivní kouzla. Kouzelník už nebere kouzla z `combat-magic.json`.
- `derive`: ZO z aktivních kouzel, Bitevní trénink (ZO +1, ÚČ +1), Posílená ochrana (ZO +2).
- UI `pages/Kouzelnik.tsx` (5. záložka), `pages/KouzelnikBoj.tsx` (panel v boji).

## Přátelé a zvířata (7c+, v0.11.0)

- Data: `tools/build-pratele.py` → `src/data/pratele.json` (`druhy` – 18 druhů z H09, V14, PPP02, H11, PPP04, PPP05; `rust` podle druhu
  přítele; `pravidla` – texty pro záložku; `magSkillAttr` – atribut dovedností kouzelníkova přítele).
- Model: `Companion` (`model/types.ts`) = `kind` (zvire / kun / mag / lup), `typeId`, `status` (active / dead / released), `joinedLevel`,
  `endedLevel`, `pj`, `stats: CompanionStats` (hodnoty druhu při získání, upravitelné; u přítele kouzelníka základ bez úrovně), `hpCurrent`,
  `manaCurrent`, `spells`, `notes`, `grow: CompanionGrowth[]` (růst při přestupu), `champion`, `inFight`. `migrate()` doplní starší
  záznamy z `emptyCompanion()`. Schéma zůstává v1.
- `rules/pratele.ts` (čisté): `companionView` (odvozené hodnoty – růst, šampion, úroveň kouzelníka, hranice smrti), `acquireWhy`,
  `kindAllowed`, `packLevel`, `tame` / `tameBonus`, `summon` / `summonWhy`, `addCompanion`, `companionHp` / `companionMana` / `refillMana`,
  `endCompanion`, `removeCompanion`, `makeChampion`, `packBonus`; přestup `growingCompanions`, `companionStepWhy`, `applyCompanionGrowth`,
  `describeGrowth`. Změny během hry jdou přes `record()` – `PlayState.undo[].comp` drží přátele pro Vrátit.
- Napojení: `combatMods` přičte Boj ve smečce; `derive` −2 max. Duševní síly, je-li v deníku Zvířecí šampion; přestup má krok `pratele`
  (`LevelUpState.companions`, `companionSpellPool`), záznam přestupu `slot: 'companion'`.
- UI `pages/Pratele.tsx` (záložka PŘÁTELÉ; `PrateleBoj` na záložce Boj a stavy), styly `theme/pratele.css`.

## Klerik (7d, v0.12.0)

- Data: `tools/h13_klerik_src.py` → `docs/h13_klerik.json`, `tools/ppp06_klerik_src.py` → `docs/ppp06_klerik.json` (prosby zapsané ve tvaru
  pravidel, parser `parse_block`), `tools/build-klerik.py` → `src/data/klerik.json` (prosby s `cena` {base, perLevel, per {cost, unit, min}, alt},
  `obtiznost` {base, step}, `vyvolani`, `learn.requires` = nauka / schopnost, `fx` = strojové efekty) + blok `klerik` v `progression.json`.
- `rules/klerik.ts` (čisté): `knownPrayers`, `prayerLock`, `prayerPrice`, `prayerDc`, `prayerCheckBonus`, `prayerWhy`, `activeFromPrayer`,
  `afterPrayer` (po zaplacení: aktivní prosba, posel, Oběti, Zastavení dění), `clericZo`, `clericWeaponBonus`, `clericRound` (Fanatismus),
  `clericManaAdjust` (Asketismus, Ikony), `divineArmorBonus`, `noKnockout`, `messengerStats`, `rollFormula`, `clericNotes`.
- `rules/klerik-akce.ts` (přes `record`): `pray`, `missPrayer`, `newDay`, `call`, `consecrate`, `grantFavor`, `prayOutside`, `rollHeal`/`rollDamage`,
  `healSelf`, `hitBarrier`, `removeActive`, posel, `service`, `flagellation`, `blessing`, `offering`, ikony, sakrální předměty, Avatar, `miracle`, léky.
- Model: `ClassState.klerik` = `ClericState` (modlitby, Zvolání, přepínače, Ikony, Sakrální předměty, Avatar, `mods: ClericCastMods`,
  `active: ClericActivePrayer[]`, `messenger`), `CombatState.cle`, `PlayState.undo[].cle`; `migrate()` doplní z `emptyCleric()` (zahodí `activeAura`).
- `combat.ts`: `knownSpells` u klerika = `prayerDef` (SpellDef s `units` a `dcAdj`, cena přes `adj`), `spellCheck` + `prayerCheckBonus`,
  `castSpell` → `afterPrayer`; `newRound` ukončí prosby, posla a Avatara (Božská pomoc vezme dočasné životy), `endCombat` ukončí kolové prosby;
  Inkvizitorský výcvik jako Urputnost. `derive`: ZO z prosob, bonusy ke zbrani, Boží zbroj, max. Přízně.
- UI `pages/Klerik.tsx` (5. záložka VÍRA), `pages/KlerikBoj.tsx` (panel v boji + sdílené `ClericCastOptions`).

## Zloděj (7e, v0.13.0)

- Data: `tools/h12_zlodej_src.py` → `docs/h12_zlodej.json`, `tools/ppp05_zlodej_src.py` → `docs/ppp05_zlodej.json`, `tools/build-zlodej.py` →
  `src/data/zlodej.json` (triky s `skupina` = umění / schopnost, `skill` = ověřovací dovednost, `boj` utok / misto / obrana / akce, `once`, `fx`;
  schopnosti s krátkým i plným textem, specializace s automatickými schopnostmi, předměty, jedy, zbraně cechu, síť, Důvěrník) + blok `zlodej`
  v `progression.json`; build doplní `skills.json` (Umění přepadů, neférového boje, boje s pláštěm), `vyzbroj.json` (`zl`: assassin / gentleman / improv,
  improvizované zbraně) a `gear.json` (bomby a udělátka, `grp: zlodej`).
- `rules/zlodej.ts` (čisté): `knownThiefTricks`, `trickLock`, `trickCheck` / `thiefSkillBonus` (Alter ego), `trickCombatWhy`, `thiefWeaponBonus`,
  `strReqAttr` (Technika nabíjení), `thiefDualWhy`, `thiefRound` (Vrhání dýk, Svižné ostří, Riskantní útok – `roundInfo` ho použije místo válečnických počtů),
  `thiefCombatMods` (Bojová kreativita do `combatMods`), `positionReady`, `thiefNotes`, síť (`networkLimit`, `monthlyPay`, `actionCost`, `actionBonus`).
- `rules/zlodej-akce.ts`: `commit()` → `ThiefState.log` + `undo` (stav zloděje + zbraně, výbava, peníze) – Nový den, Druhá šance, Zrcadlení, jedy,
  `craftGadget` (přes `acquire`), `craftTrap`, síť (`addMember`, `payMonth`, `skipMonth`, `runAction`), pověsti, identity; v boji přes `record()`:
  `useTrick`, `aim`, `risky`, `creative`, `positionAttack`, `regainPosition` (stav v `CombatState.zlo`).
- Model: `ClassState.zlodej` = `ThiefState`, `CombatState.zlo` = `ThiefCombat`, `CompanionKind` + `duv` (Důvěrník, `CompanionGrowth.hp/skill`),
  `WeaponInfo.zl`, `ActiveWeapon.category`; `migrate()` doplní z `emptyThief()`. Kostka `k6x6` v `rules/dice.ts`.
- `derive`: Mistrovství … +1, Šestý smysl, Mistr útěku (efekty), bonusy ke zbraním, přetížení kuše podle OBR, Boj se dvěma zbraněmi (`zlodej.offhand`).
- UI `pages/Zlodej.tsx` (5. záložka UMĚNÍ), `pages/ZlodejBoj.tsx` (panel v boji).

## Rodové schopnosti a záchranné hody (3. 10. 2026)

- `rules/rasy.ts`: `RACE_ABILITY` – plné znění z H04, druh (auto / situ / info) a situační bonus (dovednosti, kdy); `raceSkillNote`,
  `SAVE_SKILLS` (Atletika, Vůle, Postřeh, Výdrž, Hbitost). Situační bonusy se do `derive` nepočítají (✔ U – rozhoduje PJ).
- `ui/InfoBubble.tsx` – malé tlačítko (i) s popoverem (`Popover` z `FormulaPopover`). Použito u rodové schopnosti (Postava) a u dovedností.

## Záloha, import a tisk (Fáze 8, v0.14.0)

- `storage/backup.ts` – čistá logika bez DOM: `exportJson` (obálka `format: 'dh-denik/postava'`, `formatVersion`, `appVersion`,
  `exportedAt`, `summary`, `character`), `exportFileName` (bez diakritiky), `parseImport` (obálka i holá postava, BOM, `migrate()`,
  varování: jiná postava / starší záloha téže postavy), automatické zálohy v prohlížeči (`dh-denik/zalohy`, max. 6, poškozená data
  jako text), `markExported` / `daysSinceExport` v `dh-denik/nastaveni`.
- `store.replaceWith(next, reason)` – jediná cesta, jak nahradit postavu (import, průvodce, prázdný deník, ukázka, obnova):
  zazálohuje současnou postavu, smaže „Vrátit poslední přestup“, uloží hned (bez zpoždění). Akce `replace` reduceru zůstává jen
  pro interní použití.
- `ui/ConfirmDialog.tsx` – nativní `<dialog>` (Esc = Zpět, fokus na bezpečné volbě); `window.confirm` se v appce nepoužívá.
- `ui/download.ts` – stažení přes Blob + `<a download>`, sdílení souboru přes Web Share API (jen kde `navigator.canShare` umí soubory).
- `pages/Tisk.tsx` + `theme/zaloha.css` (`@media print`, A4) – souhrn na papír / PDF; v tisku se skryje navigace, lišta a kostky.
- Verze appky: `__APP_VERSION__` z `package.json` (`vite.config.ts` → `define`, deklarace v `src/env.d.ts`).
