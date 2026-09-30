import { describe, expect, it } from 'vitest';
import { findInCode, mergeClaims, parseTestCount } from '@/lib/claims.mjs';
import type { Fact, VerifiedClaims } from '@/lib/claims.mjs';

describe('parseTestCount', () => {
  it('reads the Swift Testing summary, not the empty XCTest one beside it', () => {
    const log = [
      '2026-09-26T05:56:49Z \t Executed 0 tests, with 0 failures (0 unexpected) in 0.000 (0.004) seconds',
      '2026-09-26T05:56:54Z ✔ Test run with 974 tests in 99 suites passed after 4.381 seconds.',
    ].join('\n');
    expect(parseTestCount(log)).toBe(974);
  });

  it('reads the node:test summary', () => {
    const log = '2026-09-26T05:49:25Z # tests 383\n2026-09-26T05:49:25Z # pass 383\n';
    expect(parseTestCount(log)).toBe(383);
  });

  it('reads a non-empty XCTest summary', () => {
    expect(parseTestCount('Executed 12 tests, with 0 failures (0 unexpected)')).toBe(12);
  });

  it('returns null when no runner summary is present', () => {
    expect(parseTestCount('Build complete!\n')).toBeNull();
  });
});

describe('findInCode', () => {
  const files = [
    {
      path: 'Sources/Poller.swift',
      text: [
        '/// Never use `Timer(repeats: true)` elsewhere.',
        '    // repeats: true is allowed here only',
        '    Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in }',
      ].join('\n'),
    },
    { path: 'Sources/Other.swift', text: 'let x = 1' },
  ];

  it('finds code lines and reports where', () => {
    expect(findInCode(files, /repeats:\s*true/)).toEqual([
      { path: 'Sources/Poller.swift', line: 3 },
    ]);
  });

  it('ignores comments that name the pattern', () => {
    expect(findInCode(files, /Never use/)).toEqual([]);
  });
});

describe('mergeClaims', () => {
  const fact = (id: string, value: number, checkedAt: string): Fact => ({
    id,
    value,
    label: id,
    short: id,
    source: 'src',
    href: 'https://example.com',
    checkedAt,
  });

  const previous: VerifiedClaims = {
    generatedAt: '2026-09-01T00:00:00Z',
    projects: {
      app: {
        commit: 'aaa',
        commitUrl: 'https://example.com/aaa',
        facts: [fact('tests', 900, '2026-09-01T00:00:00Z'), fact('timers', 1, '2026-09-01T00:00:00Z')],
      },
    },
  };

  it('keeps the last good value and its date when a re-read fails', () => {
    const merged = mergeClaims(previous, {
      app: {
        commit: 'bbb',
        commitUrl: 'https://example.com/bbb',
        facts: [{ id: 'tests', failed: true }, fact('timers', 1, '2026-09-30T00:00:00Z')],
      },
    });
    expect(merged.app.facts).toEqual([
      fact('tests', 900, '2026-09-01T00:00:00Z'),
      fact('timers', 1, '2026-09-30T00:00:00Z'),
    ]);
    expect(merged.app.commit).toBe('bbb');
  });

  it('drops a fact that has never been read successfully', () => {
    const merged = mergeClaims(null, {
      app: { commit: null, commitUrl: null, facts: [{ id: 'tests', failed: true }] },
    });
    expect(merged.app).toEqual({ commit: null, commitUrl: null, facts: [] });
  });
});
