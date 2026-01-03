/**
 * Preset Configurations
 *
 * Predefined session configurations as per MVP spec.
 */

import { Preset, type PresetConfig } from "./types";

// Preset timing (from MVP.md):
// | Preset            | Prep  | Coding | Silent | Nudges |
// | Standard          | 5 min | 35 min | 5 min  | 3      |
// | High Pressure     | 3 min | 25 min | 2 min  | 1      |
// | No Assistance     | 5 min | 35 min | 5 min  | 0      |

const MINUTE = 60 * 1000;

export const PRESET_CONFIGS: Record<Preset, PresetConfig> = {
  [Preset.Standard]: {
    prepDuration: 5 * MINUTE,
    codingDuration: 35 * MINUTE,
    silentDuration: 5 * MINUTE,
    nudgeBudget: 3,
  },
  [Preset.HighPressure]: {
    prepDuration: 3 * MINUTE,
    codingDuration: 25 * MINUTE,
    silentDuration: 2 * MINUTE,
    nudgeBudget: 1,
  },
  [Preset.NoAssistance]: {
    prepDuration: 5 * MINUTE,
    codingDuration: 35 * MINUTE,
    silentDuration: 5 * MINUTE,
    nudgeBudget: 0,
  },
};

export function getPresetConfig(preset: Preset): PresetConfig {
  return PRESET_CONFIGS[preset];
}
