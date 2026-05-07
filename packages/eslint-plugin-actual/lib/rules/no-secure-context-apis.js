// Forbids usage of Web APIs that are only defined in secure contexts
// (HTTPS or localhost). Actual must keep working when self-hosted over
// plain HTTP, so introducing new direct uses of these APIs is a regression
// risk. The deny list is generated from `@mdn/browser-compat-data` by
// `lib/data/generate-secure-context-apis.mjs`.
//
// The rule fires on member access whose chain prefix matches a deny entry,
// and on `new Foo(...)` for constructors named in the deny list.

const denyPaths = require('../data/secure-context-apis.json');

// Index deny paths by their root identifier so we don't re-scan the whole
// list on every node. Each entry stores the parsed segments for prefix
// comparison.
const indexByRoot = new Map();
for (const entry of denyPaths) {
  const segments = entry.split('.');
  const [root] = segments;
  if (!indexByRoot.has(root)) indexByRoot.set(root, []);
  indexByRoot.get(root).push({ path: entry, segments });
}

function getMemberChain(node) {
  const parts = [];
  let cur = node;
  while (cur && cur.type === 'MemberExpression') {
    if (cur.computed) return null;
    if (!cur.property || cur.property.type !== 'Identifier') return null;
    parts.unshift(cur.property.name);
    cur = cur.object;
  }
  if (!cur || cur.type !== 'Identifier') return null;
  parts.unshift(cur.name);
  return parts;
}

function findMatch(chain) {
  const candidates = indexByRoot.get(chain[0]);
  if (!candidates) return null;
  for (const candidate of candidates) {
    if (candidate.segments.length > chain.length) continue;
    let matches = true;
    for (let i = 0; i < candidate.segments.length; i++) {
      if (candidate.segments[i] !== chain[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return candidate.path;
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid Web APIs that are only available in secure contexts; Actual must run over plain HTTP',
    },
    fixable: null,
    schema: [],
    messages: {
      secureContextOnly:
        '`{{path}}` is only available in secure contexts (HTTPS or localhost) and throws on plain HTTP. Actual must work in insecure contexts; do not introduce new direct uses.',
    },
  },

  createOnce(context) {
    return {
      MemberExpression(node) {
        // Only fire on the outermost MemberExpression of a chain so we don't
        // double-report nested accesses (e.g. navigator.clipboard.writeText
        // matches both `navigator.clipboard` and the longer chain).
        if (
          node.parent &&
          node.parent.type === 'MemberExpression' &&
          node.parent.object === node
        ) {
          return;
        }

        const chain = getMemberChain(node);
        if (!chain) return;

        const match = findMatch(chain);
        if (match) {
          context.report({
            node,
            messageId: 'secureContextOnly',
            data: { path: match },
          });
        }
      },
      NewExpression(node) {
        // `new Notification(...)`, `new PaymentRequest(...)`, etc. — a
        // bare-identifier constructor whose name is in the deny list.
        if (!node.callee || node.callee.type !== 'Identifier') return;
        const candidates = indexByRoot.get(node.callee.name);
        if (!candidates) return;
        const match = candidates.find(c => c.segments.length === 1);
        if (match) {
          context.report({
            node,
            messageId: 'secureContextOnly',
            data: { path: match.path },
          });
        }
      },
    };
  },
};
