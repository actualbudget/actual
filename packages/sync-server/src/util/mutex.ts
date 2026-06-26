export const createMutex = (): (<A>(
  operation: () => Promise<A>,
) => Promise<A>) => {
  let mutex = Promise.resolve();

  return <A>(operation: () => Promise<A>) =>
    new Promise<A>((resolve, reject) => {
      mutex = mutex.finally(() => {
        try {
          return operation().then(resolve, reject);
        } catch {}
      });
    });
};
