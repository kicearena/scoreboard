import type { ComponentProps } from "react";
import { clsx } from "clsx";
import styles from "./Controls.module.css";
export type ScoreboardControlProps = ComponentProps<"button"> & {
  control: "find" | "icon" | "page" | "pageArrow";
  variant?: "primary" | "secondary" | "ghost" | "danger";
};
export function ScoreboardControl({
  control,
  className,
  variant = "ghost",
  type = "button",
  ...props
}: ScoreboardControlProps) {
  return (
    <button
      {...props}
      type={type}
      data-slot="scoreboard-control"
      className={clsx(
        styles.control,
        styles[variant],
        styles[control],
        className,
      )}
    />
  );
}
export function ScoreboardProblemNavigator({
  problems,
  focusedProblemId,
  onFocus,
}: {
  problems: readonly { id: string; number: number }[];
  focusedProblemId?: string;
  onFocus: (id: string) => void;
}) {
  return (
    <div className={styles.navigator} aria-label="스코어보드 문항 포커스">
      {problems.map((problem) => (
        <button
          type="button"
          key={problem.id}
          className={clsx(
            styles.control,
            styles.ghost,
            focusedProblemId === problem.id && styles.active,
          )}
          aria-label={`P${problem.number} 문제 열 보기`}
          title={`P${problem.number} 문제 열 보기`}
          aria-pressed={focusedProblemId === problem.id}
          onClick={() => onFocus(problem.id)}
        >
          <span>P{problem.number}</span>
        </button>
      ))}
    </div>
  );
}
