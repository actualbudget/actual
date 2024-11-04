import { useRef } from 'react';

import { View } from '../components/common/View';

export const useSpaceMeasure = () => {
  const widthRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef<HTMLDivElement>(null);

  const measuringElements = (
    <>
      <View
        ref={widthRef}
        style={{
          width: '100%',
          height: 0,
          position: 'absolute',
        }}
      />
      <View
        ref={heightRef}
        style={{
          width: 0,
          height: '100%',
          position: 'absolute',
        }}
      />
    </>
  );

  return {
    width: () => widthRef.current?.offsetWidth,
    height: () => heightRef.current?.offsetHeight,
    elements: measuringElements,
  };
};
