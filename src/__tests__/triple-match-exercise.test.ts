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
});
