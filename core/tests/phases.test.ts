import { describe, it, expect } from "bun:test";
import {
  createTestSession,
  expectSuccess,
  expectError,
  advanceToSilent,
  advanceToReflection,
  Phase,
} from "./_helpers";

/**
 * Phase-Specific Behavior Tests
 *
 * Tests for behavior specific to each phase:
 * - PREP: invariants handling, timer behavior, nudge restrictions
 * - CODING: code changes, nudge mechanics
 * - SILENT: code changes, nudge restrictions
 * - REFLECTION: response capture, validation
 */

// ============================================================================
// PREP Phase
// ============================================================================

describe("Phases > PREP", () => {
  describe("Invariants handling", () => {
    it.todo("should persist invariants across multiple changes");
    it.todo("should use last invariants value when multiple changes occur");
    it.todo("should allow empty invariants");
    it.todo("should allow whitespace-only invariants");
  });

  describe("Timer behavior", () => {
    it("should track prep time used", () => {
      const { session, clock } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      clock.advance(3 * 60 * 1000); // 3 minutes
      expectSuccess(session.dispatch("coding.started"));

      expect(session.getState().prepTimeUsed).toBe(3 * 60 * 1000);
    });

    it("should set prepTimeExpired when timer runs out", () => {
      const { session, clock } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      clock.advance(5 * 60 * 1000); // Full 5 minutes
      expectSuccess(session.dispatch("prep.time_expired"));
      expectSuccess(session.dispatch("coding.started"));

      expect(session.getState().prepTimeExpired).toBe(true);
    });

    it("should not set prepTimeExpired when user transitions early", () => {
      const { session, clock } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      clock.advance(2 * 60 * 1000); // Only 2 minutes
      expectSuccess(session.dispatch("coding.started"));

      expect(session.getState().prepTimeExpired).toBe(false);
    });
  });

  describe("Nudges in PREP", () => {
    it.todo("should not allow nudges in PREP phase");
    it.todo("should have nudgesAllowed=false in PREP phase");
  });
});

// ============================================================================
// CODING Phase
// ============================================================================

describe("Phases > CODING", () => {
  describe("Code changes", () => {
    it.todo("should track code changes");
    it.todo("should count total code changes");
    it.todo("should preserve latest code snapshot");
  });

  describe("Early submission", () => {
    it("should transition directly to SUMMARY when solution submitted", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("coding.started"));

      expect(session.getState().phase).toBe(Phase.Coding);

      expectSuccess(session.dispatch("coding.solution_submitted"));

      expect(session.getState().phase).toBe(Phase.Summary);
    });

    it("should skip SILENT phase entirely", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("coding.started"));
      expectSuccess(session.dispatch("coding.solution_submitted"));

      // Should be in SUMMARY, not SILENT
      expect(session.getState().phase).toBe(Phase.Summary);

      // silentStartedAt should remain null since we skipped it
      expect(session.getState().silentStartedAt).toBeNull();
    });

    it("should record submission timestamp in event log", () => {
      const { session, clock } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("coding.started"));

      clock.advance(10 * 60 * 1000); // 10 minutes into coding

      expectSuccess(session.dispatch("coding.solution_submitted"));

      const events = session.getEvents();
      const submissionEvent = events.find((e) => e.type === "coding.solution_submitted");
      expect(submissionEvent).toBeDefined();
      expect(submissionEvent!.timestamp).toBe(clock.now());
    });

    it("should preserve code and invariants in state after submission", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(
        session.dispatch("prep.invariants_changed", { invariants: "Use two pointers" }),
      );
      expectSuccess(session.dispatch("coding.started"));
      expectSuccess(
        session.dispatch("coding.code_changed", { code: "function solve() { return 42; }" }),
      );
      expectSuccess(session.dispatch("coding.solution_submitted"));

      const state = session.getState();
      expect(state.phase).toBe(Phase.Summary);
      expect(state.invariants).toBe("Use two pointers");
      expect(state.code).toBe("function solve() { return 42; }");
    });

    it("should not allow submission in phases other than CODING", () => {
      const { session } = createTestSession();

      // Try in PREP
      expectSuccess(session.dispatch("session.started"));
      expectError(session.dispatch("coding.solution_submitted"), "INVALID_PHASE");

      // Try in SILENT
      expectSuccess(session.dispatch("coding.started"));
      expectSuccess(session.dispatch("coding.silent_started"));
      expectError(session.dispatch("coding.solution_submitted"), "INVALID_PHASE");
    });

    it("should allow continuing to REFLECTION after early submission", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("coding.started"));
      expectSuccess(session.dispatch("coding.solution_submitted"));

      expect(session.getState().phase).toBe(Phase.Summary);

      expectSuccess(session.dispatch("summary.continued"));

      expect(session.getState().phase).toBe(Phase.Reflection);
    });
  });

  describe("Nudge mechanics", () => {
    it("should allow nudges in CODING phase", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("coding.started"));

      const state = session.getState();
      expect(state.nudgesAllowed).toBe(true);
    });

    it("should track nudgesUsed count", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("coding.started"));

      expect(session.getState().nudgesUsed).toBe(0);

      expectSuccess(session.dispatch("nudge.requested"));
      expect(session.getState().nudgesUsed).toBe(1);
      expect(session.getState().nudgesRemaining).toBe(2);

      expectSuccess(session.dispatch("nudge.requested"));
      expect(session.getState().nudgesUsed).toBe(2);
      expect(session.getState().nudgesRemaining).toBe(1);
    });

    it("should not allow more nudges than budget", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("coding.started"));

      // Use all 3 nudges
      expectSuccess(session.dispatch("nudge.requested"));
      expectSuccess(session.dispatch("nudge.requested"));
      expectSuccess(session.dispatch("nudge.requested"));

      expect(session.getState().nudgesUsed).toBe(3);
      expect(session.getState().nudgesRemaining).toBe(0);

      // Try to use a 4th nudge - should fail
      expectError(session.dispatch("nudge.requested"), "NUDGE_BUDGET_EXHAUSTED");

      // Should not exceed budget
      expect(session.getState().nudgesUsed).toBe(3);
      expect(session.getState().nudgesRemaining).toBe(0);
    });

    it.todo("should classify nudge as 'early' in first third of coding");
    it.todo("should classify nudge as 'mid' in middle third of coding");
    it.todo("should classify nudge as 'late' in final third of coding");
  });

  describe("Timer behavior", () => {
    it.todo("should track coding time");
    it.todo("should transition to SILENT when timer expires");
  });
});

// ============================================================================
// SILENT Phase
// ============================================================================

describe("Phases > SILENT", () => {
  describe("Code changes in SILENT", () => {
    it.todo("should allow code changes in SILENT phase");
    it.todo("should track codeChangesInSilent metric");
    it.todo("should set codeChangedInSilent flag when code changes");
  });

  describe("Nudges disabled", () => {
    it("should have nudgesAllowed=false in SILENT phase", () => {
      const { session } = createTestSession();

      advanceToSilent(session);

      expect(session.getState().nudgesAllowed).toBe(false);
    });

    it.todo("should reject nudge requests in SILENT phase");
  });

  describe("Timer behavior", () => {
    it.todo("should track silent time");
    it.todo("should transition to SUMMARY when timer expires");
  });
});

// ============================================================================
// REFLECTION Phase
// ============================================================================

describe("Phases > REFLECTION", () => {
  describe("Response capture", () => {
    it("should capture reflection responses", () => {
      const { session } = createTestSession();

      advanceToReflection(session);
      expectSuccess(
        session.dispatch("reflection.submitted", {
          responses: {
            clearApproach: "partially",
            prolongedStall: "yes",
            recoveredFromStall: "yes",
            timePressure: "overwhelming",
            wouldChangeApproach: "yes",
          },
        }),
      );

      const state = session.getState();
      expect(state.reflection?.responses.clearApproach).toBe("partially");
      expect(state.reflection?.responses.prolongedStall).toBe("yes");
      expect(state.reflection?.responses.timePressure).toBe("overwhelming");
    });

    it.todo("should capture reflection responses in state");
    it.todo("should transition to DONE after valid reflection");
    it.todo("should auto-emit session.completed event");
  });

  describe("Mandatory completion", () => {
    it.todo("should require reflection before session.completed");
    it.todo("should not allow skipping reflection");
  });

  describe("Response validation", () => {
    it.todo("should accept valid clearApproach values: yes, partially, no");
    it.todo("should accept valid prolongedStall values: yes, no");
    it.todo("should accept valid recoveredFromStall values: yes, partially, no, n/a");
    it.todo("should accept valid timePressure values: comfortable, manageable, overwhelming");
    it.todo("should accept valid wouldChangeApproach values: yes, no");
    it.todo("should reject invalid response values");
    it.todo("should reject missing required fields");
    it.todo("should enforce recoveredFromStall='n/a' only when prolongedStall='no'");
  });
});
