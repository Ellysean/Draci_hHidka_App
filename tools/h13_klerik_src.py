"""Klerik H13 (Pravidla pro začátečníky 1.2.5) → docs/h13_klerik.json   (7d.0)

Přepis z textové vrstvy H13_Klerik_1.2.5_FINAL.pdf (projekt). Prosby jsou zapsané ve stejném
tvaru jako v pravidlech a převádí se parserem níže; strojová pole (cena, obtížnost, vzývání)
doplní tools/build-klerik.py přes tools/spell_norm.py.

Tabulka poslů (H13 s. 17) je v PDF obrázek – hodnoty viz POSLOVE níže (částečně z OCR,
✔/⚠ v poznámce); Tabulka přízně je v src/data/tables/energie.json (PPP06 s. 280).
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "h13_klerik.json"

PRAVIDLA = {
    "prizen": "Klerici nemají vlastní magickou moc – čerpají z boží Přízně. Maximum určuje Charisma a úroveň (Tabulka přízně). V deníku se zapisuje do políčka Mana.",
    "modlitby": "Pravidelné modlitby 3× denně (svítání, poledne, západ slunce – ověř u PJ), každá asi 1 směnu v klidu. Po modlitbě se aktuální Přízeň zvýší o ⅓ maxima (zaokrouhleno nahoru), nikdy nad maximum. Vynechaná modlitba: nejdřív varování (modlitba nevrátí nic), opakovaně ztráta náklonnosti boha.",
    "zvlastni_prizen": "Za mimořádný skutek může PJ přidělit jednorázovou Přízeň – ta smí přesáhnout maximum.",
    "uceni": "Na začátku hry zná klerik 5 základních proseb, na 2. úrovni získá 6 obecných proseb vyšší úrovně. Každá ovládnutá teologická nauka dá automaticky všechny své 4 prosby.",
    "provadeni": "Ohlásit PJ, odepsat Přízeň (nikdy pod 0) a hodit Prosby (CHAR) + k10 – výsledek musí být VYŠŠÍ než Obtížnost. V každém kole nejvýš 1 prosba.",
    "odrikani": "Prosby se odříkávají. Kdo nemůže (roubík, ztráta hlasu) nebo nechce, má Nevýhodu −5.",
    "souverci": "Prosba na tvora stejné víry stojí o 1 Přízeň méně (vždy aspoň 1); u větších rozsahů se sleva počítá jen jednou.",
    "temna": "U části proseb existuje temná alternativa. Prosba je vyslyšena ve variantě, o kterou klerik žádal; během trvání ji nelze přepnout.",
    "x_prizen": "Je-li v ceně X nebo cena za posílení či prodloužení, klerik určí, kolik Přízně vloží – při vzývání, později už ne. Nestačí-li, prosba se nezdaří a Přízeň propadne.",
    "dosah": "Sesilatel = jen na sebe; dotek = klerik se cíle dotkne (i posvátným symbolem).",
    "trvani": "Ihned = jednorázový efekt; trvání v kolech se počítá od kola po úspěšném vzývání. Klerik může prosbu kdykoli ukončit myšlenkou.",
    "vzyvani": "Okamžité prosby jdou v rámci jiné akce, krátká a dlouhá akce nabudou efekt po skončení akce, delší se uvádí v kolech, směnách či hodinách (dlouhé akce). Vyrušení (zranění) při vzývání = Nevýhoda −5. Okamžité prosby a Zvolání se ohlašují vždy před ověřovacími hody.",
    "zvolani": "V nejvyšší nouzi (posoudí PJ) může klerik zvolat k bohu: prosba je vyslyšena okamžitě, kdykoli během tahu i mimo něj, i bez Přízně. Nejvýš 1× za úroveň; když není vyslyšen, možnost na dané úrovni propadá; nevyužitá se nepřenáší.",
    "overeni": "Některé prosby vyžadují ověření proti cíli (volitelné pravidlo). Bez něj se bere jako automatický úspěch klerika.",
    "vyssi_moc": "Vyšší moc nadpozemských bytostí, nemrtvých a neviděných určuje obtížnost jejich vymítání a odvracení.",
    "svaty_symbol_jine_viry": "Posvátný symbol jiného boha nasazený klerikovi: Nevýhoda −5 ke všem prosbám; u relikvií úplné umlčení (PPP06 s. 282).",
    "posvatna_mista": "Na posvátném místě svého boha Výhoda +5 a prosby 2× silnější / delší; klerici jiných bohů −5. Na prokletých místech žádná prosba (PPP06 s. 281).",
}

SVECENI = {
    "nazev": "Svěcení", "strana": 3,
    "text": "Základní rituál: 1 Přízeň, bez ověřovacího hodu, asi 1 minuta. Posvětí litr tekutiny (5 flakónů svěcené vody) nebo jeden předmět. Posvěcená zbraň má proti běsům, ďáblům, démonům, nemrtvým, neviděným a temným bytostem dodatečné svěcené zranění 1k6 – do konce prvního souboje s nimi. Flakón svěcené vody jim způsobí popáleniny 2k6. Další efekty určuje PJ.",
}

NAUKY = [
    ("bojovnici_viry", "Bojovníci víry", "+1 k Útočnému číslu.", "Prosby vyslyšené okamžitě, bez zvláštního soustředění – určené k boji."),
    ("bozi_patroni", "Boží patroni", "Přivolání poslů (nadpozemských patronů).",
     "Poslové jsou při vstupu na svět viditelní, ale nehmotní; procházejí zdmi, drží se v dosahu prosby a s klerikem komunikují mentálně. Proti jejich útokům nechrání nemagické ani neposvěcené vybavení (nezapočítává se do ZO ani OČ). Běžné zbraně je nezraní – jen magické zbraně a magie; jiný klerik je může odvrátit či vymítat. Vnímají živé i neživé, nejde je oslepit ani se před nimi skrýt neviditelností. Povolat lze jen jednoho posla, dalšího až po pravidelné modlitbě. V boji posla obvykle hraje klerik; PJ může převzít kontrolu, jedná-li posel proti doméně boha."),
    ("demonologie", "Démonologie", "+1 k Útočnému i Obrannému číslu proti běsům, ďáblům, démonům, nemrtvým, neviděným, přírodním, světlým a temným bytostem.", "Znalosti o tvorech čerpajících sílu vyšších sfér – vidět je, mást je a odvracet."),
    ("milosrdenstvi", "Milosrdenství", "+1 k ověření dovednosti První pomoc.", "Porozumění nemocem těla i duše – zbavit bližního nemocí, zranění a paralýzy."),
    ("svata_pravda", "Svatá pravda", "+1 k ověření dovednosti Vůle.", "Prosby k odhalení, prohlédnutí a zlomení kacířů, jinověrců a čarodějnic."),
    ("zehnani_aurami", "Žehnání aurami", "Čtení aur: na první pohled pozná, zda je bytost nemocná, prokletá či požehnaná.",
     "Posilující a ochranné aury pro jednotlivce i skupiny. V jednu chvíli smí mít klerik vyprosenu jen jednu auru (další až po skončení předchozí). Stejné aury více kleriků se nesčítají, různé fungují bez omezení."),
]

SCHOPNOSTI = [
    ("bozi_bojovnik", "Boží bojovník", 8, "+2 do ÚČ a OČ."),
    ("dar_slitovani", "Dar slitování", 8, "Ve smrtelném nebezpečí další (záchranný) hod 1k10 – použije se výhodnější. Jen při ověření proti pasti či ověřovacím hodu na dovednost, ne k útoku či obraně."),
    ("osviceni", "Osvícení", 9, "+2 Přízně za každou úroveň (zpětná oprava)."),
    ("posvatny_symbol", "Posvátný symbol", 9, "Se symbolem v ruce +2 ke vzývání proseb, od 6. úrovně +3. Symbol musí držet v ruce – nejde zároveň obouruční či střelná zbraň (není-li symbolem zbraň sama)."),
    ("pozehnane_zdravi", "Požehnané zdraví", 10, "+2 životy za každou úroveň (zpětná oprava) a imunita vůči nemocem (ne vůči stáří)."),
    ("ritualy_a_obrady", "Rituály a obřady", 10, "Obřady a rituály (bez nových proseb): usmíření boha; je-li vztah dobrý, +3 k ověření Prosby (CHAR) na 1 den. Základní rituály: Křest (1 směna, zaslíbení či konverze souhlasícího) a Pohřební rituál (1 směna, tělo už nejde oživit ani zneužít nekromancií; temná alternativa uvězní duši)."),
]

SPECIALIZACE = [
    ("bojovy_mnich", "Bojový mnich", ["bojovnici_viry", "svata_pravda", "bozi_bojovnik"],
     "Ocelová pěst víry: rozpozná kacíře, odpadlíky i čarodějnice, přiměje je mluvit a exceluje v boji."),
    ("exorcista", "Exorcista", ["bozi_patroni", "demonologie", "osviceni"],
     "Bojovník na hranici vyšších sfér: vidí nepostřehnutelné bytosti, pozná je, odvrátí a vymítá; umí přivolávat božské bytosti."),
    ("knez", "Kněz", ["milosrdenstvi", "zehnani_aurami", "pozehnane_zdravi"],
     "Duchovní vyššího svěcení: léčí a zachraňuje, vládne aurami, činí zázraky a snad i oživuje mrtvé."),
]

# Tabulka poslů H13 s. 17 je obrázek – hodnoty z OCR (claude/data/pratele.json → messengers) a z příkladu
# v textu (Posel bojovník na 4. úrovni: 20 životů, ÚČ 10/+1 (meč), OČ 10, ZO 9). ⚠ k ověření u uživatele.
POSLOVE = {
    "_zdroj": "H13 s. 17 Tabulka poslů (obrázek, OCR částečně nečitelné) + příklad u Posla bojovníka",
    "uroven": "úroveň klerika", "vyssi_moc": "úroveň klerika + 10",
    "spolecne": "Nehmotní, levitují; proti jejich útokům nechrání nemagické vybavení; zraní je jen magické zbraně a magie.",
    "list": {
        "posel_bojovnik": {"n": "Posel bojovník", "hpPerLevel": 5, "mobility": "25 (levitace)", "attack": "meč", "uc": 8, "dmg": 1, "zo": 8, "oc": 8, "growth": "příklad 4. úr.: ÚČ 10/+1, OČ 10, ZO 9", "ok": False},
        "posel_rovnovahy": {"n": "Posel rovnováhy", "hpPerLevel": 4, "mobility": "50 (levitace)", "attack": "obušek", "uc": 6, "dmg": 3, "zo": 8, "oc": 8, "ok": False},
        "posel_stezky": {"n": "Posel stezky", "hpPerLevel": 2, "mobility": "50 (levitace)", "attack": None, "zo": 7, "oc": 7, "ok": False},
        "posel_umlceni": {"n": "Posel umlčení", "hpPerLevel": 3, "mobility": "50 (levitace)", "attack": None, "zo": 7, "oc": 7, "ok": False},
    },
}

# ---------------------------------------------------------------- prosby (tvar jako v pravidlech)
PROSBY = r"""
## Léčivé slovo | zakladni | 6
Přízeň: 3 za slovo
Dosah: 10 sáhů
Rozsah: 1 tvor
Trvání: ihned
Vzývání: dlouhá akce
Obtížnost: 6 (+2 za každé slovo navíc)
Vyžaduje: -
Štítky: nauka Milosrdenství
Klerik sepne ruce a začne pronášet modlitbu, kterou prosí boha o to, aby vyléčil cíl prosby. Léčba dokáže zacelit rány a zastavuje krvácení. Působení božích sil dokáže vyléčit 1k6 životů za každé léčivé slovo.
Klerik může v jednom kole vzývat více léčivých slov, které pak spojí v léčivý (u temné zraňující) chorál.
Temná alternativa: Klerik dokáže každým zlým slovem způsobit nekrotické zranění za 1k6 životů. Musí však uspět v hodu na Prosby (CHAR) vs. Výdrž (ODO). Pokud neuspěje, tak je způsobené zranění jen poloviční.

## Očištění | zakladni | 7
Přízeň: 3
Dosah: dotek
Rozsah: 1 porce
Trvání: ihned
Vzývání: dvě dlouhé akce
Obtížnost: 6
Vyžaduje: -
Štítky: nauka Milosrdenství
Touto prosbou dokáže klerik „očistit“ jednu běžnou porci jídla či měch vody od jedů či zárodků nákazy (týden hnijící králík však nebude poživatelný ani po deseti Očištěních). Efekt prosby působí na všechny přírodní a magické jedy v nich obsažené. Prosba nemá žádný účinek na živé tvory. Pokud by klerik narazil na vzácný magický jed, očištění se nezdaří úplně. Průběh a účinky otravy po pozření by však byly pouze poloviční.
Temná alternativa: Touto prosbou klerik zamaskuje v jídle či pití již existující jed tak, že je složitější na odhalení. Každý, kdo by se o to pokusil, utrží Nevýhodu (postih −5) na veškeré hody na odhalení jedu.

## Štít víry | zakladni | 7
Přízeň: 5 + X
Dosah: 20 sáhů
Rozsah: 1 tvor
Trvání: 5 kol
Vzývání: krátká akce
Obtížnost: 7
Vyžaduje: -
Štítky: nauka Bojovníků víry
Tato prosba vytvoří kolem vybraného tvora ochrannou bariéru, která zvyšuje jeho Základní obranu (ZO) o 3.
Bariéra má své vlastní životy, které jsou rovné X a vybraného tvora chrání před veškerým zraněním (prve ubydou životy bariéře, až pak tvorovi).
Jakmile bariéře životy dojdou, prosba předčasně skončí.

## Úder moci | zakladni | 7
Přízeň: 3 za každý úder
Dosah: 20 sáhů
Rozsah: 1 tvor
Trvání: ihned
Vzývání: krátká akce
Ověření: Prosby (CHAR) vs. Vůle (CHAR)
Obtížnost: 6 (+2 za každý úder navíc)
Vyžaduje: -
Štítky: nauka Svaté pravdy, magické, psychické
Klerik může využít božské síly k úderu. Cíl, který je modlitbou zasažen, je zraněn psychickým zraněním za 1k6+1 životů (v případě neúspěšného ověření za polovinu). Zranění není fyzické, ale způsobí dotyčnému silný duševní otřes. Viditelný efekt je především překvapení a bázlivost zasaženého před boží mocí. Vzácně pak také krvácení z nosu a podobně (pokud bylo zranění vyšší).

## Uzdrav otravu | zakladni | 7
Přízeň: 4 (8)
Dosah: dotek
Rozsah: 1 tvor
Trvání: ihned
Vzývání: dlouhá akce
Ověření: Prosby (CHAR) vs. Nebezpečnost jedu
Obtížnost: 6
Vyžaduje: -
Štítky: nauka Milosrdenství
Touto prosbou dokáže klerik vyprosit zrušení jakéhokoliv druhu otravy (magické za 8 bodů přízně) jednoho tvora. Aby se mu to povedlo, musí uspět v ověřovacím hodu proti Nebezpečnosti jedu.
PŘÍKLAD: Klerik Věrovít se bude snažit zachránit obchodníka Renárda, zasaženého otrávenou šipkou s magickým jedem (nebezpečnost 18). Hodí si na prosby, připočítá CHAR a v součtu má 14 – to k uzdravení Renárda stačit nebude.
Temná alternativa: Touto temnou prosbou klerik zhorší otravu jedem tak, že má 2× silnější efekt (zranění, negativní účinky a podobně). Aby se tak stalo, musí uspět v hodu na ověření proti Nebezpečnosti jedu.

## Hlas víry | druha_uroven | 13
Přízeň: 2
Dosah: sesilatel
Rozsah: sesilatel
Trvání: 15 minut (1 směna)
Vzývání: dlouhá akce
Obtížnost: 7
Vyžaduje: -
Štítky: nauka Svaté pravdy
Touto prosbou dokáže klerik zesílit svůj hlas. Zní pak 3× hlasitěji a mohutněji, než je obvyklé. Zvládne tak upoutat a přehlušit i hlučící dav. Když klerik vykřikne, jeho slova rezonují skleněnými okny a rozechvějí vodní hladinu. Pokud si potřebuje zjednat pozornost nebo někoho zastrašit, získá automaticky bonus +3 ke svému bonusu za Charisma (CHAR).
Efekt hlasu nemusí trvat celou směnu. Je jen na klerikovi, jak dlouho jej chce využít.

## Klidný spánek | druha_uroven | 13
Přízeň: 4
Dosah: dotek
Rozsah: 1 tvor
Trvání: 8 hodin
Vzývání: dlouhá akce
Obtížnost: 6
Vyžaduje: -
Štítky: nauka Milosrdenství
Vzýváním této prosby dokáže klerik zajistit klidný spánek jednomu tvoru. Ochrání ho tak před zlými sny, nespavostí či nočními můrami. Dotyčný se navíc probudí naprosto odpočatý (stupeň únavy – svěží). Spánek mu uzdraví o 1k6+3 životů více, než je obvyklé.
Temná alternativa: Klerik způsobí, že cíl bude sužován noční můrou, a proto si musí hodit na ověření Vůle (CHAR) vs. Prosby (CHAR) klerika. Jestliže cíl neuspěje, probudí se unavený (stupeň únavy – unavený). Noční můra mu navíc přivodí psychické zranění za 1k6+3 životů.

## Kopí pravého světla | druha_uroven | 13
Přízeň: 3 za kopí
Dosah: 50 sáhů
Rozsah: paprsek průměru kopí, který zasáhne vše v cestě
Trvání: ihned
Vzývání: dlouhá akce
Ověření: Prosby (CHAR) vs. Hbitost (OBR)
Obtížnost: 7 (+2 za každé kopí navíc)
Vyžaduje: -
Štítky: nauka Démonologie, Svaté, Nesvaté
Při provádění této prosby ukáže klerik vybraným směrem. Ve stejný okamžik protne vzduch paprsek jasného, oslnivého světla, který vypadá jako kopí a zasáhne každého, kdo mu stojí v cestě. Běsům, ďáblům, nemrtvým, neviděným a temným bytostem tak způsobí svěcené zranění, a to každým kopím za 1k6+2 životů (v případě neúspěšného ověření za polovinu). Na jiné bytosti tato prosba nefunguje (kopí jimi projde).
Temná alternativa: Provedením této prosby vyšle klerik kopí tvořené temnou energií. Andělům, přírodním a světlým bytostem tak způsobí nesvaté zranění, a to každým kopím za 1k6+2 životů (v případě neúspěšného ověření za polovinu).

## Ochrana před temnotou | druha_uroven | 13
Přízeň: 6
Dosah: dotek
Rozsah: 1 tvor
Trvání: 1 směna
Vzývání: dlouhá akce
Obtížnost: 8
Vyžaduje: -
Štítky: nauka Démonologie
Tato prosba pomáhá chránit před temnými silami (běsové, ďáblové, nemrtví, nevidění a temné bytosti). Ty následně získávají Nevýhodu (postih −5) k útoku i ke všem akcím namířeným proti chráněné postavě.
Dále chrání cíl před kletbami, zmámením či posednutím. Pokud je už postava takto postižená, ochrana jí bohužel nepomůže. K tomu slouží jiné prosby a modlitby.
Temná alternativa: Klerik dokáže stejným způsobem chránit cíl před andělem, přírodní nebo světlou bytostí. Ty následně získají Nevýhodu (postih −5) k útoku i ke všem akcím namířeným proti chráněné postavě.

## Požehnání zdaru | druha_uroven | 14
Přízeň: 3
Dosah: dotek
Rozsah: 1 tvor
Trvání: 1 akce
Vzývání: krátká akce
Obtížnost: 6
Vyžaduje: -
Štítky: nauka Žehnání aurami
Klerik dokáže touto prosbou požehnat jednomu tvoru, který pak získá Výhodu (bonus +5) k následujícímu hodu. Tím je míněno provedení útoku, obrany nebo hod na ověření úspěchu akce.
Efekt prosby se vztahuje na první hod, který postava po Požehnání provede. Pokud není potřeba provést žádný hod během 24 hodin od vzývání prosby, Požehnání pomine s tím, že se „projevilo samovolně“. Požehnání nelze kumulovat a další požehnání se tak na postavě neprojeví.
Temná alternativa: Klerik dokáže stejným způsobem proklít jeden cíl, který má pak k následujícímu hodu Nevýhodu (postih −5).

## Vnuknutí | druha_uroven | 14
Přízeň: 5 (0)
Dosah: kdekoliv
Rozsah: 1 tvor
Trvání: ihned
Vzývání: okamžitá akce
Ověření: Prosby (CHAR) vs. Vůle (CHAR)
Obtížnost: 8
Vyžaduje: -
Štítky: nauka Svaté pravdy
Touto prosbou dokáže klerik vyslat krátké poselství. To není tvořeno slovy či větami, ale intenzivním pocitem doplněným o nějakou scenérii. Běžně tak může jít o vzkaz, kterým se klerik navždy loučí, říká, že selhal nebo že je v ohrožení. Pro úspěch této prosby je nezbytná dobrá znalost cílové osoby.
Vnuknutí se projeví v okamžiku provedení prosby. Cílová osoba pak v mysli „spatří“ přesný obraz poselství a spojí si ho s jeho autorem. V případě spánku jí bude zpráva zjevena ve snu. Po probuzení si ji bude dobře pamatovat.
Tato prosba se od ostatních trochu liší. Občas totiž bývá vyslyšena, i když už klerik nemá žádné body Přízně. Obvykle k tomu dochází tehdy, je-li klerik na konci svých sil a jde o jeho poslední myšlenku.
Temná alternativa: Klerik dokáže poslat někomu jinému falešný vzkaz. Musí však vědět, o koho se jedná, a překonat hod na ověření Prosby (CHAR) vs. Vůle (CHAR) cíle. Pokud by neuspěl, cíl rozpozná, že je vzkaz podivný a něco není v pořádku.

## Svatá zbroj | bojovnici_viry | 15
Přízeň: úroveň klerika
Dosah: sesilatel
Rozsah: sesilatel
Trvání: ihned
Vzývání: okamžitá akce
Obtížnost: 9
Vyžaduje: Nauka Bojovníků víry
Štítky: nauka Bojovníků víry
Svatá zbroj dokáže pohltit veškerá zranění plynoucí z jednoho konkrétního fyzického útoku. Není přitom důležité, o jakou formu fyzického útoku se jedná (zda o zbraň tváří v tvář, střeleckou, či jinou).
Tuto prosbu může klerik použít v reakci na útok, který je na něj vedený (i vícekrát za kolo). Pokud je jich vedeno více, určí si sám, proti kterému bude chráněn.

## Útok štěstěny | bojovnici_viry | 15
Přízeň: 3
Dosah: sesilatel
Rozsah: sesilatel
Trvání: ihned
Vzývání: okamžitá akce
Obtížnost: 8
Vyžaduje: Nauka Bojovníků víry
Štítky: nauka Bojovníků víry
Úderem štěstěny může klerik učinit jeden svůj útok mnohem nebezpečnějším. Jakmile k němu dojde, hodí si na útok dvakrát a započte ten výsledek, který je pro něj lepší.

## Vrácení úderu | bojovnici_viry | 15
Přízeň: úroveň klerika
Dosah: sesilatel
Rozsah: sesilatel
Trvání: ihned
Vzývání: okamžitá akce
Obtížnost: 9
Vyžaduje: Nauka Bojovníků víry
Štítky: nauka Bojovníků víry, Svaté
Jestliže klerik utrpí zranění, může zareagovat tím, že použije tuto prosbu a vyšší moc ho pomstí. Útočník pak přijde o polovinu životů, které mu svým útokem vzal.
Zranění způsobené touto prosbou se považuje za svěcené.

## Zesil zranění | bojovnici_viry | 16
Přízeň: úroveň klerika
Dosah: sesilatel
Rozsah: sesilatel
Trvání: ihned
Vzývání: okamžitá akce
Obtížnost: 9
Vyžaduje: Nauka Bojovníků víry
Štítky: nauka Bojovníků víry
Po seslání této prosby se stává klerik nebezpečným protivníkem. Jeho následující útok totiž způsobí dvojnásobné zranění.

## Posel bojovník | bozi_patroni | 16
Přízeň: 3 × úroveň klerika
Dosah: 30 sáhů
Rozsah: –
Trvání: 10 kol
Vzývání: dlouhá akce
Obtížnost: 9
Vyžaduje: Nauka Božích patronů
Štítky: nauka Božích patronů
Klerik si touto prosbou dokáže přivolat posla, který se ho zastane v boji. Čím zkušenější klerik je, tím mocnějšího ochránce mu bůh vyšle. Jednotlivé statistiky posla bojovníka nalezneš v Tabulce poslů.
PŘÍKLAD: Klerik Věrovít je napaden přesilou. Rozhodne se proto přivolat Posla bojovníka, který ho bude po dobu 10 kol bránit. Věrovít je na 4. úrovni, a proto ho prosba bude stát celkem 12 přízně. Díky tomu si však povolá posla, který bude mít celkem 20 životů, Útočné a Obranné číslo vyšší o 2 a Základní obranu o 1. Celkem bude mít tedy Útočné číslo 10/+1 (meč), Obranné číslo 10 (nehmotný) a Základní obranu 9 (nehmotný).

## Posel rovnováhy | bozi_patroni | 16
Přízeň: 3 × úroveň klerika
Dosah: 30 sáhů
Rozsah: –
Trvání: 10 kol
Vzývání: dlouhá akce
Obtížnost: 11
Vyžaduje: Nauka Božích patronů
Štítky: nauka Božích patronů
Tomuto poslovi se také říká „Kladivo na čarodějnice“. Po svém zjevení se totiž zaměřuje na kouzelníky, kterým se snaží uzmout jejich manu. Posel ji totiž vnímá jako součást boží existence, kterou by neměli disponovat žádní smrtelníci.
Posel si nevšímá hraničářů ani kleriků (ti jsou pouhými prostředníky, kteří žádnou manou nedisponují), stejně jako nereaguje na manu obsaženou v různých předmětech.
Pokud posel rovnováhy úspěšně zasáhne svým útokem, kromě běžného zranění uzme cíli ještě manu – přesně tolik, jakou má posel úroveň.

## Posel stezky | bozi_patroni | 16
Přízeň: úroveň klerika
Dosah: 30 sáhů
Rozsah: –
Trvání: 1 hodina (4 směny)
Vzývání: dlouhá akce
Obtížnost: 7
Vyžaduje: Nauka Božích patronů
Štítky: nauka Božích patronů
Pokud si klerik není jistý směrem cesty, může požádat boha o pomoc. Ten mu sešle jednoho ze svých nižších služebníků známého jako Posel stezky. Klerikovi stačí pomyslet na světovou stranu či místo, které hledá. Posel daným směrem ukáže a sám se jím vydá. Od klerika se však nikdy nevzdálí více než na 30 sáhů.
Čím je posel stezky na vyšší úrovni, tím více cest zná a je schopen klerika lépe navézt (má vyšší dovednost orientace).

## Posel umlčení | bozi_patroni | 17
Přízeň: 2 × úroveň klerika
Dosah: 30 sáhů
Rozsah: –
Trvání: 10 kol
Vzývání: dlouhá akce
Obtížnost: 10
Vyžaduje: Nauka Božích patronů
Štítky: nauka Božích patronů
Klerik dokáže přivolat posla, který bude narušovat prosby ostatních. Při jeho zjevení klerik určí, na koho upře svou pozornost. To může navíc dle potřeby ve svém tahu měnit.
Obtížnost vzývání cizích proseb se zvýší o hodnotu rovnou úrovni posla, jenž se zjevil. Tento postih se pak aplikuje na všechny prosby, které jím budou narušovány.
Posel je však schopen narušovat jen prosby bytostí, které jsou v dosahu 30 sáhů od klerika.

## Najdi temnotu | demonologie | 18
Přízeň: 4
Dosah: koule kolem klerika o poloměru 10 sáhů
Rozsah: všichni temní tvorové a předměty
Trvání: 1 směna
Vzývání: dvě dlouhé akce
Obtížnost: 8
Vyžaduje: Nauka Démonologie
Štítky: nauka Démonologie
Po seslání této prosby vidí klerik bytosti kolem sebe v jiném světle. Nemrtví, nevidění a nadpozemští tvorové sloužící temným bohům vydávají temně modrou záři. Nadpozemské bytosti sloužící bohům světla vydávají zlatavou auru.
Stejně reagují i předměty, které jsou prokleté či jinak (trvale) zasažené vyšší mocí (posvátné symboly, zbraně atd.). Efekt prosby se nevztahuje na alchymistické předměty a vybavení.

## Odstraň kletbu | demonologie | 18
Přízeň: 13
Dosah: dotek
Rozsah: předmět, místo či tvor
Trvání: ihned
Vzývání: dvě dlouhé akce
Ověření: Vůle (CHAR) vs. X
Obtížnost: 10
Vyžaduje: Nauka Démonologie
Štítky: nauka Démonologie
Touto prosbou lze sejmout prokletí z vybrané osoby, místa či předmětu. Jestliže klerik v ověřovacím hodu uspěje a překoná sílu kletby (X), kterou zná PJ, dojde k jejímu okamžitému odstranění.
Temná alternativa: Klerik prokleje jednu vybranou osobu a tu bude stíhat smůla. Aby se mu to povedlo, musí uspět v hodu na ověření Vůle (CHAR) vs. Vůle (CHAR) oběti. Smůla se projeví tím, že cíl utrží postih −2 ke všem ověřovacím hodům na dovednosti. Kletba trvá do doby, dokud ji někdo nesejme nebo ji klerik sám nezruší. Síla kletby je rovna výši hodu na Prosby (CHAR), který provedl klerik při vzývání prosby.

## Odvracení temnoty | demonologie | 18
Přízeň: 3
Dosah: 30 sáhů
Rozsah: 1 tvor
Trvání: ihned
Vzývání: krátká akce
Ověření: Vůle (CHAR) vs. Vyšší moc monstra
Obtížnost: 9
Vyžaduje: Nauka Démonologie
Štítky: nauka Démonologie
Klerik touto prosbou dokáže odvracet běsy, ďábly, nemrtvé, neviděné a temné bytosti v jejich přirozené podobě. Jestliže klerik v ověřovacím hodu uspěje (překoná Vyšší moc monstra), odvracení se zdařilo.
Pokud jsou nadpozemské bytosti ukryty v cizím těle, odvracení na ně nepůsobí. K jejich vyhnání je potřeba znalost speciálních technik vymítání a exorcismu.
Během odvracení provádí klerik gesta žehnání a pronáší slova modlitby k zahnání zla. Bytosti, které mu podlehnou, prchají v hrůze jinam a nemají vůli se vrátit (leda by byly samy napadeny). Efekt odvracení samovolně odezní po 3 kolech. Na tuto prosbu neplatí imunita na ovlivnění mysli.
Temná alternativa: Klerik touto prosbou může odvrátit anděly, přírodní a světlé bytosti. Musí uspět v ověřovacím hodu na Vůli (CHAR) vs. Vyšší moc bytosti. Jestliže se mu to povede, bytost je na 3 kola odvrácená (a nepomůže jí ani imunita na ovlivnění mysli).

## Ošálení temnoty | demonologie | 19
Přízeň: 4
Dosah: sesilatel
Rozsah: 1 tvor
Trvání: 15 minut (1 směna)
Vzývání: dlouhá akce
Obtížnost: 8
Vyžaduje: Nauka Démonologie
Štítky: nauka Démonologie
S touto prosbou dokáže klerik ošálit všechny smysly běsů, nemrtvých, neviděných a temných bytostí. Stává se pro ně proto neviditelný, neslyšitelný a celkově nezjistitelný. Může se pohybovat kolem nich, aniž by ho vůbec dokázali postřehnout. Pro smrtelníky je však klerik normálně viditelný.
Během doby trvání prosby musí být klerik opatrný. Ošálení smyslů se totiž může snadno narušit. Stačí k tomu zaútočit, vzývat prosbu, seslat kouzlo (a to i z předmětu) nebo provést nějakou komplexnější akci (jako třeba výroba předmětů a podobně).
Temná alternativa: S touto prosbou dovede klerik ošálit smysly andělů, přírodních a světlých bytostí. Stává se pro ně proto neviditelný, neslyšitelný a celkově nezjistitelný.

## Napravení těla | milosrdenstvi | 19
Přízeň: 8
Dosah: dotek
Rozsah: 1 tvor
Trvání: ihned
Vzývání: krátká akce
Obtížnost: 10
Vyžaduje: Nauka Milosrdenství
Štítky: nauka Milosrdenství
Tato prosba dokáže vyléčit zlomeniny, poraněné svaly, šlachy či cévy. Stejně tak dokáže napravit třeba protržený ušní bubínek (stav zmrzačení nebo oslabení). Nelze jí však léčit vrozené vady či nevratná poškození těla (ztráta oka, amputovaný palec). Dokáže se také vypořádat s následky temné alternativy této prosby (viz níže). Zároveň postavě vyléčí 2k6 životů.
Temná alternativa: Klerik dokáže způsobit postižení končetin či smyslů (zrak, sluch atd.). Hodí si na Vůli (CHAR) vs. Vůle (CHAR) obránce. Jestliže uspěje, vybere si jeden smysl, který dotyčný ztratí, nebo jednu končetinu, kterou zmrzačí (o případných postizích rozhoduje PJ). Tento efekt má psychický základ a trvá po dobu 3 kol. Nechá však na cíli silný duševní otřes, který se projeví psychickým zraněním za 2k6 životů.

## Odstraň paralýzu | milosrdenstvi | 19
Přízeň: 8
Dosah: dotek
Rozsah: 1 tvor
Trvání: ihned
Vzývání: dlouhá akce
Ověření: Prosby (CHAR) vs. X
Obtížnost: 11
Vyžaduje: Nauka Milosrdenství
Štítky: nauka Milosrdenství
Touto prosbou dokáže klerik zrušit všechny druhy ochromení, které nemají základ ve fyzickém poškození těla (ochrnutí). Prosba si tak dokáže poradit s paralýzou způsobenou strachem, kouzly, jedy či kletbami.
Jestliže zdroj paralýzy na postavu stále působí (např. předmět, kterého se dotýká), prosba ji nedokáže zlomit. Funguje ale třeba na kouzla, která byla jednou seslána a dál se o ně kouzelník nestará. Sílu (obtížnost) paralýzy, kterou musí klerik prosbou překonat, zná Pán jeskyně.
Temná alternativa: Klerik dokáže paralyzovat jednu bytost na 3 kola. Musí svým hodem na Vůli (CHAR) překonat Vůli (CHAR) cíle. Efekt paralýzy je psychického rázu a cíl se z něj může každé kolo pokusit probudit opakováním ověřovacího hodu.

## Udržení života | milosrdenstvi | 20
Přízeň: 3
Dosah: 20 sáhů
Rozsah: 1 tvor
Trvání: 10 kol (1 minuta)
Vzývání: krátká akce
Obtížnost: 8
Vyžaduje: Nauka Milosrdenství
Štítky: nauka Milosrdenství
Tuto prosbu lze vzývat pouze na vážně zraněnou postavu, která je na mezi vyřazení nebo pod ní. Její efekt pak na 10 kol pozastaví všechny škodlivé procesy v těle. Jedy, krvácení ani kletby tak na ni nebudou mít dočasně žádný vliv. Prosba účinkuje pouze na živé tvory. Nemá tudíž žádný efekt na zemřelé, nemrtvé nebo neviděné.
Temná alternativa: Klerik dokáže vystavit duši umírající postavy (pod mezí vyřazení) ukrutnému utrpení. Pokud svým hodem na dovednost Prosby (CHAR) překoná Vůli (CHAR) cíle, způsobí jí tím definitivní smrt.

## Uzdrav nemocného | milosrdenstvi | 20
Přízeň: 4
Dosah: dotek
Rozsah: 1 tvor
Trvání: ihned
Vzývání: 3 kola
Obtížnost: 10
Vyžaduje: Nauka Milosrdenství
Štítky: nauka Milosrdenství
S pomocí této prosby dokáže klerik vyléčit běžné nemoci i s jejich příznaky. Zvládne tedy odstranit zimnici, horečku, bolest v krku a podobně. Efekt úlevy a odeznění nemoci se projeví během jedné směny. U těch méně obvyklých (jako je zápal plic, neštovice a podobně) pak odezní do druhého dne.
Vážné nemoci (jako je mor a podobně) a nemoci magického původu klerik vyléčit nedokáže. Může však jejich příznaky na 24 hodin zcela potlačit.
Temná alternativa: Klerik dokáže přivolat běžné i méně obvyklé nemoci (viz výše). Aby se mu to povedlo, musí hodem na Prosby (CHAR) překonat Výdrž (ODO) cíle.

## Doznání | svata_pravda | 20
Přízeň: 3
Dosah: dotek
Rozsah: 1 tvor
Trvání: 15 minut (1 směna)
Vzývání: dlouhá akce
Ověření: Vůle (CHAR) vs. Výdrž (ODO)
Obtížnost: 9
Vyžaduje: Nauka Svaté pravdy
Štítky: nauka Svaté pravdy
Tato prosba dokáže intenzivní bolestí zlomit vůli protivníka. Jestliže klerik v ověřovacím hodu překoná Výdrž protivníka, sníží mu na dobu jedné směny opravu ODO i CHAR o 3. Ačkoliv se bude dotyčný cítit hrozně, neutrpí žádné skutečné zranění (i když to tak může vnímat). Změna opravy za atribut neovlivní hodnoty, které jsou s ním spojeny (tj. základ atributu, životy, množství Přízně a podobně), ale ovlivní už případné ověřovací hodnoty cíle.
Takto „nalomená“ osoba bývá následně podrobena otázkám. Pokud neuspěje v hodu na ověření, rozmluví se.

## Falešné přátelství | svata_pravda | 21
Přízeň: 3 + úroveň cíle
Dosah: 10 sáhů
Rozsah: 1 tvor
Trvání: 1 hodina
Vzývání: dvě dlouhé akce
Ověření: Vůle (CHAR) vs. Vůle (CHAR)
Obtížnost: 10
Vyžaduje: Nauka Svaté pravdy
Štítky: nauka Svaté pravdy
Touto prosbou lze zmást duši jiného smrtelníka. Jestliže klerik v ověřovacím hodu překoná Vůli protivníka, bude ho dotyčný považovat za svého dobrého přítele. Bude mu věřit a bude ochoten mu pomoci. Nikdy však nevykoná nic, co by ho mohlo ohrozit na životě. Toto chování mu vydrží až do konce efektu prosby nebo do okamžiku, kdy mu klerik nebo zbytek družiny nějak ublíží či uškodí.
Po skončení prosby se tvor vzpamatuje a bude zmatený. Bude si pamatovat vše, co provedl nebo řekl, ale nebude chápat, proč to udělal.

## Vidění pravdy | svata_pravda | 21
Přízeň: 3
Dosah: sesilatel
Rozsah: sesilatel
Trvání: 3 kola
Vzývání: krátká akce
Ověření: Vůle (CHAR) vs. Vůle (CHAR)
Obtížnost: 8
Vyžaduje: Nauka Svaté pravdy
Štítky: nauka Svaté pravdy
Díky této prosbě dokáže klerik vycítit, zda někdo mluví pravdu, nebo lže. Stačí pronést slova modlitby a zadívat se dotyčnému do očí. Jestliže klerik v ověřovacím hodu překoná Vůli protivníka, nedokáže dotyčný odolat a s pohledem upřeným do očí lhát. Může se o to sice pokusit, ale vždy při tom nevědomky uhne pohledem a prozradí se. Pokud hovoří pravdu, pohled klerika ustojí.

## Zapomnění | svata_pravda | 21
Přízeň: 8
Dosah: dotek
Rozsah: 1 tvor
Trvání: ihned
Vzývání: 3 kola
Ověření: Vůle (CHAR) vs. Vůle (CHAR)
Obtížnost: 8
Vyžaduje: Nauka Svaté pravdy
Štítky: nauka Svaté pravdy
Touto prosbou dokáže klerik způsobit protivníkovi trvalou ztrátu paměti. Dokáže tak zahladit různé „přešlapy“, kterých se on nebo družina dopustili. Je však potřeba jednat rychle.
Jestliže klerik v ověřovacím hodu překoná Vůli protivníka, vymažou se dotyčnému vzpomínky na vše, co se za poslední hodinu stalo.

## Aura ocelové pěsti | zehnani_aurami | 22
Přízeň: 2 za kolo
Dosah: koule kolem klerika o poloměru 6 sáhů
Rozsah: všichni tvorové v dosahu
Trvání: dle dodané přízně
Vzývání: krátká akce
Obtížnost: 8
Vyžaduje: Nauka Žehnání aurami
Štítky: nauka Žehnání aurami
Touto prosbou se všechny postavy v dosahu aury stávají nebezpečnějšími v boji. Každá dostává bonus +2 k Útočnému číslu po celou dobu účinku aury. Pokud si to klerik přeje, může být z účinku aury kdokoliv vyloučen.
Temná alternativa: Klerik dokáže oslabit (postih −2 k ÚČ) všechny tvory v dosahu aury, které si sám zvolí.

## Aura proti temnotě | zehnani_aurami | 22
Přízeň: 3 za kolo
Dosah: koule kolem klerika o poloměru 6 sáhů
Rozsah: všichni tvorové v dosahu
Trvání: dle dodané přízně
Vzývání: krátká akce
Ověření: Prosby (CHAR) vs. Vyšší moc
Obtížnost: 8
Vyžaduje: Nauka Žehnání aurami
Štítky: nauka Žehnání aurami
Klerik je schopen vyprosit si ochrannou auru, která se projeví jako slabě zářící zlatavý kruh kolem něj. Do něj nemohou vstoupit žádní prokletí či posedlí tvorové, stejně jako běsové, ďáblové, nemrtví, nevidění a temné bytosti. Nedokáží se do něj dostat ani kouzlem, ani s pomocí svých zvláštních schopností (leda by klerik neuspěl v hodu na ověření).
Aura chrání také před zastrašením či jinými schopnostmi, které by mohly výše uvedené bytosti využít. Tato bariéra však klerika nechrání před kouzly (blesky, ohnivými koulemi a podobně) ani proti střeleckým útokům. Při útocích tváří v tvář mohou být postavy uvnitř aury zraněny jen v případě, že jsou na dosah zbraně protivníka stojícího mimo auru.
Temná alternativa: Klerik dokáže stejným způsobem vytvořit auru, která nepustí dovnitř žádného anděla, přírodní či světlou bytost (pokud klerik uspěl v hodu na ověření).

## Aura svatého štítu | zehnani_aurami | 22
Přízeň: 2 za kolo
Dosah: koule kolem klerika o poloměru 6 sáhů
Rozsah: všichni tvorové v dosahu
Trvání: dle dodané přízně
Vzývání: krátká akce
Obtížnost: 8
Vyžaduje: Nauka Žehnání aurami
Štítky: nauka Žehnání aurami
Touto prosbou se všechny klerikem vybrané postavy v dosahu stávají cílem ochranné aury. Díky ní získávají po celou dobu jejího trvání +2 k Základní obraně. Pokud si to klerik přeje, může být kdokoliv z účinku aury vyloučen.
Temná alternativa: Klerik takto dokáže oslabit (postih −2 k ZO) všechny tvory v dosahu aury, které si sám zvolí.

## Léčivá aura | zehnani_aurami | 22
Přízeň: 6 za kolo
Dosah: koule kolem klerika o poloměru 6 sáhů
Rozsah: všichni tvorové v dosahu
Trvání: dle dodané přízně
Vzývání: krátká akce
Obtížnost: 8
Vyžaduje: Nauka Žehnání aurami
Štítky: nauka Žehnání aurami
Léčivá aura uzdraví každého klerikem zvoleného tvora za 1k6 životů, a to v každém kole svého trvání. Podmínkou je, aby byl tvor v dosahu aury, tedy nejvýše šest sáhů od klerika.
Efekt aury se projeví ihned po vzývání a pak vždy na začátku tahu klerika.
Temná alternativa: Aura způsobí všem tvorům v jejím dosahu (kromě klerika) nekrotické zranění za 1k6 životů, a to v každém kole svého trvání. Klerik nedokáže z efektu prosby nikoho vyjmout a projeví se ihned po vzývání, v dalších kolech pak na začátku tahu klerika.
"""

KEYS = {"Přízeň": "prizen", "Dosah": "dosah", "Rozsah": "rozsah", "Trvání": "trvani", "Vzývání": "vzyvani",
        "Ověření": "overeni", "Obtížnost": "obtiznost", "Vyžaduje": "vyzaduje", "Štítky": "stitky"}


def parse_block(block: str) -> dict:
    lines = block.strip().split("\n")
    name, group, page = [x.strip() for x in lines[0].lstrip("#").split("|")]
    p: dict = {"nazev": name, "skupina": group, "strana": int(page), "zdroj": "H13", "typ": "prosba"}
    body: list[str] = []
    for ln in lines[1:]:
        m = re.match(r"^([A-ZÁ-Ž][a-zá-ž]+):\s*(.*)$", ln)
        if m and m.group(1) in KEYS and not body:
            p[KEYS[m.group(1)]] = m.group(2).strip()
        else:
            body.append(ln)
    text = "\n".join(body).strip()
    m = re.split(r"\nTemná (?:alternativa|varianta):\s*", text, maxsplit=1)
    p["popis"] = m[0].strip()
    if len(m) > 1:
        p["temna"] = m[1].strip()
    p["stitky"] = [s.strip() for s in p.get("stitky", "").split(",") if s.strip()]
    return p


def main() -> None:
    prosby = [parse_block(b) for b in re.split(r"\n(?=## )", PROSBY.strip())]
    for p in prosby:
        for k in ("prizen", "dosah", "rozsah", "trvani", "vzyvani", "obtiznost"):
            assert k in p, (p["nazev"], k)
    data = {
        "_zdroj": "H13_Klerik_1.2.5_FINAL.pdf (projekt), přepis textové vrstvy – tools/h13_klerik_src.py",
        "pravidla": PRAVIDLA,
        "sveceni": SVECENI,
        "zakladni_dovednosti": [{"id": "mystika", "rank": 3}, {"id": "prvni_pomoc", "rank": 3}, {"id": "vule", "rank": 3}],
        "nauky": [{"id": i, "nazev": n, "efekt": e, "popis": d} for i, n, e, d in NAUKY],
        "schopnosti": [{"id": i, "nazev": n, "strana": s, "efekt": e} for i, n, s, e in SCHOPNOSTI],
        "specializace": [{"id": i, "nazev": n, "podminky": r, "pravidlo": "2 ze 3", "popis": d} for i, n, r, d in SPECIALIZACE],
        "poslove": POSLOVE,
        "prosby": prosby,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)}: {len(prosby)} proseb, {len(NAUKY)} nauk, {len(SCHOPNOSTI)} schopností")


if __name__ == "__main__":
    main()
