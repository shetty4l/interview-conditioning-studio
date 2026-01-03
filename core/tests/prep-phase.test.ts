import { describe, it } from "bun:test";

/**
 * Prep Phase Tests
 * 
 * Tests for the PREP phase workflow:
 * - Invariants input and persistence
 * - Timer expiry and warnings
 * - prepTimeExpired flag behavior
 * - Transition to CODING
 * 
 * TODO: Implement tests
 */

describe("Prep Phase", () => {
  describe("Invariants handling", () => {
    it.todo("should persist invariants across multiple changes");
    it.todo("should use last invariants value when multiple changes occur");
    it.todo("should allow empty invariants");
    it.todo("should allow whitespace-only invariants");
  });

  describe("Timer behavior", () => {
    it.todo("should track prep time used");
    it.todo("should set prepTimeExpired when timer runs out");
    it.todo("should not set prepTimeExpired when user transitions early");
  });

  describe("Nudges in PREP", () => {
    it.todo("should not allow nudges in PREP phase");
    it.todo("should have nudgesAllowed=false in PREP phase");
  });
});
