/**
 * PrepScreen Component
 *
 * Preparation phase screen where users read the problem and note invariants.
 */

import { div, span, useStore, useActions, useRouter, Show } from "../framework";
import {
  PhaseHeader,
  ProblemCard,
  InvariantsInput,
  Button,
  ConfirmButton,
  PauseButton,
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

    // Main content
    div({ class: "screen-content" }, [
      // Problem display
      Show(
        () => state.problem() !== null,
        () => ProblemCard({ problem: state.problem()! }),
      ),

      // Invariants input
      InvariantsInput({
        value: state.invariants,
        onChange: handleInvariantsChange,
      }),
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
