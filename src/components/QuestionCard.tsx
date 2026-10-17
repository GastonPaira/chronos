// Tarjeta de pregunta: escena de la época, la pregunta en inglés (con español a un toque), las opciones y la respuesta.
// En modo escucha la pregunta se oye primero y el texto queda oculto hasta que el jugador lo pide o responde.

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { Question, VocabEntry } from '@/types';
import { getCategoryImage } from '@/data/catalog';
import { pickScene } from '@/data/scenes';
import { speakSentence } from '@/lib/speakWord';
import { SpanishText, SpanishToggle } from '@/components/SpanishToggle';
import GlossedText from '@/components/GlossedText';

/**
 * Props for `QuestionCard`.
 *
 * @property question - The question data to display.
 * @property selectedAnswer - Index of the option the user has chosen, or `null` before answering.
 * @property onAnswer - Called with the chosen option index. Not called once an answer is locked in.
 * @property onWordTap - Called when the player taps a glossary word in the question.
 * @property listening - Listening mode: the question is read aloud and its text stays hidden until requested.
 * @property onReveal - Called when the player asks to see the text in listening mode (they lose the ear bonus).
 */
interface Props {
  question: Question;
  selectedAnswer: number | null;
  onAnswer: (index: number) => void;
  onWordTap?: (entry: VocabEntry) => void;
  listening?: boolean;
  onReveal?: () => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const DIFFICULTY_STYLES: Record<Question['difficulty'], string> = {
  easy: 'border-emerald-800 text-emerald-400 bg-emerald-950',
  medium: 'border-amber-800 text-amber-400 bg-amber-950',
  hard: 'border-red-800 text-red-400 bg-red-950',
};

/**
 * Renders a question with 2–4 answer buttons. Content is always in English;
 * the "ES" pill reveals the Spanish version of the scene, question and options.
 *
 * After answering: the correct option turns green, a wrong selection turns red and shakes,
 * the rest fade out, and a feedback banner confirms the result.
 */
export default function QuestionCard({ question, selectedAnswer, onAnswer, onWordTap, listening = false, onReveal }: Props) {
  const { t } = useTranslation('common');
  const [showSpanish, setShowSpanish] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const cancelSpeech = useRef<(() => void) | null>(null);
  const answered = selectedAnswer !== null;
  const bgImage = getCategoryImage(question.category);
  const scene = pickScene(question.category, question.id);
  const textHidden = listening && !revealed && !answered;

  useEffect(() => {
    setShowSpanish(false);
    setRevealed(false);
  }, [question.id]);

  const listen = () => {
    cancelSpeech.current?.();
    setSpeaking(true);
    cancelSpeech.current = speakSentence(question.question.en, () => setSpeaking(false), `${question.id}_question_en`);
  };

  // In listening mode the question reads itself when it appears.
  const questionText = question.question.en;
  useEffect(() => {
    if (!listening) return;
    const timer = setTimeout(() => {
      setSpeaking(true);
      cancelSpeech.current = speakSentence(questionText, () => setSpeaking(false), `${question.id}_question_en`);
    }, 500);
    return () => {
      clearTimeout(timer);
      cancelSpeech.current?.();
      cancelSpeech.current = null;
      setSpeaking(false);
    };
  }, [listening, question.id, questionText]);

  const reveal = () => {
    setRevealed(true);
    onReveal?.();
  };

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

      <div className="relative z-10 flex flex-col gap-6 p-4">
        {/* Scene: where and when we are */}
        {scene && (
          <div className="flex flex-col gap-1 animate-scene-in">
            <p lang="en" className="text-[13px] italic leading-snug text-chronos-gold/80">📍 {scene.en}</p>
            {showSpanish && <SpanishText text={scene.es} className="text-[12px]" />}
          </div>
        )}

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

        {/* Question text, or the listening prompt */}
        <div className="flex flex-col gap-2">
          {textHidden ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-chronos-gold/30 bg-black/30 px-4 py-6 animate-fade-in">
              <button
                type="button"
                onClick={listen}
                aria-label={t('listen.replay')}
                className={`w-16 h-16 rounded-full border border-chronos-gold/60 bg-chronos-gold/10 text-2xl transition-all hover:bg-chronos-gold/20 active:scale-95 ${
                  speaking ? 'animate-pulse-gold' : ''
                }`}
              >
                🔊
              </button>
              <p className="text-sm text-chronos-muted text-center">{speaking ? t('listen.playing') : t('listen.prompt')}</p>
              <button
                type="button"
                onClick={reveal}
                className="text-xs uppercase tracking-widest text-chronos-muted underline decoration-dotted underline-offset-4 hover:text-chronos-gold transition-colors"
              >
                {t('listen.showText')}
              </button>
            </div>
          ) : (
            <GlossedText
              text={question.question.en}
              vocab={question.vocab}
              onWordTap={onWordTap}
              className="text-xl sm:text-2xl font-medium text-chronos-text leading-snug"
            />
          )}
          {showSpanish && !textHidden && <SpanishText text={question.question.es} className="text-base" />}
        </div>

        {/* Answer options */}
        <div className="flex flex-col gap-3">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === question.correctIndex;

            let stateClass = 'border-chronos-border bg-chronos-card hover:border-chronos-gold/50 hover:bg-chronos-card/80';
            if (answered) {
              if (isCorrect) stateClass = 'border-emerald-500 bg-emerald-950 text-emerald-200';
              else if (isSelected) stateClass = 'border-red-500 bg-red-950 text-red-200 animate-shake';
              else stateClass = 'border-chronos-border bg-chronos-card opacity-40';
            }

            return (
              // A div, not a button: once answered, glossary words inside the option are tappable buttons.
              <div
                key={index}
                role="button"
                tabIndex={answered ? -1 : 0}
                aria-disabled={answered}
                onClick={() => !answered && onAnswer(index)}
                onKeyDown={e => { if (!answered && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onAnswer(index); } }}
                className={`flex items-center gap-4 w-full rounded-xl border px-5 py-4 text-left transition-all duration-200 ${stateClass} ${
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

                <div className="flex flex-col gap-1">
                  {answered ? (
                    <GlossedText text={option.en} vocab={question.vocab} onWordTap={onWordTap} className="text-base leading-snug" />
                  ) : (
                    <span lang="en" className="text-base leading-snug">{option.en}</span>
                  )}
                  {showSpanish && <SpanishText text={option.es} className="text-sm not-italic" />}
                </div>

                {answered && isCorrect && <span className="ml-auto text-emerald-400 text-lg">✓</span>}
                {answered && isSelected && !isCorrect && <span className="ml-auto text-red-400 text-lg">✗</span>}
              </div>
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
