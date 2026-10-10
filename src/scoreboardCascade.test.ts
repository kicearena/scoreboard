import { readFileSync } from "node:fs";
import { transform, type Selector, type SelectorComponent } from "lightningcss";
import postcss, { type AnyNode } from "postcss";
import { describe, expect, it } from "vitest";

type Owner = "shared" | "reveal";
type Element = {
  tag: string;
  classes: string[];
  parent?: Element;
  index: number;
  attributes?: string[];
  attributeValues?: Record<string, string>;
  pseudo?: "before" | "after";
};
type CascadeRule = {
  owner: Owner;
  selector: Selector;
  weight: number;
  maxWidth: number;
  declarations: { prop: string; value: string; important: boolean }[];
};

function specificity(selector: Selector): number {
  return selector.reduce((sum, part) => {
    if (part.type === "id") return sum + 10_000;
    if (part.type === "type" || part.type === "pseudo-element") return sum + 1;
    if (part.type === "class" || part.type === "attribute") return sum + 100;
    if (part.type !== "pseudo-class" || part.kind === "where") return sum;
    if (part.kind === "not" || part.kind === "is") {
      return sum + Math.max(...part.selectors.map(specificity));
    }
    return sum + 100;
  }, 0);
}

function matchesPart(
  part: SelectorComponent,
  element: Element,
  owner: Owner,
): boolean {
  switch (part.type) {
    case "universal":
      return true;
    case "type":
      return part.name === element.tag;
    case "class":
      return element.classes.includes(`${owner}:${part.name}`);
    case "attribute":
      return part.operation
        ? part.operation.operator === "equal" &&
            element.attributeValues?.[part.name] === part.operation.value
        : !!element.attributes?.includes(part.name);
    case "pseudo-element":
      return part.kind === element.pseudo;
    case "pseudo-class":
      if (part.kind === "not") {
        return !part.selectors.some((selector) =>
          matches(selector, element, owner),
        );
      }
      if (part.kind === "first-child") return element.index === 1;
      if (part.kind === "nth-child") {
        const n = (element.index - part.b) / part.a;
        return part.a === 0
          ? element.index === part.b
          : Number.isInteger(n) && n >= 0;
      }
      return false;
    default:
      return false;
  }
}

function matches(selector: Selector, element: Element, owner: Owner): boolean {
  if (
    element.pseudo &&
    !selector.some((part) => part.type === "pseudo-element")
  )
    return false;
  const combinator = selector.reduce(
    (index, part, current) => (part.type === "combinator" ? current : index),
    -1,
  );
  if (
    !selector
      .slice(combinator + 1)
      .every((part) => matchesPart(part, element, owner))
  ) {
    return false;
  }
  if (combinator < 0) return true;
  const relation = selector[combinator];
  const ancestorSelector = selector.slice(0, combinator);
  let ancestor = element.parent;
  while (ancestor) {
    if (matches(ancestorSelector, ancestor, owner)) return true;
    if (relation.type !== "combinator" || relation.value !== "descendant")
      return false;
    ancestor = ancestor.parent;
  }
  return false;
}

function readRules(owner: Owner, path: string): CascadeRule[] {
  const rules: CascadeRule[] = [];
  postcss
    .parse(readFileSync(new URL(path, import.meta.url), "utf8"))
    .walkRules((rule) => {
      let maxWidth = Infinity;
      for (
        let parent: AnyNode | undefined = rule.parent;
        parent;
        parent = parent.parent
      ) {
        if (parent.type !== "atrule") continue;
        if (parent.name !== "media") return;
        const width = parent.params.match(/^\(max-width: (\d+)px\)$/);
        if (!width) return;
        maxWidth = Math.min(maxWidth, Number(width[1]));
      }
      // Use the CSS compiler's selector AST, including :not() and nth-child specificity.
      transform({
        filename: `${owner}.css`,
        code: Buffer.from(`${rule.selector}{--cascade-fixture:1}`),
        visitor: {
          Selector(selector) {
            rules.push({
              owner,
              selector,
              weight: specificity(selector),
              maxWidth,
              declarations: rule.nodes.flatMap((node) =>
                node.type === "decl"
                  ? [
                      {
                        prop: node.prop,
                        value: node.value,
                        important: !!node.important,
                      },
                    ]
                  : [],
              ),
            });
          },
        },
      });
    });
  return rules;
}

const shared = readRules("shared", "./ScoreboardGrid.module.css");
const reveal = readRules("reveal", "./ResultsReveal.module.css");

function declarationsForCascade(prop: string, value: string) {
  const border = prop.match(/^border(?:-(top|right|bottom|left))?$/);
  if (!border) return [[prop, value]];
  const sides = border[1] ? [border[1]] : ["top", "right", "bottom", "left"];
  const [width, style = "none", ...color] = value.split(" ");
  return sides.flatMap((side) => [
    [`border-${side}-width`, width],
    [`border-${side}-style`, style],
    [`border-${side}-color`, color.join(" ") || "currentcolor"],
  ]);
}

function cascade(rules: CascadeRule[], element: Element, width: number) {
  const winners = new Map<string, { value: string; weight: number }>();
  for (const rule of rules) {
    if (width > rule.maxWidth || !matches(rule.selector, element, rule.owner))
      continue;
    for (const declaration of rule.declarations) {
      const weight = rule.weight + (declaration.important ? 1_000_000 : 0);
      for (const [prop, value] of declarationsForCascade(
        declaration.prop,
        declaration.value,
      )) {
        if (weight >= (winners.get(prop)?.weight ?? -1))
          winners.set(prop, { value, weight });
      }
    }
  }
  return Object.fromEntries(
    [...winners].map(([prop, winner]) => [prop, winner.value]),
  );
}

function problemCellClasses(status: string, firstSolve: boolean) {
  return [
    "shared:reveal-cell",
    "shared:reveal-problem-cell",
    `shared:${status}`,
    ...(firstSolve ? ["shared:first-solve"] : []),
  ];
}

function rowPresentation(header: boolean, rowState: string) {
  return {
    classes: [
      "shared:domjudge-row",
      "shared:reveal-row",
      ...(!header ? [`shared:${rowState}`] : []),
      ...(header ? ["shared:domjudge-header"] : []),
      ...(rowState === "mine" && !header ? ["shared:reveal-own"] : []),
    ],
    attributes: !header && rowState === "mine" ? ["data-mine"] : [],
  };
}

function fixture(
  status: string,
  firstSolve: boolean,
  rowState: string,
  header = false,
) {
  const nodes: Element[] = [];
  const node = (
    tag: string,
    classes: string[],
    parent?: Element,
    index = 1,
  ) => {
    const element: Element = { tag, classes, parent, index };
    nodes.push(element);
    return element;
  };
  const page = node("div", ["reveal:contest-scoreboard-page"]);
  const board = node(
    "div",
    ["shared:domjudge-board", "shared:reveal-domjudge-board"],
    page,
  );
  const presentation = rowPresentation(header, rowState);
  const row = node("div", presentation.classes, board);
  row.attributes = presentation.attributes;
  for (let index = 1; index <= 10; index++) {
    const problem = index > 4;
    const cell = node(
      index === 2 ? "strong" : index === 3 ? "em" : "span",
      problem && !header
        ? problemCellClasses(status, firstSolve)
        : index === 1 && !header
          ? ["shared:reveal-cell", "shared:reveal-rank-cell"]
          : ["shared:reveal-cell"],
      row,
      index,
    );
    if (index === 1 && !header) node("b", ["reveal:reveal-rank-value"], cell);
    if (!problem) continue;
    const content = header
      ? cell
      : node(
          "span",
          [
            "reveal:reveal-problem-cell-content",
            `reveal:${status}`,
            ...(firstSolve ? ["reveal:first-solve"] : []),
          ],
          cell,
        );
    if (!header) node("b", [], content);
    node("small", header ? ["reveal:reveal-header-points"] : [], content, 2);
  }
  return nodes;
}

const rowCases = [
  {
    pending: true,
    state: "pending",
    current: false,
    own: false,
    moved: false,
    phase: "idle",
  },
  {
    pending: false,
    state: "active",
    current: true,
    own: false,
    moved: true,
    phase: "moving",
  },
  {
    pending: false,
    state: "confirmed",
    current: false,
    own: true,
    moved: false,
    phase: "confirming",
  },
  {
    pending: false,
    state: "confirmed-below",
    current: false,
    own: false,
    moved: false,
    phase: "idle",
  },
  {
    pending: true,
    state: "active",
    current: true,
    own: true,
    moved: false,
    phase: "focusing",
  },
  {
    pending: false,
    state: "active",
    current: false,
    own: false,
    moved: false,
    phase: "revealing",
  },
] as const;
type RowCase = (typeof rowCases)[number];

function stateClasses(state: RowCase) {
  return [
    "shared:reveal-row",
    "reveal:reveal-row",
    state.pending ? "shared:locked" : "shared:revealed",
    `shared:reveal-row-${state.state}`,
    ...(state.current ? ["shared:reveal-row-current"] : []),
    ...(state.own ? ["shared:reveal-own"] : []),
    ...(state.moved ? ["shared:moved-up"] : []),
    ...(state.phase !== "idle" ? [`reveal:reveal-row-${state.phase}`] : []),
    ...(state.phase === "confirming"
      ? ["shared:reveal-row-rank-confirmed"]
      : []),
  ];
}

function compoundFixture(status: string, firstSolve: boolean, state: RowCase) {
  const nodes = fixture(status, firstSolve, "revealed");
  const row = nodes[2];
  row.classes = ["shared:domjudge-row", ...stateClasses(state)];
  row.attributes = state.own ? ["data-mine"] : [];
  const cells = nodes.filter((node) => node.parent === row);
  cells[1].classes.push("shared:reveal-player-cell");
  cells[3].classes.push("shared:reveal-time-cell");
  nodes.push({
    tag: "sub",
    classes: ["reveal:reveal-time-annotation"],
    parent: cells[3],
    index: 2,
  });
  if (state.phase === "revealing") {
    for (const element of nodes) {
      if (element.classes.includes("shared:reveal-problem-cell"))
        element.classes.push("shared:active-cell");
      if (element.classes.includes("reveal:reveal-problem-cell-content"))
        element.classes.push("reveal:active-cell");
    }
  }
  nodes.push({ ...cells[0], pseudo: "after" });
  return nodes;
}

function spotboardFixture(status: string, firstSolve: boolean, state: RowCase) {
  const nodes: Element[] = [];
  const node = (
    tag: string,
    classes: string[],
    parent?: Element,
    index = 1,
  ) => {
    const element: Element = { tag, classes, parent, index };
    nodes.push(element);
    return element;
  };
  const page = node("div", [
    "reveal:contest-scoreboard-page",
    "reveal:spotboard-display",
  ]);
  const list = node("div", ["reveal:spotboard-team-list"], page);
  const row = node(
    "div",
    ["shared:spotboard-team-row", ...stateClasses(state)],
    list,
  );
  row.attributes = state.own ? ["data-mine"] : [];
  row.attributeValues = state.own ? { "data-mine": "true" } : {};
  const solved = node(
    "span",
    ["reveal:spotboard-solved-cell", "reveal:first"],
    row,
  );
  const rank = node("span", ["reveal:spotboard-rank-cell"], row, 2);
  node("b", [], rank);
  node("small", [], rank, 2);
  const player = node("strong", ["reveal:spotboard-player-cell"], row, 3);
  node("span", ["reveal:spotboard-player-line"], player);
  node("small", [], player, 2);
  const results = node("div", ["reveal:spotboard-results"], row, 4);
  const cell = node(
    "span",
    [
      "reveal:spotboard-problem-cell",
      `reveal:${status}`,
      ...(firstSolve ? ["reveal:first-solve"] : []),
      "reveal:active-cell",
    ],
    results,
  );
  const face = node("span", ["reveal:spotboard-problem-face"], cell);
  node("b", [], face);
  node("small", [], face, 2);
  const time = node("span", ["reveal:spotboard-penalty-cell"], row, 5);
  node("span", ["reveal:scoreboard-elapsed-time"], time);
  node("sub", [], time, 2);
  nodes.push({ ...solved, pseudo: "after" }, { ...cell, pseudo: "before" });
  return nodes;
}

const widths = [
  390, 419, 420, 421, 599, 600, 601, 639, 640, 641, 759, 760, 761, 768, 799,
  800, 801, 1280, 1440,
];

const states = [
  ["accepted", false],
  ["accepted", true],
  ["tried", false],
  ["frozen", false],
  ["revealed-correct", true],
  ["revealed-wrong", false],
  ["empty", false],
] as const;

const cascadeCases = widths.flatMap((width) =>
  states.map(([status, firstSolve]) => ({ width, status, firstSolve })),
);

describe("scoreboard source-selector cascade (not rendered geometry)", () => {
  it.each(cascadeCases)(
    "preserves every matching declaration at $width px for $status (firstSolve=$firstSolve)",
    ({ width, status, firstSolve }) => {
      for (const rowState of [
        "locked",
        "revealed",
        "reveal-row-pending",
        "reveal-row-current",
        "reveal-row-confirmed",
        "reveal-row-confirmed-below",
        "mine",
      ]) {
        for (const header of [false, true]) {
          for (const element of fixture(status, firstSolve, rowState, header)) {
            const intended = cascade([...shared, ...reveal], element, width);
            expect(
              cascade([...reveal, ...shared], element, width),
              `${status}/${firstSolve}/${rowState}/${header}/${element.tag}/${element.index}`,
            ).toEqual(intended);
          }
        }
      }
    },
  );

  it.each(cascadeCases)(
    "keeps normal and immersive compound states independent at $width px for $status (firstSolve=$firstSolve)",
    ({ width, status, firstSolve }) => {
      for (const build of [compoundFixture, spotboardFixture]) {
        for (const row of rowCases) {
          for (const element of build(status, firstSolve, row)) {
            expect(
              cascade([...reveal, ...shared], element, width),
              `${build.name}/${status}/${row.state}/${row.current}/${row.own}/${element.tag}/${element.pseudo}`,
            ).toEqual(cascade([...shared, ...reveal], element, width));
          }
        }
      }
    },
  );

  it("keeps shared outer-cell selectors out of the results feature stylesheet", () => {
    const css = readFileSync(
      new URL("./ResultsReveal.module.css", import.meta.url),
      "utf8",
    );
    expect(css).not.toMatch(/\.domjudge-(?:board|row|header)\b/);
    expect(css).not.toMatch(
      /\.reveal-(?:rank|player|time|problem)-cell(?!-content)\b/,
    );
    expect(css).not.toMatch(
      /\.reveal-row\.(?:locked|revealed|reveal-row-(?:current|pending|confirmed))\b/,
    );
  });

  it("leaves practice-only class ownership unchanged after visiting results", () => {
    const practice = fixture("accepted", true, "revealed");
    for (const element of practice) {
      element.classes = element.classes.filter(
        (name) =>
          name.startsWith("shared:") &&
          !name.includes(":reveal") &&
          !name.includes(":locked"),
      );
    }
    for (const width of widths) {
      for (const element of practice) {
        const intended = cascade(shared, element, width);
        expect(cascade([...shared, ...reveal], element, width)).toEqual(
          intended,
        );
        expect(cascade([...reveal, ...shared], element, width)).toEqual(
          intended,
        );
      }
    }
  });

  it("pins original verdict, first-solve, border, header and rank winners", () => {
    const rules = [...reveal, ...shared];
    for (const [status, firstSolve] of states.slice(0, 3)) {
      const nodes = fixture(status, firstSolve, "revealed");
      const cell = nodes.find((element) =>
        element.classes.includes("shared:reveal-problem-cell"),
      )!;
      expect(cascade(rules, cell, 1280)).toMatchObject({
        "border-left-width": "0",
        background: "var(--paper)",
        color: firstSolve
          ? "#326e4b"
          : status === "accepted"
            ? "color-mix(in srgb, var(--success-green) 78%, var(--ink))"
            : "color-mix(in srgb, var(--grading-red) 80%, var(--ink))",
      });
      const rank = nodes.find((element) => element.tag === "b")!;
      expect(cascade(rules, rank, 1280)["line-height"]).toBe("1");
    }
    const header = fixture("empty", false, "revealed", true);
    const firstCell = header.find((element) => element.tag === "span")!;
    expect(cascade(rules, firstCell, 1280).background).toBe("#f0f1e9");
  });
});
