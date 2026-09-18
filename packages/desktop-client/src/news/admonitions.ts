const ADMONITION_TYPES = ['note', 'tip', 'info', 'warning', 'danger'] as const;

export type AdmonitionType = (typeof ADMONITION_TYPES)[number];

const MARKER_PREFIX = '[!';
const ADMONITION_BLOCK_PATTERN =
  /^:::(note|tip|info|warning|danger)[ \t]*([^\n]*)\n([\s\S]*?)^:::[ \t]*$/gm;

/**
 * Rewrites Docusaurus admonitions (`:::warning Title … :::`) into blockquotes
 * whose first paragraph is a `[!type] Title` marker, so a standard markdown
 * parser can handle them and the renderer can pick the marker back up.
 */
export function admonitionsToBlockquotes(markdown: string): string {
  return markdown.replace(
    ADMONITION_BLOCK_PATTERN,
    (_match, type: string, title: string, body: string) => {
      const quoted = body
        .trim()
        .split('\n')
        .map(line => (line.length > 0 ? `> ${line}` : '>'))
        .join('\n');
      const trimmedTitle = title.trim();
      const marker = `${MARKER_PREFIX}${type}]${trimmedTitle ? ` ${trimmedTitle}` : ''}`;
      return `> ${marker}\n>\n${quoted}`;
    },
  );
}

export type AdmonitionMarker = {
  type: AdmonitionType;
  title: string;
};

/** Parses the marker text produced by `admonitionsToBlockquotes`. */
export function parseAdmonitionMarker(
  text: string | undefined,
): AdmonitionMarker | undefined {
  if (!text || !text.startsWith(MARKER_PREFIX)) {
    return undefined;
  }
  const match = text.match(/^\[!(\w+)\]\s*(.*)$/s);
  if (!match) {
    return undefined;
  }
  const type = ADMONITION_TYPES.find(
    candidate => candidate === match[1].toLowerCase(),
  );
  if (!type) {
    return undefined;
  }
  return { type, title: match[2].trim() };
}
