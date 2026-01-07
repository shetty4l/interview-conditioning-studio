/**
 * ViewScreen Component
 *
 * Read-only view of a completed session.
 * Displays problem info, code, and invariants.
 *
 * Note: Audio is NOT available here - it's deleted when leaving DoneScreen
 * to save storage space. Export is available but excludes audio.
 */

import {
  useRoute,
  useRouter,
  div,
  h1,
  h2,
  p,
  span,
  pre,
  onMount,
  signal,
  Show,
} from "../framework";
import { AppHeader, Button, showToast } from "../components";
import { getSession } from "../storage";
import { exportSession } from "../export";
import type { StoredSession } from "../types";

// ============================================================================
// Utilities
// ============================================================================

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isSessionCompleted(session: StoredSession): boolean {
  return session.events.some((e) => e.type === "reflection.submitted");
}

function extractSessionData(session: StoredSession): { code: string; invariants: string } {
  let code = "";
  let invariants = "";

  for (const event of session.events) {
    if (event.type === "coding.code_changed" && event.data && "code" in event.data) {
      code = (event.data as { code: string }).code;
    }
    if (event.type === "prep.invariants_changed" && event.data && "invariants" in event.data) {
      invariants = (event.data as { invariants: string }).invariants;
    }
  }

  return { code, invariants };
}

function getDifficultyClass(difficulty: string): string {
  switch (difficulty) {
    case "easy":
      return "badge--success";
    case "medium":
      return "badge--warning";
    case "hard":
      return "badge--danger";
    default:
      return "";
  }
}

// ============================================================================
// Component
// ============================================================================

export function ViewScreen(): HTMLElement {
  const { params } = useRoute();
  const router = useRouter();
  const sessionId = params.id;

  // Local state
  const [session, setSession] = signal<StoredSession | null>(null);
  const [loading, setLoading] = signal(true);

  // Handle missing session ID
  if (!sessionId) {
    router.navigate("/");
    return div({ class: "loading" }, ["Redirecting..."]);
  }

  // Load session on mount
  onMount(() => {
    (async () => {
      const loadedSession = await getSession(sessionId);

      if (!loadedSession) {
        showToast("Session not found", "error");
        router.navigate("/");
        return;
      }

      // Check if session is completed (if not, redirect to SessionScreen)
      // Note: Abandoned sessions are hard-deleted, so only completed or in-progress sessions exist
      if (!isSessionCompleted(loadedSession)) {
        router.navigate(`/${sessionId}`);
        return;
      }

      setSession(loadedSession);
      setLoading(false);
    })();
  });

  const handleBackToDashboard = () => {
    router.navigate("/");
  };

  const handleExport = async (currentSession: StoredSession) => {
    try {
      // Export without audio - it was deleted when leaving DoneScreen
      await exportSession(currentSession, { includeAudio: false });
    } catch (error) {
      console.error("Failed to export session:", error);
      showToast("Failed to export session", "error");
    }
  };

  // Helper to render session content
  const renderSessionContent = (currentSession: StoredSession) => {
    const { code, invariants } = extractSessionData(currentSession);

    return div({ class: "view-screen__content" }, [
      // Header
      div({ class: "view-screen__header" }, [
        h1({ class: "view-screen__title" }, [currentSession.problem.title]),
        div({ class: "view-screen__meta" }, [
          span({ class: `badge ${getDifficultyClass(currentSession.problem.difficulty)}` }, [
            currentSession.problem.difficulty,
          ]),
          span({ class: "view-screen__patterns" }, [currentSession.problem.patterns.join(", ")]),
          span({ class: "view-screen__date" }, [formatDate(currentSession.createdAt)]),
          span({ class: "badge badge--success" }, ["Completed"]),
        ]),
      ]),

      // Problem Description
      div({ class: "view-screen__section" }, [
        h2({}, ["Problem"]),
        p({ class: "view-screen__description" }, [currentSession.problem.description]),
      ]),

      // Code
      div({ class: "view-screen__section" }, [
        h2({}, ["Code"]),
        code
          ? pre({ class: "view-screen__code" }, [code])
          : p({ class: "view-screen__empty" }, ["No code written"]),
      ]),

      // Invariants
      div({ class: "view-screen__section" }, [
        h2({}, ["Invariants"]),
        invariants
          ? pre({ class: "view-screen__invariants" }, [invariants])
          : p({ class: "view-screen__empty" }, ["No invariants written"]),
      ]),

      // Actions
      div({ class: "view-screen__actions" }, [
        Button({
          label: "Export Session",
          variant: "secondary",
          onClick: () => handleExport(currentSession),
        }),
        Button({
          label: "Back to Dashboard",
          variant: "primary",
          onClick: handleBackToDashboard,
        }),
      ]),
    ]);
  };

  // Use Show for reactive conditional rendering
  return div({ class: "screen view-screen" }, [
    AppHeader(),
    Show(
      loading,
      () => div({ class: "loading" }, ["Loading session..."]),
      () =>
        Show(
          () => session() !== null,
          () => renderSessionContent(session()!),
          () => div({ class: "error" }, ["Session not found"]),
        ),
    ),
  ]);
}
