import { type VisualTemplateType } from './constants';

type SET_TYPE = {
  type: 'set-type';
  payload: VisualTemplateType;
};

export const setType = (type: VisualTemplateType): SET_TYPE => ({
  type: 'set-type',
  payload: type,
});

export type Action = SET_TYPE;
