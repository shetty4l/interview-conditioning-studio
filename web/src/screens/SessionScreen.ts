/**
 * SessionScreen Component
 *
 * Container screen that loads a session by ID from URL params and renders
 * the appropriate phase screen based on store state.
 */

import { useRoute, useRouter, useStore, Show, Switch, div, onMount } from "../framework";
import { showToast } from "../components";
import { AppStore } from "../store";
import { createStorage } from "../storage";
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

  // Load session on mount if needed, or verify it still exists
  onMount(() => {
    (async () => {
      const currentSessionId = state.sessionId();

      if (currentSessionId !== sessionId) {
        // Session ID is different, try to load from storage
        const loaded = await AppStore.getActions()._loadSession(sessionId);
        if (!loaded) {
          showToast("Session not found", "error");
          router.navigate("/");
        }
      } else {
        // Session ID matches, but verify it still exists in storage
        // (could have been soft-deleted while in memory)
        const storage = createStorage();
        await storage.init();
        const exists = await storage.getSession(sessionId);
        if (!exists) {
          showToast("Session not found", "error");
          router.navigate("/");
        }
      }
    })();
  });

  // Reactive rendering based on store state
  // DEBUG: Log when sessionId comparison changes
  const sessionIdMatches = () => {
    const storeSessionId = state.sessionId();
    const matches = storeSessionId === sessionId;
    if (!matches) {
      console.warn(`[SessionScreen] sessionId mismatch: store=${storeSessionId}, url=${sessionId}`);
    }
    return matches;
  };

  return Show(
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
  );
}
