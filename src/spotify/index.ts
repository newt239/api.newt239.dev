import { Hono } from "hono";
import { cors } from "hono/cors";

type SpotifyMyTopTrackProps = {
  name: string;
  artists: {
    name: string;
  }[];
  album: {
    images: {
      url: string;
    }[];
  };
  preview_url?: string;
  duration_ms: number;
  popularity: number;
  external_urls: {
    spotify: string;
  };
};

const spotify = new Hono();
spotify.use("*", cors());

spotify.get("/my-top-tracks", async (c) => {
  const SPOTIFY_CLIENT_ID: string = c.env.SPOTIFY_CLIENT_ID;
  const SPOTIFY_CLIENT_SECRET: string = c.env.SPOTIFY_CLIENT_SECRET;
  const REFRESH_TOKEN: string = c.env.REFRESH_TOKEN;

  const accessToken = await getAccessToken(
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
  )
    .then((res): Promise<{ items: SpotifyMyTopTrackProps[] }> => {
      return res.json();
    })
    .catch((err) => {
      console.log(err);
      return null;
    });

  const returnData = [];
  if (res) {
    for (const track of res.items) {
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

const getAccessToken = async (
  SPOTIFY_CLIENT_ID: string,
  SPOTIFY_CLIENT_SECRET: string,
  REFRESH_TOKEN: string
) => {
  const token = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
  const accessTokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
    }),
  })
    .then((res): Promise<{ access_token: string }> => {
      return res.json();
    })
    .catch((err) => {
      console.log(err);
      return null;
    });
  if (accessTokenRes) {
    return accessTokenRes.access_token;
  } else {
    return "";
  }
};

export default spotify;
