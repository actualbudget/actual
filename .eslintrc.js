module.exports = {
  plugins: ["prettier"],
  extends: ["react-app"],
  rules: {
    "prettier/prettier": "error",
    "no-unused-vars": "off",
    "no-loop-func": "off",
    "no-restricted-globals": "off"
  }
};
