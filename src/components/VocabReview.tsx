// Repaso de vocabulario al final de la ronda: tarjetas de "¿qué significa?" y "completá la frase".

import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { BLANK, type ReviewItem } from '@/lib/vocab';
import type { ReviewResult } from '@/lib/words';
import { speakWord } from '@/lib/speakWord';

interface Props {
  items: ReviewItem[];
  /** Called once with the answers given so far (all of them, or fewer if the player skipped). */
  onDone: (results: ReviewResult[]) => void;
}

const OPTION_LABELS = ['A', 'B', 'C'];

/** Shows the sentence with the blank (or the word) highlighted in gold. */
function Sentence({ item }: { item: ReviewItem }) {
  const marked = item.kind === 'cloze' ? BLANK : item.term;
  const index = item.sentence.toLowerCase().indexOf(marked.toLowerCase());
  if (index === -1) return <>{item.sentence}</>;
  return (
    <>
      {item.sentence.slice(0, index)}
      <span className="font-semibold text-chronos-gold">{item.sentence.slice(index, index + marked.length)}</span>
      {item.sentence.slice(index + marked.length)}
    </>
  );
}

export default function VocabReview({ items, onDone }: Props) {
  const { t } = useTranslation('common');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<ReviewResult[]>([]);

  const item = items[index];
  const answered = selected !== null;
  const isLast = index === items.length - 1;

  const choose = (option: number) => {
    if (answered) return;
    setSelected(option);
    setResults(prev => [...prev, { term: item.term, es: item.es, correct: option === item.correctIndex }]);
  };

  const next = () => {
    if (isLast) return onDone(results);
    setIndex(index + 1);
    setSelected(null);
  };

  return (
    <div className="flex flex-col gap-5 w-full animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-chronos-gold">{t('vocab.reviewTitle')}</p>
          <p className="text-xs text-chronos-muted mt-1">
            {t('vocab.wordOf', { current: index + 1, total: items.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDone(results)}
          className="text-xs text-chronos-muted underline underline-offset-2 hover:text-chronos-gold transition-colors"
        >
          {t('vocab.skip')}
        </button>
      </div>

      <div className="h-1 rounded-full bg-chronos-border overflow-hidden">
        <div
          className="h-full bg-chronos-gold transition-all duration-300"
          style={{ width: `${((index + (answered ? 1 : 0)) / items.length) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-chronos-border bg-chronos-card p-5 flex flex-col gap-4">
        <p className="text-sm text-chronos-muted">
          {item.kind === 'meaning' ? t('vocab.meaningPrompt') : t('vocab.clozePrompt')}
        </p>

        {item.kind === 'meaning' && (
          <div className="flex items-center gap-3">
            <span lang="en" className="text-3xl font-display text-chronos-text">{item.term}</span>
            <button
              type="button"
              onClick={() => speakWord(item.term)}
              aria-label={t('vocab.listen')}
              title={t('vocab.listen')}
              className="p-1 text-lg leading-none text-chronos-muted hover:text-chronos-gold transition-colors"
            >
              🔊
            </button>
          </div>
        )}

        <p lang="en" className="text-base leading-relaxed text-[#d1d5db]">
          <Sentence item={item} />
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {item.options.map((option, i) => {
          const isCorrect = i === item.correctIndex;
          const isSelected = i === selected;
          let state = 'border-chronos-border bg-chronos-card hover:border-chronos-gold/50';
          if (answered) {
            if (isCorrect) state = 'border-emerald-500 bg-emerald-950 text-emerald-200';
            else if (isSelected) state = 'border-red-500 bg-red-950 text-red-200';
            else state = 'border-chronos-border bg-chronos-card opacity-40';
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={answered}
              className={`flex items-center gap-4 w-full rounded-xl border px-5 py-4 text-left transition-all duration-200 ${state} ${
                answered ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'
              }`}
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-full border border-chronos-border bg-chronos-surface flex items-center justify-center text-sm font-bold text-chronos-muted">
                {OPTION_LABELS[i]}
              </span>
              <span lang={item.kind === 'meaning' ? 'es' : 'en'} className="text-base leading-snug">{option}</span>
              {answered && isCorrect && <span className="ml-auto text-emerald-400 text-lg">✓</span>}
              {answered && isSelected && !isCorrect && <span className="ml-auto text-red-400 text-lg">✗</span>}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="flex flex-col gap-3 animate-fade-in">
          <p className="text-sm text-chronos-muted">
            {selected === item.correctIndex
              ? `✓ ${t('game.correct')}`
              : item.kind === 'meaning'
                ? t('vocab.wrongMeaning', { term: item.term, es: item.es })
                : t('vocab.wrongCloze', { term: item.term, es: item.es })}
          </p>
          <button
            type="button"
            onClick={next}
            className="w-full bg-[#f5a623] text-[#09090f] font-semibold text-[15px] rounded-xl py-3 hover:bg-amber-400 transition-colors active:scale-[0.98]"
          >
            {isLast ? t('vocab.finish') : t('vocab.next')}
          </button>
        </div>
      )}
    </div>
  );
}
