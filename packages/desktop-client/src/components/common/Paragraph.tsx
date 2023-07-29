import { css } from 'glamor';

import { type HTMLPropsWithStyle } from '../../types/utils';

type ParagraphProps = HTMLPropsWithStyle<HTMLDivElement> & {
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
