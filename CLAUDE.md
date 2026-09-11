# CLAUDE.md

このファイルはClaude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

開発コマンド、アーキテクチャ、コーディングガイドライン、Git 運用は [AGENTS.md](./AGENTS.md) にまとめています。まずそちらを読んでください。

> [!IMPORTANT]
> Claude Codeはサンドボックス内で動作し`.dev.vars`を読み取れません。`vitest.config.ts`は起動時に`.dev.vars`を読むため、`pnpm test`はサンドボックス内では実行できません。テストの実行はユーザーに依頼してください（例: プロンプトで `! pnpm test` を実行してもらう）。
