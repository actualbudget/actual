import { ReactNode } from 'react';
import {
  Button,
  ColorPicker as AriaColorPicker,
  ColorPickerProps as AriaColorPickerProps,
  Dialog,
  DialogTrigger,
  ColorSwatch as AriaColorSwatch,
  ColorSwatchProps,
  ColorSwatchPicker as AriaColorSwatchPicker,
  ColorSwatchPickerItem,
  ColorField,
  Input,
} from 'react-aria-components';

import './colorpicker.scss';
import { css } from '@emotion/css';

import { SvgRefresh } from './icons/v1';
import { defaultInputStyle } from './Input';
import { Popover } from './Popover';
import { styles } from './styles';
import { theme } from './theme';

function ColorSwatch(props: ColorSwatchProps) {
  return (
    <AriaColorSwatch
      {...props}
      style={({ color }) => ({
        background: color.toString('hex'),
      })}
    />
  );
}

// colors from https://materialui.co/colors
const colorsets = [
  ['#D32F2F', '#C2185B', '#7B1FA2', '#512DA8', '#303F9F'],
  ['#1976D2', '#0288D1', '#0097A7', '#00796B', '#388E3C'],
  ['#689F38', '#AFB42B', '#FBC02D', '#FFA000', '#F57C00'],
  ['#E64A19', '#5D4037', '#616161', '#455A64', '#690CB0'],
];

function ColorSwatchPicker() {
  return (
    <>
      {colorsets.map((colors, idx) => (
        <AriaColorSwatchPicker key={`colorset-${idx}`}>
          {colors.map(color => (
            <ColorSwatchPickerItem key={color} color={color}>
              <ColorSwatch />
            </ColorSwatchPickerItem>
          ))}
        </AriaColorSwatchPicker>
      ))}
    </>
  );
}

interface ColorPickerProps extends AriaColorPickerProps {
  children?: ReactNode;
}

export function ColorPicker({ children, ...props }: ColorPickerProps) {
  return (
    <AriaColorPicker {...props}>
      <DialogTrigger>
        {children}
        <Popover placement="bottom">
          <Dialog className="color-picker-dialog">
            <ColorSwatchPicker />
            <ColorField>
              <Input
                className={css(
                  defaultInputStyle,
                  {
                    color: theme.formInputText,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    flexShrink: 0,
                    ':focus': {
                      border: '1px solid ' + theme.formInputBorderSelected,
                      boxShadow: '0 1px 1px ' + theme.formInputShadowSelected,
                    },
                    width: '100px',
                  },
                  styles.smallText,
                )}
              />
              <Button
                style={{
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                  margin: 'auto',
                }}
              >
                <SvgRefresh width={15} height={15} />
              </Button>
            </ColorField>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </AriaColorPicker>
  );
}
