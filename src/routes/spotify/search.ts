import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import type { Bindings } from "~/types/bindings";

import { createSpotifyClient } from "~/clients/spotify";

const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1, "Query is required")
    .openapi({
      param: {
        name: "query",
        in: "query",
      },
      example: "Yoasobi",
      description: "検索クエリ",
    }),
});

const spotifyArtistSchema = z.object({
  external_urls: z.object({
    spotify: z.string(),
  }),
  followers: z.object({
    href: z.string().nullable(),
    total: z.number(),
  }),
  genres: z.array(z.string()),
  href: z.string(),
  id: z.string(),
  images: z.array(
    z.object({
      url: z.string(),
      height: z.number().nullable(),
      width: z.number().nullable(),
    })
  ),
  name: z.string(),
  popularity: z.number(),
  type: z.string(),
  uri: z.string(),
});

const searchResponseSchema = z.object({
  artists: z.object({
    href: z.string(),
    limit: z.number(),
    next: z.string().nullable(),
    offset: z.number(),
    previous: z.string().nullable(),
    total: z.number(),
    items: z.array(spotifyArtistSchema),
  }),
});

const route = createRoute({
  method: "get",
  path: "/",
  request: {
    query: searchQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: searchResponseSchema,
        },
      },
      description: "アーティスト検索結果",
    },
  },
  tags: ["Spotify"],
  summary: "Spotifyでアーティストを検索",
  description: "指定されたクエリでSpotifyのアーティストを検索します",
});

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(
  route,
  async (c) => {
    const { query } = c.req.valid("query");
    const client = createSpotifyClient(
      c.env.SPOTIFY_CLIENT_ID,
      c.env.SPOTIFY_CLIENT_SECRET
    );
    const result = await client.search(query, ["artist"]);
    return c.json(result);
  }
);

export default app;
