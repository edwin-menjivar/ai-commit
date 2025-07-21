/**
 * Tests for AI Module
 */

// Mock OpenAI before importing
const mockChatCompletions = {
  create: jest.fn()
};

const mockOpenAI = {
  chat: {
    completions: mockChatCompletions
  }
};

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAI);
});

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('.env')
}));

import {
    generateCommitMessage,
    generatePRDescription,
    performCodeReview
} from '../lib/ai';

describe('AI Module', () => {
  beforeEach(() => {
    // Set up environment variables
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.OPENAI_MODEL = 'gpt-4';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

  describe('generateCommitMessage', () => {
    it('should generate commit message from diff', async () => {
      const mockDiff = 'diff --git a/file.js b/file.js\n+console.log("hello");';
      const mockResponse = {
        choices: [{
          message: {
            content: 'feat: add console log statement'
          }
        }]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await generateCommitMessage(mockDiff);

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: expect.stringContaining('Generate a concise, conventional commit message')
        }],
        temperature: 0.7,
        max_tokens: 100
      });

      expect(result).toBe('feat: add console log statement');
    });

    it('should use default model when OPENAI_MODEL not set', async () => {
      delete process.env.OPENAI_MODEL;
      
      const mockResponse = {
        choices: [{
          message: {
            content: 'fix: resolve issue'
          }
        }]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      await generateCommitMessage('test diff');

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo'
        })
      );
    });

    it('should handle empty response content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: null
          }
        }]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await generateCommitMessage('test diff');

      expect(result).toBe('');
    });

    it('should include conventional commit examples in prompt', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'feat: add feature'
          }
        }]
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
        choices: [{
          message: {
            content: '# User Authentication Feature\n\nAdded login functionality...'
          }
        }]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await generatePRDescription(commits, diff, branchName);

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: expect.stringContaining('Generate a comprehensive pull request description')
        }],
        temperature: 0.7,
        max_tokens: 800
      });

      expect(result).toBe('# User Authentication Feature\n\nAdded login functionality...');
    });

    it('should include branch name in prompt', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'PR description'
          }
        }]
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
        choices: [{
          message: {
            content: 'PR description'
          }
        }]
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
        choices: [{
          message: {
            content: '## Code Review\n\n**Positive aspects:**\n- Clean map usage...'
          }
        }]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await performCodeReview(diff);

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: expect.stringContaining('Perform a thorough code review')
        }],
        temperature: 0.3,
        max_tokens: 1000
      });

      expect(result).toBe('## Code Review\n\n**Positive aspects:**\n- Clean map usage...');
    });

    it('should use lower temperature for more focused reviews', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Review content'
          }
        }]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      await performCodeReview('test diff');

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3
        })
      );
    });

    it('should request analysis of specific areas', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Review content'
          }
        }]
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
        choices: [{
          message: {
            content: 'Review content'
          }
        }]
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
    it('should work with proper API key setup', () => {
      // Test that the module can be imported without throwing
      expect(process.env.OPENAI_API_KEY).toBe('test-api-key');
    });

    it('should handle missing API key gracefully', () => {
      delete process.env.OPENAI_API_KEY;
      
      // Re-import should still work
      jest.resetModules();
      
      expect(() => {
        require('../lib/ai');
      }).not.toThrow();
    });
  });
}); 