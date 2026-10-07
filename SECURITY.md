# Security Policy

## What this tool sends where

ai-commit sends git diffs, commit lists and branch names to whatever endpoint `OPENAI_API_BASE` points at (api.openai.com by default). Before anything leaves your machine, `lib/redact.ts` strips values that look like credentials and warns when the diff touches files such as `.env` or private keys. Redaction is pattern-based and cannot be exhaustive; the only guaranteed protection is not staging secrets. If you want nothing to leave your machine, point `OPENAI_API_BASE` at a local model (see the README).

Generated files are written to `.git/ai-commit/`, never to the working tree, so they cannot be committed by accident.

Git is always invoked with an argument array, never a shell string, so commit messages and branch names are not interpreted by a shell.

## Supported versions

Only the latest release receives security fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems.

Use GitHub's private vulnerability reporting: open the **Security** tab of the repository and choose **Report a vulnerability**, or go directly to https://github.com/edwin-menjivar/ai-commit/security/advisories/new.

Include what you found, how to reproduce it and what you think the impact is. You should get an acknowledgement within a week. Once a fix is released, you will be credited in the changelog unless you prefer otherwise.

Reports about the redaction patterns (a secret format that gets through) are very welcome and can be handled as ordinary issues if the secret format itself is public knowledge; a pull request adding a pattern plus a test in `__tests__/redact.test.ts` is even better.
