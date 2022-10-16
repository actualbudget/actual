const { join, resolve } = require('path');
const { readdir, stat } = require('fs');
const { promisify } = require('util');

const toStats = promisify(stat);
const toRead = promisify(readdir);

module.exports = async function list(dir, callback, pre='') {
	dir = resolve('.', dir);
	await toRead(dir).then(arr => {
		return Promise.all(
			arr.map(str => {
				let abs = join(dir, str);
				return toStats(abs).then(stats => {
					return stats.isDirectory()
						? list(abs, callback, join(pre, str))
						: callback(join(pre, str), abs, stats)
				});
			})
		);
	});
}
