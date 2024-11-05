export const fetch = async (
  input: RequestInfo | URL,
  options?: RequestInit,
) => {
  try {
    return await globalThis.fetch(input, {
      ...options,
      headers: {
        ...options?.headers,
        origin: 'app://actual',
      },
    });
  } catch (error) {
    console.error(error); // log error
    throw error;
  }
};
