// Panel de reflexión: contexto histórico, "Meanwhile" y reflexión como tarjetas que se deslizan,
// en inglés con español a un toque. El audio (mp3 o voz del navegador) puede leerse solo, pasando de tarjeta en
// tarjeta, y resalta la frase que suena.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { LocalizedString, Question, VocabEntry } from '@/types';
import { useFlag } from '@/hooks/useFlag';
import { useNarration, type NarrationMode, type NarrationStatus } from '@/hooks/useNarration';
import { duckAmbience } from '@/lib/ambience';
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

/** Horizontal distance, in pixels, a swipe needs to change card. */
const SWIPE_DISTANCE = 50;
/** Pause between the end of one card's narration and the next card. */
const AUTO_ADVANCE_MS = 700;
/** Pause before a card starts reading itself, so the slide-in animation can finish. */
const AUTO_START_MS = 450;

interface Props {
  question: Question;
  isLast: boolean;
  onContinue: () => void;
  /** Called when the player taps a glossary word. */
  onWordTap?: (entry: VocabEntry) => void;
}

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
  const { modeFor, start, stop } = narration;
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  // `question.id:card` already started by the auto-reader, so it does not start twice.
  const autoStarted = useRef('');
  const [autoRead, setAutoRead] = useFlag('chronos_autoread');
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [spanish, setSpanish] = useState<Record<PanelKey, boolean>>({
    explanation: false, meanwhile: false, reflection: false,
  });

  const panel = PANELS[index];
  const text: LocalizedString = question[panel.key];
  const mp3Id = `${question.id}_${panel.key}_en`;
  const mode = modeFor(mp3Id);

  const goTo = useCallback((target: number) => {
    if (target < 0 || target >= PANELS.length) return;
    setIndex(current => {
      if (current === target) return current;
      setDirection(target > current ? 'next' : 'prev');
      return target;
    });
    stop();
  }, [stop]);

  // Reset the cards and stop the audio when the question changes.
  useEffect(() => {
    stop();
    autoStarted.current = '';
    setIndex(0);
    setDirection('next');
    setSpanish({ explanation: false, meanwhile: false, reflection: false });
  }, [question.id, stop]);

  // Auto-read: each card reads itself, then the next one comes in.
  useEffect(() => {
    if (!autoRead || !mode) return;
    const tag = `${question.id}:${index}`;
    if (autoStarted.current === tag) return;
    let advance: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      autoStarted.current = tag;
      start(panel.key, { mp3Id, text: text.en }, {
        onEnd: () => {
          advance = setTimeout(() => goTo(index + 1), AUTO_ADVANCE_MS);
        },
      });
    }, AUTO_START_MS);
    return () => {
      clearTimeout(timer);
      if (advance) clearTimeout(advance);
    };
  }, [autoRead, mode, question.id, index, panel.key, mp3Id, text.en, start, goTo]);

  // The ambience gets quieter while someone is speaking.
  const speaking = narration.activeMode !== null;
  useEffect(() => {
    duckAmbience(speaking);
    return () => duckAmbience(false);
  }, [speaking]);

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

  const toggleAutoRead = () => {
    const next = !autoRead;
    setAutoRead(next);
    if (next) autoStarted.current = '';
    else stop();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const point = e.touches[0];
    touchStart.current = { x: point.clientX, y: point.clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const from = touchStart.current;
    touchStart.current = null;
    if (!from) return;
    const point = e.changedTouches[0];
    const dx = point.clientX - from.x;
    const dy = point.clientY - from.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    goTo(dx < 0 ? index + 1 : index - 1);
  };

  return (
    <div ref={containerRef} className="flex flex-col w-full animate-slide-down">
      {/* Card tabs */}
      <div role="tablist" className="flex items-center gap-2 mb-2">
        {PANELS.map((p, i) => (
          <button
            key={p.key}
            role="tab"
            aria-selected={i === index}
            onClick={() => goTo(i)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-all ${
              i === index
                ? 'border-chronos-gold/50 bg-chronos-gold/10 text-chronos-gold'
                : 'border-white/10 bg-black/20 text-chronos-muted hover:border-white/25'
            }`}
          >
            <span>{p.icon}</span>
            {i === index && <span className="animate-fade-in">{t(p.titleKey)}</span>}
          </button>
        ))}
        <span className="ml-auto text-[12px] tabular-nums text-chronos-muted">{index + 1}/{PANELS.length}</span>
      </div>

      {/* Current card */}
      <div
        key={`${question.id}-${index}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`bg-black/30 border border-white/10 rounded-xl overflow-hidden ${
          direction === 'next' ? 'animate-card-in-right' : 'animate-card-in-left'
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2.5">
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
                onStart={() => {
                  autoStarted.current = `${question.id}:${index}`;
                  start(panel.key, { mp3Id, text: text.en });
                }}
                onPause={() => narration.pause(panel.key)}
                onResume={() => narration.resume(panel.key)}
                onRestart={() => narration.restart(panel.key)}
                onStop={stop}
              />
            )}
            <SpanishToggle open={spanish[panel.key]} onToggle={() => setSpanish(prev => ({ ...prev, [panel.key]: !prev[panel.key] }))} />
          </div>
        </div>

        <div className="px-3 pb-4 flex flex-col gap-2">
          <GlossedText
            text={text.en}
            vocab={question.vocab}
            onWordTap={onWordTap}
            highlight={narration.spokenSpanOf(panel.key)}
            className={`text-[15px] text-[#d1d5db] leading-relaxed ${panel.italic ? 'italic' : ''}`}
          />
          {spanish[panel.key] && <SpanishText text={text.es} className="text-[13px]" />}
        </div>
      </div>

      {/* Card navigation and auto-read */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label={t('reflection.prev')}
          className="w-9 h-9 rounded-lg border border-white/10 bg-black/20 text-chronos-muted transition-colors enabled:hover:border-chronos-gold/40 enabled:hover:text-chronos-gold disabled:opacity-30"
        >
          ‹
        </button>
        {mode && (
          <button
            type="button"
            onClick={toggleAutoRead}
            aria-pressed={autoRead}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              autoRead
                ? 'border-chronos-gold/50 bg-chronos-gold/10 text-chronos-gold'
                : 'border-white/10 bg-black/20 text-chronos-muted hover:border-white/25'
            }`}
          >
            🎧 {t('reflection.autoRead')}: {autoRead ? t('reflection.on') : t('reflection.off')}
          </button>
        )}
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === PANELS.length - 1}
          aria-label={t('reflection.next')}
          className="w-9 h-9 rounded-lg border border-white/10 bg-black/20 text-chronos-muted transition-colors enabled:hover:border-chronos-gold/40 enabled:hover:text-chronos-gold disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#f5a623] text-[#09090f] font-semibold text-[15px] rounded-xl py-3 mt-3 hover:bg-amber-400 transition-colors active:scale-[0.98]"
      >
        {isLast ? t('reflection.finish') : t('reflection.continue')}
      </button>
    </div>
  );
}
