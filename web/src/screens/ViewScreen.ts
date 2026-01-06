/**
 * ViewScreen Component
 *
 * Read-only view of a completed session.
 * Displays problem info, code, invariants, audio playback, and export option.
 */

import { useRoute, useRouter, div, h1, h2, p, span, pre, onMount, signal, button } from "../framework";
import { AppHeader, Button, showToast } from "../components";
import { getSession, getAudioBlob, getAudioMimeType } from "../storage";
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

function getSessionStatus(session: StoredSession): "completed" | "abandoned" | "in_progress" {
  const hasReflection = session.events.some((e) => e.type === "reflection.submitted");
  if (hasReflection) return "completed";

  const hasAbandon = session.events.some((e) => e.type === "session.abandoned");
  if (hasAbandon) return "abandoned";

  return "in_progress";
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
  const [audioUrl, setAudioUrl] = signal<string | null>(null);
  const [audioLoading, setAudioLoading] = signal(false);
  const [hasAudio, setHasAudio] = signal(false);

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

      // Check if session is in progress (should use SessionScreen instead)
      const status = getSessionStatus(loadedSession);
      if (status === "in_progress") {
        router.navigate(`/${sessionId}`);
        return;
      }

      setSession(loadedSession);

      // Check if audio exists (don't load yet)
      const audioBlob = await getAudioBlob(sessionId);
      setHasAudio(audioBlob !== null);

      setLoading(false);
    })();

    // Cleanup audio URL on unmount
    return () => {
      const url = audioUrl();
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  });

  const handleLoadAudio = async () => {
    if (audioLoading() || audioUrl()) return;

    setAudioLoading(true);
    try {
      const blob = await getAudioBlob(sessionId);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      }
    } catch (error) {
      console.error("Failed to load audio:", error);
      showToast("Failed to load audio", "error");
    } finally {
      setAudioLoading(false);
    }
  };

  const handleExport = async () => {
    const currentSession = session();
    if (!currentSession) return;

    try {
      await exportSession(currentSession);
      showToast("Session exported", "success");
    } catch (error) {
      console.error("Failed to export session:", error);
      showToast("Failed to export session", "error");
    }
  };

  const handleBackToDashboard = () => {
    router.navigate("/");
  };

  // Loading state
  if (loading()) {
    return div({ class: "screen view-screen" }, [
      AppHeader(),
      div({ class: "loading" }, ["Loading session..."]),
    ]);
  }

  const currentSession = session();
  if (!currentSession) {
    return div({ class: "screen view-screen" }, [
      AppHeader(),
      div({ class: "error" }, ["Session not found"]),
    ]);
  }

  const { code, invariants } = extractSessionData(currentSession);
  const status = getSessionStatus(currentSession);

  return div({ class: "screen view-screen" }, [
    AppHeader(),

    // Header
    div({ class: "view-screen__header" }, [
      h1({ class: "view-screen__title" }, [currentSession.problem.title]),
      div({ class: "view-screen__meta" }, [
        span(
          { class: `badge ${getDifficultyClass(currentSession.problem.difficulty)}` },
          [currentSession.problem.difficulty],
        ),
        span({ class: "view-screen__patterns" }, [
          currentSession.problem.patterns.join(", "),
        ]),
        span({ class: "view-screen__date" }, [formatDate(currentSession.createdAt)]),
        span({ class: `badge badge--${status === "completed" ? "success" : "muted"}` }, [
          status === "completed" ? "Completed" : "Abandoned",
        ]),
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

    // Audio
    hasAudio()
      ? div({ class: "view-screen__section" }, [
          h2({}, ["Audio Recording"]),
          audioUrl()
            ? div({ class: "view-screen__audio" }, [
                (() => {
                  const audio = document.createElement("audio");
                  audio.controls = true;
                  audio.src = audioUrl() || "";
                  audio.className = "view-screen__audio-player";
                  return audio;
                })(),
              ])
            : div({ class: "view-screen__audio-load" }, [
                button(
                  {
                    class: "btn btn--secondary",
                    onClick: handleLoadAudio,
                    disabled: audioLoading,
                  },
                  [audioLoading() ? "Loading..." : "Load Audio"],
                ),
              ]),
        ])
      : null,

    // Actions
    div({ class: "view-screen__actions" }, [
      Button({
        label: "Export Session",
        variant: "primary",
        onClick: handleExport,
      }),
      Button({
        label: "Back to Dashboard",
        variant: "secondary",
        onClick: handleBackToDashboard,
      }),
    ]),
  ].filter(Boolean) as HTMLElement[]);
}
