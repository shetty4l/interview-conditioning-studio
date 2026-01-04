/**
 * AppHeader Component
 *
 * Global header with clickable title and "← Dashboard" link.
 * Shows on all screens except the dashboard itself.
 */

import { div, span, a } from "../framework";

// ============================================================================
// Types
// ============================================================================

export interface AppHeaderProps {
  showBackLink?: boolean | (() => boolean);
  onBackClick?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function AppHeader(props: AppHeaderProps = {}): HTMLElement {
  const { showBackLink = true, onBackClick } = props;

  const getShowBackLink = typeof showBackLink === "function" ? showBackLink : () => showBackLink;

  const handleBackClick = (e: MouseEvent) => {
    e.preventDefault();
    if (onBackClick) {
      onBackClick();
    } else {
      window.location.hash = "#/";
    }
  };

  return div({ class: "app-header" }, [
    div({ class: "app-header__left" }, [
      // Back link (conditional)
      ...(getShowBackLink()
        ? [
            a(
              {
                href: "#/",
                class: "app-header__back",
                onClick: handleBackClick,
              },
              ["← Dashboard"],
            ),
          ]
        : []),
    ]),
    // Clickable title
    a(
      {
        href: "#/",
        class: "app-header__title",
        onClick: handleBackClick,
      },
      ["Interview Conditioning Studio"],
    ),
    div({ class: "app-header__right" }, [
      // Placeholder for future actions (e.g., settings)
    ]),
  ]);
}
