import { describe, expect, it } from 'vitest';
import { linkRegex } from './EmailTextContent';

const links = (text: string) => text.match(linkRegex) ?? [];

describe('linkRegex', () => {
  it('finds links and email addresses', () => {
    expect(links('see https://a.example/x?y=1 or mail me.you_1@sub.example.com now')).toEqual([
      'https://a.example/x?y=1',
      'me.you_1@sub.example.com',
    ]);
    expect(links('no links here, not@ an address')).toEqual([]);
  });

  it('stays fast on a very long line without spaces', () => {
    const line = 'y'.repeat(3_000_000);
    const started = performance.now();
    expect(line.split(linkRegex)).toEqual([line]);
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it('stays fast on a long line full of @', () => {
    const line = 'a@'.repeat(500_000);
    const started = performance.now();
    links(line);
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
