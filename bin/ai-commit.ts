#!/usr/bin/env node

/**
 * AI Commit Tool - Main Entry Point
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description CLI tool that automatically generates AI-powered commit messages and assists with git workflow
 */

import { getStagedDiff, commitChanges } from '../lib/git';
import { generateCommitMessage } from '../lib/ai';
import { confirmCommitMessage } from '../lib/formatter';
import { generatePRDescription } from '../lib/pr';
import { performCodeReview } from '../lib/review';

const showHelp = () => {
  console.log(`
🤖 AI Git Assistant

Usage:
  ai-commit [command]

Commands:
  commit (default)  Generate AI-powered commit message for staged changes
  pr               Generate pull request description from branch commits
  review           AI code review of staged changes before commit
  help             Show this help message

Examples:
  ai-commit              # Generate commit message (default)
  ai-commit commit       # Generate commit message
  ai-commit pr           # Generate PR description
  ai-commit review       # Review staged changes
`);
};

const runCommit = async () => {
  try {
    const diff = getStagedDiff();

    if (!diff) {
      console.log('No staged changes detected.');
      process.exit(0);
    }

    const aiMessage = await generateCommitMessage(diff);
    const finalMessage = await confirmCommitMessage(aiMessage);

    commitChanges(finalMessage);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

const runPR = async () => {
  try {
    await generatePRDescription();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

const runReview = async () => {
  try {
    await performCodeReview();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

(async () => {
  const command = process.argv[2] || 'commit';

  switch (command) {
    case 'commit':
      await runCommit();
      break;
    case 'pr':
      await runPR();
      break;
    case 'review':
      await runReview();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      // If no recognized command, treat as default commit
      if (command.startsWith('-')) {
        showHelp();
        process.exit(1);
      } else {
        await runCommit();
      }
  }
})();
