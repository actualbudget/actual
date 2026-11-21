// Usage:
//   CI:    PR_BODY=... CHANGED_FILES=$'a\nb' node pr-description-check.mjs
//   Agent: printf '%s' "$body" | node pr-description-check.mjs --agent
import * as fs from 'node:fs';

import { checkPrDescription } from '../src/pr-description/check.mjs';

const isAgent = process.argv.includes('--agent');

const errors = checkPrDescription(
  isAgent ? fs.readFileSync(0, 'utf-8') : (process.env.PR_BODY ?? ''),
  {
    isAgent,
    changedFiles: (process.env.CHANGED_FILES ?? '').split('\n').filter(Boolean),
  },
);

for (const error of errors) {
  console.error(isAgent ? `- ${error}` : `::error::${error}`);
}
if (errors.length > 0) {
  if (!isAgent) {
    console.error(
      'Edit the pull request description to fix this; the check re-runs automatically. See https://actualbudget.org/docs/contributing/ai-usage-policy',
    );
  }
  process.exit(1);
}
