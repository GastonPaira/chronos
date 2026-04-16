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
  reflection: LocalizedString;
}

export interface Category {
  id: string;
  label: LocalizedString;
  count: number;
  difficulties: Question['difficulty'][];
}

export type GamePhase = 'playing' | 'reflecting' | 'finished';

export interface GameState {
  questions: Question[];
  currentIndex: number;
  score: number;
  phase: GamePhase;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
}
