// Panel de reflexión: muestra contexto histórico, "mientras tanto" y reflexión con audio opcional.

import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { Question, Locale } from '@/types';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

/**
 * Props for `ReflectionPanel`.
 *
 * @property question - The question whose educational content will be displayed.
 * @property locale - Active locale for rendering translated text.
 * @property isLast - When `true`, the continue button shows "Finish" instead of "Continue".
 * @property onContinue - Called when the user taps the continue/finish button.
 */
interface Props {
  question: Question;
  locale: Locale;
  isLast: boolean;
  onContinue: () => void;
}

/**
 * Small inline chevron icon that rotates 180° when the section is expanded.
 *
 * @property rotated - When `true`, the chevron points upward (section is open).
 */
const ChevronIcon = ({ rotated }: { rotated: boolean }) => (
  <svg
    width="12" height="12" viewBox="0 0 24 24"
    fill="none" stroke="#6b7280" strokeWidth="2"
    className={`transition-transform duration-200 flex-shrink-0 ${rotated ? 'rotate-180' : ''}`}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/**
 * Renders the post-answer educational panel with three expandable sections:
 * 1. **Historical Context** (`explanation`) – always starts expanded.
 * 2. **Meanwhile** (`meanwhile`) – what else was happening in the world.
 * 3. **Reflect on This** (`reflection`) – an open-ended thinking prompt.
 *
 * Each section has a toggle button and, when the device supports it,
 * a text-to-speech button powered by `useTextToSpeech`. Audio is stopped
 * automatically when the question changes or when the component unmounts.
 *
 * Side effects: calls `stop()` from `useTextToSpeech` on question change and unmount.
 */
export default function ReflectionPanel({ question, locale, isLast, onContinue }: Props) {
  const { t } = useTranslation('common');
  const { speak, stop, speakingId, isSupported } = useTextToSpeech(locale);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    context: true,
    meanwhile: false,
    reflect: false,
  });

  useEffect(() => {
    return () => stop();
  }, [question.id, stop]);

  // Reset expanded state when question changes so the context section is always open first.
  useEffect(() => {
    setExpanded({ context: true, meanwhile: false, reflect: false });
  }, [question.id]);

  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col w-full animate-slide-down">
      {/* Historical Context */}
      <div className="bg-black/30 border border-white/6 rounded-xl mb-2 overflow-hidden">
        <button
          onClick={() => toggle('context')}
          className="w-full flex items-center justify-between px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <div className="w-[26px] h-[26px] rounded-md bg-[#f5a623]/12 flex items-center justify-center text-[13px]">📜</div>
            <span className="text-[13px] font-semibold tracking-wider text-[#f5a623]">
              {t('reflection.title')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isSupported && (
              <span
                onClick={e => { e.stopPropagation(); speak(question.explanation[locale], 'explanation'); }}
                className="p-1 rounded text-chronos-muted hover:text-chronos-gold transition-colors text-xs leading-none"
                title={speakingId === 'explanation' ? t('audio.stop') : t('audio.read')}
              >
                {speakingId === 'explanation' ? '⏹' : '🔊'}
              </span>
            )}
            <ChevronIcon rotated={expanded.context} />
          </div>
        </button>
        {expanded.context ? (
          <div className="px-3 pb-3 text-[14px] text-[#d1d5db] leading-relaxed">
            {question.explanation[locale]}
          </div>
        ) : (
          <div className="relative px-3 pb-1">
            <p className="text-[14px] text-[#9ca3af] leading-relaxed line-clamp-2">
              {question.explanation[locale]}
            </p>
            <button onClick={() => toggle('context')} className="text-[12px] text-[#f5a623] font-medium pt-1 pb-2 block">
              Ver más
            </button>
          </div>
        )}
      </div>

      {/* Meanwhile */}
      <div className="bg-black/30 border border-white/6 rounded-xl mb-2 overflow-hidden">
        <button
          onClick={() => toggle('meanwhile')}
          className="w-full flex items-center justify-between px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <div className="w-[26px] h-[26px] rounded-md bg-emerald-500/12 flex items-center justify-center text-[13px]">🌍</div>
            <span className="text-[13px] font-semibold tracking-wider text-emerald-400">
              {t('reflection.meanwhileTitle')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isSupported && (
              <span
                onClick={e => { e.stopPropagation(); speak(question.meanwhile[locale], 'meanwhile'); }}
                className="p-1 rounded text-chronos-muted hover:text-chronos-gold transition-colors text-xs leading-none"
                title={speakingId === 'meanwhile' ? t('audio.stop') : t('audio.read')}
              >
                {speakingId === 'meanwhile' ? '⏹' : '🔊'}
              </span>
            )}
            <ChevronIcon rotated={expanded.meanwhile} />
          </div>
        </button>
        {expanded.meanwhile ? (
          <div className="px-3 pb-3 text-[14px] text-[#d1d5db] leading-relaxed">
            {question.meanwhile[locale]}
          </div>
        ) : (
          <div className="relative px-3 pb-1">
            <p className="text-[14px] text-[#9ca3af] leading-relaxed line-clamp-2">
              {question.meanwhile[locale]}
            </p>
            <button onClick={() => toggle('meanwhile')} className="text-[12px] text-[#f5a623] font-medium pt-1 pb-2 block">
              Ver más
            </button>
          </div>
        )}
      </div>

      {/* Reflect on This */}
      <div className="bg-black/30 border border-white/6 rounded-xl mb-2 overflow-hidden">
        <button
          onClick={() => toggle('reflect')}
          className="w-full flex items-center justify-between px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <div className="w-[26px] h-[26px] rounded-md bg-[#f5a623]/18 flex items-center justify-center text-[13px]">💭</div>
            <span className="text-[13px] font-semibold tracking-wider text-[#f5a623]">
              {t('reflection.reflectionTitle')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isSupported && (
              <span
                onClick={e => { e.stopPropagation(); speak(question.reflection[locale], 'reflection'); }}
                className="p-1 rounded text-chronos-muted hover:text-chronos-gold transition-colors text-xs leading-none"
                title={speakingId === 'reflection' ? t('audio.stop') : t('audio.read')}
              >
                {speakingId === 'reflection' ? '⏹' : '🔊'}
              </span>
            )}
            <ChevronIcon rotated={expanded.reflect} />
          </div>
        </button>
        {expanded.reflect ? (
          <div className="px-3 pb-3 text-[14px] text-[#d1d5db] leading-relaxed italic">
            {question.reflection[locale]}
          </div>
        ) : (
          <div className="relative px-3 pb-1">
            <p className="text-[14px] text-[#9ca3af] leading-relaxed line-clamp-2">
              {question.reflection[locale]}
            </p>
            <button onClick={() => toggle('reflect')} className="text-[12px] text-[#f5a623] font-medium pt-1 pb-2 block">
              Ver más
            </button>
          </div>
        )}
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="w-full bg-[#f5a623] text-[#09090f] font-semibold text-[15px] rounded-xl py-3 mt-2 hover:bg-amber-400 transition-colors active:scale-[0.98]"
      >
        {isLast ? t('reflection.finish') : t('reflection.continue')}
      </button>
    </div>
  );
}
