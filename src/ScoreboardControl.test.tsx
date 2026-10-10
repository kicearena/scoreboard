import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScoreboardControl } from "./Controls";
import { ScoreboardProblemNavigator } from "./Controls";

describe("scoreboard-owned controls", () => {
  it("keeps disabled actions as native buttons with an explicit accessible name", () => {
    const markup = renderToStaticMarkup(
      <ScoreboardControl control="icon" aria-label="스코어보드 갱신" disabled>
        새로고침
      </ScoreboardControl>,
    );
    expect(markup).toContain("<button");
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="스코어보드 갱신"');
    expect(markup).toContain('disabled=""');
  });
  it("preserves current-page semantics without changing the selected value", () => {
    const markup = renderToStaticMarkup(
      <ScoreboardControl control="page" aria-current="page">
        3
      </ScoreboardControl>,
    );
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain(">3</button>");
  });
  it("exposes every real problem and the focused column", () => {
    const markup = renderToStaticMarkup(
      <ScoreboardProblemNavigator
        problems={[
          { id: "a", number: 2 },
          { id: "b", number: 7 },
        ]}
        focusedProblemId="b"
        onFocus={() => undefined}
      />,
    );
    expect(markup).toContain('aria-label="P2 문제 열 보기"');
    expect(markup).toContain('aria-label="P7 문제 열 보기"');
    expect(markup.match(/aria-pressed="true"/g)?.length).toBe(1);
    expect(markup.match(/aria-pressed="false"/g)?.length).toBe(1);
  });
});
