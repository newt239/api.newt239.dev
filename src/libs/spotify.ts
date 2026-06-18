export const getSpotifyAccessToken = async (
  SPOTIFY_CLIENT_ID: string,
  SPOTIFY_CLIENT_SECRET: string,
  REFRESH_TOKEN: string,
) => {
  const token = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
  const accessTokenRes = (await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
    }),
  })
    .then((res) => {
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      return null;
    })) as { access_token: string } | null;
  if (accessTokenRes) {
    return accessTokenRes.access_token;
  }
  return null;
};

export type TopTrack = {
  name: string;
  artists: string[];
  thumbnail: string;
  preview: string | null;
  duration: number;
  popularity: number;
  link: string;
};

export const getMyTopTracks = async (
  SPOTIFY_CLIENT_ID: string,
  SPOTIFY_CLIENT_SECRET: string,
  REFRESH_TOKEN: string,
): Promise<TopTrack[]> => {
  const accessToken = await getSpotifyAccessToken(
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    REFRESH_TOKEN,
  );
  if (!accessToken) {
    return [];
  }

  const res = await fetch(
    "https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as {
    items: Array<{
      name: string;
      artists: Array<{ name: string }>;
      album: { images: Array<{ url: string }> };
      preview_url: string | null;
      duration_ms: number;
      popularity: number;
      external_urls: { spotify: string };
    }>;
  };

  if (!data.items) {
    return [];
  }

  return data.items.map((track) => ({
    name: track.name,
    artists: track.artists.map((artist) => artist.name),
    thumbnail: track.album.images[0].url,
    preview: track.preview_url ?? null,
    duration: track.duration_ms,
    popularity: track.popularity,
    link: track.external_urls.spotify,
  }));
};
