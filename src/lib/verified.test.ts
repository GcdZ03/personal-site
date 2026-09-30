import { describe, expect, it } from 'vitest';
import { checkedOn, claimsFor, rowProof } from '@/lib/verified';

describe('checkedOn', () => {
  it('claims the oldest check, not the newest', () => {
    const date = checkedOn([
      { checkedAt: '2026-09-30T00:00:00Z' },
      { checkedAt: '2026-09-01T00:00:00Z' },
    ]);
    expect(date?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('returns null with nothing checked', () => {
    expect(checkedOn([])).toBeNull();
  });
});

describe('rowProof', () => {
  it('leaves the release tag to the GitHub list', () => {
    expect(rowProof('creative-notch').some((line) => /^v\d/.test(line))).toBe(false);
  });

  it('is empty for a project with no checked facts', () => {
    expect(rowProof('no-such-project')).toEqual([]);
    expect(claimsFor('no-such-project')).toBeNull();
  });
});
