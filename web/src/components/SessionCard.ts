/**
 * SessionCard Component
 *
 * Session row in list showing title, status, date, and actions.
 */

import { div, span, button } from "../framework";
import type { StoredSession } from "../types";

// ============================================================================
// Types
// ============================================================================

export interface SessionCardProps {
  session: StoredSession;
  onResume?: () => void;
  onView?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
}

// ============================================================================
// Utilities
// ============================================================================

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getSessionStatus(session: StoredSession): "in_progress" | "completed" | "abandoned" {
  // Check if session has reflection.submitted event (completed)
  const hasReflection = session.events.some((e) => e.type === "reflection.submitted");
  if (hasReflection) return "completed";

  // Check if session was abandoned
  const hasAbandon = session.events.some((e) => e.type === "session.abandoned");
  if (hasAbandon) return "abandoned";

  return "in_progress";
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "abandoned":
      return "Abandoned";
    case "in_progress":
      return "In Progress";
    default:
      return status;
  }
}

// ============================================================================
// Component
// ============================================================================

export function SessionCard(props: SessionCardProps): HTMLElement {
  const { session, onResume, onView, onExport, onDelete } = props;

  const status = getSessionStatus(session);
  const isInProgress = status === "in_progress";
  const isCompleted = status === "completed";

  return div({ class: `session-card session-card--${status}` }, [
    // Left: Problem info
    div({ class: "session-card__info" }, [
      span({ class: "session-card__title" }, [session.problem.title]),
      span({ class: "session-card__meta" }, [
        span({ class: `session-card__status session-card__status--${status}` }, [
          getStatusLabel(status),
        ]),
        span({ class: "session-card__date" }, [formatDate(session.createdAt)]),
      ]),
    ]),

    // Right: Actions
    div({ class: "session-card__actions" }, [
      // Resume (only for in-progress)
      ...(isInProgress && onResume
        ? [
            button(
              {
                class: "btn btn--primary btn--small",
                onClick: onResume,
              },
              ["Resume"],
            ),
          ]
        : []),

      // View (only for completed/abandoned)
      ...(!isInProgress && onView
        ? [
            button(
              {
                class: "btn btn--secondary btn--small",
                onClick: onView,
              },
              ["View"],
            ),
          ]
        : []),

      // Export (only for completed)
      ...(isCompleted && onExport
        ? [
            button(
              {
                class: "btn btn--secondary btn--small",
                onClick: onExport,
              },
              ["Export"],
            ),
          ]
        : []),

      // Delete (always available)
      ...(onDelete
        ? [
            button(
              {
                class: "btn btn--ghost btn--small",
                onClick: onDelete,
              },
              ["Delete"],
            ),
          ]
        : []),
    ]),
  ]);
}
