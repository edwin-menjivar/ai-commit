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

const parseArgs = () => {
  // Simple manual parsing for --model <model>
  const args = process.argv.slice(2);
  let command = 'commit';
  let model: string | undefined;
  const otherArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      model = args[i + 1];
      i++;
    } else if (['commit', 'pr', 'review', 'help', '--help', '-h'].includes(args[i])) {
      command = args[i];
    } else {
      otherArgs.push(args[i]);
    }
  }
  return { command, model, otherArgs };
};

const showHelp = () => {
  console.log(`
🤖 AI Git Assistant

Usage:
  ai-commit [command] [--model <model>]

Commands:
  commit (default)  Generate AI-powered commit message for staged changes
  pr               Generate pull request description from branch commits
  review           AI code review of staged changes before commit
  help             Show this help message

Options:
  --model <model>  Specify the OpenAI model to use (overrides env)

Examples:
  ai-commit                      # Generate commit message (default)
  ai-commit commit               # Generate commit message
  ai-commit pr                   # Generate PR description
  ai-commit review               # Review staged changes
  ai-commit --model gpt-4        # Use GPT-4 for commit message
  ai-commit pr --model gpt-3.5-turbo # Use GPT-3.5 for PR description
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
  const { command, model } = parseArgs();
  if (model) {
    process.env.OPENAI_MODEL = model;
  }

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
