/**
 * Core Type Definitions
 *
 * All shared types for the Interview Conditioning Studio core engine.
 */

// ============================================================================
// Enums
// ============================================================================

export enum Phase {
  Start = "START",
  Prep = "PREP",
  Coding = "CODING",
  Silent = "SILENT",
  Summary = "SUMMARY",
  Reflection = "REFLECTION",
  Done = "DONE",
}

export enum Preset {
  Standard = "standard",
  HighPressure = "high_pressure",
  NoAssistance = "no_assistance",
}

export type SessionStatus = "in_progress" | "completed" | "abandoned_explicit";

// ============================================================================
// Problem
// ============================================================================

export interface Problem {
  id: string;
  title: string;
  description: string;
}

// ============================================================================
// Preset Configuration
// ============================================================================

export interface PresetConfig {
  prepDuration: number; // milliseconds
  codingDuration: number;
  silentDuration: number;
  nudgeBudget: number;
}

// ============================================================================
// Events
// ============================================================================

export type EventType =
  | "session.started"
  | "prep.invariants_changed"
  | "prep.time_expired"
  | "coding.started"
  | "coding.code_changed"
  | "nudge.requested"
  | "coding.silent_started"
  | "coding.solution_submitted"
  | "silent.ended"
  | "summary.continued"
  | "reflection.submitted"
  | "session.completed"
  | "session.abandoned"
  | "audio.started"
  | "audio.stopped"
  | "audio.permission_denied";

export interface Event {
  type: EventType;
  timestamp: number;
  data: EventData;
}

// Event data payloads
export interface SessionStartedData {
  sessionId: string;
  problem?: Problem;
  preset?: Preset;
}

export interface InvariantsChangedData {
  invariants: string;
}

export interface CodeChangedData {
  code: string;
}

export interface ReflectionResponses {
  clearApproach: "yes" | "partially" | "no";
  prolongedStall: "yes" | "no";
  recoveredFromStall: "yes" | "partially" | "no" | "n/a";
  timePressure: "comfortable" | "manageable" | "overwhelming";
  wouldChangeApproach: "yes" | "no";
}

export interface ReflectionSubmittedData {
  responses: ReflectionResponses;
}

export type EventData =
  | SessionStartedData
  | InvariantsChangedData
  | CodeChangedData
  | ReflectionSubmittedData
  | Record<string, never>; // empty object for events with no data

// ============================================================================
// Result Type (Effect-TS Style)
// ============================================================================

export type DispatchErrorCode =
  | "INVALID_TRANSITION"
  | "INVALID_PHASE"
  | "SESSION_TERMINATED"
  | "INVALID_EVENT"
  | "INVALID_EVENT_TYPE"
  | "INVALID_PAYLOAD"
  | "VALIDATION_FAILED"
  | "NUDGE_BUDGET_EXHAUSTED"
  | "NUDGES_DISABLED_IN_PHASE";

export interface DispatchError {
  code: DispatchErrorCode;
  message: string;
}

export type DispatchResult = { ok: true; value: Event } | { ok: false; error: DispatchError };

// ============================================================================
// Derived State
// ============================================================================

export interface SessionState {
  id: string | undefined;
  phase: Phase | undefined;
  status: SessionStatus;
  problem: Problem | null;
  preset: Preset;
  config: PresetConfig;
  invariants: string;
  code: string;
  nudgesRemaining: number;
  nudgesUsed: number;
  nudgesAllowed: boolean;
  isRecording: boolean;
  remainingTime: number;
  prepTimeUsed: number | undefined;
  prepTimeExpired: boolean;
  reflection: ReflectionSubmittedData | undefined;
  // Phase timestamps (for time calculations)
  sessionStartedAt: number | null;
  prepStartedAt: number | null;
  codingStartedAt: number | null;
  silentStartedAt: number | null;
}

// ============================================================================
// Session Options
// ============================================================================

export interface CreateSessionOptions {
  preset?: Preset;
  problem: Problem;
  clock?: () => number; // Dependency injection for testing
}

// ============================================================================
// Session Interface
// ============================================================================

export type EventCallback = (event: Event, state: SessionState) => void;
export type UnsubscribeFn = () => void;

export interface Session {
  dispatch(type: EventType, data?: Partial<EventData>): DispatchResult;
  getState(): SessionState;
  getEvents(): Event[];
  subscribe(callback: EventCallback): UnsubscribeFn;
  restore(events: Event[]): void;
}
