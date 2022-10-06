let { join } = require('path');
let config = require('../load-config');

function getPathForUserFile(fileId) {
  return join(config.userFiles, `file-${fileId}.blob`);
}

function getPathForGroupFile(groupId) {
  return join(config.userFiles, `group-${groupId}.sqlite`);
}

module.exports = { getPathForUserFile, getPathForGroupFile };
