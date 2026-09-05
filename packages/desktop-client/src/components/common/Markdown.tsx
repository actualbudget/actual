import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { css } from '@emotion/css';
import rehypeExternalLinks from 'rehype-external-links';
import remarkGfm from 'remark-gfm';

import {
  markdownBaseStyles,
  remarkBreaks,
  sequentialNewlinesPlugin,
} from '#util/markdown';

// Notes-style rendering: blank lines are kept as visible line breaks.
const notesRemarkPlugins = [sequentialNewlinesPlugin, remarkGfm, remarkBreaks];
// Standard markdown: blank lines separate paragraphs, as on the website.
const standardRemarkPlugins = [remarkGfm];
const rehypePlugins = [
  [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
] satisfies Parameters<typeof ReactMarkdown>[0]['rehypePlugins'];

type MarkdownProps = {
  children: string;
  style?: CSSProperties;
  /** Per-element overrides, e.g. a custom `blockquote` renderer. */
  components?: Components;
  /**
   * Treat blank lines as visible line breaks (how notes are written) rather
   * than as paragraph separators. Defaults to on to match existing notes.
   */
  preserveBlankLines?: boolean;
};

/**
 * Renders markdown with the app's standard plugin set and base styles: GitHub
 * flavoured markdown and links opening in a new tab.
 */
export function Markdown({
  children,
  style,
  components,
  preserveBlankLines = true,
}: MarkdownProps) {
  return (
    <Text className={css([markdownBaseStyles, { display: 'block' }, style])}>
      <ReactMarkdown
        remarkPlugins={
          preserveBlankLines ? notesRemarkPlugins : standardRemarkPlugins
        }
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </Text>
  );
}
