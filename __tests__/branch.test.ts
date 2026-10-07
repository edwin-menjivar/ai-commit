/**
 * Tests for Branch Naming Module
 */

import * as branchModule from '../lib/branch';
import * as gitModule from '../lib/git';
import * as aiModule from '../lib/ai';
import * as formatterModule from '../lib/formatter';

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

describe('Branch Module', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('suggestBranchName', () => {
    beforeEach(() => {
      // Set up default mocks
      mockGit.isGitRepository.mockReturnValue(true);
      mockGit.getCurrentBranch.mockReturnValue('main');
      mockGit.getStagedDiff.mockReturnValue('');
      mockGit.getUnstagedDiff.mockReturnValue('diff --git a/file.js b/file.js\n+function test() {}');
      mockGit.getAllChangesDiff.mockReturnValue('diff --git a/file.js b/file.js\n+function test() {}');
      mockAi.generateBranchNameSuggestions.mockResolvedValue([
        'feat/add-test-function',
        'feat/test-feature',
        'feature/test',
      ]);
      mockFormatter.selectBranchName.mockResolvedValue('feat/add-test-function');
      mockGit.branchExists.mockReturnValue(false);
      mockGit.createBranch.mockImplementation(() => {});
    });

    it('should suggest branch names based on unstaged changes', async () => {
      await branchModule.suggestBranchName();

      expect(mockGit.isGitRepository).toHaveBeenCalled();
      expect(mockGit.getCurrentBranch).toHaveBeenCalled();
      expect(mockGit.getUnstagedDiff).toHaveBeenCalled();
      expect(mockAi.generateBranchNameSuggestions).toHaveBeenCalledWith(
        'diff --git a/file.js b/file.js\n+function test() {}'
      );
      expect(mockFormatter.selectBranchName).toHaveBeenCalledWith([
        'feat/add-test-function',
        'feat/test-feature',
        'feature/test',
      ]);
    });

    it('should use staged changes if no unstaged changes', async () => {
      mockGit.getUnstagedDiff.mockReturnValue('');
      mockGit.getStagedDiff.mockReturnValue('diff --git a/file.js b/file.js\n+function test() {}');

      await branchModule.suggestBranchName();

      expect(mockGit.getStagedDiff).toHaveBeenCalled();
      expect(mockAi.generateBranchNameSuggestions).toHaveBeenCalledWith(
        'diff --git a/file.js b/file.js\n+function test() {}'
      );
    });

    it('should create branch when user selects a suggestion', async () => {
      await branchModule.suggestBranchName();

      expect(mockGit.branchExists).toHaveBeenCalledWith('feat/add-test-function');
      expect(mockGit.createBranch).toHaveBeenCalledWith('feat/add-test-function');
    });

    it('should exit when not in a git repository', async () => {
      mockGit.isGitRepository.mockReturnValue(false);

      await branchModule.suggestBranchName();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Not in a git repository');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle case when no changes are detected', async () => {
      mockGit.getUnstagedDiff.mockReturnValue('');
      mockGit.getStagedDiff.mockReturnValue('');
      mockGit.getAllChangesDiff.mockReturnValue('');

      await branchModule.suggestBranchName();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '❌ No changes detected. Make some changes first, then run this command.'
      );
      expect(mockAi.generateBranchNameSuggestions).not.toHaveBeenCalled();
    });

    it('should handle case when user cancels branch selection', async () => {
      mockFormatter.selectBranchName.mockResolvedValue(null);

      await branchModule.suggestBranchName();

      expect(mockGit.createBranch).not.toHaveBeenCalled();
    });

    it('should handle case when branch already exists', async () => {
      mockGit.branchExists.mockReturnValue(true);

      // Mock readline for the branch switch prompt
      const mockReadline = require('readline');
      let questionCallback: (answer: string) => void;

      mockReadline.createInterface = jest.fn().mockReturnValue({
        question: jest.fn().mockImplementation((prompt: string, callback: (answer: string) => void) => {
          questionCallback = callback;
        }),
        close: jest.fn(),
        on: jest.fn(),
      });

      const suggestPromise = branchModule.suggestBranchName();

      // Simulate user saying 'no' to switching
      setTimeout(() => {
        if (questionCallback) {
          questionCallback('n');
        }
      }, 10);

      await suggestPromise;

      expect(mockGit.branchExists).toHaveBeenCalled();
      expect(mockGit.createBranch).not.toHaveBeenCalled();
    });

    it('should switch to the existing branch when the user agrees', async () => {
      mockGit.branchExists.mockReturnValue(true);

      const mockReadline = require('readline');
      mockReadline.createInterface = jest.fn().mockReturnValue({
        question: jest.fn().mockImplementation((_prompt: string, cb: (a: string) => void) => cb('y')),
        close: jest.fn(),
        on: jest.fn(),
      });

      await branchModule.suggestBranchName();

      expect(mockGit.checkoutBranch).toHaveBeenCalledWith('feat/add-test-function');
      expect(mockGit.createBranch).not.toHaveBeenCalled();
    });

    it('should not switch branches until the user has answered', async () => {
      // The prompt used to be fire-and-forget, so suggestBranchName resolved
      // before the answer arrived and the checkout raced the caller.
      mockGit.branchExists.mockReturnValue(true);

      let respond: ((answer: string) => void) | undefined;
      const mockReadline = require('readline');
      mockReadline.createInterface = jest.fn().mockReturnValue({
        question: jest.fn().mockImplementation((_prompt: string, cb: (a: string) => void) => {
          respond = cb;
        }),
        close: jest.fn(),
        on: jest.fn(),
      });

      let settled = false;
      const pending = branchModule.suggestBranchName().then(() => {
        settled = true;
      });

      // Let everything up to the prompt run; the flow must then stop and wait.
      await new Promise((resolve) => setImmediate(resolve));
      expect(settled).toBe(false);
      expect(mockGit.checkoutBranch).not.toHaveBeenCalled();

      respond!('y');
      await pending;

      expect(mockGit.checkoutBranch).toHaveBeenCalledWith('feat/add-test-function');
    });

    it('should report a readable error when the checkout fails', async () => {
      mockGit.branchExists.mockReturnValue(true);
      mockGit.checkoutBranch.mockImplementation(() => {
        throw new Error('local changes would be overwritten');
      });

      const mockReadline = require('readline');
      mockReadline.createInterface = jest.fn().mockReturnValue({
        question: jest.fn().mockImplementation((_prompt: string, cb: (a: string) => void) => cb('y')),
        close: jest.fn(),
        on: jest.fn(),
      });

      await branchModule.suggestBranchName();

      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ Failed to switch to branch: local changes would be overwritten'
      );
    });

    it('should display info message when on main branch', async () => {
      mockGit.getCurrentBranch.mockReturnValue('main');

      await branchModule.suggestBranchName();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "ℹ️  You're on main. Creating a new branch is recommended."
      );
    });
  });
});
