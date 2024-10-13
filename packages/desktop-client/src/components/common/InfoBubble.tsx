import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { getTextWidth } from 'loot-core/shared/text-width';

import { SvgInformationCircle } from '../../icons/v2';
import { theme } from '../../style';

import { Text } from './Text';
import { View } from './View';

type InfoBubbleProps = {
  label: string;
};

export function InfoBubble({ label }: InfoBubbleProps) {
  const location = useLocation();
  const [visible, setVisible] = useState(location.hash === '#info');

  const bubbleWidth = getTextWidth(label, 500);
  console.log(bubbleWidth);

  return visible ? (
    <View style={{ userSelect: 'none' }}>
      <SvgInformationCircle
        style={{ height: '15px', cursor: 'pointer' }}
        onClick={() => setVisible(false)}
        onMouseLeave={() => setVisible(false)}
      />
      <View
        style={{
          position: 'absolute',
          left: '20px',
          top: '-7px',
          color: theme.buttonNormalText,
          backgroundColor: theme.buttonNormalBackground,
          padding: 5,
          borderRadius: 4,
          border: '1px solid ' + theme.buttonNormalBorder,
          zIndex: 300,
          boxShadow: theme.buttonNormalShadow,
        }}
      >
        <Text
          style={{
            width: bubbleWidth,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  ) : (
    <View style={{ userSelect: 'none' }}>
      <SvgInformationCircle
        style={{ height: '15px', cursor: 'pointer' }}
        onClick={() => setVisible(true)}
        onMouseOver={() => setTimeout(() => setVisible(true), 500)}
      />
    </View>
  );
}
