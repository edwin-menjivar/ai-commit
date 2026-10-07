/**
 * Tests for CLI Entry Point
 *
 * These exercise the functions exported by bin/ai-commit.ts directly, so the
 * shipped argument parsing and command routing are what actually gets covered.
 */

import * as gitModule from '../lib/git';
import * as aiModule from '../lib/ai';
import * as formatterModule from '../lib/formatter';
import * as prModule from '../lib/pr';
import * as reviewModule from '../lib/review';
import * as branchModule from '../lib/branch';
import { parseArgs, runCommit, run, showHelp } from '../bin/ai-commit';

// Mock all dependencies
jest.mock('../lib/git');
jest.mock('../lib/ai');
jest.mock('../lib/formatter');
jest.mock('../lib/pr');
jest.mock('../lib/review');
jest.mock('../lib/branch');

const mockGit = gitModule as jest.Mocked<typeof gitModule>;
const mockAi = aiModule as jest.Mocked<typeof aiModule>;
const mockFormatter = formatterModule as jest.Mocked<typeof formatterModule>;
const mockPr = prModule as jest.Mocked<typeof prModule>;
const mockReview = reviewModule as jest.Mocked<typeof reviewModule>;
const mockBranch = branchModule as jest.Mocked<typeof branchModule>;

const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

describe('CLI', () => {
  beforeEach(() => {
    mockGit.isGitRepository.mockReturnValue(true);
    mockGit.getStagedDiff.mockReturnValue('diff --git a/file.js b/file.js\n+test');
    mockAi.generateCommitMessage.mockResolvedValue('feat: add test');
    mockFormatter.confirmCommitMessage.mockResolvedValue('feat: add test');
    mockGit.commitChanges.mockImplementation(() => {});
    mockPr.generatePRDescription.mockResolvedValue();
    mockReview.performCodeReview.mockResolvedValue();
    mockBranch.suggestBranchName.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseArgs', () => {
    it('should default to the commit command', () => {
      expect(parseArgs([])).toEqual({
        command: 'commit',
        model: undefined,
        print: false,
        showVersion: false,
      });
    });

    it.each(['commit', 'pr', 'review', 'branch', 'help'])('should parse the %s command', (cmd) => {
      expect(parseArgs([cmd]).command).toBe(cmd);
    });

    it.each(['--help', '-h'])('should treat %s as the help command', (flag) => {
      expect(parseArgs([flag]).command).toBe('help');
    });

    it.each(['--version', '-v'])('should parse %s', (flag) => {
      expect(parseArgs([flag]).showVersion).toBe(true);
    });

    it('should parse --model with its value', () => {
      expect(parseArgs(['--model', 'gpt-4'])).toEqual({
        command: 'commit',
        model: 'gpt-4',
        print: false,
        showVersion: false,
      });
    });

    it.each(['--print', '-p'])('should parse %s', (flag) => {
      const result = parseArgs([flag]);

      expect(result.print).toBe(true);
      expect(result.command).toBe('commit');
      expect(result.error).toBeUndefined();
    });

    it('should accept --print together with the explicit commit command and a model', () => {
      const result = parseArgs(['commit', '--print', '--model', 'gpt-4o']);

      expect(result).toEqual({ command: 'commit', model: 'gpt-4o', print: true, showVersion: false });
    });

    it.each(['pr', 'review', 'branch'])('should reject --print with the %s command', (cmd) => {
      expect(parseArgs([cmd, '--print']).error).toBe('--print only applies to the commit command');
    });

    it('should parse a command combined with --model', () => {
      const result = parseArgs(['pr', '--model', 'gpt-4']);

      expect(result.command).toBe('pr');
      expect(result.model).toBe('gpt-4');
    });

    it('should accept --model before the command', () => {
      const result = parseArgs(['--model', 'gpt-4', 'review']);

      expect(result.command).toBe('review');
      expect(result.model).toBe('gpt-4');
    });

    it('should error when --model has no value', () => {
      expect(parseArgs(['--model']).error).toMatch(/requires a model name/);
    });

    it('should error when --model is followed by another flag', () => {
      // Otherwise `--model --version` would silently use "--version" as the model.
      expect(parseArgs(['--model', '--version']).error).toMatch(/requires a model name/);
    });

    it('should error on an unknown argument', () => {
      expect(parseArgs(['frobnicate']).error).toBe('Unknown argument: frobnicate');
    });

    it('should error on an unknown flag', () => {
      expect(parseArgs(['--nope']).error).toBe('Unknown argument: --nope');
    });

    it('should error on a second command', () => {
      expect(parseArgs(['pr', 'review']).error).toBe('Unknown argument: review');
    });
  });

  describe('showHelp', () => {
    it('should list every command', () => {
      showHelp();

      const output = mockConsoleLog.mock.calls[0][0];
      expect(output).toContain('commit');
      expect(output).toContain('pr');
      expect(output).toContain('review');
      expect(output).toContain('branch');
      expect(output).toContain('help');
    });

    it('should document the options', () => {
      showHelp();

      const output = mockConsoleLog.mock.calls[0][0];
      expect(output).toContain('--model');
      expect(output).toContain('--print');
      expect(output).toContain('--version');
    });
  });

  describe('runCommit', () => {
    it('should generate a message and commit it', async () => {
      await runCommit();

      expect(mockGit.getStagedDiff).toHaveBeenCalled();
      expect(mockAi.generateCommitMessage).toHaveBeenCalledWith('diff --git a/file.js b/file.js\n+test');
      expect(mockFormatter.confirmCommitMessage).toHaveBeenCalledWith('feat: add test');
      expect(mockGit.commitChanges).toHaveBeenCalledWith('feat: add test');
    });

    it('should commit the message the user edited, not the generated one', async () => {
      mockFormatter.confirmCommitMessage.mockResolvedValue('fix: corrected by hand');

      await runCommit();

      expect(mockGit.commitChanges).toHaveBeenCalledWith('fix: corrected by hand');
    });

    it('should exit without committing when nothing is staged', async () => {
      mockGit.getStagedDiff.mockReturnValue('');

      await runCommit();

      expect(mockConsoleLog).toHaveBeenCalledWith('No staged changes detected.');
      expect(mockProcessExit).toHaveBeenCalledWith(0);
      expect(mockAi.generateCommitMessage).not.toHaveBeenCalled();
    });

    it('should treat a whitespace-only diff as no changes', async () => {
      mockGit.getStagedDiff.mockReturnValue('   \n  ');

      await runCommit();

      expect(mockProcessExit).toHaveBeenCalledWith(0);
      expect(mockAi.generateCommitMessage).not.toHaveBeenCalled();
    });

    it('should not commit when the model returns an empty message', async () => {
      mockAi.generateCommitMessage.mockResolvedValue('');

      await runCommit();

      expect(mockGit.commitChanges).not.toHaveBeenCalled();
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    describe('with --print', () => {
      const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      afterAll(() => {
        mockStdout.mockRestore();
      });

      it('should write the message to stdout without prompting or committing', async () => {
        await runCommit({ print: true });

        expect(mockStdout).toHaveBeenCalledWith('feat: add test\n');
        expect(mockFormatter.confirmCommitMessage).not.toHaveBeenCalled();
        expect(mockGit.commitChanges).not.toHaveBeenCalled();
        expect(mockProcessExit).not.toHaveBeenCalled();
      });

      it('should keep stdout clean and exit 1 when nothing is staged', async () => {
        mockGit.getStagedDiff.mockReturnValue('');

        await runCommit({ print: true });

        expect(mockStdout).not.toHaveBeenCalled();
        expect(mockConsoleLog).not.toHaveBeenCalled();
        expect(mockConsoleError).toHaveBeenCalledWith('No staged changes detected.');
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      });

      it('should exit 1 when the model returns an empty message', async () => {
        mockAi.generateCommitMessage.mockResolvedValue('');

        await runCommit({ print: true });

        expect(mockStdout).not.toHaveBeenCalled();
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      });
    });

    it('should report a readable message when the API call fails', async () => {
      mockAi.generateCommitMessage.mockRejectedValue(new Error('API key invalid'));

      await runCommit();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ API key invalid');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should not commit when the user declines', async () => {
      mockFormatter.confirmCommitMessage.mockResolvedValue(null);

      await runCommit();

      expect(mockGit.commitChanges).not.toHaveBeenCalled();
    });

    it('should report a readable message when the commit itself fails', async () => {
      mockGit.commitChanges.mockImplementation(() => {
        throw new Error('nothing to commit');
      });

      await runCommit();

      expect(mockConsoleError).toHaveBeenCalledWith('❌ nothing to commit');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('run', () => {
    it('should route commit to the commit flow', async () => {
      await run('commit');

      expect(mockGit.commitChanges).toHaveBeenCalled();
    });

    it('should pass print mode through to the commit flow', async () => {
      const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      await run('commit', { print: true });

      expect(mockStdout).toHaveBeenCalledWith('feat: add test\n');
      expect(mockGit.commitChanges).not.toHaveBeenCalled();
      mockStdout.mockRestore();
    });

    it('should route pr to the PR generator', async () => {
      await run('pr');

      expect(mockPr.generatePRDescription).toHaveBeenCalled();
      expect(mockGit.commitChanges).not.toHaveBeenCalled();
    });

    it('should route review to the code reviewer', async () => {
      await run('review');

      expect(mockReview.performCodeReview).toHaveBeenCalled();
    });

    it('should route branch to the branch suggester', async () => {
      await run('branch');

      expect(mockBranch.suggestBranchName).toHaveBeenCalled();
    });

    it('should route help to the help output', async () => {
      await run('help');

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(mockPr.generatePRDescription).not.toHaveBeenCalled();
    });

    it.each(['commit', 'pr', 'review', 'branch'] as const)(
      'should refuse to run %s outside a git repository',
      async (command) => {
        mockGit.isGitRepository.mockReturnValue(false);

        await run(command);

        expect(mockConsoleError).toHaveBeenCalledWith('❌ Not in a git repository');
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    );

    it('should still show help outside a git repository', async () => {
      mockGit.isGitRepository.mockReturnValue(false);

      await run('help');

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it('should propagate errors from a subcommand', async () => {
      mockPr.generatePRDescription.mockRejectedValue(new Error('boom'));

      await expect(run('pr')).rejects.toThrow('boom');
    });
  });
});
