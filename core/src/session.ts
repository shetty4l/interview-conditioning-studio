/**
 * Session Engine
 *
 * Core session implementation with event sourcing.
 */

import {
  Phase,
  Preset,
  type Session,
  type SessionState,
  type Event,
  type EventType,
  type EventData,
  type DispatchResult,
  type DispatchError,
  type CreateSessionOptions,
  type EventCallback,
  type UnsubscribeFn,
  type ReflectionResponses,
  type ReflectionSubmittedData,
} from "./types";
import { getPresetConfig } from "./presets";

// ============================================================================
// ID Generation
// ============================================================================

function generateSessionId(): string {
  return Math.random().toString(36).slice(2, 8);
}

// ============================================================================
// Result Constructors
// ============================================================================

function success(event: Event): DispatchResult {
  return { ok: true, value: event };
}

function error(code: DispatchError["code"], message: string): DispatchResult {
  return { ok: false, error: { code, message } };
}

// ============================================================================
// Validation
// ============================================================================

// All valid event types (for unknown event type validation)
const ALL_EVENT_TYPES: Set<EventType> = new Set([
  "session.started",
  "prep.invariants_changed",
  "prep.time_expired",
  "coding.started",
  "coding.code_changed",
  "nudge.requested",
  "coding.silent_started",
  "silent.ended",
  "summary.continued",
  "reflection.submitted",
  "session.completed",
  "session.abandoned",
  "audio.started",
  "audio.stopped",
  "audio.permission_denied",
]);

function isValidEventType(type: string): type is EventType {
  return ALL_EVENT_TYPES.has(type as EventType);
}

const VALID_TRANSITIONS: Partial<Record<Phase, EventType[]>> = {
  [Phase.Start]: ["session.started"],
  [Phase.Prep]: [
    "prep.invariants_changed",
    "prep.time_expired",
    "coding.started",
    "audio.permission_denied",
    "session.abandoned",
  ],
  [Phase.Coding]: [
    "coding.code_changed",
    "nudge.requested",
    "coding.silent_started",
    "audio.started",
    "audio.stopped",
    "audio.permission_denied",
    "session.abandoned",
  ],
  [Phase.Silent]: [
    "coding.code_changed",
    "silent.ended",
    "audio.started",
    "audio.stopped",
    "session.abandoned",
  ],
  [Phase.Summary]: ["summary.continued", "session.abandoned"],
  [Phase.Reflection]: ["reflection.submitted", "session.abandoned"],
  [Phase.Done]: [],
};

// Events allowed when phase is undefined (before session.started)
const VALID_BEFORE_START: EventType[] = ["session.started"];

function isValidTransition(phase: Phase | undefined, eventType: EventType): boolean {
  if (phase === undefined) {
    return VALID_BEFORE_START.includes(eventType);
  }
  return VALID_TRANSITIONS[phase]?.includes(eventType) ?? false;
}

// Reflection response validation
const VALID_CLEAR_APPROACH = ["yes", "partially", "no"] as const;
const VALID_PROLONGED_STALL = ["yes", "no"] as const;
const VALID_RECOVERED_FROM_STALL = ["yes", "partially", "no", "n/a"] as const;
const VALID_TIME_PRESSURE = ["comfortable", "manageable", "overwhelming"] as const;
const VALID_WOULD_CHANGE = ["yes", "no"] as const;

function validateReflectionResponses(
  responses: ReflectionResponses
): DispatchError | null {
  if (!responses || typeof responses !== "object") {
    return { code: "VALIDATION_FAILED", message: "Missing responses object" };
  }

  if (!VALID_CLEAR_APPROACH.includes(responses.clearApproach as typeof VALID_CLEAR_APPROACH[number])) {
    return { code: "VALIDATION_FAILED", message: `Invalid clearApproach: ${responses.clearApproach}` };
  }

  if (!VALID_PROLONGED_STALL.includes(responses.prolongedStall as typeof VALID_PROLONGED_STALL[number])) {
    return { code: "VALIDATION_FAILED", message: `Invalid prolongedStall: ${responses.prolongedStall}` };
  }

  if (!VALID_RECOVERED_FROM_STALL.includes(responses.recoveredFromStall as typeof VALID_RECOVERED_FROM_STALL[number])) {
    return { code: "VALIDATION_FAILED", message: `Invalid recoveredFromStall: ${responses.recoveredFromStall}` };
  }

  // Conditional validation: n/a only valid when prolongedStall is "no"
  if (responses.recoveredFromStall === "n/a" && responses.prolongedStall !== "no") {
    return {
      code: "VALIDATION_FAILED",
      message: "recoveredFromStall can only be 'n/a' when prolongedStall is 'no'",
    };
  }

  if (!VALID_TIME_PRESSURE.includes(responses.timePressure as typeof VALID_TIME_PRESSURE[number])) {
    return { code: "VALIDATION_FAILED", message: `Invalid timePressure: ${responses.timePressure}` };
  }

  if (!VALID_WOULD_CHANGE.includes(responses.wouldChangeApproach as typeof VALID_WOULD_CHANGE[number])) {
    return { code: "VALIDATION_FAILED", message: `Invalid wouldChangeApproach: ${responses.wouldChangeApproach}` };
  }

  return null;
}

// ============================================================================
// State Derivation
// ============================================================================

function deriveState(
  events: Event[],
  preset: Preset,
  problem: CreateSessionOptions["problem"],
  clock: () => number
): SessionState {
  const config = getPresetConfig(preset);
  const now = clock();

  // Initial state (before session.started)
  let state: SessionState = {
    id: undefined,
    phase: undefined,
    status: "in_progress",
    problem: problem,
    preset,
    config,
    invariants: "",
    code: "",
    nudgesRemaining: config.nudgeBudget,
    nudgesUsed: 0,
    nudgesAllowed: false,
    isRecording: false,
    remainingTime: config.prepDuration,
    prepTimeUsed: undefined,
    prepTimeExpired: false,
    reflection: undefined,
    sessionStartedAt: null,
    prepStartedAt: null,
    codingStartedAt: null,
    silentStartedAt: null,
  };

  // Replay events to derive current state
  for (const event of events) {
    state = applyEvent(state, event);
  }

  // Calculate remaining time based on current phase
  state.remainingTime = calculateRemainingTime(state, now);

  // Calculate prepTimeUsed if we're past PREP
  if (state.prepStartedAt !== null && state.codingStartedAt !== null) {
    state.prepTimeUsed = state.codingStartedAt - state.prepStartedAt;
  }

  // Calculate nudgesAllowed based on phase
  state.nudgesAllowed = state.phase === Phase.Coding && state.nudgesRemaining > 0;

  return state;
}

function applyEvent(state: SessionState, event: Event): SessionState {
  const newState = { ...state };

  switch (event.type) {
    case "session.started":
      newState.id = generateSessionId();
      newState.phase = Phase.Prep;
      newState.sessionStartedAt = event.timestamp;
      newState.prepStartedAt = event.timestamp;
      break;

    case "prep.invariants_changed":
      newState.invariants = (event.data as { invariants: string }).invariants ?? "";
      break;

    case "prep.time_expired":
      newState.prepTimeExpired = true;
      break;

    case "coding.started":
      newState.phase = Phase.Coding;
      newState.codingStartedAt = event.timestamp;
      break;

    case "coding.code_changed":
      newState.code = (event.data as { code: string }).code ?? "";
      break;

    case "nudge.requested":
      newState.nudgesUsed += 1;
      newState.nudgesRemaining -= 1;
      break;

    case "coding.silent_started":
      newState.phase = Phase.Silent;
      newState.silentStartedAt = event.timestamp;
      break;

    case "silent.ended":
      newState.phase = Phase.Summary;
      break;

    case "summary.continued":
      newState.phase = Phase.Reflection;
      break;

    case "reflection.submitted":
      newState.reflection = event.data as ReflectionSubmittedData;
      break;

    case "session.completed":
      newState.phase = Phase.Done;
      newState.status = "completed";
      break;

    case "session.abandoned":
      newState.status = "abandoned_explicit";
      break;

    case "audio.started":
      newState.isRecording = true;
      break;

    case "audio.stopped":
    case "audio.permission_denied":
      newState.isRecording = false;
      break;
  }

  return newState;
}

function calculateRemainingTime(state: SessionState, now: number): number {
  switch (state.phase) {
    case undefined:
      return state.config.prepDuration;

    case Phase.Start:
      return state.config.prepDuration;

    case Phase.Prep:
      if (state.prepStartedAt === null) return state.config.prepDuration;
      return state.config.prepDuration - (now - state.prepStartedAt);

    case Phase.Coding:
      if (state.codingStartedAt === null) return state.config.codingDuration;
      return state.config.codingDuration - (now - state.codingStartedAt);

    case Phase.Silent:
      if (state.silentStartedAt === null) return state.config.silentDuration;
      return state.config.silentDuration - (now - state.silentStartedAt);

    case Phase.Summary:
    case Phase.Reflection:
    case Phase.Done:
      return 0;

    default:
      return 0;
  }
}

// ============================================================================
// Session Implementation
// ============================================================================

class SessionImpl implements Session {
  private events: Event[] = [];
  private listeners: EventCallback[] = [];
  private cachedState: SessionState | null = null;
  private cacheVersion = -1;

  private readonly preset: Preset;
  private readonly problem: CreateSessionOptions["problem"];
  private readonly clock: () => number;

  constructor(options: CreateSessionOptions) {
    this.preset = options.preset ?? Preset.Standard;
    this.problem = options.problem;
    this.clock = options.clock ?? Date.now;
  }

  dispatch(type: EventType, data: Partial<EventData> = {}): DispatchResult {
    const state = this.getState();

    // Check for unknown event types (handles @ts-expect-error in tests)
    if (!isValidEventType(type as string)) {
      return error("INVALID_EVENT_TYPE", `Unknown event type: ${type}`);
    }

    // Check if session is terminated
    if (state.status === "abandoned_explicit" || state.status === "completed") {
      return error("SESSION_TERMINATED", `Session is ${state.status}`);
    }

    // Validate transition
    if (!isValidTransition(state.phase, type)) {
      // Use INVALID_PHASE for phase-related errors
      return error(
        "INVALID_PHASE",
        `Cannot dispatch ${type} in phase ${state.phase ?? "undefined"}`
      );
    }

    // Phase-specific validation for nudges
    if (type === "nudge.requested") {
      if (state.nudgesRemaining <= 0) {
        return error("NUDGE_BUDGET_EXHAUSTED", "No nudges remaining");
      }
      // This check should not be needed since VALID_TRANSITIONS already limits it,
      // but keeping for clarity
      if (state.phase !== Phase.Coding) {
        return error("NUDGES_DISABLED_IN_PHASE", `Nudges not allowed in ${state.phase}`);
      }
    }

    // Validate reflection responses
    if (type === "reflection.submitted") {
      const responses = (data as { responses?: ReflectionResponses }).responses;
      if (!responses) {
        return error("VALIDATION_FAILED", "Missing responses in reflection.submitted");
      }
      const validationError = validateReflectionResponses(responses);
      if (validationError) {
        return { ok: false, error: validationError };
      }
    }

    // Create and append event
    const event: Event = {
      type,
      timestamp: this.clock(),
      data: data as EventData,
    };
    this.events.push(event);
    this.cacheVersion = -1; // Invalidate cache

    // Auto-emit session.completed after reflection.submitted
    if (type === "reflection.submitted") {
      const completedEvent: Event = {
        type: "session.completed",
        timestamp: this.clock(),
        data: {},
      };
      this.events.push(completedEvent);
      this.cacheVersion = -1;
    }

    // Notify listeners
    this.notifyListeners(event);

    return success(event);
  }

  getState(): SessionState {
    if (this.cacheVersion === this.events.length && this.cachedState) {
      // Still need to recalculate remainingTime since clock may have advanced
      return {
        ...this.cachedState,
        remainingTime: calculateRemainingTime(this.cachedState, this.clock()),
      };
    }
    this.cachedState = deriveState(
      this.events,
      this.preset,
      this.problem,
      this.clock
    );
    this.cacheVersion = this.events.length;
    return this.cachedState;
  }

  getEvents(): Event[] {
    return [...this.events];
  }

  subscribe(callback: EventCallback): UnsubscribeFn {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  restore(events: Event[]): void {
    this.events = [...events];
    this.cacheVersion = -1;
  }

  private notifyListeners(event: Event): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(event, state);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSession(options: CreateSessionOptions): Session {
  return new SessionImpl(options);
}
