import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { Tooltip as AriaTooltip, TooltipTrigger } from 'react-aria-components';
import { Trans } from 'react-i18next';

import { SvgQuestion } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { useGlossary } from './glossary';
import type { GlossaryTermId } from './glossary';
import { Link } from './Link';

const OPEN_DELAY_MS = 250;

type TermProps = {
  /** Which glossary entry to show. */
  id: GlossaryTermId;
  /**
   * The text to render. Defaults to the glossary title so callers can simply
   * write `<Term id="budgeted" />`.
   */
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  /** Where the definition pops up relative to the text. */
  placement?: ComponentProps<typeof AriaTooltip>['placement'];
  /**
   * Render a small question-mark icon next to the text instead of the dotted
   * underline. Useful next to large numbers where an underline looks odd.
   */
  variant?: 'underline' | 'icon';
  /**
   * Whether the term can receive keyboard focus. Set to false when the term
   * is rendered inside another interactive element such as a link.
   */
  isFocusable?: boolean;
};

/**
 * Highlights a piece of budgeting vocabulary and shows its plain-language
 * definition in a small popup while the cursor (or keyboard focus) is on it.
 * The popup disappears as soon as the pointer leaves, so it never gets in the
 * way of experienced users.
 */
export function Term({
  id,
  children,
  style,
  className,
  placement = 'bottom',
  variant = 'underline',
  isFocusable = true,
}: TermProps) {
  const glossary = useGlossary();
  const entry = glossary[id];
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const openTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimeout = useCallback(() => {
    if (openTimeout.current) {
      clearTimeout(openTimeout.current);
      openTimeout.current = null;
    }
  }, []);

  const open = useCallback(() => {
    clearOpenTimeout();
    openTimeout.current = setTimeout(() => setIsOpen(true), OPEN_DELAY_MS);
  }, [clearOpenTimeout]);

  const close = useCallback(() => {
    clearOpenTimeout();
    setIsOpen(false);
  }, [clearOpenTimeout]);

  useEffect(() => clearOpenTimeout, [clearOpenTimeout]);

  const label = children ?? entry.title;

  return (
    <TooltipTrigger isOpen={isOpen} delay={0} closeDelay={0}>
      <span
        ref={triggerRef}
        data-testid="term"
        data-term={id}
        tabIndex={isFocusable ? 0 : -1}
        aria-description={entry.definition}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={() => setIsOpen(true)}
        onBlur={close}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            close();
          }
        }}
        className={cx(
          css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            cursor: 'help',
            outline: 'none',
            borderRadius: 2,
            ...(variant === 'underline'
              ? {
                  textDecorationLine: 'underline',
                  textDecorationStyle: 'dotted',
                  textDecorationColor: theme.pageTextSubdued,
                  textUnderlineOffset: 3,
                  ':hover, :focus-visible': {
                    textDecorationColor: theme.pageTextPositive,
                  },
                }
              : {}),
            ':focus-visible': {
              boxShadow: `0 0 0 2px ${theme.formInputShadowSelected}`,
            },
          }),
          className,
        )}
        style={style}
      >
        {label}
        {variant === 'icon' && (
          <SvgQuestion
            aria-hidden
            style={{
              width: 12,
              height: 12,
              flexShrink: 0,
              color: theme.pageTextSubdued,
            }}
          />
        )}
      </span>
      <AriaTooltip
        triggerRef={triggerRef}
        placement={placement}
        offset={6}
        style={{
          ...styles.tooltip,
          borderWidth: 1,
          borderRadius: 8,
          padding: 0,
          maxWidth: 300,
          pointerEvents: 'none',
          zIndex: 3500,
        }}
      >
        <View
          data-testid="term-definition"
          style={{ padding: '10px 12px', gap: 6, fontSize: 13 }}
        >
          <Text style={{ fontWeight: 600 }}>{entry.title}</Text>
          <Text style={{ lineHeight: '1.45em', color: theme.pageText }}>
            {entry.definition}
          </Text>
          {entry.tip && (
            <Text style={{ lineHeight: '1.45em', color: theme.pageTextLight }}>
              {entry.tip}
            </Text>
          )}
          {entry.learnMore && (
            <Link
              variant="external"
              to={entry.learnMore}
              linkColor="purple"
              className={css({ fontSize: 12, pointerEvents: 'auto' })}
            >
              <Trans>Learn more</Trans>
            </Link>
          )}
        </View>
      </AriaTooltip>
    </TooltipTrigger>
  );
}
