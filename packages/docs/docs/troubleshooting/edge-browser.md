# Microsoft Edge browser

## Common Problems

### A problem loading the app in this browser version

Check the browser console. If it has an error reading

```bash
Error: no native wasm support detected
```

Edge (assuming you have a recent version) may be disabling WASM for your Actual domain. This
seems to be standard behavior for their security features.

To mitigate this, we will add an exception.

1. Open Edge's settings and navigate to the section labeled "Enhance your security on the web".
2. Select the arrow adjacent to "Exceptions".
3. Click the "Add a site" button and enter the domain where your Actual instance is hosted.
