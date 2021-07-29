# Add to milestone

<p>
  <a href="https://github.com/andrefcdias/add-to-milestone/actions/workflows/ci.yml">
    <img alt="build and test status" src="https://github.com/andrefcdias/add-to-milestone/actions/workflows/ci.yml/badge.svg">
  </a>
</p>

Automatically adds new pull requests to a milestone, based on the name/pattern configured.

## Usage

Simply add the following to your existing workflow:

```
{...}

steps:
- uses: andrefcdias/add-to-milestone
  with:
    repo-token: "${{ secrets.GITHUB_TOKEN }}"
    milestone: "Milestone name"
```

For patterns, use the following:

```
{...}

steps:
- uses: andrefcdias/add-to-milestone
  with:
    repo-token: "${{ secrets.GITHUB_TOKEN }}"
    use-pattern: true
    milestone: "Milestone *"
```

_Note: Check [minmatch](https://github.com/isaacs/minimatch) for more information on possible patterns_

## Inputs

| Name             | Description                                                                               | Required | Default |
| ---------------- | ----------------------------------------------------------------------------------------- | -------- | ------- |
| `repo-token`     | Github token. _Use *${{ secrets.GITHUB_TOKEN }}* for an automatically generated one._     | `true`   |         |
| `use-expression` | Trigger pattern matching using globs with [minmatch](https://github.com/isaacs/minimatch) | `false`  | `false` |
| `allow-inactive` | Control if milestones past their due date should be included                              | `false`  | `false` |
| `milestone`      | Name of the milestone or glob pattern                                                     | `true`   |         |

# Contributions

Feel free to contribute to this project in any way you like as this was pretty much hacked together in a short amount of time.
