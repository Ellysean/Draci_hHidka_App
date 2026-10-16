# 7c – Hraničář a Kouzelník (magie)

> Stav k 1. 10. 2026. Doplňuje `PLAN.md` (Fáze 7 → 7c). Až bude repo zase po ruce,
> promítnout do `PLAN.md` v projektu i v repu.

## Rozdělení (podle vzoru 7b)

- **7c.0 Data** – ✅ hotovo 1. 10. 2026 (bez přístupu k repu, v cloudu):
  - `docs/h09_hranicar.json` ← `tools/h09_hranicar_src.py` (v projektu `claude/data/`, `claude/tools/`) – 13 kouzel H09 s plným zněním
    (4 základní + 3 směry × 3), 3 směry s efekty (+10 pohyblivost, +1 Znalost přírody, +1 Zvládnutí zvířat),
    9 volitelných schopností s efekty jako data (`grantsSkill`, `efekty[]`, Rychlá/Přesná střelba pro boj),
    3 specializace (podmínky podle H09), pravidla sesílání (Pouto s přírodou, vyrušení −5, bez gest).
  - `docs/h11_kouzelnik.json` ← `tools/h11_kouzelnik_src.py` – 49 kouzel H11 s plným zněním
    a zaklínadlem (13 obecné magie + 6 oborů × 6), u obecných i obor podle PPP04 s. 213; 6 volitelných
    schopností (Koncentrace many, Kouzlení z knih, Paměť na kouzla, Rituál krve, Rychlé kouzlení,
    Vyvolání přítele) s parametry pro sesílání; pravidla (meditace, nasátí, triky, postihy −5/−5/−10,
    zbroj = −kvalita, vyrušení +5 obtížnost, 1 kouzlo za tah).
  - `claude/tools/spell_norm.py` – převod textu na strojové hodnoty: `cena` (base, per, variable,
    perTargetLevel, alt), `obtiznost` (base, step, stepPer), `vyvolani` (kind okamzita/kratka/dlouha/kola/
    minuty/smeny/hodiny, n, rounds). Text pravidel zůstává vedle.
  - `claude/tools/build-magie.py` – v repu sloučí `docs/h09_hranicar.json` + `docs/ppp02_hranicar.json`
    a `docs/h11_kouzelnik.json` + `docs/ppp04_kouzelnik.json` do `src/data/magie.json` (jednotné schéma,
    `learn.mode` auto/pick, `learn.requires`, `learn.minLevel`). Otestováno na vzorku PPP; ostrý běh v repu.
- **7c.1 Hraničář** – ✅ hotovo 1. 10. 2026 (v0.9.0) – záložka HRANIČÁŘ (Duševní síla, směry, kouzla, schopnosti, pasti), přestup
  (směry → automatická kouzla, PPP02 schopnosti a specializace), boj (kouzla s délkou a cenou, Přesná
  a Rychlá střelba, Bojová hůl, Utužení…).
- **7c.2 Kouzelník** – ✅ hotovo 1. 10. 2026 (v0.10.0, detail v `PLAN.md`) – záložka KOUZELNÍK (mana, meditace, nasátí, triky, kouzla s filtrem podle oborů),
  přestup (3 + 2/úroveň, Paměť na kouzla, obory, PPP04 kouzla a schopnosti), boj (postihy, Rychlé
  kouzlení, Rituál krve, Magický štít/Zbroj do ZO, Rychlost = akce navíc).
- **7c+** – Přátelé a zvířata (beze změny, viz `PLAN.md`).

## Stav dat k 1. 10. 2026 (večer)

- ✔ **PPP02 dodáno** jako úplný přepis `docs/pravidla/PPP02_Hranicar_AI.json` (50 stran po blocích) →
  `tools/ppp02_hranicar_src.py` → `docs/ppp02_hranicar.json` (95 položek: 83 kouzel, 6 magických pastí,
  6 odvarů; skupiny sedí 1:1 s ručním výtahem v projektu).
- ✔ **PPP04 dodáno** jako úplný přepis `docs/pravidla/PPP04_Kouzelnik_AI.json` → `tools/ppp04_kouzelnik_src.py` →
  `docs/ppp04_kouzelnik.json` (96 kouzel pro pokročilé se zaklínadlem, oborem a specializací; Bojový mág 13,
  Čaroděj 13, Nekromant 14).
- ✔ `src/data/magie.json` **kompletní**: hraničář 108 položek (H09 + PPP02), kouzelník 145 kouzel (H11 + PPP04).
  Všechna kouzla mají strojově cenu, obtížnost a délku vyvolání. **Data pro 7c jsou hotová.**

## Rozhodnutí

- ✔ U 1. 10. 2026: **Hibernaci (PPP04 s. 216) umí jen Nekromant** (podle pole Vyžaduje; v seznamu oboru je bez značky).

- ✔ U 1. 10. 2026: **Tabulka pastí H09 dodána celá** (Jáma 10, Čelisti 6, Beranidlo 12, Oko 8 – výroba, vybavení,
  obtížnost, popis); účinky převedeny i strojově (`ucinek`: zranění, záchranný hod, uvěznění, otřesení…).

- ✔ U 1. 10. 2026: **obor kouzelníka kouzlo navíc nedává** (H11 s. 14 to sice píše, platí `CLASSES.md`).
- ✔ U 1. 10. 2026: **PPP02 „Další hraničářská kouzla“** dostane hraničář automaticky od 6. úrovně,
  ale jen ta, ke kterým zná příslušný směr magie.
- ✔ U 1. 10. 2026: **specializace dává své věci automaticky** (zvláštní schopnosti specializace, např.
  Druidova kouzla, Vytrvalost, Smečka) – volitelné schopnosti specializace se vybírají. Kouzla, která
  patří ke zvolené schopnosti (Hraničářský luk, Chodecká magie, Magie lesa…), dostane hraničář
  automaticky všechna.
- ✔ U 1. 10. 2026: **kouzla pro pokročilé PPP04** se učí do běžných slotů (+2/úroveň) až od 6. úrovně
  a jen se znalostí oboru (u označených i specializace).

## Otevřené

1. Štítek „Magie přírody“ u kouzla Zvířecí smysly (vyžaduje Magii zvířat) – ponecháno podle textu.

## Pro navázání v repu

1. Nakopírovat `tools/*.py` a `docs/h09_hranicar.json`, `docs/h11_kouzelnik.json` do repa
   (balíček `7c-data.zip`), `docs/ppp02_hranicar.json` a `docs/ppp04_kouzelnik.json` z projektu.
2. `python tools/build-magie.py` → `src/data/magie.json`.
3. Napojit na `progression.json` (větve hraničáře = směry, kouzelníka = obory; schopnosti s `efekty`,
   `grantsSkill(s)`, `extraItemsPerLevel`) a nahradit výřez kouzel v `combat-magic.json`.
