/**
 * SessionScreen Component
 *
 * Container screen that loads a session by ID from URL params and renders
 * the appropriate phase screen based on store state.
 */

import { useRoute, useRouter, useStore, Show, Switch, div, onMount } from "../framework";
import { AppHeader, showToast } from "../components";
import { AppStore } from "../store";
import { PrepScreen } from "./PrepScreen";
import { CodingScreen } from "./CodingScreen";
import { SummaryScreen } from "./SummaryScreen";
import { ReflectionScreen } from "./ReflectionScreen";
import { DoneScreen } from "./DoneScreen";

// ============================================================================
// Component
// ============================================================================

export function SessionScreen(): HTMLElement {
  const { params } = useRoute();
  const router = useRouter();
  const state = useStore(AppStore);
  const sessionId = params.id;

  // Handle missing session ID
  if (!sessionId) {
    router.navigate("/");
    return div({ class: "loading" }, ["Redirecting..."]);
  }

  // Load session on mount - always go through _loadSession() to ensure
  // consistent storage access (fixes race condition with soft-deleted sessions)
  onMount(() => {
    (async () => {
      const loaded = await AppStore.getActions()._loadSession(sessionId);
      if (!loaded) {
        showToast("Session not found", "error");
        AppStore.getActions().resetApp();
        router.navigate("/");
      }
    })();
  });

  // Reactive rendering based on store state
  const sessionIdMatches = () => state.sessionId() === sessionId;

  return div({ class: "screen session-screen" }, [
    AppHeader(),
    Show(
      sessionIdMatches,
      () =>
        Switch(
          state.screen,
          [
            { match: "prep", render: PrepScreen },
            { match: "coding", render: CodingScreen },
            { match: "silent", render: CodingScreen },
            { match: "summary", render: SummaryScreen },
            { match: "reflection", render: ReflectionScreen },
            { match: "done", render: DoneScreen },
          ],
          () => div({ class: "error" }, ["Unknown screen state"]),
        ),
      () => div({ class: "loading" }, ["Loading session..."]),
    ),
  ]);
}
