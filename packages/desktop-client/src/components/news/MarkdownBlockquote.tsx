import { Children, isValidElement } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExtraProps } from 'react-markdown';

import { SvgExclamationSolid } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { parseAdmonitionMarker } from '#news/admonitions';
import type { AdmonitionType } from '#news/admonitions';

type MarkdownBlockquoteProps = ComponentProps<'blockquote'> & ExtraProps;

const admonitionColors: Record<
  AdmonitionType,
  { border: string; background: string; text: string }
> = {
  note: {
    border: theme.pillBorderDark,
    background: theme.pillBackground,
    text: theme.pageText,
  },
  tip: {
    border: theme.noticeBorder,
    background: theme.noticeBackground,
    text: theme.noticeText,
  },
  info: {
    border: theme.pillBorderSelected,
    background: theme.pillBackgroundSelected,
    text: theme.pillTextSelected,
  },
  warning: {
    border: theme.warningBorder,
    background: theme.warningBackground,
    text: theme.warningText,
  },
  danger: {
    border: theme.errorBorder,
    background: theme.errorBackground,
    text: theme.errorText,
  },
};

function firstTextOf(node: ExtraProps['node']): string | undefined {
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
 * admonitions (see `admonitionsToBlockquotes`) into styled callouts.
 */
export function MarkdownBlockquote({
  node,
  children,
}: MarkdownBlockquoteProps) {
  const { t } = useTranslation();
  const marker = parseAdmonitionMarker(firstTextOf(node));

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
  const colors = admonitionColors[marker.type];

  return (
    <View
      style={{
        margin: '10px 0',
        padding: '10px 14px',
        borderRadius: 6,
        borderLeft: `4px solid ${colors.border}`,
        backgroundColor: colors.background,
        color: colors.text,
        gap: 4,
      }}
      data-testid={`admonition-${marker.type}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <SvgExclamationSolid width={13} height={13} />
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
      </View>
      <View style={{ color: theme.pageText }}>
        {withoutFirstParagraph(children)}
      </View>
    </View>
  );
}
