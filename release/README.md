# release

Creates the GitHub release for a `vX.Y.Z` tag, with notes from the
[conventional commits](https://www.conventionalcommits.org/) since the
previous release tag. It needs no checkout and has no dependencies.

```yaml
permissions:
  contents: write
steps:
  - id: semver
    uses: ynochange/actions/auto-semver@<commit sha>
  - if: steps.semver.outputs.tag != ''
    uses: ynochange/actions/tag@<commit sha>
    with:
      tags: ${{ steps.semver.outputs.tag }}
  - if: steps.semver.outputs.tag != ''
    uses: ynochange/actions/release@<commit sha>
    with:
      tag: ${{ steps.semver.outputs.tag }}
```

The notes group the commits under **Breaking changes**, **Features**,
**Fixes** and **Other changes**, oldest first, each as its subject without
the type, the scope in bold, and the short SHA. They end with a link
comparing the previous release. A first release lists the newest 100
commits. Running it again for the same tag updates the release.

| Input | Default | |
|---|---|---|
| `token` | `${{ github.token }}` | Needs `contents: write`. |
| `tag` | | The release tag. It must exist already. |

| Output | |
|---|---|
| `url` | The release's page. |
