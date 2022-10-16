# del

> Delete files and directories using [globs](https://github.com/sindresorhus/globby#globbing-patterns)

Similar to [rimraf](https://github.com/isaacs/rimraf), but with a Promise API and support for multiple files and globbing. It also protects you against deleting the current working directory and above.

## Install

```
$ npm install del
```

## Usage

```js
const del = require('del');

(async () => {
	const deletedFilePaths = await del(['temp/*.js', '!temp/unicorn.js']);
	const deletedDirectoryPaths = await del(['temp', 'public']);

	console.log('Deleted files:\n', deletedFilePaths.join('\n'));
	console.log('\n\n');
	console.log('Deleted directories:\n', deletedDirectoryPaths.join('\n'));
})();
```

## Beware

The glob pattern `**` matches all children and *the parent*.

So this won't work:

```js
del.sync(['public/assets/**', '!public/assets/goat.png']);
```

You have to explicitly ignore the parent directories too:

```js
del.sync(['public/assets/**', '!public/assets', '!public/assets/goat.png']);
```

To delete all subdirectories inside `public/`, you can do:

```js
del.sync(['public/*/']);
```

Suggestions on how to improve this welcome!

## API

Note that glob patterns can only contain forward-slashes, not backward-slashes. Windows file paths can use backward-slashes as long as the path does not contain any glob-like characters, otherwise use `path.posix.join()` instead of `path.join()`.

### del(patterns, options?)

Returns `Promise<string[]>` with the deleted paths.

### del.sync(patterns, options?)

Returns `string[]` with the deleted paths.

#### patterns

Type: `string | string[]`

See the supported [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns).

- [Pattern examples with expected matches](https://github.com/sindresorhus/multimatch/blob/main/test/test.js)
- [Quick globbing pattern overview](https://github.com/sindresorhus/multimatch#globbing-patterns)

#### options

Type: `object`

You can specify any of the [`globby` options](https://github.com/sindresorhus/globby#options) in addition to the below options. In contrast to the `globby` defaults, `expandDirectories`, `onlyFiles`, and `followSymbolicLinks` are `false` by default.

##### force

Type: `boolean`\
Default: `false`

Allow deleting the current working directory and outside.

##### dryRun

Type: `boolean`\
Default: `false`

See what would be deleted.

```js
const del = require('del');

(async () => {
	const deletedPaths = await del(['temp/*.js'], {dryRun: true});

	console.log('Files and directories that would be deleted:\n', deletedPaths.join('\n'));
})();
```

##### concurrency

Type: `number`\
Default: `Infinity`\
Minimum: `1`

Concurrency limit.

##### onProgress

Type: `(progress: ProgressData) => void`

Called after each file or directory is deleted.

```js
import del from 'del';

await del(patterns, {
	onProgress: progress => {
	// …
}});
```

###### ProgressData

```js
{
	totalCount: number,
	deletedCount: number,
	percent: number
}
```

- `percent` is a value between `0` and `1`

## CLI

See [del-cli](https://github.com/sindresorhus/del-cli) for a CLI for this module and [trash-cli](https://github.com/sindresorhus/trash-cli) for a safe version that is suitable for running by hand.

## del for enterprise

Available as part of the Tidelift Subscription.

The maintainers of del and thousands of other packages are working with Tidelift to deliver commercial support and maintenance for the open source dependencies you use to build your applications. Save time, reduce risk, and improve code health, while paying the maintainers of the exact dependencies you use. [Learn more.](https://tidelift.com/subscription/pkg/npm-del?utm_source=npm-del&utm_medium=referral&utm_campaign=enterprise&utm_term=repo)

## Related

- [make-dir](https://github.com/sindresorhus/make-dir) - Make a directory and its parents if needed
- [globby](https://github.com/sindresorhus/globby) - User-friendly glob matching
