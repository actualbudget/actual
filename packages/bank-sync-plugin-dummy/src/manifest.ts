// The manifest contract package is not available in this PR yet, so this uses
// unknown until the contract is introduced later in the stack.
// Once the contract is available, we will update the type accordingly.
export const manifest: unknown = {
  name: 'dummy-bank-sync',
  version: '0.0.1',
  description: 'Dummy bank sync provider for validating plugin loading.',
  type: 'syncserver',
};
