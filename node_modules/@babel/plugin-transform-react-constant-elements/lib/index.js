"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _core = require("@babel/core");

var _default = (0, _helperPluginUtils.declare)((api, options) => {
  api.assertVersion(7);
  const {
    allowMutablePropsOnTags
  } = options;

  if (allowMutablePropsOnTags != null && !Array.isArray(allowMutablePropsOnTags)) {
    throw new Error(".allowMutablePropsOnTags must be an array, null, or undefined.");
  }

  const HOISTED = new WeakMap();

  function declares(node, scope) {
    if (_core.types.isJSXIdentifier(node, {
      name: "this"
    }) || _core.types.isJSXIdentifier(node, {
      name: "arguments"
    }) || _core.types.isJSXIdentifier(node, {
      name: "super"
    }) || _core.types.isJSXIdentifier(node, {
      name: "new"
    })) {
      const {
        path
      } = scope;
      return path.isFunctionParent() && !path.isArrowFunctionExpression();
    }

    return scope.hasOwnBinding(node.name);
  }

  function isHoistingScope({
    path
  }) {
    return path.isFunctionParent() || path.isLoop() || path.isProgram();
  }

  function getHoistingScope(scope) {
    while (!isHoistingScope(scope)) scope = scope.parent;

    return scope;
  }

  const immutabilityVisitor = {
    enter(path, state) {
      const stop = () => {
        state.isImmutable = false;
        path.stop();
      };

      const skip = () => {
        path.skip();
      };

      if (path.isJSXClosingElement()) return skip();

      if (path.isJSXIdentifier({
        name: "ref"
      }) && path.parentPath.isJSXAttribute({
        name: path.node
      })) {
        return stop();
      }

      if (path.isJSXIdentifier() || path.isJSXMemberExpression() || path.isJSXNamespacedName() || path.isImmutable()) {
        return;
      }

      if (path.isIdentifier()) {
        const binding = path.scope.getBinding(path.node.name);
        if (binding && binding.constant) return;
      }

      const {
        mutablePropsAllowed
      } = state;

      if (mutablePropsAllowed && path.isFunction()) {
        path.traverse(targetScopeVisitor, state);
        return skip();
      }

      if (!path.isPure()) return stop();
      const expressionResult = path.evaluate();

      if (expressionResult.confident) {
        const {
          value
        } = expressionResult;

        if (mutablePropsAllowed || value === null || typeof value !== "object" && typeof value !== "function") {
          return skip();
        }
      } else if (_core.types.isIdentifier(expressionResult.deopt)) {
        return;
      }

      stop();
    }

  };
  const targetScopeVisitor = {
    ReferencedIdentifier(path, state) {
      const {
        node
      } = path;
      let {
        scope
      } = path;

      while (scope !== state.jsxScope) {
        if (declares(node, scope)) return;
        scope = scope.parent;
      }

      while (scope) {
        if (scope === state.targetScope) return;
        if (declares(node, scope)) break;
        scope = scope.parent;
      }

      state.targetScope = getHoistingScope(scope);
    }

  };
  const hoistingVisitor = Object.assign({}, immutabilityVisitor, targetScopeVisitor);
  return {
    name: "transform-react-constant-elements",
    visitor: {
      JSXElement(path) {
        var _jsxScope;

        if (HOISTED.has(path.node)) return;
        const name = path.node.openingElement.name;
        let mutablePropsAllowed = false;

        if (allowMutablePropsOnTags != null) {
          let lastSegment = name;

          while (_core.types.isJSXMemberExpression(lastSegment)) {
            lastSegment = lastSegment.property;
          }

          const elementName = lastSegment.name;
          mutablePropsAllowed = allowMutablePropsOnTags.includes(elementName);
        }

        let jsxScope;
        let current = path;

        while (!jsxScope && current.parentPath.isJSX()) {
          current = current.parentPath;
          jsxScope = HOISTED.get(current.node);
        }

        (_jsxScope = jsxScope) != null ? _jsxScope : jsxScope = path.scope;
        HOISTED.set(path.node, jsxScope);
        const visitorState = {
          isImmutable: true,
          mutablePropsAllowed,
          jsxScope,
          targetScope: path.scope.getProgramParent()
        };
        path.traverse(hoistingVisitor, visitorState);
        if (!visitorState.isImmutable) return;
        const {
          targetScope
        } = visitorState;

        for (let currentScope = jsxScope;;) {
          if (targetScope === currentScope) return;
          if (isHoistingScope(currentScope)) break;
          currentScope = currentScope.parent;

          if (!currentScope) {
            throw new Error("Internal @babel/plugin-transform-react-constant-elements error: " + "targetScope must be an ancestor of jsxScope. " + "This is a Babel bug, please report it.");
          }
        }

        const id = path.scope.generateUidBasedOnNode(name);
        targetScope.push({
          id: _core.types.identifier(id)
        });
        HOISTED.set(path.node, targetScope);
        let replacement = _core.template.expression.ast`
          ${_core.types.identifier(id)} || (${_core.types.identifier(id)} = ${path.node})
        `;

        if (path.parentPath.isJSXElement() || path.parentPath.isJSXAttribute()) {
          replacement = _core.types.jsxExpressionContainer(replacement);
        }

        path.replaceWith(replacement);
      }

    }
  };
});

exports.default = _default;