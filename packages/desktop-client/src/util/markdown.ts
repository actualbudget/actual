// @ts-strict-ignore
import { newlineToBreak } from 'mdast-util-newline-to-break';

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
