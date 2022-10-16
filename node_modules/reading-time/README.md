# reading-time

[![NPM](http://img.shields.io/npm/v/reading-time.svg)](https://www.npmjs.org/package/reading-time) [![Build Status](http://img.shields.io/travis/ngryman/reading-time.svg)](https://travis-ci.org/ngryman/reading-time)

<br>

[Medium]'s like reading time estimation.

`reading-time` helps you estimate how long an article will take to read.
It works perfectly with plain text, but also with `markdown` or `html`.

Note that it's focused on performance and simplicity, so the number of words it will extract from other formats than plain text can vary a little. But this is an estimation right?

[medium]: https://medium.com

## Installation

```sh
npm install reading-time --production
```

## Usage

### Classic

```javascript
const readingTime = require('reading-time');

const stats = readingTime(text);
// ->
// stats: {
//   text: '1 min read',
//   minutes: 1,
//   time: 60000,
//   words: 200
// }
```

### Stream

```javascript
const {readingTimeStream} = require('reading-time');

fs.createReadStream('foo')
  .pipe(readingTimeStream)
  .on('data', stats => {
    // ...
  });
```

## API

`readingTime(text, options?)`

- `text`: the text to analyze
- options (optional)
  - `options.wordsPerMinute`: (optional) the words per minute an average reader can read (default: 200)
  - `options.wordBound`: (optional) a function that returns a boolean value depending on if a character is considered as a word bound (default: spaces, new lines and tabulations)

## Help wanted!

This library has been optimized for alphabetical languages and CJK languages, but may not behave correctly for other languages that don't use spaces for work bounds. If you find the behavior of this library to deviate significantly from your expectation, issues or contributions are welcomed!

## Other projects

- [Fauda](https://github.com/ngryman/fauda): configuration made simple.
- [Badge Size](https://github.com/ngryman/badge-size): Displays the size of a given file in your repository.
- [Commitizen Emoji](https://github.com/ngryman/cz-emoji): Commitizen adapter formatting commit messages using emojis.
