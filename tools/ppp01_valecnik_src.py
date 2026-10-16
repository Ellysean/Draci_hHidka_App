# Pokročilé bojové triky Válečníka z PPP01 (s. 39–60) – zdroj textu pro docs/ppp01_valecnik.json.
# Spuštění: python tools/ppp01_valecnik_src.py  → doplní do docs/ppp01_valecnik.json klíče
# "skupiny_triku" a "polozky" (zbytek souboru – Cesty, schopnosti, specializace – se nemění).
# Text triků je přepsaný z PDF (čitelná textová vrstva), jen bez dělení slov na koncích řádků.
import json
import pathlib
import re
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOC = ROOT / 'docs' / 'ppp01_valecnik.json'


def slug(s: str) -> str:
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')


OB = 'Obecné'
BE = 'Berserkr'
RY = 'Rytíř'
SE = 'Šermíř'
DK = 'Škola boje drtičů kostí'
KO = 'Škola boje na koni'
BO = 'Škola boje s bodnou zbraní'
JE = 'Škola boje s jednoruční zbraní'
OU = 'Škola boje s obouruční zbraní'
DV = 'Škola boje se dvěma zbraněmi'
ST = 'Škola boje se štítem'
MM = 'Mistr Cesty meče'
MS = 'Mistr Cesty sekery'
MH = 'Mistr Cesty hole a kopí'
MK = 'Mistr Cesty kladiva'
MT = 'Mistr Cesty strategie'

# (název, strana, adrenalin, použití, vyžaduje, ověření, skupina, text)
T = [
    ('Bleskový kryt', 40, '1', 'Dodatečná obrana', 'Škola boje se štítem', '-', ST,
     'Válečník třímající štít a nabuzený Adrenalinem je schopen se ubránit Dodatečnému útoku, který by pro něj jinak mohl být smrtící.\n'
     'Válečník získá jednu Aktivní obranu navíc, kterou lze použít i k ochraně vedle stojícího spolubojovníka.'),
    ('Bodnutí na chodidlo', 40, '3', 'Technika (Útok)', 'Škola boje s bodnou zbraní', 'Výdrž (ODO) vs. způsobené Zranění', BO,
     'Nohy bývají nejhůře chráněné části těla. V některých případech může být pro Válečníka výhodné vést útok právě proti slabě chráněné noze. Zranění, které tím způsobí sice není tak závažné, omezí však soupeře v pohyblivosti, což pro něj může mít fatální následky.\n'
     'Útok na nekrytý cíl, jemuž je uštědřeno poloviční Zranění. Obránce ale nemůže počítat Obranu zbraně (OZ) ani Kvalitu štítu. Kvalitu zbroje může počítat pouze tehdy, pokud má na sobě těžkou zbroj.\n'
     'Jestliže Válečník zasáhne, hodí si obránce na ověření Výdrže (ODO) vs. způsobené Zranění. Jestliže neuspěje, má zmrzačenou nohu, což se projeví zpomalením, takže bude mít poloviční pohyblivost. Zároveň utrží Nevýhodu (postih −5) na veškeré ověřovací hody na Obratnost. Zmrzačení je možné se zbavit pomocí dovednosti První pomoc či případně pomocí léčivých lektvarů a kouzel.'),
    ('Bodnutí na obličej', 40, '1', 'Finta (Útok)', 'Škola boje s bodnou zbraní', '-', BO,
     'Bod proti obličeji je vždy velice nepříjemný. Obránce má tendenci zavřít oči a automaticky se proti němu chránit (sekem, ústupem). Toho může Válečník využít a tento útok pouze předstírat, aby tím v následující akci získal výhodu.\n'
     'Bodnutí proti obličeji není dokončeným Útokem, ale jen náznakem, který má rozhodit a připravit protivníka, a tím si najít jeho slabé místo. Útokem Válečník tedy nezpůsobí žádné Zranění, ale na svůj další Útok si může hodit k6 navíc (hází tedy dvěma kostkami a po každé 6 hází znovu).'),
    ('Cit na čepeli', 41, '2 za kolo', 'Technika / Soustředění', 'Šermíř, bodná zbraň v rukou soupeře', 'Atletika (SIL) vs. Postřeh (INT)', SE,
     'Šermíř je schopen prostřednictvím dotyku své zbraně se soupeřovou vnímat jeho pohyby. Na základě tohoto vnímání dokáže rychle reagovat na jeho útoky, což mu v boji přináší velkou výhodu. V případě, že naváže dotyk se soupeřovou čepelí, nepotřebuje ho k tomu, aby s ním dobře bojoval, ani vidět.\n'
     'Šermíř naváže svou čepelí kontakt se zbraní nepřítele. Hodí si na ověření Atletika (SIL) vs. Postřeh (INT) obránce. Pokud uspěje, zaujme takový střeh, díky kterému získá Výhodu (bonus +5) k ÚČ, OČ a Iniciativě. Obránce se však může zbavit svého nevýhodného postavení tím, že kontakt přeruší (jakákoliv pohybová akce). Pokud Šermíř naváže čepele, nepočítá si postih za boj ve tmě.'),
    ('Cuknutí', 41, '3', 'Technika (Obrana)', 'Šermíř, bodná zbraň', '-', SE,
     'Ať už vede nepřítel úder na Šermíře či jeho zbraň, vždy se Šermíři vyplatí stáhnout sebe, nebo zbraň z jeho dosahu. Než si nepřítel uvědomí, že byl přelstěn, nabodne se na zbraň, kterou Šermíř po cuknutí znovu rychle obrací proti němu.\n'
     'Pokud se Šermíř brání proti Útoku a uspěje, může využít situaci k nabodnutí nepřítele. Protivník utrží Zranění rovnající se Celkové obraně + Zranění zbraně obránce mínus Základní obrana (ZO) útočníka.'),
    ('Do zbraně', 41, '3', 'Výkřik', 'Rytíř', '-', RY,
     'Správný Rytíř nikdy nepodlehne panice a z každého překvapení se rychle vzpamatuje. Pomocí duchaplného povelu je schopen vyburcovat ke stejné duchaplnosti i své spolubojovníky. Ti jsou pak schopni rychle se z překvapení vzpamatovat a adekvátně reagovat.\n'
     'Pokud Rytíř a jeho spolubojovníci čelí zákeřnému Útoku ze zálohy a útočníci získají moment překvapení, vyburcuje Rytíř po prvním Útoku, který v daném kole proběhne, své spolubojovníky Výkřikem, takže získají možnost provést akci Přezbrojení jako Okamžitou akci a mohou se bránit plným počtem Obranných akcí.'),
    ('Druhý konec', 41, '3', 'Trik (Útok), Dodatečný útok', 'Škola boje s obouruční zbraní', '-', OU,
     'Po úspěšném zásahu využije Válečník své rychlosti, změní úchop zbraně a jejím druhým koncem zasadí protivníkovi nečekaný úder.\n'
     'Bezprostředně po úspěšném zásahu zbraní může Válečník protivníkovi přidat jeden další rychlý Útok proti Základní obraně (ZO), který vede druhým koncem zbraně (toporem, hlavicí atd.). Zranění zbraně je při takovém Útoku 0. Vše se děje v rámci jedné Útočné akce.'),
    ('Druhý kryt', 41, '1', 'Reakce (Obrana)', 'Škola boje se dvěma zbraněmi', '-', DV,
     'V některých případech se stane, že nepřítel obejde připravený kryt a Válečníkovi hrozí útok na nekryté místo. V ten okamžik může využít výhody svých dvou zbraní a tento zákeřný útok sekundární zbraní zastavit.\n'
     'Jestliže je na Válečníka veden Útok proti Základní obraně (ZO), tak se může rozhodnout bránit svou sekundární zbraní. V takovém případě se jedná o Aktivní obranu, ale jen jednou zbraní.\n'
     'Tento trik je možné použít 1× za kolo.'),
    ('Druhý (třetí) šíp', 42, '1 nebo 2', 'Trik (Útok), Dodatečný útok', 'luk, prak', '-', OB,
     'Zkušený střelec si založí více šípů najednou do ruky ve které drží luk. Díky této technice pak dokáže vystřelit 2× až 3× během jednoho útoku a nepřátelé mají pocit, že stojí proti několika lučištníkům najednou.\n'
     'Válečník si do střílející ruky připraví druhý (za 2 body Adrenalinu i třetí) šíp, který pak dokáže rychleji vystřelit. Přidá tak Útok či Útoky za kolo navíc. Ty už však nejsou tak precizní jako první výstřel. Druhý výstřel má postih −2, třetí −4.'),
    ('Držení za krk', 42, '3', 'Zápas (Útok)', 'Škola boje drtičů kostí, volnou ruku nebo Zručnost se zbraní', 'Atletika (SIL) vs. Reflex (OBR)', DK,
     'Válečníkova ruka vystřelí vpřed a sevře hrdlo nepřítele. Ten se bude snažit co nejrychleji vyprostit a Válečník se tak může soustředit na zasazení smrtící rány.\n'
     'Válečník se může během svého Útoku pokusit chytit nepřítele jednou rukou za krk. Mezi dvěma aktéry pak probíhá boj beze zbraně či lehkou krátkou zbraní. Utržené Zranění cíle je dvakrát větší.\n'
     'Obránce se může v každém kole pokusit o Vyproštění (Dlouhá akce). Past, kterou je nutno přehodit, se ale v každém kole zvyšuje o +1.\n'
     'Pokud Válečník chce použít uvedený trik na otřeseného protivníka, stojí ho to pouze 1 bod Adrenalinu.'),
    ('Dupnutí', 42, '1', 'Trik (Útok)', 'Škola boje drtičů kostí', 'Atletika (SIL) vs. Útočnost + Zranění zbraně; Atletika (SIL) vs. Výdrž (ODO)', DK,
     'Pokud nepřítel nebo jeho zbraň leží na zemi, je to dokonalá pobídka pro Válečníka získat v situaci převahu. Využitím Dupnutí pak buď přerazí zbraň nepřítele či nebohého protivníka zmrzačí.\n'
     'Pokud má Válečník možnost dupnout na ležící zbraň, hodí si na past Atletika (SIL) vs. Útočnost + Zranění zbraně. Pokud uspěje, zbraň je zničena.\n'
     'Cílem dupnutí může být také ležící osoba. V takovém případě si Válečník hodí na past Atletika (SIL) vs. Výdrž (ODO) cíle. Způsobené Zranění odpovídá rozdílu mezi hody. Navíc Válečník vážně zraní končetinu cíle dle svého výběru. Cíl má na všechny aktivity s ní Nevýhodu (postih −5).\n'
     'Trik lze také využít bezprostředně po úspěšném provedení triku Přišlápnutí meče.'),
    ('Dvojitý kryt', 42, '1', 'Trik (Obrana), Reakce', 'Škola boje se dvěma zbraněmi', '-', DV,
     'Někdy se stane, že musí Válečník čelit obzvláště silnému útoku. V ten okamžik může své zbraně překřížit, čímž dojde ke zpevnění krytu, který má pak výrazně větší šanci odolat útoku vedenému brutální silou.\n'
     'Pokud Válečník vidí, že čelí mimořádně silnému Útoku (trik lze použít preventivně rovnou nebo ho lze jako Reakci ohlásit až po hodu protivníka), zkříží v Obraně obě zbraně a započítá si atribut užívaný k Obraně (OBR / SIL) dvakrát.'),
    ('Hákování', 43, '2', 'Technika (Útok)', 'Mistr Cesty sekery', 'Atletika (SIL) + Zranění zbraně vs. Atletika (SIL)', MS,
     'Hlavicí sekery lze věci odtlačovat, nebo zaháknout a táhnout. Takto lze zachytit hranu protivníkova štítu, nebo jeho zbraň. Tu je potřeba zachytit co nejblíže jeho úchopu, aby se nemohl snadno vysmeknout a zároveň trhnutím či pákou vyrazit nepříteli štít nebo zbraň z ruky.\n'
     'Válečník se pokusí zachytit štít či zbraň cíle (kromě lehkých krátkých) a vytrhnout mu je z ruky. Válečník si hodí na ověření Atletika (SIL) + Zranění zbraně vs. Atletika (SIL) obránce. Pokud se cíl ubrání, je rozhozen a hákovaný předmět nemůže použít k následující akci (Útok / Obrana). Pokud se neubrání, je mu předmět vytržen a končí zpravidla vedle hákujícího Válečníka nebo za ním.'),
    ('Harcovnictví', 43, '1', 'Soustředění', 'Škola boje na koni, střelnou či vrhací zbraň', '-', KO,
     'Harcovníci nejsou rozhodující silou na bojišti, morálku protivníka však dokážou rozložit dobře. Když se blíží k nepříteli, vztyčí se ve třmenech či kleknou na koňský hřbet, aby zvýšili dosah svých střelných a vrhacích zbraní.\n'
     'Válečník využije rychlost svého koně a výšku v sedle ke zvýšení dostřelu vrhacích / střelných zbraní o 15 / 25 sáhů po dobu jednoho kola.'),
    ('Hrozba', 43, '1', 'Soustředění', 'Škola boje s obouruční zbraní, kontaktní nebo vrhací zbraň', 'Atletika (SIL) + Zranění zbraně vs. Vůle (CHAR)', OU,
     'Obouručním zbraním bývá vlastní poměrně velký dosah, jsou dobře vidět a jejich hrozba je na bojišti téměř hmatatelná. Sebemenší náznak útoku je chápán jako smrtící nebezpečí, což Válečníkovi umožní lehce fingovat své útoky.\n'
     'S pomocí tohoto triku Válečník naznačí Útok na protivníka v dosahu své zbraně (kontaktní nebo vrhací), ale nezaútočí na něj (takže ho ani nezraní). Pokud Válečník uspěje v hodu proti pasti Atletika (SIL) + Zranění zbraně vs. Vůle (CHAR), jeho cíl znervózní a na všechny své akce cíl získá v tomto kole Nevýhodu (postih −5), protože nedokáže přestat po očku sledovat hrozbu Válečníka. Z vlivu se lze vyvázat vzdálením se mimo dosah (alespoň +2 k dosahu zbraně) nebo vyřazením Válečníka, který hrozbu představuje.\n'
     'Aplikuje se na začátku kola před skutečnými Útoky, a to bez ohledu na Iniciativu Válečníka. Nikdy nefunguje v boji jeden na jednoho, na každé straně musí být alespoň dva bojující. Cíl nemá Nevýhodu, pokud bojuje přímo s Válečníkem, který jej zastrašil.'),
    ('Impozantní', 43, '2 za kolo', 'Výkřik', 'Rytíř', 'Atletika (SIL) + Kvalita zbroje (KZ) vs. Vůle (CHAR)', RY,
     'Rytíř je na bitevním poli nepřehlédnutelný. Jeho nablýskaná zbroj, doplněná mnohdy štítem s výrazným erbem, z něj dělá impozantního protivníka. Toho si je každý Rytíř velice dobře vědom. Stačí mu pak jen několik hlasitých slov, aby na něho protivníci upřeli svou pozornost, což bývá poslední chybou v jejich životech, neboť Rytíři jen málokdy bojují osamoceně.\n'
     'Rytíř vykřikne své jméno a tituly a zabuší do štítu zbraní a stane se tak pro své protivníky nepřehlédnutelným. Ti z něj nedokáží spustit oči. Kdo neuspěje v hodu proti pasti Atletika (SIL) + Kvalita zbroje (KZ) vs. Vůle (CHAR), nedokáže svou pozornost od Rytíře odpoutat. Pokud bojuje s někým jiným, než s ním, má Nevýhodu (postih −5) k boji. Efekt trvá dle vloženého Adrenalinu (2 body Adrenalinu za kolo).'),
    ('Jasný povel', 44, '2 + X', 'Výkřik', 'Rytíř', '-', RY,
     'Mocný hlas znějící jasně nad bitevní vřavou může dodat bojujícím odvahy. Ti pak tolik nepropadají strachu. Povzbuzeni jasným povelem se mohou vrhnout i na protivníky, před kterými by jinak utekli.\n'
     'Rytíř mocně vykřikne jasným hlasem a povzbudí své spolubojovníky. Ti v daném kole získají bonus +2 k efektu Velení a bonus +3 proti efektu Zastrašení. Bonus proti efektu Zastrašení lze navýšit o 2 za každý další vložený bod Adrenalinu.'),
    ('Jeden úder', 44, '2', 'Trik (Útok)', 'Škola boje s obouruční zbraní, Vícenásobné útoky', '-', OU,
     'Válečník vše vsadí na jeden rozhodující úder, kterým se pokusí protivníka složit aniž by jej zasypával mnoha slabšími ranami.\n'
     'Při správném načasování je možné zvítězit jedním mocným úderem. Válečník se zaměří na jediný Útok a mocným úderem zaútočí na svého protivníka. Pozbude tím všechny ostatní Útočné akce, které by měl v daném kole k dispozici, a přičte si k ÚČ i Zranění +5 za každý takto nevyužitý Útok, který by měl v daném kole k dispozici. V tomto kole má Válečník jen jednu Aktivní obranu.'),
    ('Kavace', 44, '2', 'Technika (Obrana)', 'Škola boje s bodnou zbraní', 'Atletika (SIL) vs. Postřeh (INT)', BO,
     'Ne každý útok je třeba bránit silným krytem. Někdy je pro Válečníka výhodnější použít krátké obkroužení soupeřovy čepele (kavaci), kterou se následně odvede soupeřův úder stranou.\n'
     'Pokud je na Válečníka veden Útok zbraní, může se rozhodnout použít Kavaci jako svou Aktivní obranu. Útočník si standardně hodí na Útok a obránce na Obranu. Ten kdo uspěl v hodu na Útok či Obranu, obdrží rozdíl mezi hody jako bonus ke svému následnému ověřovacímu hodu na Atletika (SIL) vs. Postřeh (INT) útočníka. Kdo v hodu na ověření uspěl, počítá svou Obranu nebo Útok jako Útok proti Základní obraně (ZO) protivníka. Pokud Válečník použije Kavaci proti libovolnému útoku na zbraň, považuje se úspěch v ověřovacím hodu za automatický. Kavaci je možno vzdorovat Kavací bez omezení opakování na obou stranách (poslední vyhrává a útočí proti Základní obraně protivníka).'),
    ('Klamný útok', 44, '1', 'Finta', 'Škola boje s jednoruční zbraní', '-', JE,
     'Válečník je schopen díky dlouhému tréninku naprosto přesně určit dosah svého útoku. Jeho protivníci však tuto schopnost mnohdy nemají. Toho jsou si dobří Válečníci vědomi. Proto někdy vyprovokují soupeře k unáhlené obraně, kterou následně trestají tvrdým úderem.\n'
     'V rámci jednoho útoku Válečník hází na Útok dvakrát. Pokud v prvním Útoku uspěje, cíl není zraněn, ale potenciálně způsobené Zranění se přičte jako bonus k druhému, skutečnému Útoku (k ÚČ).'),
    ('Kolena a lokty', 45, '1', 'Reakce', 'Škola boje drtičů kostí, volnou ruku nebo Zručnost se zbraní', 'Výdrž (ODO) vs. utržené Zranění', DK,
     'Když dojde na Zápas s protivníkem beze zbraně, je Válečník jeho mistrem. Dokáže svého nepřítele zasypat zdrcujícími útoky lokty, nebo koleny.\n'
     'Pokud Válečníka někdo napadne beze zbraně nebo trikem typu Zápas, Válečník si najde volnou skulinku a na svého protivníka zaútočí kolenem či loktem. Jedná se o Útok zblízka bez použití zbraně s bonusem +5 do Zranění. Pokud Válečník zasáhne, jeho protivník si musí hodit na Výdrž (ODO) vs. utržené Zranění. Pokud v záchranném hodu neuspěje, je navíc jeho Útočná akce překažena.'),
    ('Kop', 45, '1', 'Trik (Útok)', 'Škola boje drtičů kostí', '-', DK,
     'Zkušený rváč dokáže kopem překvapit svého nepřítele, který má pocit, že je stále mimo dosah útoku.\n'
     'Jedná se o posílený Útok v boji beze zbraně s dosahem 1–2 sáhy. Válečník získává +5 k Útoku i Zranění. Kop nemusí být možné provést v těžkém terénu. Závisí na úvaze Vypravěče, je-li například možné bezpečně někoho kopnout při souboji na zamrzlé řece.'),
    ('Lehká spoušť', 45, '1', 'Reakce', 'natažená kuše', '-', OB,
     'Je zvykem protřelých Válečníků mít kuši vždy nataženou, když operují za nepřátelskými liniemi.\n'
     'Pokud Válečník drží v ruce kuši připravenou ke střelbě, dokáže výstřel spustit jako reakci na libovolnou situaci v rámci kola, bez ohledu na Iniciativu. Tímto trikem lze i začít boj.'),
    ('Louskáček', 45, '2', 'Trik (Útok)', 'Berserkr, střední či těžkou zbraň', '-', BE,
     'Někdy se vyplatí místo vymýšlení složitého triku vložit do úderu maximální sílu, pomocí které je soupeřův kryt překonán prostou, ale brutální silou.\n'
     'Berserkr vloží do úderu mimořádnou Sílu a nasměruje jej proti slabině v protivníkově zbroji. Pro daný Útok si cíl snižuje bonus za Kvalitu zbroje (KZ) o 7 (nemůže být menší než 0).'),
    ('Mistrovský sek', 45, '4', 'Technika (Útok)', 'Šermíř', 'Atletika (SIL) vs. Postřeh (INT) obránce; Výdrž (ODO) vs. Atletika (SIL) Šermíře', SE,
     'Mistrovský sek je dokonalou souhrou načasování, vzdálenosti a úhlů zbraní… takový sek (lze provést i jako bodnutí) dokáže prolomit každou obranu a překazit každý útok.\n'
     'Šermíř si vybere jeden z mnoha seků a jím překvapí svého nepřítele. Hodí si tedy na ověření Atletika (SIL) vs. Postřeh (INT) obránce. Pokud Šermíř uspěje, je jeho útok veden do Základní obrany (ZO) nepřítele a jestliže zasáhne, způsobí mu navíc krvácení (1k6 životů každé kolo). Obránce si musí hodit i na ověření Výdrž (ODO) vs. Atletika (SIL) Šermíře. A pokud neuspěje ani nyní, Šermíř mu zmrzačí část těla, což se projeví Nevýhodou (postihem −5) na veškeré akce spojené s danou končetinou (Útok, Obrana, gestikulace, apod.). Proti Mistrovskému seku se nelze bránit pomocí triků.'),
    ('Mocný vrh', 45, '2', 'Trik (Útok)', 'střední či těžká vrhací zbraň', '-', OB,
     'Koncentrace, správné zapojení svalů a silný výdech, jsou klíčovými komponenty pro provedení tohoto triku, který se používá k útoku vrhacími zbraněmi.\n'
     'Válečník využije svůj cvik a pečlivý trénink. Vloží do Útoku vrhací zbraní mimořádnou Sílu a získá bonus +3 k Útočnosti i Zranění. Jeho dosah s danou zbraní se zvýší o jeho bonus za Sílu.'),
    ('Mordýřský úder', 46, '2', 'Trik (Útok)', 'Mistr Cesty meče', '-', MM,
     'Je zbytečné tupit ostří meče o kvalitní zbroj. Nedaří-li se Válečníkovi vyhledat slabá místa, obrátí meč, popadne jej za čepel a udeří protivníka příčkou nebo hlavicí, jako by to byl palcát.\n'
     'Válečník vede mocný útok proti svému nepříteli. Obránce utrží ke své Obraně postih, jenž je roven polovině jeho Kvality zbroje (KZ). Pokud Válečník svůj cíl zasáhne, musí si obránce hodit na Výdrž (ODO) vs. Způsobené zranění. Když neuspěje, je na 1 kolo Otřesen a nehraje.'),
    ('Mrtvá váha', 46, '0', 'Reakce', 'Berserkr', 'Atletika (SIL) vs. Reflex (OBR)', BE,
     'Berserkr je stroj na zabíjení, který není tak jednoduché znehybnit. Když už má znehybnění nastat, jsou Berserkři schopni učinit ještě několik krátkých kroků, jimiž masu svého těla nasměrují libovolným směrem. Výsledkem tohoto pohybu může být vyklizení bitevního pole nebo také snaha z posledních sil uškodit nepříteli.\n'
     'Pokud je Berserkr náhle v průběhu souboje znehybněn, omráčen či paralyzován, tak sebou v posledním záchvěvu škubne a spadne konkrétním směrem. Jestliže na vybraném poli stojí nějaká postava, hází si Berserkr na Atletiku (SIL) vs. Reflex (OBR) cíle. Berserkr či obránce získá bonus +3 na Ověření, a to za každou třídu velikosti, o kterou je vyšší než jeho protivník. Pokud Berserkr uspěl, je cíl sražen a držen na místě jeho vahou. Proto cíl získá Nevýhodu (postih −5) na veškeré akce, které vyžadují Soustředění. Každé kolo se však může zavalený pokusit vysvobodit hodem na Atletiku (SIL) vs. X. Výši pasti stanoví Vypravěč dle tabulky Obtížnosti akcí.'),
    ('Nastav hranu', 46, '3', 'Technika (Obrana)', 'Škola boje se štítem', 'Atletika (SIL) vs. Postřeh (INT)', ST,
     'Pokud je Válečník cílem útoku nablízko, nastaví proti seku hranu svého štítu a nechá do ní čepel zakousnout. Jakmile zbraň uvízne, otočí prudce štítem a vykroutí ji útočníkovi z ruky.\n'
     'Pokud je na Válečníka veden Útok sečnou zbraní, může se rozhodnout, že útočníka přechytračí a nechá zaseknout jeho zbraň do hrany svého štítu. Hodí si tedy na ověření Atletika (SIL) vs. Postřeh (INT). Pokud uspěje, zasekne se zbraň do štítu a útočník ji nemůže používat. Pokud neuspěje, může se Válečník stále Aktivně bránit.\n'
     'Pokud útočník chce, může svoji zaseknutou zbraň upustit anebo se ji může pokusit každé kolo vyprostit (dlouhá akce). Aby se mu to však povedlo, musí uspět v hodu na Atletiku (SIL) vs. Atletika (SIL) Válečníka.\n'
     'Tento trik je možné použít jen na protivníky se sečnou zbraní.'),
    ('Naznačený útok', 46, '3', 'Finta (Útok)', 'Škola boje se dvěma zbraněmi', 'Atletika (SIL) vs. Postřeh (INT)', DV,
     'Útočit do odkrytého místa je vždy výhodné. Proto se Válečník vyzbrojený dvěma zbraněmi může pokusit naznačit útok jednou zbraní, aby pak vedl faktický útok do odkrytého místa tou druhou.\n'
     'Válečník naznačí Útok jednou zbraní, a zaútočí druhou. Jedná o téměř simultánní akci oběma zbraněmi, tudíž není možné mu v posledním momentu uhnout. Pokud Válečník uspěje v hodu na ověření Atletiky (SIL) vs. Postřeh (INT) obránce, je cíl oklamán. Válečník tedy může vést Útok druhou zbraní proti jeho Základní obraně (ZO).'),
    ('Obrněný', 47, '1', 'Trik (Obrana), Dodatečný útok', 'Rytíř, střední či těžká zbroj', '-', RY,
     'Mít na sobě kvalitní zbroj přináší řadu výhod. Jednou z nich je i to, že Rytíř nemusí své akce plýtvat na Aktivní obrany. Místo toho, aby zachytil nepřátelský útok zbraní mu nastaví své pláty a v tu samou chvíli provede útok proti odkrytému protivníkovi.\n'
     'Pokud Rytíř v průběhu Obrany proti Útoku zblízka zjistí, že by mu na ubránění stačila Základní obrana (ZO), může v Reakci na to svou Aktivní obranu proměnit v Útok. Jedná se o běžný Útok, ovšem proti Základní obraně (ZO) nepřítele.'),
    ('Odhození', 47, '2', 'Trik (Útok)', 'Mistr Cesty kladiva', 'Atletika (SIL) + Zranění zbraně vs. Reflex (OBR) cíle', MK,
     'Při útoku Válečník vrazí hlavicí svého kladiva plnou silou do nepřítele, který se často odkutálí až několik sáhů daleko a ve většině případů již znovu nevstane.\n'
     'Místo standardního útoku si Válečník hodí na ověření Atletika (SIL) + Zranění zbraně vs. Reflex (OBR) cíle. Pokud obránce neuspěje, je zraněn za tolik životů, kolik činil rozdíl. Navíc je povalen na zem, otřesen (1 kolo nehraje) a odhozen o tolik sáhů, kolik činí Zranění zbraně. V opačném případě Útok neměl žádný účinek.'),
    ('Odklonění štítu', 47, '2 nebo 3', 'Technika (Útok), Dodatečný útok', 'Škola boje se štítem', 'Atletika (SIL) + Kvalita štítu vs. Reflex (OBR)', ST,
     'Válečník vyrazí kupředu a nárazem hrany štítu na štít protivníka jej odkloní a následně zablokuje vlastním štítem, aby mohl vést nerušený útok zbraní.\n'
     'Válečník vyrazí dopředu a zablokuje soupeřovy zbraně tak, aby se jimi nemohl bránit. Hodí si tedy na ověření Atletiky (SIL) + Kvalita štítu vs. Reflex (OBR) obránce. Když uspěje, jsou zbraně protivníka zablokované a již se jimi nemůže v daném kole bránit ani útočit.\n'
     'Válečník si může připlatit 1 bod Adrenalinu navíc a díky tomu může vykonat bonusový Útok, který vede ještě v rámci provedení tohoto triku.'),
    ('Odolání', 47, '2', 'Reakce', 'Rytíř', '-', RY,
     'Mnohdy se může zdát, že je už vše ztraceno. Kdekdo propadá panice, avšak Rytíři vždy zachovávají rozvahu a nepodléhají malomyslnosti ani strachu.\n'
     'Rytíř tímto trikem v průběhu boje získá bonus +5 k hodu na Vůli.'),
    ('Odražení střely', 48, '1', 'Dodatečná obrana', 'Škola boje se štítem', '-', ST,
     'Pokud se Válečník stane cílem střeleckého útoku, může prostě jen vhodně natočit svůj štít tak, aby šíp odrazil proti některému ze svých protivníků.\n'
     'Válečník může štítem odrazit projektil přiměřené velikosti směřující na něj na kteréhokoliv protivníka dle své volby. Tento trik ho nestojí Aktivní obranu.'),
    ('Odražení zbraně', 48, '1', 'Reakce (Obrana)', 'Škola boje s obouruční zbraní', '-', OU,
     'Hbitým sekem proti útočící zbrani protivníka získá Válečník dostatek prostoru pro posílení svého příštího úderu.\n'
     'Válečník se pokusí místo použití Aktivní obrany odrazit zbraň protiútokem. Hodí si na Útok zbraní, kterou k odražení používá. Pokud je jeho Útočné číslo (ÚČ) větší než Útočné číslo (ÚČ) útoku protivníka, tak útok odrazí.\n'
     'Protivník musí hybnost své vychýlené zbraně nejdříve zpracovat a ovládnout, než ji bude mít opět plně pod kontrolou. Proto má na následující Útok nebo Aktivní obranu postih odpovídající rozdílu mezi Útoky, k němuž se přičte i Zranění zbraně, která byla na tuto akci použita.'),
    ('Odstrčení', 48, '1 za každý cíl', 'Zápas (Útok)', 'Škola boje s obouruční zbraní, Zručnost se zbraní', 'Atletika (SIL) vs. Atletika (SIL)', OU,
     'Válečník uchopí zbraň uprostřed a prudce s ní zatlačí vpřed. Odstrčí tím skupinu protivníků zpět.\n'
     'Válečník může s využitím síly odstrčit jednoho nebo více protivníků. Hodí si na ověření Atletiky (SIL) vs. Atletika (SIL) protivníka s nejvyšší hodnotou (Válečník má postih −3 za každou další odstrkovanou osobu). V případě úspěchu jsou cíle odstrčeny nejvýše o tolik sáhů, kolik činí rozdíl mezi ověřovacími hody. Tímto trikem je možné odstrčit až 3 protivníky najednou.'),
    ('Odvalení', 48, '1', 'Reakce', '-', '-', OB,
     'Válečník si v nouzi občas musí vypomoci atletickým kouskem, aby unikl z nejhoršího. Využije energii, která jej poslala k zemi, a odvalí se dále do bezpečí.\n'
     'Tento trik lze použít jako Reakci na schopnost či trik, jehož důsledkem je Válečníkovo sražení na zem nebo odhození. Z koncové pozice, kam byl sražen nebo odhozen, se může v reakci odvalit – tedy vykonat krátký pohyb zakončený vleže.'),
    ('Odzbrojení', 48, '3', 'Technika (Útok)', 'Škola boje se dvěma zbraněmi', 'Atletika (SIL) vs. Reflex (OBR) obránce', DV,
     'V případě, že Válečník překoná soupeřův kryt, může se místo Zranění protivníka pokusit přetočit své zbraně tak, aby na soupeřovu zbraň použil páku. Pomocí páky se v téže akci pokusí protivníka připravit o zbraň.\n'
     'Válečník zaútočí na nepřítele, ale místo toho, aby nepřítele zranil, rozhodne se své převahy využít k tomu, aby ho odzbrojil tím, že zaútočí na jeho zbraň. Jestliže by zasáhl, hodí si na ověření Atletiky (SIL) vs. Reflex (OBR) obránce. Válečník získá na ověření tohoto triku bonus, který je roven výši rozdílu mezi provedeným Útokem a Obranou (nikoliv Zranění). Pokud obránce v hodu na ověření neuspěl, je odzbrojen.'),
    ('Páka na ruku', 48, '2', 'Reakce (Útok), Zápas', 'Škola boje s jednoruční zbraní', 'Atletika (SIL) vs. Reflex (OBR) + rozdíl z Obrany', JE,
     'V případě, že nepřítel zachytil Válečníkův úder, se může Válečník rozhodnout bleskurychle zkrátit vzdálenost a na znehybněnou zbraň protivníka nasadit páku, pomocí které mu ji vytrhne z ruky.\n'
     'Pokud Válečník neúspěšně zaútočil a jeho protivník nevyužil Reakci, může se pomocí tohoto triku pokusit nasadit mu páku na ruku, v níž drží zbraň. Jestliže Válečník uspěje v ověřovacím hodu Atletika (SIL) vs. Reflex (OBR) + rozdíl z Obrany, vytrhne soupeři zbraň.'),
    ('Podmetení', 49, '2', 'Zápas (Útok, Obrana)', 'Šermíř', 'Atletika (SIL) + rozdíl Útoku vs. Reflex (OBR)', SE,
     'Šermíř je schopen využít v boji protivníkovu energii nebo nevýhodnou pozici. Pod krytem se může přiblížit, zakročit protivníka a přehodit ho, případně přeměnit energii protivníkova útoku v jeho pád.\n'
     'Jestliže Šermíř uspěje ve svém Útoku nebo Obraně, může použít tento trik. Hodí si na ověření Atletika (SIL) + rozdíl Útoku vs. Reflex (OBR), k němuž navíc získá bonus odpovídající rozdílu mezi jeho Útokem a Obranou nepřítele (bez vlivu Zranění). Pokud uspěje, je cíl Povalen, zraněn za tolik životů, kolik činil rozdíl v ověřovacím hodu, a 1 kolo nehraje. Pokud Šermíř neuspěje v ověřovacím hodu při útočném použití, byl jeho Útok úspěšný, ale cíl nebyl zraněn a efekt triku jej nijak neovlivní.'),
    ('Povol', 49, '2', 'Technika (Obrana)', 'Škola boje s jednoruční zbraní, obrana pouze zbraní', 'Atletika (SIL) + rozdíl z Obrany vs. Reflex (OBR)', JE,
     'Pro Válečníka není vždy nejvýhodnější zastavovat soupeřovu zbraň. Mnohdy se mu vyplatí nechat ji sklouznout po své čepeli stranou. Soupeřův úder tak nenarazí na odpor, což ho vyvede z rovnováhy, již musí před dalším bojem znovu získat.\n'
     'Po úspěšné Obraně vedené jen zbraní (bez Kvality štítu či sekundární zbraně) nechá Válečník zbraň útočníka sklouznout. Pokud Válečník uspěje v hodu proti pasti Atletika (SIL) + rozdíl z Obrany vs. Reflex (OBR), tak protivník promáchne a ztratí 1 následující akci (Útok nebo Obranu).'),
    ('Proslov před bitvou', 49, '6', 'Soustředění', 'Rytíř', '-', RY,
     'Mocný proslov před rozhodujícím bojem roznítí v srdcích spolubojovníků plamen odhodlání (PPP01 s. 49 uvádí jako ukázku proslov trpaslíka Arnulfa k domu Thorgarimovu).\n'
     'Proslov zabere 1 minutu a po jeho skončení se boj počítá za započatý. Spřátelení spolubojovníci jsou zbaveni všech projevů únavy, které do té doby pociťovali, a dychtí po boji. Válečníkům okamžitě po ukončení Proslovu přibude jeden bod Adrenalinu, všichni zúčastnění získají bonus +3 k Útoku, Obraně a Iniciativě, +5 k Pohyblivosti a po dobu trvání boje mají všichni Válečnickou schopnost Drsňák (u Válečníků se případně tento efekt zdvojnásobí). Hranice smrti se posune o 5 životů (bonus).\n'
     'Efekt trvá po dobu boje, pokud se jedná o velkou a kontinuálně probíhající bitvu, tak klidně i několik hodin. Útok musí začít bezprostředně po ukončení Proslovu.\n'
     'Proslovem je možno motivovat i jen samotnou družinu (či skupinu alespoň o 5 členech včetně Rytíře, maximum není omezeno doslechem – rozjaření bojovníci svým nadšením nakazí ostatní, pokud by neslyšeli, ale byli jasnou součástí bojující skupiny), mělo by se však jednat o významný boj a zároveň výzvu, žádné dobíjení zraněných v táboře lazarů.\n'
     'Trik je možno provést maximálně 1× za den.'),
    ('Protiútok', 50, '3', 'Technika (Obrana), Dodatečný útok', 'Škola boje se dvěma zbraněmi', '-', DV,
     'Při boji se dvěma zbraněmi není vždy nutné k úspěšné obraně používat obě. Dobrý Válečník může občas jednu použít k zastavení útoku, zatímco pomocí druhé vede útok na odkrytého soupeře.\n'
     'Pokud se Válečník rozhodne bránit jen pomocí jedné zbraně, může v případě úspěšné Obrany rovnou zaútočit druhou zbraní a protivník se brání jen Základní obranou (ZO), a to i kdyby měl stále Aktivní obranu.'),
    ('Průbojný hrot', 50, '2', 'Trik (Útok)', 'Škola boje s bodnou zbraní', '-', BO,
     'V případě, že Válečník bojuje se soupeřem navlečeným do zbroje, může se rozhodnout zefektivnit svůj útok tím, že uchopí svou zbraň uprostřed čepele. Následně zvýšenou silou vede hrot proti slabému místu v soupeřově zbroji.\n'
     'Tento Útok ignoruje Kvalitu zbroje (KZ) cíle až do výše 5.'),
    ('Předsek na ruce', 50, '2', 'Technika (Obrana)', 'Škola boje s jednoruční zbraní', 'ÚČ vs. ÚČ', JE,
     'Nejlepším způsobem, jak překazit protivníkův útok, je použít rychlý krátký sek na jeho ruce dřív, než je schopen začít svoji akci. Tím Válečník překazí soupeřův útok a dostane ho do situace nevýhodné pro další akce.\n'
     'Rychlý sek na ruce svírající zbraň, jehož účinky nejsou nijak devastující, ale dokáží přicházející Útok zcela rozhodit. Jedná se o způsob Aktivní obrany. Válečník si hodí na Útok místo Obrany. Pokud je jeho Útok větší než útočníkův, zasáhl svého protivníka dřív a jeho Útok překazil. Při úspěchu je útočník vždy zraněn pouze za 1 život a k následující akci má se zasaženou končetinou Nevýhodu (postih −5). V opačném případě je Válečník zasažen standardním Útokem proti Základní obraně (ZO).'),
    ('Přehmátnutí', 50, '1', 'Trik (Obrana)', 'Zručnost se zbraní, dvě ruce', '-', OB,
     'Pokud se Válečník musí bránit silnému útoku, je práce s úchopem zbraně klíčem k dobrému krytu. Posunutím silnější ruky blíže k těžišti zbraně má větší šanci sek nepřítele zastavit.\n'
     'Tento trik umožní rychlou změnu úchopu. Válečník získá bonus +3 k Obraně zbraně (OZ).'),
    ('Přehození', 50, '2 nebo 3', 'Zápas (Obrana)', 'Škola boje drtičů kostí, volné ruce nebo Zručnost se zbraní', 'Atletika (SIL) vs. Reflex (OBR)', DK,
     'Válečník při útoku protivníka vkročí do jeho tempa a zkrátí vzdálenost. Přitom zachytí jeho útočící ruku a trhnutím jej přehodí přes rameno.\n'
     'Místo Obrany zbraní Válečník nechá energii protivníka působit proti němu a pokusí se jej vhodně přehodit zápasnickou technikou. Nehází si na Obranu ani na ověření proti schopnosti. Místo toho si Válečník vynutí hod na Atletiku (SIL) vs. Reflex (OBR) a pokud cíl neuspěje, je přehozen o tolik sáhů, kolik činí rozdíl hodů. Navíc je Povalen a Otřesen, takže 1 kolo nehraje.\n'
     'Válečník, který je menší, si za každou třídu velikosti může k hodu přičíst bonus +1 za nižší těžiště.\n'
     'Za 3 body Adrenalinu lze tento trik použít i jako Obranu proti jinému triku Zápas. V případě úspěchu je akce protivníka přerušena.'),
    ('Překlopení štítu', 51, '1 nebo 2', 'Technika (Obrana), Dodatečný útok', 'Škola boje se štítem', '-', ST,
     'Válečník se bude primárně bránit svojí zbraní, aby po finálním útoku soupeře štítem odtlačil jeho zbraň i ruce stranou a zaútočil zbraní na takto vytvořené otevření.\n'
     'Pokud se Válečník rozhodne nepoužít štít k Obraně (nezapočte Kvalitu štítu), drží ho jako rezervu. Po úspěšné Obraně jej může použít k odtlačení soupeřových rukou a zaútočí z nekryté strany. Navíc protivníka zaskočí a rozdíl z předchozí úspěšné Obrany si může přičíst jako bonus ke svému příštímu Útoku.\n'
     'Pokud Válečník již nemá k dispozici útočnou akci, použije 2 body Adrenalinu místo 1 a získá Dodatečný útok, který může ihned provést.'),
    ('Překvapivý útok', 51, '1 nebo 2', 'Trik, Dodatečný útok', 'Škola boje se dvěma zbraněmi', '-', DV,
     'Při boji dvěma zbraněmi je většinou jedna primární, tou Válečník útočí, a druhá sekundární, kterou se zpravidla brání. Zkušený Válečník umí ale využívat obě ruce se stejnou zručností. To mu umožňuje překvapivě útočit i sekundární zbraní.\n'
     'Válečník získá Útok navíc. Pokud v tomto kole nepoužil žádné jiné Triky do boje, stojí ho trik pouze 1 bod Adrenalinu místo 2.'),
    ('Přeskupení', 51, '3', 'Výkřik', 'Mistr Cesty strategie', '-', MT,
     'Pokud se strategie skupiny rozpadá, je Válečník schopen svými cílenými pokyny přeskupit spolubojovníky a opět získat výhodu.\n'
     'Válečník prudce vykřikne povel k přeskupení a jeho spolubojovníci znovu obnoví strategii, která se jim rozpadla. Tento trik umožní prodloužit trvání (případně obnovení) strategie, kterou Válečník zvolil na začátku souboje (pokud to není v rozporu s dalšími podmínkami pro udržení strategií). Tímto trikem nelze změnit již zvolenou strategii.'),
    ('Převrácený útok', 51, '1', 'Technika (Útok)', 'Škola boje s jednoruční zbraní', '-', JE,
     'V případě, že byl Válečníkův útok zablokován, může se rozhodnout bleskurychle přetočit zbraň a útok z opačné strany zopakovat.\n'
     'Tento trik pomůže Válečníkovi opakovat hod na Útok, pokud byl neúspěšný (obránce si znovu nehází). Lze použít pouze jednou pro daný Útok.'),
    ('Přišermování', 51, '4', 'Technika, Soustředění', 'Šermíř', '-', SE,
     'Na začátku souboje je nejnebezpečnější moment, kdy se vstupuje do dosahu zbraní, ale dosud nedošlo k jejich střetnutí. Bez vazby totiž nelze protivníka kontrolovat. Vhodně zvolenou směsicí změn střehů, útočných akcí na hranici dosahu a vhodným pozicováním lze protivníka vylákat k útokům se špatným načasováním, které vyjdou naprázdno.\n'
     'Šermíř takto za své Útoky donutí protivníka vyčerpat všechny jeho následující Útočné akce. Pokud má Šermíř Útoků za kolo více, zbydou mu a může je v kole dále využít. Efektu triku se v rámci běžných Útoků nelze nijak vyhnout.'),
    ('Přišlápnutí meče', 52, '2', 'Technika (Útok)', 'Škola boje drtičů kostí', 'Atletika (SIL) vs. Postřeh (INT)', DK,
     'Pokud má protivník střední či těžkou bodnou zbraň, Válečník mu ji srazí k zemi a přišlápne její hrot.\n'
     'Pokud Válečník uspěje v hodu na past Atletika (SIL) vs. Postřeh (INT), má jeho protivník pro toto kolo zablokovanou zbraň. Ztratí všechny Útočné akce, k Obraně nemůže použít přišlápnutou zbraň a navíc má postih −2 k OČ, pokud ji okamžitě nepustí.'),
    ('Rezerva', 52, '3', 'Soustředění', 'Škola boje se dvěma zbraněmi', '-', DV,
     'Mezi nejlepší způsoby, jak vyřadit protivníka, patří jeho oklamání. Dobrý Válečník se může bránit proti několika útokům svou sekundární zbraní, zatímco s primární zbraní vyčkává na nejvhodnější příležitost k útoku. Když ta chvíle nastane, prudce zaútočí a způsobí soupeři hrozivé zranění.\n'
     'Pokud Válečník použije k Útoku pouze svou sekundární zbraň a následně zaútočí svou hlavní zbraní v rámci tohoto triku, za každý předcházející Útok či Obranu proti konkrétnímu protivníkovi (nemusí být úspěšné), které byly vedeny pouze sekundární zbraní, se k Útoku primární zbraní přičte +1 k ÚČ a +2 ke Zranění. Navíc je obránci způsobeno krvácení 1k6 za každou druhou Obranu a Útok použitou v rámci přípravy na tento trik.\n'
     'Tyto akce se s danou akcí sčítají pouze během 1 kola.\n'
     'PŘÍKLAD: Na Válečníka Rolanda před jeho tahem byly vedeny dva útoky. Těmto útokům se bránil pouze sekundární zbraní. Ve svém tahu prvním útokem zaútočil pouze sekundární zbraní. Pro druhý útok využil trik Rezerva, do kterého se mu tudíž započítá bonus +3 k Útoku a +6 ke Zranění. V případě zásahu tímto trikem navíc cíl krvácí, a je tak zraňován za 1k6 životů každé následující kolo až do ošetření.'),
    ('Rychlá zbraň', 52, '2 + X', 'Reakce (Útok)', 'Škola boje s jednoruční zbraní', '-', JE,
     'S jednoruční zbraní může Válečník jednoduše změnit směr a charakter útoku i v případě, že se jedná o pádnější zbraně.\n'
     'Pokud Válečník zaútočí pomocí triku, ale jeho protivník odpoví pro něj nevýhodným způsobem (použije jiný trik, uspěje v hodu na Obranu či ověření), dokáže rychle změnit techniku a Útok dokončit jako jiný trik. Tím zruší i jakoukoliv Reakci svého soupeře.\n'
     'Celková cena triku je 2 body Adrenalinu + X, kde X se rovná ceně za následující trik.'),
    ('Řez na ruce', 52, '2', 'Reakce', 'Šermíř', '-', SE,
     'Šermíři čerpají výhody v boji z mistrovského ovládání svých zbraní. Boj tělo na tělo pro ně není příliš výhodný, a proto se mu snaží všemožně vyhnout.\n'
     'Pokud se má Šermíř stát cílem triku typu Zápas, Schopnosti, nebo Dovednosti, která předpokládá boj beze zbraně, může si k hodu na past při vzdorování této akci přičíst Útočnost své hlavní zbraně. Pokud uspěje a překazí protivníkovu akci, způsobí mu ztrátu životů ve výši rozdílu Ověřovacího hodu + Zranění zbraně.'),
    ('Série útoků', 53, '1 za každý Útok', 'Trik (Útok), Dodatečný útok', 'Škola boje se dvěma zbraněmi', '-', DV,
     'Každý zkušený Válečník si cvičí sekvence rychle navazujících útoků. Díky nim je schopen zasypat soupeře smrští útoků, které soupeři zabrání v rozvíjení vlastních akcí.\n'
     'Válečník zasype svého protivníka sérií Útoků. Za každý bod Adrenalinu, který za trik zaplatí, získá 1 Dodatečný útok. Zároveň však utrží postih ke všem Útokům, který je roven jejich počtu.'),
    ('Skočit do rány', 53, '2', 'Reakce (Obrana)', 'Rytíř', '-', RY,
     'Sebeobětování není pro správné Rytíře jen prázdný pojem. Jejich výcvik jim umožní v případě nutnosti krýt své spolubojovníky vlastním tělem. Útoky, které by je mohly vážně ohrozit, tak mohou neškodně odskočit od Rytířovy zbroje.\n'
     'Rytíř se v dosahu Krátkého pohybu vrhne do rány určené někomu ze spolubojovníků a sám se stane terčem Útoku zbraní, střelby, či kouzla. Pokud se Rytíř vrhá do Útoku, čelí mu Základní obranou (ZO), pokud do kouzla, může si od způsobeného poškození odečíst Kvalitu zbroje (KZ).\n'
     'Rytíř může navázat reakčním trikem Úkryt na efekt kouzla.'),
    ('Skok', 53, '1', 'Pohyb', 'Berserkr', '-', BE,
     'Správný Berserkr je schopen se v mžiku vybičovat k bleskurychlému útoku i na protivníka, který se nachází mimo jeho dosah.\n'
     'Mocný skok do dálky, nebo i výšky, umožní zaútočit na vzdálený cíl nebo například na citlivé místo velkého monstra. Akce se počítá jako krátký pohyb a je-li následován Útokem, má +1 k Útoku a +3 ke Zranění.\n'
     'Pokud je součástí následujícího Útoku i trik, má Válečník +2 k SIL při ověřovacím hodu na past.'),
    ('Sražení koněm', 53, '3', 'Krátký pohyb', 'Škola boje na koni', 'Atletika (SIL) vs. Reflex (OBR)', KO,
     'Jízda je největším postrachem pěšáků. Po jejím nájezdu končí spousta z nich na zemi pod koňskými kopyty.\n'
     'Válečník najede koněm a srazí pěšáka. Jedná se o hod Atletika (SIL) vs. Reflex (OBR). Válečník získá k hodu bonus +3 za každý rozdíl velikosti mezi obráncem a koněm. Při neúspěchu je obránce odhozen o tolik sáhů, kolik je rozdíl hodu na ověření. Za stejnou hodnotu je navíc i zraněn.\n'
     'Tento trik lze použít jen na bytosti, které jsou stejné velikosti nebo menší než je jízdní zvíře Válečníka. Lze jím srazit i jiného jezdce a jeho zvíře. V takovém případě se jedná o hod Atletika (SIL) vs. Jízda na zvířeti (OBR).'),
    ('Sražení z koně', 54, '2 nebo 3', 'Zápas', 'Škola boje na koni', 'Atletika (SIL) vs. Jízda na zvířeti (OBR)', KO,
     'Pokud se Válečník dostane v boji do blízkosti jezdce, může zachytit jeho zbraň a následně ho pomocí páky strhnout ze hřbetu zvířete. Ke stejnému účelu může použít i svou zbraň. Zvláště zkušení Válečníci se mohou pokusit vymrštit za jezdce.\n'
     'Tímto trikem může Válečník srazit jezdce z koně. Válečník si hodí na ověření Atletika (SIL) vs. Jízda na zvířeti (OBR). Pokud obránce neuspěje, je sražen z koně a povalen na zem. Jestliže se o sražení pokouší ze země, má Nevýhodu (postih −5).\n'
     'Tento trik lze využít také pro naskočení do sedla za jezdce. V takovém případě trik stojí 3 body Adrenalinu. V případě, že naskakuje ze země, hází s Nevýhodou (postihem −5).\n'
     'Pokud Válečník vyskočí za něj, může na to cíl reagovat nejdříve v dalším kole. Oba mohou pouze zápasit anebo bojovat lehkou krátkou zbraní s Nevýhodou (postihem −5).\n'
     'Takto lze naskočit i ke spřátelenému jezdci. Válečník si pak hází prostý hod na Atletiku (SIL) vs. 15. V případě, že naskakuje ze země, hází s Nevýhodou (postihem −5).\n'
     'Pokud Válečník neuspěje při pokusu naskočení do sedla, je povalen na zem.'),
    ('Svěšený hrot', 54, '2', 'Technika (Útok), Dodatečný útok', 'Škola boje s bodnou zbraní', 'Atletika (SIL) vs. Reflex (OBR)', BO,
     'Ne každý útok zasáhne protivníka. I na tuto eventualitu je ale správný Válečník připraven. V okamžiku, kdy jeho útok nezasáhne cíl a on promáchne, může okamžitě vyrazit rukama vzhůru. Ve chvíli, kdy se dostane k soupeřovu krytu, svěsí hrot, čímž kryt obejde a bodem zasahuje vytyčený cíl.\n'
     'Pokud Válečník nezasáhl cíl, může se rozhodnout použít tento trik, kterým obejde kryt soupeře. Hodí si tedy na ověření Atletiky (SIL) vs. Reflex (OBR) obránce. Jestliže uspěje, může si dodatečně započítat bonus do ÚČ, který je roven rozdílu mezi ověřovacími hody. Následně se znovu vyhodnotí výsledek Útoku.'),
    ('Tlačený řez', 54, '2 nebo 3', 'Zápas', 'sečná zbraň, alespoň 2 Útoky v daném kole', 'Atletika (SIL) + Zranění vs. Výdrž (ODO)', OB,
     'Po úspěšném zásahu mečem je nejlepší pokračovat vpřed tlačeným řezem, který nepříteli způsobí hlubokou ránu, kvůli níž ztratí spoustu krve.\n'
     'Pokud Válečník svým Útokem zasáhne cíl, může místo dalšího Útoku v daném kole využít Tlačený řez. Tímto se zvedne Zranění prvního útoku o k6 + Zranění zbraně.\n'
     'Jestliže Válečník utratí 3 body Adrenalinu (místo 2) a překoná hodem na Atletiku (SIL) + Zranění zbraně vs. Výdrž (ODO) cíle, uštědří obránci 1 stupeň Krvácení (ztráta 1k6 životů za kolo).'),
    ('Tržná rána', 54, '3', 'Trik (Útok)', 'Škola boje s bodnou zbraní', '-', BO,
     'Každý z Válečníků ví, že na těle je mnoho míst, která, byť po nehlubokém zranění, začnou silně krvácet. Při útocích na tato místa vymění Válečník sílu úderu za jeho rychlost.\n'
     'Válečník způsobí rychlým seknutím hrotu mělké, ale krvácející Zranění za 1 život. To sice není závažné, ale silně krvácí a působí zasaženému obtíže při boji (kluzké ruce na jílci zbraně, krev v očích apod.).\n'
     'Důsledkem je Nevýhoda (postih −5) k boji. Zasažený má navíc 1. stupeň krvácivého Zranění (každé kolo včetně prvního navíc ztrácí 1k6 životů). Tržnou ránu lze vyléčit pomocí dovednosti První pomoc, či případně pomocí léčivých lektvarů a kouzel.'),
    ('Tři výkřiky', 55, '1', 'Výkřik', 'Berserkr', 'Atletika (SIL) vs. Vůle (CHAR)', BE,
     'Tři výkřiky se dělí takto: před, během a po. Křičíme při různých příležitostech, hlas je znamením života a nese energii. Ve strategii ve velkém křičíme na začátku bitvy, pak když se vrháme do útoku a nakonec křičíme na oslavu vítězství. To jsou tři výkřiky. V boji muže proti muži Válečník vykřikne podle situace tak, aby protivníka vyrušil. Vykřikne, aby oslabil jeho útok nebo vykřikne, jako by útočil, a pak jej tne.\n'
     'Berserkr vykřikne a provede ověřovací hod Atletika (SIL) vs. Vůle (CHAR) cíle. Pokud Berserkr uspěje, získá protivník postih ke své následující akci. Ten je roven rozdílu hodů.'),
    ('Úder hranou štítu', 55, '2', 'Technika (Útok)', 'Škola boje se štítem', 'Atletika (SIL) + Kvalita štítu vs. Reflex (OBR)', ST,
     'Válečník naznačí útok zbraní, aby protivníka vylákal do vhodné pozice, a pak nečekaně vší silou udeří hranou štítu na jeho zbraň a vyrazí mu ji z ruky.\n'
     'Místo útoku se může Válečník pokusit o úder hranou štítu. Pokud uspěje v ověřovacím hodu Atletika (SIL) + Kvalita štítu vs. Reflex (OBR), je cíli zbraň vyražena z ruky. Pokud rozdíl překoná součet Útočnosti a Zranění zbraně, je zničena.'),
    ('Úder „Oheň a kameny“', 55, '2', 'Trik (Útok)', 'sečná či drtivá zbraň', 'Atletika (SIL) vs. Reflex (OBR)', OB,
     'Tento trik vyžaduje stovky hodin tréninku, aby Válečník nedal nepříteli znát, co se chystá udělat. Nečekaně vyrazí vpřed a plnou silou zaútočí na zbraň nepřítele, kterou mu přitom vyrazí z rukou. Opravdoví mistři pak dokáží zbraň soupeře svým zásahem i zničit.\n'
     'Válečník zaútočí překvapivým Útokem na zbraň protivníka. Pokud uspěje, není protivník zraněn, ale Zranění je převedeno jako bonus k ověřovacímu hodu na Atletiku (SIL) vs. Reflex (OBR) cíle. Pokud cíl neuspěje, je mu zbraň vyražena z rukou k nohám. Když neuspěje o více, než je součet Útočnosti a Zranění zbraně, je zbraň zničena.'),
    ('Úder pěstí', 55, '1 nebo 2', 'Zápas (Útok), Dodatečný útok', 'Škola boje drtičů kostí', 'Atletika (SIL) + udělené Zranění vs. Výdrž (ODO)', DK,
     'Válečník někdy dokáže působit dojmem, že má více než jen dvě ruce. Ať už se věnuje čemukoliv, nějaký ten prostor pro rychlou ránu pěstí se vždycky najde.\n'
     'Úder pěstí je Dodatečný útok, který může Válečník vykonat, i pokud svírá zbraň, těžký předmět nebo pokud blokuje nějaký cíl jiným trikem Školy drtičů kostí. Válečník ruku na chvíli uvolní, prudce zaútočí na cíl ve svém těsném dosahu (1 sáh) a vrátí se do původní pozice, aniž by to ovlivnilo jeho jiné akce.\n'
     'Pokud si Válečník dá záležet (cena 2 body Adrenalinu), uštědří protivníkovi opravdu pořádnou ránu a následuje hod proti pasti Atletika (SIL) + udělené Zranění vs. Výdrž (ODO). Při úspěchu je cíl Otřesen, 1 kolo nehraje.'),
    ('Úder ramenem', 55, '2 nebo 3', 'Zápas', 'Škola boje drtičů kostí', 'Atletika (SIL) vs. Reflex (OBR)', DK,
     'Úder tělem znamená přiblížit se k nepříteli mezerou v jeho krytu, nejlépe, pokud má ruce zvednuté vysoko nad hlavou. Válečník udeří do hrudi nepřítele ramenem a srazí ho na zem.\n'
     'Válečník si vyčíhá vhodný moment, prudce vyrazí k nepříteli a vrazí do něj tělem. Hodí si na ověření Atletika (SIL) vs. Reflex (OBR). Pokud Válečník chce, může utratit 1 bod Adrenalinu navíc a před sražením pak vykoná Krátký pohyb a jeho délku v sázích si připočte jako bonus k ověřovacímu hodu. V opačném případě se musí cíl nacházet na sousedním poli.\n'
     'V případě úspěchu je nepřítel zraněn a odhozen o tolik sáhů a životů, jaký je rozdíl mezi hody na ověření. Pokud Válečník neuspěje, je sám odhozen a zraněn. Tuto schopnost je možné použít maximálně na bytosti do velikosti D (včetně). Pokud je za cílem pevná překážka, je zraněn za dvojnásobek životů.'),
    ('Úder štítem', 56, '2', 'Trik (Obrana)', 'Škola boje se štítem', '-', ST,
     'Nejlepší obrana je útok. Pokud Válečník nechce čekat, až se protivník projeví, jakmile postřehne přicházející útok, vyrazí štítem tvrdě vpřed. Jelikož jeho protivník právě provádí krok, nezvládne již uhnout blížícímu se štítu, kterým do něj Válečník tvrdě narazí.\n'
     'Válečník se brání Útoku svojí Aktivní obranou. Pokud v Obraně uspěje, útočník utrží Zranění ve výši rozdílu mezi Obranou a Útokem. Pokud tímto trikem Válečník čelí triku Zápas, může si k ověřovacímu hodu přičíst kvalitu štítu a svůj bonus za Sílu (SIL).'),
    ('Úder tělem', 56, '2', 'Trik (Obrana)', 'Rytíř, těžká zbroj', '-', RY,
     'V případě, že Rytíř čelí pokusu o Zápas, je pro něj mnohdy výhodnější prudce vyrazit vpřed a nechat protivníka narazit do plátů, které ho chrání.\n'
     'Pokud Rytíř čelí triku nebo schopnosti, která spadá do kategorie Zápas či Povalení, přičte si k hodu Kvalitu zbroje (KZ). Jestliže protivník neuspěje, je zraněn o rozdíl mezi hody.'),
    ('Úhyb', 56, '1', 'Trik (Obrana)', 'Škola boje s bodnou zbraní', '-', BO,
     'Každý Válečník si uvědomuje, že boj není statický, ale doprovází ho plynulé zkracování a prodlužování vzdálenosti na hranici dosahu. Vhodným použitím této techniky docílí Válečník toho, že bude muset protivník svůj útok zopakovat, aniž by byl prvním útokem ohrožen.\n'
     'Válečník vhodným manévrováním může donutit útočníka obnovit započatý Útok. Útočník si musí znovu hodit na Útok (hod na obranu zůstává stejný). Pro oba se jedná o tutéž akci.'),
    ('Úchop za konec', 56, '2', 'Trik (Útok)', 'Mistr Cesty hole a kopí', '-', MH,
     'Válečník chytí svou dřevcovou zbraň na samém konci, použije dlouhý krok a trupem se vytočí proti svému cíli, což prodlouží jeho dosah a zasáhne i protivníky, kteří mají pocit, že jsou pořád ještě v bezpečné vzdálenosti.\n'
     'Tímto trikem lze vést útok kontaktní zbraní s bonusem k dosahu 2 sáhy. Zároveň útočník získá bonus +5 k Útočnému číslu (ÚČ). Pokud se protivník ubrání, nemůže Válečník bez Zručnosti se zbraní danou zbraň použít k žádné bezprostředně následující akci (Útok/Obrana).'),
    ('Úkrok', 56, '2', 'Trik (Obrana)', '-', '-', OB,
     'Dokonalé periferní vidění umožňující přehled na bojišti a perfektní práce nohou dovolí Válečníkovi vyhýbat se úderům nepřátel, i pokud se v boji soustředí na úplně jiné aktivity.\n'
     'Jestliže se Válečník věnuje nebojové akci (například pití lektvaru) a je veden Útok proti jeho Základní obraně (ZO), ztíží útočníkovi situaci Úkrokem do strany, aniž by přerušil současnou aktivitu, a přičte si ke své Základní obraně (ZO) hod k6. Tento trik je možné využít 1× za kolo. Nelze ho použít při překvapení, proti neviditelnému či skrytému protivníkovi.'),
    ('Úkryt', 57, '1', 'Reakce (Obrana)', 'Škola boje se štítem', '-', ST,
     'Štít může poskytnout skvělou ochranu při výbuchu bomby nebo například proti blížícímu se Kuželu mrazu kouzelníka.\n'
     'Pokud Válečník čelí plošnému efektu kouzla, schopnosti nebo například výbuchu ďábelského vynálezu nějakého šíleného Alchymisty, dokáže se instinktivně co nejlépe zakrýt svým štítem a snížit utržené Zranění na polovinu.'),
    ('Úskok', 57, '2', 'Reakce', 'Berserkr, lehkou zbroj', '-', BE,
     'Když Válečník nemá svůj den a musí uhýbat padající mrtvole horského obra nebo pařátu mocného draka, je někdy lepší vrhnout se stranou a uskočit z dosahu.\n'
     'Pokud je na Berserkra vedena libovolná akce vyžadující ověření na Reflex, může uskočit a překulit se zpět na nohy. K hodu na Reflex si připočítá bonus +5 a vykoná v průběhu Krátký pohyb libovolným směrem (přesune se i v případě neúspěchu).'),
    ('Útok shora', 57, '1', 'Trik (Útok)', 'Škola boje na koni, kontaktní zbraň', '-', KO,
     'Jezdec v sedle má díky své výšce převahu a dobře dosáhne protivníkovi na hlavu, krk či trup, aby jej snadno vážně zranil.\n'
     'Válečník využije výškové převahy nad pěšákem pro Útok s větší razancí nebo na zranitelná místa. Získává bonus +5 ke Zranění kontaktní zbraní.'),
    ('Útok z prázdnoty', 57, '1', 'Reakce', 'Škola boje s obouruční zbraní', '-', OU,
     'Pro tento trik je klíčové dokonalé čtení úmyslu protivníka. Ve chvíli, kdy Válečník zachytí signál, že se jeho nepřítel chystá k útoku, vyrazí rychle vpřed, aby zasáhl dříve.\n'
     'Válečník s výhodou delší zbraně, jenž se má stát cílem Útoku soupeře, automaticky vyrazí k prudkému a přímému Útoku a zasáhne nepřítele dříve, než se dostane k provedení vlastní akce. Takto zaskočený protivník se musí místo Útoku nejprve bránit. Pak teprve dojde na jeho vlastní Útočnou akci.'),
    ('Útok ze zápěstí', 57, '3', 'Dodatečný útok', 'Škola boje s jednoruční zbraní', '-', JE,
     'Jednoruční zbraně mají výhodu ve své lehkosti. Jednoduché přetočení zápěstím umožňuje Válečníkovi zasadit bleskurychlý úder na nekrytou část protivníka.\n'
     'Válečník dokáže rychlým protočením zbraně v zápěstí vést po prvním Útoku ihned Útok další. Ten je s postihem −3 k Útočnosti veden proti Základní obraně (ZO) obránce.'),
    ('Válečný pokřik', 57, '1', 'Výkřik', '-', '-', OB,
     'Silné zařvání, které nepřátelům zastaví srdce a zažehne oheň odhodlání v srdcích spolubojovníků.\n'
     'Válečník vykřikne Válečný pokřik a všichni, kdo bojují na jeho straně v Boji tváří v tvář, se cítí strženi Bojovým nadšením a mají bonus +1 k Útoku. Trik je možné použít na začátku kola, před všemi akcemi bez ohledu na Iniciativu. Trik ovlivní jen inteligentní tvory.'),
    ('Variabilita', 58, '1 za akci', 'Trik do boje', 'Šermíř', '-', SE,
     'Útok lze snadno proměnit v obranu, stejně tak jako obranu lze proměnit v útok. Toho si jsou Šermíři velice dobře vědomi. Pomocí svého tréninku jsou schopni proměňovat útočné akce za obranné (a naopak) tak, jak je to pro ně v danou chvíli nejvýhodnější.\n'
     'Šermíř někdy musí improvizovat. Tímto trikem může zaměňovat své Aktivní obrany a Útočné akce dle libosti. Trik lze použít tolikrát za kolo, kolik volných akcí má Šermíř k dispozici. Pokud Šermíř navíc ovládá schopnost Rutina, může první výměnu udělat bez použití Adrenalinu.\n'
     'PŘÍKLAD: Má-li Šermíř 3 běžné Útoky za kolo, má k tomu k dispozici stejný počet Aktivních obran; pokud však v rámci kola třikrát zaútočí a jen jednou se brání, místo dvou teoreticky zbývajících Obran může za 2 body Adrenalinu ještě dvakrát zaútočit. Podobně se může vzdát všech Útoků a za 3 body Adrenalinu (2 body Adrenalinu s Rutinou) se 6× aktivně bránit.'),
    ('Vrácení oštěpu', 58, '1', 'Trik (Obrana)', 'volná ruka', 'OČ vs. ÚČ', OB,
     'Válečník dokáže zachytit zbraň, která míří proti němu, a z otočky ji vyslat proti svým nepřátelům. Jedná se o velice překvapivý útok, kterým své soupeře naprosto zaskočí.\n'
     'Pokud se Válečník ubrání Útoku střední či těžkou vrhací zbraní a má alespoň jednu ruku volnou, lze tento trik využít. Zachytí letící zbraň a ihned s ní zaútočí. Jedná se o standardní vrhací Útok, pro který nelze použít žádné triky.'),
    ('Vypuštěný útok', 58, '1', 'Trik (Útok)', 'Škola boje s jednoruční zbraní', '-', JE,
     'Dlouholeté používání zbraní umožňuje Válečníkovi se s nimi zcela sžít. V některých případech je pro něj výhodné dát na začátku úderu zbrani rychlost a pak nechat samovolně působit její váhu bez toho, aby byla brzděna příliš silným úchopem.\n'
     'Válečník při Útoku změní úchop zbraně a získá +3 ke Zranění.'),
    ('Vzteklý sek', 58, '3 nebo 2', 'Technika (Obrana, Útok)', '-', 'ÚČ vs. ÚČ', OB,
     'Válečník zaujme levý střeh se zbraní na pravém rameni. Pokud vycítí, že se protivník chystá k útoku, vyrazí prudce vpřed a zároveň zaútočí šikmým úderem. Díky tomu, že při seku stáhne ruce do strany, zasahuje protivníka a zároveň si poskytne skvělé krytí proti případným útokům soupeře. Lze takto i bodnout.\n'
     'Místo klasické Obrany Válečník vlastní zbraní srazí zbraň útočícího protivníka a stejným pohybem jej zasáhne. Místo Aktivní obrany Válečník zaplatí 3 body Adrenalinu a hodí si na Útok. Ten z protivníků, který má vyšší Útok (nepočítáme Zranění zbraně), vyhrává a zasáhne svého protivníka (zranění dle klasických pravidel). Pokud mají oba útočníci stejný Útok, je výsledkem remíza a nikdo není zraněn. Pokud protivník využil Fintu, je útok automaticky úspěšně veden proti jeho ZO.\n'
     'Vzteklý sek lze použít také jako druh standardního Útoku. V takovém případě trik stojí pouze 2 body Adrenalinu a obránce se brání běžnou Obranou. Proti tomuto Útoku nelze použít žádný trik (či schopnost) pro Obranu či Reakci, s výjimkou Vzteklého seku a Kavace.'),
    ('Vztyk', 59, '1', 'Pohyb nebo Reakce', '-', '-', OB,
     'Pokud se Válečník ocitne na zemi, může využít svůj trénink a pomocí tohoto triku se hbitě dostat na nohy a třeba i zadržet útok protivníka.\n'
     'Pokud Válečník leží, může ve svém tahu použít tento trik. Válečník se okamžitě postaví, přijde ale o jednu svoji Aktivní obranu. Tento trik lze využít také jako Reakci, pokud čelí Útoku vleže (vyhodnotí se Útok na ležící postavu, ale na konci útoku Válečník stojí). Pokud Válečník použil trik Odvalení, lze tímto trikem v rámci téže akce navázat na Odvalení.'),
    ('Zastrašení', 59, '3', 'Výkřik', 'Berserkr', 'Atletika (SIL) vs. Vůle (CHAR)', BE,
     'Četné jizvy, pletence svalů a smrtící pohled dělají z Berserkra hrozivého tvora. Ten si je této skutečnosti vědom a může ji využít k zastrašení protivníků. Ti pak ztrácejí vůli k boji s Berserkrem, což ho mnohdy příliš netěší. I u Berserkra ovšem někdy zvítězí rozum, který může našeptávat, že boj není vždy tím nejlepším řešením situace.\n'
     'Používá se mechanika Zastrašení (vč. případných bonusů za další schopnosti, ale Berserkr nemusí tuto schopnost ovládat). Pokud trik použije hned po Útoku, kterým zranil protivníka, může si ubraný počet životů přičíst jako bonus ke svému ověřovacímu hodu. Pokud Zastrašení vyjde, dávají se všichni na útěk a nechtějí s Berserkrem bojovat. Pokud musí, mají k boji Nevýhodu (postih −5).\n'
     'Pokud Berserkr zastrašuje skupinu či má na své straně spojence, získá každá strana bonus +2 k Ověřovacímu hodu za každého jednotlivce.'),
    ('Zatvrzení', 59, '1', 'Reakce (Obrana)', 'Berserkr', '-', BE,
     'Četné rány, kterým musel Berserkr během svého života čelit, ho naučily, jak se s nimi vypořádat. Ne každé ráně je totiž schopen se vyhnout, a proto si Berserkři osvojili techniku, jak jejich ničivé následky omezit.\n'
     'Je-li Berserkr nucen čelit Útoku jen Základní obranou (ZO), může zpevnit své tělo, vhodně se natočit a přičíst si k Obraně bonus za Sílu, případně i za Odolnost, pokud ovládá schopnost Otloukánek.'),
    ('Zdrcující úder', 59, '2', 'Technika (Útok)', 'Škola boje s obouruční zbraní, cíl útoku má štít', 'Atletika (SIL) + Zranění vs. Výdrž (ODO)', OU,
     'Díky síle obou rukou, podpořené správnou prací nohou, je Válečník schopen provést tak silný útok na obráncův štít, že zmrzačí ruku, kterou jej obránce drží.\n'
     'Válečník provede zdrcující Útok na štít nepřítele a tím mu vyřadí ruku, v níž štít třímá. Provede tedy Útok, a pokud zasáhne, hodí si na ověření Atletiky (SIL) + způsobené Zranění vs. Výdrž (ODO) obránce. Když obránce neuspěje, má zmrzačenou ruku se štítem, což se projeví Nevýhodou (postihem −5) na veškeré akce spojené s danou končetinou. Zmrzačení trvá až do ošetření pomocí dovednosti První pomoc nebo odstranění léčivými kouzly či lektvary.'),
    ('Zdvojení', 60, '1', 'Trik (Útok)', 'Škola boje s bodnou zbraní', '-', BO,
     'Žádný Válečník neočekává, že přemůže soupeře jedním úderem. Proto, bez ohledu na výsledek prvního útoku, může okamžitě přejít do dalšího návazného úderu.\n'
     'Okamžité obnovení Útoku. Obránce si musí znovu hodit na Obranu, jedná se pro oba o tutéž akci. Lze použít pouze jednou pro daný Útok.'),
    ('Změna směru', 60, '2', 'Reakce, Dodatečný útok', 'Škola boje s obouruční zbraní, dvouruční úchop nebo dvě zbraně', '-', OU,
     'Jestliže Válečník útočí na pravou stranu svého nepřítele a zaznamená, že se jeho nepřítel zvládne vykrýt, střihne rukama, čímž změní směr seku, aby zaútočil na nekrytou stranu.\n'
     'Pokud Válečník po svém hodu na Útok vidí, že by nezasáhnul, může Útok nedokončit, změnit jeho směr a znovu zaútočit v rámci téže Útočné akce. Útočník znovu hází na svůj Útok a Obránce se musí znovu aktivně bránit (jeho první Aktivní obrana byla spotřebována).\n'
     'Tento trik je možno použít jen 1× za kolo.'),
    ('Znejistění', 60, 'počet kol × počet cílů', 'Soustředění', 'Šermíř', 'Atletika (SIL) vs. Vůle (CHAR)', SE,
     'Šermíř v průběhu boje s protivníkem dává najevo svou nadřazenost. Rychlými pohyby obchází jeho zbraň, hraje si s ním a budí v něm pocit, že nemá šanci.\n'
     'Pokud Šermíř uspěje v ověřovacím hodu Atletika (SIL) vs. Vůle (CHAR), dostane protivník postih do ÚČ a OČ ve výši rozdílu hodů pro následující kola dle dodaného Adrenalinu. Pokud se protivníkovo ÚČ nebo OČ dostane pod 0, je zastrašen a uteče z boje, případně se vzdá.\n'
     'Efekt Znejistění trvá dle dodaného Adrenalinu, nebo dokud Šermíř není znejistěným zraněn. Tuto schopnost může použít i na více protivníků najednou.'),
    ('Železné pracky', 60, '3', 'Zápas (Útok)', 'Berserkr', 'Atletika (SIL) vs. Atletika (SIL)', BE,
     'Ne nadarmo se říká, že není nic horšího, než se dostat do pracek opravdového Berserkra. Většina z nich je schopna zaútočit na krk nepřítele a stiskem svých svalnatých rukou ho začít škrtit. To, že přitom mohou inkasovat nějaký úder, patří k chabé dani za jejich smrtící sevření.\n'
     'Berserkr zaútočí na krk protivníka. Na začátku této akce získá protivník dodatečný útok proti ZO Berserkra. Pokud Berserkr uspěje v hodu proti pasti Atletika (SIL) vs. Atletika (SIL), začne protivníka škrtit a způsobí mu Zranění ve výši hodu 1k6 + bonus za SIL. V následujících kolech se výše Zranění řídí mechanikou Udušení (viz PPZ H 1.1, strana 39).\n'
     'Protivník se na začátku každého kola může pokusit vyprostit, pokud uspěje v ověřovacím hodu Atletika (SIL) protivníka vs. Atletika (SIL) Berserkra.'),
]


def main() -> None:
    doc = json.loads(DOC.read_text(encoding='utf-8'))
    items = []
    groups: dict[str, list[str]] = {}
    for name, page, adr, use, req, chk, grp, text in T:
        items.append({
            'id': slug(name), 'nazev': name, 'strana': page,
            'parametry': {'adrenalin': adr, 'pouziti': use, 'vyzaduje': req, 'overeni': chk},
            'popis': text, 'typ': 'trik', 'skupiny': [grp],
        })
        groups.setdefault(grp, []).append(name)
    ids = [i['id'] for i in items]
    assert len(ids) == len(set(ids)), 'duplicitní id triku'
    doc['skupiny_triku'] = {'_zdroj': 's. 39–40, Seznam pokročilých bojových triků', **groups}
    doc['polozky'] = sorted(items, key=lambda i: i['nazev'])
    doc['_statistika'] = {'pocet_triku': len(items)}
    DOC.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(items)} triků → {DOC.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
