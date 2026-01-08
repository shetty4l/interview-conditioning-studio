/**
 * Spaced Repetition Tests
 *
 * Tests for the SM-2 scheduler implementation and rating derivation.
 */

import { describe, it, expect } from "bun:test";
import {
  createSM2Scheduler,
  deriveRating,
  type Rating,
  type SchedulerCard,
} from "../../../web/src/lib/spaced-repetition";
import type { ReflectionResponses } from "../../../core/src/types";

// ============================================================================
// SM-2 Scheduler Tests
// ============================================================================

describe("SM2 Scheduler", () => {
  describe("createCard", () => {
    it("should create a card with default values", () => {
      const scheduler = createSM2Scheduler();
      const card = scheduler.createCard();

      expect(card.interval).toBe(0);
      expect(card.easeFactor).toBe(2.5);
      expect(card.repetitions).toBe(0);
      expect(card.dueDate).toBe(0);
      expect(card.lastReview).toBe(0);
    });
  });

  describe("schedule", () => {
    it("should set interval to 1 day on first successful review", () => {
      const scheduler = createSM2Scheduler();
      const card = scheduler.createCard();
      const reviewDate = new Date("2024-01-01T12:00:00Z");

      const result = scheduler.schedule(card, 3, reviewDate); // Good

      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it("should set interval to 6 days on second successful review", () => {
      const scheduler = createSM2Scheduler();
      let card = scheduler.createCard();
      const day1 = new Date("2024-01-01T12:00:00Z");
      const day2 = new Date("2024-01-02T12:00:00Z");

      card = scheduler.schedule(card, 3, day1); // First review
      card = scheduler.schedule(card, 3, day2); // Second review

      expect(card.interval).toBe(6);
      expect(card.repetitions).toBe(2);
    });

    it("should multiply interval by ease factor on subsequent reviews", () => {
      const scheduler = createSM2Scheduler();
      let card = scheduler.createCard();

      // Simulate three Good reviews
      card = scheduler.schedule(card, 3, new Date("2024-01-01"));
      card = scheduler.schedule(card, 3, new Date("2024-01-02"));
      card = scheduler.schedule(card, 3, new Date("2024-01-08")); // 6 days later

      // Third review: interval = 6 * easeFactor (approximately 2.5)
      // With Good rating, ease factor decreases slightly
      expect(card.interval).toBeGreaterThanOrEqual(14);
      expect(card.interval).toBeLessThanOrEqual(16);
      expect(card.repetitions).toBe(3);
    });

    it("should reset interval and repetitions on Again rating", () => {
      const scheduler = createSM2Scheduler();
      let card = scheduler.createCard();

      // Build up some progress
      card = scheduler.schedule(card, 3, new Date("2024-01-01"));
      card = scheduler.schedule(card, 3, new Date("2024-01-02"));
      expect(card.repetitions).toBe(2);

      // Fail
      card = scheduler.schedule(card, 1, new Date("2024-01-08"));

      expect(card.interval).toBe(1);
      expect(card.repetitions).toBe(0);
    });

    it("should decrease ease factor on Hard rating", () => {
      const scheduler = createSM2Scheduler();
      let card = scheduler.createCard();
      const initialEase = card.easeFactor;

      card = scheduler.schedule(card, 2, new Date("2024-01-01")); // Hard

      expect(card.easeFactor).toBeLessThan(initialEase);
    });

    it("should increase ease factor on Easy rating", () => {
      const scheduler = createSM2Scheduler();
      let card = scheduler.createCard();
      const initialEase = card.easeFactor;

      card = scheduler.schedule(card, 4, new Date("2024-01-01")); // Easy

      expect(card.easeFactor).toBeGreaterThan(initialEase);
    });

    it("should not let ease factor go below 1.3", () => {
      const scheduler = createSM2Scheduler();
      let card = scheduler.createCard();

      // Multiple Hard ratings
      for (let i = 0; i < 20; i++) {
        card = scheduler.schedule(card, 2, new Date(2024, 0, i + 1));
      }

      expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it("should set dueDate based on interval", () => {
      const scheduler = createSM2Scheduler();
      const card = scheduler.createCard();
      const reviewDate = new Date("2024-01-01T12:00:00Z");

      const result = scheduler.schedule(card, 3, reviewDate);

      const expectedDue = reviewDate.getTime() + 1 * 24 * 60 * 60 * 1000;
      expect(result.dueDate).toBe(expectedDue);
    });

    it("should set lastReview to the review date", () => {
      const scheduler = createSM2Scheduler();
      const card = scheduler.createCard();
      const reviewDate = new Date("2024-01-15T10:30:00Z");

      const result = scheduler.schedule(card, 3, reviewDate);

      expect(result.lastReview).toBe(reviewDate.getTime());
    });
  });

  describe("isDue", () => {
    it("should return true for a new card", () => {
      const scheduler = createSM2Scheduler();
      const card = scheduler.createCard();

      expect(scheduler.isDue(card)).toBe(true);
    });

    it("should return false for a card not yet due", () => {
      const scheduler = createSM2Scheduler();
      let card = scheduler.createCard();
      const reviewDate = new Date("2024-01-01T12:00:00Z");

      card = scheduler.schedule(card, 3, reviewDate);

      // Check 12 hours later (not due yet)
      const checkTime = new Date("2024-01-01T24:00:00Z");
      expect(scheduler.isDue(card, checkTime)).toBe(false);
    });

    it("should return true for a card past due date", () => {
      const scheduler = createSM2Scheduler();
      let card = scheduler.createCard();
      const reviewDate = new Date("2024-01-01T12:00:00Z");

      card = scheduler.schedule(card, 3, reviewDate);

      // Check 2 days later (past due)
      const checkTime = new Date("2024-01-03T12:00:00Z");
      expect(scheduler.isDue(card, checkTime)).toBe(true);
    });
  });

  describe("getDueness", () => {
    it("should return positive value for overdue cards", () => {
      const scheduler = createSM2Scheduler();
      let card = scheduler.createCard();
      const reviewDate = new Date("2024-01-01T12:00:00Z");

      card = scheduler.schedule(card, 3, reviewDate); // Due in 1 day

      // Check 3 days later (2 days overdue)
      const checkTime = new Date("2024-01-04T12:00:00Z");
      const dueness = scheduler.getDueness(card, checkTime);

      expect(dueness).toBeGreaterThan(0);
      expect(dueness).toBeCloseTo(2, 0); // ~2 days overdue
    });

    it("should return negative value for not-yet-due cards", () => {
      const scheduler = createSM2Scheduler();
      let card = scheduler.createCard();
      const reviewDate = new Date("2024-01-01T12:00:00Z");

      card = scheduler.schedule(card, 3, reviewDate); // Due in 1 day

      // Check 12 hours later
      const checkTime = new Date("2024-01-02T00:00:00Z");
      const dueness = scheduler.getDueness(card, checkTime);

      expect(dueness).toBeLessThan(0);
    });

    it("should return higher dueness for more overdue cards", () => {
      const scheduler = createSM2Scheduler();
      let card1 = scheduler.createCard();
      let card2 = scheduler.createCard();

      // Card 1: reviewed 5 days ago, 1 day interval -> 4 days overdue
      card1 = scheduler.schedule(card1, 3, new Date("2024-01-01T12:00:00Z"));

      // Card 2: reviewed 2 days ago, 1 day interval -> 1 day overdue
      card2 = scheduler.schedule(card2, 3, new Date("2024-01-04T12:00:00Z"));

      const checkTime = new Date("2024-01-06T12:00:00Z");
      const dueness1 = scheduler.getDueness(card1, checkTime);
      const dueness2 = scheduler.getDueness(card2, checkTime);

      expect(dueness1).toBeGreaterThan(dueness2);
    });
  });
});

// ============================================================================
// Rating Derivation Tests
// ============================================================================

describe("deriveRating", () => {
  const baseResponses: ReflectionResponses = {
    clearApproach: "yes",
    prolongedStall: "no",
    recoveredFromStall: "n/a",
    timePressure: "manageable",
    wouldChangeApproach: "no",
  };

  it("should return Again (1) when clearApproach is no", () => {
    const responses: ReflectionResponses = {
      ...baseResponses,
      clearApproach: "no",
    };

    expect(deriveRating(responses)).toBe(1);
  });

  it("should return Again (1) when prolongedStall is yes and not recovered", () => {
    const responses: ReflectionResponses = {
      ...baseResponses,
      prolongedStall: "yes",
      recoveredFromStall: "no",
    };

    expect(deriveRating(responses)).toBe(1);
  });

  it("should return Hard (2) when clearApproach is partial", () => {
    const responses: ReflectionResponses = {
      ...baseResponses,
      clearApproach: "partially",
    };

    expect(deriveRating(responses)).toBe(2);
  });

  it("should return Hard (2) when timePressure is overwhelming", () => {
    const responses: ReflectionResponses = {
      ...baseResponses,
      timePressure: "overwhelming",
    };

    expect(deriveRating(responses)).toBe(2);
  });

  it("should return Easy (4) when clearApproach is yes and timePressure is comfortable", () => {
    const responses: ReflectionResponses = {
      ...baseResponses,
      clearApproach: "yes",
      timePressure: "comfortable",
    };

    expect(deriveRating(responses)).toBe(4);
  });

  it("should return Good (3) for solid but not perfect performance", () => {
    const responses: ReflectionResponses = {
      ...baseResponses,
      clearApproach: "yes",
      timePressure: "manageable",
    };

    expect(deriveRating(responses)).toBe(3);
  });

  it("should return Good (3) when stalled but recovered", () => {
    const responses: ReflectionResponses = {
      ...baseResponses,
      prolongedStall: "yes",
      recoveredFromStall: "yes",
    };

    expect(deriveRating(responses)).toBe(3);
  });
});
