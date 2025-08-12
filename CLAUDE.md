# CLAUDE.md

このファイルはClaude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## コマンド

### 開発
```bash
pnpm dev                # Wranglerでローカル開発サーバーを起動
pnpm deploy             # Cloudflare Workersにデプロイ
pnpm lint               # ESLintを自動修正付きで実行
pnpm format             # Prettierでコードをフォーマット
pnpm test               # Vitestでテストを実行
```

### データベース操作
```bash
# ローカルD1データベース
wrangler d1 execute newt239.dev --local --file=./db/schema.sql
wrangler d1 execute newt239.dev --local --command='SELECT * FROM themes'

# リモートD1データベース
wrangler d1 execute newt239.dev --remote --file=./db/schema.sql
```

## アーキテクチャ

これは複数のサービス統合を持つ**Cloudflare Workers上で動作するHonoベースのAPI**です：

### コア構造
- **フレームワーク**: Cloudflare Workers用Hono v4.7.1
- **データベース**: `themes`テーブルを持つCloudflare D1 (SQLite)
- **ランタイム**: ローカル開発用WranglerでのCloudflare Workers

### 主要サービス統合
- **OpenAI GPT-4o-mini**: `/ai/generate-theme`でのテーマ生成（24時間で100回のレート制限）
- **Spotify Web API**: `/spotify/my-top-tracks`でのOAuth更新フロー付きトップトラック取得
- **Discord Bot**: `/discord/`での署名検証付きスラッシュコマンド処理
- **ラボ機能**: `/lab/`での実験的エンドポイント

### ルート構成
ルートは`src/routes/`でサービスごとに整理：
- `ai/` - テーマ生成用OpenAI統合
- `discord/` - Discordボットのインタラクションとウェブフック
- `spotify/` - Spotify API統合
- `lab/` - 実験的機能

### データベーススキーマ
単一の`themes`テーブルがAI生成カラーテーマを自動インクリメントIDとタイムスタンプで保存。

### 環境バインディング
Cloudflare Workersバインディングを使用：
- OpenAI API認証情報
- SpotifyAPIトークンと更新トークン
- DiscordボットトークンとウェブフックURL
- D1データベースバインディング（`newt239.dev`）

### テスト設定
- Workers環境シミュレーション用`@cloudflare/vitest-pool-workers`でのVitest
- テスト設定でのデータベースマイグレーション適用
- Honoのテストクライアントを使用した統合テスト

### TypeScript設定
- パスエイリアス：`~/`が`src/`にマップ
- Hono JSXランタイム設定
- モダン機能有効化のESNextターゲット