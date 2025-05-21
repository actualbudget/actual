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
} from 'react-aria-components';

import { Popover } from './Popover';

import './colorpicker.scss';

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
        <Button className="color-picker">{children}</Button>
        <Popover placement="bottom">
          <Dialog className="color-picker-dialog">
            <ColorSwatchPicker />
          </Dialog>
        </Popover>
      </DialogTrigger>
    </AriaColorPicker>
  );
}
