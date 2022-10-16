let Declaration = require('../declaration')

class UserSelect extends Declaration {
  /**
   * Change prefixed value for IE
   */
  set(decl, prefix) {
    if (prefix === '-ms-' && decl.value === 'contain') {
      decl.value = 'element'
    }
    return super.set(decl, prefix)
  }

  /**
   * Avoid prefixing all in IE
   */
  insert(decl, prefix, prefixes) {
    if (decl.value === 'all' && prefix === '-ms-') {
      return undefined
    } else {
      return super.insert(decl, prefix, prefixes)
    }
  }
}

UserSelect.names = ['user-select']

module.exports = UserSelect
