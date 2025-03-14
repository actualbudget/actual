// @ts-strict-ignore
const tmpl = ({ imports, interfaces, componentName, props, jsx }, { tpl }) => {
  return tpl`
${imports};

${interfaces};

export const ${componentName} = (${props}) => (
  ${jsx}
);
`;
};

module.exports = tmpl;
