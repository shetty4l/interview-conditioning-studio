/**
 * Preset Configurations
 *
 * Predefined session configurations as per MVP spec.
 */

import { Preset, type PresetConfig } from "./types";

// Preset timing:
// | Preset            | Prep  | Coding | Silent | Nudges |
// | Speed Round       | 2 min | 10 min | 2 min  | 2      |
// | Standard          | 5 min | 25 min | 5 min  | 3      |
// | High Pressure     | 3 min | 15 min | 2 min  | 1      |
// | No Assistance     | 5 min | 25 min | 5 min  | 0      |

const MINUTE = 60 * 1000;

export const PRESET_CONFIGS: Record<Preset, PresetConfig> = {
  [Preset.SpeedRound]: {
    prepDuration: 2 * MINUTE,
    codingDuration: 10 * MINUTE,
    silentDuration: 2 * MINUTE,
    nudgeBudget: 2,
  },
  [Preset.Standard]: {
    prepDuration: 5 * MINUTE,
    codingDuration: 25 * MINUTE,
    silentDuration: 5 * MINUTE,
    nudgeBudget: 3,
  },
  [Preset.HighPressure]: {
    prepDuration: 3 * MINUTE,
    codingDuration: 15 * MINUTE,
    silentDuration: 2 * MINUTE,
    nudgeBudget: 1,
  },
  [Preset.NoAssistance]: {
    prepDuration: 5 * MINUTE,
    codingDuration: 25 * MINUTE,
    silentDuration: 5 * MINUTE,
    nudgeBudget: 0,
  },
};

export function getPresetConfig(preset: Preset): PresetConfig {
  return PRESET_CONFIGS[preset];
}
