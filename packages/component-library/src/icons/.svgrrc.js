module.exports = {
  prettier: true,
  prettierConfig: {
    singleQuote: true,
  },
  svgoConfig: {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: { removeUnknownsAndDefaults: false },
        },
      },
      'removeDimensions',
    ],
  },
  jsx: {
    babelConfig: {
      plugins: [
        [
          './add-attribute.ts',
          {
            elements: ['path', 'Path', 'rect', 'Rect'],
            attributes: [
              {
                name: 'fill',
                value: 'currentColor',
                spread: false,
                literal: false,
                position: 'end',
              },
            ],
          },
        ],
        [
          '@svgr/babel-plugin-add-jsx-attribute',
          {
            elements: ['svg', 'Svg'],
            attributes: [
              {
                name: 'style',
                value: '({ color: "inherit", ...props.style })',
                spread: false,
                literal: true,
                position: 'end',
              },
            ],
          },
          'add-style',
        ],
      ],
    },
  },
};
