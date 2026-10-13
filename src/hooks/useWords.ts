// Hook de vocabulario: guarda en el dispositivo qué palabras del glosario el jugador ya aprendió.

import { useCallback, useEffect, useRef, useState } from 'react';
import { toLocalDateKey } from '@/lib/dates';
import { readLocal, writeLocal } from '@/lib/localStore';
import { applyReview, learnedCount, type ReviewResult, type WordStore } from '@/lib/words';

const LOCAL_KEY = 'chronos_words';

/**
 * Persistent vocabulary progress (device only).
 *
 * @returns
 * - `store` – progress per word, or `null` until loaded on the client.
 * - `learned` – number of words the player has learned.
 * - `recordReview(results)` – saves a review and returns how many words were learned just now.
 */
export function useWords() {
  const [store, setStore] = useState<WordStore | null>(null);
  const storeRef = useRef<WordStore>({});

  useEffect(() => {
    const saved = readLocal<WordStore>(LOCAL_KEY) ?? {};
    storeRef.current = saved;
    setStore(saved);
  }, []);

  const recordReview = useCallback((results: readonly ReviewResult[]): number => {
    const { store: updated, newlyLearned } = applyReview(storeRef.current, results, toLocalDateKey());
    storeRef.current = updated;
    setStore(updated);
    writeLocal(LOCAL_KEY, updated);
    return newlyLearned;
  }, []);

  return { store, learned: store ? learnedCount(store) : 0, recordReview };
}
