exports.exec = async (command, env = null) => {
  await executeShellCmdWithOptions(command, env)
    .then(msg => console.log(msg))
    .catch(err => console.error(err));
};

async function executeShellCmdWithOptions(command, env) {
  const spawn = require('child_process').spawn;

  let runArg = '-C'; // for bash
  let shell = '/bin/bash';

  if (process.platform === 'win32') {
    runArg = '/C'; // for cmd.exe
    shell = process.env.comspec;
  }

  let envOut = process.env;
  if (env != null) {
    envOut = { ...process.env, ...env };
  }

  const childProcess = spawn(shell, [runArg, command], {
    stdio: 'inherit',
    env: envOut,
  });

  return new Promise((resolve, reject) => {
    childProcess.on('error', function (error) {
      reject({ code: 1, error: error });
    });

    childProcess.on('close', function (code) {
      if (code > 0) {
        reject({ code: code, error: 'Command failed with code ' + code });
      } else {
        resolve({ code: code });
      }
    });
    childProcess.on('exit', function (code) {
      if (code > 0) {
        reject({ code: code, error: 'Command failed with code ' + code });
      } else {
        resolve({ code: code });
      }
    });
  });
}
