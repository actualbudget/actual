// The iOS and Android apps register this URL scheme. Bank linking runs in the
// system browser, which cannot close its own tab, so the page a mobile flow
// ends on reopens the app instead. The app is already polling for the result.
const MOBILE_APP_URL = 'actualbudget://localhost';

export const MOBILE_APP_RETURN_PAGE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Actual</title>
  </head>
  <body>
    <script>
      window.location.replace('${MOBILE_APP_URL}');
    </script>

    <p>All done. You can now return to the Actual app.</p>
    <p><a href="${MOBILE_APP_URL}">Return to Actual</a></p>
  </body>
</html>`;
