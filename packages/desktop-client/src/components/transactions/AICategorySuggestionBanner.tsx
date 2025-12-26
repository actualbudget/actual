import React from 'react';
import { Trans } from 'react-i18next';

import { SvgLightningBolt } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import type { CategorySuggestion } from '@desktop-client/hooks/useAICategorySuggestion';

type AICategorySuggestionBannerProps = {
  suggestion: CategorySuggestion;
  onAccept: () => void;
  onDismiss: () => void;
};

export function AICategorySuggestionBanner({
  suggestion,
  onAccept,
  onDismiss,
}: AICategorySuggestionBannerProps) {
  const confidencePercent = Math.round(suggestion.confidence * 100);
  const confidenceColor =
    suggestion.confidence >= 0.8
      ? theme.noticeTextLight
      : suggestion.confidence >= 0.6
        ? theme.warningText
        : theme.pageTextSubdued;

  return (
    <View
      style={{
        padding: 8,
        backgroundColor: theme.tableBackground,
        borderBottom: `1px solid ${theme.tableBorder}`,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <SvgLightningBolt
        style={{
          width: 16,
          height: 16,
          color: theme.noticeTextLight,
          flexShrink: 0,
        }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text style={{ fontWeight: 500, fontSize: '0.9em' }}>
            <Trans>AI suggests:</Trans>{' '}
            <span style={{ color: theme.pageTextPositive }}>
              {suggestion.categoryName}
            </span>
          </Text>
          <Text
            style={{
              fontSize: '0.75em',
              color: confidenceColor,
              fontWeight: 600,
            }}
          >
            {confidencePercent}%
          </Text>
        </View>
        {suggestion.reasoning && (
          <Text
            style={{
              fontSize: '0.75em',
              color: theme.pageTextSubdued,
              fontStyle: 'italic',
            }}
          >
            {suggestion.reasoning}
          </Text>
        )}
      </View>
      <View style={{ display: 'flex', flexDirection: 'row', gap: 4 }}>
        <button
          className={css({
            padding: '4px 8px',
            fontSize: '0.8em',
            borderRadius: 4,
            border: 'none',
            backgroundColor: theme.noticeBackgroundLight,
            color: theme.noticeTextLight,
            cursor: 'pointer',
            fontWeight: 500,
            '&:hover': {
              backgroundColor: theme.noticeBackground,
            },
          })}
          onClick={onAccept}
        >
          <Trans>Apply</Trans>
        </button>
        <button
          className={css({
            padding: '4px 8px',
            fontSize: '0.8em',
            borderRadius: 4,
            border: `1px solid ${theme.tableBorder}`,
            backgroundColor: 'transparent',
            color: theme.pageText,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: theme.tableBackground,
            },
          })}
          onClick={onDismiss}
        >
          <Trans>Dismiss</Trans>
        </button>
      </View>
    </View>
  );
}

