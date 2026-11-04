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
      assets: |
        dist/*.tar.gz
        dist/*.zip
      notes-footer: |
        ## Container image

        `ghcr.io/owner/app:1.2.3`
```

The notes group the commits under **Breaking changes**, **Features**,
**Fixes** and **Other changes**, oldest first, each as its subject without
the type, the scope in bold, and the short SHA. They end with a link
comparing the previous release. A first release lists the newest 100
commits.

With `assets`, a **Downloads** table links each file with its SHA-256,
and each file gets its own `<name>.sha256` beside it, so it can be
downloaded and checked on its own with `sha256sum -c <name>.sha256`. Then comes `notes-footer`, if given.

Running it again for the same tag updates the release, replacing assets
of the same names.

| Input | Default | |
|---|---|---|
| `token` | `${{ github.token }}` | Needs `contents: write`. |
| `tag` | | The release tag. It must exist already. |
| `assets` | | Files to attach, newline- or comma-separated. A `*` in a file name matches any run of characters. A path that matches nothing fails. |
| `checksums` | `true` | Attach a `<name>.sha256` beside each asset, in `sha256sum` format. |
| `notes-footer` | | Markdown added after the changes and downloads. |

| Output | |
|---|---|
| `url` | The release's page. |
