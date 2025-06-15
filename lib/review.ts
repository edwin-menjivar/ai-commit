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

export const performCodeReview = async (): Promise<void> => {
  try {
    // Check if we're in a git repository
    if (!isGitRepository()) {
      console.error('❌ Not in a git repository');
      process.exit(1);
      return; // Explicit return for testing environments where process.exit is mocked
    }

    console.log('🔍 Analyzing staged changes for code review...');
    
    const diff = getStagedDiff();
  
  if (!diff.trim()) {
    console.log('❌ No staged changes detected');
    console.log('Use `git add` to stage files for review');
    return;
  }

  console.log('🤖 Performing AI code review...');
  
    const review = await performCodeReviewAI(diff);
    await displayCodeReview(review);
  } catch (error) {
    console.error('❌ Failed to perform code review:', error);
    process.exit(1);
  }
}; 