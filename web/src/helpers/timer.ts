/**
 * Timer helper - manages countdown timer with callbacks
 *
 * Factory function that creates a timer instance with start/stop/pause/resume controls.
 * The timer calculates remaining time and calls onTick every second, onExpire when done.
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
}

export function createTimer(callbacks: TimerCallbacks): Timer {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let remainingMs = 0;
  let running = false;
  let paused = false;

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
  };

  const pause = () => {
    if (!running || paused) return;

    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    paused = true;
  };

  const resume = () => {
    if (!running || !paused) return;

    paused = false;
    intervalId = setInterval(tick, 1000);
  };

  const getRemaining = () => remainingMs;

  const isRunning = () => running;

  const isPaused = () => paused;

  return {
    start,
    stop,
    pause,
    resume,
    getRemaining,
    isRunning,
    isPaused,
  };
}
