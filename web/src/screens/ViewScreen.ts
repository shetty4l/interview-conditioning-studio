/**
 * ViewScreen Component
 *
 * Read-only view of a completed session.
 * TODO: Implement actual view functionality.
 */

import { useRoute, useRouter, div, onMount } from "../framework";
import { showToast } from "../components";

// ============================================================================
// Component
// ============================================================================

export function ViewScreen(): HTMLElement {
  const { params } = useRoute();
  const router = useRouter();
  const sessionId = params.id;

  // Handle missing session ID
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
