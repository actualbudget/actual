import { parseArgs } from 'node:util';

import { getAccountDb } from '#account-db';
import { linkIdentity } from '#accounts/identity';
import { run } from '#migrations';

const { values } = parseArgs({
  options: {
    'user-id': { type: 'string' },
    provider: { type: 'string' },
    subject: { type: 'string' },
    list: { type: 'boolean' },
  },
});

try {
  await run('up');
  if (values.list) {
    console.table(
      getAccountDb().all(`
      SELECT users.id, user_name, role, provider, subject FROM users
      LEFT JOIN openid_identities ON users.id = openid_identities.user_id
      ORDER BY users.id
    `),
    );
  } else {
    const userId = values['user-id'];
    if (!userId || !values.provider || !values.subject) {
      throw new Error(
        'Use --user-id UUID --provider NAMESPACE --subject SUBJECT, or --list',
      );
    }
    linkIdentity(userId, {
      provider: values.provider,
      subject: values.subject,
    });
    console.log('Identity linked. Existing permissions are unchanged.');
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Identity mapping failed',
  );
  process.exitCode = 1;
}
