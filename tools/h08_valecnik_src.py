# Válečník ze základních pravidel H08 (1.2.5) – zdroj textu pro docs/h08_valecnik.json.
# Spuštění: python tools/h08_valecnik_src.py
import json
import pathlib
import re
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs' / 'h08_valecnik.json'


def slug(s: str) -> str:
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')


ZA = 'Základní'
DK = 'Škola boje drtičů kostí'
BO = 'Škola boje s bodnou zbraní'
JE = 'Škola boje s jednoruční zbraní'
OU = 'Škola boje s obouruční zbraní'
DV = 'Škola boje se dvěma zbraněmi'
ST = 'Škola boje se štítem'

# (název, strana, adrenalin, použití, vyžaduje, ověření, skupina, text)
TRICKS = [
    ('Bojová připravenost', 4, '0', 'Soustředění (Útok nebo Obrana)', '-', '-', ZA,
     'Pokud se schyluje k boji, dokáže válečník rozpoznat nebezpečí a reagovat na něj dříve než ostatní.\n'
     'Díky tomuto triku získá válečník bonus +2 k první bojové akci (útok / obrana), kterou v daném kole provede. Tento trik lze uplatnit pouze na začátku boje. Nedá se navíc použít v případě, kdy válečník útok nečekal (přepadení ze zálohy a podobně).'),
    ('Odražení projektilu', 4, '1', 'Trik (Obrana)', 'jakákoliv zbraň pro boj tváří v tvář', '-', ZA,
     'Válečník dokáže přetavit svůj adrenalin do bleskového krytu, kterým dokáže vykrýt letící projektil.\n'
     'Při použití tohoto bojového triku získává válečník možnost chránit se před letícím projektilem. Do své akce Obrana si tak navíc započítá obranu zbraně a Výhodu (bonus +5). Efekt se vztahuje na jeden konkrétní projektil, který na něj letí (dýka, šíp, hvězdice a podobně).'),
    ('Rychlý přesun', 4, '1', 'Pohyb', '-', '-', ZA,
     'Některé situace vyžadují rychlý přesun a adrenalin je právě to, co k němu válečníka nabudí. Má pak šanci napadnout prchajícího protivníka, vykrýt ránu vedenou na dalšího člena družiny nebo jen zaujmout lepší bojové postavení.\n'
     'Díky tomuto triku se vzdálenost, kterou můžeš v daném kole překonat Krátkým pohybem, zdvojnásobí.'),
    ('Rychlý úder', 4, '1', 'Soustředění', '-', '-', ZA,
     'Bojové vzrušení dokáže vybičovat instinkty válečníka na maximum. Díky tomu dokáže reagovat i na nepatrné náznaky akcí protivníků a překvapit je svou reakcí.\n'
     'S tímto bojovým trikem získává tvá postava pro následující kolo Výhodu (bonus +5) k Iniciativě.'),
    ('Zuřivý útok', 5, '2', 'Soustředění (Útok)', '-', '-', ZA,
     'Válečník dokáže přetavit své bojové vzrušení do zuřivého útoku. V něm je pak rychlejší, silnější a nebezpečnější.\n'
     'Tímto trikem získává válečník bonus +3 do jednoho Útoku v daném kole.'),
    ('Nordický klíč', 9, '3', 'Zápas (Obrana)', 'Škola boje drtičů kostí, volná ruka', 'Atletika (SIL) vs. Hbitost (OBR)', DK,
     'Nordickým klíčem se lze pokusit zachytit ruku protivníka, zkroutit ji, zatlačit na ni pákou a tím ji pochroumat.\n'
     'Pokud v triku uspěješ, tedy překonáš svým hodem na Atletiku (SIL) protivníkův hod na Hbitost (OBR), ubráníš se jeho útoku a zároveň mu pohmoždíš ruku. To mu způsobí Nevýhodu (postih −5) ke všem bojovým akcím a činnostem vyžadujícím ruce. Pochroumání trvá tak dlouho, dokud není řádně ošetřeno.\n'
     'Jestliže se ti trik nepovede, budeš v daném kole chráněn jen svou Základní obranou.\n'
     'Trik funguje jako jednorázová akce (neslouží k držení ruky protivníka).'),
    ('Stržení na zem', 10, '2', 'Zápas (Útok)', 'Škola boje drtičů kostí', 'Atletika (SIL) vs. Hbitost (OBR)', DK,
     'Stržení na zem je klasická bojová technika, při které se válečník přiblíží k protivníkovi, nakročí za jeho nohy a silnou ranou do jeho hrudi nebo hlavy ho strhne na zem, kde ho pak drží.\n'
     'Válečník používá tento trik místo svého běžného útoku. Pokud v triku uspěješ, tedy překonáš svým hodem na Atletiku (SIL) protivníkův hod na Hbitost (OBR), povalíš ho na zem a znehybníš. Cíl pak zůstává znehybněn tak dlouho, dokud neuspěje v opakovaném ověření. Ověřování lze provést v každém kole.\n'
     'Dokud sevření trvá, není útočník ani obránce schopen jiných bojových akcí.'),
    ('Trpasličí polibek', 10, '1', 'Trik (Útok)', 'Škola boje drtičů kostí', 'Atletika (SIL) vs. Hbitost (OBR)', DK,
     'Tato technika přišla ke svému názvu díky tradici trpasličích trolobijců. Je zjevné, že nepůjde o žádnou romantiku, ale o drsný útok čelem (obvykle do obličeje nebo břicha protivníka).\n'
     'Válečník používá tento trik jako dodatečnou akci ke svému běžnému útoku. Pokud v triku uspěješ, tedy překonáš svým hodem na Atletiku (SIL) protivníkův hod na Hbitost (OBR), způsobíš mu navíc zranění odpovídající tvé Opravě za Sílu (vždy však aspoň 1).'),
    ('Obranné manévrování', 10, '1', 'Soustředění (Obrana)', 'Škola boje s bodnou zbraní', '-', BO,
     'Válečník dokáže provádět mistrnou choreografii úskoků a klamavých pohybů, které ztěžují protivníkovi šanci ho zasáhnout.\n'
     'Díky tomuto triku získává válečník ke všem hodům na obranu bonus +2 proti všem útokům, které jsou na něj v daném kole vedeny.'),
    ('Útok z obrany', 10, '2', 'Technika (Obrana)', 'Škola boje s bodnou zbraní, bodná zbraň', '-', BO,
     'Válečník dokáže tímto trikem využít sílu útočníka a proměnit ji ve svůj prospěch. Odkloní zbraň protivníka, ukročí a nechá sklouznout ostří své čepele do jeho těla.\n'
     'Při tomto triku provedeš klasický hod na obranu před útokem protivníka. Jestliže jsi byl zasažen, pak se ti trik nepodařil. Pokud se však ubráníš, zraníš protivníka za tolik životů, jaký je rozdíl mezi vašimi výsledky. Ke zranění se ještě přičte Zranění tvé zbraně.\n'
     'PŘÍKLAD: Nepřítel má Útok (7). Tvůj válečník Obranu (10) a Zranění zbraně 2. Při útoku z obrany tak zraníš protivníka za 5 životů (10 − 7 + 2).'),
    ('Výpad', 11, '3', 'Trik (Útok)', 'Škola boje s bodnou zbraní, bodná zbraň', '-', BO,
     'Výpad patří ke klasickým bojovým fintám. Jde o velmi přesný útok s dokonalým načasováním. Válečník se při něm pokusí protivníka probodnout a způsobit mu tak vážné zranění.\n'
     'Pokud válečník svým výpadem projde protivníkovou obranou, způsobí mu automaticky krvácivé zranění (viz „Krvácení“). Každé kolo (včetně aktuálního) si pak raněný hází 1k6 na počet životů, které ztratí v důsledku krvácení.'),
    ('Tvrdý kryt', 11, '1', 'Trik (Obrana)', 'Škola boje s jednoruční zbraní, jednoruční zbraň', '-', JE,
     'Válečník dokáže využít svou volnou ruku a posílit úchop své zbraně k získání lepší obrany.\n'
     'Za použití tohoto triku získává válečník bonus +2 ke svému hodu na Obranu. Tento trik lze použít i tehdy, jestliže drží v druhé ruce štít.'),
    ('Úder hlavicí', 11, '2', 'Trik (Útok)', 'Škola boje s jednoruční zbraní, jednoruční zbraň', '-', JE,
     'U tohoto triku využije válečník bezprostřední blízkost protivníka a po svém běžném útoku mu ještě uštědří dodatečnou ránu hlavicí své zbraně.\n'
     'Pokud se válečník rozhodne tento trik použít a uspěje ve svém běžném útoku, způsobí protivníkovi dodatečné zranění za 1k6+3 životů.'),
    ('Úhyb a sek', 11, '3', 'Technika (Obrana), Dodatečný útok', 'Škola boje s jednoruční zbraní', '-', JE,
     'Falešné odkrytí zdánlivě nekrytého místa je ideální možnost, jak vyprovokovat protivníka k útoku. Poté se stačí jen bleskovým úkrokem stáhnout zpět a po soupeřově promáchnutí do prázdna navázat vlastním zdrcujícím útokem.\n'
     'Válečník si při tomto triku hází na klasickou obranu před útokem. Pokud neuspěje, je zraněn běžným způsobem. V opačném případě však získá možnost ihned napadnout nepřítele protiútokem do ZO (jedná se poté o klasický hod na útok, při kterém si však protivník nehází na obranu – započítává si jen Základní obranu. Útok je navíc zaplacen adrenalinem, válečník využívající trik „dodatečný útok“ nemusí mít k dispozici žádné útočné akce pro toto kolo, aby akci mohl provést).'),
    ('Bezhlavý útok', 12, '1', 'Trik (Útok)', 'Škola boje s obouruční zbraní', '-', OU,
     'Adrenalin dokáže u válečníka probudit rudé šílenství. Se svou obouruční zbraní se pak mění ve vraždící stroj. V tu chvíli dává vše do ničivého útoku a zcela zapomíná na svou obranu.\n'
     'Pomocí tohoto triku získáváš k jednomu konkrétnímu útoku jednorázovou Výhodu (bonus +5). V průběhu celého kola však ztrácíš možnost obrany (její hodnota pak odpovídá tvé Základní obraně).'),
    ('Drtivý útok', 12, '2', 'Trik (Útok)', 'Škola boje s obouruční zbraní, obouruční zbraň', '-', OU,
     'Adrenalin dokáže válečníkovi poskytnout drtivou sílu, kterou dokáže zranit protivníka mnohem víc, než je obvyklé.\n'
     'Pokud se válečník rozhodne tento trik použít (a uspěje v běžném útoku), způsobí protivníkovi dodatečné zranění za dalších 5 životů.'),
    ('Kružný sek', 12, '3', 'Trik (Útok)', 'Škola boje s obouruční zbraní, obouruční zbraň', '-', OU,
     'Válečník umí použít svou obouruční zbraň jako nástroj zkázy. Díky adrenalinu má rána takovou razanci, že ohrozí i několik protivníků najednou.\n'
     'Kružným sekem dokáže válečník zasáhnout všechny tvory v kruhu kolem sebe (podle délky zbraně). Před jeho použitím je proto vhodné zvážit, zda jím nezasáhne i své spolubojovníky. První oběť útoku je zasažena plnou silou. U každé další se pak intenzita snižuje o dva body.\n'
     'PŘÍKLAD: Válečník použije Kružný sek. Jeho útok je 10. První cíl bude čelit síle útoku 10, druhý 8, třetí 6 a tak dále.'),
    ('Dvojitá obrana', 12, '2', 'Soustředění, Dodatečná obrana', 'Škola boje se dvěma zbraněmi, dvě zbraně', '-', DV,
     'Válečník se s patřičnou dávkou bojového vzrušení dokáže bránit efektivněji a rychleji.\n'
     'Tímto trikem získáš v daném kole k dispozici jednu aktivní obranu navíc. Můžeš se tak chránit před útoky více protivníků, či se krýt více útokům jednoho z nich.'),
    ('Útok a vrh', 13, '1', 'Trik (Útok), Dodatečný útok', 'Škola boje se dvěma zbraněmi, dvě zbraně', '-', DV,
     'Zkušení válečníci dokáží při boji se dvěma zbraněmi překvapit svého protivníka. Umí totiž v rámci svého běžného útoku ještě vrhnout svou sekundární zbraň (nůž nebo dýku).\n'
     'Pokud se válečník rozhodne tento trik použít, vybere si cíl ve svém zorném poli. Proti němu pak může použít útok svou vrhací zbraní. Tento útok dokáže provést v rámci stejného kola, kdy už útočil klasicky dvěma zbraněmi. Tento útok lze použít i na jiného protivníka, než byl cíl primárního útoku tváří v tvář.'),
    ('Vířivý útok', 13, '2', 'Finta (Útok)', 'Škola boje se dvěma zbraněmi', '-', DV,
     'Vířivý útok je bojový trik, při kterém válečník sérií klamných výpadů rozptyluje pozornost protivníka. Když pak konečně udeří, bývá jeho útok překvapivý a vražedný.\n'
     'Při použití tohoto triku získává válečník Výhodu (bonus +5) k jednomu konkrétnímu útoku.'),
    ('Sražení štítem', 13, '2', 'Trik (Útok)', 'Škola boje se štítem, štít', 'Atletika (SIL) vs. Hbitost (OBR)', ST,
     'Válečník dokáže použít svůj štít jako účinné beranidlo. Místo běžného útoku tak naběhne celou silou do protivníka a pokusí se ho srazit k zemi.\n'
     'Pokud v triku uspěješ, tedy překonáš svým hodem na Atletiku (SIL) protivníkův hod na Hbitost (OBR), povalíš ho štítem k zemi a drtivě ho zraníš za 1k6 životů. Povalený není schopen žádné akce a musí nejprve vstát, což mu zabere 1 kolo.'),
    ('Útok zpoza štítu', 13, '1', 'Technika (Útok)', 'Škola boje se štítem', '-', ST,
     'Válečník dokáže při boji odstrčit protivníkovu zbraň do nevýhodné pozice. Ten se pak hůře brání a je tak mnohem snazší jej zasáhnout.\n'
     'Útok zpoza štítu dává válečníkovi jednorázový bonus do útoku +2.'),
    ('Zámek', 13, '3', 'Zápas (Obrana)', 'Škola boje se štítem, štít', 'Atletika (SIL) vs. Hbitost (OBR)', ST,
     'Tímto trikem dokáže válečník ve své obraně obratným manévrem „zamknout“ protivníkovu zbraň mezi své tělo a štít.\n'
     'Pokud v triku uspěješ (Atletika (SIL) vs. protivníkův hod na Hbitost (OBR)), je jeho zbraň „uzamčena“ a nemůže s ní nijak manipulovat. Ztrácí tak možnost útoku i obrany s ní (nemá-li ovšem sekundární zbraň). Zámek trvá tak dlouho, dokud cíl zbraň nepustí nebo neuspěje v hodu proti pasti Atletika (SIL) vs. Hbitost (OBR). Ověřovací hod lze provádět v každém kole.\n'
     'Válečníkova druhá ruka je po celou dobu trvání triku volná. Může tak dále pokračovat v útocích na protivníka. Jestliže je válečník napaden někým dalším, nemůže si do obrany započítat štít.'),
]

SCHOOLS = [
    ('skola_drticu_kosti', 'Škola boje drtičů kostí', 'Při boji beze zbraně +3 k ÚČ a OČ.', True),
    ('skola_boje_s_bodnou_zbrani', 'Škola boje s bodnou zbraní', 'Při boji +2 k Iniciativě (platí vždy, s jakoukoli zbraní).', False),
    ('skola_boje_s_jednorucni_zbrani', 'Škola boje s jednoruční zbraní', 'Při boji +1 k OČ (platí vždy, s jakoukoli zbraní).', False),
    ('skola_boje_s_obourucni_zbrani', 'Škola boje s obouruční zbraní', 'Při boji +2 ke Zranění (platí vždy, s jakoukoli zbraní).', False),
    ('skola_boje_se_dvema_zbranemi', 'Škola boje se dvěma zbraněmi', 'Boj dvěma jednoručními zbraněmi (jedna z nich lehká krátká – nůž, dýka): Útočnost, Zranění i Obrana obou zbraní se sčítají.', True),
    ('skola_boje_se_stitem', 'Škola boje se štítem', 'Do obrany se započítá Obrana štítu i Obrana zbraně najednou.', True),
]

ABILITIES = {
    'mistrovstvi_ve_zbrani': 'Bonus +2 k ÚČ a OČ s vybraným typem zbraní – celou skupinou (drtivé, bodné, sečné, vrhací, střelné, boj beze zbraně). Skupinu volí válečník při získání schopnosti. Lze volit opakovaně pro další skupinu – bonus neroste, jen se rozšíří. K útoku či obraně se vždy počítá jen jeden bonus za Mistrovství ve zbrani.',
    'rozvaznost': 'Ofenzivní styl boje: +3 ÚČ a −1 OČ; defenzivní styl: +3 OČ a −1 ÚČ. Styl lze zvolit před bojem a měnit na začátku každého kola; lze bojovat i běžně bez Rozvážnosti.',
    'skvela_kondice': '+3 životy za každou dosaženou úroveň (Pravidlo zpětné opravy).',
    'urputnost': 'Hranice smrti se posune o hodnotu úrovně do záporu. Válečník překoná Mez vyřazení – při 0 a méně životech neupadá do bezvědomí a bojuje dál; po boji má 1 směnu na doléčení nad Mez vyřazení, jinak upadne do bezvědomí.',
    'veleni': 'Útočný rozkaz dá všem, kdo ho poslechnou, +1 k ÚČ, obranný +1 k OČ. Platí od vyřknutí do odvolání (v daném kole pro ty, kdo ještě nejednali), končí s bojem; rozkazy lze měnit každé kolo. Od 6. úrovně bonus +2.',
    'vicenasobny_utok': 'Jen v boji tváří v tvář: tři útoky za dvě kola (1. kolo dvakrát, 2. kolo jednou…), každý se hází zvlášť; stejně tak obrany. Od 6. úrovně útočí i brání se dvakrát v každém kole.',
}

EXTRA = {
    'adrenalin': 'Mimo boj žádný. V boji (i při přípravě – finální zteč, chystání přepadu) +1 bod na konci každého tahu. Mimo přímý boj ho válečník udrží nejvýš tolik, kolik je oprava za ODO (min. 1); v boji limit není. Po boji vyprchává 1 bod za kolo. Zapisuje se do pole Mana.',
    'lecba_vlastnich_zraneni': 'Po boji: 1 bod zbytkového adrenalinu = 2 životy, jen na čerstvé rány z posledního boje. Funguje i na Kritická zranění – za kolo lze odstranit jen jedno.',
    'triky_za_uroven': 'Na 1. úrovni 2 ze základních triků; při každém přestupu 1 další trik – obecný nebo ze zvládnuté školy (z jedné školy nejvýš 1 za úroveň, od okamžiku zvládnutí školy). Od 6. úrovně 2 triky za úroveň (Tovaryš Cechu, PPP01).',
}

SPECS = {
    'berserkr': 'Válečník, který se v boji odevzdává zuřivosti a šílenství; obvykle bez štítu a zbroje, s obouruční zbraní.',
    'rytir': 'Elitní válečník a velitel, mistr štítu a zbrojí, drží se rytířského kodexu.',
    'sermir': 'Válečník, který přetavil boj v umění – rychlé, přesné útoky, nejčastěji bodnými zbraněmi.',
}


def main() -> None:
    out = {
        '_zdroj': 'H08 Válečník 1.2.5 (vytěženo z PDF v projektu, 27. 9. 2026)',
        'triky': [
            {'id': slug(n), 'nazev': n, 'strana': p, 'parametry': {'adrenalin': a, 'pouziti': u, 'vyzaduje': r, 'overeni': o}, 'popis': t, 'skupiny': [g]}
            for n, p, a, u, r, o, g, t in TRICKS
        ],
        'skoly': [{'id': i, 'nazev': n, 'efekt': e, 'podminena': c} for i, n, e, c in SCHOOLS],
        'schopnosti': ABILITIES,
        'obecne': EXTRA,
        'specializace': SPECS,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"{len(TRICKS)} triků, {len(SCHOOLS)} škol → {OUT.relative_to(ROOT)}")


if __name__ == '__main__':
    main()
