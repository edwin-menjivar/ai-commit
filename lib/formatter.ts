/**
 * AI Commit Tool - Message Formatting & User Interaction
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Handles user confirmation and editing of generated commit messages
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { getGitDir } from './git';
import { ask } from './prompt';

// Guards against an unrecognised answer looping forever on a non-interactive stdin.
const MAX_PROMPT_ATTEMPTS = 3;

/**
 * Confirm, replace, or abandon the generated message.
 *
 * Returns null when the user declines to commit. The prompt used to treat any
 * unrecognised answer as the commit message itself, so replying "no thanks"
 * committed a message reading "no thanks"; the choices are now explicit.
 */
export const confirmCommitMessage = async (message: string): Promise<string | null> => {
  console.log(`\n🤖 Generated commit message:`);
  console.log(`   "${message}"\n`);

  for (let attempt = 0; attempt < MAX_PROMPT_ATTEMPTS; attempt++) {
    const response = await ask('Accept this message? [Y]es / [n]o, write my own / [q]uit: ');

    if (response === null) {
      console.log('No input available. Commit cancelled.');
      return null;
    }

    const answer = response.trim().toLowerCase();

    if (answer === '' || answer === 'y' || answer === 'yes') {
      return message;
    }

    if (answer === 'q' || answer === 'quit') {
      console.log('Commit cancelled.');
      return null;
    }

    if (answer === 'n' || answer === 'no') {
      console.log('Please provide your commit message:');
      const replacement = (await ask('> '))?.trim();

      if (!replacement) {
        // Falling back to the message they just rejected would be the wrong default.
        console.log('No message provided. Commit cancelled.');
        return null;
      }

      return replacement;
    }

    console.log(`Please answer y, n, or q.`);
  }

  console.log('No valid response. Commit cancelled.');
  return null;
};

export const confirmPRDescription = async (description: string, branchName: string): Promise<void> => {
  console.log(`\n🤖 Generated PR description for branch: ${branchName}`);
  console.log('=' .repeat(60));
  console.log(description);
  console.log('=' .repeat(60));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\nSave to file? (y/n/edit): `, async (answer) => {
      rl.close();
      
      const trimmedAnswer = answer.trim().toLowerCase();
      
      if (trimmedAnswer === 'y' || trimmedAnswer === 'yes' || trimmedAnswer === '') {
        await savePRDescription(description, branchName);
        resolve();
      } else if (trimmedAnswer === 'edit' || trimmedAnswer === 'e') {
        await editPRDescription(description, branchName);
        resolve();
      } else {
        console.log('PR description not saved.');
        resolve();
      }
    });
  });
};

export const displayCodeReview = async (review: string): Promise<void> => {
  console.log(`\n🔍 AI Code Review Results:`);
  console.log('=' .repeat(60));
  console.log(review);
  console.log('=' .repeat(60));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\nSave review to file? (y/n): `, async (answer) => {
      rl.close();
      
      const trimmedAnswer = answer.trim().toLowerCase();
      
      if (trimmedAnswer === 'y' || trimmedAnswer === 'yes') {
        await saveCodeReview(review);
        resolve();
      } else {
        console.log('Review not saved.');
        resolve();
      }
    });
  });
};

/**
 * Resolve an output path inside .git/ai-commit, creating the directory.
 *
 * Falls back to the working directory only if the .git directory cannot be
 * located, so the output is never simply lost.
 */
const resolveOutputPath = (filename: string): string => {
  try {
    const outputDir = path.join(getGitDir(), 'ai-commit');
    fs.mkdirSync(outputDir, { recursive: true });
    return path.join(outputDir, filename);
  } catch {
    return path.join(process.cwd(), filename);
  }
};

const writeOutput = (filename: string, contents: string, label: string): void => {
  const filepath = resolveOutputPath(filename);

  try {
    fs.writeFileSync(filepath, contents);
    console.log(`✅ ${label} saved to: ${filepath}`);
  } catch (error) {
    console.error(`❌ Failed to save ${label}: ${error instanceof Error ? error.message : error}`);
  }
};

const prDescriptionFilename = (branchName: string): string =>
  `pr-description-${branchName.replace(/[^a-zA-Z0-9]/g, '-')}.md`;

const savePRDescription = async (description: string, branchName: string): Promise<void> => {
  writeOutput(prDescriptionFilename(branchName), description, 'PR description');
};

const saveCodeReview = async (review: string): Promise<void> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeOutput(`code-review-${timestamp}.md`, review, 'Code review');
};

const editPRDescription = async (description: string, branchName: string): Promise<void> => {
  writeOutput(prDescriptionFilename(branchName), description, 'PR description');
  console.log('Open the file above to edit it.');
};

export const selectBranchName = async (suggestions: string[]): Promise<string | null> => {
  console.log(`\n🤖 Suggested branch names based on your changes:\n`);
  
  suggestions.forEach((suggestion, index) => {
    console.log(`   ${index + 1}. ${suggestion}`);
  });
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\nSelect a branch name (1-${suggestions.length}) or type your own (or 'q' to quit): `, (answer) => {
      rl.close();
      
      const trimmedAnswer = answer.trim();
      
      // Quit
      if (trimmedAnswer.toLowerCase() === 'q' || trimmedAnswer.toLowerCase() === 'quit') {
        console.log('Branch creation cancelled.');
        resolve(null);
        return;
      }
      
      // Check if it's a number selection
      const selection = parseInt(trimmedAnswer, 10);
      if (!isNaN(selection) && selection >= 1 && selection <= suggestions.length) {
        resolve(suggestions[selection - 1]);
        return;
      }
      
      // User provided custom branch name
      if (trimmedAnswer.length > 0) {
        resolve(trimmedAnswer);
        return;
      }
      
      // Empty input - cancel
      console.log('Branch creation cancelled.');
      resolve(null);
    });
  });
};
