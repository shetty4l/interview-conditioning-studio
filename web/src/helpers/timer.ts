/**
 * Timer helper - manages countdown timer with callbacks
 *
 * Factory function that creates a timer instance with start/stop/pause/resume controls.
 * The timer calculates remaining time and calls onTick every second, onExpire when done.
 * Tracks total paused time for accurate timing across pause/resume cycles.
 */

export interface TimerCallbacks {
  onTick: (remainingMs: number) => void;
  onExpire: () => void;
}

export interface Timer {
  /** Start the timer with given duration in milliseconds */
  start(durationMs: number): void;
  /** Stop the timer completely (resets remaining to 0) */
  stop(): void;
  /** Pause the timer (preserves remaining time) */
  pause(): void;
  /** Resume a paused timer */
  resume(): void;
  /** Get current remaining time in milliseconds */
  getRemaining(): number;
  /** Check if timer is currently running */
  isRunning(): boolean;
  /** Check if timer is paused */
  isPaused(): boolean;
  /** Get total time spent paused (in milliseconds) */
  getTotalPausedMs(): number;
  /** Reset total paused time to 0 */
  resetTotalPausedMs(): void;
}

export function createTimer(callbacks: TimerCallbacks): Timer {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let remainingMs = 0;
  let running = false;
  let paused = false;
  let pausedAt: number | null = null;
  let totalPausedMs = 0;

  const tick = () => {
    remainingMs = Math.max(0, remainingMs - 1000);
    callbacks.onTick(remainingMs);

    if (remainingMs <= 0) {
      stop();
      callbacks.onExpire();
    }
  };

  const start = (durationMs: number) => {
    stop(); // Clear any existing timer
    remainingMs = durationMs;
    running = true;
    paused = false;
    pausedAt = null;
    totalPausedMs = 0;

    // Immediately call onTick with initial value
    callbacks.onTick(remainingMs);

    intervalId = setInterval(tick, 1000);
  };

  const stop = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    remainingMs = 0;
    running = false;
    paused = false;
    pausedAt = null;
    // Note: We don't reset totalPausedMs on stop - it can be retrieved after stop
  };

  const pause = () => {
    if (!running || paused) return;

    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    paused = true;
    pausedAt = Date.now();
  };

  const resume = () => {
    if (!running || !paused) return;

    // Calculate how long we were paused and add to total
    if (pausedAt !== null) {
      totalPausedMs += Date.now() - pausedAt;
      pausedAt = null;
    }

    paused = false;
    intervalId = setInterval(tick, 1000);
  };

  const getRemaining = () => remainingMs;

  const isRunning = () => running;

  const isPaused = () => paused;

  const getTotalPausedMs = () => {
    // If currently paused, include the current pause duration
    if (paused && pausedAt !== null) {
      return totalPausedMs + (Date.now() - pausedAt);
    }
    return totalPausedMs;
  };

  const resetTotalPausedMs = () => {
    totalPausedMs = 0;
    pausedAt = null;
  };

  return {
    start,
    stop,
    pause,
    resume,
    getRemaining,
    isRunning,
    isPaused,
    getTotalPausedMs,
    resetTotalPausedMs,
  };
}
