module.exports = {
  svgoConfig: {
    plugins: [{ removeUnknownsAndDefaults: false }]
  },
  jsx: {
    babelConfig: {
      plugins: [
        [
          './add-attribute',
          {
            elements: ['path', 'Path', 'rect', 'Rect'],
            attributes: [
              {
                name: 'fill',
                value: 'currentColor',
                spread: false,
                literal: false,
                position: 'end'
              }
            ]
          }
        ],
        [
          '@svgr/babel-plugin-add-jsx-attribute',
          {
            elements: ['svg', 'Svg'],
            attributes: [
              {
                name: 'style',
                value: '({ color: "#242134", ...props.style })',
                spread: false,
                literal: true,
                position: 'end'
              }
            ]
          },
          'add-style'
        ]
      ]
    }
  }
};
