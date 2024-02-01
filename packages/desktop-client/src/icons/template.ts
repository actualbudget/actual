// @ts-strict-ignore
const template = ({ imports, interfaces, componentName, props, jsx }, { tpl }) => {
  return tpl`
${imports};

${interfaces};

export const ${componentName} = (${props}) => (
  ${jsx}
);
`
}

module.exports = template