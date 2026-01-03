/**
 * Interview Conditioning Studio - Main Entry Point
 *
 * This file bootstraps the web application.
 */

import {
  initApp,
  getAppState,
  selectPreset,
  startSession,
  updateInvariants,
  startCoding,
  updateCode,
  requestNudge,
  submitSolution,
  startSilentPhase,
  endSilentPhase,
  continuePastSummary,
  submitReflection,
  abandonSession,
  resetApp,
} from "./app";
import {
  initStorage,
  getSession,
  getAllSessions,
  getIncompleteSession,
  deleteSession,
  clearAllStorage,
  getStorageStats,
} from "./storage";
import {
  getCurrentRoute,
  navigate,
  navigateHome,
  navigateToSession,
  parseHash,
  buildHash,
  isDebugMode,
} from "./router";

// ============================================================================
// Debug Interface
// ============================================================================

/**
 * Expose debug functions on window for testing and development.
 */
declare global {
  interface Window {
    IDS: {
      // App state
      getAppState: typeof getAppState;

      // Actions
      selectPreset: typeof selectPreset;
      startSession: typeof startSession;
      updateInvariants: typeof updateInvariants;
      startCoding: typeof startCoding;
      updateCode: typeof updateCode;
      requestNudge: typeof requestNudge;
      submitSolution: typeof submitSolution;
      startSilentPhase: typeof startSilentPhase;
      endSilentPhase: typeof endSilentPhase;
      continuePastSummary: typeof continuePastSummary;
      submitReflection: typeof submitReflection;
      abandonSession: typeof abandonSession;
      resetApp: typeof resetApp;

      // Storage
      storage: {
        init: typeof initStorage;
        getSession: typeof getSession;
        getAllSessions: typeof getAllSessions;
        getIncompleteSession: typeof getIncompleteSession;
        deleteSession: typeof deleteSession;
        clearAll: typeof clearAllStorage;
        getStats: typeof getStorageStats;
      };

      // Router
      router: {
        getCurrentRoute: typeof getCurrentRoute;
        navigate: typeof navigate;
        navigateHome: typeof navigateHome;
        navigateToSession: typeof navigateToSession;
        parseHash: typeof parseHash;
        buildHash: typeof buildHash;
        isDebugMode: typeof isDebugMode;
      };
    };
  }
}

window.IDS = {
  // App state
  getAppState,

  // Actions
  selectPreset,
  startSession,
  updateInvariants,
  startCoding,
  updateCode,
  requestNudge,
  submitSolution,
  startSilentPhase,
  endSilentPhase,
  continuePastSummary,
  submitReflection,
  abandonSession,
  resetApp,

  // Storage
  storage: {
    init: initStorage,
    getSession,
    getAllSessions,
    getIncompleteSession,
    deleteSession,
    clearAll: clearAllStorage,
    getStats: getStorageStats,
  },

  // Router
  router: {
    getCurrentRoute,
    navigate,
    navigateHome,
    navigateToSession,
    parseHash,
    buildHash,
    isDebugMode,
  },
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the application.
 */
async function init(): Promise<void> {
  try {
    await initApp();
    console.log("Interview Conditioning Studio initialized");

    if (isDebugMode()) {
      console.log("Debug mode enabled - access window.IDS for debugging");
    }
  } catch (error) {
    console.error("Failed to initialize app:", error);

    // Show error in UI
    const app = document.getElementById("app");
    if (app) {
      app.innerHTML = `
        <div class="error-screen">
          <h1>Failed to Initialize</h1>
          <p>Something went wrong while starting the application.</p>
          <pre>${error instanceof Error ? error.message : String(error)}</pre>
          <button onclick="location.reload()">Reload</button>
        </div>
      `;
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
