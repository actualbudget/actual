import React from 'react';

import { useNavigate } from '../../hooks/useNavigate';
import { SvgCheveronLeft } from '../../icons/v1';
import { type CSSProperties, styles, theme } from '../../style';
import { Button } from '../common/Button';
import { Text } from '../common/Text';

type MobileBackButtonProps = {
  onClick?: () => void;
  style?: CSSProperties;
};

export function MobileBackButton({ onClick, style }: MobileBackButtonProps) {
  const navigate = useNavigate();
  return (
    <Button
      type="bare"
      aria-label="Back"
      style={{
        color: theme.mobileHeaderText,
        justifyContent: 'center',
        margin: 10,
        paddingLeft: 5,
        paddingRight: 3,
        ...style,
      }}
      hoveredStyle={{
        color: theme.mobileHeaderText,
        background: theme.mobileHeaderTextHover,
      }}
      onClick={onClick || (() => navigate(-1))}
    >
      <SvgCheveronLeft
        style={{ width: 30, height: 30, margin: -10, marginLeft: -5 }}
      />
      <Text
        style={{
          ...styles.text,
          fontWeight: 500,
          marginLeft: 5,
          marginRight: 5,
        }}
      >
        Back
      </Text>
    </Button>
  );
}
