import { bootstrap, getActiveLoginMethod, needsBootstrap } from '#account-db';
import { changePassword } from '#accounts/password';
import { resetWebAuthnCredential } from '#accounts/webauthn';
import { promptPassword } from '#util/prompt';

if (needsBootstrap()) {
  console.log(
    "It looks like you don't have a password set yet. Let's set one up now!",
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
} else if (getActiveLoginMethod() === 'webauthn') {
  console.log(
    "It looks like this server is using a passkey (WebAuthn) to log in. This script can't reset a passkey directly, but it can clear it so you can set up a new login method.",
  );

  try {
    resetWebAuthnCredential();
    console.log('Passkey cleared!');
    console.log(
      'Open Actual in your browser to set up a new password or passkey. All of your budget files and users are untouched.',
    );
  } catch (err) {
    console.log('Unexpected error:', err);
    console.log(
      'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
    );
    process.exit(1);
  }
} else {
  console.log("It looks like you already have a password set. Let's reset it!");
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
