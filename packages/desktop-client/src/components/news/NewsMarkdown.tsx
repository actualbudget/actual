import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import { Markdown } from '#components/common/Markdown';
import { admonitionsToBlockquotes } from '#news/admonitions';

import { MarkdownBlockquote } from './MarkdownBlockquote';

const markdownComponents = { blockquote: MarkdownBlockquote };

// Overrides to the shared markdown style, which is tuned for short notes.
// Notifications are long-form reading, so they need calmer, roomier text.
const newsMarkdownStyle = {
  fontSize: 14,
  lineHeight: 1.5,
  '& h2, & h3, & h4': { fontSize: 14, fontWeight: 600, margin: '20px 0 8px' },
  '& p:not(:first-child)': { marginTop: '0.75rem' },
  // Bullets hang outside the text so wrapped lines stay aligned.
  '& ul, & ol': {
    listStylePosition: 'outside',
    paddingLeft: '1.25em',
    marginTop: '0.5rem',
  },
  // The shared style tints rules and inline code purple, which suits notes but
  // reads as decoration here; keep both neutral.
  '& hr': { borderBottomColor: theme.pageText },
  '& code': {
    backgroundColor: theme.cardBackground,
    color: theme.pageText,
    fontFamily: 'monospace',
    padding: '0.1rem 0.3rem',
  },
  '& img': { maxWidth: '100%' },
};

type NewsMarkdownProps = {
  children: string;
  style?: CSSProperties;
};

/** Markdown as written for the docs site: blog posts and release notes. */
export function NewsMarkdown({ children, style }: NewsMarkdownProps) {
  return (
    <Markdown
      style={{ ...newsMarkdownStyle, ...style }}
      components={markdownComponents}
      preserveBlankLines={false}
    >
      {admonitionsToBlockquotes(children)}
    </Markdown>
  );
}
