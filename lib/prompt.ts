/**
 * AI Commit Tool - Interactive Prompt Helpers
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Small promise-based wrappers around readline for terminal prompts
 */

import * as readline from 'readline';

/** Ask a question on stdin and resolve with the (untrimmed) answer. */
export const ask = (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer);
    });
  });
};

/** Ask a yes/no question. Anything other than y/yes is treated as "no". */
export const confirm = async (question: string): Promise<boolean> => {
  const answer = (await ask(question)).trim().toLowerCase();
  return answer === 'y' || answer === 'yes';
};
