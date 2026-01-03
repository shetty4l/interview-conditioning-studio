/**
 * Components Index
 *
 * Re-exports all components and aggregates their styles.
 */

// Re-export components
export * as Toast from "./Toast";
export * as Timer from "./Timer";
export * as Button from "./Button";
export * as RecordingIndicator from "./RecordingIndicator";
export * as InvariantsInput from "./InvariantsInput";
export * as InvariantsDisplay from "./InvariantsDisplay";
export * as PresetCard from "./PresetCard";
export * as ProblemCard from "./ProblemCard";
export * as CodeEditor from "./CodeEditor";
export * as NudgeButton from "./NudgeButton";
export * as PhaseHeader from "./PhaseHeader";

// Import styles from all components
import { styles as toastStyles } from "./Toast";
import { styles as timerStyles } from "./Timer";
import { styles as buttonStyles } from "./Button";
import { styles as recordingIndicatorStyles } from "./RecordingIndicator";
import { styles as invariantsInputStyles } from "./InvariantsInput";
import { styles as invariantsDisplayStyles } from "./InvariantsDisplay";
import { styles as presetCardStyles } from "./PresetCard";
import { styles as problemCardStyles } from "./ProblemCard";
import { styles as codeEditorStyles } from "./CodeEditor";
import { styles as nudgeButtonStyles } from "./NudgeButton";
import { styles as phaseHeaderStyles } from "./PhaseHeader";

/**
 * All component styles concatenated.
 * Inject this into a <style> tag at app initialization.
 */
export const allStyles = [
  toastStyles,
  timerStyles,
  buttonStyles,
  recordingIndicatorStyles,
  invariantsInputStyles,
  invariantsDisplayStyles,
  presetCardStyles,
  problemCardStyles,
  codeEditorStyles,
  nudgeButtonStyles,
  phaseHeaderStyles,
].join("\n");
