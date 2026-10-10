import type { BoardTime } from "./model.js";
import { ScoreboardCell } from "./ScoreboardGrid.js";
import styles from "./ResultsReveal.module.css";
export function SpotboardTimeCell({
  time,
  compact = false,
}: {
  time: BoardTime;
  compact?: boolean;
}) {
  const { elapsedSeconds, wrongPenaltyMinutes } = time;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const label = `풀이 시간 합계 ${minutes}분 ${seconds}초${wrongPenaltyMinutes ? `, 오답 페널티 +${wrongPenaltyMinutes}분` : ""}`;
  const content = (
    <>
      <span
        data-slot="scoreboard-elapsed-time"
        className={styles["scoreboard-elapsed-time"]}
      >
        {minutes}:{String(seconds).padStart(2, "0")}
      </span>
      {wrongPenaltyMinutes > 0 && (
        <sub className={compact ? styles["reveal-time-annotation"] : undefined}>
          +{wrongPenaltyMinutes}분
        </sub>
      )}
    </>
  );
  return compact ? (
    <ScoreboardCell
      presentation="reveal"
      column="time"
      role="cell"
      data-slot="scoreboard-time-cell"
      aria-label={label}
    >
      {content}
    </ScoreboardCell>
  ) : (
    <span
      role="cell"
      data-slot="spotboard-time-cell"
      className={styles["spotboard-penalty-cell"]}
      aria-label={label}
    >
      {content}
    </span>
  );
}
