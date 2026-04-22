// Hook para el modo versus: crear, unirse, responder y finalizar partidas multijugador.

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match, MatchPlayer, MatchAnswer, Profile } from '@/types';

/**
 * A `MatchPlayer` row with its associated `Profile` already joined.
 * The `profile` field is `null` when no matching profile exists.
 */
export type PlayerWithProfile = MatchPlayer & { profile: Profile | null };

/**
 * All data needed to render the versus game page for a given match.
 *
 * @property match - The match metadata row.
 * @property players - All players enrolled in the match, each with their profile.
 * @property answers - All answers submitted so far for this match.
 */
export interface MatchData {
  match: Match;
  players: PlayerWithProfile[];
  answers: MatchAnswer[];
}

/**
 * Generates a random 6-character alphanumeric match ID.
 * Excludes characters that are easily confused (I, L, O, 0, 1) for readability.
 *
 * @returns A 6-character uppercase string.
 */
function generateMatchId(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Provides async operations for creating and participating in versus matches.
 * All functions are stable references (wrapped in `useCallback`) and safe to
 * use as effect dependencies.
 *
 * @param userId - The authenticated user's UUID, or `undefined` when not signed in.
 *
 * @returns
 * - `createMatch(categoryId, questionIds)` – creates a new match and registers the creator as the first player.
 * - `loadMatch(matchId)` – fetches full match data including players, profiles, and submitted answers.
 * - `joinMatch(matchId)` – adds the current user to an existing waiting match and transitions it to `'playing'`.
 * - `submitAnswer(matchId, questionId, selectedIndex, isCorrect)` – inserts a single answer row; silently ignores duplicate submissions.
 * - `finishMatch(matchId, score)` – marks the current player as finished and, if all players are done, marks the match as `'finished'`.
 */
export function useMatch(userId: string | undefined) {
  /**
   * Fetches all data for a match: the match row, its players with joined profiles,
   * and all submitted answers.
   *
   * @param matchId - The 6-character match code.
   * @returns The full `MatchData` object, or `null` if the match does not exist or an error occurred.
   */
  const loadMatch = useCallback(async (matchId: string): Promise<MatchData | null> => {
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle();

    if (matchError || !match) return null;

    const { data: players, error: playersError } = await supabase
      .from('match_players')
      .select('*')
      .eq('match_id', matchId);

    if (playersError) return null;

    const playerList = players ?? [];
    const userIds = playerList.map((p) => p.user_id);

    let profileMap: Map<string, Profile> = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);
      if (profiles) {
        for (const p of profiles) profileMap.set(p.id, p as Profile);
      }
    }

    const { data: answers } = await supabase
      .from('match_answers')
      .select('*')
      .eq('match_id', matchId);

    return {
      match: match as Match,
      players: playerList.map((p) => ({
        ...(p as MatchPlayer),
        profile: profileMap.get(p.user_id) ?? null,
      })),
      answers: (answers ?? []) as MatchAnswer[],
    };
  }, []);

  /**
   * Creates a new versus match, retrying ID generation up to 3 times on collision.
   *
   * @param categoryId - Category slug for the match.
   * @param questionIds - Ordered list of question IDs that both players will answer.
   * @returns The generated match ID string.
   * @throws If the user is not authenticated or if a Supabase insert fails.
   */
  const createMatch = useCallback(
    async (categoryId: string, questionIds: string[]): Promise<string> => {
      if (!userId) throw new Error('Not authenticated');

      let matchId = generateMatchId();

      for (let i = 0; i < 3; i++) {
        const { data: existing } = await supabase
          .from('matches')
          .select('id')
          .eq('id', matchId)
          .maybeSingle();
        if (!existing) break;
        matchId = generateMatchId();
      }

      const { error: matchError } = await supabase.from('matches').insert({
        id: matchId,
        category_id: categoryId,
        question_ids: questionIds,
        created_by: userId,
        status: 'waiting',
        created_at: new Date().toISOString(),
      });

      if (matchError) throw matchError;

      const { error: playerError } = await supabase.from('match_players').insert({
        match_id: matchId,
        user_id: userId,
        score: 0,
        finished: false,
        played_at: null,
      });

      if (playerError) throw playerError;

      return matchId;
    },
    [userId]
  );

  /**
   * Joins an existing match as the second player and transitions the match to `'playing'`.
   * If the current user is already a participant, this is a no-op.
   *
   * @param matchId - The 6-character match code to join.
   * @throws If the user is not authenticated, the match is not found, already finished, or full.
   */
  const joinMatch = useCallback(
    async (matchId: string): Promise<void> => {
      if (!userId) throw new Error('Not authenticated');

      const data = await loadMatch(matchId);
      if (!data) throw new Error('Match not found');

      const { match, players } = data;

      const alreadyIn = players.some((p) => p.user_id === userId);
      if (alreadyIn) return;

      if (match.status === 'finished') throw new Error('Match is already finished');
      if (players.length >= 2) throw new Error('Match is full');

      const { error } = await supabase.from('match_players').insert({
        match_id: matchId,
        user_id: userId,
        score: 0,
        finished: false,
        played_at: null,
      });

      if (error) throw error;

      await supabase.from('matches').update({ status: 'playing' }).eq('id', matchId);
    },
    [userId, loadMatch]
  );

  /**
   * Persists a single answer for the current user in the match.
   * Silently swallows duplicate-key errors (Postgres code `23505`) so that
   * re-submitting the same question is safe.
   *
   * @param matchId - Target match.
   * @param questionId - The question being answered.
   * @param selectedIndex - The option index (0 or 1) the user chose.
   * @param isCorrect - Whether the selected option was correct.
   */
  const submitAnswer = useCallback(
    async (
      matchId: string,
      questionId: string,
      selectedIndex: number,
      isCorrect: boolean
    ): Promise<void> => {
      if (!userId) return;

      const { error } = await supabase.from('match_answers').insert({
        match_id: matchId,
        user_id: userId,
        question_id: questionId,
        selected_index: selectedIndex,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
      });

      if (error && error.code !== '23505') throw error;
    },
    [userId]
  );

  /**
   * Marks the current user's participation as finished with their final score.
   * If all players in the match are now finished, the match status is also set to `'finished'`.
   *
   * @param matchId - Target match.
   * @param score - The player's final correct-answer count.
   */
  const finishMatch = useCallback(
    async (matchId: string, score: number): Promise<void> => {
      if (!userId) return;

      await supabase
        .from('match_players')
        .update({ score, finished: true, played_at: new Date().toISOString() })
        .eq('match_id', matchId)
        .eq('user_id', userId);

      const { data: players } = await supabase
        .from('match_players')
        .select('finished')
        .eq('match_id', matchId);

      if (players && players.every((p) => p.finished)) {
        await supabase.from('matches').update({ status: 'finished' }).eq('id', matchId);
      }
    },
    [userId]
  );

  return { createMatch, loadMatch, joinMatch, submitAnswer, finishMatch };
}
