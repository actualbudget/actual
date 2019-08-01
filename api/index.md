import { types, PrimitiveTypeList, PrimitiveType, StructType } from './types';

# API

This is something that I've been working on a lot.

## Types

Transaction

<PrimitiveTypeList />

<StructType
  name="Transaction"
  fields={[
    { name: 'account_id', type: types.id, description: 'poop' },
    { name: 'amount', type: types.amount, description: '' }
  ]}
/>
