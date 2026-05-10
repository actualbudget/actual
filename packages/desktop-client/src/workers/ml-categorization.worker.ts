import { load } from 'npyjs';
import type { NpyArray } from 'npyjs';
import { env, InferenceSession, Tensor } from 'onnxruntime-web';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InitMessage = {
  type: 'init';
  config: {
    modelUrl: string;
    classesUrl: string;
    preprocessingEnabled: boolean;
  };
};

type PredictMessage = {
  type: 'predict';
  id: string;
  notesArray: (string | null | undefined)[];
};

type WorkerMessage = InitMessage | PredictMessage;

type InitResult = {
  type: 'init-result';
  success: boolean;
  error?: string;
};

type PredictResult = {
  type: 'predict-result';
  id: string;
  results: (string | null)[];
  error?: string;
};

type WorkerResponse = InitResult | PredictResult;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let inferenceSession: InferenceSession | null = null;
let labelClasses: string[] | null = null;
let isInitialized = false;
let initializationFailed = false;
let initPromise: Promise<void> | null = null;
let preprocessingEnabled = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanNotes(
  notes: string | null | undefined,
  removeLocations: boolean,
): string {
  if (!notes) return '';
  const WHITESPACE_PATTERN = /\s+/g;
  let cleaned = String(notes).replace(WHITESPACE_PATTERN, ' ').trim();
  if (removeLocations) {
    const LOCATION_PATTERNS = /\b(London|GB|GBR|ENG)\b/gi;
    cleaned = cleaned.replace(LOCATION_PATTERNS, '').trim();
  }
  return cleaned;
}

function extractClassesFromNpy(npy: NpyArray<ArrayBufferView>): string[] {
  const { shape } = npy;
  const data = npy.data as unknown as ArrayLike<string>;
  const count = shape[0];
  const classes: string[] = [];

  for (let i = 0; i < count; i++) {
    classes.push(String(data[i]));
  }

  if (classes.length === 0) {
    throw new Error('Label array is empty');
  }
  return classes;
}

// ---------------------------------------------------------------------------
// ONNX Runtime Config
// ---------------------------------------------------------------------------

const ORT_VERSION = '1.24.3';
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

function configureOrt() {
  // Use a string prefix so ONNX resolves both .wasm and .mjs files
  env.wasm.wasmPaths = ORT_BASE;
  env.wasm.numThreads = 1;
  env.wasm.simd = true;
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

async function doInitialize(config: {
  modelUrl: string;
  classesUrl: string;
  preprocessingEnabled: boolean;
}): Promise<void> {
  try {
    configureOrt();
    preprocessingEnabled = config.preprocessingEnabled;

    const modelResponse = await fetch(config.modelUrl);

    if (!modelResponse.ok) {
      throw new Error(
        `Failed to fetch model: ${modelResponse.status} ${modelResponse.statusText}`,
      );
    }

    const modelBuffer = await modelResponse.arrayBuffer();

    if (modelBuffer.byteLength < 1000) {
      throw new Error('Model file is too small — likely a 404 or error page');
    }

    inferenceSession = await InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });

    const npy = await load(config.classesUrl);
    labelClasses = extractClassesFromNpy(npy);

    isInitialized = true;
    initializationFailed = false;
  } catch (error) {
    initializationFailed = true;
    isInitialized = false;
    throw error;
  }
}

async function initialize(config: {
  modelUrl: string;
  classesUrl: string;
  preprocessingEnabled: boolean;
}): Promise<void> {
  if (!initPromise) {
    initPromise = doInitialize(config);
  }
  return initPromise;
}

// ---------------------------------------------------------------------------
// Prediction
// ---------------------------------------------------------------------------

async function predictCategories(
  notesArray: (string | null | undefined)[],
): Promise<(string | null)[]> {
  if (initializationFailed || !isInitialized || !inferenceSession) {
    return notesArray.map(() => null);
  }

  const validNotes: string[] = [];
  const indexMap: number[] = [];

  notesArray.forEach((notes, i) => {
    const processed = preprocessingEnabled
      ? cleanNotes(notes, true)
      : (notes ?? '');
    if (processed.trim() !== '') {
      validNotes.push(processed);
      indexMap.push(i);
    }
  });

  if (validNotes.length === 0) return notesArray.map(() => null);

  try {
    const inputTensor = new Tensor('string', validNotes, [validNotes.length]);
    const feeds = { [inferenceSession.inputNames[0]]: inputTensor };
    const outputData = await inferenceSession.run(feeds, [
      inferenceSession.outputNames[0],
    ]);

    const rawOutput = outputData[inferenceSession.outputNames[0]];
    // Some models output a sequence (array of tensors); pick the first element.
    const output = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;

    if (!output) {
      throw new Error('Model output is undefined or empty');
    }

    const results: (string | null)[] = new Array(notesArray.length).fill(null);

    if (output.type === 'string') {
      indexMap.forEach((originalIdx, i) => {
        results[originalIdx] = (output.data as string[])[i] ?? null;
      });
    } else {
      const predictions = output.data as unknown as number[];
      indexMap.forEach((originalIdx, i) => {
        const idx = Math.round(Number(predictions[i]));
        if (labelClasses && idx >= 0 && idx < labelClasses.length) {
          results[originalIdx] = labelClasses[idx];
        }
      });
    }

    return results;
  } catch (error) {
    console.error('Batch prediction failed:', error);
    return notesArray.map(() => null);
  }
}

// ---------------------------------------------------------------------------
// Message Handler
// ---------------------------------------------------------------------------

async function handleMessage(msg: WorkerMessage): Promise<WorkerResponse> {
  if (msg.type === 'init') {
    try {
      await initialize(msg.config);
      return { type: 'init-result', success: true };
    } catch (error) {
      return {
        type: 'init-result',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (msg.type === 'predict') {
    try {
      const results = await predictCategories(msg.notesArray);
      return { type: 'predict-result', id: msg.id, results };
    } catch (error) {
      return {
        type: 'predict-result',
        id: msg.id,
        results: msg.notesArray.map(() => null),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return {
    type: 'init-result',
    success: false,
    error: 'Unknown message type',
  };
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const response = await handleMessage(event.data);
  self.postMessage(response);
};
