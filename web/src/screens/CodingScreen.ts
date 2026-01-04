/**
 * CodingScreen Component
 *
 * Coding phase screen with code editor, nudges, and recording.
 * Also handles SILENT phase (shows banner, disables nudges).
 */

import { div, span, useStore, useActions, Show } from "../framework";
import {
  PhaseHeader,
  ProblemCard,
  CodeEditor,
  NudgeButton,
  Button,
  ConfirmButton,
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

  const handleStartRecording = async () => {
    await actions.startRecording();
  };

  const handleStopRecording = async () => {
    await actions.stopRecording();
  };

  // Determine current phase name for header
  const currentPhase = () => (isSilentPhase() ? "silent" : "coding");

  return div({ class: "screen coding-screen", id: "coding-screen" }, [
    // Header with timer
    PhaseHeader({
      phase: currentPhase,
      remainingMs: state.remainingMs,
      actions: [
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
          () => !isSilentPhase(),
          () =>
            NudgeButton({
              nudgesUsed: state.nudgesUsed,
              nudgesAllowed: state.nudgesAllowed,
              onClick: handleRequestNudge,
            }),
        ),

        // Recording button (when audio supported)
        Show(
          () => state.audioSupported() && !state.isRecording(),
          () =>
            Button({
              label: "Start Recording",
              variant: "secondary",
              action: "start-recording",
              onClick: handleStartRecording,
            }),
        ),

        // Stop recording button (when recording)
        Show(
          () => state.audioSupported() && state.isRecording(),
          () =>
            Button({
              label: "Stop Recording",
              variant: "danger",
              action: "stop-recording",
              onClick: handleStopRecording,
            }),
        ),

        // Recording indicator
        Show(
          () => state.isRecording(),
          () =>
            RecordingIndicator({
              isRecording: state.isRecording,
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
