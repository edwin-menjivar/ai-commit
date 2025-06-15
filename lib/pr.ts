/**
 * AI Commit Tool - Pull Request Description Generator
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Generates AI-powered pull request descriptions from branch commits and changes
 */

import { getCurrentBranch, getBranchCommits, getBranchDiff, isGitRepository } from './git';
import { generatePRDescription as generatePRDescriptionAI } from './ai';
import { confirmPRDescription } from './formatter';

export const generatePRDescription = async (): Promise<void> => {
  try {
    // Check if we're in a git repository
    if (!isGitRepository()) {
      console.error('❌ Not in a git repository');
      process.exit(1);
      return; // Explicit return for testing environments where process.exit is mocked
    }

    const currentBranch = getCurrentBranch();
  
  // Check if we're on a main branch
  if (['main', 'master', 'develop'].includes(currentBranch)) {
    console.log('⚠️  You appear to be on a main branch. PR descriptions are typically generated from feature branches.');
    console.log(`Current branch: ${currentBranch}`);
    console.log('Consider switching to a feature branch first.');
    return;
  }

  console.log(`\n🔍 Analyzing branch: ${currentBranch}`);
  
  // Get commits in this branch
  const commits = getBranchCommits();
  
  if (!commits.trim()) {
    console.log('❌ No commits found in this branch compared to main branch');
    console.log('Make sure you have commits that are not in the main branch');
    return;
  }

  console.log(`📝 Found ${commits.split('\n').filter(line => line.trim()).length} commit(s) in this branch`);
  
  // Get the full diff for this branch
  console.log('🔍 Analyzing changes...');
  const diff = getBranchDiff();
  
  if (!diff.trim()) {
    console.log('❌ No changes found in this branch');
    return;
  }

  console.log('🤖 Generating PR description...');
  
    const prDescription = await generatePRDescriptionAI(commits, diff, currentBranch);
    await confirmPRDescription(prDescription, currentBranch);
  } catch (error) {
    console.error('❌ Failed to generate PR description:', error);
    process.exit(1);
  }
}; 