import { type HTMLProps } from 'react';

import { css } from 'glamor';

import { type CSSProperties } from '../../style';

type ParagraphProps = HTMLProps<HTMLDivElement> & {
  style?: CSSProperties;
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
      className={`${css(!isLast && { marginBottom: 15 }, style, {
        lineHeight: '1.5em',
      })}`}
    >
      {children}
    </div>
  );
}
