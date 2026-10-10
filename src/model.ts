import type { ReactNode } from "react";
export type BoardCell = {
  problemId: string;
  status:
    | "empty"
    | "accepted"
    | "tried"
    | "frozen"
    | "revealed-correct"
    | "revealed-wrong";
  primary: string;
  secondary: string;
  wrongCount?: number;
  wrongBeforeCorrect?: number;
  acceptedAt?: number;
};
export type BoardRow = {
  playerId: string;
  nickname: string;
  score: number;
  penaltyMs: number;
  solved: number;
  lastAcceptedAt: number | null;
  rankLabel: string;
  revealedCount: number;
  pendingCount: number;
  movedToTop: boolean;
  attemptLabel: string;
  cells: BoardCell[];
};
export type BoardProblem = { id: string; number: number; pointValue?: number };
export type BoardTime = { elapsedSeconds: number; wrongPenaltyMinutes: number };
export type BoardModel = {
  rows: readonly BoardRow[];
  problems: readonly BoardProblem[];
  startedAt: number | null;
  times: ReadonlyMap<string, BoardTime>;
  subtitles: ReadonlyMap<string, string>;
};
export type RevealEvent = {
  playerId: string;
  nickname: string;
  movedToTop: boolean;
  submission: {
    problemId: string;
    submittedAt: number;
    correct: boolean;
    attempts: number;
  };
};
export type BoardSlots = {
  renderPlayer: (
    row: BoardRow,
    presentation: "scoreboard" | "wallboard",
  ) => ReactNode;
  renderProblemLink: (
    problemId: string,
    children: ReactNode,
    props?: { className?: string; "aria-label"?: string },
  ) => ReactNode;
};
