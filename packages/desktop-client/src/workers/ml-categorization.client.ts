type MLConfig = {
  modelUrl: string;
  classesUrl: string;
  preprocessingEnabled: boolean;
};

type PendingRequest = {
  resolve: (value: (string | null)[]) => void;
  reject: (reason: Error) => void;
};

export class MLCategorizationWorkerClient {
  private worker: Worker;
  private pending = new Map<string, PendingRequest>();
  private initPromise: Promise<void> | null = null;
  private idCounter = 0;
  private initResolve: ((value: void) => void) | null = null;
  private initReject: ((reason: Error) => void) | null = null;

  constructor() {
    this.worker = new Worker(
      new URL('./ml-categorization.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      const msg = event.data as Record<string, unknown>;

      if (msg.type === 'init-result') {
        if (msg.success) {
          this.initResolve?.();
        } else {
          this.initReject?.(
            new Error(String(msg.error ?? 'ML initialization failed')),
          );
        }
        this.initResolve = null;
        this.initReject = null;
        return;
      }

      if (msg.type === 'predict-result') {
        const id = String(msg.id);
        const req = this.pending.get(id);
        if (!req) return;
        this.pending.delete(id);
        if (msg.error) {
          req.reject(new Error(String(msg.error)));
        } else {
          req.resolve(msg.results as (string | null)[]);
        }
      }
    };

    this.worker.onerror = error => {
      console.error('ML worker error:', error);
      this.initReject?.(new Error('ML worker crashed'));
      this.initReject = null;
      this.initResolve = null;
      for (const [, req] of this.pending) {
        req.reject(new Error('ML worker crashed'));
      }
      this.pending.clear();
    };
  }

  async initialize(config: MLConfig): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;
      this.worker.postMessage({ type: 'init', config });
    });

    return this.initPromise;
  }

  async predict(
    notesArray: (string | null | undefined)[],
  ): Promise<(string | null)[]> {
    if (!this.initPromise) {
      throw new Error('ML client not initialized. Call initialize() first.');
    }
    await this.initPromise;

    const id = `${Date.now()}-${++this.idCounter}`;
    return new Promise<(string | null)[]>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ type: 'predict', id, notesArray });
    });
  }

  terminate(): void {
    this.worker.terminate();
    this.pending.clear();
    this.initPromise = null;
  }
}
