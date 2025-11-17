import { type Config } from '@svgr/core';

const tmpl: Config['template'] = ({ imports, interfaces, componentName, props, jsx }, { tpl }) => {
  return tpl`
${imports};

${interfaces};

export const ${componentName} = (${props}) => (
  ${jsx}
);
`;
};

module.exports = tmpl;
