/**
 * Element Helpers Tests
 *
 * TDD tests for h, element helpers, Show, For, and css.
 */

import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { signal } from "../../web/src/framework/reactive";
import {
  h,
  div,
  span,
  button,
  input,
  textarea,
  p,
  h1,
  h2,
  h3,
  pre,
  a,
  form,
  label,
  Show,
  For,
  text,
} from "../../web/src/framework/elements";

// Helper to create a container for DOM tests
let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
});

describe("h (element creator)", () => {
  test("creates element with tag name", () => {
    const el = h("div");
    expect(el.tagName).toBe("DIV");
  });

  test("creates element with props", () => {
    const el = h("div", { id: "test", class: "container" });
    expect(el.id).toBe("test");
    expect(el.className).toBe("container");
  });

  test("creates element with children", () => {
    const el = h("div", {}, [h("span"), h("p")]);
    expect(el.children.length).toBe(2);
    expect(el.children[0].tagName).toBe("SPAN");
    expect(el.children[1].tagName).toBe("P");
  });

  test("handles string children as text nodes", () => {
    const el = h("div", {}, ["Hello"]);
    expect(el.textContent).toBe("Hello");
  });

  test("handles number children as text nodes", () => {
    const el = h("div", {}, [42]);
    expect(el.textContent).toBe("42");
  });

  test("handles mixed children", () => {
    const el = h("div", {}, ["Text", h("span", {}, ["Inner"]), 123]);
    expect(el.childNodes.length).toBe(3);
    expect(el.textContent).toBe("TextInner123");
  });

  test("handles null/undefined children gracefully", () => {
    const el = h("div", {}, [null, undefined, "text", null]);
    expect(el.textContent).toBe("text");
  });

  test("attaches event handlers", () => {
    const onClick = mock(() => {});
    const el = h("button", { onClick });
    el.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("handles data attributes", () => {
    const el = h("div", { "data-action": "submit", "data-id": "123" });
    expect(el.getAttribute("data-action")).toBe("submit");
    expect(el.getAttribute("data-id")).toBe("123");
  });

  test("handles boolean attributes", () => {
    const el = h("input", { disabled: true, readonly: false });
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(el.hasAttribute("readonly")).toBe(false);
  });

  test("handles style object", () => {
    const el = h("div", { style: { color: "red", fontSize: "14px" } });
    expect(el.style.color).toBe("red");
    expect(el.style.fontSize).toBe("14px");
  });
});

describe("element helpers", () => {
  test("div creates div element", () => {
    const el = div({ class: "test" }, ["content"]);
    expect(el.tagName).toBe("DIV");
    expect(el.className).toBe("test");
    expect(el.textContent).toBe("content");
  });

  test("span creates span element", () => {
    const el = span({}, ["text"]);
    expect(el.tagName).toBe("SPAN");
  });

  test("button creates button element", () => {
    const el = button({ type: "submit" }, ["Click"]);
    expect(el.tagName).toBe("BUTTON");
    expect(el.getAttribute("type")).toBe("submit");
  });

  test("input creates input element", () => {
    const el = input({ type: "text", value: "test" });
    expect(el.tagName).toBe("INPUT");
    expect((el as HTMLInputElement).type).toBe("text");
    expect((el as HTMLInputElement).value).toBe("test");
  });

  test("textarea creates textarea element", () => {
    const el = textarea({ rows: "5" }, ["content"]);
    expect(el.tagName).toBe("TEXTAREA");
  });

  test("heading helpers work", () => {
    expect(h1({}, ["Title"]).tagName).toBe("H1");
    expect(h2({}, ["Title"]).tagName).toBe("H2");
    expect(h3({}, ["Title"]).tagName).toBe("H3");
  });

  test("p creates paragraph", () => {
    expect(p({}, ["text"]).tagName).toBe("P");
  });

  test("pre creates pre element", () => {
    expect(pre({}, ["code"]).tagName).toBe("PRE");
  });

  test("a creates anchor element", () => {
    const el = a({ href: "/test" }, ["Link"]);
    expect(el.tagName).toBe("A");
    expect(el.getAttribute("href")).toBe("/test");
  });

  test("form creates form element", () => {
    expect(form({}, []).tagName).toBe("FORM");
  });

  test("label creates label element", () => {
    expect(label({ for: "input-id" }, ["Label"]).tagName).toBe("LABEL");
  });
});

describe("reactive props", () => {
  test("function prop updates when signal changes", () => {
    const [count, setCount] = signal(0);
    const el = div({ class: () => `count-${count()}` });

    expect(el.className).toBe("count-0");

    setCount(5);
    expect(el.className).toBe("count-5");
  });

  test("reactive disabled prop", () => {
    const [disabled, setDisabled] = signal(false);
    const el = button({ disabled: () => disabled() }, ["Click"]);

    expect(el.hasAttribute("disabled")).toBe(false);

    setDisabled(true);
    expect(el.hasAttribute("disabled")).toBe(true);

    setDisabled(false);
    expect(el.hasAttribute("disabled")).toBe(false);
  });

  test("reactive text content", () => {
    const [msg, setMsg] = signal("Hello");
    const el = div({}, [() => msg()]);

    expect(el.textContent).toBe("Hello");

    setMsg("World");
    expect(el.textContent).toBe("World");
  });

  test("reactive children update correctly", () => {
    const [count, setCount] = signal(1);
    const el = div({}, [span({}, ["Count: "]), () => String(count())]);

    expect(el.textContent).toBe("Count: 1");

    setCount(42);
    expect(el.textContent).toBe("Count: 42");
  });
});

describe("text helper", () => {
  test("creates text node", () => {
    const node = text("Hello");
    expect(node.nodeType).toBe(Node.TEXT_NODE);
    expect(node.textContent).toBe("Hello");
  });
});

describe("Show", () => {
  test("renders truthy branch when condition is true", () => {
    const el = Show(
      () => true,
      () => span({}, ["Visible"]),
    );

    container.appendChild(el);
    expect(container.textContent).toBe("Visible");
  });

  test("renders falsy branch when condition is false", () => {
    const el = Show(
      () => false,
      () => span({}, ["Visible"]),
      () => span({}, ["Hidden"]),
    );

    container.appendChild(el);
    expect(container.textContent).toBe("Hidden");
  });

  test("renders nothing when condition is false and no fallback", () => {
    const el = Show(
      () => false,
      () => span({}, ["Visible"]),
    );

    container.appendChild(el);
    expect(container.textContent).toBe("");
  });

  test("swaps content when condition changes", () => {
    const [visible, setVisible] = signal(true);

    const el = Show(
      () => visible(),
      () => span({}, ["Visible"]),
      () => span({}, ["Hidden"]),
    );

    container.appendChild(el);
    expect(container.textContent).toBe("Visible");

    setVisible(false);
    expect(container.textContent).toBe("Hidden");

    setVisible(true);
    expect(container.textContent).toBe("Visible");
  });

  test("handles reactive content in branches", () => {
    const [show, setShow] = signal(true);
    const [count, setCount] = signal(0);

    const el = Show(
      () => show(),
      () => span({}, [() => `Count: ${count()}`]),
    );

    container.appendChild(el);
    expect(container.textContent).toBe("Count: 0");

    setCount(5);
    expect(container.textContent).toBe("Count: 5");

    setShow(false);
    expect(container.textContent).toBe("");

    setShow(true);
    // After re-showing, should still be reactive
    expect(container.textContent).toBe("Count: 5");
  });
});

describe("For", () => {
  test("renders list of items", () => {
    const [items] = signal([1, 2, 3]);

    const el = For(items, (item) => span({}, [String(item)]));

    container.appendChild(el);
    expect(container.textContent).toBe("123");
  });

  test("updates when items change", () => {
    const [items, setItems] = signal([1, 2, 3]);

    const el = For(items, (item) => span({}, [String(item)]));

    container.appendChild(el);
    expect(container.textContent).toBe("123");

    setItems([4, 5]);
    expect(container.textContent).toBe("45");
  });

  test("handles empty array", () => {
    const [items] = signal<number[]>([]);

    const el = For(items, (item) => span({}, [String(item)]));

    container.appendChild(el);
    expect(container.textContent).toBe("");
  });

  test("provides index to render function", () => {
    const [items] = signal(["a", "b", "c"]);

    const el = For(items, (item, index) => span({}, [`${index()}:${item}`]));

    container.appendChild(el);
    expect(container.textContent).toBe("0:a1:b2:c");
  });

  test("handles items added to end", () => {
    const [items, setItems] = signal([1, 2]);

    const el = For(items, (item) => span({}, [String(item)]));

    container.appendChild(el);
    expect(container.textContent).toBe("12");

    setItems([1, 2, 3, 4]);
    expect(container.textContent).toBe("1234");
  });

  test("handles items removed from end", () => {
    const [items, setItems] = signal([1, 2, 3, 4]);

    const el = For(items, (item) => span({}, [String(item)]));

    container.appendChild(el);
    expect(container.textContent).toBe("1234");

    setItems([1, 2]);
    expect(container.textContent).toBe("12");
  });

  test("handles complete replacement", () => {
    const [items, setItems] = signal([1, 2, 3]);

    const el = For(items, (item) => span({}, [String(item)]));

    container.appendChild(el);
    expect(container.textContent).toBe("123");

    setItems([7, 8, 9, 10]);
    expect(container.textContent).toBe("78910");
  });

  test("works with object items", () => {
    const [items] = signal([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);

    const el = For(items, (item) => span({}, [item.name]));

    container.appendChild(el);
    expect(container.textContent).toBe("AliceBob");
  });
});
