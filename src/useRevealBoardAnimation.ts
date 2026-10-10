import { useEffect, useRef, useState } from "react";
import type { BoardRow, RevealEvent } from "./model.js";
import {
  makeRankConfirmationQueue,
  REVEAL_RANK_CONFIRMATION_GAP_MS,
  revealAnimationDurationForConfirmationCount,
  type RevealAnimationPhase,
  type RevealTiming,
} from "./resultsRevealHelpers.js";
type RevealRows = BoardRow[];
type RevealAnimationState = {
  key: string;
  phase: RevealAnimationPhase;
  confirmedRankCount: number;
};

function getRevealAnimationPhaseForRender({
  hasCurrentRevealEvent,
  isCurrentAnimation,
  animationPhase,
}: {
  hasCurrentRevealEvent: boolean;
  isCurrentAnimation: boolean;
  animationPhase: RevealAnimationPhase;
}): RevealAnimationPhase {
  if (!hasCurrentRevealEvent) return "idle";
  if (!isCurrentAnimation) return "focusing";
  return animationPhase;
}

/** Presentation phases only; the reveal controller remains the server-acknowledgment owner. */
export function useRevealBoardAnimation({
  currentRevealEvent,
  revealCount,
  revealRows,
  revealTiming,
}: {
  currentRevealEvent: RevealEvent | undefined;
  revealCount: number;
  revealRows: RevealRows;
  revealTiming: RevealTiming;
}) {
  const currentRevealAnimationKey = currentRevealEvent
    ? `${revealCount}:${currentRevealEvent.playerId}:${currentRevealEvent.submission.problemId}:${currentRevealEvent.submission.submittedAt}`
    : `idle:${revealCount}`;
  const currentRevealProblemId = currentRevealEvent?.submission.problemId;
  const hasCurrentRevealEvent = Boolean(currentRevealEvent);
  const committedRevealRowsRef = useRef(revealRows);
  const newlyConfirmedPlayerIds = makeRankConfirmationQueue({
    previousRows: committedRevealRowsRef.current,
    nextRows: revealRows,
  });
  const confirmationQueueKey = newlyConfirmedPlayerIds.join("\u0000");
  const newlyConfirmedPlayerIdSet = new Set(newlyConfirmedPlayerIds);
  const [animationState, setAnimationState] = useState<RevealAnimationState>(
    () => ({
      key: currentRevealAnimationKey,
      phase: hasCurrentRevealEvent ? "focusing" : "idle",
      confirmedRankCount: 0,
    }),
  );
  const isCurrentAnimation = animationState.key === currentRevealAnimationKey;
  const renderAnimationPhase = getRevealAnimationPhaseForRender({
    hasCurrentRevealEvent,
    isCurrentAnimation,
    animationPhase: animationState.phase,
  });
  const animationSettled =
    !hasCurrentRevealEvent ||
    (isCurrentAnimation && animationState.phase === "settled");
  const visibleConfirmedPlayerIds = new Set(
    newlyConfirmedPlayerIds.slice(
      0,
      isCurrentAnimation ? animationState.confirmedRankCount : 0,
    ),
  );
  const confirmationPlayerId =
    renderAnimationPhase === "confirming"
      ? (newlyConfirmedPlayerIds[animationState.confirmedRankCount - 1] ?? null)
      : null;
  useEffect(() => {
    if (!hasCurrentRevealEvent) {
      setAnimationState({
        key: currentRevealAnimationKey,
        phase: "idle",
        confirmedRankCount: 0,
      });
      return undefined;
    }

    setAnimationState({
      key: currentRevealAnimationKey,
      phase: "focusing",
      confirmedRankCount: 0,
    });
    const verdictTimer = window.setTimeout(() => {
      setAnimationState((current) =>
        current.key === currentRevealAnimationKey
          ? { ...current, phase: "revealing" }
          : current,
      );
    }, revealTiming.focusMs);
    const movementTimer = window.setTimeout(() => {
      setAnimationState((current) =>
        current.key === currentRevealAnimationKey
          ? { ...current, phase: "moving" }
          : current,
      );
    }, revealTiming.rowMoveStartMs);
    const confirmationPlayerIds = confirmationQueueKey
      ? confirmationQueueKey.split("\u0000")
      : [];
    const rankConfirmationTimers = confirmationPlayerIds.map((_, index) =>
      window.setTimeout(
        () => {
          setAnimationState((current) =>
            current.key === currentRevealAnimationKey
              ? {
                  ...current,
                  phase: "confirming",
                  confirmedRankCount: index + 1,
                }
              : current,
          );
        },
        revealTiming.rankConfirmationStartMs +
          index *
            (revealTiming.rankConfirmationMs + REVEAL_RANK_CONFIRMATION_GAP_MS),
      ),
    );
    const settlingTimer = window.setTimeout(
      () => {
        setAnimationState((current) =>
          current.key === currentRevealAnimationKey
            ? { ...current, phase: "settling" }
            : current,
        );
      },
      confirmationPlayerIds.length > 0
        ? revealTiming.rankConfirmationStartMs +
            confirmationPlayerIds.length *
              (revealTiming.rankConfirmationMs +
                REVEAL_RANK_CONFIRMATION_GAP_MS) -
            REVEAL_RANK_CONFIRMATION_GAP_MS
        : revealTiming.rankConfirmationStartMs,
    );
    const settledTimer = window.setTimeout(
      () => {
        setAnimationState((current) =>
          current.key === currentRevealAnimationKey
            ? {
                ...current,
                phase: "settled",
                confirmedRankCount: confirmationPlayerIds.length,
              }
            : current,
        );
      },
      revealAnimationDurationForConfirmationCount(
        revealTiming,
        confirmationPlayerIds.length,
      ),
    );

    return () => {
      window.clearTimeout(verdictTimer);
      window.clearTimeout(movementTimer);
      rankConfirmationTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(settlingTimer);
      window.clearTimeout(settledTimer);
    };
  }, [
    confirmationQueueKey,
    currentRevealAnimationKey,
    hasCurrentRevealEvent,
    revealTiming.animationMs,
    revealTiming.focusMs,
    revealTiming.rankConfirmationMs,
    revealTiming.rankConfirmationStartMs,
    revealTiming.rowMoveStartMs,
  ]);

  useEffect(() => {
    if (!hasCurrentRevealEvent || animationSettled) {
      committedRevealRowsRef.current = revealRows;
    }
  }, [animationSettled, hasCurrentRevealEvent, revealRows]);

  return {
    committedRevealRows: committedRevealRowsRef.current,
    currentRevealAnimationKey,
    currentRevealProblemId,
    hasCurrentRevealEvent,
    renderAnimationPhase,
    animationSettled,
    newlyConfirmedPlayerIdSet,
    visibleConfirmedPlayerIds,
    confirmationPlayerId,
  };
}
