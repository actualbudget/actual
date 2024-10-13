import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { SvgInformationCircle } from '../../icons/v2';
import { theme } from '../../style';

import { Text } from './Text';
import { View } from './View';

type InfoBubbleProps = {
  label: string;
};

function getBubbleWidth(label: string): number {
  const font = '13px Inter var';
  const textWidth = getTextWidth(label, font);
  console.log(textWidth);
  // if textWidth longer than 500, split into multiple lines of close to equal length
  if (textWidth > 500) {
    const words = label.split(' ');
    const half = Math.ceil(words.length / 2);
    const firstHalf = words.slice(0, half).join(' ');
    const secondHalf = words.slice(half).join(' ');
    return Math.ceil(
      Math.max(getTextWidth(firstHalf, font), getTextWidth(secondHalf, font)),
    );
  }
  return textWidth;
}

function getTextWidth(text: string, font: string): number {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = font || getComputedStyle(document.body).font;

  return Math.ceil(context.measureText(text).width);
}

export function InfoBubble({ label }: InfoBubbleProps) {
  const location = useLocation();
  const [visible, setVisible] = useState(location.hash === '#info');

  const bubbleWidth = getBubbleWidth(label);
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
