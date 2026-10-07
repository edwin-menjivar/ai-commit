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
  /** Print the generated commit message to stdout instead of prompting and committing. */
  print: boolean;
  showVersion: boolean;
  error?: string;
}

export const parseArgs = (args: string[]): ParsedArgs => {
  let command: Command = 'commit';
  let commandSeen = false;
  let model: string | undefined;
  let print = false;
  let showVersion = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--model' || arg === '-m') {
      const value = args[i + 1];
      // Without this check a trailing `--model` would be silently ignored.
      if (!value || value.startsWith('-')) {
        return { command, print, showVersion, error: `${arg} requires a model name (e.g. ${arg} gpt-4o)` };
      }
      model = value;
      i++;
    } else if (arg === '--print' || arg === '-p') {
      print = true;
    } else if (arg === '--version' || arg === '-v') {
      showVersion = true;
    } else if (arg === '--help' || arg === '-h') {
      command = 'help';
      commandSeen = true;
    } else if ((COMMANDS as readonly string[]).includes(arg) && !commandSeen) {
      command = arg as Command;
      commandSeen = true;
    } else {
      return { command, model, print, showVersion, error: `Unknown argument: ${arg}` };
    }
  }

  if (print && command !== 'commit') {
    return { command, model, print, showVersion, error: '--print only applies to the commit command' };
  }

  return { command, model, print, showVersion };
};

export const showHelp = () => {
  console.log(`
🤖 AI Git Assistant

Usage:
  ai-commit [command] [options]

Commands:
  commit (default)  Generate AI-powered commit message for staged changes
  pr               Generate pull request description from branch commits
  review           AI code review of staged changes before commit
  branch           Suggest branch names based on current changes
  help             Show this help message

Options:
  -m, --model <model>  Model to use (overrides OPENAI_MODEL)
  -p, --print          Print the generated commit message to stdout and exit
                       without committing (for hooks, editors and scripts)
  -v, --version        Print the installed version
  -h, --help           Show this help message

Examples:
  ai-commit                      # Generate commit message (default)
  ai-commit commit               # Generate commit message
  ai-commit pr                   # Generate PR description
  ai-commit review               # Review staged changes
  ai-commit branch               # Suggest branch names from changes
  ai-commit --model gpt-4o       # Use a specific model for this run
  ai-commit --print              # Just print the message, e.g. from a git hook
  git commit -m "$(ai-commit --print)"

Configuration:
  Set OPENAI_API_KEY (and optionally OPENAI_MODEL, OPENAI_API_BASE) in your
  shell, in ./.env, or in ~/.config/ai-commit/.env.
`);
};

/** Report a failure without dumping a raw stack trace at the user. */
const fail = (error: unknown): never => {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
};

export interface RunOptions {
  print?: boolean;
}

export const runCommit = async ({ print = false }: RunOptions = {}) => {
  try {
    const diff = getStagedDiff();

    if (!diff.trim()) {
      // In print mode nothing but the message may go to stdout, and a caller
      // such as a git hook needs a non-zero exit to know there is no message.
      if (print) {
        console.error('No staged changes detected.');
        process.exit(1);
        return;
      }
      console.log('No staged changes detected.');
      process.exit(0);
      return; // Explicit return for testing environments where process.exit is mocked
    }

    const aiMessage = await generateCommitMessage(diff);

    if (!aiMessage) {
      console.error('❌ The model returned an empty commit message. Try again or use a different model.');
      process.exit(1);
      return; // Explicit return for testing environments where process.exit is mocked
    }

    if (print) {
      process.stdout.write(`${aiMessage}\n`);
      return;
    }

    const finalMessage = await confirmCommitMessage(aiMessage);

    if (finalMessage === null) {
      return; // User declined to commit.
    }

    commitChanges(finalMessage);
  } catch (error) {
    fail(error);
  }
};

// help and --version are the only things that work outside a repository.
const REQUIRES_REPOSITORY: Command[] = ['commit', 'pr', 'review', 'branch'];

export const run = async (command: Command, options: RunOptions = {}): Promise<void> => {
  if (REQUIRES_REPOSITORY.includes(command) && !isGitRepository()) {
    console.error('❌ Not in a git repository');
    process.exit(1);
    return; // Explicit return for testing environments where process.exit is mocked
  }

  switch (command) {
    case 'commit':
      return runCommit(options);
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
  const { command, model, print, showVersion, error } = parseArgs(process.argv.slice(2));

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
    await run(command, { print });
  } catch (err) {
    fail(err);
  }
};

// Skip execution when imported by tests.
if (require.main === module) {
  main();
}
