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
import { CommandOptions, makeStatus, nothingToPrint } from './output';

export const generatePRDescription = async ({ print = false }: CommandOptions = {}): Promise<void> => {
  const status = makeStatus(print);

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
      status(
        '⚠️  You appear to be on a main branch. PR descriptions are typically generated from feature branches.'
      );
      status(`Current branch: ${currentBranch}`);
      status('Consider switching to a feature branch first.');
      return nothingToPrint(print);
    }

    status(`\n🔍 Analyzing branch: ${currentBranch}`);

    // Get commits in this branch
    const commits = getBranchCommits();

    if (!commits.trim()) {
      status('❌ No commits found in this branch compared to main branch');
      status('Make sure you have commits that are not in the main branch');
      return nothingToPrint(print);
    }

    status(`📝 Found ${commits.split('\n').filter((line) => line.trim()).length} commit(s) in this branch`);

    // Get the full diff for this branch
    status('🔍 Analyzing changes...');
    const diff = getBranchDiff();

    if (!diff.trim()) {
      status('❌ No changes found in this branch');
      return nothingToPrint(print);
    }

    status('🤖 Generating PR description...');

    const prDescription = await generatePRDescriptionAI(commits, diff, currentBranch);

    if (print) {
      process.stdout.write(`${prDescription}\n`);
      return;
    }

    await confirmPRDescription(prDescription, currentBranch);
  } catch (error) {
    console.error(`❌ Failed to generate PR description: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
};
