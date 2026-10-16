# Osobní deník – Dračí hlídka

Webová appka (React + TypeScript + Vite) – digitální osobní deník postavy
s automatickými výpočty podle pravidel. Data jsou jen v prohlížeči
(localStorage), bez účtu a serveru. Plán: `docs/PLAN.md`.

## Spuštění

```bash
npm install
npm run dev        # vývojový server (http://localhost:5173)
npm test           # testy výpočtů, úložiště a stavu (vitest)
npm run build      # typová kontrola + produkční build do dist/
```

## Struktura (Fáze 2 – kostra)

```
src/
  main.tsx, App.tsx      vstup, vývojová lišta, výběr stránky
  layout/                Shell (boční panel / spodní lišta), hash routing
  pages/                 Postava (napojená na data), ostatní sekce jako kostra
  ui/                    Sheet, Ribbon, Field (Labeled/TextField/NumberField/CalcField), Icon
  theme/                 tokens.css (barvy, písmo), sheet.css (pergamen), texture.ts
  model/                 typy postavy (docs/DATA_MODEL.md), výchozí a ukázková postava
  rules/data.ts          přístup k pravidlovým datům
  rules/derive/          čisté výpočty odvozených hodnot + testy
  state/                 reducer (jediný zdroj pravdy) + React kontext s auto-ukládáním
  storage/               localStorage adaptér, schemaVersion, migrace
  data/                  pravidlová data (JSON) – rasy, povolání, dovednosti, výzbroj, tabulky
tools/                   skripty pro převod pravidel do dat (h*/ppp*_src.py → build-*.py → src/data/*.json)
docs/                    plán (PLAN.md), architektura, návrhy, výtahy z pravidel (JSON) a zálohy
```

Originální PDF pravidel a pracovní složky (`Context/`, `dh-layout/`, `Claude outputs/`) zůstávají
jen lokálně – repozitář je veřejný (viz `.gitignore`).

Zásady (viz `docs/ARCHITEKTURA.md`): ukládá se jen to, co hráč zadal;
vše odvozené počítá `derive()`; každou odvozenou hodnotu jde ručně
přepsat (`overrides`); vzhled jen přes CSS proměnné a komponenty v `src/ui`,
aby šla ve Fázi 9 vyměnit grafická vrstva.

## Nasazení (GitHub Pages)

Každý push do větve `main` spustí `.github/workflows/deploy.yml`: testy → build → publikace
na `https://<uživatel>.github.io/<repozitář>/`. Jednorázově je potřeba v repozitáři
nastavit **Settings → Pages → Source: GitHub Actions**. Build používá `base: './'`
a hash routing, takže funguje z podsložky bez další konfigurace.
