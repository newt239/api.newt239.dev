import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { getAnnictLibraryEntries } from "~/libs/annict";

import type { Bindings } from "~/types/bindings";

const libraryQuerySchema = z.object({
  state: z
    .enum(["watching", "watched", "wanna_watch", "on_hold", "stop_watching"])
    .default("watching")
    .openapi({
      param: {
        name: "state",
        in: "query",
      },
      example: "watching",
      description:
        "取得する視聴ステータス（watching=見ている / watched=見た）。未指定の場合はwatching。",
    }),
  orderBy: z
    .enum(["annictId", "watchersCount", "titleEn", "season"])
    .optional()
    .openapi({
      param: {
        name: "orderBy",
        in: "query",
      },
      example: "watchersCount",
      description: "並び替えの基準。season=放送年+季節（古い順）。未指定の場合はAnnictの登録順。",
    }),
  order: z
    .enum(["asc", "desc"])
    .default("asc")
    .openapi({
      param: {
        name: "order",
        in: "query",
      },
      example: "desc",
      description: "並び順（asc=昇順 / desc=降順）。orderBy指定時のみ有効。デフォルトはasc。",
    }),
  currentSeason: z
    .enum(["true", "false"])
    .optional()
    .openapi({
      param: {
        name: "currentSeason",
        in: "query",
      },
      example: "true",
      description: "trueを指定するとリクエスト時点のクール（今期）の作品のみ取得する。",
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
    "Annictで自分が登録している作品をステータス別（見ている/見たなど）に取得します。stateは任意で未指定時はwatching。orderByで並び替え、currentSeason=trueで今期の作品のみに絞り込めます。カーソルページングに対応しています。",
});

const emptyResponse = {
  works: [],
  pageInfo: { endCursor: null, hasNextPage: false },
};

const SEASON_NAME_ORDER: Record<string, number> = {
  WINTER: 1,
  SPRING: 2,
  SUMMER: 3,
  AUTUMN: 4,
};

const getCurrentSeasonSlug = (now: Date): string => {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = jst.getUTCMonth() + 1;
  const name = month <= 3 ? "winter" : month <= 6 ? "spring" : month <= 9 ? "summer" : "autumn";
  return `${year}-${name}`;
};

type SortableWork = {
  annictId: number;
  watchersCount: number;
  titleEn: string | null;
  seasonYear: number | null;
  seasonName: string | null;
};

const orderByValue = (
  work: SortableWork,
  orderBy: "annictId" | "watchersCount" | "titleEn" | "season",
): number | string | null => {
  switch (orderBy) {
    case "annictId":
      return work.annictId;
    case "watchersCount":
      return work.watchersCount;
    case "titleEn":
      return work.titleEn;
    case "season":
      return work.seasonYear === null
        ? null
        : work.seasonYear * 10 + (SEASON_NAME_ORDER[work.seasonName ?? ""] ?? 0);
  }
};

const sortWorks = <T extends SortableWork>(
  works: T[],
  orderBy: "annictId" | "watchersCount" | "titleEn" | "season",
  order: "asc" | "desc",
): T[] => {
  const direction = order === "desc" ? -1 : 1;
  return [...works].sort((a, b) => {
    const av = orderByValue(a, orderBy);
    const bv = orderByValue(b, orderBy);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (typeof av === "string" && typeof bv === "string") {
      return av.localeCompare(bv) * direction;
    }
    return ((av as number) - (bv as number)) * direction;
  });
};

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(route, async (c) => {
  const { state, orderBy, order, currentSeason, first, after } = c.req.valid("query");

  const seasons = currentSeason === "true" ? [getCurrentSeasonSlug(new Date())] : undefined;

  const result = await getAnnictLibraryEntries(
    c.env.ANNICT_API_TOKEN,
    [state.toUpperCase()],
    first,
    after,
    seasons,
  );

  if (!result || result.errors || !result.data?.viewer) {
    if (result?.errors) {
      console.error(result.errors);
    }
    return c.json(emptyResponse);
  }

  const { nodes, pageInfo } = result.data.viewer.libraryEntries;

  const mappedWorks = nodes.map((node) => ({
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

  const works = orderBy ? sortWorks(mappedWorks, orderBy, order) : mappedWorks;

  return c.json({ works, pageInfo });
});

export default app;
