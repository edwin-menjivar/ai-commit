/**
 * Tests for Diff Filtering
 */

import { DEFAULT_EXCLUDES, configuredExcludes, compileExcludes, filterDiff } from '../lib/diff';

const fileSection = (filePath: string, body = '+changed') =>
  `diff --git a/${filePath} b/${filePath}\nindex 1111111..2222222 100644\n--- a/${filePath}\n+++ b/${filePath}\n@@ -1 +1 @@\n${body}\n`;

describe('configuredExcludes', () => {
  it('should return the defaults when nothing is configured', () => {
    expect(configuredExcludes({})).toEqual(DEFAULT_EXCLUDES);
  });

  it('should append comma-separated patterns from AI_COMMIT_EXCLUDE', () => {
    const result = configuredExcludes({ AI_COMMIT_EXCLUDE: 'dist/**, *.snap ,,' });

    expect(result).toEqual([...DEFAULT_EXCLUDES, 'dist/**', '*.snap']);
  });

  it('should return nothing when excludes are disabled', () => {
    expect(configuredExcludes({ AI_COMMIT_DISABLE_EXCLUDES: '1', AI_COMMIT_EXCLUDE: '*.snap' })).toEqual([]);
  });
});

describe('compileExcludes', () => {
  it('should match a bare filename anywhere in the tree', () => {
    const isExcluded = compileExcludes(['package-lock.json']);

    expect(isExcluded('package-lock.json')).toBe(true);
    expect(isExcluded('packages/api/package-lock.json')).toBe(true);
    expect(isExcluded('package.json')).toBe(false);
  });

  it('should match extension globs against the basename', () => {
    const isExcluded = compileExcludes(['*.min.js']);

    expect(isExcluded('public/vendor/jquery.min.js')).toBe(true);
    expect(isExcluded('src/app.js')).toBe(false);
  });

  it('should anchor patterns containing a slash to the full path', () => {
    const isExcluded = compileExcludes(['dist/*']);

    expect(isExcluded('dist/bundle.js')).toBe(true);
    expect(isExcluded('dist/nested/bundle.js')).toBe(false);
    expect(isExcluded('src/dist/bundle.js')).toBe(false);
  });

  it('should let ** span directories, including none', () => {
    const isExcluded = compileExcludes(['**/generated/**', 'docs/**/*.html']);

    expect(isExcluded('generated/types.ts')).toBe(true);
    expect(isExcluded('src/generated/types.ts')).toBe(true);
    expect(isExcluded('docs/index.html')).toBe(true);
    expect(isExcluded('docs/api/v2/index.html')).toBe(true);
    expect(isExcluded('docs/index.md')).toBe(false);
  });

  it('should treat regex metacharacters in patterns literally', () => {
    const isExcluded = compileExcludes(['a+b(c).txt']);

    expect(isExcluded('a+b(c).txt')).toBe(true);
    expect(isExcluded('aab(c).txt')).toBe(false);
    expect(isExcluded('a+b(c)xtxt')).toBe(false);
  });

  it('should support ? for a single character', () => {
    const isExcluded = compileExcludes(['file?.log']);

    expect(isExcluded('file1.log')).toBe(true);
    expect(isExcluded('file10.log')).toBe(false);
  });
});

describe('filterDiff', () => {
  it('should replace the body of an excluded file with a stub and report it', () => {
    const diff = fileSection('src/index.ts') + fileSection('package-lock.json', '+  "version": "2.0.0"');

    const result = filterDiff(diff, DEFAULT_EXCLUDES);

    expect(result.omitted).toEqual(['package-lock.json']);
    expect(result.text).toContain(fileSection('src/index.ts'));
    expect(result.text).toContain('diff --git a/package-lock.json b/package-lock.json\n[contents omitted');
    expect(result.text).not.toContain('"version": "2.0.0"');
  });

  it('should leave a diff with no excluded files untouched', () => {
    const diff = fileSection('src/a.ts') + fileSection('src/b.ts');

    expect(filterDiff(diff, DEFAULT_EXCLUDES)).toEqual({ text: diff, omitted: [] });
  });

  it('should keep the file order', () => {
    const diff = fileSection('yarn.lock') + fileSection('src/a.ts') + fileSection('build/app.min.js');

    const { text, omitted } = filterDiff(diff, DEFAULT_EXCLUDES);

    expect(omitted).toEqual(['yarn.lock', 'build/app.min.js']);
    expect(text.indexOf('yarn.lock')).toBeLessThan(text.indexOf('src/a.ts'));
    expect(text.indexOf('src/a.ts')).toBeLessThan(text.indexOf('app.min.js'));
  });

  it('should do nothing when there are no patterns', () => {
    const diff = fileSection('package-lock.json');

    expect(filterDiff(diff, [])).toEqual({ text: diff, omitted: [] });
  });

  it('should handle an empty diff', () => {
    expect(filterDiff('', DEFAULT_EXCLUDES)).toEqual({ text: '', omitted: [] });
  });

  it('should not be fooled by "diff --git" appearing inside a hunk', () => {
    const diff = fileSection('notes.md', '+run diff --git a/x b/x to compare');

    expect(filterDiff(diff, DEFAULT_EXCLUDES)).toEqual({ text: diff, omitted: [] });
  });
});
