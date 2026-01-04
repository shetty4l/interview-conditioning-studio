/**
 * PrepScreen Component
 *
 * Preparation phase screen where users read the problem and note invariants.
 */

import { div, useStore, useActions, Show } from "../framework";
import { PhaseHeader, ProblemCard, InvariantsInput, Button, ConfirmButton } from "../components";
import { AppStore } from "../store";

// ============================================================================
// Component
// ============================================================================

export function PrepScreen(): HTMLElement {
  const state = useStore(AppStore);
  const actions = useActions(AppStore);

  const handleInvariantsChange = (value: string) => {
    actions.updateInvariants(value);
  };

  const handleStartCoding = async () => {
    await actions.startCoding();
  };

  const handleAbandon = async () => {
    await actions.abandonSession();
  };

  return div({ class: "screen prep-screen", id: "prep-screen" }, [
    // Header with timer and action
    PhaseHeader({
      phase: "prep",
      remainingMs: state.remainingMs,
      actions: [
        Button({
          label: "Start Coding",
          variant: "primary",
          action: "start-coding",
          className: "start-coding-button",
          onClick: handleStartCoding,
        }),
      ],
    }),

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
