/**
 * Export Module Tests
 *
 * Tests for README generation in session exports.
 */

import { describe, test, expect } from "bun:test";
import { buildReadme } from "../../web/src/export";
import type { StoredSession } from "../../web/src/types";
import type { Event, ReflectionResponses } from "../../core/src/types";
import { Preset } from "../../core/src/types";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    id: "test-session-id",
    events: [],
    problem: {
      id: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      patterns: ["arrays", "hash-map"],
      description:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    },
    preset: Preset.Standard,
    createdAt: new Date("2026-01-06T10:00:00Z").getTime(),
    updatedAt: new Date("2026-01-06T11:00:00Z").getTime(),
    deletedAt: null,
    ...overrides,
  };
}

function createReflectionEvent(): Event {
  const responses: ReflectionResponses = {
    clearApproach: "yes",
    prolongedStall: "no",
    recoveredFromStall: "n/a",
    timePressure: "comfortable",
    wouldChangeApproach: "no",
  };

  return {
    type: "reflection.submitted",
    timestamp: Date.now(),
    data: { responses },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("buildReadme", () => {
  test("includes problem title and description", () => {
    const session = createMockSession();
    const readme = buildReadme(session, "", "", false, null);

    expect(readme).toContain("# Interview Practice Session: Two Sum");
    expect(readme).toContain("Given an array of integers nums");
    expect(readme).toContain("## Problem Description");
  });

  test("includes problem metadata (difficulty, patterns, preset)", () => {
    const session = createMockSession();
    const readme = buildReadme(session, "", "", false, null);

    expect(readme).toContain("**Difficulty:** easy");
    expect(readme).toContain("**Patterns:** arrays, hash-map");
    expect(readme).toContain("**Preset:** standard");
  });

  test("includes code block with provided code", () => {
    const session = createMockSession();
    const code = "def two_sum(nums, target):\n  pass";
    const readme = buildReadme(session, code, "", false, null);

    expect(readme).toContain("## My Code");
    expect(readme).toContain("```python");
    expect(readme).toContain("def two_sum(nums, target):");
    expect(readme).toContain("```");
  });

  test("includes placeholder when code is empty", () => {
    const session = createMockSession();
    const readme = buildReadme(session, "", "", false, null);

    expect(readme).toContain("## My Code");
    expect(readme).toContain("# No code was written");
  });

  test("includes invariants section with provided invariants", () => {
    const session = createMockSession();
    const invariants = "- Use hash map for O(1) lookup\n- Single pass solution";
    const readme = buildReadme(session, "", invariants, false, null);

    expect(readme).toContain("## My Approach / Invariants");
    expect(readme).toContain("Use hash map for O(1) lookup");
    expect(readme).toContain("Single pass solution");
  });

  test("includes placeholder when invariants is empty", () => {
    const session = createMockSession();
    const readme = buildReadme(session, "", "", false, null);

    expect(readme).toContain("## My Approach / Invariants");
    expect(readme).toContain("_No invariants were written during the prep phase._");
  });

  test("includes reflection responses when present", () => {
    const session = createMockSession({
      events: [createReflectionEvent()],
    });
    const readme = buildReadme(session, "", "", false, null);

    expect(readme).toContain("## Self-Reflection");
    expect(readme).toContain("**Did you have a clear approach before coding?**");
    expect(readme).toContain("yes");
    expect(readme).toContain("**Did you experience any prolonged stalls?**");
    expect(readme).toContain("**How did you handle time pressure?**");
    expect(readme).toContain("comfortable");
  });

  test("omits reflection section when no reflection event", () => {
    const session = createMockSession();
    const readme = buildReadme(session, "", "", false, null);

    expect(readme).not.toContain("## Self-Reflection");
  });

  test("includes audio transcription instructions when audio exists", () => {
    const session = createMockSession();
    const readme = buildReadme(session, "", "", true, "audio/webm;codecs=opus");

    expect(readme).toContain("## Audio Recording");
    expect(readme).toContain("audio.webm");
    expect(readme).toContain("whisper audio.webm --model base");
    expect(readme).toContain("AssemblyAI");
    expect(readme).toContain("Deepgram");
  });

  test("omits audio section when no audio exists", () => {
    const session = createMockSession();
    const readme = buildReadme(session, "", "", false, null);

    expect(readme).not.toContain("## Audio Recording");
    expect(readme).not.toContain("whisper");
  });

  test("includes LLM feedback prompts", () => {
    const session = createMockSession();
    const readme = buildReadme(session, "", "", false, null);

    expect(readme).toContain("## How to Get Feedback");
    expect(readme).toContain("Code Review");
    expect(readme).toContain("Complexity Analysis");
    expect(readme).toContain("Interview Readiness");
  });

  test("handles mp4 audio format correctly", () => {
    const session = createMockSession();
    const readme = buildReadme(session, "", "", true, "audio/mp4");

    expect(readme).toContain("audio.m4a");
    expect(readme).toContain("whisper audio.m4a --model base");
  });
});
