import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Hono } from "hono";
import { z } from "zod";

import { getLibraryWorks } from "~/libs/annict";
import { getMyTopTracks } from "~/libs/spotify";

import type { Bindings } from "~/types/bindings";

const createMcpServer = (env: Bindings): McpServer => {
  const server = new McpServer({
    name: "api.newt239.dev",
    version: "1.0.0",
  });

  server.registerTool(
    "annict_library",
    {
      title: "Annictの視聴ライブラリを取得",
      description:
        "newtがAnnictで登録しているアニメ作品をステータス別（watching=見ている / watched=見た など）に取得します。orderByで並び替え、currentSeason=trueで今期の作品のみに絞り込めます。カーソルページングに対応しています。",
      inputSchema: {
        state: z
          .enum(["watching", "watched", "wanna_watch", "on_hold", "stop_watching"])
          .default("watching")
          .describe("取得する視聴ステータス。未指定の場合はwatching。"),
        orderBy: z
          .enum(["annictId", "watchersCount", "titleEn", "season"])
          .optional()
          .describe("並び替えの基準。season=放送年+季節（古い順）。未指定の場合はAnnictの登録順。"),
        order: z
          .enum(["asc", "desc"])
          .default("asc")
          .describe("並び順（asc=昇順 / desc=降順）。orderBy指定時のみ有効。"),
        currentSeason: z
          .boolean()
          .optional()
          .describe("trueを指定するとリクエスト時点のクール（今期）の作品のみ取得する。"),
        first: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(50)
          .describe("取得件数（1〜100、デフォルト50）"),
        after: z
          .string()
          .optional()
          .describe("次ページ取得用のカーソル（pageInfo.endCursorを指定）"),
      },
    },
    async ({ state, orderBy, order, currentSeason, first, after }) => {
      const result = await getLibraryWorks(env.ANNICT_API_TOKEN, {
        state,
        orderBy,
        order,
        currentSeason,
        first,
        after,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    },
  );

  server.registerTool(
    "spotify_top_tracks",
    {
      title: "Spotifyのトップトラックを取得",
      description:
        "newtのSpotify短期間（直近約4週間）のトップトラックを最大50曲取得します。曲名・アーティスト・人気度・リンクなどを含みます。",
    },
    async () => {
      const tracks = await getMyTopTracks(
        env.SPOTIFY_CLIENT_ID,
        env.SPOTIFY_CLIENT_SECRET,
        env.REFRESH_TOKEN,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(tracks) }],
      };
    },
  );

  return server;
};

const app = new Hono<{ Bindings: Bindings }>();

app.all("/", async (c) => {
  const server = createMcpServer(c.env);
  const transport = new StreamableHTTPTransport();
  await server.connect(transport);
  return transport.handleRequest(c);
});

export default app;
