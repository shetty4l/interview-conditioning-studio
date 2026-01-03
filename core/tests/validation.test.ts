import { describe, it, expect } from "bun:test";
import {
  createTestSession,
  expectSuccess,
  expectError,
  advanceToCoding,
  advanceToSilent,
  advanceToSummary,
  advanceToReflection,
  completeSession,
  Phase,
  VALID_REFLECTION_RESPONSES,
} from "./_helpers";

/**
 * Validation Tests
 *
 * Tests for event validation, invalid transitions, and rejection behavior:
 * - Invalid phase transitions
 * - Terminal state enforcement (DONE, abandoned)
 * - Backward transition rejection
 * - Unknown event rejection
 * - Reflection validation
 */

// ============================================================================
// Invalid Transitions
// ============================================================================

describe("Validation > Invalid transitions", () => {
  it("should reject coding.started before session.started", () => {
    const { session } = createTestSession();

    const result = session.dispatch("coding.started");

    expectError(result, "INVALID_PHASE");
    expect(session.getEvents().length).toBe(0);
  });

  it("should reject nudge.requested in PREP phase", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    const nudgesBefore = session.getState().nudgesRemaining;

    expectError(session.dispatch("nudge.requested"), "INVALID_PHASE");

    // Should not decrement nudges in PREP
    expect(session.getState().nudgesRemaining).toBe(nudgesBefore);
  });

  it("should reject nudge.requested in SILENT phase", () => {
    const { session } = createTestSession();

    advanceToSilent(session);

    const nudgesBefore = session.getState().nudgesRemaining;
    expectError(session.dispatch("nudge.requested"), "INVALID_PHASE");

    // Should not decrement nudges in SILENT
    expect(session.getState().nudgesRemaining).toBe(nudgesBefore);
  });

  it("should reject reflection.submitted before summary.continued", () => {
    const { session } = createTestSession();

    advanceToSummary(session);

    // Try to skip summary
    expectError(
      session.dispatch("reflection.submitted", {
        responses: VALID_REFLECTION_RESPONSES,
      }),
      "INVALID_PHASE"
    );

    // Should still be in SUMMARY
    expect(session.getState().phase).toBe(Phase.Summary);
  });
});

// ============================================================================
// Session Immutability After Terminal States
// ============================================================================

describe("Validation > Session immutability after DONE", () => {
  it("should reject events after session is DONE", () => {
    const { session } = createTestSession();

    completeSession(session);
    expect(session.getState().phase).toBe(Phase.Done);

    // Attempt to modify
    const eventCountBefore = session.getEvents().length;
    expectError(session.dispatch("coding.code_changed", { code: "hacked!" }), "SESSION_TERMINATED");

    // Should not add event or change state
    expect(session.getEvents().length).toBe(eventCountBefore);
    expect(session.getState().code).not.toBe("hacked!");
  });
});

// ============================================================================
// Invalid Event Handling
// ============================================================================

describe("Validation > Invalid event handling", () => {
  it("should reject unknown event types", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    const eventCountBefore = session.getEvents().length;

    // @ts-expect-error - Testing invalid event type
    const result = session.dispatch("invalid.event.type");

    expectError(result, "INVALID_EVENT_TYPE");
    expect(session.getEvents().length).toBe(eventCountBefore);
  });

  it("should reject session.started when already started", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    const eventCountBefore = session.getEvents().length;

    expectError(session.dispatch("session.started"), "INVALID_PHASE");

    expect(session.getEvents().length).toBe(eventCountBefore);
  });
});

// ============================================================================
// Backward Transitions Rejected
// ============================================================================

describe("Validation > Backward transitions rejected", () => {
  it("should reject prep.invariants_changed in CODING phase", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("prep.invariants_changed", { invariants: "initial" }));
    expectSuccess(session.dispatch("coding.started"));

    const eventCountBefore = session.getEvents().length;
    expectError(
      session.dispatch("prep.invariants_changed", { invariants: "modified" }),
      "INVALID_PHASE"
    );

    expect(session.getEvents().length).toBe(eventCountBefore);
    expect(session.getState().invariants).toBe("initial");
  });

  it("should reject coding.started in SILENT phase", () => {
    const { session } = createTestSession();

    advanceToSilent(session);

    const eventCountBefore = session.getEvents().length;
    expectError(session.dispatch("coding.started"), "INVALID_PHASE");

    expect(session.getEvents().length).toBe(eventCountBefore);
    expect(session.getState().phase).toBe(Phase.Silent);
  });
});

// ============================================================================
// Reflection Validation
// ============================================================================

describe("Validation > Reflection validation", () => {
  it("should reject reflection with invalid clearApproach value", () => {
    const { session } = createTestSession();

    advanceToReflection(session);

    const result = session.dispatch("reflection.submitted", {
      responses: {
        clearApproach: "maybe", // Invalid value
        prolongedStall: "no",
        recoveredFromStall: "n/a",
        timePressure: "comfortable",
        wouldChangeApproach: "no",
      },
    });

    expectError(result, "VALIDATION_FAILED");
    expect(session.getState().phase).toBe(Phase.Reflection);
  });

  it("should reject reflection with missing required fields", () => {
    const { session } = createTestSession();

    advanceToReflection(session);

    const result = session.dispatch("reflection.submitted", {
      responses: {
        clearApproach: "yes",
        // Missing other required fields
      },
    });

    expectError(result, "VALIDATION_FAILED");
    expect(session.getState().phase).toBe(Phase.Reflection);
  });

  it("should allow recoveredFromStall='n/a' only when prolongedStall='no'", () => {
    const { session } = createTestSession();

    advanceToReflection(session);

    // Invalid: prolongedStall=yes but recoveredFromStall=n/a
    const result = session.dispatch("reflection.submitted", {
      responses: {
        clearApproach: "yes",
        prolongedStall: "yes",
        recoveredFromStall: "n/a", // Should not be n/a when stall=yes
        timePressure: "comfortable",
        wouldChangeApproach: "no",
      },
    });

    expectError(result, "VALIDATION_FAILED");
    expect(session.getState().phase).toBe(Phase.Reflection);
  });
});
