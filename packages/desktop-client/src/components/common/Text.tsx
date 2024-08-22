import React, {
  type HTMLProps,
  type Ref,
  type ReactNode,
  forwardRef,
  useEffect,
  useState,
} from 'react';

import { css } from 'glamor';

import { extractAllTags } from '../../../../loot-core/src/shared/tag';
import { type TagEntity } from '../../../../loot-core/src/types/models/tag';
import { useTags } from '../../hooks/useTags';
import { theme, type CSSProperties } from '../../style';

type TextProps = HTMLProps<HTMLSpanElement> & {
  innerRef?: Ref<HTMLSpanElement>;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
  textWithTags?: boolean;
};

const ProcessText = (text: string, tags: TagEntity[]): ReactNode => {
  const [tagColors, setTagColors] = useState<Map<string, string>>(new Map());
  const [tagTextColors, setTagTextColors] = useState(new Map());

  useEffect(() => {
    const map = new Map<string, string>();
    const mapTextColor = new Map();

    const extractedTags = extractAllTags(text);

    extractedTags.forEach(tag => {
      const filteredTags = tags.filter(t => t.tag === tag);
      if (filteredTags.length > 0) {
        map.set(tag, filteredTags[0].color ?? theme.noteTagBackground);
        mapTextColor.set(tag, filteredTags[0].textColor ?? theme.noteTagText);
      } else {
        map.set(tag, theme.noteTagBackground);
        mapTextColor.set(tag, theme.noteTagText);
      }
    });

    setTagColors(map);
    setTagTextColors(mapTextColor);
  }, [tags, text]);

  const words = text.split(' ');

  return (
    <>
      {words.map((word, i, arr) => {
        const separator = arr.length - 1 === i ? '' : ' ';
        if (word.includes('#') && word.length > 1) {
          let lastEmptyTag = -1;
          // Treat tags in a single word as separate tags.
          // #tag1#tag2 => (#tag1)(#tag2)
          // not-a-tag#tag2#tag3 => not-a-tag(#tag2)(#tag3)
          return word.split('#').map((tag, ti) => {
            if (ti === 0) {
              return tag;
            }

            if (!tag) {
              lastEmptyTag = ti;
              return '#';
            }

            if (lastEmptyTag === ti - 1) {
              return `${tag} `;
            }
            lastEmptyTag = -1;

            const validTag = `#${tag}`;

            return (
              <span
                key={`${validTag}${ti}`}
                style={{
                  display: 'inline-flex',
                }}
              >
                <span
                  key={ti}
                  style={{
                    display: 'inline-block',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    padding: '3px 7px',
                    borderRadius: 16,
                    userSelect: 'none',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px',
                    backgroundColor:
                      tagColors.get(validTag) ?? theme.noteTagBackground,
                    color: tagTextColors.get(validTag) ?? theme.noteTagText,
                    cursor: 'pointer',
                  }}
                >
                  {validTag}
                </span>
                {separator}
              </span>
            );
          });
        }
        return `${word}${separator}`;
      })}
    </>
  );
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
      ref={innerRef ?? ref}
      className={`${className} ${css(style)}`}
    >
      {children}
    </span>
  );
});

const TextWithTags = forwardRef<HTMLSpanElement, TextProps>((props, ref) => {
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
      {typeof children === 'string' ? ProcessText(children, tags) : children}
    </span>
  );
});

Text.displayName = 'Text';
TextWithTags.displayName = 'TextWithTags';
