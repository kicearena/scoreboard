# Release verification

Build and test from the committed lockfile. The v0.1.0 artifact was initially published after local checks because GitHub Actions execution is blocked by account billing. The tag workflow performs the same checks and publishes only a new version. A rerun verifies that an existing version has identical tarball integrity; a different artifact under an existing version fails.

GitHub Actions in kicearena/kicearena has Read access to this private package. Consumers must pin the exact version and keep their product policy, database and credentials outside this package.
