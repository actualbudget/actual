const { spawn } = require('child_process');

async function executeShellCmdWithOptions(command, env) {
  let runArg = (process.platform === 'win32') ? '/C' : '-c';
  let envOut = (env != null) ? { ...process.env, ...env } : process.env;
  let shell = (process.platform === 'win32') ? process.env.comspec : '/bin/bash';
  let opts = { stdio: 'inherit', env: envOut };

  const childProcess = spawn(shell, [runArg, command], opts);

  let handleResult = (resolve, reject, code) => {
    if (code > 0) {
      reject({ code: code, error: 'Command failed with code ' + code });
    } else {
      resolve({ code: code });
    }
  }

  return new Promise((resolve, reject) => {
    childProcess.on('error', function (error) {
      reject({ code: 1, error: error });
    });
    childProcess.on('close', function (code) {
      handleResult(resolve, reject, code);
    });
    childProcess.on('exit', function (code) {
      handleResult(resolve, reject, code);
    });
  });
}

exports.exec = async (command, env = null) => {
  await executeShellCmdWithOptions(command, env)
    .then(msg => console.log(msg))
    .catch(err => console.error(err));
};