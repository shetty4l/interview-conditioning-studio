/**
 * ReflectionScreen Component
 *
 * Quick reflection form after session completion.
 */

import { div, form, h1, input, label, signal, span, useActions } from "../framework";
import { Button, PhaseHeader } from "../components";
import { AppStore } from "../store";
import type { ReflectionFormData } from "../types";

// ============================================================================
// Types
// ============================================================================

interface QuestionConfig {
  name: keyof ReflectionFormData;
  label: string;
  options: Array<{ value: string; label: string }>;
}

// ============================================================================
// Constants
// ============================================================================

const QUESTIONS: QuestionConfig[] = [
  {
    name: "clearApproach",
    label: "Did you have a clear approach before coding?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "partially", label: "Partially" },
      { value: "no", label: "No" },
    ],
  },
  {
    name: "prolongedStall",
    label: "Did you experience a prolonged stall (>2 min)?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    name: "recoveredFromStall",
    label: "If you stalled, did you recover?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "partially", label: "Partially" },
      { value: "no", label: "No" },
      { value: "n/a", label: "N/A" },
    ],
  },
  {
    name: "timePressure",
    label: "How did you handle time pressure?",
    options: [
      { value: "comfortable", label: "Comfortable" },
      { value: "manageable", label: "Manageable" },
      { value: "overwhelming", label: "Overwhelming" },
    ],
  },
  {
    name: "wouldChangeApproach",
    label: "Would you change your approach next time?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
];

// ============================================================================
// Component
// ============================================================================

export function ReflectionScreen(): HTMLElement {
  const actions = useActions(AppStore);

  // Form state
  const [formData, setFormData] = signal<Partial<ReflectionFormData>>({});

  const handleChange = (name: keyof ReflectionFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isFormComplete = () => {
    const data = formData();
    return QUESTIONS.every((q) => data[q.name] !== undefined);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    const data = formData();
    if (!isFormComplete()) return;

    await actions.submitReflection(data as ReflectionFormData);
  };

  return div({ class: "screen reflection-screen", id: "reflection-screen" }, [
    // Header (no timer)
    PhaseHeader({
      phase: "reflection",
      remainingMs: 0,
    }),

    // Main content
    div({ class: "screen-content" }, [
      h1({}, ["Quick Reflection"]),
      span({ class: "subtitle" }, ["Take a moment to reflect on your session."]),

      form({ class: "reflection-form", onSubmit: handleSubmit }, [
        ...QUESTIONS.map((question) =>
          div({ class: "form-group" }, [
            label({ class: "form-label" }, [question.label]),
            div(
              { class: "radio-group" },
              question.options.map((option) =>
                label({ class: "radio-label" }, [
                  input({
                    type: "radio",
                    name: question.name,
                    value: option.value,
                    onChange: () => handleChange(question.name, option.value),
                  }),
                  span({}, [option.label]),
                ]),
              ),
            ),
          ]),
        ),

        // Submit button
        div({ class: "form-actions" }, [
          Button({
            label: "Submit Reflection",
            variant: "primary",
            size: "large",
            type: "submit",
            action: "submit-reflection",
            disabled: () => !isFormComplete(),
          }),
        ]),
      ]),
    ]),
  ]);
}
