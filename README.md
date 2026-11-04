# ynochange/actions

GitHub Actions used to build and release [Y No Change](https://ynochange.com).

- [`auto-semver`](auto-semver/): the next semver release from conventional commits.

## Releases

Every push to `main` that passes CI is tagged `vX.Y.Z` by `auto-semver`
itself, so commit subjects should be [conventional commits](https://www.conventionalcommits.org/).
Pin a release's commit SHA when using an action.
