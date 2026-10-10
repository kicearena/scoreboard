import type { ComponentProps } from "react";
import { clsx as cn } from "clsx";
import styles from "./ScoreboardGrid.module.css";

type GridPresentation = "practice" | "reveal";
type ScoreboardGridProps = ComponentProps<"div"> & {
  presentation?: GridPresentation;
};

/** Native grid boundary shared by practice rankings and the normal reveal board. */
export function ScoreboardGrid({
  presentation = "practice",
  className,
  role = "table",
  ...props
}: ScoreboardGridProps) {
  return (
    <div
      {...props}
      role={role}
      data-scoreboard-grid
      className={cn(
        styles["domjudge-board"],
        presentation === "reveal" && styles["reveal-domjudge-board"],
        className,
      )}
    />
  );
}

type RevealRowPresentation = {
  presentation: "reveal" | "spotboard";
  pending?: boolean;
  revealState?: "pending" | "active" | "confirmed" | "confirmed-below";
  current?: boolean;
  movedUp?: boolean;
  rankConfirmed?: boolean;
};
type PracticeRowPresentation = {
  presentation?: "practice";
  pending?: never;
  revealState?: never;
  current?: never;
  movedUp?: never;
  rankConfirmed?: never;
};
type ScoreboardRowProps = ComponentProps<"div"> & {
  header?: boolean;
  own?: boolean;
} & (RevealRowPresentation | PracticeRowPresentation);

function revealRowClasses({
  pending,
  revealState,
  current,
  movedUp,
  rankConfirmed,
}: RevealRowPresentation) {
  return [
    styles["reveal-row"],
    pending ? styles.locked : styles.revealed,
    revealState && styles[`reveal-row-${revealState}`],
    current && styles["reveal-row-current"],
    movedUp && styles["moved-up"],
    rankConfirmed && styles["reveal-row-rank-confirmed"],
  ];
}

export function ScoreboardRow({
  presentation = "practice",
  header = false,
  own = false,
  pending,
  revealState,
  current,
  movedUp,
  rankConfirmed,
  className,
  role = "row",
  ...props
}: ScoreboardRowProps) {
  return (
    <div
      {...props}
      role={role}
      data-scoreboard-header={header || undefined}
      className={cn(
        presentation === "spotboard"
          ? styles["spotboard-team-row"]
          : styles["domjudge-row"],
        header && styles["domjudge-header"],
        own && (presentation === "practice" ? styles.me : styles["reveal-own"]),
        presentation !== "practice" &&
          (header
            ? styles["reveal-row"]
            : revealRowClasses({
                presentation,
                pending,
                revealState,
                current,
                movedUp,
                rankConfirmed,
              })),
        className,
      )}
    />
  );
}

function scoreCellTone(
  status: string | undefined,
  presentation: GridPresentation,
) {
  switch (status) {
    case "accepted":
    case "tried":
    case "frozen-attempt":
    case "frozen-with-attempts":
      return styles[status];
    case "revealed-correct":
    case "revealed-wrong":
    case "frozen":
    case "empty":
      return presentation === "reveal" ? styles[status] : undefined;
    default:
      return undefined;
  }
}

type ScoreboardCellProps = ComponentProps<"span"> & {
  as?: "span" | "strong" | "em";
  status?: string;
  firstSolve?: boolean;
} & (
    | {
        presentation?: "practice";
        column?: never;
        header?: never;
        active?: never;
      }
    | {
        presentation: "reveal";
        column: "rank" | "player" | "score" | "time" | "problem";
        header?: boolean;
        active?: boolean;
      }
  );

export function ScoreboardCell({
  as: Element = "span",
  presentation = "practice",
  column,
  header = false,
  active = false,
  status,
  firstSolve = false,
  className,
  role = "cell",
  ...props
}: ScoreboardCellProps) {
  return (
    <Element
      {...props}
      role={role}
      className={cn(
        scoreCellTone(status, presentation),
        firstSolve && styles["first-solve"],
        presentation === "reveal" && styles["reveal-cell"],
        presentation === "reveal" && !header && styles[`reveal-${column}-cell`],
        active && styles["active-cell"],
        className,
      )}
    />
  );
}
