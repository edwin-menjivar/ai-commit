/**
 * AI Commit Tool - Interactive Prompt Helpers
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Small promise-based wrappers around readline for terminal prompts
 */

import * as readline from 'readline';

/**
 * Ask a question on stdin and resolve with the (untrimmed) answer.
 *
 * Resolves null when stdin closes before an answer arrives, which is what
 * happens on piped or redirected input. Without this the promise would never
 * settle and the command would exit silently with nothing reported.
 */
export const ask = (question: string): Promise<string | null> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    let answered = false;

    rl.question(question, (answer: string) => {
      answered = true;
      rl.close();
      resolve(answer);
    });

    rl.on('close', () => {
      if (!answered) resolve(null);
    });
  });
};

/** Ask a yes/no question. Anything other than y/yes - including EOF - is "no". */
export const confirm = async (question: string): Promise<boolean> => {
  const answer = await ask(question);
  if (answer === null) return false;

  const normalized = answer.trim().toLowerCase();
  return normalized === 'y' || normalized === 'yes';
};
