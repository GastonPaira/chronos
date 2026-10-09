// Pregunta del día embebible en historywithaccent.com (iframe).
// /embed/daily                    → una pregunta del día de todo Chronos (home del blog).
// /embed/daily?story=antikythera  → una pregunta de esa historia (dentro del artículo).
// Le avisa su alto a la página que la contiene (postMessage) para que el iframe no tenga scroll.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import type { Question } from '@/types';
import questionsData from '@/data/questions';
import { getStory, getStoryLink } from '@/data/catalog';
import { pickDailyQuestion, shuffleOptions } from '@/lib/questions';
import { toLocalDateKey } from '@/lib/dates';
import ChronosLogo from '@/components/ChronosLogo';
import QuestionCard from '@/components/QuestionCard';
import { SpanishText, SpanishToggle } from '@/components/SpanishToggle';

const EMBED_HEIGHT_MESSAGE = 'chronos-embed-height';

/** Reports the content height to the parent page so the blog can size the iframe. */
function useReportHeight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.parent === window || typeof ResizeObserver === 'undefined') return;
    const send = () =>
      window.parent.postMessage({ type: EMBED_HEIGHT_MESSAGE, height: Math.ceil(el.getBoundingClientRect().height) }, '*');
    const observer = new ResizeObserver(send);
    observer.observe(el);
    send();
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function DailyEmbed() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const containerRef = useReportHeight();
  const [selected, setSelected] = useState<number | null>(null);
  const [showSpanish, setShowSpanish] = useState(false);

  const storyId = typeof router.query.story === 'string' ? router.query.story : undefined;

  // Picked on the client: the date must be the reader's local date, and the query must be ready.
  const question = useMemo<Question | null>(() => {
    if (!router.isReady) return null;
    const daily = pickDailyQuestion(questionsData as Question[], toLocalDateKey(), storyId);
    return daily ? shuffleOptions(daily) : null;
  }, [router.isReady, storyId]);

  const answered = selected !== null;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const playUrl = question
    ? `${origin}/game/${question.category}${question.story ? `?story=${question.story}` : ''}`
    : `${origin}/eras`;
  // Inside the article itself the link to the same article would be redundant.
  const story = question?.story && question.story !== storyId ? getStory(question.story) : undefined;
  const storyLink = story ? getStoryLink(story.id, 'daily_question') : undefined;

  return (
    <>
      <Head>
        <title>Chronos · {t('embed.title')}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div ref={containerRef} className="bg-chronos-bg text-chronos-text p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-chronos-gold">
            {t('embed.title')}
          </span>
          <ChronosLogo size="sm" />
        </div>

        {question ? (
          <QuestionCard question={question} selectedAnswer={selected} onAnswer={setSelected} compact />
        ) : (
          <div className="h-48" />
        )}

        {question && !answered && (
          <p className="text-xs text-chronos-muted mt-3 text-center">{t('embed.answerToSee')}</p>
        )}

        {question && answered && (
          <div className="mt-4 flex flex-col gap-3 animate-fade-in">
            <div className="rounded-xl bg-black/30 border border-white/5 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold tracking-wider text-[#f5a623]">📜 {t('reflection.title')}</span>
                <SpanishToggle open={showSpanish} onToggle={() => setShowSpanish(v => !v)} />
              </div>
              <p lang="en" className="text-[14px] text-[#d1d5db] leading-relaxed">{question.explanation.en}</p>
              {showSpanish && <SpanishText text={question.explanation.es} className="text-[13px]" />}
            </div>

            {storyLink && story && (
              <a
                href={storyLink}
                target="_top"
                className="text-[13px] text-chronos-gold hover:underline"
              >
                {t('story.readFull')}: {story.title} →
              </a>
            )}

            <a
              href={playUrl}
              target="_blank"
              rel="noopener"
              className="w-full text-center bg-chronos-gold text-chronos-bg font-semibold text-[15px] rounded-xl py-3 hover:bg-chronos-gold-light transition-colors"
            >
              {t('embed.playMore')} →
            </a>
          </div>
        )}
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
