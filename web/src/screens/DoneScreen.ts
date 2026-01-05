/**
 * DoneScreen Component
 *
 * Final screen with export and new session options.
 */

import { div, h1, p, useActions, useRouter, useStore } from "../framework";
import { Button, PhaseHeader, showToast } from "../components";
import { AppStore } from "../store";

// ============================================================================
// Component
// ============================================================================

export function DoneScreen(): HTMLElement {
  const state = useStore(AppStore);
  const actions = useActions(AppStore);
  const { navigate } = useRouter();

  const handleExport = async () => {
    try {
      await actions.exportSession();
      showToast("Session exported successfully", "success");
    } catch {
      showToast("Export failed", "error");
    }
  };

  const handleNewSession = () => {
    actions.resetApp();
    navigate("/new");
  };

  return div({ class: "screen done-screen", id: "done-screen" }, [
    // Header with frozen timer
    PhaseHeader({
      phase: "done",
      remainingMs: state.remainingMs,
    }),

    // Main content
    div({ class: "screen-content done-content" }, [
      div({ class: "done-message" }, [
        h1({}, ["Session Complete!"]),
        p({}, ["Great work! You've completed your practice session."]),
        p({ class: "problem-name" }, [() => `Problem: ${state.problem()?.title || "Unknown"}`]),
      ]),

      // Actions
      div({ class: "done-actions" }, [
        Button({
          label: "Export Session",
          variant: "primary",
          size: "large",
          action: "export-session",
          onClick: handleExport,
        }),
        Button({
          label: "Start New Session",
          variant: "secondary",
          size: "large",
          action: "new-session",
          onClick: handleNewSession,
        }),
      ]),
    ]),
  ]);
}
