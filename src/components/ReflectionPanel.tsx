// Panel de reflexión: contexto histórico, "Meanwhile" y reflexión, en inglés con español a un toque,
// audio (mp3 o voz del navegador) y el puente al artículo del blog ("Read the full story").

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { LocalizedString, Question, VocabEntry } from '@/types';
import { getStory, getStoryLink } from '@/data/catalog';
import { useNarration, type NarrationMode, type NarrationStatus } from '@/hooks/useNarration';
import { SpanishText, SpanishToggle } from '@/components/SpanishToggle';
import GlossedText from '@/components/GlossedText';

type PanelKey = 'explanation' | 'meanwhile' | 'reflection';

interface PanelDef {
  key: PanelKey;
  icon: string;
  titleKey: string;
  accent: string;
  iconBg: string;
  italic?: boolean;
}

const PANELS: PanelDef[] = [
  { key: 'explanation', icon: '📜', titleKey: 'reflection.title', accent: 'text-[#f5a623]', iconBg: 'bg-[#f5a623]/12' },
  { key: 'meanwhile', icon: '🌍', titleKey: 'reflection.meanwhileTitle', accent: 'text-emerald-400', iconBg: 'bg-emerald-500/12' },
  { key: 'reflection', icon: '💭', titleKey: 'reflection.reflectionTitle', accent: 'text-[#f5a623]', iconBg: 'bg-[#f5a623]/18', italic: true },
];

interface Props {
  question: Question;
  isLast: boolean;
  onContinue: () => void;
  /** Called when the player taps a glossary word. */
  onWordTap?: (entry: VocabEntry) => void;
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

const BTN = 'p-1 rounded text-chronos-muted hover:text-chronos-gold transition-colors text-xs leading-none cursor-pointer';

interface AudioControlsProps {
  mode: NarrationMode;
  status: NarrationStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onStop: () => void;
}

/** mp3: full controls. Browser voice: play/stop only (pause is unreliable on Android). */
function AudioControls({ mode, status, onStart, onPause, onResume, onRestart, onStop }: AudioControlsProps) {
  const { t } = useTranslation('common');
  if (status === 'idle') {
    return (
      <span
        role="button"
        aria-label={mode === 'voice' ? t('audio.browserVoice') : t('audio.read')}
        title={mode === 'voice' ? t('audio.browserVoice') : t('audio.read')}
        onClick={e => { e.stopPropagation(); onStart(); }}
        className={BTN}
      >
        ▶️
      </span>
    );
  }
  return (
    <div className="flex items-center gap-0.5 animate-fade-in" onClick={e => e.stopPropagation()}>
      {mode === 'mp3' && <span role="button" onClick={onRestart} className={BTN}>⏮</span>}
      {mode === 'mp3' && (status === 'playing'
        ? <span role="button" onClick={onPause} className={BTN}>⏸</span>
        : <span role="button" onClick={onResume} className={BTN}>▶️</span>)}
      <span role="button" aria-label={t('audio.stop')} onClick={onStop} className={BTN}>⏹</span>
    </div>
  );
}

export default function ReflectionPanel({ question, isLast, onContinue, onWordTap }: Props) {
  const { t } = useTranslation('common');
  const narration = useNarration();
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Record<PanelKey, boolean>>({
    explanation: true, meanwhile: false, reflection: false,
  });
  const [spanish, setSpanish] = useState<Record<PanelKey, boolean>>({
    explanation: false, meanwhile: false, reflection: false,
  });

  const story = getStory(question.story);
  const storyLink = story ? getStoryLink(story.id, 'read_full_story') : undefined;

  // Reset panels and stop audio when the question changes.
  const { stop } = narration;
  useEffect(() => {
    stop();
    setExpanded({ explanation: true, meanwhile: false, reflection: false });
    setSpanish({ explanation: false, meanwhile: false, reflection: false });
  }, [question.id, stop]);

  // Tap or select a word to hear it, in English or Spanish depending on where it is.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined' || !window.speechSynthesis) return;
    const handleSelectionRead = () => {
      const selection = window.getSelection();
      const selected = selection?.toString().trim();
      if (!selected) return;
      const node = selection?.anchorNode;
      const host = node instanceof Element ? node : node?.parentElement;
      const isSpanish = host?.closest('[lang]')?.getAttribute('lang') === 'es';
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(selected);
      utterance.lang = isSpanish ? 'es-ES' : 'en-US';
      window.speechSynthesis.speak(utterance);
    };
    el.addEventListener('mouseup', handleSelectionRead);
    el.addEventListener('touchend', handleSelectionRead);
    return () => {
      el.removeEventListener('mouseup', handleSelectionRead);
      el.removeEventListener('touchend', handleSelectionRead);
    };
  }, []);

  const toggleExpanded = (key: PanelKey) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleSpanish = (key: PanelKey) => {
    setExpanded(prev => ({ ...prev, [key]: true }));
    setSpanish(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div ref={containerRef} className="flex flex-col w-full animate-slide-down">
      {PANELS.map(panel => {
        const text: LocalizedString = question[panel.key];
        const mp3Id = `${question.id}_${panel.key}_en`;
        const mode = narration.modeFor(mp3Id);
        const isOpen = expanded[panel.key];

        return (
          <div key={panel.key} className="bg-black/30 border border-white/6 rounded-xl mb-2 overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleExpanded(panel.key)}
              onKeyDown={e => { if (e.key === 'Enter') toggleExpanded(panel.key); }}
              className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className={`w-[26px] h-[26px] rounded-md ${panel.iconBg} flex items-center justify-center text-[13px]`}>
                  {panel.icon}
                </div>
                <span className={`text-[13px] font-semibold tracking-wider ${panel.accent}`}>{t(panel.titleKey)}</span>
              </div>
              <div className="flex items-center gap-2">
                {mode && (
                  <AudioControls
                    mode={narration.activeMode && narration.statusOf(panel.key) !== 'idle' ? narration.activeMode : mode}
                    status={narration.statusOf(panel.key)}
                    onStart={() => narration.start(panel.key, { mp3Id, text: text.en })}
                    onPause={() => narration.pause(panel.key)}
                    onResume={() => narration.resume(panel.key)}
                    onRestart={() => narration.restart(panel.key)}
                    onStop={narration.stop}
                  />
                )}
                <SpanishToggle open={spanish[panel.key]} onToggle={() => toggleSpanish(panel.key)} />
                <ChevronIcon rotated={isOpen} />
              </div>
            </div>

            {isOpen ? (
              <div className="px-3 pb-3 flex flex-col gap-2">
                <GlossedText
                  text={text.en}
                  vocab={question.vocab}
                  onWordTap={onWordTap}
                  className={`text-[14px] text-[#d1d5db] leading-relaxed ${panel.italic ? 'italic' : ''}`}
                />
                {spanish[panel.key] && <SpanishText text={text.es} className="text-[13px]" />}
              </div>
            ) : (
              <div className="relative px-3 pb-1">
                <p lang="en" className="text-[14px] text-[#9ca3af] leading-relaxed line-clamp-2">{text.en}</p>
                <button
                  onClick={() => toggleExpanded(panel.key)}
                  className="text-[12px] text-[#f5a623] font-medium pt-1 pb-2 block"
                >
                  {t('reflection.seeMore')}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Bridge to the blog */}
      {story && storyLink && (
        <a
          href={storyLink}
          target="_blank"
          rel="noopener"
          className="group flex items-center justify-between gap-3 rounded-xl border border-chronos-gold/40 bg-chronos-gold/5 px-4 py-3 mt-1 hover:border-chronos-gold hover:bg-chronos-gold/10 transition-colors"
        >
          <span className="flex flex-col">
            <span className="text-[13px] font-semibold text-chronos-gold">{t('story.readFull')}</span>
            <span className="text-[12px] text-chronos-muted">{story.title} · {t('story.from')}</span>
          </span>
          <span className="text-chronos-gold transition-transform group-hover:translate-x-1">→</span>
        </a>
      )}

      <button
        onClick={onContinue}
        className="w-full bg-[#f5a623] text-[#09090f] font-semibold text-[15px] rounded-xl py-3 mt-2 hover:bg-amber-400 transition-colors active:scale-[0.98]"
      >
        {isLast ? t('reflection.finish') : t('reflection.continue')}
      </button>
    </div>
  );
}
