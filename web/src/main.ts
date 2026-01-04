/**
 * Interview Conditioning Studio - Main Entry Point
 *
 * Bootstraps the web application using the reactive framework.
 * Sets up router, initializes store, and exposes window.IDS API for E2E tests.
 */

import { mount, useStore, watch } from "./framework";
import { ToastContainer } from "./components";
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
} from "./screens";

// ============================================================================
// Router Setup
// ============================================================================

// Screen routing is driven by AppStore.state.screen
// The router watches the store and renders the appropriate screen
function App(): HTMLElement {
  const state = useStore(AppStore);

  // Create a container that switches screens based on state
  const container = document.createElement("div");
  container.id = "app-container";
  container.className = "app-container";

  // Track current screen element
  let currentScreen: HTMLElement | null = null;

  // Render screen based on state
  const renderScreen = () => {
    const screen = state.screen();

    // Clear and render new screen
    container.innerHTML = "";

    switch (screen) {
      case "home":
        currentScreen = HomeScreen();
        break;
      case "prep":
        currentScreen = PrepScreen();
        break;
      case "coding":
      case "silent":
        currentScreen = CodingScreen();
        break;
      case "summary":
        currentScreen = SummaryScreen();
        break;
      case "reflection":
        currentScreen = ReflectionScreen();
        break;
      case "done":
        currentScreen = DoneScreen();
        break;
      default:
        currentScreen = HomeScreen();
    }

    if (currentScreen) {
      container.appendChild(currentScreen);
    }

    // Update URL hash to match screen and session
    const sessionId = state.sessionId();
    let hash: string;
    if (screen === "home" || !sessionId) {
      hash = "/";
    } else {
      hash = `/${sessionId}/${screen}`;
    }
    if (window.location.hash !== `#${hash}`) {
      window.history.replaceState(null, "", `#${hash}`);
    }
  };

  // Watch for screen changes
  watch(() => {
    // Access signals to register dependencies
    state.screen();
    state.sessionId();
    // Then re-render
    renderScreen();
  });

  // Initial render
  renderScreen();

  return container;
}

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

  // Session lifecycle
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
      phase?: string;
    };
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

        // Parse path to determine route type
        if (path === "/" || path === "") {
          return { type: "home" };
        }

        // Check for session route: /{sessionId}/{phase}
        const parts = path.split("/").filter(Boolean);
        if (parts.length === 2) {
          const [sessionId, phase] = parts;
          return {
            type: "session",
            sessionId,
            phase: phase.toUpperCase(),
          };
        }

        // Simple phase route: /prep, /coding, etc.
        if (parts.length === 1) {
          return { type: parts[0] };
        }

        return { type: "not_found" };
      },
    },
  };
}

// ============================================================================
// URL Parsing
// ============================================================================

interface ParsedRoute {
  type: "home" | "session" | "invalid";
  sessionId?: string;
  phase?: string;
}

/**
 * Parse the URL hash to extract route information.
 */
function parseUrlHash(): ParsedRoute {
  const hash = window.location.hash;
  const path = hash.startsWith("#") ? hash.slice(1) : "/";

  // Home route
  if (path === "/" || path === "") {
    return { type: "home" };
  }

  // Check for session route: /{sessionId}/{phase}
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 2) {
    const [sessionId, phase] = parts;
    // Validate phase is a known phase
    const validPhases = ["prep", "coding", "silent", "summary", "reflection", "done"];
    if (validPhases.includes(phase.toLowerCase())) {
      return {
        type: "session",
        sessionId,
        phase: phase.toLowerCase(),
      };
    }
    // Invalid phase
    return { type: "invalid" };
  }

  // Simple route like /prep or /invalid
  if (parts.length === 1) {
    return { type: "invalid" };
  }

  return { type: "invalid" };
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

  // Handle URL-based session restoration
  const route = parseUrlHash();
  if (route.type === "session" && route.sessionId) {
    // Try to load the session from storage
    const loaded = await actions._loadSession(route.sessionId);
    if (!loaded) {
      // Session not found, redirect to home
      console.log(`Session ${route.sessionId} not found, redirecting to home`);
      window.history.replaceState(null, "", "#/");
    }
    // If loaded, the session's actual phase will be used (URL auto-updates via renderScreen)
  } else if (route.type === "invalid") {
    // Invalid route, redirect to home
    console.log("Invalid route, redirecting to home");
    window.history.replaceState(null, "", "#/");
  }

  // Get app container
  const appContainer = document.getElementById("app");
  if (!appContainer) {
    console.error("App container not found");
    return;
  }

  // Clear any placeholder content
  appContainer.innerHTML = "";

  // Initialize toast container
  // Replace static HTML container with reactive one, or create if missing
  const existingToastContainer = document.getElementById("toast-container");
  if (existingToastContainer) {
    existingToastContainer.remove();
  }
  const toastContainer = ToastContainer();
  document.body.appendChild(toastContainer);

  // Mount the app
  mount(App, appContainer);

  console.log("Interview Conditioning Studio - Ready!");
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
