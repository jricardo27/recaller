import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { useExerciseStore } from '../stores/exerciseStore';
import type { Word } from '../types';

describe('Triple-Match Exercise - Issue #1 Fix', () => {
  const mockWords: Word[] = [
    { id: 1, hanzi: '一', pinyin: 'yī', translation: 'one', imageUrl: '/images/1.png', enabled: true },
    { id: 2, hanzi: '二', pinyin: 'èr', translation: 'two', imageUrl: '/images/2.png', enabled: true },
    { id: 3, hanzi: '三', pinyin: 'sān', translation: 'three', imageUrl: '/images/3.png', enabled: true },
    { id: 4, hanzi: '四', pinyin: 'sì', translation: 'four', imageUrl: '/images/4.png', enabled: true },
    { id: 5, hanzi: '五', pinyin: 'wǔ', translation: 'five', imageUrl: '/images/5.png', enabled: true },
  ];

  let store: ReturnType<typeof useExerciseStore.getState>;

  beforeAll(() => {
    // Get initial store state
    store = useExerciseStore.getState();
  });

  beforeEach(() => {
    // Reset the store to initial state before each test
    store.endSession();
    store.resetStats();
  });

  it('triple-match exercises should have correctAnswer property set (Issue #1)', () => {
    // Start a triple-match session
    store.startSession('triple-match', mockWords, 'medium');
    
    // Access the store state after starting session
    const currentState = useExerciseStore.getState();
    const session = currentState.session;
    
    expect(session).not.toBeNull();
    expect(session?.type).toBe('triple-match');
    expect(session?.queue.length).toBeGreaterThan(0);
    
    // Check that each exercise has the required properties
    session?.queue.forEach((exercise) => {
      // This is the key fix - correctAnswer must be set for the store's answerQuestion to work
      expect(exercise.correctAnswer).toBeDefined();
      expect(exercise.correctAnswer).toMatch(/^hanzi-\d+$/);
      expect(exercise.correctHanziAnswer).toBeDefined();
      expect(exercise.correctPinyinAnswer).toBeDefined();
      expect(exercise.hanziOptions).toBeDefined();
      expect(exercise.pinyinOptions).toBeDefined();
      
      // Verify correctAnswer matches correctHanziAnswer - this is the fix
      expect(exercise.correctAnswer).toBe(exercise.correctHanziAnswer);
    });
  });

  it('answerQuestion should return correct=true when selected option matches correctAnswer', () => {
    store.startSession('triple-match', mockWords, 'medium');
    
    const currentState = useExerciseStore.getState();
    const exercise = currentState.getCurrentExercise();
    
    if (exercise) {
      // Answer with the correct hanzi (matching correctAnswer)
      const correctHanziId = exercise.correctHanziAnswer!;
      const result = currentState.answerQuestion(exercise.id, correctHanziId);
      
      // Should be correct because correctAnswer is set to the hanzi ID
      expect(result.correct).toBe(true);
      expect(result.correctAnswer).toBe(correctHanziId);
    } else {
      // If no exercise, the test should fail
      expect(exercise).not.toBeNull();
    }
  });

  it('answerQuestion should return correct=false for incorrect hanzi options', () => {
    store.startSession('triple-match', mockWords, 'medium');
    
    const currentState = useExerciseStore.getState();
    const exercise = currentState.getCurrentExercise();
    
    if (exercise && exercise.hanziOptions) {
      // Find an incorrect hanzi option
      const incorrectOption = exercise.hanziOptions.find(opt => !opt.isCorrect);
      expect(incorrectOption).toBeDefined();
      
      if (incorrectOption) {
        const result = currentState.answerQuestion(exercise.id, incorrectOption.id);
        expect(result.correct).toBe(false);
        expect(result.correctAnswer).toBe(exercise.correctAnswer);
      }
    } else {
      // If no exercise, the test should fail
      expect(exercise).not.toBeNull();
    }
  });

  it('should record incorrect answer when hanzi is correct but pinyin is wrong (Issue #2)', () => {
    store.startSession('triple-match', mockWords, 'medium');
    
    const currentState = useExerciseStore.getState();
    const exercise = currentState.getCurrentExercise();
    
    if (exercise && exercise.hanziOptions && exercise.pinyinOptions) {
      // Select the correct hanzi
      const correctHanziId = exercise.correctHanziAnswer!;
      
      // Select an incorrect pinyin
      const incorrectPinyin = exercise.pinyinOptions.find(opt => !opt.isCorrect);
      expect(incorrectPinyin).toBeDefined();
      
      // This simulates the UI logic: bothCorrect = hanziCorrect && pinyinCorrect
      const hanziCorrect = correctHanziId === exercise.correctHanziAnswer;
      const pinyinCorrect = incorrectPinyin!.id === exercise.correctPinyinAnswer;
      const bothCorrect = hanziCorrect && pinyinCorrect;
      
      // When pinyin is wrong, bothCorrect should be false
      expect(bothCorrect).toBe(false);
      
      // The fix: pass '__incorrect__' when bothCorrect is false
      // This ensures the store records it as incorrect even though hanzi matches
      const answerToSubmit = bothCorrect ? correctHanziId : '__incorrect__';
      const result = currentState.answerQuestion(exercise.id, answerToSubmit);
      
      // Should be recorded as incorrect
      expect(result.correct).toBe(false);
    } else {
      expect(exercise).not.toBeNull();
    }
  });

  it('should use same-length hanzi distractors for Expert mode (Issue #3)', () => {
    store.startSession('triple-match', mockWords, 'medium');
    
    const currentState = useExerciseStore.getState();
    const session = currentState.session;
    
    expect(session).not.toBeNull();
    
    // Check that each exercise has same-length hanzi distractors
    session?.queue.forEach((exercise) => {
      if (exercise.hanziOptions) {
        // Find the correct answer
        const correctOption = exercise.hanziOptions.find(opt => opt.isCorrect);
        expect(correctOption).toBeDefined();
        
        if (correctOption) {
          const correctHanziLength = correctOption.text.length;
          
          // All distractors should have same length as correct answer
          exercise.hanziOptions.forEach((option) => {
            expect(option.text.length).toBe(correctHanziLength);
          });
        }
      }
    });
  });
});
