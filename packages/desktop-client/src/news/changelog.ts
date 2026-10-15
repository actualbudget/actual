export type ChangelogSection = {
  /** Category heading from the release notes, e.g. `Bugfixes`. */
  title: string;
  markdown: string;
  changeCount: number;
};

export type Changelog = {
  /** Anything written before the first category heading. */
  preamble: string;
  sections: ChangelogSection[];
};

const CATEGORY_HEADING_PATTERN = /^#{2,4} +(.+)$/m;

/** Number of top-level bullets, i.e. individual changes, in a markdown list. */
export function countChanges(markdown: string): number {
  return markdown.match(/^[-*] /gm)?.length ?? 0;
}

/**
 * Splits a release's detailed change list into its categories. The release
 * tooling writes them as `#### Features`, `#### Bugfixes`, etc., each followed
 * by a bullet list.
 */
export function splitChangelog(details: string): Changelog {
  // With a capture group, `split` alternates: preamble, title, body, title…
  const [preamble = '', ...parts] = details.split(CATEGORY_HEADING_PATTERN);
  const sections: ChangelogSection[] = [];

  for (let index = 0; index < parts.length; index += 2) {
    const markdown = (parts[index + 1] ?? '').trim();
    sections.push({
      title: parts[index].trim(),
      markdown,
      changeCount: countChanges(markdown),
    });
  }

  return { preamble: preamble.trim(), sections };
}
