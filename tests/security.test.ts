import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { findAlpacaCredentials, maskKeyId, parseCredentialText, redact } from '@/lib/market/credentials';

const ROOT = process.cwd();

function walk(dir: string, extensions: string[], results: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(full, extensions, results);
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      results.push(full);
    }
  }

  return results;
}

describe('credential redaction (requirement 34)', () => {
  it('removes key ids and secrets from any string it is given', () => {
    const credentials = {
      keyId: 'AKTESTKEYID0000000',
      secret: 'super-secret-value-that-must-never-be-logged-0000',
      feed: 'sip' as const,
      origin: 'test',
    };

    const message = `auth failed for ${credentials.keyId} using ${credentials.secret}`;
    const cleaned = redact(message, credentials);

    expect(cleaned).not.toContain(credentials.keyId);
    expect(cleaned).not.toContain(credentials.secret);
    expect(cleaned).toContain('[REDACTED_KEY_ID]');
  });

  it('redacts credential-shaped tokens even without a credentials object', () => {
    const cleaned = redact('unexpected token AKX1234567890ABCDEF in response');
    expect(cleaned).not.toContain('AKX1234567890ABCDEF');
    expect(cleaned).toContain('[REDACTED_KEY_ID]');
  });

  it('masks key ids for diagnostics output', () => {
    expect(maskKeyId('AKTESTKEYID0000000')).toBe('AKTE…000');
    expect(maskKeyId('short')).toBe('****');
  });

  it('never logs credentials from the market modules', () => {
    const files = [
      ...walk(path.join(ROOT, 'lib', 'market'), ['.ts']),
      ...walk(path.join(ROOT, 'worker'), ['.ts']),
    ];

    expect(files.length).toBeGreaterThan(5);

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const logCalls = source.match(/console\.(log|warn|error|info|debug)\([^\n]*/g) ?? [];
      for (const call of logCalls) {
        // A key id is only ever allowed through maskKeyId(); a secret never.
        const masked = call.includes('maskKeyId(');
        const pattern = masked
          ? /credentials\.secret|\.secret\b|APCA_API_SECRET_KEY/
          : /credentials\.(secret|keyId)|\.secret\b|APCA_API_SECRET_KEY/;
        expect(call, `${path.relative(ROOT, file)}: ${call}`).not.toMatch(pattern);
      }

      // The logger helpers are the other output path.
      const loggerCalls = source.match(/logger\.(info|warn|error|debug)\([^\n]*/g) ?? [];
      for (const call of loggerCalls) {
        expect(call, `${path.relative(ROOT, file)}: ${call}`).not.toMatch(
          /credentials\.secret|\.secret\b/,
        );
      }
    }
  });
});

describe('credentials never reach the browser (requirement 33)', () => {
  it('is not imported by any client-side module', () => {
    const clientDirs = [
      path.join(ROOT, 'components'),
      path.join(ROOT, 'app'),
      path.join(ROOT, 'lib', 'hooks'),
      path.join(ROOT, 'lib', 'dashboard'),
    ];

    const offenders: string[] = [];
    for (const dir of clientDirs) {
      for (const file of walk(dir, ['.ts', '.tsx'])) {
        const source = fs.readFileSync(file, 'utf8');
        if (/from ['"]@?[^'"]*market\/credentials['"]/.test(source)) {
          offenders.push(path.relative(ROOT, file));
        }
        if (/APCA_API_KEY_ID|APCA_API_SECRET_KEY/.test(source)) {
          offenders.push(`${path.relative(ROOT, file)} (env reference)`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps the Claude report checker and its key out of every client-side module (his "move it", uuid e51e9b47)', () => {
    const clientDirs = ['components', 'app', path.join('lib', 'hooks'), path.join('lib', 'dashboard')].map((dir) => path.join(ROOT, dir));
    const offenders: string[] = [];
    for (const dir of clientDirs) {
      for (const file of walk(dir, ['.ts', '.tsx'])) {
        const source = fs.readFileSync(file, 'utf8');
        if (/anthropicReportModel|ANTHROPIC_API_KEY/.test(source)) offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no lib or worker file reads ANTHROPIC_API_KEY: only the Reports-TMI key by its own name (Integration\'s ruling)', () => {
    const files = [...walk(path.join(ROOT, 'lib'), ['.ts']), ...walk(path.join(ROOT, 'worker'), ['.ts'])];
    const offenders = files.filter((file) => /ANTHROPIC_API_KEY(?!_REPORTS)/.test(fs.readFileSync(file, 'utf8'))).map((file) => path.relative(ROOT, file));
    expect(offenders).toEqual([]);
    expect(files.some((file) => /ANTHROPIC_API_KEY_REPORTS/.test(fs.readFileSync(file, 'utf8')))).toBe(true);
  });

  it('keeps the market read model server-only', () => {
    const readModel = fs.readFileSync(path.join(ROOT, 'lib', 'market', 'readModel.ts'), 'utf8');
    expect(readModel).toMatch(/import 'server-only'/);
  });

  it('leaves no credential material in the client bundle', () => {
    const staticDir = path.join(ROOT, '.next', 'static');
    if (!fs.existsSync(staticDir)) {
      // The bundle scan only runs after `npm run build`; the import checks above
      // still hold on their own.
      return;
    }

    const lookup = findAlpacaCredentials();
    const bundles = walk(staticDir, ['.js']);
    expect(bundles.length).toBeGreaterThan(0);

    for (const bundle of bundles) {
      const source = fs.readFileSync(bundle, 'utf8');
      expect(source).not.toContain('APCA-API-SECRET-KEY');
      expect(source).not.toContain('APCA_API_SECRET_KEY');
      if (lookup.credentials) {
        expect(source).not.toContain(lookup.credentials.keyId);
        expect(source).not.toContain(lookup.credentials.secret);
      }
    }
  });
});

describe('credential file parsing', () => {
  it('accepts KEY=VALUE files', () => {
    const parsed = parseCredentialText(
      [
        '# alpaca',
        'APCA_API_KEY_ID=AKTESTKEYID0000000',
        'APCA_API_SECRET_KEY=super-secret-value-that-must-never-be-logged-0000',
        'ALPACA_DATA_FEED=sip',
      ].join('\n'),
    );

    expect(parsed.keyId).toBe('AKTESTKEYID0000000');
    expect(parsed.secret).toBe('super-secret-value-that-must-never-be-logged-0000');
    expect(parsed.feed).toBe('sip');
  });

  it('accepts the bare two-token layout copied out of the Alpaca key dialog', () => {
    const parsed = parseCredentialText(
      ['https://api.alpaca.markets', 'AKTESTKEYID0000000', 'aBcD1234567890eFgH1234567890iJkL1234567890', ''].join('\n'),
    );

    expect(parsed.keyId).toBe('AKTESTKEYID0000000');
    expect(parsed.secret).toBe('aBcD1234567890eFgH1234567890iJkL1234567890');
  });

  it('reports a clear problem when nothing usable is present', () => {
    const parsed = parseCredentialText('nothing to see here');
    expect(parsed.keyId).toBeUndefined();
    expect(parsed.secret).toBeUndefined();
  });
});
