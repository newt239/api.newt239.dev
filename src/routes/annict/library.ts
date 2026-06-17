import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { getAnnictLibraryEntries } from "~/libs/annict";

import type { Bindings } from "~/types/bindings";

const libraryQuerySchema = z.object({
  state: z.enum(["watching", "watched", "wanna_watch", "on_hold", "stop_watching"]).openapi({
    param: {
      name: "state",
      in: "query",
    },
    example: "watching",
    description: "取得する視聴ステータス（watching=見ている / watched=見た）",
  }),
  first: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .openapi({
      param: {
        name: "first",
        in: "query",
      },
      example: 50,
      description: "取得件数（1〜100、デフォルト50）",
    }),
  after: z
    .string()
    .optional()
    .openapi({
      param: {
        name: "after",
        in: "query",
      },
      description: "次ページ取得用のカーソル（pageInfo.endCursorを指定）",
    }),
});

const workSchema = z.object({
  annictId: z.number().openapi({ example: 5680 }),
  title: z.string().openapi({ example: "ご注文はうさぎですか？" }),
  titleEn: z.string().nullable().openapi({ example: "Is the Order a Rabbit?" }),
  seasonName: z.string().nullable().openapi({ example: "SPRING" }),
  seasonYear: z.number().nullable().openapi({ example: 2014 }),
  imageUrl: z.string().nullable().openapi({
    example: "https://api-assets.annict.com/...",
  }),
  episodesCount: z.number().openapi({ example: 12 }),
  watchersCount: z.number().openapi({ example: 3000 }),
  officialSiteUrl: z.string().nullable().openapi({
    example: "https://www.gochiusa.com/",
  }),
  state: z.string().nullable().openapi({ example: "WATCHING" }),
  nextEpisodeNumber: z.number().nullable().openapi({ example: 3 }),
});

const libraryResponseSchema = z.object({
  works: z.array(workSchema),
  pageInfo: z.object({
    endCursor: z.string().nullable(),
    hasNextPage: z.boolean(),
  }),
});

const route = createRoute({
  method: "get",
  path: "/",
  request: {
    query: libraryQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: libraryResponseSchema,
        },
      },
      description: "指定ステータスの視聴ライブラリ一覧",
    },
  },
  tags: ["Annict"],
  summary: "Annictの視聴ライブラリを取得",
  description:
    "Annictで自分が登録している作品をステータス別（見ている/見たなど）に取得します。カーソルページングに対応しています。",
});

const emptyResponse = {
  works: [],
  pageInfo: { endCursor: null, hasNextPage: false },
};

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(route, async (c) => {
  const { state, first, after } = c.req.valid("query");

  const result = await getAnnictLibraryEntries(
    c.env.ANNICT_API_TOKEN,
    [state.toUpperCase()],
    first,
    after,
  );

  if (!result || result.errors || !result.data?.viewer) {
    if (result?.errors) {
      console.error(result.errors);
    }
    return c.json(emptyResponse);
  }

  const { nodes, pageInfo } = result.data.viewer.libraryEntries;

  const works = nodes.map((node) => ({
    annictId: node.work.annictId,
    title: node.work.title,
    titleEn: node.work.titleEn || null,
    seasonName: node.work.seasonName ?? null,
    seasonYear: node.work.seasonYear ?? null,
    imageUrl: node.work.image?.facebookOgImageUrl || node.work.image?.recommendedImageUrl || null,
    episodesCount: node.work.episodesCount,
    watchersCount: node.work.watchersCount,
    officialSiteUrl: node.work.officialSiteUrl || null,
    state: node.status?.state ?? null,
    nextEpisodeNumber: node.nextEpisode?.number ?? null,
  }));

  return c.json({ works, pageInfo });
});

export default app;
