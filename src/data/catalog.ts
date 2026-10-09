// Catálogo único de eras, categorías e historias del blog.
// Para sumar contenido: agregá la categoría acá, su JSON en src/data/questions/ y la imagen en public/images/.

/** A historical era shown on the era-selection screen. */
export interface EraDef {
  id: string;
  icon: string;
  image: string;
  /** Category slugs that belong to this era, in display order. */
  categoryIds: string[];
}

/** Visual metadata for a question category. Labels come from the questions' `category_label`. */
export interface CategoryDef {
  id: string;
  icon: string;
  image: string;
}

/** An article on historywithaccent.com that has questions in Chronos. */
export interface StoryDef {
  id: string;
  title: string;
  url: string;
}

export const BLOG_URL = 'https://historywithaccent.com/';

export const ERAS: EraDef[] = [
  {
    id: 'ancient-age',
    icon: '𓂀',
    image: '/images/ancient-age.jpg',
    categoryIds: ['ancient-egypt', 'ancient-greece', 'roman-empire'],
  },
  {
    id: 'middle-ages',
    icon: '⚜️',
    image: '/images/middle-ages.jpg',
    categoryIds: ['byzantine-empire', 'crusades-chivalry', 'vikings'],
  },
  {
    id: 'early-modern',
    icon: '🗺️',
    image: '/images/early-modern.jpg',
    categoryIds: ['age-of-exploration', 'the-reformation', 'the-renaissance'],
  },
  {
    id: 'modern-era',
    icon: '🌐',
    image: '/images/modern-era.jpg',
    categoryIds: [],
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
};

export const STORIES: Record<string, StoryDef> = {
  antikythera: {
    id: 'antikythera',
    title: 'The Antikythera Mechanism: The 2,000-Year-Old Greek Computer',
    url: 'https://historywithaccent.com/antikythera-mechanism-greek-computer/',
  },
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

/** Eras that have at least one category, i.e. that can be played. */
export function getPlayableEras(): EraDef[] {
  return ERAS.filter(era => era.categoryIds.length > 0);
}

export function getStory(storyId: string | undefined): StoryDef | undefined {
  return storyId ? STORIES[storyId] : undefined;
}

/**
 * Builds a link to a blog story tagged with UTM parameters,
 * so the blog's analytics can tell how many readers Chronos sends.
 */
export function getStoryLink(storyId: string, campaign: string): string | undefined {
  const story = STORIES[storyId];
  if (!story) return undefined;
  const url = new URL(story.url);
  url.searchParams.set('utm_source', 'chronos');
  url.searchParams.set('utm_medium', 'app');
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
}
