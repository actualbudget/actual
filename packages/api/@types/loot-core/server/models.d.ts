import { AccountEntity, CategoryEntity, CategoryGroupEntity, PayeeEntity } from '../types/models';
export declare function requiredFields<T extends object, K extends keyof T>(name: string, row: T, fields: K[], update?: boolean): void;
export declare function toDateRepr(str: string): number;
export declare function fromDateRepr(number: number): string;
export declare const accountModel: {
    validate(account: AccountEntity, { update }?: {
        update?: boolean;
    }): AccountEntity;
};
export declare const categoryModel: {
    validate(category: CategoryEntity, { update }?: {
        update?: boolean;
    }): {
        hidden: number;
        id?: string;
        name: string;
        is_income?: boolean;
        cat_group?: string;
        tombstone?: boolean;
    };
};
export declare const categoryGroupModel: {
    validate(categoryGroup: CategoryGroupEntity, { update }?: {
        update?: boolean;
    }): {
        hidden: number;
        id?: string;
        name: string;
        is_income?: boolean;
        tombstone?: boolean;
        categories?: CategoryEntity[];
    };
};
export declare const payeeModel: {
    validate(payee: PayeeEntity, { update }?: {
        update?: boolean;
    }): PayeeEntity;
};
