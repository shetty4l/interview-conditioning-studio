/**
 * DashboardScreen Component
 *
 * Landing page with session list, stats, and "New Session" button.
 */

import { div, h1, h2, p, useStore, useActions, useRouter, signal, onMount, Show, For } from "../framework";
import { AppHeader, StatsCard, SessionCard, Button } from "../components";
import { AppStore } from "../store";
import type { StoredSession } from "../types";
import { exportSession as exportSessionFn } from "../export";

// ============================================================================
// Component
// ============================================================================

export function DashboardScreen(): HTMLElement {
  const _state = useStore(AppStore);
  const actions = useActions(AppStore);
  const router = useRouter();

  // Local state for sessions and stats
  const [sessions, setSessions] = signal<StoredSession[]>([]);
  const [stats, setStats] = signal({ total: 0, completed: 0, avgNudges: 0 });
  const [loading, setLoading] = signal(true);

  // Load sessions on mount
  onMount(() => {
    // Async IIFE to load data
    (async () => {
      const [loadedSessions, loadedStats] = await Promise.all([
        actions.getAllSessions(),
        actions.getSessionStats(),
      ]);
      setSessions(loadedSessions);
      setStats(loadedStats);
      setLoading(false);
    })();
  });

  const handleNewSession = () => {
    router.navigate("/new");
  };

  const handleResumeSession = (sessionId: string) => {
    router.navigate(`/${sessionId}`);
  };

  const handleViewSession = (sessionId: string) => {
    router.navigate(`/${sessionId}/view`);
  };

  const handleExportSession = async (session: StoredSession) => {
    try {
      await exportSessionFn(session);
    } catch (error) {
      console.error("Failed to export session:", error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    await actions.softDeleteSession(sessionId);
    // Refresh the list
    const refreshed = await actions.getAllSessions();
    setSessions(refreshed);
    const newStats = await actions.getSessionStats();
    setStats(newStats);
  };

  return div({ class: "screen dashboard-screen" }, [
    AppHeader({ showBackLink: false }),

    div({ class: "dashboard" }, [
      // Header with title and New Session button
      div({ class: "dashboard__header" }, [
        h1({}, ["Dashboard"]),
        Button({
          label: "New Session",
          variant: "primary",
          onClick: handleNewSession,
        }),
      ]),

      // Stats row
      div({ class: "dashboard__stats" }, [
        StatsCard({
          value: () => stats().total,
          label: "Total Sessions",
        }),
        StatsCard({
          value: () => stats().completed,
          label: "Completed",
          variant: "success",
        }),
        StatsCard({
          value: () => stats().avgNudges,
          label: "Avg Nudges",
        }),
      ]),

      // Sessions list
      div({ class: "dashboard__sessions" }, [
        div({ class: "dashboard__sessions-header" }, [
          h2({}, ["Recent Sessions"]),
        ]),

        // Loading state
        Show(
          loading,
          () => div({ class: "loading" }, ["Loading sessions..."]),
        ),

        // Empty state
        Show(
          () => !loading() && sessions().length === 0,
          () =>
            div({ class: "dashboard__empty" }, [
              div({ class: "dashboard__empty-title" }, ["No sessions yet"]),
              p({ class: "dashboard__empty-text" }, [
                "Start your first practice session to begin tracking your progress.",
              ]),
              Button({
                label: "Start First Session",
                variant: "primary",
                onClick: handleNewSession,
              }),
            ]),
        ),

        // Sessions list
        Show(
          () => !loading() && sessions().length > 0,
          () =>
            div({ class: "dashboard__list" }, [
              For(sessions, (session) =>
                SessionCard({
                  session,
                  onResume: () => handleResumeSession(session.id),
                  onView: () => handleViewSession(session.id),
                  onExport: () => handleExportSession(session),
                  onDelete: () => handleDeleteSession(session.id),
                }),
              ),
            ]),
        ),
      ]),
    ]),
  ]);
}
