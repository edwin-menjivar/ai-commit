#!/usr/bin/env node

/**
 * AI Commit Tool - Main Entry Point
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description CLI tool that automatically generates AI-powered commit messages and assists with git workflow
 */

import { getStagedDiff, commitChanges, isGitRepository } from '../lib/git';
import { generateCommitMessage } from '../lib/ai';
import { confirmCommitMessage } from '../lib/formatter';
import { generatePRDescription } from '../lib/pr';
import { performCodeReview } from '../lib/review';
import { suggestBranchName } from '../lib/branch';

/** Resolve package.json from either the compiled output (dist/bin) or the sources (bin). */
const getVersion = (): string => {
  for (const candidate of ['../../package.json', '../package.json']) {
    try {
      return require(candidate).version;
    } catch {
      // Try the next location.
    }
  }
  return 'unknown';
};

const COMMANDS = ['commit', 'pr', 'review', 'branch', 'help'] as const;
type Command = (typeof COMMANDS)[number];

interface ParsedArgs {
  command: Command;
  model?: string;
  showVersion: boolean;
  error?: string;
}

export const parseArgs = (args: string[]): ParsedArgs => {
  let command: Command = 'commit';
  let commandSeen = false;
  let model: string | undefined;
  let showVersion = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--model' || arg === '-m') {
      const value = args[i + 1];
      // Without this check a trailing `--model` would be silently ignored.
      if (!value || value.startsWith('-')) {
        return { command, showVersion, error: `${arg} requires a model name (e.g. ${arg} gpt-4)` };
      }
      model = value;
      i++;
    } else if (arg === '--version' || arg === '-v') {
      showVersion = true;
    } else if (arg === '--help' || arg === '-h') {
      command = 'help';
      commandSeen = true;
    } else if ((COMMANDS as readonly string[]).includes(arg) && !commandSeen) {
      command = arg as Command;
      commandSeen = true;
    } else {
      return { command, model, showVersion, error: `Unknown argument: ${arg}` };
    }
  }

  return { command, model, showVersion };
};

export const showHelp = () => {
  console.log(`
🤖 AI Git Assistant

Usage:
  ai-commit [command] [--model <model>]

Commands:
  commit (default)  Generate AI-powered commit message for staged changes
  pr               Generate pull request description from branch commits
  review           AI code review of staged changes before commit
  branch           Suggest branch names based on current changes
  help             Show this help message

Options:
  --model <model>  Specify the OpenAI model to use (overrides env)
  --version        Print the installed version
  --help           Show this help message

Examples:
  ai-commit                      # Generate commit message (default)
  ai-commit commit               # Generate commit message
  ai-commit pr                   # Generate PR description
  ai-commit review               # Review staged changes
  ai-commit branch               # Suggest branch names from changes
  ai-commit --model gpt-4        # Use GPT-4 for commit message
  ai-commit pr --model gpt-3.5-turbo # Use GPT-3.5 for PR description
  ai-commit branch --model gpt-4 # Use GPT-4 for branch suggestions
`);
};

/** Report a failure without dumping a raw stack trace at the user. */
const fail = (error: unknown): never => {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
};

export const runCommit = async () => {
  try {
    const diff = getStagedDiff();

    if (!diff.trim()) {
      console.log('No staged changes detected.');
      process.exit(0);
      return; // Explicit return for testing environments where process.exit is mocked
    }

    const aiMessage = await generateCommitMessage(diff);

    if (!aiMessage) {
      console.log('❌ The model returned an empty commit message. Try again or use a different model.');
      process.exit(1);
      return; // Explicit return for testing environments where process.exit is mocked
    }

    const finalMessage = await confirmCommitMessage(aiMessage);

    commitChanges(finalMessage);
  } catch (error) {
    fail(error);
  }
};

// help and --version are the only things that work outside a repository.
const REQUIRES_REPOSITORY: Command[] = ['commit', 'pr', 'review', 'branch'];

export const run = async (command: Command): Promise<void> => {
  if (REQUIRES_REPOSITORY.includes(command) && !isGitRepository()) {
    console.error('❌ Not in a git repository');
    process.exit(1);
    return; // Explicit return for testing environments where process.exit is mocked
  }

  switch (command) {
    case 'commit':
      return runCommit();
    case 'pr':
      return generatePRDescription();
    case 'review':
      return performCodeReview();
    case 'branch':
      return suggestBranchName();
    case 'help':
      return showHelp();
  }
};

const main = async () => {
  const { command, model, showVersion, error } = parseArgs(process.argv.slice(2));

  if (error) {
    console.error(`❌ ${error}\n`);
    showHelp();
    process.exit(1);
  }

  if (showVersion) {
    console.log(getVersion());
    return;
  }

  if (model) {
    process.env.OPENAI_MODEL = model;
  }

  try {
    await run(command);
  } catch (err) {
    fail(err);
  }
};

// Skip execution when imported by tests.
if (require.main === module) {
  main();
}
