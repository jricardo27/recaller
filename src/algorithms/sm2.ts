import { addDays, differenceInDays, parseISO, formatISO } from 'date-fns';
import type { Card, Quality } from '../types';

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

/**
 * Calculate next review date using SM-2 algorithm
 * 
 * @param card - Current card state
 * @param quality - Quality of recall (1-5)
 * @returns Updated card with new interval and review date
 */
export function calculateNextReview(card: Card, quality: Quality): Card {
  let { interval, repetitions, easeFactor } = card;

  // Update ease factor based on quality
  // Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const qualityDiff = 5 - quality;
  easeFactor = easeFactor + (0.1 - qualityDiff * (0.08 + qualityDiff * 0.02));
  easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor);

  // Calculate new interval
  if (quality < 3) {
    // Failed - reset repetitions, use shorter interval
    repetitions = 0;
    interval = 1;
  } else {
    // Passed - increase repetitions and interval
    repetitions += 1;
    
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  return {
    wordId: card.wordId,
    interval,
    repetitions,
    easeFactor,
    nextReview: formatISO(addDays(new Date(), interval), { representation: 'date' }),
    lastReview: formatISO(new Date(), { representation: 'date' })
  };
}

/**
 * Create a new card with default values
 */
export function createNewCard(wordId: number): Card {
  return {
    wordId,
    interval: 0,
    repetitions: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    nextReview: formatISO(new Date(), { representation: 'date' }),
    lastReview: null
  };
}

/**
 * Check if a card is due for review
 */
export function isCardDue(card: Card): boolean {
  const today = new Date();
  const reviewDate = parseISO(card.nextReview);
  return differenceInDays(today, reviewDate) >= 0;
}

/**
 * Get days until next review
 */
export function daysUntilReview(card: Card): number {
  const today = new Date();
  const reviewDate = parseISO(card.nextReview);
  return differenceInDays(reviewDate, today);
}

/**
 * Get quality label for display
 */
export function getQualityLabel(quality: Quality): string {
  switch (quality) {
    case 1: return 'Again';
    case 2: return 'Hard';
    case 3: return 'Good';
    case 4: return 'Easy';
    case 5: return 'Perfect';
    default: return 'Good';
  }
}

/**
 * Get quality color for UI
 */
export function getQualityColor(quality: Quality): string {
  switch (quality) {
    case 1: return 'bg-red-500 hover:bg-red-600';
    case 2: return 'bg-orange-500 hover:bg-orange-600';
    case 3: return 'bg-blue-500 hover:bg-blue-600';
    case 4: return 'bg-green-500 hover:bg-green-600';
    case 5: return 'bg-emerald-500 hover:bg-emerald-600';
    default: return 'bg-blue-500 hover:bg-blue-600';
  }
}

/**
 * Calculate next interval preview (for UI display)
 */
export function getIntervalPreview(card: Card | undefined, quality: Quality): string {
  if (!card) {
    // New card preview
    if (quality < 3) return '< 1d';
    if (quality === 3) return '1d';
    if (quality === 4) return '1d';
    return '4d';
  }

  const updated = calculateNextReview(card, quality);
  const days = updated.interval;

  if (days === 0) return '< 1d';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}yr`;
}
