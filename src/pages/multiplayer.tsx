import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import type { Locale, Category, Question } from '@/types';
import questionsData from '@/data/questions';
import LanguageSelector from '@/components/LanguageSelector';
import { AuthButton } from '@/components/AuthButton';
import { useAuth } from '@/context/AuthContext';
import { useMatch } from '@/hooks/useMatch';
import { supabase } from '@/lib/supabase';

// ── Constants ─────────────────────────────────────────────────────────────────

const ERA_CATEGORIES: Record<string, string[]> = {
  'ancient-age': ['ancient-egypt', 'ancient-greece', 'roman-empire'],
  'middle-ages': ['byzantine-empire', 'crusades-chivalry', 'vikings'],
};

const ERA_DEFS = [
  { id: 'ancient-age', icon: '𓂀' },
  { id: 'middle-ages', icon: '⚜️' },
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  'ancient-egypt':     '𓂀',
  'ancient-greece':    '🏛️',
  'roman-empire':      '⚔️',
  'byzantine-empire':  '✝️',
  'crusades-chivalry': '⚜️',
  'vikings':           '🛡️',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function getDominantDifficulty(difficulties: string[]): string {
  const counts: Record<string, number> = {};
  for (const d of difficulties) counts[d] = (counts[d] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'medium';
}

// ── Shared UI pieces ──────────────────────────────────────────────────────────

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
    <polyline points="5,2 10,7 5,12" />
  </svg>
);

// ── Page ──────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

export default function MultiplayerPage() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const locale = (i18n.language as Locale) ?? 'en';

  const { user } = useAuth();
  const { createMatch } = useMatch(user?.id);

  const [step, setStep] = useState<Step>(1);
  const [selectedEraId, setSelectedEraId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [loadingCatId, setLoadingCatId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const categories = useMemo(() => {
    if (!selectedEraId) return [];
    const all = buildCategories(questionsData as Question[]);
    const allowed = ERA_CATEGORIES[selectedEraId] ?? [];
    return all.filter((cat) => allowed.includes(cat.id));
  }, [selectedEraId]);

  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100;
  const stepLabel =
    step === 1
      ? t('versus.stepEra')
      : step === 2
      ? t('versus.stepCategory')
      : t('versus.stepShare');

  function handleBack() {
    if (step === 1) router.push('/');
    else if (step === 2) setStep(1);
    else setStep(1);
  }

  function handleEraSelect(eraId: string) {
    setSelectedEraId(eraId);
    setStep(2);
  }

  async function handleCategorySelect(cat: Category) {
    if (!user) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auth_return_to', window.location.pathname);
      }
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}/auth/callback`
              : '/auth/callback',
        },
      });
      return;
    }

    setLoadingCatId(cat.id);
    try {
      const allCatQuestions = (questionsData as Question[]).filter(
        (q) => q.category === cat.id
      );
      const questionIds = shuffle(allCatQuestions).slice(0, 10).map((q) => q.id);
      const newMatchId = await createMatch(cat.id, questionIds);
      const newLink = `${window.location.origin}/vs/${newMatchId}`;
      setMatchId(newMatchId);
      setLink(newLink);
      setStep(3);
    } catch (err) {
      console.error('Failed to create match:', err);
    } finally {
      setLoadingCatId(null);
    }
  }

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleWhatsApp() {
    if (!link) return;
    const text = encodeURIComponent(`${t('versus.whatsappMessage')} ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function handleNewChallenge() {
    setStep(1);
    setSelectedEraId(null);
    setMatchId(null);
    setLink(null);
    setCopied(false);
  }

  return (
    <div className="min-h-screen bg-chronos-bg px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <header className="flex items-center px-2 h-12 relative bg-[#09090f] border-b border-white/5 mb-8 w-full">
        <button
          onClick={handleBack}
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

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="h-1 w-full bg-chronos-border rounded-full overflow-hidden">
          <div
            className="h-full bg-chronos-gold rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-chronos-muted mt-2 uppercase tracking-wider">{stepLabel}</p>
      </div>

      <main className="max-w-2xl mx-auto animate-fade-in">
        {/* ── Step 1: Era selection ── */}
        {step === 1 && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-chronos-text">
                {t('versus.selectEra')}
              </h2>
              <div className="mt-2 h-0.5 w-12 bg-chronos-gold rounded-full" />
            </div>
            <div className="flex flex-col gap-3">
              {ERA_DEFS.map((era) => (
                <button
                  key={era.id}
                  onClick={() => handleEraSelect(era.id)}
                  className="flex items-center gap-4 w-full rounded-2xl border border-chronos-border bg-chronos-card px-5 py-4 text-left hover:border-chronos-gold/50 hover:bg-chronos-card/80 transition-all duration-200 active:scale-[0.98]"
                >
                  <span className="text-3xl flex-shrink-0">{era.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-chronos-text text-base leading-tight">
                      {t(`eras.${era.id}.name`)}
                    </p>
                    <p className="text-xs text-chronos-gold/70 mt-0.5 font-medium">
                      {t(`eras.${era.id}.years`)}
                    </p>
                  </div>
                  <ChevronRight />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Category selection ── */}
        {step === 2 && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-chronos-text">
                {t('versus.selectCategory')}
              </h2>
              <div className="mt-2 h-0.5 w-12 bg-chronos-gold rounded-full" />
            </div>
            <div className="flex flex-col gap-3">
              {categories.map((cat) => {
                const dominant = getDominantDifficulty(cat.difficulties);
                const isLoading = loadingCatId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat)}
                    disabled={loadingCatId !== null}
                    className="flex items-center gap-4 w-full rounded-2xl border border-chronos-border bg-chronos-card px-5 py-4 text-left hover:border-chronos-gold/50 hover:bg-chronos-card/80 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="text-2xl flex-shrink-0">
                      {CATEGORY_ICONS[cat.id] ?? '📜'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-chronos-text text-base leading-tight truncate">
                        {cat.label[locale]}
                      </p>
                      <p className="text-xs text-chronos-muted mt-0.5">
                        {cat.count} {t('categories.questions')}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        dominant === 'easy'
                          ? 'border-emerald-800 text-emerald-400 bg-emerald-950'
                          : dominant === 'medium'
                          ? 'border-amber-800 text-amber-400 bg-amber-950'
                          : 'border-red-800 text-red-400 bg-red-950'
                      }`}
                    >
                      {t(`categories.difficulty.${dominant}`)}
                    </span>
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-chronos-muted/30 border-t-chronos-gold rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <ChevronRight />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Step 3: Share link ── */}
        {step === 3 && link && matchId && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-chronos-text">
                {t('versus.challengeReady')}
              </h2>
              <div className="mt-2 h-0.5 w-12 bg-chronos-gold rounded-full" />
            </div>

            <div className="flex flex-col gap-4">
              {/* Link box */}
              <div className="flex items-center gap-2 p-4 bg-chronos-surface rounded-xl border border-chronos-border">
                <span className="text-xs text-chronos-text truncate flex-1 font-mono">
                  {link}
                </span>
              </div>

              {/* Copy + WhatsApp */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopy}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.98] ${
                    copied
                      ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-400'
                      : 'border-chronos-gold/50 bg-chronos-card text-chronos-gold hover:bg-chronos-gold/10'
                  }`}
                >
                  {copied ? `✓ ${t('versus.copied')}` : t('versus.copyLink')}
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 px-4 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-950/50 transition-all active:scale-[0.98]"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </span>
                </button>
              </div>

              {/* Play now */}
              <button
                onClick={() => router.push(`/vs/${matchId}`)}
                className="w-full rounded-xl bg-chronos-gold px-5 py-4 text-chronos-bg font-semibold text-base hover:bg-chronos-gold-light transition-all duration-200 active:scale-[0.98]"
              >
                {t('versus.playNow')}
              </button>

              {/* New challenge */}
              <button
                onClick={handleNewChallenge}
                className="w-full rounded-xl border border-chronos-border bg-transparent px-5 py-3 text-chronos-muted text-sm font-medium hover:border-chronos-gold/40 hover:text-chronos-text transition-all duration-200 active:scale-[0.98]"
              >
                {t('versus.newChallenge')}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
