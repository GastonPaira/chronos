// Pantalla de resultados del modo versus: compara puntajes de ambos jugadores con avatares y estrellas.

import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import ChronosLogo from './ChronosLogo';
import type { PlayerWithProfile } from '@/hooks/useMatch';

/**
 * Props for `VersusResultScreen`.
 *
 * @property myScore - The current user's correct-answer count.
 * @property total - Total number of questions in the match.
 * @property myPlayer - The current user's `MatchPlayer` record with joined profile.
 * @property opponentPlayer - The opponent's record with profile, or `null` if they haven't joined yet.
 * @property userId - The current user's auth UUID (used to distinguish "my" card from the opponent's).
 * @property onPlayAgain - Called when the user taps "Play Again" to start a new match in the same category.
 */
interface Props {
  myScore: number;
  total: number;
  myPlayer: PlayerWithProfile;
  opponentPlayer: PlayerWithProfile | null;
  userId: string;
  onPlayAgain: () => void;
}

/**
 * Maps a score ratio to a 0–3 star count.
 *
 * @param score - Correct answers.
 * @param total - Total questions.
 * @returns `3` for perfect, `2` for ≥70%, `1` for ≥40%, `0` otherwise.
 */
function getStars(score: number, total: number): number {
  const r = score / total;
  if (r === 1) return 3;
  if (r >= 0.7) return 2;
  if (r >= 0.4) return 1;
  return 0;
}

/**
 * Returns a Tailwind text-color class for a score value.
 *
 * @param score - Correct answers.
 * @param total - Total questions.
 * @returns A Tailwind CSS color class string.
 */
function getScoreColor(score: number, total: number): string {
  const r = score / total;
  if (r === 1) return 'text-chronos-gold';
  if (r >= 0.7) return 'text-emerald-400';
  if (r >= 0.4) return 'text-blue-400';
  return 'text-chronos-muted';
}

/**
 * Renders a circular player avatar.
 * Shows the remote `avatarUrl` image when available; falls back to two-letter initials.
 *
 * @property name - Player's display name, used for the `alt` attribute and initials fallback.
 * @property avatarUrl - Remote image URL from the player's profile, or `null`.
 */
function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={56}
        height={56}
        className="rounded-full border-2 border-chronos-border object-cover"
      />
    );
  }
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="w-14 h-14 rounded-full border-2 border-chronos-border bg-chronos-surface flex items-center justify-center text-chronos-muted font-bold text-lg">
      {initials}
    </div>
  );
}

/**
 * Displays the end-of-match versus results screen.
 *
 * Shows side-by-side player cards, each with an avatar, display name, score,
 * and star rating. An outcome banner at the top announces win / loss / draw.
 *
 * If the opponent has not finished yet:
 * - The opponent card shows a spinner instead of their score.
 * - The outcome banner shows "Waiting for result..." with no win/lose declaration.
 *
 * If no opponent has joined the match, a placeholder card with a "?" avatar is shown.
 *
 * The `userId` prop is received but currently unused in the render; it is kept in
 * the props interface for callers that may need to distinguish perspectives.
 */
export default function VersusResultScreen({
  myScore,
  total,
  myPlayer,
  opponentPlayer,
  onPlayAgain,
}: Props) {
  const { t } = useTranslation('common');
  const router = useRouter();

  const myName = myPlayer.profile?.display_name ?? t('versus.you');
  const myStars = getStars(myScore, total);

  const opponentFinished = opponentPlayer?.finished ?? false;
  const opponentName = opponentPlayer?.profile?.display_name ?? t('versus.opponent');
  const opponentScore = opponentPlayer?.score ?? 0;
  const opponentStars = getStars(opponentScore, total);

  let outcome: 'waiting' | 'won' | 'lost' | 'draw' = 'waiting';
  if (opponentFinished) {
    if (myScore > opponentScore) outcome = 'won';
    else if (myScore < opponentScore) outcome = 'lost';
    else outcome = 'draw';
  }

  const outcomeBanner = {
    waiting: { text: t('versus.waitingResult'), color: 'text-chronos-muted border-chronos-border' },
    won: { text: t('versus.youWon'), color: 'text-chronos-gold border-chronos-gold/50 bg-chronos-gold/10' },
    lost: { text: t('versus.youLost'), color: 'text-chronos-muted border-chronos-border' },
    draw: { text: t('versus.itsDraw'), color: 'text-blue-400 border-blue-500/40 bg-blue-950/30' },
  }[outcome];

  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in text-center w-full max-w-sm mx-auto">
      <ChronosLogo size="sm" />

      {/* Outcome banner */}
      <div className={`px-5 py-2 rounded-full border text-sm font-semibold ${outcomeBanner.color}`}>
        {outcomeBanner.text}
      </div>

      {/* Player cards */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* My card */}
        <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-chronos-gold/40 bg-chronos-gold/5">
          <Avatar name={myName} avatarUrl={myPlayer.profile?.avatar_url ?? null} />
          <p className="text-xs text-chronos-gold font-medium truncate w-full text-center">
            {myName}
          </p>
          <div className={`text-4xl font-bold tabular-nums ${getScoreColor(myScore, total)}`}>
            {myScore}
            <span className="text-lg text-chronos-muted font-normal">/{total}</span>
          </div>
          <div className="flex gap-0.5 text-lg">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < myStars ? 'opacity-100' : 'opacity-20 grayscale'}>
                ⭐
              </span>
            ))}
          </div>
        </div>

        {/* Opponent card */}
        <div
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${
            opponentFinished
              ? 'border-chronos-border bg-chronos-card'
              : 'border-chronos-border/50 bg-chronos-card/50'
          }`}
        >
          {opponentPlayer ? (
            <>
              <Avatar
                name={opponentName}
                avatarUrl={opponentPlayer.profile?.avatar_url ?? null}
              />
              <p className="text-xs text-chronos-muted font-medium truncate w-full text-center">
                {opponentName}
              </p>
              {opponentFinished ? (
                <>
                  <div className={`text-4xl font-bold tabular-nums ${getScoreColor(opponentScore, total)}`}>
                    {opponentScore}
                    <span className="text-lg text-chronos-muted font-normal">/{total}</span>
                  </div>
                  <div className="flex gap-0.5 text-lg">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={i < opponentStars ? 'opacity-100' : 'opacity-20 grayscale'}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="w-5 h-5 border-2 border-chronos-muted/40 border-t-chronos-muted rounded-full animate-spin" />
                  <p className="text-xs text-chronos-muted">{t('versus.opponentPlaying')}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-chronos-border/50 flex items-center justify-center text-2xl text-chronos-muted/40">
                ?
              </div>
              <p className="text-xs text-chronos-muted/60">{t('versus.noOpponent')}</p>
              <div className="flex flex-col items-center gap-1 mt-1">
                <div className="w-5 h-5 border-2 border-chronos-muted/40 border-t-chronos-muted rounded-full animate-spin" />
                <p className="text-xs text-chronos-muted">{t('versus.waitingJoin')}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={onPlayAgain}
          className="w-full rounded-xl bg-chronos-gold px-5 py-3.5 text-chronos-bg font-semibold hover:bg-chronos-gold-light transition-all duration-200 active:scale-[0.98]"
        >
          {t('versus.playAgain')}
        </button>
        <button
          onClick={() => router.push('/')}
          className="w-full rounded-xl border border-chronos-border bg-chronos-card px-5 py-3.5 text-chronos-text font-medium hover:border-chronos-gold/40 transition-all duration-200 active:scale-[0.98]"
        >
          {t('nav.home')}
        </button>
      </div>
    </div>
  );
}
