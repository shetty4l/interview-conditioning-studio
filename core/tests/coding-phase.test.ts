import { describe, it } from "bun:test";

/**
 * Coding Phase Tests
 * 
 * Tests for the CODING phase workflow:
 * - Code changes and tracking
 * - Nudge mechanics (budget, timing classification)
 * - Timer and transition to SILENT
 * 
 * TODO: Implement tests
 */

describe("Coding Phase", () => {
  describe("Code changes", () => {
    it.todo("should track code changes");
    it.todo("should count total code changes");
    it.todo("should preserve latest code snapshot");
  });

  describe("Nudge mechanics", () => {
    it.todo("should allow nudges in CODING phase");
    it.todo("should decrement nudge budget on use");
    it.todo("should reject nudges when budget exhausted");
    it.todo("should classify nudge as 'early' in first third of coding");
    it.todo("should classify nudge as 'mid' in middle third of coding");
    it.todo("should classify nudge as 'late' in final third of coding");
  });

  describe("Timer behavior", () => {
    it.todo("should track coding time");
    it.todo("should transition to SILENT when timer expires");
  });
});
