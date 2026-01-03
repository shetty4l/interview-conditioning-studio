/**
 * Interview Conditioning Studio - Main Entry Point
 *
 * This file bootstraps the web application.
 */

import { VERSION } from "../../core/src/index";

// Initialize app
function init() {
  const status = document.getElementById("status");
  if (status) {
    status.textContent = `Core engine v${VERSION} loaded successfully!`;
    status.classList.add("success");
  }

  console.log("Interview Conditioning Studio initialized");
  console.log(`Core engine version: ${VERSION}`);
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
