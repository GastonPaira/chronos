// Bienvenida de tres pantallas la primera vez que se abre la app: qué es, cómo tocar palabras y la meta diaria.

import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import ChronosLogo from '@/components/ChronosLogo';
import GlossedText from '@/components/GlossedText';
import LanguageSelector from '@/components/LanguageSelector';
import { SpanishText, SpanishToggle } from '@/components/SpanishToggle';
import { GOAL_WORDS } from '@/lib/progress';

interface Props {
  /** Called when the player skips or finishes; `play` is true when they chose to start playing right away. */
  onDone: (play: boolean) => void;
}

const STEPS = 3;
const DEMO_VOCAB = [{ term: 'shipwreck', es: 'naufragio' }];

export default function Onboarding({ onDone }: Props) {
  const { t } = useTranslation('common');
  const [step, setStep] = useState(0);
  const [showSpanish, setShowSpanish] = useState(false);
  const last = step === STEPS - 1;

  return (
    <div className="min-h-screen bg-chronos-bg flex flex-col px-6 py-6">
      <div className="flex items-center justify-between">
        <LanguageSelector />
        <button
          type="button"
          onClick={() => onDone(false)}
          className="text-xs uppercase tracking-widest text-chronos-muted hover:text-chronos-gold transition-colors"
        >
          {t('onboarding.skip')}
        </button>
      </div>

      <div key={step} className="flex-1 flex flex-col items-center justify-center gap-6 text-center max-w-sm mx-auto animate-fade-in">
        {step === 0 && (
          <>
            <ChronosLogo size="lg" />
            <h1 className="text-2xl font-bold text-chronos-text">{t('onboarding.step1.title')}</h1>
            <p className="text-chronos-muted leading-relaxed">{t('onboarding.step1.text')}</p>
          </>
        )}

        {step === 1 && (
          <>
            <span className="text-5xl">👆</span>
            <h1 className="text-2xl font-bold text-chronos-text">{t('onboarding.step2.title')}</h1>
            <p className="text-chronos-muted leading-relaxed">{t('onboarding.step2.text')}</p>
            <div className="w-full rounded-2xl border border-chronos-border bg-chronos-card p-4 text-left flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <GlossedText
                    text="The divers found a shipwreck near the island."
                    vocab={DEMO_VOCAB}
                    className="text-lg text-chronos-text leading-snug"
                  />
                </div>
                <SpanishToggle open={showSpanish} onToggle={() => setShowSpanish(v => !v)} />
              </div>
              {showSpanish && <SpanishText text="Los buzos encontraron un naufragio cerca de la isla." className="text-sm" />}
            </div>
            <p className="text-xs text-chronos-muted">{t('onboarding.step2.hint')}</p>
          </>
        )}

        {step === 2 && (
          <>
            <span className="text-5xl animate-flame inline-block">🔥</span>
            <h1 className="text-2xl font-bold text-chronos-text">{t('onboarding.step3.title')}</h1>
            <p className="text-chronos-muted leading-relaxed">{t('onboarding.step3.text', { count: GOAL_WORDS })}</p>
          </>
        )}
      </div>

      {/* pb-16 keeps the button clear of the floating map button in the corner. */}
      <div className="flex flex-col items-center gap-5 max-w-sm w-full mx-auto pb-16">
        <div className="flex gap-2">
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-chronos-gold' : 'w-1.5 bg-chronos-border'}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (last ? onDone(true) : setStep(step + 1))}
          className="w-full rounded-2xl bg-chronos-gold px-8 py-4 text-chronos-bg font-bold tracking-widest uppercase hover:bg-chronos-gold-light active:scale-[0.97] transition-all"
        >
          {last ? t('onboarding.start') : t('onboarding.next')}
        </button>
      </div>
    </div>
  );
}
