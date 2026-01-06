/**
 * Problem definitions for Interview Conditioning Studio
 *
 * Problems are loaded lazily from problems.json to keep the bundle size small.
 * Use preloadProblems() on screens where the user will soon need a problem
 * (e.g., the New Session screen) to ensure instant access when needed.
 */

import { createResourceLoader } from "./lib/resource-loader";

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
 * Get a random problem.
 * Should be instant if preloadProblems() was called earlier.
 */
export async function getRandomProblem(): Promise<Problem> {
  const problems = await loader.get();
  const index = Math.floor(Math.random() * problems.length);
  return problems[index];
}
