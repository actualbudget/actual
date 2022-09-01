let fs = require('fs');

let contents = fs.readFileSync(process.argv[2], 'utf8');
let list = contents.match(/(#[0-9a-fA-F]*)/g);

let groups = ['y', 'r', 'b', 'n', 'g', 'p'];
let colors = {};

list.forEach((color, idx) => {
  const group = Math.floor(idx / 11);
  const n = idx % 11;

  colors[groups[group] + (n + 1)] = color;
});

console.log(colors);
