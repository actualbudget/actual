import { type HTMLProps, type CSSProperties } from 'react';

import { css } from '@emotion/css';

type ParagraphProps = HTMLProps<HTMLDivElement> & {
  style?: CSSProperties;
  isLast?: boolean;
};

export function Paragraph({
  style,
  isLast,
  children,
  ...props
}: ParagraphProps) {
  return (
    <div
      {...props}
      className={css([
        !isLast && { marginBottom: 15 },
        style,
        {
          lineHeight: '1.5em',
        },
      ])}
    >
      {children}
    </div>
  );
}
