# @kicearena/scoreboard

점수표의 행·셀·native controls와 reveal 애니메이션을 제공하는 React 패키지입니다. 준비된 공개 데이터를 렌더링하며 채점, 순위 산정, 서버 통신, 계정 권한과 라우팅은 소비자가 맡습니다. KICE의 `RoomPublic`이나 애플리케이션 checkout을 import하지 않습니다.

## 설치

GitHub Packages의 npm registry로 배포합니다. 공개 패키지도 이 registry에서는 인증이 필요합니다. 프로젝트 `.npmrc`에 다음 설정을 두고 `read:packages` 권한의 토큰을 `NODE_AUTH_TOKEN`으로 제공합니다. 토큰 값은 파일이나 저장소에 넣지 않습니다.

```ini
@kicearena:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
bun add --exact @kicearena/scoreboard@0.1.2
```

React `^19.2.3`은 peer dependency입니다. React DOM과 앱의 router는 소비자가 제공합니다. CSS는 반드시 한 번 import합니다.

## 기본 점수표

```tsx
import type { CSSProperties } from "react";
import {
  ScoreboardGrid,
  ScoreboardRow,
  ScoreboardCell,
} from "@kicearena/scoreboard";
import "@kicearena/scoreboard/styles.css";

export function ExampleScoreboard() {
  return (
    <ScoreboardGrid
      aria-label="예제 점수표"
      style={{ "--problem-count": 1 } as CSSProperties}
    >
      <ScoreboardRow own>
        <ScoreboardCell>1</ScoreboardCell>
        <ScoreboardCell as="strong">참가자</ScoreboardCell>
        <ScoreboardCell>4</ScoreboardCell>
        <ScoreboardCell>2:05</ScoreboardCell>
        <ScoreboardCell status="accepted" firstSolve>
          4
        </ScoreboardCell>
      </ScoreboardRow>
    </ScoreboardGrid>
  );
}
```

컴포넌트는 실제 `div`, `span`, `strong`, `button`을 렌더링하고 table/row/cell 의미와 ref를 유지합니다. 데이터·aria-label·disabled 상태를 일반 React props로 전달할 수 있습니다.

## 공개 API

| 영역                     | API                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| Grid                     | `ScoreboardGrid`, `ScoreboardRow`, `ScoreboardCell`                                             |
| Controls                 | `ScoreboardControl`, `ScoreboardProblemNavigator`                                               |
| Reveal rows              | `RevealBoardRow`, `SpotboardRow`, `SpotboardTimeCell`                                           |
| Animation                | `useRevealBoardAnimation`, `useRevealBoardMotion`, timing/confirmation/scroll helpers           |
| Types                    | `BoardModel`, `BoardRow`, `BoardCell`, `BoardTime`, `BoardSlots`, `RevealEvent`, `RevealTiming` |
| CSS ownership            | `/styles.css`, `scoreboardStyles`, `revealStyles`                                               |
| First solve presentation | `firstSolveTimes`                                                                               |

Grid의 `presentation`은 practice/reveal, 행의 presentation은 practice/reveal/spotboard입니다. Controls는 find/icon/page/pageArrow 용도의 geometry를 소유하며 native button 동작을 유지합니다.

## Reveal 모델과 렌더 슬롯

`BoardModel`은 다음 정보를 받습니다.

- `rows`: 이미 계산된 점수·순위 label·공개된 셀·pending 상태.
- `problems`: 문항 ID, 번호와 선택적인 배점.
- `startedAt`: 공개된 시작 시각, 없으면 null.
- `times`: 모든 표시 행의 player ID에 대해 `elapsedSeconds`, `wrongPenaltyMinutes` 제공.
- `subtitles`: 표시할 보조 문구 Map.

`BoardSlots.renderPlayer(row, presentation)`는 프로필·랭크 표시를, `renderProblemLink(problemId, children, props)`는 문항 링크를 제공합니다. router가 없는 소비자는 허용된 일반 anchor나 children을 반환하면 됩니다.

reveal controller는 서버가 승인한 진행 상태를 준비하고 `useRevealBoardAnimation`에 행·현재 이벤트·count·timing을 전달합니다. 패키지는 focus → verdict → movement → rank confirmation의 표시 단계와 FLIP/scroll 동작만 처리합니다. 다음 공개 요청·진행 복구·필터 허용 시점·보고서 접근은 소비자의 책임입니다.

`RevealBoardRow`와 `SpotboardRow`의 자세한 props는 배포된 타입 선언이 소유합니다. 셀에는 서버가 공개한 정보만 넣고, `firstSolveByProblem`도 공개 범위에 맞게 준비합니다. 패키지는 숨긴 답안이나 제출 이력을 요구하지 않습니다.

## 테마와 CSS

CSS Modules로 만든 scoped stylesheet를 배포합니다. Tailwind 설정이나 KICE의 공통 Button 구현을 요구하지 않습니다. 소비자는 다음 테마 token을 제공하거나 자신의 디자인 시스템 token에 연결합니다.

```css
.scoreboard-theme {
  --font-sans: sans-serif;
  --ink: #171816;
  --muted: #75766f;
  --surface: #ffffff;
  --paper: #fffefa;
  --paper-deep: #f4f1e9;
  --border: #e1e1d9;
  --line: #e1e1d9;
  --primary-soft: #f2eedc;
  --primary-strong: #e8c93a;
  --primary-ink: #6d5800;
  --grading-red: #a94339;
  --success-green: #326e4b;
  --danger: var(--grading-red);
  --radius-sm: 4px;
  --ui-accent-base: #e8c93a;
  --ui-accent-soft: #f2eedc;
  --ui-accent-ink: #6d5800;
}
```

`--problem-count`, `--spotboard-problem-count`는 표시 문항 수입니다. reveal duration token은 `RevealTiming`과 같은 값으로 제공해 CSS와 JS 단계를 맞춥니다. 페이지 제목·search/pagination 배치·전체 화면 frame은 소비자가 구성합니다.

## 검증

311개 테스트로 행·셀·controls, CSS cascade, rank 표시, reveal timeline과 scroll 좌표를 확인합니다. KICE에서는 390/768/1440px 비교와 실제 시험·재연결·성적표 journey를 검증합니다. 자동 reveal의 서로 다른 진행 시점은 같은 정적 화면으로 비교하지 않습니다.

## 개발과 릴리스

```sh
bun install --frozen-lockfile
bun run check
bun run test
bun run build
```

Node 24와 Bun 1.3.7 환경에서 검증합니다. TypeScript 산출물은 ESM과 선언 파일이며, 소스 checkout 없이 registry 설치만으로 소비할 수 있습니다.

버전·lockfile·README를 함께 갱신하고 검증한 commit에 `v<version>` 태그를 붙입니다. 태그 workflow가 검사 후 배포합니다. 이미 발행한 버전은 tarball integrity가 같을 때만 확인하며, 바이트가 달라지면 새 버전을 발행해야 합니다. 소비자는 정확한 버전을 고정합니다.

## 라이선스

[MIT](../LICENSE). 제3자 의존성은 각각의 라이선스를 따릅니다.
