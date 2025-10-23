import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import type { Bindings } from "~/types/bindings";

import { createSpotifyClient } from "~/clients/spotify";

const searchQuerySchema = z.object({
  query: z.string().min(1, "Query is required"),
});

const app = new Hono<{ Bindings: Bindings }>().get(
  "/",
  zValidator("query", searchQuerySchema),
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
