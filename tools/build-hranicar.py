"""Hraničář (7c.1) → src/data/hranicar.json + blok `hranicar` v src/data/progression.json

Zdroje: docs/h09_hranicar.json (tools/h09_hranicar_src.py) a schopnosti PPP02 níže (výtah z
claude/data/ppp02_hranicar.json v projektu, s. 61–110). Kouzla jsou v src/data/magie.json (tools/build-magie.py).

✔ U 1. 10. 2026: specializace dá své pevné schopnosti automaticky (Druidova kouzla, Vytrvalost, Smečka…);
volitelné schopnosti (H09, PPP02 od 6. úrovně, schopnosti specializací) se volí při přestupu; kouzla zvolené
schopnosti dostane hraničář všechna; „Další hraničářská kouzla“ automaticky od 6. úrovně se známým směrem.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
H09 = json.loads((ROOT / "docs" / "h09_hranicar.json").read_text(encoding="utf-8"))
MAGIE = json.loads((ROOT / "src" / "data" / "magie.json").read_text(encoding="utf-8"))["hranicar"]

# Skupiny kouzel PPP02 → schopnost, která je dá (stejné jako v tools/build-magie.py)
def spells_of(req_id: str) -> list[str]:
    return [s["nazev"] for s in MAGIE["kouzla"] if s["learn"]["requires"] == [req_id]]


# ---------------------------------------------------------------- PPP02 volitelné od 6. úrovně (s. 64–68)
PPP_OPT = [
    ("bdely_spanek_schopnost", "Bdělý spánek", 64, "I ve spánku hod na Postřeh (při odpočinku Výhoda +5); při úspěchu se okamžitě probere a může se bránit. Nerušený spánek či odpočinek léčí 2× víc životů."),
    ("hranicarsky_luk", "Hraničářský luk", 64, "Výroba 1k6 dnů. Pro tvůrce +1 Útočnost, Zranění i Obrana a dostřel ×1,5. Magie luku – kouzla lze kombinovat s útokem."),
    ("hranicaruv_kun", "Hraničářův kůň", 65, "Duševní pouto s 1 jezdeckým zvířetem (navázání 1 hodina; nové až na další úrovni). Speciálních povelů tolik, kolik je bonus INT. Jízda na zvířeti +3 (nebo ji naučí na 3. stupni)."),
    ("lovcova_korist", "Lovcova kořist", 66, "Proti zvolenému typu tvorů (u humanoidů konkrétní rasa) +3 ÚČ i OČ a Výhoda +5 k hodům využívajícím znalost jejich slabin (stopování…). Každou 3. úroveň lze vzít další kategorii."),
    ("mluveni_se_zviraty", "Mluvení se zvířaty", 66, "Telepatická komunikace s běžnými (nemagickými) zvířaty – 1 otázka a 1 odpověď za kolo."),
    ("moudrost", "Moudrost", 67, "ZO může počítat z bonusu INT místo OBR; u všech dovedností může nahradit OBR za INT."),
    ("ostrazitost", "Ostražitost", 67, "Trvale +3 k Postřehu, Reflexu a Iniciativě."),
    ("spriznenost_se_zviraty", "Spřízněnost se zvířaty", 67, "Zvířata na něj neútočí, dokud se sám nezapojí do boje; Výhoda +5 k Ochočování, Uklidňování a Vyjednávání se zvířaty."),
    ("strelba_na_kratkou_vzdalenost", "Střelba na krátkou vzdálenost", 67, "Střelba na méně než 2 sáhy bez postihu −5; v této situaci +2 ke Zranění lukem a +2 do Obrany lukem."),
    ("svetobeznik", "Světoběžník", 67, "Dovednostní body 6× úroveň místo 5× úroveň (zpětná oprava)."),
    ("urputna_strelba", "Urputná střelba", 68, "Soustředěná palba na stejný cíl: za každý další šíp +1 ÚČ (max. +5); kombinuje se s Rychlou i Přesnou střelbou."),
    ("totem", "Totem", 68, "Fetiš z ostatků zvířete (1 den o samotě). Propojení 1 kolo → na 1 směnu schopnost zvířete, pak se totem rozpadne. U sebe nejvýš 1 totem."),
]
LOVCOVA_STEP = 3

SPECS = {
    "chodec": dict(name="Chodec", page=73, requires=["pruzkumnictvi", "magie_pocestnych"],
        auto=[("Vytrvalost", "Hranice únavy = 15 + oprava ODO (bez mechaniky únavy vydrží 2× víc než ostatní)."),
              ("Znalost místních poměrů", "Dovednost (INT) na 5. stupni: informace o místech, obtížnost podle hodnoty informace; po týdnu na místě Výhoda +5.")],
        grantsSkills=[{"id": "znalost_mistnich_pomeru", "rank": 5}],
        opt=[
            ("chodcuv_mec", "Chodcův meč", 74, "Zasvěcení meče (výprava 1k6 týdnů, 1× za úroveň). Pro Chodce +1 Útočnost, Zranění i Obrana, magická zbraň; uloží 2 many za úroveň (přelití 1 kolo, 1 DS za 1 manu). Kouzla meče v nulovém čase."),
            ("chodecka_magie", "Chodecká magie", 76, "Kouzla maskování stop a pachů, sledování a zastrašení."),
            ("instinkt_lovce", "Instinkt lovce", 76, "1 kolo pozorování → pozná nejslabšího a nejsilnějšího protivníka; proti nim +3 ÚČ i OČ (vyprchá týden po posledním spatření)."),
            ("jista_ruka", "Jistá ruka", 76, "Padne-li v boji na k6 jednička, hází znovu; druhý hod platí."),
            ("magicke_pasti", "Magické pasti", 76, "Umí líčit a bezpečně rozpoznat jednorázové magické pasti."),
            ("magie_lovcu_monster", "Magie lovců monster", 77, "Bojová kouzla použitelná s jakoukoli zbraní."),
            ("pozirac", "Požírač", 78, "1× denně pozře čerstvý orgán (do 2 h od smrti, tvor ≥ A1) za 1 směnu: vyléčí 1k6 a na 24 h přičte opravu atributu oběti (min. +1): srdce SIL, šlachy OBR, oči CHAR, mozek INT, játra ODO."),
            ("soustredeni_dusevni_sily", "Soustředění Duševní síly", 78, "Kouzla posílení vlastního těla a mysli (Očištění, Přizpůsobení, Utužení, Uvolnění, Zacelení)."),
        ]),
    "druid": dict(name="Druid", page=83, requires=["lecitelstvi", "magie_prirody"],
        auto=[("Druidova kouzla", "Od 6. úrovně automaticky všechna Druidova kouzla. Ve městech a civilizaci Nevýhoda −5 (lze obejít Základem – předmětem z místa, který se rozpadne)."),
              ("Druidské svěcení", "Ve hvozdu Výhoda +5 ke všem hodům na Pouto s přírodou, v běžné přírodě +3.")],
        rules=["Nesmí nosit neušlechtilé kovy (zlato a stříbro výjimečně); za každý den s kovem týden meditace ve hvozdu, jinak ztráta druidských schopností.",
               "Po zabití zvířete očistná meditace 1 směna, jinak nenačerpá Duševní sílu.",
               "Na posvátných místech (Druidský kruh: kouzla za ½ Duševní síly, Srdce hvozdu) mají druidská kouzla 2× účinek."],
        opt=[
            ("dary_prirody", "Dary přírody", 92, "Léčivé masti a odvary (Znalost přírody)."),
            ("druidova_hul", "Druidova hůl", 90, "Rituál 1 týden (vrchol o úplňkové půlnoci); nová až na další úrovni. Hůl: Útočnost 5, Zranění 1, Obrana 3; +1 k jednomu z atributů hole za každou volitelnou druidskou schopnost. Lipová: +3 magie lesa a léčivé listy; jabloňová: +3 všem druidským kouzlům a jablka; dubová: +3 magie hvozdu a žaludy (+2 DS)."),
            ("druidske_ritualy", "Druidské rituály", 93, "Na posvátném místě Výhoda +5; více Druidů v kruhu: +5 za každého podporujícího (vloží veškerou Duševní sílu)."),
            ("magie_lesa", "Magie lesa", 93, "Kouzla lesa (Bludný kořen, Listová bouřka, Povolej víly, Změna počasí…)."),
            ("magie_hvozdu", "Magie hvozdu", 93, "Mocná kouzla hvozdu (Hněv hvozdu, Koroze, Trnová stěna, Zestromovatění…)."),
            ("prostoupeni", "Prostoupení", 94, "Za 3 kola vstoupí do stromu (≥ jeho velikosti) a ovládá ho max. 1 den, 1× za 24 h; zranění stromu napůl přechází na Druida."),
            ("sila_prirody", "Síla přírody", 94, "1× denně meditace 1 směna v lese → aktuální Duševní síla až na 2× maximum; zmizí po usnutí."),
            ("vladni_prirozenym_vecem", "Vládni přirozeným věcem", 94, "Jednorázový příkaz přírodnímu nemagickému předmětu (do velikosti Druida) na 10 sáhů × úroveň; krátká akce, 1 bod únavy."),
        ]),
    "pan_zvirat": dict(name="Pán zvířat", page=103, requires=["ochocovani_zvirat", "magie_zvirat"],
        auto=[("Další zvířecí přátelé", "Ochočená zvířata získají schopnosti zvířecích přátel (např. vrána místo sokola, rys místo vlka); fyzické atributy podle druhu."),
              ("Smečka", "Více zvířecích společníků; součet jejich úrovní ≤ úroveň Pána zvířat. Při přestupu lze vycvičit jen jedno zvíře.")],
        opt=[
            ("bestie", "Bestie", 105, "Proměna za 1 kolo: OBR, ODO a SIL +3, INT a CHAR −5; nelze zbraně ani kouzla; drápy 8/+2/+2."),
            ("boj_ve_smecce", "Boj ve smečce", 105, "+1 ÚČ i OČ za každého člena smečky v boji (max. +5)."),
            ("divoke_pokriky", "Divoké pokřiky", 105, "Řevy a pokřiky, kterými burcuje smečku a děsí nepřátele."),
            ("magie_smecky", "Magie smečky", 105, "Kouzla s dosahem dotek může sesílat přes kterékoli zvíře smečky."),
            ("pokrocila_magie_zvirat", "Pokročilá Magie zvířat", 106, "Kouzla pro práci se zvířaty (Mimikry, Nakrm zvíře, Oči zvířete, Pochvala, Poslouchej)."),
            ("samanismus", "Šamanismus", 106, "Nápoj Argwe (hodina přípravy) → trans 4 směny, rozhovor s duchem zvířete, případně návrat duše do zachovalého těla; po transu obnoví ½ max. Duševní síly. 1× denně."),
            ("tvaromenic", "Tvaroměnič", 106, "Za 1 kolo převezme tělo zvířete ze smečky (vlastní tělo v transu); atributy zvířete, zůstává INT."),
            ("zvireci_sampion", "Zvířecí šampion", 107, "Jedno zvíře: +1 třída velikosti, +20 max. životů, +15 pohyblivost, +3 ÚČ i ZO; Pánovi zvířat trvale −2 max. Duševní síly."),
        ]),
}

PPP_ADVANCED = {  # automaticky každý hraničář na 6. úrovni (PPP02 s. 61–63)
    "level": 6,
    "skills": [
        {"id": "vyroba_sipu", "name": "Výroba šípů", "attr": "obr", "rank": 5, "text": "Výroba 1 šípu = 1 směna. Šíp na míru (obt. 10): +1 Útočnost i Zranění za každých 5 stupňů dovednosti, jen pro jednu zbraň. Hvízdavý šíp (obt. 7). Šíp se zpětnými háčky (obt. 10): vytažení = 1k6 zranění."},
        {"id": "pohyb_v_terenu", "name": "Pohyb v terénu", "attr": "obr", "rank": 5, "text": "Úspěch = překoná překážku či těžký terén bez postihu k rychlosti a zcela tiše."},
        {"id": "prirodni_prekazky", "name": "Přírodní překážky", "attr": "obr", "rank": 5, "text": "Za hodinu změní 100 čtv. sáhů na obtížný terén (poloviční rychlost pro neznalé). Za 1 směnu tolik polovičních krytů (+3 ZO proti střelbě), kolik je stupeň dovednosti."},
    ],
    "spells": "Další hraničářská kouzla – ke každému známému směru 2 kouzla (Ochrana před smečkou, Odvracení zvířat · Ochrana před zimou, Sledování · Úder nenávisti, Uzdrav těžká zranění).",
}


def ability(id_, name, text, min_level=None, spec=None, source="H09", page=None, **extra):
    a = {"id": id_, "name": name, "text": text, "minLevel": min_level, "requiresSpecialization": spec, "source": source}
    if page:
        a["page"] = page
    items = spells_of(id_)
    if items:
        a["grantsItems"] = items
    a.update(extra)
    return a


def build():
    abilities = []
    for s in H09["schopnosti"]:
        extra = {}
        if s.get("grantsSkill"):
            extra["grantsSkills"] = [{"id": s["grantsSkill"]["id"], "rank": 3}]
        if s.get("grantsSkills"):
            extra["grantsSkills"] = [{"id": g["id"], "rank": 3} for g in s["grantsSkills"]]
        abilities.append(ability(s["id"], s["nazev"], s["efekt"], page=s.get("strana"), **extra))
    for id_, name, page, text in PPP_OPT:
        extra = {"repeatable": True, "levelStep": LOVCOVA_STEP} if id_ == "lovcova_korist" else {}
        abilities.append(ability(id_, name, text, 6, None, "PPP02", page, **extra))
    for sid, sp in SPECS.items():
        for id_, name, page, text in sp["opt"]:
            abilities.append(ability(id_, name, text, None, sid, "PPP02", page))

    branches = [{"id": s["id"], "name": s["nazev"], "effect": s["efekt"],
                 "items": [k["nazev"] for k in H09["kouzla"] if k["skupina"] == s["id"]]} for s in H09["smery"]]
    specs = []
    for sid, sp in SPECS.items():
        grants = [f"{n}: {t}" for n, t in sp["auto"]]
        druid = spells_of(sid)
        if druid:
            grants.append("Druidova kouzla: " + ", ".join(druid))
        specs.append({"id": sid, "name": sp["name"], "need": 2, "requires": sp["requires"], "grants": grants,
                      **({"grantsSkills": sp["grantsSkills"]} if sp.get("grantsSkills") else {})})

    prog = {
        "branchLabel": "Směr magie", "branchGrant": "3 kouzla automaticky + bonus", "grantMode": "grantAll",
        "itemWord": "kouzla", "energyGrows": True, "branches": branches, "abilities": abilities,
        "specializations": specs, "choose": None, "autoAtLevel2": None,
        "levelGrants": [{"level": 6, "text": f"Pokročilý hraničář: {', '.join(x['name'] for x in PPP_ADVANCED['skills'])} na 5. stupni",
                         "grantsSkills": [{"id": x["id"], "rank": 5} for x in PPP_ADVANCED["skills"]]},
                        {"level": 6, "text": PPP_ADVANCED["spells"]}],
    }
    data = {
        "_source": "H09 (PPZ 1.2.5) + PPP02 s. 61–110 – generuje tools/build-hranicar.py",
        "pravidla": H09["pravidla"],
        "smery": H09["smery"],
        "schopnosti": {a["id"]: {"name": a["name"], "text": a["text"], "source": a["source"], "page": a.get("page"),
                                 "spec": a["requiresSpecialization"], "minLevel": a["minLevel"]} for a in abilities},
        "specializace": {sid: {"name": sp["name"], "page": sp["page"], "auto": [{"name": n, "text": t} for n, t in sp["auto"]],
                               "rules": sp.get("rules", []), "requires": sp["requires"]} for sid, sp in SPECS.items()},
        "pokrocily": PPP_ADVANCED,
        "pasti": H09["pasti"],
    }
    return prog, data


if __name__ == "__main__":
    prog, data = build()
    p = ROOT / "src" / "data" / "progression.json"
    allp = json.loads(p.read_text(encoding="utf-8"))
    allp["hranicar"] = prog
    p.write_text(json.dumps(allp, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (ROOT / "src" / "data" / "hranicar.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"hraničář: {len(prog['abilities'])} schopností, {len(prog['branches'])} směry, {len(prog['specializations'])} specializace")
