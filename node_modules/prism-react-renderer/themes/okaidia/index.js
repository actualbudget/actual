/*
    Adapted from the Prism Okaidia theme
    https://github.com/PrismJS/prism/blob/1761513e3db48ca9222037644a9c68746e24f039/themes/prism-okaidia.css
    https://github.com/ocodia/okaidia-prismjs-theme
*/
var theme = {
  plain: {
    color: "#f8f8f2",
    backgroundColor: "#272822"
  },
  styles: [{
    types: ["changed"],
    style: {
      color: "rgb(162, 191, 252)",
      fontStyle: "italic"
    }
  }, {
    types: ["deleted"],
    style: {
      color: "#f92672",
      fontStyle: "italic"
    }
  }, {
    types: ["inserted"],
    style: {
      color: "rgb(173, 219, 103)",
      fontStyle: "italic"
    }
  }, {
    types: ["comment"],
    style: {
      color: "#8292a2",
      fontStyle: "italic"
    }
  }, {
    types: ["string", "url"],
    style: {
      color: "#a6e22e"
    }
  }, {
    types: ["variable"],
    style: {
      color: "#f8f8f2"
    }
  }, {
    types: ["number"],
    style: {
      color: "#ae81ff"
    }
  }, {
    types: ["builtin", "char", "constant", "function", "class-name"],
    style: {
      color: "#e6db74"
    }
  }, {
    types: ["punctuation"],
    style: {
      color: "#f8f8f2"
    }
  }, {
    types: ["selector", "doctype"],
    style: {
      color: "#a6e22e",
      fontStyle: "italic"
    }
  }, {
    types: ["tag", "operator", "keyword"],
    style: {
      color: "#66d9ef"
    }
  }, {
    types: ["boolean"],
    style: {
      color: "#ae81ff"
    }
  }, {
    types: ["namespace"],
    style: {
      color: "rgb(178, 204, 214)",
      opacity: 0.7
    }
  }, {
    types: ["tag", "property"],
    style: {
      color: "#f92672"
    }
  }, {
    types: ["attr-name"],
    style: {
      color: "#a6e22e !important"
    }
  }, {
    types: ["doctype"],
    style: {
      color: "#8292a2"
    }
  }, {
    types: ["rule"],
    style: {
      color: "#e6db74"
    }
  }]
};

export default theme;
