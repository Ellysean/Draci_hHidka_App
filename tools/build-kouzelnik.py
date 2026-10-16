"""Kouzelník (7c.2) → src/data/kouzelnik.json + blok `kouzelnik` v src/data/progression.json

Zdroje: docs/h11_kouzelnik.json (tools/h11_kouzelnik_src.py) – 6 volitelných schopností H11, obory, pravidla;
docs/pravidla/PPP04_Kouzelnik_AI.json – úplný přepis PPP04 s. 191–212 (pokročilé schopnosti, hůl, specializace,
12 obecných schopností od 6. úrovně a 3 × 8 schopností specializací). Plné znění schopností PPP04 se bere
z přepisu (odstavce pod nadpisem), krátký popis ze souhrnných tabulek PPP04.
Kouzla jsou v src/data/magie.json (tools/build-magie.py).

✔ U 1. 10. 2026: obor kouzlo navíc nedává; kouzla pro pokročilé (PPP04) do běžných slotů až od 6. úrovně se
znalostí oboru (± specializace); podmínky specializací podle H (dva obory – PPP třetí podmínka se nepoužívá,
✔ U 22. 9. 2026); Hibernace jen Nekromant.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from spell_norm import slug  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
H11 = json.loads((ROOT / "docs" / "h11_kouzelnik.json").read_text(encoding="utf-8"))
PPP = json.loads((ROOT / "docs" / "pravidla" / "PPP04_Kouzelnik_AI.json").read_text(encoding="utf-8"))
MAGIE = json.loads((ROOT / "src" / "data" / "magie.json").read_text(encoding="utf-8"))["kouzelnik"]

# Obory: id v magie.json (obor_divoka) ↔ id větve v progression.json (divoka_magie – drží ho uložené postavy).
OBOR_BRANCH = {"obor_divoka": "divoka_magie", "obor_promen": "magie_promen", "obor_mentalni": "mentalni_magie",
               "obor_ochranna": "ochranna_magie", "obor_vitalni": "vitalni_magie", "obor_vysoka": "vysoka_magie"}
# Krátký klíč oboru u kouzla (pole `obor` v magie.json) → id větve.
OBOR_KEY = {"divoka": "divoka_magie", "promen": "magie_promen", "mentalni": "mentalni_magie",
            "ochranna": "ochranna_magie", "vitalni": "vitalni_magie", "vysoka": "vysoka_magie"}


# ---------------------------------------------------------------- přepis PPP04 → odstavce pod nadpisy

def ppp_sections():
    """{NADPIS: (strana, [odstavce])} a souhrnné tabulky {název: krátký popis}."""
    sec, short, cur = {}, {}, None
    for p in PPP["pages"]:
        if p["original_page"] > 212:
            break
        for b in p["blocks"]:
            if b["type"] in ("heading", "subheading"):
                cur = b["text"].strip().upper()
                sec.setdefault(cur, (p["original_page"], []))
            elif b["type"] == "table":
                for row in b.get("rows") or []:
                    if len(row) == 2 and str(row[0]).endswith("(S)"):
                        short[str(row[0])[:-3].strip().casefold()] = str(row[1]).strip()
            elif cur and b["type"] in ("paragraph", "list_item", "note"):
                sec[cur][1].append(b["text"].strip())
    return sec, short


SEC, SHORT = ppp_sections()


def full(name: str) -> tuple[int, str]:
    page, paras = SEC[name.upper()]
    # Zalomení odstavce uprostřed věty (s. 196, 204) – spojit s dalším.
    out: list[str] = []
    for t in paras:
        if out and not re.search(r"[.!?:“”)]$", out[-1]):
            out[-1] = out[-1] + " " + t
        else:
            out.append(t)
    return page, "\n".join(out)


# ---------------------------------------------------------------- schopnosti

# Strojové parametry schopností – appka podle nich počítá sesílání, boj a manu (rules/kouzelnik.ts).
MECH = {
    # H11
    "koncentrace_many": {"efekty": [{"target": "manaMax", "op": "add", "value": 2, "per": "level"}]},
    "kouzleni_z_knih": {"sesilani": {"castMult": 2, "dcForeignBranch": 3, "dcForeignSpec": 5, "excludes": ["rychle_kouzleni", "precizni_kouzleni"]}},
    "pamet_na_kouzla": {"extraItemsPerLevel": 1},
    "ritual_krve": {"akce": {"hpPerMana": 2, "len": "D", "capAtMax": True}},
    "rychle_kouzleni": {"sesilani": {"castMult": 0.5, "minCast": "K", "dc": 3, "optIn": True, "excludes": ["precizni_kouzleni"]}},
    # PPP04 – obecné od 6. úrovně
    "citlivost_na_vichry_many": {"nasati": {"fixed": 6}},
    "magistr_magickeho_oboru": {"repeatable": True, "param": "obor", "sesilani": {"bonusObor": 5}, "extraItems": 3},
    "posilovani_kouzel": {"sesilani": {"costQuarter": True, "dc": 1}},
    "precizni_kouzleni": {"sesilani": {"castMult": 2, "bonus": 5, "optIn": True, "excludes": ["rychle_kouzleni"]}},
    "pyrokineze": {"technika": {"len": "D", "fatigue": 1, "range": "10 sáhů × úroveň"}},
    "ritualni_kouzleni": {"sesilani": {"bonusPerWizard": 5}},
    "rychly_odpocinek": {},
    "telekineze": {"technika": {"len": "D", "fatigue": 1, "range": "10 sáhů × úroveň"}},
    "telepatie": {"technika": {"len": "D", "fatigue": 1, "range": "10 sáhů × úroveň"}},
    "transfer_many": {"technika": {"len": "D", "range": "10 sáhů"}},
    "utajene_kouzleni": {"sesilani": {"bezReci": -2, "bezGest": -2, "noArmor": True}},
    "zamena_kouzel": {"zamena": {"perLevel": "level"}},
    # Bojový mág
    "bitevni_trenink": {"efekty": [{"target": "defenseBase", "op": "add", "value": 1}], "atk": 1, "nasati": {"len": "D"}},
    "bojove_sesilani": {"sesilani": {"noInterrupt": True, "shortFree": True}},
    "energeticka_zbran": {"zbran": {"weapon": "široký meč 5/+1/+2", "shield": 2, "len": "K", "upkeep": "1 mana / 10 kol"}},
    "lamani_kouzel": {},
    "magicka_dominance": {"dominance": {"manaPerDie": 3}},
    "magicka_zranitelnost": {},
    "posilena_ochrana": {"efekty": [{"target": "defenseBase", "op": "add", "value": 2}], "sesilani": {"costObor": {"ochranna_magie": -3}}},
    "zivlomag": {},
    # Čaroděj
    "aura_moci": {},
    "hromadne_sesilani": {"sesilani": {"targets": True, "dcPerTarget": 2}},
    "magicke_obrazce": {},
    "mentalni_souboj": {"duel": {"manaPerRound": 2, "len": "D"}},
    "michani_kouzel": {},
    "podrobovani": {},
    "predkouzleni": {},
    "vladce_many": {"manaCap": 1.5},
    # Nekromant
    "dar_noci": {"sesilani": {"night": 5, "obory": ["vitalni_magie", "magie_promen"], "spec": "nekromant"}},
    "nemrtvy_druh": {},
    "nemrtve_spojeni": {},
    "pouto_smrti": {},
    "ritualni_obetovani": {},
    "sberatel_dusi": {"grantsItems": ["Pokročilá reanimace"]},
    "srazlivost_krve": {},
    "vitalni_drahy": {},
}

GENERAL6 = ["Citlivost na vichry many", "Magistr magického oboru", "Posilování kouzel", "Precizní kouzlení", "Pyrokineze",
            "Rituální kouzlení", "Rychlý odpočinek", "Telekineze", "Telepatie", "Transfer many", "Utajené kouzlení", "Záměna kouzel"]
SPECS = {
    "bojovy_mag": dict(name="Bojový mág", page=201, requires=["divoka_magie", "ochranna_magie"], pppAbility="rychle_kouzleni",
                       auto="Zbraň Bojového mága",
                       opt=["Bitevní trénink", "Bojové sesílání", "Energetická zbraň", "Lámání kouzel", "Magická dominance",
                            "Magická zranitelnost", "Posílená ochrana", "Živlomág"]),
    "carodej": dict(name="Čaroděj", page=205, requires=["mentalni_magie", "vysoka_magie"], pppAbility="kouzleni_z_knih",
                    auto="Čarodějova hůl",
                    opt=["Aura moci", "Hromadné sesílání", "Magické obrazce", "Mentální souboj", "Míchání kouzel", "Podrobování",
                         "Předkouzlení", "Vládce many"]),
    "nekromant": dict(name="Nekromant", page=209, requires=["vitalni_magie", "magie_promen"], pppAbility="ritual_krve",
                      auto="Nekromantova dýka",
                      opt=["Dar noci", "Nemrtvý druh", "Nemrtvé spojení", "Pouto smrti", "Rituální obětování", "Sběratel duší",
                           "Srážlivost krve", "Vitální dráhy"]),
}

OBOR_OPTIONS = [{"id": b["id"], "name": b["name"]} for b in json.loads((ROOT / "src" / "data" / "progression.json").read_text(encoding="utf-8"))["kouzelnik"]["branches"]]


def ability(id_, name, text, full_text, page, source, min_level=None, spec=None):
    m = MECH.get(id_, {})
    a = {"id": id_, "name": name, "text": text, "minLevel": min_level, "requiresSpecialization": spec, "source": source, "page": page}
    if m.get("extraItemsPerLevel"):
        a["extraItemsPerLevel"] = m["extraItemsPerLevel"]
    if m.get("repeatable"):
        a["repeatable"] = True
    if m.get("param") == "obor":
        a["param"] = {"key": "obor", "label": "Obor magie", "options": OBOR_OPTIONS}
    if m.get("extraItems"):
        a["extraItems"] = m["extraItems"]
    if m.get("grantsItems"):
        a["grantsItems"] = m["grantsItems"]
    detail = {"name": name, "text": text, "full": full_text, "source": source, "page": page, "spec": spec, "minLevel": min_level,
              **{k: v for k, v in m.items() if k not in ("repeatable", "param", "extraItemsPerLevel", "extraItems")}}
    return a, detail


def build():
    abilities, details = [], {}
    for s in H11["schopnosti"]:
        a, dt = ability(s["id"], s["nazev"], s["efekt"], s["efekt"], s.get("strana"), "H11")
        abilities.append(a)
        details[a["id"]] = dt
    for name in GENERAL6:
        page, txt = full(name)
        a, dt = ability(slug(name), name, SHORT[name.casefold()], txt, page, "PPP04", 6)
        abilities.append(a)
        details[a["id"]] = dt
    for sid, sp in SPECS.items():
        for name in sp["opt"]:
            page, txt = full(name)
            a, dt = ability(slug(name), name, SHORT[name.casefold()], txt, page, "PPP04", None, sid)
            abilities.append(a)
            details[a["id"]] = dt

    # Hůl (PPP04 s. 192–193) a její varianty podle specializace.
    staff_page, staff_txt = full("Schopnosti hole")
    _, ritual = full("Rituál hole")
    _, hear = full("Zaslechnutí kouzla")
    hul = {
        "page": staff_page, "ritual": ritual, "schopnosti": staff_txt,
        "manaPerLevel": 2, "oborBonus": 1, "recall": {"mana": 1, "len": "O", "range": "sáhů = úroveň"},
        "varianty": {
            "hul": {"name": "Kouzelníkova hůl", "spec": None, "manaPerLevel": 2, "castBonus": 0, "extra": []},
            "zbran": {"name": "Zbraň Bojového mága", "spec": "bojovy_mag", "manaPerLevel": 2, "castBonus": 0,
                      "extra": ["Ochrana před střelami – zbraní se lze bránit i střeleckým útokům.",
                                "Magické zranění – zasáhne-li, každý bod many z hole (ohlásit před hodem) = Zranění +1."]},
            "carodej": {"name": "Čarodějova hůl", "spec": "carodej", "manaPerLevel": 3, "castBonus": 2,
                        "extra": ["Snadnější kouzlení – s holí +2 k Sesílání kouzel.",
                                  "Ukládání many – 3 many za úroveň.",
                                  "Zvýšený dosah – kouzla s dosahem dotek až na 5 sáhů."]},
            "dyka": {"name": "Nekromantova dýka", "spec": "nekromant", "manaPerLevel": 2, "castBonus": 0, "weapon": "2/+2/+1",
                     "lifePerLevel": 2,
                     "extra": ["Uchování života – rituál 1 směna: za každé 2 obětované životy 1 uložený (nejvýš 2× úroveň); "
                               "na Hranici smrti je dýka vrátí, aby Nekromant nezemřel, pak 1 život za 10 kol do probrání.",
                               "Krev v manu – s dýkou promění Rituál krve v jednom kole až 3 životy za 3 many."]},
        },
    }
    for sid, sp in SPECS.items():
        page, txt = full(sp["auto"])
        hul["varianty"][{"bojovy_mag": "zbran", "carodej": "carodej", "nekromant": "dyka"}[sid]]["full"] = txt

    specs_prog, specs_data = [], {}
    for sid, sp in SPECS.items():
        _, intro = full(sp["name"])
        specs_prog.append({"id": sid, "name": sp["name"], "need": 2, "requires": sp["requires"],
                           "grants": [f"{sp['auto']}: obdoba Kouzelníkovy hole se schopnostmi navíc (PPP04 s. {sp['page'] + 1})"]})
        specs_data[sid] = {"name": sp["name"], "page": sp["page"], "intro": intro, "auto": sp["auto"], "requires": sp["requires"],
                           "pppAbility": sp["pppAbility"]}

    branches = []
    for o in MAGIE["obory"]:
        bid = OBOR_BRANCH[o["id"]]
        names = [next(s["nazev"] for s in MAGIE["kouzla"] if s["id"] == k) for k in o["kouzla"]]
        branches.append({"id": bid, "name": o["obor"], "items": names, "effect": o["popis"]})

    _, intro6 = full("Pokročilé schopnosti kouzelníka")
    _, friends = full("Další kouzelníkovi přátelé")
    prog = {
        "branchLabel": "Obor magie", "branchGrant": "přístup k 6 kouzlům oboru", "grantMode": "access",
        "itemWord": "kouzla", "energyGrows": True, "branches": branches, "abilities": abilities,
        "specializations": specs_prog,
        "choose": {"n": 2, "nFrom6": None, "word": "kouzla", "poolLabel": "obecná magie",
                   "pool": [next(s["nazev"] for s in MAGIE["kouzla"] if s["id"] == k) for k in MAGIE["obecna_magie"]],
                   "perBranch": None},
        "autoAtLevel2": None,
        "levelGrants": [{"level": 6, "text": "Pokročilý kouzelník: Kouzelníkova hůl (rituál), Zaslechnutí kouzla; další přátelé – had, havran, netopýr (PPP04 s. 191–195)"},
                        {"level": 6, "text": "Kouzla pro pokročilé (PPP04) – od teď v nabídce oborů, které ovládáš"}],
    }
    data = {
        "_source": "H11 (PPZ 1.2.5) + PPP04 s. 191–212 – generuje tools/build-kouzelnik.py",
        "pravidla": H11["pravidla"],
        "oborBranch": OBOR_BRANCH,
        "oborKey": OBOR_KEY,
        "schopnosti": details,
        "specializace": specs_data,
        "pokrocily": {"level": 6, "intro": intro6, "zaslechnuti": hear, "pratele": friends},
        "hul": hul,
        "trik": {"mana": 1, "len": "D", "text": H11["pravidla"]["triky"]},
    }
    return prog, data


if __name__ == "__main__":
    prog, data = build()
    p = ROOT / "src" / "data" / "progression.json"
    allp = json.loads(p.read_text(encoding="utf-8"))
    allp["kouzelnik"] = prog
    p.write_text(json.dumps(allp, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (ROOT / "src" / "data" / "kouzelnik.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"kouzelník: {len(prog['abilities'])} schopností, {len(prog['branches'])} obory, {len(prog['specializations'])} specializace")
