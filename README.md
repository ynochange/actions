# ynochange/actions

GitHub Actions used to build and release [Y No Change](https://ynochange.com).

- [`auto-semver`](auto-semver/): the next semver release from conventional commits.
- [`tag`](tag/): tags a commit through the GitHub API.

Neither needs a checkout, and neither has dependencies.

## Releases

Every push to `main` is tagged `vX.Y.Z` by this repo's own `auto-semver`
and `tag` (`.github/workflows/release.yml`), so commit subjects should be [conventional commits](https://www.conventionalcommits.org/).
Pin a release's commit SHA when using an action.
