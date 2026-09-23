/**
 * Tests for Interactive Prompt Helpers
 */

import * as readline from 'readline';
import { ask, confirm } from '../lib/prompt';

jest.mock('readline');

const mockedReadline = readline as jest.Mocked<typeof readline>;

/** Stub readline so the next question resolves with `answer`. */
const answerWith = (answer: string) => {
  const close = jest.fn();
  const question = jest.fn().mockImplementation((_q: string, cb: (a: string) => void) => cb(answer));

  mockedReadline.createInterface.mockReturnValue({ question, close } as never);

  return { question, close };
};

describe('Prompt Helpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ask', () => {
    it('should resolve with the answer', async () => {
      answerWith('hello');

      await expect(ask('Question? ')).resolves.toBe('hello');
    });

    it('should pass the question through to readline', async () => {
      const { question } = answerWith('');

      await ask('Pick one: ');

      expect(question).toHaveBeenCalledWith('Pick one: ', expect.any(Function));
    });

    it('should close the interface so the process can exit', async () => {
      const { close } = answerWith('y');

      await ask('Question? ');

      expect(close).toHaveBeenCalled();
    });

    it('should preserve whitespace for callers that need the raw answer', async () => {
      answerWith('  spaced  ');

      await expect(ask('Question? ')).resolves.toBe('  spaced  ');
    });
  });

  describe('confirm', () => {
    it.each(['y', 'Y', 'yes', 'YES', ' yes '])('should treat %p as yes', async (answer) => {
      answerWith(answer);

      await expect(confirm('Sure? ')).resolves.toBe(true);
    });

    it.each(['n', 'no', '', 'maybe', 'yep'])('should treat %p as no', async (answer) => {
      answerWith(answer);

      await expect(confirm('Sure? ')).resolves.toBe(false);
    });

    it('should not resolve before the user answers', async () => {
      let respond: ((answer: string) => void) | undefined;
      mockedReadline.createInterface.mockReturnValue({
        question: jest.fn().mockImplementation((_q: string, cb: (a: string) => void) => {
          respond = cb;
        }),
        close: jest.fn(),
      } as never);

      let settled = false;
      const pending = confirm('Sure? ').then((value) => {
        settled = true;
        return value;
      });

      // Let any already-queued microtasks run.
      await Promise.resolve();
      expect(settled).toBe(false);

      respond!('y');
      await expect(pending).resolves.toBe(true);
    });
  });
});
