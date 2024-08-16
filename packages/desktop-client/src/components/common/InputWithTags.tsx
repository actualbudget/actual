import React, {
  type InputHTMLAttributes,
  type KeyboardEvent,
  type Ref,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import ContentEditable from 'react-contenteditable';
import { renderToStaticMarkup } from 'react-dom/server';

import { css } from 'glamor';

import { type CSSProperties, styles, theme } from '../../style';
import { TagAutocomplete } from '../autocomplete/TagAutocomplete';
import { Popover } from './Popover';
import { View } from './View';
import { useTags } from '../../hooks/useTags';

export const defaultInputStyle = {
  outline: 0,
  backgroundColor: theme.tableBackground,
  color: theme.formInputText,
  margin: 0,
  padding: 5,
  borderRadius: 4,
  border: '1px solid ' + theme.formInputBorder,
};

type InputWithTagsProps = InputHTMLAttributes<HTMLDivElement> & {
  style?: CSSProperties;
  inputRef?: Ref<HTMLDivElement>;
  onEnter?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onEscape?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onChangeValue?: (newValue: string) => void;
  onUpdate?: (newValue: string) => void;
  focused?: boolean;
  value?: string;
};

export function InputWithTags({
  style,
  inputRef,
  onEnter,
  onEscape,
  onChangeValue,
  onUpdate,
  focused,
  value = '',
  ...nativeProps
}: InputWithTagsProps) {
  const tags = useTags();
  const generateTags = text => {
    return text.replace(/(#\w[\w-]*)(?=\s|$|\#)/g, (match, p1) => {
      const filteredTags = tags.filter(t => t.tag == p1);

      return renderToStaticMarkup(
        <span
          title={p1}
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
              filteredTags.length > 0
                ? filteredTags[0].color ?? theme.noteTagBackground
                : theme.noteTagBackground,
            color: filteredTags[0].textColor ?? theme.noteTagText,
            cursor: 'pointer',
          }}
        >
          {p1}
        </span>,
      );
    });
  };
  const [content, setContent] = useState(
    nativeProps.defaultValue
      ? generateTags(nativeProps.defaultValue)
      : value || '',
  );
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const triggerRef = useRef(null);
  const edit = useRef(null);
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (content) {
      if (onChangeValue) {
        onChangeValue?.(edit.current?.textContent);
      }

      if (onUpdate) {
        onUpdate?.(edit.current?.textContent);
      }
      updateHint();
    }
  }, [content]);

  const onContentChange = useCallback(
    evt => {
      let updatedContent = evt.currentTarget.innerText;
      updatedContent = updatedContent.replace('\r\n', '').replace('\n', '');
      //just a hack to make it work without mega refactory. should use evt.currentTarget.innerText where needed
      evt.currentTarget.value = updatedContent;

      updatedContent = generateTags(updatedContent);

      setContent(updatedContent);
      onChangeValue?.(evt.currentTarget.innerText);
    },
    [onChangeValue],
  );

  const handleSetCursorPosition = () => {
    const el = edit.current;
    if (!el) return;

    const range = document.createRange();
    const selection = window.getSelection();

    range.selectNodeContents(el); // Select the entire content
    range.collapse(false); // Collapse the range to the end point (cursor at the end)

    selection.removeAllRanges();
    selection.addRange(range);
  };

  const updateHint = () => {
    const el = edit.current;
    if (!el) return;

    const cursorPosition = getCaretPosition(el);
    const textBeforeCursor = el.textContent.slice(0, cursorPosition);

    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    if (lastHashIndex === -1) {
      setHint('');
      return;
    }

    const newHint = textBeforeCursor.slice(lastHashIndex + 1, cursorPosition);
    setHint(newHint);
  };

  useEffect(() => {
    if (value !== '') {
      setContent(generateTags(value));
    } else {
      setContent('');
      setHint('');
    }
  }, [value]);

  return (
    <View
      ref={triggerRef}
      {...nativeProps}
      className={`${css(
        defaultInputStyle,
        {
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          flexShrink: 0,
          ':focus': {
            border: '1px solid ' + theme.formInputBorderSelected,
            boxShadow: '0 1px 1px ' + theme.formInputShadowSelected,
          },
          '::placeholder': { color: theme.formInputTextPlaceholder },
        },
        styles.smallText,
        style,
      )}`}
    >
      <ContentEditable
        innerRef={edit}
        style={{
          all: 'unset',
        }}
        onKeyDown={e => {
          nativeProps.onKeyDown?.(e);

          if (e.key === 'Enter' && onEnter) {
            onEnter(e);
            setShowAutocomplete(false);
            e.preventDefault();
            e.stopPropagation();
          }

          if (e.key === 'Escape' && onEscape) {
            onEscape(e);
            setShowAutocomplete(false);
          }

          if (e.key === ' ') {
            setShowAutocomplete(false);
          }

          if (e.key === '#') {
            setShowAutocomplete(true);
          }

          if (e.key === 'Backspace') {
            if (!edit.current.textContent.includes('#')) {
              setShowAutocomplete(false);
            }
          }

          if (showAutocomplete) {
            updateHint();
          }

          onContentChange(e);
        }}
        onBlur={e => {
          onUpdate?.(e.target.innerText);
          onContentChange(e);
          nativeProps.onBlur?.(e);
        }}
        onInput={e => {
          onContentChange(e);

          if (showAutocomplete) {
            updateHint(); // Update hint after the content is modified
          }
        }}
        onChange={e => {
          onContentChange(e);
        }}
        html={content}
      />
      <Popover
        triggerRef={triggerRef}
        isOpen={showAutocomplete}
        shouldCloseOnInteractOutside={() => true}
        placement="bottom start"
      >
        <TagAutocomplete
          hint={hint} // Pass the dynamically updated hint
          clickedOnIt={() => setShowAutocomplete(false)}
          onMenuSelect={item => {
            setShowAutocomplete(false);
            const el = edit.current;
            const cursorPosition = getCaretPosition(el);
            const textBeforeCursor = el.textContent.slice(0, cursorPosition);

            const lastHashIndex = textBeforeCursor.lastIndexOf('#');
            if (lastHashIndex === -1) {
              return;
            }

            // Replace the hint with the selected tag
            const newContent = generateTags(
              textBeforeCursor.slice(0, lastHashIndex) +
                item?.tag +
                el.textContent.slice(cursorPosition),
            );

            setContent(generateTags(newContent));
            handleSetCursorPosition(); // Move cursor to the end of the new content
          }}
        />
      </Popover>
    </View>
  );
}

export function BigInputWithTags(props: InputWithTagsProps) {
  return (
    <InputWithTags
      {...props}
      style={{
        padding: 10,
        fontSize: 15,
        border: 'none',
        ...styles.shadow,
        ':focus': { border: 'none', ...styles.shadow },
        ...props.style,
      }}
    />
  );
}

export function getCaretPosition(editableDiv) {
  const selection = window.getSelection();
  let caretPos = 0;

  if (selection.rangeCount) {
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editableDiv);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretPos = preCaretRange.toString().length;
  }

  return caretPos;
}
