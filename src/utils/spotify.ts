export const getSpotifyAccessToken = async (
  SPOTIFY_CLIENT_ID: string,
  SPOTIFY_CLIENT_SECRET: string,
  REFRESH_TOKEN: string
) => {
  const token = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
  const accessTokenRes = (await fetch(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: REFRESH_TOKEN,
      }),
    }
  )
    .then((res) => {
      return res.json();
    })
    .catch((err) => {
      console.log(err);
      return null;
    })) as { access_token: string } | null;
  if (accessTokenRes) {
    return accessTokenRes.access_token;
  }
  return "";
};
