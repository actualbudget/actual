import { type Template } from 'loot-core/server/budget/types/templates';

import { type VisualTemplateType } from './constants';

type SET_TYPE = {
  type: 'set-type';
  payload: VisualTemplateType;
};

type Limit = {
  amount: number;
  hold: boolean;
};

type SET_LIMIT = {
  type: 'set-limit';
  payload?: Partial<Limit>;
};

type UPDATE_TEMPLATE = {
  type: 'update-template';
  payload: Partial<Template>;
};

export const setType = (type: VisualTemplateType): SET_TYPE => ({
  type: 'set-type' as const,
  payload: type,
});

export const setLimit = (limit?: Partial<Limit>) => ({
  type: 'set-limit' as const,
  payload: limit,
});

export const updateTemplate = (
  template: Partial<Template>,
): UPDATE_TEMPLATE => ({
  type: 'update-template' as const,
  payload: template,
});

export type Action = SET_TYPE | SET_LIMIT | UPDATE_TEMPLATE;
