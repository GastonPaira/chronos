import { useEffect, useRef, useState, useCallback } from 'react';
import type { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import type { Locale, Match, Question } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useMatch, type PlayerWithProfile } from '@/hooks/useMatch';
import { useStats } from '@/hooks/useStats';
import { useStreak } from '@/hooks/useStreak';
import { getQuestionsByIds } from '@/data/questions';
import ScoreDisplay from '@/components/ScoreDisplay';
import QuestionCard from '@/components/QuestionCard';
import ReflectionPanel from '@/components/ReflectionPanel';
import ChronosLogo from '@/components/ChronosLogo';
import VersusResultScreen from '@/components/VersusResultScreen';
import LanguageSelector from '@/components/LanguageSelector';

type VsPhase = 'loading' | 'lobby' | 'playing' | 'reflecting' | 'finished' | 'error';

function shuffleOptions(q: Question): Question {
  if (Math.random() < 0.5) return q;
  return {
    ...q,
    options: [q.options[1], q.options[0]],
    correctIndex: q.correctIndex === 0 ? 1 : 0,
  };
}

const CATEGORY_IMAGES: Record<string, string> = {
  'ancient-egypt':    '/images/ancient-egypt.jpg',
  'ancient-greece':   '/images/ancient-greece.jpg',
  'roman-empire':     '/images/roman-empire.jpg',
  'byzantine-empire': '/images/byzantine-empire.jpg',
  'crusades-chivalry':'/images/crusades-chivalry.jpg',
  'vikings':          '/images/vikings.jpg',
};

export default function VsPage() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const locale = (i18n.language as Locale) ?? 'en';
  const matchId = router.query.matchId as string | undefined;

  const { user, loading: authLoading } = useAuth();
  const { loadMatch, joinMatch, submitAnswer, finishMatch } = useMatch(user?.id);
  const { recordAnswer, recordSessionEnd } = useStats();
  const { registerPlay } = useStreak();

  const [phase, setPhase] = useState<VsPhase>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [myPlayer, setMyPlayer] = useState<PlayerWithProfile | null>(null);
  const [opponentPlayer, setOpponentPlayer] = useState<PlayerWithProfile | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [lobbyCountdown, setLobbyCountdown] = useState(2);
  const [displayScore, setDisplayScore] = useState(0);

  const hasRegisteredRef = useRef(false);
  const lastRecordedIndexRef = useRef(-1);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQuestion = questions[currentIndex] ?? null;
  const total = questions.length || 10;
  const isLastQuestion = currentIndex === total - 1;

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Init match once auth and matchId are ready
  useEffect(() => {
    if (authLoading || !user || !matchId) return;
    initMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, matchId]);

  const initMatch = useCallback(async () => {
    if (!matchId || !user) return;
    setPhase('loading');

    try {
      await joinMatch(matchId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // If full and not a player, show error
      if (msg !== 'Match not found' && !msg.includes('already finished')) {
        // try to load anyway to see if we're a player
      }
    }

    try {
      const data = await loadMatch(matchId);
      if (!data) {
        setErrorMsg(t('versus.matchNotFound'));
        setPhase('error');
        return;
      }

      const me = data.players.find((p) => p.user_id === user.id) ?? null;
      const opponent = data.players.find((p) => p.user_id !== user.id) ?? null;

      setMatch(data.match);
      setMyPlayer(me);
      setOpponentPlayer(opponent);

      if (me?.finished) {
        // Already played — skip game
        hasRegisteredRef.current = true;
        setDisplayScore(me.score);
        setPhase('finished');
        return;
      }

      if (!me) {
        setErrorMsg(t('versus.matchFull'));
        setPhase('error');
        return;
      }

      const qs = getQuestionsByIds(data.match.question_ids).map(shuffleOptions);
      setQuestions(qs);
      setPhase('lobby');
    } catch {
      setErrorMsg(t('versus.errorJoining'));
      setPhase('error');
    }
  }, [matchId, user, joinMatch, loadMatch, t]);

  // Lobby auto-start countdown
  useEffect(() => {
    if (phase !== 'lobby') return;
    if (lobbyCountdown <= 0) {
      setPhase('playing');
      return;
    }
    const timer = setTimeout(() => setLobbyCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, lobbyCountdown]);

  // Record answer in stats when reflecting (same pattern as useGame)
  useEffect(() => {
    if (
      phase === 'reflecting' &&
      isCorrect !== null &&
      currentIndex !== lastRecordedIndexRef.current &&
      currentQuestion
    ) {
      lastRecordedIndexRef.current = currentIndex;
      recordAnswer({
        categoryId: currentQuestion.category,
        difficulty: currentQuestion.difficulty,
        isCorrect,
      });
    }
  }, [phase, currentIndex, isCorrect, currentQuestion, recordAnswer]);

  // Finish flow: runs once when phase becomes 'finished' for the first time
  useEffect(() => {
    if (phase !== 'finished' || hasRegisteredRef.current || !match || !user) return;
    hasRegisteredRef.current = true;

    const currentScore = score;
    setDisplayScore(currentScore);

    const doFinish = async () => {
      await finishMatch(match.id, currentScore);
      recordSessionEnd({ score: currentScore, total });
      registerPlay();

      const data = await loadMatch(match.id);
      if (data) {
        const opponent = data.players.find((p) => p.user_id !== user.id) ?? null;
        setOpponentPlayer(opponent);
        setMyPlayer(data.players.find((p) => p.user_id === user.id) ?? null);
      }
    };

    doFinish();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Poll for opponent when waiting
  useEffect(() => {
    if (phase !== 'finished' || !match || !user) return;
    if (opponentPlayer?.finished) return;

    const poll = async () => {
      const data = await loadMatch(match.id);
      if (!data) return;
      const opponent = data.players.find((p) => p.user_id !== user.id) ?? null;
      setOpponentPlayer(opponent);
      if (opponent?.finished) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    };

    pollIntervalRef.current = setInterval(poll, 5000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, match?.id, user?.id, opponentPlayer?.finished]);

  async function handleAnswer(answerIndex: number) {
    if (!currentQuestion || selectedAnswer !== null || !match || !user) return;

    const correct = currentQuestion.correctIndex === answerIndex;
    setSelectedAnswer(answerIndex);
    setIsCorrect(correct);
    if (correct) setScore((s) => s + 1);

    await submitAnswer(match.id, currentQuestion.id, answerIndex, correct);
    setPhase('reflecting');
  }

  function handleContinue() {
    if (phase !== 'reflecting') return;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setPhase('finished');
    } else {
      setCurrentIndex(nextIndex);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setPhase('playing');
    }
  }

  function handlePlayAgain() {
    router.push('/categories');
  }

  // ── Render helpers ────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-chronos-bg">
        <div className="w-8 h-8 border-2 border-chronos-gold/40 border-t-chronos-gold rounded-full animate-spin" />
        <p className="text-chronos-muted text-sm">{t('versus.loadingMatch')}</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-chronos-bg px-4 text-center">
        <ChronosLogo size="sm" />
        <p className="text-chronos-text font-medium">{errorMsg || t('versus.errorJoining')}</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/categories')}
            className="rounded-xl bg-chronos-gold px-5 py-3 text-chronos-bg font-semibold hover:bg-chronos-gold-light transition-all"
          >
            {t('categories.title')}
          </button>
          <button
            onClick={() => router.push('/')}
            className="rounded-xl border border-chronos-border bg-chronos-card px-5 py-3 text-chronos-text font-medium hover:border-chronos-gold/40 transition-all"
          >
            {t('nav.home')}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'lobby') {
    const opponentName = opponentPlayer?.profile?.display_name ?? null;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-chronos-bg px-4 animate-fade-in">
        <ChronosLogo size="sm" />
        <div className="text-center flex flex-col gap-2">
          <p className="text-xs text-chronos-muted uppercase tracking-widest">{t('versus.vsTitle')}</p>
          <h2 className="text-2xl font-bold text-chronos-text">
            {match?.category_id?.replace(/-/g, ' ')}
          </h2>
          <p className="text-sm text-chronos-muted">
            {t('versus.matchCode')}: <span className="font-mono text-chronos-gold">{match?.id}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-chronos-gold/20 border-2 border-chronos-gold/50 flex items-center justify-center text-chronos-gold font-bold">
              {(myPlayer?.profile?.display_name ?? 'Y').slice(0, 1).toUpperCase()}
            </div>
            <p className="text-xs text-chronos-gold">{t('versus.you')}</p>
          </div>
          <span className="text-chronos-gold font-bold text-lg">VS</span>
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-chronos-surface border-2 border-dashed border-chronos-border flex items-center justify-center text-chronos-muted">
              {opponentName ? opponentName.slice(0, 1).toUpperCase() : '?'}
            </div>
            <p className="text-xs text-chronos-muted">
              {opponentName ?? t('versus.waitingJoin')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setPhase('playing')}
          className="rounded-xl bg-chronos-gold px-8 py-3.5 text-chronos-bg font-semibold hover:bg-chronos-gold-light transition-all active:scale-[0.98]"
        >
          {t('versus.startGame')} ({lobbyCountdown})
        </button>
      </div>
    );
  }

  if (phase === 'finished') {
    const shareLink = typeof window !== 'undefined'
      ? `${window.location.origin}/vs/${match?.id}`
      : '';

    if (!myPlayer) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-chronos-bg">
          <div className="w-8 h-8 border-2 border-chronos-gold/40 border-t-chronos-gold rounded-full animate-spin" />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-chronos-bg px-4 py-8 flex flex-col">
        <header className="flex items-center px-2 h-12 relative bg-[#09090f] border-b border-white/5 mb-8 w-full">
          <div className="flex items-center gap-1.5 ml-auto">
            <LanguageSelector />
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center max-w-md mx-auto w-full gap-6">
          <VersusResultScreen
            myScore={displayScore}
            total={total}
            myPlayer={myPlayer}
            opponentPlayer={opponentPlayer}
            userId={user?.id ?? ''}
            onPlayAgain={handlePlayAgain}
          />

          {/* Share link while waiting for opponent */}
          {!opponentPlayer?.finished && shareLink && (
            <div className="w-full max-w-sm flex flex-col gap-3 animate-fade-in">
              <p className="text-xs text-chronos-muted text-center">{t('versus.shareToPlay')}</p>
              <ShareLinkBox link={shareLink} />
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── Playing / Reflecting ──────────────────────────────────────────────
  const bgImage = currentQuestion ? CATEGORY_IMAGES[currentQuestion.category] : undefined;

  return (
    <div className="min-h-screen bg-chronos-bg px-4 py-6 sm:px-6 sm:py-10 flex flex-col">
      <header className="flex items-center px-2 h-12 relative bg-[#09090f] border-b border-white/5 mb-8 w-full">
        <button
          onClick={() => router.push('/categories')}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,2 4,7 9,12" />
          </svg>
        </button>
        <div className="flex items-center gap-2 mx-auto">
          <span className="text-xs text-chronos-muted uppercase tracking-widest font-medium">
            {t('versus.vsTitle')}
          </span>
          <span className="text-xs font-mono text-chronos-gold">{match?.id}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <LanguageSelector />
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <ScoreDisplay score={score} current={currentIndex} total={total} />
        </div>

        <div className="flex-1 flex flex-col">
          {phase === 'playing' && currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              locale={locale}
              selectedAnswer={selectedAnswer}
              onAnswer={handleAnswer}
            />
          )}

          {phase === 'reflecting' && currentQuestion && (() => (
            <div className="relative rounded-2xl overflow-hidden flex flex-col gap-4">
              {bgImage && (
                <div
                  className="pointer-events-none absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${bgImage})` }}
                />
              )}
              {bgImage && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: 'rgba(9,9,15,0.88)' }}
                />
              )}

              <div className="relative z-10 p-4 rounded-xl border border-chronos-border bg-chronos-surface/60">
                <p className="text-sm text-chronos-muted mb-2 font-medium">
                  {currentQuestion.question[locale]}
                </p>
                <p
                  className={`text-sm font-semibold ${
                    selectedAnswer === currentQuestion.correctIndex
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {selectedAnswer === currentQuestion.correctIndex
                    ? `✓ ${t('game.correct')}`
                    : `✗ ${t('game.incorrect')}`}{' '}
                  — {currentQuestion.options[currentQuestion.correctIndex][locale]}
                </p>
              </div>

              <div className="relative z-10 p-4 pt-0">
                <ReflectionPanel
                  question={currentQuestion}
                  locale={locale}
                  isLast={isLastQuestion}
                  onContinue={handleContinue}
                />
              </div>
            </div>
          ))()}
        </div>
      </main>
    </div>
  );
}

// ── ShareLinkBox ──────────────────────────────────────────────────────────

function ShareLinkBox({ link }: { link: string }) {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 p-3 bg-chronos-surface rounded-xl border border-chronos-border">
        <span className="text-xs text-chronos-text truncate flex-1 font-mono">{link}</span>
      </div>
      <button
        onClick={copy}
        className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.98] ${
          copied
            ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-400'
            : 'border-chronos-gold/50 bg-chronos-card text-chronos-gold hover:bg-chronos-gold/10'
        }`}
      >
        {copied ? `✓ ${t('versus.copied')}` : t('versus.copyLink')}
      </button>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
