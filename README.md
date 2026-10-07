# ai-commit

[![CI](https://github.com/edwin-menjivar/ai-commit/actions/workflows/ci.yml/badge.svg)](https://github.com/edwin-menjivar/ai-commit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40edwin-menjivar%2Fai-commit)](https://www.npmjs.com/package/@edwin-menjivar/ai-commit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

AI-powered git assistant. Generates conventional commit messages, pull request descriptions, code reviews and branch names from your diff, using the OpenAI API or any OpenAI-compatible local model.

```
$ git add .
$ ai-commit

🤖 Generated commit message:
   "feat(auth): add password reset flow"

Accept this message? [Y]es / [n]o, write my own / [q]uit:
```

## Features

- **Commit messages**: `ai-commit` turns the staged diff into a `type(scope): description` message you can accept, rewrite or abandon.
- **Pull request descriptions**: `ai-commit pr` summarises the branch's commits and diff into a structured, Markdown PR description.
- **Code review**: `ai-commit review` reviews the staged changes for bugs, security issues, performance and style before you commit.
- **Branch names**: `ai-commit branch` suggests conventional branch names from your working changes and creates the one you pick.
- **Scriptable**: `ai-commit --print` writes the message to stdout for git hooks, editors and scripts.
- **Secret redaction**: credentials are stripped from diffs before anything leaves your machine, and you are warned when a diff touches `.env` or key files.
- **Bring your own model**: works with OpenAI, or with Ollama, LM Studio, vLLM and anything else that speaks the chat-completions API.
- **Nothing lands in your working tree**: generated files go to `.git/ai-commit/`, so `git add .` can never commit them.

## Installation

Requires Node.js 18 or newer.

```bash
npm install -g @edwin-menjivar/ai-commit
```

Or run it without installing:

```bash
npx @edwin-menjivar/ai-commit
```

To install from source instead:

```bash
git clone https://github.com/edwin-menjivar/ai-commit.git
cd ai-commit
npm install     # builds dist/ as well
npm link        # exposes `ai-commit` globally, pointing at this checkout
```

To uninstall: `npm uninstall -g @edwin-menjivar/ai-commit` (or `npm unlink -g @edwin-menjivar/ai-commit` for a linked checkout).

## Configuration

Settings are read from, in order of precedence:

1. Variables exported in your shell
2. `.env` in the current directory
3. `~/.config/ai-commit/.env` (or `$XDG_CONFIG_HOME/ai-commit/.env`)

The per-user file is the easiest for a globally installed CLI:

```bash
mkdir -p ~/.config/ai-commit
printf 'OPENAI_API_KEY=sk-...\n' > ~/.config/ai-commit/.env
chmod 600 ~/.config/ai-commit/.env
```

| Variable                      | Required | Default                     | Purpose                                                                                                                               |
| ----------------------------- | -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`              | yes      |                             | API key. Get one at [platform.openai.com](https://platform.openai.com/account/api-keys). Any non-empty value works for local servers. |
| `OPENAI_MODEL`                | no       | `gpt-4o-mini`               | Model name. `--model` overrides it for a single run.                                                                                  |
| `OPENAI_API_BASE`             | no       | `https://api.openai.com/v1` | Base URL of any OpenAI-compatible server.                                                                                             |
| `AI_COMMIT_DISABLE_REDACTION` | no       |                             | Set to `1` to send diffs without stripping secrets. Not recommended.                                                                  |

See [`.env.example`](.env.example) for a template.

### Using a local model

Point `OPENAI_API_BASE` at a local server and your diffs never leave your machine:

```env
# Ollama
OPENAI_API_BASE=http://localhost:11434/v1
OPENAI_MODEL=llama3
OPENAI_API_KEY=ollama   # required by the client, ignored by Ollama
```

LM Studio, vLLM, LocalAI and similar servers work the same way.

## Usage

```
ai-commit [command] [options]

Commands:
  commit (default)  Generate a commit message for the staged changes
  pr                Generate a pull request description for the current branch
  review            Review the staged changes
  branch            Suggest branch names from the current changes
  help              Show help

Options:
  -m, --model <model>  Model to use for this run
  -p, --print          Print the generated commit message and exit (commit only)
  -v, --version        Print the installed version
  -h, --help           Show help
```

### Commit messages

```bash
git add .
ai-commit                     # or: ai-commit commit
ai-commit --model gpt-4o      # a different model for this run
```

You are shown the message and can accept it, type your own, or quit without committing.

### Non-interactive use and git hooks

`--print` skips the prompt and writes only the message to stdout. Warnings go to stderr, and the exit code is non-zero if nothing is staged or the model returned nothing.

```bash
git commit -m "$(ai-commit --print)"
```

To have git pre-fill the editor every time you run `git commit`, add a `prepare-commit-msg` hook:

```sh
#!/bin/sh
# .git/hooks/prepare-commit-msg  (chmod +x)
# $1 is the message file, $2 is the source. Only act on a plain `git commit`
# so -m, --amend, merges and squashes keep their own message.
[ -n "$2" ] && exit 0
msg="$(ai-commit --print 2>/dev/null)" || exit 0
printf '%s\n\n%s' "$msg" "$(cat "$1")" > "$1"
```

### Pull request descriptions

```bash
git checkout feat/new-login-system
ai-commit pr
```

Compares the branch against `main` (or `master`/`develop`, or whatever `origin/HEAD` points at), then produces a description with a title, summary, key changes, breaking changes and testing notes. You can save it to `.git/ai-commit/pr-description-<branch>.md` to paste into GitHub or GitLab.

### Code review

```bash
git add .
ai-commit review
```

Reviews the staged diff for code quality, bugs, security, performance, style and architecture, and offers to save the result to `.git/ai-commit/code-review-<timestamp>.md`.

### Branch names

```bash
ai-commit branch
```

Suggests three conventional names such as `feat/user-authentication`, lets you pick one or type your own, and creates and switches to it. If the branch already exists it offers to switch instead.

## Privacy and secret redaction

Diffs, commit lists and branch names are sent to the configured API endpoint. Before a request is made, anything that looks like a credential is replaced with `[REDACTED]`: provider tokens (OpenAI, GitHub, AWS, Google, Slack, Stripe), JSON Web Tokens, private key blocks, credentials embedded in URLs, and `KEY=value` assignments whose name looks secret-ish. The tool also warns when the diff touches files that usually hold credentials (`.env`, `id_rsa`, `*.pem`, `credentials.json`, ...).

```
$ ai-commit                     # with a staged .env
⚠️  The diff touches files that usually hold credentials: .env
   Their contents are redacted before sending, but consider unstaging them.
🔒 Redacted 2 possible secrets before sending the diff.
```

Redaction is pattern-based and cannot catch everything. Treat it as a safety net, not a guarantee, and avoid staging secrets in the first place. For full control, use a [local model](#using-a-local-model).

Very large diffs are truncated before sending so that a big branch does not fail outright; the model is told how much was cut.

## Troubleshooting

- **`OPENAI_API_KEY is not set`**: export it in your shell or create one of the config files listed under [Configuration](#configuration). Run `ai-commit help` to see the paths.
- **`Not in a git repository`**: every command except `help` and `--version` must be run inside a repository.
- **`No staged changes detected`**: `commit` and `review` only look at staged changes. Run `git add` first. `branch` uses unstaged changes as well.
- **`401` or `invalid_api_key` from the API**: the key is wrong or has been revoked. If you use a local server, make sure `OPENAI_API_BASE` ends in `/v1`.
- **`model not found`**: the model name in `OPENAI_MODEL` or `--model` does not exist on the server you are pointing at. With Ollama, pull it first (`ollama pull llama3`).
- **The command hangs or exits with no output**: stdin is not a terminal (for example in a script). Use `--print` for non-interactive use.

## Development

```bash
npm install          # installs dependencies and builds dist/
npm test             # Jest suite
npm run test:watch
npm run typecheck
npm run lint         # ESLint
npm run format       # Prettier
npm run build
```

CI runs typecheck, lint, format check, build, tests and a smoke test of the built CLI on Node 18, 20, 22 and 24.

```
ai-commit/
├── bin/ai-commit.ts    # CLI entry point: argument parsing and command routing
├── lib/
│   ├── ai.ts           # Prompts and the OpenAI client; all model calls go through here
│   ├── redact.ts       # Strips secrets from diffs before they are sent
│   ├── git.ts          # Git operations (always argv arrays, never shell strings)
│   ├── formatter.ts    # Terminal output, prompts and saving generated files
│   ├── prompt.ts       # Promise-based readline helpers
│   ├── pr.ts           # `pr` command
│   ├── review.ts       # `review` command
│   └── branch.ts       # `branch` command
└── __tests__/          # One test file per module
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to propose changes, and [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## Roadmap

- Custom prompt templates
- A `hook` command that installs the `prepare-commit-msg` hook for you
- Automated changelog generation
- Multi-language commit messages

Ideas and pull requests are welcome; open an issue to discuss anything larger than a small fix.

## License

[MIT](LICENSE) © Edwin Menjivar
