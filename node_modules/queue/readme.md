```
   ____  __  _____  __  _____
  / __ `/ / / / _ \/ / / / _ \
 / /_/ / /_/ /  __/ /_/ /  __/
 \__, /\__,_/\___/\__,_/\___/
   /_/
```
Asynchronous function queue with adjustable concurrency.

[![npm](http://img.shields.io/npm/v/queue.svg?style=flat-square)](http://www.npmjs.org/queue)
[![tests](https://img.shields.io/travis/jessetane/queue.svg?style=flat-square&branch=master)](https://travis-ci.org/jessetane/queue)
[![coverage](https://img.shields.io/coveralls/jessetane/queue.svg?style=flat-square&branch=master)](https://coveralls.io/r/jessetane/queue)

This module exports a class `Queue` that implements most of the `Array` API. Pass async functions (ones that accept a callback or return a promise) to an instance's additive array methods. Processing begins when you call `q.start()`.

## Example
`npm run example`
``` javascript
var queue = require('../')

var q = queue({ results: [] })

// add jobs using the familiar Array API
q.push(function (cb) {
  const result = 'two'
  cb(null, result)
})

q.push(
  function (cb) {
    const result = 'four'
    cb(null, result)
  },
  function (cb) {
    const result = 'five'
    cb(null, result)
  }
)

// jobs can accept a callback or return a promise
q.push(function () {
  return new Promise(function (resolve, reject) {
    const result = 'one'
    resolve(result)
  })
})

q.unshift(function (cb) {
  const result = 'one'
  cb(null, result)
})

q.splice(2, 0, function (cb) {
  const result = 'three'
  cb(null, result)
})

// use the timeout feature to deal with jobs that
// take too long or forget to execute a callback
q.timeout = 100

q.on('timeout', function (next, job) {
  console.log('job timed out:', job.toString().replace(/\n/g, ''))
  next()
})

q.push(function (cb) {
  setTimeout(function () {
    console.log('slow job finished')
    cb()
  }, 200)
})

q.push(function (cb) {
  console.log('forgot to execute callback')
})

// jobs can also override the queue's timeout
// on a per-job basis
function extraSlowJob (cb) {
  setTimeout(function () {
    console.log('extra slow job finished')
    cb()
  }, 400)
}

extraSlowJob.timeout = 500
q.push(extraSlowJob)

// jobs can also opt-out of the timeout altogether
function superSlowJob (cb) {
  setTimeout(function () {
    console.log('super slow job finished')
    cb()
  }, 1000)
}

superSlowJob.timeout = null
q.push(superSlowJob)

// get notified when jobs complete
q.on('success', function (result, job) {
  console.log('job finished processing:', job.toString().replace(/\n/g, ''))
  console.log('The result is:', result)
})

// begin processing, get notified on end / failure
q.start(function (err) {
  if (err) throw err
  console.log('all done:', q.results)
})

```

## Install
`npm install queue`

_Note_: You may need to install the [`events`](https://github.com/Gozala/events) dependency if 
your environment does not have it by default (eg. browser, react-native). 

## Test
`npm test`
`npm run test-browser`

## API

### `var q = queue([opts])`
Constructor. `opts` may contain inital values for:
* `q.concurrency`
* `q.timeout`
* `q.autostart`
* `q.results`

## Instance methods
### `q.start([cb])`
cb, if passed, will be called when the queue empties or when an error occurs.

### `q.stop()`
Stops the queue. can be resumed with `q.start()`.

### `q.end([err])`
Stop and empty the queue immediately.

## Instance methods mixed in from `Array`
Mozilla has docs on how these methods work [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array). Note that `slice` does not copy the queue.
### `q.push(element1, ..., elementN)`
### `q.unshift(element1, ..., elementN)`
### `q.splice(index , howMany[, element1[, ...[, elementN]]])`
### `q.pop()`
### `q.shift()`
### `q.slice(begin[, end])`
### `q.reverse()`
### `q.indexOf(searchElement[, fromIndex])`
### `q.lastIndexOf(searchElement[, fromIndex])`

## Properties
### `q.concurrency`
Max number of jobs the queue should process concurrently, defaults to `Infinity`.

### `q.timeout`
Milliseconds to wait for a job to execute its callback. This can be overridden by specifying a `timeout` property on a per-job basis.

### `q.autostart`
Ensures the queue is always running if jobs are available. Useful in situations where you are using a queue only for concurrency control.

### `q.results`
An array to set job callback arguments on.

### `q.length`
Jobs pending + jobs to process (readonly).

## Events

### `q.emit('start', job)`
Immediately before a job begins to execute.

### `q.emit('success', result, job)`
After a job executes its callback.

### `q.emit('error', err, job)`
After a job passes an error to its callback.

### `q.emit('timeout', continue, job)`
After `q.timeout` milliseconds have elapsed and a job has not executed its callback.

### `q.emit('end'[, err])`
After all jobs have been processed

## Releases
The latest stable release is published to [npm](http://npmjs.org/queue). Abbreviated changelog below:
* [6.0](https://github.com/jessetane/queue/archive/6.0.1.tar.gz)
  * Add `start` event before job begins (@joelgriffith)
  * Add `timeout` property on a job to override the queue's timeout (@joelgriffith)
* [5.0](https://github.com/jessetane/queue/archive/5.0.0.tar.gz)
  * Updated TypeScript bindings (@Codex-)
* [4.4](https://github.com/jessetane/queue/archive/4.4.0.tar.gz)
  * Add results feature
* [4.3](https://github.com/jessetane/queue/archive/4.3.0.tar.gz)
  * Add promise support (@kwolfy)
* [4.2](https://github.com/jessetane/queue/archive/4.2.0.tar.gz)
  * Unref timers on end
* [4.1](https://github.com/jessetane/queue/archive/4.1.0.tar.gz)
  * Add autostart feature
* [4.0](https://github.com/jessetane/queue/archive/4.0.0.tar.gz)
  * Change license to MIT
* [3.1.x](https://github.com/jessetane/queue/archive/3.0.6.tar.gz)
  * Add .npmignore
* [3.0.x](https://github.com/jessetane/queue/archive/3.0.6.tar.gz)
  * Change the default concurrency to `Infinity`
  * Allow `q.start()` to accept an optional callback executed on `q.emit('end')`
* [2.x](https://github.com/jessetane/queue/archive/2.2.0.tar.gz)
  * Major api changes / not backwards compatible with 1.x
* [1.x](https://github.com/jessetane/queue/archive/1.0.2.tar.gz)
  * Early prototype

## License
Copyright © 2014 Jesse Tane <jesse.tane@gmail.com>

This work is free. You can redistribute it and/or modify it under the
terms of the [MIT License](https://opensource.org/licenses/MIT).
See LICENSE for full details.
