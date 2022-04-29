export default function makeMockObject(obj) {
  let mocked = (() => {
    const fn = () => mocked;
    fn.toString = fn.toLocaleString = fn[Symbol.toPrimitive] = () => '';
    fn.valueOf = () => false;

    return new Proxy(Object.freeze(fn), {
      get: (o, key) =>
        o.hasOwnProperty(key)
          ? o[key]
          : obj.hasOwnProperty(key)
          ? obj[key]
          : mocked
    });
  })();

  return mocked;
}
