import type { AccountEntity, CategoryEntity, CategoryGroupEntity, PayeeEntity } from '../types/models';
export type APIAccountEntity = Pick<AccountEntity, 'id' | 'name'> & {
    offbudget: boolean;
    closed: boolean;
};
export declare const accountModel: {
    toExternal(account: AccountEntity): APIAccountEntity;
    fromExternal(account: APIAccountEntity): AccountEntity;
    validate(account: AccountEntity, { update }?: {
        update?: boolean;
    }): AccountEntity;
};
export type APICategoryEntity = Pick<CategoryEntity, 'id' | 'name' | 'is_income' | 'hidden'> & {
    group_id?: string;
};
export declare const categoryModel: {
    toExternal(category: CategoryEntity): APICategoryEntity;
    fromExternal(category: APICategoryEntity): {
        id?: string;
        name: string;
        is_income?: boolean;
        cat_group?: string;
        sort_order?: number;
        tombstone?: boolean;
        hidden?: boolean;
    };
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
export type APICategoryGroupEntity = Pick<CategoryGroupEntity, 'id' | 'name' | 'is_income' | 'hidden'> & {
    categories: APICategoryEntity[];
};
export declare const categoryGroupModel: {
    toExternal(group: CategoryGroupEntity): APICategoryGroupEntity;
    fromExternal(group: APICategoryGroupEntity): CategoryGroupEntity;
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
export type APIPayeeEntity = Pick<PayeeEntity, 'id' | 'name' | 'transfer_acct'>;
export declare const payeeModel: {
    toExternal(payee: PayeeEntity): {
        id: string;
        name: string;
        transfer_acct: string;
    };
    fromExternal(payee: APIPayeeEntity): PayeeEntity;
    validate(payee: PayeeEntity, { update }?: {
        update?: boolean;
    }): PayeeEntity;
};
