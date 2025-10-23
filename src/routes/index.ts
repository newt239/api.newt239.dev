import { Hono } from "hono";

import type { Bindings } from "~/types/bindings";

import generateThemeRoute from "~/routes/ai/generate-theme";
import commandsRoute from "~/routes/discord/commands";
import interactionsRoute from "~/routes/discord/interactions";
import messagesRoute from "~/routes/discord/messages";
import registerRoute from "~/routes/discord/register";
import iframeRoute from "~/routes/lab/iframe";
import postRoute from "~/routes/lab/post";
import myTopTracksRoute from "~/routes/spotify/my-top-tracks";
import searchRoute from "~/routes/spotify/search";

const app = new Hono<{ Bindings: Bindings }>()
  .get("/", (c) => c.text("🔥"))
  // Spotify routes
  .route("/spotify/my-top-tracks", myTopTracksRoute)
  .route("/spotify/search", searchRoute)
  // Discord routes
  .route("/discord", interactionsRoute)
  .route("/discord/register", registerRoute)
  .route("/discord/commands", commandsRoute)
  .route("/discord/channels", messagesRoute)
  // AI routes
  .route("/ai/generate-theme", generateThemeRoute)
  // Lab routes
  .route("/lab/post", postRoute)
  .route("/lab/iframe", iframeRoute);

export default app;
