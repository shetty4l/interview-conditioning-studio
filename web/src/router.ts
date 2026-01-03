/**
 * Hash-based Router
 *
 * Handles URL routing with session ID support.
 * URL pattern: /#/{sessionId}/{phase}
 */

import { Phase } from "../../core/src/index";
import type { Route } from "./types";

// ============================================================================
// Route Parsing
// ============================================================================

/**
 * Valid phase slugs in URLs (lowercase).
 */
const PHASE_SLUGS: Record<string, Phase> = {
  prep: Phase.Prep,
  coding: Phase.Coding,
  silent: Phase.Silent,
  summary: Phase.Summary,
  reflection: Phase.Reflection,
  done: Phase.Done,
};

/**
 * Convert Phase enum to URL slug.
 */
export function phaseToSlug(phase: Phase): string {
  return phase.toLowerCase();
}

/**
 * Parse the current hash into a Route.
 *
 * @example
 * parseHash('')           → { type: 'home' }
 * parseHash('#/')         → { type: 'home' }
 * parseHash('#/abc123/prep') → { type: 'session', sessionId: 'abc123', phase: Phase.Prep }
 */
export function parseHash(hash: string): Route {
  // Remove leading # if present
  const path = hash.startsWith("#") ? hash.slice(1) : hash;

  // Remove leading / if present
  const normalized = path.startsWith("/") ? path.slice(1) : path;

  // Empty or just "/" → home
  if (!normalized || normalized === "") {
    return { type: "home" };
  }

  // Split into segments
  const segments = normalized.split("/").filter(Boolean);

  // Single segment that's not a phase → invalid
  if (segments.length === 1) {
    // Could be a sessionId without phase, treat as not found
    return { type: "not_found" };
  }

  // Two segments → sessionId/phase
  if (segments.length === 2) {
    const [sessionId, phaseSlug] = segments;
    const phase = PHASE_SLUGS[phaseSlug.toLowerCase()];

    if (phase) {
      return { type: "session", sessionId, phase };
    }

    // Invalid phase slug
    return { type: "not_found" };
  }

  // More than 2 segments → not found
  return { type: "not_found" };
}

/**
 * Build a hash string from a Route.
 *
 * @example
 * buildHash({ type: 'home' }) → '#/'
 * buildHash({ type: 'session', sessionId: 'abc123', phase: Phase.Prep }) → '#/abc123/prep'
 */
export function buildHash(route: Route): string {
  switch (route.type) {
    case "home":
      return "#/";
    case "session":
      return `#/${route.sessionId}/${phaseToSlug(route.phase)}`;
    case "not_found":
      return "#/";
  }
}

// ============================================================================
// Navigation
// ============================================================================

/**
 * Navigate to a new route.
 * Updates the browser hash, which triggers hashchange event.
 */
export function navigate(route: Route): void {
  const hash = buildHash(route);
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

/**
 * Navigate to home.
 */
export function navigateHome(): void {
  navigate({ type: "home" });
}

/**
 * Navigate to a session phase.
 */
export function navigateToSession(sessionId: string, phase: Phase): void {
  navigate({ type: "session", sessionId, phase });
}

/**
 * Replace current route without adding to history.
 */
export function replaceRoute(route: Route): void {
  const hash = buildHash(route);
  const url = new URL(window.location.href);
  url.hash = hash;
  window.history.replaceState(null, "", url.toString());
}

// ============================================================================
// Route Observation
// ============================================================================

type RouteChangeCallback = (route: Route, previousRoute: Route | null) => void;

let listeners: RouteChangeCallback[] = [];
let previousRoute: Route | null = null;

/**
 * Subscribe to route changes.
 * Returns an unsubscribe function.
 */
export function onRouteChange(callback: RouteChangeCallback): () => void {
  listeners.push(callback);

  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

/**
 * Handle hash change event.
 */
function handleHashChange(): void {
  const route = getCurrentRoute();

  // Notify listeners
  for (const listener of listeners) {
    listener(route, previousRoute);
  }

  previousRoute = route;
}

/**
 * Get the current route from the URL hash.
 */
export function getCurrentRoute(): Route {
  return parseHash(window.location.hash);
}

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Check if debug mode is enabled via ?debug=1 query param.
 */
export function isDebugMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("debug") === "1";
}

/**
 * Get a query parameter value.
 */
export function getQueryParam(name: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ============================================================================
// Initialization
// ============================================================================

let initialized = false;

/**
 * Initialize the router.
 * Sets up hashchange listener.
 */
export function initRouter(): void {
  if (initialized) return;

  window.addEventListener("hashchange", handleHashChange);

  // Store initial route
  previousRoute = getCurrentRoute();

  initialized = true;
}

/**
 * Cleanup router (for testing).
 */
export function cleanupRouter(): void {
  window.removeEventListener("hashchange", handleHashChange);
  listeners = [];
  previousRoute = null;
  initialized = false;
}
