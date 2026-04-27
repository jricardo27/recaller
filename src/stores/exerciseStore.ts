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

// Helper: Generate tone variations of a pinyin
// Returns an array of 4 pinyin strings (3 wrong tone variations + correct one)
function generateToneVariations(correctPinyin: string): string[] {
  // Map of vowels with different tones
  const toneMap: Record<string, string[]> = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    'A': ['Ā', 'Á', 'Ǎ', 'À', 'A'],
    'E': ['Ē', 'É', 'Ě', 'È', 'E'],
    'I': ['Ī', 'Í', 'Ǐ', 'Ì', 'I'],
    'O': ['Ō', 'Ó', 'Ǒ', 'Ò', 'O'],
    'U': ['Ū', 'Ú', 'Ǔ', 'Ù', 'U'],
    'Ü': ['Ǖ', 'Ǘ', 'Ǚ', 'Ǜ', 'Ü']
  };

  // Find the vowel that carries the tone (priority: a, e, o, then last vowel)
  const findVowelWithTone = (pinyin: string): { vowel: string; index: number } | null => {
    // Priority order for tone placement: a > e > o
    // Check for both toned and base vowels
    const priorityVowels = ['a', 'e', 'o', 'A', 'E', 'O'];
    const tonedPriorityVowels = ['ā', 'á', 'ǎ', 'à', 'Ā', 'Á', 'Ǎ', 'À', 'ē', 'é', 'ě', 'è', 'Ē', 'É', 'Ě', 'È', 'ō', 'ó', 'ǒ', 'ò', 'Ō', 'Ó', 'Ǒ', 'Ò'];

    // First check for toned priority vowels (they indicate where tone is)
    for (let i = 0; i < pinyin.length; i++) {
      const char = pinyin[i];
      if (tonedPriorityVowels.includes(char)) {
        // Find the corresponding base vowel
        const baseVowel = priorityVowels.find(v => toneMap[v]?.includes(char));
        if (baseVowel) {
          return { vowel: baseVowel, index: i };
        }
      }
    }

    // Then check for base priority vowels
    for (const v of priorityVowels) {
      const idx = pinyin.indexOf(v);
      if (idx !== -1) {
        return { vowel: v, index: idx };
      }
    }

    // Check for toned i, u, ü
    const tonedOtherVowels = ['ī', 'í', 'ǐ', 'ì', 'Ī', 'Í', 'Ǐ', 'Ì', 'ū', 'ú', 'ǔ', 'ù', 'Ū', 'Ú', 'Ǔ', 'Ù', 'ǖ', 'ǘ', 'ǚ', 'ǜ', 'Ǖ', 'Ǘ', 'Ǚ', 'Ǜ'];
    for (let i = pinyin.length - 1; i >= 0; i--) {
      const char = pinyin[i];
      if (tonedOtherVowels.includes(char)) {
        const baseVowel = ['i', 'u', 'ü', 'I', 'U', 'Ü'].find(v => toneMap[v]?.includes(char));
        if (baseVowel) {
          return { vowel: baseVowel, index: i };
        }
      }
    }

    // Check for base i, u, ü (tone goes on last vowel for iu, ui combinations)
    const otherVowels = ['i', 'u', 'ü', 'I', 'U', 'Ü'];
    let lastVowelIndex = -1;
    let lastVowel = '';
    for (const v of otherVowels) {
      const idx = pinyin.lastIndexOf(v);
      if (idx > lastVowelIndex) {
        lastVowelIndex = idx;
        lastVowel = v;
      }
    }
    if (lastVowelIndex !== -1) {
      return { vowel: lastVowel, index: lastVowelIndex };
    }
    return null;
  };

  // Extract base pinyin (remove tone)
  const extractBase = (pinyin: string): string => {
    let base = pinyin;
    // Replace all toned vowels with base vowels
    for (const [baseVowel, tonedVowels] of Object.entries(toneMap)) {
      for (const toned of tonedVowels.slice(0, 4)) {
        base = base.replace(new RegExp(toned, 'g'), baseVowel);
      }
    }
    return base;
  };

  const vowelInfo = findVowelWithTone(correctPinyin);
  if (!vowelInfo) {
    // If no vowel found, return the pinyin with slight modifications
    return shuffle([correctPinyin, correctPinyin + '1', correctPinyin + '2', correctPinyin + '3'].slice(0, 4));
  }

  const basePinyin = extractBase(correctPinyin);
  const { vowel, index } = vowelInfo;
  const lowercaseVowel = vowel.toLowerCase();
  const tones = toneMap[lowercaseVowel] || toneMap[vowel];

  // Get the current tone index (0-4 for first through neutral)
  let currentToneIndex = 4; // default to neutral
  const tonedVowel = correctPinyin[index];
  if (tones) {
    const toneIdx = tones.indexOf(tonedVowel);
    if (toneIdx !== -1) {
      currentToneIndex = toneIdx;
    }
  }

  // Generate all tone variations except the current one
  const variations: string[] = [];
  for (let i = 0; i < 5; i++) {
    if (i !== currentToneIndex && tones) {
      const newVowel = lowercaseVowel === vowel ? tones[i] : tones[i].toUpperCase();
      const variation = basePinyin.slice(0, index) + newVowel + basePinyin.slice(index + 1);
      variations.push(variation);
    }
  }

  // Select 3 random variations
  const selectedDistractors = shuffle(variations).slice(0, 3);

  // Add the correct one and shuffle
  return shuffle([...selectedDistractors, correctPinyin]);
}

// Generate distractor pinyin options with tone variations
function generatePinyinDistractors(correctPinyin: string, allWords: Word[]): string[] {
  // Get unique pinyin values (excluding the correct one) using Set for efficiency
  const uniquePinyin = new Set(
    allWords.map(w => w.pinyin).filter((p): p is string => !!p && p !== correctPinyin)
  );
  
  // Convert to array and pick 3 random distractors without shuffling entire array
  const candidates = Array.from(uniquePinyin);
  const selectedDistractors: string[] = [];
  
  while (selectedDistractors.length < 3 && candidates.length > 0) {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    selectedDistractors.push(candidates[randomIndex]);
    // Remove selected candidate to avoid duplicates
    candidates.splice(randomIndex, 1);
  }
  
  // Add the correct one and shuffle final result
  return shuffle([...selectedDistractors, correctPinyin]);
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

        // Get pinyin options based on difficulty
        // 'hard' difficulty uses tone variations (same pinyin, different tones)
        // other difficulties use random pinyin from other words
        const pinyinStrings = _difficulty === 'hard'
          ? generateToneVariations(word.pinyin)
          : generatePinyinDistractors(word.pinyin, enabledWords);

        const pinyinOptions: ExerciseOption[] = pinyinStrings.map((pinyin, index) => ({
          id: `pinyin-${index}-${pinyin}`,
          text: pinyin,
          isCorrect: pinyin === word.pinyin
        }));

        exercise.hanziOptions = shuffle(hanziOptions);
        exercise.pinyinOptions = shuffle(pinyinOptions);
        exercise.correctHanziAnswer = "hanzi-" + word.id;
        // Find the correct pinyin option ID
        exercise.correctPinyinAnswer = pinyinOptions.find(opt => opt.isCorrect)?.id || '';
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
        
        set((state) => {
          // Initialize type stats if they don't exist
          const typeStats = state.stats.byType[session.type] || { completed: 0, correct: 0 };
          
          return {
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
                  completed: typeStats.completed + session.totalAnswered,
                  correct: typeStats.correct + session.correctAnswers
                }
              }
            }
          };
        });
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
