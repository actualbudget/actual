import { type CSSProperties as ReactCSSProperties } from 'react';

export type CSSProperties = ReactCSSProperties & {
  [propertyName: string]: unknown;
};
