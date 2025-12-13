import { ChangeEvent, ReactNode } from 'react';
import {
  ColorPicker as AriaColorPicker,
  ColorPickerProps as AriaColorPickerProps,
  Dialog,
  DialogTrigger,
  ColorSwatch as AriaColorSwatch,
  ColorSwatchProps,
  ColorSwatchPicker as AriaColorSwatchPicker,
  ColorSwatchPickerItem,
  ColorField,
  parseColor,
} from 'react-aria-components';

import { theme as themeStyle } from '@actual-app/components/theme';
import { useTheme } from '@desktop-client/style';
import { css } from '@emotion/css';

import { Input } from './Input';
import { Popover } from './Popover';

const [theme] = useTheme();

function ColorSwatch(props: ColorSwatchProps) {
  return (
    <AriaColorSwatch
      {...props}
      style={({ color }) => ({
        background: color.toString('hex'),
        width: '32px',
        height: '32px',
        borderRadius: '4px',
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.1)',
      })}
    />
  );
}

// dark theme colors from https://materialui.co/colors light theme colors HSL lightness 0.90
if (theme === 'auto') {
    theme = window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }

const DEFAULT_COLOR_SET = [
  '#690CB0',
  '#D32F2F',
  '#C2185B',
  '#7B1FA2',
  '#512DA8',
  '#303F9F',
  '#1976D2',
  '#0288D1',
  '#0097A7',
  '#00796B',
  '#388E3C',
  '#689F38',
  '#AFB42B',
  '#FBC02D',
  '#FFA000',
  '#F57C00',
  '#E64A19',
  '#5D4037',
  '#616161',
  '#455A64',
];

if (theme === 'light') {
  const DEFAULT_COLOR_SET = [
    '#F2EBFE',
    '#F8E3E3',
    '#F6DDE7',
    '#E9DBEF',
    '#E1DBEE',
    '#DDDFED',
    '#D5E5F6',
    '#D6EAF6',
    '#D9EEF0',
    '#DFEDEC',
    '#DEEBDE',
    '#E4EDDD',
    '#F0F0DB',
    '#FDEFD0',
    '#FFECCC',
    '#FCE6D1',
    '#FADAD1',
    '#E8E4E4',
    '#E6E6E6',
    '#E2E6E7',
  ];
}

interface ColorSwatchPickerProps {
  columns?: number;
  colorset?: string[];
}

function ColorSwatchPicker({
  columns = 5,
  colorset = DEFAULT_COLOR_SET,
}: ColorSwatchPickerProps) {
  const pickers = [];

  for (let l = 0; l < colorset.length / columns; l++) {
    const pickerItems = [];

    for (let c = 0; c < columns; c++) {
      const color = colorset[columns * l + c];
      if (!color) {
        break;
      }

      pickerItems.push(
        <ColorSwatchPickerItem
          key={color}
          color={color}
          className={css({
            position: 'relative',
            outline: 'none',
            borderRadius: '4px',
            width: 'fit-content',
            forcedColorAdjust: 'none',
            cursor: 'pointer',

            '&[data-selected]::after': {
              // eslint-disable-next-line actual/typography
              content: '""',
              position: 'absolute',
              inset: 0,
              border: '2px solid black',
              outline: '2px solid white',
              outlineOffset: '-4px',
              borderRadius: 'inherit',
            },
          })}
        >
          <ColorSwatch />
        </ColorSwatchPickerItem>,
      );
    }

    pickers.push(
      <AriaColorSwatchPicker
        key={`colorset-${l}`}
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {pickerItems}
      </AriaColorSwatchPicker>,
    );
  }

  return pickers;
}
const isColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

interface ColorPickerProps extends AriaColorPickerProps {
  children?: ReactNode;
  columns?: number;
  colorset?: string[];
}

export function ColorPicker({
  children,
  columns,
  colorset,
  ...props
}: ColorPickerProps) {
  const onInput = (value: string) => {
    if (!isColor(value)) {
      return;
    }

    const color = parseColor(value);
    if (color) {
      props.onChange?.(color);
    }
  };

  return (
    <AriaColorPicker defaultValue={props.defaultValue ?? '#690CB0'} {...props}>
      <DialogTrigger>
        {children}
        <Popover>
          <Dialog
            style={{
              outline: 'none',
              padding: '15px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minWidth: '192px',
              maxHeight: 'inherit',
              boxSizing: 'border-box',
              overflow: 'auto',
            }}
          >
            <ColorSwatchPicker columns={columns} colorset={colorset} />
            <ColorField
              onInput={({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
                onInput(value)
              }
            >
              <Input placeholder="#RRGGBB" style={{ width: '100px' }} />
            </ColorField>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </AriaColorPicker>
  );
}
