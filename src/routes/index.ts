import { Hono } from "hono";
import { cors } from "hono/cors";

import type { Bindings } from "~/types/bindings";

import generateThemeRoute from "~/routes/ai/generate-theme";
import commandsRoute from "~/routes/discord/commands";
import interactionsRoute from "~/routes/discord/interactions";
import messagesRoute from "~/routes/discord/messages";
import registerRoute from "~/routes/discord/register";
import iframeRoute from "~/routes/lab/iframe";
import postRoute from "~/routes/lab/post";
import openApiRoute from "~/routes/openapi";
import myTopTracksRoute from "~/routes/spotify/my-top-tracks";
import searchRoute from "~/routes/spotify/search";

/** Cloudflare Pages のプレビューURL（例: https://811319f9.newt239-dev.pages.dev） */
const PREVIEW_ORIGIN_REGEX = /^https:\/\/[a-zA-Z0-9-]+\.newt239-dev\.pages\.dev$/;

const app = new Hono<{ Bindings: Bindings }>()
  .use(
    "*",
    cors({
      origin: (origin) => {
        if (
          origin === "https://newt239.dev" ||
          origin === "http://localhost:3000" ||
          PREVIEW_ORIGIN_REGEX.test(origin)
        ) {
          return origin;
        }
        return null;
      },
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    })
  )
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
  .route("/lab/iframe", iframeRoute)
  // OpenAPI documentation
  .route("/docs", openApiRoute);

export default app;
