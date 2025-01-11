import {
  disableOpenID,
  getActiveLoginMethod,
  needsBootstrap,
} from '../account-db.js';
import { promptPassword } from '../util/prompt.js';

if (needsBootstrap()) {
  console.log('System needs to be bootstrapped first. OpenID is not enabled.');

  process.exit(1);
} else {
  console.log('To disable OpenID, you have to enter your server password:');
  try {
    const loginMethod = getActiveLoginMethod();
    console.log(`Current login method: ${loginMethod}`);

    if (loginMethod === 'password') {
      console.log('OpenID already disabled.');
      process.exit(0);
    }

    const password = await promptPassword();
    const { error } = (await disableOpenID({ password })) || {};

    if (error) {
      console.log('Error disabling OpenID:', error);
      console.log(
        'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
      );
      process.exit(2);
    }
    console.log('OpenID disabled!');
    console.log(
      'Note: you will need to log in with the password on any browsers or devices that are currently logged in.',
    );
  } catch (err) {
    console.log('Unexpected error:', err);
    console.log(
      'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
    );
    process.exit(2);
  }
}
