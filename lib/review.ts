/**
 * AI Commit Tool - Code Review Assistant
 *
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Performs AI-powered code reviews of staged changes before commits
 */

import { getStagedDiff, isGitRepository } from './git';
import { performCodeReview as performCodeReviewAI } from './ai';
import { displayCodeReview } from './formatter';
import { CommandOptions, makeStatus, nothingToPrint } from './output';

export const performCodeReview = async ({ print = false }: CommandOptions = {}): Promise<void> => {
  const status = makeStatus(print);

  try {
    // Check if we're in a git repository
    if (!isGitRepository()) {
      console.error('❌ Not in a git repository');
      process.exit(1);
      return; // Explicit return for testing environments where process.exit is mocked
    }

    status('🔍 Analyzing staged changes for code review...');

    const diff = getStagedDiff();

    if (!diff.trim()) {
      status('❌ No staged changes detected');
      status('Use `git add` to stage files for review');
      return nothingToPrint(print);
    }

    status('🤖 Performing AI code review...');

    const review = await performCodeReviewAI(diff);

    if (print) {
      process.stdout.write(`${review}\n`);
      return;
    }

    await displayCodeReview(review);
  } catch (error) {
    console.error(`❌ Failed to perform code review: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
};
