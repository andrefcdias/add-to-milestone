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
    milestone: "Milestone *"
    use-expression: true
```

_Note: Check [minmatch](https://github.com/isaacs/minimatch) for more information on possible patterns_

## Inputs

| Name              | Description                                                                               | Required | Default |
| ----------------- | ----------------------------------------------------------------------------------------- | -------- | ------- |
| `repo-token`      | Github token. _Use *${{ secrets.GITHUB_TOKEN }}* for an automatically generated one._     | `true`   |         |
| `milestone`       | Name of the milestone or glob pattern                                                     | `true`   |         |
| `use-expression`  | Trigger pattern matching using globs with [minmatch](https://github.com/isaacs/minimatch) | `false`  | `false` |
| `allow-inactive`  | Control if milestones past their due date should be included                              | `false`  | `false` |
| `users-file-path` | Name of the file that contains users for whom the action will trigger for                 | `false`  |         |

### `users-file-path`

The purpose of this property is to give you some flexibility with larger repositories, where you want to add internal maintainers or have a more granular approach to whose work gets added to what milestone.
The quick solution here is to have a file with a list of users, one per line, and add the path of said file to the `users-file-path` property.
There is a planned intention to integrate with Github Enterprise to filter per team, but I haven't had time to tinker around with the [plugin](https://github.com/octokit/plugin-enterprise-server.js).

Example:

#### .github/MAINTAINERS

```
user1
user2
user3
```

#### .github/workflows/action.yml

```
{...}

steps:
- uses: andrefcdias/add-to-milestone
  with:
    repo-token: "${{ secrets.GITHUB_TOKEN }}"
    milestone: "Cool internal stuff"
    users-file-path: ".github/MAINTAINERS"
```

# Contributions

Feel free to contribute to this project in any way you like as this was pretty much hacked together in a short amount of time.
