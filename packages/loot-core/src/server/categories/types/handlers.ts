import {
    type CategoryEntity,
  } from '../../../types/models';
  
  type ValidationError = {
    conditionErrors: string[];
    actionErrors: string[];
  };
  
  export interface CategoryHandlers {
    'category-validate': (
      rule: Partial<CategoryEntity>,
    ) => Promise<{ error: ValidationError | null }>;
  
    'category-create': (
      rule: Omit<CategoryEntity, 'id'>,
    ) => Promise<{ error: ValidationError } | { id: string }>;
  
    'category-update': (
        rule: Partial<CategoryEntity>,
      ) => Promise<{ error: ValidationError } | object>;
  
    'category-move': (
        rule: Partial<CategoryEntity>,
      ) => Promise<{ error: ValidationError } | object>;
    
    'category-delete': (rule: CategoryEntity) => Promise<false | void>;
  
    'get-category-groups': (
        rule: Partial<CategoryEntity>,
      ) => Promise<{ error: ValidationError } | object>;
    
    'category-group-create': (
        rule: Partial<CategoryEntity>,
      ) => Promise<{ error: ValidationError } | object>;
    
    'category-group-update': (
        rule: Partial<CategoryEntity>,
      ) => Promise<{ error: ValidationError } | object>;
    
    'category-group-move': (
        rule: Partial<CategoryEntity>,
      ) => Promise<{ error: ValidationError } | object>;
    
    'category-group-delete': (
        rule: Partial<CategoryEntity>,
      ) => Promise<{ error: ValidationError } | object>;

    'must-category-transfer': (
        rule: Partial<CategoryEntity>,
      ) => Promise<{ error: ValidationError } | object>;
  }