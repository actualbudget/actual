import type { Paragraph, Root, PhrasingContent } from 'mdast';
import { newlineToBreak } from 'mdast-util-newline-to-break';
import type { Plugin, Transformer } from 'unified';
import { visit, type Visitor, type VisitorResult } from 'unist-util-visit';

export function sequentialNewlinesPlugin() {
  // Adapted from https://codesandbox.io/s/create-react-app-forked-h3rmcy?file=/src/sequentialNewlinePlugin.js:0-774
  const data = this.data();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function add(field: string, value: any) {
    const list = data[field] ? data[field] : (data[field] = []);

    list.push(value);
  }

  add('fromMarkdownExtensions', {
    enter: {
      lineEndingBlank: function enterLineEndingBlank(token: unknown) {
        this.enter(
          {
            type: 'break',
            value: '',
            data: {},
            children: [],
          },
          token,
        );
      },
    },
    exit: {
      lineEndingBlank: function exitLineEndingBlank(token: unknown) {
        this.exit(token);
      },
    },
  });
}

export function remarkBreaks() {
  return newlineToBreak;
}

export const directivesPlugin: Plugin<[], Root> = () => {
  const supportedDirectives = ['template', 'cleanup'];

  const label = (text: string) => {
    return {
      type: 'emphasis',
      data: {
        hName: 'div',
        hProperties: { class: 'md-directive-wrapper' },
      },
      children: [
        {
          type: 'emphasis',
          children: [
            {
              type: 'text',
              value: text,
            },
          ],
          data: {
            hName: 'span',
            hProperties: { class: 'md-directive' },
          },
        },
      ],
    } as PhrasingContent;
  };

  const visitor: Visitor<Paragraph> = (node, index, parent): VisitorResult => {
    if (!parent) return;
    const [child] = node.children;
    if (!child || child.type !== 'text' || !child.value) return;

    const lines = child.value.split('\n');
    const newChildren: PhrasingContent[] = [];
    lines.forEach(rawText => {
      const directive = supportedDirectives.find(dir =>
        rawText.startsWith(`#${dir} `),
      );

      if (!directive) {
        newChildren.push({
          type: 'text',
          value: rawText,
        });
      } else {
        const directiveText = rawText.substring(`#${directive} `.length);

        const labelText = `${directive[0].toUpperCase()}${directive.substring(
          1,
        )}: ${directiveText}`;
        newChildren.push(label(labelText));
      }
    });

    if (newChildren.length === 0) return;

    const newP: Paragraph = {
      type: 'paragraph',
      children: newChildren,
      data: {
        hName: 'div',
        hProperties: { class: 'md-directives-list' },
      },
    };

    const pIndex = parent.children.indexOf(node);
    if (pIndex !== -1) {
      parent.children.splice(pIndex, 1, newP);
    }
  };

  const transformer: Transformer<Root> = (tree, file) => {
    visit(tree, 'paragraph', visitor);
  };

  return transformer;
};
