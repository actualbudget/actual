'use strict'

module.exports = (comment) => {
  let pos = 0
  let value = comment.text
  const match = value.match(/^\s*!?\s*rtl:/)
  let meta

  if (match) {
    meta = {
      source: comment,
      name: '',
      param: '',
      begin: true,
      end: true,
      blacklist: false,
      preserve: false
    }
    value = value.slice(match[0].length)
    pos = value.indexOf(':')

    if (pos > -1) {
      meta.name = value.slice(0, pos)
      // begin/end are always true, unless one of them actually exists.
      meta.begin = meta.name !== 'end'
      meta.end = meta.name !== 'begin'
      if (meta.name === 'begin' || meta.name === 'end') {
        value = value.slice(meta.name.length + 1)
        pos = value.indexOf(':')
        if (pos > -1) {
          meta.name = value.slice(0, pos)
          value = value.slice(pos)
          meta.param = value.slice(1)
        } else {
          meta.name = value
        }
      } else {
        meta.param = value.slice(pos + 1)
      }
    } else {
      meta.name = value
    }
  }

  return meta
}
