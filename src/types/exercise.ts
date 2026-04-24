// Exercise types for different learning modes

export type ExerciseType = 
  | 'flashcard'      // Original: show hanzi, reveal pinyin/translation
  | 'image-to-hanzi' // Show image, select hanzi
  | 'hanzi-to-pinyin' // Show hanzi, select pinyin
  | 'pinyin-to-hanzi' // Show pinyin, select hanzi
  | 'english-to-hanzi' // Show english, select hanzi/pinyin
  | 'hanzi-to-english'; // Show hanzi, select english

export interface Exercise {
  id: string;
  type: ExerciseType;
  wordId: number;
  question: string;        // What's being shown (hanzi, image, english, etc)
  questionData?: {         // Additional data for the question
    imageUrl?: string;
    pinyin?: string;
    hanzi?: string;
    english?: string;
  };
  options: ExerciseOption[];
  correctAnswer: string;   // ID of correct option
  explanation?: string;
}

export interface ExerciseOption {
  id: string;
  text: string;
  subtext?: string;        // Pinyin or translation
  isCorrect: boolean;
}

export interface ExerciseSession {
  type: ExerciseType;
  queue: Exercise[];
  currentIndex: number;
  score: number;
  totalAnswered: number;
  correctAnswers: number;
  streak: number;
  maxStreak: number;
  startTime: string;
}

export interface ExerciseStats {
  totalExercises: number;
  completedExercises: number;
  correctRate: number;
  averageTime: number;     // seconds per exercise
  byType: Record<ExerciseType, {
    completed: number;
    correct: number;
  }>;
}

// Difficulty levels for exercises
export type ExerciseDifficulty = 'easy' | 'medium' | 'hard';

export interface ExerciseSettings {
  type: ExerciseType;
  difficulty: ExerciseDifficulty;
  questionCount: number;
  timeLimit?: number;      // Optional time limit per question
  showHints: boolean;
}
