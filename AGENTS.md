# Coding Agent Guidelines

コーディングエージェント共通の方針です。Claude Code 固有の情報は [CLAUDE.md](./CLAUDE.md) を参照してください。

## 目次

- [基本原則](#基本原則)
- [開発コマンド](#開発コマンド)
- [アーキテクチャ](#アーキテクチャ)
- [コーディングガイドライン](#コーディングガイドライン)
- [Git 運用](#git-運用)

## 基本原則

- ユーザーとの対話やコミットメッセージ、エラーメッセージなどは常に日本語で記述してください。
- 不明な点がある場合は常に質問し、推測で進めてはなりません。
- ファイルの削除を行う場合は、対象ファイルと影響範囲を報告し、実行前に明示的なユーザー承認を得てください。
- 実装後は `pnpm typecheck` `pnpm lint` `pnpm format` `pnpm knip` `pnpm test` をすべて通してください。CI の Codecheck がこの順で同じコマンドを実行します。
- エラーを解消するために `.oxlintrc.json` や `tsconfig.json` を変更してはなりません。

## 開発コマンド

### 基本コマンド

```bash
pnpm dev                # Wranglerでローカル開発サーバーを起動
pnpm deploy             # Cloudflare Workersにデプロイ
pnpm typecheck          # TypeScriptで型チェック
pnpm lint               # Oxlintで検査（型情報つき）
pnpm lint:fix           # Oxlintで自動修正
pnpm format             # Oxfmtでフォーマットを検査
pnpm format:fix         # Oxfmtでフォーマットを適用
pnpm knip               # 未使用のファイル・依存・エクスポートを検出
pnpm test               # Vitestでテストを実行
```

`pnpm lint` と `pnpm format` は検査のみで書き換えません。修正するときは `:fix` のほうを使ってください。

### データベース操作

```bash
# ローカルD1データベース
wrangler d1 execute newt239.dev --local --file=./db/schema.sql
wrangler d1 execute newt239.dev --local --command='SELECT * FROM themes'

# リモートD1データベース
wrangler d1 execute newt239.dev --remote --file=./db/schema.sql
```

## アーキテクチャ

これは複数のサービス統合を持つ**Cloudflare Workers上で動作するHonoベースのAPI**です。

### コア構造

- **フレームワーク**: Cloudflare Workers用Hono
- **データベース**: `themes`テーブルを持つCloudflare D1 (SQLite)
- **ランタイム**: ローカル開発用WranglerでのCloudflare Workers

### 主要サービス統合

- **OpenAI GPT-4o-mini**: `/ai/generate-theme`でのテーマ生成（24時間で100回のレート制限）
- **Spotify Web API**: `/spotify/my-top-tracks`でのOAuth更新フロー付きトップトラック取得
- **Discord Bot**: `/discord/`での署名検証付きスラッシュコマンド処理
- **GitHubリリース通知**: `/github/notify-releases`とCron Triggers（15分毎）でGitHubの未読リリース通知をDiscordへ転送し、inboxでdoneにする
- **ラボ機能**: `/lab/`での実験的エンドポイント

### ルート構成

ルートは`src/routes/`でサービスごとに整理：

- `ai/` - テーマ生成用OpenAI統合
- `discord/` - Discordボットのインタラクションとウェブフック
- `spotify/` - Spotify API統合
- `github/` - GitHubのリリース通知転送
- `lab/` - 実験的機能

### データベーススキーマ

単一の`themes`テーブルがAI生成カラーテーマを自動インクリメントIDとタイムスタンプで保存。

### 環境バインディング

Cloudflare Workersバインディングを使用：

- OpenAI API認証情報
- SpotifyAPIトークンと更新トークン
- DiscordボットトークンとウェブフックURL、リリース通知先チャンネルID
- GitHubのclassic PAT（`notifications`スコープが必須。fine-grained PATはNotifications API非対応）
- D1データベースバインディング（`newt239.dev`）

### テスト設定

- Workers環境シミュレーション用`@cloudflare/vitest-plugin`でのVitest
- テスト設定でのデータベースマイグレーション適用
- Honoのテストクライアントを使用した統合テスト

`@cloudflare/vitest-plugin`のpeerが`vitest@^4.1.0`のため、vitestは4系に固定しています。Dependabotでもvitestのmajor更新を`ignore`しています。

### TypeScript設定

- パスエイリアス：`~/`が`src/`にマップ
- Hono JSXランタイム設定
- モダン機能有効化のESNextターゲット

### Node と pnpm のバージョン

`package.json`の`devEngines.runtime`と`packageManager`が唯一の指定です。`.node-version`は置きません。CIの`actions/setup-node`は`node-version-file: "package.json"`でここを読みます。

## コーディングガイドライン

### コメントの禁止

- 原則としてコード中にコメントは書かないでください。コードそのもので意図が伝わるように命名・構造化します。
- どうしても必要な場合のみ、1行以内の日本語で記述してください。

### アロー関数

- 関数は**アロー関数**で定義してください。

### 過度な抽象化の禁止

**関数を不用意に増やさない**でください。次に当てはまるものはインライン化を検討します:

- 3 行以下の関数
- 3 回以下しか呼ばれていない関数

とりわけ、**テストを書くためだけに処理を関数へ切り出すことは禁止**です。テストは公開されているインターフェースに対して書き、内部実装は呼び出し側に展開したままにしてください。

### ファイル名

ファイル名は中身と一致させてください。`constants.ts`のような名前のファイルに関数を置かず、責務に応じた名前のモジュールへ配置します。

## Git 運用

### ブランチ

- `main` から作業ブランチを切ってください。`main` へ直接コミットしてはなりません。
- ブランチ名は `{prefix}/{kebab-case の要約}` とします。prefix はコミットメッセージと同じものを使ってください。

### コミットメッセージ

- 日本語で、1 行以内で書いてください。本文や箇条書きの説明は書きません。
- Conventional Commits の prefix を付けてください。
  - `feat:` 機能追加
  - `fix:` バグ修正
  - `refactor:` 挙動を変えない内部改善
  - `docs:` ドキュメントのみの変更
  - `test:` テストのみの変更
  - `chore:` 依存更新・設定変更など上記に当てはまらないもの
  - `ci:` GitHub Actions などの CI 設定の変更

```
feat: テーマ生成の Discord 通知に配色プレビュー画像を添付する
```

- 目的ごとにコミットを分けてください。無関係な変更を 1 つのコミットに混ぜてはなりません。

### プルリクエスト

- 変更の背景や詳細はコミットメッセージではなく PR の説明に書いてください。
- CI の Codecheck が緑になるまでマージしてはなりません。Dependabot の PR も含めてマージは手動で行います。
