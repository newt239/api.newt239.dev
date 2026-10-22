# AGENTS.md

## 基本原則

- ユーザーとの対話やコミットメッセージ、エラーメッセージなどは日本語で書く。
- 不明な点は推測で進めず質問する。
- ファイルを削除する前に、対象と影響範囲を報告してユーザーの承認を得る。
- 実装後は `pnpm typecheck` `pnpm lint` `pnpm format` `pnpm knip` `pnpm test` をすべて通す（CI の Codecheck と同じ）。
- エラー解消のために `.oxlintrc.json` や `tsconfig.json` を変更しない。

## 開発コマンド

コマンドは `package.json` の `scripts` を参照。`pnpm lint` と `pnpm format` は検査のみで、修正は `:fix` を使う。

`vitest.config.ts` は起動時に `.dev.vars` を読むため、`.dev.vars` を読めないサンドボックス内では `pnpm test` を実行できない。その場合はユーザーに実行を依頼する。

```bash
wrangler d1 execute newt239.dev --local --file=./db/schema.sql
wrangler d1 execute newt239.dev --local --command='SELECT * FROM themes'
wrangler d1 execute newt239.dev --remote --file=./db/schema.sql
```

## アーキテクチャ

Cloudflare Workers 上で動く Hono の API。DB は D1 (`newt239.dev`) で、AI 生成テーマを `themes` テーブルに保存する。ルートは `src/routes/` にサービスごとに置き、バインディングは `src/types/bindings.ts` で定義する。

- `@cloudflare/vitest-plugin` の peer が `vitest@^4.1.0` のため、vitest は 4 系に固定し、Dependabot でも major 更新を `ignore` している。
- Node と pnpm のバージョンは `package.json` の `devEngines.runtime` と `packageManager` だけで指定し、`.node-version` は置かない。CI の `actions/setup-node` は `node-version-file: "package.json"` で読む。

## コーディングガイドライン

- コメントは原則書かない。必要な場合のみ 1 行以内の日本語で書く。
- 関数はアロー関数で定義する。
- 3 行以下、または呼び出しが 3 回以下の関数はインライン化を検討する。テストのためだけに関数を切り出さず、公開インターフェースに対してテストを書く。
- ファイル名は中身と一致させる（`constants.ts` に関数を置かない）。

## Git 運用

- `main` から `{prefix}/{kebab-case の要約}` のブランチを切る。`main` へ直接コミットしない。
- コミットメッセージは Conventional Commits の prefix（`feat` `fix` `refactor` `docs` `test` `chore` `ci`）付きで、日本語 1 行のみ。目的ごとにコミットを分ける。
  - 例: `feat: テーマ生成の Discord 通知に配色プレビュー画像を添付する`
- 変更の背景や詳細は PR の説明に書く。
- CI の Codecheck が緑になるまでマージしない。Dependabot の PR も手動でマージする。
