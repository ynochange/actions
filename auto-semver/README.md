# auto-semver

Works out the next [semver](https://semver.org/) release from the
[conventional commits](https://www.conventionalcommits.org/) since the last
`vX.Y.Z` tag, and outputs `version`, `tag` and `bump`. It reads tags and
commits through the GitHub REST API, so it needs no checkout. It has no
dependencies.

## Usage

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write # to push the tag
    steps:
      - id: semver
        uses: ynochange/actions/auto-semver@<commit sha>
      - if: steps.semver.outputs.tag != ''
        uses: ynochange/actions/tag@<commit sha>
        with:
          tags: ${{ steps.semver.outputs.tag }}
```

## Inputs

| Input | Default | |
|---|---|---|
| `token` | `${{ github.token }}` | Reads tags and commits. |

## Outputs

| Output | |
|---|---|
| `version` | The next version, e.g. `1.2.3`. When HEAD already has a release tag, that version. |
| `tag` | The tag to push, e.g. `v1.2.3`. Empty when there's nothing to tag. |
| `bump` | `major`, `minor` or `patch`. Empty when there's nothing to release. |

## Rules

The biggest bump among the commits since the last release wins.

| Commit | Bump |
|---|---|
| Subject `type!:` or `type(scope)!:` | major |
| Any line `BREAKING CHANGE:` or `BREAKING-CHANGE:` | major |
| Subject `feat:` or `feat(scope):` | minor |
| Anything else, conventional or not | patch |

The whole message is read, so a `BREAKING CHANGE:` footer in a squash
merge's body counts.

**Before 1.0.0** a major bump moves the minor instead: `0.4.7` becomes
`0.5.0`, and `bump` still says `major`. Going to 1.0.0 is a release
commitment no commit should make: tag `v1.0.0` by hand.

Only plain `vX.Y.Z` tags are releases; others, including pre-releases,
are ignored.

## Edge cases

- **HEAD already released:** `version` is that release, `tag` is empty, so a
  re-run republishes and tags nothing.
- **No release yet:** the patch starts from the number of commits, so the
  first release reflects the history. Tag a starting version, such as
  `v0.1.0`, by hand to start elsewhere.
- **The next tag exists:** all outputs are empty.
- **The latest release tag isn't on the branch:** the action fails rather
  than count from an unrelated commit. Tag the tip of the branch by hand
  to resume.

## Development

```sh
npm test
```
