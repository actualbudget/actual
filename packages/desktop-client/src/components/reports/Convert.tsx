export default function Convert(item) {
  if (Number.isInteger(item)) {
    return item === 1 ? true : false;
  } else {
    return item ? 1 : 0;
  }
}
