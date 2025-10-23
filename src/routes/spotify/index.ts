import { Hono } from "hono";
import { cors } from "hono/cors";

import type { Bindings } from "~/types/bindings";

import { createSpotifyClient } from "~/clients/spotify";

const spotifyRoute = new Hono<{ Bindings: Bindings }>()
  .use("*", cors())
  .get("/my-top-tracks", async (c) => {
    const client = createSpotifyClient(
      c.env.SPOTIFY_CLIENT_ID,
      c.env.SPOTIFY_CLIENT_SECRET
    );
    const { items } = await client.currentUser.topItems("tracks", "short_term");
    if (!items) {
      return c.json([]);
    }
    const returnData = items.map((track) => {
      return {
        name: track.name,
        artists: track.artists.map((artist) => artist.name),
        thumbnail: track.album.images[0].url,
        preview: track.preview_url ? track.preview_url : null,
        duration: track.duration_ms,
        popularity: track.popularity,
        link: track.external_urls.spotify,
      };
    });
    return c.json(returnData);
  })
  .get("/search", async (c) => {
    const query = c.req.query("query");
    const client = createSpotifyClient(
      c.env.SPOTIFY_CLIENT_ID,
      c.env.SPOTIFY_CLIENT_SECRET
    );
    const result = await client.search(query || "test", ["artist"]);
    return c.json(result);
  });

export default spotifyRoute;
