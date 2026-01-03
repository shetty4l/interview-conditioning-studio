/**
 * Web Application Types
 *
 * Type definitions for the web layer including screens, components, and app state.
 */

import type { Session, SessionState, Preset, Phase, Event } from "../../core/src/index";
import type { Problem } from "./problems";

// ============================================================================
// App State
// ============================================================================

export type ScreenName = "home" | "prep" | "coding" | "silent" | "summary" | "reflection" | "done";

export interface AppState {
  /** Current screen being displayed */
  screen: ScreenName;

  /** Selected preset (before session starts) */
  selectedPreset: Preset;

  /** Active session (null before started) */
  session: Session | null;

  /** Derived session state (null before started) */
  sessionState: SessionState | null;

  /** Current problem (null before session starts) */
  problem: Problem | null;

  /** Session ID (null before session starts) */
  sessionId: string | null;

  /** Whether audio recording is supported */
  audioSupported: boolean;

  /** Whether audio permission was denied */
  audioPermissionDenied: boolean;

  /** Incomplete session info (for resume banner) */
  incompleteSession: {
    id: string;
    problemTitle: string;
    phase: string;
  } | null;
}

// ============================================================================
// Screen Interface
// ============================================================================

/**
 * Context provided to screens for interacting with the app.
 */
export interface ScreenContext {
  /** Current app state */
  state: AppState;

  /** Active session (may be null) */
  session: Session | null;

  /** Navigate to a new URL hash */
  navigate: (path: string) => void;

  /** Show a toast notification */
  showToast: (message: string, type?: ToastType) => void;

  /** Show a modal dialog */
  showModal: (config: ModalConfig) => void;

  /** Hide the current modal */
  hideModal: () => void;

  /** Dispatch an action to the app controller */
  dispatch: AppDispatch;
}

/**
 * Screen module interface.
 * Each screen must implement these lifecycle methods.
 */
export interface Screen {
  /**
   * Render the screen HTML.
   * Called whenever the screen needs to be (re)rendered.
   */
  render(state: AppState): string;

  /**
   * Mount the screen - attach event listeners.
   * Called after render() when the screen becomes active.
   */
  mount(ctx: ScreenContext): void;

  /**
   * Unmount the screen - cleanup event listeners.
   * Called before switching to a different screen.
   */
  unmount(): void;

  /**
   * Optional: Targeted update without full re-render.
   * Called on timer tick or other frequent updates.
   * Return true if the update was handled, false to trigger full re-render.
   */
  update?(state: AppState): boolean;
}

// ============================================================================
// Toast
// ============================================================================

export type ToastType = "info" | "error" | "success";

export interface ToastConfig {
  message: string;
  type: ToastType;
  duration?: number; // milliseconds, default 3000
}

// ============================================================================
// Modal
// ============================================================================

export type ModalType = "confirm" | "resume";

export interface ModalConfig {
  type: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

// ============================================================================
// App Actions
// ============================================================================

/**
 * Actions that can be dispatched to the app controller.
 */
export type AppAction =
  // Home
  | { type: "SELECT_PRESET"; preset: Preset }
  | { type: "START_SESSION" }

  // Prep
  | { type: "UPDATE_INVARIANTS"; invariants: string }
  | { type: "START_CODING" }

  // Coding
  | { type: "UPDATE_CODE"; code: string }
  | { type: "REQUEST_NUDGE" }
  | { type: "SUBMIT_SOLUTION" }

  // Silent
  | { type: "END_SILENT" }

  // Summary
  | { type: "CONTINUE_TO_REFLECTION" }

  // Reflection
  | { type: "SUBMIT_REFLECTION"; responses: ReflectionFormData }

  // Done
  | { type: "EXPORT_SESSION" }
  | { type: "NEW_SESSION" }

  // Session management
  | { type: "ABANDON_SESSION" }
  | { type: "RESUME_SESSION" }

  // Audio
  | { type: "AUDIO_STARTED" }
  | { type: "AUDIO_STOPPED" }
  | { type: "AUDIO_PERMISSION_DENIED" };

export type AppDispatch = (action: AppAction) => void;

// ============================================================================
// Reflection Form
// ============================================================================

export interface ReflectionFormData {
  clearApproach: "yes" | "partially" | "no";
  prolongedStall: "yes" | "no";
  recoveredFromStall: "yes" | "partially" | "no" | "n/a";
  timePressure: "comfortable" | "manageable" | "overwhelming";
  wouldChangeApproach: "yes" | "no";
}

// ============================================================================
// Route
// ============================================================================

export type Route =
  | { type: "home" }
  | { type: "session"; sessionId: string; phase: Phase }
  | { type: "not_found" };

// ============================================================================
// Storage
// ============================================================================

export interface StoredSession {
  id: string;
  events: Event[];
  problem: Problem;
  preset: Preset;
  createdAt: number;
  updatedAt: number;
}

export interface StoredAudio {
  sessionId: string;
  chunks: Blob[];
  mimeType: string;
}
