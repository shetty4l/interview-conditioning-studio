/**
 * AppHeader Component
 *
 * Global navigation header with Dashboard and New Session links.
 * Shows navigation guard when leaving an active session.
 */

import { a, div, useRouter, useRoute } from "../framework";
import { AppStore } from "../store";

// ============================================================================
// GitHub Icon SVG
// ============================================================================

function GitHubIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z",
  );

  svg.appendChild(path);
  return svg;
}

// ============================================================================
// Component
// ============================================================================

export function AppHeader(): HTMLElement {
  const router = useRouter();
  const { path } = useRoute();

  // Determine which nav link is active
  const isOnDashboard = path === "/";
  const isOnNewSession = path === "/new";

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
          class: `app-header__nav-link${isOnDashboard ? " app-header__nav-link--active" : ""}`,
          onClick: (e: MouseEvent) => handleNavClick(e, "/"),
        },
        ["Dashboard"],
      ),
      a(
        {
          href: "/new",
          class: `app-header__nav-link${isOnNewSession ? " app-header__nav-link--active" : ""}`,
          onClick: (e: MouseEvent) => handleNavClick(e, "/new"),
        },
        ["New Session"],
      ),
    ]),

    // Center: App title (also navigates to dashboard)
    a(
      {
        href: "/",
        class: "app-header__title",
        onClick: (e: MouseEvent) => handleNavClick(e, "/"),
      },
      ["Interview Conditioning Studio"],
    ),

    // Right section: GitHub link
    div({ class: "app-header__right" }, [
      a(
        {
          href: "https://github.com/shetty4l/interview-conditioning-studio",
          class: "app-header__github",
          target: "_blank",
          rel: "noopener noreferrer",
          title: "View on GitHub",
        },
        [GitHubIcon()],
      ),
    ]),
  ]);
}

// Export empty props interface for backwards compatibility
export interface AppHeaderProps {}
