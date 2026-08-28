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

const remarkPlugins = [sequentialNewlinesPlugin, remarkGfm, remarkBreaks];
const rehypePlugins = [
  [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
] satisfies Parameters<typeof ReactMarkdown>[0]['rehypePlugins'];

type MarkdownProps = {
  children: string;
  style?: CSSProperties;
  /** Per-element overrides, e.g. a custom `blockquote` renderer. */
  components?: Components;
};

/**
 * Renders markdown with the app's standard plugin set and base styles: GitHub
 * flavoured markdown, blank lines preserved as line breaks, and links opening
 * in a new tab.
 */
export function Markdown({ children, style, components }: MarkdownProps) {
  return (
    <Text className={css([markdownBaseStyles, { display: 'block' }, style])}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </Text>
  );
}
