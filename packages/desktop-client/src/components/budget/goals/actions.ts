import { type Template } from 'loot-core/types/models/templates';

import { type DisplayTemplateType } from './constants';

type SET_TYPE = {
  type: 'set-type';
  payload: DisplayTemplateType;
};

type SET_TEMPLATE = {
  type: 'set-template';
  payload: Template;
};

type UPDATE_TEMPLATE = {
  type: 'update-template';
  payload: Partial<Template> & Pick<Template, 'type'>;
};

export const setType = (type: DisplayTemplateType): SET_TYPE => ({
  type: 'set-type' as const,
  payload: type,
});

export const setTemplate = (template: Template): SET_TEMPLATE => ({
  type: 'set-template' as const,
  payload: template,
});

export const updateTemplate = (
  template: Partial<Template> & Pick<Template, 'type'>,
): UPDATE_TEMPLATE => ({
  type: 'update-template' as const,
  payload: template,
});

export type Action = SET_TYPE | SET_TEMPLATE | UPDATE_TEMPLATE;
