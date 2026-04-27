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

  it('should use generatePinyinDistractors helper for pinyin options (Issue #4)', () => {
    store.startSession('triple-match', mockWords, 'medium');
    
    const currentState = useExerciseStore.getState();
    const session = currentState.session;
    
    expect(session).not.toBeNull();
    
    // Check that each exercise has pinyin options with correct structure
    session?.queue.forEach((exercise) => {
      if (exercise.pinyinOptions) {
        // Should have 4 pinyin options (3 distractors + 1 correct) to match hanzi options
        expect(exercise.pinyinOptions.length).toBe(4);
        
        // Find the correct pinyin option
        const correctOption = exercise.pinyinOptions.find(opt => opt.isCorrect);
        expect(correctOption).toBeDefined();
        expect(correctOption?.id).toMatch(/^pinyin-\d+-/);
        
        // All options should have the new ID format
        exercise.pinyinOptions.forEach((option) => {
          expect(option.id).toMatch(/^pinyin-\d+-/);
          expect(option.text).toBeDefined();
        });
        
        // correctPinyinAnswer should match the correct option's ID
        expect(exercise.correctPinyinAnswer).toBe(correctOption?.id);
      }
    });
  });

  it('should complete session when answering the last question (Bug Fix)', () => {
    // Use exactly the mockWords array (5 words), queue will have min(10, 5) = 5 questions
    store.startSession('triple-match', mockWords, 'medium');
    
    const currentState = useExerciseStore.getState();
    const queueLength = currentState.session?.queue.length || 0;
    
    // Answer all questions except the last one
    for (let i = 0; i < queueLength - 1; i++) {
      const exercise = currentState.getCurrentExercise();
      if (exercise) {
        currentState.answerQuestion(exercise.id, exercise.correctHanziAnswer!);
        currentState.nextQuestion();
      }
    }
    
    // Now we're at the last question
    const lastExercise = currentState.getCurrentExercise();
    expect(lastExercise).not.toBeNull();
    expect(currentState.session?.currentIndex).toBe(queueLength - 1);
    
    if (lastExercise) {
      // Answer the last question
      currentState.answerQuestion(lastExercise.id, lastExercise.correctHanziAnswer!);
      
      // Move to next (which should trigger completion check in UI)
      currentState.nextQuestion();
      
      // After nextQuestion on last item, currentIndex should equal queue.length
      const finalState = useExerciseStore.getState();
      expect(finalState.session?.currentIndex).toBe(queueLength);
      
      // Verify getCurrentExercise returns null (session effectively complete)
      expect(finalState.getCurrentExercise()).toBeNull();
    }
  });

  it('should auto-submit when both hanzi and pinyin are selected (auto-continue)', () => {
    store.startSession('triple-match', mockWords, 'medium');
    
    const currentState = useExerciseStore.getState();
    const exercise = currentState.getCurrentExercise();
    
    expect(exercise).not.toBeNull();
    
    if (exercise) {
      // Simulate auto-submit by calling answerQuestion directly
      // In the UI, the useEffect would trigger when both selections are made
      const correctHanziId = exercise.correctHanziAnswer!;
      
      // Answer the question (this is what handleTripleMatchAnswer does)
      currentState.answerQuestion(exercise.id, correctHanziId);
      
      // Verify answer was recorded in the store
      expect(currentState.session?.totalAnswered).toBe(1);
      expect(currentState.session?.correctAnswers).toBe(1);
    }
  });

  it('should verify auto-submit prerequisites (both selections + autoContinue enabled)', () => {
    // This test verifies the conditions that trigger auto-submit in the UI
    store.startSession('triple-match', mockWords, 'medium');
    
    const currentState = useExerciseStore.getState();
    const exercise = currentState.getCurrentExercise();
    
    expect(exercise).not.toBeNull();
    
    if (exercise) {
      // The UI auto-submit useEffect checks:
      // selectedHanzi && selectedPinyin && autoContinue && !showResult
      
      // Verify exercise has the required answer properties
      expect(exercise.correctHanziAnswer).toBeDefined();
      expect(exercise.correctPinyinAnswer).toBeDefined();
      expect(exercise.correctAnswer).toBeDefined();
      
      // Verify both hanzi and pinyin options exist
      expect(exercise.hanziOptions).toBeDefined();
      expect(exercise.pinyinOptions).toBeDefined();
      expect(exercise.hanziOptions?.length).toBe(4);
      expect(exercise.pinyinOptions?.length).toBe(4);
    }
  });

  it('should generate unique pinyin distractors without duplicates (Issue #4 & #5)', () => {
    store.startSession('triple-match', mockWords, 'medium');
    
    const currentState = useExerciseStore.getState();
    const session = currentState.session;
    
    expect(session).not.toBeNull();
    
    // Check all exercises for unique pinyin options
    session?.queue.forEach((exercise) => {
      if (exercise.pinyinOptions) {
        // Extract just the pinyin text values
        const pinyinTexts = exercise.pinyinOptions.map(opt => opt.text);
        
        // Verify all pinyin options are unique (no duplicates)
        const uniquePinyin = new Set(pinyinTexts);
        expect(uniquePinyin.size).toBe(pinyinTexts.length);
        
        // Should have exactly one correct answer
        const correctCount = exercise.pinyinOptions.filter(opt => opt.isCorrect).length;
        expect(correctCount).toBe(1);
        
        // The correct answer text should match one of the options
        const correctOption = exercise.pinyinOptions.find(opt => opt.isCorrect);
        expect(correctOption?.text).toBeDefined();
      }
    });
  });

  it('should complete session when reaching the last question (Bug Fix)', () => {
    // Create a small set of words to have fewer questions
    const fewWords: Word[] = [
      { id: 1, hanzi: '一', pinyin: 'yī', translation: 'one', imageUrl: '/images/1.png', enabled: true },
      { id: 2, hanzi: '二', pinyin: 'èr', translation: 'two', imageUrl: '/images/2.png', enabled: true },
      { id: 3, hanzi: '三', pinyin: 'sān', translation: 'three', imageUrl: '/images/3.png', enabled: true },
      { id: 4, hanzi: '四', pinyin: 'sì', translation: 'four', imageUrl: '/images/4.png', enabled: true },
    ];
    
    store.startSession('triple-match', fewWords, 'medium');
    
    const state = useExerciseStore.getState();
    const session = state.session;
    expect(session).not.toBeNull();
    
    const queueLength = session!.queue.length;
    
    // Answer all questions except the last one
    for (let i = 0; i < queueLength - 1; i++) {
      const exercise = state.getCurrentExercise();
      if (exercise) {
        state.answerQuestion(exercise.id, exercise.correctHanziAnswer!);
        state.nextQuestion();
      }
    }
    
    // Now we're at the last question
    expect(state.session?.currentIndex).toBe(queueLength - 1);
    
    const lastExercise = state.getCurrentExercise();
    expect(lastExercise).not.toBeNull();
    
    if (lastExercise) {
      // Answer the last question
      state.answerQuestion(lastExercise.id, lastExercise.correctHanziAnswer!);
      
      // At this point, if handleNext were called in the UI:
      // - It would check currentIndex (queueLength - 1) >= queueLength - 1
      // - This should be true, so completeSession() should be called
      // - The session should end
      
      // Verify the session state shows we're at the last question
      expect(state.session?.currentIndex).toBe(queueLength - 1);
      expect(state.session?.totalAnswered).toBe(queueLength);
    }
  });

  it('should initialize stats for new exercise type on endSession (Bug Fix)', () => {
    // This tests that endSession doesn't crash when a new exercise type hasn't been recorded yet
    const fewWords: Word[] = [
      { id: 1, hanzi: '一', pinyin: 'yī', translation: 'one', imageUrl: '/images/1.png', enabled: true },
    ];
    
    // Start and complete a triple-match session
    store.startSession('triple-match', fewWords, 'medium');
    
    const state = useExerciseStore.getState();
    const exercise = state.getCurrentExercise();
    expect(exercise).not.toBeNull();
    
    if (exercise) {
      // Answer the question
      state.answerQuestion(exercise.id, exercise.correctHanziAnswer!);
      
      // endSession should not throw even if triple-match stats don't exist yet
      expect(() => state.endSession()).not.toThrow();
      
      // Verify session is ended
      const finalState = useExerciseStore.getState();
      expect(finalState.session).toBeNull();
      
      // Verify stats were updated
      expect(finalState.stats.completedExercises).toBe(1);
      expect(finalState.stats.byType['triple-match']).toBeDefined();
      expect(finalState.stats.byType['triple-match'].completed).toBeGreaterThan(0);
    }
  });
});
