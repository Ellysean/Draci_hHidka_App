# Zdroj pro 7a+.2 – specializace PYROMANT z PPP03 (s. 33–52 PDF, v knize s. 143–162).
# Přepsáno z Draci_hlidka_PPP_03_Alchymista.pdf (27. 9. 2026). Generuje docs/ppp03_pyromant.json:
#   python3 tools/ppp03_pyromant_src.py && python3 tools/build-alchemy.py
import json

SKILL = {'Mechanika': 'mechanika', 'Pyromancie': 'pyromancie', 'Výroba svitků': 'vyroba_svitku'}

def R(id, name, ability, mana, materials, bases, time, diff, use, desc, rules, *, kind='predmet', dur=None, life=None,
      skill=None, tags=None, page='', extra=None, manaText=None, materialsText=None, diffText=None, yieldQty=None, weapon=None,
      launch=None, weightLb=None):
    x = {
        'id': id, 'name': name, 'latinName': None, 'tier': 'ability', 'source': 'PPP03', 'kind': kind,
        'mana': {'base': mana, **({'extraMax': extra} if extra else {}), **({'text': manaText} if manaText else {})},
        'materials': materials, 'bases': bases, 'craftTime': {'text': time, 'workshopRequired': False},
        'difficulty': {'value': diff, **({'text': diffText or f'{diff} ({skill})'} if (skill or diffText) else {})},
        'durationText': dur, 'lifespanText': life, 'frequencyText': None, 'useText': use, 'check': None,
        'requires': {'ability': ability}, 'requiresMoment': None, 'tags': tags or [], 'description': desc, 'rules': rules, 'pages': page,
    }
    if materialsText: x['materialsText'] = materialsText
    if skill: x['craftSkill'] = SKILL[skill]
    if yieldQty: x['yieldQty'] = yieldQty
    if weapon: x['weapon'] = weapon
    if launch: x['launch'] = launch
    if weightLb is not None: x['weightLb'] = weightLb
    return x

B = lambda text, *alts, **kw: {'text': text, 'match': [list(a) if isinstance(a, tuple) else [a] for a in alts], **kw}
X = lambda base, mx: f'{base} + X (přídavná mana, max {mx})'
NS = 'Nestabilní substance'
MP = 'Magický předmět'
ZELEZO = B('železo', 'zelez', 'kov')
HORLAVA = B('hořlavá látka / černý prach', 'cerny prach', 'horlav', 'olej', 'strelny prach')

GAS = ' Nádobka se rozbije a plyn uniká 5 kol (v uzavřeném prostoru až dvojnásobek, ve větru jen 2 kola), účinek v okruhu 10 sáhů.'
recipes = [
 # ------------------------------------------------ Kapsulační gemy (s. 144–145)
 R('kapsulacni_gem', 'Kapsulační gem', 'kapsulacni_gemy', 30, None, [B('drahokam', 'drahokam', 'krystal', 'rubin', 'safir', 'smaragd', 'diamant', 'ametyst', 'opal')],
   '1 směna', 15, 'baterie / sesílání kouzel', 'dle druhu drahokamu',
   'Runami uzamčená mana v drahokamu – „baterie“ pro konstrukty a výrobky, nebo kouzlo aktivovatelné opakovaně, dokud je v gemu mana (dotykem nebo přes sapérské vybavení). Ověření Výroba svitků (OBR) vs. 15 (baterie), s kouzlem + obtížnost kouzla a pomoc kouzelníka. Kapacita podle drahokamu (běžně 100 bodů u kamene velikosti oka). Přelití many trvá 1 kolo za 10 bodů. Pyromant gem dobíjí manou.',
   extra=100, manaText=X(30, '100 – podle drahokamu'), materialsText='-', skill='Výroba svitků', diffText='15 (baterie) + obtížnost kouzla (Výroba svitků)', tags=['Kapsulační gemy', MP], page='144–145'),
 # ------------------------------------------------ Konstrukty (s. 145–149)
 R('univerzalni_nosic', 'Univerzální nosič', 'konstrukty', 5, 30, [B('kovové pruty', 'prut', 'tyc', 'zelez')],
   '1 den', 15, 'podvěšení speciálních zbraní', 'kovový nástavec',
   'Úchyt pro jeden předmět přizpůsobený nosiči (Hmoždíř, Chrlič, Hákovnice, Polní dělo…) na konstruktu, určitém místě nebo na končetině či zádech člena družiny (po dohodě s PJ). Montáž na konstrukt je vylepšení „Univerzální nosič“.',
   tags=['Konstrukty'], page='149'),
 # ------------------------------------------------ Mistr nestabilních substancí (s. 149–151)
 R('chrlic', 'Chrlič', 'mistr_nestabilnich_substanci', 70, 130, [B('kovová trubice', 'trubic', 'trubk'), B('skleněná nádoba', 'sklen', 'lahev', 'flakon')],
   '1 den', 16, 'chrlení nebezpečných materiálů', 'kovová trubice s hadicí a zásobníkem',
   'Plamenomet / mrazomet: náplň (olej nebo plyn či tekutina Nestabilních substancí) se naředí gelem do zásobníku na zádech. Stisk spouště odčerpá 1/10 zásobníku; kdo neuspěje v hodu Reflex (OBR) vs. 18, je zasažen. Dosah 15 sáhů, dobře se míří. Olej: plameny, 1k10 životů, po 3 kolech v plamenech cíl hoří; plnění 10 litrů oleje + 5 many. Plyn: kužel do 10 sáhů, rozptýlí se za polovinu doby. Zásah Pyromanta za víc než 15 životů = exploze 1k10 × zbylé salvy. Výměna zásobníku 6 kol. Jde na Univerzální nosič.',
   skill='Pyromancie', tags=[NS, 'Mistr nestabilních substancí'], page='150–151'),
 R('dusivy_plyn', 'Dusivý plyn', 'mistr_nestabilnich_substanci', 20, 20, [B('uhlí', 'uhl')], '1 směna', 15, 'odpařování', 'černá ampule',
   'Každý, kdo se nadechne, se od dalšího kola dusí (mechanika Utonutí a udušení, H). Stačí vypít vodu či jinou tekutinu – oběti to většinou nevědí a během minut upadnou do bezvědomí a zemřou.' + GAS,
   kind='ostatni', dur='5 kol', tags=[NS, 'Mistr nestabilních substancí'], page='151'),
 R('leptavy_plyn', 'Leptavý plyn', 'mistr_nestabilnich_substanci', 40, 20, [B('ocet', 'ocet', 'octa')], '1 směna', 18, 'odpařování', 'hnědá ampule',
   'Každé kolo 1k10 životů a trvale −1 k základu Charismatu (poleptání a zohavení kůže).' + GAS,
   kind='ostatni', tags=[NS, 'Mistr nestabilních substancí'], page='151'),
 R('mrazivy_plyn', 'Mrazivý plyn', 'mistr_nestabilnich_substanci', 40, 20, [B('led', 'led')], '1 směna', 18, 'odpařování', 'modrá ampule',
   'Srazí teplotu na −100 stupňů: každé kolo 1k10 životů; kdo je zasažen déle než 3 kola, zmrzne (pod Mez vyřazení, bez akcí) a není-li do 10 kol vysvobozen, umírá. Krusta vydrží až směnu. Materiály zkřehnou a praskají.' + GAS,
   kind='ostatni', tags=[NS, 'Mistr nestabilních substancí'], page='151'),
 R('slzny_plyn', 'Slzný plyn', 'mistr_nestabilnich_substanci', 0, 20, [B('moč', 'moc')], '1 směna', 12, 'odpalování', 'oranžová ampule',
   'Od dalšího kola zasažený nevidí a nesoustředí se: Nevýhoda (−5) k Sesílání kouzel a všemu, co chce přesnost. Působí 1k6 směn, neutralizace 5 kol proplachování očí a nosu vodou.' + GAS,
   kind='ostatni', manaText='-', tags=[NS, 'Mistr nestabilních substancí'], page='151'),
 # ------------------------------------------------ Palné zbraně (s. 151–154)
 R('kule', 'Kule', 'palne_zbrane', 0, 20, [B('kovové slitky', 'slitk', 'olov', 'zelez')], '1 směna / 10 kulí', 12, 'střelba', 'železná kulička',
   'Munice – každá zbraň má jinou ráži (kule do pistole nejdou do hákovnice a naopak). Zapiš ráži do poznámky. Výroba dá 10 kulí (2 suroviny za kus), 10 kulí váží 0,3 lb.',
   kind='ostatni', manaText='-', materialsText='2 za každou (20 / 10 kulí)', yieldQty=10, weightLb=0.03, tags=['Palné zbraně', 'Munice'], page='152'),
 R('naboj', 'Náboj', 'palne_zbrane', 0, 10, [B('kovové slitky', 'slitk', 'olov', 'zelez'), B('černý prach (na 100 nábojů)', 'cerny prach', 'strelny prach', optional=True)],
   '1 směna / 5 nábojů', 14, 'střelba', 'nábojnice',
   'Kovové „válečky“ s prachem i kulkou – rychlejší nabíjení, munice do turétu. Výroba dá 5 nábojů (2 suroviny za kus); jedna dávka černého prachu vystačí na 100 nábojů. 10 nábojů váží 0,5 lb.',
   kind='ostatni', manaText='-', materialsText='2 za každý (10 / 5 nábojů)', yieldQty=5, weightLb=0.05, tags=['Palné zbraně', 'Munice'], page='152'),
 R('cerny_prach', 'Černý prach', 'palne_zbrane', 0, 30, [B('uhlí', 'uhl')], '1 hodina (4 směny)', 15, 'střelba', 'flakon či váček černého prachu',
   'Čistší obdoba vznětlivého prachu, určený pro palné zbraně: běžná zbraň spotřebuje 1/10 dávky na výstřel, polní dělo celou dávku. Extrémně hořlavý, při natlakování exploduje.',
   kind='ostatni', manaText='-', tags=['Palné zbraně', NS], page='152'),
 R('pistole', 'Pistole', 'palne_zbrane', 40, 100, [ZELEZO], '1 den', 15, 'střelba', 'menší jednoranná pistole',
   'Nejzákladnější jednoranná palná zbraň, dá se nosit skrytě. Všechny palné zbraně potřebují manu; síla na použití nemá vliv.',
   skill='Mechanika', weightLb=1, tags=['Palné zbraně', 'Zbraň'], page='153',
   weapon={'range': '25 / 50', 'attack': 10, 'damage': 10, 'defense': 1, 'rate': 'jednoranná', 'ammo': 'kule do pistole', 'reload': '3 kola', 'hands': 1}),
 R('rucnice', 'Ručnice', 'palne_zbrane', 60, 130, [ZELEZO], '1 den', 18, 'střelba', 'menší puška zapřená pod loktem',
   'Na střední vzdálenost; nasekané olovo či střepiny se rozletí ve výseči asi 20° a zasáhnou vše v cestě.',
   skill='Mechanika', weightLb=3, tags=['Palné zbraně', 'Zbraň'], page='153',
   weapon={'range': '50 / 80', 'attack': 14, 'damage': 15, 'defense': 3, 'rate': 'jednoranná', 'ammo': 'kule do ručnice (nasekané olovo)', 'reload': '6 kol', 'hands': 2}),
 R('hakovnice', 'Hákovnice', 'palne_zbrane', 80, 150, [ZELEZO], '3 dny', 20, 'střelba', 'dlouhá puška s hákem pod hlavní',
   'Velmi přesná puška s ničivou silou a silným zpětným rázem – při střelbě musí být zapřená / zaháknutá o pevnou překážku. Jde na Univerzální nosič.',
   skill='Mechanika', weightLb=7, tags=['Palné zbraně', 'Zbraň'], page='153',
   weapon={'range': '150 / 250', 'attack': 19, 'damage': 20, 'defense': 1, 'rate': 'jednoranná', 'ammo': 'kule do hákovnice', 'reload': '8 kol', 'hands': 2}),
 R('polni_delo', 'Polní dělo', 'palne_zbrane', 150, 250, [ZELEZO], 'týden', 22, 'střelba', 'menší dělo tlačené na dvou kolech',
   'K ničení pevných překážek (stěny, stromy); na jednotlivce se nestřílí – zásah by byl náhoda. Spotřebuje celou dávku černého prachu. Jde na Univerzální nosič.',
   skill='Mechanika', weightLb=100, tags=['Palné zbraně', 'Zbraň'], page='154',
   weapon={'range': '300 / 400', 'attack': 50, 'damage': 45, 'defense': 0, 'rate': 'jednoranná', 'ammo': 'kule do polního děla', 'reload': '30 kol', 'hands': 2}),
 R('turet', 'Turét', 'palne_zbrane', 200, 400, [B('ozubená kola a řetěz', 'ozuben', 'retez', 'kolec')], '1 den', 20, 'automatická střelba', 'trojnožka s hlavní',
   'Automatická otočná věž: na pohyb do 300 sáhů vystřelí dávku 10 střel na až 10 cílů. Cíl se vyhne hodem Reflex (OBR) vs. 18 (−5 za každých 100 sáhů), jinak 1k6 životů mínus ½ kvality zbroje. Pojme 500 nábojů (50 kol), přebití 2 kola, rozložení i složení 5 kol.',
   skill='Mechanika', weightLb=20, tags=['Palné zbraně'], page='154'),
 # ------------------------------------------------ Práce s energií (s. 154–156)
 R('hraci_skrinka', 'Hrací skříňka', 'prace_s_energii', 30, 30, [B('kovová destička a klika', 'desti', 'klik')], '1 den', 15, 'otevírání zámků', 'hrací skříňka s klikou',
   'Melodie odemyká i zamyká běžné nemagické zámky – 5 kol točit klikou. Každé použití odčerpá 5 bodů přídavné many; bez ní ztrácí moc.',
   extra=100, manaText=X(30, 100), dur='1 rok', tags=['Práce s energií', MP], page='154'),
 R('kostka_stesti', 'Kostka štěstí', 'prace_s_energii', 40, 5, [B('dřevěná kostka', 'kostk')], '1 den', 17, 'přehození vlastností', 'malá dřevěná herní kostka k6',
   'Kdo hodí, náhodně si přehází všechny vlastnosti (i vzhled). Odčerpá 1 bod přídavné many za 5 kol; efekt skončí vyčerpáním many, stiskem dvou protilehlých stěn nebo vzdálením na víc než 20 sáhů.',
   extra=50, manaText=X(40, 50), dur='1 rok', tags=['Práce s energií', MP], page='154–155'),
 R('paralyzer', 'Paralyzér', 'prace_s_energii', 50, 50, [B('kovový drát', 'drat')], '1 den', 17, 'omráčení a paralýza', 'obušek s kovovým hrotem',
   'Útočnost 3, zásah sám nezraňuje. Zasažený hází Výdrž (ODO) vs. 10 – při neúspěchu je 1k6 kol ochromen a utrpí 1k6 životů. Každé použití odčerpá 5 bodů přídavné many.',
   extra=50, manaText=X(50, 50), tags=['Práce s energií', MP], page='155'),
 R('plast_promen', 'Plášť proměn', 'prace_s_energii', 50, 100, [B('spona', 'spon'), B('plátno dle velikosti nositele', 'platn', 'latk', 'plast')], '3 dny', 15, 'změna vzhledu oděvu', 'plátno měnící tvar',
   'Mění barvu, tvar, střih i vzhled materiálu (ne materiál) podle přání nositele. Za každou směnu použití odčerpá 5 bodů přídavné many. (V knize je u Použití omylem „replikace předmětů“.)',
   extra=200, manaText=X(50, 200), tags=['Práce s energií', MP], page='156'),
 R('replikator', 'Replikátor', 'prace_s_energii', 100, 200, [B('živí pavouci', 'pavouk', 'pavouc'), B('čočka', 'cock')], '1 den', 18, 'replikace předmětů', 'kovová krabička',
   'Věrná, ale velmi lehká kopie viditelné podoby předmětu (povrch jako břidlice): do 30 coulů za směnu (20 bodů přídavné many), do sáhu za hodinu (50 bodů), největší velikost B (200 bodů). Vnitřek (stránky knihy…) se nekopíruje.',
   extra=400, manaText=X(100, 400), tags=['Práce s energií', MP], page='155'),
 # ------------------------------------------------ Sapérský výcvik (s. 156–158)
 R('odpalovaci_krystal', 'Odpalovací krystal (bomba s krystalem)', 'sapersky_vycvik', 20, 30, [B('2 krystaly', 'krystal', 'kristal', qty=2), B('bomba', 'bomb')],
   '1 směna', 15, 'exploze', 'bomba s krystalem',
   'Krystal vložený do bomby se odpálí rozbitím druhého krystalu, který má Pyromant u sebe; exploduje i při přerušení spojení (dosah 200 sáhů, přeruší ho i silná kamenná či kovová stěna). Bombu z vlastní výroby vyber ručně nebo označ jako zajištěnou.',
   dur='1 rok', tags=['Sapérský výcvik', NS], page='156'),
 R('detektor_pohybu', 'Detektor pohybu', 'sapersky_vycvik', 20, 40, [B('2× skleněná čočka', 'cock', qty=2), B('krystaly', 'krystal', 'kristal')], '2 směny', 15, 'detekce pohybu', 'dvě malé skleněné „oči“',
   'Dvě „oči“ proti sobě: přerušení přímé viditelnosti spustí impulz (výbušnina, světlice, bzučák po měděném drátku). Dohled 100 sáhů, vidí v mlze, vánici i v noci; jedno oko samo hlídá jakýkoliv pohyb v zorném poli.',
   skill='Mechanika', tags=['Sapérský výcvik'], page='157'),
 R('detektor_vybusnin', 'Detektor výbušnin', 'sapersky_vycvik', 30, 80, [B('kovová obruč', 'obruc'), B('krystal', 'krystal', 'kristal')], '1 den', 15, 'detekce výbušnin', 'tyč s kovovou obručí na konci',
   'Po aktivaci odčerpá 1 bod přídavné many za kolo a spolehlivě najde třaskaviny do 20 sáhů (chrčení se zrychluje s blízkostí a velikostí nálože).',
   extra=100, manaText=X(30, 100), skill='Mechanika', tags=['Sapérský výcvik'], page='156–157'),
 R('detonator', 'Detonátor', 'sapersky_vycvik', 10, 20, [B('dlouhý drát', 'drat')], '1 směna', 15, 'exploze', 'krabička s namotaným drátem',
   'Skříňka s kličkou odpálí na dálku jakoukoliv trhavinu i výrobky Pyromanta. Drát 100 sáhů; lze používat opakovaně, další klubko drátu stojí 10 surovin a 1 směnu.',
   materialsText='20 (+ 10 za další klubko drátu)', skill='Mechanika', tags=['Sapérský výcvik'], page='157–158'),
 R('naslapna_past', 'Nášlapná past', 'sapersky_vycvik', 20, 30, [B('železné střepy', 'strep', 'zelez')], '1 hodina', 13, 'past', 'kovová placka',
   'Aktivuje se sešlápnutím nebo uvolněním tlaku: exploze silou bomby, 3k6 životů. Zranění nad 12 je navíc Krvácivé, při 18 obvykle amputace končetiny. Najít ji jde Postřehem (INT) vs. výsledek tvého hodu Mechaniky při nastražení.',
   skill='Mechanika', tags=['Sapérský výcvik'], page='158'),
 # ------------------------------------------------ Střely a rachejtle (s. 158–161)
 R('hmozdir', 'Hmoždíř', 'strely_a_rachejtle', 0, 45, [B('kovová trubice', 'trubic', 'trubk')], '1 směna', 10, 'odpalování', 'kovová trubice',
   'Odolná trubka s výsuvnými nožkami pro úhel střelby rachejtlí, světlic a ohňostrojů. Příprava k palbě 3 kola. Jde na Univerzální nosič.',
   manaText='-', skill='Mechanika', tags=['Střely a rachejtle'], page='158–159'),
 R('lehka_rachejtle', 'Lehká rachejtle', 'strely_a_rachejtle', 25, 60, [HORLAVA], '1 hodina (4 směny)', 13, 'odpalování', 'asi 30 coulů dlouhá trubička se špičatou hlavicí',
   'Na pozemní cíle do 500 sáhů z ukotveného hmoždíře, nástavce či palné zbraně. Hlavice zápalná nebo výbušná (volba při výrobě).',
   skill='Pyromancie', tags=['Střely a rachejtle'], page='159',
   launch={'dc': 13, 'time': 'odpálení 2 kola, let 100 sáhů za kolo', 'range': 'do 500 sáhů',
           'fire': 'kruh o poloměru 5 sáhů: 2k6 životů / sáh, stejné zranění dalších 5 kol, zapálí hořlavé věci',
           'blast': 'epicentrum 6k6 životů, −1k6 za každý sáh od epicentra, kráter asi 1 sáh'}),
 R('tezka_rachejtle', 'Těžká rachejtle', 'strely_a_rachejtle', 100, 200, [HORLAVA], '2 hodiny (8 směn)', 16, 'odpalování', 'půl sáhu dlouhá trubice se špičatou hlavicí',
   'K naprosté destrukci cíle (opevnění, ležení) do 1000 sáhů, jen z pečlivě ukotveného hmoždíře. Hlavice zápalná nebo výbušná.',
   skill='Pyromancie', tags=['Střely a rachejtle'], page='161',
   launch={'dc': 15, 'time': 'odpálení 4 kola, let 100 sáhů za kolo', 'range': 'do 1000 sáhů',
           'fire': 'kruh o poloměru 10 sáhů: 4k6 životů / sáh, stejné zranění dalších 10 kol, zapálí hořlavé věci',
           'blast': 'epicentrum 10k6 životů, −1k6 za každý sáh, kráter o poloměru 3 sáhy'}),
 R('rizena_strela', 'Řízená střela', 'strely_a_rachejtle', 200, 200, [B('zrcadlo', 'zrcad'), B('2× krystal', 'krystal', 'kristal', qty=2)], '3 hodiny (12 směn)', 18, 'odpalování', 'asi půlmetrová trubice s křidélky',
   'Pyromant v zrcadle s řídícím krystalem vidí, kam míří hrot, a naklápěním ho řídí. Odpaluje se ze země opřená o improvizovanou rampu, zápalnou šňůrou.',
   skill='Pyromancie', tags=['Střely a rachejtle'], page='159–160',
   launch={'dc': 15, 'dcMoving': 18, 'time': 'let 200 sáhů za kolo, nejvýš 7 kol',
           'fire': 'kruh o poloměru 10 sáhů: 5k6 životů / sáh, stejné zranění dalších 10 kol, zapálí hořlavé věci',
           'blast': 'epicentrum 10k6 životů, −1k6 za každý sáh, kráter dva sáhy široký'}),
 R('strela_navadena', 'Střela naváděná na terč', 'strely_a_rachejtle', 120, 200, [B('3× optická čočka', 'cock', qty=3), B('zrcátko', 'zrcad')], '2 hodiny (8 směn)', 17, 'odpalování', 'asi půlmetrová trubice s křidélky',
   'Letí po paprsku ze zaměřovacího dalekohledu se třemi čočkami – potřebuje sluneční či jiné silné světlo. Ztratí-li paprsek, letí dál po trajektorii (po pádu exploduje).',
   skill='Pyromancie', tags=['Střely a rachejtle'], page='160',
   launch={'dc': 12, 'dcMoving': 17, 'time': 'let 200 sáhů za kolo, nejvýš 5 kol',
           'fire': 'kruh o poloměru 10 sáhů: 4k6 životů / sáh, stejné zranění dalších 10 kol, zapálí hořlavé věci',
           'blast': 'epicentrum 10k6 životů, −1k6 za každý sáh, kráter dva sáhy široký'}),
 R('ohnostroj', 'Ohňostroj', 'strely_a_rachejtle', 5, 15, [B('hořlavá látka', 'horlav', 'olej', 'cerny prach')], '1 směna', 11, 'odpalování', 'drobná trubička',
   'Květiny, déšť jisker… barvu a efekty určí Pyromant. Odpaluje se z trubiček na zemi, zápalnou šňůrou lze řetězit.',
   manaText='5 za každý', dur='1 kolo', skill='Pyromancie', tags=['Střely a rachejtle'], page='159'),
 R('svetlice', 'Světlice', 'strely_a_rachejtle', 5, 30, [B('hořlavá látka', 'horlav', 'olej', 'cerny prach'), B('plátno', 'platn', 'latk')], '1 směna', 11, 'odpalování', 'drobná trubička',
   'Z hmoždíře, nástavce či palné zbraně vyletí asi 150 sáhů vysoko a ozáří 300 sáhů jako za dne (vidět na desítky mil), svítí asi 10 kol. Barvu světla zvolí Pyromant.',
   dur='10 kol', skill='Pyromancie', tags=['Střely a rachejtle'], page='160'),
]

abilities = [
 {'id': 'kapsulacni_gemy', 'rules': 'Runami uzamkne manu v drahokamu (běžně do 100 bodů u kamene velikosti oka) – baterie pro konstrukty a výrobky, nebo místo svitku kouzlo aktivovatelné opakovaně, dokud je v gemu mana (Výroba svitků, s pomocí kouzelníka). Přelití many 1 kolo za 10 bodů; gem jde dobíjet. Recept Kapsulační gem.'},
 {'id': 'konstrukty', 'rules': 'Mechaničtí pomocníci z těla (materiál a velikost), srdce (palivo) a mozku (typ ovládání) plus vylepšení; výroba v dílně s výhní, hod Mechanika (OBR) vs. součet obtížností. Neúspěch = šrot, polovina many a surovin jde znovu použít na další konstrukt. Vylepšení později: zaplatí novou součást a hod Mechaniky vs. celková obtížnost. Nosnost podle ODO, jednu běžnou zbraň, na Univerzální nosič hmoždíř, chrlič, palné zbraně.'},
 {'id': 'mistr_nestabilnich_substanci', 'rules': 'Charisma natrvalo −5 (jizvy, popáleniny). Rezistence proti Zraněním ohněm, mrazem a kyselinou – taková Zranění jsou jen poloviční. Recepty Chrlič, Dusivý, Leptavý, Mrazivý a Slzný plyn.'},
 {'id': 'palne_zbrane', 'rules': 'Výroba palných zbraní, kulí, nábojů a černého prachu. Všechny palné zbraně potřebují manu; síla na použití vliv nemá, hmotnost se počítá do naložení. Vyrobenou zbraň jde přidat mezi zbraně postavy (Výrobky → Do zbraní).'},
 {'id': 'prace_s_energii', 'rules': 'Při výrobě předmětu s přídavnou manou smí vložit až dvojnásobek přídavné many. Umí dobíjet přídavnou manu magických předmětů. Recepty Hrací skříňka, Kostka štěstí, Paralyzér, Plášť proměn, Replikátor.'},
 {'id': 'sapersky_vycvik', 'rules': 'Výhoda +5 ke všem hodům na nalezení, zneškodnění a nastražení pasti. Vyrobit, zamaskovat nebo deaktivovat past: Mechanika (OBR) vs. X (PJ podle složitosti); najít ji jde Postřehem (INT) vs. výsledek hodu Pyromanta. Recepty Odpalovací krystal, Detektor pohybu, Detektor výbušnin, Detonátor, Nášlapná past.'},
 {'id': 'strely_a_rachejtle', 'rules': 'Rachejtle se odpalují z ukotveného hmoždíře po balistické křivce, střely jsou naváděné. Zásah = hod Pyromancie (OBR) vs. obtížnost rachejtle / střely, jinak mine. Hlavice zápalná nebo výbušná (jiné – mrazivé, jedové… – po dohodě s PJ). Recepty Hmoždíř, Lehká a Těžká rachejtle, Řízená střela, Střela naváděná na terč, Ohňostroj, Světlice.'},
 {'id': 'transmutace_kovu', 'rules': 'Proměna kovu asi za deset minut: množství na velký prsten či amulet (3 stříbrné hroty šípů); ostří dýky je asi 5× náročnější. Ušlechtilejší kov se na méně ušlechtilý mění snáz. Stejně vznikají speciální slitiny nasycením povrchu (Měsíční, Západní, Půlnoční, Stříbrná).'},
]

# Konstrukty (s. 146–148). Hodnoty: dc obtížnost, h hodiny, m mana, s suroviny.
SIZES = ['A', 'B', 'C']
def row(*v): return dict(zip(SIZES, v))
body = {
 'Kámen':     row(dict(dc=9, h=8, m=120, s=20, uc=5, oc=10, hp=50), dict(dc=9, h=10, m=230, s=30, uc=6, oc=11, hp=55), dict(dc=9, h=12, m=340, s=40, uc=7, oc=11, hp=60)),
 'Keramika':  row(dict(dc=8, h=6, m=130, s=20, uc=6, oc=6, hp=20), dict(dc=8, h=8, m=240, s=30, uc=7, oc=7, hp=25), dict(dc=8, h=10, m=350, s=40, uc=8, oc=8, hp=30)),
 'Kov':       row(dict(dc=11, h=10, m=140, s=30, uc=8, oc=7, hp=30), dict(dc=11, h=12, m=250, s=40, uc=9, oc=8, hp=35), dict(dc=11, h=14, m=360, s=50, uc=10, oc=9, hp=40)),
 'Kombinace': row(dict(dc=12, h=16, m=150, s=50, uc=8, oc=12, hp=45), dict(dc=12, h=18, m=265, s=65, uc=9, oc=13, hp=50), dict(dc=12, h=20, m=380, s=80, uc=10, oc=14, hp=55)),
}
upgrades = [
 {'id': 'letat', 'name': 'Schopnost létat', 'by': row(dict(dc=3, h=3, m=30, s=0), dict(dc=3, h=4, m=35, s=0), dict(dc=3, h=5, m=40, s=0))},
 {'id': 'plavat', 'name': 'Schopnost plavat', 'by': row(dict(dc=1, h=1, m=10, s=0), dict(dc=1, h=2, m=15, s=0), dict(dc=1, h=3, m=45, s=0))},
 {'id': 'zesilena', 'name': 'Zesílená konstrukce', 'note': 'OČ +5, životy +½', 'by': row(dict(dc=5, h=2, m=30, s=100), dict(dc=5, h=4, m=35, s=130), dict(dc=5, h=5, m=40, s=150))},
 {'id': 'nosic', 'name': 'Univerzální nosič', 'note': 'jen uchycení – nosič se vyrábí zvlášť (spotřebuje se 1 vyrobený)', 'by': row(dict(dc=2, h=1, m=0, s=20), dict(dc=2, h=1, m=0, s=40), dict(dc=2, h=1, m=0, s=60))},
 {'id': 'chrlit', 'name': 'Schopnost chrlit energii', 'note': 'chrlí palivo ze srdce; chrlení odčerpá 1/20 základní nádrže', 'by': row(dict(dc=5, h=5, m=100, s=0), dict(dc=5, h=6, m=120, s=0), dict(dc=5, h=7, m=140, s=0))},
 {'id': 'rychlost', 'name': 'Dvojnásobná rychlost', 'by': row(dict(dc=3, h=1, m=30, s=0), dict(dc=3, h=2, m=40, s=0), dict(dc=3, h=3, m=50, s=0))},
]
fuel = [
 {'id': 'olej', 'name': 'Olej', 'unit': 'l', 'by': row(dict(s=200, dc=3, cap=5), dict(s=240, dc=3, cap=8), dict(s=270, dc=3, cap=11)), 'tank': dict(dc=5, s=100)},
 {'id': 'mana', 'name': 'Mana', 'unit': 'many', 'by': row(dict(s=150, dc=5, cap=40), dict(s=180, dc=5, cap=60), dict(s=210, dc=5, cap=80)), 'tank': dict(dc=5, s=80),
  'note': 'u velikosti A chybí v knize číslo obtížnosti – appka počítá +5 jako u B a C'},
 {'id': 'gem', 'name': 'Kapsulační gem', 'unit': 'many', 'by': row(dict(s=100, dc=5, cap=40), dict(s=100, dc=5, cap=60), dict(s=100, dc=5, cap=80)), 'tank': dict(dc=5, s=50)},
]
brains = [
 {'type': 1, 'name': 'Mob', 'dc': 2, 'm': 10, 's': 5, 'text': 'pevně naprogramovaný – drží se jednoduché instrukce, ovládat nejde'},
 {'type': 2, 'name': 'Servant', 'dc': 4, 'm': 30, 's': 5, 'text': 'poslouchá hlas či vzhled tvůrce nebo držitele určitého předmětu; chápe asi jako tříleté dítě'},
 {'type': 3, 'name': 'Remotron', 'dc': 6, 'm': 70, 's': 5, 'text': 'propojený krystaly – tvůrce ho vidí jeho „očima“, slyší „ušima“ a řídí na dálku'},
 {'type': 4, 'name': 'Artific', 'dc': 8, 'm': 80, 's': 5, 'text': 'sám se učí a kreativně plní úkoly, stále oddaný tvůrci'},
]
metals = ['Měď', 'Bronz', 'Železo', 'Stříbro', 'Zlato']
trans = {'Měď': [None, 50, 80, 200, 400], 'Bronz': [35, None, 60, 150, 300], 'Železo': [20, 30, None, 100, 200],
         'Stříbro': [10, 20, 25, None, 100], 'Zlato': [5, 10, 15, 20, None]}
alloys = [
 {'id': 'mesicni', 'name': 'Měsíční (chrom)', 'mana': 80, 'text': 'lesklý stříbřitý povrch odolný korozi i kyselinám; zbraň je o polovinu lehčí'},
 {'id': 'zapadni', 'name': 'Západní (uhlík)', 'mana': 100, 'text': 'narudlý lesk; nástroje a zbraně kvalitnější – Zranění +2'},
 {'id': 'pulnocni', 'name': 'Půlnoční (dusík)', 'mana': 90, 'text': 'temně modrý, odolný živlům (nezkřehne, odolá žáru); proti poslům živlů +2 k ÚČ i OČ'},
 {'id': 'stribrny', 'name': 'Stříbrný (stříbro)', 'mana': 90, 'text': 'stříbro účinkuje na citlivé tvory; citliví nepřátelé do 10 sáhů mají −2 ke všem akcím'},
]
out = {
 '_zdroj': 'Draci_hlidka_PPP_03_Alchymista.pdf s. 33–52 (kniha s. 143–162), specializace Pyromant, přepsáno 27. 9. 2026',
 '_poznamka': 'U Plášť proměn je v knize Použití „replikace předmětů“ (zřejmě překlep). Tabulka paliva: u many velikosti A chybí číslo obtížnosti (appka +5). Tabulka vylepšení: Schopnost plavat velikost C „+45 many“ (A 10, B 15) – přepsáno doslova.',
 'recipes': recipes,
 'abilities': abilities,
 'constructs': {'sizes': SIZES, 'body': body, 'upgrades': upgrades, 'fuel': fuel, 'brains': brains, 'maxTanks': 2, 'daysPerTank': 10, 'pages': '146–149'},
 'transmutation': {'metals': metals, 'table': trans, 'alloys': alloys, 'pages': '162'},
}
json.dump(out, open('docs/ppp03_pyromant.json', 'w'), ensure_ascii=False, indent=1)
print(len(recipes), 'receptů,', len(abilities), 'schopností')
