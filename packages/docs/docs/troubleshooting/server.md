# Troubleshooting Server Configuration Issues

Actual uses the standard Node.js `debug` module to optionally log helpful debugging information to the console.

If your configuration options (set either in the config file or as environment variables) are not being applied, you can enable debug logging by adding an environment variable named `DEBUG` with the value `actual:config`. If you're seeing issues with your HTTPS configuration, you can instead set the value to `actual:config,actual-sensitive:config` to log the actual values of the HTTPS secrets (which are obscured by default so they don't get leaked unintentionally).

It may be useful to compare your configuration file with the configuration schema. The schema can be found at [/packages/sync-server/src/load-config.js](https://github.com/actualbudget/actual/blob/45530638feaacf74c28fddb846ae91170a99d94e/packages/sync-server/src/load-config.js#L43)

## Troubleshooting Sign-In and Bank Connections

Ordinary logs include request paths, response statuses, and short error summaries. Provider messages and full error details are available through the existing sensitive debug logging option when needed for support.

:::caution
Sensitive logs may contain credentials, bank information, or other private data. They appear in your existing server console or container logs, not in a separate file. Do not post them in public issues or Discord channels. If a maintainer requests them, arrange a private exchange, such as a Discord direct message.
:::

1. Add the appropriate value below to your server's `DEBUG` environment variable. If `DEBUG` already has a value, append the new value after a comma.

   | Problem                           | `DEBUG` Value                                                |
   | --------------------------------- | ------------------------------------------------------------ |
   | OpenID sign-in                    | `actual-sensitive:openid`                                    |
   | Enable Banking connection         | `actual-sensitive:enable-banking,actual-sensitive:bank-sync` |
   | Akahu connection                  | `actual-sensitive:bank-sync`                                 |
   | SimpleFIN connection              | `actual-sensitive:simplefin,actual-sensitive:bank-sync`      |
   | GoCardless connection             | `actual-sensitive:gocardless,actual-sensitive:bank-sync`     |
   | Pluggy connection                 | `actual-sensitive:pluggy,actual-sensitive:bank-sync`         |
   | Other server errors               | `actual-sensitive:server`                                    |
   | Plugin download through the proxy | `actual-sensitive:cors-proxy`                                |

2. Restart the server, then repeat the action that failed.
3. Save the relevant log output for the maintainer helping you.
4. Restore your previous `DEBUG` setting and restart the server to stop collecting sensitive diagnostics. Turning logging off does not remove the output already collected.

Use the specific namespace needed for the problem. `DEBUG=actual:*` enables ordinary debugging without these sensitive namespaces. Broad patterns such as `DEBUG=*` or `DEBUG=actual*` also enable sensitive output, including the existing configuration-secret logging.
