/**
 * Tests for Output Helpers
 */

import { makeStatus, nothingToPrint } from '../lib/output';

const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

afterEach(() => {
  jest.clearAllMocks();
});

describe('makeStatus', () => {
  it('should write to stdout interactively', () => {
    makeStatus(false)('working');

    expect(mockConsoleLog).toHaveBeenCalledWith('working');
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it('should keep stdout clean in print mode', () => {
    makeStatus(true)('working');

    expect(mockConsoleError).toHaveBeenCalledWith('working');
    expect(mockConsoleLog).not.toHaveBeenCalled();
  });
});

describe('nothingToPrint', () => {
  it('should exit non-zero in print mode', () => {
    nothingToPrint(true);

    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  it('should do nothing interactively', () => {
    nothingToPrint(false);

    expect(mockProcessExit).not.toHaveBeenCalled();
  });
});
