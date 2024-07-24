import {
  type CategoryEntity,
  CategoryGroupEntity,
} from '../../../types/models';
import { APICategoryGroupEntity } from '../../api-models';

type ValidationError = {
  conditionErrors: string[];
  actionErrors: string[];
};

export interface CategoryHandlers {
  'get-categories': () => Promise<{
    grouped: Array<CategoryGroupEntity>;
    list: Array<CategoryEntity>;
  }>;

  'get-category-groups': () => Promise<Array<CategoryGroupEntity>>;

  'get-api-category-groups': () => Promise<Array<APICategoryGroupEntity>>;

  'category-validate': (
    category: Partial<CategoryEntity>,
  ) => Promise<{ error: ValidationError | null }>;

  'category-create': (arg: {
    name: string;
    groupId?: string;
    isIncome?: boolean;
    hidden?: boolean;
  }) => Promise<CategoryEntity>;

  'category-update': (category: Partial<CategoryEntity>) => Promise<{ error: ValidationError | object }>;

  'category-move': (arg: {
    id: string;
    groupId: string;
    targetId: string;
  }) => Promise<unknown>;

  'category-delete': (arg: {
    id: string;
    transferId?: string;
  }) => Promise<{ error?: string }>;

  'category-group-create': (arg: {
    name: string;
    isIncome?: boolean;
  }) => Promise<CategoryGroupEntity>;

  'category-group-update': (group: CategoryGroupEntity) => Promise<{ error: ValidationError | object }>;

  'category-group-move': (arg: {
    id: string;
    targetId: string;
  }) => Promise<unknown>;

  'category-group-delete': (arg: {
    id: string;
    transferId: string;
  }) => Promise<unknown>;

  'must-category-transfer': (arg: { id: string }) => Promise<{ error: ValidationError | object }>;
