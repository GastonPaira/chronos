// Lluvia de confeti para celebrar (subir de nivel, completar la meta diaria, desbloquear un logro).
// Solo se monta después de una acción del jugador, así que usar Math.random acá no rompe la hidratación.

import { useMemo } from 'react';

const PIECES = ['✨', '⭐', '🎉', '🏅', '🔥'];
const COUNT = 22;

interface Props {
  /** Change this value to fire the celebration again. */
  burstKey: string | number;
}

export default function Celebration({ burstKey }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        icon: PIECES[i % PIECES.length],
        left: 4 + Math.random() * 92,
        delay: Math.random() * 0.5,
        size: 14 + Math.random() * 14,
        fall: 220 + Math.random() * 260,
        spin: (Math.random() - 0.5) * 720,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burstKey],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0 overflow-visible">
      {pieces.map((piece, i) => (
        <span
          key={`${burstKey}-${i}`}
          className="absolute top-0 animate-confetti"
          style={{
            left: `${piece.left}%`,
            fontSize: piece.size,
            animationDelay: `${piece.delay}s`,
            ['--fall' as string]: `${piece.fall}px`,
            ['--spin' as string]: `${piece.spin}deg`,
          }}
        >
          {piece.icon}
        </span>
      ))}
    </div>
  );
}
