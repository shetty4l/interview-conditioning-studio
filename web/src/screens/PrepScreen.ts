/**
 * PrepScreen Component
 *
 * Preparation phase screen with two-column layout:
 * - Left (~60%): Invariants textarea (primary focus)
 * - Right (~40%): Problem display
 *
 * Header: Phase badge, Timer, Pause, Start Coding
 * Footer: Abandon Session (right-aligned)
 */

import { div, Show, span, useActions, useRouter, useStore } from "../framework";
import {
  Button,
  CollapsibleSection,
  ConfirmButton,
  InvariantsInput,
  PauseButton,
  PhaseHeader,
} from "../components";
import { AppStore } from "../store";

// ============================================================================
// Component
// ============================================================================

export function PrepScreen(): HTMLElement {
  const state = useStore(AppStore);
  const actions = useActions(AppStore);
  const router = useRouter();

  const handleInvariantsChange = (value: string) => {
    actions.updateInvariants(value);
  };

  const handleStartCoding = async () => {
    await actions.startCoding();
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

  return div({ class: "screen prep-screen", id: "prep-screen" }, [
    // Header with timer and action
    PhaseHeader({
      phase: "prep",
      remainingMs: state.remainingMs,
      isPaused: state.isPaused,
      actions: [
        PauseButton({
          isPaused: state.isPaused,
          onPause: handlePause,
          onResume: handleResume,
        }),
        Button({
          label: "Start Coding",
          variant: "primary",
          action: "start-coding",
          className: "start-coding-button",
          onClick: handleStartCoding,
        }),
      ],
    }),

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
    div({ class: "prep-layout" }, [
      // Left column: Invariants textarea (primary focus)
      div({ class: "prep-layout__main" }, [
        InvariantsInput({
          value: state.invariants,
          onChange: handleInvariantsChange,
        }),
      ]),

      // Right column: Problem display
      div({ class: "prep-layout__sidebar" }, [
        Show(
          () => state.problem() !== null,
          () =>
            CollapsibleSection({
              title: `Problem: ${state.problem()!.title}`,
              children: div({ class: "problem-description" }, [state.problem()!.description]),
              defaultCollapsed: false,
            }),
        ),
      ]),
    ]),

    // Footer with abandon option (right-aligned)
    div({ class: "prep-footer" }, [
      div({ class: "prep-footer__spacer" }, []),
      div({ class: "prep-footer__right" }, [
        ConfirmButton({
          label: "Abandon Session",
          confirmLabel: "Confirm Abandon?",
          variant: "danger",
          action: "abandon-session",
          onConfirm: handleAbandon,
        }),
      ]),
    ]),
  ]);
}
