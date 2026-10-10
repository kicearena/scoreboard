import type { RefObject } from "react";
import type { BoardRow, RevealEvent } from "./model.js";
import { makeRevealCellKey } from "./resultsRevealHelpers.js";

type RevealRows = BoardRow[];
type RevealRow = RevealRows[number];
export type RevealRowDisplayState =
  | "pending"
  | "active"
  | "confirmed"
  | "confirmed-below";

export function getRevealRowDisplayState(
  row: RevealRows[number],
  rowIndex: number,
  activeRevealPlayerId: string | null,
  activeRevealRowIndex: number,
  rankIsVisible: boolean,
): RevealRowDisplayState {
  if (row.playerId === activeRevealPlayerId) return "active";
  if (row.pendingCount > 0 || !rankIsVisible) return "pending";
  if (row.rankLabel === "?") return "pending";
  if (activeRevealRowIndex >= 0 && rowIndex > activeRevealRowIndex)
    return "confirmed-below";
  return "confirmed";
}

export function updateRevealRowRef(
  revealRowRefs: RefObject<Map<string, HTMLDivElement>>,
  playerId: string,
  element: HTMLDivElement | null,
) {
  if (element) revealRowRefs.current.set(playerId, element);
  else revealRowRefs.current.delete(playerId);
}

export function updateRevealCellRef(
  revealCellRefs: RefObject<Map<string, HTMLSpanElement>>,
  playerId: string,
  problemId: string,
  element: HTMLSpanElement | null,
) {
  const key = makeRevealCellKey(playerId, problemId);
  if (element) revealCellRefs.current.set(key, element);
  else revealCellRefs.current.delete(key);
}

export function displayScoreCellPrimary(
  cell: RevealRow["cells"][number],
  problemPointValue?: number,
) {
  if (
    (cell.status === "accepted" || cell.status === "revealed-correct") &&
    cell.primary.startsWith("+")
  ) {
    return cell.primary.slice(1);
  }
  if (
    cell.status === "revealed-correct" &&
    cell.primary === "정답" &&
    problemPointValue
  ) {
    return String(problemPointValue);
  }
  return cell.primary;
}
