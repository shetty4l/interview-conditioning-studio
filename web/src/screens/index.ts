/**
 * Screen Registry
 *
 * Maps screen names to screen modules and provides lookup utilities.
 */

import type { Screen, ScreenName } from "./types";
import * as HomeScreen from "./HomeScreen";
import * as PrepScreen from "./PrepScreen";
import * as CodingScreen from "./CodingScreen";
import * as SummaryScreen from "./SummaryScreen";
import * as ReflectionScreen from "./ReflectionScreen";
import * as DoneScreen from "./DoneScreen";

// ============================================================================
// Screen Registry
// ============================================================================

const screens: Record<ScreenName, Screen> = {
  home: HomeScreen,
  prep: PrepScreen,
  coding: CodingScreen,
  silent: CodingScreen, // CodingScreen handles both modes
  summary: SummaryScreen,
  reflection: ReflectionScreen,
  done: DoneScreen,
};

// ============================================================================
// Exports
// ============================================================================

/**
 * Get the screen module for a given screen name.
 */
export function getScreen(name: ScreenName): Screen {
  return screens[name];
}

/**
 * Re-export all screens for direct access.
 */
export { HomeScreen, PrepScreen, CodingScreen, SummaryScreen, ReflectionScreen, DoneScreen };

/**
 * Re-export types.
 */
export type { Screen, ScreenName, ScreenContext, AppState } from "./types";
