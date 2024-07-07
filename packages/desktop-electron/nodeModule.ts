import NodeModule from 'module';

export const Module: typeof NodeModule & { globalPaths: string[] } =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NodeModule as unknown as any;
