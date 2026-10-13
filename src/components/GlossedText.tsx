// Texto en inglés con las palabras del glosario marcadas: al tocarlas se lee la palabra y se ve su traducción.

import { useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { VocabEntry } from '@/types';
import { splitByVocab } from '@/lib/vocab';
import { speakWord } from '@/lib/speakWord';

interface Props {
  text: string;
  vocab?: VocabEntry[];
  /** Called with the glossary entry each time the player taps one of its words. */
  onWordTap?: (entry: VocabEntry) => void;
  className?: string;
}

/**
 * Renders `text` as an English paragraph. Glossary words get a dotted gold underline;
 * tapping one speaks it and shows its Spanish translation under the paragraph.
 * Without a glossary it renders plain text, so it can replace any `<p lang="en">`.
 */
export default function GlossedText({ text, vocab, onWordTap, className = '' }: Props) {
  const { t } = useTranslation('common');
  const [active, setActive] = useState<VocabEntry | null>(null);
  const segments = useMemo(() => splitByVocab(text, vocab), [text, vocab]);

  const handleTap = (entry: VocabEntry) => {
    const same = active?.term === entry.term;
    setActive(same ? null : entry);
    if (!same) speakWord(entry.term);
    onWordTap?.(entry);
  };

  return (
    <div className="flex flex-col gap-2">
      <p lang="en" className={className}>
        {segments.map((segment, index) =>
          segment.entry ? (
            <button
              key={index}
              type="button"
              onClick={e => { e.stopPropagation(); handleTap(segment.entry!); }}
              aria-expanded={active?.term === segment.entry.term}
              className={`inline cursor-pointer border-b border-dotted border-chronos-gold text-inherit transition-colors hover:text-chronos-gold ${
                active?.term === segment.entry.term ? 'text-chronos-gold' : ''
              }`}
            >
              {segment.text}
            </button>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </p>

      {active && (
        <div className="flex items-center gap-2 rounded-lg border border-chronos-gold/40 bg-chronos-gold/10 px-3 py-2 text-sm animate-fade-in">
          <span className="font-semibold text-chronos-gold">{active.term}</span>
          <span className="text-chronos-muted">→</span>
          <span lang="es" className="text-chronos-text">{active.es}</span>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); speakWord(active.term); }}
            aria-label={t('vocab.listen')}
            title={t('vocab.listen')}
            className="ml-auto p-1 text-xs leading-none text-chronos-muted hover:text-chronos-gold transition-colors"
          >
            🔊
          </button>
        </div>
      )}
    </div>
  );
}
