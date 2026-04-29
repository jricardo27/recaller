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
function generateToneVariations(correctPinyin: string, allWords: Word[]): string[] {
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

  // Parse pinyin into syllables, tracking their positions
  // Supports: "yǒu / méi yǒu" → [{text: 'yǒu', delimiter: ''}, {text: 'méi', delimiter: ' / '}, {text: 'yǒu', delimiter: ' '}]
  type Syllable = {
    text: string;
    base: string;
    toneIndex: number;
    prefixDelimiter: string; // delimiter before this syllable
  };

  // Find the vowel that carries the tone (priority: a, e, o, then last vowel)
  const findVowelWithTone = (pinyin: string): { vowel: string; index: number } | null => {
    const priorityVowels = ['a', 'e', 'o', 'A', 'E', 'O'];
    const tonedPriorityVowels = ['ā', 'á', 'ǎ', 'à', 'Ā', 'Á', 'Ǎ', 'À', 'ē', 'é', 'ě', 'è', 'Ē', 'É', 'Ě', 'È', 'ō', 'ó', 'ǒ', 'ò', 'Ō', 'Ó', 'Ǒ', 'Ò'];
    const tonedOtherVowels = ['ī', 'í', 'ǐ', 'ì', 'Ī', 'Í', 'Ǐ', 'Ì', 'ū', 'ú', 'ǔ', 'ù', 'Ū', 'Ú', 'Ǔ', 'Ù', 'ǖ', 'ǘ', 'ǚ', 'ǜ', 'Ǖ', 'Ǘ', 'Ǚ', 'Ǜ'];
    const otherVowels = ['i', 'u', 'ü', 'I', 'U', 'Ü'];

    // Check for toned priority vowels
    for (let i = 0; i < pinyin.length; i++) {
      const char = pinyin[i];
      if (tonedPriorityVowels.includes(char)) {
        const baseVowel = priorityVowels.find(v => toneMap[v]?.includes(char));
        if (baseVowel) return { vowel: baseVowel, index: i };
      }
    }

    // Check for base priority vowels
    for (const v of priorityVowels) {
      const idx = pinyin.indexOf(v);
      if (idx !== -1) return { vowel: v, index: idx };
    }

    // Check for toned i, u, ü (from end)
    for (let i = pinyin.length - 1; i >= 0; i--) {
      const char = pinyin[i];
      if (tonedOtherVowels.includes(char)) {
        const baseVowel = otherVowels.find(v => toneMap[v]?.includes(char));
        if (baseVowel) return { vowel: baseVowel, index: i };
      }
    }

    // Check for base i, u, ü (last occurrence)
    let lastVowelIndex = -1;
    let lastVowel = '';
    for (const v of otherVowels) {
      const idx = pinyin.lastIndexOf(v);
      if (idx > lastVowelIndex) {
        lastVowelIndex = idx;
        lastVowel = v;
      }
    }
    if (lastVowelIndex !== -1) return { vowel: lastVowel, index: lastVowelIndex };
    return null;
  };

  // Extract base pinyin (remove all tones)
  const extractBase = (pinyin: string): string => {
    let base = pinyin;
    for (const [baseVowel, tonedVowels] of Object.entries(toneMap)) {
      for (const toned of tonedVowels.slice(0, 4)) {
        base = base.replaceAll(toned, baseVowel);
      }
    }
    return base.toLowerCase().trim();
  };

  // Get tone index for a syllable
  const getToneIndex = (syllable: string): number => {
    const vowelInfo = findVowelWithTone(syllable);
    if (!vowelInfo) return 4;
    const { vowel, index } = vowelInfo;
    const tones = toneMap[vowel.toLowerCase()] || toneMap[vowel];
    const tonedVowel = syllable[index];
    const toneIdx = tones?.indexOf(tonedVowel);
    return toneIdx !== -1 ? toneIdx : 4;
  };

  // Generate a syllable with a specific tone
  const generateSyllableWithTone = (baseSyllable: string, toneIndex: number): string => {
    const vowelInfo = findVowelWithTone(baseSyllable);
    if (!vowelInfo) return baseSyllable;

    const base = extractBase(baseSyllable);
    const { vowel, index } = vowelInfo;
    const tones = toneMap[vowel.toLowerCase()] || toneMap[vowel];

    if (tones && toneIndex >= 0 && toneIndex < 5) {
      const newVowel = vowel.toLowerCase() === vowel ? tones[toneIndex] : tones[toneIndex].toUpperCase();
      return base.slice(0, index) + newVowel + base.slice(index + 1);
    }
    return baseSyllable;
  };

  // Parse pinyin into syllables with delimiters
  const parsePinyin = (pinyin: string): Syllable[] => {
    const syllables: Syllable[] = [];
    // Split by delimiters but keep the delimiters
    const parts = pinyin.split(/(\s*\/\s*|\s*,\s*|\s+)/).filter(s => s.length > 0);

    let currentDelimiter = '';
    for (const part of parts) {
      if (/^\s*[/,]\s*$/.test(part) || /^\s+$/.test(part)) {
        // This is a delimiter, save it for the next syllable
        currentDelimiter += part;
      } else {
        // This is a syllable
        syllables.push({
          text: part.trim(),
          base: extractBase(part),
          toneIndex: getToneIndex(part.trim()),
          prefixDelimiter: currentDelimiter
        });
        currentDelimiter = '';
      }
    }
    return syllables;
  };

  // Group syllables by their base to ensure consistent tone changes
  const syllables = parsePinyin(correctPinyin);
  const baseToSyllableIndices: Record<string, number[]> = {};
  syllables.forEach((syl, idx) => {
    if (!baseToSyllableIndices[syl.base]) {
      baseToSyllableIndices[syl.base] = [];
    }
    baseToSyllableIndices[syl.base].push(idx);
  });

  const uniqueBases = Object.keys(baseToSyllableIndices);
  const getCorrectToneForBase = (base: string): number => {
    const firstSylIndex = baseToSyllableIndices[base][0];
    return syllables[firstSylIndex].toneIndex;
  };

  // Generate variations
  const fullVariations: string[] = [];
  const usedCombinations = new Set<string>();

  // Include correct answer
  fullVariations.push(correctPinyin);
  usedCombinations.add(uniqueBases.map(b => getCorrectToneForBase(b)).join(','));

  // Generate 3 distractors with retry logic for duplicates
  let distractorsGenerated = 0;
  let attempts = 0;
  const maxAttempts = 50;

  while (distractorsGenerated < 3 && attempts < maxAttempts) {
    attempts++;

    // Cycle through which base to vary
    const baseToVary = uniqueBases[distractorsGenerated % uniqueBases.length];
    const correctTone = getCorrectToneForBase(baseToVary);

    // Generate new tone for this base
    let newTone: number;
    if (distractorsGenerated === 0) {
      // First distractor: use next tone
      newTone = (correctTone + 1) % 5;
    } else if (distractorsGenerated === 1 && uniqueBases.length > 1) {
      // Second distractor: use second next tone (prefer varying different base)
      newTone = (correctTone + 2) % 5;
    } else {
      // Try random tones until we find an unused one
      const usedTones = new Set<number>();
      usedTones.add(correctTone); // exclude the correct tone

      // Find already used tones for this base
      for (const key of usedCombinations) {
        const tones = key.split(',').map(Number);
        const baseIndex = uniqueBases.indexOf(baseToVary);
        if (baseIndex >= 0 && baseIndex < tones.length) {
          usedTones.add(tones[baseIndex]);
        }
      }

      // Find an unused tone
      const availableTones = [0, 1, 2, 3, 4].filter(t => !usedTones.has(t));
      if (availableTones.length === 0) {
        // All tones used for this base, try varying a different base
        continue;
      }
      newTone = availableTones[Math.floor(Math.random() * availableTones.length)];
    }

    // Build combination key
    const comboKey = uniqueBases.map(b => b === baseToVary ? newTone : getCorrectToneForBase(b)).join(',');
    if (usedCombinations.has(comboKey)) {
      continue; // Try again with different parameters
    }

    // Generate the variation
    const newPinyin = syllables.map(syl => {
      const base = syl.base;
      const tone = base === baseToVary ? newTone : getCorrectToneForBase(base);
      const newSyllableText = generateSyllableWithTone(syl.text, tone);
      return syl.prefixDelimiter + newSyllableText;
    }).join('');

    fullVariations.push(newPinyin);
    usedCombinations.add(comboKey);
    distractorsGenerated++;
  }

  // Fill remaining slots with random pinyin from other words (better UX than "(N)" suffix)
  if (fullVariations.length < 4) {
    const needed = 4 - fullVariations.length;

    // Get unique pinyin values from other words (excluding those already in variations)
    const usedPinyin = new Set(fullVariations);
    const otherPinyin = allWords
      .map(w => w.pinyin)
      .filter((p): p is string => !!p && p !== correctPinyin && !usedPinyin.has(p));

    // Get unique values and shuffle
    const uniqueOtherPinyin = shuffle([...new Set(otherPinyin)]);

    // Add as many as needed (up to available)
    for (let i = 0; i < needed && i < uniqueOtherPinyin.length; i++) {
      fullVariations.push(uniqueOtherPinyin[i]);
    }
  }

  // Final fallback: only if still not enough (extremely rare edge case)
  let counter = 1;
  while (fullVariations.length < 4) {
    fullVariations.push(correctPinyin + ` (${counter})`);
    counter++;
  }

  return shuffle(fullVariations.slice(0, 4));
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

// Helper: Create hanzi options with same-length distractors and fallback
function createHanziOptions(
  word: Word,
  enabledWords: Word[],
  subtextKey: 'pinyin' | 'translation'
): { options: ExerciseOption[]; correctId: string } {
  const hanziLength = word.hanzi.length;
  const sameLengthWords = enabledWords.filter(w => w.id !== word.id && w.hanzi.length === hanziLength);

  // Get same-length distractors first
  let distractors = shuffle(sameLengthWords).slice(0, 3);

  // Fallback: if not enough same-length words, add other words of different lengths
  if (distractors.length < 3) {
    const otherWords = enabledWords.filter(w => w.id !== word.id && w.hanzi.length !== hanziLength);
    const additionalDistractors = shuffle(otherWords).slice(0, 3 - distractors.length);
    distractors = [...distractors, ...additionalDistractors];
  }

  const options: ExerciseOption[] = distractors.map(w => ({
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

        // Get 3 distractor words for hanzi options (same-length for Expert mode, with fallback)
        const hanziLength = word.hanzi.length;
        const sameLengthWords = enabledWords.filter(w => w.id !== word.id && w.hanzi.length === hanziLength);
        let hanziDistractors = shuffle(sameLengthWords).slice(0, 3);

        // Fallback: if not enough same-length words, add other words of different lengths
        if (hanziDistractors.length < 3) {
          const otherWords = enabledWords.filter(w => w.id !== word.id && w.hanzi.length !== hanziLength);
          const additionalDistractors = shuffle(otherWords).slice(0, 3 - hanziDistractors.length);
          hanziDistractors = [...hanziDistractors, ...additionalDistractors];
        }

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
          ? generateToneVariations(word.pinyin, enabledWords)
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
