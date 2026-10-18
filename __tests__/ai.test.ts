/**
 * Tests for AI Module
 */

// Mock OpenAI before importing
const mockChatCompletions = {
  create: jest.fn(),
};

const mockOpenAI = {
  chat: {
    completions: mockChatCompletions,
  },
};

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAI);
});

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('.env'),
}));

import OpenAI from 'openai';
import {
  generateCommitMessage,
  generatePRDescription,
  performCodeReview,
  generateBranchNameSuggestions,
  describeApiError,
  resetClient,
} from '../lib/ai';

const MockedOpenAI = OpenAI as unknown as jest.Mock;

describe('AI Module', () => {
  beforeEach(() => {
    // Set up environment variables
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.OPENAI_MODEL = 'gpt-4';
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetClient();
    delete process.env.OPENAI_API_BASE;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

  describe('generateCommitMessage', () => {
    it('should generate commit message from diff', async () => {
      const mockDiff = 'diff --git a/file.js b/file.js\n+console.log("hello");';
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'feat: add console log statement',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await generateCommitMessage(mockDiff);

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Generate a concise, conventional commit message'),
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      expect(result).toBe('feat: add console log statement');
    });

    it('should use default model when OPENAI_MODEL not set', async () => {
      delete process.env.OPENAI_MODEL;

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'fix: resolve issue',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      await generateCommitMessage('test diff');

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
        })
      );
    });

    it('should handle empty response content', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await generateCommitMessage('test diff');

      expect(result).toBe('');
    });

    it('should include conventional commit examples in prompt', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'feat: add feature',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      await generateCommitMessage('test diff');

      const callArgs = mockChatCompletions.create.mock.calls[0][0];
      const prompt = callArgs.messages[0].content;

      expect(prompt).toContain('feat(auth): add user login functionality');
      expect(prompt).toContain('fix(ui): resolve button alignment issue');
      expect(prompt).toContain('docs(readme): update installation instructions');
    });
  });

  describe('generatePRDescription', () => {
    it('should generate PR description from commits and diff', async () => {
      const commits = 'abc123 feat: add login\ndef456 fix: resolve bug';
      const diff = 'diff --git a/auth.js b/auth.js\n+function login() {}';
      const branchName = 'feature/user-auth';

      const mockResponse = {
        choices: [
          {
            message: {
              content: '# User Authentication Feature\n\nAdded login functionality...',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await generatePRDescription(commits, diff, branchName);

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Generate a comprehensive pull request description'),
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      expect(result).toBe('# User Authentication Feature\n\nAdded login functionality...');
    });

    it('should include branch name in prompt', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'PR description',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      await generatePRDescription('commits', 'diff', 'feature/amazing-feature');

      const callArgs = mockChatCompletions.create.mock.calls[0][0];
      const prompt = callArgs.messages[0].content;

      expect(prompt).toContain('Branch: feature/amazing-feature');
      expect(prompt).toContain('Commits in this branch:');
      expect(prompt).toContain('Full diff:');
    });

    it('should request structured markdown format', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'PR description',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      await generatePRDescription('commits', 'diff', 'branch');

      const callArgs = mockChatCompletions.create.mock.calls[0][0];
      const prompt = callArgs.messages[0].content;

      expect(prompt).toContain('Format it in Markdown');
      expect(prompt).toContain('1. A clear title');
      expect(prompt).toContain('2. Summary of changes');
      expect(prompt).toContain('3. Key features/fixes implemented');
      expect(prompt).toContain('4. Any breaking changes');
      expect(prompt).toContain('5. Testing notes');
    });
  });

  describe('performCodeReview', () => {
    it('should perform code review on diff', async () => {
      const diff = 'diff --git a/app.js b/app.js\n+const result = data.map(x => x.value);';

      const mockResponse = {
        choices: [
          {
            message: {
              content: '## Code Review\n\n**Positive aspects:**\n- Clean map usage...',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await performCodeReview(diff);

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Perform a thorough code review'),
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      expect(result).toBe('## Code Review\n\n**Positive aspects:**\n- Clean map usage...');
    });

    it('should use lower temperature for more focused reviews', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Review content',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      await performCodeReview('test diff');

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
        })
      );
    });

    it('should request analysis of specific areas', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Review content',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      await performCodeReview('test diff');

      const callArgs = mockChatCompletions.create.mock.calls[0][0];
      const prompt = callArgs.messages[0].content;

      expect(prompt).toContain('1. **Code Quality**');
      expect(prompt).toContain('2. **Potential Bugs**');
      expect(prompt).toContain('3. **Security**');
      expect(prompt).toContain('4. **Performance**');
      expect(prompt).toContain('5. **Style**');
      expect(prompt).toContain('6. **Architecture**');
    });

    it('should request structured feedback', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Review content',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      await performCodeReview('test diff');

      const callArgs = mockChatCompletions.create.mock.calls[0][0];
      const prompt = callArgs.messages[0].content;

      expect(prompt).toContain('Provide specific, actionable feedback');
      expect(prompt).toContain('line references when possible');
      expect(prompt).toContain('structure your review with clear sections');
      expect(prompt).toContain('be constructive in your feedback');
    });
  });

  describe('Error handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      const apiError = new Error('API rate limit exceeded');
      mockChatCompletions.create.mockRejectedValue(apiError);

      await expect(generateCommitMessage('test diff')).rejects.toThrow('API rate limit exceeded');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockChatCompletions.create.mockRejectedValue(networkError);

      await expect(performCodeReview('test diff')).rejects.toThrow('Network error');
    });
  });

  describe('OpenAI Configuration', () => {
    it('should not construct a client until a request is made', () => {
      resetClient();
      MockedOpenAI.mockClear();

      // Importing and calling help-only paths must not require credentials.
      expect(MockedOpenAI).not.toHaveBeenCalled();
    });

    it('should throw an actionable error when the API key is missing', async () => {
      resetClient();
      delete process.env.OPENAI_API_KEY;

      await expect(generateCommitMessage('diff')).rejects.toThrow(/OPENAI_API_KEY is not set/);
    });

    it('should pass the API key to the client', async () => {
      resetClient();
      MockedOpenAI.mockClear();
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'feat: x' } }],
      });

      await generateCommitMessage('diff');

      expect(MockedOpenAI).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'test-api-key' }));
    });

    it('should honour OPENAI_API_BASE for local or self-hosted models', async () => {
      resetClient();
      MockedOpenAI.mockClear();
      process.env.OPENAI_API_BASE = 'http://localhost:11434/v1';
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'feat: x' } }],
      });

      await generateCommitMessage('diff');

      expect(MockedOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ baseURL: 'http://localhost:11434/v1' })
      );
    });

    it('should reuse a single client across requests', async () => {
      resetClient();
      MockedOpenAI.mockClear();
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'feat: x' } }],
      });

      await generateCommitMessage('diff');
      await generateCommitMessage('another diff');

      expect(MockedOpenAI).toHaveBeenCalledTimes(1);
    });
  });

  describe('large diffs', () => {
    const getPrompt = (): string => mockChatCompletions.create.mock.calls[0][0].messages[0].content;

    beforeEach(() => {
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'feat: x' } }],
      });
    });

    it('should send small diffs unchanged', async () => {
      await generateCommitMessage('a short diff');

      expect(getPrompt()).toContain('a short diff');
      expect(getPrompt()).not.toContain('diff truncated');
    });

    it('should truncate a diff that would exceed the model request size', async () => {
      const huge = 'x'.repeat(200_000);

      await generateCommitMessage(huge);

      const prompt = getPrompt();
      expect(prompt.length).toBeLessThan(huge.length);
      expect(prompt).toContain('diff truncated');
    });

    it('should truncate for PR descriptions and reviews too', async () => {
      const huge = 'x'.repeat(200_000);

      await performCodeReview(huge);

      expect(getPrompt()).toContain('diff truncated');
    });
  });

  describe('secret redaction', () => {
    const getPrompt = (): string => mockChatCompletions.create.mock.calls[0][0].messages[0].content;
    let warn: jest.SpyInstance;

    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation();
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'feat: x' } }],
      });
    });

    afterEach(() => {
      warn.mockRestore();
      delete process.env.AI_COMMIT_DISABLE_REDACTION;
    });

    const secretDiff = [
      'diff --git a/.env b/.env',
      '--- a/.env',
      '+++ b/.env',
      '+OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz0123456789',
    ].join('\n');

    it('should not send a secret to the API', async () => {
      await generateCommitMessage(secretDiff);

      expect(getPrompt()).not.toContain('sk-abcdefghijklmnopqrstuvwxyz0123456789');
      expect(getPrompt()).toContain('[REDACTED]');
    });

    it('should warn that a secret was redacted', async () => {
      await generateCommitMessage(secretDiff);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Redacted'));
    });

    it('should warn about files that usually hold credentials', async () => {
      await generateCommitMessage(secretDiff);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('.env'));
    });

    it('should redact for reviews, PR descriptions and branch names too', async () => {
      await performCodeReview(secretDiff);

      expect(getPrompt()).not.toContain('sk-abcdefghijklmnopqrstuvwxyz0123456789');
    });

    it('should leave an ordinary diff untouched', async () => {
      await generateCommitMessage('diff --git a/a.ts b/a.ts\n+const total = 1;');

      expect(getPrompt()).toContain('const total = 1;');
      expect(getPrompt()).not.toContain('[REDACTED]');
    });

    it('should allow opting out, with a warning', async () => {
      process.env.AI_COMMIT_DISABLE_REDACTION = '1';

      await generateCommitMessage(secretDiff);

      expect(getPrompt()).toContain('sk-abcdefghijklmnopqrstuvwxyz0123456789');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('redaction is disabled'));
    });

    it('should redact before truncating so secrets cannot survive in the kept portion', async () => {
      const secret = 'sk-abcdefghijklmnopqrstuvwxyz0123456789';
      const huge = `+API_KEY=${secret}\n` + 'x'.repeat(200_000);

      await generateCommitMessage(huge);

      expect(getPrompt()).not.toContain(secret);
    });
  });

  describe('malformed responses', () => {
    it('should return an empty string when the response has no choices', async () => {
      mockChatCompletions.create.mockResolvedValue({ choices: [] });

      await expect(generateCommitMessage('diff')).resolves.toBe('');
    });

    it('should return an empty string when the message content is null', async () => {
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(generateCommitMessage('diff')).resolves.toBe('');
    });

    it('should return no suggestions when branch naming yields nothing', async () => {
      mockChatCompletions.create.mockResolvedValue({ choices: [] });

      await expect(generateBranchNameSuggestions('diff')).resolves.toEqual([]);
    });
  });
});

describe('generated file exclusion', () => {
  const lockfile =
    'diff --git a/package-lock.json b/package-lock.json\n--- a/package-lock.json\n+++ b/package-lock.json\n+  "version": "9.9.9"\n';
  const source =
    'diff --git a/src/app.ts b/src/app.ts\n--- a/src/app.ts\n+++ b/src/app.ts\n+export const x = 1;\n';
  const getPrompt = (): string => mockChatCompletions.create.mock.calls[0][0].messages[0].content;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-api-key';
    mockChatCompletions.create.mockResolvedValue({ choices: [{ message: { content: 'chore: bump deps' } }] });
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetClient();
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_COMMIT_EXCLUDE;
    delete process.env.AI_COMMIT_DISABLE_EXCLUDES;
  });

  it('should leave lockfile contents out of the prompt but keep the source change', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();

    await generateCommitMessage(lockfile + source);

    expect(getPrompt()).not.toContain('"version": "9.9.9"');
    expect(getPrompt()).toContain('diff --git a/package-lock.json b/package-lock.json');
    expect(getPrompt()).toContain('export const x = 1;');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('package-lock.json'));
    warn.mockRestore();
  });

  it('should honour AI_COMMIT_EXCLUDE', async () => {
    process.env.AI_COMMIT_EXCLUDE = 'src/*.ts';
    jest.spyOn(console, 'warn').mockImplementation();

    await generateCommitMessage(source);

    expect(getPrompt()).not.toContain('export const x = 1;');
  });

  it('should send everything when excludes are disabled', async () => {
    process.env.AI_COMMIT_DISABLE_EXCLUDES = '1';

    await generateCommitMessage(lockfile);

    expect(getPrompt()).toContain('"version": "9.9.9"');
  });
});

describe('describeApiError', () => {
  afterEach(() => {
    delete process.env.OPENAI_API_BASE;
    delete process.env.OPENAI_MODEL;
    delete process.env.AI_COMMIT_TIMEOUT_MS;
  });

  it('should point at the key for a 401', () => {
    expect(describeApiError({ status: 401 }).message).toMatch(/OPENAI_API_KEY/);
  });

  it('should name the model and endpoint for a 404', () => {
    process.env.OPENAI_MODEL = 'llama3';
    process.env.OPENAI_API_BASE = 'http://localhost:11434/v1';

    const message = describeApiError({ status: 404 }).message;

    expect(message).toContain('llama3');
    expect(message).toContain('http://localhost:11434/v1');
  });

  it('should explain rate limits and server errors', () => {
    expect(describeApiError({ status: 429 }).message).toMatch(/rate limiting|quota/);
    expect(describeApiError({ status: 503 }).message).toMatch(/server error \(503\)/);
  });

  it('should suggest the timeout setting when the request timed out', () => {
    class APIConnectionTimeoutError extends Error {}
    process.env.AI_COMMIT_TIMEOUT_MS = '5000';

    const message = describeApiError(new APIConnectionTimeoutError('timeout')).message;

    expect(message).toContain('5000 ms');
    expect(message).toContain('AI_COMMIT_TIMEOUT_MS');
  });

  it('should recognise a refused connection by code or class', () => {
    class APIConnectionError extends Error {}

    expect(describeApiError({ code: 'ECONNREFUSED' }).message).toMatch(/Could not connect/);
    expect(describeApiError({ cause: { code: 'ENOTFOUND' } }).message).toMatch(/Could not connect/);
    expect(describeApiError(new APIConnectionError('boom')).message).toMatch(/Could not connect/);
  });

  it('should pass unknown errors through unchanged', () => {
    const original = new Error('something odd');

    expect(describeApiError(original)).toBe(original);
    expect(describeApiError('plain string').message).toBe('plain string');
  });

  it('should be applied to failures from the API client', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key';
    mockChatCompletions.create.mockRejectedValue(Object.assign(new Error('raw'), { status: 401 }));

    await expect(generateCommitMessage('diff --git a/f b/f\n+x')).rejects.toThrow(/OPENAI_API_KEY/);

    resetClient();
    delete process.env.OPENAI_API_KEY;
  });
});
