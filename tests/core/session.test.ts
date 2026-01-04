import { describe, it, expect } from "bun:test";
import {
  createTestSession,
  expectSuccess,
  TEST_PROBLEM,
  Phase,
  Preset,
  VALID_REFLECTION_RESPONSES,
} from "../_helpers";

/**
 * Session Tests
 *
 * Tests for session initialization, presets, and phase transitions.
 * This file covers the "happy path" lifecycle:
 * START → PREP → CODING → SILENT → SUMMARY → REFLECTION → DONE
 */

// ============================================================================
// Initial State (before session.started)
// ============================================================================

describe("Session > Initial state", () => {
  it("should have no phase before session is started", () => {
    const { session } = createTestSession();
    const state = session.getState();
    expect(state.phase).toBeUndefined();
  });

  it("should have empty event log before session is started", () => {
    const { session } = createTestSession();
    expect(session.getEvents()).toEqual([]);
  });
});

// ============================================================================
// Starting a Session
// ============================================================================

describe("Session > Starting a session", () => {
  it("should create a session in PREP phase when started", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    const state = session.getState();

    expect(state.phase).toBe(Phase.Prep);
    expect(state.problem).toEqual(TEST_PROBLEM);
  });

  it("should generate a unique session ID", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    const state = session.getState();

    expect(state.id).toBeDefined();
    expect(typeof state.id).toBe("string");
    expect(state.id.length).toBeGreaterThan(0);
  });

  it("should assign the provided problem", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    const state = session.getState();

    expect(state.problem.id).toBe("two-sum");
    expect(state.problem.title).toBe("Two Sum");
  });

  it("should initialize nudge budget based on preset", () => {
    const { session } = createTestSession(Preset.Standard);

    expectSuccess(session.dispatch("session.started"));
    const state = session.getState();

    expect(state.nudgesRemaining).toBe(3);
  });

  it("should initialize with zero nudges for No Assistance preset", () => {
    const { session } = createTestSession(Preset.NoAssistance);

    expectSuccess(session.dispatch("session.started"));
    const state = session.getState();

    expect(state.nudgesRemaining).toBe(0);
  });

  it("should record session.started event with timestamp", () => {
    const { session } = createTestSession(Preset.Standard, 1000);

    expectSuccess(session.dispatch("session.started"));
    const events = session.getEvents();

    expect(events.length).toBe(1);
    expect(events[0].type).toBe("session.started");
    expect(events[0].timestamp).toBe(1000);
  });

  it("should generate unique IDs for different sessions", () => {
    const { session: session1 } = createTestSession(Preset.Standard, 1000);
    const { session: session2 } = createTestSession(Preset.Standard, 2000);

    expectSuccess(session1.dispatch("session.started"));
    expectSuccess(session2.dispatch("session.started"));

    expect(session1.getState().id).not.toBe(session2.getState().id);
  });
});

// ============================================================================
// Preset Configurations
// ============================================================================

describe("Session > Preset configurations", () => {
  it("should use Standard preset config", () => {
    const { session } = createTestSession(Preset.Standard);

    expectSuccess(session.dispatch("session.started"));
    const state = session.getState();

    // Standard: 5 min prep, 35 min coding, 5 min silent, 3 nudges
    expect(state.config.prepDuration).toBe(5 * 60 * 1000);
    expect(state.config.codingDuration).toBe(35 * 60 * 1000);
    expect(state.config.silentDuration).toBe(5 * 60 * 1000);
    expect(state.nudgesRemaining).toBe(3);
  });

  it("should use High Pressure preset config", () => {
    const { session } = createTestSession(Preset.HighPressure);

    expectSuccess(session.dispatch("session.started"));
    const state = session.getState();

    // High Pressure: 3 min prep, 25 min coding, 2 min silent, 1 nudge
    expect(state.config.prepDuration).toBe(3 * 60 * 1000);
    expect(state.config.codingDuration).toBe(25 * 60 * 1000);
    expect(state.config.silentDuration).toBe(2 * 60 * 1000);
    expect(state.nudgesRemaining).toBe(1);
  });

  it("should use No Assistance preset config", () => {
    const { session } = createTestSession(Preset.NoAssistance);

    expectSuccess(session.dispatch("session.started"));
    const state = session.getState();

    // No Assistance: 5 min prep, 35 min coding, 5 min silent, 0 nudges
    expect(state.config.prepDuration).toBe(5 * 60 * 1000);
    expect(state.config.codingDuration).toBe(35 * 60 * 1000);
    expect(state.config.silentDuration).toBe(5 * 60 * 1000);
    expect(state.config.nudgeBudget).toBe(0);
  });
});

// ============================================================================
// PREP → CODING Transition
// ============================================================================

describe("Session > PREP to CODING transition", () => {
  it("should transition to CODING when user starts coding manually", () => {
    const { session, clock } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    clock.advance(2 * 60 * 1000); // 2 minutes into prep
    expectSuccess(session.dispatch("coding.started"));

    const state = session.getState();
    expect(state.phase).toBe(Phase.Coding);
  });

  it("should capture invariants before transitioning to CODING", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(
      session.dispatch("prep.invariants_changed", {
        invariants: "# Assumptions:\n- Array has at least 2 elements",
      }),
    );
    expectSuccess(session.dispatch("coding.started"));

    const state = session.getState();
    expect(state.invariants).toBe("# Assumptions:\n- Array has at least 2 elements");
  });

  it("should allow empty invariants", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));

    const state = session.getState();
    expect(state.invariants).toBe("");
    expect(state.phase).toBe(Phase.Coding);
  });

  it("should record prep duration when transitioning to CODING", () => {
    const { session, clock } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    clock.advance(3 * 60 * 1000); // 3 minutes
    expectSuccess(session.dispatch("coding.started"));

    const state = session.getState();
    expect(state.prepTimeUsed).toBe(3 * 60 * 1000);
  });

  it("should handle prep timer expiry before transition", () => {
    const { session, clock } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    clock.advance(5 * 60 * 1000); // Full 5 minutes
    expectSuccess(session.dispatch("prep.time_expired"));
    expectSuccess(session.dispatch("coding.started"));

    const state = session.getState();
    expect(state.phase).toBe(Phase.Coding);
    expect(state.prepTimeExpired).toBe(true);
  });

  it("should initialize code as empty string when entering CODING", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));

    expect(session.getState().code).toBe("");
  });
});

// ============================================================================
// CODING → SILENT Transition
// ============================================================================

describe("Session > CODING to SILENT transition", () => {
  it("should transition to SILENT when coding timer expires", () => {
    const { session, clock } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));
    clock.advance(35 * 60 * 1000); // Full 35 minutes
    expectSuccess(session.dispatch("coding.silent_started"));

    const state = session.getState();
    expect(state.phase).toBe(Phase.Silent);
  });

  it("should preserve code when transitioning to SILENT", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));
    expectSuccess(
      session.dispatch("coding.code_changed", {
        code: "def two_sum(nums, target):\n    pass",
      }),
    );
    expectSuccess(session.dispatch("coding.silent_started"));

    const state = session.getState();
    expect(state.code).toBe("def two_sum(nums, target):\n    pass");
  });

  it("should disable nudges in SILENT phase", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));
    expectSuccess(session.dispatch("coding.silent_started"));

    const state = session.getState();
    expect(state.nudgesAllowed).toBe(false);
  });
});

// ============================================================================
// SILENT → SUMMARY Transition
// ============================================================================

describe("Session > SILENT to SUMMARY transition", () => {
  it("should transition to SUMMARY when silent timer expires", () => {
    const { session, clock } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));
    expectSuccess(session.dispatch("coding.silent_started"));
    clock.advance(5 * 60 * 1000); // Full 5 minutes
    expectSuccess(session.dispatch("silent.ended"));

    const state = session.getState();
    expect(state.phase).toBe(Phase.Summary);
  });

  it("should preserve final code in SUMMARY", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));
    expectSuccess(
      session.dispatch("coding.code_changed", {
        code: "def two_sum(nums, target):\n    seen = {}",
      }),
    );
    expectSuccess(session.dispatch("coding.silent_started"));
    expectSuccess(
      session.dispatch("coding.code_changed", {
        code: "def two_sum(nums, target):\n    seen = {}\n    return []",
      }),
    );
    expectSuccess(session.dispatch("silent.ended"));

    const state = session.getState();
    expect(state.code).toBe("def two_sum(nums, target):\n    seen = {}\n    return []");
  });
});

// ============================================================================
// SUMMARY → REFLECTION Transition
// ============================================================================

describe("Session > SUMMARY to REFLECTION transition", () => {
  it("should transition to REFLECTION when user continues from summary", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));
    expectSuccess(session.dispatch("coding.silent_started"));
    expectSuccess(session.dispatch("silent.ended"));
    expectSuccess(session.dispatch("summary.continued"));

    const state = session.getState();
    expect(state.phase).toBe(Phase.Reflection);
  });
});

// ============================================================================
// REFLECTION → DONE Transition
// ============================================================================

describe("Session > REFLECTION to DONE transition", () => {
  it("should transition to DONE when reflection is submitted", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));
    expectSuccess(session.dispatch("coding.silent_started"));
    expectSuccess(session.dispatch("silent.ended"));
    expectSuccess(session.dispatch("summary.continued"));
    expectSuccess(
      session.dispatch("reflection.submitted", {
        responses: VALID_REFLECTION_RESPONSES,
      }),
    );

    const state = session.getState();
    expect(state.phase).toBe(Phase.Done);
  });

  it("should mark session as completed", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));
    expectSuccess(session.dispatch("coding.silent_started"));
    expectSuccess(session.dispatch("silent.ended"));
    expectSuccess(session.dispatch("summary.continued"));
    expectSuccess(
      session.dispatch("reflection.submitted", {
        responses: VALID_REFLECTION_RESPONSES,
      }),
    );

    const state = session.getState();
    expect(state.status).toBe("completed");
  });

  it("should auto-emit session.completed event after reflection.submitted", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));
    expectSuccess(session.dispatch("coding.silent_started"));
    expectSuccess(session.dispatch("silent.ended"));
    expectSuccess(session.dispatch("summary.continued"));
    expectSuccess(
      session.dispatch("reflection.submitted", {
        responses: VALID_REFLECTION_RESPONSES,
      }),
    );

    const events = session.getEvents();
    const eventTypes = events.map((e) => e.type);

    expect(eventTypes).toContain("reflection.submitted");
    expect(eventTypes).toContain("session.completed");

    // session.completed should come after reflection.submitted
    const reflectionIndex = eventTypes.indexOf("reflection.submitted");
    const completedIndex = eventTypes.indexOf("session.completed");
    expect(completedIndex).toBeGreaterThan(reflectionIndex);
  });
});

// ============================================================================
// Complete Session (Happy Path)
// ============================================================================

describe("Session > Complete session (happy path)", () => {
  it("should complete full session lifecycle", () => {
    const { session, clock } = createTestSession();

    // START → PREP
    expectSuccess(session.dispatch("session.started"));
    expect(session.getState().phase).toBe(Phase.Prep);

    // PREP: Write invariants
    expectSuccess(
      session.dispatch("prep.invariants_changed", {
        invariants: "# Use hashmap for O(n) solution",
      }),
    );

    // PREP → CODING
    clock.advance(3 * 60 * 1000);
    expectSuccess(session.dispatch("coding.started"));
    expect(session.getState().phase).toBe(Phase.Coding);

    // CODING: Write code, use nudge
    expectSuccess(
      session.dispatch("coding.code_changed", {
        code: "def two_sum(nums, target):\n    seen = {}",
      }),
    );
    expectSuccess(session.dispatch("nudge.requested"));
    expectSuccess(
      session.dispatch("coding.code_changed", {
        code: "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        pass",
      }),
    );

    // CODING → SILENT
    clock.advance(35 * 60 * 1000);
    expectSuccess(session.dispatch("coding.silent_started"));
    expect(session.getState().phase).toBe(Phase.Silent);

    // SILENT: Continue coding
    expectSuccess(
      session.dispatch("coding.code_changed", {
        code: "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target-n], i]\n        seen[n] = i",
      }),
    );

    // SILENT → SUMMARY
    clock.advance(5 * 60 * 1000);
    expectSuccess(session.dispatch("silent.ended"));
    expect(session.getState().phase).toBe(Phase.Summary);

    // SUMMARY → REFLECTION
    expectSuccess(session.dispatch("summary.continued"));
    expect(session.getState().phase).toBe(Phase.Reflection);

    // REFLECTION → DONE
    expectSuccess(
      session.dispatch("reflection.submitted", {
        responses: {
          clearApproach: "yes",
          prolongedStall: "no",
          recoveredFromStall: "n/a",
          timePressure: "manageable",
          wouldChangeApproach: "no",
        },
      }),
    );
    expect(session.getState().phase).toBe(Phase.Done);

    // Verify final state
    const finalState = session.getState();
    expect(finalState.status).toBe("completed");
    expect(finalState.nudgesUsed).toBe(1);
    expect(finalState.invariants).toBe("# Use hashmap for O(n) solution");
    expect(finalState.code).toContain("def two_sum");
  });
});
