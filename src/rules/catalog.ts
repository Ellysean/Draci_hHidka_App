// Katalog pro obchod (tvorba postavy) i výběr výzbroje v deníku (Fáze 5).
// Řádky z pravidel (H15, PPP05) + vlastní položky postavy (customCatalog).
import alchemyJson from '../data/alchymie.json';
import type { AlchemyProductKind, CustomCatalogItem } from '../model/types';
import { ACCESSORIES, ARMORS, GEAR, ROBES, SHIELDS, WEAPONS, type ArmorDef, type Price, type WeaponDef } from './data';
import { priceMd } from './money';

export type CatalogKind = 'gear' | 'acc' | 'weapon' | 'armor' | 'robe' | 'shield' | 'alch' | 'custom';

export interface CatalogRow {
  kind: CatalogKind;
  id: string;
  name: string;
  md: number;
  price: Price | null;
  w: number | null;
  desc: string;
  /** Minimální oprava SIL (H15, ✔ U „min. +X“). */
  req: number | null;
  /** Kupuje se po kusech (spotřební zboží, vrhací zbraně). */
  multi: boolean;
  armor?: ArmorDef;
  weapon?: WeaponDef;
  custom?: CustomCatalogItem;
  alch?: AlchemyRow;
}

/** Alchymistický výrobek v katalogu (H10 + PPP03, recepty z alchymie.json). */
export interface AlchemyRow {
  recipeId: string;
  kind: AlchemyProductKind;
  latinName: string | null;
  source: 'H10' | 'PPP03';
  /** Účinek a pravidla z receptu (H10/PPP03). */
  rules: string | null;
  pages: string | null;
}

export const CATALOG_TABS: [CatalogKind, string][] = [
  ['gear', 'Vybavení'], ['weapon', 'Zbraně'], ['armor', 'Zbroje'], ['robe', 'Róby'], ['shield', 'Štíty'], ['acc', 'Doplňky'],
];

/** Karty obchodu při tvorbě postavy (bez alchymie – výrobky nemají v pravidlech cenu). */
export const SHOP_TABS = CATALOG_TABS;

/** Karty katalogu v deníku (navíc alchymistické výrobky). */
export const DIARY_TABS: [CatalogKind, string][] = [...CATALOG_TABS, ['alch', 'Alchymie']];

export const ALCH_KIND: Record<AlchemyProductKind, string> = { lektvar: 'lektvar', elixir: 'elixír', jed: 'jed', predmet: 'předmět', ostatni: 'ostatní' };
/** Pořadí skupin v katalogu (lektvary a elixíry nahoře). */
export const ALCH_KIND_ORDER: AlchemyProductKind[] = ['lektvar', 'elixir', 'jed', 'ostatni', 'predmet'];

/** Hmotnost tekutých výrobků = flakón 0,2 l (H15 Flakón 0,2 lb). */
export const FLASK_LB = 0.2;
const LIQUID: AlchemyProductKind[] = ['lektvar', 'elixir', 'jed'];

interface RecipeLite {
  id: string; name: string; latinName: string | null; kind: AlchemyProductKind; source?: 'H10' | 'PPP03';
  description: string | null; durationText: string | null; useText: string | null; lifespanText: string | null;
  weightLb?: number; rules: string | null; pages: string | null; tier: string;
}
const RECIPES = (alchemyJson as unknown as { recipes: RecipeLite[] }).recipes;
const clean = (t: string | null | undefined) => (t && t.trim() !== '-' ? t.trim() : '');

let alchCache: CatalogRow[] | null = null;
/** Všechny alchymistické výrobky jako řádky katalogu (seřazené podle druhu a názvu). */
export function alchemyRows(): CatalogRow[] {
  if (alchCache) return alchCache;
  alchCache = RECIPES
    .map((r): CatalogRow => {
      const desc = [
        ALCH_KIND[r.kind],
        clean(r.description),
        clean(r.durationText) && `trvání ${clean(r.durationText)}`,
        clean(r.useText) && `použití ${clean(r.useText)}`,
        clean(r.lifespanText) && `trvanlivost ${clean(r.lifespanText)}`,
        r.source === 'PPP03' ? 'PPP03' : 'H10',
      ].filter(Boolean).join(' · ');
      return {
        kind: 'alch', id: `alch:${r.id}`, name: r.name, md: 0, price: null,
        w: r.weightLb ?? (LIQUID.includes(r.kind) ? FLASK_LB : null),
        desc, req: null, multi: true,
        alch: { recipeId: r.id, kind: r.kind, latinName: r.latinName, source: r.source ?? 'H10', rules: r.rules, pages: r.pages },
      };
    })
    .sort((a, b) => ALCH_KIND_ORDER.indexOf(a.alch!.kind) - ALCH_KIND_ORDER.indexOf(b.alch!.kind) || a.name.localeCompare(b.name, 'cs'));
  return alchCache;
}

export const alchemyRowByRecipe = (recipeId: string) => alchemyRows().find((r) => r.alch!.recipeId === recipeId);

/** Hmotnost kusu výrobku (lb): z receptu, tekutiny = flakón, jinak 0 (neznámá). */
export const productWeightLb = (recipeId: string) => alchemyRowByRecipe(recipeId)?.w ?? 0;

export const WEAPON_KIND = { melee: 'tváří v tvář', ranged: 'střelná', thrown: 'vrhací' } as const;

const CUSTOM_TYPE = { weapon: 'zbraň', armor: 'zbroj', shield: 'štít', gear: 'vybavení' } as const;

export function customRow(x: CustomCatalogItem): CatalogRow {
  const w = x.weapon;
  const a = x.armor;
  const desc = [
    CUSTOM_TYPE[x.type],
    w && `Ú/Z/O ${w.attack}/${w.damage}/${w.defense} · ${WEAPON_KIND[w.kind]}`,
    a && `kvalita ${a.quality}${a.stealth ? ` · plížení ${a.stealth}` : ''}`,
    x.desc,
  ].filter(Boolean).join(' · ');
  return {
    kind: 'custom', id: x.id, name: x.name, md: priceMd(x.price), price: x.price, w: x.weightLb, desc,
    req: w?.strReq ?? a?.strReq ?? null, multi: x.type === 'gear' || w?.kind === 'thrown', custom: x,
  };
}

export function catalogRows(tab: CatalogKind, custom: CustomCatalogItem[] = [], { priced = true } = {}): CatalogRow[] {
  const has = (p: Price | null) => !priced || !!p;
  const armorRow = (k: CatalogKind, a: ArmorDef): CatalogRow => ({
    kind: k, id: a.id, name: a.n, md: priceMd(a.price), price: a.price, w: a.w, req: a.req, multi: false, armor: a,
    desc: `kvalita ${a.q} · ${a.cat}${a.stealth ? ` · plížení ${a.stealth}` : ''}${a.magicBonus ? ` · magie +${a.magicBonus}` : ''}`,
  });
  switch (tab) {
    case 'gear': return GEAR.filter((g) => has(g.price)).map((g) => ({ kind: 'gear', id: g.id, name: g.n, md: priceMd(g.price), price: g.price, w: g.w, desc: g.desc ?? '', req: null, multi: true }));
    case 'acc': return ACCESSORIES.filter((g) => has(g.price)).map((g) => ({ kind: 'acc', id: g.id, name: g.n, md: priceMd(g.price), price: g.price, w: g.w, desc: g.desc ?? '', req: null, multi: true }));
    case 'weapon': return WEAPONS.filter((w) => has(w.price)).map((w) => ({
      kind: 'weapon', id: w.id, name: w.n, md: priceMd(w.price), price: w.price, w: w.w, req: w.req, multi: w.kind === 'thrown', weapon: w,
      desc: `Ú/Z/O ${w.att}/${w.dmg}/${w.def} · ${w.cat} · ${WEAPON_KIND[w.kind]}${w.grp === 'zlodej' ? ' · PPP' : ''}`,
    }));
    case 'armor': return ARMORS.filter((a) => has(a.price) && !ROBES.includes(a)).map((a) => armorRow('armor', a));
    case 'robe': return ROBES.filter((a) => has(a.price)).map((a) => armorRow('robe', a));
    case 'shield': return SHIELDS.filter((a) => has(a.price)).map((a) => armorRow('shield', a));
    case 'alch': return alchemyRows();
    case 'custom': return custom.map(customRow);
  }
}
