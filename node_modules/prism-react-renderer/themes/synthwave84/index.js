/*
 * Synthwave '84 Theme originally by Robb Owen [@Robb0wen] for Visual Studio Code
 * Demo: https://marc.dev/demo/prism-synthwave84
 *
 * Ported for PrismJS by Marc Backes [@themarcba]: https://github.com/themarcba/prism-themes/blob/master/themes/prism-synthwave84.css
 * Ported for prism-react-renderer by Forrest Akin [@forrest-akin]
 */
var theme = {
  plain: {
    background: "#2a2139",
    backgroundColor: "linear-gradient(to bottom, #2a2139 75%, #34294f)",
    backgroundImage: "#34294f",
    color: "#f92aad",
    textShadow: "0 0 2px #100c0f, 0 0 5px #dc078e33, 0 0 10px #fff3"
  },
  styles: [{
    types: ["comment", "block-comment", "prolog", "doctype", "cdata"],
    style: {
      color: "#495495",
      fontStyle: "italic"
    }
  }, {
    types: ["punctuation"],
    style: {
      color: "#ccc"
    }
  }, {
    types: ["tag", "attr-name", "namespace", "number", "unit", "hexcode", "deleted"],
    style: {
      color: "#e2777a"
    }
  }, {
    types: ["property", "selector"],
    style: {
      color: "#72f1b8",
      textShadow: "0 0 2px #100c0f, 0 0 10px #257c5575, 0 0 35px #21272475"
    }
  }, {
    types: ["function-name"],
    style: {
      color: "#6196cc"
    }
  }, {
    types: ["boolean", "selector-id", "function"],
    style: {
      color: "#fdfdfd",
      textShadow: "0 0 2px #001716, 0 0 3px #03edf975, 0 0 5px #03edf975, 0 0 8px #03edf975"
    }
  }, {
    types: ["class-name", "maybe-class-name", "builtin"],
    style: {
      color: "#fff5f6",
      textShadow: "0 0 2px #000, 0 0 10px #fc1f2c75, 0 0 5px #fc1f2c75, 0 0 25px #fc1f2c75"
    }
  }, {
    types: ["constant", "symbol"],
    style: {
      color: "#f92aad",
      textShadow: "0 0 2px #100c0f, 0 0 5px #dc078e33, 0 0 10px #fff3"
    }
  }, {
    types: ["important", "atrule", "keyword", "selector-class"],
    style: {
      color: "#f4eee4",
      textShadow: "0 0 2px #393a33, 0 0 8px #f39f0575, 0 0 2px #f39f0575"
    }
  }, {
    types: ["string", "char", "attr-value", "regex", "variable"],
    style: {
      color: "#f87c32"
    }
  }, {
    types: ["parameter"],
    style: {
      fontStyle: "italic"
    }
  }, {
    types: ["entity", "url"],
    style: {
      color: "#67cdcc"
    }
  }, {
    types: ["operator"],
    style: {
      color: "ffffffee"
    }
  }, {
    types: ["important", "bold"],
    style: {
      fontWeight: "bold"
    }
  }, {
    types: ["italic"],
    style: {
      fontStyle: "italic"
    }
  }, {
    types: ["entity"],
    style: {
      cursor: "help"
    }
  }, {
    types: ["inserted"],
    style: {
      color: "green"
    }
  }]
};

export default theme;
