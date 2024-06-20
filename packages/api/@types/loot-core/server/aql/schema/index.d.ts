import { SchemaConfig } from '../compiler';
export declare const schema: {
    transactions: {
        id: {
            type: string;
        };
        is_parent: {
            type: string;
        };
        is_child: {
            type: string;
        };
        parent_id: {
            type: string;
        };
        account: {
            type: string;
        };
        category: {
            type: string;
        };
        amount: {
            type: string;
        };
        payee: {
            type: string;
        };
        notes: {
            type: string;
        };
        date: {
            type: string;
        };
        imported_id: {
            type: string;
        };
        error: {
            type: string;
        };
        imported_payee: {
            type: string;
        };
        starting_balance_flag: {
            type: string;
        };
        transfer_id: {
            type: string;
        };
        sort_order: {
            type: string;
        };
        cleared: {
            type: string;
        };
        reconciled: {
            type: string;
        };
        tombstone: {
            type: string;
        };
        schedule: {
            type: string;
        };
    };
    payees: {
        id: {
            type: string;
        };
        name: {
            type: string;
        };
        transfer_acct: {
            type: string;
        };
        tombstone: {
            type: string;
        };
    };
    accounts: {
        id: {
            type: string;
        };
        name: {
            type: string;
        };
        offbudget: {
            type: string;
        };
        closed: {
            type: string;
        };
        sort_order: {
            type: string;
        };
        tombstone: {
            type: string;
        };
        account_sync_source: {
            type: string;
        };
    };
    categories: {
        id: {
            type: string;
        };
        name: {
            type: string;
        };
        is_income: {
            type: string;
        };
        hidden: {
            type: string;
        };
        group: {
            type: string;
        };
        sort_order: {
            type: string;
        };
        tombstone: {
            type: string;
        };
    };
    category_groups: {
        id: {
            type: string;
        };
        name: {
            type: string;
        };
        is_income: {
            type: string;
        };
        hidden: {
            type: string;
        };
        sort_order: {
            type: string;
        };
        tombstone: {
            type: string;
        };
    };
    schedules: {
        id: {
            type: string;
        };
        name: {
            type: string;
        };
        rule: {
            type: string;
        };
        next_date: {
            type: string;
        };
        completed: {
            type: string;
        };
        posts_transaction: {
            type: string;
        };
        tombstone: {
            type: string;
        };
        _payee: {
            type: string;
        };
        _account: {
            type: string;
        };
        _amount: {
            type: string;
        };
        _amountOp: {
            type: string;
        };
        _date: {
            type: string;
        };
        _conditions: {
            type: string;
        };
        _actions: {
            type: string;
        };
    };
    rules: {
        id: {
            type: string;
        };
        stage: {
            type: string;
        };
        conditions_op: {
            type: string;
        };
        conditions: {
            type: string;
        };
        actions: {
            type: string;
        };
        tombstone: {
            type: string;
        };
    };
    notes: {
        id: {
            type: string;
        };
        note: {
            type: string;
        };
    };
    transaction_filters: {
        id: {
            type: string;
        };
        name: {
            type: string;
        };
        conditions_op: {
            type: string;
        };
        conditions: {
            type: string;
        };
        tombstone: {
            type: string;
        };
    };
    custom_reports: {
        id: {
            type: string;
        };
        name: {
            type: string;
        };
        start_date: {
            type: string;
        };
        end_date: {
            type: string;
        };
        date_static: {
            type: string;
        };
        date_range: {
            type: string;
        };
        mode: {
            type: string;
        };
        group_by: {
            type: string;
        };
        balance_type: {
            type: string;
        };
        show_empty: {
            type: string;
        };
        show_offbudget: {
            type: string;
        };
        show_hidden: {
            type: string;
        };
        show_uncategorized: {
            type: string;
        };
        include_current: {
            type: string;
        };
        selected_categories: {
            type: string;
        };
        graph_type: {
            type: string;
        };
        conditions: {
            type: string;
        };
        conditions_op: {
            type: string;
        };
        metadata: {
            type: string;
        };
        interval: {
            type: string;
        };
        color_scheme: {
            type: string;
        };
        tombstone: {
            type: string;
        };
    };
    reflect_budgets: {
        id: {
            type: string;
        };
        month: {
            type: string;
        };
        category: {
            type: string;
        };
        amount: {
            type: string;
        };
        carryover: {
            type: string;
        };
        goal: {
            type: string;
        };
    };
    zero_budgets: {
        id: {
            type: string;
        };
        month: {
            type: string;
        };
        category: {
            type: string;
        };
        amount: {
            type: string;
        };
        carryover: {
            type: string;
        };
        goal: {
            type: string;
        };
    };
};
export declare const schemaConfig: SchemaConfig;
