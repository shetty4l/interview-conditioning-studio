/**
 * AppHeader Component
 *
 * Global header with clickable title and "← Dashboard" link.
 * Shows on all screens except the dashboard itself.
 */

import { div, Link } from "../framework";

// ============================================================================
// Types
// ============================================================================

export interface AppHeaderProps {
  showBackLink?: boolean | (() => boolean);
}

// ============================================================================
// Component
// ============================================================================

export function AppHeader(props: AppHeaderProps = {}): HTMLElement {
  const { showBackLink = true } = props;

  const getShowBackLink = typeof showBackLink === "function" ? showBackLink : () => showBackLink;

  return div({ class: "app-header" }, [
    div(
      { class: "app-header__left" },
      getShowBackLink() ? [Link({ href: "/", class: "app-header__back" }, ["← Dashboard"])] : [],
    ),
    // Clickable title
    Link({ href: "/", class: "app-header__title" }, ["Interview Conditioning Studio"]),
    div({ class: "app-header__right" }, [
      // Placeholder for future actions (e.g., settings)
    ]),
  ]);
}
