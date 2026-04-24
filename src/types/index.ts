// Word data from database
export interface Word {
  id: number;
  hanzi: string;
  pinyin: string;
  translation: string;
  enabled: boolean;
  imageUrl?: string;
}

// Spaced Repetition Card State
export interface Card {
  wordId: number;
  interval: number;        // Days until next review
  repetitions: number;     // Consecutive correct answers
  easeFactor: number;      // Difficulty multiplier (default: 2.5)
  nextReview: string;      // ISO date string
  lastReview: string | null;     // ISO date string
}

// Quality rating for recall (SM-2 algorithm)
export enum Quality {
  Blackout = 1,      // Complete failure
  Incorrect = 2,     // Wrong but familiar
  Difficult = 3,     // Correct with difficulty
  Hesitant = 4,      // Correct with hesitation
  Perfect = 5        // Perfect recall
}

// User settings
export interface UserSettings {
  newWordsPerDay: number;
  showImages: boolean;
  autoPlayAudio: boolean;
  darkMode: boolean;
}

// Word with study progress
export interface WordWithProgress extends Word {
  card?: Card;
  isNew: boolean;
  isDue: boolean;
  daysUntilReview: number;
}

// Study session state
export interface StudySession {
  queue: number[];           // Word IDs to study
  currentIndex: number;
  stats: {
    newWords: number;
    reviews: number;
    correct: number;
    incorrect: number;
  };
}

// Database export format
export interface WordsDatabase {
  version: string;
  exportedAt: string;
  wordCount: number;
  source: string;
  words: Word[];
}
