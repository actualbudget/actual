import React, {
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import debounce from 'lodash/debounce';

import { chartTheme } from './chart-theme';
import { LoadingIndicator } from './LoadingIndicator';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';
import { useResizeObserver } from '@desktop-client/hooks/useResizeObserver';

const FONT_SIZE_SCALE_FACTOR = 1.6;
const CONTAINER_MARGIN = 8;

type FormulaResultProps = {
  value: number | string | null;
  animate?: boolean;
  loading?: boolean;
  error?: string | null;
  initialFontSize?: number;
  fontSizeChanged?: (fontSize: number) => void;
  fontSizeMode?: 'dynamic' | 'static';
  staticFontSize?: number;
  customColor?: string | null;
};

export function FormulaResult({
  value,
  animate = false,
  loading = true,
  error = null,
  initialFontSize = 14,
  fontSizeChanged,
  fontSizeMode = 'dynamic',
  staticFontSize = 32,
  customColor = null,
}: FormulaResultProps) {
  const [fontSize, setFontSize] = useState<number>(initialFontSize);
  const refDiv = useRef<HTMLDivElement>(null);
  const previousFontSizeRef = useRef<number>(initialFontSize);

  // Format the display value - just show what we got
  const displayValue = useMemo(() => {
    if (error) {
      return error;
    } else if (value === null || value === undefined) {
      return '';
    } else {
      return String(value);
    }
  }, [error, value]);

  const calculateFontSize = useCallback(() => {
    if (!refDiv.current) return;

    const { clientWidth, clientHeight } = refDiv.current;
    const width = clientWidth; // no margin required on left and right
    const height = clientHeight - CONTAINER_MARGIN * 2; // account for margin top and bottom

    // Get the actual display value length at calculation time
    const valueLength = displayValue.length || 1; // Avoid division by zero

    const calculatedFontSize = Math.min(
      (width * FONT_SIZE_SCALE_FACTOR) / valueLength,
      height, // Ensure the text fits vertically by using the height as the limiting factor
    );

    setFontSize(calculatedFontSize);

    // Only call fontSizeChanged if the font size actually changed
    if (
      fontSizeChanged &&
      Math.abs(calculatedFontSize - previousFontSizeRef.current) > 0.5
    ) {
      previousFontSizeRef.current = calculatedFontSize;
      fontSizeChanged(calculatedFontSize);
    }
  }, [displayValue, fontSizeChanged]);

  // Debounce the calculation to avoid too many recalculations
  const debouncedCalculateFontSize = useRef(
    debounce(() => {
      if (fontSizeMode === 'dynamic') {
        calculateFontSize();
      }
    }, 100),
  );

  // Update the debounced function when calculateFontSize changes
  useEffect(() => {
    debouncedCalculateFontSize.current.cancel?.();
    debouncedCalculateFontSize.current = debounce(() => {
      if (fontSizeMode === 'dynamic') {
        calculateFontSize();
      }
    }, 100);

    return () => {
      debouncedCalculateFontSize.current.cancel?.();
    };
  }, [calculateFontSize, fontSizeMode]);

  const ref = useResizeObserver(() => {
    if (fontSizeMode === 'dynamic') {
      debouncedCalculateFontSize.current();
    }
  });
  const mergedRef = useMergedRefs(ref, refDiv);

  // Recalculate font size when displayValue changes (non-debounced for immediate update)
  // Only for dynamic mode
  useEffect(() => {
    if (fontSizeMode === 'dynamic') {
      calculateFontSize();
    }
  }, [displayValue, calculateFontSize, fontSizeMode]);

  // Use static font size when in static mode
  useEffect(() => {
    if (fontSizeMode === 'static') {
      setFontSize(staticFontSize);
    }
  }, [fontSizeMode, staticFontSize]);

  // Determine color
  const color = customColor
    ? customColor
    : error
      ? chartTheme.colors.red
      : theme.pageText;

  return (
    <View style={{ flex: 1 }}>
      {loading && <LoadingIndicator />}
      {!loading && (
        <View
          ref={mergedRef as Ref<HTMLDivElement>}
          aria-label={displayValue}
          style={{
            alignItems: 'center',
            flexGrow: 1,
            flexShrink: 1,
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            fontSize,
            lineHeight: 1,
            margin: `${CONTAINER_MARGIN}px 0`,
            justifyContent: 'center',
            transition: animate ? 'font-size 0.3s ease' : '',
            color,
          }}
        >
          <span aria-hidden="true">
            <PrivacyFilter>{displayValue}</PrivacyFilter>
          </span>
        </View>
      )}
    </View>
  );
}
