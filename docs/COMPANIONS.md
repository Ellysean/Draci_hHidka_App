# Přátelé a zvířata (modul, přidán 18. 9. 2026, prototyp v9 / v9.1; v appce od 7c+, v0.11.0)

Přání uživatele: spravovat přítelíčky / zvířata (hlavně smečku Pána zvířat) přímo v appce.
Rozsah odsouhlasen ✔ U: všechny 4 druhy × karta + životy, boj, rozvoj při přestupu, ochočení/vyvolání.

## Stav v appce (1. 10. 2026, v0.11.0)

- Záložka **PŘÁTELÉ** (`src/pages/Pratele.tsx`), logika `src/rules/pratele.ts`, data `src/data/pratele.json`
  (`tools/build-pratele.py`). Technický popis v `ARCHITEKTURA.md` → Přátelé a zvířata.
- Karta: jméno, druh, životy (−5 −1 +1 +5, bezvědomí na 0, hranice smrti −(10 + ODO)), mana (kouzelníkův přítel, doplnění při
  meditaci), úroveň, velikost, pohyb, ZO, OČ s hodem obrany, útoky s hodem, dovednosti a triky s hodem k10, kouzla přítele,
  talent / zvláštní schopnosti, ruční úprava hodnot, V boji, Zemřel / Rozloučit se, Učinit šampionem.
- Boj: panel PŘÁTELÉ V BOJI na záložce Boj a stavy; Boj ve smečce v postizích; Vrátit vrací i přátele.
- Přestup: krok Přátelé (růst zvířete, parťáka, kouzla kouzelníkova přítele).
- Poslové klerika (H13) → 7d.

## Druhy a podmínky

| Druh | Kdo | Limit | Zdroj |
|---|---|---|---|
| Zvířecí přítel | Hraničář s Ochočováním zvířat | 1 zvíře | H09 |
| Smečka | Hraničář – Pán zvířat | součet úrovní zvířat ≤ úroveň PZ | PPP02 |
| Hraničářův kůň | Hraničář se schopností Hraničářův kůň (od 6. úr.) | 1 | PPP02 |
| Kouzelníkův přítel | Kouzelník s Vyvoláním přítele; had/havran/netopýr od 6. úr. | 1 | H11, PPP04 |
| Lupičův parťák | Zloděj Lupič se schopností Lupičův parťák | 1 | PPP05 |
| (7d) Posel | Klerik s naukou Božích patronů – dočasně povolaný | – | H13 (`claude/data/pratele.json` → messengers) |

Mimo podmínky jde přítele přidat „se souhlasem PJ“ (označí se).
Po ztrátě: nový až po dalším přestupu (hraničář jen po smrti; ostatní i po rozloučení).
Kouzelník si mrtvý druh už nikdy nepřivolá.

## Získání
- Ochočení: 1k10 + Ochočování zvířat (+5 mládě, +5 Spřízněnost se zvířaty) > ochočitelnost (H09 / V14). Trvá 1k6 směn, neúspěch → další pokus o stejné zvíře zítra. Bez dovednosti nelze (V14).
- Vyvolání: 1k10 + Sesílání kouzel > obtížnost druhu; vyžaduje plnou manu, vyzáří se celé maximum i při neúspěchu. Kouzla přítele jen z kouzel pána.
- Parťák, kůň: bez hodu (kůň – pouto 1 hodina).

## Hodnoty
- **Zvířecí přátelé H09 s. 14** (úplný přepis od uživatele 1. 10. 2026, `docs/pravidla/hranicar/H09_Zvireci_pratele_AI.json`): pes (ochočitelnost 4, úr. 1, vel. A, zuby 5/+2), vlk lesní (9, úr. 1, A, zuby 6/+2), sokol (10, úr. 1, A1, spáry 1/+3) – atributy, životy, pohyb, ZO, OČ, dovednosti, talent pro pána.
- **Bestiář V14:** vlk šedý, vlk alfa, rys, medvěd (Pán zvířat, nebo se souhlasem PJ); jiný tvor s ručními hodnotami.
- **Hraničářův kůň (PPP02 s. 66):** 21 životů, 2. úroveň, velikost C, pohyb 65, kopyta 8/+3, ZO 5, OČ 6, Atletika 7, Postřeh 8, Orientace 5, Plavání 3, odkopnutí. Růst pravidla neuvádějí.
- **Růst zvířecího přítele (H09):** za každou úroveň dosaženou spolu +3 max. životy a 2 vybrané dovednosti +1 (známé, nově Atletika, Akrobacie, Výdrž, Postřeh, Vůle); každá 3. taková úroveň ÚČ, zranění, ZO a OČ +1; bez zpětné opravy. Úroveň zvířete +1 za každý růst (výklad). Pán zvířat: při přestupu jen jedno zvíře ze smečky (PPP02).
- **Kouzelníkův přítel (H11 s. 16, PPP04 s. 193–194):** životy základ + 2×úr., mana základ + úr., kouzel základ + úr., ÚČ/OČ +1 za 2 úr., ZO +1 za 4 úr.; dovednosti = úr. + atribut tvora (Postřeh s INT pána); Sesílání = stupeň + INT pána. **Výklad (k potvrzení):** tabulka PPP04 se počítá stejně jako H11 (hodnoty = základ); u had/havran/netopýr nejsou atributy → Postřeh z tabulky.
- **Parťák (PPP05 s. 260):** potkan, papoušek, kočka, opice; +2 životy za úroveň dosaženou spolu; každá 3. společná úroveň: ÚČ nebo ZO/OČ +1, Postřeh +1, 1 trik +1.
- **Zvířecí šampion:** velikost +1, +20 životů, +15 pohyb, +3 ÚČ i ZO (tím i OČ); max. DS pána −2 natrvalo.
- **Boj ve smečce:** +1 ÚČ/OČ pána za zvíře v boji (max +5).

## Chybí v podkladech
- Nic pro přátele hraničáře, kouzelníka a zloděje. Atributy a útok posla bojovníka (H13) – řeší se v 7d.
- „Speciální výcvik“ z PPZ H 1.1 s. 65 – bere se jako růst podle H09; volné zápisky v poznámkách karty.
