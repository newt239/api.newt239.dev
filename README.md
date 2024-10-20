# api.newt239.dev

## develop

```bash
pnpm dev
```

## deploy

```bash
wrangler deploy
```

## d1 migration

### local

```bash
wrangler d1 execute newt239.dev --local --file=./db/schema.sql
```

```bash
wrangler d1 execute newt239.dev --local --command='SELECT * FROM themes'
```

### remote

```bash
wrangler d1 execute newt239.dev --remote --file=./db/schema.sql
```
