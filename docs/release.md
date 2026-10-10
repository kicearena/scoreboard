# Immutable package releases

Run check, test and build from the committed lockfile. Tag the verified commit with v<package-version>. The workflow verifies the tag and package version, packs the artifact, and publishes it. A rerun accepts an already published version only if its tarball integrity is identical; different bytes require a new version.

README is included in the package. Documentation changes intended for installed consumers therefore receive a new patch version. KICE pins the exact published version and verifies the registry artifact independently of a local checkout.
