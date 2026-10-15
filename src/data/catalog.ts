// Catálogo único de eras y categorías.
// Para sumar contenido: agregá la categoría acá, su JSON en src/data/questions/ y la imagen en public/images/.

/** A historical era shown on the era-selection screen. */
export interface EraDef {
  id: string;
  icon: string;
  image: string;
  /** Category slugs that belong to this era, in display order. */
  categoryIds: string[];
  /** First year of the era (negative = BC). */
  startYear: number;
  /** Last year of the era; `null` means "until today". */
  endYear: number | null;
}

/** Visual metadata for a question category. Labels come from the questions' `category_label`. */
export interface CategoryDef {
  id: string;
  icon: string;
  image: string;
}

export const ERAS: EraDef[] = [
  {
    id: 'ancient-age',
    icon: '𓂀',
    image: '/images/ancient-age.jpg',
    categoryIds: ['ancient-egypt', 'ancient-greece', 'roman-empire'],
    startYear: -3000,
    endYear: 500,
  },
  {
    id: 'middle-ages',
    icon: '⚜️',
    image: '/images/middle-ages.jpg',
    categoryIds: ['byzantine-empire', 'crusades-chivalry', 'vikings'],
    startYear: 500,
    endYear: 1500,
  },
  {
    id: 'early-modern',
    icon: '🗺️',
    image: '/images/early-modern.jpg',
    categoryIds: ['age-of-exploration', 'the-reformation', 'the-renaissance'],
    startYear: 1500,
    endYear: 1800,
  },
  {
    id: 'modern-era',
    icon: '🌐',
    image: '/images/modern-era.jpg',
    categoryIds: ['industrial-revolution', 'world-wars', 'cold-war-space-race'],
    startYear: 1800,
    endYear: null,
  },
];

export const CATEGORIES: Record<string, CategoryDef> = {
  'ancient-egypt':      { id: 'ancient-egypt',      icon: '𓂀',  image: '/images/ancient-egypt.jpg' },
  'ancient-greece':     { id: 'ancient-greece',     icon: '🏛️', image: '/images/ancient-greece.jpg' },
  'roman-empire':       { id: 'roman-empire',       icon: '⚔️', image: '/images/roman-empire.jpg' },
  'byzantine-empire':   { id: 'byzantine-empire',   icon: '✝️', image: '/images/byzantine-empire.jpg' },
  'crusades-chivalry':  { id: 'crusades-chivalry',  icon: '⚜️', image: '/images/crusades-chivalry.jpg' },
  'vikings':            { id: 'vikings',            icon: '🛡️', image: '/images/vikings.jpg' },
  'age-of-exploration': { id: 'age-of-exploration', icon: '🧭', image: '/images/age-of-exploration.jpg' },
  'the-reformation':    { id: 'the-reformation',    icon: '📜', image: '/images/the-reformation.jpg' },
  'the-renaissance':    { id: 'the-renaissance',    icon: '🎨', image: '/images/the-renaissance.jpg' },
  // The three modern-era categories use drawn illustrations (SVG). To use a photo instead, drop a .jpg in public/images/ and change the path.
  'industrial-revolution': { id: 'industrial-revolution', icon: '🏭', image: '/images/industrial-revolution.svg' },
  'world-wars':         { id: 'world-wars',         icon: '🪖', image: '/images/world-wars.svg' },
  'cold-war-space-race': { id: 'cold-war-space-race', icon: '🚀', image: '/images/cold-war-space-race.svg' },
};

const DEFAULT_ICON = '📜';

export function getCategoryIcon(categoryId: string): string {
  return CATEGORIES[categoryId]?.icon ?? DEFAULT_ICON;
}

export function getCategoryImage(categoryId: string): string | undefined {
  return CATEGORIES[categoryId]?.image;
}

export function getEra(eraId: string | undefined): EraDef | undefined {
  return ERAS.find(era => era.id === eraId);
}

/** The era a category belongs to. */
export function getEraOfCategory(categoryId: string | undefined): EraDef | undefined {
  return ERAS.find(era => categoryId !== undefined && era.categoryIds.includes(categoryId));
}

/** Eras that have at least one category, i.e. that can be played. */
export function getPlayableEras(): EraDef[] {
  return ERAS.filter(era => era.categoryIds.length > 0);
}
