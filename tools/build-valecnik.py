# Sestaví data Válečníka pro appku (Fáze 7b):
#   docs/h08_valecnik.json   (tools/h08_valecnik_src.py)  – základní triky, školy, schopnosti H08
#   docs/ppp01_valecnik.json (tools/ppp01_valecnik_src.py) – Cesty, schopnosti od 6. úr., specializace, 93 triků PPP01
# → src/data/valecnik.json  (triky s plným textem, školy, Cesty, pravidla schopností)
# → src/data/progression.json, blok "valecnik" (schopnosti, Cesty, specializace pro průvodce přestupem)
# Spuštění: python tools/h08_valecnik_src.py && python tools/ppp01_valecnik_src.py && python tools/build-valecnik.py
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
H08 = json.loads((ROOT / 'docs' / 'h08_valecnik.json').read_text(encoding='utf-8'))
PPP = json.loads((ROOT / 'docs' / 'ppp01_valecnik.json').read_text(encoding='utf-8'))
OUT = ROOT / 'src' / 'data' / 'valecnik.json'
PROG = ROOT / 'src' / 'data' / 'progression.json'

SCHOOL_ID = {s['nazev']: s['id'] for s in H08['skoly']}
SPEC_ID = {'Berserkr': 'berserkr', 'Rytíř': 'rytir', 'Šermíř': 'sermir'}
PATH_ID = {'Mistr ' + p['nazev'].replace('Cesta ', 'Cesty '): p['id'] for p in PPP['cesty']}
# Ve „Vyžaduje“ jsou i schopnosti – jako samostatná položka (ne „… nebo Zručnost se zbraní“) jsou podmínkou naučení.
REQ_ABILITY = {'Vícenásobné útoky': 'vicenasobny_utok', 'Zručnost se zbraní': 'zrucnost_se_zbrani'}


def trick_type(use: str) -> dict:
    """Druh triku pro hlídání akcí v boji (H08/PPP01: Souboj, Pohyb, Reakce, Soustředění, Výkřik)."""
    u = use.lower()
    first = min((i for i in (u.find('útok'), u.find('obrana')) if i >= 0), default=-1)
    roll = None if first < 0 else ('attack' if u.find('útok') == first else 'defense')
    if 'výkřik' in u:
        return {'t': 'vykrik', 'roll': None, 'extra': False}
    if u.startswith('reakce') or u == 'trik do boje':
        return {'t': 'reakce', 'roll': roll if u.startswith('reakce') else None, 'extra': False}
    if 'soustředění' in u:
        return {'t': 'soustr', 'roll': None, 'extra': 'dodatečná obrana' in u}
    if u.startswith('pohyb') or u.startswith('krátký pohyb'):
        return {'t': 'pohyb', 'roll': None, 'extra': False}
    if 'dodatečná obrana' in u:
        return {'t': 'obrana', 'roll': 'defense', 'extra': True}
    if roll == 'defense':
        return {'t': 'obrana', 'roll': 'defense', 'extra': False}
    return {'t': 'utok', 'roll': 'attack', 'extra': 'dodatečný útok' in u}


def cost(adr: str) -> dict:
    a = adr.strip()
    if re.fullmatch(r'\d+', a):
        return {'a': int(a), 'var': False}
    m = re.fullmatch(r'(\d+) nebo (\d+)', a)
    if m:
        x, y = sorted((int(m[1]), int(m[2])))
        return {'a': x, 'var': True, 'opts': [x, y]}
    m = re.match(r'(\d+)', a)
    return {'a': int(m[1]) if m else 1, 'var': True}


def summary(text: str) -> str:
    """Krátké shrnutí do tabulky v boji: mechanický odstavec (za úvodním), zkrácený."""
    parts = [p for p in text.split('\n') if p.strip() and not p.startswith('PŘÍKLAD')]
    body = ' '.join(parts[1:] if len(parts) > 1 else parts)
    if len(body) <= 170:
        return body
    cut = body[:170]
    dot = cut.rfind('. ')
    return (cut[:dot + 1] if dot > 60 else cut.rsplit(' ', 1)[0] + ' …')


def learn_for(group: str, req: str, src: str) -> dict:
    out: dict = {'level': 6 if src == 'PPP01' else 1}
    if group in SCHOOL_ID:
        out['school'] = SCHOOL_ID[group]
    elif group == 'Škola boje na koni':
        out['school'] = 'skola_boje_na_koni'
    elif group in SPEC_ID:
        out['spec'] = SPEC_ID[group]
    elif group in PATH_ID:
        out['path'] = PATH_ID[group]
    ab = [REQ_ABILITY[x.strip()] for x in req.split(',') if x.strip() in REQ_ABILITY]
    if ab:
        out['abilities'] = ab
    return out


def trick(t: dict, src: str) -> dict:
    p = t['parametry']
    g = t['skupiny'][0]
    return {
        'id': t['id'], 'n': t['nazev'], 'src': src, 'page': t['strana'], 'group': g,
        'adr': p['adrenalin'], **cost(p['adrenalin']),
        'use': p['pouziti'], **trick_type(p['pouziti']),
        'req': p['vyzaduje'], 'check': p['overeni'],
        'learn': learn_for(g, p['vyzaduje'], src),
        'x': summary(t['popis']), 'text': t['popis'],
    }


assert all(g in SCHOOL_ID or g in SPEC_ID or g in PATH_ID or g in ('Obecné', 'Škola boje na koni') for g in (t['skupiny'][0] for t in PPP['polozky'])), 'neznámá skupina triku'
tricks = [trick(t, 'H08') for t in H08['triky']] + [trick(t, 'PPP01') for t in PPP['polozky']]
names = [t['n'] for t in tricks]
assert len(names) == len(set(names)), 'duplicitní název triku'

BONUS = {'UC': 'atk', 'OZ': 'wdef', 'zraneni': 'dmg', 'iniciativa': 'init', 'UC_tvari_v_tvar': 'atkMelee', 'UC_vrh': 'atkThrown', 'OC_tvari_v_tvar': 'defMelee'}


def bonus(b: dict | None) -> dict:
    return {BONUS[k]: v for k, v in (b or {}).items()}


paths = [{
    'id': p['id'], 'name': p['nazev'], 'weapons': p.get('zbrane'), 'page': p['strana'],
    'note': p.get('poznamka') or p.get('pravidla'),
    'ranks': [{'rank': s['stupen'], 'name': s['nazev'], 'effect': s['efekt'], 'bonus': bonus(s.get('bonusy')), **({'cond': s['podminka']} if s.get('podminka') else {})} for s in p['stupne']],
    'master': {'effect': p['mistr']['efekt'], 'bonus': bonus(p['mistr'].get('bonusy')), 'trick': p['mistr']['odemyka_trik']},
} for p in PPP['cesty']]

abilityRules = dict(H08['schopnosti'])
for a in PPP['volitelne_schopnosti']['polozky']:
    abilityRules[a['id']] = a['efekt']
specs = {}
for sid, s in PPP['specializace'].items():
    exp = s['zvlastni_schopnosti'][0]
    specs[sid] = {'name': s['nazev'], 'text': H08['specializace'][sid], 'requiresH08': s['podminky_h08'], 'requiresPPP': s['podminky_ppp'],
                  'experience': {'id': exp['id'], 'name': exp['nazev'], 'text': exp['efekt'], 'skills': exp['dovednosti']}}
    for a in s['volitelne_schopnosti']:
        abilityRules[a['id']] = a['efekt']
for p in paths:
    abilityRules[p['id']] = f"{p['name']} ({p['weapons'] or 'družina'}): " + ' · '.join(f"{r['rank']}. {r['name']} – {r['effect']}" for r in p['ranks']) + f" · Mistr: {p['master']['effect']}"

schools = [{'id': s['id'], 'name': s['nazev'], 'effect': s['efekt'], 'conditional': s['podminena']} for s in H08['skoly']]
schools.append({'id': 'skola_boje_na_koni', 'name': 'Škola boje na koni', 'effect': '+1 k Útoku i Obraně při boji na jezdeckém zvířeti; Jízdu na zvířeti lze ověřovat Atletikou (PPP01, volitelná schopnost od 6. úrovně).', 'conditional': True})

out = {
    '_source': 'H08 Válečník 1.2.5 + PPP01 Válečník (s. 17–60); generuje tools/build-valecnik.py z docs/h08_valecnik.json a docs/ppp01_valecnik.json',
    'general': H08['obecne'],
    'trickTypes': {k: v for k, v in PPP['typy_triku'].items() if not k.startswith('_')},
    'schools': schools,
    'paths': paths,
    'specs': specs,
    'advanced': {a['id']: a['pravidla'] for a in PPP['pokrocile_schopnosti']['polozky']},
    'abilityRules': abilityRules,
    'tricks': sorted(tricks, key=lambda t: (t['src'] != 'H08', t['n'])),
}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------- progression.json → blok válečníka
prog = json.loads(PROG.read_text(encoding='utf-8'))
V = prog['valecnik']
SHORT_H08 = {
    'mistrovstvi_ve_zbrani': '+2 ÚČ/OČ se skupinou zbraní (drtivé, bodné, sečné, vrhací, střelné, beze zbraně); lze volit opakovaně pro další skupinu (H08)',
    'rozvaznost': 'styl boje: útočný +3 ÚČ / −1 OČ, nebo obranný +3 OČ / −1 ÚČ, volí se každé kolo (H08)',
    'skvela_kondice': '+3 životy za každou úroveň, i zpětně (H08)',
    'urputnost': 'Hranice smrti −úroveň; při 0 a méně životech bojuje dál (H08)',
    'veleni': 'rozkaz družině: +1 ÚČ, nebo +1 OČ (od 6. úrovně +2) (H08)',
    'vicenasobny_utok': 'tváří v tvář 3 útoky i obrany za 2 kola, od 6. úrovně 2 za kolo (H08)',
}
MIN_LEVEL_TEXT = {'mistrovstvi_ve_zbrani': None}
abilities = []
for a in V['abilities']:
    if a['id'] in SHORT_H08:
        a = {**a, 'text': SHORT_H08[a['id']]}
        if a['id'] == 'mistrovstvi_ve_zbrani':
            a['param'] = {'key': 'group', 'label': 'Skupina zbraní', 'options': [
                {'id': 'drtive', 'name': 'drtivé'}, {'id': 'bodne', 'name': 'bodné'}, {'id': 'secne', 'name': 'sečné'},
                {'id': 'vrhaci', 'name': 'vrhací'}, {'id': 'strelne', 'name': 'střelné'}, {'id': 'beze_zbrane', 'name': 'boj beze zbraně'}]}
        abilities.append(a)
for a in PPP['volitelne_schopnosti']['polozky']:
    abilities.append({'id': a['id'], 'name': a['nazev'], 'text': a['efekt'], 'minLevel': 6, 'requiresSpecialization': None, 'source': 'PPP01'})
for p in paths:
    abilities.append({
        'id': p['id'], 'name': p['name'], 'minLevel': 6, 'levelStep': 3, 'repeatable': True, 'maxRank': 4, 'requiresSpecialization': None, 'source': 'PPP01',
        'text': f"Cesta válečníka ({p['weapons'] or 'strategie družiny'}) – stupně: " + ', '.join(f"{r['rank']}. {r['name']}" for r in p['ranks']) + f"; Mistr odemkne trik {p['master']['trick']}",
        'ranks': [f"{r['name']} – {r['effect']}" for r in p['ranks']] + [f"Mistr – {p['master']['effect']}; trik {p['master']['trick']}"],
    })
for sid, s in PPP['specializace'].items():
    for a in s['volitelne_schopnosti']:
        abilities.append({'id': a['id'], 'name': a['nazev'], 'text': a['efekt'], 'minLevel': 6, 'requiresSpecialization': sid, 'source': 'PPP01'})
ids = [a['id'] for a in abilities]
assert len(ids) == len(set(ids)), 'duplicitní id schopnosti'
V['abilities'] = abilities
for s in V['specializations']:
    sp = specs[s['id']]
    s['grants'] = [f"{sp['experience']['name']}: {sp['experience']['text']}", 'volitelné schopnosti a pokročilé triky specializace']
    s['unlocksLabel'] = 'volitelné schopnosti specializace od 6. úrovně'
for b in V['branches']:
    b['effect'] = next(x['effect'] for x in schools if x['id'] == b['id'])
V['choose']['nFrom6'] = 2
V['choose']['perBranch'] = 1
V['tovarys'] = PPP['pokrocile_schopnosti']['polozky'][1]['pravidla']
PROG.write_text(json.dumps(prog, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

print(f"{len(tricks)} triků ({sum(t['src'] == 'H08' for t in tricks)} H08 + {sum(t['src'] == 'PPP01' for t in tricks)} PPP01), {len(paths)} Cest, {len(abilities)} schopností → {OUT.relative_to(ROOT)}, {PROG.relative_to(ROOT)}")
