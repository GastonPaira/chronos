// Panel de reflexión: muestra contexto histórico, "mientras tanto" y reflexión con audio opcional.

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { Question, Locale } from '@/types';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

type AudioState = 'idle' | 'playing' | 'paused';
type PanelKey = 'explanation' | 'meanwhile' | 'reflection';

const PANEL_KEYS: PanelKey[] = ['explanation', 'meanwhile', 'reflection'];

interface Props {
  question: Question;
  locale: Locale;
  isLast: boolean;
  onContinue: () => void;
}

const ChevronIcon = ({ rotated }: { rotated: boolean }) => (
  <svg
    width="12" height="12" viewBox="0 0 24 24"
    fill="none" stroke="#6b7280" strokeWidth="2"
    className={`transition-transform duration-200 flex-shrink-0 ${rotated ? 'rotate-180' : ''}`}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const BTN = 'p-1 rounded text-chronos-muted hover:text-chronos-gold transition-colors text-xs leading-none';

const AudioControls = ({
  state, onStart, onPause, onResume, onRestart, onStop,
}: {
  state: AudioState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onStop: () => void;
}) => {
  if (state === 'idle') {
    return (
      <span onClick={e => { e.stopPropagation(); onStart(); }} className={BTN}>▶️</span>
    );
  }
  return (
    <div className="flex items-center gap-0.5 animate-fade-in" onClick={e => e.stopPropagation()}>
      <span onClick={onRestart} className={BTN}>⏮</span>
      {state === 'playing'
        ? <span onClick={onPause} className={BTN}>⏸</span>
        : <span onClick={onResume} className={BTN}>▶️</span>
      }
      <span onClick={onStop} className={BTN}>⏹</span>
    </div>
  );
};

export default function ReflectionPanel({ question, locale, isLast, onContinue }: Props) {
  const { t } = useTranslation('common');
  const { isSupported } = useTextToSpeech(locale);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<Record<PanelKey, HTMLAudioElement | null>>({
    explanation: null, meanwhile: null, reflection: null,
  });

  const [audioStates, setAudioStates] = useState<Record<PanelKey, AudioState>>({
    explanation: 'idle', meanwhile: 'idle', reflection: 'idle',
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    context: true, meanwhile: false, reflect: false,
  });

  // Stop all panels and reset UI state when question changes.
  useEffect(() => {
    PANEL_KEYS.forEach(key => {
      const a = audioRefs.current[key];
      if (a) { a.pause(); a.onended = null; a.onerror = null; }
      audioRefs.current[key] = null;
    });
    setAudioStates({ explanation: 'idle', meanwhile: 'idle', reflection: 'idle' });
    setExpanded({ context: true, meanwhile: false, reflect: false });
  }, [question.id]);

  // Pause all audio on unmount.
  useEffect(() => {
    const refs = audioRefs.current;
    return () => { PANEL_KEYS.forEach(key => refs[key]?.pause()); };
  }, []);

  // Speak selected text on mouseup / touchend within the panel.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined' || !window.speechSynthesis) return;
    const handleSelectionRead = () => {
      const selected = window.getSelection()?.toString().trim();
      if (!selected) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(selected);
      utterance.lang = locale === 'es' ? 'es-ES' : 'en-US';
      window.speechSynthesis.speak(utterance);
    };
    el.addEventListener('mouseup', handleSelectionRead);
    el.addEventListener('touchend', handleSelectionRead);
    return () => {
      el.removeEventListener('mouseup', handleSelectionRead);
      el.removeEventListener('touchend', handleSelectionRead);
    };
  }, [locale]);

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const startAudio = (key: PanelKey, id: string) => {
    const existing = audioRefs.current[key];
    if (existing) { existing.pause(); existing.onended = null; existing.onerror = null; }
    const audio = new Audio(`/audio/${id}.mp3`);
    audio.onended = () => setAudioStates(prev => ({ ...prev, [key]: 'idle' }));
    audio.onerror = () => setAudioStates(prev => ({ ...prev, [key]: 'idle' }));
    audioRefs.current[key] = audio;
    setAudioStates(prev => ({ ...prev, [key]: 'playing' }));
    audio.play().catch(() => setAudioStates(prev => ({ ...prev, [key]: 'idle' })));
  };

  const pauseAudio = (key: PanelKey) => {
    audioRefs.current[key]?.pause();
    setAudioStates(prev => ({ ...prev, [key]: 'paused' }));
  };

  const resumeAudio = (key: PanelKey) => {
    audioRefs.current[key]?.play().catch(() => {});
    setAudioStates(prev => ({ ...prev, [key]: 'playing' }));
  };

  const restartAudio = (key: PanelKey) => {
    const audio = audioRefs.current[key];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    setAudioStates(prev => ({ ...prev, [key]: 'playing' }));
  };

  const stopAudio = (key: PanelKey) => {
    const audio = audioRefs.current[key];
    if (audio) { audio.pause(); audio.currentTime = 0; audio.onended = null; }
    audioRefs.current[key] = null;
    setAudioStates(prev => ({ ...prev, [key]: 'idle' }));
  };

  return (
    <div ref={containerRef} className="flex flex-col w-full animate-slide-down">
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
            {isSupported && locale === 'en' && (
              <AudioControls
                state={audioStates.explanation}
                onStart={() => startAudio('explanation', `${question.id}_explanation_en`)}
                onPause={() => pauseAudio('explanation')}
                onResume={() => resumeAudio('explanation')}
                onRestart={() => restartAudio('explanation')}
                onStop={() => stopAudio('explanation')}
              />
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
            {isSupported && locale === 'en' && (
              <AudioControls
                state={audioStates.meanwhile}
                onStart={() => startAudio('meanwhile', `${question.id}_meanwhile_en`)}
                onPause={() => pauseAudio('meanwhile')}
                onResume={() => resumeAudio('meanwhile')}
                onRestart={() => restartAudio('meanwhile')}
                onStop={() => stopAudio('meanwhile')}
              />
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
            {isSupported && locale === 'en' && (
              <AudioControls
                state={audioStates.reflection}
                onStart={() => startAudio('reflection', `${question.id}_reflection_en`)}
                onPause={() => pauseAudio('reflection')}
                onResume={() => resumeAudio('reflection')}
                onRestart={() => restartAudio('reflection')}
                onStop={() => stopAudio('reflection')}
              />
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
