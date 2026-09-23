/**
 * Tests for Secret Redaction
 */

import { redactSecrets, findSensitivePaths, REDACTED } from '../lib/redact';

/** Wrap a value in a realistic added-line of a diff. */
const added = (line: string) => `diff --git a/config.ts b/config.ts\n--- a/config.ts\n+++ b/config.ts\n+${line}\n`;

describe('redactSecrets', () => {
  describe('provider token shapes', () => {
    const secrets: Array<[string, string]> = [
      ['OpenAI', 'sk-abcdefghijklmnopqrstuvwxyz0123456789ABCD'],
      ['OpenAI project', 'sk-proj-abcdefghijklmnopqrstuvwxyz0123456789'],
      ['GitHub PAT', 'ghp_abcdefghijklmnopqrstuvwxyz0123456789'],
      ['GitHub OAuth', 'gho_abcdefghijklmnopqrstuvwxyz0123456789'],
      ['GitHub fine-grained', 'github_pat_abcdefghijklmnopqrstuvwxyz0123456789'],
      ['AWS access key', 'AKIAIOSFODNN7EXAMPLE'],
      ['AWS session key', 'ASIAIOSFODNN7EXAMPLE'],
      ['Google API key', 'AIzaSyA1234567890abcdefghijklmnopqrstuvw'],
      // Assembled at runtime so that secret scanners do not flag the fixture itself.
      ['Slack bot token', ['xoxb', '123456789012', 'abcdefghijklmnop'].join('-')],
      ['Stripe live key', 'sk_live_abcdefghijklmnop1234'],
    ];

    it.each(secrets)('should redact a %s', (_name, secret) => {
      const result = redactSecrets(added(`const token = "${secret}";`));

      expect(result.text).not.toContain(secret);
      expect(result.text).toContain(REDACTED);
      expect(result.count).toBeGreaterThan(0);
    });
  });

  it('should redact a JWT', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';

    const result = redactSecrets(added(`Authorization: Bearer ${jwt}`));

    expect(result.text).not.toContain(jwt);
  });

  it('should redact a private key block', () => {
    const diff = [
      'diff --git a/key.pem b/key.pem',
      '+-----BEGIN RSA PRIVATE KEY-----',
      '+MIIEowIBAAKCAQEAxGZlk3Q2ZmFsc2VrZXlkYXRhZm9ydGVzdGluZ3B1cnBvc2Vz',
      '+c2Vjb25kbGluZW9mZmFrZWtleWRhdGFoZXJlZm9ydGVzdA==',
      '+-----END RSA PRIVATE KEY-----',
    ].join('\n');

    const result = redactSecrets(diff);

    expect(result.text).not.toContain('MIIEowIBAAKCAQEA');
    expect(result.text).toContain(REDACTED);
  });

  it('should redact credentials embedded in a URL but keep the host', () => {
    const result = redactSecrets(added('remote = https://edwin:hunter2supersecret@github.com/o/r.git'));

    expect(result.text).not.toContain('hunter2supersecret');
    expect(result.text).toContain('github.com/o/r.git');
  });

  describe('assignments', () => {
    it.each([
      'OPENAI_API_KEY=sk_test_value_abcdef123456',
      'API_KEY = "abcdef1234567890"',
      'password: hunter2000fake',
      'client_secret=abcdef1234567890xyz',
      'DATABASE_PASSWORD=p4ssw0rd-fake-value',
      '"authorization": "Basic Zm9vOmJhcg=="',
    ])('should redact %p', (line) => {
      const result = redactSecrets(added(line));

      expect(result.text).toContain(REDACTED);
      expect(result.count).toBeGreaterThan(0);
    });

    it('should keep the key name so the change stays legible', () => {
      const result = redactSecrets(added('OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz012345'));

      expect(result.text).toContain('OPENAI_API_KEY');
      expect(result.text).toContain(REDACTED);
    });
  });

  describe('ordinary code', () => {
    it('should leave a normal diff untouched', () => {
      const diff = added('const total = items.reduce((a, b) => a + b, 0);');

      const result = redactSecrets(diff);

      expect(result.text).toBe(diff);
      expect(result.count).toBe(0);
    });

    it('should not redact an author line', () => {
      const diff = added('author = Edwin Menjivar');

      expect(redactSecrets(diff).count).toBe(0);
    });

    it('should not redact a short placeholder', () => {
      const diff = added('const x = 1;');

      expect(redactSecrets(diff).count).toBe(0);
    });

    it('should preserve surrounding diff structure', () => {
      const result = redactSecrets(added('API_KEY=abcdef1234567890'));

      expect(result.text).toContain('diff --git a/config.ts b/config.ts');
      expect(result.text).toContain('+++ b/config.ts');
    });
  });

  it('should redact every secret in a diff with several', () => {
    const diff = added('A=sk-abcdefghijklmnopqrstuvwxyz012345') + added('B=ghp_abcdefghijklmnopqrstuvwxyz0123456789');

    const result = redactSecrets(diff);

    expect(result.text).not.toContain('sk-abcdefghijklmnopqrstuvwxyz012345');
    expect(result.text).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz0123456789');
    expect(result.count).toBeGreaterThanOrEqual(2);
  });

  it('should handle an empty diff', () => {
    expect(redactSecrets('')).toEqual({ text: '', count: 0 });
  });
});

describe('findSensitivePaths', () => {
  const diffFor = (file: string) => `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n+x\n`;

  it.each([
    '.env',
    '.env.production',
    'config/.env.local',
    '.npmrc',
    '.netrc',
    'id_rsa',
    'id_ed25519',
    'credentials.json',
    'secrets/service-account-prod.json',
    'certs/server.pem',
    'certs/server.key',
    'keystore.p12',
  ])('should flag %s', (file) => {
    expect(findSensitivePaths(diffFor(file))).toContain(file);
  });

  it.each(['src/index.ts', 'README.md', 'environment.ts', 'package.json', 'keyboard.tsx'])(
    'should not flag %s',
    (file) => {
      expect(findSensitivePaths(diffFor(file))).toEqual([]);
    }
  );

  it('should list each sensitive file once', () => {
    const diff = diffFor('.env') + diffFor('.env');

    expect(findSensitivePaths(diff)).toEqual(['.env']);
  });

  it('should return an empty list for an empty diff', () => {
    expect(findSensitivePaths('')).toEqual([]);
  });
});
