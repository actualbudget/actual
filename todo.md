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
