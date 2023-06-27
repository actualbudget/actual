const fs = require('./fs-util');

// Use a constant filename in development mode to make it easier to
// rebuild the backend without having to rebuild the frontend
exports.getContentHash = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'dev';
  }
  return '[contenthash]';
};

exports.getHashFromFile = file => {
  return file.match(/(?<=kcab\.worker\.).*(?=\.js)/)[0];
};

exports.getWorkerFileName = async directory => {
  let files = await fs.findFiles(directory, 'kcab.worker.*.js', true);
  return files[0];
};

exports.getWorkerFileHash = async directory => {
  let workerFile = await this.getWorkerFileName(directory);
  return this.getHashFromFile(workerFile);
};
