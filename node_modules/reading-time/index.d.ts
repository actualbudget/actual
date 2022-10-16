declare module 'reading-time' {
  import {Transform, TransformCallback} from 'stream';

  export interface Options {
    wordBound?: (char: string) => boolean;
    wordsPerMinute?: number;
  }

  export interface ReadTimeResults {
    text: string;
    time: number;
    words: number;
    minutes: number;
  }

  // Retrocompatibility
  // TODO: remove in 2.0.0
  export type IOptions = Options;
  export type IReadTimeResults = ReadTimeResults;

 interface ReadingTimeStream extends Transform {
    stats: ReadTimeResults;
    options: Options;
    _transform: (chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback) => void;
    _flush: (callback: TransformCallback) => void;
    (options?: Options): ReadingTimeStream;
  }
  const readingTimeStream: ReadingTimeStream;
  export {readingTimeStream};

  export default function readingTime(text: string, options?: Options): ReadTimeResults;
}

declare module 'reading-time/lib/stream' {
  import type {readingTimeStream} from 'reading-time';

  export default readingTimeStream;
}
