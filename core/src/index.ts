/**
 * Interview Conditioning Studio - Core Engine
 *
 * Public API exports.
 */

export const VERSION = "0.1.0";

// Types
export {
  Phase,
  Preset,
  type SessionStatus,
  type Problem,
  type PresetConfig,
  type EventType,
  type Event,
  type EventData,
  type SessionStartedData,
  type InvariantsChangedData,
  type CodeChangedData,
  type ReflectionResponses,
  type ReflectionSubmittedData,
  type DispatchErrorCode,
  type DispatchError,
  type DispatchResult,
  type SessionState,
  type CreateSessionOptions,
  type EventCallback,
  type UnsubscribeFn,
  type Session,
} from "./types";

// Presets
export { PRESET_CONFIGS, getPresetConfig } from "./presets";

// Session
export { createSession } from "./session";
