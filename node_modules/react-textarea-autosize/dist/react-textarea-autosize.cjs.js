'use strict';

if (process.env.NODE_ENV === "production") {
  module.exports = require("./react-textarea-autosize.cjs.prod.js");
} else {
  module.exports = require("./react-textarea-autosize.cjs.dev.js");
}
