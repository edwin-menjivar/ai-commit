/**
 * Tests for Formatter Module
 */

import * as readline from 'readline';
import * as fs from 'fs';
import {
    confirmCommitMessage,
    confirmPRDescription,
    displayCodeReview
} from '../lib/formatter';

// Mock readline
jest.mock('readline');
const mockReadline = readline as jest.Mocked<typeof readline>;

// Mock fs
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('Formatter Module', () => {
  let mockRlInterface: {
    question: jest.MockedFunction<any>;
    close: jest.MockedFunction<any>;
  };

  beforeEach(() => {
    mockRlInterface = {
      question: jest.fn(),
      close: jest.fn()
    };

    mockReadline.createInterface.mockReturnValue(mockRlInterface as any);
    
    // Mock process.cwd()
    jest.spyOn(process, 'cwd').mockReturnValue('/current/directory');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('confirmCommitMessage', () => {
    it('should accept message when user types "y"', async () => {
      const testMessage = 'feat: add new feature';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('y');
      });

      const result = await confirmCommitMessage(testMessage);

      expect(mockConsoleLog).toHaveBeenCalledWith(`\n🤖 Generated commit message:`);
      expect(mockConsoleLog).toHaveBeenCalledWith(`   "${testMessage}"\n`);
      expect(result).toBe(testMessage);
      expect(mockRlInterface.close).toHaveBeenCalled();
    });

    it('should accept message when user types "yes"', async () => {
      const testMessage = 'fix: resolve bug';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('yes');
      });

      const result = await confirmCommitMessage(testMessage);

      expect(result).toBe(testMessage);
    });

    it('should accept message when user presses enter (empty input)', async () => {
      const testMessage = 'docs: update readme';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('');
      });

      const result = await confirmCommitMessage(testMessage);

      expect(result).toBe(testMessage);
    });

    it('should prompt for new message when user types "n"', async () => {
      const testMessage = 'original message';
      const newMessage = 'custom message';
      
      mockRlInterface.question
        .mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
          callback('n');
        })
        .mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
          callback(newMessage);
        });

      const result = await confirmCommitMessage(testMessage);

      expect(mockConsoleLog).toHaveBeenCalledWith('Please provide your commit message:');
      expect(result).toBe(newMessage);
    });

    it('should prompt for new message when user types "no"', async () => {
      const testMessage = 'original message';
      const newMessage = 'different message';
      
      mockRlInterface.question
        .mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
          callback('no');
        })
        .mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
          callback(newMessage);
        });

      const result = await confirmCommitMessage(testMessage);

      expect(result).toBe(newMessage);
    });

    it('should use custom message when user types directly', async () => {
      const testMessage = 'original message';
      const customMessage = 'custom: my own message';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback(customMessage);
      });

      const result = await confirmCommitMessage(testMessage);

      expect(result).toBe(customMessage);
    });

    it('should handle empty custom message by falling back to original', async () => {
      const testMessage = 'original message';
      
      mockRlInterface.question
        .mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
          callback('n');
        })
        .mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
          callback('');
        });

      const result = await confirmCommitMessage(testMessage);

      expect(result).toBe(testMessage);
    });
  });

  describe('confirmPRDescription', () => {
    it('should save PR description when user types "y"', async () => {
      const description = '# Feature\n\nAdded new functionality';
      const branchName = 'feature/new-feature';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('y');
      });

      await confirmPRDescription(description, branchName);

      expect(mockConsoleLog).toHaveBeenCalledWith(`\n🤖 Generated PR description for branch: ${branchName}`);
      expect(mockConsoleLog).toHaveBeenCalledWith('='.repeat(60));
      expect(mockConsoleLog).toHaveBeenCalledWith(description);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/current/directory/pr-description-feature-new-feature.md',
        description
      );
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ PR description saved to: pr-description-feature-new-feature.md');
    });

    it('should save PR description when user types "yes"', async () => {
      const description = 'PR content';
      const branchName = 'feature/test';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('yes');
      });

      await confirmPRDescription(description, branchName);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should save PR description when user presses enter', async () => {
      const description = 'PR content';
      const branchName = 'feature/test';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('');
      });

      await confirmPRDescription(description, branchName);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should create edit file when user types "edit"', async () => {
      const description = 'PR content';
      const branchName = 'feature/test';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('edit');
      });

      await confirmPRDescription(description, branchName);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/current/directory/pr-description-feature-test.md',
        description
      );
      expect(mockConsoleLog).toHaveBeenCalledWith('📝 PR description saved to: pr-description-feature-test.md');
      expect(mockConsoleLog).toHaveBeenCalledWith('Edit the file and run the command again if needed.');
    });

    it('should not save when user types "n"', async () => {
      const description = 'PR content';
      const branchName = 'feature/test';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('n');
      });

      await confirmPRDescription(description, branchName);

      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('PR description not saved.');
    });

    it('should handle file write errors', async () => {
      const description = 'PR content';
      const branchName = 'feature/test';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('y');
      });

      mockFs.writeFileSync.mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });

      await confirmPRDescription(description, branchName);

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to save PR description: Error: Permission denied');
    });

    it('should sanitize branch name for filename', async () => {
      const description = 'PR content';
      const branchName = 'feature/test-branch/with-slashes';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('y');
      });

      await confirmPRDescription(description, branchName);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/current/directory/pr-description-feature-test-branch-with-slashes.md',
        description
      );
    });
  });

  describe('displayCodeReview', () => {
    it('should display code review and save when user types "y"', async () => {
      const review = '## Code Review\n\nLooks good!';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('y');
      });

      // Mock date for consistent filename
      const mockDate = new Date('2023-01-01T12:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      await displayCodeReview(review);

      expect(mockConsoleLog).toHaveBeenCalledWith('\n🔍 AI Code Review Results:');
      expect(mockConsoleLog).toHaveBeenCalledWith('='.repeat(60));
      expect(mockConsoleLog).toHaveBeenCalledWith(review);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/current/directory/code-review-2023-01-01T12-00-00-000Z.md',
        review
      );
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Code review saved to: code-review-2023-01-01T12-00-00-000Z.md');
    });

    it('should display code review and save when user types "yes"', async () => {
      const review = 'Review content';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('yes');
      });

      await displayCodeReview(review);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should not save when user types "n"', async () => {
      const review = 'Review content';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('n');
      });

      await displayCodeReview(review);

      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('Review not saved.');
    });

    it('should handle file write errors for code review', async () => {
      const review = 'Review content';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('y');
      });

      mockFs.writeFileSync.mockImplementationOnce(() => {
        throw new Error('Disk full');
      });

      await displayCodeReview(review);

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to save code review: Error: Disk full');
    });

    it('should generate unique timestamps for review filenames', async () => {
      const review = 'Review content';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('y');
      });

      await displayCodeReview(review);

      // Check that the filename follows the expected pattern
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/\/current\/directory\/code-review-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/),
        review
      );
    });
  });

  describe('Readline interface management', () => {
    it('should create and close readline interface properly', async () => {
      const testMessage = 'test message';
      
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('y');
      });

      await confirmCommitMessage(testMessage);

      expect(mockReadline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout
      });
      expect(mockRlInterface.close).toHaveBeenCalled();
    });

    it('should handle multiple readline interfaces for complex flows', async () => {
      const testMessage = 'test message';
      
      // First interface for initial question
      mockRlInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('n');
      });

      // Second interface for new message
      const secondInterface = {
        question: jest.fn(),
        close: jest.fn()
      };
      
      mockReadline.createInterface
        .mockReturnValueOnce(mockRlInterface as any)
        .mockReturnValueOnce(secondInterface as any);

      secondInterface.question.mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
        callback('new message');
      });

      const result = await confirmCommitMessage(testMessage);

      expect(mockReadline.createInterface).toHaveBeenCalledTimes(2);
      expect(mockRlInterface.close).toHaveBeenCalled();
      expect(secondInterface.close).toHaveBeenCalled();
      expect(result).toBe('new message');
    });
  });
}); 