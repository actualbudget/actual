
exports.executeShellCmd = (command, env=null) => {
  executeShellCmdWithOptions(command, env)
    .then((msg) => console.log(msg))
    .catch((err) => console.error(err));
};

async function executeShellCmdWithOptions(command, env) {
  const spawn = require('child_process').spawn;

  let runArg = '-C'; // for bash

  if (process.platform === 'win32') {
    runArg = '/C'; // for cmd.exe
  }

  let envOut = process.env;
  if (env != null) {
      envOut = { ...process.env, ...env };
  }

  const childProcess = spawn( process.env.comspec, [runArg, command], {stdio: 'inherit', env: envOut});

  return new Promise((resolve, reject) => {
    childProcess.on('error', function (error) {
      reject({code: 1, error: error});
    });

    childProcess.on('close', function (code) {
      if (code > 0) {
        reject({code: code, error: 'Command failed with code ' + code});
      } else {
        resolve({code: code});
      }
    });
  });
}