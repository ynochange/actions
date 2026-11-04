# ynochange/actions

GitHub Actions used to build and release [Y No Change](https://ynochange.com).

- [`auto-semver`](auto-semver/): the next semver release from conventional commits.
- [`tag`](tag/): tags a commit through the GitHub API.
- [`release`](release/): a GitHub release for a tag, with notes from the conventional commits since the last one.
- [`pr-title`](pr-title/): checks a pull request's title is a conventional commit.

None of them needs a checkout, and none has dependencies.

## Releases

Every push to `main` is tagged `vX.Y.Z` by this repo's own `auto-semver`
`tag` and `release` (`.github/workflows/release.yml`), so commit subjects should be [conventional commits](https://www.conventionalcommits.org/).
Pin a release's commit SHA when using an action.
