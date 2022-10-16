// Original: https://github.com/sdras/night-owl-vscode-theme
// Converted automatically using ./tools/themeFromVsCode
var theme = {
  plain: {
    color: "#403f53",
    backgroundColor: "#FBFBFB"
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
      color: "rgba(239, 83, 80, 0.56)",
      fontStyle: "italic"
    }
  }, {
    types: ["inserted", "attr-name"],
    style: {
      color: "rgb(72, 118, 214)",
      fontStyle: "italic"
    }
  }, {
    types: ["comment"],
    style: {
      color: "rgb(152, 159, 177)",
      fontStyle: "italic"
    }
  }, {
    types: ["string", "builtin", "char", "constant", "url"],
    style: {
      color: "rgb(72, 118, 214)"
    }
  }, {
    types: ["variable"],
    style: {
      color: "rgb(201, 103, 101)"
    }
  }, {
    types: ["number"],
    style: {
      color: "rgb(170, 9, 130)"
    }
  }, {
    // This was manually added after the auto-generation
    // so that punctuations are not italicised
    types: ["punctuation"],
    style: {
      color: "rgb(153, 76, 195)"
    }
  }, {
    types: ["function", "selector", "doctype"],
    style: {
      color: "rgb(153, 76, 195)",
      fontStyle: "italic"
    }
  }, {
    types: ["class-name"],
    style: {
      color: "rgb(17, 17, 17)"
    }
  }, {
    types: ["tag"],
    style: {
      color: "rgb(153, 76, 195)"
    }
  }, {
    types: ["operator", "property", "keyword", "namespace"],
    style: {
      color: "rgb(12, 150, 155)"
    }
  }, {
    types: ["boolean"],
    style: {
      color: "rgb(188, 84, 84)"
    }
  }]
};

export default theme;
