import { describe, it, expect } from "bun:test";
import { createTestSession, expectSuccess, Phase } from "../_helpers";

/**
 * Features Tests
 *
 * Tests for additional features:
 * - Audio events
 * - Subscriber pattern
 * - Dispatch return values
 * - Remaining time derivation
 */

// ============================================================================
// Audio Events
// ============================================================================

describe("Features > Audio events", () => {
  it("should accept audio.started event and track isRecording state", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));
    expectSuccess(session.dispatch("audio.started"));

    const state = session.getState();
    expect(state.isRecording).toBe(true);
  });

  it("should accept audio.stopped event and update isRecording state", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("coding.started"));
    expectSuccess(session.dispatch("audio.started"));
    expectSuccess(session.dispatch("audio.stopped"));

    const state = session.getState();
    expect(state.isRecording).toBe(false);
  });

  it("should accept audio.permission_denied event", () => {
    const { session } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    expectSuccess(session.dispatch("audio.permission_denied"));

    const events = session.getEvents();
    expect(events.some((e) => e.type === "audio.permission_denied")).toBe(true);
  });
});

// ============================================================================
// Subscriber Pattern
// ============================================================================

describe("Features > Subscriber pattern", () => {
  it("should notify subscribers when events are dispatched", () => {
    const { session } = createTestSession();

    const notifications: Array<{ event: unknown; state: unknown }> = [];
    session.subscribe((event: unknown, state: unknown) => {
      notifications.push({ event, state });
    });

    expectSuccess(session.dispatch("session.started"));

    expect(notifications.length).toBe(1);
    expect((notifications[0].event as { type: string }).type).toBe("session.started");
    expect((notifications[0].state as { phase: Phase }).phase).toBe(Phase.Prep);
  });

  it("should return unsubscribe function that stops notifications", () => {
    const { session } = createTestSession();

    const notifications: unknown[] = [];
    const unsubscribe = session.subscribe((event: unknown) => {
      notifications.push(event);
    });

    expectSuccess(session.dispatch("session.started"));
    expect(notifications.length).toBe(1);

    unsubscribe();
    expectSuccess(session.dispatch("coding.started"));
    expect(notifications.length).toBe(1); // No new notification
  });
});

// ============================================================================
// Remaining Time Derivation
// ============================================================================

describe("Features > Remaining time derivation", () => {
  it("should compute remainingTime dynamically based on clock", () => {
    const { session, clock } = createTestSession();

    expectSuccess(session.dispatch("session.started"));

    // At start, should have full prep time remaining
    expect(session.getState().remainingTime).toBe(5 * 60 * 1000);

    // Advance 2 minutes
    clock.advance(2 * 60 * 1000);
    expect(session.getState().remainingTime).toBe(3 * 60 * 1000);

    // Advance another 2 minutes
    clock.advance(2 * 60 * 1000);
    expect(session.getState().remainingTime).toBe(1 * 60 * 1000);
  });

  it("should return negative remainingTime when phase exceeds duration", () => {
    const { session, clock } = createTestSession();

    expectSuccess(session.dispatch("session.started"));
    clock.advance(6 * 60 * 1000); // 6 minutes (1 minute over)

    expect(session.getState().remainingTime).toBe(-1 * 60 * 1000);
  });
});

// ============================================================================
// Dispatch Return Value
// ============================================================================

describe("Features > Dispatch return value", () => {
  it("should return success result with event on successful dispatch", () => {
    const { session } = createTestSession(undefined, 1000);

    const result = session.dispatch("session.started");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("session.started");
      expect(result.value.timestamp).toBe(1000);
    }
  });

  it("should return error result when dispatch is rejected", () => {
    const { session } = createTestSession();

    // Try to dispatch coding.started before session.started
    const result = session.dispatch("coding.started");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PHASE");
    }
  });
});
