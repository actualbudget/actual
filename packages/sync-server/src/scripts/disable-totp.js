import { needsBootstrap } from '#account-db';
import { disableTotp, isTotpEnabled } from '#accounts/totp';

if (needsBootstrap()) {
  console.log(
    'System needs to be bootstrapped first. Two-factor authentication is not enabled.',
  );

  process.exit(1);
} else {
  try {
    if (!isTotpEnabled()) {
      console.log('Two-factor authentication is already disabled.');
      process.exit(0);
    }

    // No password prompt here: this is the lockout recovery path, and anyone
    // running it already has filesystem access to the server's database.
    disableTotp();

    console.log('Two-factor authentication disabled!');
    console.log(
      'Note: you can now log in with the server password alone. Re-enable it from Settings once you have your authenticator app working.',
    );
  } catch (err) {
    console.log('Unexpected error:', err);
    console.log(
      'Please report this as an issue: https://github.com/actualbudget/actual/issues',
    );
    process.exit(2);
  }
}
