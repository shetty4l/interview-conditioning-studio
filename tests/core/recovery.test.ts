import { describe, it, expect } from "bun:test";
import {
  createTestSession,
  createMockClock,
  expectSuccess,
  expectError,
  advanceToCoding,
  Preset,
  Phase,
  TEST_PROBLEM,
} from "../_helpers";
import { createSession } from "../../core/src/index";

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
// Restore from Events
// ============================================================================

describe("Recovery > Restore from events", () => {
  it("should restore session state from event log", () => {
    const clock1 = createMockClock(1000);
    const session1 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock1.now,
    });

    expectSuccess(session1.dispatch("session.started"));
    expectSuccess(session1.dispatch("prep.invariants_changed", { invariants: "two pointers" }));
    expectSuccess(session1.dispatch("coding.started"));
    expectSuccess(session1.dispatch("coding.code_changed", { code: "function solve() {}" }));
    expectSuccess(session1.dispatch("nudge.requested"));

    const events = session1.getEvents();

    // Create new session and restore from events
    const clock2 = createMockClock(1000);
    const session2 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock2.now,
    });

    session2.restore(events);

    const state = session2.getState();
    expect(state.phase).toBe(Phase.Coding);
    expect(state.invariants).toBe("two pointers");
    expect(state.code).toBe("function solve() {}");
    expect(state.nudgesUsed).toBe(1);
  });

  it("should preserve timestamps from original events", () => {
    const clock1 = createMockClock(1000);
    const session1 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock1.now,
    });

    expectSuccess(session1.dispatch("session.started"));
    clock1.advance(5000);
    expectSuccess(session1.dispatch("coding.started"));

    const originalEvents = session1.getEvents();

    // Create new session and restore
    const clock2 = createMockClock(99999); // Different clock time
    const session2 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock2.now,
    });

    session2.restore(originalEvents);

    const restoredEvents = session2.getEvents();
    expect(restoredEvents[0].timestamp).toBe(1000); // Original timestamp preserved
    expect(restoredEvents[1].timestamp).toBe(6000); // Original timestamp preserved
  });
});

describe("Recovery > Explicit abandonment", () => {
  it("should allow abandonment from any active phase", () => {
    // Test abandonment from PREP
    const { session: session1 } = createTestSession();
    expectSuccess(session1.dispatch("session.started"));
    expectSuccess(session1.dispatch("session.abandoned"));
    expect(session1.getState().status).toBe("abandoned_explicit");

    // Test abandonment from CODING
    const { session: session2 } = createTestSession();
    expectSuccess(session2.dispatch("session.started"));
    expectSuccess(session2.dispatch("coding.started"));
    expectSuccess(session2.dispatch("session.abandoned"));
    expect(session2.getState().status).toBe("abandoned_explicit");

    // Test abandonment from SILENT
    const { session: session3 } = createTestSession();
    expectSuccess(session3.dispatch("session.started"));
    expectSuccess(session3.dispatch("coding.started"));
    expectSuccess(session3.dispatch("coding.silent_started"));
    expectSuccess(session3.dispatch("session.abandoned"));
    expect(session3.getState().status).toBe("abandoned_explicit");
  });
});

describe("Recovery > State after recovery", () => {
  it("should restore phase correctly", () => {
    // Create session in SILENT phase
    const clock1 = createMockClock(1000);
    const session1 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock1.now,
    });

    expectSuccess(session1.dispatch("session.started"));
    expectSuccess(session1.dispatch("coding.started"));
    expectSuccess(session1.dispatch("coding.silent_started"));

    const events = session1.getEvents();

    // Restore to new session
    const clock2 = createMockClock(1000);
    const session2 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock2.now,
    });

    session2.restore(events);
    expect(session2.getState().phase).toBe(Phase.Silent);
  });

  it("should restore code and invariants", () => {
    const clock1 = createMockClock(1000);
    const session1 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock1.now,
    });

    expectSuccess(session1.dispatch("session.started"));
    expectSuccess(session1.dispatch("prep.invariants_changed", { invariants: "hash map lookup" }));
    expectSuccess(session1.dispatch("coding.started"));
    expectSuccess(session1.dispatch("coding.code_changed", { code: "const map = new Map();" }));

    const events = session1.getEvents();

    // Restore to new session
    const clock2 = createMockClock(1000);
    const session2 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock2.now,
    });

    session2.restore(events);

    const state = session2.getState();
    expect(state.invariants).toBe("hash map lookup");
    expect(state.code).toBe("const map = new Map();");
  });

  it("should restore nudge count", () => {
    const clock1 = createMockClock(1000);
    const session1 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock1.now,
    });

    expectSuccess(session1.dispatch("session.started"));
    expectSuccess(session1.dispatch("coding.started"));
    expectSuccess(session1.dispatch("nudge.requested"));
    expectSuccess(session1.dispatch("nudge.requested"));

    const events = session1.getEvents();

    // Restore to new session
    const clock2 = createMockClock(1000);
    const session2 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock2.now,
    });

    session2.restore(events);

    const state = session2.getState();
    expect(state.nudgesUsed).toBe(2);
    expect(state.nudgesRemaining).toBe(1); // Standard preset has 3 nudges
  });
});
