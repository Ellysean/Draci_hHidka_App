"""Zloděj (7e) → src/data/zlodej.json + blok `zlodej` v src/data/progression.json
(+ nové profesní dovednosti v src/data/skills.json, druhy zbraní cechu a improvizované zbraně v src/data/vyzbroj.json,
bomby a udělátka v src/data/gear.json).

Zdroje: docs/h12_zlodej.json (tools/h12_zlodej_src.py) a docs/ppp05_zlodej.json (tools/ppp05_zlodej_src.py).

Výklady:
- triky se neučí ze slotů – zloděj zná vždy všechny triky svých umění a schopností (H12 „získá automaticky“);
- specializace podle H12: dvě pevné podmínky (✔ U 22. 9. 2026); automatické schopnosti specializace (Bratrstvo…, zbraně) hned s volbou;
  bez specializace 1 schopnost libovolné specializace na každé 6. úrovni (✔ U);
- 6. úroveň: Speciální předměty Zloděje a Zlodějský cech automaticky (PPP05 s. 239);
- text má přednost před souhrnnou tabulkou (✔ U 19. 9. 2026): Mistrovství síly osobnosti = Manipulace + Podstrčení předmětu.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from spell_norm import slug  # noqa: E402

H12 = json.loads((ROOT / "docs" / "h12_zlodej.json").read_text(encoding="utf-8"))
PPP = json.loads((ROOT / "docs" / "ppp05_zlodej.json").read_text(encoding="utf-8"))
DATA = ROOT / "src" / "data"

# Použití v boji podle pole „Použití“.
def combat_use(pouziti: str, name: str) -> str | None:
    p = pouziti.lower()
    if "místo" in p:
        return "misto"
    if "útok" in p:
        return "utok"
    if "obran" in p:
        return "obrana"
    if name == "Pán stínů":
        return "akce"
    return None

# Strojové efekty triků v boji (text pravidel zůstává v `popis`).
FX = {
    "Oko střelce": {"atk": 5, "aim": True, "ranged": True, "note": "1 kolo míření, pak střelecký útok s Výhodou +5"},
    "Dokonalá muška": {"atk": 5, "ranged": True, "note": "střelecký útok s Výhodou +5"},
    "Otřesení": {"atkPen": -5, "note": "útok −5; zasáhne-li a uspěje, cíl je 1 kolo otřesen"},
    "Flexibilita": {"def": 5, "defFail": -5, "note": "obrana +5, při neúspěchu −5"},
    "Falešný útok": {"note": "cíl se v tomto kole nebrání – útok jde do jeho ZO"},
    "Přesný zásah": {"note": "cíl chrání jen oprava OBR – ignoruje obranu zbraně, štít, zbroj i hod na obranu"},
    "Utajený útok": {"note": "útok v tichosti, Assassin zůstává skryt"},
    "Kontrolovaná trajektorie": {"ranged": True, "note": "neguje bonus za kryt"},
    "Prohození pozic": {"note": "výpadem si vymění pozici s protivníkem"},
    "Omráčení": {"note": "jen z úkrytu – cíl ztratí vědomí na 1k6 směn"},
    "Hlavounova finta": {"note": "cíl má 1 kolo Nevýhodu −5 ke všem akcím"},
    "Útok z výšky": {"note": "zranění jako pád z výšky + povalení; při neúspěchu Lupič ½ zranění"},
    "Podkopnutí": {"note": "cíl povalen – akce v kole propadají, další útoky do ZO"},
    "Souboj na zemi": {"note": "souboj na zemi – protivník −5 k ÚČ i OČ, oba bez pohybu"},
    "Útok do slabin": {"note": "cíl na 3 kola zpomalen (½ Pohyblivosti)"},
    "Držení": {"note": "cíl bez pohybu, −5 k akcím s pohybem těla"},
    "Oslepení pláštěm": {"note": "cíl −5 k ÚČ i OČ, dokud se nevymaní"},
    "Svedení útoku": {"note": "úspěch = útok zcela mine"},
    "Hraní mrtvého": {"note": "inteligentní nepřítel ho přestane považovat za hrozbu"},
    "Pán stínů": {"note": "krátká akce – téměř neviditelný, pohyb ¼"},
}

# Ověřovací dovednost triku H12 = umění větve.
BRANCH_SKILL = {u["id"]: u["skill"] for u in H12["umeni"]}
BRANCH_NAME = {u["id"]: u["nazev"] for u in H12["umeni"]}

NEW_SKILLS = [
    {"id": "umeni_prepadu", "name": "Umění přepadů", "attributes": ["obr"], "defaultAttribute": "obr", "kind": "profession", "classId": "zlodej", "grantedOnly": True},
    {"id": "umeni_neferoveho_boje", "name": "Umění neférového boje", "attributes": ["obr"], "defaultAttribute": "obr", "kind": "profession", "classId": "zlodej", "grantedOnly": True},
    {"id": "umeni_boje_s_plastem", "name": "Umění boje s pláštěm", "attributes": ["obr"], "defaultAttribute": "obr", "kind": "profession", "classId": "zlodej", "grantedOnly": True},
]
# Schopnost s +1 k dovednostem (Mistrovství…) – efekt v derive, tady jen pro texty.
SKILL_PLUS = {
    "mistrovstvi_sily_osobnosti": ["hazardni_hry", "presvedcovani"], "mistrovstvi_zlatky": ["odhad_ceny", "vybirani_kapes"],
    "mistrovstvi_rvacu": ["umeni_rvacu"], "mistrovstvi_skryvani": ["umeni_skryvani"], "mistrovstvi_kociciho_pohybu": ["umeni_kociciho_pohybu"],
    "mistrovstvi_zelezneho_klice": ["umeni_zelezneho_klice"], "mistrovstvi_promen": ["umeni_promen"], "mistrovstvi_sarmu": ["umeni_sarmu"],
}
NEW_SKILL_OF = {"umeni_prepadu": "umeni_prepadu", "umeni_neferoveho_boje": "umeni_neferoveho_boje", "umeni_boje_s_plastem": "umeni_boje_s_plastem"}

IMPROV_WEAPONS = [
    {"id": "improv_jednorucni", "n": "Improvizovaná zbraň jednoruční", "cat": "Lehké krátké", "grip": "jednoruční", "kind": "melee", "dmgTypes": [],
     "att": 2, "dmg": 1, "def": 1, "reach": "1,5 sáhu", "range": "6/15", "w": None, "price": None, "req": None, "src": "PPP Zloděj s. 258", "grp": "zlodej"},
    {"id": "improv_obourucni", "n": "Improvizovaná zbraň obouruční", "cat": "Lehké", "grip": "obouruční", "kind": "melee", "dmgTypes": [],
     "att": 5, "dmg": 0, "def": 1, "reach": "1,5 sáhu", "w": None, "price": None, "req": None, "src": "PPP Zloděj s. 258", "grp": "zlodej"},
]


def trick(t: dict, skupina: str, skill: str, src: str) -> dict:
    out = {
        "id": slug(t["nazev"]), "n": t["nazev"], "skupina": skupina, "skill": skill, "zdroj": src, "strana": t["strana"],
        "cetnost": t["cetnost"], "pouziti": t["pouziti"], "overeni": t["overeni"], "popis": t["popis"],
        "boj": combat_use(t["pouziti"], t["nazev"]), "once": t["cetnost"] == "jednorázově",
    }
    if t["nazev"] in FX:
        out["fx"] = FX[t["nazev"]]
    return out


def main() -> None:
    triky = []
    for t in H12["triky"]:
        triky.append(trick(t, t["umeni"], BRANCH_SKILL[t["umeni"]], "H12"))
    for t in PPP["triky"]:
        triky.append(trick(t, t["skupina"], t["skill"], "PPP05"))
    ids = [t["id"] for t in triky]
    assert len(ids) == len(set(ids)), "duplicitní triky"
    by_group: dict[str, list[str]] = {}
    for t in triky:
        by_group.setdefault(t["skupina"], []).append(t["n"])

    schop: dict[str, dict] = {}
    for a in H12["schopnosti"]:
        schop[a["id"]] = {"name": a["nazev"], "short": a["efekt"], "text": a["efekt"], "source": "H12", "page": a["strana"], "spec": None, "minLevel": None}
    for a in PPP["obecne"]:
        schop[a["id"]] = {"name": a["nazev"], "short": a["kratce"], "text": a["popis"], "source": "PPP05", "page": a["strana"], "spec": None, "minLevel": 6}
    specs = {}
    for sid, s in PPP["specializace"].items():
        h = next(x for x in H12["specializace"] if x["id"] == sid)
        specs[sid] = {"name": s["nazev"], "page": s["strana"], "intro": s["uvod"], "popis": h["popis"], "requires": h["podminky"], "need": 2,
                      "requiresPpp": s["podminky_ppp"], "auto": [{"id": a["id"], "name": a["nazev"], "text": a["popis"]} for a in s["auto"]]}
        for a in s["volitelne"]:
            schop[a["id"]] = {"name": a["nazev"], "short": a["kratce"], "text": a["popis"], "source": "PPP05", "page": a["strana"], "spec": sid, "minLevel": 6}
    for gid, names in by_group.items():
        if gid in schop:
            schop[gid]["grantsItems"] = names
    for aid, sk in NEW_SKILL_OF.items():
        schop[aid]["grantsSkills"] = [{"id": sk, "rank": 5}]
    for aid, sks in SKILL_PLUS.items():
        schop[aid]["skillPlus"] = sks

    # Zbraně cechu: druh pro bonusy specializací (Vražedné zbraně, Improvizované zbraně, Zbraně gentlemana).
    vy_path = DATA / "vyzbroj.json"
    vy = json.loads(vy_path.read_text(encoding="utf-8"))
    have = {w["id"] for w in vy["weapons"]}
    for w in IMPROV_WEAPONS:
        if w["id"] not in have:
            vy["weapons"].append(w)
    for w in vy["weapons"]:
        z = PPP["zbrane"].get(w["id"])
        if z:
            w["zl"] = z["druh"]
            w["desc"] = z["popis"]
            if z["vyroba"]:
                w["vyroba"] = z["vyroba"]
    vy_path.write_text(json.dumps(vy, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # Nové profesní dovednosti specializací.
    sk_path = DATA / "skills.json"
    skills = json.loads(sk_path.read_text(encoding="utf-8"))
    known = {s["id"] for s in skills}
    for s in NEW_SKILLS:
        if s["id"] not in known:
            skills.append(s)
    sk_path.write_text(json.dumps(skills, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # Bomby a udělátka do obecného vybavení (černý trh Zlodějského cechu).
    g_path = DATA / "gear.json"
    gear = json.loads(g_path.read_text(encoding="utf-8"))
    gear = [g for g in gear if g.get("grp") != "zlodej"]
    for p in PPP["predmety"]:
        pa = p["parametry"]
        if p["typ"] not in ("bomba", "udelatko") or not pa.get("cena"):
            continue
        v, cur = pa["cena"]
        gear.append({"id": f"zl_{p['id']}", "n": p["nazev"], "w": pa["w"], "price": {"v": v, "cur": cur}, "md": v * 100,
                     "desc": f"{'Bomba' if p['typ'] == 'bomba' else 'Lupičské udělátko'} – černý trh Zlodějského cechu (PPP05 s. {p['strana']}). {p['popis']}", "grp": "zlodej"})
    g_path.write_text(json.dumps(gear, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    data = {
        "_source": "tools/build-zlodej.py ← docs/h12_zlodej.json (H12) + docs/ppp05_zlodej.json (PPP05 s. 239–278)",
        "pravidla": {**H12["pravidla"], **{f"ppp_{k}": v for k, v in PPP["pravidla"].items()}},
        "zaklady": H12["zaklady"],
        "umeni": [{**u, "triky": by_group.get(u["id"], [])} for u in H12["umeni"]],
        "skupiny": {**BRANCH_NAME, **{k: v["name"] for k, v in schop.items()}},
        "schopnosti": schop,
        "specializace": specs,
        "triky": triky,
        "predmety": PPP["predmety"],
        "jedy": PPP["jedy"],
        "zbrane": PPP["zbrane"],
        "sit": PPP["sit"],
        "duvernik": PPP["duvernik"],
    }
    (DATA / "zlodej.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ---- blok zloděje v progression.json
    prog_path = DATA / "progression.json"
    prog = json.loads(prog_path.read_text(encoding="utf-8"))
    abil = []
    for aid, a in schop.items():
        d = {"id": aid, "name": a["name"], "text": a["short"], "minLevel": a["minLevel"], "requiresSpecialization": a["spec"], "source": a["source"]}
        for k in ("grantsItems", "grantsSkills"):
            if a.get(k):
                d[k] = a[k]
        abil.append(d)
    prog["zlodej"] = {
        "branchLabel": "Zlodějské umění",
        "branchGrant": "dovednost na stupni 3 + 3 triky automaticky",
        "grantMode": "grantAll",
        "itemWord": "triky",
        "energyGrows": False,
        "branches": [{"id": u["id"], "name": u["nazev"], "effect": f"{u['nazev']} ({u['atribut']}) na 3. stupni",
                      "items": by_group.get(u["id"], []), "grantsSkills": [{"id": u["skill"], "rank": 3}]} for u in H12["umeni"]],
        "abilities": abil,
        "specializations": [{"id": sid, "name": s["name"], "need": 2, "requires": s["requires"],
                             "grants": [f"{a['name']}: {a['text']}" for a in s["auto"]]} for sid, s in specs.items()],
        "choose": None,
        "autoAtLevel2": None,
        "levelGrants": [{"level": 6, "text": "Pokročilý zloděj – Speciální předměty Zloděje (černý trh: bomby, zbraně cechu) a Zlodějský cech (PPP05)"}],
    }
    prog_path.write_text(json.dumps(prog, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"src/data/zlodej.json: {len(triky)} triků, {len(schop)} schopností, {len(specs)} specializace, {len(PPP['predmety'])} předmětů")


if __name__ == "__main__":
    main()
