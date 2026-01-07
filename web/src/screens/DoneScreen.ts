/**
 * DoneScreen Component
 *
 * Final screen with export and new session options.
 * Audio is deleted when navigating away from this screen.
 */

import { div, h1, p, useActions, useRouter, useStore, onCleanup } from "../framework";
import { Button, PhaseHeader, showToast } from "../components";
import { AppStore } from "../store";
import { deleteAudio } from "../storage";

// ============================================================================
// Component
// ============================================================================

export function DoneScreen(): HTMLElement {
  const state = useStore(AppStore);
  const actions = useActions(AppStore);
  const { navigate } = useRouter();

  // Delete audio when navigating away from this screen.
  // Users must export before leaving if they want to keep the audio.
  onCleanup(() => {
    const sessionId = state.sessionId();
    if (sessionId) {
      // Fire and forget - we don't need to wait for deletion
      deleteAudio(sessionId);
    }
  });

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
