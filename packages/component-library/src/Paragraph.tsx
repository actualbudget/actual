import { type HTMLProps } from 'react';

import { css } from '@emotion/css';

import { type CSSProperties } from './styles';

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
