import { describe, expect, it } from "vitest";
import { firstSolveTimes } from "./scoreboardPresentation";

describe("scoreboard first solves", () => {
  it("uses the earliest visible accepted time for each problem", () => {
    expect([
      ...firstSolveTimes([
        { problemId: "one", acceptedAt: 120 },
        { problemId: "two", acceptedAt: 90 },
        { problemId: "one", acceptedAt: 80 },
      ]),
    ]).toEqual([
      ["one", 80],
      ["two", 90],
    ]);
  });
});
