"""Sloučí kouzla Hraničáře a Kouzelníka do src/data/magie.json  (7c)

Vstupy (v repu v docs/):
  h09_hranicar.json   ← tools/h09_hranicar_src.py
  ppp02_hranicar.json ← claude/data/ppp02_hranicar.json (projekt)
  h11_kouzelnik.json  ← tools/h11_kouzelnik_src.py
  ppp04_kouzelnik.json← claude/data/ppp04_kouzelnik.json (projekt)

Výstup: src/data/magie.json – jednotné schéma kouzla pro deník, přestup i boj:
  { id, nazev, zdroj, strana, trida, skupina, obor?, spec?, typ, cena{}, obtiznost{}, vyvolani{},
    dosah, rozsah, trvani, overeni?, stitky[], popis, learn{} }
learn.mode:
  "auto"   – hráč nevybírá; má ho, když splní `requires` (hraničář: vše; kouzelník nic)
  "pick"   – vybírá se do slotů (kouzelník: 3 na 1. úrovni, +2 za úroveň, Paměť na kouzla…)
learn.requires: seznam id větví/schopností/specializací, které musí znát (allOf)
learn.minLevel: nejnižší úroveň postavy
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from spell_norm import parse_cast, parse_cost, parse_dc, slug  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

# Skupiny PPP02 → co je odemyká (id schopnosti/specializace v progression.json).
PPP02_GROUP_REQ = {
    "Magie Hraničářského koně": ["hranicaruv_kun"],
    "Magie Hraničářského luku": ["hranicarsky_luk"],
    "Chodecká magie": ["chodecka_magie"],
    "Magie lovců monster": ["magie_lovcu_monster"],
    "Magie Chodcova meče": ["chodcuv_mec"],
    "Soustředění Duševní síly": ["soustredeni_dusevni_sily"],
    "Magické pasti": ["magicke_pasti"],
    "Druidova kouzla": ["druid"],
    "Dary přírody": ["dary_prirody"],
    "Druidské rituály": ["druidske_ritualy"],
    "Magie lesa": ["magie_lesa"],
    "Magie hvozdu": ["magie_hvozdu"],
    "Divoké pokřiky": ["divoke_pokriky"],
    "Magie smečky": ["magie_smecky"],
    "Pokročilá Magie zvířat": ["pokrocila_magie_zvirat"],
}
SMER_BY_NAME = {"Magie pocestných": "magie_pocestnych", "Magie přírody": "magie_prirody",
                "Magie zvířat": "magie_zvirat"}
OBOR_BY_NAME = {"Divoká magie": "divoka", "Magie proměn": "promen", "Mentální magie": "mentalni",
                "Ochranná magie": "ochranna", "Vitální magie": "vitalni", "Vysoká magie": "vysoka"}
SPEC_BY_NAME = {"Bojový mág": "bojovy_mag", "Čaroděj": "carodej", "Nekromant": "nekromant"}


def load(name: str):
    p = DOCS / name
    if not p.exists():
        print(f"! chybí {p} – přeskočeno", file=sys.stderr)
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def common(s: dict, *, trida: str, energie_key: str) -> dict:
    return {
        "id": s["id"], "nazev": s["nazev"], "zdroj": s["zdroj"], "strana": s.get("strana"),
        "trida": trida, "skupina": s["skupina"], "typ": s.get("typ", "kouzlo"),
        "cena": s["cena"], "obtiznost": s["obtiznostX"], "vyvolani": s["vyvolaniX"],
        "dosah": s.get("dosah"), "rozsah": s.get("rozsah"), "trvani": s.get("trvani"),
        "overeni": s.get("overeni"), "stitky": s.get("stitky", []), "popis": s["popis"],
        **({"ucinek": s["ucinek"]} if "ucinek" in s else {}),
        **({"zaklinadlo": s["zaklinadlo"]} if "zaklinadlo" in s else {}),
        **({"soustredeni": True} if s.get("soustredeni") else {}),
    }


def ppp_item(it: dict, *, trida: str, zdroj: str, energie_key: str) -> dict:
    p = it["parametry"]
    cast_text = p.get("vyvolani") or p.get("vyroba") or "–"
    out = {
        "id": it["id"], "nazev": it["nazev"], "zdroj": zdroj, "strana": it.get("strana"),
        "trida": trida, "typ": it.get("typ", "kouzlo"),
        "cena": parse_cost(p.get(energie_key, "–")),
        "obtiznost": parse_dc(p.get("obtiznost", "–")),
        "vyvolani": parse_cast(cast_text),
        "dosah": p.get("dosah"), "rozsah": p.get("rozsah"), "trvani": p.get("trvani"),
        "overeni": p.get("overeni"), "stitky": [], "popis": it["popis"].strip(),
    }
    for k in ("zaklad", "cetnost", "pouziti", "pocet", "latinsky"):
        if p.get(k) or it.get(k):
            out[k] = p.get(k) or it.get(k)
    return out


def hranicar() -> dict:
    h09, ppp = load("h09_hranicar.json"), load("ppp02_hranicar.json")
    spells = []
    for s in h09["kouzla"]:
        c = common(s, trida="hranicar", energie_key="dusevni_sila")
        req = [] if s["skupina"] == "zakladni" else [s["skupina"]]
        c["learn"] = {"mode": "auto", "requires": req}
        spells.append(c)
    if ppp:
        for it in ppp["polozky"]:
            c = ppp_item(it, trida="hranicar", zdroj="PPP02", energie_key="dusevni_sila")
            grp = it["skupiny"][0]
            c["skupina"] = slug(grp)
            if grp.startswith("Další hraničářská kouzla"):
                smer = SMER_BY_NAME[it["parametry"]["vyzaduje"]]
                # ✔ U 1. 10. 2026: od 6. úrovně automaticky, jen se znalostí směru
                c["learn"] = {"mode": "auto", "requires": [smer], "minLevel": 6}
            else:
                # ✔ U 1. 10. 2026: schopnost (nebo specializace) dá svá kouzla automaticky všechna
                c["learn"] = {"mode": "auto", "requires": PPP02_GROUP_REQ[grp]}
            spells.append(c)
    ids = [s["id"] for s in spells]
    dup = {i for i in ids if ids.count(i) > 1}
    assert not dup, f"duplicitní id hraničáře: {dup}"
    return {
        "energie": "dusevni_sila", "dovednost": "pouto_s_prirodou",
        "pravidla": h09["pravidla"], "smery": h09["smery"], "schopnosti": h09["schopnosti"],
        "specializace": h09["specializace"], "pasti": h09["pasti"], "kouzla": spells,
        "ppp": {k: ppp.get(k) for k in ("pokrocile_schopnosti", "volitelne_schopnosti", "specializace", "tabulky", "skupiny_kouzel")} if ppp else None,
    }


def kouzelnik() -> dict:
    h11, ppp = load("h11_kouzelnik.json"), load("ppp04_kouzelnik.json")
    spells = []
    for s in h11["kouzla"]:
        c = common(s, trida="kouzelnik", energie_key="mana")
        c["obor"] = s["obor"]
        req = [] if s["skupina"] == "obecna" else [f"obor_{s['skupina']}"]
        c["learn"] = {"mode": "pick", "requires": req}
        spells.append(c)
    if ppp:
        for it in ppp["polozky"]:
            c = ppp_item(it, trida="kouzelnik", zdroj="PPP04", energie_key="mana")
            obor = OBOR_BY_NAME[it["obor"]]
            c["obor"] = c["skupina"] = obor
            req = [f"obor_{obor}"]
            if it.get("specializace"):
                c["spec"] = SPEC_BY_NAME[it["specializace"]]
                req.append(c["spec"])
            if it["id"] == "pokrocila_reanimace":
                req.append("sberatel_dusi")  # Sběratel duší ho dá automaticky (nad rámec)
            # ✔ U 1. 10. 2026: kouzla pro pokročilé do běžných slotů až od 6. úrovně
            c["learn"] = {"mode": "pick", "requires": req, "minLevel": 6}
            spells.append(c)
    ids = [s["id"] for s in spells]
    dup = {i for i in ids if ids.count(i) > 1}
    assert not dup, f"duplicitní id kouzelníka: {dup}"
    return {
        "energie": "mana", "dovednost": "sesilani_kouzel",
        "pravidla": h11["pravidla"], "obecna_magie": h11["obecna_magie"], "obory": h11["obory"],
        "schopnosti": h11["schopnosti"], "specializace": h11["specializace"], "kouzla": spells,
        "ppp": {k: ppp.get(k) for k in ("pokrocile_schopnosti", "volitelne_schopnosti", "specializace", "tabulky", "skupiny_kouzel")} if ppp else None,
    }


def main():
    out = {"_generator": "tools/build-magie.py", "hranicar": hranicar(), "kouzelnik": kouzelnik()}
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "src" / "data" / "magie.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    h, k = out["hranicar"]["kouzla"], out["kouzelnik"]["kouzla"]
    print(f"{target}: hraničář {len(h)} položek, kouzelník {len(k)} kouzel")


if __name__ == "__main__":
    main()
