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
export function revealRowAnimationClassName({
  revealAnimationPhase,
  isCurrentRevealRow,
  isConfirmingRank,
}: {
  revealAnimationPhase: RevealAnimationPhase;
  isCurrentRevealRow: boolean;
  isConfirmingRank: boolean;
}) {
  const classes = [styles["reveal-row"]];
  if (revealAnimationPhase === "focusing" && isCurrentRevealRow)
    classes.push(styles["reveal-row-focusing"]);
  if (revealAnimationPhase === "moving" && isCurrentRevealRow)
    classes.push(styles["reveal-row-moving"]);
  if (revealAnimationPhase === "revealing" && isCurrentRevealRow)
    classes.push(styles["reveal-row-revealing"]);
  if (revealAnimationPhase === "confirming" && isConfirmingRank)
    classes.push(styles["reveal-row-confirming"]);
  return classes.join(" ");
}

function spotboardAttemptMarker(cell: RevealRow["cells"][number]) {
  if (cell.status === "accepted" || cell.status === "revealed-correct") {
    return cell.wrongBeforeCorrect ? `+${cell.wrongBeforeCorrect}` : "";
  }
  if (cell.status === "tried" || cell.status === "revealed-wrong") {
    return cell.wrongCount ? `-${cell.wrongCount}` : "";
  }
  if (cell.status === "frozen") return "?";
  return "";
}

function spotboardCellAriaLabel(
  problemNumber: number,
  cell: RevealRow["cells"][number],
  problemPointValue: number | undefined,
  isFirstSolve: boolean,
  firstSolveSeconds: number | null,
) {
  return [
    `${problemNumber}번 문항`,
    displayScoreCellPrimary(cell, problemPointValue),
    cell.secondary,
    cell.wrongCount ? `누적 오답 ${cell.wrongCount}회` : "",
    cell.wrongBeforeCorrect
      ? `이전 오답 ${cell.wrongBeforeCorrect}회 후 정답`
      : "",
    isFirstSolve ? "퍼스트솔브" : "",
    firstSolveSeconds === null
      ? ""
      : `소요 시간 ${Math.floor(firstSolveSeconds / 60)}분 ${firstSolveSeconds % 60}초`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function SpotboardProblemCell({
  rowPlayerId,
  cell,
  problemNumber,
  problemPointValue,
  currentRevealProblemId,
  revealAnimationPhase,
  activeRevealPlayerId,
  revealCount,
  revealCellRefs,
  renderProblemLink,
  firstSolveAt,
  startedAt,
}: {
  rowPlayerId: string;
  cell: RevealRow["cells"][number];
  problemNumber: number;
  problemPointValue?: number;
  currentRevealProblemId: string | undefined;
  revealAnimationPhase: RevealAnimationPhase;
  activeRevealPlayerId: string | null;
  revealCount: number;
  revealCellRefs: RefObject<Map<string, HTMLSpanElement>>;
  renderProblemLink: BoardSlots["renderProblemLink"];
  firstSolveAt?: number;
  startedAt: number | null;
}) {
  const isActiveCell =
    revealAnimationPhase === "revealing" &&
    activeRevealPlayerId === rowPlayerId &&
    currentRevealProblemId === cell.problemId;
  const isFirstSolve =
    cell.acceptedAt !== undefined && cell.acceptedAt === firstSolveAt;
  const firstSolveSeconds =
    isFirstSolve && startedAt !== null && cell.acceptedAt !== undefined
      ? Math.floor(Math.max(0, cell.acceptedAt - startedAt) / 1000)
      : null;
  const detail =
    firstSolveSeconds === null
      ? spotboardAttemptMarker(cell)
      : `${Math.floor(firstSolveSeconds / 60)}:${String(firstSolveSeconds % 60).padStart(2, "0")}`;
  const ariaLabel = spotboardCellAriaLabel(
    problemNumber,
    cell,
    problemPointValue,
    isFirstSolve,
    firstSolveSeconds,
  );
  return (
    <span
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
      data-slot="spotboard-problem-cell"
      data-score-cell-status={cell.status}
      data-first-solve={isFirstSolve || undefined}
      className={`${styles["spotboard-problem-cell"]} ${styles[cell.status]}${isActiveCell ? ` ${styles["active-cell"]}` : ""}${isFirstSolve ? ` ${styles["first-solve"]}` : ""}`}
      aria-label={ariaLabel}
    >
      <span
        data-slot="spotboard-problem-face"
        className={`${styles["spotboard-problem-face"]}`}
      >
        {renderProblemLink(
          cell.problemId,
          <b>{String(problemNumber).padStart(2, "0")}</b>,
          {
            className: styles["spotboard-problem-link"],
            "aria-label": `${problemNumber}번 문제 보기`,
          },
        )}
        {detail && <small>{detail}</small>}
      </span>
    </span>
  );
}

function hsvToHex(hue: number, saturation: number, value: number) {
  const normalizedHue = ((hue % 1) + 1) % 1;
  const sector = Math.floor(normalizedHue * 6);
  const fraction = normalizedHue * 6 - sector;
  const p = value * (1 - saturation);
  const q = value * (1 - saturation * fraction);
  const t = value * (1 - saturation * (1 - fraction));
  const rgb =
    sector === 0
      ? [value, t, p]
      : sector === 1
        ? [q, value, p]
        : sector === 2
          ? [p, value, t]
          : sector === 3
            ? [p, q, value]
            : sector === 4
              ? [t, p, value]
              : [value, p, q];
  return `#${rgb
    .map((channel) =>
      Math.floor(channel * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function spotboardSolvedColor(solved: number, problemCount: number) {
  const ratio =
    problemCount > 0 ? Math.min(1, Math.max(0, solved / problemCount)) : 0;
  let saturation = 0.96;
  let value = 0.31;
  if (solved % 2 === 1) {
    saturation = Math.max(saturation - 0.15, 0);
    value = Math.min(value + 0.1, 1);
  }
  const hue = (-2 / 360) * (1 - ratio) + (105 / 360) * ratio;
  return hsvToHex(hue, saturation, value);
}

export function SpotboardRow({
  model,
  renderPlayer,
  renderProblemLink,
  row,
  rowIndex,
  displayIndex,
  previousSolved,
  nextSolved,
  isMine,
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
  renderProblemLink: BoardSlots["renderProblemLink"];
  row: RevealRow;
  rowIndex: number;
  displayIndex: number;
  previousSolved?: number;
  nextSolved?: number;
  isMine: boolean;
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
  const isSolvedGroupStart =
    displayIndex === 0 || previousSolved !== row.solved;
  const isSolvedGroupEnd =
    nextSolved === undefined || nextSolved !== row.solved;

  return (
    <ScoreboardRow
      presentation="spotboard"
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
      data-slot="spotboard-row"
      data-player-id={row.playerId}
      data-mine={isMine || undefined}
      data-reveal-state={rowState}
    >
      <span
        role="cell"
        data-slot="spotboard-solved-cell"
        className={`${styles["spotboard-solved-cell"]}${isSolvedGroupStart ? ` ${styles["first"]}` : ""}${isSolvedGroupEnd ? ` ${styles["last"]}` : ""}`}
        style={{
          backgroundColor: spotboardSolvedColor(
            row.solved,
            model.problems.length,
          ),
        }}
      >
        {isSolvedGroupStart ? row.solved : ""}
      </span>
      <span role="cell" className={`${styles["spotboard-rank-cell"]}`}>
        <b>{rankIsVisible ? row.rankLabel : "?"}</b>
        {rankIsVisible && row.rankLabel !== "?" && <small>위</small>}
      </span>
      <strong
        data-slot="spotboard-player-cell"
        role="rowheader"
        className={`${styles["spotboard-player-cell"]}`}
      >
        <span className={`${styles["spotboard-player-line"]}`}>
          {renderPlayer(row, "wallboard")}
        </span>
        <small>{model.subtitles.get(row.playerId) ?? "KICE ARENA"}</small>
      </strong>
      <div role="cell" className={`${styles["spotboard-results"]}`}>
        {row.cells.map((cell, cellIndex) => {
          const problem = model.problems.find(
            (candidate) => candidate.id === cell.problemId,
          );
          return (
            <SpotboardProblemCell
              key={cell.problemId}
              rowPlayerId={row.playerId}
              cell={cell}
              renderProblemLink={renderProblemLink}
              firstSolveAt={firstSolveByProblem.get(cell.problemId)}
              startedAt={model.startedAt}
              problemNumber={problem?.number ?? cellIndex + 1}
              problemPointValue={problem?.pointValue}
              currentRevealProblemId={currentRevealProblemId}
              revealAnimationPhase={revealAnimationPhase}
              activeRevealPlayerId={activeRevealPlayerId}
              revealCount={revealCount}
              revealCellRefs={revealCellRefs}
            />
          );
        })}
      </div>
      <SpotboardTimeCell time={model.times.get(row.playerId)!} />
    </ScoreboardRow>
  );
}
