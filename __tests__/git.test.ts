/**
 * Tests for Git Operations Module
 */

import { execSync } from 'child_process';
import {
    getStagedDiff,
    commitChanges,
    getCurrentBranch,
    getMainBranch,
    getBranchCommits,
    getBranchDiff,
    isGitRepository
} from '../lib/git';

// Mock child_process
jest.mock('child_process');
const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('Git Operations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStagedDiff', () => {
    it('should return staged diff from git', () => {
      const mockDiff = 'diff --git a/file.txt b/file.txt\n+added line';
      mockedExecSync.mockReturnValue(Buffer.from(mockDiff));

      const result = getStagedDiff();

      expect(mockedExecSync).toHaveBeenCalledWith('git diff --cached');
      expect(result).toBe(mockDiff);
    });

    it('should return empty string when no staged changes', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''));

      const result = getStagedDiff();

      expect(result).toBe('');
    });
  });

  describe('commitChanges', () => {
    it('should commit with provided message', () => {
      const message = 'feat: add new feature';
      mockedExecSync.mockReturnValue(Buffer.from(''));

      commitChanges(message);

      expect(mockedExecSync).toHaveBeenCalledWith(
        `git commit -m "${message}"`,
        { stdio: 'inherit' }
      );
    });

    it('should handle messages with special characters', () => {
      const message = 'fix: resolve "issue" with $variable';
      mockedExecSync.mockReturnValue(Buffer.from(''));

      commitChanges(message);

      expect(mockedExecSync).toHaveBeenCalledWith(
        `git commit -m "${message}"`,
        { stdio: 'inherit' }
      );
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', () => {
      mockedExecSync.mockReturnValue(Buffer.from('feature/new-feature\n'));

      const result = getCurrentBranch();

      expect(mockedExecSync).toHaveBeenCalledWith('git branch --show-current');
      expect(result).toBe('feature/new-feature');
    });

    it('should handle branch names with whitespace', () => {
      mockedExecSync.mockReturnValue(Buffer.from('  main  \n'));

      const result = getCurrentBranch();

      expect(result).toBe('main');
    });
  });

  describe('getMainBranch', () => {
    it('should return "main" when origin/main exists', () => {
      mockedExecSync.mockReturnValue(Buffer.from('origin/main\norigin/feature'));

      const result = getMainBranch();

      expect(result).toBe('main');
    });

    it('should return "master" when origin/master exists but not main', () => {
      mockedExecSync.mockReturnValue(Buffer.from('origin/master\norigin/feature'));

      const result = getMainBranch();

      expect(result).toBe('master');
    });

    it('should return "develop" when origin/develop exists but not main/master', () => {
      mockedExecSync.mockReturnValue(Buffer.from('origin/develop\norigin/feature'));

      const result = getMainBranch();

      expect(result).toBe('develop');
    });

    it('should fallback to "main" when git command fails', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Git error');
      });

      const result = getMainBranch();

      expect(result).toBe('main');
    });

    it('should fallback to "main" when no known branches found', () => {
      mockedExecSync.mockReturnValue(Buffer.from('origin/feature\norigin/bugfix'));

      const result = getMainBranch();

      expect(result).toBe('main');
    });
  });

  describe('getBranchCommits', () => {
    it('should return commits between main and current branch', () => {
      mockedExecSync
        .mockReturnValueOnce(Buffer.from('feature-branch\n')) // getCurrentBranch
        .mockReturnValueOnce(Buffer.from('origin/main\n'))    // getMainBranch (git branch -r)
        .mockReturnValueOnce(Buffer.from('abc123 feat: add feature\ndef456 fix: bug fix\n')); // git log

      const result = getBranchCommits();

      expect(mockedExecSync).toHaveBeenCalledWith('git branch --show-current');
      expect(mockedExecSync).toHaveBeenCalledWith('git branch -r');
      expect(mockedExecSync).toHaveBeenCalledWith('git log main..feature-branch --oneline');
      expect(result).toBe('abc123 feat: add feature\ndef456 fix: bug fix\n');
    });

    it('should use provided branch name when specified', () => {
      mockedExecSync
        .mockReturnValueOnce(Buffer.from('origin/main\n'))    // getMainBranch
        .mockReturnValueOnce(Buffer.from('xyz789 docs: update readme\n')); // git log

      const result = getBranchCommits('custom-branch');

      expect(mockedExecSync).not.toHaveBeenCalledWith('git branch --show-current');
      expect(mockedExecSync).toHaveBeenCalledWith('git log main..custom-branch --oneline');
      expect(result).toBe('xyz789 docs: update readme\n');
    });

    it('should fallback to recent commits when branch comparison fails', () => {
      mockedExecSync
        .mockReturnValueOnce(Buffer.from('feature-branch\n')) // getCurrentBranch
        .mockReturnValueOnce(Buffer.from('origin/main\n'))    // getMainBranch
        .mockImplementationOnce(() => {                        // git log fails
          throw new Error('Git error');
        })
        .mockReturnValueOnce(Buffer.from('recent commits\n')); // fallback

      const result = getBranchCommits();

      expect(mockedExecSync).toHaveBeenCalledWith('git log --oneline -10');
      expect(result).toBe('recent commits\n');
    });
  });

  describe('getBranchDiff', () => {
    it('should return diff between main and current branch', () => {
      mockedExecSync
        .mockReturnValueOnce(Buffer.from('feature-branch\n')) // getCurrentBranch
        .mockReturnValueOnce(Buffer.from('origin/main\n'))    // getMainBranch
        .mockReturnValueOnce(Buffer.from('diff content\n'));   // git diff

      const result = getBranchDiff();

      expect(mockedExecSync).toHaveBeenCalledWith('git diff main...feature-branch');
      expect(result).toBe('diff content\n');
    });

    it('should use provided branch name when specified', () => {
      mockedExecSync
        .mockReturnValueOnce(Buffer.from('origin/main\n'))    // getMainBranch
        .mockReturnValueOnce(Buffer.from('custom diff\n'));   // git diff

      const result = getBranchDiff('custom-branch');

      expect(mockedExecSync).toHaveBeenCalledWith('git diff main...custom-branch');
      expect(result).toBe('custom diff\n');
    });

    it('should fallback to recent changes when branch diff fails', () => {
      mockedExecSync
        .mockReturnValueOnce(Buffer.from('feature-branch\n')) // getCurrentBranch
        .mockReturnValueOnce(Buffer.from('origin/main\n'))    // getMainBranch
        .mockImplementationOnce(() => {                        // git diff fails
          throw new Error('Git error');
        })
        .mockReturnValueOnce(Buffer.from('fallback diff\n')); // fallback

      const result = getBranchDiff();

      expect(mockedExecSync).toHaveBeenCalledWith('git diff HEAD~5..HEAD');
      expect(result).toBe('fallback diff\n');
    });
  });

  describe('isGitRepository', () => {
    it('should return true when in a git repository', () => {
      mockedExecSync.mockReturnValueOnce(Buffer.from('.git\n'));

      const result = isGitRepository();

      expect(mockedExecSync).toHaveBeenCalledWith('git rev-parse --git-dir', { stdio: 'ignore' });
      expect(result).toBe(true);
    });

    it('should return false when not in a git repository', () => {
      mockedExecSync.mockImplementationOnce(() => {
        throw new Error('Not a git repository');
      });

      const result = isGitRepository();

      expect(result).toBe(false);
    });

    it('should return false when git command fails', () => {
      mockedExecSync.mockImplementationOnce(() => {
        throw new Error('Git not found');
      });

      const result = isGitRepository();

      expect(result).toBe(false);
    });
  });
}); 