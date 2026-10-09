// Tarjeta de pregunta: muestra la pregunta en inglés (con español a un toque), las opciones y la respuesta.

import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { Question } from '@/types';
import { getCategoryImage } from '@/data/catalog';
import { SpanishText, SpanishToggle } from '@/components/SpanishToggle';

/**
 * Props for `QuestionCard`.
 *
 * @property question - The question data to display.
 * @property selectedAnswer - Index of the option the user has chosen, or `null` before answering.
 * @property onAnswer - Called with the chosen option index. Not called once an answer is locked in.
 * @property compact - Smaller text and no background image (used by the blog embed).
 */
interface Props {
  question: Question;
  selectedAnswer: number | null;
  onAnswer: (index: number) => void;
  compact?: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const DIFFICULTY_STYLES: Record<Question['difficulty'], string> = {
  easy: 'border-emerald-800 text-emerald-400 bg-emerald-950',
  medium: 'border-amber-800 text-amber-400 bg-amber-950',
  hard: 'border-red-800 text-red-400 bg-red-950',
};

/**
 * Renders a question with 2–4 answer buttons. Content is always in English;
 * the "ES" pill reveals the Spanish version of the question and options.
 *
 * After answering: the correct option turns green, a wrong selection turns red,
 * the rest fade out, and a feedback banner confirms the result.
 */
export default function QuestionCard({ question, selectedAnswer, onAnswer, compact = false }: Props) {
  const { t } = useTranslation('common');
  const [showSpanish, setShowSpanish] = useState(false);
  const answered = selectedAnswer !== null;
  const bgImage = compact ? undefined : getCategoryImage(question.category);

  useEffect(() => setShowSpanish(false), [question.id]);

  return (
    <div className="relative flex flex-col gap-6 animate-slide-up w-full rounded-2xl overflow-hidden">
      {bgImage && (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}
      {bgImage && (
        <div className="pointer-events-none absolute inset-0" style={{ background: 'rgba(9,9,15,0.88)' }} />
      )}

      <div className={`relative z-10 flex flex-col ${compact ? 'gap-4 p-1' : 'gap-6 p-4'}`}>
        {/* Badges + Spanish toggle */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium uppercase tracking-widest px-2 py-0.5 rounded-full border ${DIFFICULTY_STYLES[question.difficulty]}`}
          >
            {t(`categories.difficulty.${question.difficulty}`)}
          </span>
          {question.level && (
            <span className="text-xs font-semibold tracking-widest px-2 py-0.5 rounded-full border border-sky-800 text-sky-300 bg-sky-950">
              {question.level}
            </span>
          )}
          <SpanishToggle open={showSpanish} onToggle={() => setShowSpanish(v => !v)} className="ml-auto" />
        </div>

        {/* Question text */}
        <div className="flex flex-col gap-2">
          <p lang="en" className={`${compact ? 'text-lg' : 'text-xl sm:text-2xl'} font-medium text-chronos-text leading-snug`}>
            {question.question.en}
          </p>
          {showSpanish && <SpanishText text={question.question.es} className="text-base" />}
        </div>

        {/* Answer options */}
        <div className="flex flex-col gap-3">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === question.correctIndex;

            let stateClass = 'border-chronos-border bg-chronos-card hover:border-chronos-gold/50 hover:bg-chronos-card/80';
            if (answered) {
              if (isCorrect) stateClass = 'border-emerald-500 bg-emerald-950 text-emerald-200';
              else if (isSelected) stateClass = 'border-red-500 bg-red-950 text-red-200';
              else stateClass = 'border-chronos-border bg-chronos-card opacity-40';
            }

            return (
              <button
                key={index}
                onClick={() => !answered && onAnswer(index)}
                disabled={answered}
                className={`flex items-center gap-4 w-full rounded-xl border ${compact ? 'px-4 py-3' : 'px-5 py-4'} text-left transition-all duration-200 ${stateClass} ${
                  !answered ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'
                }`}
              >
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors ${
                    answered && isCorrect
                      ? 'border-emerald-400 bg-emerald-900 text-emerald-300'
                      : answered && isSelected
                      ? 'border-red-400 bg-red-900 text-red-300'
                      : 'border-chronos-border bg-chronos-surface text-chronos-muted'
                  }`}
                >
                  {OPTION_LABELS[index]}
                </span>

                <span className="flex flex-col gap-1">
                  <span lang="en" className="text-base leading-snug">{option.en}</span>
                  {showSpanish && <SpanishText text={option.es} className="text-sm not-italic" />}
                </span>

                {answered && isCorrect && <span className="ml-auto text-emerald-400 text-lg">✓</span>}
                {answered && isSelected && !isCorrect && <span className="ml-auto text-red-400 text-lg">✗</span>}
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium animate-fade-in ${
              selectedAnswer === question.correctIndex
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-red-950 text-red-300 border border-red-800'
            }`}
          >
            {selectedAnswer === question.correctIndex ? t('game.correct') : t('game.incorrect')}
          </div>
        )}
      </div>
    </div>
  );
}
