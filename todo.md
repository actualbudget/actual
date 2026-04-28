need to setup the electron desktop application.

Need to comeback and check why the electron app is not run§

### Todos:

find a way to run onnx model on javascript, then create a function that predict the category!

After that check where to put it in the codebase.

```
yarn ts-node -e "import { initializeML, predictCategories, isMLEnabled } from './packages/loot-core/src/server/ml-categorization';
async function test() {
  console.log('ML Enabled:', isMLEnabled());
  await initializeML();
  const results = await predictCategories([ 'Grocery shopping at Tesco', 'Netflix subscription', null, 'Shell petrol station', ]);
  console.log('Predicted:', results);
}
test();"
```

Come back and learn about worker and then move the worker to the web directly.

---

### Debug Notes: ML Worker Protobuf Error (2026-04-28)

**Problem:** Worker fetches `http://localhost:5006/ml-models/classifier.onnx` but receives the Actual web app's `index.html` instead of the binary ONNX model. Buffer is 2969 bytes with `content-type: text/html`.

**Root cause identified:**

1. **Path resolution bug in sync server:**  
   `packages/sync-server/src/app.ts` uses `resolve(fileURLToPath(import.meta.url), '../../..', 'ml-models')`.  
   Tracing this: `app.ts` → `src/` → `sync-server/` → `packages/` → stops at `packages/`, **not** the repo root.  
   The actual `ml-models/` dir is at repo root (`/Users/esp.py/Projects/actual/ml-models`).  
   → Need `../../../../ml-models` (4 levels up) or `resolve(process.cwd(), '../../ml-models')`.

2. **Dev mode proxy swallows 404s:**  
   In `NODE_ENV=development`, the sync server sets up a catch-all proxy to `localhost:3001` (Vite dev server) at the end of its middleware chain.  
   Even if the static file middleware is registered first, when the file is not found Express calls `next()`, and the proxy middleware catches it and returns the SPA HTML.  
   The proxy has no path filter — it proxies everything.

**Possible fixes (pick one):**

1. **Fix the path** so `express.static` actually finds the files.  
   Then the static middleware will serve them and the proxy never gets reached.

2. **Add a proxy path filter** to exclude `/ml-models` from being proxied to Vite.  
   E.g. use `createProxyMiddleware({ filter: (path) => !path.startsWith('/ml-models'), ... })`.

3. **Serve models via Vite's `public` dir** or configure a Vite proxy for `/ml-models` pointing back to the sync server.  
   More complex but keeps everything on one port.

4. **Use the Vite dev server URL directly** (`localhost:3001/ml-models/...`) instead of `localhost:5006`.  
   Would require configuring Vite to serve or proxy the model files.

**Recommendation:** Fix #1 (correct the path) + add a short-circuit handler so 404s on `/ml-models` don't fall through to the proxy.  
    Something like `app.use('/ml-models', express.static(modelPath), (req, res) => res.status(404).send('Model not found'))`.

---

### Debug Notes: ML Worker Output Tensor Error (2026-04-28)

**Problem:** Model loads successfully (5586 bytes, `application/octet-stream`), but inference fails with:
```
Error: Can't access output tensor data on index 1.
ERROR_CODE: 9, ERROR_MESSAGE: Reading data from non-tensor typed value is not supported.
```

**Context:**
- The model is a scikit-learn text classifier exported to ONNX.
- Input is a `Tensor('string', [...], [batchSize])`.
- The error happens inside `session.run(feeds)` itself — ONNX Runtime can't read the output value.
- GitHub issue #14493 suggests this happens when the model outputs a **sequence** or **map** type instead of a dense tensor.

**Next step (for tomorrow):**
Add logging right after `session.run()` to inspect `session.outputNames` and `outputData` structure. Need to determine if the output is:
- An array of tensors (sequence)
- A dictionary/map
- A tensor with `.data` that needs `await output.getData()` instead of direct `.data` access

**Hypothesis:** The model's ONNX graph outputs a sequence of maps (class probabilities) rather than a single dense tensor. In that case we need to iterate the sequence or extract the map values differently.


-------


The output thing is working need to make sure now that it updating after prediction.
