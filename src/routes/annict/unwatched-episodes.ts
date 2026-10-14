import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { getUnwatchedEpisodes } from "~/libs/annict";

import type { Bindings } from "~/types/bindings";

const episodeSchema = z.object({
  annictId: z.number().openapi({ example: 12345 }),
  number: z.number().nullable().openapi({ example: 3 }),
  numberText: z.string().nullable().openapi({ example: "第3羽" }),
  title: z.string().nullable().openapi({ example: "初めての喫茶店" }),
  startedAt: z.string().openapi({ example: "2026-10-10T22:00:00+09:00" }),
});

const workSchema = z.object({
  annictId: z.number().openapi({ example: 5680 }),
  title: z.string().openapi({ example: "ご注文はうさぎですか？" }),
  officialSiteUrl: z.string().nullable().openapi({ example: "https://www.gochiusa.com/" }),
  imageUrl: z.string().nullable().openapi({ example: "https://api-assets.annict.com/..." }),
  channelName: z.string().openapi({ example: "TOKYO MX" }),
  episodes: z.array(episodeSchema),
});

const unwatchedEpisodesResponseSchema = z.object({
  totalCount: z.number().openapi({ example: 3 }),
  works: z.array(workSchema),
});

const route = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unwatchedEpisodesResponseSchema,
        },
      },
      description: "見ている作品の放送済み未視聴エピソード一覧",
    },
  },
  tags: ["Annict"],
  summary: "Annictの放送済み未視聴エピソードを取得",
  description:
    "Annictで「見てる」に登録している作品のうち、放送済みでまだ視聴記録のないエピソードを作品ごとにまとめて返します。ライブラリでチャンネルを選んでいない作品は含まれません。",
});

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(route, async (c) => {
  const result = await getUnwatchedEpisodes(c.env.ANNICT_API_TOKEN);
  return c.json(result);
});

export default app;
