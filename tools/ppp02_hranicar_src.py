"""PPP02 Hraničář → docs/ppp02_hranicar.json  (7c)

Vstup: docs/pravidla/PPP02_Hranicar_AI.json – úplný přepis textové vrstvy PPP02 (s. 61–110) po
blocích (heading / field / paragraph / list_item / table…), dodal uživatel 1. 10. 2026.
Výstup má stejné schéma jako claude/data/ppp02_hranicar.json v projektu (polozky + skupiny_kouzel),
takže ho rovnou bere tools/build-magie.py. Schopnosti a tabulky zůstávají v projektovém souboru
(ruční výtah) – sem se přenáší jen to, co jde spolehlivě strojově: kouzla, pasti a odvary.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from spell_norm import slug  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "pravidla" / "PPP02_Hranicar_AI.json"

FIELD_KEY = {
    "Duševní síla": "dusevni_sila", "Dosah": "dosah", "Rozsah": "rozsah", "Trvání": "trvani",
    "Vyvolání": "vyvolani", "Obtížnost": "obtiznost", "Obtížnosť": "obtiznost", "Vyžaduje": "vyzaduje",
    "Základ": "zaklad", "Výroba": "vyroba", "Četnost": "cetnost", "Použití": "pouziti",
    "Ověření": "overeni", "Účinek": "ucinek",
}
# Skupina podle pole Vyžaduje, když název není v žádném seznamu skupin.
GROUP_BY_REQ = {
    "Magické pasti": "Magické pasti",
    "Druidské odvary": "Dary přírody",
}
GROUP_ALIAS = {"Kouzla lovců monster jsou": "Magie lovců monster"}
TYP_BY_GROUP = {"Magické pasti": "past", "Dary přírody": "odvar"}


def blocks():
    d = json.loads(SRC.read_text(encoding="utf-8"))
    for p in d["pages"]:
        for b in p["blocks"]:
            yield {**b, "pg": p["original_page"]}


def group_lists(bl):
    """Podnadpis + odrážky = seznam kouzel skupiny (s. 69 a úvody schopností)."""
    groups, cur = {}, None
    for b in bl:
        if b["type"] == "subheading":
            cur = GROUP_ALIAS.get(b["text"].strip().rstrip(":").strip(), b["text"].strip().rstrip(":").strip())
        elif b["type"] == "list_item" and cur:
            name = re.sub(r"^[•\-–]\s*", "", b["text"]).strip()
            name = re.sub(r"\s*\([^)]*\)$", "", name)  # „Ochrana před smečkou (Magie zvířat)“
            groups.setdefault(cur, [])
            if name not in groups[cur]:
                groups[cur].append(name)
        elif b["type"] in ("heading", "paragraph", "field"):
            cur = None if b["type"] != "paragraph" else cur
    return {g: v for g, v in groups.items() if v}


def build():
    bl = list(blocks())
    groups = group_lists(bl)
    proper = {n.casefold(): n for v in groups.values() for n in v}
    member = {}
    for g, names in groups.items():
        key = "Další hraničářská kouzla (od 6. úr.)" if g.startswith("Další hraničářská") else g
        for n in names:
            member.setdefault(n.casefold(), key)

    items = []
    i = 0
    while i < len(bl):
        b = bl[i]
        if b["type"] in ("heading", "subheading") and i + 1 < len(bl) and bl[i + 1]["type"] == "field":
            raw = b["text"].strip()
            name = proper.get(raw.casefold()) or (raw[:1] + raw[1:].lower() if raw.isupper() else raw)
            par, text, j = {}, [], i + 1
            while j < len(bl) and bl[j]["type"] == "field":
                par[FIELD_KEY.get(bl[j]["name"], slug(bl[j]["name"]))] = bl[j]["value"].strip()
                j += 1
            while j < len(bl) and bl[j]["type"] in ("paragraph", "list_item", "note", "table"):
                nxt = bl[j + 1] if j + 1 < len(bl) else None
                # další položka začíná nadpisem, za kterým jdou pole
                if bl[j]["type"] == "table":
                    rows = bl[j].get("rows") or []
                    text.append("\n".join(" | ".join(map(str, r)) for r in rows))
                else:
                    text.append(bl[j]["text"].strip())
                j += 1
                if nxt and nxt["type"] in ("heading", "subheading"):
                    break
            grp = member.get(name.casefold()) or GROUP_BY_REQ.get(par.get("vyzaduje", ""))
            if not grp and "vyroba" in par and "Pouto" in par.get("obtiznost", ""):
                grp = "Magické pasti"           # s. 76–77, pasti nemají pole Vyžaduje
            if not grp and 88 <= int(b["pg"]) <= 90:
                grp = "Druidova kouzla"         # s. 88–90, Druid je dostane automaticky (✔ U)
            grp = grp or "?"
            items.append({
                "id": slug(name), "nazev": name, "strana": b["pg"], "parametry": par,
                "popis": "\n".join(t for t in text if t),
                "typ": TYP_BY_GROUP.get(grp, "kouzlo"), "skupiny": [grp],
            })
            i = j
            continue
        i += 1
    return {
        "_zdroj": "Draci_hlidka_PPP_02_Hranicar.pdf s. 61–110 – strojově z docs/pravidla/PPP02_Hranicar_AI.json (přepis od uživatele 1. 10. 2026)",
        "_generator": "tools/ppp02_hranicar_src.py",
        "_poznamka": "Schopnosti, specializace a tabulky viz claude/data/ppp02_hranicar.json v projektu (ruční výtah 27. 9. 2026).",
        "skupiny_kouzel": groups,
        "polozky": items,
        "_statistika": {"pocet_polozek": len(items),
                        "bez_skupiny": [x["nazev"] for x in items if x["skupiny"] == ["?"]]},
    }


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs" / "ppp02_hranicar.json"
    data = build()
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(out, data["_statistika"])
