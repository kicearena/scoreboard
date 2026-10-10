import { Crown } from "lucide-react";
import { revealRowAnimationClassName } from "./SpotboardRow.js";
import type { RefObject } from "react";
import type { BoardRow as RevealRow, BoardModel, BoardSlots } from "./model.js";
import { ScoreboardCell, ScoreboardRow } from "./ScoreboardGrid.js";
import { SpotboardTimeCell } from "./TimeCell.js";
import {
  shouldAccentCurrentRevealRow,
  shouldShowRevealRank,
  type RevealAnimationPhase,
} from "./resultsRevealHelpers.js";
import {
  displayScoreCellPrimary,
  getRevealRowDisplayState,
  updateRevealCellRef,
  updateRevealRowRef,
} from "./revealPresentation.js";
import styles from "./ResultsReveal.module.css";
function RevealProblemCell({
  rowPlayerId,
  cell,
  problemPointValue,
  currentRevealProblemId,
  revealAnimationPhase,
  activeRevealPlayerId,
  revealCount,
  revealCellRefs,
  firstSolveAt,
}: {
  rowPlayerId: string;
  cell: RevealRow["cells"][number];
  problemPointValue?: number;
  currentRevealProblemId: string | undefined;
  revealAnimationPhase: RevealAnimationPhase;
  activeRevealPlayerId: string | null;
  revealCount: number;
  revealCellRefs: RefObject<Map<string, HTMLSpanElement>>;
  firstSolveAt?: number;
}) {
  const isCurrentProblem = currentRevealProblemId === cell.problemId;
  const isActiveCell =
    revealAnimationPhase === "revealing" &&
    activeRevealPlayerId === rowPlayerId &&
    isCurrentProblem;
  const isFirstSolve =
    cell.acceptedAt !== undefined && cell.acceptedAt === firstSolveAt;
  const classes = [
    styles["reveal-problem-cell-content"],
    styles[cell.status],
    isActiveCell ? `${styles["active-cell"]}` : "",
    isFirstSolve ? `${styles["first-solve"]}` : "",
  ].filter(Boolean);
  const primary = displayScoreCellPrimary(cell, problemPointValue);
  const secondary = displayScoreCellSecondary(cell);

  return (
    <ScoreboardCell
      presentation="reveal"
      column="problem"
      active={isActiveCell}
      status={cell.status}
      firstSolve={isFirstSolve}
      key={`${cell.problemId}:${isActiveCell ? revealCount : "idle"}`}
      ref={(element) =>
        updateRevealCellRef(
          revealCellRefs,
          rowPlayerId,
          cell.problemId,
          element,
        )
      }
      role="cell"
      data-slot="scoreboard-problem-cell"
      data-score-cell-status={cell.status}
      data-first-solve={isFirstSolve || undefined}
      aria-label={`${primary}${secondary ? ` · ${secondary}` : ""}${isFirstSolve ? " · 퍼스트솔브" : ""}`}
    >
      <span className={classes.join(" ")}>
        <b>{primary}</b>
        {secondary && <small>{secondary}</small>}
      </span>
    </ScoreboardCell>
  );
}

function displayScoreCellSecondary(cell: RevealRow["cells"][number]) {
  if (cell.status !== "accepted" && cell.status !== "revealed-correct")
    return cell.secondary;
  return cell.wrongBeforeCorrect ? `+${cell.wrongBeforeCorrect}회` : "";
}

export function RevealBoardRow({
  model,
  renderPlayer,
  isMine,
  row,
  rowIndex,
  activeRevealPlayerId,
  activeRevealRowIndex,
  currentRevealPlayerId,
  currentRevealProblemId,
  isNewlyConfirmedRank,
  rankConfirmationVisible,
  confirmationPlayerId,
  revealAnimationPhase,
  revealCount,
  revealRowRefs,
  revealCellRefs,
  firstSolveByProblem,
}: {
  model: BoardModel;
  renderPlayer: BoardSlots["renderPlayer"];
  isMine: boolean;
  row: RevealRow;
  rowIndex: number;
  activeRevealPlayerId: string | null;
  activeRevealRowIndex: number;
  currentRevealPlayerId: string | undefined;
  currentRevealProblemId: string | undefined;
  isNewlyConfirmedRank: boolean;
  rankConfirmationVisible: boolean;
  confirmationPlayerId: string | null;
  revealAnimationPhase: RevealAnimationPhase;
  revealCount: number;
  revealRowRefs: RefObject<Map<string, HTMLDivElement>>;
  revealCellRefs: RefObject<Map<string, HTMLSpanElement>>;
  firstSolveByProblem: ReadonlyMap<string, number>;
}) {
  const isCurrentRevealRow = currentRevealPlayerId === row.playerId;
  const rankIsVisible = shouldShowRevealRank({
    rowIsPending: row.pendingCount > 0,
    isCurrentRevealRow,
    isNewlyConfirmedRank,
    rankConfirmationVisible,
    revealAnimationPhase,
  });
  const rowState = getRevealRowDisplayState(
    row,
    rowIndex,
    activeRevealPlayerId,
    activeRevealRowIndex,
    rankIsVisible,
  );

  const isConfirmingRank =
    confirmationPlayerId === row.playerId &&
    revealAnimationPhase === "confirming" &&
    row.rankLabel !== "?";
  const accentCurrentRevealRow = shouldAccentCurrentRevealRow({
    isCurrentRevealRow,
    revealAnimationPhase,
    rankIsVisible,
  });
  const rankLabel = rankIsVisible ? row.rankLabel : "?";

  return (
    <ScoreboardRow
      presentation="reveal"
      pending={row.pendingCount > 0}
      revealState={rowState}
      current={accentCurrentRevealRow}
      movedUp={row.movedToTop}
      rankConfirmed={isConfirmingRank}
      own={isMine}
      ref={(element) =>
        updateRevealRowRef(revealRowRefs, row.playerId, element)
      }
      className={revealRowAnimationClassName({
        revealAnimationPhase,
        isCurrentRevealRow,
        isConfirmingRank,
      })}
      role="row"
      data-slot="scoreboard-row"
      data-player-id={row.playerId}
      data-mine={isMine || undefined}
      data-reveal-state={rowState}
    >
      <ScoreboardCell presentation="reveal" column="rank" role="cell">
        {rowIndex === 0 && (
          <Crown
            className={`${styles["reveal-rank-crown"]}`}
            size={14}
            strokeWidth={2.5}
            aria-hidden="true"
          />
        )}
        <b className={styles["reveal-rank-value"]}>{rankLabel}</b>
      </ScoreboardCell>
      <ScoreboardCell
        as="strong"
        presentation="reveal"
        column="player"
        role="rowheader"
      >
        {renderPlayer(row, "scoreboard")}
      </ScoreboardCell>
      <ScoreboardCell as="em" presentation="reveal" column="score" role="cell">
        {row.score}
      </ScoreboardCell>
      <SpotboardTimeCell time={model.times.get(row.playerId)!} compact />
      {row.cells.map((cell) => (
        <RevealProblemCell
          key={cell.problemId}
          rowPlayerId={row.playerId}
          cell={cell}
          firstSolveAt={firstSolveByProblem.get(cell.problemId)}
          problemPointValue={
            model.problems.find((problem) => problem.id === cell.problemId)
              ?.pointValue
          }
          currentRevealProblemId={currentRevealProblemId}
          revealAnimationPhase={revealAnimationPhase}
          activeRevealPlayerId={activeRevealPlayerId}
          revealCount={revealCount}
          revealCellRefs={revealCellRefs}
        />
      ))}
    </ScoreboardRow>
  );
}
