// Título, descripción e ícono de un logro en el idioma actual (incluye los de "categoría completada").

import { useCallback, useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import type { Locale, Question } from '@/types';
import questionsData from '@/data/questions';
import { getCategoryIcon } from '@/data/catalog';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { buildCategories } from '@/lib/questions';

export interface AchievementInfo {
  icon: string;
  title: string;
  desc: string;
}

const CATEGORY_PREFIX = 'category:';

export function useAchievementInfo(): (id: string) => AchievementInfo {
  const { t, i18n } = useTranslation('common');
  const locale = (i18n.language as Locale) ?? 'en';
  const labels = useMemo(
    () => Object.fromEntries(buildCategories(questionsData as Question[]).map(category => [category.id, category.label])),
    [],
  );

  return useCallback(
    (id: string) => {
      if (id.startsWith(CATEGORY_PREFIX)) {
        const categoryId = id.slice(CATEGORY_PREFIX.length);
        const category = labels[categoryId]?.[locale] ?? categoryId;
        return {
          icon: getCategoryIcon(categoryId),
          title: t('achievements.category.title', { category }),
          desc: t('achievements.category.desc', { category }),
        };
      }
      const def = ACHIEVEMENTS.find(achievement => achievement.id === id);
      return { icon: def?.icon ?? '🏆', title: t(`achievements.${id}.title`), desc: t(`achievements.${id}.desc`) };
    },
    [labels, locale, t],
  );
}
