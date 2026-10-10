import { describe, expect, it } from "vitest";
import type { BoardRow } from "./model";
import { makeRevealCellKey } from "./index";

import {
  displayScoreCellPrimary,
  getRevealRowDisplayState,
  updateRevealCellRef,
  updateRevealRowRef,
} from "./index";

const row = { playerId: "player", pendingCount: 0, rankLabel: "2" } as BoardRow;

describe("shared reveal row presentation", () => {
  it.each([
    [{ ...row, pendingCount: 2 }, 0, "player", 0, false, "active"],
    [{ ...row, pendingCount: 1 }, 0, null, -1, true, "pending"],
    [row, 0, null, -1, false, "pending"],
    [{ ...row, rankLabel: "?" }, 0, null, -1, true, "pending"],
    [row, 2, "other", 1, true, "confirmed-below"],
    [row, 0, "other", 1, true, "confirmed"],
    [row, 2, null, -1, true, "confirmed"],
  ] as const)(
    "preserves rank visibility precedence",
    (...[value, index, active, activeIndex, visible, expected]) => {
      expect(
        getRevealRowDisplayState(value, index, active, activeIndex, visible),
      ).toBe(expected);
    },
  );

  it.each([
    ["accepted", "+4", 4, "4"],
    ["revealed-correct", "+3", undefined, "3"],
    ["revealed-correct", "정답", 4, "4"],
    ["revealed-correct", "정답", 0, "정답"],
    ["revealed-correct", "정답", undefined, "정답"],
    ["tried", "+4", 4, "+4"],
    ["frozen", "2회", 4, "2회"],
  ] as const)(
    "formats %s/%s without changing authoritative scores",
    (status, primary, points, expected) => {
      const cell = { status, primary } as BoardRow["cells"][number];
      expect(displayScoreCellPrimary(cell, points)).toBe(expected);
    },
  );

  it("registers and removes row and cell references with the existing keys", () => {
    const rowRefs = { current: new Map<string, HTMLDivElement>() };
    const cellRefs = { current: new Map<string, HTMLSpanElement>() };
    const element = {} as HTMLDivElement;
    const cell = {} as HTMLSpanElement;
    updateRevealRowRef(rowRefs, "player", element);
    updateRevealCellRef(cellRefs, "player", "problem", cell);
    expect(rowRefs.current.get("player")).toBe(element);
    expect(cellRefs.current.get(makeRevealCellKey("player", "problem"))).toBe(
      cell,
    );
    updateRevealRowRef(rowRefs, "player", null);
    updateRevealCellRef(cellRefs, "player", "problem", null);
    expect(rowRefs.current.size).toBe(0);
    expect(cellRefs.current.size).toBe(0);
  });
});
