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
