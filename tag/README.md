# tag

Creates git tags on a commit through the GitHub REST API, so it needs no
checkout. It has no dependencies.

```yaml
permissions:
  contents: write
steps:
  - uses: ynochange/actions/tag@<commit sha>
    with:
      tags: v1.2.3
      floating-tags: v1,v1.2
```

## Inputs

| Input | Default | |
|---|---|---|
| `token` | `${{ github.token }}` | Needs `contents: write`. |
| `sha` | the workflow's commit | The commit to tag. |
| `tags` | | Comma-separated tags to create. One that already exists fails. |
| `floating-tags` | | Comma-separated tags to move to the commit, created if need be. |
| `continue-if-exists` | `false` | Skip a tag already at this commit rather than fail. One at another commit still fails. |
| `ignore-no-op` | `false` | Allow no tags at all; otherwise that fails. |

## Outputs

| Output | |
|---|---|
| `created` | Comma-separated tags created or moved. |
| `skipped` | Comma-separated tags already at the commit. |

Tags made with the workflow's own token don't start other workflows.
