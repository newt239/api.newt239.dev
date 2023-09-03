import type { Database } from "@cloudflare/d1";

export type Bindings = {
  DB: Database;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  REFRESH_TOKEN: string;
  DISCORD_TOKEN: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
  NOTION_API_KEY: string;
  NOTION_MUSIC_DB_ID: string;
  YOUTUBE_API_KEY: string;
};
