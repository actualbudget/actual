import { bootstrap, needsBootstrap } from '../account-db.js';
import { changePassword } from '../accounts/password.js';
import { promptPassword } from '../util/prompt.js';

if (needsBootstrap()) {
  console.log(
    'It looks like you don’t have a password set yet. Let’s set one up now!',
  );

  try {
    const password = await promptPassword();
    const { error } = await bootstrap({ password });
    if (error) {
      console.log('Error setting password:', error);
      console.log(
        'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
      );
      process.exit(1);
    }
    console.log('Password set!');
  } catch (err) {
    console.log('Unexpected error:', err);
    console.log(
      'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
    );
    process.exit(1);
  }
} else {
  console.log('It looks like you already have a password set. Let’s reset it!');
  try {
    const password = await promptPassword();
    const { error } = await changePassword(password);
    if (error) {
      console.log('Error changing password:', error);
      console.log(
        'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
      );
      process.exit(1);
    }
    console.log('Password changed!');
    console.log(
      'Note: you will need to log in with the new password on any browsers or devices that are currently logged in.',
    );
  } catch (err) {
    console.log('Unexpected error:', err);
    console.log(
      'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
    );
    process.exit(1);
  }
}
