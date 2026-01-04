/**
 * Interview Conditioning Studio - Main Entry Point
 *
 * Bootstraps the web application using the reactive framework.
 * Sets up router, initializes store, and mounts the app.
 */

import { mount, createRouter } from "./framework";
import { ToastContainer } from "./components";
import { AppStore } from "./store";
import { setupIDSAPI } from "./ids-api";
import { DashboardScreen, HomeScreen, SessionScreen, ViewScreen, NotFoundScreen } from "./screens";

// ============================================================================
// Router Setup
// ============================================================================

const Router = createRouter(
  [
    { path: "/", component: DashboardScreen },
    { path: "/new", component: HomeScreen },
    { path: "/:id", component: SessionScreen },
    { path: "/:id/view", component: ViewScreen },
  ],
  { fallback: NotFoundScreen },
);

// ============================================================================
// Before Unload Handler
// ============================================================================

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

// ============================================================================
// App Initialization
// ============================================================================

async function init(): Promise<void> {
  console.log("Interview Conditioning Studio - Initializing...");

  // Set up IDS API first (for E2E tests)
  setupIDSAPI();

  // Initialize the store (which initializes storage)
  await AppStore.getActions().init();

  // Get app container
  const appContainer = document.getElementById("app");
  if (!appContainer) {
    console.error("App container not found");
    return;
  }

  // Clear any placeholder content
  appContainer.innerHTML = "";

  // Initialize toast container
  document.getElementById("toast-container")?.remove();
  document.body.appendChild(ToastContainer());

  // Set up beforeunload handler to warn about unsaved sessions
  setupBeforeUnloadHandler();

  // Mount the router
  mount(Router, appContainer);

  console.log("Interview Conditioning Studio - Ready!");
}

// ============================================================================
// Start
// ============================================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
