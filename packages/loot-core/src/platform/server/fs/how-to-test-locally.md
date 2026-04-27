```ACTUAL_ML_MODEL_PATH=/Users/esp.py/Projects/Personal/transaction-classifier/models/classifier.onnx
ACTUAL_ML_CLASSES_PATH=/Users/esp.py/Projects/Personal/transaction-classifier/models/classifier_classes.npy
ACTUAL_ML_APPLY_PREPROCESSING=true \
yarn ts-node -e "
import { initializeML, predictCategory, isMLEnabled } from './packages/loot-core/src/server/ml-categorization';
async function test() {
  console.log('ML Enabled:', isMLEnabled());
  await initializeML();
  const result = await predictCategory('Grocery shopping at Tesco');
  console.log('Predicted:', result);
}
test();
"
```
