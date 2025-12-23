# Troubleshooting Server Configuration Issues

Actual uses the standard Node.js `debug` module to optionally log helpful debugging information to the console.

If your configuration options (set either in the config file or as environment variables) are not being applied, you can enable debug logging by adding an environment variable named `DEBUG` with the value `actual:config`. If you're seeing issues with your HTTPS configuration, you can instead set the value to `actual:config,actual-sensitive:config` to log the actual values of the HTTPS secrets (which are obscured by default so they don't get leaked unintentionally).

It may be useful to compare your configuration file with the configuration schema. The schema can be found at [/packages/sync-server/src/load-config.js](https://github.com/actualbudget/actual/blob/45530638feaacf74c28fddb846ae91170a99d94e/packages/sync-server/src/load-config.js#L43)
