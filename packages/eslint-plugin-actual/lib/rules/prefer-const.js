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
    // Map of scope to Set of reassigned variable names in that scope
    const reassignedVariablesByScope = new Map();
    const letDeclarations = [];

    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    /**
     * Gets the scope for a node
     * @param {import('estree').Node} node
     * @returns {import('eslint').Scope.Scope | null}
     */
    function getScope(node) {
      try {
        return sourceCode.getScope(node);
      } catch {
        return null;
      }
    }

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
     * Marks a variable as reassigned in its scope
     * @param {string} name
     * @param {import('estree').Node} node
     */
    function markAsReassigned(name, node) {
      const scope = getScope(node);
      if (scope) {
        // Get the identifier being assigned
        let identifier = null;
        if (node.type === 'AssignmentExpression') {
          identifier = node.left.type === 'Identifier' ? node.left : null;
        } else if (node.type === 'UpdateExpression') {
          identifier =
            node.argument.type === 'Identifier' ? node.argument : null;
        }

        if (identifier) {
          // Use ESLint's scope analysis to find the variable being referenced
          // Search from the identifier's scope upward to find the variable
          let identifierScope = getScope(identifier);
          while (identifierScope) {
            const variable = identifierScope.variables.find(
              v => v.name === name,
            );
            if (variable) {
              // Found the variable - it's declared in identifierScope
              // (variables in a scope's variables array are declared in that scope)
              if (!reassignedVariablesByScope.has(identifierScope)) {
                reassignedVariablesByScope.set(identifierScope, new Set());
              }
              reassignedVariablesByScope.get(identifierScope).add(name);
              return;
            }
            identifierScope = identifierScope.upper;
          }
        }

        // Fallback: find variable in scope chain (for destructuring, etc.)
        let currentScope = scope;
        while (currentScope) {
          const variable = currentScope.variables.find(
            v => v.name === name && v.defs.length > 0,
          );
          if (variable) {
            // Variable is declared in currentScope (it's in currentScope.variables)
            if (!reassignedVariablesByScope.has(currentScope)) {
              reassignedVariablesByScope.set(currentScope, new Set());
            }
            reassignedVariablesByScope.get(currentScope).add(name);
            return;
          }
          currentScope = currentScope.upper;
        }
      }
    }

    /**
     * Checks if a variable is reassigned in its scope
     * @param {string} name
     * @param {import('eslint').Scope.Scope} variableScope
     * @returns {boolean}
     */
    function isReassignedInScope(name, variableScope) {
      const reassigned = reassignedVariablesByScope.get(variableScope);
      return reassigned ? reassigned.has(name) : false;
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
          markAsReassigned(name, node);
        } else {
          // Handle destructuring assignments: ({ x } = value) or [x] = value
          const patternNames = extractVariableNames(node.left);
          for (const patternName of patternNames) {
            markAsReassigned(patternName, node);
          }
        }
      },

      // Track update expressions (x++, x--, x += 1, etc.)
      UpdateExpression(node) {
        const name = getVariableName(node.argument);
        if (name) {
          markAsReassigned(name, node);
        }
      },

      // Track for loop initializers (let i = 0; i < 10; i++)
      'ForStatement:exit'(node) {
        if (node.init && node.init.type === 'VariableDeclaration') {
          for (const declarator of node.init.declarations) {
            const name = getVariableName(declarator.id);
            if (name) {
              markAsReassigned(name, node);
            }
          }
        }
        if (node.update) {
          const name = getVariableName(node.update);
          if (name) {
            markAsReassigned(name, node);
          }
        }
      },

      'ForInStatement:exit'(node) {
        if (node.left.type === 'VariableDeclaration') {
          for (const declarator of node.left.declarations) {
            const name = getVariableName(declarator.id);
            if (name) {
              markAsReassigned(name, node);
            }
          }
        }
      },

      'ForOfStatement:exit'(node) {
        if (node.left.type === 'VariableDeclaration') {
          for (const declarator of node.left.declarations) {
            const name = getVariableName(declarator.id);
            if (name) {
              markAsReassigned(name, node);
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
          const nodeScope = getScope(node);
          if (!nodeScope) continue;

          // Collect all variables in this declaration with their scopes
          // Variables declared in a VariableDeclaration are in the scope that contains that declaration
          const allVariablesInDeclaration = new Map();
          for (const declarator of node.declarations) {
            const variableNames = extractVariableNames(declarator.id);
            for (const name of variableNames) {
              // Find the variable in nodeScope (where it should be declared)
              // Use the scope where we actually find the variable
              let variableScope = nodeScope;
              const variable = nodeScope.variables.find(v => v.name === name);
              if (variable) {
                // Variable found in nodeScope - use nodeScope
                variableScope = nodeScope;
              } else {
                // Variable not found in nodeScope, search upward (shouldn't happen, but be safe)
                let currentScope = nodeScope.upper;
                while (currentScope) {
                  const foundVar = currentScope.variables.find(
                    v => v.name === name,
                  );
                  if (foundVar) {
                    variableScope = currentScope;
                    break;
                  }
                  currentScope = currentScope.upper;
                }
              }
              allVariablesInDeclaration.set(name, variableScope);
            }
          }

          // Check if all variables in this declaration can be const
          const allCanBeConst = Array.from(
            allVariablesInDeclaration.entries(),
          ).every(([name, varScope]) => !isReassignedInScope(name, varScope));

          // Check each declarator
          for (const declarator of node.declarations) {
            const variableNames = extractVariableNames(declarator.id);

            for (const variableName of variableNames) {
              // Get the scope for this variable
              const variableScope = allVariablesInDeclaration.get(variableName);
              if (!variableScope) continue;

              // Skip if the variable is reassigned in its scope
              if (isReassignedInScope(variableName, variableScope)) {
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
