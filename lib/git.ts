/**
 * AI Commit Tool - Git Operations
 *
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Handles git operations for retrieving staged changes and committing with messages
 */

import { execFileSync } from 'child_process';

// Diffs of a whole branch routinely exceed execFile's 1 MB default, which would
// otherwise fail with ENOBUFS on anything but a small change set.
const MAX_BUFFER = 64 * 1024 * 1024;

const BRANCH_CANDIDATES = ['main', 'master', 'develop'];

/**
 * Run git and capture its output.
 *
 * Arguments are passed as an argv array rather than a shell string so that
 * commit messages and branch names containing quotes, backticks or `$(...)`
 * are treated as data instead of shell syntax.
 */
const git = (args: string[]): string =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: MAX_BUFFER });

/** Run git with its output attached to the terminal (for interactive/progress output). */
const gitInherit = (args: string[]): void => {
  execFileSync('git', args, { stdio: 'inherit' });
};

/** True when `ref` resolves to a commit. Exact, unlike matching against `git branch` output. */
const refExists = (ref: string): boolean => {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

export const getStagedDiff = (): string => {
  return git(['diff', '--cached']);
};

export const commitChanges = (message: string): void => {
  gitInherit(['commit', '-m', message]);
};

export const getCurrentBranch = (): string => {
  return git(['branch', '--show-current']).trim();
};

export const getMainBranch = (): string => {
  try {
    // origin/HEAD records the remote's default branch when the remote advertises it.
    const head = git(['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD']).trim();
    if (head.startsWith('origin/')) {
      return head.slice('origin/'.length);
    }
  } catch {
    // origin/HEAD is often unset on clones that never ran `git remote set-head`.
  }

  // Prefer a remote branch, then fall back to local ones so repositories
  // without a remote still resolve to the branch they actually use.
  for (const candidate of BRANCH_CANDIDATES) {
    if (refExists(`refs/remotes/origin/${candidate}`)) return candidate;
  }
  for (const candidate of BRANCH_CANDIDATES) {
    if (refExists(`refs/heads/${candidate}`)) return candidate;
  }

  return 'main';
};

export const getBranchCommits = (branch?: string): string => {
  const currentBranch = branch || getCurrentBranch();
  const mainBranch = getMainBranch();

  try {
    // Get commits that are in current branch but not in main branch
    return git(['log', `${mainBranch}..${currentBranch}`, '--oneline']);
  } catch {
    // Fallback: get recent commits if branch comparison fails
    return git(['log', '--oneline', '-10']);
  }
};

export const getBranchDiff = (branch?: string): string => {
  const currentBranch = branch || getCurrentBranch();
  const mainBranch = getMainBranch();

  try {
    // Get full diff between main and current branch
    return git(['diff', `${mainBranch}...${currentBranch}`]);
  } catch {
    // Fallback: get recent changes
    return git(['diff', 'HEAD~5..HEAD']);
  }
};

export const isGitRepository = (): boolean => {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

export const getUnstagedDiff = (): string => {
  return git(['diff']);
};

export const getAllChangesDiff = (): string => {
  // Get both staged and unstaged changes
  const staged = git(['diff', '--cached']);
  const unstaged = git(['diff']);
  return `${staged}\n${unstaged}`.trim();
};

export const createBranch = (branchName: string): void => {
  gitInherit(['checkout', '-b', branchName]);
};

export const checkoutBranch = (branchName: string): void => {
  gitInherit(['checkout', branchName]);
};

/**
 * Absolute path to the repository's .git directory.
 *
 * Generated output goes in here rather than the working tree: the tool runs in
 * other people's repositories, where we cannot add anything to their
 * .gitignore, and files written to the working tree get picked up by a
 * subsequent `git add .`.
 */
export const getGitDir = (): string => {
  return git(['rev-parse', '--absolute-git-dir']).trim();
};

export const branchExists = (branchName: string): boolean => {
  return refExists(`refs/heads/${branchName}`) || refExists(`refs/remotes/origin/${branchName}`);
};
