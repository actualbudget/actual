import { type HTMLProps } from 'react';

import { css } from 'glamor';

type ParagraphProps = HTMLProps<HTMLDivElement> & {
  isLast?: boolean;
};

export default function Paragraph({
  style,
  isLast,
  children,
  ...props
}: ParagraphProps) {
  return (
    <div
      {...props}
      {...css(!isLast && { marginBottom: 15 }, style, { lineHeight: '1.5em' })}
    >
      {children}
    </div>
  );
}
