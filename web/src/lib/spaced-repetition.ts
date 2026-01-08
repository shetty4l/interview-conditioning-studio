/**
 * Spaced Repetition Scheduler
 *
 * This module provides an abstracted interface for spaced repetition algorithms.
 * Currently implements SM-2, with the interface designed to support future upgrade to FSRS.
 */

import type { ReflectionResponses } from "../../../core/src/types";

// ============================================================================
// Types
// ============================================================================

/**
 * Card state for spaced repetition scheduling.
 * Represents the learning progress for a single item (problem).
 */
export interface SchedulerCard {
  /** Days until next review */
  interval: number;
  /** Multiplier for interval growth (SM-2: 1.3-2.5+) */
  easeFactor: number;
  /** Consecutive successful reviews */
  repetitions: number;
  /** Timestamp when next review is due */
  dueDate: number;
  /** Timestamp of last review */
  lastReview: number;
}

/**
 * Rating scale for review quality.
 * 1 = Again (complete failure)
 * 2 = Hard (recalled with difficulty)
 * 3 = Good (recalled correctly)
 * 4 = Easy (recalled effortlessly)
 */
export type Rating = 1 | 2 | 3 | 4;

/**
 * Abstract scheduler interface.
 * Allows swapping SM-2 for FSRS in the future without changing consuming code.
 */
export interface Scheduler {
  /** Create a new card with default values */
  createCard(): SchedulerCard;
  /** Schedule next review based on rating */
  schedule(card: SchedulerCard, rating: Rating, reviewDate?: Date): SchedulerCard;
  /** Check if a card is due for review */
  isDue(card: SchedulerCard, now?: Date): boolean;
  /** Get dueness score for sorting (higher = more overdue) */
  getDueness(card: SchedulerCard, now?: Date): number;
}

// ============================================================================
// SM-2 Implementation
// ============================================================================

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Create an SM-2 based scheduler.
 *
 * SM-2 Algorithm (SuperMemo 2):
 * - New items start with interval of 1 day
 * - After first success: 6 days
 * - After subsequent successes: interval * easeFactor
 * - Ease factor adjusts based on rating quality
 * - Failures reset the interval to 1 day
 */
export function createSM2Scheduler(): Scheduler {
  return {
    createCard(): SchedulerCard {
      return {
        interval: 0,
        easeFactor: DEFAULT_EASE_FACTOR,
        repetitions: 0,
        dueDate: 0, // Due immediately
        lastReview: 0,
      };
    },

    schedule(card: SchedulerCard, rating: Rating, reviewDate?: Date): SchedulerCard {
      const now = reviewDate?.getTime() ?? Date.now();
      let { interval, easeFactor, repetitions } = card;

      if (rating === 1) {
        // Again - failed, reset progress
        interval = 1;
        repetitions = 0;
      } else {
        // Success - advance interval
        if (repetitions === 0) {
          interval = 1;
        } else if (repetitions === 1) {
          interval = 6;
        } else {
          interval = Math.round(interval * easeFactor);
        }
        repetitions += 1;

        // Adjust ease factor based on rating
        // Rating 2 (Hard): decrease ease
        // Rating 3 (Good): slight decrease
        // Rating 4 (Easy): increase ease
        const easeAdjustment = 0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02);
        easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor + easeAdjustment);
      }

      return {
        interval,
        easeFactor,
        repetitions,
        dueDate: now + interval * MS_PER_DAY,
        lastReview: now,
      };
    },

    isDue(card: SchedulerCard, now?: Date): boolean {
      const timestamp = now?.getTime() ?? Date.now();
      return timestamp >= card.dueDate;
    },

    getDueness(card: SchedulerCard, now?: Date): number {
      const timestamp = now?.getTime() ?? Date.now();
      // Positive = overdue, negative = not yet due
      // Higher value = more overdue = should be reviewed first
      return (timestamp - card.dueDate) / MS_PER_DAY;
    },
  };
}

// ============================================================================
// Rating Derivation
// ============================================================================

/**
 * Derive a spaced repetition rating from session reflection responses.
 *
 * Mapping logic:
 * - Again (1): No clear approach OR prolonged stall without recovery
 * - Hard (2): Partial approach OR overwhelming time pressure
 * - Easy (4): Clear approach AND comfortable time pressure
 * - Good (3): Everything else
 */
export function deriveRating(reflection: ReflectionResponses): Rating {
  const { clearApproach, prolongedStall, recoveredFromStall, timePressure } = reflection;

  // Struggled significantly
  if (clearApproach === "no") {
    return 1; // Again
  }
  if (prolongedStall === "yes" && recoveredFromStall === "no") {
    return 1; // Again
  }

  // Had difficulty
  if (clearApproach === "partially" || timePressure === "overwhelming") {
    return 2; // Hard
  }

  // Nailed it
  if (clearApproach === "yes" && timePressure === "comfortable") {
    return 4; // Easy
  }

  // Default - solid performance
  return 3; // Good
}
