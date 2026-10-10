import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { BoardRow, RevealEvent } from "./model.js";
import {
  getRevealVisibleScrollLeft,
  makeRevealCellKey,
  scrollElementVerticallyIntoView,
  type RevealAnimationPhase,
} from "./resultsRevealHelpers.js";
import styles from "./ResultsReveal.module.css";

/** Owns scrolling and FLIP row animations, including cancellation on change/unmount. */
export function useRevealBoardMotion({
  currentRevealAnimationKey,
  currentRevealEvent,
  renderAnimationPhase,
  revealBoardRef,
  revealCellRefs,
  revealRowRefs,
  rowsForRender,
  rowMoveMs,
}: {
  currentRevealAnimationKey: string;
  currentRevealEvent: RevealEvent | undefined;
  renderAnimationPhase: RevealAnimationPhase;
  revealBoardRef: RefObject<HTMLDivElement | null>;
  revealCellRefs: RefObject<Map<string, HTMLSpanElement>>;
  revealRowRefs: RefObject<Map<string, HTMLDivElement>>;
  rowsForRender: Readonly<BoardRow[]>;
  rowMoveMs: number;
}) {
  const previousRowOffsetsRef = useRef(new Map<string, number>());
  const rowAnimationsRef = useRef(new Map<string, Animation>());

  useEffect(() => {
    if (!currentRevealEvent) return;
    const board = revealBoardRef.current;
    if (!board) return;
    const cell = revealCellRefs.current.get(
      makeRevealCellKey(
        currentRevealEvent.playerId,
        currentRevealEvent.submission.problemId,
      ),
    );
    if (cell) {
      board.scrollTo({
        left: getRevealVisibleScrollLeft(board, cell),
        behavior: "auto",
      });
    }
    scrollElementVerticallyIntoView(
      revealRowRefs.current.get(currentRevealEvent.playerId),
      board,
      "auto",
    );
  }, [
    currentRevealAnimationKey,
    currentRevealEvent,
    revealBoardRef,
    revealCellRefs,
    revealRowRefs,
  ]);

  useEffect(() => {
    if (renderAnimationPhase !== "moving" || !currentRevealEvent)
      return undefined;
    const board = revealBoardRef.current;
    const row = revealRowRefs.current.get(currentRevealEvent.playerId);
    if (!board || !row) return undefined;

    let frameId = 0;
    const keepActiveRowCentered = () => {
      scrollElementVerticallyIntoView(row, board, "auto");
      frameId = window.requestAnimationFrame(keepActiveRowCentered);
    };
    keepActiveRowCentered();
    return () => window.cancelAnimationFrame(frameId);
  }, [currentRevealEvent, renderAnimationPhase, revealBoardRef, revealRowRefs]);

  useLayoutEffect(() => {
    const cancelRowAnimations = () => {
      for (const [playerId, animation] of rowAnimationsRef.current) {
        animation.cancel();
        revealRowRefs.current
          .get(playerId)
          ?.classList.remove(`${styles["reveal-moving"]}`);
      }
      rowAnimationsRef.current.clear();
    };
    cancelRowAnimations();

    const board = revealBoardRef.current;
    if (!board) return cancelRowAnimations;

    const previousOffsets = previousRowOffsetsRef.current;
    const nextOffsets = new Map<string, number>();
    const boardTop = board.getBoundingClientRect().top;
    const shouldAnimateRows = renderAnimationPhase === "moving";

    for (const row of rowsForRender) {
      const element = revealRowRefs.current.get(row.playerId);
      if (!element) continue;

      const currentOffset =
        element.getBoundingClientRect().top - boardTop + board.scrollTop;
      nextOffsets.set(row.playerId, currentOffset);
      const previousOffset = previousOffsets.get(row.playerId);
      if (!shouldAnimateRows || previousOffset === undefined) continue;

      const delta = previousOffset - currentOffset;
      if (Math.abs(delta) < 1) continue;

      element.classList.add(`${styles["reveal-moving"]}`);
      const animation = element.animate(
        [
          { transform: `translateY(${delta}px)` },
          { transform: "translateY(0)" },
        ],
        {
          duration: rowMoveMs,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "both",
        },
      );
      rowAnimationsRef.current.set(row.playerId, animation);
      void animation.finished.then(
        () => {
          if (rowAnimationsRef.current.get(row.playerId) !== animation) return;
          element.classList.remove(`${styles["reveal-moving"]}`);
          rowAnimationsRef.current.delete(row.playerId);
          animation.cancel();
        },
        () => {
          if (rowAnimationsRef.current.get(row.playerId) !== animation) return;
          element.classList.remove(`${styles["reveal-moving"]}`);
          rowAnimationsRef.current.delete(row.playerId);
        },
      );
    }

    previousRowOffsetsRef.current = nextOffsets;
    return cancelRowAnimations;
  }, [
    revealBoardRef,
    revealRowRefs,
    renderAnimationPhase,
    rowMoveMs,
    rowsForRender,
  ]);
}
