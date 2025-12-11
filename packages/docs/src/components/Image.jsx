import React from 'react';
import IdealImage from '@theme/IdealImage';

// https://github.com/endiliey/react-ideal-image/blob/de4e8f0388ac3645d3f32355c79c3b6a7cc61ff3/src/components/theme.js
// (removed `img` styles to prevent image from being enlarged)
const theme = {
  placeholder: {
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
  },
  img: {
    // width: '100%',
    // height: 'auto',
    // maxWidth: '100%',
  },
  icon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },
  noscript: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
};

export default function Image({ img, ...props }) {
  if (img) {
    const { src, ...rest } = img;
    const match = src.src.match(/@(\d+)x/);
    if (match) {
      const scale = parseInt(match[1]);
      return (
        <IdealImage
          img={{
            src: {
              ...src,
              width: src.width / scale,
              height: src.height / scale,
            },
            ...rest,
          }}
          theme={theme}
          {...props}
        />
      );
    }
    return <IdealImage img={img} theme={theme} {...props} />;
  } else {
    // oxlint-disable-next-line alt-text
    return <img {...props} />;
  }
}
