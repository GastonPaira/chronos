export type Locale = 'en' | 'es';

export interface LocalizedString {
  en: string;
  es: string;
}

export interface Question {
  id: string;
  category: string;
  category_label: LocalizedString;
  difficulty: 'easy' | 'medium' | 'hard';
  question: LocalizedString;
  options: [LocalizedString, LocalizedString];
  correctIndex: 0 | 1;
  explanation: LocalizedString;
  meanwhile: LocalizedString;
  reflection: LocalizedString;
}

export interface Category {
  id: string;
  label: LocalizedString;
  count: number;
  difficulties: Question['difficulty'][];
}

export type GamePhase = 'playing' | 'reflecting' | 'finished';

export type MatchStatus = 'waiting' | 'playing' | 'finished';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Match {
  id: string;
  category_id: string;
  question_ids: string[];
  created_by: string;
  status: MatchStatus;
  created_at: string;
}

export interface MatchPlayer {
  match_id: string;
  user_id: string;
  score: number;
  finished: boolean;
  played_at: string | null;
  profile?: Profile | null;
}

export interface MatchAnswer {
  match_id: string;
  user_id: string;
  question_id: string;
  selected_index: number;
  is_correct: boolean;
  answered_at: string;
}

export interface GameState {
  questions: Question[];
  currentIndex: number;
  score: number;
  phase: GamePhase;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
}
