/**
 * AI Commit Tool - OpenAI Integration
 *
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Handles AI-powered commit message generation using OpenAI's GPT models
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { redactSecrets, findSensitivePaths } from './redact';
import { filterDiff, configuredExcludes } from './diff';

// Models reject oversized requests outright, so trim very large diffs rather
// than letting the whole command fail on a big branch.
const MAX_DIFF_CHARS = 48_000;

const DEFAULT_MODEL = 'gpt-4o-mini';

// Local models on modest hardware can take a while on a large diff, so this is
// generous. AI_COMMIT_TIMEOUT_MS overrides it.
const DEFAULT_TIMEOUT_MS = 120_000;

const getTimeoutMs = (): number => {
  const value = Number(process.env.AI_COMMIT_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
};

const getBaseUrl = (): string => process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';

/**
 * Per-user config file, for a globally installed CLI that has no "project
 * root" to put a .env in. Honours XDG_CONFIG_HOME, defaulting to ~/.config.
 */
export const userConfigPath = (): string => {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'ai-commit', '.env');
};

// Every file that exists is loaded, most specific first. dotenv never
// overrides a value that is already set, so variables exported in the shell
// win, then the repository's own .env, then the package checkout's .env (for
// `npm link` during development), then the user-level config. Loading all of
// them rather than stopping at the first means a project .env that holds only
// unrelated settings does not hide the user's key.
const loadEnv = (): void => {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '..', '.env'),
    path.join(__dirname, '..', '.env'),
    userConfigPath(),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
    }
  }
};

loadEnv();

let client: OpenAI | undefined;

/**
 * Build the OpenAI client on first use so that importing this module (in tests,
 * or for `ai-commit help`) never requires credentials.
 */
const getClient = (): OpenAI => {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. Export it in your shell, or put it in a .env file in the current\n' +
          `directory or in ${userConfigPath()}.\n` +
          'Get a key at https://platform.openai.com/account/api-keys'
      );
    }

    client = new OpenAI({
      apiKey,
      // Set OPENAI_API_BASE to point at a local or self-hosted OpenAI-compatible server.
      baseURL: process.env.OPENAI_API_BASE || undefined,
      timeout: getTimeoutMs(),
      maxRetries: 2,
    });
  }

  return client;
};

/** Reset the memoized client. Exported for tests and for changing credentials at runtime. */
export const resetClient = (): void => {
  client = undefined;
};

const getModel = (): string => {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
};

/** Trim a diff to a size the model will accept, noting that it was shortened. */
const truncateDiff = (diff: string): string => {
  if (diff.length <= MAX_DIFF_CHARS) return diff;

  const omitted = diff.length - MAX_DIFF_CHARS;
  return `${diff.slice(0, MAX_DIFF_CHARS)}\n\n[diff truncated: ${omitted} more characters omitted]`;
};

/** True unless the user has explicitly opted out of redaction. */
const redactionEnabled = (): boolean => process.env.AI_COMMIT_DISABLE_REDACTION !== '1';

/** Leave generated files (lockfiles, bundles, source maps) out of the diff. */
const excludeGeneratedFiles = (diff: string): string => {
  const { text, omitted } = filterDiff(diff, configuredExcludes());

  if (omitted.length > 0) {
    console.warn(
      `ℹ️  Left the contents of ${omitted.length} generated file${omitted.length === 1 ? '' : 's'} out of the diff: ${omitted.join(', ')}`
    );
  }

  return text;
};

/**
 * Drop generated files, strip credentials, then trim to size.
 *
 * Diffs are sent to a third-party API, so anything that looks like a secret is
 * replaced before truncation, so a secret can never be carried along in the
 * kept portion of an oversized diff.
 */
const prepareDiff = (rawDiff: string): string => {
  const diff = excludeGeneratedFiles(rawDiff);

  if (!redactionEnabled()) {
    console.warn('⚠️  Secret redaction is disabled (AI_COMMIT_DISABLE_REDACTION=1).');
    return truncateDiff(diff);
  }

  const sensitive = findSensitivePaths(diff);
  if (sensitive.length > 0) {
    console.warn(
      `⚠️  The diff touches files that usually hold credentials: ${sensitive.join(', ')}\n` +
        '   Their contents are redacted before sending, but consider unstaging them.'
    );
  }

  const { text, count } = redactSecrets(diff);
  if (count > 0) {
    console.warn(`🔒 Redacted ${count} possible secret${count === 1 ? '' : 's'} before sending the diff.`);
  }

  return truncateDiff(text);
};

/**
 * Turn an SDK error into a message that says what to fix.
 *
 * Duck-typed on `status`, `code` and the class name rather than instanceof, so
 * it also works when the SDK is mocked or a different client is swapped in.
 */
export const describeApiError = (error: unknown): Error => {
  const err = (error ?? {}) as {
    status?: number;
    code?: string;
    cause?: { code?: string };
    constructor?: { name?: string };
  };
  const status = err.status;
  const code = err.code ?? err.cause?.code;
  const kind = err.constructor?.name;
  const base = getBaseUrl();

  if (status === 401) {
    return new Error('The API rejected the key (401 Unauthorized). Check OPENAI_API_KEY.');
  }
  if (status === 403) {
    return new Error(
      `The API refused the request (403 Forbidden). The key may not have access to model "${getModel()}".`
    );
  }
  if (status === 404) {
    return new Error(
      `Model "${getModel()}" was not found at ${base} (404). Check OPENAI_MODEL, or pull the model if you run a local server.`
    );
  }
  if (status === 429) {
    return new Error(
      'The API is rate limiting this key or it is out of quota (429). Wait a moment and try again.'
    );
  }
  if (status !== undefined && status >= 500) {
    return new Error(`The API at ${base} returned a server error (${status}). Try again in a little while.`);
  }
  if (kind === 'APIConnectionTimeoutError') {
    return new Error(
      `The request to ${base} timed out after ${getTimeoutMs()} ms. Set AI_COMMIT_TIMEOUT_MS to wait longer, or try a smaller diff.`
    );
  }
  if (kind === 'APIConnectionError' || code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
    return new Error(`Could not connect to ${base}. Is the server running, and is OPENAI_API_BASE correct?`);
  }

  return error instanceof Error ? error : new Error(String(error));
};

/** Send a prompt and return the trimmed text of the first choice. */
const complete = async (
  prompt: string,
  options: { temperature: number; maxTokens: number }
): Promise<string> => {
  let response;
  try {
    response = await getClient().chat.completions.create({
      model: getModel(),
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });
  } catch (error) {
    throw describeApiError(error);
  }

  return response.choices?.[0]?.message?.content?.trim() || '';
};

export const generateCommitMessage = async (diff: string): Promise<string> => {
  const prompt = `Generate a concise, conventional commit message for the following git diff. Follow the format: type(scope): description

Examples:
- feat(auth): add user login functionality
- fix(ui): resolve button alignment issue
- docs(readme): update installation instructions

Git diff:
${prepareDiff(diff)}`;

  return complete(prompt, { temperature: 0.7, maxTokens: 100 });
};

export const generatePRDescription = async (
  commits: string,
  diff: string,
  branchName: string
): Promise<string> => {
  const prompt = `Generate a comprehensive pull request description based on the following information:

Branch: ${branchName}

Commits in this branch:
${commits}

Full diff:
${prepareDiff(diff)}

Please create a well-structured PR description with:
1. A clear title
2. Summary of changes
3. Key features/fixes implemented
4. Any breaking changes (if applicable)
5. Testing notes (if relevant)

Format it in Markdown and make it professional but concise.`;

  return complete(prompt, { temperature: 0.7, maxTokens: 800 });
};

export const performCodeReview = async (diff: string): Promise<string> => {
  const prompt = `Perform a thorough code review on the following git diff. Analyze the code for:

1. **Code Quality**: Best practices, readability, maintainability
2. **Potential Bugs**: Logic errors, edge cases, null checks
3. **Security**: Vulnerabilities, data validation, injection risks
4. **Performance**: Inefficient operations, memory leaks
5. **Style**: Consistency, naming conventions
6. **Architecture**: Design patterns, separation of concerns

Provide specific, actionable feedback with line references when possible.
If the code looks good, mention the positive aspects.

Git diff:
${prepareDiff(diff)}

Please structure your review with clear sections and be constructive in your feedback.`;

  // Lower temperature for more focused, consistent reviews
  return complete(prompt, { temperature: 0.3, maxTokens: 1000 });
};

export const generateBranchNameSuggestions = async (diff: string): Promise<string[]> => {
  const prompt = `Based on the following git diff, suggest 3 conventional branch names. 
Follow the format: type/description (e.g., feat/user-authentication, fix/login-bug, docs/api-update).

Rules:
- Use lowercase letters and hyphens only
- Keep names concise (2-4 words max)
- Use conventional prefixes: feat, fix, docs, refactor, test, chore
- Be descriptive but brief

Git diff:
${prepareDiff(diff)}

Return exactly 3 branch name suggestions, one per line, with no numbering or bullets. Just the branch names.`;

  const suggestions = await complete(prompt, { temperature: 0.7, maxTokens: 150 });

  // Parse the suggestions - split by newlines and clean up
  return suggestions
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 3); // Ensure we only return 3
};
