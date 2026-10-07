# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

This will be the first published release.

### Added

- `commit` generates a conventional commit message for the staged diff and lets you accept, replace or abandon it.
- `pr` writes a pull request description from the branch's commits and diff.
- `review` performs a code review of the staged changes.
- `branch` suggests conventional branch names from the working changes and creates the chosen one.
- `--print` writes the generated commit message to stdout without prompting or committing, for git hooks, editors and scripts.
- `--model` overrides the model for one run; `--version` prints the installed version.
- Secrets are redacted from diffs before they are sent to a model, and the tool warns when the diff touches credential files.
- Credentials can live in a per-user config file at `~/.config/ai-commit/.env` (respects `XDG_CONFIG_HOME`), so a globally installed CLI does not need a `.env` in every repository.
- Works with any OpenAI-compatible server via `OPENAI_API_BASE`, including Ollama and LM Studio.
- Generated PR descriptions and reviews are saved under `.git/ai-commit/`, never in the working tree.
- Git is always invoked with an argument array, so commit messages and branch names containing shell metacharacters are safe.

[Unreleased]: https://github.com/edwin-menjivar/ai-commit/commits/main
