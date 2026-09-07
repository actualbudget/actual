import { describe, expect, it } from 'vitest';

import { admonitionsToBlockquotes, parseAdmonitionMarker } from './admonitions';

describe('admonitionsToBlockquotes', () => {
  it('turns admonitions into marked blockquotes and leaves other text alone', () => {
    const input = `Intro paragraph.

:::warning Deprecation

Rule action templating is deprecated. See [docs](https://example.com).

:::

:::info
No title here.
:::

> A real quote stays as-is.`;

    expect(admonitionsToBlockquotes(input)).toBe(`Intro paragraph.

> [!warning] Deprecation
>
> Rule action templating is deprecated. See [docs](https://example.com).

> [!info]
>
> No title here.

> A real quote stays as-is.`);
  });

  it('keeps blank lines inside the body as quoted lines', () => {
    expect(admonitionsToBlockquotes(':::tip\nOne.\n\nTwo.\n:::')).toBe(
      '> [!tip]\n>\n> One.\n>\n> Two.',
    );
  });
});

describe('parseAdmonitionMarker', () => {
  it('extracts the type and title', () => {
    expect(parseAdmonitionMarker('[!warning] Deprecation')).toEqual({
      type: 'warning',
      title: 'Deprecation',
    });
    expect(parseAdmonitionMarker('[!info]')).toEqual({
      type: 'info',
      title: '',
    });
  });

  it('ignores ordinary text and unknown types', () => {
    expect(parseAdmonitionMarker('A real quote')).toBeUndefined();
    expect(parseAdmonitionMarker('[!bogus] x')).toBeUndefined();
    expect(parseAdmonitionMarker(undefined)).toBeUndefined();
  });
});
