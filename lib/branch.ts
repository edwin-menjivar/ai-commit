/**
 * AI Commit Tool - Branch Naming
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Generates AI-powered branch name suggestions based on current changes
 */

import {
  getAllChangesDiff,
  getUnstagedDiff,
  getStagedDiff,
  isGitRepository,
  createBranch,
  checkoutBranch,
  branchExists,
  getCurrentBranch,
} from './git';
import { generateBranchNameSuggestions } from './ai';
import { selectBranchName } from './formatter';
import { confirm } from './prompt';

// git allows more than this, but AI-suggested names should stay conventional.
const VALID_BRANCH_NAME = /^[a-z0-9]([a-z0-9._\-/]*[a-z0-9])?$/;

export const suggestBranchName = async (): Promise<void> => {
  try {
    // Check if we're in a git repository
    if (!isGitRepository()) {
      console.error('❌ Not in a git repository');
      process.exit(1);
      return;
    }

    const currentBranch = getCurrentBranch();

    // Check if we're on a main branch
    if (['main', 'master', 'develop'].includes(currentBranch)) {
      console.log(`ℹ️  You're on ${currentBranch}. Creating a new branch is recommended.`);
    }

    console.log(`\n🔍 Analyzing your changes...`);

    // Get changes - prefer unstaged, but include staged if available
    const stagedDiff = getStagedDiff();
    const unstagedDiff = getUnstagedDiff();

    let diff: string;
    if (unstagedDiff.trim()) {
      diff = unstagedDiff;
      console.log('📝 Found unstaged changes');
    } else if (stagedDiff.trim()) {
      diff = stagedDiff;
      console.log('📝 Found staged changes');
    } else {
      // Try to get all changes
      diff = getAllChangesDiff();
      if (!diff.trim()) {
        console.log('❌ No changes detected. Make some changes first, then run this command.');
        return;
      }
    }

    console.log('🤖 Generating branch name suggestions...');

    const suggestions = await generateBranchNameSuggestions(diff);

    if (suggestions.length === 0) {
      console.log('❌ Failed to generate branch name suggestions.');
      return;
    }

    const selectedName = await selectBranchName(suggestions);

    if (!selectedName) {
      return; // User cancelled
    }

    if (!VALID_BRANCH_NAME.test(selectedName)) {
      console.log('⚠️  Warning: Branch name should use lowercase letters, numbers, hyphens, and slashes only.');
      if (!(await confirm('Create branch anyway? (y/n): '))) {
        console.log('Branch creation cancelled.');
        return;
      }
    }

    await createBranchIfNotExists(selectedName);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

const createBranchIfNotExists = async (branchName: string): Promise<void> => {
  if (branchExists(branchName)) {
    console.log(`⚠️  Branch "${branchName}" already exists.`);

    if (!(await confirm('Switch to this branch? (y/n): '))) {
      return;
    }

    try {
      checkoutBranch(branchName);
      console.log(`✅ Switched to branch: ${branchName}`);
    } catch (error) {
      console.error(`❌ Failed to switch to branch: ${error instanceof Error ? error.message : error}`);
    }
    return;
  }

  try {
    createBranch(branchName);
    console.log(`✅ Created and switched to branch: ${branchName}`);
  } catch (error) {
    console.error(`❌ Failed to create branch: ${error instanceof Error ? error.message : error}`);
  }
};
