const global = globalThis || this || self;

const process = {
  env: {
    ...import.meta.env,
    NODE_ENV: import.meta.env.MODE,
    PUBLIC_URL: import.meta.env.BASE_URL.slice(0, -1),
  },
};

export { process };

export { global };
