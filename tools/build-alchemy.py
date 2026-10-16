# Jednorázový převod dat alchymisty (claude/data/alchymie_recepty.json + tabulky) do src/data/alchymie.json.
# Použití: python3 tools/build-alchemy.py  (vstupy v docs/alchymie_recepty.json a docs/alchymie_tabulky.json)
import json, re, unicodedata
R = json.load(open('docs/alchymie_recepty.json'))
T = json.load(open('docs/alchymie_tabulky.json'))

def norm(s):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()).strip()
def slug(s):
    return re.sub(r'[^a-z0-9]+', '_', norm(s)).strip('_')

# Klíčová slova (kmeny bez diakritiky) pro párování základů s inventářem; alternativy = kterékoli stačí.
# Každá alternativa je seznam kmenů, které musí být všechny v názvu položky inventáře.
MATCH = {
  'jakykoliv tvrdy alkohol': [['palen'], ['koral'], ['rum'], ['vodk'], ['tvrdy alk']],
  'listi': [['list']], 'pripadne zapalna snura': [['zapaln', 'snur']],
  'zvireci krev selmy': [['krv', 'selm'], ['krev', 'selm']], 'voda': [['vod']], 'jesterci ocasky': [['jester']],
  'olej': [['olej']], 'papir / papyrus': [['papir'], ['papyr']], 'pivo': [['piv']], 'pryskyrice': [['pryskyr']],
  'mesicni pavuciny': [['pavucin']], 'alchymistuv lih': [['alchymist', 'lih']], 'vesely kvasek': [['kvas']],
  'vino': [['vin']], 'konska nebo osli moc': [['konsk', 'moc'], ['osl', 'moc']], 'uhli': [['uhl']],
  'bezoar z cerne kozy': [['bezoar']], 'hlina': [['hlin']], 'guano': [['guan']],
  'lano / snura / liana (aspon 60 coulu)': [['lan'], ['snur'], ['lian']],
  'pergamen': [['pergamen']], 'vosk': [['vosk'], ['svick']],
}
# Rozdělení základů, které xlsx rozdělil čárkou špatně (alternativy / vysvětlivka).
FIX = {
  'carovny_stit': [{'text': 'štít, krunýř nebo šupiny', 'match': [['stit'], ['krunyr'], ['supin']]}],
  'svetloprach': [{'text': 'drcený drahokam (nejčastěji opál)', 'match': [['drahokam'], ['opal']]}],
  'dymovnice': [{'text': 'listí', 'match': [['list']]}, {'text': 'zápalná šňůra (případně)', 'match': [['zapaln', 'snur']], 'optional': True}],
  'nekrozor': [{'text': 'dva tubusy z ghúlí kůže', 'match': [['ghul']]}, {'text': 'broušené čočky ze skla nebo drahokamů', 'match': [['cock']]}, {'text': 'krystal', 'match': [['krystal']]}],
}
FREE = {'voda'}  # voda je vždy po ruce

def auto_match(text):
    n = norm(text)
    if n in MATCH: return MATCH[n]
    alts = re.split(r' nebo | / ', n)
    out = []
    for a in alts:
        a = re.sub(r'\(.*?\)', '', a)
        words = [w for w in re.findall(r'[a-z]+', a) if len(w) >= 3 and w not in ('nejlepe', 'cely', 'tvor', 'velikosti', 'vetsi', 'nebo')]
        if not words: continue
        # kmen = prvních 5 písmen (skloňování), u krátkých slov celé slovo bez posledního písmene
        out.append([w[:5] if len(w) > 5 else w[:-1] if len(w) > 3 else w for w in words[-2:]])
    return out or [[n[:5]]]

recipes = []
for r in R['recipes']:
    bases = FIX.get(r['id']) or [{'text': b['text'], 'match': auto_match(b['text'])} for b in r['bases']]
    for b in bases:
        b['baseId'] = slug(b['text'])
        if norm(b['text']) in FREE: b['free'] = True
    x = {k: r[k] for k in ('id', 'name', 'latinName', 'tier', 'mana', 'materials', 'craftTime', 'difficulty', 'durationText',
                           'lifespanText', 'frequencyText', 'useText', 'check', 'requires', 'requiresMoment', 'tags', 'description', 'rules', 'pages')}
    x['bases'] = bases
    # Sliz: „2 roky“ je životnost, ne trvání (✔ U 25. 9. 2026)
    if r['id'] == 'sliz': x['lifespanText'], x['durationText'] = '2 roky', None
    # Čočky: 85 + 5 many na roztok pro uchování – odečítá se celkem 90
    if r['id'] == 'cocky_nocniho_videni': x['mana'] = {'base': 90, 'text': '85 + 5 (roztok)'}
    x['kind'] = ('elixir' if 'Elixír' in r['tags'] else 'lektvar' if 'Lektvar' in r['tags'] else 'jed' if 'Jed' in r['tags']
                 else 'predmet' if 'Magický předmět' in r['tags'] else 'ostatni')
    recipes.append(x)

# 19 startovních základů (H10 s. 2), celkem 7,3 lb; baseId → základ receptu
START = [('Alchymistův líh', 0.4), ('bezoár z černé kozy', 0.3), ('flakón koňské moči', 0.4), ('flakón oslí moči', 0.4),
         ('flakón piva', 0.4), ('flakón s krví šelmy', 0.4), ('flakón s měsíčními pavučinami', 0.2), ('flakón vína', 0.4),
         ('hrst hlíny', 0.3), ('hrst listí', 0.2), ('ještěrčí ocásky', 0.3), ('kousek guána', 0.3), ('kousek pryskyřice', 0.3),
         ('kousek uhlí', 0.3), ('láhev oleje', 1.0), ('láhev pálenky', 1.0), ('metrová šňůra', 0.3), ('papír', 0.1), ('veselý kvásek', 0.3)]
assert abs(sum(w for _, w in START) - 7.3) < 1e-9, sum(w for _, w in START)

WS = [
 {'size': 1, 'name': 'Malá (jedna místnost)', 'setupZl': 400, 'equipZl': 300, 'upkeep': '1 st', 'maxMana': 1200, 'maxMaterials': 6000, 'distill': 2, 'bonus': 2, 'rentHour': '5 st', 'upkeepHours': 1},
 {'size': 2, 'name': 'Střední (2–3 místnosti)', 'setupZl': 1000, 'equipZl': 800, 'upkeep': '3 st', 'maxMana': 3000, 'maxMaterials': 15000, 'distill': 3, 'bonus': 3, 'rentHour': '1 zl', 'upkeepHours': 2},
 {'size': 3, 'name': 'Velká (celý dům)', 'setupZl': 2000, 'equipZl': 1000, 'upkeep': '1 zl', 'maxMana': 6000, 'maxMaterials': 30000, 'distill': 4, 'bonus': 4, 'rentHour': '5 zl', 'upkeepHours': 3},
 {'size': 4, 'name': 'Věž', 'setupZl': 5000, 'equipZl': 3000, 'upkeep': '3 zl', 'maxMana': 10000, 'maxMaterials': 50000, 'distill': 5, 'bonus': 5, 'rentHour': '20 zl', 'upkeepHours': 4},
]
CONT = [  # nádoby (H10, ✔ U 19. 9. 2026) → id položky výbavy
 {'itemId': 'flakon', 'n': 'Běžný flakón', 'mana': 40, 'materials': 0},
 {'itemId': 'flakon_kristalovy', 'n': 'Křišťálový flakón', 'mana': 100, 'materials': 0},
 {'itemId': 'vacek_many', 'n': 'Váček many', 'mana': 150, 'materials': 0},
 {'itemId': 'alchymisticka_truhla_zakladni', 'n': 'Alchymistická truhla (základní)', 'mana': 200, 'materials': 800},
 {'itemId': 'alchymisticka_truhla_vetsi', 'n': 'Alchymistická truhla (větší)', 'mana': 400, 'materials': 1600},
 {'itemId': 'alchymisticka_truhla_cestovni', 'n': 'Alchymistická truhla (cestovní)', 'mana': 600, 'materials': 4000},
]
BRANCH_TEXT = {
 'alchymisticka_anatomie': 'Výhoda +5 k Přežití v přírodě při pitvání a zpracování těl živočichů.',
 'hvezdne_sestavy': '+1 ke všem ověřením Vůle (CHAR). Výroba a životnost závisí na magických okamžicích.',
 'krystaly_a_energie': 'Dvojnásobná kapacita nádob na manu; dobíjení přídavné many do předmětů s krystaly (stupeň Práce s manou za směnu).',
 'lektvary_a_elixiry': 'Lektvary a elixíry (i jiné nápoje po ruce) vypiješ v boji jako okamžitou akci.',
 'magicke_predmety': 'Předměty se základní a přídavnou manou; přídavná mana se odčerpává použitím a nejde dobít.',
 'nestabilni_substance': 'Výbušniny a nestabilní směsi.',
}
# PPP03 – předměty obecných volitelných schopností (7a.2), zdroj docs/ppp03_recepty.json (tools/ppp03_recepty_src.py)
P3 = json.load(open('docs/ppp03_recepty.json'))
for r in P3['recipes']:
    for b in r['bases']:
        b['baseId'] = slug(b['text'])
    recipes.append(r)
# PPP03 – specializace: Medicus (7a+.1), Pyromant (7a+.2); zdroje docs/ppp03_<spec>.json (tools/ppp03_<spec>_src.py)
MED = json.load(open('docs/ppp03_medicus.json'))
PYRO = json.load(open('docs/ppp03_pyromant.json'))
THEURG = json.load(open('docs/ppp03_theurg.json'))
for r in MED['recipes'] + PYRO['recipes'] + THEURG['recipes']:
    for b in r['bases']:
        b['baseId'] = slug(b['text'])
        if norm(b['text']) in FREE: b['free'] = True
    recipes.append(r)
assert len({r['id'] for r in recipes}) == len(recipes), 'duplicitní id receptu'

out = {
 '_source': 'H10 + PPP03 s. 4–16 a 127–190 (Medicus, Pyromant, Theurg) (recepty, tabulky – xlsx od uživatele 25. 9. 2026), PPP03 s. 2 (dílny), H10 s. 2 (startovní základy). Generuje tools/build-alchemy.py.',
 'recipes': recipes,
 'art': [{'min': r['min'], 'amount': r['amount'], 'perceive': r['perceive'], 'process': r['process']} for r in T['art']['rows']],
 'siberio': R['siberio'],
 'startingBases': [{'name': n, 'weightLb': w, 'baseId': slug(n)} for n, w in START],
 'workshops': WS,
 'containers': CONT,
 'branchText': BRANCH_TEXT,
 'wandWoods': P3['wandWoods'],
 'combatSideEffects': P3['combatSideEffects'],
 'concentrateEffects': P3['concentrateEffects'],
 'ppp03Abilities': {**{a['id']: a['rules'] for a in P3['abilities']}, **{a['id']: a['rules'] for a in MED['abilities'] + PYRO['abilities'] + THEURG['abilities']}},
 'theurg': THEURG['theurg'],
 'constructs': PYRO['constructs'],
 'transmutation': PYRO['transmutation'],
 'stitch': MED['stitch'],
 'surgery': MED['surgery'],
 'prices': {'manaMd': 30, 'materialsMd': 3, 'note': 'čistá mana 3 st/bod, čisté suroviny 3 md/bod (H10)'},
}
json.dump(out, open('src/data/alchymie.json', 'w'), ensure_ascii=False, indent=1)
print(len(recipes), 'receptů')
for r in recipes:
    print(r['id'], [b['match'] for b in r['bases']])
