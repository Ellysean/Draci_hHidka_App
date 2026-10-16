"""PPP04 Kouzelník → docs/ppp04_kouzelnik.json  (7c)

Vstup: docs/pravidla/PPP04_Kouzelnik_AI.json – úplný přepis textové vrstvy PPP04 (s. 191–238) po
blocích, dodal uživatel 1. 10. 2026. Výstup má schéma claude/data/ppp04_kouzelnik.json z projektu
(polozky s parametry, obor, specializace), takže ho rovnou bere tools/build-magie.py.
Schopnosti a tabulky zůstávají v projektovém souboru (ruční výtah 27. 9. 2026).
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from spell_norm import slug  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "pravidla" / "PPP04_Kouzelnik_AI.json"

FIELD_KEY = {"Mana": "mana", "Dosah": "dosah", "Rozsah": "rozsah", "Trvání": "trvani", "Vyvolání": "vyvolani",
             "Obtížnost": "obtiznost", "Vyžaduje": "vyzaduje", "Ověření": "overeni", "Základ": "zaklad"}
OBORY = ["Divoká magie", "Ochranná magie", "Mentální magie", "Magie proměn", "Vitální magie", "Vysoká magie"]
SPECS = ["Bojový mág", "Čaroděj", "Nekromant"]
LATIN = re.compile(r"^\(([^)]+)\)$")


def blocks():
    d = json.loads(SRC.read_text(encoding="utf-8"))
    for p in d["pages"]:
        for b in p["blocks"]:
            yield {**b, "pg": p["original_page"]}


def proper_names(bl):
    """Názvy v seznamech (odrážky) mají správnou velikost písmen – „Éterické ostří – Bojový mág“."""
    out = {}
    for b in bl:
        if b["type"] == "list_item":
            n = re.sub(r"^[•\-–]\s*", "", b["text"]).strip()
            n = re.split(r"\s+[–-]\s+", n)[0].strip()
            out[n.casefold()] = n
    return out


def build():
    bl = list(blocks())
    proper = proper_names(bl)
    items, i = [], 0
    while i < len(bl):
        b = bl[i]
        start = None
        if b["type"] in ("heading", "subheading") and i + 1 < len(bl):
            if bl[i + 1]["type"] == "field":
                start = i + 1
            elif (bl[i + 1]["type"] == "paragraph" and LATIN.match(bl[i + 1]["text"].strip())
                  and i + 2 < len(bl) and bl[i + 2]["type"] == "field"):
                start = i + 2
        if start is None:
            i += 1
            continue
        raw = b["text"].strip()
        m = re.match(r"^(.*?)\s*\(([^)]+)\)$", raw)
        latin = m.group(2) if m else LATIN.match(bl[i + 1]["text"].strip()).group(1) if start == i + 2 else None
        head = m.group(1) if m else raw
        name = proper.get(head.casefold()) or (head[:1] + head[1:].lower())
        par, j = {}, start
        while j < len(bl) and bl[j]["type"] == "field":
            par[FIELD_KEY.get(bl[j]["name"], slug(bl[j]["name"]))] = bl[j]["value"].strip()
            j += 1
        text = []
        while j < len(bl) and bl[j]["type"] in ("paragraph", "list_item", "note", "table"):
            if bl[j]["type"] == "table":
                text.append("\n".join(" | ".join(map(str, r)) for r in (bl[j].get("rows") or [])))
            else:
                text.append(bl[j]["text"].strip())
            j += 1
        req = [x.strip() for x in re.split(r"\s+[–-]\s+", par.get("vyzaduje", ""))]
        obor = next((x for x in req if x in OBORY), None)
        spec = next((x for x in req if x in SPECS), None)
        item = {"id": slug(name), "nazev": name, "strana": b["pg"], "latinsky": latin, "parametry": par,
                "popis": "\n".join(t for t in text if t), "typ": "kouzlo", "obor": obor}
        if spec:
            item["specializace"] = spec
        items.append(item)
        i = j
    return {
        "_zdroj": "Draci_hlidka_PPP_04_Kouzelnik.pdf s. 191–238 – strojově z docs/pravidla/PPP04_Kouzelnik_AI.json (přepis od uživatele 1. 10. 2026)",
        "_generator": "tools/ppp04_kouzelnik_src.py",
        "_poznamka": "Schopnosti, specializace a tabulky viz claude/data/ppp04_kouzelnik.json v projektu (ruční výtah 27. 9. 2026).",
        "polozky": items,
        "_statistika": {"pocet_polozek": len(items),
                        "bez_oboru": [x["nazev"] for x in items if not x["obor"]]},
    }


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs" / "ppp04_kouzelnik.json"
    data = build()
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(out, data["_statistika"])
