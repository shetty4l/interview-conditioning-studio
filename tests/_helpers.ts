/**
 * Shared Test Utilities
 *
 * Common fixtures, helpers, and Result type utilities for all test files.
 */

import { expect } from "bun:test";
import {
  createSession,
  type Session,
  type Problem,
  type Event,
  type DispatchResult,
  type DispatchError,
  type DispatchErrorCode,
  Preset,
  Phase,
} from "../core/src/index";

// ============================================================================
// Test Fixtures
// ============================================================================

export const TEST_PROBLEM: Problem = {
  id: "two-sum",
  title: "Two Sum",
  description:
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
};

// ============================================================================
// Mock Clock
// ============================================================================

export interface MockClock {
  now: () => number;
  advance: (ms: number) => void;
  set: (ms: number) => void;
}

export function createMockClock(initialTime: number = 0): MockClock {
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

// ============================================================================
// Session Factory
// ============================================================================

export interface TestSessionContext {
  session: Session;
  clock: MockClock;
}

export function createTestSession(
  preset: Preset = Preset.Standard,
  initialTime: number = 1000,
): TestSessionContext {
  const clock = createMockClock(initialTime);
  const session = createSession({
    preset,
    problem: TEST_PROBLEM,
    clock: clock.now,
  });
  return { session, clock };
}

// ============================================================================
// Result Type Helpers (Effect-TS Style)
// ============================================================================

/**
 * Assert that a dispatch result is successful and return the event.
 * Throws if the result is an error.
 */
export function expectSuccess(result: DispatchResult): Event {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(
      `Expected success but got error: ${result.error.code} - ${result.error.message}`,
    );
  }
  return result.value;
}

/**
 * Assert that a dispatch result is an error and return the error.
 * Optionally verify the error code.
 * Throws if the result is successful.
 */
export function expectError(result: DispatchResult, code?: DispatchErrorCode): DispatchError {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error(`Expected error but got success: ${result.value.type}`);
  }
  if (code) {
    expect(result.error.code).toBe(code);
  }
  return result.error;
}

// ============================================================================
// Phase Navigation Helpers
// ============================================================================

/**
 * Start a session (dispatch session.started).
 */
export function startSession(session: Session): DispatchResult {
  return session.dispatch("session.started");
}

/**
 * Advance session to CODING phase.
 */
export function advanceToCoding(session: Session): void {
  session.dispatch("session.started");
  session.dispatch("coding.started");
}

/**
 * Advance session to SILENT phase.
 */
export function advanceToSilent(session: Session): void {
  session.dispatch("session.started");
  session.dispatch("coding.started");
  session.dispatch("coding.silent_started");
}

/**
 * Advance session to SUMMARY phase.
 */
export function advanceToSummary(session: Session): void {
  session.dispatch("session.started");
  session.dispatch("coding.started");
  session.dispatch("coding.silent_started");
  session.dispatch("silent.ended");
}

/**
 * Advance session to REFLECTION phase.
 */
export function advanceToReflection(session: Session): void {
  session.dispatch("session.started");
  session.dispatch("coding.started");
  session.dispatch("coding.silent_started");
  session.dispatch("silent.ended");
  session.dispatch("summary.continued");
}

/**
 * Complete a session fully (through REFLECTION to DONE).
 */
export function completeSession(session: Session): void {
  advanceToReflection(session);
  session.dispatch("reflection.submitted", {
    responses: {
      clearApproach: "yes",
      prolongedStall: "no",
      recoveredFromStall: "n/a",
      timePressure: "comfortable",
      wouldChangeApproach: "no",
    },
  });
}

// ============================================================================
// Valid Reflection Responses (for reuse in tests)
// ============================================================================

export const VALID_REFLECTION_RESPONSES = {
  clearApproach: "yes" as const,
  prolongedStall: "no" as const,
  recoveredFromStall: "n/a" as const,
  timePressure: "comfortable" as const,
  wouldChangeApproach: "no" as const,
};

// Re-export types and enums for convenience
export {
  Phase,
  Preset,
  type Session,
  type Event,
  type DispatchResult,
  type DispatchError,
  type DispatchErrorCode,
};
