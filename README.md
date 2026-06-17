# api.newt239.dev

## develop

```bash
pnpm dev
```

## deploy

```bash
npx wrangler deploy
```

## 環境変数

ローカル開発では `.dev.vars` に記述する。Workers 本番環境へはコマンド経由で登録する。

### 登録

```bash
npx wrangler secret put SOMETHING_API_TOKEN
```

### 一覧・削除

```bash
npx wrangler secret list
npx wrangler secret delete SOMETHING_API_TOKEN
```

## d1 migration

### local

```bash
npx wrangler d1 execute newt239.dev --local --file=./db/schema.sql
```

```bash
npx wrangler d1 execute newt239.dev --local --command='SELECT * FROM themes'
```

### remote

```bash
npx wrangler d1 execute newt239.dev --remote --file=./db/schema.sql
```
