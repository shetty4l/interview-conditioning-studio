/**
 * UI Constants
 *
 * Centralized constants for actions, components, and selectors.
 * Prevents string typos and separates JS hooks from CSS styling.
 */

// ============================================================================
// Actions
// ============================================================================

/**
 * Data-action attribute values for interactive elements.
 * Used with sel.action() to query elements.
 */
export const ACTIONS = {
  // Home screen
  SELECT_PRESET: "select-preset",
  START_SESSION: "start-session",

  // Prep screen
  START_CODING: "start-coding",

  // Coding screen
  REQUEST_NUDGE: "request-nudge",
  SUBMIT_SOLUTION: "submit-solution",

  // Silent screen (no unique actions)

  // Summary screen
  CONTINUE_TO_REFLECTION: "continue-to-reflection",

  // Reflection screen
  SUBMIT_REFLECTION: "submit-reflection",

  // Done screen
  EXPORT_SESSION: "export-session",
  NEW_SESSION: "new-session",

  // Modals
  CONFIRM_YES: "confirm-yes",
  CONFIRM_NO: "confirm-no",
  RESUME_SESSION: "resume-session",
  DISCARD_SESSION: "discard-session",
  ABANDON_SESSION: "abandon-session",
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

// ============================================================================
// Components
// ============================================================================

/**
 * Data-component attribute values for component root elements.
 * Used with sel.component() to query component roots.
 */
export const COMPONENTS = {
  // Layout
  TOAST_CONTAINER: "toast-container",
  MODAL_CONTAINER: "modal-container",

  // Reusable components
  TIMER: "timer",
  TIMER_DISPLAY: "timer-display",
  PHASE_HEADER: "phase-header",
  PHASE_BADGE: "phase-badge",
  PROBLEM_CARD: "problem-card",
  CODE_EDITOR: "code-editor",
  INVARIANTS_INPUT: "invariants-input",
  INVARIANTS_DISPLAY: "invariants-display",
  NUDGE_BUTTON: "nudge-button",
  RECORDING_INDICATOR: "recording-indicator",
  PRESET_CARD: "preset-card",

  // Screens
  SCREEN_HOME: "screen-home",
  SCREEN_PREP: "screen-prep",
  SCREEN_CODING: "screen-coding",
  SCREEN_SILENT: "screen-silent",
  SCREEN_SUMMARY: "screen-summary",
  SCREEN_REFLECTION: "screen-reflection",
  SCREEN_DONE: "screen-done",
} as const;

export type Component = (typeof COMPONENTS)[keyof typeof COMPONENTS];

// ============================================================================
// Selectors
// ============================================================================

/**
 * Helper functions to generate CSS selectors for querying elements.
 */
export const sel = {
  /**
   * Select element by data-action attribute.
   * @example sel.action(ACTIONS.START_SESSION) → '[data-action="start-session"]'
   */
  action: (name: Action): string => `[data-action="${name}"]`,

  /**
   * Select element by data-component attribute.
   * @example sel.component(COMPONENTS.TIMER) → '[data-component="timer"]'
   */
  component: (name: Component): string => `[data-component="${name}"]`,

  /**
   * Select element by ID.
   * @example sel.id('app') → '#app'
   */
  id: (name: string): string => `#${name}`,
} as const;

// ============================================================================
// CSS Classes
// ============================================================================

/**
 * CSS class names used for styling.
 * These are separate from data-attributes to keep styling and behavior decoupled.
 */
export const CLASSES = {
  // State classes
  SELECTED: "selected",
  DISABLED: "disabled",
  LOADING: "loading",
  HIDDEN: "hidden",
  OVERTIME: "overtime",

  // Phase classes
  PHASE_PREP: "phase-prep",
  PHASE_CODING: "phase-coding",
  PHASE_SILENT: "phase-silent",
  PHASE_SUMMARY: "phase-summary",
  PHASE_REFLECTION: "phase-reflection",
  PHASE_DONE: "phase-done",

  // Button variants
  BTN_PRIMARY: "btn-primary",
  BTN_SECONDARY: "btn-secondary",
  BTN_DANGER: "btn-danger",
  BTN_LARGE: "btn-large",

  // Toast types
  TOAST_INFO: "toast-info",
  TOAST_ERROR: "toast-error",
  TOAST_SUCCESS: "toast-success",
} as const;

export type CssClass = (typeof CLASSES)[keyof typeof CLASSES];

// ============================================================================
// Element IDs
// ============================================================================

/**
 * IDs for key DOM elements.
 */
export const IDS = {
  APP: "app",
  MODAL_ROOT: "modal-root",
} as const;
