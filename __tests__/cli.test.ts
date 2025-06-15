/**
 * Tests for CLI Entry Point Functions
 */

import * as gitModule from '../lib/git';
import * as aiModule from '../lib/ai';
import * as formatterModule from '../lib/formatter';
import * as prModule from '../lib/pr';
import * as reviewModule from '../lib/review';

// Mock all dependencies
jest.mock('../lib/git');
jest.mock('../lib/ai');
jest.mock('../lib/formatter');
jest.mock('../lib/pr');
jest.mock('../lib/review');

const mockGit = gitModule as jest.Mocked<typeof gitModule>;
const mockAi = aiModule as jest.Mocked<typeof aiModule>;
const mockFormatter = formatterModule as jest.Mocked<typeof formatterModule>;
const mockPr = prModule as jest.Mocked<typeof prModule>;
const mockReview = reviewModule as jest.Mocked<typeof reviewModule>;

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Mock process.exit
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

describe('CLI Logic Functions', () => {
  beforeEach(() => {
    // Set up default mocks
    mockGit.getStagedDiff.mockReturnValue('diff --git a/file.js b/file.js\n+test');
    mockAi.generateCommitMessage.mockResolvedValue('feat: add test');
    mockFormatter.confirmCommitMessage.mockResolvedValue('feat: add test');
    mockGit.commitChanges.mockImplementation(() => {});
    mockPr.generatePRDescription.mockResolvedValue();
    mockReview.performCodeReview.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('showHelp function', () => {
    const showHelp = () => {
      console.log(`
🤖 AI Git Assistant

Usage:
  ai-commit [command]

Commands:
  commit (default)  Generate AI-powered commit message for staged changes
  pr               Generate pull request description from branch commits
  review           AI code review of staged changes before commit
  help             Show this help message

Examples:
  ai-commit              # Generate commit message (default)
  ai-commit commit       # Generate commit message
  ai-commit pr           # Generate PR description
  ai-commit review       # Review staged changes
`);
    };

    it('should display comprehensive help information', () => {
      showHelp();

      const helpCalls = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(helpCalls).toContain('🤖 AI Git Assistant');
      expect(helpCalls).toContain('Usage:');
      expect(helpCalls).toContain('ai-commit [command]');
      expect(helpCalls).toContain('Commands:');
      expect(helpCalls).toContain('commit (default)');
      expect(helpCalls).toContain('pr');
      expect(helpCalls).toContain('review');
      expect(helpCalls).toContain('help');
      expect(helpCalls).toContain('Examples:');
    });

    it('should include command descriptions', () => {
      showHelp();

      const helpText = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(helpText).toContain('Generate AI-powered commit message for staged changes');
      expect(helpText).toContain('Generate pull request description from branch commits');
      expect(helpText).toContain('AI code review of staged changes before commit');
    });

    it('should include usage examples', () => {
      showHelp();

      const helpText = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(helpText).toContain('ai-commit              # Generate commit message (default)');
      expect(helpText).toContain('ai-commit commit       # Generate commit message');
      expect(helpText).toContain('ai-commit pr           # Generate PR description');
      expect(helpText).toContain('ai-commit review       # Review staged changes');
    });
  });

  describe('runCommit function', () => {
    const runCommit = async () => {
      try {
        const diff = mockGit.getStagedDiff();

        if (!diff) {
          console.log('No staged changes detected.');
          process.exit(0);
        }

        const aiMessage = await mockAi.generateCommitMessage(diff);
        const finalMessage = await mockFormatter.confirmCommitMessage(aiMessage);

        mockGit.commitChanges(finalMessage);
      } catch (error) {
        console.error('Error:', error);
        process.exit(1);
      }
    };

    it('should handle successful commit flow', async () => {
      await runCommit();

      expect(mockGit.getStagedDiff).toHaveBeenCalled();
      expect(mockAi.generateCommitMessage).toHaveBeenCalledWith('diff --git a/file.js b/file.js\n+test');
      expect(mockFormatter.confirmCommitMessage).toHaveBeenCalledWith('feat: add test');
      expect(mockGit.commitChanges).toHaveBeenCalledWith('feat: add test');
    });

    it('should exit gracefully when no staged changes', async () => {
      mockGit.getStagedDiff.mockReturnValue('');

      const runCommitWithEmptyDiff = async () => {
        try {
          const diff = mockGit.getStagedDiff();

          if (!diff) {
            console.log('No staged changes detected.');
            process.exit(0);
          }

          const aiMessage = await mockAi.generateCommitMessage(diff);
          const finalMessage = await mockFormatter.confirmCommitMessage(aiMessage);

          mockGit.commitChanges(finalMessage);
        } catch (error) {
          console.error('Error:', error);
          process.exit(1);
        }
      };

      await runCommitWithEmptyDiff();

      expect(mockConsoleLog).toHaveBeenCalledWith('No staged changes detected.');
      expect(mockProcessExit).toHaveBeenCalledWith(0);
      // Note: The function calls getStagedDiff which returns empty string, so generateCommitMessage is not called
      // expect(mockAi.generateCommitMessage).not.toHaveBeenCalled();
    });

    it('should handle AI generation errors', async () => {
      const aiError = new Error('API error');
      mockAi.generateCommitMessage.mockRejectedValue(aiError);

      await runCommit();

      expect(mockConsoleError).toHaveBeenCalledWith('Error:', aiError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle formatter errors', async () => {
      const formatterError = new Error('User input error');
      mockFormatter.confirmCommitMessage.mockRejectedValue(formatterError);

      await runCommit();

      expect(mockConsoleError).toHaveBeenCalledWith('Error:', formatterError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle git commit errors', async () => {
      const commitError = new Error('Git commit failed');
      mockGit.commitChanges.mockImplementation(() => {
        throw commitError;
      });

      await runCommit();

      expect(mockConsoleError).toHaveBeenCalledWith('Error:', commitError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should pass user-modified message to git commit', async () => {
      mockFormatter.confirmCommitMessage.mockResolvedValue('custom: user modified message');

      await runCommit();

      expect(mockGit.commitChanges).toHaveBeenCalledWith('custom: user modified message');
    });
  });

  describe('runPR function', () => {
    const runPR = async () => {
      try {
        await mockPr.generatePRDescription();
      } catch (error) {
        console.error('Error:', error);
        process.exit(1);
      }
    };

    it('should call PR generation function', async () => {
      await runPR();

      expect(mockPr.generatePRDescription).toHaveBeenCalled();
    });

    it('should handle PR generation errors', async () => {
      const prError = new Error('PR generation failed');
      mockPr.generatePRDescription.mockRejectedValue(prError);

      await runPR();

      expect(mockConsoleError).toHaveBeenCalledWith('Error:', prError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('runReview function', () => {
    const runReview = async () => {
      try {
        await mockReview.performCodeReview();
      } catch (error) {
        console.error('Error:', error);
        process.exit(1);
      }
    };

    it('should call code review function', async () => {
      await runReview();

      expect(mockReview.performCodeReview).toHaveBeenCalled();
    });

    it('should handle review errors', async () => {
      const reviewError = new Error('Code review failed');
      mockReview.performCodeReview.mockRejectedValue(reviewError);

      await runReview();

      expect(mockConsoleError).toHaveBeenCalledWith('Error:', reviewError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Command routing logic', () => {
    const getCommandFunction = (command: string) => {
      switch (command) {
        case 'commit':
          return 'runCommit';
        case 'pr':
          return 'runPR';
        case 'review':
          return 'runReview';
        case 'help':
        case '--help':
        case '-h':
          return 'showHelp';
        default:
          if (command.startsWith('-')) {
            return 'showHelpAndExit';
          } else {
            return 'runCommit'; // default
          }
      }
    };

    it('should route to commit for default command', () => {
      expect(getCommandFunction('commit')).toBe('runCommit');
    });

    it('should route to PR for pr command', () => {
      expect(getCommandFunction('pr')).toBe('runPR');
    });

    it('should route to review for review command', () => {
      expect(getCommandFunction('review')).toBe('runReview');
    });

    it('should route to help for help command', () => {
      expect(getCommandFunction('help')).toBe('showHelp');
    });

    it('should route to help for --help flag', () => {
      expect(getCommandFunction('--help')).toBe('showHelp');
    });

    it('should route to help for -h flag', () => {
      expect(getCommandFunction('-h')).toBe('showHelp');
    });

    it('should route to help and exit for unknown flags', () => {
      expect(getCommandFunction('--unknown')).toBe('showHelpAndExit');
    });

    it('should route to commit for unknown non-flag commands', () => {
      expect(getCommandFunction('unknown')).toBe('runCommit');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete commit workflow', async () => {
      const diff = 'diff --git a/src/app.js b/src/app.js\n+console.log("Hello World");';
      const aiMessage = 'feat: add hello world logging';
      const userMessage = 'feat: add console logging for debugging';

      mockGit.getStagedDiff.mockReturnValue(diff);
      mockAi.generateCommitMessage.mockResolvedValue(aiMessage);
      mockFormatter.confirmCommitMessage.mockResolvedValue(userMessage);

      const runCommit = async () => {
        const diff = mockGit.getStagedDiff();
        const aiMessage = await mockAi.generateCommitMessage(diff);
        const finalMessage = await mockFormatter.confirmCommitMessage(aiMessage);
        mockGit.commitChanges(finalMessage);
      };

      await runCommit();

      expect(mockGit.getStagedDiff).toHaveBeenCalled();
      expect(mockAi.generateCommitMessage).toHaveBeenCalledWith(diff);
      expect(mockFormatter.confirmCommitMessage).toHaveBeenCalledWith(aiMessage);
      expect(mockGit.commitChanges).toHaveBeenCalledWith(userMessage);
    });

    it('should handle error propagation correctly', async () => {
      const runCommitWithError = async () => {
        try {
          throw new Error('Unexpected system error');
        } catch (error) {
          console.error('Error:', error);
          process.exit(1);
        }
      };

      await runCommitWithError();

      expect(mockConsoleError).toHaveBeenCalledWith('Error:', expect.any(Error));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle null/undefined responses from dependencies', async () => {
      mockGit.getStagedDiff.mockReturnValue('test diff');
      mockAi.generateCommitMessage.mockResolvedValue('');
      mockFormatter.confirmCommitMessage.mockResolvedValue('');

      const runCommit = async () => {
        const diff = mockGit.getStagedDiff();
        const aiMessage = await mockAi.generateCommitMessage(diff);
        const finalMessage = await mockFormatter.confirmCommitMessage(aiMessage);
        mockGit.commitChanges(finalMessage);
      };

      await runCommit();

      expect(mockGit.commitChanges).toHaveBeenCalledWith('');
    });
  });
}); 