export const getSpotifyAccessToken = async (
  SPOTIFY_CLIENT_ID: string,
  SPOTIFY_CLIENT_SECRET: string,
  REFRESH_TOKEN: string,
) => {
  const token = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Spotify のアクセストークン取得に失敗しました (${res.status}): ${await res.text()}`,
    );
  }

  const { access_token } = (await res.json()) as { access_token?: string };
  if (!access_token) {
    throw new Error("Spotify のトークンレスポンスに access_token が含まれていません");
  }
  return access_token;
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

  const res = await fetch(
    "https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!res.ok) {
    throw new Error(
      `Spotify のトップトラック取得に失敗しました (${res.status}): ${await res.text()}`,
    );
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
