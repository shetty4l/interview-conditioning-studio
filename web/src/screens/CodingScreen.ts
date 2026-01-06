/**
 * CodingScreen Component
 *
 * Coding phase screen with two-column layout:
 * - Left (~60%): Code editor
 * - Right (~40%): Collapsible Problem, Collapsible Invariants, Nudge button
 *
 * Header: Phase badge, Timer, Pause, Submit Solution
 * Footer: REC indicator (left), Abandon Session (right)
 *
 * Also handles SILENT phase (shows banner, disables nudges).
 */

import { div, Show, span, useActions, useRouter, useStore } from "../framework";
import {
  Button,
  CodeEditor,
  CollapsibleSection,
  ConfirmButton,
  NudgeButton,
  PauseButton,
  PhaseHeader,
  RecordingIndicator,
} from "../components";
import { AppStore, PhaseEnum } from "../store";

// ============================================================================
// Component
// ============================================================================

export function CodingScreen(): HTMLElement {
  const state = useStore(AppStore);
  const actions = useActions(AppStore);
  const router = useRouter();

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
    router.navigate("/");
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

  return div(
    {
      class: () => `screen coding-screen${isSilentPhase() ? " coding-screen--silent" : ""}`,
      id: "coding-screen",
    },
    [
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

      // Two-column main content
      div({ class: "coding-layout" }, [
        // Left column: Code editor
        div({ class: "coding-layout__editor" }, [
          CodeEditor({
            value: state.code,
            onChange: handleCodeChange,
          }),
        ]),

        // Right column: Problem, Invariants, Nudge
        div({ class: "coding-layout__sidebar" }, [
          // Problem (collapsible)
          Show(
            () => state.problem() !== null,
            () =>
              CollapsibleSection({
                title: `Problem: ${state.problem()!.title}`,
                children: div({ class: "problem-description" }, [state.problem()!.description]),
                defaultCollapsed: false,
                variant: "compact",
              }),
          ),

          // Invariants (collapsible)
          Show(
            () => state.invariants().length > 0,
            () =>
              CollapsibleSection({
                title: "Your Invariants",
                children: state.invariants(),
                defaultCollapsed: false,
                variant: "compact",
              }),
          ),

          // Nudge button (disabled in silent phase)
          Show(
            () => !isSilentPhase() && !state.isPaused(),
            () =>
              div({ class: "coding-layout__nudge" }, [
                NudgeButton({
                  nudgesUsed: state.nudgesUsed,
                  nudgesAllowed: state.nudgesAllowed,
                  onClick: handleRequestNudge,
                }),
              ]),
          ),
        ]),
      ]),

      // Footer: REC indicator (left) | Abandon Session (right)
      div({ class: "coding-footer" }, [
        // Left side: Recording indicator
        div({ class: "coding-footer__left" }, [
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

        // Right side: Abandon button
        div({ class: "coding-footer__right" }, [
          ConfirmButton({
            label: "Abandon Session",
            confirmLabel: "Confirm Abandon?",
            variant: "danger",
            action: "abandon-session",
            onConfirm: handleAbandon,
          }),
        ]),
      ]),
    ],
  );
}
