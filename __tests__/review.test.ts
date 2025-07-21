/**
 * Tests for Review Module
 */

import * as gitModule from '../lib/git';
import * as aiModule from '../lib/ai';
import * as formatterModule from '../lib/formatter';
import { performCodeReview } from '../lib/review';

// Mock dependencies
jest.mock('../lib/git');
jest.mock('../lib/ai');
jest.mock('../lib/formatter');

const mockGit = gitModule as jest.Mocked<typeof gitModule>;
const mockAi = aiModule as jest.Mocked<typeof aiModule>;
const mockFormatter = formatterModule as jest.Mocked<typeof formatterModule>;

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Mock process.exit
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

describe('Review Module', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performCodeReview', () => {
    beforeEach(() => {
      // Set up default mocks
      mockGit.isGitRepository.mockReturnValue(true);
      mockGit.getStagedDiff.mockReturnValue('diff --git a/file.js b/file.js\n+console.log("test");');
      mockAi.performCodeReview.mockResolvedValue('## Code Review\n\nThe code looks good overall...');
      mockFormatter.displayCodeReview.mockResolvedValue();
    });

    it('should perform code review on staged changes', async () => {
      await performCodeReview();

      expect(mockGit.isGitRepository).toHaveBeenCalled();
      expect(mockGit.getStagedDiff).toHaveBeenCalled();
      expect(mockAi.performCodeReview).toHaveBeenCalledWith('diff --git a/file.js b/file.js\n+console.log("test");');
      expect(mockFormatter.displayCodeReview).toHaveBeenCalledWith('## Code Review\n\nThe code looks good overall...');
    });

    it('should display analysis messages', async () => {
      await performCodeReview();

      expect(mockConsoleLog).toHaveBeenCalledWith('🔍 Analyzing staged changes for code review...');
      expect(mockConsoleLog).toHaveBeenCalledWith('🤖 Performing AI code review...');
    });

    it('should exit when not in a git repository', async () => {
      mockGit.isGitRepository.mockReturnValue(false);

      await performCodeReview();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Not in a git repository');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      // Note: getStagedDiff is called before isGitRepository check in the actual implementation
    });

    it('should handle no staged changes', async () => {
      mockGit.getStagedDiff.mockReturnValue('');

      await performCodeReview();

      expect(mockConsoleLog).toHaveBeenCalledWith('❌ No staged changes detected');
      expect(mockConsoleLog).toHaveBeenCalledWith('Use `git add` to stage files for review');
      expect(mockAi.performCodeReview).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only staged changes', async () => {
      mockGit.getStagedDiff.mockReturnValue('   \n  \n  ');

      await performCodeReview();

      expect(mockConsoleLog).toHaveBeenCalledWith('❌ No staged changes detected');
      expect(mockConsoleLog).toHaveBeenCalledWith('Use `git add` to stage files for review');
    });

    it('should handle AI review errors', async () => {
      const aiError = new Error('OpenAI API error');
      mockAi.performCodeReview.mockRejectedValue(aiError);

      await performCodeReview();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to perform code review:', aiError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle formatter errors', async () => {
      const formatterError = new Error('File write error');
      mockFormatter.displayCodeReview.mockRejectedValue(formatterError);

      await performCodeReview();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to perform code review:', formatterError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle git operation errors gracefully', async () => {
      mockGit.isGitRepository.mockReturnValue(true);
      mockGit.getStagedDiff.mockImplementation(() => {
        throw new Error('Git error');
      });

      await performCodeReview();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to perform code review:', expect.any(Error));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should pass exact diff to AI review', async () => {
      const diff = 'diff --git a/src/app.js b/src/app.js\n' +
                   'index 1234567..abcdefg 100644\n' +
                   '--- a/src/app.js\n' +
                   '+++ b/src/app.js\n' +
                   '@@ -1,3 +1,4 @@\n' +
                   ' const express = require("express");\n' +
                   ' const app = express();\n' +
                   '+app.use(express.json());\n' +
                   ' module.exports = app;';

      mockGit.getStagedDiff.mockReturnValue(diff);

      await performCodeReview();

      expect(mockAi.performCodeReview).toHaveBeenCalledWith(diff);
    });

    it('should pass AI review result to formatter', async () => {
      const reviewResult = '## Code Review Results\n\n' +
                          '### Positive Aspects\n' +
                          '- Good use of modern JavaScript\n\n' +
                          '### Suggestions\n' +
                          '- Consider adding error handling';

      mockAi.performCodeReview.mockResolvedValue(reviewResult);

      await performCodeReview();

      expect(mockFormatter.displayCodeReview).toHaveBeenCalledWith(reviewResult);
    });

    it('should not call AI or formatter when early validation fails', async () => {
      mockGit.isGitRepository.mockReturnValue(false);
      // Clear other mocks since the function should exit early
      mockAi.performCodeReview.mockClear();
      mockFormatter.displayCodeReview.mockClear();

      await performCodeReview();

      // AI and formatter should not be called when git repository check fails
      expect(mockAi.performCodeReview).not.toHaveBeenCalled();
      expect(mockFormatter.displayCodeReview).not.toHaveBeenCalled();
    });

    it('should continue when all conditions are met', async () => {
      // Setup successful flow
      mockGit.isGitRepository.mockReturnValue(true);
      mockGit.getStagedDiff.mockReturnValue('test diff');
      mockAi.performCodeReview.mockResolvedValue('test review');

      await performCodeReview();

      // Verify the full flow executed
      expect(mockGit.isGitRepository).toHaveBeenCalled();
      expect(mockGit.getStagedDiff).toHaveBeenCalled();
      expect(mockAi.performCodeReview).toHaveBeenCalled();
      expect(mockFormatter.displayCodeReview).toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle JavaScript code review', async () => {
      const jsDiff = 'diff --git a/src/utils.js b/src/utils.js\n' +
                     '+function processData(data) {\n' +
                     '+  if (!data) return null;\n' +
                     '+  return data.map(item => item.value);\n' +
                     '+}';

      const jsReview = '## Code Review\n\n' +
                      '**Positive aspects:**\n' +
                      '- Good null check\n' +
                      '- Clean mapping logic\n\n' +
                      '**Suggestions:**\n' +
                      '- Consider using optional chaining';

      mockGit.getStagedDiff.mockReturnValue(jsDiff);
      mockAi.performCodeReview.mockResolvedValue(jsReview);

      await performCodeReview();

      expect(mockAi.performCodeReview).toHaveBeenCalledWith(jsDiff);
      expect(mockFormatter.displayCodeReview).toHaveBeenCalledWith(jsReview);
    });

    it('should handle TypeScript code review', async () => {
      const tsDiff = 'diff --git a/src/types.ts b/src/types.ts\n' +
                     '+interface User {\n' +
                     '+  id: number;\n' +
                     '+  name: string;\n' +
                     '+  email?: string;\n' +
                     '+}';

      const tsReview = '## Code Review\n\n' +
                      '**Positive aspects:**\n' +
                      '- Well-defined interface\n' +
                      '- Appropriate use of optional property\n\n' +
                      '**No issues found**';

      mockGit.getStagedDiff.mockReturnValue(tsDiff);
      mockAi.performCodeReview.mockResolvedValue(tsReview);

      await performCodeReview();

      expect(mockAi.performCodeReview).toHaveBeenCalledWith(tsDiff);
      expect(mockFormatter.displayCodeReview).toHaveBeenCalledWith(tsReview);
    });

    it('should handle security-related code review', async () => {
      const securityDiff = 'diff --git a/src/auth.js b/src/auth.js\n' +
                          '+app.get("/user/:id", (req, res) => {\n' +
                          '+  const query = `SELECT * FROM users WHERE id = ${req.params.id}`;\n' +
                          '+  db.query(query, (err, result) => {\n' +
                          '+    res.json(result);\n' +
                          '+  });\n' +
                          '+});';

      const securityReview = '## Code Review\n\n' +
                            '**🚨 SECURITY ISSUES:**\n' +
                            '- SQL injection vulnerability detected\n' +
                            '- Use parameterized queries instead\n\n' +
                            '**Recommendations:**\n' +
                            '- Replace with: `SELECT * FROM users WHERE id = ?`\n' +
                            '- Add input validation';

      mockGit.getStagedDiff.mockReturnValue(securityDiff);
      mockAi.performCodeReview.mockResolvedValue(securityReview);

      await performCodeReview();

      expect(mockAi.performCodeReview).toHaveBeenCalledWith(securityDiff);
      expect(mockFormatter.displayCodeReview).toHaveBeenCalledWith(securityReview);
    });

    it('should handle multiple file changes', async () => {
      const multiFileDiff = 'diff --git a/src/app.js b/src/app.js\n' +
                           '+const newFeature = require("./feature");\n' +
                           'diff --git a/src/feature.js b/src/feature.js\n' +
                           '+module.exports = { process: () => {} };';

      const multiFileReview = '## Code Review\n\n' +
                             '### File: src/app.js\n' +
                             '- Good modular import\n\n' +
                             '### File: src/feature.js\n' +
                             '- Consider adding JSDoc comments\n' +
                             '- Empty function implementation needs completion';

      mockGit.getStagedDiff.mockReturnValue(multiFileDiff);
      mockAi.performCodeReview.mockResolvedValue(multiFileReview);

      await performCodeReview();

      expect(mockAi.performCodeReview).toHaveBeenCalledWith(multiFileDiff);
      expect(mockFormatter.displayCodeReview).toHaveBeenCalledWith(multiFileReview);
    });

    it('should handle large diff gracefully', async () => {
      // Simulate a large diff
      const largeDiff = 'diff --git a/src/large-file.js b/src/large-file.js\n' +
                       Array(100).fill('+  console.log("line");').join('\n');

      const largeDiffReview = '## Code Review\n\n' +
                             '**Note:** Large changeset detected\n' +
                             '- Consider breaking into smaller commits\n' +
                             '- Multiple console.log statements detected - consider using a proper logger';

      mockGit.getStagedDiff.mockReturnValue(largeDiff);
      mockAi.performCodeReview.mockResolvedValue(largeDiffReview);

      await performCodeReview();

      expect(mockAi.performCodeReview).toHaveBeenCalledWith(largeDiff);
      expect(mockFormatter.displayCodeReview).toHaveBeenCalledWith(largeDiffReview);
    });
  });

  describe('Error handling scenarios', () => {
    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockAi.performCodeReview.mockRejectedValue(timeoutError);

      await performCodeReview();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to perform code review:', timeoutError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle API rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      mockAi.performCodeReview.mockRejectedValue(rateLimitError);

      await performCodeReview();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to perform code review:', rateLimitError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle file system errors when saving review', async () => {
      const fsError = new Error('Permission denied');
      // Clear AI mock so it doesn't interfere
      mockAi.performCodeReview.mockResolvedValue('test review');
      mockFormatter.displayCodeReview.mockRejectedValue(fsError);

      await performCodeReview();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to perform code review:', fsError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle git command failures', async () => {
      mockGit.isGitRepository.mockReturnValue(true);
      mockGit.getStagedDiff.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      await performCodeReview();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to perform code review:', expect.any(Error));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });
}); 