# pr-title

Checks that a pull request's title is a
[conventional commit](https://www.conventionalcommits.org/) subject. A
squash merge makes the title the commit on `main`, and that's what
`auto-semver` reads to version the release. It reads the title from the
event, so it needs no API calls, token or checkout.

```yaml
on:
  pull_request:
    types: [opened, edited, synchronize, reopened]
jobs:
  pr-title:
    runs-on: ubuntu-latest
    steps:
      - uses: ynochange/actions/pr-title@<commit sha>
```

A title is `type(scope)!: subject`, with the scope and `!` optional and a
space after the colon. A failing check says what's wrong.

| Input | Default | |
|---|---|---|
| `types` | `feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert` | Allowed types. |
| `scopes` | any | Allowed scopes, comma-separated. |
| `require-scope` | `false` | Require a scope. |
| `subject-pattern` | any | A regular expression the subject must match. |
| `title` | the pull request's | The title to check. |
