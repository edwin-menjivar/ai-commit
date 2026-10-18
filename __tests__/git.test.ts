/**
 * Tests for Git Operations Module
 */

import { execFileSync } from 'child_process';
import {
  getStagedDiff,
  commitChanges,
  getCurrentBranch,
  getMainBranch,
  getBranchCommits,
  getBranchDiff,
  isGitRepository,
  getUnstagedDiff,
  getAllChangesDiff,
  createBranch,
  checkoutBranch,
  branchExists,
  getHooksDir,
} from '../lib/git';

// Mock child_process
jest.mock('child_process');
const mockedExecFileSync = execFileSync as jest.MockedFunction<typeof execFileSync>;

/** Resolve `git rev-parse --verify` calls against a set of refs that exist. */
const withRefs = (refs: string[]) => (_cmd: string, args?: readonly string[]) => {
  const argv = (args ?? []) as readonly string[];

  if (argv[0] === 'rev-parse' && argv.includes('--verify')) {
    const ref = argv[argv.length - 1].replace(/\^\{commit\}$/, '');
    if (!refs.includes(ref)) {
      throw new Error(`fatal: Needed a single revision: ${ref}`);
    }
    return Buffer.from('');
  }

  if (argv[0] === 'symbolic-ref') {
    throw new Error('fatal: ref refs/remotes/origin/HEAD is not a symbolic ref');
  }

  return Buffer.from('');
};

describe('Git Operations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStagedDiff', () => {
    it('should return staged diff from git', () => {
      const mockDiff = 'diff --git a/file.txt b/file.txt\n+added line';
      mockedExecFileSync.mockReturnValue(mockDiff);

      const result = getStagedDiff();

      expect(mockedExecFileSync).toHaveBeenCalledWith(
        'git',
        ['diff', '--cached'],
        expect.objectContaining({ encoding: 'utf8' })
      );
      expect(result).toBe(mockDiff);
    });

    it('should return empty string when no staged changes', () => {
      mockedExecFileSync.mockReturnValue('');

      expect(getStagedDiff()).toBe('');
    });

    it('should request a buffer large enough for branch-sized diffs', () => {
      mockedExecFileSync.mockReturnValue('');

      getStagedDiff();

      const options = mockedExecFileSync.mock.calls[0][2] as { maxBuffer: number };
      expect(options.maxBuffer).toBeGreaterThan(1024 * 1024);
    });
  });

  describe('commitChanges', () => {
    it('should commit with provided message', () => {
      mockedExecFileSync.mockReturnValue('');

      commitChanges('feat: add new feature');

      expect(mockedExecFileSync).toHaveBeenCalledWith('git', ['commit', '-m', 'feat: add new feature'], {
        stdio: 'inherit',
      });
    });

    it('should pass shell metacharacters through as literal text', () => {
      mockedExecFileSync.mockReturnValue('');

      const message = 'fix(api): handle `null` and $(whoami) in "quoted" input';
      commitChanges(message);

      // The message is an argv entry, so the shell never sees these characters.
      expect(mockedExecFileSync).toHaveBeenCalledWith('git', ['commit', '-m', message], { stdio: 'inherit' });
    });

    it('should preserve multi-line commit messages', () => {
      mockedExecFileSync.mockReturnValue('');

      const message = 'feat: add thing\n\nA longer body explaining why.';
      commitChanges(message);

      expect(mockedExecFileSync).toHaveBeenCalledWith('git', ['commit', '-m', message], { stdio: 'inherit' });
    });
  });

  describe('getCurrentBranch', () => {
    it('should return the current branch name', () => {
      mockedExecFileSync.mockReturnValue('feature/new-feature\n');

      expect(getCurrentBranch()).toBe('feature/new-feature');
      expect(mockedExecFileSync).toHaveBeenCalledWith(
        'git',
        ['branch', '--show-current'],
        expect.objectContaining({ encoding: 'utf8' })
      );
    });

    it('should trim surrounding whitespace', () => {
      mockedExecFileSync.mockReturnValue('  main  \n');

      expect(getCurrentBranch()).toBe('main');
    });
  });

  describe('getMainBranch', () => {
    it('should use origin/HEAD when the remote advertises a default branch', () => {
      mockedExecFileSync.mockImplementation(((_cmd: string, args?: readonly string[]) => {
        if ((args ?? [])[0] === 'symbolic-ref') return 'origin/trunk\n';
        throw new Error('unexpected call');
      }) as never);

      expect(getMainBranch()).toBe('trunk');
    });

    it('should detect origin/main', () => {
      mockedExecFileSync.mockImplementation(withRefs(['refs/remotes/origin/main']) as never);

      expect(getMainBranch()).toBe('main');
    });

    it('should detect origin/master', () => {
      mockedExecFileSync.mockImplementation(withRefs(['refs/remotes/origin/master']) as never);

      expect(getMainBranch()).toBe('master');
    });

    it('should detect origin/develop', () => {
      mockedExecFileSync.mockImplementation(withRefs(['refs/remotes/origin/develop']) as never);

      expect(getMainBranch()).toBe('develop');
    });

    it('should not mistake origin/maintenance for origin/main', () => {
      // Substring matching against `git branch -r` output would wrongly match here.
      mockedExecFileSync.mockImplementation(
        withRefs(['refs/remotes/origin/maintenance', 'refs/remotes/origin/master']) as never
      );

      expect(getMainBranch()).toBe('master');
    });

    it('should fall back to a local branch when there is no remote', () => {
      mockedExecFileSync.mockImplementation(withRefs(['refs/heads/master']) as never);

      expect(getMainBranch()).toBe('master');
    });

    it('should prefer a remote branch over a local one', () => {
      mockedExecFileSync.mockImplementation(
        withRefs(['refs/remotes/origin/develop', 'refs/heads/master']) as never
      );

      expect(getMainBranch()).toBe('develop');
    });

    it('should default to main when nothing matches', () => {
      mockedExecFileSync.mockImplementation(withRefs([]) as never);

      expect(getMainBranch()).toBe('main');
    });
  });

  describe('getBranchCommits', () => {
    it('should get commits between main and current branch', () => {
      mockedExecFileSync.mockImplementation(((_cmd: string, args?: readonly string[]) => {
        const argv = (args ?? []) as readonly string[];
        if (argv[0] === 'branch' && argv[1] === '--show-current') return 'feature-branch\n';
        if (argv[0] === 'symbolic-ref') return 'origin/main\n';
        if (argv[0] === 'log') return 'abc123 feat: add feature\ndef456 fix: bug fix\n';
        throw new Error('unexpected call');
      }) as never);

      const result = getBranchCommits();

      expect(mockedExecFileSync).toHaveBeenCalledWith(
        'git',
        ['log', 'main..feature-branch', '--oneline'],
        expect.objectContaining({ encoding: 'utf8' })
      );
      expect(result).toContain('abc123');
    });

    it('should use an explicitly provided branch', () => {
      mockedExecFileSync.mockImplementation(((_cmd: string, args?: readonly string[]) => {
        const argv = (args ?? []) as readonly string[];
        if (argv[0] === 'branch') throw new Error('should not ask for the current branch');
        if (argv[0] === 'symbolic-ref') return 'origin/main\n';
        return 'xyz789 docs: update readme\n';
      }) as never);

      getBranchCommits('custom-branch');

      expect(mockedExecFileSync).toHaveBeenCalledWith(
        'git',
        ['log', 'main..custom-branch', '--oneline'],
        expect.objectContaining({ encoding: 'utf8' })
      );
    });

    it('should fall back to recent commits when the comparison fails', () => {
      mockedExecFileSync.mockImplementation(((_cmd: string, args?: readonly string[]) => {
        const argv = (args ?? []) as readonly string[];
        if (argv[0] === 'branch' && argv[1] === '--show-current') return 'feature-branch\n';
        if (argv[0] === 'symbolic-ref') return 'origin/main\n';
        if (argv[0] === 'log' && argv[1] === 'main..feature-branch') {
          throw new Error('unknown revision');
        }
        return 'recent commits\n';
      }) as never);

      const result = getBranchCommits();

      expect(mockedExecFileSync).toHaveBeenCalledWith(
        'git',
        ['log', '--oneline', '-10'],
        expect.objectContaining({ encoding: 'utf8' })
      );
      expect(result).toBe('recent commits\n');
    });
  });

  describe('getBranchDiff', () => {
    it('should diff main against the current branch', () => {
      mockedExecFileSync.mockImplementation(((_cmd: string, args?: readonly string[]) => {
        const argv = (args ?? []) as readonly string[];
        if (argv[0] === 'branch' && argv[1] === '--show-current') return 'feature-branch\n';
        if (argv[0] === 'symbolic-ref') return 'origin/main\n';
        return 'diff content\n';
      }) as never);

      getBranchDiff();

      expect(mockedExecFileSync).toHaveBeenCalledWith(
        'git',
        ['diff', 'main...feature-branch'],
        expect.objectContaining({ encoding: 'utf8' })
      );
    });

    it('should use an explicitly provided branch', () => {
      mockedExecFileSync.mockImplementation(((_cmd: string, args?: readonly string[]) => {
        const argv = (args ?? []) as readonly string[];
        if (argv[0] === 'symbolic-ref') return 'origin/main\n';
        return 'custom diff\n';
      }) as never);

      getBranchDiff('custom-branch');

      expect(mockedExecFileSync).toHaveBeenCalledWith(
        'git',
        ['diff', 'main...custom-branch'],
        expect.objectContaining({ encoding: 'utf8' })
      );
    });

    it('should fall back to recent changes when the comparison fails', () => {
      mockedExecFileSync.mockImplementation(((_cmd: string, args?: readonly string[]) => {
        const argv = (args ?? []) as readonly string[];
        if (argv[0] === 'branch' && argv[1] === '--show-current') return 'feature-branch\n';
        if (argv[0] === 'symbolic-ref') return 'origin/main\n';
        if (argv[0] === 'diff' && argv[1] === 'main...feature-branch') {
          throw new Error('unknown revision');
        }
        return 'fallback diff\n';
      }) as never);

      const result = getBranchDiff();

      expect(mockedExecFileSync).toHaveBeenCalledWith(
        'git',
        ['diff', 'HEAD~5..HEAD'],
        expect.objectContaining({ encoding: 'utf8' })
      );
      expect(result).toBe('fallback diff\n');
    });
  });

  describe('isGitRepository', () => {
    it('should return true inside a repository', () => {
      mockedExecFileSync.mockReturnValue('.git\n');

      expect(isGitRepository()).toBe(true);
      expect(mockedExecFileSync).toHaveBeenCalledWith('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' });
    });

    it('should return false outside a repository', () => {
      mockedExecFileSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      expect(isGitRepository()).toBe(false);
    });
  });

  describe('getUnstagedDiff', () => {
    it('should return the unstaged diff', () => {
      mockedExecFileSync.mockReturnValue('unstaged changes');

      expect(getUnstagedDiff()).toBe('unstaged changes');
      expect(mockedExecFileSync).toHaveBeenCalledWith(
        'git',
        ['diff'],
        expect.objectContaining({ encoding: 'utf8' })
      );
    });

    it('should return empty string when there are none', () => {
      mockedExecFileSync.mockReturnValue('');

      expect(getUnstagedDiff()).toBe('');
    });
  });

  describe('getAllChangesDiff', () => {
    it('should combine staged and unstaged diffs', () => {
      mockedExecFileSync.mockReturnValueOnce('staged changes').mockReturnValueOnce('unstaged changes');

      const result = getAllChangesDiff();

      expect(result).toBe('staged changes\nunstaged changes');
      expect(mockedExecFileSync).toHaveBeenCalledWith(
        'git',
        ['diff', '--cached'],
        expect.objectContaining({ encoding: 'utf8' })
      );
      expect(mockedExecFileSync).toHaveBeenCalledWith(
        'git',
        ['diff'],
        expect.objectContaining({ encoding: 'utf8' })
      );
    });
  });

  describe('createBranch', () => {
    it('should create and switch to the branch', () => {
      mockedExecFileSync.mockReturnValue('');

      createBranch('feat/new-thing');

      expect(mockedExecFileSync).toHaveBeenCalledWith('git', ['checkout', '-b', 'feat/new-thing'], {
        stdio: 'inherit',
      });
    });

    it('should not let a crafted branch name reach the shell', () => {
      mockedExecFileSync.mockReturnValue('');

      const name = 'feat/x;rm -rf /';
      createBranch(name);

      expect(mockedExecFileSync).toHaveBeenCalledWith('git', ['checkout', '-b', name], { stdio: 'inherit' });
    });
  });

  describe('checkoutBranch', () => {
    it('should switch to an existing branch', () => {
      mockedExecFileSync.mockReturnValue('');

      checkoutBranch('feat/existing');

      expect(mockedExecFileSync).toHaveBeenCalledWith('git', ['checkout', 'feat/existing'], {
        stdio: 'inherit',
      });
    });
  });

  describe('branchExists', () => {
    it('should return true for a local branch', () => {
      mockedExecFileSync.mockImplementation(withRefs(['refs/heads/feature-branch']) as never);

      expect(branchExists('feature-branch')).toBe(true);
    });

    it('should return true for a remote branch', () => {
      mockedExecFileSync.mockImplementation(withRefs(['refs/remotes/origin/feature-branch']) as never);

      expect(branchExists('feature-branch')).toBe(true);
    });

    it('should return false when the branch is absent', () => {
      mockedExecFileSync.mockImplementation(withRefs(['refs/heads/main']) as never);

      expect(branchExists('feature-branch')).toBe(false);
    });

    it('should not report a match for a branch that is merely a prefix', () => {
      // `git branch --list` substring matching would wrongly report true here.
      mockedExecFileSync.mockImplementation(withRefs(['refs/heads/feat/login-page']) as never);

      expect(branchExists('feat/login')).toBe(false);
    });
  });
});

describe('getHooksDir', () => {
  it('should resolve the hooks path git reports, honouring core.hooksPath', () => {
    mockedExecFileSync.mockReturnValue('.git/hooks\n');

    const result = getHooksDir();

    expect(mockedExecFileSync).toHaveBeenCalledWith(
      'git',
      ['rev-parse', '--git-path', 'hooks'],
      expect.objectContaining({ encoding: 'utf8' })
    );
    expect(result).toBe(`${process.cwd()}/.git/hooks`);
  });

  it('should keep an absolute path as is', () => {
    mockedExecFileSync.mockReturnValue('/custom/hooks\n');

    expect(getHooksDir()).toBe('/custom/hooks');
  });
});
