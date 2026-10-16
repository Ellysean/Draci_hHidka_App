"""H11 Kouzelník (PPZ 1.2.5) → docs/h11_kouzelnik.json  (7c.2)

Přepsáno z textové vrstvy H11_Kouzelník_1.2.5_FINAL.pdf (31 stran).
PPP04 (pokročilá pravidla, 96 kouzel) je zvlášť v claude/data/ppp04_kouzelnik.json.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from spell_norm import spell  # noqa: E402

SRC = "H11"


def K(nazev, zaklinadlo, skupina, strana, mana, dosah, rozsah, trvani, vyvolani, obtiznost,
      stitky, popis, overeni=None, **extra):
    d = dict(nazev=nazev, zaklinadlo=zaklinadlo, skupina=skupina, strana=strana, mana=mana,
             dosah=dosah, rozsah=rozsah, trvani=trvani, vyvolani=vyvolani, obtiznost=obtiznost,
             vyzaduje="–" if skupina == "obecna" else OBOR_NAZEV[skupina], stitky=stitky, popis=popis)
    if overeni:
        d["overeni"] = overeni
    d.update(extra)
    return d


OBOR_NAZEV = {
    "divoka": "Divoká magie", "promen": "Magie proměn", "mentalni": "Mentální magie",
    "ochranna": "Ochranná magie", "vitalni": "Vitální magie", "vysoka": "Vysoká magie",
}

KOUZLA = [
    # ======================= OBECNÁ MAGIE (13) – na 1. úrovni 3 dle výběru =======================
    K("Bertoldův zámek", "Hoddor", "obecna", 6, "X", "dotek", "jeden objekt (dveře / okno)", "1 den",
      "2 Dlouhé akce", "6", ["Ochranná magie"], overeni="Atletika (SIL) vs. Síla dveří + X",
      popis="Bertoldův zámek je kouzlo, které dokáže zvýšit odolnost zamčených či zavřených dveří, oken, brány nebo truhly. Ty přitom nemusí mít vůbec žádný zámek či jiný zabezpečovací mechanismus. Při sesílání kouzla se jich stačí dotknout a ochranná bariéra je zasekne v poloze, ve které jsou. Sesilatel kouzla je však dokáže otevřít bez omezení. V takovém případě se však efekt kouzla přeruší a mana vyprchá.\nPokud chce dveře otevřít někdo jiný, musí překonat Nebezpečnost pasti určenou kouzelníkem.\nPříklad: Kouzelník Meredil seslal kouzlo na dřevěnou bránu pevnosti (obtížnost 8). Meredil pro seslání použil 5 bodů many, které ovlivní sílu kouzla. Finální obtížnost pasti tedy bude pro vyrážejícího 13 (základ 8 a dodatečná Síla 5). Překonat něco takového bude pro útočníka velká výzva."),
    K("Blesk", "Fulgorum", "obecna", 7, "2 za blesk", "20 sáhů", "jeden cíl", "ihned",
      "Krátká akce", "6 (+2 za každý blesk navíc)", ["Divoká magie", "magické", "bleskové"],
      overeni="Sesílání kouzel (INT) vs. Výdrž (ODO)",
      ucinek={"damage": "1k6", "perUnit": True, "halfOnSave": True},
      popis="Blesk je asi nejznámější útočné kouzlo. Z kouzelníkovi ruky vyšlehne ničivá energie proti jednomu cíli. Ta pak způsobí zranění za 1k6 životů (v případě neúspěšného ověření za polovinu).\nKouzelník může seslat v jedné akci najednou i více blesků, které se spojí do jednoho mohutného výboje."),
    K("Kukátko", "Per Mur", "obecna", 7, "2", "dotek", "stěna 1x1x1 sáh", "10 kol",
      "Dlouhá akce", "6", ["Magie proměn"],
      popis="Po seslání tohoto kouzla se stěna, které se kouzelník dotkne, stává pro něj průhlednou. Pro všechny ostatní tvory pak stěna vypadá stejně, jako vždycky. Maximální šíře překážky, kterou dokáže kouzlo překonat, je nejvýše 1 sáh. Kouzlo dokáže působit i skrze organické materiály (dřevo, ale i těla živých tvorů)."),
    K("Levitace", "Lévitás", "obecna", 7, "4 + X", "dotek", "jeden tvor / předmět", "15 minut (1 směna)",
      "Dlouhá akce", "6", ["Vysoká magie"],
      popis="Pomocí tohoto kouzla se dokáže postava vznášet nad povrchem (zhruba 30 coulů). Nedokáže sice volně létat, může však třeba zlézat zdi, aniž by se musela obávat pádu z výšky a podobně. Pokud by k tomu došlo, začne se volně snášet k zemi rychlostí 1 sáh za kolo. V případě běžné chůze či běhu se pak pohybuje rychlostí běžné chůze.\nAčkoliv může efekt kouzla vypadat tak, jako že postava nic neváží, není to pravda. Zůstává jí totiž její původní hmotnost, ale tření na ni téměř nepůsobí. Díky tomu je možné ji poměrně snadno odtáhnout (jako kdyby vážila pouhou desetinu své hmotnosti).\nKouzelník dokáže toto kouzlo seslat i na různě těžké předměty. Očarovaný subjekt se pak volně vznáší asi jeden sáh nad zemí. Celková hmotnost cíle (včetně vybavení) však nesmí překročit 100 liber. V takovém případě by kouzlo postavu neuneslo. Kouzelník by musel použít větší množství many. Za každý dodatečný bod many vložený do kouzla se nosnost levitace zvyšuje o dalších 20 lb."),
    K("Magická střela", "Mana Orbi", "obecna", 8, "8 za střelu", "100 sáhů", "koule o poloměru 3 sáhy", "ihned",
      "Dlouhá akce", "8 (+2 za každou střelu navíc)", ["Divoká magie", "magické"],
      overeni="Sesílání kouzel (INT) vs. Výdrž (ODO)",
      ucinek={"damage": "2k6", "perUnit": True, "halfOnSave": True, "only": "magičtí tvorové a nadpozemské bytosti"},
      popis="Tato bílá střela divoké energie má schopnost narušovat magické vazby. Po seslání vyletí vysokou rychlostí směrem, který si kouzelník zvolil. Ten ji může nechat explodovat kdykoliv během letu (jinak vybuchne sama, jakmile se vzdálí nad sto sáhů od kouzelníka nebo narazí na jakoukoli překážku).\nExploze se projevuje oslnivým zábleskem, který zraní všechny magické tvory a nadpozemské bytosti v dosahu za 2k6 životů (v případě neúspěšného ověření za polovinu).\nJestliže kouzelník sešle v jedné akci více magických střel, spojí se do jedné veliké a jimi způsobená zranění se sčítají."),
    K("Magický štít", "Mana Manor", "obecna", 8, "2 za kolo", "sesilatel", "sesilatel", "dle dodané many",
      "Krátká akce", "6", ["Ochranná magie"],
      ucinek={"defenseBase": 5},
      popis="Toto kouzlo vytvoří kolem kouzelníka ochrannou auru, která se pohybuje spolu s ním. Obvykle je neviditelná či slabě světélkuje ve vzdálenosti jednoho sáhu od něj. Kouzelníkovi zvyšuje Základní obranu (ZO) o 5. Délku trvání kouzla určí kouzelník při jeho seslání."),
    K("Najdi předmět", "Invenio Subject", "obecna", 8, "4", "50 sáhů", "jeden předmět", "15 minut (1 směna)",
      "5 kol", "6", ["Vysoká magie"],
      popis="Kouzelník prostřednictvím tohoto zaklínadla dokáže najít libovolný předmět. Prostě jeho polohu intuitivně vycítí.\nPři sesílání kouzla je nutné se soustředit na vzhled hledané věci (představit si, jak vypadá). Je-li v okamžiku seslání v dosahu, dokáže kouzelník po dobu trvání určit její polohu (směr, vzdálenost i přesné místo, kde se nachází), nesmí se však vzdálit mimo dosah. Pokud je podobných předmětů v dosahu více, kouzelník vždy vycítí ten, který je mu nejblíže.\nV případě, že se kouzelník pokusí najít předmět, který nikdy předtím neviděl (a zná ho třeba jen z vyprávění), získává Nevýhodu a obtížnost sesílání kouzla se tak zvyšuje o 5."),
    K("Neviditelnost", "Avidium", "obecna", 8, "6", "50 sáhů", "jeden tvor nebo předmět (do velikosti C)", "15 minut (1 směna)",
      "Dlouhá akce", "6", ["Magie proměn"],
      popis="Tvor nebo předmět, na nějž je kouzlo sesláno, se stane neviditelným. To se týká i předmětů, které má na sobě, tedy neživých věcí běžné velikosti, které postava unese. Pokud je však odloží, tyto předměty se zviditelní. Kouzlo nemá žádný vliv na později uchopené předměty. Ty zůstávají i nadále viditelné. Pokud s nimi bude neviditelná postava manipulovat, budou pro okolí vypadat, jako by se vznášely.\nNeviditelnost nijak nemění další fyzikální vlastnosti postavy. Postava nadále zanechává stopy a psi ji mohou vyčenichat.\nBěhem doby trvání kouzla je potřeba být opatrný. Neviditelnost se totiž může velmi snadno narušit. Stačí promluvit, zaútočit, seslat kouzlo (a to i z předmětu) nebo provést nějakou komplexnější akci (jako je třeba výroba předmětů a podobně)."),
    K("Očaruj zbraň", "Arma Magen", "obecna", 9, "4", "dotek", "jedna zbraň", "15 minut (1 směna)",
      "Dlouhá akce", "8", ["Magie proměn", "magické"],
      popis="Tímto kouzlem lze změnit obyčejnou zbraň na magickou. Ta se pak stává nebezpečnou bytostem, které jsou běžnými zbraněmi nezranitelné (magičtí tvorové, nadpozemské bytosti atd.). Proti běžným tvorům pak působí jako obvykle.\nOčarováním střelných zbraní získají magický efekt i jimi vystřelené projektily (odezní v dalším kole po zásahu cíle)."),
    K("Oheň", "Igneum", "obecna", 9, "2 za oheň", "10 sáhů", "oheň o velikosti dlaně", "15 minut (1 směna)",
      "Dlouhá akce", "6 (+2 za každý další)", ["Divoká magie", "magické", "ohnivé"],
      ucinek={"damage": "1k6/2", "perUnit": True},
      popis="Kouzelník dokáže vyvolat ohýnek o velikosti jablka, který lze zvětšit dodáním další many. Každý další Oheň zvětší poloměr plamenů o 10 coulů. Magický plamen hoří maximálně jednu směnu, než pohasne (pokud do té doby nezapálil něco dalšího). Tento druh ohně je možné uhasit stejně jako kterýkoliv jiný. Pokud plamen zasáhne živého tvora, způsobí mu zranění za 1–3 životy (1k6 / 2) za každý Oheň."),
    K("Rychlost", "Velocitas", "obecna", 9, "3 za kolo", "10 sáhů", "1 tvor", "dle dodané many",
      "Dlouhá akce", "6", ["Vitální magie"],
      ucinek={"extraShortAction": 1, "extraAttack": 1, "extraDefense": 1},
      popis="Vlivem tohoto kouzla se stává daná bytost extrémně pohyblivou. Získává v boji navíc jednu krátkou akci. Dále má možnost v rámci bojové akce Útok provést jeden další útok. Podobně při využití bojové akce Obrana má navíc jednu aktivní obranu.\nKouzlo už ze své podstaty nedokáže zkrátit dobu potřebnou k sesílání kouzel, vzývání proseb a podobně. Dobu trvání kouzla určuje kouzelník při jeho seslání."),
    K("Světlo", "Fiat Lux", "obecna", 10, "1 za dva sáhy poloměru", "30 sáhů", "koule o poloměru dle vložené many", "1 hodina (4 směny)",
      "Dlouhá akce", "6", ["Divoká magie"],
      popis="Po seslání tohoto kouzla se na vybraném místě rozzáří drobná koule o velikosti jablka. Z ní pak vychází jasná záře, která osvětlí plochu odpovídající rozsahu kouzla. V tomto místě je pak vidět jako za slunného dne. Barvu světla si může kouzelník zvolit.\nO velikosti rozsahu světla rozhoduje množství many v zaklínadle. Kouzelník může seslat zaklínadlo na určité místo nebo přímo na sebe či svou hůl. V takovém případě se světlo pohybuje spolu s ním, případně vychází z jeho hole.\nMagické světlo se chová podobně jako to běžné (vrhá stíny, neprojde zdí a podobně)."),
    K("Teleport", "Portus Máves", "obecna", 10, "4", "sesilatel", "sesilatel", "ihned",
      "Dlouhá akce", "9", ["Vysoká magie"],
      popis="Teleportem dokáže kouzelník přesunout sebe z jednoho místa na druhé. Největší vzdálenost, kterou lze takto překonat, je 60 sáhů.\nPři teleportaci se zároveň přenese i vše, co má na sobě. Lze takto přesunout i živé tvory o velikosti A0, které má kouzelník u sebe. Nelze však přesunout strom, kterého se kouzelník drží, a podobně (viz níže).\nAby se kouzlo zdařilo, je nutné vidět, kam se má dotyčný teleportovat. V opačném případě hrozí, že se pokusí o přenos na místo, kde je nějaká překážka (běžně skála, strom a podobně). V takovém případě dojde ke zranění za polovinu maximálního počtu životů a přenos se nezdaří.\nJestliže je sesilatel pevně připoutaný k místu (např. řetězy ke stěně), kouzlo se automaticky nezdaří. Běžné svázání však teleportu nijak nevadí (postava prostě zůstane svázaná, jen se objeví jinde)."),

    # ======================= DIVOKÁ MAGIE =======================
    K("Beranidlo", "Maradorr", "divoka", 18, "5 za velikost (počínaje A)", "dotek", "1 tvor či překážka", "ihned",
      "Dlouhá akce", "9", ["Divoká magie"],
      overeni="Sesílání kouzel (INT) vs. Atletika (SIL); Sesílání kouzel (INT) vs. X",
      popis="Toto kouzlo sešle silnou dávku divoké energie na vybraného tvora, či překážku. Množství potřebné many je závislé na tom, o jak velký cíl se jedná.\nJestliže je cílem tvor, tak si kouzelník hodí na ověření Sesílání kouzel (INT) proti Atletika (SIL) obránce. V případě kouzelníkova úspěchu je obránce odhozený o tolik sáhů, jaký činil rozdíl mezi jejich hody.\nPokud kouzelník cílil kouzlo na dveře, bránu, či podobný objekt, tak musí svým hodem na Sesílání kouzel (INT) překonat hodnotu (X), kterou nastaví PJ dle Tabulky obtížností akcí. Jestli kouzelník uspěje, tak dveře vyrazí."),
    K("Mrazivá střela", "Frigo Orbi", "divoka", 18, "6 za střelu", "80 sáhů", "koule o poloměru 3 sáhy", "ihned",
      "Dlouhá akce", "8 (+2 za každou další)", ["Divoká magie", "magické", "ledové"],
      overeni="Sesílání kouzel (INT) vs. Výdrž (ODO)",
      ucinek={"damage": "1k10", "halfOnSave": True},
      popis="Tímto zaklínadlem dokáže kouzelník zformovat ledovou kouli o velikosti hlávky zelí. Ta pak vysokou rychlostí vystřelí směrem, kterým kouzelník ukáže. Může ji nechat explodovat kdykoliv během letu, jinak vybuchne sama, jakmile se vzdálí nad osmdesát sáhů od kouzelníka. V tu chvíli exploduje ve změť malých ledových krystalů.\nVšichni tvorové v oblasti určené rozsahem kouzla utrpí zranění za 1k10 životů a jsou na 1 kolo zpomaleni, takže se jejich pohyblivost sníží na polovinu (v případě neúspěšného ověření je zranění poloviční a nejsou zpomaleni). Zároveň může uhasit oheň menšího rozsahu (pochodeň, lucerna, malý táborák).\nJestliže kouzelník sešle v jedné akci více Mrazivých střel, všechny se spojí do jedné veliké. Poloměr rozsahu se zvýší o 2 sáhy za každou další střelu v ní obsaženou."),
    K("Ohnivá čepel", "Ignis Gladius", "divoka", 19, "1 za kolo", "dotek", "1 zbraň", "dle dodané many",
      "Dlouhá akce", "7", ["Divoká magie", "magické", "ohnivé"],
      ucinek={"weaponDamage": "1k6/2"},
      popis="Po seslání tohoto kouzla se aktivní část zbraně (obvykle čepel) pokryje vrstvou magického ohně. Ten nepoškozuje zbraň samotnou avšak navenek se jeví žhavá a sálá z ní žár. Zvyšuje také zranění, které zbraň způsobí, a to o 1–3 životy (1k6 / 2) při každém úspěšném útoku. Čepelí jde samozřejmě taktéž zapálit cokoliv hořlavého.\nZbraň samotná neuděluje magické ani ohnivé zranění (to udělují jen magické plameny na zbrani)."),
    K("Ohnivá koule", "Carica Ignea", "divoka", 19, "4 za kouli", "60 sáhů", "koule o poloměru 3 sáhy", "ihned",
      "Dlouhá akce", "9 (+2 za každou další)", ["Divoká magie", "magické", "ohnivé"],
      overeni="Sesílání kouzel (INT) vs. Výdrž (ODO)",
      ucinek={"damage": "1k6", "perUnit": True, "halfOnSave": True},
      popis="Po seslání tohoto kouzla se vytvoří u kouzelníkových rukou plamenná koule o velikosti hlávky zelí. Ta pak letí vysokou rychlostí směrem, který určí kouzelník. Ten ji může nechat explodovat kdykoliv během letu (jinak vybuchne sama, jakmile se vzdálí nad šedesát sáhů od kouzelníka nebo narazí na jakoukoli překážku).\nExploze zraní všechny zasažené tvory za 1k6 životů (v případě neúspěšného ověření za polovinu). Kouzlo navíc zapálí i předměty, které jsou k tomu náchylné (slaměná střecha, vylitý olej a podobně).\nJestliže kouzelník sešle v jedné akci více ohnivých koulí, spojí se do jedné veliké a jimi způsobená zranění se sčítají."),
    K("Plamenná ruka", "Ignis Manus", "divoka", 19, "3 za plamen", "6 sáhů", "sesilatel", "3 kola",
      "Dlouhá akce", "7 (+2 za každý plamen navíc)", ["Divoká magie", "magické", "ohnivé"],
      overeni="Hbitost (OBR) vs. Hbitost (OBR)",
      ucinek={"damage": "1k6", "perUnit": True, "everyRound": 3},
      popis="Ruka kouzelníka začne po seslání tohoto zaklínadla chrlit plameny. Šířka plamenného sloupce je zhruba 30 coulů a lze jím zasáhnout cíl až na vzdálenost 6 sáhů. Aby se tak kouzelníkovi povedlo, musí uspět v hodu na Hbitost (OBR) vs. Hbitost (OBR) obránce. Když uspěje, tak je cíl popálen plamenem za 1k6 životů a to za každý plamen, který kouzelník seslal.\nPlamen může také zapálit hořlavé látky (olej, slaměná střecha, roucho). Sesílatel a jeho vybavení jsou však před tímto efektem chráněni.\nPlamenná ruka je aktivní po dobu 3 kol a kouzelník se může v každém kole pokusit někoho zasáhnou. Na udržení kouzla se však již nemusí soustředit a pokud chce, tak může sesílat i kouzla jiná (jednu ruku mu však zaměstnají plameny)."),
    K("Poryv větru", "Flaera", "divoka", 20, "2 (6)", "50 sáhů", "1 sáh široký pás o délce deseti sáhů", "ihned",
      "Krátká akce", "7", ["Divoká magie"],
      popis="Tímto kouzlem je možné vyvolat náhlý poryv větru. O jeho síle a směru rozhoduje kouzelník. Může jít o slabý vánek, který sfoukne plamen svíčky, stejně jako o silný poryv (2 body many), který dokáže sfouknout pochodeň, převrátit vědro či opřenou halapartnu. Může také jít o fičák (6 body many), který dokáže odhodit postavy až o velikosti C na vzdálenost 1k6 sáhů. V tomto případě musí kouzelník překonat hodem na Sesílaní kouzel (INT) hod na Atletiku (SIL) cíle."),

    # ======================= MAGIE PROMĚN =======================
    K("Dlouhá ruka", "Manus Lungo", "promen", 20, "2", "sesilatel", "sesilatel", "1 směna",
      "3 Dlouhé akce", "7", ["Magie proměn"],
      popis="Tímto zaklínadlem dokáže kouzelník protáhnout svou ruku až na vzdálenost deseti sáhů. Dochází k tomu nejvýše rychlostí 1 sáh za kolo. Musí se přitom „plazit“ po povrchu, protože ji není možné udržet jen tak ve vzduchu. Není také schopna útoku, ale dokáže vzít předmět, odemknout zámek či spustit past. Má totiž stále svůj cit a je stejně zranitelná. Jakmile kouzlo pomine, ruka se začne stejnou rychlostí zase zkracovat."),
    K("Mlha", "Nebula", "promen", 20, "1 za deset sáhů poloměru", "30 sáhů", "kruh o poloměru dle vložené many", "15 minut (1 směna)",
      "2 Dlouhé akce", "6", ["Magie proměn"],
      popis="Kouzelník dokáže seslat magickou mlhu, která není jedovatá, ale je poměrně hustá. Obrysy postav či překážek jsou v ní rozeznatelné maximálně na dva sáhy. Toto omezení se vztahuje i na kouzelníka samotného.\nZaklínadlo může kouzelník seslat na určité místo nebo přímo na sebe. V takovém případě se mlha pohybuje spolu s ním. Je-li kouzelník v dosahu, dodáním many může kouzlo prodloužit."),
    K("Proměna", "Polymorf", "promen", 21, "6", "40 sáhů", "sesilatel", "15 minut (1 směna)",
      "2 Dlouhé akce", "9", ["Magie proměn"],
      popis="Tímto zaklínadlem se kouzelník dokáže proměnit v jinou živou bytost, kterou vidí a která od něj není dále než čtyřicet sáhů. Tvor, na kterého se chce proměnit, musí být zhruba stejné velikosti jako on (maximálně o jednu třídu velikosti větší či menší).\nPři proměně získá kouzelník fyzickou podobu cíle, stejně jako jeho viditelné doplňky (oblečení, zbraně, vybavení a podobně). Věci, které kouzelník u cíle nevidí (obsah torny, text v zapečetěném svitku a podobně), kouzlo zhmotnit nedokáže. Stejně tak kopie magických předmětů nebudou mít žádné zvláštní schopnosti či manu. Vybavení, které měl kouzelník v okamžiku sesílání u sebe, se stává součástí proměny a dočasně zmizí.\nSpolu se vzhledem získává kouzelník i další fyzické vlastnosti cíle (včetně hlasu a podobně). Počet životů, které bude mít, se však tímto nemění (a to ani kdyby měl cíl vyšší odolnost). Stejně tak získá i zvláštní schopnosti daného tvora (dýchání pod vodou, noční vidění, schopnost létat a podobně), které však nejsou magické, mytické či nadpřirozené povahy (schopnost plivat oheň, způsobit zkamenění a podobně).\nProměna nemá žádný vliv na kouzelníkovu mysl ani jeho znalosti (nezíská tak žádné dovednosti či profesní schopnosti daného cíle)."),
    K("Protoplazma", "Glutinum", "promen", 21, "3 za kolo", "15 sáhů", "1 tvor", "dle dodané many",
      "Dlouhá akce", "8", ["Magie proměn"], overeni="Sesílání kouzel (INT) vs. Hbitost (OBR)",
      popis="Z kouzelníkových rukou vytryskne extrémně lepkavý sliz, který se chová podobně jako pavučina. Pokud někoho zasáhne (kouzelník uspěje v ověřovacím hodu a překoná Hbitost protivníka), přilne k němu a omezí ho v pohybu. Množství protoplazmy, které kouzlo obsahuje, dokáže pacifikovat pouze tvory do velikosti C.\nZasažený cíl má poloviční rychlost (Pohyblivost), než je obvyklé. Zároveň má Nevýhodu (postih -5) ke všem akcím vyžadujícím pohyb, obratnost či gestikulaci (včetně obrany, útoku, iniciativy a provádění kouzelnické magie)."),
    K("Tajemné dveře", "Porta Arcánum", "promen", 21, "5", "10 sáhů", "1 dveře", "1 hodina",
      "Dlouhá akce", "7", ["Magie proměn"], overeni="Atletika (SIL) vs. Sesílání kouzel (INT) sesilatele",
      popis="Tajemné dveře jsou kouzlo, které už způsobilo hodně zmatku. Kouzelník jím dokáže proměnit dveře (jejich materiál i celkový vzhled) tak, že vypadají jako okolní stěna. Dveře se v nové podobě nedají otevřít ani odemknout (stávají se skutečnou zdí – cihlovou, dřevěnou či třeba skálou). Po uplynutí kouzla se dveře vrátí do původního stavu, sesilatel může kouzlo kdykoliv dotekem ukončit. Stejně lze ovlivnit i okna nebo třeba poklopy.\nPokud by se někdo pokoušel takto vytvořenou zeď prorazit, tak musí uspět v ověřovacím hodu na Atletiku (SIL) vs. Sesílání kouzel (INT) kouzelníka."),
    K("Temnota", "Tenebris", "promen", 22, "1 za dva sáhy poloměru", "30 sáhů", "koule o poloměru dle vložené many", "10 kol (1 minuta)",
      "Dlouhá akce", "6", ["Magie proměn"],
      popis="Po seslání tohoto kouzla se prostor vymezený zaklínadlem ponoří do naprosté tmy. Kdokoliv zvenčí tak ztrácí schopnost vidět cokoliv uvnitř rozsahu tohoto kouzla (podobně, jako když zvenčí hledíš do tmy v jeskyni). Temnota je tak silná, že ruší i zvláštní schopnosti některých ras vidět ve tmě. Zaklínadlo může kouzelník seslat na určité místo nebo přímo na sebe. V takovém případě se temnota pohybuje spolu s ním.\nPostavy uvnitř Temnoty vidí vše, co je mimo ni. Obvykle však nevidí nic z toho, co je uvnitř. Použiješ li při sesílání dvojnásobek požadované many, uvidí všichni uvnitř kouzla bez jakýchkoliv omezení.\nPostavy ukryté Temnotou se počítají jako neviditelné a boj proti nim se řídí pravidlem Boj s neviditelným protivníkem.\nPokud by do bariéry vstoupil někdo se zdrojem světla, bude jeho intenzita odpovídat desetině původní záře (pochodeň bude zářit zhruba jako svíčka a podobně).\nKouzelník může použitím Dlouhé akce a dodáním příslužné many kouzlo prodloužit o další 1 minutu."),

    # ======================= MENTÁLNÍ MAGIE =======================
    K("Břichomluvectví", "Ventrilo Qui", "mentalni", 22, "2 za 10 sáhů", "dle dodané many", "koule o poloměru dle dodané many", "15 minut (1 směna)",
      "Dlouhá akce", "6", ["Mentální magie"], overeni="Vůle (CHAR) vs. Vůle (CHAR)",
      popis="Tímto zaklínadlem může kouzelník nechat vycházet svůj hlas (či jiné zvuky) z vybraného místa v dosahu. Hlas není skutečný, ale je slyšet pouze v hlavách živých inteligentních tvorů (Inteligence větší než 0), které kouzelník nevyloučil z působení daného kouzla.\nPřidáním jedné many (v průběhu trvání kouzla) lze navíc změnit dojem, odkud daný zvuk vychází (lze tak vyvolat pocit, že kolem někdo prochází a podobně).\nKouzlo se projeví u všech, které kouzelník při Ověření úspěchu překonal svou Vůlí."),
    K("Dvojník", "Multimero", "mentalni", 23, "3 za směnu", "100 sáhů", "kruh o poloměru 10 sáhů", "dle dodané many",
      "Dlouhá akce", "8", ["Mentální magie"], overeni="Vůle (CHAR) vs. Vůle (CHAR)",
      popis="Tímto zaklínadlem dokáže kouzelník vsugerovat jednotlivci nebo skupině živých inteligentních tvorů (Inteligence vyšší než 0) dokonalou mentální iluzi tvora, kterého už někdy viděl, nebo sebe sama. Tato kopie je nehmotná a jedná se pouze o mentální projekci. Ta se objeví v myslích všech, jejichž vůli kouzelník v ověřovacím hodu překonal a které svým rozhodnutím z efektu kouzla nevyjmul.\nKouzelník může nechat iluzi vykonávat nějakou činnost, nebo ji dokonce nechat „mluvit“. Už ze samé podstaty kouzla vyplývá, že se nikdy nejedná o skutečnou fyzickou interakci s okolím (dvojník nedokáže otevřít dveře, sebrat předmět a podobně).\nNa kouzlo je potřeba se po celou jeho dobu trvání soustředit. Jakmile s tím kouzelník přestane, iluze se rozplyne a nelze ji už znovu obnovit."),
    K("Noční můra", "Nocturnum", "mentalni", 23, "4", "30 sáhů", "1 tvor", "12 hodin",
      "5 kol", "7", ["Mentální magie"], overeni="Vůle (CHAR) vs. Vůle (CHAR)",
      popis="Postava zasažená tímto kouzlem je ve svém spánku atakována nočními děsy. Budí se hrůzou, převaluje se a vykřikuje ze snů. Děsy, které noční můru provází, většinou souvisí s tím, čeho se oběť nejvíc bojí. Kouzelník však taktéž dokáže určit, co přesně se jí má zdát.\nVýsledkem je, že se postavě po probuzení uzdraví pouze jeden život namísto dvou. Navíc zůstane stejně unavená jako před spánkem.\nPokud by byla postava během spánku terčem těchto kouzel opakovaně, bude situace ještě horší. Za každé z nich ztrácí dva životy a musí provést ověřovací hod na Kritické vynaložení sil Výdrž (ODO) vs. 10. Navíc bude postava natolik psychicky rozhozena, že nebude schopna meditace. Doplnění many (jak u hraničáře, tak u kouzelníka) pak bude možné až po dalším nerušeném osmihodinovém spánku.\nEfekt kouzla se projeví tehdy, jestliže kouzelník překoná v ověřovacím hodu Vůli protivníka."),
    K("Ochromení", "Nervorum", "mentalni", 24, "3× úroveň cíle", "30 sáhů", "1 tvor", "15 minut (1 směna)",
      "Dlouhá akce", "9", ["Mentální magie"], overeni="Vůle (CHAR) vs. Výdrž (ODO)",
      soustredeni=True,
      popis="Tímto kouzlem lze ochromit (paralyzovat) někoho jiného. Efekt kouzla se projeví jen tehdy, jestliže kouzelník v ověřovacím hodu překoná Výdrž protivníka. V takovém případě bude cíl strnulý a neschopen pohybu. Nedokáže navíc ani mluvit nebo mrkat (to se děje jen bezděčně). Zbytek jeho mysli však bude nezasažen. Cíl tak vnímá vše, co se s ním děje.\nMnožství many potřebné k seslání kouzla se liší podle úrovně cíle. Kouzelník tak musí odhadnout, kolik many bude k ochromení potřeba. Jestliže jí nebude dost, kouzlo se automaticky nezdaří a mana se bez efektu rozptýlí do okolí.\nKouzelník se musí na toto kouzlo po celou dobu jeho trvání soustředit (použít akci Soustředění). Pokud by svou koncentraci přerušil, ochromení tvora okamžitě pomine, každé kolo navíc musí uspět v opakovaném ověřovacím hodu, jinak se ochromený tvor vzpamatuje a kouzlo je přerušeno.\nPŘÍKLAD: Kouzelník se pokouší ochromit válečníka na čtvrté úrovni. Bude k tomu tedy potřebovat 12 bodů many (3x4)."),
    K("Sugesce", "Sugescio", "mentalni", 24, "1× úroveň cíle", "30 sáhů", "1 tvor", "30 minut (2 směny)",
      "Dlouhá akce", "7", ["Mentální magie"], overeni="Vůle (CHAR) vs. Vůle (CHAR)",
      popis="Jestliže kouzelník v ověřovacím hodu překoná Vůli protivníka, dokáže mu vsugerovat určitý pocit (hlad, vztek, vzrušení, bolest zubů a podobně)."),
    K("Vize", "Visio", "mentalni", 24, "9 za směnu", "100 sáhů", "1 tvor", "dle dodané many",
      "2 Dlouhé akce", "9", ["Mentální magie"], overeni="Vůle (CHAR) vs. Vůle (CHAR)",
      popis="Jestliže kouzelník v ověřovacím hodu překoná Vůli protivníka, dokáže mu v mysli vsugerovat obraz něčeho, co není skutečné. Může si vymyslet i místa a scény, které sám nikdy neviděl. Obvyklým příkladem této iluze je třeba kamenná stěna, dveře, jáma v zemi, stejně jako hořící střecha nebo hemžení škorpiónů.\nPanuje-li v okolí nepokoj (boj, panika a podobně), tak je jistá šance, že očarovaný tvor kouzlo předčasně prohlédne. Každé kolo si tedy může hodit na ověření Vůle (CHAR) vs. Vůle (CHAR) kouzelníka.\nKouzlo lze použít na živé inteligentní tvory s Inteligencí vyšší než 0."),

    # ======================= OCHRANNÁ MAGIE =======================
    K("Antimagická bariéra", "Contra Magica", "ochranna", 25, "X", "sesilatel", "sesilatel", "12 hodin",
      "Krátká akce", "9", ["Ochranná magie"],
      popis="Tato bariéra dokáže ochránit kouzelníka před cizí magií. Je pouze na něm, jak silná vlastně bude (dle množství many).\nJestliže je cílem zaklínadla přímo kouzelník, odsaje se z bariéry tolik many, kolik stálo kouzlo na něj seslané. To pak na něj nebude mít žádný efekt. V případě, že je kouzelník cílem kouzla nepřímo (plošné kouzlo), odčerpá se z aury mana v množství odpovídajícím jedné čtvrtině ceny daného kouzla (vždy však aspoň 1). Pokud není v bariéře dostatek energie k pohlcení kouzla, rozplyne se a cizí kouzlo projde beze změny.\nPŘÍKLAD: Kouzelník Meredil sešle auru a vloží do ní 10 bodů many. Síla aury je tedy 10. Během večera se ho pokusí napadnout jiný kouzelník. Ze zálohy na něj sešle blesk (v ceně 3 bodů many). Blesk doletí ke kouzelníkovi, avšak nezasáhne ho. Pár coulů nad jeho tělem zafunguje ochranná bariéra. Ta energii blesku neškodně uvolní do okolí. Za to se z ní odčerpají právě 3 body (jako byla cena blesku). V auře tak zůstane ještě 7 dalších bodů many, které dokáží negovat cizí kouzla.\nBěhem účinku tohoto zaklínadla nedokáže kouzelník sesílat žádné jiné kouzlo. Aura by ho pohltila stejně jako kouzla zvenčí. Může však bariéru průběžně posilovat další manou, pokud jí disponuje.\nKouzelník může bariéru kdykoliv ukončit, mana v ní obsažená se neškodně vyzáří do okolí."),
    K("Magická zbroj", "Defendor", "ochranna", 25, "4 za zbroj", "dotek", "1 tvor", "6 hodin",
      "Krátká akce", "8 (+2 za každou zbroj navíc)", ["Ochranná magie"],
      ucinek={"defenseBase": 1, "perUnit": True},
      popis="Po seslání tohoto kouzla se těsně kolem cíle zformuje zvláštní ochranná aura. Ta není na první pohled viditelná a všimne si jí jen velmi dobrý pozorovatel. Vypadá jako slabé tetelení vzduchu, které můžeš vidět za horkých letních dnů.\nTato aura chrání svého nositele stejně jako kterákoliv jiná zbroj. Za každé 4 body many, které do kouzla vložíš, zvýší Základní obranu (ZO) cíle o +1 (např. za celkem 12 many +3 k obraně).\nPOZNÁMKA: Toto kouzlo je možné seslat i v případě, že už je tvor navlečen do zbroje nebo je chráněn nějakým dalším kouzlem."),
    K("Naruš pozornost", "Distero", "ochranna", 26, "X", "40 sáhů", "1 tvor", "Dlouhá akce",
      "Krátká akce", "8", ["Ochranná magie"],
      popis="Kouzelník dokáže tímto kouzlem krátkodobě narušit soustředění ostatních. To se projevuje silnými bolestmi hlavy a pískotem v uších. Obtížnost všech akcí vyžadujících Inteligenci a soustředění (tedy i prosby či kouzlení) se tak zvyšuje o X (dle dodané many)."),
    K("Ochrana před střelami", "Contra Orbi", "ochranna", 26, "3 za projektil", "dotek", "koule kolem cíle o poloměru 2 sáhy", "12 hodin",
      "Krátká akce", "8 (+2 za každý další)", ["Ochranná magie"],
      popis="Toto kouzlo vytvoří kolem cíle ochrannou kupoli, která dokáže zabránit průniku rychle letících předmětů (střelné a vrhací zbraně). Za každé 3 many bariéra odrazí jeden nemagický projektil.\nV průběhu kouzla není možné z bariéry střílet ven. Pokud se o to někdo pokusí, odčerpá to jednu ochranu a střela neprojde. Kouzlo nijak nechrání před magickými zbraněmi a efekty magie. Blesky, ohnivé koule a podobně tak lze volně sesílat dovnitř i ven."),
    K("Rozptyl kouzlo", "Disruptum Magen", "ochranna", 26, "10", "10 sáhů", "1 kouzlo", "ihned",
      "3 Dlouhé akce", "9", ["Ochranná magie"], overeni="Sesílání kouzel (INT) vs. Sesílání kouzel (INT) sesilatele",
      popis="Toto zaklínadlo dokáže rozptýlit efekt jiného kouzla. Aby se to kouzelníkovi povedlo, tak musí uspět v hodu na ověření Sesílání kouzel (INT) proti Sesílání kouzel (INT) sesilatele.\nToto kouzlo nemá vliv na prosby a přírodní magii."),
    K("Schránka", "Arca", "ochranna", 26, "2 za hodinu", "dotek", "1 předmět velikosti hlávky zelí", "dle dodané many",
      "Dlouhá akce", "9", ["Ochranná magie"],
      popis="Sesláním tohoto kouzla se kolem vybraného předmětu vytvoří kulovitá, černá (neurčí-li kouzelník jinak), neprůhledná aura. Ta ho dokáže dočasně ochránit před jakýmikoliv vnějšími vlivy (déšť, údery, otřesy, výbuch a podobně). Zároveň je předmět skryt před magickým vyhledáváním (například pomocí kouzla Najdi předmět).\nToto kouzlo nelze seslat na živé tvory. Chráněný předmět nelze z aury vyjmout, dokud kouzlo neskončí. Sesilatel může kouzlo kdykoliv dotekem ukončit."),

    # ======================= VITÁLNÍ MAGIE =======================
    K("Dotek upíra", "Manus Nocturna", "vitalni", 27, "2 za kolo", "sesilatel", "sesilatel", "dle dodané many",
      "Dlouhá akce", "8", ["Vitální magie", "magické", "nekrotické"],
      ucinek={"drain": "1k6", "selfHeal": "½"},
      popis="Kouzelník dokáže pomocí tohoto kouzla působit trochu jako upír. Dotkne-li se v daném kole své oběti rukama nebo zbraní, vysaje z ní 1k6 životů a polovinu z nich pak sám hned získá.\nAby k tomu došlo, musí kouzelník v boji zasáhnout svého protivníka (překonat jeho obranu). Jestliže se oběť doteku nebrání, je úspěch efektu kouzla automatický.\nEfekt tohoto kouzla působí jen na živé tvory."),
    K("Posílení smyslu", "Ampli Sensum", "vitalni", 27, "2", "dotek", "1 tvor", "15 minut (1 směna)",
      "Dlouhá akce", "7", ["Vitální magie"],
      popis="Kouzelník může tímto zaklínadlem posílit vnímání jednoho tvora. Je jen na něm, který ze smyslů se takto rozhodne vylepšit (zrak, sluch, čich, hmat nebo chuť). Jeho citlivost se následně výrazně zvýší (i se všemi klady a zápory, které to s sebou přinese).\nTvor pod vlivem tohoto kouzla navíc získá ke všem hodům s použitím daného smyslu Výhodu (bonus +5)."),
    K("Pouto života", "Nexum Vitae", "vitalni", 27, "5", "dotek", "1 tvor", "1 směna",
      "2 Dlouhé akce", "9", ["Vitální magie"],
      popis="Tímto zaklínadlem dokáže kouzelník propojit svou životní sílu s energií jiného tvora, který s tím souhlasí. Pokud by jeden z nich utrpěl nějakou ztrátu životů, rozdělí se toto zranění rovnoměrně mezi oba. Toto platí stejně i pro léčení, ale nevztahuje se na ostatní efekty, jako je třeba oslepení, otrava či účinky kouzel a lektvarů neovlivňujících stav životů.\nPokud kouzelník upadne během působení kouzla do bezvědomí kouzlo se ihned přeruší.\nKouzelník může být najednou propojen pouze s jedním tvorem, Nekromant se může propojit i s nemrtvým."),
    K("Přivolej nemrtvé", "Voca Imortus", "vitalni", 28, "4", "100 sáhů", "kruh o poloměru 50 sáhů", "ihned",
      "Dlouhá akce", "8", ["Vitální magie"], overeni="Vůle (CHAR) vs. Vůle (CHAR)",
      popis="Tímto zaklínadlem lze přivolat nemrtvé na vybrané místo. Kouzlo v nich vyvolá dojem, že se tam vyskytuje mnoho živých tvorů. Trýzněni neukojitelným hladem se pak ženou daným směrem (efekt kouzla pomine ve chvíli, kdy na místo přijdou).\nKouzlo působí na všechny nemrtvé v okruhu místa seslání. Ignorují ho pouze ti, kteří se právě účastní boje. Aby však na nemrtvé zabralo, tak musí kouzelník uspět v ověřovacím hodu na Vůli (CHAR) vs. Vůle (CHAR) nemrtvých.\nKouzelník se při seslání dozví řádový počet nemrtvých, kteří se nacházejí v rozsahu kouzla (žádný, jednotky, desítky, stovky, …)."),
    K("Vitální transfer", "Trans Vitális", "vitalni", 28, "5", "dotek", "1 tvor", "ihned",
      "Dlouhá akce", "8", ["Vitální magie"],
      popis="Kouzelník dokáže pomocí many přenést část své životní síly do někoho jiného. Je jen na něm, kolik svých životů cíli daruje. Kouzelník takto zvládne předat nanejvýš polovinu z maxima svých životů. V okamžiku, kdy by tuto hranici překročil, upadne do bezvědomí."),
    K("Voodoo", "Vendolor", "vitalni", 28, "5 (10)", "1 míle", "1 tvor", "1 směna",
      "2 Dlouhé akce (+5 minut příprava)", "10", ["Vitální magie"], overeni="Vůle (CHAR) vs. Vůle (CHAR)",
      popis="Toto kouzlo vyžaduje speciální přípravu. Před jeho použitím musíš sehnat nějakou „část těla“ své oběti (obvykle vlasy, zub, nehty a podobně). Tu pak vložíš do jednoduché figurky, kterou si vyrobíš z libovolného materiálu. Pokud figurku nemáš, můžeš si ji vytvořit z čisté energie (kouzlo pak stojí 10 bodů many namísto 5). Předmět z oběti pak levituje v jejím středu.\nJestliže kouzelník v ověřovacím hodu překoná Vůli protivníka, stane se dotyčný na dané kouzlo citlivým. Jakmile kouzelník do figurky bodne, ucítí oběť nesnesitelnou bolest v místě, které bylo na loutce zasaženo. Ta přetrvává po celou dobu trvání kouzla, dokud není jehla vytažena nebo není zasaženo jiné místo.\nBodnutí nezpůsobí oběti žádnou ztrátu životů, avšak vyvolá nepříjemný pocitový efekt spojený s bolestí. Bodnutí do oka figurky způsobí dočasnou ztrátu zraku, do ucha ztrátu sluchu, do končetin jejich krátkodobé ochrnutí a podobně. Taková situace se obvykle projevuje Nevýhodou (postih -5) ke všem akcím tvora. O celkové situaci vždy rozhoduje PJ.\nČást těla oběti potřebná k výrobě figurky je spotřebovaná a nelze ji opětovně využít k seslání tohoto kouzla."),

    # ======================= VYSOKÁ MAGIE =======================
    K("Cizí jazyk", "Capire Lingua", "vysoka", 29, "9", "sesilatel", "sesilatel", "15 minut (1 směna)",
      "2 Dlouhé akce", "8", ["Vysoká magie"],
      popis="Toto zaklínadlo propůjčuje sesilateli schopnost porozumět řeči jiných inteligentních tvorů (ne zvířat). Kouzelník je schopen daným jazykem i hovořit (pokud je to fyzicky možné). Kouzlo umožní i porozumění psanému textu."),
    K("Leť", "Volantis", "vysoka", 29, "1 za 2 kola", "dotek", "1 tvor", "dle dodané many",
      "2 Dlouhé akce", "9", ["Vysoká magie"],
      popis="Díky tomuto kouzlu může cíl (třeba i sám kouzelník) volně létat. Na tento pohyb se však musí soustředit a nemůže během něj provádět jiné akce, jako je třeba boj. Nejvyšší rychlost létání odpovídá zhruba třiceti sáhům za kolo. Dobu trvání kouzla určuje kouzelník při jeho seslání. Je-li cílem sám kouzelník, může ho navíc průběžně prodlužovat."),
    K("Najdi kouzla", "Invenio Magen", "vysoka", 29, "3", "sesilatel", "magická rezidua v okruhu 30 sáhů", "1 směna",
      "3 Dlouhé akce", "8", ["Vysoká magie"],
      popis="Každé seslané kouzlo po sobě zanechá na nějakou dobu „stopu“. Zbytkovou manu, která se drží v místě jeho seslání. Zaklínadlem Najdi kouzlo pak lze takovou manu zviditelnit.\nKouzlo se projeví formou jemného světla v místě, kde nějaké kouzlo působí. Stejně tak dokáže zviditelnit i dozvuky kouzel předchozích. To je běžně možné po dobu jedné hodiny za každý bod many, který byl k seslání doznívajícího kouzla potřeba (např. kouzlo Proměna stojí 6 bodů many, a lze jej tak vystopovat ještě 6 hodin po jeho seslání).\nPokud kouzelník dané kouzlo sám ovládá, dokáže jej navíc bez problémů identifikovat. V opačném případě pouze určí obecnou přítomnost magie. Nedokáže navíc rozpoznat kouzla hraničářů, prosby kleriků či manu obsaženou v alchymistických předmětech."),
    K("Oko zření", "Redikulus", "vysoka", 29, "5", "sesilatel", "sesilatel", "15 minut (1 směna)",
      "2 Dlouhé akce", "8", ["Vysoká magie"],
      popis="Po seslání tohoto kouzla dokáže kouzelník spatřit věci, které jsou jinak neviditelné. Může jít o předměty, bytosti či cokoliv dalšího. Kouzlo navíc působí i na neviděné – obávané tvory temnoty, kteří se občas toulají naším světem. Všechny takto zviditelněné předměty i bytosti mají kolem sebe navíc z pohledu kouzelníka slabou zářící auru."),
    K("Psychokineze", "Movera Remori", "vysoka", 30, "1 za libru hmotnosti", "30 sáhů", "1 předmět", "10 kol (1 minuta)",
      "Dlouhá akce", "7", ["Vysoká magie"],
      popis="Po seslání tohoto kouzla dokáže kouzelník pohybovat na dálku jedním předmětem. Nejvyšší rychlost pohybu předmětu je šest sáhů za kolo. Aby šlo předmětem pohybovat, musí na něj kouzelník vidět.\nToto kouzlo bylo navrženo velmi jednoduše. Pokud by se někdo pokusil předmět zachytit a držet, kouzelníkova magie jeho sílu nepřekoná."),
    K("Ticho", "Silencio", "vysoka", 30, "2 za sáh poloměru", "20 sáhů", "koule o poloměru dle dodané many", "1 hodina (4 směny)",
      "Dlouhá akce", "8", ["Vysoká magie"],
      popis="Na území zasaženém tímto kouzlem nastane naprosté a hrobové ticho. V daném území pak nic nevydává žádný zvuk, a proto jsou postavy pod jeho vlivem pro okolí zcela neslyšné. Stejně tak postavy uvnitř aury neslyší sebe navzájem (tj. kouzelník a klerik sesílá kouzla / prosby s postihem beze slov), avšak slyší všechny zvuky přicházející zvenčí.\nKouzelník může kouzlo při sesílání ještě vylepšit. Zdvojnásobením ceny kouzla dosáhne toho, že se postavy uvnitř kouzla normálně uslyší. Pro všechny venku je však jejich mluvení nadále neslyšitelné.\nTicho se obvykle drží v dané oblasti, pokud se ovšem kouzelník při sesílání nerozhodl (a neoznámil), že ho sesílá na sebe. V takovém případě se kouzlo pohybuje spolu s ním."),
]

OBORY = [
    dict(id=f"obor_{k}", nazev=f"Obor {v}", obor=v, strana=14,
         kouzla=[], popis=p)
    for k, v, p in [
        ("divoka", "Divoká magie", "Formování surové energie – energetické výboje, záblesky, kouzla čerpající sílu z elementů."),
        ("promen", "Magie proměn", "Proměna struktury a podstaty hmoty – vzhled, forma i vlastnosti."),
        ("mentalni", "Mentální magie", "Šálení mysli výjevy, falešnými pocity a dojmy. Působí jen na tvory s INT > 0; nestvůry bez CHAR si k ověření počítají jen hod k10."),
        ("ochranna", "Ochranná magie", "Ochranné bariéry; narušování, poškozování a znemožňování kouzlení ostatních."),
        ("vitalni", "Vitální magie", "Práce s životní silou – posilování, předávání, vysávání."),
        ("vysoka", "Vysoká magie", "Kouzla ovládající prostor, čas a vědění."),
    ]
]

SCHOPNOSTI = [
    dict(id="koncentrace_many", nazev="Koncentrace many", strana=12,
         efekt="Za každou dosaženou úroveň +2 many k maximu (zpětná oprava).",
         efekty=[{"target": "manaMax", "op": "add", "value": 2, "per": "level"}]),
    dict(id="kouzleni_z_knih", nazev="Kouzlení z knih", strana=12,
         efekt="S knihou s detailním popisem může seslat i kouzlo, které neovládá: 2× delší vyvolání; obtížnost +3 u oboru, který neovládá, +5 navíc u kouzla jiné specializace. Nelze kombinovat s Rychlým kouzlením. Zápis kouzla do knihy: tolik dní (8 h), kolik je obtížnost; Vzdělání (INT) vs. obtížnost kouzla.",
         sesilani={"castMult": 2, "dcForeignBranch": 3, "dcForeignSpec": 5, "excludes": ["rychle_kouzleni"]}),
    dict(id="pamet_na_kouzla", nazev="Paměť na kouzla", strana=12,
         efekt="Za každou dosaženou úroveň +1 kouzlo navíc (zpětná oprava).",
         extraItemsPerLevel=1),
    dict(id="ritual_krve", nazev="Rituál krve", strana=12,
         efekt="Během 1 kola promění vlastní životy na manu 2 : 1 (max. do maxima many); vyžaduje soustředění, rána se na konci kola zatáhne.",
         akce={"hpPerMana": 2, "duration": "1 kolo", "capAtMax": True}),
    dict(id="rychle_kouzleni", nazev="Rychlé kouzlení", strana=13,
         efekt="Doba vyvolání ½ (nejméně Krátká akce), obtížnost +3. Hráč ohlásí před sesíláním.",
         sesilani={"castMult": 0.5, "minCast": "kratka", "dc": 3, "optIn": True}),
    dict(id="vyvolani_pritele", nazev="Vyvolání přítele", strana=13,
         efekt="Rituál ~1 hodina, klid, vyzáří se celé maximum many; Sesílání kouzel vs. obtížnost tvora (krysa 10, kočka 11, sova 12). Jen 1 přítel; vyrušení = neúspěch, znovu až po meditaci.",
         odkaz="7c+ modul Přátelé (claude/data/pratele.json)"),
]

SPECIALIZACE = [
    dict(id="bojovy_mag", nazev="Bojový mág", podminky=["obor_divoka", "obor_ochranna"]),
    dict(id="carodej", nazev="Čaroděj", podminky=["obor_mentalni", "obor_vysoka"]),
    dict(id="nekromant", nazev="Nekromant", podminky=["obor_promen", "obor_vitalni"]),
]

PRAVIDLA = {
    "energie": "Mana – max. z Tabulky kouzelníkovy many (INT × úroveň; energie.json → kouzelnik_mana z PPP04).",
    "meditace": "1× denně, musí být Svěží; 1 směna; doplní manu do maxima. Vyrušení (leknutí, bolest, útok) → ztratí novou manu, může zkusit znovu (opět Svěží).",
    "nasati": "Max. tolikrát denně, kolik je úroveň; 1 minuta, volné ruce, soustředění; +1k6 many (do maxima).",
    "triky": "Kouzelnický trik: 1 mana, Dlouhá akce, bez ověření, bez formulí i gest; dosah 5 sáhů +1 za každou další úroveň; trvání obvykle ≤ 1 minuta. Jen drobné iluze – nezraní, nezapálí.",
    "overeni": "Sesílání kouzel (INT) vs. Obtížnost kouzla – musí být VYŠŠÍ než obtížnost.",
    "vyruseni": "Vyrušení (napaden, zraněn) při sesílání → obtížnost +5.",
    "postihy": {"bezReci": -5, "bezGest": -5, "bezReciAGest": -10,
                 "zbroj": "střední či těžká zbroj při gestech → postih = Kvalita zbroje"},
    "gesta": "Ke gestikulaci stačí jedna ruka; v druhé lze držet libovolný předmět. Kouzlit lze i skrze drženou hůl (i dotyková kouzla).",
    "limit": "V jednom tahu nejvýše jedno kouzlo.",
    "proti_vuli": "Kouzlo na nesouhlasící cíl se automaticky nezdaří (kromě útočných a těch, kde je to uvedeno).",
    "mana_pod_nulu": "Aktuální mana nesmí klesnout pod nulu; při podhodnocené ceně se kouzlo nezdaří a mana se vyzáří.",
    "trvani": "Trvání v kolech a déle se počítá od kola po seslání; kouzelník může kouzlo přerušit myšlenkou.",
    "prvni_uroven": "3 kouzla obecné magie dle výběru (cena ≤ max. many). Sesílání kouzel (INT) na 3. stupni. Kouzelnické triky.",
    "prestup": "Každá úroveň: nová zvláštní schopnost nebo obor; +2 kouzla (obecná nebo z ovládaných oborů). Dovednostní body 4× úroveň na každé 2. úrovni; charakterové body 2 na každé 3. úrovni.",
    "obor": "✔ U 1. 10. 2026: obor jen rozšíří nabídku kouzel, kouzlo navíc NEDÁVÁ (H11 s. 14 píše o +1 kouzlu z oboru – nepoužívá se, platí CLASSES.md).",
    "specializace": "Od 6. úrovně; podmínky podle H11 (dva obory, PPP třetí se nepoužívá ✔ U 22. 9. 2026).",
}


# PPP04 s. 213: obecná kouzla přiřazená k oborům (pro schopnosti, které pracují s oborem –
# Magistr magického oboru, Posílená ochrana, Živlomág, Kouzelníkova hůl …). Mentální žádné.
OBOR_OBECNYCH = {
    "blesk": "divoka", "magicka_strela": "divoka", "ohen": "divoka", "svetlo": "divoka",
    "bertolduv_zamek": "ochranna", "magicky_stit": "ochranna",
    "kukatko": "promen", "neviditelnost": "promen", "ocaruj_zbran": "promen",
    "rychlost": "vitalni",
    "levitace": "vysoka", "najdi_predmet": "vysoka", "teleport": "vysoka",
}


def build() -> dict:
    kouzla = [spell(k, zdroj=SRC, energie="mana") for k in KOUZLA]
    for k in kouzla:
        k["obor"] = OBOR_OBECNYCH[k["id"]] if k["skupina"] == "obecna" else k["skupina"]
    assert len(OBOR_OBECNYCH) == 13
    for o in OBORY:
        key = o["id"].removeprefix("obor_")
        o["kouzla"] = [k["id"] for k in kouzla if k["skupina"] == key]
    return {
        "_zdroj": "H11_Kouzelník_1.2.5_FINAL.pdf (PPZ 1.2.5, 31 s.), přepis 1. 10. 2026 pro 7c.2",
        "_generator": "tools/h11_kouzelnik_src.py",
        "pravidla": PRAVIDLA,
        "kouzla": kouzla,
        "obecna_magie": [k["id"] for k in kouzla if k["skupina"] == "obecna"],
        "obory": OBORY,
        "schopnosti": SCHOPNOSTI,
        "specializace": SPECIALIZACE,
        "_statistika": {"kouzla": len(kouzla), "obecna": sum(k["skupina"] == "obecna" for k in kouzla),
                        "obory": {o["id"]: len(o["kouzla"]) for o in OBORY}},
    }


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent.parent / "docs" / "h11_kouzelnik.json")
    out.write_text(json.dumps(build(), ensure_ascii=False, indent=1), encoding="utf-8")
    print(out, "OK")
