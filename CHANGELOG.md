# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

This will be the first published release.

### Added

- `commit` generates a conventional commit message for the staged diff and lets you accept, rewrite, regenerate or abandon it.
- `pr` writes a pull request description from the branch's commits and diff.
- `review` performs a code review of the staged changes.
- `branch` suggests conventional branch names from the working changes and creates the chosen one.
- `hook install` sets up a `prepare-commit-msg` hook that pre-fills `git commit` with a suggested message; `hook uninstall` removes it and `hook show` prints the script. The hook never touches a hook it did not write, and `AI_COMMIT_SKIP=1` bypasses it for one commit.
- `--print` writes the generated text to stdout for any command, with progress on stderr and a non-zero exit when there is nothing to produce, so the tool works in git hooks, editors, scripts and CI.
- `--yes` commits the generated message without the prompt.
- `--model` overrides the model for one run; `--version` prints the installed version.
- Secrets are redacted from diffs before they are sent to a model, and the tool warns when the diff touches credential files.
- Lockfiles, minified bundles and source maps are left out of the diff sent to the model, with a stub so the model still knows they changed. `AI_COMMIT_EXCLUDE` adds patterns and `AI_COMMIT_DISABLE_EXCLUDES=1` turns the filter off.
- Credentials can live in a per-user config file at `~/.config/ai-commit/.env` (respects `XDG_CONFIG_HOME`), so a globally installed CLI does not need a `.env` in every repository.
- Works with any OpenAI-compatible server via `OPENAI_API_BASE`, including Ollama and LM Studio. `AI_COMMIT_TIMEOUT_MS` adjusts the request timeout for slow local models.
- API failures are reported as plain explanations of what to fix (wrong key, unknown model, rate limit, unreachable server, timeout) instead of raw SDK errors.
- Generated PR descriptions and reviews are saved under `.git/ai-commit/`, never in the working tree.
- Git is always invoked with an argument array, so commit messages and branch names containing shell metacharacters are safe.

[Unreleased]: https://github.com/edwin-menjivar/ai-commit/commits/main
