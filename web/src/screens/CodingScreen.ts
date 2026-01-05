/**
 * CodingScreen Component
 *
 * Coding phase screen with code editor, nudges, and recording.
 * Also handles SILENT phase (shows banner, disables nudges).
 */

import { div, Show, span, useActions, useStore } from "../framework";
import {
  Button,
  CodeEditor,
  ConfirmButton,
  NudgeButton,
  PauseButton,
  PhaseHeader,
  ProblemCard,
  RecordingIndicator,
} from "../components";
import { AppStore, PhaseEnum } from "../store";

// ============================================================================
// Component
// ============================================================================

export function CodingScreen(): HTMLElement {
  const state = useStore(AppStore);
  const actions = useActions(AppStore);

  const isSilentPhase = () => state.phase() === PhaseEnum.Silent;

  const handleCodeChange = (value: string) => {
    actions.updateCode(value);
  };

  const handleRequestNudge = async () => {
    await actions.requestNudge();
  };

  const handleSubmitSolution = async () => {
    await actions.submitSolution();
  };

  const handleAbandon = async () => {
    await actions.abandonSession();
  };

  const handlePause = () => {
    actions.pauseSession();
  };

  const handleResume = () => {
    actions.resumeFromPause();
  };

  // Determine current phase name for header
  const currentPhase = () => (isSilentPhase() ? "silent" : "coding");

  // Note: Audio recording lifecycle is managed by the store
  // - startRecording() called in startCoding() and _loadSession()
  // - stopRecording() called in submitSolution(), handlePhaseExpiry(), abandonSession()
  // - pauseSession()/resumeFromPause() handle pause/resume recording

  return div({ class: "screen coding-screen", id: "coding-screen" }, [
    // Header with timer and pause button
    PhaseHeader({
      phase: currentPhase,
      remainingMs: state.remainingMs,
      isPaused: state.isPaused,
      actions: [
        PauseButton({
          isPaused: state.isPaused,
          onPause: handlePause,
          onResume: handleResume,
        }),
        Button({
          label: "Submit Solution",
          variant: "primary",
          action: "submit-solution",
          onClick: handleSubmitSolution,
        }),
      ],
    }),

    // Silent phase banner
    Show(isSilentPhase, () =>
      div({ class: "silent-banner" }, [
        span({ class: "silent-banner__icon" }, ["🤫"]),
        span({ class: "silent-banner__text" }, ["Silent Phase - No assistance available"]),
      ]),
    ),

    // Paused banner (non-blocking)
    Show(
      () => state.isPaused(),
      () =>
        div({ class: "paused-overlay" }, [
          span({ class: "paused-overlay__icon" }, ["⏸"]),
          span({ class: "paused-overlay__text" }, ["Session Paused"]),
          Button({
            label: "Resume",
            variant: "primary",
            size: "small",
            onClick: handleResume,
          }),
        ]),
    ),

    // Main content
    div({ class: "screen-content" }, [
      // Problem display (collapsible in coding)
      Show(
        () => state.problem() !== null,
        () => ProblemCard({ problem: state.problem()!, collapsible: true }),
      ),

      // Coding area
      div({ class: "coding-area" }, [
        // Invariants reference (read-only, collapsed)
        Show(
          () => state.invariants().length > 0,
          () =>
            div({ class: "invariants-reference" }, [
              span({ class: "invariants-reference__label" }, ["Your invariants:"]),
              span({ class: "invariants-reference__text" }, [state.invariants]),
            ]),
        ),

        // Code editor
        CodeEditor({
          value: state.code,
          onChange: handleCodeChange,
        }),
      ]),

      // Actions row
      div({ class: "coding-actions" }, [
        // Nudge button (disabled in silent phase)
        Show(
          () => !isSilentPhase() && !state.isPaused(),
          () =>
            NudgeButton({
              nudgesUsed: state.nudgesUsed,
              nudgesAllowed: state.nudgesAllowed,
              onClick: handleRequestNudge,
            }),
        ),

        // Recording indicator (when recording and not paused)
        Show(
          () => state.isRecording() && !state.isPaused(),
          () =>
            RecordingIndicator({
              isRecording: state.isRecording,
            }),
        ),

        // Show inactive recording when paused
        Show(
          () => state.audioSupported() && state.isPaused(),
          () =>
            RecordingIndicator({
              isRecording: () => false,
            }),
        ),
      ]),
    ]),

    // Footer with abandon option
    div({ class: "screen-footer" }, [
      ConfirmButton({
        label: "Abandon Session",
        confirmLabel: "Confirm Abandon?",
        variant: "danger",
        action: "abandon-session",
        onConfirm: handleAbandon,
      }),
    ]),
  ]);
}
