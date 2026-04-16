import { useTranslation } from 'next-i18next';
import type { Question } from '@/types';
import type { Locale } from '@/types';

interface Props {
  question: Question;
  locale: Locale;
  selectedAnswer: number | null;
  onAnswer: (index: number) => void;
}

const OPTION_LABELS = ['A', 'B'];

export default function QuestionCard({ question, locale, selectedAnswer, onAnswer }: Props) {
  const { t } = useTranslation('common');
  const answered = selectedAnswer !== null;

  return (
    <div className="flex flex-col gap-6 animate-slide-up w-full">
      {/* Difficulty badge */}
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-medium uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            question.difficulty === 'easy'
              ? 'border-emerald-800 text-emerald-400 bg-emerald-950'
              : question.difficulty === 'medium'
              ? 'border-amber-800 text-amber-400 bg-amber-950'
              : 'border-red-800 text-red-400 bg-red-950'
          }`}
        >
          {t(`categories.difficulty.${question.difficulty}`)}
        </span>
      </div>

      {/* Question text */}
      <p className="text-xl sm:text-2xl font-medium text-chronos-text leading-snug">
        {question.question[locale]}
      </p>

      {/* Answer options */}
      <div className="flex flex-col gap-3">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === question.correctIndex;

          let stateClass = 'border-chronos-border bg-chronos-card hover:border-chronos-gold/50 hover:bg-chronos-card/80';

          if (answered) {
            if (isCorrect) {
              stateClass = 'border-emerald-500 bg-emerald-950 text-emerald-200';
            } else if (isSelected && !isCorrect) {
              stateClass = 'border-red-500 bg-red-950 text-red-200';
            } else {
              stateClass = 'border-chronos-border bg-chronos-card opacity-40';
            }
          }

          return (
            <button
              key={index}
              onClick={() => !answered && onAnswer(index)}
              disabled={answered}
              className={`flex items-center gap-4 w-full rounded-xl border px-5 py-4 text-left transition-all duration-200 ${stateClass} ${
                !answered ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'
              }`}
            >
              {/* Label pill */}
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors ${
                  answered && isCorrect
                    ? 'border-emerald-400 bg-emerald-900 text-emerald-300'
                    : answered && isSelected && !isCorrect
                    ? 'border-red-400 bg-red-900 text-red-300'
                    : 'border-chronos-border bg-chronos-surface text-chronos-muted'
                }`}
              >
                {OPTION_LABELS[index]}
              </span>

              <span className="text-base leading-snug">{option[locale]}</span>

              {/* Result icon */}
              {answered && isCorrect && (
                <span className="ml-auto text-emerald-400 text-lg">✓</span>
              )}
              {answered && isSelected && !isCorrect && (
                <span className="ml-auto text-red-400 text-lg">✗</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback banner */}
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
  );
}
