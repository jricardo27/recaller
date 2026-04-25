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
          currentIndex: 5,
          queue: [{}, {}, {}, {}, {}], // 5 items in queue
        },
        startSession: vi.fn(),
        endSession: mockEndSession,
        answerQuestion: vi.fn(),
        nextQuestion: vi.fn(),
        skipQuestion: vi.fn(),
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
