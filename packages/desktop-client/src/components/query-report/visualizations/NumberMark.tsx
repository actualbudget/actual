import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { evaluateConditionalFormat } from './conditionalFormat';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';
import { useResizeObserver } from '@desktop-client/hooks/useResizeObserver';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';
import type { ResolvedChartSpec } from '@desktop-client/queries/resolveChannels';

const FONT_SIZE_SCALE_FACTOR = 1.6;

type NumberMarkProps = {
  result: QueryResult;
  resolved: ResolvedChartSpec;
  compact?: boolean;
};

export function NumberMark({ result, resolved, compact }: NumberMarkProps) {
  const format = useFormat();
  const refDiv = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number>(compact ? 30 : 36);

  const config = resolved.config;
  const fontSizeMode = config?.fontSizeMode ?? 'dynamic';
  const staticFontSize = config?.staticFontSize ?? (compact ? 30 : 36);

  const yChannel = resolved.encoding.y;
  const yField =
    yChannel && !Array.isArray(yChannel) ? yChannel.field : undefined;

  if (!yField) {
    return (
      <View
        style={{
          padding: 20,
          color: theme.pageTextSubdued,
          textAlign: 'center',
        }}
      >
        <Trans>No numeric result to display</Trans>
      </View>
    );
  }

  const value = result.rows[0]?.[yField];

  if (typeof value !== 'number') {
    return (
      <View
        style={{
          padding: 20,
          color: theme.pageTextSubdued,
          textAlign: 'center',
        }}
      >
        <Trans>No numeric result to display</Trans>
      </View>
    );
  }

  const columnValues = result.rows.map(r => r[yField]);
  const conditional = evaluateConditionalFormat(
    yField,
    value,
    columnValues,
    resolved.config?.conditionalRules,
  );

  const displayValue = useMemo(() => {
    const fmt =
      yChannel && !Array.isArray(yChannel) ? yChannel.format : undefined;
    if (fmt === 'percent') return `${(value * 100).toFixed(1)}%`;
    if (fmt === 'number') return format(value, 'number');
    if (fmt === 'financial-no-decimals') {
      return format(value, 'financial-no-decimals');
    }
    if (fmt === 'financial-with-sign') {
      return format(value, 'financial-with-sign');
    }
    return format(value, 'financial');
  }, [value, yChannel, format]);

  const calculateFontSize = useCallback(() => {
    if (!refDiv.current || !displayValue) return;
    const parent = refDiv.current.parentElement;
    if (!parent) return;
    const { clientWidth, clientHeight } = parent;
    const width = clientWidth;
    const height = clientHeight - 16;
    if (width <= 0 || height <= 0) return;
    const valueLength = displayValue.length || 1;
    const calculated = Math.min(
      (width * FONT_SIZE_SCALE_FACTOR) / valueLength,
      height,
    );
    setFontSize(calculated);
  }, [displayValue]);

  useEffect(() => {
    if (fontSizeMode === 'static') {
      setFontSize(staticFontSize);
    } else {
      calculateFontSize();
    }
  }, [fontSizeMode, staticFontSize, calculateFontSize]);

  const observerRef = useResizeObserver(() => {
    if (fontSizeMode === 'dynamic' && displayValue) {
      calculateFontSize();
    }
  });
  const mergedRef = useMergedRefs(refDiv, observerRef);

  return (
    <View
      ref={mergedRef}
      style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize,
        color: conditional?.textColor ?? theme.pageText,
        backgroundColor: conditional?.backgroundColor,
        ...(conditional?.bold ? { fontWeight: 700 } : {}),
        ...(conditional?.italic ? { fontStyle: 'italic' } : {}),
      }}
    >
      {displayValue}
    </View>
  );
}
