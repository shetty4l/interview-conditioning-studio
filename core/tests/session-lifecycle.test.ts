import { describe, it, expect } from "bun:test";

/**
 * Session Lifecycle Tests
 *
 * These tests cover the complete session flow:
 * START → PREP → CODING → SILENT → SUMMARY → REFLECTION → DONE
 *
 * The session is event-sourced: state is derived from an append-only event log.
 * Time is injectable for deterministic testing.
 */

// These imports will fail until we implement the modules
import {
  createSession,
  type Session,
  type SessionConfig,
  type Problem,
  Phase,
  Preset,
} from "../src/index";

// Test fixtures
const TEST_PROBLEM: Problem = {
  id: "two-sum",
  title: "Two Sum",
  description:
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
};

// Helper to create a mock clock
function createMockClock(initialTime: number = 0) {
  let currentTime = initialTime;
  return {
    now: () => currentTime,
    advance: (ms: number) => {
      currentTime += ms;
    },
    set: (ms: number) => {
      currentTime = ms;
    },
  };
}

describe("Session Lifecycle", () => {
  describe("Initial state (before session.started)", () => {
    it("should have no phase before session is started", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      const state = session.getState();
      expect(state.phase).toBeUndefined();
    });

    it("should have empty event log before session is started", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      expect(session.getEvents()).toEqual([]);
    });
  });

  describe("Starting a session", () => {
    it("should create a session in PREP phase when started", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      const state = session.getState();

      expect(state.phase).toBe(Phase.Prep);
      expect(state.problem).toEqual(TEST_PROBLEM);
    });

    it("should generate a unique session ID", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      const state = session.getState();

      expect(state.id).toBeDefined();
      expect(typeof state.id).toBe("string");
      expect(state.id.length).toBeGreaterThan(0);
    });

    it("should assign the provided problem", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      const state = session.getState();

      expect(state.problem.id).toBe("two-sum");
      expect(state.problem.title).toBe("Two Sum");
    });

    it("should initialize nudge budget based on preset", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      const state = session.getState();

      expect(state.nudgesRemaining).toBe(3);
    });

    it("should initialize with zero nudges for No Assistance preset", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.NoAssistance,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      const state = session.getState();

      expect(state.nudgesRemaining).toBe(0);
    });

    it("should record session.started event with timestamp", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      const events = session.getEvents();

      expect(events.length).toBe(1);
      expect(events[0].type).toBe("session.started");
      expect(events[0].timestamp).toBe(1000);
    });

    it("should use config from selected preset", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.HighPressure,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      const state = session.getState();

      // High Pressure: 3 min prep, 25 min coding, 2 min silent, 1 nudge
      expect(state.config.prepDuration).toBe(3 * 60 * 1000);
      expect(state.config.codingDuration).toBe(25 * 60 * 1000);
      expect(state.config.silentDuration).toBe(2 * 60 * 1000);
      expect(state.nudgesRemaining).toBe(1);
    });
  });

  describe("PREP to CODING transition", () => {
    it("should transition to CODING when user starts coding manually", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      clock.advance(2 * 60 * 1000); // 2 minutes into prep
      session.dispatch("coding.started");

      const state = session.getState();
      expect(state.phase).toBe(Phase.Coding);
    });

    it("should capture invariants before transitioning to CODING", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("prep.invariants_changed", {
        invariants: "# Assumptions:\n- Array has at least 2 elements",
      });
      session.dispatch("coding.started");

      const state = session.getState();
      expect(state.invariants).toBe("# Assumptions:\n- Array has at least 2 elements");
    });

    it("should allow empty invariants", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");

      const state = session.getState();
      expect(state.invariants).toBe("");
      expect(state.phase).toBe(Phase.Coding);
    });

    it("should record prep duration when transitioning to CODING", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      clock.advance(3 * 60 * 1000); // 3 minutes
      session.dispatch("coding.started");

      const state = session.getState();
      expect(state.prepTimeUsed).toBe(3 * 60 * 1000);
    });

    it("should auto-transition to CODING when prep timer expires", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      clock.advance(5 * 60 * 1000); // Full 5 minutes
      session.dispatch("prep.time_expired");
      session.dispatch("coding.started");

      const state = session.getState();
      expect(state.phase).toBe(Phase.Coding);
      expect(state.prepTimeExpired).toBe(true);
    });
  });

  describe("CODING phase", () => {
    it("should allow nudges during CODING phase", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");

      const state = session.getState();
      expect(state.nudgesAllowed).toBe(true);
    });

    it("should track nudgesUsed count", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");

      expect(session.getState().nudgesUsed).toBe(0);

      session.dispatch("nudge.requested");
      expect(session.getState().nudgesUsed).toBe(1);
      expect(session.getState().nudgesRemaining).toBe(2);

      session.dispatch("nudge.requested");
      expect(session.getState().nudgesUsed).toBe(2);
      expect(session.getState().nudgesRemaining).toBe(1);
    });

    it("should not allow more nudges than budget", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");

      // Use all 3 nudges
      session.dispatch("nudge.requested");
      session.dispatch("nudge.requested");
      session.dispatch("nudge.requested");

      expect(session.getState().nudgesUsed).toBe(3);
      expect(session.getState().nudgesRemaining).toBe(0);

      // Try to use a 4th nudge
      session.dispatch("nudge.requested");

      // Should not exceed budget
      expect(session.getState().nudgesUsed).toBe(3);
      expect(session.getState().nudgesRemaining).toBe(0);
    });
  });

  describe("CODING to SILENT transition", () => {
    it("should transition to SILENT when coding timer expires", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");
      clock.advance(35 * 60 * 1000); // Full 35 minutes
      session.dispatch("coding.silent_started");

      const state = session.getState();
      expect(state.phase).toBe(Phase.Silent);
    });

    it("should preserve code when transitioning to SILENT", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");
      session.dispatch("coding.code_changed", {
        code: "def two_sum(nums, target):\n    pass",
      });
      session.dispatch("coding.silent_started");

      const state = session.getState();
      expect(state.code).toBe("def two_sum(nums, target):\n    pass");
    });

    it("should disable nudges in SILENT phase", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");
      session.dispatch("coding.silent_started");

      const state = session.getState();
      expect(state.nudgesAllowed).toBe(false);
    });
  });

  describe("SILENT to SUMMARY transition", () => {
    it("should transition to SUMMARY when silent timer expires", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");
      session.dispatch("coding.silent_started");
      clock.advance(5 * 60 * 1000); // Full 5 minutes
      session.dispatch("silent.ended");

      const state = session.getState();
      expect(state.phase).toBe(Phase.Summary);
    });

    it("should preserve final code in SUMMARY", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");
      session.dispatch("coding.code_changed", {
        code: "def two_sum(nums, target):\n    seen = {}",
      });
      session.dispatch("coding.silent_started");
      session.dispatch("coding.code_changed", {
        code: "def two_sum(nums, target):\n    seen = {}\n    return []",
      });
      session.dispatch("silent.ended");

      const state = session.getState();
      expect(state.code).toBe("def two_sum(nums, target):\n    seen = {}\n    return []");
    });
  });

  describe("SUMMARY to REFLECTION transition", () => {
    it("should transition to REFLECTION when user continues from summary", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");
      session.dispatch("coding.silent_started");
      session.dispatch("silent.ended");
      session.dispatch("summary.continued");

      const state = session.getState();
      expect(state.phase).toBe(Phase.Reflection);
    });
  });

  describe("REFLECTION to DONE transition", () => {
    it("should transition to DONE when reflection is submitted", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");
      session.dispatch("coding.silent_started");
      session.dispatch("silent.ended");
      session.dispatch("summary.continued");
      session.dispatch("reflection.submitted", {
        responses: {
          clearApproach: "yes",
          prolongedStall: "no",
          recoveredFromStall: "n/a",
          timePressure: "manageable",
          wouldChangeApproach: "no",
        },
      });

      const state = session.getState();
      expect(state.phase).toBe(Phase.Done);
    });

    it("should capture reflection responses", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");
      session.dispatch("coding.silent_started");
      session.dispatch("silent.ended");
      session.dispatch("summary.continued");
      session.dispatch("reflection.submitted", {
        responses: {
          clearApproach: "partially",
          prolongedStall: "yes",
          recoveredFromStall: "yes",
          timePressure: "overwhelming",
          wouldChangeApproach: "yes",
        },
      });

      const state = session.getState();
      expect(state.reflection?.responses.clearApproach).toBe("partially");
      expect(state.reflection?.responses.prolongedStall).toBe("yes");
      expect(state.reflection?.responses.timePressure).toBe("overwhelming");
    });

    it("should mark session as completed", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");
      session.dispatch("coding.silent_started");
      session.dispatch("silent.ended");
      session.dispatch("summary.continued");
      session.dispatch("reflection.submitted", {
        responses: {
          clearApproach: "yes",
          prolongedStall: "no",
          recoveredFromStall: "n/a",
          timePressure: "comfortable",
          wouldChangeApproach: "no",
        },
      });

      const state = session.getState();
      expect(state.status).toBe("completed");
    });
  });

  describe("Complete session (happy path)", () => {
    it("should complete full session lifecycle", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      // START → PREP
      session.dispatch("session.started");
      expect(session.getState().phase).toBe(Phase.Prep);

      // PREP: Write invariants
      session.dispatch("prep.invariants_changed", {
        invariants: "# Use hashmap for O(n) solution",
      });

      // PREP → CODING
      clock.advance(3 * 60 * 1000);
      session.dispatch("coding.started");
      expect(session.getState().phase).toBe(Phase.Coding);

      // CODING: Write code, use nudge
      session.dispatch("coding.code_changed", {
        code: "def two_sum(nums, target):\n    seen = {}",
      });
      session.dispatch("nudge.requested");
      session.dispatch("coding.code_changed", {
        code: "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        pass",
      });

      // CODING → SILENT
      clock.advance(35 * 60 * 1000);
      session.dispatch("coding.silent_started");
      expect(session.getState().phase).toBe(Phase.Silent);

      // SILENT: Continue coding
      session.dispatch("coding.code_changed", {
        code: "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target-n], i]\n        seen[n] = i",
      });

      // SILENT → SUMMARY
      clock.advance(5 * 60 * 1000);
      session.dispatch("silent.ended");
      expect(session.getState().phase).toBe(Phase.Summary);

      // SUMMARY → REFLECTION
      session.dispatch("summary.continued");
      expect(session.getState().phase).toBe(Phase.Reflection);

      // REFLECTION → DONE
      session.dispatch("reflection.submitted", {
        responses: {
          clearApproach: "yes",
          prolongedStall: "no",
          recoveredFromStall: "n/a",
          timePressure: "manageable",
          wouldChangeApproach: "no",
        },
      });
      expect(session.getState().phase).toBe(Phase.Done);

      // Verify final state
      const finalState = session.getState();
      expect(finalState.status).toBe("completed");
      expect(finalState.nudgesUsed).toBe(1);
      expect(finalState.invariants).toBe("# Use hashmap for O(n) solution");
      expect(finalState.code).toContain("def two_sum");
    });
  });

  describe("Session immutability after DONE", () => {
    it("should reject events after session is DONE", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      // Complete the session
      session.dispatch("session.started");
      session.dispatch("coding.started");
      session.dispatch("coding.silent_started");
      session.dispatch("silent.ended");
      session.dispatch("summary.continued");
      session.dispatch("reflection.submitted", {
        responses: {
          clearApproach: "yes",
          prolongedStall: "no",
          recoveredFromStall: "n/a",
          timePressure: "comfortable",
          wouldChangeApproach: "no",
        },
      });

      expect(session.getState().phase).toBe(Phase.Done);

      // Attempt to modify
      const eventCountBefore = session.getEvents().length;
      session.dispatch("coding.code_changed", { code: "hacked!" });

      // Should not add event or change state
      expect(session.getEvents().length).toBe(eventCountBefore);
      expect(session.getState().code).not.toBe("hacked!");
    });
  });

  describe("Invalid transitions", () => {
    it("should reject coding.started before session.started", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("coding.started");

      // Should still be in initial state (no phase)
      expect(session.getEvents().length).toBe(0);
    });

    it("should reject nudge.requested in PREP phase", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      const nudgesBefore = session.getState().nudgesRemaining;
      session.dispatch("nudge.requested");

      // Should not decrement nudges in PREP
      expect(session.getState().nudgesRemaining).toBe(nudgesBefore);
    });

    it("should reject nudge.requested in SILENT phase", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");
      session.dispatch("nudge.requested"); // Valid
      session.dispatch("coding.silent_started");

      const nudgesBefore = session.getState().nudgesRemaining;
      session.dispatch("nudge.requested"); // Invalid

      // Should not decrement nudges in SILENT
      expect(session.getState().nudgesRemaining).toBe(nudgesBefore);
    });

    it("should reject reflection.submitted before summary.continued", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("coding.started");
      session.dispatch("coding.silent_started");
      session.dispatch("silent.ended");

      // Try to skip summary
      session.dispatch("reflection.submitted", {
        responses: {
          clearApproach: "yes",
          prolongedStall: "no",
          recoveredFromStall: "n/a",
          timePressure: "comfortable",
          wouldChangeApproach: "no",
        },
      });

      // Should still be in SUMMARY
      expect(session.getState().phase).toBe(Phase.Summary);
    });
  });

  describe("Event log integrity", () => {
    it("should append events in order with timestamps", () => {
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      clock.advance(1000);
      session.dispatch("coding.started");
      clock.advance(1000);
      session.dispatch("coding.code_changed", { code: "test" });

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
      const clock = createMockClock(1000);
      const session = createSession({
        preset: Preset.Standard,
        problem: TEST_PROBLEM,
        clock: clock.now,
      });

      session.dispatch("session.started");
      session.dispatch("prep.invariants_changed", { invariants: "test" });
      session.dispatch("coding.started");
      session.dispatch("nudge.requested");

      const originalState = session.getState();
      const events = session.getEvents();

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
});

describe("Session abandonment", () => {
  it("should transition to abandoned_explicit status when session.abandoned is dispatched", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    session.dispatch("coding.started");
    session.dispatch("session.abandoned");

    const state = session.getState();
    expect(state.status).toBe("abandoned_explicit");
  });

  it("should reject events after session is abandoned", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    session.dispatch("coding.started");
    session.dispatch("session.abandoned");

    const eventCountBefore = session.getEvents().length;
    session.dispatch("coding.code_changed", { code: "test" });

    expect(session.getEvents().length).toBe(eventCountBefore);
  });
});

describe("Session completion events", () => {
  it("should auto-emit session.completed event after reflection.submitted", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    session.dispatch("coding.started");
    session.dispatch("coding.silent_started");
    session.dispatch("silent.ended");
    session.dispatch("summary.continued");
    session.dispatch("reflection.submitted", {
      responses: {
        clearApproach: "yes",
        prolongedStall: "no",
        recoveredFromStall: "n/a",
        timePressure: "comfortable",
        wouldChangeApproach: "no",
      },
    });

    const events = session.getEvents();
    const eventTypes = events.map(e => e.type);
    
    expect(eventTypes).toContain("reflection.submitted");
    expect(eventTypes).toContain("session.completed");
    
    // session.completed should come after reflection.submitted
    const reflectionIndex = eventTypes.indexOf("reflection.submitted");
    const completedIndex = eventTypes.indexOf("session.completed");
    expect(completedIndex).toBeGreaterThan(reflectionIndex);
  });
});

describe("Audio events", () => {
  it("should accept audio.started event and track isRecording state", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    session.dispatch("coding.started");
    session.dispatch("audio.started");

    const state = session.getState();
    expect(state.isRecording).toBe(true);
  });

  it("should accept audio.stopped event and update isRecording state", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    session.dispatch("coding.started");
    session.dispatch("audio.started");
    session.dispatch("audio.stopped");

    const state = session.getState();
    expect(state.isRecording).toBe(false);
  });

  it("should accept audio.permission_denied event", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    session.dispatch("audio.permission_denied");

    const events = session.getEvents();
    expect(events.some(e => e.type === "audio.permission_denied")).toBe(true);
  });
});

describe("Subscriber pattern", () => {
  it("should notify subscribers when events are dispatched", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    const notifications: Array<{ event: any; state: any }> = [];
    session.subscribe((event, state) => {
      notifications.push({ event, state });
    });

    session.dispatch("session.started");

    expect(notifications.length).toBe(1);
    expect(notifications[0].event.type).toBe("session.started");
    expect(notifications[0].state.phase).toBe(Phase.Prep);
  });

  it("should return unsubscribe function that stops notifications", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    const notifications: any[] = [];
    const unsubscribe = session.subscribe((event) => {
      notifications.push(event);
    });

    session.dispatch("session.started");
    expect(notifications.length).toBe(1);

    unsubscribe();
    session.dispatch("coding.started");
    expect(notifications.length).toBe(1); // No new notification
  });
});

describe("Remaining time derivation", () => {
  it("should compute remainingTime dynamically based on clock", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    
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
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    clock.advance(6 * 60 * 1000); // 6 minutes (1 minute over)

    expect(session.getState().remainingTime).toBe(-1 * 60 * 1000);
  });
});

describe("Dispatch return value", () => {
  it("should return the created event on successful dispatch", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    const event = session.dispatch("session.started");

    expect(event).not.toBeNull();
    expect(event?.type).toBe("session.started");
    expect(event?.timestamp).toBe(1000);
  });

  it("should return null when dispatch is rejected", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    // Try to dispatch coding.started before session.started
    const event = session.dispatch("coding.started");

    expect(event).toBeNull();
  });
});

describe("Invalid event handling", () => {
  it("should reject unknown event types", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    const eventCountBefore = session.getEvents().length;
    
    // @ts-expect-error - Testing invalid event type
    session.dispatch("invalid.event.type");

    expect(session.getEvents().length).toBe(eventCountBefore);
  });

  it("should reject session.started when already started", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    const eventCountBefore = session.getEvents().length;
    
    session.dispatch("session.started");

    expect(session.getEvents().length).toBe(eventCountBefore);
  });
});

describe("Backward transitions rejected", () => {
  it("should reject prep.invariants_changed in CODING phase", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    session.dispatch("prep.invariants_changed", { invariants: "initial" });
    session.dispatch("coding.started");

    const eventCountBefore = session.getEvents().length;
    session.dispatch("prep.invariants_changed", { invariants: "modified" });

    expect(session.getEvents().length).toBe(eventCountBefore);
    expect(session.getState().invariants).toBe("initial");
  });

  it("should reject coding.started in SILENT phase", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    session.dispatch("coding.started");
    session.dispatch("coding.silent_started");

    const eventCountBefore = session.getEvents().length;
    session.dispatch("coding.started");

    expect(session.getEvents().length).toBe(eventCountBefore);
    expect(session.getState().phase).toBe(Phase.Silent);
  });
});

describe("State initialization", () => {
  it("should initialize state.code as empty string", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    session.dispatch("coding.started");

    expect(session.getState().code).toBe("");
  });

  it("should generate unique IDs for different sessions", () => {
    const clock1 = createMockClock(1000);
    const session1 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock1.now,
    });
    session1.dispatch("session.started");

    const clock2 = createMockClock(2000);
    const session2 = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock2.now,
    });
    session2.dispatch("session.started");

    expect(session1.getState().id).not.toBe(session2.getState().id);
  });
});

describe("No Assistance preset configuration", () => {
  it("should use correct durations for No Assistance preset", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.NoAssistance,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    const state = session.getState();

    // No Assistance: 5 min prep, 35 min coding, 5 min silent, 0 nudges
    expect(state.config.prepDuration).toBe(5 * 60 * 1000);
    expect(state.config.codingDuration).toBe(35 * 60 * 1000);
    expect(state.config.silentDuration).toBe(5 * 60 * 1000);
    expect(state.config.nudgeBudget).toBe(0);
  });
});

describe("Phase overruns", () => {
  it("should track prepTimeExpired flag when prep timer forces transition", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    clock.advance(5 * 60 * 1000); // Full prep time
    session.dispatch("prep.time_expired");
    session.dispatch("coding.started");

    expect(session.getState().prepTimeExpired).toBe(true);
  });

  it("should not set prepTimeExpired when user starts coding early", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    clock.advance(2 * 60 * 1000); // Only 2 minutes
    session.dispatch("coding.started");

    expect(session.getState().prepTimeExpired).toBe(false);
  });
});

describe("Reflection validation", () => {
  it("should reject reflection with invalid clearApproach value", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    session.dispatch("coding.started");
    session.dispatch("coding.silent_started");
    session.dispatch("silent.ended");
    session.dispatch("summary.continued");

    const result = session.dispatch("reflection.submitted", {
      responses: {
        clearApproach: "maybe", // Invalid value
        prolongedStall: "no",
        recoveredFromStall: "n/a",
        timePressure: "comfortable",
        wouldChangeApproach: "no",
      },
    });

    expect(result).toBeNull();
    expect(session.getState().phase).toBe(Phase.Reflection);
  });

  it("should reject reflection with missing required fields", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    session.dispatch("coding.started");
    session.dispatch("coding.silent_started");
    session.dispatch("silent.ended");
    session.dispatch("summary.continued");

    const result = session.dispatch("reflection.submitted", {
      responses: {
        clearApproach: "yes",
        // Missing other required fields
      },
    });

    expect(result).toBeNull();
    expect(session.getState().phase).toBe(Phase.Reflection);
  });

  it("should allow recoveredFromStall='n/a' only when prolongedStall='no'", () => {
    const clock = createMockClock(1000);
    const session = createSession({
      preset: Preset.Standard,
      problem: TEST_PROBLEM,
      clock: clock.now,
    });

    session.dispatch("session.started");
    session.dispatch("coding.started");
    session.dispatch("coding.silent_started");
    session.dispatch("silent.ended");
    session.dispatch("summary.continued");

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

    expect(result).toBeNull();
    expect(session.getState().phase).toBe(Phase.Reflection);
  });
});
