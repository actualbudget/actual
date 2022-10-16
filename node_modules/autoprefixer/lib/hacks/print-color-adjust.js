let Declaration = require('../declaration')

class PrintColorAdjust extends Declaration {
  /**
   * Change property name for WebKit-based browsers
   */
  prefixed(prop, prefix) {
    if (prefix === '-moz-') {
      return 'color-adjust'
    } else {
      return prefix + 'print-color-adjust'
    }
  }

  /**
   * Return property name by spec
   */
  normalize() {
    return 'print-color-adjust'
  }
}

PrintColorAdjust.names = ['print-color-adjust', 'color-adjust']

module.exports = PrintColorAdjust
