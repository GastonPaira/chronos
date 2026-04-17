import { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import type { Question, Locale } from '@/types';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

interface Props {
  question: Question;
  locale: Locale;
  isLast: boolean;
  onContinue: () => void;
}

export default function ReflectionPanel({ question, locale, isLast, onContinue }: Props) {
  const { t } = useTranslation('common');
  const { speak, stop, speakingId } = useTextToSpeech(locale);

  useEffect(() => {
    return () => stop();
  }, [question.id, stop]);

  return (
    <div className="flex flex-col gap-6 animate-slide-down w-full">
      {/* Historical context */}
      <div className="rounded-2xl border border-chronos-border bg-chronos-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-chronos-gold text-sm">📜</span>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-chronos-gold">
            {t('reflection.title')}
          </h3>
          <button
            onClick={() => speak(question.explanation[locale], 'explanation')}
            className="ml-auto p-1.5 rounded-lg text-chronos-muted hover:text-chronos-gold hover:bg-chronos-border transition-colors duration-150"
            aria-label={speakingId === 'explanation' ? t('audio.stop') : t('audio.read')}
            title={speakingId === 'explanation' ? t('audio.stop') : t('audio.read')}
          >
            <span className="text-base leading-none">
              {speakingId === 'explanation' ? '⏹' : '🔊'}
            </span>
          </button>
        </div>
        <p className="text-chronos-text leading-relaxed text-sm sm:text-base">
          {question.explanation[locale]}
        </p>
      </div>

      {/* Meanwhile */}
      <div className="rounded-2xl border border-chronos-border bg-chronos-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-chronos-gold text-sm">🌍</span>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-chronos-gold">
            {t('reflection.meanwhileTitle')}
          </h3>
          <button
            onClick={() => speak(question.meanwhile[locale], 'meanwhile')}
            className="ml-auto p-1.5 rounded-lg text-chronos-muted hover:text-chronos-gold hover:bg-chronos-border transition-colors duration-150"
            aria-label={speakingId === 'meanwhile' ? t('audio.stop') : t('audio.read')}
            title={speakingId === 'meanwhile' ? t('audio.stop') : t('audio.read')}
          >
            <span className="text-base leading-none">
              {speakingId === 'meanwhile' ? '⏹' : '🔊'}
            </span>
          </button>
        </div>
        <p className="text-chronos-text leading-relaxed text-sm sm:text-base">
          {question.meanwhile[locale]}
        </p>
      </div>

      {/* Reflective question */}
      <div className="rounded-2xl border border-chronos-gold/20 bg-chronos-gold/5 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-chronos-gold text-sm">💭</span>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-chronos-gold">
            {t('reflection.reflectionTitle')}
          </h3>
          <button
            onClick={() => speak(question.reflection[locale], 'reflection')}
            className="ml-auto p-1.5 rounded-lg text-chronos-muted hover:text-chronos-gold hover:bg-chronos-gold/10 transition-colors duration-150"
            aria-label={speakingId === 'reflection' ? t('audio.stop') : t('audio.read')}
            title={speakingId === 'reflection' ? t('audio.stop') : t('audio.read')}
          >
            <span className="text-base leading-none">
              {speakingId === 'reflection' ? '⏹' : '🔊'}
            </span>
          </button>
        </div>
        <p className="text-chronos-text leading-relaxed text-sm sm:text-base italic">
          {question.reflection[locale]}
        </p>
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="w-full rounded-xl bg-chronos-gold px-6 py-4 text-chronos-bg font-semibold text-base tracking-wide hover:bg-chronos-gold-light transition-all duration-200 active:scale-[0.98] shadow-lg shadow-chronos-gold/10"
      >
        {isLast ? t('reflection.finish') : t('reflection.continue')}
      </button>
    </div>
  );
}
