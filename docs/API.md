
Previous docs for the API are [here](https://actualbudget.com/docs/developers/using-the-API/). The API is currently being improved. Previously, the API connected to an existing running instance of Actual. Now the API is bundled and fully isolated, capable of running all of Actual itself. Setting up the API is different because of this.

You need to call `init` and pass it the directory where your files live. Call `load-budget` to load the file you want to work on. After that, you can use the same API as before.

Example:

```js
let actual = require('@actual-app/api');

await actual.init({
  config: {
    dataDir: join(__dirname, 'user-files')
  }
});

await actual.internal.send('load-budget', { id: 'My-Finances' });

await actual.getAccounts();
```
