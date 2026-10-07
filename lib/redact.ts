/**
 * AI Commit Tool - Secret Redaction
 *
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Strips credentials out of diffs before they are sent to a model
 */

export const REDACTED = '[REDACTED]';

/** Filenames that should never be sent to a model in the first place. */
const SENSITIVE_PATHS = [
  /(^|\/)\.env(\.|$)/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.netrc$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/i,
  /(^|\/)credentials(\.json|\.yml|\.yaml)?$/i,
  /(^|\/)service-account.*\.json$/i,
  /\.(pem|pfx|p12|key|keystore|jks)$/i,
];

/**
 * Value-shaped patterns. Each entry replaces only the secret itself so the
 * surrounding diff stays readable — the model still sees that a key changed,
 * just not what it changed to.
 */
const VALUE_PATTERNS: Array<{ pattern: RegExp; replace: (match: string, ...groups: string[]) => string }> = [
  // PEM blocks: collapse the whole body.
  {
    pattern: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z ]+ )?PRIVATE KEY-----/g,
    replace: () => `-----BEGIN PRIVATE KEY-----${REDACTED}-----END PRIVATE KEY-----`,
  },
  // Provider-specific token shapes.
  { pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, replace: () => REDACTED },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}/g, replace: () => REDACTED },
  { pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}/g, replace: () => REDACTED },
  { pattern: /\bAKIA[0-9A-Z]{16}\b/g, replace: () => REDACTED },
  { pattern: /\bASIA[0-9A-Z]{16}\b/g, replace: () => REDACTED },
  { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g, replace: () => REDACTED },
  { pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, replace: () => REDACTED },
  { pattern: /\b[sr]k_live_[A-Za-z0-9]{16,}/g, replace: () => REDACTED },
  // JSON Web Tokens.
  { pattern: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, replace: () => REDACTED },
  // Credentials embedded in a URL: https://user:secret@host
  {
    pattern: /\b([a-z][a-z0-9+.-]*:\/\/[^\s:@/]+):[^\s@/]+@/gi,
    replace: (_match, prefix) => `${prefix}:${REDACTED}@`,
  },
  // KEY=value / "key": "value" assignments. Keeps the key so the change stays legible.
  {
    pattern:
      /\b((?:[A-Za-z0-9_-]*(?:api[_-]?key|apikey|secret|token|password|passwd|credential|authorization|access[_-]?key|private[_-]?key)[A-Za-z0-9_-]*)\s*["']?\s*[:=]\s*["']?)([^\s"',;]{4,})/gi,
    replace: (_match, prefix) => `${prefix}${REDACTED}`,
  },
];

export interface RedactionResult {
  text: string;
  /** How many secrets were replaced. */
  count: number;
}

/** Replace anything that looks like a credential with a placeholder. */
export const redactSecrets = (diff: string): RedactionResult => {
  let text = diff;
  let count = 0;

  for (const { pattern, replace } of VALUE_PATTERNS) {
    text = text.replace(pattern, (...args: unknown[]) => {
      const match = args[0] as string;
      const groups = args.slice(1, -2) as string[];
      const replacement = replace(match, ...groups);

      // A pattern that matched something already redacted is not a new finding.
      if (replacement !== match) count++;
      return replacement;
    });
  }

  return { text, count };
};

/**
 * File paths in the diff that look like credential stores.
 *
 * Redaction is pattern-based and cannot be exhaustive, so the caller warns
 * about these separately rather than relying on the value patterns alone.
 */
export const findSensitivePaths = (diff: string): string[] => {
  const paths = new Set<string>();

  for (const line of diff.split('\n')) {
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (!match) continue;

    const filePath = match[2];
    if (SENSITIVE_PATHS.some((p) => p.test(filePath))) {
      paths.add(filePath);
    }
  }

  return [...paths];
};
