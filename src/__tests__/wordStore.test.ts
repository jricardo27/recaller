import { describe, it, expect, beforeEach } from 'vitest';
import { useWordStore } from '../stores/wordStore';
import type { Word, Card } from '../types';

describe('wordStore loadWords', () => {
  beforeEach(() => {
    // Reset the store before each test
    useWordStore.setState({
      words: [],
      cards: {},
      dbVersion: '',
      session: null
    });
  });

  it('should preserve enabled status for existing words', () => {
    // Setup: Load initial words with some disabled
    const initialWords: Word[] = [
      { id: 1, hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'hello', enabled: true },
      { id: 2, hanzi: '世界', pinyin: 'shì jiè', translation: 'world', enabled: false },
      { id: 3, hanzi: '中国', pinyin: 'zhōng guó', translation: 'China', enabled: true },
    ];
    
    useWordStore.getState().loadWords(initialWords, '1.0.0');
    
    // Verify initial state
    let words = useWordStore.getState().words;
    expect(words[0].enabled).toBe(true);
    expect(words[1].enabled).toBe(false);
    expect(words[2].enabled).toBe(true);
    
    // Add some card progress
    useWordStore.setState({
      cards: {
        1: { wordId: 1, interval: 5, easeFactor: 2.5, repetitions: 1, nextReview: new Date().toISOString(), lastReview: null },
        2: { wordId: 2, interval: 3, easeFactor: 2.0, repetitions: 2, nextReview: new Date().toISOString(), lastReview: null },
      } as Record<number, Card>
    });
    
    // Load updated words (same IDs, different order)
    const updatedWords: Word[] = [
      { id: 3, hanzi: '中国', pinyin: 'zhōng guó', translation: 'China', enabled: true },
      { id: 1, hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'hello', enabled: true },
      { id: 2, hanzi: '世界', pinyin: 'shì jiè', translation: 'world', enabled: true },
    ];
    
    useWordStore.getState().loadWords(updatedWords, '2.0.0');
    
    // Verify enabled status was preserved
    words = useWordStore.getState().words;
    const word1 = words.find(w => w.id === 1);
    const word2 = words.find(w => w.id === 2);
    const word3 = words.find(w => w.id === 3);
    
    expect(word1?.enabled).toBe(true);
    expect(word2?.enabled).toBe(false); // Should remain disabled
    expect(word3?.enabled).toBe(true);
  });

  it('should use default enabled status for new words', () => {
    // Setup: Load initial words
    const initialWords: Word[] = [
      { id: 1, hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'hello', enabled: true },
    ];
    
    useWordStore.getState().loadWords(initialWords, '1.0.0');
    
    // Load updated words with new word added
    const updatedWords: Word[] = [
      { id: 1, hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'hello', enabled: true },
      { id: 2, hanzi: '世界', pinyin: 'shì jiè', translation: 'world', enabled: false },
    ];
    
    useWordStore.getState().loadWords(updatedWords, '2.0.0');
    
    // Verify new word uses its default enabled status from the JSON
    const words = useWordStore.getState().words;
    const word2 = words.find(w => w.id === 2);
    expect(word2?.enabled).toBe(false);
  });

  it('should remove orphaned cards when words are deleted', () => {
    // Setup: Load initial words and add card progress
    const initialWords: Word[] = [
      { id: 1, hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'hello', enabled: true },
      { id: 2, hanzi: '世界', pinyin: 'shì jiè', translation: 'world', enabled: true },
      { id: 3, hanzi: '中国', pinyin: 'zhōng guó', translation: 'China', enabled: true },
    ];
    
    useWordStore.getState().loadWords(initialWords, '1.0.0');
    
    useWordStore.setState({
      cards: {
        1: { wordId: 1, interval: 5, easeFactor: 2.5, repetitions: 1, nextReview: new Date().toISOString(), lastReview: null },
        2: { wordId: 2, interval: 3, easeFactor: 2.0, repetitions: 2, nextReview: new Date().toISOString(), lastReview: null },
        3: { wordId: 3, interval: 10, easeFactor: 3.0, repetitions: 3, nextReview: new Date().toISOString(), lastReview: null },
      } as Record<number, Card>
    });
    
    // Load updated words with word 2 removed
    const updatedWords: Word[] = [
      { id: 1, hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'hello', enabled: true },
      { id: 3, hanzi: '中国', pinyin: 'zhōng guó', translation: 'China', enabled: true },
    ];
    
    useWordStore.getState().loadWords(updatedWords, '2.0.0');
    
    // Verify card for word 2 was removed
    const cards = useWordStore.getState().cards;
    expect(cards[1]).toBeDefined();
    expect(cards[2]).toBeUndefined(); // Should be removed
    expect(cards[3]).toBeDefined();
  });

  it('should update dbVersion', () => {
    const words: Word[] = [
      { id: 1, hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'hello', enabled: true },
    ];
    
    useWordStore.getState().loadWords(words, '1.0.0');
    expect(useWordStore.getState().dbVersion).toBe('1.0.0');
    
    useWordStore.getState().loadWords(words, '2.0.0');
    expect(useWordStore.getState().dbVersion).toBe('2.0.0');
  });
});
