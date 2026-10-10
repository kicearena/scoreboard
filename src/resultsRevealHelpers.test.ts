import { describe, expect, it, vi } from "vitest";
import {
  CONTINUING_ATTEMPT_REVEAL_TIMING,
  REVEAL_ANIMATION_DURATION_MS,
  REVEAL_AUTO_ADVANCE_DELAY_MS,
  REVEAL_FOCUS_DURATION_MS,
  REVEAL_POST_SETTLE_PAUSE_MS,
  REVEAL_RANK_CONFIRMATION_DELAY_MS,
  REVEAL_RANK_CONFIRMATION_START_MS,
  REVEAL_ROW_MOVE_DURATION_MS,
  REVEAL_ROW_MOVE_START_MS,
  REVEAL_VERDICT_DURATION_MS,
  LARGE_CONTEST_REVEAL_TIMING,
  STANDARD_REVEAL_TIMING,
  isSameProblemAttemptContinuation,
  revealAnimationDurationForConfirmationCount,
  revealAutoAdvanceDelayForConfirmationCount,
  revealTimingForFinalRankLabel,
  scrollElementVerticallyIntoView,
  shouldAccentCurrentRevealRow,
  shouldShowRevealRank,
} from "./index";
describe("results reveal animation timeline", () => {
  it("keeps verdict reveal, row movement, and rank confirmation in order", () => {
    expect(REVEAL_FOCUS_DURATION_MS).toBeGreaterThan(0);
    expect(REVEAL_VERDICT_DURATION_MS).toBeGreaterThan(
      REVEAL_FOCUS_DURATION_MS,
    );
    expect(REVEAL_ROW_MOVE_START_MS).toBeGreaterThan(
      REVEAL_VERDICT_DURATION_MS,
    );
    expect(REVEAL_RANK_CONFIRMATION_START_MS).toBeGreaterThan(
      REVEAL_ROW_MOVE_START_MS + REVEAL_ROW_MOVE_DURATION_MS,
    );
    expect(REVEAL_RANK_CONFIRMATION_DELAY_MS).toBeGreaterThan(0);
    expect(REVEAL_ANIMATION_DURATION_MS).toBeGreaterThan(
      REVEAL_RANK_CONFIRMATION_START_MS,
    );
  });

  it("leaves a quiet pause before the next automatic reveal", () => {
    expect(REVEAL_AUTO_ADVANCE_DELAY_MS).toBe(
      REVEAL_ANIMATION_DURATION_MS + REVEAL_POST_SETTLE_PAUSE_MS,
    );
  });

  it("gives every newly confirmed rank its own animation interval", () => {
    const oneRank = revealAnimationDurationForConfirmationCount(
      STANDARD_REVEAL_TIMING,
      1,
    );
    const threeRanks = revealAnimationDurationForConfirmationCount(
      STANDARD_REVEAL_TIMING,
      3,
    );

    expect(oneRank).toBe(STANDARD_REVEAL_TIMING.animationMs);
    expect(threeRanks).toBeGreaterThan(oneRank);
    expect(
      revealAutoAdvanceDelayForConfirmationCount(STANDARD_REVEAL_TIMING, 3),
    ).toBe(threeRanks + REVEAL_POST_SETTLE_PAUSE_MS);
  });

  it("moves directly from a failed attempt to the next attempt on the same problem", () => {
    const failedAttempt = {
      playerId: "player-1",
      nickname: "참가자",
      submission: {
        problemId: "problem-1",
        submittedAt: 1,
        attempts: 1,
        visibility: "revealed" as const,
        correct: false,
        scoreAwarded: 0,
        penaltyMs: 0,
      },
      movedToTop: false,
    };
    const acceptedAttempt = {
      ...failedAttempt,
      submission: {
        ...failedAttempt.submission,
        submittedAt: 2,
        attempts: 2,
        correct: true,
      },
    };

    expect(
      isSameProblemAttemptContinuation(failedAttempt, acceptedAttempt),
    ).toBe(true);
    expect(CONTINUING_ATTEMPT_REVEAL_TIMING.rowMoveMs).toBe(0);
    expect(CONTINUING_ATTEMPT_REVEAL_TIMING.autoAdvanceMs).toBeLessThan(
      STANDARD_REVEAL_TIMING.autoAdvanceMs,
    );
    expect(isSameProblemAttemptContinuation(acceptedAttempt, undefined)).toBe(
      false,
    );
  });

  it("uses a readable accelerated step below the top 30 and preserves ties at 30", () => {
    expect(revealTimingForFinalRankLabel("31")).toBe(
      LARGE_CONTEST_REVEAL_TIMING,
    );
    expect(revealTimingForFinalRankLabel("120").autoAdvanceMs).toBe(1_600);
    expect(LARGE_CONTEST_REVEAL_TIMING.rowMoveMs).toBeGreaterThanOrEqual(600);
    expect(LARGE_CONTEST_REVEAL_TIMING.rankConfirmationStartMs).toBeGreaterThan(
      LARGE_CONTEST_REVEAL_TIMING.rowMoveStartMs +
        LARGE_CONTEST_REVEAL_TIMING.rowMoveMs,
    );
    expect(revealTimingForFinalRankLabel("30")).toBe(STANDARD_REVEAL_TIMING);
    expect(revealTimingForFinalRankLabel("30")).toBe(
      revealTimingForFinalRankLabel("30"),
    );
  });

  it("keeps the current reveal row accented until its rank is confirmed", () => {
    for (const revealAnimationPhase of [
      "focusing",
      "revealing",
      "moving",
      "confirming",
      "settling",
      "settled",
    ] as const) {
      expect(
        shouldAccentCurrentRevealRow({
          isCurrentRevealRow: true,
          revealAnimationPhase,
          rankIsVisible: false,
        }),
      ).toBe(true);
    }
    expect(
      shouldAccentCurrentRevealRow({
        isCurrentRevealRow: false,
        revealAnimationPhase: "confirming",
        rankIsVisible: false,
      }),
    ).toBe(false);
    expect(
      shouldAccentCurrentRevealRow({
        isCurrentRevealRow: true,
        revealAnimationPhase: "confirming",
        rankIsVisible: true,
      }),
    ).toBe(false);
  });

  it("keeps newly confirmed ranks hidden until the confirmation phase", () => {
    expect(
      shouldShowRevealRank({
        rowIsPending: false,
        isCurrentRevealRow: false,
        isNewlyConfirmedRank: true,
        rankConfirmationVisible: false,
        revealAnimationPhase: "moving",
      }),
    ).toBe(false);
    expect(
      shouldShowRevealRank({
        rowIsPending: false,
        isCurrentRevealRow: false,
        isNewlyConfirmedRank: true,
        rankConfirmationVisible: true,
        revealAnimationPhase: "confirming",
      }),
    ).toBe(true);
    expect(
      shouldShowRevealRank({
        rowIsPending: false,
        isCurrentRevealRow: false,
        isNewlyConfirmedRank: false,
        rankConfirmationVisible: false,
        revealAnimationPhase: "moving",
      }),
    ).toBe(true);
  });

  it("centers the active row inside the fullscreen scoreboard", () => {
    const scrollTo = vi.fn();
    const container = {
      clientHeight: 500,
      scrollHeight: 2_000,
      scrollTop: 300,
      getBoundingClientRect: () => ({ top: 60 }),
      scrollTo,
    } as unknown as HTMLElement;
    const element = {
      getBoundingClientRect: () => ({ top: 760, height: 100, bottom: 860 }),
    } as unknown as HTMLElement;

    scrollElementVerticallyIntoView(element, container);

    expect(scrollTo).toHaveBeenCalledWith({ top: 800, behavior: "smooth" });
  });

  it("can keep a moving reveal row centered without starting another smooth scroll", () => {
    const scrollTo = vi.fn();
    const container = {
      clientHeight: 500,
      scrollHeight: 2_000,
      scrollTop: 300,
      getBoundingClientRect: () => ({ top: 60 }),
      scrollTo,
    } as unknown as HTMLElement;
    const element = {
      getBoundingClientRect: () => ({ top: 760, height: 100, bottom: 860 }),
    } as unknown as HTMLElement;

    scrollElementVerticallyIntoView(element, container, "auto");

    expect(scrollTo).toHaveBeenCalledWith({ top: 800, behavior: "auto" });
  });
});

describe("reveal semantic measurement hooks", () => {
  it("keeps the reveal grid's two sticky columns distinct from the practice grid", async () => {
    const { findNearestRevealProblemHeader } = await import("./index");
    const header = {
      children: [53, 220, 73, 86].map((offsetWidth) => ({ offsetWidth })),
    };
    const problemHeaders = [
      { offsetLeft: 273, offsetWidth: 100 },
      { offsetLeft: 373, offsetWidth: 100 },
    ];
    const seen: string[] = [];
    const board = {
      scrollLeft: 0,
      clientWidth: 500,
      querySelector: (selector: string) => {
        seen.push(selector);
        return header;
      },
      querySelectorAll: (selector: string) => {
        seen.push(selector);
        return problemHeaders;
      },
    } as unknown as HTMLElement;
    expect(findNearestRevealProblemHeader(board)).toBe(problemHeaders[1]);
    expect(seen).toEqual([
      "[data-scoreboard-header]",
      "[data-scoreboard-header] [data-score-problem-id]",
    ]);
  });
});
