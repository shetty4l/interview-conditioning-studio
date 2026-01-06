/**
 * Element Helpers
 *
 * DOM element creation utilities with reactive props support.
 */

import { watch } from "./reactive";
import { createRoot } from "./component";

// ============================================================================
// Types
// ============================================================================

export type Child = Node | string | number | null | undefined | (() => string | number);
export type Children = Child[];

type EventHandler<E extends Event = Event> = (event: E) => void;

interface Props {
  [key: string]: unknown;
  class?: string | (() => string);
  style?: Partial<CSSStyleDeclaration> | string;
  onClick?: EventHandler<MouseEvent>;
  onInput?: EventHandler<InputEvent>;
  onChange?: EventHandler<Event>;
  onSubmit?: EventHandler<SubmitEvent>;
  onKeyDown?: EventHandler<KeyboardEvent>;
  onKeyUp?: EventHandler<KeyboardEvent>;
  onFocus?: EventHandler<FocusEvent>;
  onBlur?: EventHandler<FocusEvent>;
}

// ============================================================================
// Core Element Creator
// ============================================================================

/**
 * Create a DOM element with props and children.
 *
 * @param tag - HTML tag name
 * @param props - Element properties (including event handlers)
 * @param children - Child elements or text
 * @returns Created DOM element
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props,
  children?: Children,
): HTMLElementTagNameMap[K];
export function h(tag: string, props?: Props, children?: Children): HTMLElement;
export function h(tag: string, props: Props = {}, children: Children = []): HTMLElement {
  const el = document.createElement(tag);

  // Apply props
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;

    // Event handlers (onClick, onInput, etc.)
    if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, value as EventListener);
      continue;
    }

    // Style object
    if (key === "style" && typeof value === "object") {
      Object.assign(el.style, value);
      continue;
    }

    // Reactive prop (function that returns value)
    if (typeof value === "function" && !key.startsWith("on")) {
      // Set up reactive binding
      watch(() => {
        const computed = (value as () => unknown)();
        applyProp(el, key, computed);
      });
      continue;
    }

    // Static prop
    applyProp(el, key, value);
  }

  // Append children
  for (const child of children) {
    if (child === null || child === undefined) continue;

    if (typeof child === "function") {
      // Reactive child - create placeholder and update reactively
      const textNode = document.createTextNode("");
      el.appendChild(textNode);
      watch(() => {
        textNode.textContent = String(child());
      });
    } else if (child instanceof Node) {
      el.appendChild(child);
    } else {
      // String or number
      el.appendChild(document.createTextNode(String(child)));
    }
  }

  return el;
}

/**
 * Apply a prop to an element.
 */
function applyProp(el: HTMLElement, key: string, value: unknown): void {
  // Boolean attributes
  if (typeof value === "boolean") {
    if (value) {
      el.setAttribute(key, "");
    } else {
      el.removeAttribute(key);
    }
    return;
  }

  // Class shorthand
  if (key === "class") {
    el.className = String(value);
    return;
  }

  // For attribute (label)
  if (key === "for") {
    el.setAttribute("for", String(value));
    return;
  }

  // Value property for inputs
  if (key === "value" && "value" in el) {
    (el as HTMLInputElement).value = String(value);
    return;
  }

  // Data attributes and others
  el.setAttribute(key, String(value));
}

// ============================================================================
// Element Helpers
// ============================================================================

export const div = (props?: Props, children?: Children) => h("div", props, children);
export const span = (props?: Props, children?: Children) => h("span", props, children);
export const button = (props?: Props, children?: Children) => h("button", props, children);
export const input = (props?: Props, children?: Children) => h("input", props, children);
export const textarea = (props?: Props, children?: Children) => h("textarea", props, children);
export const form = (props?: Props, children?: Children) => h("form", props, children);
export const label = (props?: Props, children?: Children) => h("label", props, children);
export const h1 = (props?: Props, children?: Children) => h("h1", props, children);
export const h2 = (props?: Props, children?: Children) => h("h2", props, children);
export const h3 = (props?: Props, children?: Children) => h("h3", props, children);
export const p = (props?: Props, children?: Children) => h("p", props, children);
export const pre = (props?: Props, children?: Children) => h("pre", props, children);
export const a = (props?: Props, children?: Children) => h("a", props, children);

// ============================================================================
// Text Helper
// ============================================================================

/**
 * Create a text node.
 */
export function text(content: string): Text {
  return document.createTextNode(content);
}

// ============================================================================
// Show (Conditional Rendering)
// ============================================================================

/**
 * Conditionally render content based on a reactive condition.
 *
 * @param condition - Reactive condition function
 * @param whenTrue - Render function for truthy condition
 * @param whenFalse - Optional render function for falsy condition
 * @returns Container element that swaps content reactively
 */
export function Show(
  condition: () => boolean,
  whenTrue: () => Node,
  whenFalse?: () => Node,
): HTMLElement {
  // Use div instead of span to allow block-level children (valid HTML)
  const container = document.createElement("div");
  container.style.display = "contents";

  let currentContent: Node | null = null;
  let currentDispose: (() => void) | null = null;

  watch(() => {
    const shouldShow = condition();

    // Dispose previous component
    if (currentDispose) {
      currentDispose();
      currentDispose = null;
    }

    // Remove current content
    if (currentContent) {
      container.removeChild(currentContent);
      currentContent = null;
    }

    // Render appropriate content
    if (shouldShow) {
      const { result, dispose } = createRoot(() => whenTrue());
      currentContent = result;
      currentDispose = dispose;
      container.appendChild(currentContent);
    } else if (whenFalse) {
      const { result, dispose } = createRoot(() => whenFalse());
      currentContent = result;
      currentDispose = dispose;
      container.appendChild(currentContent);
    }
  });

  return container;
}

// ============================================================================
// For (List Rendering)
// ============================================================================

/**
 * Render a list of items reactively.
 *
 * @param items - Reactive items getter
 * @param render - Render function for each item
 * @returns Container element with rendered items
 */
export function For<T>(
  items: () => T[],
  render: (item: T, index: () => number) => Node,
): HTMLElement {
  // Use div instead of span to allow block-level children (valid HTML)
  const container = document.createElement("div");
  container.style.display = "contents";

  let currentNodes: Node[] = [];

  watch(() => {
    const newItems = items();

    // Remove all current nodes
    for (const node of currentNodes) {
      container.removeChild(node);
    }

    // Render new items
    currentNodes = newItems.map((item, i) => {
      // Create a stable index getter for this position
      const indexGetter = () => i;
      return render(item, indexGetter);
    });

    // Append all new nodes
    for (const node of currentNodes) {
      container.appendChild(node);
    }
  });

  return container;
}

// ============================================================================
// Switch (Multi-case Conditional Rendering)
// ============================================================================

/** Case definition for Switch component */
export interface SwitchCase<T> {
  match: T | ((value: T) => boolean);
  render: () => Node;
}

/**
 * Render content based on matching a value against multiple cases.
 * Similar to a switch statement but reactive.
 *
 * @param value - Reactive value getter
 * @param cases - Array of cases with match condition and render function
 * @param fallback - Optional render function when no case matches
 * @returns Container element that swaps content reactively
 *
 * @example
 * Switch(
 *   () => state.screen(),
 *   [
 *     { match: "prep", render: PrepScreen },
 *     { match: "coding", render: CodingScreen },
 *     { match: (v) => v === "silent", render: CodingScreen },
 *   ],
 *   () => div({}, ["Unknown screen"])
 * )
 */
export function Switch<T>(
  value: () => T,
  cases: SwitchCase<T>[],
  fallback?: () => Node,
): HTMLElement {
  // Use div instead of span to allow block-level children (valid HTML)
  const container = document.createElement("div");
  container.style.display = "contents";

  let currentContent: Node | null = null;
  let currentDispose: (() => void) | null = null;

  watch(() => {
    const v = value();

    // Dispose previous component
    if (currentDispose) {
      currentDispose();
      currentDispose = null;
    }

    // Remove current content
    if (currentContent) {
      container.removeChild(currentContent);
      currentContent = null;
    }

    // Find matching case
    for (const c of cases) {
      const matches =
        typeof c.match === "function" ? (c.match as (value: T) => boolean)(v) : c.match === v;

      if (matches) {
        // Create component in its own root scope for lifecycle hooks
        const { result, dispose } = createRoot(() => c.render());
        currentContent = result;
        currentDispose = dispose;
        container.appendChild(currentContent);
        return;
      }
    }

    // No match - render fallback if provided
    if (fallback) {
      const { result, dispose } = createRoot(() => fallback());
      currentContent = result;
      currentDispose = dispose;
      container.appendChild(currentContent);
    }
  });

  return container;
}
