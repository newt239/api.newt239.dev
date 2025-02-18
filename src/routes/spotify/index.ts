import { Hono } from "hono";
import { cors } from "hono/cors";

import { Bindings } from "~/types/bindings";
import { SpotifyMyTopTrackProps } from "~/types/spotify";
import { getSpotifyAccessToken } from "~/utils/spotify";

const spotifyRoute = new Hono<{ Bindings: Bindings }>()
  .use("*", cors())
  .get("/my-top-tracks", async (c) => {
    const SPOTIFY_CLIENT_ID: string = c.env.SPOTIFY_CLIENT_ID;
    const SPOTIFY_CLIENT_SECRET: string = c.env.SPOTIFY_CLIENT_SECRET;
    const REFRESH_TOKEN: string = c.env.REFRESH_TOKEN;

    const accessToken = await getSpotifyAccessToken(
      SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET,
      REFRESH_TOKEN
    );

    const requestOptions = {
      method: "GET",
      headers: { Authorization: "Bearer " + accessToken },
    };
    const res = await fetch(
      "https://api.spotify.com/v1/me/top/tracks",
      requestOptions
    );
    const data = (await res.json()) as { items: SpotifyMyTopTrackProps[] };

    const returnData = [];
    if (data) {
      for (const track of data.items) {
        const artists = [];
        for (const artist of track.artists) {
          artists.push(artist.name);
        }
        const eachData = {
          name: track.name,
          artists: artists,
          thumbnail: track.album.images[0].url,
          preview: track.preview_url ? track.preview_url : null,
          duration: track.duration_ms,
          popularity: track.popularity,
          link: track.external_urls.spotify,
        };
        returnData.push(eachData);
      }
    }
    return c.json(returnData);
  });

export default spotifyRoute;
