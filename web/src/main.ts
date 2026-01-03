/**
 * Interview Conditioning Studio - Main Entry Point
 *
 * This file bootstraps the web application.
 */

import {
  initApp,
  getAppState,
  startSilentPhase,
  endSilentPhase,
  continuePastSummary,
  submitReflection,
  resetApp,
} from "./app";

// Expose debug functions on window for testing
declare global {
  interface Window {
    IDS: {
      getAppState: typeof getAppState;
      startSilentPhase: typeof startSilentPhase;
      endSilentPhase: typeof endSilentPhase;
      continuePastSummary: typeof continuePastSummary;
      submitReflection: typeof submitReflection;
      resetApp: typeof resetApp;
    };
  }
}

window.IDS = {
  getAppState,
  startSilentPhase,
  endSilentPhase,
  continuePastSummary,
  submitReflection,
  resetApp,
};

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
