// Tipos de dominio centrales para Chronos: preguntas, categorías, partidas y estado de juego.

/** Supported UI locales. */
export type Locale = 'en' | 'es';

/** A string value that has both English and Spanish translations. */
export interface LocalizedString {
  en: string;
  es: string;
}

/**
 * A single trivia question with bilingual content.
 *
 * @property id - Unique question identifier.
 * @property category - Category slug (e.g. `'ancient-egypt'`).
 * @property category_label - Display name translated to both locales.
 * @property difficulty - Difficulty tier used for scoring and filtering.
 * @property question - The question text in both locales.
 * @property options - Exactly two answer choices; order may be shuffled at runtime.
 * @property correctIndex - Index (0 or 1) of the correct option after any shuffle.
 * @property explanation - Historical context shown in the reflection panel.
 * @property meanwhile - "Meanwhile in the world" sidebar shown post-answer.
 * @property reflection - Open-ended reflection prompt shown post-answer.
 */
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

/**
 * Aggregated metadata for a question category shown in the category picker.
 *
 * @property id - Category slug used in routing (e.g. `/game/ancient-egypt`).
 * @property label - Display name in both locales.
 * @property count - Total number of available questions.
 * @property difficulties - All difficulty values present in the category's question pool.
 */
export interface Category {
  id: string;
  label: LocalizedString;
  count: number;
  difficulties: Question['difficulty'][];
}

/**
 * The phase the single-player game is currently in.
 * - `'playing'` – waiting for the user to select an answer.
 * - `'reflecting'` – answer submitted, reflection panel visible.
 * - `'finished'` – all questions answered, results screen visible.
 */
export type GamePhase = 'playing' | 'reflecting' | 'finished';

/**
 * Lifecycle status of a versus match stored in Supabase.
 * - `'waiting'` – match created, second player has not joined.
 * - `'playing'` – both players are in the match.
 * - `'finished'` – all players have submitted their final scores.
 */
export type MatchStatus = 'waiting' | 'playing' | 'finished';

/**
 * Public profile row from the `profiles` Supabase table.
 *
 * @property id - Supabase auth user UUID.
 * @property display_name - Human-readable name shown in the UI; may be null for anonymous users.
 * @property avatar_url - Remote image URL for the user's avatar; may be null.
 */
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * A versus match record stored in Supabase.
 *
 * @property id - Short human-readable match code (e.g. `'AB3X7Y'`).
 * @property category_id - Slug of the category both players answer.
 * @property question_ids - Ordered list of question IDs used for the match.
 * @property created_by - User ID of the player who created the match.
 * @property status - Current lifecycle status of the match.
 * @property created_at - ISO timestamp of match creation.
 */
export interface Match {
  id: string;
  category_id: string;
  question_ids: string[];
  created_by: string;
  status: MatchStatus;
  created_at: string;
}

/**
 * A player's participation record for a specific match.
 *
 * @property match_id - Foreign key to the parent match.
 * @property user_id - Foreign key to the Supabase auth user.
 * @property score - Number of correct answers submitted so far.
 * @property finished - Whether the player has completed all questions.
 * @property played_at - ISO timestamp of when the player finished; null while in progress.
 * @property profile - Optionally joined profile data for display purposes.
 */
export interface MatchPlayer {
  match_id: string;
  user_id: string;
  score: number;
  finished: boolean;
  played_at: string | null;
  profile?: Profile | null;
}

/**
 * A single answer submitted by a player during a versus match.
 *
 * @property match_id - Foreign key to the parent match.
 * @property user_id - Foreign key to the answering user.
 * @property question_id - Which question this answer belongs to.
 * @property selected_index - The option index (0 or 1) the player chose.
 * @property is_correct - Whether the chosen option was correct.
 * @property answered_at - ISO timestamp of submission.
 */
export interface MatchAnswer {
  match_id: string;
  user_id: string;
  question_id: string;
  selected_index: number;
  is_correct: boolean;
  answered_at: string;
}

/**
 * Complete runtime state for a single-player game session.
 *
 * @property questions - The shuffled subset of questions for this round.
 * @property currentIndex - Zero-based index of the question currently on screen.
 * @property score - Running count of correct answers in this session.
 * @property phase - Current game phase controlling which UI is rendered.
 * @property selectedAnswer - Index of the answer the user clicked; null before answering.
 * @property isCorrect - Whether the selected answer was correct; null before answering.
 */
export interface GameState {
  questions: Question[];
  currentIndex: number;
  score: number;
  phase: GamePhase;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
}
