/**
 * AI Commit Tool - Git Hook Installer
 *
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Installs a prepare-commit-msg hook that pre-fills the editor with a generated message
 */

import * as fs from 'fs';
import * as path from 'path';
import { getHooksDir } from './git';

export const HOOK_ACTIONS = ['install', 'uninstall', 'show'] as const;
export type HookAction = (typeof HOOK_ACTIONS)[number];

/** Identifies hooks written by this tool so that uninstall never deletes someone else's. */
export const HOOK_MARKER = '# Installed by ai-commit';

export const HOOK_SCRIPT = `#!/bin/sh
${HOOK_MARKER} (run \`ai-commit hook uninstall\` to remove)
#
# Pre-fills the commit message with an AI-generated suggestion when none was
# given. $1 is the message file and $2 the message source. A plain \`git commit\`
# passes no source; -m, --amend, merges and squashes bring their own message
# and are left alone. Set AI_COMMIT_SKIP=1 to bypass the hook for one commit.
[ -n "$2" ] && exit 0
[ -n "$AI_COMMIT_SKIP" ] && exit 0
msg="$(ai-commit --print 2>/dev/null)" || exit 0
printf '%s\\n\\n%s' "$msg" "$(cat "$1")" > "$1"
`;

const hookPath = (): string => path.join(getHooksDir(), 'prepare-commit-msg');

const isOurs = (contents: string): boolean => contents.includes(HOOK_MARKER);

export const installHook = (): void => {
  const target = hookPath();

  if (fs.existsSync(target) && !isOurs(fs.readFileSync(target, 'utf8'))) {
    throw new Error(
      `A prepare-commit-msg hook already exists at ${target} and was not installed by ai-commit.\n` +
        'Run `ai-commit hook show` and merge the snippet into it, or move it aside and try again.'
    );
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, HOOK_SCRIPT);
  // writeFileSync only applies a mode when it creates the file, so set it explicitly.
  fs.chmodSync(target, 0o755);

  console.log(`✅ Installed prepare-commit-msg hook at ${target}`);
  console.log(
    '   `git commit` will now open the editor with a suggested message. Set AI_COMMIT_SKIP=1 to bypass it.'
  );
};

export const uninstallHook = (): void => {
  const target = hookPath();

  if (!fs.existsSync(target)) {
    console.log('No prepare-commit-msg hook is installed.');
    return;
  }

  if (!isOurs(fs.readFileSync(target, 'utf8'))) {
    throw new Error(
      `The prepare-commit-msg hook at ${target} was not installed by ai-commit, so it was left alone.`
    );
  }

  fs.unlinkSync(target);
  console.log(`✅ Removed prepare-commit-msg hook at ${target}`);
};

export const showHook = (): void => {
  process.stdout.write(HOOK_SCRIPT);
};

export const runHookCommand = (action: HookAction): void => {
  switch (action) {
    case 'install':
      return installHook();
    case 'uninstall':
      return uninstallHook();
    case 'show':
      return showHook();
  }
};
