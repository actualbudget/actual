/*!
 * reading-time
 * Copyright (c) Nicolas Gryman <ngryman@gmail.com>
 * MIT Licensed
 */

'use strict'

/**
 * @typedef {import('reading-time').Options['wordBound']} WordBoundFunction
 */

/**
 * @param {number} number
 * @param {number[][]} arrayOfRanges
 */
function codeIsInRanges(number, arrayOfRanges) {
  return arrayOfRanges.some(([lowerBound, upperBound]) =>
    (lowerBound <= number) && (number <= upperBound)
  )
}

/**
 * @type {WordBoundFunction}
 */
function isCJK(c) {
  if ('string' !== typeof c) {
    return false
  }
  const charCode = c.charCodeAt(0)
  // Help wanted!
  // This should be good for most cases, but if you find it unsatisfactory
  // (e.g. some other language where each character should be standalone words),
  // contributions welcome!
  return codeIsInRanges(
    charCode,
    [
      // Hiragana (Katakana not included on purpose,
      // context: https://github.com/ngryman/reading-time/pull/35#issuecomment-853364526)
      // If you think Katakana should be included and have solid reasons, improvement is welcomed
      [0x3040, 0x309f],
      // CJK Unified ideographs
      [0x4e00, 0x9fff],
      // Hangul
      [0xac00, 0xd7a3],
      // CJK extensions
      [0x20000, 0x2ebe0]
    ]
  )
}

/**
 * @type {WordBoundFunction}
 */
function isAnsiWordBound(c) {
  return ' \n\r\t'.includes(c)
}

/**
 * @type {WordBoundFunction}
 */
function isPunctuation(c) {
  if ('string' !== typeof c) {
    return false
  }
  const charCode = c.charCodeAt(0)
  return codeIsInRanges(
    charCode,
    [
      [0x21, 0x2f],
      [0x3a, 0x40],
      [0x5b, 0x60],
      [0x7b, 0x7e],
      // CJK Symbols and Punctuation
      [0x3000, 0x303f],
      // Full-width ASCII punctuation variants
      [0xff00, 0xffef]
    ]
  )
}

/**
 * @type {import('reading-time').default}
 */
function readingTime(text, options = {}) {
  let words = 0, start = 0, end = text.length - 1

  // use provided value if available
  const wordsPerMinute = options.wordsPerMinute || 200

  // use provided function if available
  const isWordBound = options.wordBound || isAnsiWordBound

  // fetch bounds
  while (isWordBound(text[start])) start++
  while (isWordBound(text[end])) end--

  // Add a trailing word bound to make handling edges more convenient
  const normalizedText = `${text}\n`

  // calculate the number of words
  for (let i = start; i <= end; i++) {
    // A CJK character is a always word;
    // A non-word bound followed by a word bound / CJK is the end of a word.
    if (
      isCJK(normalizedText[i]) ||
      (!isWordBound(normalizedText[i]) &&
        (isWordBound(normalizedText[i + 1]) || isCJK(normalizedText[i + 1]))
      )
    ) {
      words++
    }
    // In case of CJK followed by punctuations, those characters have to be eaten as well
    if (isCJK(normalizedText[i])) {
      while (
        i <= end &&
        (isPunctuation(normalizedText[i + 1]) || isWordBound(normalizedText[i + 1]))
      ) {
        i++
      }
    }
  }

  // reading time stats
  const minutes = words / wordsPerMinute
  // Math.round used to resolve floating point funkyness
  //   http://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html
  const time = Math.round(minutes * 60 * 1000)
  const displayed = Math.ceil(minutes.toFixed(2))

  return {
    text: displayed + ' min read',
    minutes: minutes,
    time: time,
    words: words
  }
}

/**
 * Export
 */
module.exports = readingTime
