//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require `const` declarations for variables that are never reassigned after declared',
    },
    fixable: 'code',
    schema: [],
    messages: {
      useConst: "'{{name}}' is never reassigned. Use 'const' instead.",
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    const reassignedVariables = new Set();
    const letDeclarations = [];

    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    /**
     * Gets the variable name from an identifier node
     * @param {import('estree').Node} node
     * @returns {string | null}
     */
    function getVariableName(node) {
      if (node.type === 'Identifier') {
        return node.name;
      }
      return null;
    }

    /**
     * Extracts all variable names from a pattern (handles destructuring)
     * @param {import('estree').Pattern} pattern
     * @returns {string[]}
     */
    function extractVariableNames(pattern) {
      const names = [];
      if (pattern.type === 'Identifier') {
        names.push(pattern.name);
      } else if (pattern.type === 'ObjectPattern') {
        for (const prop of pattern.properties) {
          if (prop.type === 'Property') {
            if (prop.value.type === 'Identifier') {
              names.push(prop.value.name);
            } else if (
              prop.value.type === 'ObjectPattern' ||
              prop.value.type === 'ArrayPattern'
            ) {
              names.push(...extractVariableNames(prop.value));
            }
          } else if (prop.type === 'RestElement') {
            names.push(...extractVariableNames(prop.argument));
          }
        }
      } else if (pattern.type === 'ArrayPattern') {
        for (const element of pattern.elements) {
          if (element) {
            if (element.type === 'Identifier') {
              names.push(element.name);
            } else if (
              element.type === 'ObjectPattern' ||
              element.type === 'ArrayPattern'
            ) {
              names.push(...extractVariableNames(element));
            } else if (element.type === 'RestElement') {
              names.push(...extractVariableNames(element.argument));
            }
          }
        }
      } else if (pattern.type === 'RestElement') {
        names.push(...extractVariableNames(pattern.argument));
      }
      return names;
    }

    /**
     * Creates a fixer to change `let` to `const`
     * @param {import('estree').VariableDeclaration} node
     * @returns {import('eslint').Rule.ReportFixer}
     */
    function makeFixer(node) {
      return fixer => {
        const letToken = sourceCode.getFirstToken(node, {
          filter: token => token.value === 'let',
        });
        if (letToken) {
          return fixer.replaceText(letToken, 'const');
        }
        return null;
      };
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      // Track assignments to variables
      AssignmentExpression(node) {
        // Handle simple assignments: x = value
        const name = getVariableName(node.left);
        if (name) {
          reassignedVariables.add(name);
        } else {
          // Handle destructuring assignments: ({ x } = value) or [x] = value
          const patternNames = extractVariableNames(node.left);
          for (const patternName of patternNames) {
            reassignedVariables.add(patternName);
          }
        }
      },

      // Track update expressions (x++, x--, x += 1, etc.)
      UpdateExpression(node) {
        const name = getVariableName(node.argument);
        if (name) {
          reassignedVariables.add(name);
        }
      },

      // Track for loop initializers (let i = 0; i < 10; i++)
      'ForStatement:exit'(node) {
        if (node.init && node.init.type === 'VariableDeclaration') {
          for (const declarator of node.init.declarations) {
            const name = getVariableName(declarator.id);
            if (name) {
              reassignedVariables.add(name);
            }
          }
        }
        if (node.update) {
          const name = getVariableName(node.update);
          if (name) {
            reassignedVariables.add(name);
          }
        }
      },

      'ForInStatement:exit'(node) {
        if (node.left.type === 'VariableDeclaration') {
          for (const declarator of node.left.declarations) {
            const name = getVariableName(declarator.id);
            if (name) {
              reassignedVariables.add(name);
            }
          }
        }
      },

      'ForOfStatement:exit'(node) {
        if (node.left.type === 'VariableDeclaration') {
          for (const declarator of node.left.declarations) {
            const name = getVariableName(declarator.id);
            if (name) {
              reassignedVariables.add(name);
            }
          }
        }
      },

      // Collect all let declarations
      VariableDeclaration(node) {
        if (node.kind === 'let') {
          letDeclarations.push(node);
        }
      },

      // Check all let declarations at the end
      'Program:exit'() {
        for (const node of letDeclarations) {
          // Collect all variables in this declaration
          const allVariablesInDeclaration = new Set();
          for (const declarator of node.declarations) {
            const variableNames = extractVariableNames(declarator.id);
            for (const name of variableNames) {
              allVariablesInDeclaration.add(name);
            }
          }

          // Check if all variables in this declaration can be const
          const allCanBeConst = Array.from(allVariablesInDeclaration).every(
            name => !reassignedVariables.has(name),
          );

          // Check each declarator
          for (const declarator of node.declarations) {
            const variableNames = extractVariableNames(declarator.id);

            for (const variableName of variableNames) {
              // Skip if the variable is reassigned
              if (reassignedVariables.has(variableName)) {
                continue;
              }

              // Find the identifier node for this variable name
              let targetNode = declarator.id;
              if (declarator.id.type !== 'Identifier') {
                // For destructuring, find the specific identifier
                const findIdentifier = (pattern, name) => {
                  if (pattern.type === 'Identifier' && pattern.name === name) {
                    return pattern;
                  }
                  if (pattern.type === 'ObjectPattern') {
                    for (const prop of pattern.properties) {
                      if (prop.type === 'Property') {
                        const found = findIdentifier(prop.value, name);
                        if (found) return found;
                      } else if (prop.type === 'RestElement') {
                        const found = findIdentifier(prop.argument, name);
                        if (found) return found;
                      }
                    }
                  }
                  if (pattern.type === 'ArrayPattern') {
                    for (const element of pattern.elements) {
                      if (element) {
                        const found = findIdentifier(element, name);
                        if (found) return found;
                      }
                    }
                  }
                  if (pattern.type === 'RestElement') {
                    return findIdentifier(pattern.argument, name);
                  }
                  return null;
                };
                targetNode =
                  findIdentifier(declarator.id, variableName) || declarator.id;
              }

              // Report for this variable
              // Only provide a fix if all variables in the declaration can be const
              context.report({
                node: targetNode,
                messageId: 'useConst',
                data: {
                  name: variableName,
                },
                fix: allCanBeConst ? makeFixer(node) : null,
              });
            }
          }
        }
      },
    };
  },
};
