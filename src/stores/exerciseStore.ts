import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Word } from '../types';
import type {
  Exercise,
  ExerciseType,
  ExerciseSession,
  ExerciseStats,
  ExerciseDifficulty,
  ExerciseOption
} from '../types/exercise';
import { defaultExerciseStats } from '../config/exerciseTypes';

interface ExerciseState {
  // Current session
  session: ExerciseSession | null;
  
  // Historical stats
  stats: ExerciseStats;
  
  // Actions
  startSession: (type: ExerciseType, words: Word[], difficulty: ExerciseDifficulty) => void;
  answerQuestion: (exerciseId: string, selectedOptionId: string) => { correct: boolean; correctAnswer: string };
  nextQuestion: () => void;
  skipQuestion: () => void;
  endSession: () => void;
  resetStats: () => void;
  
  // Getters
  getCurrentExercise: () => Exercise | null;
  getProgress: () => { current: number; total: number };
  getScore: () => { correct: number; total: number; percentage: number };
}

const QUESTION_COUNT = 10;

// Utility: Shuffle array
function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Generate distractor pinyin options with tone variations
function generatePinyinDistractors(correctPinyin: string, allWords: Word[]): string[] {
  const distractors: string[] = [];
  
  // Get other pinyin from words
  const otherPinyin = allWords
    .map(w => w.pinyin)
    .filter(p => p && p !== correctPinyin && !distractors.includes(p))
    .slice(0, 2);
  
  distractors.push(...otherPinyin);
  
  // Add the correct one
  distractors.push(correctPinyin);
  
  return shuffle(distractors);
}

// Helper: Create hanzi options with same-length distractors
function createHanziOptions(
  word: Word,
  enabledWords: Word[],
  subtextKey: 'pinyin' | 'translation'
): { options: ExerciseOption[]; correctId: string } {
  const hanziLength = word.hanzi.length;
  const sameLengthWords = enabledWords.filter(w => w.id !== word.id && w.hanzi.length === hanziLength);

  const options: ExerciseOption[] = shuffle(sameLengthWords)
    .slice(0, 3)
    .map(w => ({
      id: `opt-${w.id}`,
      text: w.hanzi,
      subtext: subtextKey === 'pinyin' ? w.pinyin : w.translation,
      isCorrect: false
    }));

  const correctId = `opt-${word.id}`;
  options.push({
    id: correctId,
    text: word.hanzi,
    subtext: subtextKey === 'pinyin' ? word.pinyin : word.translation,
    isCorrect: true
  });

  return { options: shuffle(options), correctId };
}

// Generate exercises based on type
function generateExercises(
  type: ExerciseType,
  words: Word[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _difficulty: ExerciseDifficulty
): Exercise[] {
  const enabledWords = words.filter(w => w.enabled);
  const selectedWords = shuffle(enabledWords).slice(0, Math.min(QUESTION_COUNT, enabledWords.length));
  
  return selectedWords.map((word, index) => {
    const exercise: Exercise = {
      id: `ex-${index}`,
      type,
      wordId: word.id,
      question: '',
      options: [],
      correctAnswer: ''
    };
    
    switch (type) {
      case 'image-to-hanzi': {
        exercise.question = 'What word matches this image?';
        exercise.questionData = {
          imageUrl: word.imageUrl,
          english: word.translation
        };

        const { options, correctId } = createHanziOptions(word, enabledWords, 'pinyin');
        exercise.options = options;
        exercise.correctAnswer = correctId;
        break;
      }
      
      case 'hanzi-to-pinyin': {
        exercise.question = word.hanzi;
        exercise.questionData = { hanzi: word.hanzi };

        const pinyinOptions = generatePinyinDistractors(word.pinyin, enabledWords);
        const options: ExerciseOption[] = pinyinOptions.map((p, i) => ({
          id: `${exercise.id}-opt-${i}-${crypto.randomUUID()}`,
          text: p,
          isCorrect: p === word.pinyin
        }));

        exercise.options = options;
        exercise.correctAnswer = options.find(o => o.isCorrect)?.id || '';
        break;
      }
      
      case 'pinyin-to-hanzi': {
        exercise.question = word.pinyin;
        exercise.questionData = { pinyin: word.pinyin };

        const { options, correctId } = createHanziOptions(word, enabledWords, 'translation');
        exercise.options = options;
        exercise.correctAnswer = correctId;
        break;
      }
      
      case 'english-to-hanzi': {
        exercise.question = word.translation;
        exercise.questionData = { english: word.translation };

        const { options, correctId } = createHanziOptions(word, enabledWords, 'pinyin');
        exercise.options = options;
        exercise.correctAnswer = correctId;
        break;
      }
      
      case 'hanzi-to-english': {
        exercise.question = word.hanzi;
        exercise.questionData = { hanzi: word.hanzi, pinyin: word.pinyin };

        const options: ExerciseOption[] = shuffle(enabledWords)
          .filter(w => w.id !== word.id)
          .slice(0, 3)
          .map(w => ({ id: `opt-${w.id}`, text: w.translation, isCorrect: false }));

        const correctId = `opt-${word.id}`;
        options.push({ id: correctId, text: word.translation, isCorrect: true });

        exercise.options = shuffle(options);
        exercise.correctAnswer = correctId;
        break;
      }

      case 'triple-match': {
        exercise.question = 'Match hanzi AND pinyin';
        exercise.questionData = {
          imageUrl: word.imageUrl,
          english: word.translation
        };

        // Get 3 distractor words for hanzi options (same-length for Expert mode)
        const hanziLength = word.hanzi.length;
        const sameLengthWords = enabledWords.filter(w => w.id !== word.id && w.hanzi.length === hanziLength);
        const hanziDistractors = shuffle(sameLengthWords).slice(0, 3);
        const hanziOptions: ExerciseOption[] = hanziDistractors.map(w => ({
          id: `hanzi-${w.id}`,
          text: w.hanzi,
          isCorrect: false
        }));
        hanziOptions.push({
          id: `hanzi-${word.id}`,
          text: word.hanzi,
          isCorrect: true
        });

        // Get 3 distractor pinyins for pinyin options
        const pinyinDistractors = shuffle(enabledWords.filter(w => w.id !== word.id)).slice(0, 3);
        const pinyinOptions: ExerciseOption[] = pinyinDistractors.map(w => ({
          id: `pinyin-${w.id}`,
          text: w.pinyin,
          isCorrect: false
        }));
        pinyinOptions.push({
          id: `pinyin-${word.id}`,
          text: word.pinyin,
          isCorrect: true
        });

        exercise.hanziOptions = shuffle(hanziOptions);
        exercise.pinyinOptions = shuffle(pinyinOptions);
        exercise.correctHanziAnswer = "hanzi-" + word.id;
        exercise.correctPinyinAnswer = "pinyin-" + word.id;
        exercise.correctAnswer = "hanzi-" + word.id;
        break;
      }

      default:
        break;
    }
    
    return exercise;
  });
}

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set, get) => ({
      session: null,
      stats: {
        totalExercises: 0,
        completedExercises: 0,
        correctRate: 0,
        averageTime: 0,
        byType: defaultExerciseStats
      },

      startSession: (type, words, difficulty) => {
        const exercises = generateExercises(type, words, difficulty);
        
        set({
          session: {
            type,
            queue: exercises,
            currentIndex: 0,
            score: 0,
            totalAnswered: 0,
            correctAnswers: 0,
            streak: 0,
            maxStreak: 0,
            startTime: new Date().toISOString()
          }
        });
      },

      answerQuestion: (_exerciseId, selectedOptionId) => {
        const state = get();
        const session = state.session;

        if (!session) {
          return { correct: false, correctAnswer: '' };
        }

        const currentExercise = session.queue[session.currentIndex];
        const isCorrect = selectedOptionId === currentExercise.correctAnswer;

        // Update session
        const newStreak = isCorrect ? session.streak + 1 : 0;
        const newMaxStreak = Math.max(session.maxStreak, newStreak);

        session.totalAnswered++;
        if (isCorrect) {
          session.correctAnswers++;
          session.score += 10 + (session.streak * 2); // Bonus for streaks
        }
        session.streak = newStreak;
        session.maxStreak = newMaxStreak;
        // Don't auto-advance - let user see result first

        set({ session });

        return {
          correct: isCorrect,
          correctAnswer: currentExercise.correctAnswer
        };
      },

      nextQuestion: () => {
        const state = get();
        const session = state.session;

        if (!session) return;

        session.currentIndex++;
        set({ session });
      },

      skipQuestion: () => {
        const state = get();
        const session = state.session;
        
        if (!session) return;
        
        session.currentIndex++;
        session.streak = 0; // Reset streak on skip
        
        set({ session });
      },

      endSession: () => {
        const state = get();
        const session = state.session;
        
        if (!session) return;
        
        // Update stats
        const duration = (new Date().getTime() - new Date(session.startTime).getTime()) / 1000;
        const avgTime = duration / Math.max(session.totalAnswered, 1);
        
        set((state) => ({
          session: null,
          stats: {
            ...state.stats,
            totalExercises: state.stats.totalExercises + session.totalAnswered,
            completedExercises: state.stats.completedExercises + 1,
            correctRate: session.totalAnswered > 0 
              ? (session.correctAnswers / session.totalAnswered) * 100 
              : 0,
            averageTime: (state.stats.averageTime + avgTime) / 2,
            byType: {
              ...state.stats.byType,
              [session.type]: {
                completed: state.stats.byType[session.type].completed + session.totalAnswered,
                correct: state.stats.byType[session.type].correct + session.correctAnswers
              }
            }
          }
        }));
      },

      resetStats: () => {
        set({
          stats: {
            totalExercises: 0,
            completedExercises: 0,
            correctRate: 0,
            averageTime: 0,
            byType: defaultExerciseStats
          }
        });
      },

      getCurrentExercise: () => {
        const session = get().session;
        if (!session || session.currentIndex >= session.queue.length) {
          return null;
        }
        return session.queue[session.currentIndex];
      },

      getProgress: () => {
        const session = get().session;
        if (!session) return { current: 0, total: 0 };
        return {
          current: session.currentIndex + 1,
          total: session.queue.length
        };
      },

      getScore: () => {
        const session = get().session;
        if (!session) return { correct: 0, total: 0, percentage: 0 };
        return {
          correct: session.correctAnswers,
          total: session.totalAnswered,
          percentage: session.totalAnswered > 0 
            ? Math.round((session.correctAnswers / session.totalAnswered) * 100) 
            : 0
        };
      }
    }),
    {
      name: 'hanzi-exercise-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ stats: state.stats })
    }
  )
);
