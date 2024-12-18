import React, { type ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useNavigate } from '../../hooks/useNavigate';
import { SvgCheveronLeft } from '../../icons/v1';
import { styles } from '../../style';
import { Button } from '../common/Button2';
import { Text } from '../common/Text';

type MobileBackButtonProps = ComponentPropsWithoutRef<typeof Button>;

export function MobileBackButton({
  onPress,
  style,
  ...props
}: MobileBackButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Button
      variant="bare"
      style={{
        margin: 10,
        ...style,
      }}
      onPress={onPress || (() => navigate(-1))}
      {...props}
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
        {t('Back')}
      </Text>
    </Button>
  );
}
