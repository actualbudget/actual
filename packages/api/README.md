```
npm install @actual-app/api
```

View docs here: https://actualbudget.org/docs/api/

## TypeScript

`@actual-app/api` publishes TypeScript declarations. Consumers using TypeScript must set `moduleResolution` to `"bundler"`, `"nodenext"`, or `"node16"` in their `tsconfig.json`. Legacy `"node"` / `"node10"` / `"classic"` resolution is not supported in strict mode — the published declarations rely on package.json `exports` conditions that older resolvers don't honor.
