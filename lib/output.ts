/**
 * AI Commit Tool - Output Helpers
 *
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Keeps stdout clean for the generated text when a command runs in --print mode
 */

export interface CommandOptions {
  /** Write only the generated text to stdout; progress goes to stderr and nothing is prompted. */
  print?: boolean;
}

/**
 * Progress messages go to stdout in interactive use, where the terminal is the
 * only reader, and to stderr in print mode so that `$(ai-commit ... --print)`
 * captures nothing but the result.
 */
export const makeStatus =
  (print: boolean) =>
  (message: string): void => {
    if (print) {
      console.error(message);
    } else {
      console.log(message);
    }
  };

/**
 * A command that produced nothing exits non-zero in print mode, so a script or
 * hook can tell "no output" from "empty output". Interactively it just returns.
 */
export const nothingToPrint = (print: boolean): void => {
  if (print) {
    process.exit(1);
  }
};
