import type { Database } from "@cloudflare/d1";

export type Bindings = {
  DB: Database;
  CHANNEL_ACCESS_TOKEN: string;
  REFRESH_TOKEN: string;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  OPENAI_API_KEY: string;
  OPENAI_ORGANIZATION_ID: string;
};
