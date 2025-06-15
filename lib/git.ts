/**
 * AI Commit Tool - Git Operations
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Handles git operations for retrieving staged changes and committing with messages
 */

import { execSync } from 'child_process';

export const getStagedDiff = (): string => {
  return execSync('git diff --cached').toString();
};

export const commitChanges = (message: string): void => {
  execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
};

export const getCurrentBranch = (): string => {
  return execSync('git branch --show-current').toString().trim();
};

export const getMainBranch = (): string => {
  try {
    // Try common main branch names
    const branches = execSync('git branch -r').toString();
    if (branches.includes('origin/main')) return 'main';
    if (branches.includes('origin/master')) return 'master';
    if (branches.includes('origin/develop')) return 'develop';
    return 'main'; // fallback
  } catch {
    return 'main';
  }
};

export const getBranchCommits = (branch?: string): string => {
  const currentBranch = branch || getCurrentBranch();
  const mainBranch = getMainBranch();
  
  try {
    // Get commits that are in current branch but not in main branch
    return execSync(`git log ${mainBranch}..${currentBranch} --oneline`).toString();
  } catch {
    // Fallback: get recent commits if branch comparison fails
    return execSync(`git log --oneline -10`).toString();
  }
};

export const getBranchDiff = (branch?: string): string => {
  const currentBranch = branch || getCurrentBranch();
  const mainBranch = getMainBranch();
  
  try {
    // Get full diff between main and current branch
    return execSync(`git diff ${mainBranch}...${currentBranch}`).toString();
  } catch {
    // Fallback: get recent changes
    return execSync(`git diff HEAD~5..HEAD`).toString();
  }
};

export const isGitRepository = (): boolean => {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
