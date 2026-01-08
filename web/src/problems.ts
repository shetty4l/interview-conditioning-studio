/**
 * Problem definitions for Interview Conditioning Studio
 *
 * Problems are loaded lazily from problems.json to keep the bundle size small.
 * Use preloadProblems() on screens where the user will soon need a problem
 * (e.g., the New Session screen) to ensure instant access when needed.
 *
 * Problem selection uses spaced repetition (SM-2 algorithm) to prioritize
 * problems that are due for review or haven't been attempted yet.
 */

import { createResourceLoader } from "./lib/resource-loader";
import { createSM2Scheduler } from "./lib/spaced-repetition";
import { getAllProblemProgress } from "./storage";
import type { ProblemProgress } from "./types";

export interface Problem {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  patterns: string[];
  description: string;
}

const loader = createResourceLoader<Problem[]>("/problems.json");

/**
 * Preload problems in background. Call this early (e.g., on New Session screen mount).
 * Safe to call multiple times - only fetches once.
 */
export function preloadProblems(): void {
  loader.preload();
}

/**
 * Get all problems (waits for load if needed).
 * Should be instant if preloadProblems() was called earlier.
 */
export function getProblems(): Promise<Problem[]> {
  return loader.get();
}

/**
 * Pick a random element from an array.
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get the next problem to practice using spaced repetition.
 *
 * Selection strategy:
 * 1. 50% chance: Pick from unattempted problems (if any exist)
 * 2. 50% chance: Pick from due/overdue problems based on scheduling
 *
 * This ensures new problems get introduced while still reviewing practiced ones.
 * Falls back to most overdue if all problems have been attempted.
 */
export async function getNextProblem(): Promise<Problem> {
  const problems = await loader.get();
  const progressList = await getAllProblemProgress();

  // Build a map for quick lookup
  const progressMap = new Map<string, ProblemProgress>();
  for (const progress of progressList) {
    progressMap.set(progress.problemId, progress);
  }

  // Separate problems into unattempted and attempted
  const unattempted: Problem[] = [];
  const attempted: Problem[] = [];

  for (const problem of problems) {
    if (progressMap.has(problem.id)) {
      attempted.push(problem);
    } else {
      unattempted.push(problem);
    }
  }

  // 50% chance to pick unattempted if available
  if (unattempted.length > 0 && Math.random() < 0.5) {
    return pickRandom(unattempted);
  }

  // If all problems are unattempted, just pick randomly
  if (attempted.length === 0) {
    return pickRandom(unattempted);
  }

  // Sort attempted problems by dueness (most overdue first)
  const scheduler = createSM2Scheduler();
  const now = new Date();

  const withDueness = attempted.map((problem) => ({
    problem,
    dueness: scheduler.getDueness(progressMap.get(problem.id)!.card, now),
  }));

  withDueness.sort((a, b) => b.dueness - a.dueness);

  // Pick from top 3 most due (adds some variety while still prioritizing due items)
  const topCandidates = withDueness.slice(0, Math.min(3, withDueness.length));
  return pickRandom(topCandidates).problem;
}
