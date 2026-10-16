"""Zloděj PPP05 (Pravidla pro pokročilé, kap. 6 Zloděj, s. 239–278) → docs/ppp05_zlodej.json   (7e.0)

Přepis z textové vrstvy Draci_hlidka_PPP_05_Zlodej.pdf (projekt; strukturovaný výtah claude/data/ppp05_zlodej.json
z 27. 9. 2026). Plná znění schopností, triků, předmětů, jedů, pastí a akcí Siccovy sítě.

Rozhodnutí (✔ U): podmínky specializací podle H12 (dvě pevné podmínky, třetí z PPP se nepoužívá); text má přednost před
souhrnnou tabulkou – Mistrovství síly osobnosti učí Manipulaci a Podstrčení předmětu (tabulka uvádí „Odhad sociálního statusu“),
Expertiza +1 dovednostní bod (tabulka „tolik bodů, kolik je hodnota“); Páčidlo = Sochor.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "ppp05_zlodej.json"

PRAVIDLA = {
    "pokrocily": "Na 6. úrovni se ze Zloděje stává pokročilý dobrodruh a získá dvě rozšíření, společná všem Zlodějům bez ohledu na specializaci: Speciální předměty Zloděje a Zlodějský cech.",
    "tetovani": "Symbolem Zlodějů je kočka (často podle „rodiny“, které dal Zloděj slib); specializace přidává vlastní znak – Assassin had, Lupič klíč, Sicco znak své sítě. Tetování bývá na pěsti, chytřejší ho mají na předloktí. Bez pravidlového efektu.",
    "triky": "Zlodějské triky se zdánlivě podobají válečnickým. Četnost: u triků použitelných v boji obvykle platí, že je lze použít jen jednou za celý souboj. Použití: ke každé akci Útok či Obrana jen jeden trik, nejdou kombinovat ani sčítat; při víc útocích či obranách za kolo lze trik zkusit u každé. Ověření: hod na zlodějské Umění (dovednost), ke kterému trik patří; obtížnost určí PJ nebo je to hod protivníka. Od verze 1.2 jsou původní zlodějské dovednosti „akcemi“ uvnitř Umění.",
    "specialni_predmety": "Předměty, které se v běžném obchodě neseženou – kupují se na černém trhu Zlodějského cechu (dodávají je lupiči, zbrojíři, alchymisté a překupníci za vyšší cenu). Bomby vyrobí dle zlodějových specifikací jakýkoli Alchymista (suroviny a základ v tabulce, výroba 1 směna); zbraně jinak vyrobí Lupič se schopností Lupičská udělátka.",
    "cech": "Od 6. úrovně přístup do místních doupat podsvětí – Zloděj rozpozná skryté značky. Sídlo cechu je neutrální místo s přísnými pravidly (zákaz krást, vraždit, podvádět ve hrách), pod ochranou syndikátů. Funguje tu černý trh, uzavírají se dohody a zakázky, dá se tu ukrýt před spravedlností a získat zákulisní informace (kontakty, razie gardy, vypsané odměny). Přístup jen „lidé z profese“; vyzrazení polohy = doživotní vyloučení a odměna na hlavu.",
    "schranky": "Tajné schránky (uvolněný kámen, prasklá váza, dutá trubička pod stolem) slouží k předávání zpráv bez setkání. Každý Zloděj zná základní nouzová místa schránek cechu ve městě; rodiny a bratrstva mají vlastní.",
    "specializace": "Od 6. úrovně (při přestupu, oznámit PJ) se Zloděj může stát Assassinem, Lupičem nebo Siccem – je třeba mít zvládnuté podmínky. Specializace není povinná a volba je natrvalo. Se specializací lze dál brát i obecné schopnosti Zloděje. Bez specializace smí Zloděj na každé 6. úrovni vzít jednu schopnost kterékoli specializace.",
    "holubi": "Přes cech lze koupit poštovní holuby (5 zl za kus), kteří donesou zprávu do vybraného města – tamní cech ji předá adresátovi.",
}

# id, název, strana, krátce, plné znění
OBECNE = [
    ("boj_se_dvema_zbranemi", "Boj se dvěma zbraněmi", 246, "K boji beze zbraně nebo lehké jednoruční zbrani ve druhé ruce lehká krátká zbraň – statistiky se sčítají.",
     "Když Zloděj bojuje beze zbraně nebo s jednoruční lehkou zbraní, může v druhé ruce držet navíc i lehkou krátkou zbraň a efektivně ji využít. Statistiky obou zbraní se pro boj sčítají. Bonusy za schopnosti vyžadující určitý typ zbraně se uplatní pro obě zbraně, vždy však jen jednou.\nPříklad: Kvítko s kordem (5/0/2) a dýkou (2/1/1) a Vražedným ostřím (2/0/2) má v součtu 9/1/5. Kramář s okovanými rukavicemi (0/1/1), nožem (1/1/0), Bojem beze zbraně (3/0/3) a Vražedným ostřím (2/0/2) má 6/2/6."),
    ("cileny_utok", "Cílený útok", 247, "Útok −5 na hlavu, ruku nebo nohu; po zásahu Reflex vs. Reflex – krvácení a −1 CHAR / −5 Útok a gesta / poloviční Pohyblivost.",
     "Zloděj zaměří Útok na ruku, nohu nebo hlavu – útočí s Nevýhodou −5 a po zásahu hází Reflex (OBR) vs. Reflex (OBR) protivníka. Při úspěchu:\n• hlava (zohavení obličeje) – Krvácivé zranění 1k6 a základ Charismatu −1,\n• ruka (zmrzačení ruky) – Nevýhoda −5 na Útok (ÚČ) a gestikulaci,\n• noha (zmrzačení nohy) – Pohyblivost na polovinu.\nÚčinky trvají do důkladného ošetření. Lze kombinovat se Zlodějskými triky použitelnými do útoku."),
    ("citliva_mista", "Citlivá místa", 247, "+3 ke Zranění střelnými, vrhacími a lehkými zbraněmi (i pěstmi).",
     "Dodatečné zranění +3 při útocích vedených střelnými a vrhacími zbraněmi, lehkými zbraněmi a pěstmi při boji tváří v tvář."),
    ("expertiza", "Expertiza", 247, "Při přestupu jedna dovednost až o 2 stupně (max. úroveň + 2); +1 dovednostní bod za úroveň (zpětně).",
     "Při každém přestupu na vyšší úroveň může Zloděj navýšit zvládnutí vybrané dovednosti o 2 stupně najednou, vždy nejvýše na úroveň + 2. Zároveň se zvyšuje počet dovednostních bodů za přestup o 1 (platí Pravidlo zpětné opravy). V appce: body jen na sudých úrovních (✔ U)."),
    ("mistrovstvi_sily_osobnosti", "Mistrovství síly osobnosti", 247, "+1 k Hazardním hrám a Přesvědčování; triky Manipulace a Podstrčení předmětu.",
     "Rozšiřuje Základy zlodějského umění – akce spojené s Hazardními hrami a Přesvědčováním: +1 k ověřovacím hodům. Otevírá 2 zlodějské triky: Manipulace a Podstrčení předmětu. (Souhrnná tabulka uvádí „Odhad sociálního statusu“ – platí text.)"),
    ("mistrovstvi_zlatky", "Mistrovství zlatky", 248, "+1 k Odhadu ceny a Vybírání kapes; triky Handlování a Ukrytí předmětu.",
     "Rozšiřuje Základy zlodějského umění – akce spojené s Odhadem ceny a Vybíráním kapes: +1 k ověřovacím hodům. Otevírá 2 zlodějské triky: Handlování a Ukrytí předmětu."),
    ("nocni_zivel", "Noční živel", 249, "V bezprostřední blízkosti všechny běžné akce i v naprosté tmě bez Nevýhody.",
     "Zloděj se v naprosté tmě orientuje sluchem, hmatem a čichem: nemá Nevýhodu, když útočí ve tmě tváří v tvář, určí polohu nepřítele podle zvuků a bez postihu používá dovednosti. PJ posoudí, zda je akce poslepu vůbec možná (číst nejde, past spouštěnou jemným dotykem nenajde)."),
    ("obratny_bojovnik", "Obratný bojovník", 249, "Beze zbraně nebo s lehkými zbraněmi do Útoku OBR místo SIL.",
     "Bojuje-li Zloděj tváří v tvář beze zbraně nebo s lehkými zbraněmi, může si do Útoku (ÚČ) započítat bonus za obratnost (OBR) místo bonusu za sílu (SIL)."),
    ("rychle_taseni", "Rychlé tasení", 249, "1× za kolo okamžitou akcí přezbrojit, vypít lektvar nebo aplikovat jed.",
     "Jedenkrát za kolo dokáže Zloděj během své okamžité akce přezbrojit, vypít lektvar nebo aplikovat jed na zbraň."),
    ("svizne_ostri", "Svižné ostří", 249, "Tváří v tvář beze zbraně či s lehkými zbraněmi 3 útoky za 2 kola, od 12. úrovně 2 za kolo.",
     "Při boji tváří v tvář beze zbraně nebo s lehkými zbraněmi může Zloděj útočit 3× za 2 kola. Od dvanácté úrovně 2× za kolo."),
    ("sesty_smysl", "Šestý smysl", 250, "Výhoda +5 k náhlým hodům na Postřeh a Reflex, trvale +3 k Iniciativě.",
     "Výhoda +5 k náhlým hodům na Postřeh a Reflex – ke všem, k nimž ho vyzve PJ (šipka z mechanismu pasti, plížící se nepřátelé, překvapivé útoky). Neprojevuje se při cílené činnosti (hledání pastí) ani při Cíleném útoku. Navíc trvale +3 k Iniciativě."),
    ("technika_nabijeni", "Technika nabíjení", 250, "Kuše nemají nárok na SIL, ale na OBR.",
     "Nabíjecí kladky: kuše, na které nemá Zloděj dost síly, používá efektivně – požadavek na SIL nahradí OBR. Příklad: střední kuše potřebuje +0 OBR místo +0 SIL."),
]

SPEC = {
    "assassin": {
        "nazev": "Assassin", "strana": 251, "podminky_ppp": ["Umění rváčů", "Umění skrývání", "Vrhání dýk"],
        "uvod": "Nejobávanější zabijáci podsvětí, stíhaní lovci odměn – sdružují se do malých bratrstev, kterým jsou naprosto oddáni; za vraždu člena se platí krví.",
        "auto": [
            ("bratrstvo_assassinu", "Bratrstvo Assassinů", 252, "Uzavřený spolek (znak had, tetování podle klanu). Ve Zlodějském cechu tajné informace o vraždách a únosech v oblasti, vypsaných odměnách a zakázkách. Klan, jeho cíle a znamení si dohodni s PJ."),
            ("vrazedne_zbrane", "Vražedné zbraně", 252, "Se zbraněmi označenými jako Assassinské +3 do Útoku (ÚČ) a Obrany (OČ)."),
        ],
        "volitelne": [
            ("assassinace", "Assassinace", 252, "Zásah tvora, který ho nevidí nebo se nemůže bránit = dvojnásobná Zranění.",
             "Zasáhne-li Assassin Útokem postavu, která ho nevidí (útok ze stínů, neviditelnost, ze zálohy) nebo se nemůže bránit (vyplýtvaná Aktivní obrana, Paralýza, Útok na bezbranného), jsou veškerá jím způsobená zranění daného Útoku dvojnásobná."),
            ("mistrovstvi_rvacu", "Mistrovství rváčů", 252, "+1 k Umění rváčů; triky Dokonalá muška, Otřesení, Přesný zásah.",
             "K dokonalosti vytrénované Umění rváčů: +1 k ověřovacím hodům na Umění rváčů. Otevírá 3 zlodějské triky (ověřují se stupněm této dovednosti): Dokonalá muška, Otřesení, Přesný zásah."),
            ("mistrovstvi_skryvani", "Mistrovství skrývání", 254, "+1 k Umění skrývání; triky Infiltrace, Pán stínů, Utajený útok.",
             "K dokonalosti vytrénované Umění skrývání: +1 k ověřovacím hodům na Umění skrývání. Otevírá 3 zlodějské triky: Infiltrace, Pán stínů, Utajený útok."),
            ("riskantni_utok", "Riskantní útok", 255, "1× za kolo vymění jednu Obranu za Útok navíc.",
             "Assassin může během kola vyměnit jednu svou Obranu za Útok navíc. V daném kole jen jednou."),
            ("umeni_prepadu", "Umění přepadů", 255, "Nová dovednost (OBR) na 5. stupni; triky Hlavounova finta, Kontrolovaná trajektorie, Prohození pozic.",
             "Nová profesní dovednost Umění přepadů (OBR), kterou Assassin ovládá rovnou na 5. stupni. Dává 3 zlodějské triky použitelné v boji: Hlavounova finta, Kontrolovaná trajektorie, Prohození pozic."),
            ("vejir_dyk", "Vějíř dýk", 256, "Vrhne 2 projektily najednou (i na různé cíle), každý s Nevýhodou −5.",
             "K Útoku vrhací zbraní použije i dva projektily najednou – ke každému Útoku má Nevýhodu −5, může jimi mířit i na různé cíle a na Útok hází za každý zvlášť."),
            ("vyhodna_pozice", "Výhodná pozice", 256, "První Útok v souboji: místo k6 rovnou 6 + další hod; znovu za cenu jednoho Útoku.",
             "Při prvním Útoku v souboji si místo hodu k6 započítá rovnou 6 a teprve k ní přičte výsledek následujícího hodu – šance na kritický (krvácivý) Útok rapidně vzroste. Během souboje ji může získat znovu tak, že se vzdá jednoho svého Útoku (i při vícenásobných útocích); pro další Útok pak znovu platí."),
            ("vyroba_jedu", "Výroba jedů", 256, "Chová exotická zvířata – denně 1 dávka jedu (Černá smrt, Divotvorné sérum, Měsíční polibek).",
             "Assassin chová vzácné drobné exotické živočichy (hady, žáby, pavouky) a každý den z nich získá jednu dávku jedu. Jedy lze požít, nebo jimi potřít čepel či hrot šípu – pak působí při prvním Zranění protivníka a setřou se (další Útoky už neotráví)."),
        ],
    },
    "lupic": {
        "nazev": "Lupič", "strana": 257, "podminky_ppp": ["Umění železného klíče", "Umění kočičího pohybu", "Improvizace"],
        "uvod": "Cílem už nejsou kapsy měšťanů, ale dobře střežené trezory bank a gild chráněné magií, zámky a pastmi. Ani při konfrontaci s ochrankou nesmí zpanikařit.",
        "auto": [
            ("bratrstvo_lupicu", "Bratrstvo lupičů", 258, "Uzavřený spolek (znak klíč). Ve Zlodějském cechu tajné informace k vytipování cílů loupeže – vzácné zboží ve městě či na cestě, majitel, cena, místo, zabezpečení; vypsané odměny a zakázky. Klan si dohodni s PJ."),
            ("improvizovane_zbrane", "Improvizované zbraně", 258, "S improvizovanými zbraněmi (střep, svícen, kůl i zbraně cechu označené jako improvizované) +3 do Útoku (ÚČ) i Obrany (OČ). Sebrání předmětu = akce Přezbrojení; PJ určí, zda jde o obdobu krátké lehké (2/1/1, dostřel 6/15) nebo lehké obouruční zbraně (5/0/1)."),
        ],
        "volitelne": [
            ("bojova_kreativita", "Bojová kreativita", 258, "První kolo s novou improvizovanou zbraní Výhoda +5 do ÚČ i OČ.",
             "V prvním kole, kdy Lupič využije Improvizovanou zbraň, získá Výhodu +5 do Útoku (ÚČ) i Obrany (OČ). Pro obnovení musí v dalším kole přezbrojit za jinou, dosud nepoužitou improvizovanou zbraň a znovu protivníka překvapit."),
            ("druha_sance", "Druhá šance", 259, "1× denně okamžitě zopakuje neúspěšný hod na profesní dovednost.",
             "Selže-li Lupič v hodu na profesní dovednost (např. Umění železného klíče u Odstranění pastí), může se okamžitě pokusit ještě jednou – zopakuje ověřovací hod. Extrémně stresující: nejvýše 1× za den. Se systémem únavy stojí 8 bodů."),
            ("lupicska_udelatka", "Lupičská udělátka", 259, "Vyrábí zbraně Zlodějského cechu a udělátka Padák, Sada univerzálních klíčů, Zvonící koule.",
             "Lupič ovládne výrobu speciálních zbraní Zlodějského cechu (s. 242) – může je vyrábět na cestách místo nákupu v cechu. Zvládne i tři lupičská udělátka: Padák, Sada univerzálních klíčů, Zvonící koule. Cena u předmětů zahrnuje i materiál potřebný k výrobě."),
            ("lupicuv_partak", "Lupičův parťák", 260, "Vycvičené zvíře – potkan, papoušek, kočka nebo opice (záložka Přátelé).",
             "Lupič si vycvičí drobné zvíře, které mu pomáhá nebo za něj i loupí: potkan, papoušek, kočka nebo opice. Zvíře má vlastní hlavu – v ohrožení může utéct. Přijde-li o parťáka, nového vycvičí až na další úrovni. Hodnoty a růst viz záložka Přátelé."),
            ("mistr_uteku", "Mistr útěku", 261, "Pohyblivost +10; při Přesunu/Sprintu se může bránit svým OČ.",
             "Pohyblivost Lupiče je o 10 vyšší. Při pohybové akci Přesun / Sprint se navíc může bránit svým Obranným číslem (OČ)."),
            ("mistrovstvi_kociciho_pohybu", "Mistrovství kočičího pohybu", 261, "+1 k Umění kočičího pohybu; triky Flexibilita, Parkur, Útok z výšky.",
             "K dokonalosti vytrénované Umění kočičího pohybu: +1 k ověřovacím hodům. Otevírá 3 zlodějské triky: Flexibilita, Parkur, Útok z výšky."),
            ("mistrovstvi_zelezneho_klice", "Mistrovství železného klíče", 262, "+1 k Umění železného klíče; triky Nastražení pasti, Otevírání magických zámků, Padělání cenností.",
             "K dokonalosti vytrénované Umění železného klíče: +1 k ověřovacím hodům. Otevírá 3 zlodějské triky: Nastražení pasti, Otevírání magických zámků, Padělání cenností."),
            ("umeni_neferoveho_boje", "Umění neférového boje", 265, "Nová dovednost (OBR) na 5. stupni; triky Podkopnutí, Souboj na zemi, Útok do slabin.",
             "Nová profesní dovednost Umění neférového boje (OBR) rovnou na 5. stupni – zákeřné pohyby pouličních rváčů. Dává 3 zlodějské triky: Podkopnutí, Souboj na zemi, Útok do slabin."),
        ],
    },
    "sicco": {
        "nazev": "Sicco", "strana": 267, "podminky_ppp": ["Umění proměn", "Umění šarmu", "Zlodějská hantýrka"],
        "uvod": "Sicco do žádné organizace nevstupuje – je tím, kdo ji vytváří a vládne jí: hlava rodiny, šedá eminence nad sítí informátorů a vykonavatelů.",
        "auto": [
            ("siccova_sit", "Siccova síť", 268, "Vlastní zločinecká organizace – nejvýše tolik kumpánů, kolik je úroveň Sicca; první člen každého typu je kápo týmu. Akce sítě: 1k10 + 1 za každého zapojeného kumpána vs. obtížnost PJ."),
            ("zbrane_gentlemana", "Zbraně gentlemana", 272, "Se všemi gentlemanskými zbraněmi (Zlodějský cech) +3 do Útoku (ÚČ) i Obrany (OČ)."),
        ],
        "volitelne": [
            ("alter_ego", "Alter ego", 272, "Falešná identita – Výhoda +5 ke všem zlodějským dovednostem s CHAR.",
             "Zfalšovanými dokumenty, podplácením a studiem regionů vytvoří Sicco věrohodnou neexistující osobnost s alibi (může jich mít víc – přízvuk, chůze, chování, povaha, krycí legenda s příbuznými). Získá tak Výhodu +5 ke všem zlodějským dovednostem využívajícím CHAR."),
            ("duvernik", "Důvěrník", 272, "Loajální rádce a bodyguard bez žoldu; v boji ho ovládá hráč (záložka Přátelé).",
             "Blízký přítel, kterému Sicco zachránil život nebo pomohl z neřešitelné situace – zapřísáhlý stoupenec a bodyguard, rádce a pravá ruka. Získá se v herní situaci (řekni Vypravěči a vyčkej na příležitost). Doprovází Sicca na cestách nebo spravuje jeho záležitosti, poslouchá rozkazy, za Sicca obětuje i život. Je napojen na síť a její zisky – žold nepotřebuje. V boji o jeho akcích rozhoduje Sicco, mimo boj ho obvykle vede Vypravěč."),
            ("mistrovstvi_promen", "Mistrovství proměn", 273, "+1 k Umění proměn; triky Hraní mrtvého, Makety, Falešné tváře.",
             "K dokonalosti vytrénované Umění proměn: +1 k ověřovacím hodům. Otevírá 3 zlodějské triky: Hraní mrtvého, Makety, Falešné tváře."),
            ("mistrovstvi_sarmu", "Mistrovství šarmu", 274, "+1 k Umění šarmu; triky Odhad nepřítele, Ostrý jazyk, Sladká slova.",
             "K dokonalosti vytrénované Umění šarmu: +1 k ověřovacím hodům. Otevírá 3 zlodějské triky: Odhad nepřítele, Ostrý jazyk, Sladká slova."),
            ("povesti_a_drby", "Pověsti a drby", 275, "Za ≥ 1 den šíření dá osobě Výhodu +5 nebo Nevýhodu −5 k sociálním interakcím tam, kde se o ní ví.",
             "Sicco ovlivňuje veřejné mínění o osobě, místě či události. Šíření zabere aspoň 1 den hovorů s co nejvíc lidmi, pak se pověst šíří sama. Osoba získá Výhodu +5 nebo Nevýhodu −5 ke všem sociálním interakcím – jen tam, kde o ní někdo slyšel. Pověst platí, dokud ji nepřebije opačná."),
            ("sifrovani", "Šifrování", 276, "Šifra = hod Čtení a psaní +5; dešifrování s Výhodou +5; zpráva nebo naučení klíče 1 směna.",
             "Obtížnost šifry je dána hodem Sicca na Čtení a psaní (INT) s Výhodou +5. Kdo zná klíč, přečte ji automaticky; kdo ne, musí hodit Čtení a psaní (INT) vs. obtížnost šifry. Sicco má k dešifrování Výhodu +5. Zašifrování zprávy obvykle 1 směna, stejně tak naučení klíče jiné inteligentní postavě."),
            ("umeni_boje_s_plastem", "Umění boje s pláštěm", 276, "Nová dovednost (OBR) na 5. stupni; triky Držení, Oslepení pláštěm, Svedení útoku.",
             "Nová profesní dovednost Umění boje s pláštěm (OBR) rovnou na 5. stupni – plášť s vpletenými háčky jako zbraň. Dává 3 zlodějské triky: Držení, Oslepení pláštěm, Svedení útoku."),
            ("zrcadleni", "Zrcadlení", 278, "1× denně okamžitě (nejpozději další kolo) napodobí fyzickou akci či trik viděného humanoida se svými atributy.",
             "Vykoná-li humanoid v dohledu bojovou akci, bojový trik, schopnost, dovednost či techniku, může ji Sicco okamžitě napodobit (v daném či nejpozději následujícím kole) se svými atributy – i válečnický trik, nebo Výhodu +5 k dovednosti, kterou napodobuje. Nejvýše 1× denně."),
        ],
    },
}

# skupina (schopnost), umění/dovednost ověření, název, strana, četnost, použití, ověření, popis
TRIKY = [
    ("mistrovstvi_sily_osobnosti", "presvedcovani", "Manipulace", 248, "jednorázově", "kdykoliv", "Přesvědčování (CHAR) vs. Vůle (CHAR)",
     "Psychický tlak na osobu, nad níž má Zloděj převahu – při rozhovoru navede cíl otázkami tak, že nedopatřením vyzradí informaci, kterou si dobře střeží. Musí překonat Vůli (CHAR).\nV krajním případě násilné přesvědčování: Výhoda +5, ale cíl musí mít strach a nemít kam utéct (zablokovaný v temné uličce) – vytáhne i nejtajnější informace."),
    ("mistrovstvi_sily_osobnosti", "hazardni_hry", "Podstrčení předmětu", 248, "jednorázově", "kdykoliv", "Hazardní hry (OBR) vs. Postřeh (INT)",
     "Zloděj nezpozorován podstrčí postavě v dosahu cinknutou kostku do kapsy, eso do rukávu, kradený prsten či falešný dokument – pak už ji stačí obvinit. Jde i mimo herní stůl (v davu, při „nechtěném“ nárazu). Není-li přistižen, oběť se nad situací zamyslí příliš pozdě."),
    ("mistrovstvi_zlatky", "odhad_ceny", "Handlování", 248, "neomezeně", "kdykoliv", "Odhad ceny (INT) vs. X",
     "„Nakoupit levně a prodat za dvojnásobek.“ Při úspěchu přesně odhadne cenu i neznámých či magických předmětů, pozná, zda obchodník prodává pod cenou nebo předražuje, a často i zhruba odkud předmět pochází či kdo ho vyrobil.\nK handrkování o ceně má obecně Výhodu +5; při úspěchu obchodník prodá se slevou nebo odkoupí za spravedlivou cenu."),
    ("mistrovstvi_zlatky", "vybirani_kapes", "Ukrytí předmětu", 249, "neomezeně", "kdykoliv", "Vybírání kapes (OBR) vs. Postřeh (INT)",
     "Zloděj ukryje předmět na svém těle nebo v něm – malý předmět (dýka, paklíč) propašuje i přes prohlídku stráží. Větší předmět: Nevýhoda −5; specifické zlodějské předměty (zbraně z cechu): Výhoda +5. Maximální velikost určí PJ."),
    ("mistrovstvi_rvacu", "umeni_rvacu", "Dokonalá muška", 253, "neomezeně", "do Útoku", "Umění rváčů (OBR) vs. Reflex (OBR)",
     "Intuitivní a rychlejší obdoba Oka střelce – jen v boji, součást běžného střeleckého Útoku. Překoná-li Assassin Reflex protivníka, získá ke svému Útoku (ÚČ) Výhodu +5."),
    ("mistrovstvi_rvacu", "umeni_rvacu", "Otřesení", 253, "jednorázově", "do Útoku", "Umění rváčů (OBR) vs. Výdrž (ODO)",
     "Rychlý přesný úder do hlavy i poté, co byl Assassin spatřen (na rozdíl od Omráčení). Útok tváří v tvář s Nevýhodou −5; zasáhne-li, protivníka zraní a hodí Umění rváčů vs. Výdrž – při úspěchu je cíl otřesen: celé 1 kolo se vzpamatovává a nemůže dělat nic jiného."),
    ("mistrovstvi_rvacu", "umeni_rvacu", "Přesný zásah", 253, "jednorázově", "do Útoku", "Umění rváčů (OBR) vs. Reflex (OBR)",
     "Assassin najde místo, kde kovář šetřil železem. Uspěje-li proti Reflexu, po falešném výpadu zasáhne v Útoku tváří v tvář nechráněné místo: cíl je chráněn jen opravou za OBR – Útok ignoruje obranu zbraně, štít, zbroj i hod cíle na obranu."),
    ("mistrovstvi_skryvani", "umeni_skryvani", "Infiltrace", 254, "neomezeně", "kdykoliv", "Umění skrývání (OBR) vs. X",
     "Při úspěchu Assassin vysleduje, kdo a kudy do objektu vchází, jak se obléká, kdy se mění stráže a další užitečné informace. Průzkum zabere aspoň 1 směnu, s každou další se obtížnost sníží o 1.\nPři hodech, kterým tyto informace pomohou (převlek, imitace hlasu velitele stráží, splynutí se služebnictvem), má Výhodu +5."),
    ("mistrovstvi_skryvani", "umeni_skryvani", "Pán stínů", 254, "neomezeně", "kdykoliv", "Umění skrývání (OBR) vs. Postřeh (INT)",
     "Během krátké akce v souboji se Assassin schová ve stínech – musí být aspoň z poloviny v krytu nebo mít kolem stín (i dým, kouřová clona, kouzla Mlha a Tma). Překoná-li Postřeh nepřítele, je pro něj téměř neviditelný (výhody jako proti neviditelnému, PPZ H 1.1 s. 178) a ve stínu se pohybuje nejvýše ¼ Pohyblivosti. Křik, Útok či jiné upozornění, nebo úspěšný Postřeh nepřítele v dalším kole ho opět zviditelní."),
    ("mistrovstvi_skryvani", "umeni_skryvani", "Utajený útok", 254, "neomezeně", "do Útoku", "Umění skrývání (OBR) vs. Postřeh (INT)",
     "Jen pokud Assassin není viděn. Uspěje-li proti Postřehu protivníka, proběhne Útok v naprosté tichosti – nepřítel neurčí, odkud přišel, a Assassin zůstává skryt."),
    ("umeni_prepadu", "umeni_prepadu", "Hlavounova finta", 255, "jednorázově", "namísto Útoku", "Umění přepadů (OBR) vs. Reflex (OBR)",
     "Místo Útoku. Překoná-li soupeřův Reflex, vyrazí mu dech – oběť má po dobu 1 kola Nevýhodu −5 ke všem svým akcím."),
    ("umeni_prepadu", "umeni_prepadu", "Kontrolovaná trajektorie", 255, "neomezeně", "do Útoku", "Umění přepadů (OBR) vs. Reflex (OBR)",
     "Součást běžného střeleckého či vrhacího Útoku, nestojí žádný čas. Při úspěchu míří na nechráněnou část těla – neguje bonus do obrany za poloviční či tříčtvrteční kryt. Je-li nepřítel blokován spřátelenou postavou, nehrozí, že ji zasáhne."),
    ("umeni_prepadu", "umeni_prepadu", "Prohození pozic", 255, "neomezeně", "do Útoku", "Umění přepadů (OBR) vs. Reflex (OBR)",
     "Součást běžného Útoku tváří v tvář, nestojí žádný čas. Při úspěchu výpadem zamění svou pozici s pozicí protivníka (výhodnější místo v obklíčení, průchod přes blokujícího nepřítele)."),
    ("mistrovstvi_kociciho_pohybu", "umeni_kociciho_pohybu", "Flexibilita", 262, "neomezeně", "do obrany", "Umění kočičího pohybu (OBR) vs. Reflex (OBR)",
     "Přemety, kotouly a záklony v boji. Brání-li se Lupič aktivně, může použít trik: uspěje-li proti Reflexu útočníka, má k Obraně (OČ) Výhodu +5; neuspěje-li, má k ní Nevýhodu −5."),
    ("mistrovstvi_kociciho_pohybu", "umeni_kociciho_pohybu", "Parkur", 262, "neomezeně", "kdykoliv", "Umění kočičího pohybu (OBR) vs. X",
     "Kdykoli v rámci pohybové akce. Při úspěchu překoná náročný terén bez postihu na rychlost a při lezení se pohybuje stejně rychle jako po rovné zemi. Obtížnost určí PJ podle překážek."),
    ("mistrovstvi_kociciho_pohybu", "umeni_kociciho_pohybu", "Útok z výšky", 262, "neomezeně", "místo Útoku", "Umění kočičího pohybu (OBR) vs. Reflex (OBR)",
     "Lupič musí být aspoň o 2 sáhy výše než oběť a ta nesmí být vodorovně dál než jeho Krátký pohyb (1/10 Pohyblivosti). Při úspěchu dopadne na cíl: ten utrží Zranění jako při pádu z dané výšky (Tabulka pádu z výšky, PPZ H 1.1 s. 39) a je povalen – všechny jeho akce v kole propadají (i Boj a Aktivní obrana), další Útoky v kole jdou do jeho ZO, dál se počítá jako ležící. Při neúspěchu je Lupič zraněn za polovinu určeného Zranění."),
    ("mistrovstvi_zelezneho_klice", "umeni_zelezneho_klice", "Nastražení pasti", 263, "neomezeně", "kdykoliv", "Umění železného klíče (OBR) vs. X",
     "Lupič umí pasti nejen deaktivovat, ale i líčit a vyrábět – pro výrobu musí uspět proti obtížnosti dané pasti. Pasti si lze všimnout před aktivací hodem Postřeh (INT) vs. Umění železného klíče Lupiče. Vyrobí: Kovoví ježci, Šipková past, Výbušná past."),
    ("mistrovstvi_zelezneho_klice", "umeni_zelezneho_klice", "Otevírání magických zámků", 264, "neomezeně", "kdykoliv", "Umění železného klíče (OBR) vs. X",
     "Lupič deaktivuje a otevírá zámky chráněné kouzly; obtížnost určí PJ podle zajištění. Používá speciální Magický klíč – bez něj má Nevýhodu −5. Klíč se získá při výcviku, koupí u cechovního alchymisty, někdy za drobný úkol pro bratrstvo."),
    ("mistrovstvi_zelezneho_klice", "umeni_zelezneho_klice", "Padělání cenností", 265, "neomezeně", "kdykoliv", "Umění železného klíče (OBR) vs. Postřeh (INT)",
     "Padělky uměleckých děl, zbraní, ozdob, mincí či drahokamů – zamění je za originál, nebo vydává za pravé. Výroba trvá celý den (případně ve speciální dílně, slévárně…). U mincí se jejich počet vyrobený za den rovná výsledku hodu na Umění železného klíče. Odhalení: Postřeh (INT) vs. Umění železného klíče; Lupič s tímto trikem má k identifikaci padělku Výhodu +5."),
    ("umeni_neferoveho_boje", "umeni_neferoveho_boje", "Podkopnutí", 265, "jednorázově", "místo Útoku", "Umění neférového boje (OBR) vs. Reflex (OBR)",
     "Podkopne nohy bytosti u sebe (stejné nebo menší velikosti). Při úspěchu je povalena – všechny její akce v kole propadají (i Boj a Aktivní obrana), další Útoky v kole jdou do její ZO a dál se považuje za ležící."),
    ("umeni_neferoveho_boje", "umeni_neferoveho_boje", "Souboj na zemi", 266, "neomezeně", "místo Útoku", "Umění neférového boje (OBR) vs. Výdrž (ODO)",
     "Chvaty a páky: při úspěchu začíná „souboj na zemi“ – ani jeden se nemůže standardně pohybovat, jen útočit a bránit se; protivník má Nevýhodu −5 k Útoku (ÚČ) i Obraně (OČ). Udržení nestojí Lupiče další akci. Protivník se může každé kolo pokusit vymanit opakováním hodu; při úspěchu leží, ale bez postihu a může vstát. Útok třetí osoby na kteréhokoli ze zápasících je Útok na bezbranného (PPZ H 1.1 s. 178)."),
    ("umeni_neferoveho_boje", "umeni_neferoveho_boje", "Útok do slabin", 266, "jednorázově", "místo Útoku", "Umění neférového boje (OBR) vs. Výdrž (ODO)",
     "„Míchaná vejce za běhu jsou oblíbeným pokrmem Lupičů.“ Při úspěchu zasáhne slabiny – velká bolest zpomalí nepřítele na 3 kola (Pohyblivost na polovinu)."),
    ("mistrovstvi_promen", "umeni_promen", "Hraní mrtvého", 274, "jednorázově", "do Obrany", "Umění proměn (CHAR) vs. Postřeh (INT)",
     "Po zásahu v boji (do něhož se umně vmanipuluje) padne „mrtvý“ k zemi, často s krví z úst. Uspěje-li proti Postřehu protivníka, inteligentní bytost ho přestane považovat za hrozbu; u zvěře a monster rozhodne PJ."),
    ("mistrovstvi_promen", "umeni_promen", "Makety", 274, "jednorázově", "kdykoliv", "Umění proměn (CHAR) vs. Postřeh (INT)",
     "Lehká vycpaná konstrukce postavy. Příprava 5 kol, spotřebuje deku (či podobnou látku) a jedny herecké rekvizity. Při úspěchu si cíl myslí, že ho z dálky pozoruje člověk (či jiný tvor). Vydá-li se k siluetě, hod se opakuje; naposledy v bezprostřední blízkosti (10 sáhů), kdy má oklamaný Výhodu +5. Neprohlédne-li ji ani tehdy, dá se s ní i konverzovat."),
    ("mistrovstvi_promen", "umeni_promen", "Falešné tváře", 274, "neomezeně", "kdykoliv", "Umění proměn (CHAR) vs. Postřeh (INT)",
     "Z barev a vosku vytvoří kopii obličeje osoby, kterou už zblízka viděl; maska vydrží 1 hodinu. Při úspěchu ho cíl považuje za danou osobu, dokud mu nedá záminku pochybovat (netypické chování, špatný hod na Imitaci). U lidí, kteří mají k napodobené osobě kladný vztah, má k trikům na ně (Získání důvěry, Přesvědčování, Odvedení pozornosti…) Výhodu +5."),
    ("mistrovstvi_sarmu", "umeni_sarmu", "Odhad nepřítele", 275, "jednorázově", "kdykoliv", "Umění šarmu (CHAR) vs. Vůle (CHAR)",
     "Po aspoň 1 směně hovoru a úspěchu proti Vůli odhalí skryté motivy – po čem osoba prahne, její morální kodex, zda ji lze uplatit, přinutit ke zradě, a za jakou cenu. Nabídne-li jí odměnu, po níž touží, má Výhodu +5 k jejímu Přesvědčování."),
    ("mistrovstvi_sarmu", "umeni_sarmu", "Ostrý jazyk", 275, "jednorázově", "kdykoliv", "Umění šarmu (CHAR) vs. Vůle (CHAR)",
     "Slova, která tnou do živého. Při úspěchu vydráždí emoce cíle tak, že zaútočí – Sicco může strhnout pozornost na sebe nebo zlobu cíle zaměřit na někoho jiného; oběť musí svůj příští Útok zaměřit na cílovou bytost."),
    ("mistrovstvi_sarmu", "umeni_sarmu", "Sladká slova", 275, "jednorázově", "kdykoliv", "Umění šarmu (CHAR) vs. Vůle (CHAR)",
     "Sicco vykřikne šokující (často lživé, ale věrohodné) prohlášení. Při úspěchu cíl „ztuhne“ a po dobu 1 kola přichází o možnost jakékoli akce."),
    ("umeni_boje_s_plastem", "umeni_boje_s_plastem", "Držení", 276, "neomezeně", "místo útoku", "Umění boje s pláštěm (OBR) vs. Atletika (SIL)",
     "Plášť s háčky kontroluje pohyb nepřítele. Při úspěchu cíl nemůže provádět pohybové akce a má Nevýhodu −5 ke všem akcím vyžadujícím pohyb těla (boj, gesta při kouzlení…). Sicco se s ním pohne nejvýš o 1/10 Pohyblivosti, útočit může jen volnou rukou (jednoruční zbraní) a plášť nejde použít k jiným trikům. Cíl se může na začátku každého kola místo pohybové akce vymanit: Atletika (SIL) vs. Umění boje s pláštěm."),
    ("umeni_boje_s_plastem", "umeni_boje_s_plastem", "Oslepení pláštěm", 277, "jednorázově", "místo útoku", "Umění boje s pláštěm (OBR) vs. Reflex (OBR)",
     "Sicco se vzdá Útoku a hodí plášť nepříteli přes hlavu. Při úspěchu má cíl Nevýhodu −5 k Útoku (ÚČ) i Obraně (OČ). Vymanit se může na začátku každého kola místo pohybové akce: Reflex (OBR) vs. Umění boje s pláštěm. Plášť mezitím nejde použít k jiným trikům; po vyproštění padá na zem – znovu ho získá akcí Přezbrojení (krátká akce)."),
    ("umeni_boje_s_plastem", "umeni_boje_s_plastem", "Svedení útoku", 278, "jednorázově", "do Obrany", "Umění boje s pláštěm (OBR) vs. Reflex (OBR)",
     "Sicco ovine plášť kolem zbraně nepřítele a vychýlí ji. Při úspěchu je Útok zcela vychýlen a mine. Funguje i na přirozené zbraně (pěst, tlama, pařát)."),
]

# Předměty – typ, id, název, strana, parametry, popis
PREDMETY = [
    ("bomba", "kourova_clona", "Kouřová clona", 241, {"suroviny": 15, "zaklad": "skleněná kulička 5 coulů, zátka", "trvani": "2 kola", "pouziti": "vržení", "obtiznost": 10, "cena": [35, "zl"], "w": 0.1},
     "Kulička na náhrdelníku nebo opasku – Zloděj ji strhne a hodí na zem okamžitě, bez akce. Kolem něj vznikne hustý dým o poloměru 3 sáhů: uvnitř je vidět nejvýš 1 sáh, zvenčí dovnitř vůbec. Pro překvapivý útok i útěk."),
    ("bomba", "oslepujici_bomba", "Oslepující bomba", 241, {"suroviny": 35, "zaklad": "kovová trubka 10 coulů, zápalná šňůra", "trvani": "2 kola", "pouziti": "vržení", "obtiznost": 12, "cena": [70, "zl"], "w": 0.5},
     "Ohlušující výbuch a silný záblesk oslepí všechny v kouli o poloměru 5 sáhů – mají Nevýhodu −5 do Útoku a Obrany a nevidí dál než na 1 sáh. Zloděj může nepozorovaně utéct, pokud výbuch nepřiláká další nepřátele."),
    ("bomba", "vsehoklic", "Všehoklíč", 241, {"suroviny": 40, "zaklad": "kožený obal, drát", "trvani": "ihned", "pouziti": "vložení do kovového zámku", "obtiznost": 15, "cena": [100, "zl"], "w": 0.1},
     "Drát obalený směsí prudce reagující s kovem roztaví téměř každý zámek či řetěz. U komplexních mechanismů může selhat – roztaví se jen zamykání a závora zůstane (pak jen hrubou silou). Na magické zámky neúčinkuje."),
    ("udelatko", "padak", "Padák", 259, {"vyroba": "8 hodin", "cena": [100, "zl"], "w": 4},
     "Jemná tkanina zbrzdí pád. Z méně než 20 sáhů s padákem žádné zranění; z větší výšky hod na Umění kočičího pohybu (OBR) s Výhodou +5. Sbalení trvá 1 směnu, takže ho Lupiči většinou odříznou a utíkají."),
    ("udelatko", "sada_univerzalnich_klicu", "Sada univerzálních klíčů", 260, {"vyroba": "1 den", "cena": [80, "zl"], "w": 1},
     "Klíče s pohyblivými zuby pro většinu standardních zámků (dveře, nábytek); na speciální či zakázkové nestačí. Při triku Otevírání zámků Výhoda +5 k Umění železného klíče. Lupič se při výrobě naučil i okopírovat klíč, který měl aspoň chvilku k dispozici."),
    ("udelatko", "zvonici_koule", "Zvonící koule", 260, {"vyroba": "8 hodin", "cena": [50, "zl"], "w": 0.7},
     "Natažená koule se kutálí 20 sáhů jedním směrem (nepřekoná překážky ani těžký terén) a cinká. Kdo ji uslyší, hází Vůle (CHAR) vs. 12 – při neúspěchu má pokušení zdroj zvuku prozkoumat."),
    ("klic", "magicky_klic", "Magický klíč", 265, {"mana": 150, "suroviny": 50, "zaklad": "železný klíč a křišťál", "vyroba": "2 dny / v dílně", "pouziti": "otevírání magických zámků", "obtiznost": 16, "vyzaduje": "Krystaly a energie", "cena": None, "w": 0.2},
     "Křišťál vysává manu z magického zámku a nechá ji neškodně vyzářit. Bez lupičského výcviku se může poškodit. Klíčem lze také zjistit, zda je zámek chráněn kouzlem. Vyrobí ho alchymista (cechovní alchymista) – Lupič s Otevíráním magických zámků ho jinak dostane při výcviku nebo za úkol pro bratrstvo."),
    ("past", "kovovi_jezci", "Kovoví ježci", 263, {"obtiznost": 10, "vyzaduje": "kovářské náčiní, pec, kovové tyče", "vyroba": "2 hodiny (8 směn)", "w": 2},
     "Oblast o poloměru 3 sáhů se stane těžkým terénem. Kdo do ní vstoupí, hází Postřeh (INT) vs. Nastražení pasti (OBR); při neúspěchu je na 3 kola zpomalen (poloviční Pohyblivost) a zraněn za 1k6 životů."),
    ("past", "sipkova_past", "Šipková past", 263, {"obtiznost": 14, "vyzaduje": "hodinářské náčiní, lanko, kovová trubice, šipka, dílna", "vyroba": "4 hodiny (16 směn)", "w": 0.5},
     "Malý mechanismus podobný kuši (pod víko truhly, za klíčovou dírku, do štěrbiny ve zdi, s lankem v podlaze); pojme 1 šipku, i otrávenou. Nevšimne-li si jí oběť (Postřeh vs. Umění železného klíče), spustí ji a musí uspět v Reflexu (OBR) vs. Umění železného klíče – jinak je na ni veden Útok za 3k6+10 do ZO."),
    ("past", "vybusna_past", "Výbušná past", 263, {"obtiznost": 16, "vyzaduje": "mechanické součástky, trhavina, dílna", "vyroba": "5 hodin (20 směn)", "w": 1},
     "Nestabilní látka s rozbuškou v lákavém předmětu, aktivuje se při pokusu o otevření. Všimnout si: Postřeh (INT) vs. Nastražení pasti; deaktivovat: Odstranění pastí vs. Nastražení pasti. Jinak exploze zraní všechny do 3 sáhů za 4k10 ohnivého zranění."),
]

JEDY = [
    ("cerna_smrt", "Černá smrt", 256, "exotický had", "10 kol", "bílá tekutina se silným zápachem", "ODO vs. 12",
     "Velmi silný jed na čepel nebo hrot šípu. Je-li jím cíl zraněn, je v daném kole navíc otráven za 1k6 životů a stejné zranění utrží i v dalších kolech po dobu účinku."),
    ("divotvorne_serum", "Divotvorné sérum", 256, "exotická žába", "5 kol", "hnědý hustý sliz", "Vůle (CHAR) vs. 14",
     "„Výbuch“ vjemů a pocitů: neuspěje-li cíl v hodu proti pasti, ztrácí se v chaosu přebuzených smyslů – Nevýhoda −5 ke všem ověřovacím hodům na Inteligenci nebo Charisma."),
    ("mesicni_polibek", "Měsíční polibek", 256, "exotický pavouk", "1 hodinu", "mírně nažloutlá viskózní tekutina", "ODO vs. 12",
     "Silný uspávací jed: neuspěje-li cíl, okamžitě upadne do hlubokého spánku, z něhož ho probudí jen bolest ze Zranění."),
]

# Zbraně Zlodějského cechu: id ve vyzbroj.json → druh (assassin / gentleman / improv), výroba
ZBRANE = {
    "assassin_dyka_obr": ("assassin", "1 den", "Speciální dýka se zoubkovanými zářezy na hřbetu, kterými zachytí a uvězní zbraň protivníka."),
    "assassin_dyka_uto": ("assassin", "1 den", "Ikonická úzká a krátká dýka, skryje se téměř kdekoli – Výhoda +5 k triku Ukrytí předmětu."),
    "zapestni_kuse": ("assassin", "1 den", "Mechanismus na předloktí, běžnou prohlídkou neodhalitelný; vymrští šipku velkou silou na krátkou vzdálenost. Přebití trvá 2 kola. Výhoda +5 k Ukrytí předmětu."),
    "prsten_jed": ("gentleman", "8 hodin", "Prsten se skrytou jehlou, která uvolní jed přímo do těla: jed působí dvojnásobné zranění nebo 2× rychleji. Bonusy pro Boj beze zbraně; při prohledání Výhoda +5 k Ukrytí předmětu. Zda se cíl může bránit, nebo ho chrání jen ZO, určí PJ. Na rozdíl od jiných zbraní jde použít v rámci Assassinace, i když cíl Assassina vidí, ale není ve střehu."),
    "bota_cepel": ("gentleman", "8 hodin", "Obyčejná bota se skrytou čepelí – i na přeřezání pout. Výhoda +5 k Ukrytí předmětu; v boji bonusy pro Boj beze zbraně."),
    "hul_ostri": ("gentleman", "1 den", "Zdobená vycházková hůl s tenkým ostřím (bez záštity). Výhoda +5 k Ukrytí předmětu; v boji bonusy za dýku."),
    "hak_lano": ("improv", "2 hodiny", "Roztočené lano s hákem (dýkou, srpem; lano lze nahradit řetězem) – větší dosah. Výhoda +5 k triku Lezení."),
    "sochor": ("improv", "2 hodiny", "Páčidlo – při otevírání dveří a truhlic Atletikou (SIL) Výhoda +5. (V tabulce „Páčidlo“.)"),
    "boxer_ppp": ("improv", "4 hodiny", "Kovová zbraň s výstupky navlékaná na prsty – devastující zranění. Výhoda +5 k Ukrytí předmětu; nouzově z opasku s cvočky či řetězu kolem rukou."),
    "improv_jednorucni": ("improv", None, "Kámen, klacek, noha od židle, sklenice, kartáč – menší předmět, čím víc ostrých hran, tím lépe. Obvykle statistiky dýky, úpravy dle PJ (PPP05 s. 258)."),
    "improv_obourucni": ("improv", None, "Noha stolu, kůl, deštník – středně velký předmět. Obvykle statistiky dřevěné hole, úpravy dle PJ (PPP05 s. 258)."),
}

SIT = {
    "kumpani": [
        {"id": "kapsar", "typ": "Kapsář", "cena": 10, "akce": ["kapsarstvi", "loupez"], "popis": "Pouliční zlodějíček – menší krádeže, ve skupině i větší akce. Rváč to není, ale generuje zisky."},
        {"id": "ksefar", "typ": "Kšeftař", "cena": 15, "akce": ["zprostredkovani", "podplaceni"], "popis": "Obchodník na volné noze – udá kradené zboží, zná kontakty, ví, koho podplatit."},
        {"id": "ocko", "typ": "Očko", "cena": 20, "akce": ["ziskani_informaci", "zahlazeni_stop"], "popis": "Informátor (často žebrák či zkrachovalý zločinec) – ví, co se kde šustne, umí sledovat."},
        {"id": "ranar", "typ": "Ranař", "cena": 15, "akce": ["hlidani", "zastraseni"], "popis": "Svaly organizace – výpalné, „domluvy“, nejvěrnější tvoří Siccovu osobní stráž."},
        {"id": "vrah", "typ": "Vrah", "cena": 25, "akce": ["unos", "vrazda"], "popis": "Mistr assassinského umění pro speciální akce – definitivní zmizení nepohodlných osob."},
    ],
    "akce": [
        {"id": "hlidani", "nazev": "Hlídání", "nebezpecnost": "Přestupek", "kumpan": "ranar", "cena": 2, "popis": "Ranaři 1 den dělají tělesnou stráž nebo hlídají místo či předmět; při napadení brání (statistiky Ranaře má PJ v Bestiáři). Zkusí-li cizí síť akci proti Siccovi, může ji Hlídání znemožnit – ověření proti hodu nepřátelské sítě."},
        {"id": "kapsarstvi", "nazev": "Kapsářství", "nebezpecnost": "Přestupek", "kumpan": "kapsar", "cena": 5, "popis": "Kapsáři celý den vybírají kapsy, kradou na trhu, podvádějí v kostkách. Při úspěchu každý přinese Siccovi 7 zl. Cizí sítě si svá území hlídají."},
        {"id": "loupez", "nazev": "Loupež", "nebezpecnost": "Zločin", "kumpan": "kapsar", "cena": 5, "popis": "Větší akce na konkrétní věc – kapsáři musí vědět, kde přibližně je a jak vypadá. Obtížnost určí PJ."},
        {"id": "podplaceni", "nazev": "Podplacení", "nebezpecnost": "Zločin", "kumpan": "ksefar", "cena": 5, "popis": "Kšeftař vytipuje a podplatí strážného – následující zločinecká akce má Výhodu +5."},
        {"id": "unos", "nazev": "Únos", "nebezpecnost": "Zločin", "kumpan": "vrah", "cena": 7, "popis": "Vrah omráčí cíl a dovleče ho před Sicca. Bez znalosti, kde osoba je a jak vypadá, nelze uspět. Obtížnost podle stráží, přístupnosti a obranyschopnosti cíle."},
        {"id": "vrazda", "nazev": "Vražda", "nebezpecnost": "Zločin", "kumpan": "vrah", "cena": 20, "popis": "Šipka z kuše, jed, „náhodný“ pád z okna. Vrah musí vědět, kde oběť je a jak vypadá. U vlivných osob bývá nutný předem připravený plán (informace, podplacení, propaganda) nebo zapojení celé sítě či samotného Sicca."},
        {"id": "zahlazeni_stop", "nazev": "Zahlazení stop", "nebezpecnost": "Zločin", "kumpan": "ocko", "cena": 4, "popis": "Očko nastraží falešné informace, aby chycený člen bandy nedovedl vyšetřovatele k Siccovi."},
        {"id": "zastraseni", "nazev": "Zastrašení", "nebezpecnost": "Zločin", "kumpan": "ranar", "cena": 4, "popis": "Ranař „domluví“ vzpurnému obchodníkovi, aby platil měsíční taxu."},
        {"id": "ziskani_informaci", "nazev": "Získání informací", "nebezpecnost": "Přestupek", "kumpan": "ocko", "cena": 3, "popis": "Místní klepy i přísně tajné informace – náročnost určí PJ (tabulka náročnosti akcí)."},
        {"id": "zprostredkovani", "nazev": "Zprostředkování", "nebezpecnost": "Přestupek", "kumpan": "ksefar", "cena": 2, "popis": "Setkání s osobou na neutrální půdě. Má-li osoba proti Siccovi přímo něco, má Kšeftař Nevýhodu −5."},
    ],
    "pravidla": {
        "limit": "Sicco udrží v síti nejvýše tolik kumpánů, kolik je jeho úroveň.",
        "nabor": "Cena kumpána = nábor i měsíční plat. Bez výplaty zběhne; kápo (první člen každého typu, má jméno) vydrží bez odměny až 3 po sobě jdoucí měsíce.",
        "sidlo": "Síť má jméno, symbol (tetování kápů), sídlo nebo místo schůzek (krámek, krčma) a tajné schránky. Mimo město ji spravují kápové a vyplácejí členy automaticky.",
        "overeni": "Ověření akce: 1k10 + 1 za každého zapojeného kumpána (zkušenější i víc – podle Vypravěče) vs. obtížnost PJ (oznámí předem). Kumpánům se platí sazba akce za každého zapojeného.",
        "nebezpecnost": "Přestupek – nezdar nemá zásadní následky. Zločin – při nezdaru zátah gardy: polovina zapojeného týmu je pochytána, Sicco ji musí odepsat a doplnit síť.",
        "ciziMesto": "V cizím městě (po ohlášení hlavě místní sítě) lze využít její akce za 10× cenu a nejvýš 3 členy na akci; místní šéf může akci zakázat. Totéž poskytuje Siccova síť jiným kmotrům.",
        "druzina": "Týká-li se akce družiny (účastní se jí nebo je jejím cílem), neodehrává se hodem, ale herní scénou.",
    },
}

DUVERNIK = {
    "zivoty": 50, "velikost": "podle rasy", "pohyblivost": 30, "ZO": 4, "OC": 7, "UC": 9,
    "dovednosti": "3 jakékoli obecné dovednosti a 2 zlodějská Umění na stupni 8",
    "triky": "2 zlodějské triky ověřované Uměním, které ovládá; 2 jakékoli triky Válečníka z PPZ",
    "prestup": "Při každém přestupu dosaženém spolu se Siccem +1k6 max. životů; každou 3. takovou úroveň +1 do ÚČ nebo ZO a +1 stupeň vybrané dovednosti. Bez zpětné opravy.",
}


def main() -> None:
    data = {
        "_zdroj": "Draci_hlidka_PPP_05_Zlodej.pdf s. 239–278 (tools/ppp05_zlodej_src.py)",
        "pravidla": PRAVIDLA,
        "obecne": [{"id": i, "nazev": n, "strana": p, "kratce": k, "popis": t} for i, n, p, k, t in OBECNE],
        "specializace": {
            sid: {
                "nazev": s["nazev"], "strana": s["strana"], "podminky_ppp": s["podminky_ppp"], "uvod": s["uvod"],
                "auto": [{"id": i, "nazev": n, "strana": p, "popis": t} for i, n, p, t in s["auto"]],
                "volitelne": [{"id": i, "nazev": n, "strana": p, "kratce": k, "popis": t} for i, n, p, k, t in s["volitelne"]],
            } for sid, s in SPEC.items()
        },
        "triky": [{"skupina": g, "skill": sk, "nazev": n, "strana": p, "cetnost": ce, "pouziti": po, "overeni": ov, "popis": t} for g, sk, n, p, ce, po, ov, t in TRIKY],
        "predmety": [{"typ": ty, "id": i, "nazev": n, "strana": p, "parametry": pa, "popis": t} for ty, i, n, p, pa, t in PREDMETY],
        "jedy": [{"id": i, "nazev": n, "strana": p, "zaklad": z, "trvani": tr, "vzhled": v, "nebezpecnost": ne, "popis": t} for i, n, p, z, tr, v, ne, t in JEDY],
        "zbrane": {k: {"druh": d, "vyroba": v, "popis": t} for k, (d, v, t) in ZBRANE.items()},
        "sit": SIT,
        "duvernik": DUVERNIK,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{OUT}: {len(TRIKY)} triků, {len(OBECNE)} obecných schopností, {sum(len(s['volitelne']) for s in SPEC.values())} schopností specializací, {len(PREDMETY)} předmětů")


if __name__ == "__main__":
    main()
