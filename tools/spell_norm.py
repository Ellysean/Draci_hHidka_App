"""Společné převodníky pro kouzla H09/H11 (7c).

Z textových polí pravidel (Duševní síla / Mana, Obtížnost, Vyvolání) dělá
strojově čitelné hodnoty pro appku. Text zůstává vždy vedle – appka ho ukazuje
hráči a strojová hodnota slouží jen pro výpočet ceny, obtížnosti a délky akce.
"""
import re
import unicodedata

NUM = {"jedna": 1, "jeden": 1, "dvě": 2, "dva": 2, "tři": 3, "čtyři": 4, "pět": 5}


def slug(text: str) -> str:
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", t.lower()).strip("_")


def parse_cost(text: str) -> dict:
    """'3' | '3 za uzdravení' | 'X' | '4 + X' | '3× úroveň cíle' | '5 (10)'."""
    t = text.strip()
    out: dict = {"text": t}
    m = re.match(r"^(\d+)\s*×\s*úroveň", t)
    if m:
        out.update(base=0, perTargetLevel=int(m.group(1)), variable=True)
        return out
    if t.upper() == "X":
        out.update(base=0, variable=True)
        return out
    m = re.match(r"^(\d+)", t)
    out["base"] = int(m.group(1)) if m else None
    m = re.search(r"\d+\s+za\s+(.+)$", t)
    if m:
        out["per"] = m.group(1)
        out["variable"] = True
    if "X" in t:
        out["variable"] = True
    m = re.search(r"\((\d+)\)", t)
    if m:
        out["alt"] = int(m.group(1))
    return out


def parse_dc(text: str) -> dict:
    """'6 (+2 za každé další)' → base 6, step 2."""
    t = text.strip()
    out: dict = {"text": t}
    m = re.match(r"^(\d+)", t)
    out["base"] = int(m.group(1)) if m else None
    m = re.search(r"\(?\+\s*(\d+)\s+za\s+([^)]+)\)?", t)
    if m:
        out["step"] = int(m.group(1))
        out["stepPer"] = m.group(2).strip()
    return out


def parse_cast(text: str) -> dict:
    """Vyvolání → {kind, n}. kind: okamzita | kratka | dlouha | kola | minuty | smeny | hodiny."""
    t = re.sub(r"^(\d+)\s*\(\d+\)", r"\1", text.strip().lower())  # „5 (10) kol“ → základ 5
    out: dict = {"text": text.strip()}
    if "okamžit" in t or t.startswith("ihned") or t.startswith("do útoku"):
        out.update(kind="okamzita", n=1)
    elif t.startswith("půl kola"):
        out.update(kind="kratka", n=1)
    elif "krátká akce" in t:
        out.update(kind="kratka", n=1)
    elif "dlouh" in t:
        m = re.match(r"^(\d+|dvě|tři)\s+dlouhé", t)
        n = 1
        if m:
            n = int(m.group(1)) if m.group(1).isdigit() else NUM[m.group(1)]
        out.update(kind="dlouha", n=n)
    elif re.match(r"^\d+\s+kol", t):
        out.update(kind="kola", n=int(re.match(r"^(\d+)", t).group(1)))
    elif re.match(r"^\d+\s+směn", t):
        out.update(kind="smeny", n=int(re.match(r"^(\d+)", t).group(1)))
    elif re.match(r"^\d+\s+hodin", t):
        out.update(kind="hodiny", n=int(re.match(r"^(\d+)", t).group(1)))
    elif re.match(r"^\d+\s+minut", t):
        out.update(kind="minuty", n=int(re.match(r"^(\d+)", t).group(1)))
    else:
        out.update(kind="jine", n=None)
    # Kolik dlouhých akcí (kol) to zabere v boji: 1 kolo = 1 dlouhá akce = 2 krátké.
    k, n = out["kind"], out["n"]
    out["rounds"] = {"okamzita": 0, "kratka": 0.5, "dlouha": n, "kola": n}.get(k)
    return out


def spell(raw: dict, *, zdroj: str, energie: str) -> dict:
    """Doplní strojová pole ke kouzlu zapsanému podle pravidel."""
    s = dict(raw)
    s.setdefault("id", slug(s["nazev"]))
    s["zdroj"] = zdroj
    s["typ"] = s.get("typ", "kouzlo")
    s["cena"] = parse_cost(s[energie])
    s["obtiznostX"] = parse_dc(s["obtiznost"])
    s["vyvolaniX"] = parse_cast(s["vyvolani"])
    s["popis"] = re.sub(r"\s+\n", "\n", s["popis"].strip())
    return s
