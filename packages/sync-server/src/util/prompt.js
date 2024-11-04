import { createInterface, cursorTo } from 'node:readline';

export async function prompt(message) {
  let rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let promise = new Promise((resolve) => {
    rl.question(message, (answer) => {
      resolve(answer);
      rl.close();
    });
  });

  let answer = await promise;

  return answer;
}

export async function promptPassword() {
  let password = await askForPassword('Enter a password, then press enter: ');

  if (password === '') {
    console.log('Password cannot be empty.');
    return promptPassword();
  }

  let password2 = await askForPassword(
    'Enter the password again, then press enter: ',
  );

  if (password !== password2) {
    console.log('Passwords do not match.');
    return promptPassword();
  }

  return password;
}

async function askForPassword(prompt) {
  let dataListener, endListener;

  let promise = new Promise((resolve) => {
    let result = '';
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    dataListener = (key) => {
      switch (key[0]) {
        case 0x03: // ^C
          process.exit();
          break;
        case 0x0d: // Enter
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve(result);
          break;
        case 0x7f: // Backspace
        case 0x08: // Delete
          if (result) {
            result = result.slice(0, -1);
            cursorTo(process.stdout, prompt.length + result.length);
            process.stdout.write(' ');
            cursorTo(process.stdout, prompt.length + result.length);
          }
          break;
        default:
          result += key;
          process.stdout.write('*');
          break;
      }
    };
    process.stdin.on('data', dataListener);

    endListener = () => resolve(result);
    process.stdin.on('end', endListener);
  });

  let answer = await promise;

  process.stdin.off('data', dataListener);
  process.stdin.off('end', endListener);

  process.stdout.write('\n');

  return answer;
}
