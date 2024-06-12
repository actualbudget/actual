import React, {
  type InputHTMLAttributes,
  type KeyboardEvent,
  type Ref,
  useEffect,
  useState,
  useCallback,
} from 'react';
import ContentEditable from 'react-contenteditable';

import { css } from 'glamor';

import { type CSSProperties, styles, theme } from '../../style';

export const defaultInputStyle = {
  outline: 0,
  backgroundColor: theme.tableBackground,
  color: theme.formInputText,
  margin: 0,
  padding: 5,
  borderRadius: 4,
  border: '1px solid ' + theme.formInputBorder,
};

type InputProps = InputHTMLAttributes<HTMLDivElement> & {
  style?: CSSProperties;
  inputRef?: Ref<HTMLDivElement>;
  onEnter?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onEscape?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onChangeValue?: (newValue: string) => void;
  onUpdate?: (newValue: string) => void;
  focused?: boolean;
  value?: string;
};

export function Input({
  style,
  inputRef,
  onEnter,
  onEscape,
  onChangeValue,
  onUpdate,
  focused,
  value = '',
  ...nativeProps
}: InputProps) {
  const [content, setContent] = useState(value);

  const onContentChange = useCallback(
    evt => {
      let updatedContent = evt.currentTarget.innerText;
      //just a hack to make it work without mega refactory. should use evt.currentTarget.innerText where needed
      evt.currentTarget.value = updatedContent;

      updatedContent = generateTags(updatedContent);

      setContent(updatedContent);
      onChangeValue?.(evt.currentTarget.innerText);
    },
    [onChangeValue],
  );

  const generateTags = text => {
    return text.replace(/(#\w+)(?=\s|$)/g, (match, p1) => {
      return `<span style="
        background-color: #811331; 
        border-radius: 4px; 
        padding: 2px 4px;
      ">${p1}</span>`;
    });
  };

  useEffect(() => {
    if (value !== '') {
      setContent(generateTags(value));
    }
  },[value]);

  return (
    <ContentEditable
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
      {...nativeProps}
      onKeyDown={e => {
        nativeProps.onKeyDown?.(e);

        if (e.key === 'Enter' && onEnter) {
          onEnter(e);
        }

        if (e.key === 'Escape' && onEscape) {
          onEscape(e);
        }
      }}
      onBlur={e => {
        onUpdate?.(e.target.innerText);
        onContentChange(e);
        nativeProps.onBlur?.(e);
      }}
      onChange={e => {
        onContentChange(e);
      }}
      html={content}
    />
  );
}

export function BigInput(props: InputProps) {
  return (
    <Input
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
