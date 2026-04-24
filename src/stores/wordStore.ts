import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Word, Card, StudySession, Quality, WordWithProgress } from '../types';
import { calculateNextReview, createNewCard, isCardDue, daysUntilReview } from '../algorithms/sm2';
import { config } from '../config/env';

interface WordState {
  // Data
  words: Word[];
  cards: Record<number, Card>;
  
  // Session
  session: StudySession | null;
  
  // Actions
  loadWords: (words: Word[]) => void;
  startSession: () => void;
  rateCard: (wordId: number, quality: Quality) => void;
  toggleWord: (wordId: number) => void;
  resetWord: (wordId: number) => void;
  
  // Getters
  getDueCards: () => WordWithProgress[];
  getNewWords: (count: number) => WordWithProgress[];
  getAllWords: () => WordWithProgress[];
  getSessionWord: () => WordWithProgress | null;
  getStats: () => {
    total: number;
    enabled: number;
    due: number;
    new: number;
    mastered: number;
  };
}

// Use max new words per day from environment config
const MAX_NEW_PER_SESSION = config.maxNewPerDay;

export const useWordStore = create<WordState>()(
  persist(
    (set, get) => ({
      words: [],
      cards: {},
      session: null,

      loadWords: (words) => {
        set({ words });
      },

      startSession: () => {
        const state = get();
        const enabledWords = state.words.filter(w => w.enabled);
        
        // Get due cards
        const dueCards: number[] = [];
        const newWords: number[] = [];
        
        for (const word of enabledWords) {
          const card = state.cards[word.id];
          if (!card) {
            // New word
            newWords.push(word.id);
          } else if (isCardDue(card)) {
            // Due for review
            dueCards.push(word.id);
          }
        }

        // Shuffle arrays
        const shuffledDue = dueCards.sort(() => Math.random() - 0.5);
        const shuffledNew = newWords.sort(() => Math.random() - 0.5).slice(0, MAX_NEW_PER_SESSION);

        // Build queue: new words first, then due reviews
        const queue = [...shuffledNew, ...shuffledDue];

        set({
          session: {
            queue,
            currentIndex: 0,
            stats: {
              newWords: shuffledNew.length,
              reviews: shuffledDue.length,
              correct: 0,
              incorrect: 0
            }
          }
        });
      },

      rateCard: (wordId, quality) => {
        set((state) => {
          const card = state.cards[wordId];
          let newCard: Card;

          if (!card) {
            // First time seeing this word
            newCard = createNewCard(wordId);
            newCard = calculateNextReview(newCard, quality);
          } else {
            newCard = calculateNextReview(card, quality);
          }

          // Update session
          const session = state.session;
          if (session) {
            const newStats = { ...session.stats };
            if (quality >= 3) {
              newStats.correct++;
            } else {
              newStats.incorrect++;
            }
            
            session.stats = newStats;
            session.currentIndex++;
          }

          return {
            cards: { ...state.cards, [wordId]: newCard },
            session
          };
        });
      },

      toggleWord: (wordId) => {
        set((state) => ({
          words: state.words.map(w =>
            w.id === wordId ? { ...w, enabled: !w.enabled } : w
          )
        }));
      },

      resetWord: (wordId) => {
        set((state) => {
          const { [wordId]: _, ...remainingCards } = state.cards;
          return { cards: remainingCards };
        });
      },

      getDueCards: () => {
        const state = get();
        return state.words
          .filter(w => w.enabled)
          .map(w => {
            const card = state.cards[w.id];
            return {
              ...w,
              card,
              isNew: !card,
              isDue: card ? isCardDue(card) : false,
              daysUntilReview: card ? daysUntilReview(card) : 0
            };
          })
          .filter(w => w.isDue && !w.isNew);
      },

      getNewWords: (count) => {
        const state = get();
        return state.words
          .filter(w => w.enabled && !state.cards[w.id])
          .slice(0, count)
          .map(w => ({
            ...w,
            isNew: true,
            isDue: true,
            daysUntilReview: 0
          }));
      },

      getAllWords: () => {
        const state = get();
        return state.words.map(w => {
          const card = state.cards[w.id];
          return {
            ...w,
            card,
            isNew: !card,
            isDue: card ? isCardDue(card) : false,
            daysUntilReview: card ? daysUntilReview(card) : 0
          };
        });
      },

      getSessionWord: () => {
        const state = get();
        if (!state.session || state.session.currentIndex >= state.session.queue.length) {
          return null;
        }
        
        const wordId = state.session.queue[state.session.currentIndex];
        const word = state.words.find(w => w.id === wordId);
        if (!word) return null;

        const card = state.cards[word.id];
        return {
          ...word,
          card,
          isNew: !card,
          isDue: true,
          daysUntilReview: 0
        };
      },

      getStats: () => {
        const state = get();
        const enabledWords = state.words.filter(w => w.enabled);
        const totalEnabled = enabledWords.length;
        
        let due = 0;
        let newWords = 0;
        let mastered = 0;

        for (const word of enabledWords) {
          const card = state.cards[word.id];
          if (!card) {
            newWords++;
          } else if (isCardDue(card)) {
            due++;
          } else if (card.interval > 30) {
            mastered++;
          }
        }

        return {
          total: state.words.length,
          enabled: totalEnabled,
          due,
          new: newWords,
          mastered
        };
      }
    }),
    {
      name: 'hanzi-memory-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cards: state.cards,
        words: state.words
      })
    }
  )
);
