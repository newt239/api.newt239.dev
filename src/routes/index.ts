import { Hono } from "hono";

import aiRoute from "./ai";

import type { Bindings } from "~/types/bindings";

import discordRoute from "~/routes/discord";
import labRoute from "~/routes/lab";
import spotifyRoute from "~/routes/spotify";

const app = new Hono<{ Bindings: Bindings }>()
  .get("/", (c) => c.text("🔥"))
  .route("/spotify", spotifyRoute)
  .route("/discord", discordRoute)
  .route("/ai", aiRoute)
  .route("/lab", labRoute);

export default app;
