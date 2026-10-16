# Zdroj pro 7a+.1 – specializace MEDICUS z PPP03 (s. 17–32 PDF, v knize s. 127–142).
# Přepsáno z Draci_hlidka_PPP_03_Alchymista.pdf (27. 9. 2026). Generuje docs/ppp03_medicus.json:
#   python3 tools/ppp03_medicus_src.py && python3 tools/build-alchemy.py
import json

def R(id, name, req, mana, materials, bases, time, diff, use, desc, rules, *, latin=None, kind='predmet', dur=None, life=None,
      freq=None, check=None, ws=None, skill=None, tags=None, page='', drinkable=None, danger=None):
    x = {
        'id': id, 'name': name, 'latinName': latin, 'tier': 'specialization' if 'specialization' in req else 'ability', 'source': 'PPP03',
        'kind': kind, 'mana': {'base': mana}, 'materials': materials, 'bases': bases,
        'craftTime': {'text': time, 'workshopRequired': ws is not None, **({'workshopKind': ws} if ws else {})},
        'difficulty': {'value': diff, **({'text': f'{diff} ({skill})'} if skill else {})},
        'durationText': dur, 'lifespanText': life, 'frequencyText': freq, 'useText': use, 'check': check,
        'requires': req, 'requiresMoment': None, 'tags': tags or [], 'description': desc, 'rules': rules, 'pages': page,
    }
    if skill: x['craftSkill'] = {'Mechanika': 'mechanika', 'Chirurgie': 'chirurgie'}[skill]
    if drinkable is not None: x['drinkable'] = drinkable
    if danger is not None: x['fixedDanger'] = danger
    return x

B = lambda text, *alts, **kw: {'text': text, 'match': [list(a) if isinstance(a, tuple) else [a] for a in alts], **kw}
ALK = B('alkohol', 'alkohol', 'palen', 'lih', 'vodk', 'rum', 'koral')
KREV = B('krev', 'krev', 'krv')
VODA = B('voda', 'vod', free=True)
MED = {'specialization': 'medicus'}
ab = lambda a: {'ability': a}
LAB = 'laborator'
CHAR = lambda n: f' Zákrok snižuje základ Charismatu o {n} (nikdy pod 1 (−5)).'
BIO = ' Implantace: Chirurgie (OBR) vs. 15 (končetina / výtvor) · 20 (vnitřní orgán) · 25 (životně důležitý orgán), operace 6+ hodin v laboratoři; o 5 a víc pod obtížnost = smrt pacienta.'
MECH = ' Implantace: potřebuje Bio-rozhraní; Chirurgie (OBR) vs. 15 (vnější) · 20 (uvnitř těla) · 25 (u životně důležitých orgánů), 6 hodin za vylepšení.'

recipes = [
 # ------------------------------------------------ Chirurgie – tinktury (s. 128–129), získá každý Medicus
 R('paralyzujici_tinktura', 'Paralyzující tinktura', MED, 15, 25, [ALK, B('kůže jedovaté žáby', ('zab', 'kuz'), ('zab', 'jed'), ('zaby',))],
   '5 minut', 17, 'požití / potření', 'světle hnědá, hořká',
   'Ochromí tělo, že není schopné nejmenšího pohybu, ani mluvit či mrkat; mysl zůstává při vědomí a cítí bolest. Projeví se 10 kol po pozření: hod proti pasti ODO vs. 15. Při neúspěchu paralýza po celou dobu působení, jinak závrať (−2 ke všem hodům na fyzickou aktivitu) a hod se opakuje každou směnu. Po odeznění je dotyčný ještě hodinu ztuhlý (−2 k fyzické aktivitě).',
   latin='tincturam torpentum', kind='lektvar', dur='6 hodin', check='past ODO vs. 15', tags=['Chirurgie', 'Tinktura'], page='128'),
 R('tinktura_proti_bolesti', 'Tinktura proti bolesti', MED, 5, 20, [ALK, B('mák', 'mak')],
   '5 minut', 15, 'požití / potření', 'černá, hořká tekutina',
   'Zbaví cíl zcela bolesti, nikoliv zranění. S každým dalším požitím se efekt o směnu zkracuje (tělo si buduje rezistenci). K potírání menších ran vystačí jeden flakón na pět dávek.',
   latin='tincturam lenimenta', kind='lektvar', dur='6 hodin', tags=['Chirurgie', 'Tinktura'], page='128'),
 R('uspavaci_tinktura', 'Uspávací tinktura', MED, 15, 30, [ALK, B('byliny', 'bylin')],
   '5 minut', 15, 'požití', 'čirá, sladce vonící tekutina',
   'Uspí tvora před operací. Projeví se 10 kol po pozření: hod proti pasti ODO vs. 10 (při každém dalším hodu +5). Při neúspěchu hluboké bezvědomí, jinak ospalost a dezorientace – Nevýhoda (−5) ke všem hodům – a hod se opakuje každou směnu, dokud oběť neusne. Po dobu působení ji nejde probrat; 4 hodiny po zákroku je otupělá (stejné postihy) a bez bolestí.',
   latin='tincturam somno', kind='lektvar', dur='6 hodin', check='past ODO vs. 10 (+5 za každý další hod)', tags=['Chirurgie', 'Tinktura'], page='129'),
 R('konzervacni_lak', 'Konzervační lák', MED, 10, 20, [B('sůl', 'sul', 'soli'), B('líh', 'lih', 'alkohol')],
   '1 směna', 10, 'konzervace', 'slabě zelená tekutina',
   'Zabraňuje rozkladu tkání – organický vzorek v nálevu „žije“ dál až dva roky. Jedna dávka zakonzervuje jednu končetinu tvora velikosti A–C. Nalévá se do pevně zavřených nádob (skleněné a hliněné dózy, soudky). Obličej naložený na 24 hodin se stane odolnou „maskou“ (Plastická chirurgie).',
   latin='conservatio impregnans', kind='ostatni', life='vzorek vydrží až 2 roky', tags=['Chirurgie'], page='129'),
 # ------------------------------------------------ Biologická augmentace (s. 130–132) – Alchymistická anatomie
 R('druhy_mozek', 'Druhý mozek', ab('biologicka_augmentace'), 300, 40, [B('mozek a lebka humanoida', 'mozek', 'mozk', 'lebk')],
   '1 týden / laboratoř', 16, 'implantace', 'menší část mozku',
   'Fragment další lebky „přichycený“ na temeni pojme menší část dalšího mozku. Bdělý spánek – stačí 3 hodiny denně a postava přitom vnímá okolí. Trvalý bonus +5 k Inteligenci.' + CHAR(10) + BIO,
   ws=LAB, tags=['Alchymistická anatomie', 'Biologická augmentace'], page='131'),
 R('druhe_srdce', 'Druhé srdce', ab('biologicka_augmentace'), 200, 30, [B('srdce humanoida', 'srdc')],
   '1 týden / laboratoř', 16, 'implantace', 'dodatečné srdce',
   'Výdrž se zdvojnásobí a maximum životů vzroste o třetinu. Je-li jedno srdce fatálně zraněno, tělo funguje dál a schopnosti se vrátí na předchozí úroveň. Je-li rána po operaci viditelná, základ Charismatu −1.' + BIO,
   ws=LAB, tags=['Alchymistická anatomie', 'Biologická augmentace'], page='131'),
 R('vili_kridla', 'Vílí křídla', ab('biologicka_augmentace'), 350, 150, [B('křídla víly', ('kridl', 'vil'), 'kridl')],
   '1 týden / laboratoř', 15, 'implantace', 'vílí křídla vyrůstající z lopatek',
   'Po našití a rekonvalescenci (1 měsíc) může postava létat. Víly bývají velikosti A–B, na tvory velikosti C nemá smysl se o to pokoušet.' + CHAR(5) + BIO,
   ws=LAB, tags=['Alchymistická anatomie', 'Biologická augmentace'], page='132'),
 R('zabra', 'Žábra', ab('biologicka_augmentace'), 100, 100, [B('žábry humanoida (obvykle hastrmana)', 'zabr', 'hastrman')],
   '2 dny / laboratoř', 15, 'implantace', 'žábry na úrovni krku',
   'Jedna plíce se upraví, aby fungovala se žábrami. Po týdenní rekonvalescenci dýchání pod vodou. Aspoň jednou denně se musí na směnu ponořit do vody, jinak se žábry zanítí a trvale přestanou fungovat.' + CHAR(5) + BIO,
   ws=LAB, tags=['Alchymistická anatomie', 'Biologická augmentace'], page='132'),
 # ------------------------------------------------ Infuze a inhalace (s. 133–134) – Lektvary a elixíry
 R('elixir_lasky', 'Elixír lásky', ab('infuze_a_inhalace'), 80, 30, [VODA, B('žlutý lotos', ('lotos', 'zlut'), ('lotus', 'zlut')), B('med', 'med')],
   '1 den', 18, 'požití', 'hnědá, po medu vonící tekutina',
   'Kdo neuspěje v hodu Vůle (INT) vs. Nebezpečnost, bezvýhradně se zamiluje do první bytosti, kterou spatří, a udělá pro ni prakticky cokoliv kromě akcí přímo ohrožujících život. Účinek vyprchá po dni; je-li láska opětována, až po týdnu. (Tabulka receptu uvádí Nebezpečnost 18.)',
   latin='ius amoris', kind='elixir', dur='1 den', freq='1 ročně', check='Vůle (INT) vs. Nebezpečnost', tags=['Lektvary a elixíry', 'Elixír'], page='133'),
 R('lektvar_berserkr', 'Lektvar Berserkr', ab('infuze_a_inhalace'), 30, 30, [ALK, B('jedovaté houby', 'houb')],
   '5 minut', 18, 'požití', 'zlatavá, skořicově vonící tekutina',
   'Masivní vyplavení adrenalinu: postavu v bezvědomí do kola probere a po dobu účinku má 1 život (pak se životy upraví zpět). Válečníkovi dá jednorázově 15 bodů adrenalinu. Vypitý dřív, než dovolí četnost, obvykle zabije (selhání srdce u tvorů A–C).',
   latin='potio berserker', kind='lektvar', dur='5 minut', freq='1 týdně', tags=['Lektvary a elixíry', 'Lektvar'], page='133'),
 R('lektvar_purpurovych_rek', 'Lektvar Purpurových řek', ab('infuze_a_inhalace'), 20, 20, [KREV],
   '10 kol', 17, 'požití', 'rudá, zlatě světélkující tekutina',
   'Rozzáří cévy a energetické dráhy pod kůží živé bytosti (u neznalých může vyvolat paniku). V boji proti ní lze způsobit Krvácivé zranění už po hodu jedné šestky.',
   latin='potio purpura flumina', kind='lektvar', dur='1 směna', freq='1 týdně', tags=['Lektvary a elixíry', 'Lektvar'], page='134'),
 R('lektvar_zmeny_osobnosti', 'Lektvar Změny osobnosti', ab('infuze_a_inhalace'), 30, 20, [ALK],
   '1 směna', 16, 'požití', 'čirá kyselá tekutina',
   'Změní jeden charakterový rys, který Medicus určí při výrobě, v naprostý protiklad (statečnost – zbabělost, laskavost – sobectví…), pokud pijící neuspěje v hodu Vůle (INT) vs. 15. Postava si změnu neuvědomuje. (Tabulka receptu uvádí Nebezpečnost 15.)',
   latin='potio persona mutatio', kind='lektvar', dur='12 hodin', freq='1 týdně', check='Vůle (INT) vs. 15', tags=['Lektvary a elixíry', 'Lektvar'], page='134'),
 R('serum_pravdy', 'Sérum pravdy', ab('infuze_a_inhalace'), 40, 30, [ALK],
   '2 směny', 17, 'požití', 'čirá, pálivě chutnající tekutina',
   'Kdo neuspěje v hodu Vůle (INT) vs. 15, nedokáže lhát a musí mluvit čistou pravdu. (Tabulka receptu uvádí Nebezpečnost 15.)',
   latin='serum veritas', kind='lektvar', dur='10 kol', freq='1 týdně', check='Vůle (INT) vs. 15', tags=['Lektvary a elixíry', 'Lektvar'], page='134'),
 R('umela_krev', 'Umělá krev', ab('infuze_a_inhalace'), 1, 10, [B('krev (2 dl)', 'krev', 'krv')],
   '1 směna', 17, 'infuze', 'rudá tekutina',
   'Ze dvou decilitrů krve udělá dávku pro transfuzi (podání trvá 1 směnu). U Krvácivého zranění odstraní veškerou ztrátu životů krvácením a vyléčí navíc 1k10 životů. Není omezena četností, ale na jedno zranění jen jednou. Mimo chlad vydrží 3 dny, v chladu až 2 roky.',
   latin='sanguinem artificialis', kind='ostatni', dur='3 dny', life='3 dny (v chladu až 2 roky)', tags=['Lektvary a elixíry'], page='134–135'),
 # ------------------------------------------------ Mechanická augmentace (s. 135–137) – Alchymistická anatomie
 R('bio_rozhrani', 'Bio-rozhraní', ab('mechanicka_augmentace'), 50, 40, [B('tkáň, případně chrupavka', 'tkan', 'chrupav')],
   '4 směny (1 hodina) v laboratoři', 15, 'implantace', 'růžová prokrvená tkáň',
   'Štěp z humanoidní tkáně – „brána“ mezi tělem a augmentací: brání infekci a imunitní reakci, podporuje hojení a napojí předmět na mozek. Ke každé augmentaci je obvykle potřeba jedno bio-rozhraní (neurčí-li PJ jinak).',
   ws=LAB, tags=['Alchymistická anatomie', 'Mechanická augmentace'], page='135'),
 R('exoskelet', 'Exoskelet', ab('mechanicka_augmentace'), 100, 600, [B('silné kovové dráty', 'drat')],
   '1 týden', 16, 'implantace', 'obrys kovové zbroje',
   'Dráty z páteře kopírují ruce a nohy a z lopatek vyrůstají dva ovladatelné úchyty. Základní obrana (ZO) +3 a v každém kole útok navíc. Úchyty fungují jako Pyromantův Univerzální nosič (Hmoždíř, Chrlič energie…).' + CHAR(10) + MECH,
   skill='Mechanika', tags=['Alchymistická anatomie', 'Mechanická augmentace'], page='136'),
 R('mechanicke_oko', 'Mechanické oko', ab('mechanicka_augmentace'), 80, 20, [B('broušené čočky', 'cock'), B('kovová kolečka', 'kolec', 'kolic', 'ozuben')],
   '2 dny', 14, 'implantace', 'skleněná bulva v kovovém mechanismu',
   'Vidění v noci jako ve dne, rozezná tepelnou stopu (i v naprosté tmě), dohled a výhody jako elfí zrak. Při pohybu jemně bzučí.' + CHAR(5) + MECH,
   skill='Mechanika', tags=['Alchymistická anatomie', 'Mechanická augmentace'], page='136'),
 R('umela_noha', 'Umělá noha', ab('mechanicka_augmentace'), 300, 300, [B('kovové dráty', 'drat'), B('pružiny', 'pruzin')],
   '1 týden', 15, 'implantace', 'umělá noha z pružných kovových plátů',
   'Pohyblivost 2× vyšší a skok 2× výš – platí už s jednou nohou, druhá nic nepřidá.' + CHAR(2) + MECH,
   skill='Mechanika', tags=['Alchymistická anatomie', 'Mechanická augmentace'], page='136'),
 R('umela_paze', 'Umělá paže', ab('mechanicka_augmentace'), 300, 300, [B('kovové dráty', 'drat'), B('kovové pláty', 'plat', 'plech')],
   '1 týden', 14, 'implantace', 'umělá paže z pružných kovových plátů',
   'Síla 26 (+8) a útok navíc v každém kole. Nevýhoda (−5) k jemné mechanice a střelbě.' + CHAR(7) + MECH,
   skill='Mechanika', tags=['Alchymistická anatomie', 'Mechanická augmentace'], page='136–137'),
 # ------------------------------------------------ Sešívanci (s. 139–140)
 R('kontrolni_krystal', 'Kontrolní krystal', ab('sesivanci'), 50, 10, [B('křišťál či drahokam', 'kristal', 'krystal', 'drahokam')],
   '4 směny (1 hodina) v laboratoři', 19, 'nošení', 'obvykle průhledný drahokam',
   'Krystaly se vyrábějí propojené: primární nosí Medicus (musí se dotýkat jeho těla), sekundární se vkládají do sešívanců (kus musí trčet nad kůži). Rozkaz myšlenkou = krátká akce, i více sešívancům najednou. Zničený či vzdálený primární krystal nebo zničení kteréhokoliv sekundárního = ztráta kontroly (sešívanci plní poslední příkaz, strnou, vzácně zešílí).',
   ws=LAB, tags=['Sešívanci'], page='139–140'),
 # ------------------------------------------------ Tetování (s. 141–142) – inkousty
]
INK = [
 ('inkoust_doplnovani_many', 'Inkoust doplňování many', 50, 10, B('modrý lotos', ('lotos', 'modr'), ('lotus', 'modr')), '10 kol', 20, 'modrý inkoust', 'Kouzelníkovi dává každé kolo 3 body many (nikdy nad maximum).', True),
 ('inkoust_prubezne_lecby', 'Inkoust průběžné léčby', 50, 10, B('rudý lotos', ('lotos', 'rud'), ('lotus', 'rud')), '10 kol', 20, 'rudý inkoust', 'Léčí tetovanému každé kolo 4 životy (nejvýš do maxima).', True),
 ('inkoust_protekce_dracimu_dechu', 'Inkoust protekce dračímu dechu', 50, 10, B('dračí zub', ('drac', 'zub')), '1 směna', 20, 'šedý inkoust', 'Imunita proti efektům všech druhů dračího dechu.', False),
 ('inkoust_protekce_fyzickych_zraneni', 'Inkoust protekce fyzických zranění', 80, 20, B('játra baziliška', 'bazilis'), '10 kol', 20, 'šedý inkoust', 'Promění strukturu tkání a kůže – imunita vůči fyzickému zranění.', True),
 ('inkoust_protekce_mrazu', 'Inkoust protekce mrazu', 20, 10, B('pero fénixe', 'fenix'), '1 směna', 16, 'šedý inkoust', 'Rezistence vůči zraněním chladem a mrazem i jejich účinkům (zmražení).', True),
 ('inkoust_protekce_ohne', 'Inkoust protekce ohně', 20, 10, B('voda ledovce', 'ledov'), '1 směna', 16, 'šedý inkoust', 'Rezistence vůči zraněním ohněm a žárem; vybavení na postavě může oheň dál zničit.', True),
]
for id, name, mana, mat, base, dur, diff, desc, rules, _needsLE in INK:
    recipes.append(R(id, name, ab('tetovani'), mana, mat, [base], '1 den', diff, 'potření / injekce', desc,
                     rules + ' Aktivace potřením po 3 kolech, vpichem ihned; působí vždy jen jeden inkoust a nezpůsobuje otravu při překročení četnosti.',
                     kind='ostatni', dur=dur, tags=['Tetování', 'Inkoust'], page='141–142'))

abilities = [
 {'id': 'biologicka_augmentace', 'rules': 'Náhrada či přidání orgánů a končetin (jen v rámci druhu nebo příbuzných druhů; orgány v chladu, v konzervačním láku nebo max. hodinu mimo krevní oběh). Chirurgie (OBR) vs. 15 končetina / výtvor Alchymistické anatomie, 20 vnitřní orgán, 25 životně důležitý orgán; operace 6+ hodin ve sterilním prostředí, plná funkce po týdnu. Ruce dají sílu dárce, nohy obratnost, záložní orgán +⅓ max. životů. Neúspěch o 5 a víc = obvykle smrt. Bez Plastické chirurgie zůstanou jizvy. Recepty: Druhý mozek, Druhé srdce, Vílí křídla, Žábra.'},
 {'id': 'bojova_anatomie', 'rules': 'Ohledání mrtvého: Postřeh (INT) vs. X (běžné 10, maskované 15+, netypické 20+) určí příčinu a čas smrti s přesností na hodinu. V boji: po zásahu, který zraní aspoň za 1 život, cíl hází ODO vs. OBR Medika – při neúspěchu postih −3 ke všem akcím na 1k10 kol. Může také jen působit bolest (všechna Zranění se sníží na 1). Jen na tvory se známou anatomií, kteří vnímají bolest.'},
 {'id': 'infuze_a_inhalace', 'rules': 'Injekce: lektvar, jed či elixír jde rozdělit na dvě dávky se stejným účinkem, pokud se vpraví přímo do žíly. Aerosol: po rozbití flakónu se rozšíří na 2 sáhy kolem dopadu, rozprašovačem zasáhne cíl do 5 sáhů – účinek je poloviční. Recepty: Elixír lásky, Lektvar Berserkr, Purpurových řek, Změny osobnosti, Sérum pravdy, Umělá krev.'},
 {'id': 'mechanicka_augmentace', 'rules': 'Mechanická vylepšení (i výtvory Pyromanta či kováře) přes Bio-rozhraní ve sterilním prostředí: Chirurgie (OBR) vs. 15 vnější, 20 uvnitř těla, 25 u životně důležitých orgánů; 6 hodin za vylepšení, funguje hned. Neúspěch = zánět, vylepšení se musí vyjmout (jde použít znovu). Bez Plastické chirurgie jizvy, postihy za více augmentací určí PJ. Recepty: Bio-rozhraní, Exoskelet, Mechanické oko, Umělá noha, Umělá paže (výroba se ověřuje Mechanikou).'},
 {'id': 'plasticka_chirurgie', 'rules': 'Šití bez jizev, odstranění jizev a stop po augmentacích (1–6 směn podle PJ). Sběr kůže a obličejů: v konzervačním láku se za 24 h stane odolnou maskou, kterou jde „nahrubo nasadit“ nebo přišít. Přišití: 6 hodin ve sterilním prostředí, Chirurgie (OBR) vs. 15, každá další operace téhož pacienta +5. Odhalit masku jde hodem Postřeh (INT) vs. Chirurgie (OBR) Medika. Hlas, gesta ani vzpomínky se nepřenášejí.'},
 {'id': 'resuscitace', 'rules': 'Tvor mrtvý nejvýš 5 minut (ne stářím ani devastujícím zraněním): 6 kol, První pomoc (OBR) vs. 15 + 3 za každou minutu od smrti. Úspěch = životy těsně nad hranici smrti, v bezvědomí. Jinak jde do 24 hodin po smrti z orgánů destilovat manu (plnou hodnotu určí PJ): destilační aparatura a 1 směna na orgán.'},
 {'id': 'sesivanci', 'rules': 'Sešívá těla různých druhů (primární subjekt musí být živý, ostatní živé nebo v hlubokém chladu); mozky upraví a vloží sekundární kontrolní krystal. Mana 300 + 100 a suroviny 100 + 100 za každou novou část, 4 hodiny za část. Chirurgie (OBR) vs. součet obtížností částí (při vylepšení + obtížnost základu); neúspěch = tvor umírá a části jsou ztracené. Sešívanec jí, pije a spí podle primárního subjektu (jinak hibernuje), složité příkazy nechápe (asi jako INT 6), budí hrůzu.'},
 {'id': 'tetovani', 'rules': 'Tetování velikosti dlaně (1 hodina), na každém tvoru nejvýš jedno. Aktivuje se inkoustem: potřením po 3 kolech, vpichem ihned; působí vždy jen jeden inkoust a nezpůsobuje otravu při překročení četnosti. Recepty 6 inkoustů.'},
]

SIZES = ['A', 'B', 'C', 'D', 'E', 'F']
def t(s):  # "3/+1" → [3, 1]
    a, b = s.split('/')
    return [int(a), int(b)]
limbs = {
 'Drápy': '3/+1 4/+1 4/+2 5/+3 6/+4 8/+6', 'Chapadla': '3/+0 4/+0 4/+1 5/+2 6/+3 8/+5', 'Klepeta': '2/+4 3/+4 3/+5 4/+6 5/+7 7/+9',
 'Kopyta': '3/+1 4/+1 4/+2 5/+3 6/+4 8/+6', 'Pařáty': '4/+2 5/+2 5/+3 6/+4 7/+5 9/+7', 'Pěsti': '4/+2 5/+2 5/+3 6/+4 7/+5 9/+7',
 'Spáry': '3/+3 4/+3 4/+4 5/+5 6/+6 8/+8', 'Bodec': '4/+1 5/+1 5/+2 6/+3 7/+4 9/+6', 'Ocas': '4/+0 5/+0 5/+1 6/+2 7/+3 9/+5',
}
heads = {
 'Kly': '2/+3 3/+4 3/+5 4/+6 5/+7 6/+8', 'Kusadla': '3/+2 4/+2 4/+3 5/+4 6/+5 8/+7', 'Parohy': '4/+0 5/+0 5/+1 6/+2 7/+3 9/+5',
 'Rohy': '3/+1 4/+1 4/+2 5/+3 6/+4 8/+6', 'Zobák': '3/+0 4/+0 4/+1 5/+2 6/+3 8/+5', 'Zuby': '4/+1 5/+1 5/+2 6/+3 7/+4 9/+6',
}
skins = {
 'Krunýř': [6, 7, 8, 10, 12, 14], 'Kůže': [1, 1, 1, 3, 5, 7], 'Peří': [1, 1, 2, 4, 6, 8], 'Skelet': [5, 6, 7, 9, 11, 13],
 'Srst': [1, 2, 3, 5, 7, 9], 'Šupiny': [4, 5, 6, 8, 10, 12], 'Tvrdá kůže': [3, 4, 5, 7, 9, 11],
}
table = lambda d: {k: dict(zip(SIZES, map(t, v.split()))) for k, v in d.items()}
out = {
 '_zdroj': 'Draci_hlidka_PPP_03_Alchymista.pdf s. 17–32 (kniha s. 127–142), specializace Medicus, přepsáno 27. 9. 2026',
 '_poznamka': 'Inkoust protekce mrazu má v knize základ „pero fénixe“ a Inkoust protekce ohně „voda ledovce“ – nejspíš prohozené, přepsáno doslova (k potvrzení).',
 'recipes': recipes,
 'abilities': abilities,
 'stitch': {
  'sizes': SIZES,
  'limbs': table(limbs), 'heads': table(heads), 'skins': {k: dict(zip(SIZES, v)) for k, v in skins.items()},
  'mana': {'base': 300, 'perPart': 100}, 'materials': {'base': 100, 'perPart': 100}, 'hoursPerPart': 4,
  'difficulty': {'limb': 2, 'head': 5, 'special': 3, 'skin': 0},
  'pages': '137–141',
 },
 'surgery': {
  'bio': [{'label': 'končetina / výtvor Alchymistické anatomie', 'dc': 15}, {'label': 'vnitřní orgán (náhrada či přidání)', 'dc': 20}, {'label': 'životně důležitý orgán', 'dc': 25}],
  'mech': [{'label': 'vnější augmentace', 'dc': 15}, {'label': 'uvnitř těla', 'dc': 20}, {'label': 'poblíž životně důležitých orgánů', 'dc': 25}],
 },
}
json.dump(out, open('docs/ppp03_medicus.json', 'w'), ensure_ascii=False, indent=1)
print(len(recipes), 'receptů,', len(abilities), 'schopností')
