export type SpotifyMyTopTrackProps = {
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

export type Bindings = {
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  REFRESH_TOKEN: string;
};
