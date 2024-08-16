import React, {
  type HTMLProps,
  type Ref,
  type ReactNode,
  forwardRef,
  useEffect,
  useState,
  useRef,
  Children,
} from 'react';

import { css } from 'glamor';

import { theme, type CSSProperties } from '../../style';
import { TAGREGEX } from 'loot-core/shared/tag';
import { useTags } from '../../hooks/useTags';
import { TagEntity } from 'loot-core/types/models/tag';

type TextProps = HTMLProps<HTMLSpanElement> & {
  innerRef?: Ref<HTMLSpanElement>;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
  textWithTags?: boolean;
};

const processText = (text: string, tags: TagEntity[]): ReactNode => {
  const [tagColors, setTagColors] = useState<Map<string, string>>(new Map());
  const [tagTextColors, setTagTextColors] = useState(new Map());

  useEffect(() => {
    const map = new Map<string, string>();
    const mapTextColor = new Map();

    text.split(TAGREGEX).forEach(part => {
      if (TAGREGEX.test(part)) {
        const filteredTags = tags.filter(t => t.tag == part);
        if (filteredTags.length > 0) {
          map.set(part, filteredTags[0].color ?? theme.noteTagBackground);
          mapTextColor.set(
            part,
            filteredTags[0].textColor ?? theme.noteTagText,
          );
        } else {
          map.set(part, theme.noteTagBackground);
          mapTextColor.set(part, theme.noteTagText);
        }
      }
    });

    setTagColors(map);
    setTagTextColors(mapTextColor);
  }, [tags]);

  const processedText = text.split(TAGREGEX).map((part, index) => {
    if (TAGREGEX.test(part)) {
      return (
        <span
          key={index}
          style={{
            display: 'inline-flex',
          }}
        >
          <span
            key={index}
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              padding: '3px 7px',
              borderRadius: 16,
              userSelect: 'none',
              textOverflow: 'ellipsis',
              maxWidth: '150px',
              backgroundColor: tagColors.get(part) ?? theme.noteTagBackground,
              color: tagTextColors.get(part) ?? theme.noteTagText,
              cursor: 'pointer',
            }}
          >
            {part}
          </span>
        </span>
      );
    }
    return part;
  });

  return processedText;
};

export const Text = forwardRef<HTMLSpanElement, TextProps>((props, ref) => {
  const {
    className = '',
    style,
    innerRef,
    children,
    textWithTags,
    ...restProps
  } = props;

  if (textWithTags) {
    return (
      <TextWithTags
        {...restProps}
        ref={innerRef ?? ref}
        className={className}
        style={style}
        innerRef={innerRef}
      >
        {children}
      </TextWithTags>
    );
  }

  return (
    <span
      {...restProps}
      style={{ textOverflow: (children?.toString().includes("#") ?? 'ellipsis') ? 'unset' : 'unset' }}
      ref={innerRef ?? ref}
      className={`${className} ${css(style)}`}
    >
      {children}
    </span>
  );
});

export const TextWithTags = forwardRef<HTMLSpanElement, TextProps>(
  (props, ref) => {
    const {
      className = '',
      style,
      innerRef,
      children,
      textWithTags,
      ...restProps
    } = props;

    const tags = useTags();

    return (
      <span
        {...restProps}
        ref={innerRef ?? ref}
        className={`${className} ${css(style)}`}
      >
        {typeof children === 'string' ? processText(children, tags) : children}
      </span>
    );
  },
);

Text.displayName = 'Text';
