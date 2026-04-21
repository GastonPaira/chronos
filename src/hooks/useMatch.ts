import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match, MatchPlayer, MatchAnswer, Profile } from '@/types';

export type PlayerWithProfile = MatchPlayer & { profile: Profile | null };

export interface MatchData {
  match: Match;
  players: PlayerWithProfile[];
  answers: MatchAnswer[];
}

function generateMatchId(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function useMatch(userId: string | undefined) {
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
