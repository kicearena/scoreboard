import { readFileSync } from "node:fs";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const rules = new Map<string, Record<string, string>>();
postcss
  .parse(
    readFileSync(new URL("./Controls.module.css", import.meta.url), "utf8"),
  )
  .walkRules((rule) => {
    const declarations: Record<string, string> = {};
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value.replace(/\s+/g, " ");
    });
    rules.set(rule.selector, declarations);
  });

describe("packaged scoreboard control presentation", () => {
  it("preserves the original control focus, transition, wrapping and surface treatment", () => {
    expect(rules.get(".control")).toMatchObject({
      "justify-self": "start",
      transition:
        "background-color 140ms ease, border-color 140ms ease, color 140ms ease",
    });
    expect(rules.get(".control:focus-visible")).toMatchObject({
      outline: "2px solid var(--primary-ink)",
      "outline-offset": "4px",
    });
    expect(rules.get(".secondary")).toMatchObject({
      background: "var(--surface)",
    });
    expect(rules.get(".control")).not.toHaveProperty("white-space");
    expect(rules.get(".control:hover:not(:disabled)")).not.toHaveProperty(
      "background",
    );
  });
});
