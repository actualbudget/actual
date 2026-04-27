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

import { load } from "npyjs";
import type { NpyArray } from "npyjs";
import { InferenceSession, Tensor } from "onnxruntime-web";

import { readFile } from "#platform/server/fs";
import { logger } from "#platform/server/log";

/**
 * Get the ONNX model path from environment variable
 */
export function getModelPath(): string | undefined {
  return process.env["ACTUAL_ML_MODEL_PATH"];
}

/**
 * Get the classes file path from environment variable.
 * Falls back to model path with '_classes.npy' suffix.
 */
export function getClassesPath(): string | undefined {
  const classesPath = process.env["ACTUAL_ML_CLASSES_PATH"];
  if (classesPath) {
    return classesPath;
  }

  const modelPath = getModelPath();
  if (modelPath) {
    return modelPath.replace(/\.onnx$/i, "_classes.npy");
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
 * Check if note preprocessing is enabled.
 * When enabled, notes will be cleaned (removing location strings) before prediction.
 */
export function isPreprocessingEnabled(): boolean {
  return process.env["ACTUAL_ML_APPLY_PREPROCESSING"] === "true";
}

/**
 * Clean notes by removing UK-specific location tokens and normalising whitespace.
 *
 * These tokens ("London", "GB", "GBR", "ENG") appear frequently as suffixes in
 * UK open-banking payee strings and add noise without predictive value. The model
 * was trained on data with these tokens removed, so the same cleaning must be
 * applied at inference time when preprocessing is enabled.
 *
 * ⚠️  Side-effect: payee names that legitimately contain these strings (e.g.
 * "England Bakery") will also be affected. Keep this in mind if the model is
 * ever retrained on non-UK data.
 *
 * @param notes - Raw notes string
 * @returns Cleaned notes with location tokens removed and whitespace normalised
 */
export function cleanNotes(notes: string | null | undefined): string {
  if (!notes) {
    return "";
  }
  const LOCATION_PATTERNS = /\b(London|GB|GBR|ENG)\b/gi;
  const WHITESPACE_PATTERN = /\s+/g;
  let cleaned = String(notes);
  cleaned = cleaned.replace(LOCATION_PATTERNS, "");
  cleaned = cleaned.replace(WHITESPACE_PATTERN, " ").trim();

  return cleaned;
}

// ---------------------------------------------------------------------------
// Module-level singleton state
// ---------------------------------------------------------------------------

let inferenceSession: InferenceSession | null = null;
let labelClasses: string[] | null = null;
let isInitialized = false;

/**
 * A single shared promise for the in-flight initialisation.
 * Subsequent callers while init is running will await the same promise rather
 * than racing to load the model a second time.
 */
let initPromise: Promise<InferenceSession | null> | null = null;

/**
 * Set to true after a failed initialisation attempt so that callers don't
 * repeatedly retry (and spam logs) on every prediction call.
 */
let initializationFailed = false;

// ---------------------------------------------------------------------------

/**
 * Internal implementation of model initialisation.
 * Always call initializeML() externally — it provides the concurrency guard.
 */
async function _doInitializeML(
  modelPath?: string,
  classesPath?: string
): Promise<InferenceSession | null> {
  const modelFilePath = modelPath ?? getModelPath();
  const classesFilePath = classesPath ?? getClassesPath();

  if (!modelFilePath) {
    logger.warn("ML categorization disabled: ACTUAL_ML_MODEL_PATH not set");
    isInitialized = false;
    inferenceSession = null;
    labelClasses = null;
    return null;
  }

  try {
    logger.info(`Initializing ML model from: ${modelFilePath}`);

    inferenceSession = await InferenceSession.create(modelFilePath, {
      executionProviders: ["wasm"], // CPU execution; can add 'webgl' for GPU acceleration
      graphOptimizationLevel: "all",
    });

    if (classesFilePath) {
      labelClasses = await loadClassesFile(classesFilePath);
      logger.info(
        `Loaded ${labelClasses.length} label classes from: ${classesFilePath}`
      );
    } else {
      logger.warn("ML model loaded but no classes file found");
      labelClasses = null;
    }

    isInitialized = true;
    initializationFailed = false;
    logger.info("ML categorization initialized successfully");
    return inferenceSession;
  } catch (error) {
    logger.error("Failed to initialize ML model:", error);
    inferenceSession = null;
    labelClasses = null;
    isInitialized = false;
    initializationFailed = true;
    return null;
  }
}

/**
 * Initialize the ONNX model and label encoder classes.
 * Safe to call concurrently — multiple callers share a single in-flight
 * promise so the model is never loaded more than once.
 *
 * @param modelPath - Optional override for the model path
 * @param classesPath - Optional override for the classes path
 */
export async function initializeML(
  modelPath?: string,
  classesPath?: string
): Promise<InferenceSession | null> {
  if (!initPromise) {
    initPromise = _doInitializeML(modelPath, classesPath);
  }
  return initPromise;
}

/**
 * Load label encoder classes from a .npy file using npyjs
 */
async function loadClassesFile(path: string): Promise<string[]> {
  let resolvedPath = path;

  if (
    !resolvedPath.startsWith("http://") &&
    !resolvedPath.startsWith("https://")
  ) {
    if (resolvedPath.startsWith("file://")) {
      resolvedPath = resolvedPath.replace("file://", "");
    }
    const buffer = await readFile(resolvedPath, "binary");
    const npy = await load(buffer.buffer as ArrayBuffer);
    return extractClassesFromNpy(npy);
  }

  const npy = await load(resolvedPath);
  return extractClassesFromNpy(npy);
}

/**
 * Extract string class labels from a loaded npyjs result.
 * npyjs returns { data, shape, dtype, fortranOrder }
 */
function extractClassesFromNpy(npy: NpyArray<ArrayBufferView>): string[] {
  const { shape, dtype } = npy;
  const data = npy.data as unknown as {
    [index: number]: unknown;
    length: number;
  };

  logger.info(
    `Loaded npy array: shape=${JSON.stringify(shape)}, dtype=${dtype}`
  );

  const count = shape[0];
  const classes: string[] = [];

  for (let i = 0; i < count; i++) {
    const value = data[i];
    if (typeof value === "string") {
      classes.push(value);
    } else if (typeof value === "number") {
      classes.push(String(value));
    } else {
      // Fallback for any unexpected type — stringify rather than silently drop
      classes.push(String(value));
    }
  }

  if (classes.length === 0) {
    throw new Error(
      `Failed to extract classes from npy array (dtype: ${dtype}, shape: ${JSON.stringify(
        shape
      )})`
    );
  }

  return classes;
}

/**
 * Reset the ML module state (useful for testing or re-initialization).
 * Also clears the concurrency guard so initializeML() can be called again.
 */
export function resetML(): void {
  inferenceSession = null;
  labelClasses = null;
  isInitialized = false;
  initializationFailed = false;
  initPromise = null;
}

/**
 * Predict the category for a batch of transaction notes.
 * Optionally applies preprocessing (cleaning) to notes before prediction.
 *
 * @param notesArray - The transaction notes/payee strings to classify
 * @returns Predicted category ids in the same order, or null for each entry
 *          where prediction is not possible
 */
export async function predictCategories(
  notesArray: (string | null | undefined)[]
): Promise<(string | null)[]> {
  // Bail out immediately if a previous initialisation attempt already failed —
  // no point retrying on every call and spamming the logs.
  if (initializationFailed) {
    return notesArray.map(() => null);
  }

  if (!isInitialized || !inferenceSession) {
    await initializeML();
    if (!isInitialized || !inferenceSession) {
      return notesArray.map(() => null);
    }
  }

  // Build a compact list of non-empty notes, remembering each one's original
  // index so results can be mapped back correctly.
  const validNotes: string[] = [];
  const indexMap: number[] = [];

  notesArray.forEach((notes, i) => {
    const processed = isPreprocessingEnabled()
      ? cleanNotes(notes)
      : notes ?? "";
    if (processed.trim() !== "") {
      validNotes.push(processed);
      indexMap.push(i);
    }
  });

  if (validNotes.length === 0) {
    return notesArray.map(() => null);
  }

  try {
    const inputTensor = new Tensor("string", validNotes, [validNotes.length]);

    const feeds: Record<string, Tensor> = {};
    feeds[inferenceSession.inputNames[0]] = inputTensor;

    const outputData = await inferenceSession.run(feeds, [
      inferenceSession.outputNames[0],
    ]);
    const output = outputData[inferenceSession.outputNames[0]];

    const results: (string | null)[] = new Array(notesArray.length).fill(null);

    if (output.type === "string") {
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
    logger.error("ML batch prediction failed:", error);
    return notesArray.map(() => null);
  }
}

/**
 * Apply ML categorization to a batch of transactions.
 * This is the main entry point for integrating with the rules system.
 *
 * Transactions that already have a category are left untouched — ML predictions
 * never override categories set by manual rules.
 *
 * @param transactions - Array of transaction objects to categorize
 * @returns The transactions with potentially modified categories, or originals
 *          if ML is disabled or prediction fails
 */
export async function applyMLCategorization<
  T extends { id?: string; notes?: string | null; category?: string | null }
>(transactions: T[]): Promise<T[]> {
  if (!isMLEnabled()) {
    return transactions;
  }

  // Separate transactions that need categorisation from those that already have
  // a category. Only the former are sent to the model.
  const uncategorised = transactions.filter((t) => t.category == null);

  if (uncategorised.length === 0) {
    return transactions;
  }

  const notes = uncategorised.map((t) => t.notes);
  const predictions = await predictCategories(notes);

  // Build a lookup from transaction id → prediction for O(1) application below.
  // Falls back to index-based matching for transactions without an id.
  const predictionByIndex = new Map<T, string | null>(
    uncategorised.map((t, i) => [t, predictions[i]])
  );

  return transactions.map((transaction) => {
    if (transaction.category != null) {
      return transaction;
    }

    const predictedCategory = predictionByIndex.get(transaction) ?? null;
    if (predictedCategory) {
      logger.debug(
        `ML predicted category ${predictedCategory} for transaction ${
          transaction.id ?? "unknown"
        }`
      );
      return { ...transaction, category: predictedCategory };
    }

    return transaction;
  });
}

export async function previewMLPredictions(
  transactions: { id: string; notes: string | null | undefined }[]
): Promise<{ id: string; predictedCategory: string | null }[]> {
  if (!isMLEnabled()) {
    return transactions.map((t) => ({ id: t.id, predictedCategory: null }));
  }

  const notes = transactions.map((t) => t.notes);
  const predictions = await predictCategories(notes);

  return transactions.map((t, i) => ({
    id: t.id,
    predictedCategory: predictions[i],
  }));
}
