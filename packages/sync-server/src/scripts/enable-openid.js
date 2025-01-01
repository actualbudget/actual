import {
  enableOpenID,
  getActiveLoginMethod,
  needsBootstrap,
} from '../account-db.js';
import finalConfig from '../load-config.js';

if (needsBootstrap()) {
  console.log(
    'It looks like you don’t have a password set yet. Password is the fallback authentication method when using OpenID. Execute the command reset-password before using this command!',
  );

  process.exit(1);
} else {
  console.log('Enabling openid based on Environment variables or config.json');
  try {
    const loginMethod = getActiveLoginMethod();
    console.log(`Current login method: ${loginMethod}`);

    if (loginMethod === 'openid') {
      console.log('OpenID already enabled.');
      process.exit(0);
    }
    const { error } = (await enableOpenID(finalConfig)) || {};

    if (error) {
      console.log('Error enabling openid:', error);
      if (error === 'invalid-login-settings') {
        console.log(
          'Error configuring OpenID. Please verify that the configuration file or environment variables are correct.',
        );

        process.exit(1);
      } else {
        console.log(
          'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
        );

        process.exit(2);
      }
    }
    console.log('OpenID enabled!');
    console.log(
      'Note: The first user to login with OpenID will be the owner of the server.',
    );
  } catch (err) {
    console.log('Unexpected error:', err);
    console.log(
      'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
    );
    process.exit(2);
  }
}
