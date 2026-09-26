import { Children, isValidElement } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExtraProps } from 'react-markdown';

import {
  SvgExclamationOutline,
  SvgInformationOutline,
} from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Alert } from '#components/alerts';
import { parseAdmonitionMarker } from '#news/admonitions';
import type { AdmonitionType } from '#news/admonitions';

type MarkdownBlockquoteProps = ComponentProps<'blockquote'> & ExtraProps;

const admonitionStyles: Record<AdmonitionType, ComponentProps<typeof Alert>> = {
  note: {
    icon: SvgInformationOutline,
    color: theme.pageText,
    backgroundColor: theme.pillBackground,
  },
  tip: {
    icon: SvgInformationOutline,
    color: theme.noticeText,
    backgroundColor: theme.noticeBackground,
  },
  info: {
    icon: SvgInformationOutline,
    color: theme.pillTextSelected,
    backgroundColor: theme.pillBackgroundSelected,
  },
  warning: {
    icon: SvgExclamationOutline,
    color: theme.warningText,
    backgroundColor: theme.warningBackground,
  },
  danger: {
    icon: SvgExclamationOutline,
    color: theme.errorTextDarker,
    backgroundColor: theme.errorBackground,
  },
};

// The marker paragraph is located twice: once in the hast tree (to read its
// text) and once in the rendered React children (to drop it). Both look at
// the first `<p>`, so they must stay in step.
function firstParagraphText(node: ExtraProps['node']): string | undefined {
  const firstParagraph = node?.children.find(
    child => child.type === 'element' && child.tagName === 'p',
  );
  if (!firstParagraph || firstParagraph.type !== 'element') {
    return undefined;
  }
  const firstText = firstParagraph.children[0];
  return firstText?.type === 'text' ? firstText.value : undefined;
}

function withoutFirstParagraph(children: ReactNode): ReactNode[] {
  let isRemoved = false;
  return Children.toArray(children).filter(child => {
    if (!isRemoved && isValidElement(child) && child.type === 'p') {
      isRemoved = true;
      return false;
    }
    return true;
  });
}

/**
 * Renders markdown blockquotes, upgrading the ones produced from Docusaurus
 * admonitions (see `admonitionsToBlockquotes`) into the app's standard alert
 * boxes so they look like they do on the website.
 */
export function MarkdownBlockquote({
  node,
  children,
}: MarkdownBlockquoteProps) {
  const { t } = useTranslation();
  const marker = parseAdmonitionMarker(firstParagraphText(node));

  if (!marker) {
    return <blockquote>{children}</blockquote>;
  }

  const defaultTitles: Record<AdmonitionType, string> = {
    note: t('Note'),
    tip: t('Tip'),
    info: t('Info'),
    warning: t('Warning'),
    danger: t('Danger'),
  };

  return (
    <Alert {...admonitionStyles[marker.type]} style={{ margin: '10px 0' }}>
      <View style={{ gap: 4 }}>
        <Text
          style={{
            fontWeight: 700,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {marker.title || defaultTitles[marker.type]}
        </Text>
        <View style={{ color: theme.pageText }}>
          {withoutFirstParagraph(children)}
        </View>
      </View>
    </Alert>
  );
}
