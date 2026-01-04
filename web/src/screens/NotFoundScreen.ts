/**
 * NotFoundScreen Component
 *
 * Displayed for invalid routes. Auto-redirects to dashboard after a delay.
 */

import { useRouter, div, onMount } from "../framework";

// ============================================================================
// Component
// ============================================================================

export function NotFoundScreen(): HTMLElement {
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
