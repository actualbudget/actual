const global = globalThis || this || self;

const process = {
  env: {
    ...import.meta.env,
    NODE_ENV: import.meta.env.MODE,
    PUBLIC_URL: import.meta.env.BASE_URL.slice(0, -1),
  },
};

// eslint-disable-next-line import/no-unused-modules
export { process };
// eslint-disable-next-line import/no-unused-modules
export { global };
