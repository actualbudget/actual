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

import './colorpicker.scss';
import { Popover } from './Popover';

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
  ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5'],
  ['#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50'],
  ['#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800'],
  ['#FF5722', '#795548', '#9E9E9E', '#607D8B', '#000000'],
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
