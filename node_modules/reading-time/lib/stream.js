/*!
 * reading-time
 * Copyright (c) Nicolas Gryman <ngryman@gmail.com>
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 */
const readingTime = require('./reading-time')
const Transform = require('stream').Transform
const util = require('util')

/**
 * @typedef {import('reading-time').Options} Options
 * @typedef {import('reading-time').Options['wordBound']} WordBoundFunction
 * @typedef {import('reading-time').readingTimeStream} ReadingTimeStream
 * @typedef {import('stream').TransformCallback} TransformCallback
 */

/**
 * @param {Options} options
 * @returns {ReadingTimeStream}
 */
function ReadingTimeStream(options) {
  // allow use without new
  if (!(this instanceof ReadingTimeStream)) {
    return new ReadingTimeStream(options)
  }

  Transform.call(this, { objectMode: true })

  this.options = options || {}
  this.stats = {
    minutes: 0,
    time: 0,
    words: 0
  }
}
util.inherits(ReadingTimeStream, Transform)

/**
 * @param {Buffer} chunk
 * @param {BufferEncoding} encoding
 * @param {TransformCallback} callback
 */
ReadingTimeStream.prototype._transform = function(chunk, encoding, callback) {
  const stats = readingTime(chunk.toString(encoding), this.options)

  this.stats.minutes += stats.minutes
  this.stats.time += stats.time
  this.stats.words += stats.words

  callback()
}

/**
 * @param {TransformCallback} callback
 */
ReadingTimeStream.prototype._flush = function(callback) {
  this.stats.text = Math.ceil(this.stats.minutes.toFixed(2)) + ' min read'

  this.push(this.stats)
  callback()
}

/**
 * Export
 */
module.exports = ReadingTimeStream
