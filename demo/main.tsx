import { useMemo, useRef, useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import {
  RevealBoardRow,
  SpotboardRow,
  ScoreboardGrid,
  ScoreboardRow,
  ScoreboardCell,
  ScoreboardControl,
  ScoreboardProblemNavigator,
  useRevealBoardAnimation,
  STANDARD_REVEAL_TIMING,
  type BoardRow,
  type BoardModel,
  type RevealEvent,
} from "../src/index";
import "./styles.css";
const problems = Array.from({ length: 5 }, (_, i) => ({
  id: `p${i + 1}`,
  number: i + 1,
  pointValue: 4,
}));
const names = [
  "Ada Lovelace",
  "Emmy Noether",
  "Sofia Kovalevskaya",
  "Maryam Mirzakhani",
];
function fixtureRows(revealed: number): BoardRow[] {
  return names.map((nickname, i) => {
    const pending = i >= 2 && revealed < i - 1;
    return {
      playerId: `player-${i}`,
      nickname,
      score: [20, 16, 12, 8][i],
      penaltyMs: 0,
      solved: [5, 4, 3, 2][i],
      lastAcceptedAt: null,
      rankLabel: pending ? "?" : String(i + 1),
      revealedCount: pending ? 0 : 1,
      pendingCount: pending ? 1 : 0,
      movedToTop: false,
      attemptLabel: "Sample participant",
      cells: problems.map((problem, j) => ({
        problemId: problem.id,
        status:
          pending && j === 3
            ? "frozen"
            : j < 5 - i
              ? "accepted"
              : j === 3 && i >= 2
                ? "revealed-wrong"
                : "empty",
        primary: pending && j === 3 ? "?" : j < 5 - i ? "4" : "—",
        secondary: "",
        wrongCount: j === 3 && i >= 2 ? 1 : undefined,
      })),
    };
  });
}
function App() {
  const [revealed, setRevealed] = useState(0);
  const [focusedProblem, setFocusedProblem] = useState("p1");
  const rows = useMemo(() => fixtureRows(revealed), [revealed]);
  const currentRevealEvent: RevealEvent | undefined = revealed
    ? {
        playerId: `player-${revealed + 1}`,
        nickname: names[revealed + 1],
        movedToTop: false,
        submission: {
          problemId: "p4",
          submittedAt: revealed * 1000,
          correct: false,
          attempts: 1,
        },
      }
    : undefined;
  const animation = useRevealBoardAnimation({
    currentRevealEvent,
    revealCount: revealed,
    revealRows: rows,
    revealTiming: STANDARD_REVEAL_TIMING,
  });
  const displayRows =
    animation.renderAnimationPhase === "focusing"
      ? animation.committedRevealRows
      : rows;
  const model: BoardModel = {
    rows: displayRows,
    problems,
    startedAt: null,
    times: new Map(
      names.map((_, i) => [
        `player-${i}`,
        { elapsedSeconds: 742 + i * 115, wrongPenaltyMinutes: 0 },
      ]),
    ),
    subtitles: new Map(
      names.map((_, i) => [`player-${i}`, "SYNTHETIC DEMO DATA"]),
    ),
  };
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const cellRefs = useRef(new Map<string, HTMLSpanElement>());
  const rowProps = (row: BoardRow, rowIndex: number) => ({
    model,
    row,
    rowIndex,
    isMine: rowIndex === 1,
    renderPlayer: (r: BoardRow) => <span>{r.nickname}</span>,
    activeRevealPlayerId: currentRevealEvent?.playerId ?? null,
    activeRevealRowIndex: revealed ? revealed + 1 : -1,
    currentRevealPlayerId: currentRevealEvent?.playerId,
    currentRevealProblemId: animation.currentRevealProblemId,
    isNewlyConfirmedRank: animation.newlyConfirmedPlayerIdSet.has(row.playerId),
    rankConfirmationVisible: animation.visibleConfirmedPlayerIds.has(
      row.playerId,
    ),
    confirmationPlayerId: animation.confirmationPlayerId,
    revealAnimationPhase: animation.renderAnimationPhase,
    revealCount: revealed,
    revealRowRefs: rowRefs,
    revealCellRefs: cellRefs,
    firstSolveByProblem: new Map<string, number>(),
  });
  return (
    <main
      className="scoreboard-theme"
      style={
        {
          "--problem-count": 5,
          "--spotboard-problem-count": 5,
          "--spotboard-row-height": "88px",
          "--spotboard-pending": "#e0b400",
          "--spotboard-pending-ink": "#4b4015",
        } as CSSProperties
      }
    >
      <nav>
        <span>KICE ARENA / OPEN SOURCE</span>
        <a href="https://github.com/kicearena/scoreboard">GitHub ↗</a>
      </nav>
      <header>
        <div className="eyebrow">@kicearena/scoreboard · MIT</div>
        <h1>Give results a stage.</h1>
        <p>
          Composable React rows, cells and controls for competition results.
          <br />
          Present a frozen board, reveal a verdict, or fill the room with a
          wallboard.
        </p>
      </header>
      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Scoreboard & reveal</h2>
            <small>Prepared BoardModel → React components</small>
          </div>
          <div className="actions">
            <ScoreboardControl
              control="find"
              variant="primary"
              disabled={revealed === 2 || !animation.animationSettled}
              onClick={() => setRevealed((v) => v + 1)}
            >
              Reveal next
            </ScoreboardControl>
            <ScoreboardControl
              control="find"
              variant="secondary"
              onClick={() => setRevealed(0)}
            >
              Reset freeze
            </ScoreboardControl>
          </div>
        </div>
        <div className="board-scroll">
          <ScoreboardGrid
            presentation="reveal"
            aria-label="Sample competition results"
          >
            <ScoreboardRow presentation="reveal" header>
              {[
                "Rank",
                "Participant",
                "Score",
                "Time",
                ...problems.map((p) => `P${p.number}`),
              ].map((label, i) => (
                <ScoreboardCell
                  key={label}
                  presentation="reveal"
                  column={
                    i === 0
                      ? "rank"
                      : i === 1
                        ? "player"
                        : i === 2
                          ? "score"
                          : i === 3
                            ? "time"
                            : "problem"
                  }
                  header
                  role="columnheader"
                >
                  {label}
                </ScoreboardCell>
              ))}
            </ScoreboardRow>
            {displayRows.map((row, i) => (
              <RevealBoardRow key={row.playerId} {...rowProps(row, i)} />
            ))}
          </ScoreboardGrid>
        </div>
        <div className="component-footer">
          <ScoreboardProblemNavigator
            problems={problems}
            focusedProblemId={focusedProblem}
            onFocus={(id) => {
              setFocusedProblem(id);
              const grid = document.querySelector("[data-scoreboard-grid]");
              const cell = grid?.querySelectorAll('[role="columnheader"]')[
                4 + problems.findIndex((p) => p.id === id)
              ];
              cell?.scrollIntoView({ block: "nearest", inline: "nearest" });
            }}
          />
          <span className="note" role="status">
            {animation.renderAnimationPhase} · {revealed} / 2 revealed
          </span>
        </div>
      </section>
      <section className="card wallboard">
        <div className="section-heading">
          <h2>Wallboard rows</h2>
          <small>SpotboardRow · custom player and problem slots</small>
        </div>
        <div
          className="board-scroll"
          role="table"
          aria-label="Sample wallboard"
        >
          {displayRows.slice(0, 2).map((row, i) => (
            <SpotboardRow
              key={row.playerId}
              {...rowProps(row, i)}
              displayIndex={i}
              previousSolved={displayRows[i - 1]?.solved}
              nextSolved={displayRows[i + 1]?.solved}
              renderProblemLink={(_, children, props) => (
                <span {...props}>{children}</span>
              )}
            />
          ))}
        </div>
      </section>
      <footer>
        <span>React 19 · ESM + types + scoped CSS</span>
        <span>Your data, theme and routing</span>
        <span>MIT licensed</span>
        <a href="https://github.com/kicearena/scoreboard/tree/main/docs">
          Component API
        </a>
      </footer>
    </main>
  );
}
createRoot(document.querySelector("#app")!).render(<App />);
