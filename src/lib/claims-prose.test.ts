import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import claims from '@/data/verified-claims.json';

/**
 * The case studies quote figures in prose. These tests hold that prose to the
 * last values `npm run stats` read from CI, the source tree and the npm
 * registry, so refreshing the data and forgetting the sentence fails CI
 * instead of shipping a claim the page's own evidence contradicts.
 */

const prose = (slug: string) =>
  readFileSync(new URL(`../content/projects/${slug}.md`, import.meta.url), 'utf8')
    // Markdown wraps sentences across lines; a phrase is matched as read.
    .replace(/\s+/g, ' ');

const value = (slug: keyof typeof claims.projects, id: string) => {
  const fact = claims.projects[slug].facts.find((candidate) => candidate.id === id);
  if (!fact) throw new Error(`no verified value for ${slug}/${id}`);
  return fact.value;
};

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];
const exactly = (n: string | number) => `exactly ${WORDS[Number(n)] ?? n}`;

describe('CreativeNotch case study', () => {
  const text = prose('creative-notch');

  it('quotes the test count CI last reported', () => {
    expect(text).toContain(`${value('creative-notch', 'tests')} tests`);
  });

  it('counts repeating timers as the source does', () => {
    expect(text).toContain(`${exactly(value('creative-notch', 'repeating-timers'))} repeating \`Timer\``);
  });

  it('counts global event monitors as the source does', () => {
    expect(text).toContain(
      `${exactly(value('creative-notch', 'global-monitors'))} \`addGlobalMonitorForEvents\``,
    );
  });

  it('only calls the rule asterisk-free while the source has no event tap', () => {
    if (value('creative-notch', 'event-taps') !== 0) {
      expect(text).not.toContain('no asterisk');
    }
  });

  it('names the release the latest one is', () => {
    expect(text).toContain(`${value('creative-notch', 'release')} has`);
  });
});

describe('pr-decision-log case study', () => {
  const text = prose('pr-decision-log');

  it('quotes the test count CI last reported', () => {
    expect(text).toContain(`${value('pr-decision-log', 'tests')} tests`);
  });

  it('does not deny an npm release the registry has', () => {
    value('pr-decision-log', 'npm');
    expect(text).not.toMatch(/isn['’]t on npm|not on npm/);
    expect(text).toContain('on npm');
  });
});
