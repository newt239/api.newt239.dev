import { Hono } from "hono";

import aiRoute from "./ai";

import discordRoute from "~/routes/discord";
import labRoute from "~/routes/lab";
import spotifyRoute from "~/routes/spotify";
import { Bindings } from "~/types/bindings";

const app = new Hono<{ Bindings: Bindings }>()
  .get("/", (c) => c.text("🔥"))
  .route("/spotify", spotifyRoute)
  .route("/discord", discordRoute)
  .route("/ai", aiRoute)
  .route("/lab", labRoute);

export default app;
