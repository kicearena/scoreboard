# @kicearena/scoreboard

Composable React components for scoreboards, frozen results and reveal presentation.

[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Packages](https://img.shields.io/badge/package-0.1.2-24292f.svg)](https://github.com/kicearena/scoreboard/pkgs/npm/scoreboard)

![Scoreboard component showcase](docs/images/preview.png)

## What can it do?

- **Rows & cells** — accepted, tried, empty and frozen states with first-solve presentation.
- **Reveal & wallboard** — prepared `BoardModel`, render slots and presentation animation hooks.
- **Controls & styling** — native buttons, problem navigation and scoped CSS; bring your own theme.

React 19 is a peer dependency. Scoring, rankings, routing and authorization belong to your application.

## Try the showcase

The [interactive demo](docs/demo.md) uses the real package with synthetic data. Clone this repository, then run:

```sh
bun install --frozen-lockfile
bun run demo
```

`bun run demo:build` creates a static site in `demo-dist/`. [Browse the editable example](demo/) or [read the API and integration guide](docs/api.md).

## Install

Published on **GitHub Packages**. This registry requires authentication even for public packages. Set a `read:packages` token in `NODE_AUTH_TOKEN` and add this project `.npmrc` (never store the token itself):

```ini
@kicearena:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
bun add --exact @kicearena/scoreboard@0.1.2
```

```tsx
import type { CSSProperties } from "react";
import {
  ScoreboardGrid,
  ScoreboardRow,
  ScoreboardCell,
} from "@kicearena/scoreboard";
import "@kicearena/scoreboard/styles.css";

// Render a prepared row; reveal layouts use BoardModel and render slots.
<ScoreboardGrid style={{ "--problem-count": 1 } as CSSProperties}>
  <ScoreboardRow>
    {["1", "Ada", "4", "2:05", "1 solved", "1 attempt"].map((text) => (
      <ScoreboardCell key={text}>{text}</ScoreboardCell>
    ))}
    <ScoreboardCell status="accepted" firstSolve>
      4
    </ScoreboardCell>
  </ScoreboardRow>
</ScoreboardGrid>;
```

Provide theme CSS variables as shown in the [integration guide](docs/api.md#테마와-css).

## Develop

```sh
bun run check
bun run test
bun run build
bun run demo:build
```

ESM and TypeScript declarations are included. 311 unit tests cover components, CSS cascade, reveal phases and scrolling. Release a new exact version with a matching `v<version>` tag; published tarballs are immutable.

## License

[MIT](LICENSE) © 2026 KICE Arena contributors. Dependencies retain their respective licenses.
