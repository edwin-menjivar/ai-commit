# Contributing

Thanks for your interest in improving ai-commit. Bug reports, feature ideas and pull requests are all welcome.

## Getting set up

```bash
git clone https://github.com/edwin-menjivar/ai-commit.git
cd ai-commit
npm install          # also builds dist/ via the prepare script
npm link             # makes `ai-commit` available globally, pointing at this checkout
```

You need Node.js 18 or newer. To exercise the tool against a real model, put an `OPENAI_API_KEY` in `.env` (see `.env.example`) or point `OPENAI_API_BASE` at a local server such as Ollama.

## Day-to-day commands

| Command                | What it does                      |
| ---------------------- | --------------------------------- |
| `npm run build`        | Compile TypeScript into `dist/`   |
| `npm test`             | Run the Jest suite                |
| `npm run test:watch`   | Re-run tests on change            |
| `npm run typecheck`    | Type-check without emitting       |
| `npm run lint`         | ESLint                            |
| `npm run format`       | Format everything with Prettier   |
| `npm run format:check` | Fail if anything is not formatted |

CI runs typecheck, lint, format check, build and tests on every push and pull request, so running them locally first saves a round trip.

## Making a change

1. Open an issue first for anything larger than a small fix, so we can agree on the approach before you invest time in it.
2. Branch from `main`. Conventional branch names (`feat/...`, `fix/...`, `docs/...`) are appreciated but not required. `ai-commit branch` will suggest one.
3. Keep pull requests focused on one thing. Unrelated refactors or formatting changes belong in their own PR.
4. Add or update tests. Every module under `lib/` has a matching file in `__tests__/`; new behaviour should be covered there, and bug fixes should include a test that failed before the fix.
5. Update `README.md` if you change user-facing behaviour, and add a line to the `Unreleased` section of `CHANGELOG.md`.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`, for example `fix(redact): catch Azure storage keys`. The tool itself is a fine way to write them.

## Code style

Prettier and ESLint are the source of truth, so there is little to remember. Beyond that:

- Prefer small, pure functions in `lib/`; keep terminal I/O in `formatter.ts` and `prompt.ts`.
- Never build git commands from strings. Pass arguments as an array (see `lib/git.ts`), so user input is never interpreted by a shell.
- Anything sent to a model must go through `prepareDiff` in `lib/ai.ts`, so secret redaction and size limits apply.
- Comments should explain why, not what. If a line needs a comment to say what it does, consider renaming or restructuring instead.

## Reporting bugs and requesting features

Use the issue templates. For bugs, include the command you ran, the output (with any keys removed), your OS, Node version and `ai-commit --version`. For anything security-related, see [SECURITY.md](SECURITY.md) rather than opening a public issue.

## License

By contributing you agree that your contributions will be licensed under the [MIT License](LICENSE).
