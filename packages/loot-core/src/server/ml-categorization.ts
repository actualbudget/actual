// @ts-strict-ignore

/**
 * ML Categorization Module
 *
 * Uses ONNX Runtime Web to run inference on a transaction classification model.
 * The model predicts transaction categories based on transaction notes/payee.
 *
 * Environment Variables:
 *   ACTUAL_ML_MODEL_PATH  - Path to the .onnx model file
 *   ACTUAL_ML_CLASSES_PATH - Path to the .npy label encoder classes file (optional, defaults to model path without .onnx + '_classes.npy')
 *   ACTUAL_ML_APPLY_PREPROCESSING - Set to 'true' to apply note cleaning before prediction (default: 'false')
 */

import { load } from 'npyjs';
import type { NpyArray } from 'npyjs';
import { InferenceSession, Tensor } from 'onnxruntime-web';

import { readFile } from '#platform/server/fs';
import { logger } from '#platform/server/log';

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

/**
 * Get the ONNX model path from environment variable
 */
export function getModelPath(): string | undefined {
  return getEnv('ACTUAL_ML_MODEL_PATH');
}

/**
 * Get the classes file path from environment variable
 * Falls back to model path with '_classes.npy' suffix
 */
export function getClassesPath(): string | undefined {
  const classesPath = getEnv('ACTUAL_ML_CLASSES_PATH');
  if (classesPath) {
    return classesPath;
  }

  const modelPath = getModelPath();
  if (modelPath) {
    return modelPath.replace(/\.onnx$/i, '_classes.npy');
  }

  return undefined;
}

/**
 * Check if ML categorization is enabled (model path is configured)
 */
export function isMLEnabled(): boolean {
  return !!getModelPath();
}

/**
 * Check if note preprocessing is enabled
 * When enabled, notes will be cleaned (removing location strings) before prediction
 */
export function isPreprocessingEnabled(): boolean {
  return getEnv('ACTUAL_ML_APPLY_PREPROCESSING') === 'true';
}

/**
 * Clean notes by removing location strings and normalizing whitespace.
 * This preprocessing is applied before sending notes to the ML model.
 *
 * @param notes - Raw notes string
 * @returns Cleaned notes with locations removed and whitespace normalized
 */
export function cleanNotes(notes: string | null | undefined): string {
  if (!notes) {
    return '';
  }
  const LOCATION_PATTERNS = /\b(London|GB|GBR|ENG)\b/gi;
  const WHITESPACE_PATTERN = /\s+/g;
  let cleaned = String(notes);
  cleaned = cleaned.replace(LOCATION_PATTERNS, '');
  cleaned = cleaned.replace(WHITESPACE_PATTERN, ' ').trim();

  return cleaned;
}

/**
 * Initialize the ONNX model and label encoder classes.
 * This must be called before using predict().
 *
 * @param modelPath - Optional override for the model path
 * @param classesPath - Optional override for the classes path
 */
// Add these declarations at the module level (after imports, before functions)
let inferenceSession: InferenceSession | null = null;
let labelClasses: string[] | null = null;
let isInitialized = false;

// Modified function
export async function initializeML(
  modelPath?: string,
  classesPath?: string,
): Promise<InferenceSession | null> {
  const modelFilePath = modelPath ?? getModelPath();
  const classesFilePath = classesPath ?? getClassesPath();

  if (!modelFilePath) {
    logger.warn('ML categorization disabled: ACTUAL_ML_MODEL_PATH not set');
    isInitialized = false;
    inferenceSession = null;
    labelClasses = null;
    return null;
  }

  try {
    logger.info(`Initializing ML model from: ${modelFilePath}`);

    // Create inference session
    inferenceSession = await InferenceSession.create(modelFilePath, {
      executionProviders: ['wasm'], // CPU execution; can add 'webgl' for GPU acceleration
      graphOptimizationLevel: 'all',
    });

    // Load label encoder classes
    if (classesFilePath) {
      // Load classes file using Node.js fs for file:// paths or fetch for URLs
      labelClasses = await loadClassesFile(classesFilePath);
      logger.info(
        `Loaded ${labelClasses.length} label classes from: ${classesFilePath}`,
      );
    } else {
      logger.warn('ML model loaded but no classes file found');
      labelClasses = null;
    }

    isInitialized = true;
    logger.info('ML categorization initialized successfully');
    return inferenceSession;
  } catch (error) {
    logger.error('Failed to initialize ML model:', error);
    inferenceSession = null;
    labelClasses = null;
    isInitialized = false;
    return null;
  }
}

/**
 * Load label encoder classes from a .npy file using npyjs
 */
async function loadClassesFile(path: string): Promise<string[]> {
  let resolvedPath = path;

  // For local files, read with fs and pass as an ArrayBuffer to load()
  if (
    !resolvedPath.startsWith('http://') &&
    !resolvedPath.startsWith('https://')
  ) {
    // Strip file:// prefix if present
    if (resolvedPath.startsWith('file://')) {
      resolvedPath = resolvedPath.replace('file://', '');
    }
    const buffer = await readFile(resolvedPath, 'binary');
    // npyjs load() accepts an ArrayBuffer directly
    const npy = await load(buffer.buffer as ArrayBuffer);
    return extractClassesFromNpy(npy);
  }

  // For HTTP URLs, pass directly
  const npy = await load(resolvedPath);
  return extractClassesFromNpy(npy);
}

/**
 * Extract string class labels from a loaded npyjs result.
 * npyjs returns { data, shape, dtype, fortranOrder }
 */
function extractClassesFromNpy(npy: NpyArray<ArrayBufferView>): string[] {
  const { shape, dtype } = npy;
  // Cast data to access it by index - ArrayBufferView doesn't have indexing but typed arrays do
  const data = npy.data as unknown as {
    [index: number]: unknown;
    length: number;
  };

  logger.info(
    `Loaded npy array: shape=${JSON.stringify(shape)}, dtype=${dtype}`,
  );

  const count = shape[0];
  const classes: string[] = [];

  for (let i = 0; i < count; i++) {
    const value = data[i];
    if (typeof value === 'string') {
      classes.push(value);
    } else if (typeof value === 'number') {
      classes.push(String(value));
    } else if (value instanceof Uint8Array) {
      classes.push(new TextDecoder().decode(value));
    } else {
      classes.push(String(value));
    }
  }

  if (classes.length === 0) {
    throw new Error(
      `Failed to extract classes from npy array (dtype: ${dtype}, shape: ${JSON.stringify(shape)})`,
    );
  }

  return classes;
}

/**
 * Reset the ML module state (useful for testing or re-initialization)
 */
export function resetML(): void {
  inferenceSession = null;
  labelClasses = null;
  isInitialized = false;
}

/**
 * Predict the category for a transaction based on its notes
 * Optionally applies preprocessing (cleaning) to notes before prediction.
 *
 * @param notes - The transaction notes/payee to classify
 * @param applyPreprocessing - If true, cleanNotes will be applied to the notes before prediction
 * @returns The predicted category id, or null if prediction fails or ML is disabled
 */
export async function predictCategories(
  notesArray: (string | null | undefined)[],
): Promise<(string | null)[]> {
  if (!isInitialized || !inferenceSession) {
    await initializeML();
    if (!isInitialized || !inferenceSession) {
      return notesArray.map(() => null);
    }
  }

  // Filter and track which indices had valid notes
  const validNotes: string[] = [];
  const indexMap: number[] = [];

  notesArray.forEach((notes, i) => {
    const processed = isPreprocessingEnabled()
      ? cleanNotes(notes)
      : (notes ?? '');
    if (processed.trim() !== '') {
      validNotes.push(processed);
      indexMap.push(i);
    }
  });

  if (validNotes.length === 0) {
    return notesArray.map(() => null);
  }

  try {
    // Batch input: shape [n] instead of [1]
    const inputTensor = new Tensor('string', validNotes, [validNotes.length]);

    const feeds: Record<string, Tensor> = {};
    feeds[inferenceSession.inputNames[0]] = inputTensor;

    const outputData = await inferenceSession.run(feeds, [
      inferenceSession.outputNames[0],
    ]);
    const output = outputData[inferenceSession.outputNames[0]];

    const results: (string | null)[] = new Array(notesArray.length).fill(null);

    if (output.type === 'string') {
      // Model outputs string labels directly
      indexMap.forEach((originalIndex, i) => {
        results[originalIndex] = (output.data as string[])[i] ?? null;
      });
    } else {
      // Model outputs numeric indices → decode with labelClasses
      const predictions = output.data as Float32Array | Int32Array;
      indexMap.forEach((originalIndex, i) => {
        const index = Math.round(Number(predictions[i]));
        if (labelClasses && index >= 0 && index < labelClasses.length) {
          results[originalIndex] = labelClasses[index];
        }
      });
    }

    return results;
  } catch (error) {
    logger.error('ML batch prediction failed:', error);
    return notesArray.map(() => null);
  }
}

/**
 * Apply ML categorization to a batch of transactions
 * This is the main entry point for integrating with the rules system
 *
 * @param transactions - Array of transaction objects to categorize
 * @returns The transactions with potentially modified categories, or originals if ML fails/disabled
 */
export async function applyMLCategorization<
  T extends { id?: string; notes?: string | null; category?: string | null },
>(transactions: T[]): Promise<T[]> {
  // Skip if ML is not enabled
  if (!isMLEnabled()) {
    return transactions;
  }

  // Extract notes from transactions (skip those that already have a category)
  const notes = transactions.map(t => (t.category != null ? null : t.notes));

  // Get batch predictions for all notes
  const predictions = await predictCategories(notes);

  // Apply predictions back to transactions
  return transactions.map((transaction, i) => {
    if (transaction.category != null) {
      // Transaction already has a category, don't override manual rules
      return transaction;
    }

    const predictedCategory = predictions[i];
    if (predictedCategory) {
      logger.debug(
        `ML predicted category ${predictedCategory} for transaction ${transaction.id ?? 'unknown'}`,
      );
      return { ...transaction, category: predictedCategory };
    }

    return transaction;
  });
}

export async function previewMLPredictions(
  transactions: { id: string; notes: string | null | undefined }[],
): Promise<{ id: string; predictedCategory: string | null }[]> {
  if (!isMLEnabled()) {
    return transactions.map(t => ({ id: t.id, predictedCategory: null }));
  }

  const notes = transactions.map(t => t.notes);
  const predictions = await predictCategories(notes);

  return transactions.map((t, i) => ({
    id: t.id,
    predictedCategory: predictions[i],
  }));
}
