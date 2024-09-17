// @ts-strict-ignore
import nodeFetch from 'node-fetch';

export const fetch = async (
  input: RequestInfo | URL,
  options?: RequestInit,
) => {
  try {
    return await nodeFetch(input, {
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
