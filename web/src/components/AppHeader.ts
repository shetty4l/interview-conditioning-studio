/**
 * AppHeader Component
 *
 * Global navigation header with Dashboard and New Session links.
 * Shows navigation guard when leaving an active session.
 */

import { a, div, useRouter } from "../framework";
import { AppStore } from "../store";

// ============================================================================
// Component
// ============================================================================

export function AppHeader(): HTMLElement {
  const router = useRouter();

  /**
   * Check if user is in an active session and confirm navigation.
   * Returns true if navigation should proceed, false to cancel.
   */
  const confirmNavigation = (href: string): boolean => {
    const state = AppStore.getSnapshot();

    // Check if we're in an active session
    if (state.status === "in_progress" && state.sessionId) {
      // Don't warn if navigating to the current session
      if (href === `/${state.sessionId}`) {
        return true;
      }

      return window.confirm("Leave session? Your progress is saved, but the timer will stop.");
    }

    return true;
  };

  /**
   * Handle navigation link clicks with guard.
   */
  const handleNavClick = (e: MouseEvent, href: string) => {
    e.preventDefault();

    if (confirmNavigation(href)) {
      router.navigate(href);
    }
  };

  return div({ class: "app-header" }, [
    // Left section: Navigation links
    div({ class: "app-header__left" }, [
      a(
        {
          href: "/",
          class: "app-header__nav-link",
          onClick: (e: MouseEvent) => handleNavClick(e, "/"),
        },
        ["Dashboard"],
      ),
      a(
        {
          href: "/new",
          class: "app-header__nav-link",
          onClick: (e: MouseEvent) => handleNavClick(e, "/new"),
        },
        ["New Session"],
      ),
    ]),

    // Center/Right: App title (also navigates to dashboard)
    a(
      {
        href: "/",
        class: "app-header__title",
        onClick: (e: MouseEvent) => handleNavClick(e, "/"),
      },
      ["Interview Conditioning Studio"],
    ),

    // Right section: Placeholder for future actions
    div({ class: "app-header__right" }, []),
  ]);
}

// Export empty props interface for backwards compatibility
export interface AppHeaderProps {}
