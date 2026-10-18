/**
 * AI Commit Tool - Diff Filtering
 *
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Leaves generated files out of the diff that is sent to a model
 */

/**
 * Files whose contents never help a commit message or review. Lockfiles and
 * minified bundles routinely run to thousands of lines, crowd out the real
 * change and push the diff past the size limit. The model is still told that
 * the file changed, just not what changed in it.
 */
export const DEFAULT_EXCLUDES = [
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lock',
  'bun.lockb',
  'Cargo.lock',
  'poetry.lock',
  'Pipfile.lock',
  'uv.lock',
  'Gemfile.lock',
  'composer.lock',
  'go.sum',
  'mix.lock',
  'flake.lock',
  'packages.lock.json',
  '*.min.js',
  '*.min.css',
  '*.map',
];

/** Patterns to apply, from the defaults plus AI_COMMIT_EXCLUDE, or none if disabled. */
export const configuredExcludes = (env: NodeJS.ProcessEnv = process.env): string[] => {
  if (env.AI_COMMIT_DISABLE_EXCLUDES === '1') return [];

  const extra = (env.AI_COMMIT_EXCLUDE || '')
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean);

  return [...DEFAULT_EXCLUDES, ...extra];
};

/**
 * Convert a glob to a RegExp. Supports `*` (within one path segment), `?`,
 * and `**` (across segments). A pattern without a slash matches the file's
 * basename anywhere in the tree; one with a slash matches the whole path.
 */
const globToRegExp = (glob: string): RegExp => {
  let source = '';

  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];

    if (char === '*' && glob[i + 1] === '*') {
      // `**/` may match zero directories, so `**/foo` also matches a top-level `foo`.
      if (glob[i + 2] === '/') {
        source += '(?:.*/)?';
        i += 2;
      } else {
        source += '.*';
        i += 1;
      }
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }

  return new RegExp(`^${source}$`);
};

/** Build a predicate that reports whether a repository-relative path matches any pattern. */
export const compileExcludes = (patterns: string[]): ((filePath: string) => boolean) => {
  const compiled = patterns.map((pattern) => ({
    regex: globToRegExp(pattern),
    basenameOnly: !pattern.includes('/'),
  }));

  // Diff paths always use forward slashes, so no need for the path module here.
  const basename = (filePath: string): string => filePath.slice(filePath.lastIndexOf('/') + 1);

  return (filePath) =>
    compiled.some(({ regex, basenameOnly }) => regex.test(basenameOnly ? basename(filePath) : filePath));
};

export interface FilterResult {
  text: string;
  /** Paths whose contents were left out. */
  omitted: string[];
}

const FILE_HEADER = /^diff --git a\/(.+?) b\/(.+)$/;

/**
 * Drop the body of every excluded file from a diff, keeping a one-line stub so
 * the model still knows the file changed.
 */
export const filterDiff = (diff: string, patterns: string[]): FilterResult => {
  if (patterns.length === 0 || !diff) return { text: diff, omitted: [] };

  const isExcluded = compileExcludes(patterns);
  const omitted: string[] = [];

  // Each file's section starts with its "diff --git" header; the lookahead keeps it attached.
  const sections = diff.split(/^(?=diff --git )/m).map((section) => {
    const newline = section.indexOf('\n');
    const firstLine = newline === -1 ? section : section.slice(0, newline);
    const header = FILE_HEADER.exec(firstLine);
    if (!header) return section;

    const filePath = header[2];
    if (!isExcluded(filePath)) return section;

    omitted.push(filePath);
    return `${firstLine}\n[contents omitted: generated file]\n`;
  });

  return { text: sections.join(''), omitted };
};
