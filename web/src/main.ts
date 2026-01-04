/**
 * Interview Conditioning Studio - Main Entry Point
 *
 * Bootstraps the web application using the reactive framework.
 * Sets up router, initializes store, and exposes window.IDS API for E2E tests.
 */

import { mount, createRouter, useRoute, useRouter, useStore, Show, Switch, div, onMount } from "./framework";
import { ToastContainer, showToast } from "./components";
import { AppStore } from "./store";
import { createStorage } from "./storage";
import type { ReflectionFormData } from "./types";

// Screens
import {
  HomeScreen,
  PrepScreen,
  CodingScreen,
  SummaryScreen,
  ReflectionScreen,
  DoneScreen,
  DashboardScreen,
} from "./screens";

// ============================================================================
// Route Components
// ============================================================================

/**
 * Session route component - loads session and renders appropriate phase reactively.
 */
function SessionRoute(): HTMLElement {
  const { params } = useRoute();
  const router = useRouter();
  const state = useStore(AppStore);
  const sessionId = params.id;

  // Handle missing session ID
  if (!sessionId) {
    router.navigate("/");
    return div({ class: "loading" }, ["Redirecting..."]);
  }

  // Load session on mount if needed
  onMount(() => {
    const currentSessionId = state.sessionId();
    if (currentSessionId !== sessionId) {
      AppStore.getActions()._loadSession(sessionId).then((loaded) => {
        if (!loaded) {
          showToast("Session not found", "error");
          router.navigate("/");
        }
      });
    }
  });

  // Reactive rendering based on store state
  return Show(
    () => state.sessionId() === sessionId,
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

/**
 * View route component - read-only view of completed session.
 */
function ViewRoute(): HTMLElement {
  const { params } = useRoute();
  const router = useRouter();
  const sessionId = params.id;

  if (!sessionId) {
    router.navigate("/");
    return div({ class: "loading" }, ["Redirecting..."]);
  }

  // TODO: Implement read-only session view
  // For now, redirect to dashboard with message
  onMount(() => {
    showToast("Session view coming soon", "info");
    router.navigate("/");
  });

  return div({ class: "loading" }, ["Loading session view..."]);
}

/**
 * Not found screen for invalid routes.
 */
function NotFoundScreen(): HTMLElement {
  const router = useRouter();

  onMount(() => {
    // Auto-redirect to dashboard after a moment
    const timeout = setTimeout(() => {
      router.navigate("/");
    }, 2000);
    return () => clearTimeout(timeout);
  });

  return div({ class: "not-found-screen" }, [
    div({ class: "not-found-content" }, [
      div({ class: "not-found-title" }, ["Page Not Found"]),
      div({ class: "not-found-message" }, ["Redirecting to dashboard..."]),
    ]),
  ]);
}

// ============================================================================
// Router Setup
// ============================================================================

const Router = createRouter(
  [
    { path: "/", component: DashboardScreen },
    { path: "/new", component: HomeScreen },
    { path: "/:id", component: SessionRoute },
    { path: "/:id/view", component: ViewRoute },
  ],
  {
    fallback: NotFoundScreen,
  },
);

// ============================================================================
// IDS API for E2E Testing
// ============================================================================

interface IDSAPI {
  // State access
  getAppState: () => ReturnType<typeof AppStore.getSnapshot> & {
    sessionState: ReturnType<
      NonNullable<ReturnType<typeof AppStore.getSnapshot>["session"]>["getState"]
    > | null;
  };

  // Session lifecycle (actions only - no navigation)
  startSession: () => Promise<void>;
  abandonSession: () => Promise<void>;
  resetApp: () => void;

  // Content updates
  updateInvariants: (text: string) => Promise<void>;
  startCoding: () => Promise<void>;
  updateCode: (text: string) => Promise<void>;
  requestNudge: () => Promise<void>;
  submitSolution: () => Promise<void>;
  continuePastSummary: () => Promise<void>;
  submitReflection: (responses: ReflectionFormData) => Promise<void>;

  // Storage access
  storage: {
    clearAll: () => Promise<void>;
    getStats: () => Promise<{ sessionCount: number; audioCount: number }>;
    getSession: (id: string) => Promise<unknown>;
    getIncompleteSession: () => Promise<unknown>;
    getAllSessions: () => Promise<unknown[]>;
    softDeleteSession: (id: string) => Promise<void>;
  };

  // Router access
  router: {
    getCurrentRoute: () => {
      type: string;
      sessionId?: string;
    };
    navigate: (path: string) => void;
  };
}

declare global {
  interface Window {
    IDS: IDSAPI;
  }
}

function setupIDSAPI(): void {
  const actions = AppStore.getActions();
  const storage = createStorage();

  window.IDS = {
    getAppState: () => {
      const snapshot = AppStore.getSnapshot();
      return {
        ...snapshot,
        sessionState: snapshot.session?.getState() ?? null,
      };
    },

    // Session lifecycle - actions only, no navigation
    // Tests should use router.navigate() or click buttons for navigation
    startSession: async () => {
      await actions.startSession();
    },

    abandonSession: async () => {
      await actions.abandonSession();
    },

    resetApp: () => {
      actions.resetApp();
    },

    updateInvariants: async (text: string) => {
      await actions.updateInvariants(text);
    },

    startCoding: async () => {
      await actions.startCoding();
    },

    updateCode: async (text: string) => {
      await actions.updateCode(text);
    },

    requestNudge: async () => {
      await actions.requestNudge();
    },

    submitSolution: async () => {
      await actions.submitSolution();
    },

    continuePastSummary: async () => {
      await actions.continuePastSummary();
    },

    submitReflection: async (responses: ReflectionFormData) => {
      await actions.submitReflection(responses);
    },

    storage: {
      clearAll: async () => {
        await storage.init();
        await storage.clearAll();
      },

      getStats: async () => {
        await storage.init();
        return storage.getStats();
      },

      getSession: async (id: string) => {
        await storage.init();
        return storage.getSession(id);
      },

      getIncompleteSession: async () => {
        await storage.init();
        return storage.getIncompleteSession();
      },

      getAllSessions: async () => {
        await storage.init();
        return storage.getAllSessions();
      },

      softDeleteSession: async (id: string) => {
        await storage.init();
        return storage.softDeleteSession(id);
      },
    },

    router: {
      getCurrentRoute: () => {
        const hash = window.location.hash;
        const path = hash.startsWith("#") ? hash.slice(1) : "/";

        if (path === "/" || path === "") {
          return { type: "dashboard" };
        }

        const parts = path.split("/").filter(Boolean);
        
        if (parts.length === 1 && parts[0] === "new") {
          return { type: "new" };
        }

        if (parts.length === 1) {
          return { type: "session", sessionId: parts[0] };
        }

        if (parts.length === 2 && parts[1] === "view") {
          return { type: "view", sessionId: parts[0] };
        }

        return { type: "not_found" };
      },
      navigate: (path: string) => {
        window.location.hash = "#" + path;
      },
    },
  };
}

// ============================================================================
// App Initialization
// ============================================================================

async function init(): Promise<void> {
  console.log("Interview Conditioning Studio - Initializing...");

  // Set up IDS API first (for E2E tests)
  setupIDSAPI();

  // Initialize the store (which initializes storage)
  const actions = AppStore.getActions();
  await actions.init();

  // Get app container
  const appContainer = document.getElementById("app");
  if (!appContainer) {
    console.error("App container not found");
    return;
  }

  // Clear any placeholder content
  appContainer.innerHTML = "";

  // Initialize toast container
  const existingToastContainer = document.getElementById("toast-container");
  if (existingToastContainer) {
    existingToastContainer.remove();
  }
  const toastContainer = ToastContainer();
  document.body.appendChild(toastContainer);

  // Set up beforeunload handler to warn about unsaved sessions
  setupBeforeUnloadHandler();

  // Mount the router
  mount(Router, appContainer);

  console.log("Interview Conditioning Studio - Ready!");
}

// ============================================================================
// Before Unload Handler
// ============================================================================

/**
 * Warns user when leaving the page during an active session.
 */
function setupBeforeUnloadHandler(): void {
  window.addEventListener("beforeunload", (event) => {
    const state = AppStore.getSnapshot();

    if (state.status === "in_progress" && state.sessionId) {
      event.preventDefault();
      event.returnValue = "";
      return "";
    }
  });
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
