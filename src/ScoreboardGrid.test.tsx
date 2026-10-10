import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ScoreboardCell,
  ScoreboardGrid,
  ScoreboardRow,
} from "./ScoreboardGrid";
import styles from "./ScoreboardGrid.module.css";

describe("shared native scoreboard grid", () => {
  it("passes through the same native div and span refs without wrappers", () => {
    const gridRef = { current: null };
    const rowRef = () => undefined;
    const cellRef = () => undefined;
    const grid = ScoreboardGrid({
      ref: gridRef,
      children: "grid",
      tabIndex: 0,
    });
    const row = ScoreboardRow({ ref: rowRef, children: "row", header: true });
    const cell = ScoreboardCell({
      ref: cellRef,
      children: "cell",
      status: "accepted",
    });
    expect(grid.type).toBe("div");
    expect(row.type).toBe("div");
    expect(cell.type).toBe("span");
    expect(grid.props.ref).toBe(gridRef);
    expect(row.props.ref).toBe(rowRef);
    expect(cell.props.ref).toBe(cellRef);
    expect(grid.props.tabIndex).toBe(0);
    expect(row.props["data-scoreboard-header"]).toBe(true);
    expect([grid.props.role, row.props.role, cell.props.role]).toEqual([
      "table",
      "row",
      "cell",
    ]);
  });

  it("owns shared row/cell states while preserving local reveal classes and semantic hooks", () => {
    const markup = renderToStaticMarkup(
      <ScoreboardGrid aria-label="점수 표" style={{ width: "100%" }}>
        <ScoreboardRow
          own
          data-player-id="synthetic"
          className="local-reveal-row"
        >
          <ScoreboardCell
            status="accepted"
            firstSolve
            data-first-solve
            aria-label="첫 정답"
            className="local-reveal-cell"
          >
            4
          </ScoreboardCell>
        </ScoreboardRow>
      </ScoreboardGrid>,
    );
    expect(markup).toContain('aria-label="점수 표"');
    expect(markup).toContain('data-scoreboard-grid="true"');
    expect(markup).toContain('data-player-id="synthetic"');
    expect(markup).toContain(styles.me);
    expect(markup).toContain(styles.accepted);
    expect(markup).toContain(styles["first-solve"]);
    expect(markup).toContain("local-reveal-row");
    expect(markup).toContain("local-reveal-cell");
    expect(markup.match(/<div\b/g)).toHaveLength(2);
    expect(markup.match(/<span\b/g)).toHaveLength(1);
  });

  it.each(["tried", "frozen-attempt", "frozen-with-attempts"])(
    "preserves the %s presentation state",
    (status) => {
      const element = ScoreboardCell({ status });
      expect(element.props.className).toContain(styles[status]);
      expect(element.props.className).not.toContain(styles.accepted);
    },
  );

  it("does not reinterpret a revealed verdict as a live accepted cell", () => {
    const cell = ScoreboardCell({
      status: "revealed-correct",
      className: "local-correct",
    });
    expect(cell.props.className).toBe("local-correct");
  });
  it.each(["reveal", "spotboard"] as const)(
    "owns %s reveal states without changing refs or roles",
    (presentation) => {
      const ref = { current: null };
      const row = ScoreboardRow({
        presentation,
        ref,
        pending: true,
        revealState: "active",
        current: true,
        movedUp: true,
        rankConfirmed: true,
        own: true,
        "aria-label": "선택된 참가자",
      });
      expect(row.type).toBe("div");
      expect(row.props.ref).toBe(ref);
      expect(row.props.role).toBe("row");
      expect(row.props["aria-label"]).toBe("선택된 참가자");
      for (const state of [
        "reveal-row",
        "locked",
        "reveal-row-current",
        "moved-up",
        "reveal-row-rank-confirmed",
        "reveal-own",
      ]) {
        expect(row.props.className).toContain(styles[state]);
      }
      if (presentation === "spotboard") {
        expect(row.props.className).toContain(styles["spotboard-team-row"]);
        expect(row.props.className).not.toContain(styles["domjudge-row"]);
      } else expect(row.props.className).toContain(styles["domjudge-row"]);
      expect(row.props).not.toHaveProperty("pending");
      expect(row.props).not.toHaveProperty("current");
      expect(row.props).not.toHaveProperty("presentation");
    },
  );

  it.each(["span", "strong", "em"] as const)(
    "preserves native %s cells with explicit reveal ownership",
    (as) => {
      const ref = { current: null };
      const cell = ScoreboardCell({
        as,
        ref,
        presentation: "reveal",
        column: "problem",
        status: "revealed-correct",
        active: true,
        firstSolve: true,
        role: "columnheader",
      });
      expect(cell.type).toBe(as);
      expect(cell.props.ref).toBe(ref);
      expect(cell.props.role).toBe("columnheader");
      for (const state of [
        "reveal-cell",
        "reveal-problem-cell",
        "revealed-correct",
        "first-solve",
        "active-cell",
      ])
        expect(cell.props.className).toContain(styles[state]);
      expect(cell.props).not.toHaveProperty("column");
      expect(cell.props).not.toHaveProperty("status");
    },
  );

  it("gives the reveal grid and header explicit presentation without participant state", () => {
    expect(
      ScoreboardGrid({ presentation: "reveal" }).props.className,
    ).toContain(styles["reveal-domjudge-board"]);
    const header = ScoreboardRow({ presentation: "reveal", header: true });
    expect(header.props.className).toContain(styles["domjudge-header"]);
    expect(header.props.className).not.toContain(styles.revealed);
    const cell = ScoreboardCell({
      presentation: "reveal",
      header: true,
      column: "rank",
    });
    expect(cell.props.className).toContain(styles["reveal-cell"]);
    expect(cell.props.className).not.toContain(styles["reveal-rank-cell"]);
  });
});
