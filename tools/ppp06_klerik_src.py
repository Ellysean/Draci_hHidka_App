"""Klerik PPP06 (Pravidla pro pokročilé, kap. 7, s. 279–310) → docs/ppp06_klerik.json   (7d.0)

Přepis z textové vrstvy Draci_hlidka_PPP_06_Klerik.pdf (projekt). Nahrazuje ruční výtah
claude/data/ppp06_klerik.json (27. 9. 2026) – stejné položky, navíc plné znění schopností.
Prosby a léky jsou ve stejném tvaru jako v H13 (parser z tools/h13_klerik_src.py).

Rozpory tabulka × text (✔ U 19. 9. 2026: platí text): Bohoslužby +3 (tabulka +5), Flagelantství obnoví
Zvolání (tabulka: doplní Přízeň), Božské mantry po dobu pronášení (tabulka 10 kol), Posvátná zbraň +2
(tabulka +3).
"""
import json
import re
from pathlib import Path

from h13_klerik_src import parse_block

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "ppp06_klerik.json"

DAR_ZIVOTA = {"id": "dar_zivota", "nazev": "Dar života", "strana": 280, "uroven": 6,
              "efekt": "Výsledný efekt všech léčivých proseb klerika je vždy o čtvrtinu vyšší, nejméně o 1 život. Automaticky každý klerik na 6. úrovni."}

OBECNE = {
    "posvatna_mista": "Klerik boha místa: Výhoda +5 ke vzývání, každá vyslyšená prosba 2× silnější (nebo 2× delší). Klerici jiných bohů Nevýhoda −5. Nadpozemští vyslanci jiných bohů, démoni a nemrtví nevstoupí (nerozhodne-li bůh či klerik jinak).",
    "prokleta_mista": "Žádná prosba není vyslyšena (umlčení); nadpozemské bytosti, které vstoupí, jsou zničeny.",
    "tlumeni": "Posvátný symbol jiného boha nasazený klerikovi: Nevýhoda −5 ke všem prosbám, u relikvií a mocných symbolů úplné umlčení; nadpozemským bytostem působí bolest a popáleniny.",
    "relikvie": "Ostatky svatých s božskou mocí; posvátné předměty a ikony – vzácné, bez pevných pravidel.",
    "specializace": "Od 6. úrovně, volba je trvalá. Specializovaný klerik volí ze schopností své specializace i z obecných. Bez specializace smí na každé 6. úrovni vzít 1 schopnost libovolné specializace.",
}

# id, název, strana, plné znění (zkrácené jen o příběhový úvod)
VOLITELNE = [
    ("asketismus", "Asketismus", 283, "Slib chudoby: klerik smí mít jen věci denní potřeby v hodnotě nejvýš 5 zl (posvátný symbol se nepočítá). Dokud slib dodržuje, má maximum Přízně dvojnásobné. Vědomé porušení = okamžitá ztráta veškeré dodatečné Přízně; obnoví se až s přestupem na další úroveň (pokud zase slib dodržuje)."),
    ("bohosluzby", "Bohoslužby", 283, "Obřad 1 hodina, nejvýš 1× denně. Všichni účastníci (i klerik) mají 24 hodin +3 ke všem ověřovacím hodům na Vůli. Klerik získá tolik bodů aktuální Přízně, kolik tvorů se zúčastnilo."),
    ("bozska_domena", "Božská doména", 284, "Projevy domény boha ve třech stupních: 1. stupeň na úrovních 6–11, 2. na 12–17, 3. na 18–24. Konkrétní efekty určí PJ (příklad doména světla: svěcení luceren, zářící oči a vidění ve tmě, oslepující záblesk)."),
    ("flagelantstvi", "Flagelantství", 284, "Sebetrýznění 1 směna: životy klesnou na 1, na oplátku se obnoví možnost Zvolání. Nejvýš 1× týdně."),
    ("nositel_slova", "Nositel slova", 284, "Prosby s dosahem dotek nebo s rozsahem na klerika může přenést na cíl vzdálený až 50 sáhů. Ověřovací hody platí dál; na objektu je efekt statický, na bytosti se pohybuje s ní."),
    ("mnohoprosby", "Mnohoprosby", 284, "Více stejných proseb najednou v rámci jednoho vzývání (na více cílů nebo na jeden). Každá další prosba má obtížnost o +5 a cenu o +2 Přízně vyšší než předchozí."),
    ("pozehnani", "Požehnání", 285, "Po ověřovacím či bojovém hodu si může vyžádat jeho opakování a vybrat výhodnější výsledek. Nejvýš 1× denně (jednou za tři pravidelné modlitby)."),
    ("radovy_slib", "Řádový slib", 285, "Vstup do řádu (noviciát proběhl během přestupu). Výhody: rozpoznání členů, sounáležitost, zázemí v budovách řádu, postup v hierarchii. Povinnost poslušnosti; nedodržení pravidel = psanec. Podrobnosti určí PJ."),
    ("sakralni_predmety", "Sakrální předměty", 286, "Zasvěcení drobného předmětu 1 hodina: klerik vloží veškerou (maximální) Přízeň a předmět pak jednorázově sešle zvolenou prosbu – kdokoli, silou myšlenky, se stejnou dobou vzývání. Klerik udrží nejvýš tolik aktivních sakrálních předmětů, kolik je jeho úroveň."),
    ("strazce_mysteria", "Strážce mystéria", 286, "Naučí se 4 mocné prosby: Beregondovo osvícení, Mezisvět, Vyhnání, Znamení života. Kteroukoli z nich může nahradit prosbou vytvořenou PJ (doména boha)."),
    ("sveceni_mist", "Svěcení míst", 286, "Rituál 1 směna, nejvýš 1× denně: posvátné místo o ploše 3× úroveň sáhů na tolik let, kolik je úroveň klerika. Více kleriků sčítá úrovně i Přízeň. Přesvěcení místa jiného boha: 10 směn a Prosby vs. Prosby původního klerika (PJ může dát ±5); za úspěch zvláštní Přízeň i nad maximum."),
    ("vzkriseni", "Vzkříšení", 287, "Zemře-li klerik ve službě bohu nebo se obětuje: 1k10, na 10 (0) zůstává mrtev, jinak do 24 hodin vstane (zachované tělo se zahojí, jinak v jiném nedávno zemřelém těle). Zkušenosti klesnou na hranici přestupu na předchozí úroveň."),
]

SPECS = {
    "bojovy_mnich": dict(name="Bojový mnich", page=289,
        intro="Ocelová pěst víry – rytířská elita, inkvizitoři a lovci čarodějnic.",
        auto=[("boj_zblizka", "Boj zblízka", 290, "Při boji tváří v tvář automaticky +1 k Útoku i Obraně.")],
        opt=[
            ("bozi_zbroj", "Boží zbroj", 290, "Obřad 1 týden se zvolenou zbrojí: kvalita +1, proti magickým a nadpozemským bytostem +2, chrání i proti útokům procházejícím nemagickou zbrojí. Pro ostatní má zbroj běžné hodnoty."),
            ("bozske_mantry", "Božské mantry", 290, "Během pronášení manter mají všechny bytosti v doslechu Výhodu +5 ke všem hodům na Vůli (CHAR). Mezitím mnich nemůže vzývat prosby ani dělat nic, co vyžaduje soustředění; v boji ho to neomezuje. V boji = okamžitá akce Mluvení."),
            ("fanatismus", "Fanatismus", 291, "3 Útoky za dvě kola, od 12. úrovně 2 Útoky každé kolo."),
            ("inkvizitorsky_vycvik", "Inkvizitorský výcvik", 291, "Neupadá do bezvědomí ani po překročení Meze vyřazení – jedná až do smrti. Získá 4 prosby: Falešná smrt, Zadrž protivníka, Zastavení dění, Zmatení mysli."),
            ("lovec_carodejnic", "Lovec čarodějnic", 291, "1 kolo soustředění, cíl do 50 sáhů: Postřeh (INT) vs. X podle Tabulky vidění many → pozná, že má cíl manu, a přibližně kolik. Rezistence vůči kouzelnické magii: zranění z kouzel na polovinu."),
            ("paladinsky_vycvik", "Paladinský výcvik", 291, "Základ Odolnosti +1. Získá 4 prosby: Andělská zbroj, Kladivo na čarodějnice, Podlom obranu, Požehnej vlastnostem."),
            ("posvatny_vliv", "Posvátný vliv", 292, "Následovníci mnicha, kteří ho vidí, mají +1 ke všem ověřovacím hodům (vždy jen za jednoho mnicha). Bez Přízně, neustále."),
            ("posvatna_zbran", "Posvátná zbraň", 292, "Obřad 1 týden se zvolenou zbraní: +2 do Útočnosti i Zranění, způsobuje svěcené zranění."),
        ]),
    "exorcista": dict(name="Exorcista", page=295,
        intro="Osamělý bojovník světla – vidí, odvrací a vymítá nadpozemské bytosti, ruší kletby.",
        auto=[("sebeovladani", "Sebeovládání", 296, "Automaticky Výhoda +5 proti každému pokusu o ovlivnění mysli, zastrašení, ovládnutí, posednutí a podobně.")],
        opt=[
            ("astralni_poutnik", "Astrální poutník", 296, "Za 5 kol soustředění vstoupí do astrální sféry (tělo zůstává v transu); vezme s sebou až tolik souhlasících tvorů, kolik je jeho úroveň (musí se ho dotýkat). Návrat myšlenkou, trvá 5 kol. Nadpozemskou bytost zabitou v astrálu zničí definitivně; jeho „smrt“ tam ho vrátí do těla."),
            ("desobijec", "Děsobijec", 297, "Proti nemrtvým, neviděným, démonům a nadpozemským bytostem trvale +2 do Útoku (ÚČ), Základní obrany (ZO) i Zranění; na každé 6. úrovni se bonus zvyšuje (6.: +2, 12.: +4, 18.: +6, 24.: +8)."),
            ("exorcismus", "Exorcismus", 297, "1 kolo soustředění, cíl do 50 sáhů: Postřeh (INT) vs. Vyšší moc démona → pozná nadpozemskou či posedlou bytost. Získá 4 prosby: Chraň před posednutím, Odhal démona, Ukaž temnotu, Vyžeň démona."),
            ("jazyk_prastarych", "Jazyk prastarých", 298, "Rozumí jazyku nadpozemských bytostí a mluví jím. Každá prosba na vyvolání Posla stojí o 3 Přízně méně (vždy aspoň 1). Získá 4 posly: Posel bdělosti, Posel domény, Posel lovec, Posel pečeti."),
            ("kletby", "Kletby", 298, "Automaticky rozpozná prokleté místo, bytost či věc a vystopuje zdroj kletby (vidí nit k proklínajícímu). Při neúspěchu jde Odstraň kletbu zkusit znovu až další den; Exorcista má k ní Výhodu +5. Pozná kletby s podmínkou zrušení."),
            ("mystika_exorcista", "Mystika", 300, "Odposlech komunikace klerika s bohem (1 kolo soustředění na známého klerika). Zásah do ní (½ kola, Vůle vs. Vůle): změnit či zmařit prosbu, rozkázat cizímu poslovi, vnuknout falešnou vizi. Neúspěch: může se prozradit, zranění 1k10 a 1k6 dní bez proseb. Proti Mystice cizích má Výhodu +5."),
            ("nadprirozeny_boj", "Nadpřirozený boj", 300, "Všechny Útoky i Obrany jsou zároveň fyzické, magické i nadpozemské – zraní i tvory imunní či rezistentní vůči běžným útokům."),
            ("svetlonos", "Světlonoš", 300, "Napadne-li ho nemrtvý, neviděný či nadpozemský tvor: oba hodí k10; vyhraje-li Exorcista nebo je remíza, celé Zranění se vrátí útočníkovi, jinak ho utrží sám. Útočník pak každé kolo Vůle (CHAR) klerika vs. Vůle (CHAR), jinak v panice ustoupí."),
        ]),
    "knez": dict(name="Kněz", page=303,
        intro="Duchovní vyššího svěcení – léčí, chrání aurami, činí zázraky.",
        auto=[("milosrdenstvi_knez", "Milosrdenství (Kněz)", 304, "Souvěrci Knězi zajistí jídlo, ubytování a podobně výměnou za modlitby (skromně, podle svých možností).")],
        opt=[
            ("avatar", "Avatar", 304, "Iniciační modlitba 1 kolo + 3 kola proměny: Kněz přijde o veškerou Přízeň a měsíc se mu nedoplňuje. Avatar trvá 10 kol × úroveň (lze ukončit dřív), zpětná proměna 3 kola; pak 1 život a vyčerpání do vydatného spánku. Příklad (doména světla): životy 50 + životy klerika, SIL +7, OBR +5, ODO +6, bič světla 12+6+0 na 15 sáhů, zbroj světla 10, Výhoda +5 v boji; slabina prosby a posvátné zbraně."),
            ("bozi_ochrana", "Boží ochrana", 305, "Nevyžádané kouzlo či prosba na Kněze: útočník musí uspět v Sesílání kouzel (INT) / Prosby (CHAR) / Pouto s přírodou (INT) vs. Vůle (CHAR) Kněze, jinak se efekt neprojeví."),
            ("ikony", "Ikony", 305, "Výroba ikony 1 den, Kněz natrvalo přijde o 10 bodů maximální Přízně. Ikona umožní komukoli (kromě nepřátel boha) bez Přízně seslat zvolenou prosbu, kterou Kněz ovládá – nejvýš 1× za 24 hodin, trvale (dokud ji někdo nezničí)."),
            ("jasnozrivost", "Jasnozřivost", 306, "Častější božské vize (minulost a současnost přesně, budoucnost pravděpodobně). Po vizi 1k6 kol Nevýhoda −5 ke všem akcím."),
            ("obeti", "Oběti", 306, "Obřad 1 směna, Kněz obětuje něco opravdu cenného → obtížnost následující prosby −10. Hodnotu obětin posoudí PJ."),
            ("vycvik_lazaretnich_lecitelu", "Výcvik lazaretních léčitelů", 306, "+1 k dovednostem První pomoc a Znalost přírody. Naučí se vyrábět 5 léků: Lék svatého Aurélia, Lék svatého Jana, Lék svatého Maura, Lék svatého Núbia, Mast svaté Meredith. Lék podaný dřív, než dovoluje četnost, působí opačně."),
            ("zazraky", "Zázraky", 308, "Jedna zázračná prosba podle domény boha (určí PJ). Každý zázrak stojí 1k6 životů, které vrací jen čas – 1 za každý den bez zázraků (ne odpočinek, spánek, magie ani prosby). Získá 4 prosby: Božská pomoc, Figiho zásah osudu, Vrať čas, Zachraň život."),
            ("zazehnuti_aury", "Zažehnutí aury", 308, "Může mít více aur najednou a převádět jejich působení na jiné bytosti. Získá 4 aury: Aura bratrství, Aura pravého světla, Aura probuzení, Aura strachu."),
        ]),
}

VIDENI_MANY = [("1 a více", "26+"), ("20 a více", "22–25"), ("40 a více", "18–21"), ("60 a více", "14–17"), ("80 a více", "10–13"), ("100 a více", "9 a méně")]

POSLOVE = {
    "_zdroj": "PPP06 s. 298 Tabulka poslů (Jazyk prastarých)",
    "list": {
        "posel_bdelosti": {"n": "Posel bdělosti", "vyssi_moc": 21, "hp": 50, "attack": "meč", "uc": 10, "dmg": 3, "zo": 6, "oc": 7},
        "posel_domeny": {"n": "Posel domény", "vyssi_moc": 25, "hp": 65, "attack": None, "zo": 4, "oc": 4},
        "posel_lovec": {"n": "Posel lovec", "vyssi_moc": 17, "hp": 35, "attack": "dýky 2×", "uc": 5, "dmg": 3, "zo": 7, "oc": 8},
        "posel_peceti": {"n": "Posel pečeti", "vyssi_moc": 16, "hp": 45, "attack": None, "zo": 4, "oc": 4},
    },
    "rezistence": "magické zbraně, kouzla",
    "imunity": "nemagické zbraně, jed, krvácení, ovlivnění mysli",
}

PROSBY = r"""
## Beregondovo osvícení | strazce_mysteria | 288
Přízeň: 10
Dosah: dotek
Rozsah: 1 bytost
Trvání: 10 kol
Vzývání: 1 kolo
Obtížnost: 14
Vyžaduje: Strážce mystéria
Prosba dokáže zabránit následkům Zranění způsobených nemrtvými a upíry. Jejich Útoky (pokousání, podrápání atd.) tak sice vedou ke ztrátě životů, avšak nedojde k nejhoršímu. Dotyčný je tedy chráněn před ztrátou úrovně, proměnou v zombii a podobně.

## Mezisvět | strazce_mysteria | 288
Přízeň: 30
Dosah: dotek
Rozsah: 1 bytost
Trvání: 20 kol
Vzývání: 1 kolo
Obtížnost: 18
Vyžaduje: Strážce mystéria
Pomocí této prosby se fyzické tělo cíle přenese do meziprostoru naší reality a astrálních světů. V této podobě nemůže nijak zasahovat do žádné z realit. Nemůže tedy bojovat, kouzlit, pohybovat se ani nic podobného. Zároveň ho však není možné žádným způsobem zranit.
Jakmile uplyne doba trvání prosby, tvor se objeví zpět na místě, kde svůj fyzický svět opustil.
Prosbu lze seslat pouze na tvora, který s ní souhlasí.

## Znamení života | strazce_mysteria | 288
Přízeň: 20
Dosah: dotek
Rozsah: 1 bytost
Trvání: 1 den
Vzývání: 1 kolo
Obtížnost: 20
Vyžaduje: Strážce mystéria
Klerik „poznamená“ čelo vybrané bytosti symbolem svého boha (obvykle prostřednictvím svěceného oleje či krve). Jakmile dotyčnému klesnou životy na Hranici smrti, znamení zmizí a dotyčný se probere zpět s 1 životem (tedy těsně nad mezí vyřazení).

## Vyhnání | strazce_mysteria | 288
Přízeň: 7 × X
Dosah: 10 sáhů
Rozsah: 1 bytost
Trvání: X kol
Vzývání: 2 kola
Ověření: Vůle (CHAR) vs. Vůle (CHAR)
Obtížnost: 18
Vyžaduje: Strážce mystéria
Tato mocná prosba umožňuje Klerikovi „vyhnat“ vybraného tvora dočasně do meziprostoru sfér. Tvor v této podobě nemůže nijak zasahovat do žádné z realit. Nemůže tedy bojovat, kouzlit, pohybovat se ani nic podobného. Zároveň ho však není možné žádným způsobem zranit.
Aby k Vyhnání nedošlo, musí cíl uspět v ověřovacím hodu na Vůli (CHAR) vs. Vůle (CHAR) Klerika. Pokud se tak nestane, dojde k jeho okamžitému přesunu. V místě, kde zmizel, po něm zůstane éterická stopa – jeho průzračný, matně světélkující obraz, který je pro neznalé děsivý. Každý, kdo neví, o co se jedná, musí uspět v ověřovacím hodu na Vůli (CHAR) vs. 15, jinak prchá v panice pryč (minimálně 10 kol).
POZNÁMKA: Členové družiny, kterým klerik o svých schopnostech řekl, hod na paniku neprovádí, neurčí-li klerik jinak; kdo efekt už viděl, také ne.

## Andělská zbroj | paladinsky_vycvik | 292
Přízeň: 5 + úroveň Klerika
Dosah: -
Rozsah: Klerik
Trvání: 1 kolo za úroveň Klerika
Vzývání: ihned
Obtížnost: 12
Vyžaduje: Paladinský výcvik
Vytvoří sférickou zbroj, jejíž energie pohltí (zredukuje) veškerá utržená Zranění jakéhokoliv charakteru o 5 životů, a to v každém kole po celou dobu trvání prosby.

## Falešná smrt | inkvizitorsky_vycvik | 292
Přízeň: 15 + úroveň cíle
Dosah: 15 sáhů
Rozsah: 1 tvor
Trvání: 1 hodina
Vzývání: 3 kola
Ověření: Vůle (CHAR) vs. Vůle (CHAR) Klerika
Obtížnost: 21
Vyžaduje: Inkvizitorský výcvik
Touto prosbou lze oklamat všechny přírodní zákony a dogmata. Tvor, který neuspěje v ověřovacím hodu na Vůli (CHAR) vs. Vůle (CHAR) Klerika, upadne do stavu podobného klinické smrti. Jeho srdce přestane bít a plíce přestanou dýchat. Prosba však tělo chrání, aby nezačalo odumírat. Po dobu trvání prosby se tak u něj přestane projevovat krvácení, efekty jedů a podobně.
Je-li dotyčný v tomto stavu zraněn, efekt prosby se za 2 kola zruší. Do té doby není tvor schopen žádné akce.
Po celou dobu je mysl dotyčné postavy ponořena do stavu podivného snu, v němž stojí na obrovském světelném mostě, který spojuje její minulost s oslnivou září na druhé straně.
Prosbu lze seslat pouze na tvora, který by s ní souhlasil.

## Kladivo na čarodějnice | paladinsky_vycvik | 293
Přízeň: 8 + úroveň Klerika
Dosah: -
Rozsah: Klerik
Trvání: 1 kolo za úroveň Klerika
Vzývání: ihned
Obtížnost: 15
Vyžaduje: Paladinský výcvik
Touto prosbou je Klerikovi sesláno sférické kladivo (či jiná zbraň, dle domény daného boha). Jeho hodnoty jsou 8/+5/+3. Zbraň je složena z étericky čisté energie, která souvěrci prochází, aniž by jim cokoliv způsobila.
Proti jinověrcům a nevěřícím však působí jako klasická zbraň. Nemrtvé, neviděné, démony, magické a nadpozemské bytosti navíc zraňuje po úspěšném zásahu za dodatečných 1k6 životů.
Prosba funguje jako rychlé tasení. Kladivo si tak lze do ruky přivolat i pro použití v aktuální Útočné či Obranné akci.

## Podlom obranu | paladinsky_vycvik | 293
Přízeň: 3
Dosah: 10 sáhů
Rozsah: 1 tvor
Trvání: 1 kolo
Vzývání: ihned
Obtížnost: 15
Vyžaduje: Paladinský výcvik
Tvor, který se Bojovému mnichovi brání a na něhož prosba působí, si hází na Obranu 2×. Do jeho výsledného čísla se pak započítává nižší z obou hodů.

## Požehnej vlastnostem | paladinsky_vycvik | 293
Přízeň: 3
Dosah: -
Rozsah: Klerik
Trvání: 10 kol
Vzývání: ihned
Obtížnost: 6
Vyžaduje: Paladinský výcvik
Touto prosbou dokáže Klerik dočasně zlepšit opravu za některý ze svých atributů nejvýše o 1 bod (např. SIL, OBR atd.). Prosbu může provést kdykoliv, a to i v průběhu svého Útoku či Obrany.

## Zadrž protivníka | inkvizitorsky_vycvik | 293
Přízeň: 10 + úroveň zadržovaného tvora
Dosah: 25 sáhů
Rozsah: 1 tvor
Trvání: 5 kol
Vzývání: ihned, Klerik se musí po celou dobu trvání prosby soustředit
Ověření: Vůle (CHAR) Klerika vs. Vůle (CHAR) cíle
Obtížnost: 21
Vyžaduje: Inkvizitorský výcvik
Prosbou dokáže Klerik znehybnit inteligentního tvora do velikosti C. Pokud cíl neuspěje v ověřovacím hodu na Vůli (CHAR) vs. Vůle (CHAR) Klerika, je okamžitě ochromen. Nemůže se hýbat ani mluvit a Útok na něj je brán jako Útok na bezbranného protivníka.
Proti efektu prosby se může cíl pokusit mentálně vzepřít. V každém dalším kole po seslání tak může opakovat svůj ověřovací hod. Pokud uspěje, efekt na konci kola pomine.
Prosbou nelze zadržet nemrtvé, neviděné, magické ani nadpozemské bytosti. Lze ale zadržet bytosti posedlé démony.

## Zastavení dění | inkvizitorsky_vycvik | 293
Přízeň: 12
Dosah: Klerik
Rozsah: kruh o poloměru (úroveň Klerika) sáhů
Trvání: 1 kolo
Vzývání: ihned
Ověření: Vůle (CHAR) Klerika vs. Vůle (CHAR) cíle
Obtížnost: 15
Vyžaduje: Inkvizitorský výcvik
Pokud se Bojový mnich stane svědkem nějaké události (nebo do ní vstoupí později) a potřebuje ji zastavit, může s pomocí této prosby získat okamžitě Iniciativu.
Bojový mnich v tu chvíli mocně vykřikne a jeho hlas získá nebývalou sílu. Všichni tvorové v dosahu jsou nuceni provést ověřovací hod na Vůli (CHAR) vs. Vůle (CHAR) Klerika, a pokud neuspějí, musí okamžitě (na začátku bojového kola) všeho nechat a obrátit svou pozornost k Bojovému mnichovi. Ten má čas do konce kola, aby něco učinil nebo řekl to, co chce.
Efekt prosby je vždy totožný a působí na všechny, tedy i na přátele Bojového mnicha.
Tuto prosbu lze provést jednou za souboj.

## Zmatení mysli | inkvizitorsky_vycvik | 294
Přízeň: 12
Dosah: 5 sáhů
Rozsah: 1 tvor
Trvání: 3 kola
Vzývání: 1 kolo
Ověření: Vůle (CHAR) vs. Vůle (CHAR) Klerika
Obtížnost: 15
Vyžaduje: Inkvizitorský výcvik
Touto prosbou dokáže Klerik zatemnit mysl oběti. Ta pak upadá do stavu zoufalství a psychické sklíčenosti. Prosba vyvolá náhodný efekt.
Neuspěje-li cíl v ověřovacím hodu na Vůli (CHAR) vs. Vůle (CHAR) Klerika, projeví se u něj efekt určený hodem 1k6:
1–2 – Cíl propadne zmatku a dá se na útěk.
3–4 – Cíl zůstane zmateně stát a není schopen žádné akce.
5–6 – Cíl napadne vší silou náhodnou osobu ve svém okolí v domnění, že to ona může za jeho zpackaný život.

## Chraň před posednutím | exorcismus | 301
Přízeň: 3 × X
Dosah: 20 sáhů
Rozsah: X tvorů
Trvání: 1 hodina
Vzývání: 1 kolo
Obtížnost: 12
Vyžaduje: Exorcismus
Touto prosbou dokáže Exorcista „ukrýt“ sebe i ostatní před očima démonů. Nemohou tak být jimi posednuti ani ovládnuti. Prosba se používá obvykle před Vymítáním, aby se zabránilo „přeskočení“ démona do těla někoho dalšího. Stejně účinná je však i na posvátných územích temných bohů.
Temná alternativa: Klerik takto dokáže „rozzářit“ bytosti ve svém okolí a označit je jako cíl pro nadpozemské bytosti. Ty, pokud mají možnost, volí primárně označené cíle.

## Odhal démona | exorcismus | 301
Přízeň: 10
Dosah: 6 sáhů
Rozsah: 1 tvor
Trvání: 1 hodina
Vzývání: 1 kolo
Obtížnost: Vyšší moc démona
Vyžaduje: Exorcismus
Jestliže sídlí v těle vybraného tvora nadpozemská bytost (démon, ďábel nebo anděl), prosba ho odhalí. Exorcista pak dokáže vidět její éterický vzhled nebo aspoň záři, která z ní vychází. Zároveň i přesně odhadne, jak mocná tato bytost je (tj. jaká je úroveň její Vyšší moci).
Temná alternativa: Klerik dokáže zamaskovat přítomnost démona v něčím těle. Pokud by se někdo pokusil démona odhalit, přičetla by se úroveň Klerika k Vyšší moci démona při ověřovacím hodu. Je-li navíc démon chráněn touto prosbou, nepůsobí na něj obvykle ani svěcená voda.

## Ukaž temnotu | exorcismus | 302
Přízeň: 5
Dosah: koule okolo Klerika o poloměru 5 sáhů
Rozsah: všichni temní tvorové
Trvání: 10 kol
Vzývání: 2 kola
Obtížnost: 12
Vyžaduje: Exorcismus
Touto prosbou dokáže Exorcista zviditelnit všechny neviděné, nemrtvé a nadpozemské bytosti v dosahu. Ty jsou pak viditelné nejen jemu, ale i všem ostatním.
Efektem se podobá obdobné prosbě Najdi temnotu. Nevztahuje se na bytosti ukryté v cizím těle.

## Vyžeň démona | exorcismus | 302
Přízeň: 5 + 3 × Vyšší moc
Dosah: dotek
Rozsah: posedlá bytost
Trvání: ihned
Vzývání: počet minut odpovídající Vyšší moci démona
Ověření: Vůle (CHAR) vs. X (dle démona)
Obtížnost: X (dle démona)
Vyžaduje: Exorcismus
Vyhnání démona je jednou z nejdůležitějších proseb Exorcisty. Aby se o ni mohl vůbec pokusit, musí do ní vložit dostatek Přízně: základ 5 a navíc 3 body Přízně za každou úroveň Vyšší moci démona. Poté provede ověřovací hod na Vůli (CHAR) vs. X, a pokud uspěje, démon je vyhnán a zapuzen z naší sféry.
PŘÍKLAD: Exorcista Tharacus ví z prosby Odhal démona, že Vyšší moc démona je 10. Do prosby proto vloží 5 + 3 × 10 = 35 bodů Přízně. Po deseti minutách se mu podaří démona zahnat do jiné sféry. Jestliže by do prosby nevložil dostatek Přízně nebo úroveň démona podcenil, obřad by se nezdařil.
Temná alternativa: Exorcista umí stejným způsobem někoho i posednout. Do těla nešťastníka přitáhne jednoho ze služebníků (nadpozemskou bytost) svého boha. Ta pak může v našem světě přebývat až do smrti své fyzické schránky.

## Posel bdělosti | jazyk_prastarych | 301
Přízeň: 20
Dosah: 5 mil
Rozsah: -
Trvání: max. 1 měsíc za úroveň Exorcisty
Vzývání: 5 kol
Obtížnost: 15
Vyžaduje: Jazyk prastarých
Exorcista dokáže na vybrané místo přivolat neviditelného nadpozemského strážce. Pokud na místo kdokoliv pronikne nebo se na něm bude cokoliv dít, Exorcista se o tom dozví – posel mu okamžitě předá mentální zprávu. Kromě toho je tento tvor připraven a schopen vetřelce napadnout nebo vykonat jinou jednoduchou akci dle instrukcí Exorcisty.

## Posel domény | jazyk_prastarych | 301
Přízeň: 30
Dosah: 100 sáhů
Rozsah: kruh o poloměru 30 sáhů
Trvání: 5 kol
Vzývání: 3 kola
Obtížnost: 18
Vyžaduje: Jazyk prastarých
Touto prosbou dokáže Exorcista vzývat Posla, který se následně projeví jako efekt domény jeho boha. Zda půjde jen o demonstraci moci, nebo o úder proti nepříteli, rozhoduje Klerik.
V prvním případě se Posel může jevit jako démonická bytost stejně jako atmosférický či elementární jev – polární záře, roj meteorů, rozestoupení vody a podobně.
V druhém případě jde o obdobnou formu, avšak s fyzickým dopadem. Způsob Zranění se může lišit a může být ovlivněn rezistencí, imunitou či slabinou tvorů. V základu však působí v každém kole v celé oblasti Zranění za 1k6 životů / sáh.

## Posel lovec | jazyk_prastarych | 301
Přízeň: 15
Dosah: -
Rozsah: 1 tvor
Trvání: 1 hodina
Vzývání: ihned
Obtížnost: 18
Vyžaduje: Jazyk prastarých
Tento Posel dokáže stopovat ztracené vzpomínky. Pokud nějaký tvor připravil někoho o vzpomínky (zkušenosti či úroveň), může lovec pomoci.
Po seslání prosby se Posel zjeví a očekává, že mu Exorcista ukáže oběť. Pak začne pátrat po tenkém vlákně, které ji spojuje s její ukradenou minulostí, a dovede Exorcistu k bytosti, jež za to mohla.
Pokud si to Klerik přeje, může lovec vzpomínek napadnout zloděje sám. Je-li monstrum poraženo, vzpomínky (zkušenosti či úroveň) se oběti vrátí.

## Posel pečeti | jazyk_prastarych | 302
Přízeň: 8 + 2 za každé další kolo
Dosah: 30 sáhů
Rozsah: max. 1 sáh za úroveň Klerika
Trvání: max. 1 měsíc za úroveň Exorcisty
Vzývání: ihned
Ověření: Vůle (CHAR) vs. Vůle (CHAR) Klerika
Obtížnost: 10
Vyžaduje: Jazyk prastarých
Tento Posel může být vyvolán, aby chránil určité místo. Nemá žádnou hmatatelnou podobu, avšak v myslích tvorů se projevuje jako zhmotnění oslňující světelné bariéry. Výjimkou je sesílající Exorcista a tvorové, které z efektu působení Posla vyjme.
Pokud chce někdo skrze Posla projít, musí uspět v ověřovacím hodu na Vůli (CHAR) vs. Vůle (CHAR) Exorcisty. V opačném případě má oběť panickou hrůzu z tohoto zjevení a není schopna do něj znovu vkročit nebo se jej dotknout.

## Aura bratrství | zazehnuti_aury | 308
Přízeň: 20
Dosah: koule okolo Kněze o poloměru 20 sáhů
Rozsah: všichni tvorové v dosahu
Trvání: 10 kol
Vzývání: 1 kolo
Obtížnost: 18
Vyžaduje: Zažehnutí aury
Po vyslyšení této prosby jsou životy všech tvorů v jejím rozsahu propojeny bratrským poutem. Všechny jejich životy se sečtou a následně podělí podle počtu tvorů. Tím je dána nová hodnota životů každého z nich.
Pokud je kterýkoliv z tvorů raněn, projeví se ztráta životů rovnoměrně na všech. Stejně pak funguje i případné léčení – je-li uzdraven jeden tvor, uzdraví se i všichni ostatní o poměrnou část.

## Aura pravého světla | zazehnuti_aury | 309
Přízeň: 30
Dosah: koule okolo Kněze o poloměru 6 sáhů
Rozsah: všichni tvorové v dosahu
Trvání: 5 kol
Vzývání: 1 kolo
Obtížnost: 20
Vyžaduje: Zažehnutí aury
Je-li prosba vyslyšena, zalije celý kruh aury oslnivá záře přicházející z nebe a zároveň z jejího středu. Záře je viditelná i v noci a mlze, pochází totiž z jiné sféry existence.
Toto světlo zraňuje všechny nemrtvé, neviděné a nadpozemské bytosti uvnitř aury za 1k6+2 životů.
Světlo aury zároveň oslňuje všechny, kteří jsou mimo ni, včetně postav. Mají pak Nevýhodu (postih −5) k jakékoliv akci, která má mířit směrem dovnitř.
Všechny postavy (netýká se monster) uvnitř mají naopak Výhodu (bonus +5) ke své Obraně i všem dalším akcím proti tvorům mimo auru.

## Aura probuzení | zazehnuti_aury | 309
Přízeň: 25
Dosah: koule kolem Kněze o poloměru 20 sáhů
Rozsah: všichni tvorové v dosahu
Trvání: ihned
Vzývání: 1 kolo
Obtížnost: 16
Vyžaduje: Zažehnutí aury
Poté, co je prosba vyslyšena, jsou všechny živé postavy pod Mezí vyřazení znovu přivedeny k vědomí. Jejich nejhorší rány se zahojí a mají 1 život. Cítí se navíc neuvěřitelně odpočatě a svěže.

## Aura strachu | zazehnuti_aury | 309
Přízeň: 25
Dosah: koule okolo Kněze o poloměru 6 sáhů
Rozsah: všichni tvorové v dosahu
Trvání: ihned
Vzývání: 1 kolo
Ověření: Vůle (CHAR) vs. Vůle (CHAR)
Obtížnost: 18
Vyžaduje: Zažehnutí aury
Tato aura dokáže vyvolat nekontrolovatelný strach. Všichni tvorové v rozsahu aury, kteří nedokáží ověřovacím hodem vzdorovat Vůli Kněze, prchají v panice a chaosu. Pryč je žene pocit nadpozemské hrůzy – ne strach z Kněze, ale z čehosi nedefinovatelného, co se blíží. Kněz nemusí být pro účely efektu prosby vůbec vidět.
Efekt strachu u zasažených přetrvává nejméně 1k10 minut.

## Božská pomoc | zazraky | 309
Přízeň: 30
Dosah: dotek
Rozsah: 1 bytost
Trvání: 1 kolo × úroveň Kněze
Vzývání: 1 kolo
Obtížnost: 18
Vyžaduje: Zázraky
Ten, na koho je prosba seslána, získává po dobu jejího trvání Výhodu (bonus +5) k Útoku, Obraně a záchranným hodům. Jeho aktuální životy se navíc v okamžiku seslání prosby dočasně zvýší o 10 + úroveň Kněze. Aktuální počet životů může v tomto případě překonat maximální hodnotu. Po ukončení efektu prosby dotyčný o tyto dodatečné životy přijde.

## Figiho zásah osudu | zazraky | 310
Přízeň: 36
Dosah: dotek
Rozsah: Kněz
Trvání: 1 směna
Vzývání: 4 kola
Obtížnost: 20
Vyžaduje: Zázraky
Troufalý kněz Figi přišel na způsob, jak pomocí svého boha vychýlit běh událostí do alternativy, která mu vyhovuje.
Jakmile je po dobu trvání prosby proveden hod na ověření Dovednosti, Útoku či Obrany a kněz je s výsledkem nespokojený, může se rozhodnout, že ho změní (u Útoku či Obrany si vybere číslo od 1 do 6, u hodu na Dovednost číslo od 1 do 10). Učiní tak v okamžité reakci, a proto ho to nestojí žádný čas. Takto změnit však dokáže jen 3 události, potom prosba předčasně skončí.

## Vrať čas | zazraky | 310
Přízeň: 50
Dosah: 100 sáhů
Rozsah: kruh o poloměru 100 sáhů
Trvání: ihned
Vzývání: 1 kolo
Obtížnost: 30
Vyžaduje: Zázraky
Tento zázrak je až na samé hranici udržení božské neutrality. Kněz musí mít opravdu životně důležitý důvod, aby ho bůh vyslyšel.
Jakmile je prosba vyslyšena, vrátí se čas v daném místě obvykle o 6 kol zpět. Kněz i tvorové, kteří byli mimo dosah prosby, si pamatují vše, co se stalo. Všichni ostatní v dosahu však prožijí celou situaci znovu.
Pokud je prosba seslána v boji nebo těsně po něm, vrací se čas do okamžiku jeho zahájení. Počet kol se v tomto případě neřeší.

## Zachraň život | zazraky | 310
Přízeň: 40
Dosah: dotek
Rozsah: 1 bytost
Trvání: ihned
Vzývání: 1 kolo
Obtížnost: 22 (+1 za každých 10 minut od úmrtí)
Vyžaduje: Zázraky
Zachraň život je jedna z nejmocnějších proseb nejvyšší nouze. Kněz díky ní dokáže u boha vyprosit oživení zemřelého.
Prosba by měla být provedena co nejdříve – za každých deset minut od úmrtí se zvyšuje obtížnost o 1 bod. Lze ji úspěšně provést jen tehdy, je-li zachováno tělo mrtvého. Duše se do něj vrátí a rány se zahojí; oživený má 1 život a zmatené obrazy podivného místa, které během dne odezní. Bylo-li tělo zničeno, oživení není možné.
Za záchranu života Kněz zaplatí částí sebe sama, ale i mrtvého: zkušenosti každého z nich se sníží na hranici přestupu na jejich předchozí úroveň.
"""

LEKY = r"""
## Lék svatého Aurélia | vycvik_lazaretnich_lecitelu | 307
Přízeň: 30
Základ: hrst léčivých bylin, pálenka
Trvání: 1 hodina
Výroba: 1 směna
Použití: pozření
Četnost: 1× týdně
Obtížnost: 10 (Znalost přírody)
Lék svatého Aurélia patří k nejsilnějším zbraním proti sněti a nemagickým otravám krve. Do hodiny po pozření je dokáže zcela neutralizovat. Zároveň vyléčí 3k6 životů a srazí horečku.

## Lék svatého Jana | vycvik_lazaretnich_lecitelu | 307
Přízeň: 60
Základ: hrst léčivých bylin, víno
Trvání: ihned
Výroba: 4 směny
Použití: pozření
Četnost: 1× týdně
Obtížnost: 15 (Znalost přírody)
Lék svatého Jana je zázračný životabudič. Po pozření vyléčí raněnému 5k6+6 životů a zahojí veškeré krvácení.

## Lék svatého Maura | vycvik_lazaretnich_lecitelu | 307
Přízeň: 30
Základ: bezinky, voda
Trvání: 3 hodiny
Výroba: 1 směna
Použití: pozření
Četnost: 1× denně
Obtížnost: 15 (Znalost přírody)
Tento lék dokáže ihned zcela utlumit veškerou bolest a odstranit postihy z ní vyplývající. Nezpůsobuje přitom ospalost ani otupělost, která je u jiných tlumičů bolesti obvyklá.

## Lék svatého Núbia | vycvik_lazaretnich_lecitelu | 307
Přízeň: 30
Základ: měsíček lékařský, voda
Trvání: ihned
Výroba: 10 kol
Použití: polití
Četnost: 1× denně
Obtížnost: 9 (Znalost přírody)
Pomocí tohoto léku je možné zcela zahojit popáleniny a poleptání kůže. Jedna dávka (flakón) stačí na zranění o velikosti lidské paže nebo hrudníku. Léčba se provádí poléváním a omýváním rány.
Lék vrátí raněnému tolik životů, kolik mu způsobilo dané Zranění, a kůže se do týdne zregeneruje. Je-li rána starší než den, lék už životy nevrací; u ran starších týdne zůstává trvalé poškození kůže.

## Mast svaté Meredith | vycvik_lazaretnich_lecitelu | 307
Přízeň: 15
Základ: dubová kůra, sádlo
Trvání: ihned
Výroba: 1 směna
Použití: potření
Četnost: 1× denně
Obtížnost: 12 (Znalost přírody)
Počet: 5 dávek
Tato mast dokáže účinně eliminovat následky omrzlin (včetně odumření tkání). Jedna dávka vystačí na Zranění velikosti paže či hrudníku. Mast vrátí raněnému tolik životů, kolik ztratil daným Zraněním; kůže i podkoží do týdne zregenerují. Je-li omrzlina starší než 12 hodin a tkáň odumřela, mast už nepomůže.
Vedlejším efektem masti je schopnost hojit modřiny a podlitiny – zmizí do minuty po potření.
"""

LEK_KEYS = {"Přízeň": "prizen", "Základ": "zaklad", "Trvání": "trvani", "Výroba": "vyroba", "Použití": "pouziti",
            "Četnost": "cetnost", "Obtížnost": "obtiznost", "Počet": "pocet"}


def parse_lek(block: str) -> dict:
    lines = block.strip().split("\n")
    name, group, page = [x.strip() for x in lines[0].lstrip("#").split("|")]
    p: dict = {"nazev": name, "skupina": group, "strana": int(page), "zdroj": "PPP06", "typ": "lek"}
    body = []
    for ln in lines[1:]:
        m = re.match(r"^([A-ZÁ-Žа-я][a-zá-ž]+):\s*(.*)$", ln)
        if m and m.group(1) in LEK_KEYS and not body:
            p[LEK_KEYS[m.group(1)]] = m.group(2).strip()
        else:
            body.append(ln)
    p["popis"] = "\n".join(body).strip()
    return p


def main() -> None:
    prosby = []
    for b in re.split(r"\n(?=## )", PROSBY.strip()):
        p = parse_block(b)
        p["zdroj"] = "PPP06"
        prosby.append(p)
    leky = [parse_lek(b) for b in re.split(r"\n(?=## )", LEKY.strip())]
    abil = lambda t, spec=None: {"id": t[0], "nazev": t[1], "strana": t[2], "efekt": t[3], **({"spec": spec} if spec else {})}
    data = {
        "_zdroj": "Draci_hlidka_PPP_06_Klerik.pdf, kap. 7 (s. 279–310) – tools/ppp06_klerik_src.py",
        "dar_zivota": DAR_ZIVOTA,
        "obecna_pravidla": OBECNE,
        "volitelne": [abil(t) for t in VOLITELNE],
        "specializace": {sid: {"nazev": s["name"], "strana": s["page"], "uvod": s["intro"],
                               "auto": [abil(t, sid) for t in s["auto"]], "volitelne": [abil(t, sid) for t in s["opt"]]}
                         for sid, s in SPECS.items()},
        "videni_many": [{"mana": a, "obtiznost": b} for a, b in VIDENI_MANY],
        "poslove": POSLOVE,
        "prosby": prosby,
        "leky": leky,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)}: {len(prosby)} proseb, {len(leky)} léků, {len(VOLITELNE)} + {sum(len(s['opt']) + len(s['auto']) for s in SPECS.values())} schopností")


if __name__ == "__main__":
    main()
