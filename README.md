# api.newt239.dev

## develop

```
pnpm dev
```

## deploy

```
pnpm run deploy
```

## update d1 scheme

```
wrangler d1 execute api.newt239.dev --local --file=./migration.sql
wrangler d1 execute api.newt239.dev --file=./migration.sql
```
