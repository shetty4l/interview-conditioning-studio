import { describe, it, expect } from "bun:test";
import {
  createTestSession,
  expectSuccess,
  expectError,
  advanceToSilent,
  advanceToReflection,
  Phase,
} from "../_helpers";

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
    it("should persist invariants across multiple changes", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("prep.invariants_changed", { invariants: "first" }));
      expectSuccess(session.dispatch("prep.invariants_changed", { invariants: "second" }));
      expectSuccess(session.dispatch("prep.invariants_changed", { invariants: "third" }));

      expect(session.getState().invariants).toBe("third");
    });

    it("should use last invariants value when multiple changes occur", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("prep.invariants_changed", { invariants: "initial" }));
      expectSuccess(session.dispatch("prep.invariants_changed", { invariants: "updated" }));

      expect(session.getState().invariants).toBe("updated");

      // Value persists after transitioning to coding
      expectSuccess(session.dispatch("coding.started"));
      expect(session.getState().invariants).toBe("updated");
    });

    it("should allow empty invariants", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("prep.invariants_changed", { invariants: "" }));

      expect(session.getState().invariants).toBe("");
    });

    it("should allow whitespace-only invariants", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("prep.invariants_changed", { invariants: "   \n\t  " }));

      expect(session.getState().invariants).toBe("   \n\t  ");
    });
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
    it("should not allow nudges in PREP phase", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectError(session.dispatch("nudge.requested"), "INVALID_PHASE");
    });

    it("should have nudgesAllowed=false in PREP phase", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expect(session.getState().nudgesAllowed).toBe(false);
    });
  });
});

// ============================================================================
// CODING Phase
// ============================================================================

describe("Phases > CODING", () => {
  describe("Code changes", () => {
    it.todo("should track code changes"); // Pass 2: needs codeChanges metric
    it.todo("should count total code changes"); // Pass 2: needs codeChanges metric

    it("should preserve latest code snapshot", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("coding.started"));
      expectSuccess(session.dispatch("coding.code_changed", { code: "v1" }));
      expectSuccess(session.dispatch("coding.code_changed", { code: "v2" }));
      expectSuccess(session.dispatch("coding.code_changed", { code: "final version" }));

      expect(session.getState().code).toBe("final version");
    });
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
    it("should track coding time", () => {
      const { session, clock } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("coding.started"));

      const codingStartedAt = session.getState().codingStartedAt;
      expect(codingStartedAt).not.toBeNull();

      clock.advance(10 * 60 * 1000); // 10 minutes

      // codingStartedAt should remain unchanged
      expect(session.getState().codingStartedAt).toBe(codingStartedAt);
    });

    it("should transition to SILENT when coding.silent_started dispatched", () => {
      const { session } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("coding.started"));
      expect(session.getState().phase).toBe(Phase.Coding);

      expectSuccess(session.dispatch("coding.silent_started"));
      expect(session.getState().phase).toBe(Phase.Silent);
    });
  });
});

// ============================================================================
// SILENT Phase
// ============================================================================

describe("Phases > SILENT", () => {
  describe("Code changes in SILENT", () => {
    it("should allow code changes in SILENT phase", () => {
      const { session } = createTestSession();

      advanceToSilent(session);
      expectSuccess(session.dispatch("coding.code_changed", { code: "silent code" }));

      expect(session.getState().code).toBe("silent code");
    });

    it.todo("should track codeChangesInSilent metric"); // Pass 2: needs codeChangesInSilent metric
    it.todo("should set codeChangedInSilent flag when code changes"); // Pass 2: needs codeChangedInSilent metric
  });

  describe("Nudges disabled", () => {
    it("should have nudgesAllowed=false in SILENT phase", () => {
      const { session } = createTestSession();

      advanceToSilent(session);

      expect(session.getState().nudgesAllowed).toBe(false);
    });

    it("should reject nudge requests in SILENT phase", () => {
      const { session } = createTestSession();

      advanceToSilent(session);
      expectError(session.dispatch("nudge.requested"), "INVALID_PHASE");
    });
  });

  describe("Timer behavior", () => {
    it("should track silent time via silentStartedAt", () => {
      const { session, clock } = createTestSession();

      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("coding.started"));
      clock.advance(25 * 60 * 1000); // 25 minutes coding
      expectSuccess(session.dispatch("coding.silent_started"));

      const silentStartedAt = session.getState().silentStartedAt;
      expect(silentStartedAt).not.toBeNull();

      clock.advance(3 * 60 * 1000); // 3 minutes silent

      // silentStartedAt should remain unchanged
      expect(session.getState().silentStartedAt).toBe(silentStartedAt);
    });

    it("should transition to SUMMARY when silent.ended dispatched", () => {
      const { session } = createTestSession();

      advanceToSilent(session);
      expect(session.getState().phase).toBe(Phase.Silent);

      expectSuccess(session.dispatch("silent.ended"));
      expect(session.getState().phase).toBe(Phase.Summary);
    });
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

    it("should capture all reflection responses in state", () => {
      const { session } = createTestSession();

      advanceToReflection(session);
      expectSuccess(
        session.dispatch("reflection.submitted", {
          responses: {
            clearApproach: "yes",
            prolongedStall: "no",
            recoveredFromStall: "n/a",
            timePressure: "comfortable",
            wouldChangeApproach: "no",
          },
        }),
      );

      const state = session.getState();
      expect(state.reflection).toBeDefined();
      expect(state.reflection?.responses.clearApproach).toBe("yes");
      expect(state.reflection?.responses.prolongedStall).toBe("no");
      expect(state.reflection?.responses.recoveredFromStall).toBe("n/a");
      expect(state.reflection?.responses.timePressure).toBe("comfortable");
      expect(state.reflection?.responses.wouldChangeApproach).toBe("no");
    });

    it("should transition to DONE after valid reflection", () => {
      const { session } = createTestSession();

      advanceToReflection(session);
      expect(session.getState().phase).toBe(Phase.Reflection);

      expectSuccess(
        session.dispatch("reflection.submitted", {
          responses: {
            clearApproach: "yes",
            prolongedStall: "no",
            recoveredFromStall: "n/a",
            timePressure: "comfortable",
            wouldChangeApproach: "no",
          },
        }),
      );

      expect(session.getState().phase).toBe(Phase.Done);
    });

    it("should auto-emit session.completed event after reflection", () => {
      const { session } = createTestSession();

      advanceToReflection(session);
      expectSuccess(
        session.dispatch("reflection.submitted", {
          responses: {
            clearApproach: "yes",
            prolongedStall: "no",
            recoveredFromStall: "n/a",
            timePressure: "comfortable",
            wouldChangeApproach: "no",
          },
        }),
      );

      const events = session.getEvents();
      const completedEvent = events.find((e) => e.type === "session.completed");
      expect(completedEvent).toBeDefined();
      expect(session.getState().status).toBe("completed");
    });
  });

  describe("Mandatory completion", () => {
    it("should require reflection before session.completed", () => {
      const { session } = createTestSession();

      advanceToReflection(session);

      // Cannot manually dispatch session.completed - it's auto-emitted
      expectError(session.dispatch("session.completed"), "INVALID_PHASE");
    });

    it("should not allow skipping reflection", () => {
      const { session } = createTestSession();

      // Advance to SUMMARY
      expectSuccess(session.dispatch("session.started"));
      expectSuccess(session.dispatch("coding.started"));
      expectSuccess(session.dispatch("coding.silent_started"));
      expectSuccess(session.dispatch("silent.ended"));

      expect(session.getState().phase).toBe(Phase.Summary);

      // Cannot skip directly to session.completed
      expectError(session.dispatch("session.completed"), "INVALID_PHASE");
    });
  });

  describe("Response validation", () => {
    it("should accept valid clearApproach values: yes, partially, no", () => {
      for (const value of ["yes", "partially", "no"] as const) {
        const { session } = createTestSession();
        advanceToReflection(session);
        expectSuccess(
          session.dispatch("reflection.submitted", {
            responses: {
              clearApproach: value,
              prolongedStall: "no",
              recoveredFromStall: "n/a",
              timePressure: "comfortable",
              wouldChangeApproach: "no",
            },
          }),
        );
      }
    });

    it("should accept valid prolongedStall values: yes, no", () => {
      for (const value of ["yes", "no"] as const) {
        const { session } = createTestSession();
        advanceToReflection(session);
        expectSuccess(
          session.dispatch("reflection.submitted", {
            responses: {
              clearApproach: "yes",
              prolongedStall: value,
              recoveredFromStall: value === "no" ? "n/a" : "yes",
              timePressure: "comfortable",
              wouldChangeApproach: "no",
            },
          }),
        );
      }
    });

    it("should accept valid recoveredFromStall values: yes, partially, no, n/a", () => {
      // Test yes, partially, no with prolongedStall="yes"
      for (const value of ["yes", "partially", "no"] as const) {
        const { session } = createTestSession();
        advanceToReflection(session);
        expectSuccess(
          session.dispatch("reflection.submitted", {
            responses: {
              clearApproach: "yes",
              prolongedStall: "yes",
              recoveredFromStall: value,
              timePressure: "comfortable",
              wouldChangeApproach: "no",
            },
          }),
        );
      }

      // Test n/a with prolongedStall="no"
      const { session } = createTestSession();
      advanceToReflection(session);
      expectSuccess(
        session.dispatch("reflection.submitted", {
          responses: {
            clearApproach: "yes",
            prolongedStall: "no",
            recoveredFromStall: "n/a",
            timePressure: "comfortable",
            wouldChangeApproach: "no",
          },
        }),
      );
    });

    it("should accept valid timePressure values: comfortable, manageable, overwhelming", () => {
      for (const value of ["comfortable", "manageable", "overwhelming"] as const) {
        const { session } = createTestSession();
        advanceToReflection(session);
        expectSuccess(
          session.dispatch("reflection.submitted", {
            responses: {
              clearApproach: "yes",
              prolongedStall: "no",
              recoveredFromStall: "n/a",
              timePressure: value,
              wouldChangeApproach: "no",
            },
          }),
        );
      }
    });

    it("should accept valid wouldChangeApproach values: yes, no", () => {
      for (const value of ["yes", "no"] as const) {
        const { session } = createTestSession();
        advanceToReflection(session);
        expectSuccess(
          session.dispatch("reflection.submitted", {
            responses: {
              clearApproach: "yes",
              prolongedStall: "no",
              recoveredFromStall: "n/a",
              timePressure: "comfortable",
              wouldChangeApproach: value,
            },
          }),
        );
      }
    });

    it("should reject invalid response values", () => {
      const { session } = createTestSession();
      advanceToReflection(session);

      expectError(
        session.dispatch("reflection.submitted", {
          // @ts-expect-error - testing invalid value
          responses: {
            clearApproach: "invalid",
            prolongedStall: "no",
            recoveredFromStall: "n/a",
            timePressure: "comfortable",
            wouldChangeApproach: "no",
          },
        }),
        "VALIDATION_FAILED",
      );
    });

    it("should reject missing required fields", () => {
      const { session } = createTestSession();
      advanceToReflection(session);

      expectError(
        session.dispatch("reflection.submitted", {
          // @ts-expect-error - testing missing fields
          responses: {
            clearApproach: "yes",
            // Missing prolongedStall, recoveredFromStall, etc.
          },
        }),
        "VALIDATION_FAILED",
      );
    });

    it("should enforce recoveredFromStall='n/a' only when prolongedStall='no'", () => {
      const { session } = createTestSession();
      advanceToReflection(session);

      // n/a with prolongedStall="yes" should fail
      expectError(
        session.dispatch("reflection.submitted", {
          responses: {
            clearApproach: "yes",
            prolongedStall: "yes",
            recoveredFromStall: "n/a", // Invalid when prolongedStall is "yes"
            timePressure: "comfortable",
            wouldChangeApproach: "no",
          },
        }),
        "VALIDATION_FAILED",
      );
    });
  });
});
