"""Zloděj H12 (Pravidla pro začátečníky 1.2.5 BETA) → docs/h12_zlodej.json   (7e.0)

Přepis z textové vrstvy H12_Zloděj_BETA_1.2.5_FINAL.pdf (projekt): základy zlodějského umění, Zlodějská hantýrka,
6 volitelných schopností, 6 zlodějských umění a jejich 18 triků s plným zněním, specializace (podmínky podle H12 ✔ U).

Opravy přepisu: Mimika patří k Umění proměn (seznam triků s. 7) – v popisu triku stojí „Umění šarmu“ (překlep pravidel);
„tichý pochyb“ → pohyb. Odkazy „strana XXX“ vynechány.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "h12_zlodej.json"

PRAVIDLA = {
    "podstata": "Zloděj je jediná profese bez many – spoléhá jen na své schopnosti a dovednosti, které může používat neustále. Povolání stojí na široké škále profesních dovedností; jejich zvládnutí umožňuje provádět unikátní triky.",
    "zaklady": "Základy zlodějského umění (1. úroveň): dovednosti Hazardní hry (OBR), Odhad ceny (INT), Přesvědčování (CHAR) a Vybírání kapes (OBR) na 3. stupni.",
    "hantyrka": "Zlodějská hantýrka (1. úroveň): tajná řeč podsvětí – na první poslech běžná řeč, slova ale mají jiný význam. Zloděj pozná hovor se skrytým významem i to, kdo patří „k oboru“, a sám slang dobře používá. Učit ji nezasvěcené se trestá smrtí.",
    "prestup": "Na každé další úrovni: nová zvláštní schopnost nebo zlodějské umění, dovednostní body, životy podle Tabulky životů, na každé 3. úrovni 2 charakterové body. Od 6. úrovně specializace Assassin, Lupič nebo Sicco.",
    "umeni": "Zlodějská umění jsou dovednosti, které zloděj ovládne rovnou na 3. stupni; každé dá automaticky 3 zlodějské triky.",
    "triky": "Zlodějské triky jsou speciální akce, které dokáže jen zloděj. Četnost = jak často jde trik opakovat (u jednorázových si dá oběť pozor). Použití = některé triky jdou v boji k Útoku nebo Obraně – ke každé takové akci jen jeden trik, nejdou kombinovat ani sčítat; má-li zloděj v kole víc útoků či obran, může zkusit trik u každé. Ověření = hod na zlodějské Umění (dovednost), ke kterému trik patří; obtížnost určí PJ nebo je to hod protivníka.",
}

HAZARD = {
    "hazardni_hry": ("Hazardní hry", "OBR", "Hazardní hry (OBR) vs. Postřeh (INT)",
                     "Zloději ve hrách nenechávají nic náhodě – cinknuté karty, triky a pečlivý výběr těch, koho oberou. Pokud zloděj překoná Postřeh protivníka, podaří se mu hru zfalšovat ve svůj prospěch a vyhrává vše, o co se dané kolo hrálo."),
    "odhad_ceny": ("Odhad ceny", "INT", "Odhad ceny (INT) vs. X",
                   "Zloděj určí, za kolik se předmět dá prodat na černém trhu. Překoná-li obtížnost PJ, získá velmi dobrou představu o ceně. Odhadne běžné věci, zbraně, drahokamy, šperky i umění; u magických či náboženských předmětů jen cenu předmětu samotného (bez magických schopností)."),
    "presvedcovani": ("Přesvědčování", "CHAR", "Přesvědčování (CHAR) vs. Vůle (CHAR)",
                      "Herectví, rétorika, empatie, diplomacie i skryté hrozby. Překoná-li zloděj Vůli protivníka, přesvědčí ho (změní názor, vyjedná lepší cenu…); jinak se protivník zatvrdí. O každé věci lze přesvědčovat jen jednou."),
    "vybirani_kapes": ("Vybírání kapes", "OBR", "Vybírání kapes (OBR) vs. Postřeh (INT)",
                       "Nenápadné prošacování nebo krádež (vybrat kapsu, odříznout měšec). Zabere 1 kolo; je třeba překonat Postřeh protivníka. U lépe chráněných předmětů (přívěsek na krku) má cíl k Postřehu bonus podle PJ."),
}

SCHOPNOSTI = [
    ("boj_beze_zbrane", "Boj beze zbraně", 3,
     "Bojuje-li zloděj beze zbraně, má při boji tváří v tvář +3 do ÚČ a OČ. Nelze přitom držet štít, jednoruční zbraň a podobně."),
    ("improvizace", "Improvizace", 4,
     "Neuspěje-li zloděj v hodu na profesní dovednost a je odhalen (někdo si všiml jeho akce), získá ještě před reakcí protivníka 1 herní tah navíc a sám rozhodne, jaké akce v něm provede. Nelze v souboji, ale těsně před ním ano (před hodem na iniciativu)."),
    ("odezirani_ze_rtu", "Odezírání ze rtů", 4,
     "S dobrým výhledem na rty a nejdál 20 sáhů zachytí zloděj artikulaci – musí znát jazyk. Nepochytí všechna slova, ale porozumí celkovému kontextu."),
    ("vrazedne_ostri", "Vražedné ostří", 5,
     "Při boji s lehkou krátkou či lehkou bodnou zbraní (vrhací i tváří v tvář) +2 do ÚČ a OČ."),
    ("vrhani_dyk", "Vrhání dýk", 5,
     "Zbraně vrhá i vícekrát za kolo: v rámci akce Útok tři vrhy za dvě kola (v prvním kole dva, v dalším jeden, a tak dokola); stejně tak v rámci akce Obrana tři obrany za dvě kola. Od 6. úrovně útočí v každém kole dvakrát. Platí i pro všechny ostatní lehké vrhací zbraně."),
    ("zakerna_kuse", "Zákeřná kuše", 5,
     "+2 do Útočného čísla a Zranění ke střeleckému útoku kuší nebo improvizovaným mechanismem (foukačky, hole střílející jehlice, zápěstní kuše…)."),
]

UMENI = [
    ("kocici_pohyb", "umeni_kociciho_pohybu", "Umění kočičího pohybu", "OBR",
     "Lezení ti umožní proniknout na těžko dostupná místa, Ohebnost uniknout z popruhů či pout a Pád z výšky ti může zachránit život."),
    ("promeny", "umeni_promen", "Umění proměn", "CHAR",
     "Triky, díky nimž ze sebe dokážeš udělat někoho jiného: Mimika (proměna tváře), Převleky (celkový vzhled) a Imitace (hlas někoho jiného)."),
    ("rvaci", "umeni_rvacu", "Umění rváčů", "OBR",
     "Triky pro konfliktní situace: Falešný útok protivníka zmate, Oko střelce dá nebývalou přesnost a Omráčením dokážeš někoho odklidit nebo zajmout."),
    ("skryvani", "umeni_skryvani", "Umění skrývání", "OBR",
     "Triky pro ochranu: Schováním ve stínu se ukryješ v budovách, Splynutí s davem pomůže v ulicích a Tichý pohyb zajistí nenápadný přesun."),
    ("sarm", "umeni_sarmu", "Umění šarmu", "CHAR",
     "Triky, jak poznat a ovlivnit ostatní: Odhad lidí, Získání důvěry a Odvedení pozornosti."),
    ("zelezny_klic", "umeni_zelezneho_klice", "Umění železného klíče", "OBR",
     "Základ budoucích lupičů: Odstranění pastí, Otevírání zámků a Padělání."),
]

# (umění, název, četnost, použití, ověření, popis)
TRIKY = [
    ("kocici_pohyb", "Lezení", "neomezeně", "kdykoliv", "Umění kočičího pohybu (OBR) vs. X",
     "Nejzajímavější kořist bývá nejvýš – hnízdo gryfa, laboratoř alchymisty, pokladnice barona. Zdolávání skal, hradeb a zdí je pro zkušeného zloděje samozřejmost.\nÚspěšnost se ověřuje podle situace, nejčastěji po 5 či 10 zdolaných sázích; obtížnost určí PJ. Rychlost lezení je obvykle 2 sáhy za kolo."),
    ("kocici_pohyb", "Ohebnost", "neomezeně", "kdykoliv", "Umění kočičího pohybu (OBR) vs. X",
     "Jako akrobati se zloději kroutí, ohýbají a „lámou“ do nemožných poloh, uvolní svaly i šlachy, vykloubí a narovnají končetiny či prsty – dostanou se z okovů a pout a prolezou otvory sotva širšími než hlava.\nZloděj musí překonat obtížnost PJ; při úspěchu akci provede. Při neúspěchu se obvykle nic nestane, při velkém rozdílu se věci mohou zkomplikovat – následky určí PJ."),
    ("kocici_pohyb", "Pád z výšky", "neomezeně", "kdykoliv", "Umění kočičího pohybu (OBR) vs. X",
     "Zloději se naučili tlumit pád zachytáváním za výčnělky a kotoulem.\nPři pádu z výšky hází zloděj proti obtížnosti PJ: při úspěchu ustojí pád zcela nezraněn, jinak utrpí poloviční zranění. Chrání ho i při nečekaném pádu (zakopnutí, násilné shození)."),
    ("promeny", "Imitace", "neomezeně", "kdykoliv", "Umění proměn (CHAR) vs. Postřeh (INT)",
     "Zloděj má skvělý sluch a hlasovou paměť – zachytí tempo, tón, barvu i hloubku cizího hlasu.\nNapodobí každého, koho někdy zřetelně slyšel mluvit: jednotlivá slova, rozkazy, výkřiky. Plynulá řeč cizím hlasem vyžaduje hlas pořádně naposlouchat (asi 5 minut). K ošálení musí překonat Postřeh (INT) cíle."),
    ("promeny", "Mimika", "neomezeně", "kdykoliv", "Umění proměn (CHAR) vs. Postřeh (INT)",
     "Zloděj ovládá mimické svaly dokonale – nasadí jakýkoli výraz (šibalský úsměv i kamennou tvář).\nPravé mistrovství je změna vzhledu obličeje: nakrabacené čelo, zdvižené obočí, svěšený koutek, nafouklé tváře, vypoulené či zapadlé oči – vzhled se změní k nepoznání. K ošálení musí překonat Postřeh. (V H12 u popisu omylem „Umění šarmu“ – trik patří k Umění proměn.)"),
    ("promeny", "Převleky", "neomezeně", "kdykoliv", "Umění proměn (CHAR) vs. Postřeh (INT)",
     "Převleky a masky zvýší důvěryhodnost, pomohou proniknout na chráněná místa nebo zmizet. Zloděj se umí maskovat za postavu své třídy velikosti; nedokonalosti zakryje šero, vzdálenost a herecký talent.\nK ošálení musí překonat Postřeh. Potřebuje aspoň základní herecké rekvizity (vak s hadry, líčidly a cetkami – stačí na běžná povolání: trhovec, poutník, nevěstka, řemeslník). Netypické převleky (nebo bez rekvizit) vyžadují oblečení nejdřív sehnat či ušít."),
    ("rvaci", "Falešný útok", "jednorázově", "do útoku", "Umění rváčů (OBR) vs. Akrobacie (OBR)",
     "Zloděj naznačí útok, a když se protivník kryje, napadne ho z jiné strany.\nSpeciální akce, která nestojí žádný čas a je součástí běžného útoku. Překoná-li Umění rváčů Akrobacii protivníka, cíl se v daném kole nebrání (brání se falešnému útoku) – skutečný útok jde do jeho ZO. Na každého protivníka jen jednou."),
    ("rvaci", "Oko střelce", "neomezeně", "do útoku", "Umění rváčů (OBR) vs. X; proti tvoru vs. Akrobacie (OBR)",
     "Neobvyklá přesnost při střelbě z kuše či jiného improvizovaného mechanismu.\nZloděj 1 kolo zaujímá střelecký postoj (vítr, vzdálenost…) a vystřelí ve svém příštím tahu. Proti obtížnosti PJ přesně zasáhne neživý cíl (lanko, svíčka, kyvadlo, lampa), vystřelí šipku se vzkazem či kotvičku s lanem. Střílí-li na tvora, hází Umění rváčů vs. Akrobacie obránce – při úspěchu má ke střeleckému útoku Výhodu +5."),
    ("rvaci", "Omráčení", "neomezeně", "místo útoku", "Umění rváčů (OBR) vs. Výdrž (ODO)",
     "Zloděj se ukryje u cesty oběti a udeří ji zezadu obuškem či kamenem v látce.\nJen na tvora, který může ztratit vědomí (ne nemrtvé, houby…) a o zloději neví – akce se provádí v momentu překvapení mimo zorné pole oběti. Překoná-li Výdrž (ODO), cíl ztratí vědomí na 1k6 směn (životy neztratí); jinak se hází na Iniciativu a začíná boj. Obvykle jen na tvory své třídy velikosti a menší. Tělo zachytí tak, aby pád nezpůsobil povyk."),
    ("skryvani", "Schování se ve stínu", "neomezeně", "kdykoliv", "Umění skrývání (OBR) vs. X; hledající Postřeh (INT) vs. výsledek",
     "Ve stínu nebo tmě se zloděj ukryje: akce trvá 1 kolo, bez postihu k plížení za Lehkou zbroj. Během ní ho nesmí spatřit ten, před kým se ukrývá (jinak automatický neúspěch). Obtížnost určí PJ (tvar místnosti, světlo…).\nPři úspěchu je prakticky nepostřehnutelný a může se plížit (1/10 Pohyblivosti); útok nebo jiné upozornění ho prozradí. Odhalit ho může jen aktivní hledání: Postřeh (INT) hledajícího musí překonat výsledek triku; nehýbe-li se zloděj, má proti hledajícímu Výhodu +5."),
    ("skryvani", "Splynutí s davem", "neomezeně", "kdykoliv", "Umění skrývání (OBR) vs. Postřeh (INT)",
     "Zloděj se přikrčí, změní držení těla, chůzi, kus oblečení a zapadne mezi lidi jako někdo jiný.\nTrvá 1 kolo a vyžaduje větší skupinu lidí (obvykle aspoň 10). Při úspěchu (proti Postřehu pronásledovatelů) se jim ztratí z očí; znovu si ho všimnou, jen když jejich Postřeh překoná sílu triku – nevidí-li mu do tváře, má Výhodu +5."),
    ("skryvani", "Tichý pohyb", "neomezeně", "kdykoliv", "Umění skrývání (OBR) vs. Postřeh (INT)",
     "Kombinace chůze a instinktu, kam bezhlučně našlapovat.\nPři úspěchu (proti Postřehu protivníka) se pohybuje v naprosté tichosti plnou Pohyblivostí, bez postihu k plížení za Lehkou zbroj. Podmínkou je upevnit či obalit hlučné předměty (kov, křehké věci) – příprava asi 5 minut, platí do odstrojení. V těžké zbroji to nepomůže."),
    ("sarm", "Odhad lidí", "neomezeně", "kdykoliv", "Umění šarmu (CHAR) vs. Vůle (CHAR)",
     "Zloděj odhadne, zda dotyčný předstírá, je nervózní, lže, má strach – podvodník, lhář, blázen, nebo obyčejný člověk.\nPotřebuje aktivní hovor aspoň 10 kol (1 minuta); při úspěchu proti Vůli má představu o psychickém rozpoložení. S víc časem (aspoň 5 minut komunikace nebo pozorování hovoru) zjistí i základní charakterové rysy (čestný, žárlivý, dominantní, důvěřivý, prospěchář…)."),
    ("sarm", "Odvedení pozornosti", "neomezeně", "kdykoliv", "Umění šarmu (CHAR) vs. Vůle (CHAR)",
     "Zloděj je mistrem historek – upoutá pozornost okolí, nebo nenápadně odvede téma hovoru.\nHod proti Vůli protivníka (při víc protivnících obvykle na každého). Při úspěchu odvede pozornost jinam a protivníci mají Nevýhodu −5 ke každému hodu na Vůli. Trvá, dokud se zloděj snaží; boj či jiná vážná situace efekt ukončí. Odvedené téma je zapomenuto nejméně na 1k6 směn."),
    ("sarm", "Získání důvěry", "neomezeně", "kdykoliv", "Umění šarmu (CHAR) vs. Vůle (CHAR)",
     "Empatie a zkušenost s lidmi otevřou cizí srdce i mysl.\nPotřebuje s osobou aspoň minutu (10 kol) hovořit. Při úspěchu proti Vůli mu cíl věří jako starému známému. Šanci zvýší připravená situace (fingovaná záchrana, věrohodné informace). Ani tak nemusí cíl prozradit tajemství, která by neřekl ani přátelům."),
    ("zelezny_klic", "Odstranění pastí", "neomezeně", "kdykoliv", "Umění železného klíče (OBR) vs. X",
     "Na každou past existuje řešení – zlodějské náčiní, obratnost a štěstí.\nOdstraní každou běžnou past: nejjednodušší během minuty, složitější během směny i déle. Obtížnost určí PJ podle typu pasti a zkušenosti toho, kdo ji nastražil. Na magické pasti nestačí (potřeba znalosti pokročilých)."),
    ("zelezny_klic", "Otevírání zámků", "neomezeně", "kdykoliv", "Umění železného klíče (OBR) vs. X",
     "V Dlouhé akci odemkne či zamkne vybraný zámek – musí překonat jeho obtížnost (PJ).\nŠanci ovlivňuje zlodějské vybavení (planžety, háčky), se kterým umí zacházet jen zloděj; jiné profese nebo zloděj bez vybavení mají Nevýhodu −5. S primitivními pomůckami (sponka) jen nejjednodušší zámky s velkým štěstím a časem."),
    ("zelezny_klic", "Padělání", "neomezeně", "kdykoliv", "Umění železného klíče (OBR) vs. X",
     "Falšování rytin, pečetí a cizího písma.\nPři úspěchu (obtížnost PJ) vznikne dokonalý padělek (bez magických vlastností); jinak má pochybnou kvalitu a dá se odhalit (obvykle Postřehem). Čas i obtížnost určí PJ podle složitosti. Potřebuje padělatelské vybavení (bez něj dvojnásobná obtížnost); dokumenty jen se základy Vzdělání."),
]

SPECIALIZACE = [
    ("assassin", "Assassin", ["skryvani", "vrhani_dyk"],
     "Nájemný zabiják – mistr překvapivých útoků, skrytých zbraní, kuší, nožů a jedů, kterého se bojí i zločinci."),
    ("lupic", "Lupič", ["kocici_pohyb", "boj_beze_zbrane"],
     "Od vybírání kapes k rabování pokladnic a trezorů – žádná past ho neodradí, žádný zámek nezastaví, a když ho načapají, má vždy záložní plán."),
    ("sicco", "Sicco", ["sarm", "odezirani_ze_rtu"],
     "Šedá eminence podsvětí – mění vzhled, hlas i podobu, rozmluví i mlčenlivé strážné, obchoduje s informacemi a časem přebírá vládu nad podsvětím."),
]


def main() -> None:
    data = {
        "_zdroj": "H12_Zloděj_BETA_1.2.5_FINAL.pdf (tools/h12_zlodej_src.py)",
        "pravidla": PRAVIDLA,
        "zaklady": [{"id": k, "nazev": v[0], "atribut": v[1], "overeni": v[2], "popis": v[3]} for k, v in HAZARD.items()],
        "schopnosti": [{"id": i, "nazev": n, "strana": p, "efekt": t} for i, n, p, t in SCHOPNOSTI],
        "umeni": [{"id": i, "skill": s, "nazev": n, "atribut": a, "popis": t} for i, s, n, a, t in UMENI],
        "triky": [{"umeni": u, "nazev": n, "cetnost": ce, "pouziti": po, "overeni": ov, "popis": t, "strana": 7 + i // 3} for i, (u, n, ce, po, ov, t) in enumerate(TRIKY)],
        "specializace": [{"id": i, "nazev": n, "podminky": r, "popis": t} for i, n, r, t in SPECIALIZACE],
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{OUT}: {len(TRIKY)} triků, {len(SCHOPNOSTI)} schopností")


if __name__ == "__main__":
    main()
