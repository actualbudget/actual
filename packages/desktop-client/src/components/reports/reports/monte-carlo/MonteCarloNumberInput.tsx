import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { Input } from '@actual-app/components/input';
import { css } from '@emotion/css';

// Plain numeric text input - no browser spin buttons
const NUMBER_INPUT_CLASS = css({
  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
  MozAppearance: 'textfield',
});

type MonteCarloNumberInputProps = {
  /** Committed value; a fraction when scale is 100, plain number otherwise */
  value: number | null;
  /** Called on blur/Enter, only when the parsed value actually changed */
  onCommit: (value: number | null) => void;
  /** 100 for percentage fields (0.06 shown as 6), 1 for plain numbers */
  scale?: number;
  /** When true, clearing the field commits null instead of the minimum */
  allowEmpty?: boolean;
  roundToInteger?: boolean;
  min: number;
  max: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  /** Accessible name; pass the field's visible label text */
  'aria-label'?: string;
  /** Extra styles, e.g. for compact inline inputs inside a sentence */
  style?: CSSProperties;
};

function toDisplayText(value: number | null, scale: number) {
  return value == null ? '' : String(Number((value * scale).toFixed(4)));
}

export function MonteCarloNumberInput({
  value,
  onCommit,
  scale = 1,
  allowEmpty = false,
  roundToInteger = false,
  min,
  max,
  step = 0.1,
  placeholder,
  disabled = false,
  'aria-label': ariaLabel,
  style,
}: MonteCarloNumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => toDisplayText(value, scale));
  const [isFocused, setIsFocused] = useState(false);

  // Reflect outside changes (e.g. an allocation preset auto-fill) while the
  // field isn't being edited
  useEffect(() => {
    if (!isFocused) {
      setText(toDisplayText(value, scale));
    }
  }, [value, scale, isFocused]);

  function commit(currentText: string) {
    const trimmed = currentText.trim();
    if (trimmed === '') {
      if (allowEmpty) {
        if (value !== null) {
          onCommit(null);
        }
        return;
      }
      // Revert to the last committed value
      setText(toDisplayText(value, scale));
      return;
    }

    const parsed = Number(trimmed);
    if (isNaN(parsed)) {
      setText(toDisplayText(value, scale));
      return;
    }

    const rounded = roundToInteger ? Math.round(parsed) : parsed;
    const clamped = Math.min(max, Math.max(min, rounded));
    const newValue = clamped / scale;
    setText(toDisplayText(newValue, scale));
    if (newValue !== value) {
      onCommit(newValue);
    }
  }

  return (
    <Input
      ref={inputRef}
      type="number"
      className={NUMBER_INPUT_CLASS}
      min={min}
      max={max}
      step={step}
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      style={style}
      onChangeValue={setText}
      onFocus={() => {
        setIsFocused(true);
        // Highlight the whole value so typing replaces it, matching the
        // currency inputs
        setTimeout(() => inputRef.current?.select(), 0);
      }}
      onBlur={event => {
        setIsFocused(false);
        commit(event.currentTarget.value);
      }}
      onEnter={commit}
    />
  );
}
