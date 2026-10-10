# Scoreboard showcase

The [editable demo](../demo/) imports the real package implementation. All data is synthetic. No KICE server, account, token or database is needed to run it.

```sh
bun install --frozen-lockfile
bun run demo
```

Open the localhost URL printed by Vite. `bun run demo:build` produces a standalone static site in `demo-dist/`, suitable for any static host. Serve the directory over HTTP; ES modules cannot run through a file URL. Generated site bundles stay out of Git and the npm package.

The README image is a browser capture of this demo at 1200px. [API and integration guide](api.md) describes the package contract. The example shell, controls and fixture data belong to the demo; the rendered package components are the same ones consumers install.
