import { type Options } from '@svgr/babel-preset';

const tmpl: Options['template'] = ({ imports, interfaces, componentName, props, jsx }, { tpl }) => {
  return tpl`
${imports};

${interfaces};

export const ${componentName} = (${props}) => (
  ${jsx}
);
`;
};

module.exports = tmpl;
