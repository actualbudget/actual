import React, {
  type FocusEventHandler,
  type ComponentPropsWithoutRef,
  useRef,
} from 'react';
import {
  default as Keyboard,
  type SimpleKeyboard,
} from 'react-simple-keyboard';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

export type AmountKeyboardRef = SimpleKeyboard;

type AmountKeyboardProps = ComponentPropsWithoutRef<typeof Keyboard> & {
  onBlur?: FocusEventHandler<HTMLDivElement>;
};

export function AmountKeyboard(props: AmountKeyboardProps) {
  const layoutClassName = cx([
    css({
      '& .hg-row': {
        display: 'flex',
      },
      '& .hg-button': {
        ...styles.noTapHighlight,
        ...styles.largeText,
        fontWeight: 500,
        display: 'flex',
        height: '60px',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        cursor: 'pointer',
        backgroundColor: theme.keyboardButtonBackground,
        color: theme.keyboardText,
        padding: '5px 10px',
        margin: 2,
        borderWidth: 0,
        outline: 0,
        boxSizing: 'border-box',
        ':active': {
          transform: 'translateY(1px)',
          boxShadow: `0 1px 4px 0 ${theme.keyboardButtonShadow}`,
          transition: 'none',
        },
      },
      // eslint-disable-next-line rulesdir/typography
      '& [data-skbtn="+"], & [data-skbtn="-"], & [data-skbtn="×"], & [data-skbtn="÷"], & [data-skbtn="{bksp}"]':
        {
          backgroundColor: theme.keyboardButtonSecondaryBackground,
        },
    }),
    props.theme,
  ]);

  const keyboardRef = useRef<SimpleKeyboard | null>(null);

  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        bottom: 0,
        right: 0,
        zIndex: 999,
        backgroundColor: theme.keyboardBackground,
        borderTop: `1px solid ${theme.keyboardBorder}`,
        padding: 5,
      }}
      onBlur={e => {
        if (keyboardRef.current?.keyboardDOM.contains(e.relatedTarget)) {
          return;
        }

        props.onBlur?.(e);
      }}
    >
      <Keyboard
        layoutName="default"
        layout={{
          // eslint-disable-next-line prettier/prettier
          default: [
            '+ 1 2 3',
            '- 4 5 6',
            '× 7 8 9',
            '÷ . 0 {bksp}',
          ],
        }}
        display={{
          '{bksp}': '⌫',
        }}
        useButtonTag
        {...props}
        keyboardRef={r => {
          keyboardRef.current = r;
          props.keyboardRef?.(r);
        }}
        theme={layoutClassName}
      />
    </View>
  );
}
