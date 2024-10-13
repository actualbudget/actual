import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { SvgInformationCircle } from '../../icons/v2';

import { Text } from './Text';
import { View } from './View';

type InfoBubbleProps = {
  label: string;
};

export function InfoBubble({ label }: InfoBubbleProps) {
  const location = useLocation();
  const [visible, setVisible] = useState(location.hash === '#info');

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
          top: '-20px',
          color: 'white',
          backgroundColor: 'black',
          borderRadius: '5px',
          borderStyle: 'solid',
          borderWidth: '1px',
          borderColor: 'white',
          padding: '5px',
          width: '200px',
          zIndex: 300,
        }}
      >
        <Text>{label}</Text>
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
