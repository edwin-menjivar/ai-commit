/**
 * Tests for the Git Hook Installer
 */

import * as fs from 'fs';
import * as gitModule from '../lib/git';
import { installHook, uninstallHook, showHook, runHookCommand, HOOK_SCRIPT, HOOK_MARKER } from '../lib/hook';

jest.mock('fs');
jest.mock('../lib/git');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockGit = gitModule as jest.Mocked<typeof gitModule>;

const HOOKS_DIR = '/repo/.git/hooks';
const HOOK_PATH = `${HOOKS_DIR}/prepare-commit-msg`;

const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('Hook Module', () => {
  beforeEach(() => {
    mockGit.getHooksDir.mockReturnValue(HOOKS_DIR);
    mockFs.existsSync.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('HOOK_SCRIPT', () => {
    it('should carry the marker so uninstall can recognise it', () => {
      expect(HOOK_SCRIPT).toContain(HOOK_MARKER);
    });

    it('should only act on a plain git commit and respect AI_COMMIT_SKIP', () => {
      expect(HOOK_SCRIPT).toContain('[ -n "$2" ] && exit 0');
      expect(HOOK_SCRIPT).toContain('[ -n "$AI_COMMIT_SKIP" ] && exit 0');
      expect(HOOK_SCRIPT).toContain('ai-commit --print');
    });
  });

  describe('installHook', () => {
    it('should write an executable hook into the hooks directory', () => {
      installHook();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(HOOKS_DIR, { recursive: true });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(HOOK_PATH, HOOK_SCRIPT);
      expect(mockFs.chmodSync).toHaveBeenCalledWith(HOOK_PATH, 0o755);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining(HOOK_PATH));
    });

    it('should overwrite a hook it installed earlier', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(`#!/bin/sh\n${HOOK_MARKER} old version\n`);

      installHook();

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(HOOK_PATH, HOOK_SCRIPT);
    });

    it("should refuse to clobber someone else's hook", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('#!/bin/sh\necho custom hook\n');

      expect(() => installHook()).toThrow(/already exists/);
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('uninstallHook', () => {
    it('should remove a hook it installed', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(HOOK_SCRIPT);

      uninstallHook();

      expect(mockFs.unlinkSync).toHaveBeenCalledWith(HOOK_PATH);
    });

    it('should report when there is nothing to remove', () => {
      uninstallHook();

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('No prepare-commit-msg hook is installed.');
    });

    it("should leave someone else's hook alone", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('#!/bin/sh\necho custom hook\n');

      expect(() => uninstallHook()).toThrow(/not installed by ai-commit/);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('showHook', () => {
    it('should print the script to stdout', () => {
      const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      showHook();

      expect(write).toHaveBeenCalledWith(HOOK_SCRIPT);
      write.mockRestore();
    });
  });

  describe('runHookCommand', () => {
    it('should dispatch install', () => {
      runHookCommand('install');

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should dispatch uninstall', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(HOOK_SCRIPT);

      runHookCommand('uninstall');

      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('should dispatch show', () => {
      const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      runHookCommand('show');

      expect(write).toHaveBeenCalledWith(HOOK_SCRIPT);
      write.mockRestore();
    });
  });
});
