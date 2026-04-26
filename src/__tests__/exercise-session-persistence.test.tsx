import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Exercise } from '../components/Exercise/Exercise';
import * as exerciseStore from '../stores/exerciseStore';
import * as wordStore from '../stores/wordStore';

// Mock the stores
vi.mock('../stores/exerciseStore');
vi.mock('../stores/wordStore');

describe('Exercise session persistence', () => {
  const mockEndSession = vi.fn();
  const mockGetScore = vi.fn().mockReturnValue({ correct: 5, total: 5, percentage: 100 });
  const mockOnFinish = vi.fn();
  const mockOnExit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock exercise store with a completed session
    vi.mocked(exerciseStore.useExerciseStore).mockImplementation((selector) => {
      const state = {
        session: {
          type: 'hanzi-to-pinyin' as import('../types/exercise').ExerciseType,
          queue: [{}, {}, {}, {}, {}] as import('../types/exercise').Exercise[], // 5 items in queue
          currentIndex: 5,
          score: 5,
          totalAnswered: 5,
          correctAnswers: 5,
          streak: 5,
          maxStreak: 5,
          startTime: new Date().toISOString(),
        },
        stats: {
          totalExercises: 0,
          completedExercises: 0,
          correctRate: 0,
          averageTime: 0,
          byType: {} as Record<import('../types/exercise').ExerciseType, { completed: number; correct: number }>,
        },
        startSession: vi.fn(),
        endSession: mockEndSession,
        answerQuestion: vi.fn(),
        nextQuestion: vi.fn(),
        skipQuestion: vi.fn(),
        resetStats: vi.fn(),
        getCurrentExercise: vi.fn().mockReturnValue(null),
        getProgress: vi.fn().mockReturnValue({ current: 5, total: 5 }),
        getScore: mockGetScore,
      };
      return selector(state);
    });

    // Mock word store
    vi.mocked(wordStore.useWordStore).mockImplementation((selector) => {
      const state = {
        words: [],
        cards: {},
        session: null,
        loadWords: vi.fn(),
        startSession: vi.fn(),
        rateCard: vi.fn(),
        toggleWord: vi.fn(),
        resetWord: vi.fn(),
        getDueCards: vi.fn().mockReturnValue([]),
        getNewWords: vi.fn().mockReturnValue([]),
        getAllWords: vi.fn().mockReturnValue([]),
        getSessionWord: vi.fn().mockReturnValue(null),
        getStats: vi.fn().mockReturnValue({
          total: 0,
          enabled: 0,
          due: 0,
          new: 0,
          mastered: 0,
        }),
      };
      return selector(state);
    });
  });

  it('should call endSession and display final score when session completes', () => {
    render(
      <Exercise
        type="hanzi-to-pinyin"
        difficulty="medium"
        onFinish={mockOnFinish}
        onExit={mockOnExit}
      />
    );

    // Verify endSession was called (session stats persisted to global store)
    expect(mockEndSession).toHaveBeenCalled();

    // Verify final score is displayed (5/5, 100%)
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/Perfect score!/i)).toBeInTheDocument();
  });
});
