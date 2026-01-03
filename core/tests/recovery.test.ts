import { describe, it, expect } from "bun:test";
import {
  createTestSession,
  createMockClock,
  expectSuccess,
  expectError,
  advanceToCoding,
  Preset,
  TEST_PROBLEM,
} from "./_helpers";
import { createSession } from "../src/index";

/**
 * Recovery Tests
 *
 * Tests for session recovery and abandonment:
 * - Restoring session from events
 * - Explicit abandonment flow
 * - Event log integrity
 */

// ============================================================================
// Event Log Integrity
// ============================================================================

describe("Recovery > Event log integrity", () => {
  it("should append events in order with timestamps", () => {
    const { session, clock } = createTestSession(Preset.Standard, 1000);

    expectSuccess(session.dispatch("session.started"));
    clock.advance(1000);
    expectSuccess(session.dispatch("coding.started"));
    clock.advance(1000);
    expectSuccess(session.dispatch("coding.code_changed", { code: "test" }));

    const events = session.getEvents();
    expect(events.length).toBe(3);
    expect(events[0].type).toBe("session.started");
    expect(events[0].timestamp).toBe(1000);
    expect(events[1].type).toBe("coding.started");
    expect(events[1].timestamp).toBe(2000);
    expect(events[2].type).toBe("coding.code_changed");
    expect(events[2].timestamp).toBe(3000);
  });

  it("should derive same state from replayed events", () => {
    const clock1 = createMockClock(1000);
    const session1 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock1.now,
    });

    expectSuccess(session1.dispatch("session.started"));
    expectSuccess(session1.dispatch("prep.invariants_changed", { invariants: "test" }));
    expectSuccess(session1.dispatch("coding.started"));
    expectSuccess(session1.dispatch("nudge.requested"));

    const originalState = session1.getState();
    const events = session1.getEvents();

    // Create new session and replay events
    const clock2 = createMockClock(1000);
    const session2 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock2.now,
    });

    // Replay events (simulate restoration)
    session2.restore(events);

    const restoredState = session2.getState();
    expect(restoredState.phase).toBe(originalState.phase);
    expect(restoredState.invariants).toBe(originalState.invariants);
    expect(restoredState.nudgesRemaining).toBe(originalState.nudgesRemaining);
  });
});

// ============================================================================
// Session Abandonment
// ============================================================================

describe("Recovery > Session abandonment", () => {
  it("should transition to abandoned_explicit status when session.abandoned is dispatched", () => {
    const { session } = createTestSession();

    advanceToCoding(session);
    expectSuccess(session.dispatch("session.abandoned"));

    const state = session.getState();
    expect(state.status).toBe("abandoned_explicit");
  });

  it("should reject events after session is abandoned", () => {
    const { session } = createTestSession();

    advanceToCoding(session);
    expectSuccess(session.dispatch("session.abandoned"));

    const eventCountBefore = session.getEvents().length;
    expectError(session.dispatch("coding.code_changed", { code: "test" }), "SESSION_TERMINATED");

    expect(session.getEvents().length).toBe(eventCountBefore);
  });
});

// ============================================================================
// Restore from Events (TODOs)
// ============================================================================

describe("Recovery > Restore from events", () => {
  it.todo("should restore session state from event log");
  it.todo("should derive same state from replayed events");
  it.todo("should preserve timestamps from original events");
});

describe("Recovery > Explicit abandonment", () => {
  it.todo("should set status to abandoned_explicit when session.abandoned dispatched");
  it.todo("should reject events after abandonment");
  it.todo("should allow abandonment from any active phase");
});

describe("Recovery > State after recovery", () => {
  it.todo("should restore phase correctly");
  it.todo("should restore code and invariants");
  it.todo("should restore nudge count");
});
