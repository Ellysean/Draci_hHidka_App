# Zdroj pro 7a+.3 – specializace THEURG z PPP03 (s. 53–80 PDF, v knize s. 163–190).
# Přepsáno z Draci_hlidka_PPP_03_Alchymista.pdf (27. 9. 2026). Generuje docs/ppp03_theurg.json:
#   python3 tools/ppp03_theurg_src.py && python3 tools/build-alchemy.py
import json

def R(id, name, ability, mana, materials, bases, time, diff, use, desc, rules, *, kind='predmet', dur=None, moment=None,
      skill='Theurgie', tags=None, page='', extra=None, manaText=None):
    x = {
        'id': id, 'name': name, 'latinName': None, 'tier': 'ability', 'source': 'PPP03', 'kind': kind,
        'mana': {'base': mana, **({'extraMax': extra} if extra else {}), **({'text': manaText} if manaText else {})},
        'materials': materials, 'bases': bases, 'craftTime': {'text': time, 'workshopRequired': False},
        'difficulty': {'value': diff, **({'text': f'{diff} ({skill})'} if skill else {})},
        'durationText': dur, 'lifespanText': None, 'frequencyText': None, 'useText': use, 'check': None,
        'requires': {'ability': ability}, 'requiresMoment': moment, 'tags': tags or [], 'description': desc, 'rules': rules, 'pages': page,
    }
    if skill: x['craftSkill'] = {'Theurgie': 'theurgie'}[skill]
    return x

B = lambda text, *alts, **kw: {'text': text, 'match': [list(a) if isinstance(a, tuple) else [a] for a in alts], **kw}
OP, PZ, VM, TA = 'Oživlé pomůcky', 'Portály a zrcadla', 'Práce s vichry many', 'Talismany'

recipes = [
 # ------------------------------------------------ Oživlé pomůcky (s. 176–178)
 R('chodici_truhla', 'Chodící truhla', 'ozivle_pomucky', 500, 300, [B('cestovní truhla', 'truhl', 'bedn')], '7 dní (slunovrat)', 16,
   'přechovávání a přeprava předmětů a surovin', 'cestovní truhlice, které ze dna umí vystrčit spoustu malých nohou',
   'Následuje majitele (vždy vycítí směr) i přes obtížný terén – plave, šplhá, protáhne se škvírou, v nouzi prý projde astrálem. Nehořlavá, asi 10× větší objem než běžná bedna, věci v ní nestárnou a jsou odolné proti poškození; pojme suroviny i magické předměty, ne živé tvory. Cizímu se jeví prázdná a zaprášená. Vyrábí se pro konkrétního majitele. Zničená ztratí moc; byl-li obsah větší než běžná truhla, praskne a vše se rozsype.',
   moment='slunovrat', tags=[OP], page='176'),
 R('letajici_lucerna', 'Létající lucerna', 'ozivle_pomucky', 100, 100, [B('lucerna', 'lucern')], '3 dny (slunečné poledne)', 13,
   'svícení', 'levitující lucerna',
   'Svobodomyslný démon-průzkumník drží s Theurgem nebo určenou osobou. Na mentální příkaz svítí libovolnou barvou 2–12 sáhů nebo zhasne, vznese se a poletuje do 3 sáhů od majitele. Dobrá rána mečem či šipka z kuše ji zničí.',
   moment='slunečné poledne', tags=[OP], page='176–177'),
 R('mluvici_hlava', 'Mluvící hlava', 'ozivle_pomucky', 80, 35, [B('lebka či soška', 'lebk', 'sosk', 'panenk')], '5 dní', 10,
   'opakování řečeného', 'malá lebka či soška, která dokáže naslouchat a promlouvat',
   'Opakuje jen to, co dřív slyšela – slovo od slova, i s intonací a různými hlasy; alchymisté ji používají jako receptář a diář. Mluví běžnou hlasitostí (ztišit se neumí, jen zmlknout), dokáže mluvit i pod vodou. Z lebky zvířete či skřítka nebo ze sošky / panenky s pohyblivými ústy.',
   tags=[OP], page='177'),
 R('ozivly_obusek', 'Oživlý obušek', 'ozivle_pomucky', 150, 10, [B('obušek', 'obusek', 'obusk', 'kyj')], '1 den (úplněk)', 12,
   'fyzické řešení problémů', 'měkký obušek přechovávaný v koženém pytli',
   'Po otevření pytle a klíčovém slově vylétne a útočí 6× za kolo na cíle podle Theurga (sám se aktivuje, když Theurg napaden nemůže jednat). Útok = Síla obušku = výsledek hodu při výrobě (Nebezpečnost). Nezraní vážně ani nezabije, jen bolí: Vůle (INT) vs. Síla obušku, úspěch = Nevýhoda (−5), jinak útěk či krytí. Nejvýš 10 kol, pak se vrátí a do půlnoci se dobíjí. Zničit: hod proti Síle obušku, houževnatost 10.',
   moment='úplněk', dur='10 kol', tags=[OP], page='177–178'),
 R('zivouci_bomba', 'Živoucí bomba', 'ozivle_pomucky', 30, 50, [B('železná koule', ('zelez', 'koul'), 'koule'), B('zápalná šňůra', ('zapaln', 'snur'), 'snur')], '1 hodina', 13,
   'železná koule s kusem zápalné šňůry a rytinami', 'železná koule s vyrytými kovovými ústy',
   'Po zapálení šňůry se probudí, povídá si, komentuje okolí a rád konverzuje; před výbuchem panikaří. Rozptýlí nepřátele nebo je přiláká. Exploze: každý do 5 sáhů 2k6 + 4 životů střepinami. (V knize jsou u receptu Popis a Použití posunuté.)',
   dur='ihned', tags=[OP], page='178'),
 # ------------------------------------------------ Portály a zrcadla (s. 178–179)
 R('mimoprostorove_zrcadlo', 'Mimoprostorové zrcadlo', 'portaly_a_zrcadla', 1000, 1000, [B('velké zrcadlo', 'zrcad')], '1 měsíc', 17,
   'úkryt', 'velké, obvykle zdobené zrcadlo',
   'Portál do meziprostoru astrálních sfér – úkryt či laboratoř bez omezení místa, čas neplyne a nic nestárne. Zničené zrcadlo = vše uvnitř zůstane v astrálních sférách.',
   tags=[PZ], page='178'),
 R('portal', 'Portál', 'portaly_a_zrcadla', 2000, 1000, [B('20 krystalů', 'krystal', 'kristal', qty=20)], '3 měsíce (zatmění měsíce)', 15,
   'přesun na jiné místo', 'kruhový kamenný portál s krystaly',
   'Brána s ovládacím panelem (runová „adresa“ každé brány) – vstup do jedné a výstup z druhé v nulovém čase; spojí dvě místa i celou síť. Potřebuje 10 krystalů s démony ze stejné sféry jako protějšek. Aktivační krystal many: otevření 100 many a 50 za každé další kolo, pak se odpojí. Extrémně drahé, vlastní je jen mocné cechy.',
   manaText='1500 + 500 (aktivační krystal)', moment='zatmění měsíce', tags=[PZ], page='178–179'),
 R('vidouci_kameny', 'Vidoucí kameny', 'portaly_a_zrcadla', 600, 300, [B('skleněné koule', ('sklen', 'koul'), 'kristal')], '1 měsíc (krvavý měsíc)', 10,
   'vidění skrze jiný „kámen“', 'skleněná koule',
   'Koule s démony stejné sféry – dotyk dlaně a myšlenka na protějšek (bez ní náhodný) přenáší obraz i zvuk. Za každý bod ODO lze spojení udržet 10 kol, nové až další den.',
   manaText='500 + 100 (aktivační krystal)', moment='krvavý měsíc', tags=[PZ], page='179'),
 R('zrcadlo_dusi', 'Zrcadlo duší', 'portaly_a_zrcadla', 200, 100, [B('velké zrcadlo', 'zrcad')], 'týden (novoluní)', 15,
   'uvěznění bytostí', 'zrcadlo s černým povrchem',
   'Kdo má duši (INT 1+, i zvířata) a pohlédne do něj, hází Vůle (CHAR) vs. nebezpečnost zrcadla; neuspěje-li, duše je polapena a tělo bezvládně stojí (bez jídla a pití nakonec umírá). Úspěšný vidí uvězněné duše. Theurg může přikázat duši vypustit; zničení zrcadla vrátí duše do živých těl. Nebezpečnost = přídavná mana ÷ 30 (nebezpečnost 10 = 300 many navíc).',
   extra=900, manaText='200 + X (30 many za každý stupeň nebezpečnosti)', moment='novoluní', tags=[PZ], page='179'),
 # ------------------------------------------------ Práce s vichry many (s. 185–186)
 R('detektor_vichru_many', 'Detektor vichrů many', 'prace_s_vichry_many', 30, 50, [B('kovové jehly', 'jehl')], '1 den', 15,
   'detekce vichrů many', 'kruhový „amulet“ se střelkou',
   'Červená střelka ukazuje směr nejsilnějšího proudění many (mění-li se, stabilní proud tu není), modrá sílu v místě: 10 až 10 000 (many za hodinu). Dosah 10 mil. Kouzelník ve stabilním proudu získá Nasátím many o 2 víc (nejvýš do maxima).',
   skill=None, tags=[VM], page='185'),
 R('manafiltr', 'Manafiltr', 'prace_s_vichry_many', 150, 200, [B('kovový trychtýř a drátky', 'trychtyr', 'drat')], '3 hodiny', 18,
   'syntéza many z vichrů', 'trychtýř s kovovými drátky na jehlicích',
   'Z vichru vyfiltruje krystal vázané many (zdroj pro Portály nebo rozdrtit na běžnou manu): nejméně hodina a půl litru vody, zisk = 1/100 síly vichru (určí PJ, změří Detektor).',
   skill=None, tags=[VM], page='185'),
 R('managenerator', 'Managenerátor', 'prace_s_vichry_many', 300, 1000, [B('kovové pláty, dráty a koule', 'plat', 'plech', 'drat')], '3 týdny', 24,
   'pohon magických zařízení', 'kovová skříň s jehličnatou koulí nahoře',
   'Pohání a dobíjí vynálezy (portály, trhliny do sfér) a předměty oboru Krystaly a energie – 1 bod many za kolo. Musí stát ve vichru aspoň 1000 many/h, z něj získává až ¼ (tj. až 250 many za hodinu); slabší proud = nefunguje.',
   skill=None, tags=[VM], page='186'),
 R('manatransformator', 'Manatransformátor', 'prace_s_vichry_many', 200, 300, [B('velké množství drahokamů', 'drahokam')], '1 týden', 20,
   'pohon magických zařízení', 'koule pokrytá krystaly',
   'Asi 10 lb. Mění volnou manu na vázanou a naopak v poměru 10 : 1 (kouzelník do něj může vyzářit svou manu). Přídavná mana (X) se po aktivaci vyzařuje jako volná mana – kouzelník ji nasaje s úspěšností 10× úroveň. Funguje jako baterie, často propojený s managenerátorem.',
   skill=None, extra=1000, manaText='200 + X', tags=[VM], page='186'),
]

# ------------------------------------------------ Talismany (s. 186–190): Lučba (OBR) vs. obtížnost, mana X do stropu drahokamu
TAL = [
 ('achat', 'Achátový talisman', 'achát', 100, '1 den', 17, 'dotek', 'do vyčerpání many', 'Přiložen na krvácející ránu (sečnou, bodnou, tržnou) odsaje 5 many a vyléčí 1k6 + 4 životy – nejvýš tolik, kolik ta rána vzala.'),
 ('akvamarin', 'Akvamarínový talisman', 'akvamarín', 365, '7 dní', 15, 'nošení', '1 rok', 'Výhoda +5 k Plavání; voda a led zraňují jen napůl, stejně tak ztráta životů při tonutí. Každý den nošení −1 mana.'),
 ('ametyst', 'Ametystový talisman', 'ametyst', 200, '3 dny', 15, 'nošení', 'do vyčerpání many', 'Chrání před zloději: při pokusu o okradení odsaje 10 many a zloděj má automaticky Nevýhodu (−5).'),
 ('citrin', 'Citrínový talisman', 'citrín', 400, '3 dny', 15, 'nošení', 'do vyčerpání many', 'Zvěř k nositeli cítí spříznění a za běžných okolností ho nenapadne ani hladem; zaútočí-li sám na zvíře, moc pomine. Každý den nošení −1 mana. (Strop many není v receptu uveden – appka bere 400 z Tabulky drahokamů.)'),
 ('diamant', 'Diamantový talisman', 'diamant', 1000, '14 dní', 18, 'nošení', 'do vyčerpání many', 'Nositel nestárne. Každý den nošení −4 many.'),
 ('granat', 'Granátový talisman', 'granát', 100, '1 den', 15, 'nošení', 'do vyčerpání many', 'Výhoda +5 k hodu proti jedu; každý takový projev odsaje 10 many.'),
 ('jaspis', 'Jaspisový talisman', 'jaspis', 365, '12 hodin', 15, 'nošení', '1 rok', 'Nositel nepropadne panice ani strachu (ani magickému); nemůže se ale proměnit v berserkra. Každý den nošení −1 mana. (Mana v receptu 365.)'),
 ('kristal', 'Křišťálový talisman', 'křišťál', 200, '3 dny', 17, 'nošení', '50 dnů', 'Výhoda +5 ke všem hodům na Vůli a poloviční doba meditace či nasátí many. Každý den nošení −4 many.'),
 ('lazurit', 'Lazuritový talisman', 'lazurit', 200, '6 hodin', 16, 'dotek', 'do vyčerpání many', 'Léčí popáleniny (kyselina, oheň, mráz, divoká mana): odsaje 5 many a vyléčí 1k6 + 4 životy – nejvýš tolik, kolik popálenina vzala.'),
 ('opal', 'Opálový talisman', 'opál', 400, '3 dny', 18, 'nošení', 'do vyčerpání many', 'Zranění ohněm, vodou, větrem a projevy země jsou poloviční; každá taková ochrana odsaje 10 many.'),
 ('rubin', 'Rubínový talisman', 'rubín', 1000, '7 dní', 17, 'nošení', '50 dnů', 'Nositel neonemocní běžnými nemocemi (stárne normálně) a má max. životy + tolik, kolik je jeho úroveň. Denně −10 many.'),
 ('safir', 'Safírový talisman', 'safír', 500, '1 den', 17, 'nošení', '100 dní', 'Chrání před nakažením lykantropií a u nakaženého nemoc potlačí, dokud talisman nosí (i mimo úplněk); po sundání či vyprchání many následuje opožděná proměna. Denně −3 many.'),
 ('smaragd', 'Smaragdový talisman', 'smaragd', 1000, '3 dny', 18, 'nošení', 'do vyčerpání many', 'Maximum many či duševní síly nositele + 1 za každou úroveň; o stejný počet bodů denně ubývá many v talismanu.'),
 ('topaz', 'Topazový talisman', 'topaz', 300, '7 dní', 17, 'nošení', 'do vyčerpání many', 'Zabrání odsátí úrovně (vyšší nemrtví a podobní); každé takové použití odsaje 50 many.'),
]
for tid, name, gem, mx, time, diff, use, dur, rules in TAL:
    stem = {'achát': 'achat', 'akvamarín': 'akvamarin', 'ametyst': 'ametyst', 'citrín': 'citrin', 'diamant': 'diamant', 'granát': 'granat', 'jaspis': 'jaspis',
            'křišťál': 'kristal', 'lazurit': 'lazurit', 'opál': 'opal', 'rubín': 'rubin', 'safír': 'safir', 'smaragd': 'smaragd', 'topaz': 'topaz'}[gem]
    recipes.append(R(f'talisman_{tid}', name, 'talismany', 0, 50, [B(f'{gem} (aspoň 1 coul)', stem)], time, diff, use, f'{gem} obalený koženými provázky nebo v amuletu',
                     rules + ' Působí, dokud je v kameni mana a dotýká se holé kůže; víc talismanů na kůži se navzájem ruší. Vyčerpaný kámen praskne.',
                     skill=None, extra=mx, manaText=f'X (max {mx})', dur=dur, tags=[TA], page='187–190'))

abilities = [
 {'id': 'astralni_sfery', 'rules': 'Démoni z Tabulky vlastností démonů podle vlastního výběru: z každé sféry nejvýš jeden řádek; při dvou a více pomocnících aspoň tolik škůdců, kolik je pomocníků navíc, a součet úrovní škůdců aspoň polovina součtu úrovní pomocníků. Obtížnost vyvolání = součet (škůdci ji snižují), nesmí přesáhnout magický okamžik. Příprava předmětu: mana a suroviny podle tabulky, 2× tolik hodin, kolik je obtížnost; trhlina 4 směny + 1 kolo. Theurgie (INT) vs. obtížnost; úspěch – démon je v předmětu nebo v Astronu hole, rozdíl hodu určí životnost; neúspěch – démon unikne nebo vnikne náhodný škůdce.'},
 {'id': 'ovladnuti_zivlu', 'rules': 'Bhůtové (Ergar země, Arpas voda, Vayu vzduch, Agni oheň) – hůl, mana v holi podle stupně, Theurgie (INT) vs. obtížnost stupně; místo až stovky sáhů × úroveň Theurga. Formování 5 kol, v 6. kole plný účinek po dobu z tabulky, Theurg ho celou dobu ovládá. Poškození = životy na každý sáh čtvereční v zóně; bez poškození jen Vůle (INT) vs. 10 + stupeň (jinak panika 1k10 kol). Zničit ho jde jen při formování (životy = vložená mana).'},
 {'id': 'ozivle_pomucky', 'rules': 'Démoni se zvídavým duchem v „domově“ předmětu – smí se pohybovat a projevovat vůli. Recepty Chodící truhla, Létající lucerna, Mluvící hlava, Oživlý obušek, Živoucí bomba; démona lze usadit i do jiného podobně velkého předmětu.'},
 {'id': 'portaly_a_zrcadla', 'rules': 'Démoni polapení do zrcadel a portálů propojují vzdálená místa v reálném čase. Recepty Mimoprostorové zrcadlo, Portál, Vidoucí kameny, Zrcadlo duší.'},
 {'id': 'poslove_zivlu', 'rules': 'Elementálové Igni, Undina, Terra, Sylfa: hůl s manou podle stupně a vzorek živlu (oheň, hrnek vody, hrst hlíny, výdech). Theurgie (INT) vs. obtížnost; při úspěchu si elementál vezme manu z hole a plní jednoduché příkazy (INT 1, bez únavy a strachu, bojuje do posledního života). Poslouchá jen stvořitele (lze předat). Vydrží tolik dní, jaký je jeho stupeň, pak se rozplyne (nebo na příkaz).'},
 {'id': 'prace_s_esencemi', 'rules': 'Z 1 many 4 body esencí (oheň, voda, vzduch, země), destilační aparaturou 10 many za směnu. Esence se sype na předmět či tvora nebo vrhá; účinek na konci kola, trvá 2k6 kol, na tvory do velikosti C, úspěch automatický. Na vzduchu se rozpadá – drží se ve flakónech.'},
 {'id': 'prace_s_vichry_many', 'rules': 'Rozpozná proudění Vichrů many a jejich sílu: +3 k Vidění many; místo pro zařízení najde hodem Vidění many (INT) vs. X. Recepty Detektor vichrů many, Manafiltr, Managenerátor, Manatransformátor.'},
 {'id': 'talismany', 'rules': 'Drahý kámen aspoň 1 coul (i surový) aktivovaný manou – Lučba (OBR) vs. obtížnost. Působí, dokud je v něm mana (strop podle Tabulky drahokamů) a dotýká se holé kůže; víc talismanů na kůži se ruší. Vyčerpaný kámen praskne.'},
]

demons = []
def D(sphere, name, cat, levels):
    for i, (text, dc, m, s) in enumerate(levels, 1):
        demons.append({'id': f'{sphere.lower()}_{i}', 'sphere': sphere, 'demon': name, 'cat': cat, 'level': i, 'text': text, 'dc': dc, 'mana': m, 'materials': s})
MAXW = ' (nejvýš dvojnásobek původní hodnoty)'
D('Naldan', 'Agresor', 'pomocnik', [
 ('Útočnost/Zranění zbraně +1/+0 nebo +0/+2' + MAXW, 2, 25, 10), ('Útočnost/Zranění zbraně +2/+0, +1/+2 nebo +0/+4' + MAXW, 4, 50, 20),
 ('Útočnost/Zranění zbraně +3/+0, +2/+2, +1/+4 nebo +0/+6' + MAXW, 6, 75, 30), ('Útočnost/Zranění zbraně +4/+0, +3/+2, +2/+4, +1/+6 nebo +0/+8' + MAXW, 8, 100, 40),
 ('Útočnost/Zranění zbraně +5/+0, +4/+2, +3/+4, +2/+6, +1/+8 nebo +0/+10' + MAXW, 10, 125, 50)])
D('Kezachiel', 'Obránce', 'pomocnik', [(f'Kvalita zbroje nebo Obrana zbraně +{i}' + MAXW, dc, m, s) for i, (dc, m, s) in enumerate([(3, 35, 15), (6, 75, 30), (9, 105, 45), (12, 150, 60), (15, 175, 75)], 1)])
D('Enchiel', 'Osvícenec', 'pomocnik', [(f'Stupeň INT nebo CHAR +{i}', dc, m, s) for i, (dc, m, s) in enumerate([(10, 125, 50), (15, 175, 75), (20, 250, 100)], 1)])
D('Abaran', 'Filozof', 'pomocnik', [(f'Stupeň konkrétní obecné dovednosti na INT nebo CHAR +{i}', dc, m, s) for i, (dc, m, s) in enumerate([(4, 50, 20), (8, 100, 40), (12, 150, 60)], 1)])
MAG = ' (magické jsou Pouto s přírodou, Sesílání kouzel, Prosby, Vidění many a Theurgie)'
D('Taladar', 'Učenec', 'pomocnik', [(f'Stupeň konkrétní profesní nemagické dovednosti na INT nebo CHAR, kterou majitel ovládá, +{i}' + MAG, dc, m, s) for i, (dc, m, s) in enumerate([(6, 75, 30), (12, 150, 60), (18, 225, 90)], 1)])
D('Vingar', 'Znalec', 'pomocnik', [(f'Stupeň konkrétní neprofesní znalostní dovednosti na INT nebo CHAR +{i}', dc, m, s) for i, (dc, m, s) in enumerate([(5, 55, 25), (10, 125, 50), (15, 175, 75)], 1)])
D('Lútiel', 'Sesilatel', 'pomocnik', [(f'Stupeň konkrétní profesní magické dovednosti na INT nebo CHAR, kterou majitel ovládá, +{i}' + MAG, dc, m, s) for i, (dc, m, s) in enumerate([(12, 150, 60), (24, 300, 120)], 1)])
D('Belenar', 'Ochránce', 'pomocnik', [(f'Ochrana předmětu – ochromí nepovolané, kdo se ho chtějí vědomě zmocnit: past Vůle (CHAR) vs. {v}', dc, m, s) for v, dc, m, s in [(12, 5, 55, 25), (14, 10, 125, 50), (16, 15, 175, 75), (18, 20, 250, 100), (20, 25, 300, 125)]])
D('Elmai', 'Telekinetik', 'pomocnik', [(f'Práce s časoprostorem – {lb * 10} sáho/kolo/liber (posun {lb} liber hmoty o 10 sáhů za kolo)', dc, m, s) for lb, dc, m, s in [(200, 4, 50, 20), (400, 8, 100, 40), (600, 12, 150, 60), (800, 16, 200, 80), (1000, 20, 250, 100)]])
D('Viledar', 'Větrník', 'pomocnik', [(f'Vlastní denní mana démona (max {6 * i}); jednou denně si obnoví {i}k6 many z vichrů a sesílá jí kouzla (viz Magik)', dc, m, s) for i, (dc, m, s) in enumerate([(10, 125, 50), (12, 150, 60), (14, 175, 70), (16, 200, 80), (18, 225, 90)], 1)])
D('Argotar', 'Magik', 'pomocnik', [(f'Démon umí {i} kouzelnick{"é kouzlo" if i == 1 else "á kouzla" if i < 5 else "ých kouzel"}; sesílá je vlastní manou (viz Větrník)', dc, m, s) for i, (dc, m, s) in enumerate([(5, 55, 25), (10, 125, 50), (15, 175, 75), (20, 250, 100), (25, 300, 125)], 1)])
D('Sirael', 'Živlů', 'pomocnik', [('Efekt vybraného elementu do předmětu (zranění ohnivé, mrazivé a podobně)', 20, 300, 150)])
D('Netheron', 'Rasista', 'skudce', [('Schopnosti předmětu fungují, jen když ho používá vybraná rasa (hráčská či z Bestiáře)', -1, 0, 0), ('Schopnosti předmětu fungují jen proti tvorovi vybrané rasy (hráčská či z Bestiáře)', -3, 0, 0)])
D('Ondoreth', 'Krvesaj', 'skudce', [(f'Démon musí denně nasát krev ze zranění za {v} životů, jinak uteče do astrálu', -i, 0, 0) for i, v in enumerate([2, 4, 8, 16, 32], 1)])
D('Valandir', 'Našeptávač', 'skudce', [(f'Charakterová vlastnost působící nositeli potíže (agresivita, mamon, melancholie, alkoholismus…) – při nasazení Vůle (CHAR) vs. {v}', -i, 0, 0) for i, v in enumerate([12, 14, 16, 18, 20], 1)])
D('Lumindor', 'Nešika', 'skudce', [('Postih −1 na dovednost, v níž má majitel nejvyšší stupeň', -1, 0, 0)] + [(f'Postih −{i} na 2 dovednosti, v nichž má majitel nejvyšší stupeň', -i, 0, 0) for i in range(2, 6)])
D('Zarathas', 'Pacifista', 'skudce', [(f'Postih −{i} k ÚČ majitele předmětu', -i, 0, 0) for i in range(1, 6)])
D('Seraphiel', 'Berserker', 'skudce', [(f'Postih −{i} k ZO majitele předmětu', -i, 0, 0) for i in range(1, 6)])

moments = [
 {'id': 'denni', 'name': 'každodenní (poledne, půlnoc)', 'max': 12, 'shortGame': 'několikrát za dobrodružství či sezení'},
 {'id': 'mesicni', 'name': 'měsíční (nov, úplněk)', 'max': 15, 'shortGame': 'jednou za dobrodružství či sezení'},
 {'id': 'ctvrtletni', 'name': 'několikrát do roka (slunovrat, rovnodennost)', 'max': 18, 'shortGame': 'nejvýš jednou za dobrodružství při úspěchu Theurgie vs. 18'},
 {'id': 'vyrocni', 'name': 'jednou za rok (zatmění měsíce, částečné zatmění slunce, konstelace)', 'max': 21, 'shortGame': 'nejvýš jednou za dobrodružství při úspěchu Theurgie vs. 21'},
 {'id': 'vzacny', 'name': 'jednou za několik let (úplné zatmění slunce, vlasatice)', 'max': 24, 'shortGame': 'nejvýš jednou za dobrodružství při úspěchu Theurgie vs. 24'},
 {'id': 'kombinace', 'name': 'slabší okamžik + výrazné omezení (X + 3)', 'max': None, 'shortGame': 'nejvýš jednou za dobrodružství při úspěchu Theurgie vs. X + 3'},
]
lifespan = [
 {'min': 1, 'max': 1, 'text': 'do příštího každodenního magického okamžiku (poledne, půlnoc)'},
 {'min': 2, 'max': 3, 'text': 'do příštího měsíčního okamžiku (nov, úplněk)'},
 {'min': 4, 'max': 5, 'text': 'do příštího čtvrtletního okamžiku (slunovrat, rovnodennost)'},
 {'min': 6, 'max': 8, 'text': 'do příštího výročního okamžiku (zatmění měsíce, částečné zatmění slunce, konstelace)'},
 {'min': 9, 'max': 11, 'text': 'do příštího vzácného okamžiku (úplné zatmění slunce, průlet vlasatice)'},
 {'min': 12, 'max': 15, 'text': 'do příštího velmi vzácného okamžiku (konec epochy, narození sedmého syna sedmého syna)'},
 {'min': 16, 'max': None, 'text': 'dokud démon nesplní tajný úkol (vrácení na místo vyvolání, zahnání démona nepřátelské frakce…)'},
]
bhuts = {
 'kinds': [{'id': 'zeme', 'name': 'Ergar (země)', 'text': 'zemětřesení, trhliny v zemi'}, {'id': 'voda', 'name': 'Arpas (voda)', 'text': 'déšť, bouřka, mohutné vlny z přiměřeného zdroje vody'},
           {'id': 'vzduch', 'name': 'Vayu (vzduch)', 'text': 'poryvy vichru, blizzard, hurikán, cyklón'}, {'id': 'ohen', 'name': 'Agni (oheň)', 'text': 'požár, blesky, kulové blesky'}],
 'rows': [
  {'st': 1, 'dc': 10, 'mana': 20, 'dur': '2 kola', 'z1': '0–1', 'd1': 5, 'z2': '1–3', 'd2': None, 'z3': '2–6', 'd3': None},
  {'st': 2, 'dc': 15, 'mana': 40, 'dur': '4 kola', 'z1': '0–2', 'd1': 10, 'z2': '2–5', 'd2': 3, 'z3': '5–12', 'd3': None},
  {'st': 3, 'dc': 18, 'mana': 60, 'dur': '6 kol', 'z1': '0–3', 'd1': 20, 'z2': '3–8', 'd2': 7, 'z3': '8–19', 'd3': 2},
  {'st': 4, 'dc': 21, 'mana': 80, 'dur': '8 kol', 'z1': '0–4', 'd1': 30, 'z2': '4–10', 'd2': 10, 'z3': '10–25', 'd3': 3},
  {'st': 5, 'dc': 24, 'mana': 100, 'dur': '10 kol', 'z1': '0–5', 'd1': 40, 'z2': '5–13', 'd2': 13, 'z3': '13–32', 'd3': 4},
  {'st': 6, 'dc': 27, 'mana': 200, 'dur': '14 kol', 'z1': '0–10', 'd1': 60, 'z2': '10–25', 'd2': 20, 'z3': '25–63', 'd3': 6},
  {'st': 7, 'dc': 30, 'mana': 300, 'dur': '18 kol', 'z1': '0–15', 'd1': 100, 'z2': '15–38', 'd2': 33, 'z3': '(38–)95', 'd3': 11},
  {'st': 8, 'dc': 33, 'mana': 500, 'dur': '25 kol', 'z1': '0–30', 'd1': 150, 'z2': '30–75', 'd2': 50, 'z3': '75–190', 'd3': 15},
  {'st': 9, 'dc': 36, 'mana': 1000, 'dur': '30 kol', 'z1': '0–50', 'd1': 200, 'z2': '50–125', 'd2': 66, 'z3': '125–315', 'd3': 22},
 ],
 'materials': [{'name': 'Dřevo', 'hp': 10}, {'name': 'Dřevo – masiv', 'hp': 20}, {'name': 'Kámen – stěna', 'hp': 30}, {'name': 'Kámen – hradba', 'hp': 40}, {'name': 'Ocel', 'hp': 60}],
 'damage': [{'upTo': 10, 'name': 'lehké poškození'}, {'upTo': 30, 'name': 'střední poškození'}, {'upTo': 50, 'name': 'těžké poškození'}, {'upTo': 80, 'name': 'ruiny'}, {'upTo': 100, 'name': 'naprosté zničení'}],
}
# Elementálové (s. 181–183): hodnota = základ + přírůstek × (stupeň − 1) – základ = 1. stupeň (✔ U 27. 9. 2026).
def E(id, name, mana, hp, attrs, sizes, mob, uc, zo, oc, immun, weak, abilities):
    return {'id': id, 'name': name, 'mana': mana, 'dc': [5, 1], 'level': [1, 1], 'hp': hp, 'attrs': attrs, 'sizes': sizes, 'mobility': mob,
            'attack': uc, 'attacks': 2, 'zo': zo, 'oc': oc, 'immune': immun, 'weak': weak, 'abilities': abilities}
IMM = 'jed, krvácení, zkamenění, nemagické zbraně, ovlivnění mysli'
elementals = [
 E('igni', 'Igni (oheň)', [10, 10], [10, 5], 'SIL –, OBR 14 (+2), ODO 10 (+0), INT 1 (−5), CHAR 14 (+2)', [[1, 3, 'A'], [4, 8, 'B'], [9, 14, 'C'], [15, None, 'D']],
   '32 (levitace)', [3, 2], 3, 3, IMM + ', oheň', 'voda, led', [
   'Žár (pasivní): dotek či zásah pařáty + 1k6 popálenin.',
   'Plameny (dlouhá akce): cíl do 30 sáhů hází Reflex (OBR) vs. 2 + stupeň, jinak 2k6 a hoří 3 kola po 1k6/2.',
   'Exploze (speciální, 1× za 3 kola): kolo nasává, pak vše do 5 sáhů Reflex (OBR) vs. stupeň – neúspěch 4k6 a povalení (1 kolo vstávat), úspěch polovina.']),
 E('undina', 'Undina (voda)', [10, 10], [10, 5], 'SIL 8 (−1), OBR 16 (+3), ODO 10 (+0), INT 1 (−5), CHAR 14 (+2)', [[1, 3, 'A'], [4, 8, 'B'], [9, 14, 'C'], [15, None, 'D']],
   '23 (na zemi), 43 (ve vodě)', [3, 0], 4, 4, IMM + ', voda, led', 'oheň', [
   'Dotek (pasivní): zásah + 1k6 (voda v těle).',
   'Rampouch (dlouhá akce): cíl do 30 sáhů Reflex (OBR) vs. 2 + stupeň, jinak 3k6.',
   'Proud (speciální, 1× za 3 kola): přesune se na protivníka stejné či menší velikosti – Reflex (OBR) vs. stupeň, jinak ho obklopí a topí; oběť se každé kolo může vyprostit Plaváním (SIL/OBR) vs. stupeň.']),
 E('terra', 'Terra (země)', [5, 10], [10, 10], 'SIL 19 (+4), OBR 4 (−3), ODO 21 (+5), INT 1 (−5), CHAR 8 (−1)', [[1, 3, 'A'], [4, 6, 'B'], [7, 14, 'C'], [15, None, 'D']],
   '17 (na zemi)', [4, 3], 3, 3, IMM + ', oheň', 'drtivé zranění', [
   'Otřes (dlouhá akce): vše do 20 sáhů Reflex (OBR) vs. stupeň, jinak povaleno (1 kolo vstávat).',
   'Zkamenění (speciální, 1× za 3 kola): tvor do 3 sáhů Vůle (CHAR) vs. 2 + stupeň, jinak během 3 kol trvale zkamení (nohy, ruce, celý) – zruší prosba Odstraň kletbu.']),
 E('sylfa', 'Sylfa (vzduch)', [10, 10], [9, 4], 'SIL –, OBR 20 (+5), ODO 8 (−1), INT 1 (−5), CHAR 10 (0)', [[1, 3, 'A'], [4, 8, 'B'], [9, 14, 'C'], [15, None, 'D']],
   '65 (létání)', [1, 0], 6, 6, IMM, 'oheň', [
   'Odklonění (pasivní): střelné a vrhací útoky na ni s Nevýhodou (−5).',
   'Větrný úder (dlouhá akce): přesun až 65 sáhů na cíl a jeden útok navíc.',
   'Tornádo (speciální, 1× za 3 kola): poloměr 5 sáhů, Atletika (SIL) vs. stupeň, jinak vymrštěn 8 sáhů a pád 6k6; pak Reflex (OBR) vs. stupeň − 2, jinak povalen.']),
]
essences = {
 'kinds': [{'id': 'ohen', 'name': 'oheň', 'color': 'oranžová'}, {'id': 'voda', 'name': 'voda', 'color': 'modrá'}, {'id': 'vzduch', 'name': 'vzduch', 'color': 'bílá'}, {'id': 'zeme', 'name': 'země', 'color': 'zelená'}],
 'perMana': 4, 'manaPerShift': 10,
 'effects': {
  'ohen': [('magické ohnivé zranění 1k6 (posypání zbraně, rukou, ohnivý dech)', 10), ('zvýšení teploty, vysoušení, vznícení posypaného', 12), ('odolnost proti vodě a zimě (předmět či tvor)', 12),
           ('hrubá smyslová změna ohně (barva, velikost, hluk)', 14), ('jemná smyslová změna ohně (tvarování plamenů, písmena, tváře)', 16), ('„pevný“ oheň (lze po něm chodit či šplhat)', 18)],
  'voda': [('magické ledové zranění 1k6 (posypání zbraně, rukou, ledový dech)', 10), ('snížení teploty, mokření, ledování, popraskání mrazem', 12), ('odolnost proti ohni (předmět či tvor)', 12),
           ('hrubá smyslová změna vody (barva, velikost, hluk, chuť, proudění)', 14), ('jemná smyslová změna vody (vlnky, písmena, tváře)', 16), ('„pevná“ voda (lze po ní chodit či šplhat)', 18)],
  'zeme': [('magické jedové zranění 1k6 (posypání zbraně, rukou, jedovatý dech)', 10), ('změna konzistence (kámen, hlína, písek)', 12), ('odolnost proti jedům a žíravinám (předmět či tvor)', 12),
           ('hrubá smyslová změna pevné přírodní látky (barva, velikost, tvar, chuť)', 14), ('jemná smyslová změna pevné látky (písmena, tváře, textura)', 16), ('rozpohybování pevné přírodní látky', 18)],
  'vzduch': [('magické „elektrické“ zranění 1k6 (posypání zbraně, rukou, elektrická slina)', 10), ('dodání odolnosti (předmět či tvor; v knize chybí proti čemu)', 12),
             ('hrubá smyslová změna plynu (barva, velikost, tvar, vůně)', 14), ('jemná smyslová změna plynu (písmena, tváře, tvarování dýmu)', 16), ('„pevný“ vzduch (lze po něm chodit či šplhat)', 18)],
 },
}
gems = [
 {'id': 'achat', 'name': 'Achát', 'rarity': 5, 'maxMana': 100}, {'id': 'akvamarin', 'name': 'Akvamarín', 'rarity': 7, 'maxMana': 400},
 {'id': 'ametyst', 'name': 'Ametyst', 'rarity': 7, 'maxMana': 200}, {'id': 'citrin', 'name': 'Citrín', 'rarity': 6, 'maxMana': 400},
 {'id': 'diamant', 'name': 'Diamant', 'rarity': 10, 'maxMana': 2000}, {'id': 'granat', 'name': 'Granát', 'rarity': 8, 'maxMana': 100},
 {'id': 'jaspis', 'name': 'Jaspis', 'rarity': 5, 'maxMana': 400}, {'id': 'kristal', 'name': 'Křišťál', 'rarity': 8, 'maxMana': 200},
 {'id': 'lazurit', 'name': 'Lazurit', 'rarity': 7, 'maxMana': 200}, {'id': 'opal', 'name': 'Opál', 'rarity': 6, 'maxMana': 400},
 {'id': 'rubin', 'name': 'Rubín', 'rarity': 9, 'maxMana': 1000}, {'id': 'safir', 'name': 'Safír', 'rarity': 9, 'maxMana': 500},
 {'id': 'smaragd', 'name': 'Smaragd', 'rarity': 9, 'maxMana': 1000}, {'id': 'topaz', 'name': 'Topaz', 'rarity': 8, 'maxMana': 300},
]
staff = {'attack': 7, 'damage': 1, 'defense': 1, 'reach': '1,5 sáhu', 'weightLb': 1.5, 'priceZl': 500, 'maxMana': 1000, 'chargePerRound': 10,
         'craftMana': 300, 'craftText': 'kořen jasanu či ebenu, balzamovací olej s 200 many (týden v zemi), Astron z trpasličího křišťálu a zrcadel za úplňku (100 many)'}

out = {
 '_zdroj': 'Draci_hlidka_PPP_03_Alchymista.pdf s. 53–80 (kniha s. 163–190), specializace Theurg, přepsáno 27. 9. 2026',
 '_poznamka': 'Tabulka efektu bhůtů: 7. stupeň, III. zóna jen „95“ (zřejmě 38–95). U Oživlých pomůcek je v textu 5 receptů (i Živoucí bomba), tabulka schopností jmenuje 4. Esence vzduchu – „odolnost proti“ bez upřesnění. Citrínový talisman nemá strop many (appka 400 z Tabulky drahokamů).',
 'recipes': recipes,
 'abilities': abilities,
 'theurg': {'demons': demons, 'moments': moments, 'lifespan': lifespan, 'bhuts': bhuts, 'elementals': elementals, 'essences': essences, 'gems': gems, 'staff': staff},
}
json.dump(out, open('docs/ppp03_theurg.json', 'w'), ensure_ascii=False, indent=1)
print(len(recipes), 'receptů,', len(abilities), 'schopností,', len(demons), 'řádků démonů')
