import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { SvgInformationCircle } from '../../icons/v2';
import { theme } from '../../style';

import { Text } from './Text';
import { View } from './View';

type InfoBubbleProps = {
  label: string;
  textWidth?: number;
};

export function InfoBubble({ label, textWidth }: InfoBubbleProps) {
  const location = useLocation();
  const [visible, setVisible] = useState(location.hash === '#info');

  const width = textWidth || getStringWidth(label);

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
          boxShadow: theme.buttonPrimaryShadow,
        }}
      >
        <Text
          style={{
            width,
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

function getStringWidth(text: string): number {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = getComputedStyle(document.body).font;

  return Math.ceil(context.measureText(text).width);
}
