"""Klerik (7d) → src/data/klerik.json + blok `klerik` v src/data/progression.json

Zdroje: docs/h13_klerik.json (tools/h13_klerik_src.py) a docs/ppp06_klerik.json (tools/ppp06_klerik_src.py).

Výklady:
- prosby se neučí ze slotů – klerik zná vždy všechny, na které má nauku / schopnost (H13 „získá automaticky“);
- obecné prosby vyšší úrovně automaticky od 2. úrovně, Dar života automaticky na 6. úrovni (PPP06);
- specializace „2 ze 3“ podle H13 (✔ U 22. 9. 2026), automatická zvláštní schopnost specializace (Boj zblízka,
  Sebeovládání, Milosrdenství) se dává hned s volbou; bez specializace 1 schopnost libovolné specializace na každé 6. úrovni;
- text pravidel má přednost před souhrnnou tabulkou (✔ U 19. 9. 2026): Bohoslužby +3, Posvátná zbraň +2, Flagelantství = Zvolání.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from spell_norm import parse_cast, slug  # noqa: E402

H13 = json.loads((ROOT / "docs" / "h13_klerik.json").read_text(encoding="utf-8"))
PPP = json.loads((ROOT / "docs" / "ppp06_klerik.json").read_text(encoding="utf-8"))
PROG_PATH = ROOT / "src" / "data" / "progression.json"

# Jednotka proměnné ceny (X, slovo, kolo…) – co hráč zadává při vzývání.
UNIT = {
    "stit_viry": ("životy bariéry (X)", 0),
    "vyhnani": ("kol (X)", 1),
    "chran_pred_posednutim": ("tvorů (X)", 1),
    "vyzen_demona": ("Vyšší moc démona", 1),
    "posel_peceti": ("další kola", 0),
}

GROUP_LABEL = {
    "zakladni": "Základní prosby", "druha_uroven": "Obecné prosby vyšší úrovně (od 2. úr.)",
    **{n["id"]: f"Nauka {n['nazev']}" for n in H13["nauky"]},
    "strazce_mysteria": "Strážce mystéria", "paladinsky_vycvik": "Paladinský výcvik", "inkvizitorsky_vycvik": "Inkvizitorský výcvik",
    "exorcismus": "Exorcismus", "jazyk_prastarych": "Jazyk prastarých", "zazehnuti_aury": "Zažehnutí aury", "zazraky": "Zázraky",
    "vycvik_lazaretnich_lecitelu": "Výcvik lazaretních léčitelů (léky)",
}

# Strojové efekty proseb pro deník a boj (text pravidel zůstává v `popis`).
FX = {
    "lecive_slovo": {"heal": "1k6", "perUnit": True},
    "napraveni_tela": {"heal": "2k6"},
    "leciva_aura": {"heal": "1k6", "perRound": True, "active": {"note": "každé kolo 1k6 životů zvoleným v auře"}},
    "lek_svateho_aurelia": {"heal": "3k6"},
    "lek_svateho_jana": {"heal": "5k6+6"},
    "klidny_spanek": {"heal": "1k6+3", "sleep": True},
    "uder_moci": {"damage": "1k6+1", "perUnit": True, "half": "neúspěšné ověření = polovina"},
    "kopi_praveho_svetla": {"damage": "1k6+2", "perUnit": True, "half": "neúspěšné ověření = polovina"},
    "stit_viry": {"active": {"zo": 3, "barrier": True}, "rounds": 5},
    "aura_svateho_stitu": {"active": {"zo": 2}},
    "aura_ocelove_pesti": {"active": {"atk": 2}},
    "aura_proti_temnote": {"active": {}},
    "andelska_zbroj": {"active": {"dr": 5}, "roundsPerLevel": 1},
    "kladivo_na_carodejnice": {"active": {"weapon": "8/+5/+3"}, "roundsPerLevel": 1},
    "pozehnej_vlastnostem": {"active": {"note": "oprava jednoho atributu +1"}, "rounds": 10},
    "bozska_pomoc": {"active": {"atk": 5, "def": 5, "tempHp": True}, "roundsPerLevel": 1},
    "pozehnani_zdaru": {"active": {"next": 5}},
    "aura_bratrstvi": {"rounds": 10},
    "aura_praveho_svetla": {"active": {"def": 5}, "rounds": 5},
    "figiho_zasah_osudu": {"active": {"note": "3× změnit výsledek hodu"}},
    "zesil_zraneni": {"note": "další útok 2× zranění"},
    "utok_stesteny": {"note": "útok 2× – lepší výsledek"},
    "svata_zbroj": {"note": "reakce: pohltí zranění jednoho fyzického útoku"},
    "vraceni_uderu": {"note": "reakce: útočník ztratí ½ způsobeného zranění (svěcené)"},
    "podlom_obranu": {"note": "cíl hází obranu 2×, platí horší"},
    "zastaveni_deni": {"note": "okamžitě Iniciativa · 1× za souboj"},
    **{p: {"posel": p} for p in ("posel_bojovnik", "posel_rovnovahy", "posel_stezky", "posel_umlceni", "posel_bdelosti", "posel_domeny", "posel_lovec", "posel_peceti")},
}


def parse_cost(pid: str, t: str) -> dict:
    out: dict = {"text": t}
    m = re.search(r"\((\d+)\)\s*$", t)
    if m:
        out["alt"] = int(m.group(1))
        t = t[: m.start()].strip()
    unit = UNIT.get(pid)
    if (m := re.match(r"^(\d+)\s*[×x]\s*úroveň klerika", t, re.I)):
        out.update(base=0, perLevel=int(m.group(1)))
    elif re.match(r"^úroveň klerika", t, re.I):
        out.update(base=0, perLevel=1)
    elif (m := re.match(r"^(\d+)\s*\+\s*úroveň klerika", t, re.I)):
        out.update(base=int(m.group(1)), perLevel=1)
    elif (m := re.match(r"^(\d+)\s*\+\s*úroveň (cíle|zadržovaného tvora)", t)):
        out.update(base=int(m.group(1)), per={"cost": 1, "unit": "úroveň cíle", "min": 1})
    elif (m := re.match(r"^(\d+)\s*×\s*X", t)):
        out.update(base=0, per={"cost": int(m.group(1)), "unit": unit[0], "min": unit[1]})
    elif (m := re.match(r"^(\d+)\s*\+\s*(\d+)\s*×\s*Vyšší moc", t)):
        out.update(base=int(m.group(1)), per={"cost": int(m.group(2)), "unit": unit[0], "min": unit[1]})
    elif (m := re.match(r"^(\d+)\s*\+\s*(\d+)\s*za každé další kolo", t)):
        out.update(base=int(m.group(1)), per={"cost": int(m.group(2)), "unit": unit[0], "min": unit[1]})
    elif (m := re.match(r"^(\d+)\s*\+\s*X", t)):
        out.update(base=int(m.group(1)), per={"cost": 1, "unit": unit[0], "min": unit[1]})
    elif (m := re.match(r"^(\d+)\s*za\s+(?:každý |každé )?(.+)$", t)):
        out.update(base=0, per={"cost": int(m.group(1)), "unit": m.group(2), "min": 1})
    elif (m := re.match(r"^(\d+)$", t)):
        out.update(base=int(m.group(1)))
    else:
        raise ValueError(f"neznámá cena {pid}: {t}")
    return out


def parse_dc(t: str) -> dict:
    out: dict = {"text": t}
    m = re.match(r"^(\d+)", t)
    out["base"] = int(m.group(1)) if m else None
    m = re.search(r"\+\s*(\d+)\s+za\s+každ[éý]\s+(slovo|úder|kopí)", t)
    if m:
        out["step"] = int(m.group(1))
    return out


def rounds_of(trvani: str) -> int | None:
    m = re.match(r"^(\d+)\s+kol", trvani or "")
    return int(m.group(1)) if m else None


def prayer(p: dict, requires: list[str], min_level: int | None = None) -> dict:
    pid = slug(p["nazev"])
    lek = p["typ"] == "lek"
    q = {
        "id": pid, "nazev": p["nazev"], "zdroj": p["zdroj"], "strana": p["strana"], "skupina": p["skupina"], "typ": p["typ"],
        "cena": parse_cost(pid, p["prizen"]),
        "obtiznost": parse_dc(p["obtiznost"]),
        "vyvolani": parse_cast(p.get("vyroba" if lek else "vzyvani", "")),
        "dosah": p.get("dosah"), "rozsah": p.get("rozsah"), "trvani": p.get("trvani"), "overeni": p.get("overeni"),
        "stitky": p.get("stitky", []), "popis": p["popis"], "learn": {"requires": requires, **({"minLevel": min_level} if min_level else {})},
    }
    if p.get("temna"):
        q["temna"] = p["temna"]
    if lek:
        q.update({k: p[k] for k in ("zaklad", "vyroba", "pouziti", "cetnost", "pocet") if k in p})
    # „ihned, Klerik se musí soustředit“ → okamžitá; „počet minut…“ → mimo boj
    if q["vyvolani"]["kind"] == "jine" and p.get("vzyvani", "").startswith("ihned"):
        q["vyvolani"].update(kind="okamzita", n=1, rounds=0)
    fx = dict(FX.get(pid, {}))
    if pid.startswith("aura_") or pid == "leciva_aura":
        fx["aura"] = True
    if "dle dodané přízně" in (p.get("trvani") or ""):
        fx["roundsFromUnits"] = True
    elif "rounds" not in fx and "roundsPerLevel" not in fx and rounds_of(p.get("trvani")) and fx.get("active") is not None:
        fx["rounds"] = rounds_of(p.get("trvani"))
    if fx:
        q["fx"] = fx
    return q


def main() -> None:
    nauky = {n["id"]: n for n in H13["nauky"]}
    prosby = []
    for p in H13["prosby"]:
        g = p["skupina"]
        prosby.append(prayer(p, [] if g in ("zakladni", "druha_uroven") else [g], 2 if g == "druha_uroven" else None))
    for p in PPP["prosby"] + PPP["leky"]:
        prosby.append(prayer(p, [p["skupina"]]))
    ids = [p["id"] for p in prosby]
    assert len(ids) == len(set(ids)), "duplicitní id proseb"

    by_group: dict[str, list[str]] = {}
    for p in prosby:
        by_group.setdefault(p["skupina"], []).append(p["nazev"])

    # ---- schopnosti (texty pro záložku i přestup)
    schop: dict[str, dict] = {}
    for a in H13["schopnosti"]:
        schop[a["id"]] = {"name": a["nazev"], "text": a["efekt"], "source": "H13", "page": a["strana"], "spec": None, "minLevel": None}
    for a in PPP["volitelne"]:
        schop[a["id"]] = {"name": a["nazev"], "text": a["efekt"], "source": "PPP06", "page": a["strana"], "spec": None, "minLevel": 6}
    specs = {}
    for sid, s in PPP["specializace"].items():
        h = next(x for x in H13["specializace"] if x["id"] == sid)
        specs[sid] = {"name": s["nazev"], "page": s["strana"], "intro": s["uvod"], "popis": h["popis"], "requires": h["podminky"], "need": 2,
                      "auto": [{"id": a["id"], "name": a["nazev"], "text": a["efekt"]} for a in s["auto"]]}
        for a in s["volitelne"]:
            schop[a["id"]] = {"name": a["nazev"], "text": a["efekt"], "source": "PPP06", "page": a["strana"], "spec": sid, "minLevel": 6}
    for gid, names in by_group.items():
        if gid in schop:
            schop[gid]["grantsItems"] = names

    data = {
        "_source": "tools/build-klerik.py ← docs/h13_klerik.json (H13) + docs/ppp06_klerik.json (PPP06 s. 279–310)",
        "pravidla": {**H13["pravidla"], **{f"ppp_{k}": v for k, v in PPP["obecna_pravidla"].items()}},
        "sveceni": H13["sveceni"],
        "darZivota": PPP["dar_zivota"],
        "zakladniDovednosti": H13["zakladni_dovednosti"],
        "nauky": [{**n, "prosby": by_group.get(n["id"], [])} for n in H13["nauky"]],
        "skupiny": GROUP_LABEL,
        "schopnosti": schop,
        "specializace": specs,
        "prosby": prosby,
        "poslove": {"h13": H13["poslove"], "ppp06": PPP["poslove"]},
        "videniMany": PPP["videni_many"],
    }
    (ROOT / "src" / "data" / "klerik.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ---- blok klerika v progression.json
    prog = json.loads(PROG_PATH.read_text(encoding="utf-8"))
    old = prog["klerik"]
    abil = []
    for aid, a in schop.items():
        d = {"id": aid, "name": a["name"], "text": a["text"], "minLevel": a["minLevel"], "requiresSpecialization": a["spec"], "source": a["source"]}
        if a.get("grantsItems"):
            d["grantsItems"] = a["grantsItems"]
        abil.append(d)
    prog["klerik"] = {
        "branchLabel": "Teologická nauka",
        "branchGrant": "4 prosby automaticky + bonus",
        "grantMode": "grantAll",
        "itemWord": "prosby",
        "energyGrows": True,
        "branches": [{"id": n["id"], "name": n["nazev"], "effect": n["efekt"], "items": by_group.get(n["id"], [])} for n in H13["nauky"]],
        "abilities": abil,
        "specializations": [{"id": sid, "name": s["name"], "need": 2, "requires": s["requires"],
                             "grants": [f"{a['name']}: {a['text']}" for a in s["auto"]]} for sid, s in specs.items()],
        "choose": None,
        "autoAtLevel2": old.get("autoAtLevel2") or by_group["druha_uroven"],
        "levelGrants": [{"level": 6, "text": f"Pokročilý klerik – {PPP['dar_zivota']['nazev']}: léčivé prosby o ¼ silnější (nejméně +1 život)"}],
    }
    PROG_PATH.write_text(json.dumps(prog, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"src/data/klerik.json: {len(prosby)} položek ({sum(p['typ'] == 'lek' for p in prosby)} léků), {len(schop)} schopností, {len(specs)} specializace")


if __name__ == "__main__":
    main()
