/**
 * Tests for PR Module
 */

import * as gitModule from '../lib/git';
import * as aiModule from '../lib/ai';
import * as formatterModule from '../lib/formatter';
import { generatePRDescription } from '../lib/pr';

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

describe('PR Module', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePRDescription', () => {
    beforeEach(() => {
      // Set up default mocks
      mockGit.isGitRepository.mockReturnValue(true);
      mockGit.getCurrentBranch.mockReturnValue('feature/new-feature');
      mockGit.getBranchCommits.mockReturnValue('abc123 feat: add feature\ndef456 fix: bug');
      mockGit.getBranchDiff.mockReturnValue('diff --git a/file.js b/file.js\n+new code');
      mockAi.generatePRDescription.mockResolvedValue('# PR Description\n\nGenerated description');
      mockFormatter.confirmPRDescription.mockResolvedValue();
    });

    it('should generate PR description for feature branch', async () => {
      await generatePRDescription();

      expect(mockGit.isGitRepository).toHaveBeenCalled();
      expect(mockGit.getCurrentBranch).toHaveBeenCalled();
      expect(mockGit.getBranchCommits).toHaveBeenCalled();
      expect(mockGit.getBranchDiff).toHaveBeenCalled();
      expect(mockAi.generatePRDescription).toHaveBeenCalledWith(
        'abc123 feat: add feature\ndef456 fix: bug',
        'diff --git a/file.js b/file.js\n+new code',
        'feature/new-feature'
      );
      expect(mockFormatter.confirmPRDescription).toHaveBeenCalledWith(
        '# PR Description\n\nGenerated description',
        'feature/new-feature'
      );
    });

    it('should display branch analysis messages', async () => {
      await generatePRDescription();

      expect(mockConsoleLog).toHaveBeenCalledWith('\n🔍 Analyzing branch: feature/new-feature');
      expect(mockConsoleLog).toHaveBeenCalledWith('📝 Found 2 commit(s) in this branch');
      expect(mockConsoleLog).toHaveBeenCalledWith('🔍 Analyzing changes...');
      expect(mockConsoleLog).toHaveBeenCalledWith('🤖 Generating PR description...');
    });

    it('should exit when not in a git repository', async () => {
      mockGit.isGitRepository.mockReturnValue(false);

      await generatePRDescription();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Not in a git repository');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      // Note: getCurrentBranch is called before isGitRepository check in the actual implementation
    });

    it('should warn when on main branch', async () => {
      mockGit.getCurrentBranch.mockReturnValue('main');

      await generatePRDescription();

      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️  You appear to be on a main branch. PR descriptions are typically generated from feature branches.');
      expect(mockConsoleLog).toHaveBeenCalledWith('Current branch: main');
      expect(mockConsoleLog).toHaveBeenCalledWith('Consider switching to a feature branch first.');
      expect(mockGit.getBranchCommits).not.toHaveBeenCalled();
    });

    it('should warn when on master branch', async () => {
      mockGit.getCurrentBranch.mockReturnValue('master');

      await generatePRDescription();

      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️  You appear to be on a main branch. PR descriptions are typically generated from feature branches.');
      expect(mockConsoleLog).toHaveBeenCalledWith('Current branch: master');
    });

    it('should warn when on develop branch', async () => {
      mockGit.getCurrentBranch.mockReturnValue('develop');

      await generatePRDescription();

      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️  You appear to be on a main branch. PR descriptions are typically generated from feature branches.');
      expect(mockConsoleLog).toHaveBeenCalledWith('Current branch: develop');
    });

    it('should handle empty commits list', async () => {
      mockGit.getBranchCommits.mockReturnValue('');

      await generatePRDescription();

      expect(mockConsoleLog).toHaveBeenCalledWith('❌ No commits found in this branch compared to main branch');
      expect(mockConsoleLog).toHaveBeenCalledWith('Make sure you have commits that are not in the main branch');
      expect(mockGit.getBranchDiff).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only commits list', async () => {
      mockGit.getBranchCommits.mockReturnValue('   \n  \n  ');

      await generatePRDescription();

      expect(mockConsoleLog).toHaveBeenCalledWith('❌ No commits found in this branch compared to main branch');
    });

    it('should handle empty diff', async () => {
      mockGit.getBranchDiff.mockReturnValue('');

      await generatePRDescription();

      expect(mockConsoleLog).toHaveBeenCalledWith('❌ No changes found in this branch');
      expect(mockAi.generatePRDescription).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only diff', async () => {
      mockGit.getBranchDiff.mockReturnValue('   \n  \n  ');

      await generatePRDescription();

      expect(mockConsoleLog).toHaveBeenCalledWith('❌ No changes found in this branch');
    });

    it('should count commits correctly', async () => {
      mockGit.getBranchCommits.mockReturnValue('abc123 feat: add feature\ndef456 fix: bug\nghi789 docs: update readme\n\n');

      await generatePRDescription();

      expect(mockConsoleLog).toHaveBeenCalledWith('📝 Found 3 commit(s) in this branch');
    });

    it('should handle single commit', async () => {
      mockGit.getBranchCommits.mockReturnValue('abc123 feat: add single feature');

      await generatePRDescription();

      expect(mockConsoleLog).toHaveBeenCalledWith('📝 Found 1 commit(s) in this branch');
    });

    it('should handle AI generation errors', async () => {
      const aiError = new Error('OpenAI API error');
      mockAi.generatePRDescription.mockRejectedValue(aiError);

      await generatePRDescription();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to generate PR description:', aiError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle formatter errors', async () => {
      const formatterError = new Error('File write error');
      mockFormatter.confirmPRDescription.mockRejectedValue(formatterError);

      await generatePRDescription();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to generate PR description:', formatterError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle git operation errors gracefully', async () => {
      mockGit.isGitRepository.mockReturnValue(true);
      mockGit.getCurrentBranch.mockImplementation(() => {
        throw new Error('Git error');
      });

      await generatePRDescription();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to generate PR description:', expect.any(Error));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should pass correct parameters to AI generation', async () => {
      const commits = 'abc123 feat: feature 1\ndef456 fix: bug fix\nghi789 docs: documentation';
      const diff = 'diff --git a/src/app.js b/src/app.js\n+console.log("test");';
      const branchName = 'feature/awesome-feature';

      mockGit.getCurrentBranch.mockReturnValue(branchName);
      mockGit.getBranchCommits.mockReturnValue(commits);
      mockGit.getBranchDiff.mockReturnValue(diff);

      await generatePRDescription();

      expect(mockAi.generatePRDescription).toHaveBeenCalledWith(commits, diff, branchName);
    });

    it('should pass AI result to formatter with branch name', async () => {
      const aiResult = '# Amazing Feature\n\nThis PR adds amazing functionality';
      const branchName = 'feature/amazing';

      mockGit.getCurrentBranch.mockReturnValue(branchName);
      mockAi.generatePRDescription.mockResolvedValue(aiResult);

      await generatePRDescription();

      expect(mockFormatter.confirmPRDescription).toHaveBeenCalledWith(aiResult, branchName);
    });

    it('should not call AI or formatter when early validation fails', async () => {
      mockGit.getCurrentBranch.mockReturnValue('main');

      await generatePRDescription();

      expect(mockAi.generatePRDescription).not.toHaveBeenCalled();
      expect(mockFormatter.confirmPRDescription).not.toHaveBeenCalled();
    });

    it('should continue when all conditions are met', async () => {
      // Setup successful flow
      mockGit.isGitRepository.mockReturnValue(true);
      mockGit.getCurrentBranch.mockReturnValue('feature/test');
      mockGit.getBranchCommits.mockReturnValue('abc123 test commit');
      mockGit.getBranchDiff.mockReturnValue('test diff');
      mockAi.generatePRDescription.mockResolvedValue('test description');

      await generatePRDescription();

      // Verify the full flow executed
      expect(mockGit.isGitRepository).toHaveBeenCalled();
      expect(mockGit.getCurrentBranch).toHaveBeenCalled();
      expect(mockGit.getBranchCommits).toHaveBeenCalled();
      expect(mockGit.getBranchDiff).toHaveBeenCalled();
      expect(mockAi.generatePRDescription).toHaveBeenCalled();
      expect(mockFormatter.confirmPRDescription).toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle typical feature branch workflow', async () => {
      mockGit.isGitRepository.mockReturnValue(true);
      mockGit.getCurrentBranch.mockReturnValue('feature/user-authentication');
      mockGit.getBranchCommits.mockReturnValue(
        '1a2b3c4 feat(auth): add login component\n' +
        '2b3c4d5 feat(auth): implement JWT validation\n' +
        '3c4d5e6 test(auth): add unit tests for auth service'
      );
      mockGit.getBranchDiff.mockReturnValue('diff --git a/src/auth.js b/src/auth.js...');
      mockAi.generatePRDescription.mockResolvedValue('# User Authentication\n\nImplemented login system...');

      await generatePRDescription();

      expect(mockConsoleLog).toHaveBeenCalledWith('📝 Found 3 commit(s) in this branch');
      expect(mockAi.generatePRDescription).toHaveBeenCalledWith(
        expect.stringContaining('feat(auth): add login component'),
        expect.stringContaining('diff --git a/src/auth.js'),
        'feature/user-authentication'
      );
    });

    it('should handle bugfix branch workflow', async () => {
      mockGit.isGitRepository.mockReturnValue(true);
      mockGit.getCurrentBranch.mockReturnValue('bugfix/fix-memory-leak');
      mockGit.getBranchCommits.mockReturnValue('abc123 fix: resolve memory leak in data processing');
      mockGit.getBranchDiff.mockReturnValue('diff --git a/src/processor.js b/src/processor.js...');

      await generatePRDescription();

      expect(mockConsoleLog).toHaveBeenCalledWith('📝 Found 1 commit(s) in this branch');
      expect(mockAi.generatePRDescription).toHaveBeenCalledWith(
        'abc123 fix: resolve memory leak in data processing',
        expect.stringContaining('diff --git a/src/processor.js'),
        'bugfix/fix-memory-leak'
      );
    });
  });
}); 