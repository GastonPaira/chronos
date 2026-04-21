import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import type { Locale, Category, Question } from '@/types';
import questionsData from '@/data/questions';
import LanguageSelector from '@/components/LanguageSelector';
import CategoryCard from '@/components/CategoryCard';
import { AuthButton } from '@/components/AuthButton';
import { useAuth } from '@/context/AuthContext';
import { useMatch } from '@/hooks/useMatch';
import { supabase } from '@/lib/supabase';

const ERA_CATEGORIES: Record<string, string[]> = {
  'ancient-age':  ['ancient-egypt', 'ancient-greece', 'roman-empire'],
  'middle-ages':  ['byzantine-empire', 'crusades-chivalry', 'vikings'],
  'early-modern': [],
  'modern-era':   [],
};

function buildCategories(questions: Question[]): Category[] {
  const map = new Map<string, Category>();
  for (const q of questions) {
    const existing = map.get(q.category);
    if (existing) {
      existing.count++;
      existing.difficulties.push(q.difficulty);
    } else {
      map.set(q.category, {
        id: q.category,
        label: q.category_label,
        count: 1,
        difficulties: [q.difficulty],
      });
    }
  }
  return Array.from(map.values());
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface ChallengeModal {
  visible: boolean;
  matchId: string;
  link: string;
  copied: boolean;
}

const CHALLENGE_MODAL_CLOSED: ChallengeModal = { visible: false, matchId: '', link: '', copied: false };

export default function Categories() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const locale = (i18n.language as Locale) ?? 'en';
  const eraId = router.isReady ? (router.query.era as string | undefined) : undefined;

  const { user } = useAuth();
  const { createMatch } = useMatch(user?.id);

  const [challengeModal, setChallengeModal] = useState<ChallengeModal>(CHALLENGE_MODAL_CLOSED);
  const [challengeLoading, setChallengeLoading] = useState<string | null>(null);

  const categories = useMemo(() => {
    const all = buildCategories(questionsData as Question[]);
    if (!eraId || !ERA_CATEGORIES[eraId]) return all;
    const allowed = ERA_CATEGORIES[eraId];
    return all.filter(cat => allowed.includes(cat.id));
  }, [eraId]);

  async function handleChallenge(cat: Category) {
    if (!user) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: typeof window !== 'undefined' ? window.location.href : undefined },
      });
      return;
    }

    setChallengeLoading(cat.id);
    try {
      const allCatQuestions = (questionsData as Question[]).filter(q => q.category === cat.id);
      const questionIds = shuffle(allCatQuestions).slice(0, 10).map(q => q.id);
      const matchId = await createMatch(cat.id, questionIds);
      const link = `${window.location.origin}/vs/${matchId}`;
      setChallengeModal({ visible: true, matchId, link, copied: false });
    } catch (err) {
      console.error('Failed to create match:', err);
    } finally {
      setChallengeLoading(null);
    }
  }

  function closeModal() {
    setChallengeModal(CHALLENGE_MODAL_CLOSED);
  }

  function copyLink() {
    navigator.clipboard.writeText(challengeModal.link).then(() => {
      setChallengeModal(m => ({ ...m, copied: true }));
      setTimeout(() => setChallengeModal(m => ({ ...m, copied: false })), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-chronos-bg px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <header className="flex items-center px-2 h-12 relative bg-[#09090f] border-b border-white/5 mb-8 w-full">
        <button
          onClick={() => router.push(eraId ? '/eras' : '/')}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,2 4,7 9,12" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5 ml-auto">
          <LanguageSelector />
          <AuthButton />
        </div>
      </header>

      {/* Step indicator (only when navigating from era selection) */}
      {eraId && (
        <div className="max-w-2xl mx-auto mb-8 flex items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full border border-chronos-gold/40 text-chronos-gold/60 text-xs font-bold flex items-center justify-center flex-shrink-0">
              ✓
            </div>
            <span className="text-xs text-chronos-muted uppercase tracking-wider">
              {t('eras.stepEra')}
            </span>
          </div>
          <div className="flex-1 h-px bg-chronos-gold/30" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-chronos-gold text-chronos-bg text-xs font-bold flex items-center justify-center flex-shrink-0">
              2
            </div>
            <span className="text-xs text-chronos-gold font-medium uppercase tracking-wider">
              {t('eras.stepCategory')}
            </span>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold text-chronos-text">
          {t('categories.title')}
        </h2>
        <div className="mt-2 h-0.5 w-12 bg-chronos-gold rounded-full" />
      </div>

      {/* Category grid */}
      <main className="max-w-2xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up">
          {categories.map((cat) => (
            <div key={cat.id} className="flex flex-col gap-2">
              <CategoryCard
                category={cat}
                locale={locale}
                onClick={() => router.push(eraId ? `/game/${cat.id}?era=${eraId}` : `/game/${cat.id}`)}
              />
              <button
                onClick={() => handleChallenge(cat)}
                disabled={challengeLoading === cat.id}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-chronos-border bg-chronos-card px-4 py-2.5 text-sm text-chronos-muted font-medium hover:border-chronos-gold/40 hover:text-chronos-gold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {challengeLoading === cat.id ? (
                  <span className="w-4 h-4 border-2 border-chronos-muted/30 border-t-chronos-gold rounded-full animate-spin" />
                ) : (
                  <span>⚔️</span>
                )}
                {t('versus.challengeFriend')}
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Challenge modal */}
      {challengeModal.visible && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-sm bg-chronos-card border border-chronos-border rounded-2xl p-6 flex flex-col gap-4 animate-slide-up">
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h3 className="text-chronos-gold font-semibold text-base">
                ⚔️ {t('versus.challengeReady')}
              </h3>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-chronos-muted"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-chronos-muted">{t('versus.shareLink')}</p>

            {/* Link box */}
            <div className="flex items-center gap-2 p-3 bg-chronos-surface rounded-xl border border-chronos-border">
              <span className="text-xs text-chronos-text truncate flex-1 font-mono">
                {challengeModal.link}
              </span>
            </div>

            {/* Copy button */}
            <button
              onClick={copyLink}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.98] ${
                challengeModal.copied
                  ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-400'
                  : 'border-chronos-gold/50 bg-chronos-card text-chronos-gold hover:bg-chronos-gold/10'
              }`}
            >
              {challengeModal.copied ? `✓ ${t('versus.copied')}` : t('versus.copyLink')}
            </button>

            {/* Play now */}
            <button
              onClick={() => router.push(`/vs/${challengeModal.matchId}`)}
              className="w-full rounded-xl bg-chronos-gold px-4 py-3 text-chronos-bg font-semibold hover:bg-chronos-gold-light transition-all active:scale-[0.98]"
            >
              {t('versus.playNow')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
