import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { getMyTopTracks } from "~/libs/spotify";

import type { Bindings } from "~/types/bindings";

const topTrackSchema = z.object({
  name: z.string().openapi({ example: "夜に駆ける" }),
  artists: z.array(z.string()).openapi({ example: ["YOASOBI"] }),
  thumbnail: z.string().url().openapi({
    example: "https://i.scdn.co/image/ab67616d0000b273c5716278abba6a103ad13aa7",
  }),
  preview: z.string().url().nullable().openapi({
    example: "https://p.scdn.co/mp3-preview/...",
  }),
  duration: z.number().openapi({ example: 239000 }),
  popularity: z.number().min(0).max(100).openapi({ example: 85 }),
  link: z.string().url().openapi({
    example: "https://open.spotify.com/track/...",
  }),
});

const route = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(topTrackSchema),
        },
      },
      description: "ユーザーのトップトラック一覧",
    },
  },
  tags: ["Spotify"],
  summary: "ユーザーのトップトラックを取得",
  description: "現在のユーザーの短期間でのトップトラック（最大50曲）を取得します",
});

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(route, async (c) => {
  const tracks = await getMyTopTracks(
    c.env.SPOTIFY_CLIENT_ID,
    c.env.SPOTIFY_CLIENT_SECRET,
    c.env.REFRESH_TOKEN,
  );
  return c.json(tracks);
});

export default app;
