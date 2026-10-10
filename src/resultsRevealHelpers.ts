import type { BoardRow as RevealBoardRow, RevealEvent } from "./model.js";
export type RevealAnimationPhase =
  | "idle"
  | "focusing"
  | "revealing"
  | "moving"
  | "confirming"
  | "settling"
  | "settled";

/**
 * Spotboard's award flow gives the selected row a short moment of focus before
 * flipping the run. Keeping these stages explicit prevents the score, tile,
 * and row order from changing in the same paint.
 */
export const REVEAL_FOCUS_DURATION_MS = 420;
export const REVEAL_ROW_MOVE_DURATION_MS = 760;
export const REVEAL_VERDICT_DURATION_MS = 700;
export const REVEAL_MOVE_DELAY_MS = 140;
export const REVEAL_RANK_CONFIRMATION_DELAY_MS = 160;
export const REVEAL_RANK_CONFIRMATION_DURATION_MS = 300;
export const REVEAL_RANK_CONFIRMATION_GAP_MS = 240;
export const REVEAL_POST_SETTLE_PAUSE_MS = 480;
export const REVEAL_FIRST_ADVANCE_DELAY_MS = 700;
export const REVEAL_ROW_MOVE_START_MS =
  REVEAL_FOCUS_DURATION_MS + REVEAL_VERDICT_DURATION_MS + REVEAL_MOVE_DELAY_MS;
export const REVEAL_RANK_CONFIRMATION_START_MS =
  REVEAL_ROW_MOVE_START_MS +
  REVEAL_ROW_MOVE_DURATION_MS +
  REVEAL_RANK_CONFIRMATION_DELAY_MS;
export const REVEAL_ANIMATION_DURATION_MS =
  REVEAL_RANK_CONFIRMATION_START_MS + REVEAL_RANK_CONFIRMATION_DURATION_MS;
export const REVEAL_AUTO_ADVANCE_DELAY_MS =
  REVEAL_ANIMATION_DURATION_MS + REVEAL_POST_SETTLE_PAUSE_MS;

export type RevealTiming = {
  focusMs: number;
  rowMoveStartMs: number;
  rankConfirmationStartMs: number;
  animationMs: number;
  rowMoveMs: number;
  verdictMs: number;
  rankConfirmationMs: number;
  firstAdvanceMs: number;
  autoAdvanceMs: number;
};

export const STANDARD_REVEAL_TIMING: RevealTiming = {
  focusMs: REVEAL_FOCUS_DURATION_MS,
  rowMoveStartMs: REVEAL_ROW_MOVE_START_MS,
  rankConfirmationStartMs: REVEAL_RANK_CONFIRMATION_START_MS,
  animationMs: REVEAL_ANIMATION_DURATION_MS,
  rowMoveMs: REVEAL_ROW_MOVE_DURATION_MS,
  verdictMs: REVEAL_VERDICT_DURATION_MS,
  rankConfirmationMs: REVEAL_RANK_CONFIRMATION_DURATION_MS,
  firstAdvanceMs: REVEAL_FIRST_ADVANCE_DELAY_MS,
  autoAdvanceMs: REVEAL_AUTO_ADVANCE_DELAY_MS,
};

export const LARGE_CONTEST_REVEAL_TIMING: RevealTiming = {
  focusMs: 180,
  rowMoveStartMs: 460,
  rankConfirmationStartMs: 1_160,
  animationMs: 1_340,
  rowMoveMs: 620,
  verdictMs: 280,
  rankConfirmationMs: 180,
  firstAdvanceMs: 900,
  autoAdvanceMs: 1_600,
};

export const CONTINUING_ATTEMPT_REVEAL_TIMING: RevealTiming = {
  focusMs: 300,
  rowMoveStartMs: 1_000,
  rankConfirmationStartMs: 1_000,
  animationMs: 1_000,
  rowMoveMs: 0,
  verdictMs: 700,
  rankConfirmationMs: REVEAL_RANK_CONFIRMATION_DURATION_MS,
  firstAdvanceMs: REVEAL_FIRST_ADVANCE_DELAY_MS,
  autoAdvanceMs: 1_280,
};

export function revealTimingForFinalRankLabel(
  rankLabel: string | undefined,
): RevealTiming {
  const rank = Number(rankLabel);
  return Number.isFinite(rank) && rank >= 31
    ? LARGE_CONTEST_REVEAL_TIMING
    : STANDARD_REVEAL_TIMING;
}

export function isSameProblemAttemptContinuation(
  currentEvent: RevealEvent | undefined,
  nextEvent: RevealEvent | undefined,
) {
  return Boolean(
    currentEvent &&
    nextEvent &&
    !currentEvent.submission.correct &&
    currentEvent.playerId === nextEvent.playerId &&
    currentEvent.submission.problemId === nextEvent.submission.problemId &&
    nextEvent.submission.attempts > currentEvent.submission.attempts,
  );
}

export function revealAnimationDurationForConfirmationCount(
  timing: RevealTiming,
  confirmationCount: number,
) {
  return (
    timing.animationMs +
    Math.max(0, confirmationCount - 1) *
      (timing.rankConfirmationMs + REVEAL_RANK_CONFIRMATION_GAP_MS)
  );
}

export function revealAutoAdvanceDelayForConfirmationCount(
  timing: RevealTiming,
  confirmationCount: number,
) {
  return (
    revealAnimationDurationForConfirmationCount(timing, confirmationCount) +
    (timing.autoAdvanceMs - timing.animationMs)
  );
}

export function makeVerdictRevealRows({
  previousRows,
  nextRows,
  playerId,
  problemId,
}: {
  previousRows: readonly RevealBoardRow[];
  nextRows: readonly RevealBoardRow[];
  playerId: string | undefined;
  problemId: string | undefined;
}) {
  if (!playerId || !problemId) return previousRows;
  const nextRow = nextRows.find((row) => row.playerId === playerId);
  const previousRowExists = previousRows.some(
    (row) => row.playerId === playerId,
  );
  if (!nextRow || !previousRowExists) return nextRows;
  const nextCell = nextRow.cells.find((cell) => cell.problemId === problemId);

  return previousRows.map((row) => {
    if (row.playerId !== playerId) return row;
    return {
      ...row,
      cells: row.cells.map((cell) =>
        cell.problemId === problemId && nextCell ? nextCell : cell,
      ),
    };
  });
}

export function findNewlyConfirmedPlayerIds({
  previousRows,
  nextRows,
}: {
  previousRows: readonly RevealBoardRow[];
  nextRows: readonly RevealBoardRow[];
}) {
  const previousRankByPlayerId = new Map(
    previousRows.map((row) => [row.playerId, row.rankLabel]),
  );

  return nextRows
    .filter(
      (row) =>
        row.pendingCount === 0 &&
        row.rankLabel !== "?" &&
        previousRankByPlayerId.get(row.playerId) === "?",
    )
    .map((row) => row.playerId);
}

export function makeRankConfirmationQueue({
  previousRows,
  nextRows,
}: {
  previousRows: readonly RevealBoardRow[];
  nextRows: readonly RevealBoardRow[];
}) {
  return findNewlyConfirmedPlayerIds({ previousRows, nextRows }).reverse();
}

export function shouldShowRevealRank({
  rowIsPending,
  isCurrentRevealRow,
  isNewlyConfirmedRank,
  rankConfirmationVisible,
  revealAnimationPhase,
}: {
  rowIsPending: boolean;
  isCurrentRevealRow: boolean;
  isNewlyConfirmedRank: boolean;
  rankConfirmationVisible: boolean;
  revealAnimationPhase: RevealAnimationPhase;
}) {
  if (rowIsPending) return false;
  if (isNewlyConfirmedRank) return rankConfirmationVisible;
  const confirmationStarted =
    revealAnimationPhase === "confirming" || revealAnimationPhase === "settled";
  return confirmationStarted || !isCurrentRevealRow;
}

export function shouldAccentCurrentRevealRow({
  isCurrentRevealRow,
  revealAnimationPhase,
  rankIsVisible,
}: {
  isCurrentRevealRow: boolean;
  revealAnimationPhase: RevealAnimationPhase;
  rankIsVisible: boolean;
}) {
  if (!isCurrentRevealRow || rankIsVisible) return false;
  return revealAnimationPhase !== "idle";
}

export function makeRevealCellKey(playerId: string, problemId: string) {
  return `${playerId}:${problemId}`;
}

export function getRevealProblemScrollLeft(
  board: HTMLElement,
  target: HTMLElement,
) {
  const stickyWidth = readRevealStickyWidth(board);
  const availableWidth = Math.max(
    target.offsetWidth,
    board.clientWidth - stickyWidth,
  );
  const centeredLeft =
    target.offsetLeft - stickyWidth - (availableWidth - target.offsetWidth) / 2;
  const fullyVisibleRightLeft =
    target.offsetLeft + target.offsetWidth - board.clientWidth + 8;
  const fullyVisibleLeftLimit = target.offsetLeft - stickyWidth - 4;
  const maxLeft = Math.max(0, board.scrollWidth - board.clientWidth);
  const visibleLeft = Math.min(
    fullyVisibleLeftLimit,
    Math.max(fullyVisibleRightLeft, centeredLeft),
  );
  return Math.min(maxLeft, Math.max(0, visibleLeft));
}

export function getRevealVisibleScrollLeft(
  board: HTMLElement,
  target: HTMLElement,
) {
  const stickyWidth = readRevealStickyWidth(board);
  const padding = 8;
  const targetLeft = target.offsetLeft;
  const targetRight = target.offsetLeft + target.offsetWidth;
  const maxLeft = Math.max(0, board.scrollWidth - board.clientWidth);
  let nextLeft = board.scrollLeft;

  if (targetRight - nextLeft > board.clientWidth - padding) {
    nextLeft = targetRight - board.clientWidth + padding;
  }
  if (targetLeft - nextLeft < stickyWidth + padding) {
    nextLeft = targetLeft - stickyWidth - padding;
  }

  return Math.min(maxLeft, Math.max(0, nextLeft));
}

export function getRevealRectAdjustedScrollLeft(
  board: HTMLElement,
  target: HTMLElement,
) {
  const header = board.querySelector<HTMLElement>("[data-scoreboard-header]");
  const stickyAnchor = header?.children[1] as HTMLElement | undefined;
  const boardRect = board.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const stickyRight =
    stickyAnchor?.getBoundingClientRect().right ?? boardRect.left;
  const maxLeft = Math.max(0, board.scrollWidth - board.clientWidth);
  const padding = 8;
  let nextLeft = board.scrollLeft;

  if (targetRect.right > boardRect.right - padding) {
    nextLeft += targetRect.right - boardRect.right + padding;
  }
  if (targetRect.left < stickyRight + padding) {
    nextLeft -= stickyRight + padding - targetRect.left;
  }

  return Math.min(maxLeft, Math.max(0, nextLeft));
}

export function findNearestRevealProblemHeader(board: HTMLElement) {
  const stickyWidth = readRevealStickyWidth(board);
  const headers = Array.from(
    board.querySelectorAll<HTMLElement>(
      "[data-scoreboard-header] [data-score-problem-id]",
    ),
  );
  if (headers.length === 0) return null;
  const visibleCenter =
    board.scrollLeft +
    stickyWidth +
    Math.max(0, board.clientWidth - stickyWidth) / 2;
  return headers.reduce((nearest, header) => {
    const nearestCenter = nearest.offsetLeft + nearest.offsetWidth / 2;
    const headerCenter = header.offsetLeft + header.offsetWidth / 2;
    return Math.abs(headerCenter - visibleCenter) <
      Math.abs(nearestCenter - visibleCenter)
      ? header
      : nearest;
  }, headers[0]);
}

export function scrollElementVerticallyIntoView(
  element: HTMLElement | undefined,
  scrollContainer?: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  if (!element) return;
  if (
    scrollContainer &&
    scrollContainer.scrollHeight > scrollContainer.clientHeight
  ) {
    const elementRect = element.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const centeredTop =
      scrollContainer.scrollTop +
      elementRect.top -
      containerRect.top -
      (scrollContainer.clientHeight - elementRect.height) / 2;
    const maxTop = Math.max(
      0,
      scrollContainer.scrollHeight - scrollContainer.clientHeight,
    );
    const nextTop = Math.min(maxTop, Math.max(0, centeredTop));
    if (Math.abs(nextTop - scrollContainer.scrollTop) > 1) {
      scrollContainer.scrollTo({ top: nextTop, behavior });
    }
    return;
  }
  const rect = element.getBoundingClientRect();
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;
  if (rect.top < 0) {
    window.scrollBy({ top: rect.top - 12, behavior });
    return;
  }
  if (rect.bottom > viewportHeight) {
    window.scrollBy({ top: rect.bottom - viewportHeight + 12, behavior });
  }
}

function readRevealStickyWidth(board: HTMLElement) {
  const header = board.querySelector<HTMLElement>("[data-scoreboard-header]");
  if (!header) return 0;
  return Array.from(header.children)
    .slice(0, 2)
    .reduce((sum, child) => sum + (child as HTMLElement).offsetWidth, 0);
}
