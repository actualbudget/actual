import React, { useState, useEffect, useRef } from 'react';
import { View, Image } from 'react-native';

const resolveAssetSource = Image.resolveAssetSource;

export default function ScalableImage(props) {
  const [scalableWidth, setScalableWidth] = useState(null);
  const [scalableHeight, setScalableHeight] = useState(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  function adjustSize(sourceWidth, sourceHeight, width, height) {
    let ratio = 1;

    if (width && height) {
      ratio = Math.min(width / sourceWidth, height / sourceHeight);
    } else if (width) {
      ratio = width / sourceWidth;
    } else if (height) {
      ratio = height / sourceHeight;
    }

    if (mounted.current) {
      const computedWidth = sourceWidth * ratio;
      const computedHeight = sourceHeight * ratio;

      setScalableWidth(computedWidth);
      setScalableHeight(computedHeight);
    }
  }

  useEffect(() => {
    const { source } = props;
    if (source.uri) {
      const sourceToUse = source.uri ? source.uri : source;

      Image.getSize(
        sourceToUse,
        (width, height) => adjustSize(width, height, props.width, props.height),
        console.err
      );
    } else {
      const sourceToUse = resolveAssetSource(source);
      adjustSize(
        sourceToUse.width,
        sourceToUse.height,
        props.width,
        props.height
      );
    }
  }, [props.width, props.height, props.source]);

  return (
    <View
      style={[
        {
          width: scalableWidth,
          height: scalableHeight,
          flex: -1,
          overflow: 'hidden',
        },
        props.style
      ]}
    >
      <Image
        {...props}
        style={[{ width: scalableWidth, height: scalableHeight, flex: 0 }]}
      />
    </View>
  );
}
