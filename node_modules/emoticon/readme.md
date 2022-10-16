# emoticon

[![Build][build-badge]][build]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]

Info on ASCII emoticons.  :p

## Install

[npm][]:

```sh
npm install emoticon
```

## Use

```js
var emoticon = require('emoticon')

console.log(emoticon.slice(0, 3))
```

Yields:

```js
[ { name: 'angry',
    emoji: '😠',
    tags: [ 'mad', 'annoyed' ],
    description: 'angry face',
    emoticons:
     [ '>:(', '>:[', '>:-(', '>:-[', '>=(', '>=[', '>=-(', '>=-[' ] },
  { name: 'blush',
    emoji: '😊',
    tags: [ 'proud' ],
    description: 'smiling face with smiling eyes',
    emoticons:
     [ ':")',
       ':"]',
       ':"D',
       ':-")',
       ':-"]',
       ':-"D',
       '=")',
       '="]',
       '="D',
       '=-")',
       '=-"]',
       '=-"D' ] },
  { name: 'broken_heart',
    emoji: '💔',
    tags: [],
    description: 'broken heart',
    emoticons: [ '<\\3', '</3' ] } ]
```

## Support

See [`support.md`][support].

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://img.shields.io/travis/wooorm/emoticon.svg

[build]: https://travis-ci.org/wooorm/emoticon

[downloads-badge]: https://img.shields.io/npm/dm/emoticon.svg

[downloads]: https://www.npmjs.com/package/emoticon

[size-badge]: https://img.shields.io/bundlephobia/minzip/emoticon.svg

[size]: https://bundlephobia.com/result?p=emoticon

[npm]: https://docs.npmjs.com/cli/install

[license]: license

[author]: https://wooorm.com

[support]: support.md
